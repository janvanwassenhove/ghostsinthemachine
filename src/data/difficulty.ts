import type { ScenarioDef } from './types';

export type DifficultyId = 'cozy' | 'standard' | 'nightmare';

export interface Difficulty {
  id: DifficultyId;
  name: string;
  blurb: string;
  moneyMult: number; // startMoney multiplier
  startBeans: number; // starting coffee beans
  startCoffee: number; // starting brewed coffee
  disasterMult: number; // disasterFreq multiplier
  spawnMult: number; // spawn-interval multiplier (>1 = slower/easier)
  trustBonus: number; // added to startTrust
  debtBonus: number; // added to startDebt (negative = easier)
}

/** Three difficulty presets applied to campaign contracts (not sandbox). */
export const DIFFICULTIES: Difficulty[] = [
  {
    id: 'cozy', name: 'Cozy',
    blurb: 'Fatter budget, a full bean tin, and the hauntings mostly keep office hours.',
    moneyMult: 1.6, startBeans: 24, startCoffee: 10,
    disasterMult: 0.45, spawnMult: 1.45, trustBonus: 15, debtBonus: -15,
  },
  {
    id: 'standard', name: 'Standard',
    blurb: 'The full contract with a little breathing room. The intended haunting.',
    moneyMult: 1.2, startBeans: 12, startCoffee: 5,
    disasterMult: 0.9, spawnMult: 1.12, trustBonus: 6, debtBonus: -6,
  },
  {
    id: 'nightmare', name: 'Nightmare',
    blurb: 'Shoestring budget, near-empty bean tin, and the mainframes never sleep.',
    moneyMult: 0.88, startBeans: 8, startCoffee: 4,
    disasterMult: 1.25, spawnMult: 0.9, trustBonus: -2, debtBonus: 3,
  },
];

export const DIFFICULTY_BY_ID: Record<DifficultyId, Difficulty> =
  Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d])) as Record<DifficultyId, Difficulty>;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Apply a difficulty preset to a campaign contract, scaling starting budget,
 * beans/coffee, disaster frequency, spawn rate, and trust/debt. The objectives
 * are unchanged — only the pressure. Sandbox keeps its own configured values.
 */
export function withDifficulty(sc: ScenarioDef, d: Difficulty): ScenarioDef {
  if (sc.sandbox) {
    return { ...sc, startBeans: sc.startBeans ?? 10, startCoffee: sc.startCoffee ?? 5 };
  }
  return {
    ...sc,
    startMoney: Math.round(sc.startMoney * d.moneyMult),
    startTrust: clamp(sc.startTrust + d.trustBonus, 1, 100),
    startDebt: clamp(sc.startDebt + d.debtBonus, 0, 100),
    disasterFreq: sc.disasterFreq * d.disasterMult,
    spawnIntervalStart: sc.spawnIntervalStart * d.spawnMult,
    spawnIntervalMin: sc.spawnIntervalMin * d.spawnMult,
    startBeans: d.startBeans,
    startCoffee: d.startCoffee,
    difficulty: d.id,
  };
}
