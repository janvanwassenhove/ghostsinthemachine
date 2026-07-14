import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../src/data/scenarios';
import { DIFFICULTIES, DIFFICULTY_BY_ID, withDifficulty } from '../src/data/difficulty';
import { ROOM_BY_ID, upgradeCost } from '../src/data/rooms';
import { INCIDENTS, INCIDENT_BY_ID } from '../src/data/incidents';
import { DISASTER_BY_ID } from '../src/data/disasters';
import type { ScenarioDef } from '../src/data/types';
import { Sim } from '../src/sim/sim';
import type { RoomState } from '../src/sim/state';

const GRID_W = 24, GRID_H = 15;
const STAFFED_SPECIALS = ['observatory', 'monitoring_shrine', 'war_room', 'release_ritual', 'backup_lab', 'refactor_dojo'];
const needsStaff = (defId: string) => ROOM_BY_ID[defId].service || STAFFED_SPECIALS.includes(defId);
// Rooms a skilled player stacks with a second worker (throughput / debt burn).
// Rooms cap at two staff, so this never exceeds 2.
const stackTo = (defId: string) => (['refactor_dojo', 'triage', 'coffee_reactor'].includes(defId) ? 2 : 1);

/** Rooms a competent player would build for this contract, in priority order:
 *  triage + coffee, then support rooms the *win condition* hinges on (built early),
 *  then the incident-treatment rooms, then ambient support (nice-to-have). */
function requiredRooms(sc: ScenarioDef): string[] {
  const pool = sc.incidentPool === 'all' ? INCIDENTS.map((i) => i.id) : sc.incidentPool;
  const treat = new Set<string>();
  for (const id of pool) for (const r of INCIDENT_BY_ID[id].rooms) treat.add(r);
  const wins = new Set(sc.win.map((w) => w.type));
  const critical: string[] = [];
  const ambient: string[] = [];
  // Only an explicit debt objective makes the Dojo worth building before income
  // rooms; everywhere else, income-earning treatment comes first, supports after.
  if (wins.has('debtBelow')) critical.push('refactor_dojo');
  else if (sc.audits) ambient.push('refactor_dojo');
  if (wins.has('auditsPassed')) ambient.push('compliance_bunker', 'monitoring_shrine');
  else if (sc.audits) ambient.push('monitoring_shrine');
  if (wins.has('survive')) ambient.push('observatory');
  // Stand up income-earning treatment rooms first, then weave in support: a couple
  // of treatment rooms, the win-critical support, two more treatment, then ambient
  // support (dojo/monitoring), then the rest. Keeps cash earning while debt/audit
  // control comes online before it spirals.
  const treatArr = [...treat];
  const order = [
    'triage', 'coffee_reactor',
    ...treatArr.slice(0, 2), ...critical, ...treatArr.slice(2, 4), ...ambient, ...treatArr.slice(4),
  ];
  return [...new Set(order)];
}

function findSpot(sim: Sim, defId: string, w: number, h: number): { x: number; y: number } | null {
  const def = ROOM_BY_ID[defId];
  const all = sim.state.scenario.building ?? [{ x: 1, y: 0, w: GRID_W - 1, h: GRID_H }];
  // Outdoor rooms (grounds) go outside the building footprint; indoor rooms inside it.
  const rects = def.outdoor ? [{ x: 1, y: 0, w: GRID_W - 1, h: GRID_H }] : all;
  // A human leaves corridors: prefer spots with a 1-tile gap from other rooms so
  // doorways stay reachable, and only pack tighter if nothing else fits.
  const clearOf = (x: number, y: number, gap: number) => sim.state.rooms.every((o) =>
    x - gap >= o.x + o.w || x + w + gap <= o.x || y - gap >= o.y + o.h || y + h + gap <= o.y);
  for (const gap of [1, 0]) {
    for (const r of rects) {
      for (let x = r.x; x + w <= r.x + r.w; x++) {
        for (let y = r.y; y + h <= r.y + r.h; y++) {
          if (clearOf(x, y, gap) && sim.canPlace(defId, x, y, w, h) === null) return { x, y };
        }
      }
    }
  }
  return null;
}

