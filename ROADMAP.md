# ROADMAP.md — Ghosts in the Machine

Execution plan. Each phase ends with the build green and TASKS.md updated. Do not ask for confirmation between phases; verify claims against real command output.

---

## Phase 1 — Project Setup

**Tasks**
- Scaffold Vite + TypeScript project (strict mode), add Phaser.
- `index.html`, `src/main.ts` with a Phaser game booting into a Boot scene.
- Base CSS (full-viewport canvas, dark theme), favicon placeholder.
- `vite.config.ts` with relative `base: './'` for GitHub Pages.
- Scripts: `dev`, `build` (tsc --noEmit && vite build), `preview`.
- Create CLAUDE.md, GAME_SPEC.md, ROADMAP.md, TASKS.md, README.md.

**Acceptance criteria**
- `npm install` completes cleanly.
- `npm run dev` serves a page with a running Phaser canvas.
- `npm run build` passes with zero errors; `npm run preview` serves `dist/`.

**Verify**
```
npm install
npm run build
npm run preview
```

## Phase 2 — Main Menu & Game Shell

**Tasks**
- Scene flow: `BootScene` → `MainMenuScene` → (`GameScene`, `SettingsScene`).
- Main menu: title, Campaign / Sandbox / Settings buttons (keyboard + mouse).
- Shared UI helpers (button factory, panel, text styles) in `src/ui/`.
- Game shell: `GameScene` with pause, 1×/2× speed, in-game clock ticking, HUD skeleton (money, trust, debt, stability, coffee, morale placeholders).
- Fixed-timestep sim loop in `src/sim/loop.ts` decoupled from render.

**Acceptance criteria**
- Menu navigates to an empty game shell and back (Esc → menu).
- Clock advances, pause/speed controls work, HUD renders placeholder values.

**Verify**
```
npm run build
npm run dev   # manual: menu → game → pause/speed → back
```

## Phase 3 — Grid & Room Building

**Tasks**
- Tile grid model (`src/sim/grid.ts`) + render layer; hover/selection highlight.
- Room definitions (type, min size, cost, colour) from `GAME_SPEC.md` §2.
- Drag-to-place rectangular rooms with validity checks (bounds, overlap, min size, affordability); door placement on room edge.
- Sell/demolish room (refund at loss).
- Build toolbar UI listing room types with costs.

**Acceptance criteria**
- Player can place, and demolish at least 5 room types; invalid placements rejected with visual feedback; money deducted/refunded correctly.

**Verify**
```
npm run build
npx vitest run   # grid/placement unit tests
npm run dev      # manual placement check
```

## Phase 4 — Incidents, Movement, Queues

**Tasks**
- Ticket model + seeded RNG generator (type, severity, patience, haunt, bounty, original absurd title from string tables in `src/sim/flavour.ts`).
- Spawning at Intake Terminal on a rate curve.
- Grid pathfinding (BFS/A*) and ticket entities walking to target room doors.
- FIFO door queues with caps, patience decay, rage-quit behaviour.
- Room processing: service time by severity, resolution payout stub.

**Acceptance criteria**
- Tickets spawn, walk, queue, get processed or rage-quit; queue order and caps respected; no pathfinding stalls on a normal layout.

**Verify**
```
npm run build
npx vitest run   # pathfinding, queue, patience tests
npm run dev      # watch a few minutes of flow
```

## Phase 5 — Staff Hiring & Assignment

**Tasks**
- Staff model (role, skill, speed, salary, energy, morale, quirk) + candidate pool generation.
- Hire panel UI; drag-assign staff to rooms; unassign.
- Rooms only process tickets with compatible staff present; speed scales with skill/energy.
- Energy drain, auto-break at Break Den, morale basics.

**Acceptance criteria**
- Hiring costs money; rooms without valid staff don't process; staff visibly move to breaks and return.

**Verify**
```
npm run build
npx vitest run
npm run dev
```

## Phase 6 — Economy, Trust, Technical Debt

**Tasks**
- Full money flow: bounties, payday salary cycle, bean purchases, bankruptcy handling.
- Client trust meter + tier gating of spawn tables (per GAME_SPEC §6).
- Technical debt sources/sinks, quick-fix toggle, Patch Chapel effect; System Stability derived meter; The Great Refactoring event.
- Coffee Reactor production/consumption and morale coupling.
- HUD meters wired to real values.

**Acceptance criteria**
- All meters move for the documented reasons and are visible in HUD; bankruptcy and debt=100 events fire correctly in a test scenario.

**Verify**
```
npm run build
npx vitest run   # economy/trust/debt unit tests
npm run dev
```

## Phase 7 — Disasters, Audits, Humour

**Tasks**
- Disaster framework (telegraph → effect → resolution → toast) + at least 5 disasters from GAME_SPEC §11.
- Audit events: schedule, score computation, pass/fail consequences, compliance ghost.
- Flavour pass: ticket title tables expanded, staff quirks visible in tooltips, disaster one-liners, glitchy-UI effect at low stability.

**Acceptance criteria**
- Each disaster can trigger, affects play, and is resolvable; audits pass/fail based on real score; humour strings all original.

**Verify**
```
npm run build
npx vitest run
npm run dev   # force-trigger disasters via debug key
```

## Phase 8 — Campaign & Sandbox

**Tasks**
- Level definition format (map size, starting money, spawn tables, win/fail conditions, twist flags).
- 8 campaign levels per GAME_SPEC §12 + level select screen with completion/stars.
- Win/fail detection, end-of-level summary screen.
- Sandbox mode with configuration screen (money, disasters, haunt intensity, audits, fail state).

**Acceptance criteria**
- Tutorial level completable start to finish; failing a fail condition ends the level; sandbox options demonstrably alter play.

**Verify**
```
npm run build
npx vitest run
npm run dev   # play level 1 through
```

## Phase 9 — Save/Load & Settings

**Tasks**
- Versioned JSON save schema; serialise/deserialise full sim state.
- LocalStorage slots: campaign progress, mid-level manual save, sandbox slot, settings.
- Autosave (in-game day + `visibilitychange`); corrupt-save quarantine.
- Settings scene: volume placeholder, speed default, reset progress (confirm dialog).

**Acceptance criteria**
- Save mid-level, reload page, continue with identical state; corrupted LocalStorage value does not crash boot.

**Verify**
```
npm run build
npx vitest run   # serialisation round-trip tests
npm run dev      # manual save/reload check
```

## Phase 10 — GitHub Pages Deployment

**Tasks**
- Confirm `base: './'` produces a `dist/` that works from a subpath.
- `.github/workflows/deploy.yml`: build on push to `main`, deploy `dist/` via `actions/deploy-pages`.
- README deployment section verified against the actual workflow.

**Acceptance criteria**
- `npm run build && npm run preview` works; workflow YAML is valid; site loads from a non-root path (test via preview under subpath or `npx serve`).

**Verify**
```
npm run build
npm run preview
```

## Phase 11 — Polish, Balancing, README

**Tasks**
- Balance pass: economy curve, patience timers, disaster frequency per difficulty.
- Performance check (entity caps, object pooling if needed), 60fps target.
- Visual polish: transitions, hover states, ghost wobble, sound toggles if audio exists.
- Final README: screenshots (original), controls, feature list.
- Full manual playtest of campaign level 1–3 and sandbox.

**Acceptance criteria**
- No console errors during a 10-minute session; build green; README accurate; TASKS.md fully ticked or explicitly deferred.

**Verify**
```
npm run build
npx vitest run
npm run preview
```
