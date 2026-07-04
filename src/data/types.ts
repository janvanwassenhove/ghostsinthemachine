/** Static data definitions. All concrete content is original to this project. */

export type RoomSpecial =
  | 'triage'
  | 'coffee'
  | 'refactor'
  | 'compliance'
  | 'monitor'
  | 'observatory'
  | 'backup'
  | 'release'
  | 'war';

export interface RoomDef {
  id: string;
  name: string;
  short: string; // label that fits inside small rooms
  desc: string;
  cost: number;
  minW: number;
  minH: number;
  color: number;
  /** Role ids that can staff this room. Empty = any role. */
  roles: string[];
  /** Base queue capacity (service rooms). */
  queueCap: number;
  /** True if the room processes incidents. */
  service: boolean;
  special?: RoomSpecial;
  /** Garden room: may only be placed outside the building, on the grounds. */
  outdoor?: boolean;
  /** Build-menu grouping. */
  category: RoomCategory;
}

export type RoomCategory = 'core' | 'treatment' | 'support' | 'grounds';

/** Ordered categories with display labels for the build menu. */
export const ROOM_CATEGORIES: { id: RoomCategory; label: string }[] = [
  { id: 'core', label: 'Core' },
  { id: 'treatment', label: 'Treatment Rooms' },
  { id: 'support', label: 'Support' },
  { id: 'grounds', label: 'The Grounds' },
];

/** A rectangular tile region (used for building footprints). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoleDef {
  id: string;
  name: string;
  salary: number; // base per-day salary
  color: number;
  initials: string;
  desc: string;
}

export interface IncidentDef {
  id: string;
  name: string;
  category:
    | 'code'
    | 'legacy'
    | 'cloud'
    | 'process'
    | 'infra'
    | 'print'
    | 'ai'
    | 'security'
    | 'data';
  /** Service chain AFTER triage: room def ids to visit in order. */
  rooms: string[];
  bounty: number; // base payout
  service: number; // base service seconds
  patience: number; // base queue patience seconds
  haunt: 0 | 1 | 2 | 3;
  mutateTo?: string[];
}

export type DisasterEffect =
  | 'spawnSurge'
  | 'noWork'
  | 'roomPossessed'
  | 'pathChaos'
  | 'freeze'
  | 'moraleDrain';

export interface DisasterDef {
  id: string;
  name: string;
  desc: string;
  duration: number; // seconds
  effect: DisasterEffect;
  fixCost: number; // pay to end it early (0 = cannot)
  oneLiner: string; // post-mortem toast
}

export interface WinCondition {
  type: 'resolve' | 'trust' | 'survive' | 'debtBelow' | 'money' | 'auditsPassed' | 'resolveCategory';
  value: number;
  category?: string; // for resolveCategory
  label: string;
}

export interface ScenarioDef {
  id: string;
  name: string;
  tagline: string;
  desc: string;
  startMoney: number;
  startDebt: number;
  startTrust: number;
  spawnIntervalStart: number; // seconds between spawns at day 1
  spawnIntervalMin: number;
  incidentPool: string[] | 'all';
  disasters: boolean;
  disasterFreq: number; // probability multiplier
  audits: boolean;
  auditEveryDays: number;
  mutationChance: number; // per queued incident per second
  win: WinCondition[];
  failMoney: number; // fail if money drops below
  failTrust: number; // fail if trust drops below
  failEnabled: boolean;
  sandbox?: boolean;
  /**
   * Building footprint: one or more rectangles of buildable indoor floor.
   * Everything else inside the map is "the grounds" (garden), where only
   * outdoor rooms may be placed. Omit for a fully buildable interior (sandbox).
   */
  building?: Rect[];
  /** Absurd cold-open shown before the game. Omit for a generic fallback. */
  intro?: string[];
}