/** Build one instance of a room if affordable (keeping a hiring buffer) and space exists. */
function tryBuild(sim: Sim, defId: string, buffer: number): boolean {
  if (!sim.roomAvailable(defId)) return false;
  const def = ROOM_BY_ID[defId];
  if (sim.state.money < def.cost + buffer) return false;
  const spot = findSpot(sim, defId, def.minW, def.minH);
  if (!spot) return false;
  return sim.buildRoom(defId, spot.x, spot.y, def.minW, def.minH) === null;
}

/** Hire a candidate compatible with a room and assign them; returns true on success.
 *  Enforces a salary runway so the bot never hires itself into bankruptcy. */
function hireInto(sim: Sim, room: RoomState, buffer: number): boolean {
  const def = ROOM_BY_ID[room.def];
  const idx = def.roles.length === 0
    ? sim.state.candidates.findIndex(() => true)
    : sim.state.candidates.findIndex((c) => def.roles.includes(c.role));
  if (idx < 0) return false;
  const cand = sim.state.candidates[idx];
  if (sim.state.money < cand.salary + buffer) return false;
  // Once a real payroll exists, keep a day of runway so we don't hire into bankruptcy.
  // The first several hires (the earning core) are unrestricted.
  const dailySalary = sim.state.staff.reduce((a, st) => a + st.salary, 0) + cand.salary;
  if (sim.state.staff.length >= 6 && sim.state.money < dailySalary + 150) return false;
  const before = sim.state.staff.length;
  if (sim.hire(idx) === null && sim.state.staff.length > before) {
    sim.assign(sim.state.staff[before].id, room.id);
    return true;
  }
  return false;
}

interface Result { won: boolean; day: number; resolved: number; money: number; trust: number; debt: number; reason: string; }

/** One round of building / staffing / expansion. No time passes — safe to call
 *  repeatedly during the pre-game "pause" a human uses to lay out their office.
 *  `expandOk` is false when cash is bleeding, so the bot stops digging the hole. */
function manage(sim: Sim, wanted: string[], hasGrounds: boolean, expandOk: boolean): void {
  const s = sim.state;

  // 1. Build the core rooms incrementally, keeping cash to staff them.
  for (const r of wanted) if (sim.roomsOf(r).length === 0) tryBuild(sim, r, 200);

  // 2. Give every room at least one worker (re-hires after resignations).
  for (const room of s.rooms) {
    if (needsStaff(room.def) && !s.staff.some((st) => st.room === room.id)) hireInto(sim, room, 80);
  }

  // 3. Keep coffee flowing; a plantation makes beans sustainable once on the grounds.
  if (s.beans <= 12 && s.money > 160) sim.buyBeans();
  if (s.staff.length > 3 && sim.roomsOf('coffee_reactor').length < 2) tryBuild(sim, 'coffee_reactor', 250);
  if (hasGrounds && s.money > 900 && sim.roomsOf('bean_plantation').length < 1) tryBuild(sim, 'bean_plantation', 300);

  // 4. Throughput: where incidents pile up, upgrade the room, then build another,
  //    then stack a second/third worker. Triage is the universal bottleneck.
  if (expandOk && s.money > 650) {
    const demand: Record<string, number> = {};
    for (const inc of s.incidents) {
      if (inc.phase === 'stuck' || inc.phase === 'queued' || inc.phase === 'walking') {
        const t = inc.chain[0];
        if (t && ROOM_BY_ID[t]?.service) demand[t] = (demand[t] ?? 0) + 1;
      }
    }
    const hot = Object.entries(demand).sort((a, b) => b[1] - a[1])[0];
    if (hot && hot[1] >= 3) {
      const defId = hot[0];
      const rooms = sim.roomsOf(defId);
      const upgradable = rooms.filter((r) => r.level < 3).sort((a, b) => a.level - b.level)[0];
      if (upgradable && s.money > upgradeCost(ROOM_BY_ID[defId], upgradable.level) + 300) {
        sim.upgradeRoom(upgradable.id);
      } else if (rooms.length < 3) {
        tryBuild(sim, defId, 350);
      }
    }
  }

  // 5. Stack extra workers on the bottleneck rooms (triage/coffee/dojo) when flush.
  if (expandOk && s.money > 750) {
    for (const room of s.rooms) {
      const cap = stackTo(room.def);
      if (cap > 1 && s.staff.filter((st) => st.room === room.id).length < cap) {
        if (hireInto(sim, room, 260)) break;
      }
    }
  }

  // 6. Handle disasters & breakages.
  for (let i = s.disasters.length - 1; i >= 0; i--) {
    const def = DISASTER_BY_ID[s.disasters[i].def];
    if (def.fixCost > 0 && s.money > def.fixCost + 300) sim.endDisaster(i);
  }
  for (const room of s.rooms) if (room.broken && s.money > 180) sim.repairRoom(room.id);
}

