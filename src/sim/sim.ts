import { BAL } from '../data/balance';
import { INCIDENT_BY_ID, INCIDENTS } from '../data/incidents';
import { DISASTERS, DISASTER_BY_ID } from '../data/disasters';
import { ROOM_BY_ID, upgradeCost, repairCost, demolishRefund } from '../data/rooms';
import { ROLE_BY_ID, salaryFor } from '../data/roles';
import {
  AUDIT_FAIL_LINES, AUDIT_PASS_LINES, FAIL_LINES, HIRE_LINES, RESOLVE_LINES,
  STAFF_FIRST_NAMES, STAFF_LAST_NAMES, STAFF_QUIRKS, TICKET_TITLES,
} from '../data/humour';
import type { RoomDef, ScenarioDef } from '../data/types';
import type { EdgeBlocker } from './grid';
import { ENTRANCE, GRID_H, buildingBlocker, doorOutside, doorSideOf, findDoor, findDoorOnSide, findPath, inRects, roomAt, validatePlacement } from './grid';
import { Rng } from './rng';
import type {
  IncidentState, Outcome, RoomState, SimEvent, SimState, StaffState,
} from './state';

export const SAVE_VERSION = 1;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class Sim {
  state: SimState;
  events: SimEvent[] = [];
  outcome: Outcome | null = null;
  private rng: Rng;
  private evalTimer = 0;
  private beanGrowth = 0; // fractional beans accrued by Java Bean Plantations
  private wallBlocker?: EdgeBlocker;
  private wallComputed = false;
  private spawnBag?: string[]; // cached, category-weighted incident spawn pool

  constructor(scenario: ScenarioDef, seed: number) {
    this.rng = new Rng(seed);
    this.state = {
      version: SAVE_VERSION,
      scenario,
      rngState: this.rng.state,
      day: 1,
      timeOfDay: 0,
      money: scenario.startMoney,
      trust: scenario.startTrust,
      debt: scenario.startDebt,
      coffee: scenario.startCoffee ?? 5,
      beans: scenario.startBeans ?? 10,
      nextId: 1,
      rooms: [],
      staff: [],
      candidates: [],
      incidents: [],
      spawnTimer: scenario.spawnIntervalStart * 0.6,
      disasterTimer: BAL.disasterCheckInterval,
      disasters: [],
      audit: {
        nextDay: scenario.audits ? 1 + scenario.auditEveryDays : 0,
        warned: false,
        passed: 0,
        failed: 0,
      },
      stats: { resolved: 0, failed: 0, resolvedByCategory: {}, income: 0, spent: 0, daysPlayed: 0 },
      refactoringEvent: 0,
    };
    this.refreshCandidates();
  }

  static fromState(state: SimState): Sim {
    const sim = Object.create(Sim.prototype) as Sim;
    sim.state = state;
    sim.events = [];
    sim.outcome = null;
    sim.rng = new Rng(0);
    sim.rng.state = state.rngState;
    sim.evalTimer = 0;
    return sim;
  }

  serialize(): string {
    this.state.rngState = this.rng.state;
    return JSON.stringify(this.state);
  }

  private emit(kind: SimEvent['kind'], msg: string): void {
    this.events.push({ kind, msg });
    if (this.events.length > 30) this.events.shift();
  }

  // ------------------------------------------------------------------ helpers

  room(id: number | null): RoomState | undefined {
    return this.state.rooms.find((r) => r.id === id);
  }

  staffById(id: number): StaffState | undefined {
    return this.state.staff.find((s) => s.id === id);
  }

  incidentById(id: number): IncidentState | undefined {
    return this.state.incidents.find((i) => i.id === id);
  }

  roomsOf(defId: string): RoomState[] {
    return this.state.rooms.filter((r) => r.def === defId);
  }

  private staffedRooms(defId: string): RoomState[] {
    return this.roomsOf(defId).filter(
      (r) => !r.broken && !r.possessed && this.presentStaff(r).length > 0,
    );
  }

  /** Staff assigned to a room that have actually arrived (working/training). */
  presentStaff(room: RoomState): StaffState[] {
    return room.staff
      .map((id) => this.staffById(id))
      .filter((s): s is StaffState => !!s && (s.activity === 'working' || s.activity === 'training'));
  }

  queueCap(room: RoomState): number {
    return ROOM_BY_ID[room.def].queueCap + (room.level - 1) * BAL.roomLevelQueue;
  }

  avgMorale(): number {
    const st = this.state.staff;
    if (st.length === 0) return 60;
    return st.reduce((a, s) => a + s.morale, 0) / st.length;
  }

  stability(): number {
    const s = this.state;
    const broken = s.rooms.filter((r) => r.broken).length;
    const possessed = s.rooms.filter((r) => r.possessed).length;
    const observatories = this.staffedRooms('observatory').length;
    return clamp(
      100 -
        s.debt * 0.55 -
        broken * 8 -
        possessed * 8 -
        s.disasters.length * 6 -
        (s.coffee === 0 ? 8 : 0) -
        s.incidents.length * 0.8 +
        observatories * BAL.observatoryStability +
        this.roomsOf('oak_grove').length * BAL.oakStability +
        (this.avgMorale() - 50) * 0.15,
      0,
      100,
    );
  }

  coffeeCap(): number {
    const reactors = this.roomsOf('coffee_reactor');
    return BAL.coffeeStockBase + reactors.reduce((a, r) => a + r.level * BAL.coffeeStockPerLevel, 0);
  }

  private hasDisaster(effect: string): boolean {
    return this.state.disasters.some((d) => DISASTER_BY_ID[d.def].effect === effect);
  }

  spawnInterval(): number {
    const sc = this.state.scenario;
    const base = Math.max(
      sc.spawnIntervalMin,
      sc.spawnIntervalStart * Math.pow(0.9, this.state.day - 1),
    );
    return this.hasDisaster('spawnSurge') ? base / 3 : base;
  }

  // ------------------------------------------------------------------ actions

  /**
   * The buildable zone for a room def: inside the building footprint for indoor
   * rooms, out on the grounds for outdoor rooms. Undefined = no footprint
   * (sandbox) so anywhere in the interior is fair game.
   */
  private zoneFor(def: RoomDef): { ok: (x: number, y: number) => boolean; msg: string } | undefined {
    const building = this.state.scenario.building;
    if (!building) return undefined;
    if (def.outdoor) {
      return {
        ok: (x, y) => x >= 1 && !inRects(building, x, y),
        msg: 'Outdoor rooms go on the grounds, not inside the building',
      };
    }
    return {
      ok: (x, y) => inRects(building, x, y),
      msg: 'Must be built inside the building',
    };
  }

  /** The building's wall collision (entrance-only access), or undefined if no footprint. */
  private wall(): EdgeBlocker | undefined {
    if (!this.wallComputed) {
      this.wallBlocker = buildingBlocker(this.state.scenario.building);
      this.wallComputed = true;
    }
    return this.wallBlocker;
  }

  /**
   * Which tiles a room's door may face. Indoor rooms must open onto an inside
   * corridor (so ghosts reach them via the building entrance, not the outside
   * wall); outdoor rooms open onto the grounds.
   */
  private doorFacing(def: RoomDef): ((x: number, y: number) => boolean) | undefined {
    const b = this.state.scenario.building;
    if (!b) return undefined;
    return def.outdoor ? (x, y) => !inRects(b, x, y) : (x, y) => inRects(b, x, y);
  }

  /** Whether a room type is unlocked in the current contract (all in sandbox). */
  roomAvailable(defId: string): boolean {
    const a = this.state.scenario.availableRooms;
    return !a || a.includes(defId);
  }

  /** Whether a staff role is unlocked in the current contract (all in sandbox). */
  roleAvailable(roleId: string): boolean {
    const a = this.state.scenario.availableRoles;
    return !a || a.includes(roleId);
  }

  /** Validate a placement without building it — used by the placement preview. */
  canPlace(defId: string, x: number, y: number, w: number, h: number, preferSide = 0): string | null {
    const def = ROOM_BY_ID[defId];
    if (!def) return 'Unknown room';
    if (!this.roomAvailable(defId)) return 'Not unlocked in this contract yet';
    return validatePlacement(this.state.rooms, def, x, y, w, h, preferSide, this.zoneFor(def), this.wall(), this.doorFacing(def));
  }

  buildRoom(defId: string, x: number, y: number, w: number, h: number, preferSide = 0): string | null {
    const def = ROOM_BY_ID[defId];
    if (!def) return 'Unknown room';
    if (!this.roomAvailable(defId)) return 'Not unlocked in this contract yet';
    if (this.state.money < def.cost) return 'Not enough money';
    const err = validatePlacement(this.state.rooms, def, x, y, w, h, preferSide, this.zoneFor(def), this.wall(), this.doorFacing(def));
    if (err) return err;
    const door = findDoor(this.state.rooms, x, y, w, h, preferSide, this.doorFacing(def))!;
    this.state.rooms.push({
      id: this.state.nextId++,
      def: defId, x, y, w, h, door,
      level: 1, condition: 100, broken: false, possessed: false,
      staff: [], queue: [], serving: null,
    });
    this.state.money -= def.cost;
    this.state.stats.spent += def.cost;
    return null;
  }

  /** Cycle a placed room's door to the next reachable side (rotate). */
  rotateRoom(id: number): string | null {
    const room = this.room(id);
    if (!room) return 'No room';
    const others = this.state.rooms.filter((r) => r.id !== id);
    const facing = this.doorFacing(ROOM_BY_ID[room.def]);
    const cur = doorSideOf(room);
    for (let i = 1; i <= 4; i++) {
      const side = (cur + i) % 4;
      const door = findDoorOnSide(others, room.x, room.y, room.w, room.h, side, facing);
      if (!door) continue;
      // The door moves but the footprint doesn't, so only this room's own
      // reachability can change — check just that.
      const hypo: RoomState = { ...room, door };
      if (!findPath(this.state.rooms, ENTRANCE, doorOutside(hypo), this.wall())) continue;
      room.door = door;
      // Anything heading here must re-path to the new doorway. Collect every
      // affected incident, requeue it, then clear its retarget timer so it walks
      // to the new door on the very next tick instead of idling at the old spot.
      const affected = new Set<number>([...room.queue]);
      if (room.serving) { affected.add(room.serving.incident); room.serving = null; }
      for (const inc of this.state.incidents) {
        if (inc.target === id && (inc.phase === 'walking' || inc.phase === 'queued')) affected.add(inc.id);
      }
      for (const iid of affected) {
        this.requeueIncident(iid);
        const inc = this.incidentById(iid);
        if (inc) inc.retargetTimer = 0;
      }
      for (const sid of room.staff) {
        const st = this.staffById(sid);
        if (st && st.activity === 'walking') this.routeStaffTo(st, room);
      }
      return null;
    }
    return 'No other reachable doorway — clear some space around the room.';
  }

  demolishRoom(id: number): void {
    const room = this.room(id);
    if (!room) return;
    for (const sid of [...room.staff]) this.unassign(sid);
    if (room.serving) this.requeueIncident(room.serving.incident);
    for (const iid of [...room.queue]) this.requeueIncident(iid);
    this.state.rooms = this.state.rooms.filter((r) => r.id !== id);
    const refund = demolishRefund(ROOM_BY_ID[room.def]);
    this.state.money += refund;
    this.state.debt = clamp(this.state.debt + BAL.demolishDebt, 0, 100);
    this.emit('info', `${ROOM_BY_ID[room.def].name} demolished (+$${refund}, +${BAL.demolishDebt} debt).`);
  }

  upgradeRoom(id: number): string | null {
    const room = this.room(id);
    if (!room) return 'No room';
    if (room.level >= BAL.maxRoomLevel) return 'Max level';
    const cost = upgradeCost(ROOM_BY_ID[room.def], room.level);
    if (this.state.money < cost) return 'Not enough money';
    this.state.money -= cost;
    this.state.stats.spent += cost;
    room.level++;
    room.condition = 100;
    this.emit('good', `${ROOM_BY_ID[room.def].name} upgraded to level ${room.level}.`);
    return null;
  }

  repairRoom(id: number): string | null {
    const room = this.room(id);
    if (!room) return 'No room';
    const cost = repairCost(ROOM_BY_ID[room.def]);
    if (this.state.money < cost) return 'Not enough money';
    this.state.money -= cost;
    this.state.stats.spent += cost;
    room.condition = 100;
    room.broken = false;
    this.emit('good', `${ROOM_BY_ID[room.def].name} repaired.`);
    return null;
  }

  hire(index: number): string | null {
    const c = this.state.candidates[index];
    if (!c) return 'No candidate';
    if (this.state.money < c.salary) return 'Not enough money for the signing fee';
    this.state.money -= c.salary;
    this.state.stats.spent += c.salary;
    this.state.candidates.splice(index, 1);
    this.state.staff.push({
      id: this.state.nextId++,
      name: c.name, role: c.role, skill: c.skill, salary: c.salary,
      energy: 100, morale: 70, quirk: c.quirk,
      room: null,
      x: ENTRANCE.x + 0.5, y: ENTRANCE.y + 0.5,
      tx: ENTRANCE.x + 0.5, ty: ENTRANCE.y + 0.5,
      activity: 'idle', breakTimer: 0, lowMoraleTime: 0,
    });
    this.emit('good', `${c.name} hired — ${this.rng.pick([...HIRE_LINES])}`);
    return null;
  }

  fire(staffId: number): void {
    const s = this.staffById(staffId);
    if (!s) return;
    this.unassign(staffId);
    this.state.staff = this.state.staff.filter((x) => x.id !== staffId);
    for (const other of this.state.staff) other.morale = clamp(other.morale - 3, 0, 100);
    this.emit('info', `${s.name} let go. The office plants droop slightly.`);
  }

  assign(staffId: number, roomId: number): string | null {
    const s = this.staffById(staffId);
    const room = this.room(roomId);
    if (!s || !room) return 'Invalid';
    const def = ROOM_BY_ID[room.def];
    if (def.roles.length > 0 && !def.roles.includes(s.role)) {
      return `${ROLE_BY_ID[s.role].name} cannot work in ${def.name}`;
    }
    // Two workers to a room — a second pair of hands speeds work; a third would
    // just get underfoot.
    if (!room.staff.includes(staffId) && room.staff.length >= BAL.maxRoomStaff) {
      return `${def.name} is full (max ${BAL.maxRoomStaff} staff).`;
    }
    this.unassign(staffId);
    s.room = roomId;
    room.staff.push(staffId);
    this.routeStaffTo(s, room);
    s.activity = 'walking';
    return null;
  }

  /** The tile a staff member should path FROM (out the door if inside a room). */
  private staffStartTile(st: StaffState): { x: number; y: number } {
    const tx = Math.floor(st.x);
    const ty = Math.floor(st.y);
    const r = roomAt(this.state.rooms, tx, ty);
    return r ? doorOutside(r) : { x: tx, y: ty };
  }

  /** Build a corridor route to a room, entering through its door tile. */
  private routeStaffTo(st: StaffState, room: RoomState): void {
    const start = this.staffStartTile(st);
    const out = doorOutside(room);
    const corridor = findPath(this.state.rooms, start, out, this.wall()) ?? [];
    const interior = {
      x: room.x + Math.floor(this.rng.next() * room.w),
      y: room.y + Math.floor(this.rng.next() * room.h),
    };
    st.path = [...corridor, { x: room.door.x, y: room.door.y }, interior];
    const last = st.path[st.path.length - 1];
    st.tx = last.x + 0.5;
    st.ty = last.y + 0.5;
  }

  /** Advance a staff member along its path; returns true when the path ends. */
  private advanceStaff(st: StaffState, dist: number): boolean {
    while (dist > 0 && st.path && st.path.length > 0) {
      const n = st.path[0];
      const nx = n.x + 0.5;
      const ny = n.y + 0.5;
      const dx = nx - st.x;
      const dy = ny - st.y;
      const d = Math.hypot(dx, dy);
      if (d <= dist) {
        st.x = nx;
        st.y = ny;
        st.path.shift();
        dist -= d;
      } else {
        st.x += (dx / d) * dist;
        st.y += (dy / d) * dist;
        dist = 0;
      }
    }
    return !st.path || st.path.length === 0;
  }

  unassign(staffId: number): void {
    const s = this.staffById(staffId);
    if (!s) return;
    if (s.room !== null) {
      const room = this.room(s.room);
      if (room) room.staff = room.staff.filter((id) => id !== staffId);
    }
    s.room = null;
    if (s.activity === 'working' || s.activity === 'training') s.activity = 'idle';
  }

  buyBeans(): string | null {
    if (this.state.money < BAL.beanPrice) return 'Not enough money';
    this.state.money -= BAL.beanPrice;
    this.state.stats.spent += BAL.beanPrice;
    this.state.beans += BAL.beansPerPurchase;
    return null;
  }

  endDisaster(index: number): string | null {
    const d = this.state.disasters[index];
    if (!d) return 'No disaster';
    const def = DISASTER_BY_ID[d.def];
    if (def.fixCost <= 0) return 'This one cannot be bought off';
    if (this.state.money < def.fixCost) return 'Not enough money';
    this.state.money -= def.fixCost;
    this.state.stats.spent += def.fixCost;
    this.expireDisaster(index);
    return null;
  }

  private expireDisaster(index: number): void {
    const d = this.state.disasters[index];
    const def = DISASTER_BY_ID[d.def];
    if (def.effect === 'roomPossessed' && d.roomId !== undefined) {
      const room = this.room(d.roomId);
      if (room) room.possessed = false;
    }
    this.state.disasters.splice(index, 1);
    this.emit('info', def.oneLiner);
  }

  // ------------------------------------------------------------------ spawning

  /**
   * Roles the hiring pool must always offer so every room this contract's
   * incidents route to is staffable. Leads with the two generalists (Bug
   * Whisperer covers Triage/Chapel/Arena, DevOps Janitor covers
   * Triage/Patch/Release), then adds one compatible role for any required room
   * they don't already cover. Restricted to roles unlocked so far.
   */
  hireMustOffer(): string[] {
    const avail = this.state.scenario.availableRoles ?? Object.keys(ROLE_BY_ID);
    const availSet = new Set(avail);
    const must: string[] = [];
    const add = (r: string) => { if (availSet.has(r) && !must.includes(r)) must.push(r); };
    add('bug_whisperer');
    add('devops_janitor');
    const sc = this.state.scenario;
    const pool = sc.incidentPool === 'all' ? INCIDENTS.map((i) => i.id) : sc.incidentPool;
    const rooms = new Set<string>(['triage']);
    for (const id of pool) {
      const inc = INCIDENT_BY_ID[id];
      if (inc) for (const r of inc.rooms) rooms.add(r);
    }
    for (const roomId of rooms) {
      const def = ROOM_BY_ID[roomId];
      if (!def || def.roles.length === 0 || !this.roomAvailable(roomId)) continue;
      if (def.roles.some((r) => must.includes(r))) continue; // already coverable
      const pick = def.roles.find((r) => availSet.has(r));
      if (pick) add(pick);
    }
    return must;
  }

  private refreshCandidates(): void {
    const avail = this.state.scenario.availableRoles ?? Object.keys(ROLE_BY_ID);
    const must = this.hireMustOffer();
    const count = Math.max(BAL.candidateCount, must.length);
    this.state.candidates = [];
    for (let i = 0; i < count; i++) {
      const role = ROLE_BY_ID[i < must.length ? must[i] : this.rng.pick(avail)];
      const skill = this.rng.int(1, Math.min(5, 2 + Math.floor(this.state.day / 2)));
      this.state.candidates.push({
        name: `${this.rng.pick([...STAFF_FIRST_NAMES])} ${this.rng.pick([...STAFF_LAST_NAMES])}`,
        role: role.id,
        skill,
        salary: salaryFor(role, skill),
        quirk: this.rng.pick([...STAFF_QUIRKS]),
      });
    }
  }

  /**
   * The incident spawn pool, weighted so that categories the contract's win
   * conditions require (e.g. "resolve 8 printer incidents") arrive often enough
   * to actually be met. Uniform when the contract has no category objective.
   * Cached — the scenario doesn't change over a run.
   */
  private spawnPool(): string[] {
    if (this.spawnBag) return this.spawnBag;
    const sc = this.state.scenario;
    const poolIds = sc.incidentPool === 'all' ? INCIDENTS.map((i) => i.id) : [...sc.incidentPool];
    const win = sc.win ?? [];
    const reqCats = new Set(
      win.filter((w) => w.type === 'resolveCategory' && w.category).map((w) => w.category!),
    );
    if (reqCats.size === 0) { this.spawnBag = poolIds; return poolIds; }
    // Aim for the required categories to be roughly the objective's share of the
    // total (e.g. 8 print / 20 total = 40%), so meeting it lines up with the run.
    const totalResolve = win.find((w) => w.type === 'resolve')?.value ?? 0;
    const reqValue = win.filter((w) => w.type === 'resolveCategory').reduce((a, w) => a + w.value, 0);
    const targetFrac = totalResolve > 0 ? Math.min(0.6, reqValue / totalResolve) : 0.45;
    const nReq = poolIds.filter((id) => reqCats.has(INCIDENT_BY_ID[id].category)).length;
    const nOther = poolIds.length - nReq;
    let weight = 1;
    if (nReq > 0 && nOther > 0 && targetFrac < 1) {
      weight = Math.max(1, Math.ceil((targetFrac * nOther) / (nReq * (1 - targetFrac))));
    }
    const bag: string[] = [];
    for (const id of poolIds) {
      const w = reqCats.has(INCIDENT_BY_ID[id].category) ? weight : 1;
      for (let k = 0; k < w; k++) bag.push(id);
    }
    this.spawnBag = bag;
    return bag;
  }

  private spawnIncident(): void {
    const def = INCIDENT_BY_ID[this.rng.pick(this.spawnPool())];
    const tier = this.state.trust < 40 ? 1 : this.state.trust < 60 ? 2 : this.state.trust < 80 ? 3 : 4;
    const severity = clamp(
      1 + Math.floor(this.rng.next() * tier + (this.state.day - 1) * 0.2), 1, 5,
    );
    const patience = def.patience * (1 + severity * 0.1);
    this.state.incidents.push({
      id: this.state.nextId++,
      def: def.id,
      title: this.rng.pick(TICKET_TITLES[def.id] ?? [def.name]),
      severity,
      haunt: def.haunt,
      bounty: def.bounty,
      patience,
      maxPatience: patience,
      chain: ['triage', ...def.rooms],
      target: null,
      phase: 'stuck',
      x: ENTRANCE.x + 0.5,
      y: ENTRANCE.y + 0.5,
      path: [],
      escalations: 0,
      mutations: 0,
      retargetTimer: 0,
      resurrected: false,
    });
  }

  // ------------------------------------------------------------------ incident flow

  /** The left edge of the building footprint (default when there is no footprint). */
  private buildingLeftEdge(): number {
    const b = this.state.scenario.building;
    return b && b.length ? Math.min(...b.map((r) => r.x)) : 6;
  }

  /**
   * Nth waiting slot on the campus walkway: a line running from just outside the
   * building back toward the entrance, spilling into the garden if it gets busy.
   */
  private campusWaitTile(index: number): { x: number; y: number } {
    const leftX = this.buildingLeftEdge();
    const row = ENTRANCE.y;
    const horiz = Math.max(1, leftX - 1);
    if (index < horiz) return { x: leftX - 1 - index, y: row };
    const over = index - horiz;
    const band = over % 6;
    const dy = band < 3 ? band + 1 : -(band - 2); // +1,+2,+3,-1,-2,-3
    const col = Math.min(1 + Math.floor(over / 6), leftX - 1);
    return { x: col, y: clamp(row + dy, 0, GRID_H - 1) };
  }

  /** Move an incident's position toward a tile centre by up to `step` tiles. */
  private moveToward(inc: IncidentState, tile: { x: number; y: number }, step: number): void {
    const tx = tile.x + 0.5;
    const ty = tile.y + 0.5;
    const dx = tx - inc.x;
    const dy = ty - inc.y;
    const d = Math.hypot(dx, dy);
    if (d <= step || d === 0) { inc.x = tx; inc.y = ty; }
    else { inc.x += (dx / d) * step; inc.y += (dy / d) * step; }
  }

  private acquireTarget(inc: IncidentState): void {
    const nextDef = inc.chain[0];
    if (!nextDef) return;
    const options = this.state.rooms.filter(
      (r) =>
        r.def === nextDef && !r.broken && !r.possessed &&
        r.queue.length < this.queueCap(r),
    );
    options.sort((a, b) => a.queue.length - b.queue.length);
    for (const room of options) {
      const from = { x: Math.floor(inc.x), y: Math.floor(inc.y) };
      const path = findPath(this.state.rooms, from, doorOutside(room), this.wall());
      if (path) {
        inc.target = room.id;
        inc.path = path;
        inc.phase = 'walking';
        return;
      }
    }
    inc.target = null;
    inc.phase = 'stuck';
    inc.retargetTimer = BAL.retargetInterval;
  }

  private requeueIncident(id: number): void {
    const inc = this.incidentById(id);
    if (!inc) return;
    const room = this.room(inc.target);
    if (room) {
      room.queue = room.queue.filter((q) => q !== id);
      if (room.serving?.incident === id) room.serving = null;
    }
    // If stranded inside a room's footprint (e.g. mid-service), step outside its door
    const inside = roomAt(this.state.rooms, Math.floor(inc.x), Math.floor(inc.y));
    if (inside) {
      const out = doorOutside(inside);
      inc.x = out.x + 0.5;
      inc.y = out.y + 0.5;
    }
    inc.target = null;
    inc.path = [];
    inc.phase = 'stuck';
    inc.retargetTimer = 0.5;
  }

  private failIncident(inc: IncidentState, index: number): void {
    // Backup Resurrection Lab: one second chance per incident
    if (!inc.resurrected && this.staffedRooms('backup_lab').length > 0 &&
        this.rng.chance(BAL.backupSaveChance)) {
      inc.resurrected = true;
      inc.patience = inc.maxPatience * 0.6;
      this.emit('good', `"${inc.title}" was restored from backup. It remembers nothing.`);
      return;
    }
    const room = this.room(inc.target);
    if (room) {
      room.queue = room.queue.filter((q) => q !== inc.id);
      if (room.serving?.incident === inc.id) room.serving = null;
    }
    this.state.incidents.splice(index, 1);
    this.state.trust = clamp(this.state.trust - BAL.failTrustHit - inc.severity * 0.5, 0, 100);
    this.state.debt = clamp(this.state.debt + BAL.failDebtHit + inc.haunt, 0, 100);
    this.state.stats.failed++;
    this.emit('bad', `"${inc.title}" — ${this.rng.pick([...FAIL_LINES])}`);
  }

  private mutateIncident(inc: IncidentState): void {
    const def = INCIDENT_BY_ID[inc.def];
    if (!def.mutateTo || def.mutateTo.length === 0) return;
    const newDef = INCIDENT_BY_ID[this.rng.pick([...def.mutateTo])];
    const oldName = def.name;
    const room = this.room(inc.target);
    if (room) room.queue = room.queue.filter((q) => q !== inc.id);
    inc.def = newDef.id;
    inc.title = this.rng.pick(TICKET_TITLES[newDef.id] ?? [newDef.name]);
    inc.haunt = newDef.haunt;
    inc.bounty = Math.max(inc.bounty, newDef.bounty);
    inc.mutations++;
    inc.chain = [...newDef.rooms]; // already triaged
    inc.target = null;
    inc.phase = 'stuck';
    inc.retargetTimer = 0.3;
    this.state.debt = clamp(this.state.debt + BAL.mutationDebt, 0, 100);
    this.emit('bad', `${oldName} mutated into ${newDef.name}. The queue shudders.`);
  }

  private resolveIncident(inc: IncidentState, exitFrom: RoomState): void {
    const def = INCIDENT_BY_ID[inc.def];
    const trustMult = 0.8 + this.state.trust / 200;
    const payout = Math.round(inc.bounty * (0.8 + inc.severity * 0.45) * trustMult);
    this.state.money += payout;
    this.state.stats.income += payout;
    this.state.trust = clamp(
      this.state.trust + BAL.resolveTrustPerSeverity * inc.severity, 0, 100,
    );
    this.state.stats.resolved++;
    this.state.stats.resolvedByCategory[def.category] =
      (this.state.stats.resolvedByCategory[def.category] ?? 0) + 1;
    // Always surface the payout so it's clear that resolving tickets earns money.
    const flavour = this.rng.chance(0.4) ? ` — ${this.rng.pick([...RESOLVE_LINES])}` : '';
    this.emit('good', `+$${payout} · ${def.name} resolved${flavour}`);
    // Step out of the door, then walk back to the entrance
    const out = doorOutside(exitFrom);
    inc.x = out.x + 0.5;
    inc.y = out.y + 0.5;
    inc.phase = 'leaving';
    inc.target = null;
    inc.path = findPath(this.state.rooms, out, ENTRANCE, this.wall()) ?? [];
  }

  private serviceTime(inc: IncidentState, room: RoomState): number {
    const def = INCIDENT_BY_ID[inc.def];
    const roomSpeed = 1 + (room.level - 1) * BAL.roomLevelSpeed;
    const staff = this.presentStaff(room);
    let staffFactor = 0.5; // unstaffed: things limp along
    if (staff.length > 0) {
      const factors = staff
        .map((s) => {
          let f = 0.55 + s.skill * 0.17;
          if (s.energy < 30) f *= 0.7;
          if (s.morale < 40) f *= 0.8;
          return f;
        })
        .sort((a, b) => b - a);
      // The primary worker sets the pace; a second pair of hands adds a fraction
      // on top, so a 2nd staffer always speeds the room up, never slows it.
      staffFactor = factors[0] + (factors[1] ?? 0) * BAL.secondStaffFactor;
    }
    let t = (def.service * (0.7 + inc.severity * 0.25)) / (roomSpeed * staffFactor);
    if (ROOM_BY_ID[room.def].special === 'triage') t *= BAL.triageServiceFactor;
    if (this.state.refactoringEvent > 0) t *= 1.6;
    return t;
  }

  // ------------------------------------------------------------------ main tick

  tick(dtTotal: number): void {
    let rest = dtTotal;
    while (rest > 0 && !this.outcome) {
      const dt = Math.min(rest, 0.12);
      this.step(dt);
      rest -= dt;
    }
  }

  private step(dt: number): void {
    const s = this.state;
    const frozen = this.hasDisaster('freeze');
    const noWork = this.hasDisaster('noWork');
    const pathFactor = this.hasDisaster('pathChaos') ? 0.5 : 1;

    // ---- time
    s.timeOfDay += dt / BAL.dayLength;
    if (s.timeOfDay >= 1) {
      s.timeOfDay -= 1;
      this.newDay();
    }

    // ---- disasters lifecycle
    for (let i = s.disasters.length - 1; i >= 0; i--) {
      s.disasters[i].remaining -= dt;
      if (s.disasters[i].remaining <= 0) this.expireDisaster(i);
    }
    if (s.scenario.disasters) {
      s.disasterTimer -= dt;
      if (s.disasterTimer <= 0) {
        s.disasterTimer = BAL.disasterCheckInterval;
        this.maybeDisaster();
      }
    }
    if (this.hasDisaster('moraleDrain')) {
      for (const st of s.staff) st.morale = clamp(st.morale - 0.8 * dt, 0, 100);
    }

    // ---- Great Refactoring (debt overload)
    if (s.refactoringEvent > 0) {
      s.refactoringEvent -= dt;
      s.debt = clamp(s.debt - 1.1 * dt, 0, 100);
      if (s.refactoringEvent <= 0) {
        this.emit('good', 'The Great Refactoring is over. The code is cleaner. The team is quieter.');
      }
    } else if (s.debt >= 100) {
      s.refactoringEvent = 45;
      this.emit('disaster', 'TECHNICAL DEBT CRITICAL: The Great Refactoring begins. Everything slows down.');
    }

    // ---- spawning
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      s.spawnTimer = this.spawnInterval();
      this.spawnIncident();
    }

    // ---- incidents
    const warRoomStaffed = this.staffedRooms('war_room').length > 0;
    const e1 = BAL.escalate1 * (warRoomStaffed ? BAL.warRoomEscalateFactor : 1);
    const e2 = BAL.escalate2 * (warRoomStaffed ? BAL.warRoomEscalateFactor : 1);
    // Arrivals that can't get into triage yet line up on the campus walkway
    // (in arrival order) instead of piling onto the single entrance tile.
    const waitSlot = new Map<number, number>();
    s.incidents
      .filter((inc) => inc.phase === 'stuck' && inc.chain[0] === 'triage')
      .sort((a, b) => a.id - b.id)
      .forEach((inc, idx) => waitSlot.set(inc.id, idx));
    for (let i = s.incidents.length - 1; i >= 0; i--) {
      const inc = s.incidents[i];
      switch (inc.phase) {
        case 'stuck': {
          inc.patience -= dt * BAL.stuckPatienceFactor;
          inc.retargetTimer -= dt;
          if (inc.retargetTimer <= 0) {
            this.acquireTarget(inc);
            if (inc.phase === 'stuck') inc.retargetTimer = BAL.retargetInterval;
          }
          const slot = waitSlot.get(inc.id);
          if (slot !== undefined) {
            this.moveToward(inc, this.campusWaitTile(slot), BAL.incidentSpeed * pathFactor * dt);
          }
          if (inc.patience <= 0) this.failIncident(inc, i);
          break;
        }
        case 'walking':
        case 'leaving': {
          this.moveAlongPath(inc, BAL.incidentSpeed * pathFactor * dt);
          if (inc.path.length === 0) {
            if (inc.phase === 'leaving') {
              s.incidents.splice(i, 1);
            } else {
              const room = this.room(inc.target);
              if (!room || room.broken || room.possessed || room.queue.length >= this.queueCap(room)) {
                this.requeueIncident(inc.id);
              } else {
                room.queue.push(inc.id);
                inc.phase = 'queued';
              }
            }
          }
          break;
        }
        case 'queued': {
          inc.patience -= dt * (1 + inc.escalations * 0.15);
          const frac = inc.patience / inc.maxPatience;
          if (inc.escalations === 0 && frac < e1) this.escalate(inc);
          else if (inc.escalations === 1 && frac < e2) this.escalate(inc);
          if (s.scenario.mutationChance > 0 && this.rng.chance(s.scenario.mutationChance * dt)) {
            this.mutateIncident(inc);
          } else if (inc.patience <= 0) {
            this.failIncident(inc, i);
          }
          break;
        }
        case 'inService':
          break; // handled by room
      }
    }

    // ---- rooms
    for (const room of s.rooms) {
      const def = ROOM_BY_ID[room.def];
      if (!def.service || room.broken || room.possessed) continue;
      if (frozen || noWork) continue;
      const staff = this.presentStaff(room).filter((st) => st.activity === 'working');
      if (room.serving) {
        if (staff.length > 0 && !frozen && !noWork) {
          room.serving.remaining -= dt;
          if (room.serving.remaining <= 0) this.completeService(room);
        }
      } else if (room.queue.length > 0 && staff.length > 0) {
        const incId = room.queue.shift()!;
        const inc = this.incidentById(incId);
        if (inc) {
          inc.phase = 'inService';
          // Anchor at the door; the renderer walks it in through the doorway.
          inc.x = room.door.x + 0.5;
          inc.y = room.door.y + 0.5;
          const t = this.serviceTime(inc, room);
          room.serving = { incident: incId, remaining: t, total: t };
        }
      }
    }

    // ---- staff
    this.updateStaff(dt, noWork, pathFactor);

    // ---- coffee brewing
    const cap = this.coffeeCap();
    for (const room of this.roomsOf('coffee_reactor')) {
      if (room.broken || room.possessed || s.beans <= 0 || s.coffee >= cap) continue;
      const staffed = this.presentStaff(room).length > 0;
      const rate = (dt / BAL.brewSeconds) * (staffed ? 1 / BAL.brewStaffedFactor : 1);
      room.brew = (room.brew ?? 0) + rate;
      while ((room.brew ?? 0) >= 1 && s.beans > 0 && s.coffee < cap) {
        room.brew! -= 1;
        s.beans--;
        s.coffee++;
      }
    }

    // ---- refactor dojo: debt burn (training handled in updateStaff)
    for (const dojo of this.staffedRooms('refactor_dojo')) {
      const n = this.presentStaff(dojo).length;
      s.debt = clamp(s.debt - (n * BAL.trainDebtPerStaffPerDay * dt) / BAL.dayLength, 0, 100);
    }

    // ---- the grounds (outdoor rooms). A tending Groundskeeper / Server Rancher
    // roughly doubles the yield of the plot they are assigned to.
    let plantYield = 0;
    for (const p of this.roomsOf('bean_plantation')) plantYield += this.presentStaff(p).length > 0 ? 2 : 1;
    if (plantYield > 0 && s.beans < BAL.plantationBeanCap) {
      this.beanGrowth += (plantYield * dt) / BAL.plantationBeanSeconds;
      while (this.beanGrowth >= 1 && s.beans < BAL.plantationBeanCap) {
        this.beanGrowth -= 1;
        s.beans++;
      }
    }
    let farmYield = 0;
    for (const f of this.roomsOf('server_farm')) farmYield += this.presentStaff(f).length > 0 ? 1.6 : 1;
    if (farmYield > 0) s.money += (farmYield * BAL.farmIncomePerDay * dt) / BAL.dayLength;

    // ---- win/fail evaluation (1 Hz)
    this.evalTimer += dt;
    if (this.evalTimer >= 1) {
      this.evalTimer = 0;
      this.checkOutcome();
    }
  }

  private escalate(inc: IncidentState): void {
    inc.escalations++;
    inc.severity = clamp(inc.severity + 1, 1, 5);
    inc.bounty = Math.round(inc.bounty * 1.3);
    this.emit('bad', `"${inc.title}" escalated to severity ${inc.severity}.`);
  }

  private moveAlongPath(inc: IncidentState, dist: number): void {
    while (dist > 0 && inc.path.length > 0) {
      const next = inc.path[0];
      const nx = next.x + 0.5;
      const ny = next.y + 0.5;
      const dx = nx - inc.x;
      const dy = ny - inc.y;
      const d = Math.hypot(dx, dy);
      if (d <= dist) {
        inc.x = nx;
        inc.y = ny;
        inc.path.shift();
        dist -= d;
      } else {
        inc.x += (dx / d) * dist;
        inc.y += (dy / d) * dist;
        dist = 0;
      }
    }
  }

  private completeService(room: RoomState): void {
    const incId = room.serving!.incident;
    room.serving = null;
    const inc = this.incidentById(incId);
    room.condition -= BAL.conditionPerService;
    if (room.condition <= BAL.brokenThreshold) {
      room.condition = 0;
      room.broken = true;
      this.emit('bad', `${ROOM_BY_ID[room.def].name} broke down. Something inside is laughing.`);
      if (inc) this.requeueIncident(incId);
      return;
    }
    if (!inc) return;
    inc.chain.shift();
    if (inc.chain.length === 0) {
      this.resolveIncident(inc, room);
    } else {
      // Step out of the door before heading to the next room in the chain
      const out = doorOutside(room);
      inc.x = out.x + 0.5;
      inc.y = out.y + 0.5;
      inc.patience = Math.min(inc.maxPatience, inc.patience + inc.maxPatience * 0.35);
      inc.target = null;
      inc.phase = 'stuck';
      inc.retargetTimer = 0;
    }
  }

  private updateStaff(dt: number, noWork: boolean, pathFactor: number): void {
    const s = this.state;
    const reactors = this.roomsOf('coffee_reactor').filter((r) => !r.broken && !r.possessed);
    let oakWeight = 0;
    for (const o of this.roomsOf('oak_grove')) oakWeight += this.presentStaff(o).length > 0 ? 1.5 : 1;
    const oakMorale = oakWeight * BAL.oakMoraleRegen * dt;
    for (let i = s.staff.length - 1; i >= 0; i--) {
      const st = s.staff[i];
      switch (st.activity) {
        case 'walking': {
          const step = BAL.staffSpeed * pathFactor * dt;
          let arrived: boolean;
          if (st.path && st.path.length > 0) {
            arrived = this.advanceStaff(st, step);
          } else {
            // Fallback straight-line (e.g. legacy saves without a path).
            const dx = st.tx - st.x;
            const dy = st.ty - st.y;
            const d = Math.hypot(dx, dy);
            if (d <= step) { st.x = st.tx; st.y = st.ty; arrived = true; }
            else { st.x += (dx / d) * step; st.y += (dy / d) * step; arrived = false; }
          }
          if (arrived) {
            st.path = undefined;
            if (st.room !== null) {
              const room = this.room(st.room);
              st.activity = room && ROOM_BY_ID[room.def].special === 'refactor' ? 'training' : 'working';
            } else {
              st.activity = 'idle';
            }
          }
          break;
        }
        case 'working':
        case 'training': {
          if (!noWork) {
            st.energy = clamp(st.energy - BAL.energyDrainWork * dt, 0, 100);
            if (st.activity === 'training') {
              st.skill = Math.min(5, st.skill + (BAL.trainSkillPerDay * dt) / BAL.dayLength);
            }
          }
          if (st.energy <= BAL.energyBreakThreshold && reactors.length > 0) {
            this.routeStaffTo(st, reactors[0]);
            st.activity = 'break';
            st.breakTimer = BAL.breakDuration + 2; // includes walk-ish time
          }
          break;
        }
        case 'break': {
          // Walk to the reactor along the path, then sip when the timer ends.
          if (st.path && st.path.length > 0) {
            this.advanceStaff(st, BAL.staffSpeed * pathFactor * dt);
          }
          st.breakTimer -= dt;
          if (st.breakTimer <= 0) {
            if (s.coffee > 0) {
              s.coffee--;
              st.energy = BAL.breakEnergyCoffee;
              st.morale = clamp(st.morale + BAL.moraleCoffeeBonus, 0, 100);
            } else {
              st.energy = BAL.breakEnergyNoCoffee;
              st.morale = clamp(st.morale - BAL.moraleNoCoffeePenalty, 0, 100);
            }
            const room = st.room !== null ? this.room(st.room) : undefined;
            if (room) {
              this.routeStaffTo(st, room);
              st.activity = 'walking';
            } else {
              st.room = null;
              st.path = undefined;
              st.activity = 'idle';
            }
          }
          break;
        }
        case 'idle': {
          st.energy = clamp(st.energy - BAL.energyDrainIdle * dt, 0, 100);
          if (st.energy <= BAL.energyBreakThreshold && reactors.length > 0) {
            this.routeStaffTo(st, reactors[0]);
            st.activity = 'break';
            st.breakTimer = BAL.breakDuration + 2;
          }
          break;
        }
      }
      // Morale drift + resignation
      if (st.energy > 50 && st.morale < 70) st.morale = clamp(st.morale + 0.15 * dt, 0, 100);
      if (st.energy < 10) st.morale = clamp(st.morale - 0.4 * dt, 0, 100);
      if (oakMorale > 0) st.morale = clamp(st.morale + oakMorale, 0, 100);
      if (st.morale < BAL.moraleResignThreshold) {
        st.lowMoraleTime += dt;
        if (st.lowMoraleTime > BAL.moraleResignSeconds) {
          this.unassign(st.id);
          s.staff.splice(i, 1);
          this.emit('bad', `${st.name} resigned, citing "the whispering" and "the pay".`);
        }
      } else {
        st.lowMoraleTime = 0;
      }
    }
  }

  private maybeDisaster(): void {
    const s = this.state;
    const monitorStaffed = this.staffedRooms('monitoring_shrine').length > 0;
    let chance =
      BAL.disasterBaseChance *
      s.scenario.disasterFreq *
      (1 + (100 - this.stability()) / 70);
    if (monitorStaffed) chance *= BAL.monitorDisasterFactor;
    if (!this.rng.chance(clamp(chance, 0, 0.85))) return;
    // Weighted pick: decaf riot only when coffee is dry; possession needs rooms
    const pool = DISASTERS.filter((d) => {
      if (s.disasters.some((a) => a.def === d.id)) return false;
      if (d.effect === 'noWork') return s.coffee === 0;
      if (d.effect === 'roomPossessed') return s.rooms.length > 0;
      return true;
    });
    if (pool.length === 0) return;
    const def = this.rng.pick(pool);
    const active: { def: string; remaining: number; roomId?: number } = {
      def: def.id,
      remaining: def.duration,
    };
    if (def.effect === 'roomPossessed') {
      const room = this.rng.pick(s.rooms);
      active.roomId = room.id;
      room.possessed = true;
      if (room.serving) this.requeueIncident(room.serving.incident);
      for (const iid of [...room.queue]) this.requeueIncident(iid);
    }
    s.disasters.push(active);
    for (const st of s.staff) st.morale = clamp(st.morale - BAL.moraleDisasterPenalty, 0, 100);
    this.emit('disaster', `${def.name}! ${def.desc}`);
  }

  private newDay(): void {
    const s = this.state;
    s.day++;
    s.stats.daysPlayed = s.day - 1;
    // Payday
    const salaries = s.staff.reduce((a, st) => a + st.salary, 0);
    if (salaries > 0) {
      s.money -= salaries;
      s.stats.spent += salaries;
      this.emit('info', `Payday: -$${salaries} in salaries.`);
      for (const st of s.staff) st.morale = clamp(st.morale + BAL.moralePaydayBonus, 0, 100);
    }
    // Release Ritual income
    for (const room of this.staffedRooms('release_ritual')) {
      const income = BAL.releaseIncomePerLevel * room.level;
      s.money += income;
      s.stats.income += income;
      this.emit('good', `Release shipped at midnight (+$${income}). The moon approves.`);
    }
    this.refreshCandidates();
    // Audits
    if (s.scenario.audits && s.audit.nextDay > 0) {
      if (s.day === s.audit.nextDay - 1 && !s.audit.warned) {
        s.audit.warned = true;
        this.emit('info', 'The Bureau of Digital Sanctity will audit you tomorrow. Look busy. Look compliant.');
      }
      if (s.day >= s.audit.nextDay) this.runAudit();
    }
  }

  private runAudit(): void {
    const s = this.state;
    const complianceStaffed = this.staffedRooms('compliance_bunker').length > 0;
    const monitorStaffed = this.staffedRooms('monitoring_shrine').length > 0;
    const openIncidents = s.incidents.length;
    const score = clamp(
      100 - s.debt * 0.6 - openIncidents * 2 -
        (complianceStaffed ? 0 : 20) + (monitorStaffed ? BAL.monitorAuditBonus : 0),
      0, 100,
    );
    if (score >= BAL.auditPassScore) {
      s.audit.passed++;
      s.money += BAL.auditGrant;
      s.trust = clamp(s.trust + BAL.auditTrustPass, 0, 100);
      this.emit('good', `Audit PASSED (score ${Math.round(score)}). ${this.rng.pick([...AUDIT_PASS_LINES])} (+$${BAL.auditGrant})`);
    } else {
      s.audit.failed++;
      s.money -= BAL.auditFine;
      s.stats.spent += BAL.auditFine;
      s.trust = clamp(s.trust - BAL.auditTrustFail, 0, 100);
      this.emit('bad', `Audit FAILED (score ${Math.round(score)}). ${this.rng.pick([...AUDIT_FAIL_LINES])} (-$${BAL.auditFine})`);
    }
    s.audit.nextDay = s.day + s.scenario.auditEveryDays;
    s.audit.warned = false;
  }

  private checkOutcome(): void {
    const s = this.state;
    const sc = s.scenario;
    if (sc.failEnabled) {
      if (s.money < sc.failMoney) {
        this.setOutcome(false, 'Bankruptcy. The ghosts have repossessed the beanbags.');
        return;
      }
      if (s.trust < sc.failTrust) {
        this.setOutcome(false, 'Client trust collapsed. The contract dissolved into ectoplasm.');
        return;
      }
    }
    if (sc.win.length === 0) return; // sandbox
    const met = sc.win.every((w) => {
      switch (w.type) {
        case 'resolve': return s.stats.resolved >= w.value;
        case 'resolveCategory':
          return (s.stats.resolvedByCategory[w.category ?? ''] ?? 0) >= w.value;
        case 'trust': return s.trust >= w.value;
        case 'survive': return s.day > w.value;
        case 'debtBelow': return s.debt < w.value;
        case 'money': return s.money >= w.value;
        case 'auditsPassed': return s.audit.passed >= w.value;
      }
    });
    if (met) {
      this.setOutcome(true, 'All objectives met.');
    }
  }

  private setOutcome(won: boolean, reason: string): void {
    const s = this.state;
    let stars = 1;
    if (won) {
      stars = 1;
      if (s.trust >= 55) stars = 2;
      if (s.trust >= 75 && s.money >= s.scenario.startMoney) stars = 3;
    }
    this.outcome = { won, reason, stats: { ...s.stats }, stars };
  }

  /** Objective progress lines for the HUD. */
  objectiveLines(): { label: string; done: boolean; progress: string }[] {
    const s = this.state;
    return s.scenario.win.map((w) => {
      switch (w.type) {
        case 'resolve':
          return { label: w.label, done: s.stats.resolved >= w.value, progress: `${s.stats.resolved}/${w.value}` };
        case 'resolveCategory': {
          const n = s.stats.resolvedByCategory[w.category ?? ''] ?? 0;
          return { label: w.label, done: n >= w.value, progress: `${n}/${w.value}` };
        }
        case 'trust':
          return { label: w.label, done: s.trust >= w.value, progress: `${Math.round(s.trust)}/${w.value}` };
        case 'survive':
          return { label: w.label, done: s.day > w.value, progress: `day ${Math.min(s.day, w.value)}/${w.value}` };
        case 'debtBelow':
          return { label: w.label, done: s.debt < w.value, progress: `${Math.round(s.debt)}→<${w.value}` };
        case 'money':
          return { label: w.label, done: s.money >= w.value, progress: `$${s.money}/$${w.value}` };
        case 'auditsPassed':
          return { label: w.label, done: s.audit.passed >= w.value, progress: `${s.audit.passed}/${w.value}` };
      }
    });
  }
}
