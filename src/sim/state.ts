import type { ScenarioDef } from '../data/types';

/** Runtime simulation state. Plain JSON-serialisable data only. */

export interface RoomState {
  id: number;
  def: string;
  x: number;
  y: number;
  w: number;
  h: number;
  door: { x: number; y: number }; // door tile (on room perimeter)
  level: number; // 1..3
  condition: number; // 100..0
  broken: boolean;
  possessed: boolean; // by Screenwraith disaster
  staff: number[];
  queue: number[]; // incident ids waiting outside
  serving: { incident: number; remaining: number; total: number } | null;
  brew?: number; // coffee reactor brewing progress
}

export type StaffActivity = 'idle' | 'working' | 'walking' | 'break' | 'training';

export interface StaffState {
  id: number;
  name: string;
  role: string;
  skill: number; // 1..5 (fractional via training)
  salary: number;
  energy: number; // 0..100
  morale: number; // 0..100
  quirk: string;
  room: number | null; // assigned room id
  x: number; // tile coords (float)
  y: number;
  tx: number; // walk target
  ty: number;
  path?: { x: number; y: number }[]; // corridor route to the target (via doors)
  activity: StaffActivity;
  breakTimer: number;
  lowMoraleTime: number;
}

export interface CandidateState {
  name: string;
  role: string;
  skill: number;
  salary: number;
  quirk: string;
}

export type IncidentPhase = 'walking' | 'queued' | 'inService' | 'leaving' | 'stuck';

export interface IncidentState {
  id: number;
  def: string;
  title: string;
  severity: number; // 1..5
  haunt: number;
  bounty: number;
  patience: number;
  maxPatience: number;
  chain: string[]; // remaining room def ids to visit (triage first)
  target: number | null; // current target room instance id
  phase: IncidentPhase;
  x: number;
  y: number;
  path: { x: number; y: number }[];
  escalations: number;
  mutations: number;
  retargetTimer: number;
  resurrected: boolean;
}

export interface ActiveDisaster {
  def: string;
  remaining: number;
  roomId?: number; // for roomPossessed
}

export interface AuditState {
  nextDay: number; // day number of the next audit (0 = none scheduled)
  warned: boolean;
  passed: number;
  failed: number;
}

export interface SimEvent {
  kind: 'info' | 'good' | 'bad' | 'disaster';
  msg: string;
}

export interface Outcome {
  won: boolean;
  reason: string;
  stats: SimStats;
  stars: number;
}

export interface SimStats {
  resolved: number;
  failed: number;
  resolvedByCategory: Record<string, number>;
  income: number;
  spent: number;
  daysPlayed: number;
}

export interface SimState {
  version: number;
  scenario: ScenarioDef; // snapshot (sandbox configs vary)
  rngState: number;
  day: number; // 1-based
  timeOfDay: number; // 0..1
  money: number;
  trust: number; // 0..100
  debt: number; // 0..100
  coffee: number;
  beans: number;
  nextId: number;
  rooms: RoomState[];
  staff: StaffState[];
  candidates: CandidateState[];
  incidents: IncidentState[];
  spawnTimer: number;
  disasterTimer: number;
  disasters: ActiveDisaster[];
  audit: AuditState;
  stats: SimStats;
  refactoringEvent: number; // seconds remaining of "The Great Refactoring" (debt=100 event)
}
