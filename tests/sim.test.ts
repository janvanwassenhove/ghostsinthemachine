import { describe, expect, it } from 'vitest';
import { SCENARIOS, makeSandbox } from '../src/data/scenarios';
import { INCIDENTS, INCIDENT_BY_ID } from '../src/data/incidents';
import { ROOMS, ROOM_BY_ID } from '../src/data/rooms';
import { ROLES } from '../src/data/roles';
import { TICKET_TITLES } from '../src/data/humour';
import { Sim } from '../src/sim/sim';
import { DIFFICULTY_BY_ID, withDifficulty } from '../src/data/difficulty';
import { buildingBlocker, buildingEntrances, doorOutside, inRects } from '../src/sim/grid';

const basement = SCENARIOS[0];

/** Lift campaign room/role unlock gating for tests that exercise other behaviour. */
function unlockAll(sim: Sim): void {
  sim.state.scenario = { ...sim.state.scenario, availableRooms: undefined, availableRoles: undefined };
}

describe('data integrity', () => {
  it('has 22 rooms, 17 roles, 24 incidents, 7 scenarios', () => {
    expect(ROOMS.length).toBe(22);
    expect(ROLES.length).toBe(17);
    expect(INCIDENTS.length).toBe(24);
    expect(SCENARIOS.length).toBe(7);
  });

  it('outdoor rooms are non-service, categorised as grounds, with dedicated staff', () => {
    const outdoor = ROOMS.filter((r) => r.outdoor);
    expect(outdoor.length).toBeGreaterThanOrEqual(3);
    const roleIds = new Set(ROLES.map((r) => r.id));
    for (const r of outdoor) {
      expect(r.service).toBe(false);
      expect(r.category).toBe('grounds');
      // every grounds room has at least one real staff role that can tend it
      expect(r.roles.length).toBeGreaterThan(0);
      for (const role of r.roles) expect(roleIds.has(role)).toBe(true);
    }
    const chainRooms = new Set(INCIDENTS.flatMap((i) => i.rooms));
    for (const r of outdoor) expect(chainRooms.has(r.id)).toBe(false);
  });

  it('every room has a valid build category', () => {
    const cats = new Set(['core', 'treatment', 'support', 'grounds']);
    for (const r of ROOMS) expect(cats.has(r.category)).toBe(true);
  });

  it('every room is square, so its square floor-plan art fits without distortion', () => {
    for (const r of ROOMS) expect(r.minW, r.id).toBe(r.minH);
  });

  it('campaign buildings are inset from the map edges with a left walkway', () => {
    const W = 24, H = 15; // BAL.grid
    for (const sc of SCENARIOS) {
      if (!sc.building) continue;
      for (const r of sc.building) {
        expect(r.x, `${sc.id} left`).toBeGreaterThanOrEqual(3); // room for the walkway
        expect(r.y, `${sc.id} top`).toBeGreaterThanOrEqual(1);
        expect(r.x + r.w, `${sc.id} right`).toBeLessThanOrEqual(W - 1);
        expect(r.y + r.h, `${sc.id} bottom`).toBeLessThanOrEqual(H - 1);
      }
    }
  });

  it('every incident chain references existing service rooms', () => {
    for (const inc of INCIDENTS) {
      for (const roomId of inc.rooms) {
        const def = ROOM_BY_ID[roomId];
        expect(def, `${inc.id} -> ${roomId}`).toBeDefined();
        expect(def.service, `${inc.id} -> ${roomId} must be a service room`).toBe(true);
      }
    }
  });

  it('every incident has original title variants', () => {
    for (const inc of INCIDENTS) {
      expect(TICKET_TITLES[inc.id]?.length, inc.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('every mutation target exists', () => {
    for (const inc of INCIDENTS) {
      for (const target of inc.mutateTo ?? []) {
        expect(INCIDENT_BY_ID[target], `${inc.id} mutates to ${target}`).toBeDefined();
      }
    }
  });

  it('every scenario pool entry exists', () => {
    for (const sc of SCENARIOS) {
      if (sc.incidentPool === 'all') continue;
      for (const id of sc.incidentPool) {
        expect(INCIDENT_BY_ID[id], `${sc.id} pool: ${id}`).toBeDefined();
      }
    }
  });
});

describe('economy & building', () => {
  it('charges for rooms and rejects unaffordable builds', () => {
    const sim = new Sim(basement, 42);
    const before = sim.state.money;
    expect(sim.buildRoom('triage', 7, 5, 3, 3)).toBeNull();
    expect(sim.state.money).toBe(before - ROOM_BY_ID['triage'].cost);
    sim.state.money = 0;
    expect(sim.buildRoom('debug_chapel', 10, 4, 3, 3)).toMatch(/money/i);
  });

  it('upgrade and repair cost money and change room state', () => {
    const sim = new Sim(basement, 42);
    sim.buildRoom('triage', 7, 5, 3, 3);
    const room = sim.state.rooms[0];
    room.condition = 40;
    expect(sim.repairRoom(room.id)).toBeNull();
    expect(room.condition).toBe(100);
    expect(sim.upgradeRoom(room.id)).toBeNull();
    expect(room.level).toBe(2);
  });

  it('demolish refunds and adds technical debt', () => {
    const sim = new Sim(basement, 42);
    sim.buildRoom('triage', 7, 5, 3, 3);
    const debtBefore = sim.state.debt;
    const moneyBefore = sim.state.money;
    sim.demolishRoom(sim.state.rooms[0].id);
    expect(sim.state.rooms.length).toBe(0);
    expect(sim.state.money).toBeGreaterThan(moneyBefore);
    expect(sim.state.debt).toBeGreaterThan(debtBefore);
  });

  it('hiring costs a signing fee and salaries are paid daily', () => {
    const sim = new Sim(basement, 42);
    const before = sim.state.money;
    expect(sim.hire(0)).toBeNull();
    expect(sim.state.staff.length).toBe(1);
    expect(sim.state.money).toBeLessThan(before);
    const afterHire = sim.state.money;
    // advance a full day
    sim.tick(76);
    expect(sim.state.money).toBeLessThan(afterHire); // salary went out
  });
});

describe('hiring pool', () => {
  it('always leads with the two generalist roles', () => {
    const sim = new Sim(basement, 123);
    expect(sim.state.candidates[0].role).toBe('bug_whisperer');
    expect(sim.state.candidates[1].role).toBe('devops_janitor');
  });

  it('only offers roles unlocked so far in the campaign', () => {
    const sim = new Sim(basement, 123);
    const allowed = new Set(basement.availableRoles);
    for (const c of sim.state.candidates) expect(allowed.has(c.role)).toBe(true);
  });

  it('always offers a Printer Exorcist in the printer contract', () => {
    const printer = SCENARIOS[1];
    // Regardless of seed, the pool guarantees the contract-critical role.
    for (const seed of [1, 2, 3, 7, 42, 99]) {
      const sim = new Sim(printer, seed);
      const roles = sim.state.candidates.map((c) => c.role);
      expect(roles, `seed ${seed}`).toContain('printer_exorcist');
      expect(roles, `seed ${seed}`).toContain('compliance_druid');
    }
  });

  it('every contract offers a compatible role for every room its incidents need', () => {
    for (const sc of SCENARIOS) {
      const sim = new Sim(sc, 5);
      const offered = new Set(sim.state.candidates.map((c) => c.role));
      const pool = sc.incidentPool === 'all' ? INCIDENTS.map((i) => i.id) : sc.incidentPool;
      const rooms = new Set(['triage', ...pool.flatMap((id) => INCIDENT_BY_ID[id].rooms)]);
      for (const roomId of rooms) {
        const def = ROOM_BY_ID[roomId];
        if (def.roles.length === 0) continue; // any-role room
        const staffable = def.roles.some((r) => offered.has(r));
        expect(staffable, `${sc.id}: no hireable role for ${roomId}`).toBe(true);
      }
    }
  });
});

describe('campaign difficulty', () => {
  it('grades the contract: Cozy easiest, Standard a cushion, Nightmare hardest', () => {
    const cozy = withDifficulty(basement, DIFFICULTY_BY_ID['cozy']);
    const std = withDifficulty(basement, DIFFICULTY_BY_ID['standard']);
    const hard = withDifficulty(basement, DIFFICULTY_BY_ID['nightmare']);

    // Budget: strictly graded, easiest to hardest
    expect(cozy.startMoney).toBeGreaterThan(std.startMoney);
    expect(std.startMoney).toBeGreaterThan(hard.startMoney);
    // Beans: strictly graded
    expect(cozy.startBeans!).toBeGreaterThan(std.startBeans!);
    expect(std.startBeans!).toBeGreaterThan(hard.startBeans!);
    // Spawn pressure: Nightmare spawns fastest, Cozy slowest
    expect(hard.spawnIntervalStart).toBeLessThan(std.spawnIntervalStart);
    expect(std.spawnIntervalStart).toBeLessThan(cozy.spawnIntervalStart);
    // Disaster frequency is graded (measured on a contract that has disasters)
    const cozyP = withDifficulty(SCENARIOS[1], DIFFICULTY_BY_ID['cozy']);
    const hardP = withDifficulty(SCENARIOS[1], DIFFICULTY_BY_ID['nightmare']);
    expect(cozyP.disasterFreq).toBeLessThan(hardP.disasterFreq);
    // Objectives themselves are untouched by difficulty
    expect(hard.win).toEqual(basement.win);
    expect(cozy.win).toEqual(basement.win);
  });

  it('the Sim starts with the difficulty-scaled beans and coffee', () => {
    const hard = withDifficulty(basement, DIFFICULTY_BY_ID['nightmare']);
    const sim = new Sim(hard, 1);
    expect(sim.state.beans).toBe(DIFFICULTY_BY_ID['nightmare'].startBeans);
    expect(sim.state.coffee).toBe(DIFFICULTY_BY_ID['nightmare'].startCoffee);
    expect(sim.state.money).toBe(hard.startMoney);
  });
});

describe('objective-aligned spawns', () => {
  it('spawns enough of the required category to meet a resolveCategory objective', () => {
    // "The Office With the Printer" needs 8 print incidents out of 20 total.
    const printer = SCENARIOS[1];
    const catObj = printer.win.find((w) => w.type === 'resolveCategory')!;
    const totalObj = printer.win.find((w) => w.type === 'resolve')!;
    const targetFrac = catObj.value / totalObj.value; // 8 / 20 = 0.4
    // Sample the spawn distribution over many spawns.
    const sim = new Sim(printer, 42);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const def = INCIDENT_BY_ID[(sim as any).rng.pick((sim as any).spawnPool())];
      counts[def.category] = (counts[def.category] ?? 0) + 1;
    }
    const printFrac = (counts['print'] ?? 0) / 2000;
    // The required category should be at least its objective share (with margin),
    // so 8 print resolves is realistically reachable within ~20 total.
    expect(printFrac).toBeGreaterThanOrEqual(targetFrac - 0.05);
  });

  it('leaves spawns uniform when a contract has no category objective', () => {
    const basementSim = new Sim(basement, 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bag = (basementSim as any).spawnPool();
    // basement pool has 4 distinct incidents, none required by category → no dupes
    expect(new Set(bag).size).toBe(bag.length);
  });
});

describe('campaign progression (unlocks)', () => {
  it('unlocks rooms and roles cumulatively across the seven contracts', () => {
    // Each contract keeps everything earlier ones unlocked, and the final one
    // has the full set.
    for (let i = 1; i < SCENARIOS.length; i++) {
      const prev = new Set(SCENARIOS[i - 1].availableRooms);
      for (const r of prev) expect(SCENARIOS[i].availableRooms).toContain(r);
    }
    const last = SCENARIOS[SCENARIOS.length - 1];
    expect(last.availableRooms!.length).toBe(ROOMS.length);
    expect(last.availableRoles!.length).toBe(ROLES.length);
    // The two generalist roles are available from the very first contract.
    expect(SCENARIOS[0].availableRoles).toContain('bug_whisperer');
    expect(SCENARIOS[0].availableRoles).toContain('devops_janitor');
  });

  it('blocks building a room that is not unlocked yet', () => {
    const sim = new Sim(basement, 1); // basement has no AI Sanitarium
    expect(sim.roomAvailable('ai_sanitarium')).toBe(false);
    expect(sim.buildRoom('ai_sanitarium', 8, 6, 3, 3)).toMatch(/unlock/i);
    // …but a first-contract room builds fine.
    expect(sim.roomAvailable('triage')).toBe(true);
    expect(sim.buildRoom('triage', 7, 5, 3, 3)).toBeNull();
  });

  it('every contract can build all the rooms its incidents route to', () => {
    for (const sc of SCENARIOS) {
      const avail = new Set(sc.availableRooms);
      const pool = sc.incidentPool === 'all' ? INCIDENTS.map((i) => i.id) : sc.incidentPool;
      for (const incId of pool) {
        for (const roomId of ['triage', ...INCIDENT_BY_ID[incId].rooms]) {
          expect(avail.has(roomId), `${sc.id} needs ${roomId} for ${incId}`).toBe(true);
        }
      }
    }
  });
});

describe('room rotation', () => {
  it('moves the door to a different reachable side', () => {
    const sim = new Sim(basement, 3);
    sim.buildRoom('triage', 7, 5, 3, 3);
    const room = sim.state.rooms[0];
    const before = { ...room.door };
    expect(sim.rotateRoom(room.id)).toBeNull();
    const after = room.door;
    expect(after.x === before.x && after.y === before.y).toBe(false);
    // door still on the room perimeter
    const onPerim =
      after.x === room.x || after.x === room.x + room.w - 1 ||
      after.y === room.y || after.y === room.y + room.h - 1;
    expect(onPerim).toBe(true);
  });

  it('respects a preferred door side when building', () => {
    const sim = new Sim(basement, 3);
    // side 2 = top
    expect(sim.buildRoom('triage', 7, 5, 3, 3, 2)).toBeNull();
    const room = sim.state.rooms[0];
    expect(room.door.y).toBe(room.y); // door on the top edge
  });
});

describe('building footprint & the grounds', () => {
  it('rejects indoor rooms outside the building and outdoor rooms inside it', () => {
    const sim = new Sim(basement, 11);
    sim.state.money += 10000;
    unlockAll(sim);
    const b = basement.building![0]; // { x:1, y:3, w:13, h:9 }
    // Indoor room fully inside the footprint: OK.
    expect(sim.buildRoom('triage', b.x + 1, b.y + 1, 3, 3)).toBeNull();
    // Indoor room out on the grounds (below the building): rejected.
    const gy = b.y + b.h; // first row below the footprint
    expect(sim.canPlace('debug_chapel', 3, gy, 3, 3)).toMatch(/building/i);
    // Outdoor room on the grounds: OK.
    expect(sim.buildRoom('bean_plantation', 3, gy, 2, 2)).toBeNull();
    // Outdoor room inside the building: rejected.
    expect(sim.canPlace('oak_grove', b.x + 1, b.y + 5, 2, 2)).toMatch(/grounds/i);
  });

  it('a Java Bean Plantation grows beans over time', () => {
    const sim = new Sim(basement, 5);
    sim.state.money += 10000;
    unlockAll(sim);
    const b = basement.building![0];
    const gy = b.y + b.h + 1;
    expect(sim.buildRoom('bean_plantation', 3, gy, 2, 2)).toBeNull();
    const before = sim.state.beans;
    sim.tick(30);
    expect(sim.state.beans).toBeGreaterThan(before);
  });

  it('arriving incidents with no room line up instead of stacking on the entrance', () => {
    const sim = new Sim(basement, 5);
    sim.state.spawnTimer = 9999; // no fresh spawns during the check
    // Fabricate five arrivals all sitting on the entrance tile, waiting for triage.
    for (let i = 0; i < 5; i++) {
      sim.state.incidents.push({
        id: sim.state.nextId++, def: 'recursive_panic', title: 't', severity: 1, haunt: 0,
        bounty: 50, patience: 999, maxPatience: 999, chain: ['triage'], target: null,
        phase: 'stuck', x: 0.5, y: 7.5, path: [], escalations: 0, mutations: 0,
        retargetTimer: 4, resurrected: false,
      });
    }
    // Let them walk to their queue slots.
    for (let t = 0; t < 120; t++) sim.tick(1 / 30);
    const xs = sim.state.incidents.map((i) => Math.round(i.x * 10) / 10);
    // No two ghosts occupy the same spot — they formed a line, not a stack.
    expect(new Set(xs).size).toBe(sim.state.incidents.length);
    // …and they moved off the entrance tile onto the walkway toward the building.
    expect(sim.state.incidents.every((i) => i.x > 0.6)).toBe(true);
  });

  it('walls the building off: ghosts may only cross at an entrance door', () => {
    const b = basement.building!; // single rect { x:6, y:4, w:12, h:7 }
    const entrances = buildingEntrances(b);
    expect(entrances.length).toBe(1); // one wing => one door
    const e = entrances[0];
    // The door faces the garden and sits nearest the map entrance.
    expect(inRects(b, e.ix, e.iy)).toBe(true);
    expect(inRects(b, e.ox, e.oy)).toBe(false);

    const block = buildingBlocker(b)!;
    // Crossing the wall at the entrance is allowed…
    expect(block(e.ox, e.oy, e.ix, e.iy)).toBe(false);
    // …but crossing the perimeter anywhere else is blocked.
    expect(block(6, 5, 5, 5)).toBe(true); // left wall, not the door
    expect(block(10, 4, 10, 3)).toBe(true); // top wall
    // Moving fully inside or fully outside is never blocked.
    expect(block(7, 5, 8, 5)).toBe(false);
    expect(block(1, 7, 2, 7)).toBe(false);
  });

  it('adjacent building wings form one connected structure with a single entrance', () => {
    // The Office With the Printer has two touching rectangles — they must read
    // as one building (one entrance), reachable across their shared edge.
    const printer = SCENARIOS[1];
    expect(printer.building!.length).toBe(2);
    expect(buildingEntrances(printer.building!).length).toBe(1);
    const block = buildingBlocker(printer.building!)!;
    // A step across the junction between the two rects is not walled off.
    expect(inRects(printer.building!, 12, 5)).toBe(true);
    expect(inRects(printer.building!, 13, 5)).toBe(true);
    expect(block(12, 5, 13, 5)).toBe(false);
  });

  it('indoor room doors are forced to face an inside corridor', () => {
    const sim = new Sim(basement, 8);
    sim.state.money += 10000;
    const building = basement.building!;
    const r0 = building[0]; // right edge at x = 6 + 12 - 1 = 17
    // Place a room flush against the building's right (outer) wall.
    expect(sim.buildRoom('triage', r0.x + r0.w - 3, r0.y + 1, 3, 3)).toBeNull();
    const room = sim.state.rooms[0];
    const out = doorOutside(room);
    // The door opens onto an inside corridor, not out through the exterior wall.
    expect(inRects(building, out.x, out.y)).toBe(true);
  });

  it('sandbox has no footprint, so anything can be placed anywhere', () => {
    const sandbox = makeSandbox({ money: 5000, disasterFreq: 0, audits: false, mutation: 0, failEnabled: false });
    const sim = new Sim(sandbox, 5);
    expect(sim.buildRoom('triage', 18, 11, 3, 3)).toBeNull();
    expect(sim.buildRoom('oak_grove', 4, 4, 2, 2)).toBeNull();
  });
});

describe('staff assignment rules', () => {
  it('rejects incompatible roles', () => {
    const sim = new Sim(basement, 42);
    unlockAll(sim);
    sim.buildRoom('printer_booth', 7, 5, 3, 3);
    // find a candidate that is NOT a printer exorcist
    const idx = sim.state.candidates.findIndex((c) => c.role !== 'printer_exorcist');
    sim.hire(idx);
    const staff = sim.state.staff[0];
    const err = sim.assign(staff.id, sim.state.rooms[0].id);
    expect(err).toMatch(/cannot work/);
  });
});

describe('incident lifecycle', () => {
  function readySim(): Sim {
    const sim = new Sim(basement, 7);
    sim.buildRoom('triage', 7, 5, 3, 3);
    sim.buildRoom('debug_chapel', 10, 5, 3, 3);
    sim.buildRoom('patch_unit', 14, 5, 3, 3);
    // hire & assign compatible staff by force
    sim.state.money += 10000;
    for (const [roomIdx, role] of [[0, 'bug_whisperer'], [1, 'bug_whisperer'], [2, 'devops_janitor']] as const) {
      sim.state.staff.push({
        id: sim.state.nextId++, name: `T${roomIdx}`, role, skill: 3, salary: 50,
        energy: 100, morale: 70, quirk: 'test', room: null,
        x: 1, y: 1, tx: 1, ty: 1, activity: 'idle', breakTimer: 0, lowMoraleTime: 0,
      });
      const st = sim.state.staff[sim.state.staff.length - 1];
      expect(sim.assign(st.id, sim.state.rooms[roomIdx].id)).toBeNull();
    }
    return sim;
  }

  it('incidents spawn, get processed through the chain, and resolve', () => {
    const sim = readySim();
    sim.tick(300); // several in-game hours
    expect(sim.state.stats.resolved).toBeGreaterThan(0);
  });

  it('incidents fail when nothing can serve them', () => {
    const sim = new Sim(basement, 7); // no rooms at all
    sim.tick(200);
    expect(sim.state.stats.failed).toBeGreaterThan(0);
    expect(sim.state.trust).toBeLessThan(basement.startTrust);
  });
});

describe('save round-trip', () => {
  it('serialises and restores identical state', () => {
    const sim = new Sim(basement, 99);
    sim.buildRoom('triage', 7, 5, 3, 3);
    sim.hire(0);
    sim.tick(30);
    const json = sim.serialize();
    const restored = Sim.fromState(JSON.parse(json));
    expect(restored.serialize()).toBe(json);
    // restored sim keeps ticking without error
    restored.tick(10);
    expect(restored.state.day).toBeGreaterThanOrEqual(1);
  });
});

describe('outcome detection', () => {
  it('detects bankruptcy failure', () => {
    const sim = new Sim(basement, 5);
    sim.state.money = -1000;
    sim.tick(2);
    expect(sim.outcome?.won).toBe(false);
  });

  it('detects victory when objectives are met', () => {
    const sim = new Sim(basement, 5);
    sim.state.stats.resolved = 12;
    sim.tick(2);
    expect(sim.outcome?.won).toBe(true);
  });
});
