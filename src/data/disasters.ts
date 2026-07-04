import type { DisasterDef } from './types';

export const DISASTERS: DisasterDef[] = [
  {
    id: 'incident_storm', name: 'Incident Storm',
    desc: 'The old mainframes below the floor are dreaming again. Incidents pour in.',
    duration: 30, effect: 'spawnSurge', fixCost: 0,
    oneLiner: 'Storm passed. The mainframes hit snooze.',
  },
  {
    id: 'decaf_riot', name: 'Decaf Riot',
    desc: 'Someone switched the beans. Staff have downed tools and raised placards.',
    duration: 25, effect: 'noWork', fixCost: 150,
    oneLiner: 'Order restored. The placards read "NO REPRO WITHOUT ESPRESSO".',
  },
  {
    id: 'screen_wraith', name: 'Screenwraith Possession',
    desc: 'A room\'s monitors show only a calm, wrong shade of blue. It is unusable.',
    duration: 40, effect: 'roomPossessed', fixCost: 120,
    oneLiner: 'The wraith left. It gave the room a 2-star review.',
  },
  {
    id: 'cable_gremlins', name: 'Cable Gremlin Infestation',
    desc: 'Gremlins have re-routed every corridor cable. Everyone walks like it\'s Monday.',
    duration: 30, effect: 'pathChaos', fixCost: 100,
    oneLiner: 'Gremlins evicted. They unionised on the way out.',
  },
  {
    id: 'the_update', name: 'The Update',
    desc: 'Everything is 37% complete. Do not turn off the office.',
    duration: 15, effect: 'freeze', fixCost: 0,
    oneLiner: 'Update complete. Nothing visibly changed. Something is different.',
  },
  {
    id: 'vending_uprising', name: 'Vending Machine Uprising',
    desc: 'The vending machines demand recognition. Morale is plummeting.',
    duration: 35, effect: 'moraleDrain', fixCost: 130,
    oneLiner: 'Terms reached: the machines get every second Friday off.',
  },
];

export const DISASTER_BY_ID: Record<string, DisasterDef> = Object.fromEntries(
  DISASTERS.map((d) => [d.id, d]),
);