function autoPlay(base: ScenarioDef, difficultyId: string, seed: number, maxDays = 40): Result {
  const sc = withDifficulty(base, DIFFICULTY_BY_ID[difficultyId as 'cozy']);
  const sim = new Sim(sc, seed);
  const wanted = requiredRooms(sc);
  const hasGrounds = (sc.availableRooms ?? []).some((r) => ROOM_BY_ID[r]?.outdoor);

  // Pre-game setup: as a human would, pause and build/staff the affordable core
  // before letting the clock run, so the office isn't empty while ghosts arrive.
  for (let i = 0; i < 40; i++) manage(sim, wanted, hasGrounds, true);

  let guard = 0;
  let prevDay = sim.state.day;
  let dayStartMoney = sim.state.money;
  let cashTrend = 0; // net cash change over the previous day
  while (!sim.outcome && sim.state.day <= maxDays && guard < 400000) {
    guard++;
    if (sim.state.day !== prevDay) {
      cashTrend = sim.state.money - dayStartMoney;
      dayStartMoney = sim.state.money;
      prevDay = sim.state.day;
    }
    // Only expand when there's a cushion and cash isn't trending down — a human
    // stops hiring/upgrading when the runway is shrinking.
    const expandOk = sim.state.money > 500 && cashTrend >= -60;
    manage(sim, wanted, hasGrounds, expandOk);
    sim.tick(2);
  }
  const s = sim.state;
  return {
    won: sim.outcome?.won ?? false, day: s.day, resolved: s.stats.resolved,
    money: Math.round(s.money), trust: Math.round(s.trust), debt: Math.round(s.debt),
    reason: sim.outcome?.reason ?? `timeout (day ${s.day}, resolved ${s.stats.resolved})`,
  };
}

describe('campaign feasibility (auto-player across all difficulties)', () => {
  const SEEDS = [1, 7, 23];
  const rows: string[] = [];

  for (const sc of SCENARIOS) {
    for (const d of DIFFICULTIES) {
      it(`${sc.id} · ${d.id} is winnable`, () => {
        const results = SEEDS.map((seed) => autoPlay(sc, d.id, seed));
        const wins = results.filter((r) => r.won).length;
        const best = results.reduce((a, b) => (Number(a.won) * 1000 + a.resolved >= Number(b.won) * 1000 + b.resolved ? a : b));
        rows.push(
          `${sc.id.padEnd(9)} ${d.id.padEnd(9)} wins ${wins}/${SEEDS.length}  ` +
          `resolved=${best.resolved} trust=${best.trust} debt=${best.debt} money=${best.money}  (${best.reason})`,
        );
        expect(wins, `${sc.id}/${d.id}: ${results.map((r) => r.reason).join(' | ')}`).toBeGreaterThan(0);
      });
    }
  }

  it('zzz prints the feasibility table', () => {
    // eslint-disable-next-line no-console
    console.log('\n=== Campaign feasibility ===\n' + rows.join('\n') + '\n');
  });
});
