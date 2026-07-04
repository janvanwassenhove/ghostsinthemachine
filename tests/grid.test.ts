import { describe, expect, it } from 'vitest';
import { ROOM_BY_ID } from '../src/data/rooms';
import { findDoor, findPath, validatePlacement, GRID_W, GRID_H, ENTRANCE } from '../src/sim/grid';
import type { RoomState } from '../src/sim/state';

function room(defId: string, x: number, y: number, w: number, h: number, id = 1): RoomState {
  return {
    id, def: defId, x, y, w, h,
    door: findDoor([], x, y, w, h)!,
    level: 1, condition: 100, broken: false, possessed: false,
    staff: [], queue: [], serving: null,
  };
}

describe('placement validation', () => {
  const triage = ROOM_BY_ID['triage'];

  it('accepts a valid placement', () => {
    expect(validatePlacement([], triage, 4, 4, 3, 3)).toBeNull();
  });

  it('rejects rooms below minimum size', () => {
    expect(validatePlacement([], triage, 4, 4, 2, 2)).toMatch(/Too small/);
  });

  it('rejects out-of-bounds placements', () => {
    expect(validatePlacement([], triage, GRID_W - 1, 4, 3, 3)).toMatch(/bounds/);
  });

  it('reserves column 0 for the entrance corridor', () => {
    expect(validatePlacement([], triage, 0, 4, 3, 3)).toMatch(/bounds/);
  });

  it('rejects overlapping placements', () => {
    const existing = [room('triage', 4, 4, 3, 3)];
    expect(validatePlacement(existing, triage, 5, 5, 3, 3)).toMatch(/Overlaps/);
  });

  it('rejects a room whose door cannot be reached from the entrance', () => {
    // Wall off the left side so a room placed to the right of the wall has a
    // door that opens into a corridor pocket sealed from the entrance.
    const wall = [room('triage', 1, 0, 3, GRID_H, 1)]; // full-height wall in cols 1-3
    // A room at cols 4-6: its door-outside is east of the wall, unreachable
    // from the entrance at column 0.
    const err = validatePlacement(wall, triage, 4, 4, 3, 3);
    expect(err).toMatch(/path from the entrance|block/i);
  });

  it('accepts a reachable room on an open floor', () => {
    const existing = [room('triage', 4, 4, 3, 3, 1)];
    expect(validatePlacement(existing, triage, 10, 4, 3, 3)).toBeNull();
  });

  it('rejects fully enclosed placements with no door access', () => {
    // Wall off a 3x3 pocket completely with rooms on all sides
    const walls = [
      room('triage', 1, 0, 9, 4, 1),
      room('triage', 1, 7, 9, 4, 2),
      room('triage', 1, 4, 3, 3, 3),
      room('triage', 7, 4, 3, 3, 4),
    ];
    expect(validatePlacement(walls, triage, 4, 4, 3, 3)).toMatch(/No corridor access/);
  });
});

describe('door placement', () => {
  it('prefers the bottom edge', () => {
    const door = findDoor([], 5, 5, 3, 3)!;
    expect(door.y).toBe(7); // bottom row of the room
  });
});

describe('pathfinding', () => {
  it('finds a straight path on an empty grid', () => {
    const path = findPath([], ENTRANCE, { x: 5, y: ENTRANCE.y })!;
    expect(path.length).toBe(5);
    expect(path[path.length - 1]).toEqual({ x: 5, y: ENTRANCE.y });
  });

  it('routes around rooms', () => {
    const block = [room('triage', 3, 0, 3, GRID_H - 2)]; // wall with gap at the bottom
    const path = findPath(block, { x: 1, y: 1 }, { x: 8, y: 1 })!;
    expect(path).not.toBeNull();
    // Must dip below the wall (y >= GRID_H - 2 at some point)
    expect(Math.max(...path.map((p) => p.y))).toBeGreaterThanOrEqual(GRID_H - 2);
  });

  it('returns null when the target is sealed off', () => {
    const wall = [room('triage', 3, 0, 3, GRID_H)];
    expect(findPath(wall, { x: 1, y: 1 }, { x: 10, y: 1 })).toBeNull();
  });
});
