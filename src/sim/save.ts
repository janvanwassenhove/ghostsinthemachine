import type { SimState } from './state';
import { SAVE_VERSION, Sim } from './sim';

const KEY_PREFIX = 'gitm.';
const KEY_AUTO = `${KEY_PREFIX}autosave`;
const KEY_MANUAL = `${KEY_PREFIX}manual`;
const KEY_PROGRESS = `${KEY_PREFIX}progress`;
const KEY_SETTINGS = `${KEY_PREFIX}settings`;

export interface CampaignProgress {
  stars: Record<string, number>; // scenario id -> best stars (1..3)
}

export interface Settings {
  chatter: boolean;
  autosave: boolean;
  sound: boolean;
  defaultSpeed: 1 | 2;
  difficulty: 'cozy' | 'standard' | 'nightmare';
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function quarantine(key: string): void {
  try {
    const raw = localStorage.getItem(key);
    if (raw) localStorage.setItem(`${key}.corrupt`, raw);
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to do */
  }
}

export function saveGame(sim: Sim, slot: 'auto' | 'manual'): boolean {
  try {
    localStorage.setItem(slot === 'auto' ? KEY_AUTO : KEY_MANUAL, sim.serialize());
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: 'auto' | 'manual'): Sim | null {
  const key = slot === 'auto' ? KEY_AUTO : KEY_MANUAL;
  const state = safeParse<SimState>(localStorage.getItem(key));
  if (!state || typeof state.version !== 'number') {
    if (localStorage.getItem(key)) quarantine(key);
    return null;
  }
  if (state.version !== SAVE_VERSION) {
    // No migrations yet: quarantine incompatible saves rather than crash.
    quarantine(key);
    return null;
  }
  try {
    return Sim.fromState(state);
  } catch {
    quarantine(key);
    return null;
  }
}

export function hasSave(): 'manual' | 'auto' | null {
  if (safeParse<SimState>(localStorage.getItem(KEY_MANUAL))) return 'manual';
  if (safeParse<SimState>(localStorage.getItem(KEY_AUTO))) return 'auto';
  return null;
}

export function clearSaves(): void {
  localStorage.removeItem(KEY_AUTO);
  localStorage.removeItem(KEY_MANUAL);
}

export function loadProgress(): CampaignProgress {
  return safeParse<CampaignProgress>(localStorage.getItem(KEY_PROGRESS)) ?? { stars: {} };
}

export function recordResult(scenarioId: string, stars: number): void {
  const p = loadProgress();
  p.stars[scenarioId] = Math.max(p.stars[scenarioId] ?? 0, stars);
  try {
    localStorage.setItem(KEY_PROGRESS, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function loadSettings(): Settings {
  return (
    { chatter: true, autosave: true, sound: true, defaultSpeed: 1, difficulty: 'standard',
      ...safeParse<Settings>(localStorage.getItem(KEY_SETTINGS)) }
  );
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function resetAllProgress(): void {
  clearSaves();
  localStorage.removeItem(KEY_PROGRESS);
}
