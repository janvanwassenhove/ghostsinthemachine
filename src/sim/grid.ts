import { BAL } from '../data/balance';
import type { Rect, RoomDef } from '../data/types';
import type { RoomState } from './state';

export const GRID_W = BAL.grid.w;
export const GRID_H = BAL.grid.h;

/** Entrance tile — incidents spawn and leave here. Column 0 is reserved corridor. */
export const ENTRANCE = { x: 0, y: Math.floor(GRID_H / 2) };

export function roomAt(rooms: RoomState[], x: number, y: number): RoomState | null {
  for (const r of rooms) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

/** True if (x, y) falls inside any of the given rectangles (e.g. a building footprint). */
export function inRects(rects: Rect[] | undefined, x: number, y: number): boolean {
  if (!rects) return false;
  for (const r of rects) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
  }
  return false;
}

/** Connected components (4-connectivity) of the footprint's tiles. */
function buildingComponents(building: Rect[]): { x: number; y: number }[][] {
  const tiles = new Set<string>();
  for (const r of building) {
    for (let x = r.x; x < r.x + r.w; x++) {
      for (let y = r.y; y < r.y + r.h; y++) tiles.add(`${x},${y}`);
    }
  }
  const seen = new Set<string>();
  const comps: { x: number; y: number }[][] = [];
  for (const start of tiles) {
    if (seen.has(start)) continue;
    const comp: { x: number; y: number }[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const k = stack.pop()!;
      const [x, y] = k.split(',').map(Number);
      comp.push({ x, y });
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${x + dx},${y + dy}`;
        if (tiles.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
      }
    }
    comps.push(comp);
  }
  return comps;
}

export interface BuildingDoor { ix: number; iy: number; ox: number; oy: number; }

/**
 * One entrance per building wing: the inside/outside tile pair on the wing's
 * garden-facing perimeter nearest the map entrance (prefer left-facing doors).
 */
export function buildingEntrances(building: Rect[]): BuildingDoor[] {
  const out: BuildingDoor[] = [];
  for (const comp of buildingComponents(building)) {
    let best: (BuildingDoor & { score: number }) | null = null;
    for (const t of comp) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const ox = t.x + dx, oy = t.y + dy;
        if (!inBounds(ox, oy) || ox < 1 || inRects(building, ox, oy)) continue; // outside must be garden
        const score = Math.abs(ox - ENTRANCE.x) + Math.abs(oy - ENTRANCE.y) + (dx === -1 ? 0 : 4);
        if (!best || score < best.score) best = { ix: t.x, iy: t.y, ox, oy, score };
      }
    }
    if (best) out.push({ ix: best.ix, iy: best.iy, ox: best.ox, oy: best.oy });
  }
  return out;
}

/**
 * An edge-blocker that walls off the building: a step that crosses the
 * footprint perimeter is blocked unless it passes through an entrance door.
 */
export function buildingBlocker(building: Rect[] | undefined): EdgeBlocker | undefined {
  if (!building || !building.length) return undefined;
  const allow = new Set<string>();
  for (const e of buildingEntrances(building)) {
    allow.add(`${e.ix},${e.iy}|${e.ox},${e.oy}`);
    allow.add(`${e.ox},${e.oy}|${e.ix},${e.iy}`);
  }
  return (ax, ay, bx, by) => {
    if (inRects(building, ax, ay) === inRects(building, bx, by)) return false;
    return !allow.has(`${ax},${ay}|${bx},${by}`);
  };
}

/**
 * Validate a placement. Returns an error string, or null if OK.
 * Column 0 is reserved as the entrance corridor.
 */
export function validatePlacement(
  rooms: RoomState[],
  def: RoomDef,
  x: number,
  y: number,
  w: number,
  h: number,
  preferSide = 0,
  zone?: { ok: (x: number, y: number) => boolean; msg: string },
  blockEdge?: EdgeBlocker,
  outsideOk?: (x: number, y: number) => boolean,
): string | null {
  if (w < def.minW || h < def.minH) return `Too small (min ${def.minW}×${def.minH})`;
  if (x < 1 || y < 0 || x + w > GRID_W || y + h > GRID_H) return 'Out of bounds';
  for (let ix = x; ix < x + w; ix++) {
    for (let iy = y; iy < y + h; iy++) {
      if (roomAt(rooms, ix, iy)) return 'Overlaps another room';
      if (zone && !zone.ok(ix, iy)) return zone.msg;
    }
  }
  const door = findDoor(rooms, x, y, w, h, preferSide, outsideOk);
  if (!door) return outsideOk ? 'Door must face an inside corridor — rotate it (R)' : 'No corridor access for a door';

  // Reachability: with this room placed, its door must be reachable from the
  // entrance, and it must not seal off any existing room's door either.
  const placed: RoomState = {
    id: -1, def: def.id, x, y, w, h, door,
    level: 1, condition: 100, broken: false, possessed: false,
    staff: [], queue: [], serving: null,
  };
  const hypothetical = [...rooms, placed];
  if (!findPath(hypothetical, ENTRANCE, doorOutside(placed), blockEdge)) {
    return 'No path from the entrance to this door';
  }
  for (const r of rooms) {
    if (!findPath(hypothetical, ENTRANCE, doorOutside(r), blockEdge)) {
      return 'This would block an existing room from the entrance';
    }
  }
  return null;
}

/** Door sides: 0 bottom, 1 left, 2 top, 3 right (rotation order). */
type DoorCand = { x: number; y: number; ox: number; oy: number; side: number; d: number };

function perimeterCandidates(x: number, y: number, w: number, h: number): DoorCand[] {
  const cx = x + (w - 1) / 2;
  const cy = y + (h - 1) / 2;
  const cands: DoorCand[] = [];
  for (let ix = x; ix < x + w; ix++) {
    cands.push({ x: ix, y: y + h - 1, ox: ix, oy: y + h, side: 0, d: Math.abs(ix - cx) }); // bottom
    cands.push({ x: ix, y, ox: ix, oy: y - 1, side: 2, d: Math.abs(ix - cx) }); // top
  }
  for (let iy = y; iy < y + h; iy++) {
    cands.push({ x, y: iy, ox: x - 1, oy: iy, side: 1, d: Math.abs(iy - cy) }); // left
    cands.push({ x: x + w - 1, y: iy, ox: x + w, oy: iy, side: 3, d: Math.abs(iy - cy) }); // right
  }
  return cands;
}

/**
 * Choose a door tile on the room perimeter with a free corridor tile outside,
 * preferring the requested side (0 bottom, 1 left, 2 top, 3 right), centre-out.
 */
export function findDoor(
  rooms: RoomState[],
  x: number,
  y: number,
  w: number,
  h: number,
  preferSide = 0,
  outsideOk?: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  const cands = perimeterCandidates(x, y, w, h).sort(
    (a, b) => (a.side === preferSide ? 0 : 10) + a.d - ((b.side === preferSide ? 0 : 10) + b.d),
  );
  for (const c of cands) {
    if (inBounds(c.ox, c.oy) && !roomAt(rooms, c.ox, c.oy) && (!outsideOk || outsideOk(c.ox, c.oy))) {
      return { x: c.x, y: c.y };
    }
  }
  return null;
}

/** Strict variant: only returns a door on the given side, or null. */
export function findDoorOnSide(
  rooms: RoomState[],
  x: number,
  y: number,
  w: number,
  h: number,
  side: number,
  outsideOk?: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  const cands = perimeterCandidates(x, y, w, h)
    .filter((c) => c.side === side)
    .sort((a, b) => a.d - b.d);
  for (const c of cands) {
    if (inBounds(c.ox, c.oy) && !roomAt(rooms, c.ox, c.oy) && (!outsideOk || outsideOk(c.ox, c.oy))) {
      return { x: c.x, y: c.y };
    }
  }
  return null;
}

/** Which side (0 bottom, 1 left, 2 top, 3 right) a room's door sits on. */
export function doorSideOf(room: RoomState): number {
  const d = room.door;
  if (d.y === room.y + room.h - 1) return 0;
  if (d.y === room.y) return 2;
  if (d.x === room.x) return 1;
  return 3;
}

/** The corridor tile just outside a room's door (where queues form). */
export function doorOutside(room: RoomState): { x: number; y: number } {
  const d = room.door;
  const dirs = [
    { x: 0, y: 1 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
  ];
  for (const dir of dirs) {
    const ox = d.x + dir.x;
    const oy = d.y + dir.y;
    if (inBounds(ox, oy) && (ox < room.x || ox >= room.x + room.w || oy < room.y || oy >= room.y + room.h)) {
      return { x: ox, y: oy };
    }
  }
  return { x: d.x, y: d.y };
}

/**
 * BFS path over corridor tiles from `from` to `to` (both corridor tiles).
 * Returns list of tiles including `to`, excluding `from`; null if unreachable.
 */
/** Blocks a step from (ax,ay) to (bx,by) — e.g. crossing a building wall. */
export type EdgeBlocker = (ax: number, ay: number, bx: number, by: number) => boolean;

export function findPath(
  rooms: RoomState[],
  from: { x: number; y: number },
  to: { x: number; y: number },
  blockEdge?: EdgeBlocker,
): { x: number; y: number }[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x: number, y: number) => y * GRID_W + x;
  const prev = new Map<number, number>();
  const visited = new Set<number>([key(from.x, from.y)]);
  const queue: { x: number; y: number }[] = [from];
  const walkable = (x: number, y: number) =>
    inBounds(x, y) && !roomAt(rooms, x, y);
  const dirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  ];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const d of dirs) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      const nk = key(nx, ny);
      if (visited.has(nk)) continue;
      if (blockEdge && blockEdge(cur.x, cur.y, nx, ny)) continue;
      const isGoal = nx === to.x && ny === to.y;
      if (!isGoal && !walkable(nx, ny)) continue;
      visited.add(nk);
      prev.set(nk, key(cur.x, cur.y));
      if (isGoal) {
        // Reconstruct
        const path: { x: number; y: number }[] = [];
        let k = nk;
        while (k !== key(from.x, from.y)) {
          path.push({ x: k % GRID_W, y: Math.floor(k / GRID_W) });
          k = prev.get(k)!;
        }
        path.reverse();
        return path;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}
