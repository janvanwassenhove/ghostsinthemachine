// Captures gameplay screenshots for the release notes.
//
// Boots a real Vite dev server and drives the game through the `window.__game`
// debug hook rather than clicking canvas pixels, so the shots are deterministic
// and survive UI layout changes.
//
//   node scripts/screenshots.mjs [outDir]     (default: screenshots/)
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? 'screenshots';
const W = 1280;
const H = 720;

const settle = (page, ms = 900) => page.waitForTimeout(ms);

async function shot(page, name) {
  await page.locator('canvas').screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

const server = await createServer({ logLevel: 'silent', server: { port: 5199 } });
await server.listen();
const url = server.resolvedUrls.local[0];
console.log(`dev server: ${url}`);

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[page error]', e.message));

try {
  await mkdir(OUT, { recursive: true });
  await page.goto(url, { waitUntil: 'load' });

  // Wait for Phaser to boot and hand off to the main menu.
  await page.waitForFunction(
    () => window.__game && window.__game.scene.getScenes(true).some((s) => s.scene.key === 'MainMenu'),
    null, { timeout: 30_000 },
  );
  await settle(page);
  await shot(page, '01-main-menu');

  // Contract select, showing the difficulty tiers. Stop the previous scene first,
  // otherwise its UI keeps rendering underneath the new one.
  await page.evaluate(() => {
    window.__game.scene.stop('MainMenu');
    window.__game.scene.start('LevelSelect');
  });
  await settle(page);
  await shot(page, '02-campaign');

  // Drop straight into a contract and stage a working office, then let the sim
  // run so ghosts are queueing and staff are walking around for the shot.
  await page.evaluate(async () => {
    const [scen, diff] = await Promise.all([
      import('/src/data/scenarios.ts'),
      import('/src/data/difficulty.ts'),
    ]);
    const sc = diff.withDifficulty(scen.SCENARIOS[0], diff.DIFFICULTY_BY_ID.standard);
    window.__game.scene.stop('LevelSelect');
    window.__game.scene.start('Game', { scenario: sc });
  });
  await page.waitForFunction(
    () => {
      const g = window.__game.scene.getScene('Game');
      return g && g.sim && g.scene.isActive();
    },
    null, { timeout: 20_000 },
  );

  const buildErrors = await page.evaluate(async () => {
    const rooms = await import('/src/data/rooms.ts');
    const sim = window.__game.scene.getScene('Game').sim;

    // Lay out a small working office. Scan for the first valid spot the way a
    // player would — preferring a 1-tile corridor gap, packing tighter only if
    // nothing else fits — so this survives changes to the building footprint.
    const findSpot = (defId, w, h) => {
      for (const gap of [1, 0]) {
        for (const r of sim.state.scenario.building) {
          for (let x = r.x; x + w <= r.x + r.w; x++) {
            for (let y = r.y; y + h <= r.y + r.h; y++) {
              const clear = sim.state.rooms.every((o) =>
                x - gap >= o.x + o.w || x + w + gap <= o.x ||
                y - gap >= o.y + o.h || y + h + gap <= o.y);
              if (clear && sim.canPlace(defId, x, y, w, h) === null) return { x, y };
            }
          }
        }
      }
      return null;
    };

    const errors = [];
    for (const def of ['triage', 'debug_chapel', 'coffee_reactor', 'patch_unit']) {
      const d = rooms.ROOM_BY_ID[def];
      const spot = findSpot(def, d.minW, d.minH);
      if (!spot) { errors.push(`${def}: no valid spot`); continue; }
      const err = sim.buildRoom(def, spot.x, spot.y, d.minW, d.minH);
      if (err) errors.push(`${def}@(${spot.x},${spot.y}): ${err}`);
    }

    // Staff each room from the opening candidate pool.
    for (const room of sim.state.rooms) {
      const def = rooms.ROOM_BY_ID[room.def];
      const idx = def.roles.length === 0
        ? sim.state.candidates.findIndex(() => true)
        : sim.state.candidates.findIndex((c) => def.roles.includes(c.role));
      if (idx < 0) continue;
      const before = sim.state.staff.length;
      if (sim.hire(idx) === null && sim.state.staff.length > before) {
        sim.assign(sim.state.staff[before].id, room.id);
      }
    }

    // Advance a few minutes of game time so tickets arrive, queue and get served.
    sim.tick(180);
    return errors;
  });
  if (buildErrors.length) {
    throw new Error(`staging failed to build rooms:\n  ${buildErrors.join('\n  ')}`);
  }

  await settle(page, 1600); // let sprites walk to their posts
  await shot(page, '03-gameplay');

  console.log(`\nWrote screenshots to ${OUT}/`);
} finally {
  await browser.close();
  await server.close();
}
