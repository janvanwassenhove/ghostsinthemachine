import type { RoomDef } from './types';

/** All room types. Roles reference src/data/roles.ts ids. */
export const ROOMS: RoomDef[] = [
  {
    id: 'triage', name: 'Ticket Triage Desk', short: 'TRIAGE',
    desc: 'Every incident checks in here first to be sorted, sighed at, and stamped.',
    cost: 150, minW: 3, minH: 3, color: 0x4d7ea8,
    roles: ['bug_whisperer', 'incident_commander', 'devops_janitor'],
    queueCap: 6, service: true, special: 'triage', category: 'core',
  },
  {
    id: 'debug_chapel', name: 'Debugging Chapel', short: 'DEBUG',
    desc: 'Stack traces are read aloud by candlelight until the bug confesses.',
    cost: 200, minW: 3, minH: 3, color: 0x8a6fbf,
    roles: ['bug_whisperer', 'qa_revenant'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'legacy_crypt', name: 'Legacy Crypt', short: 'LEGACY',
    desc: 'Where COBOL-adjacent horrors are kept comfortable and mostly contained.',
    cost: 260, minW: 3, minH: 3, color: 0x7a6a4f,
    roles: ['legacy_priest', 'refactoring_monk'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'merge_arena', name: 'Merge Conflict Arena', short: 'MERGE',
    desc: 'Two branches enter. One branch leaves. The crowd chants "rebase".',
    cost: 220, minW: 3, minH: 3, color: 0xb35a5a,
    roles: ['qa_revenant', 'bug_whisperer'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'cloud_detox', name: 'Cloud Detox Chamber', short: 'CLOUD',
    desc: 'Gently weans workloads off services nobody remembers subscribing to.',
    cost: 260, minW: 3, minH: 3, color: 0x5aa3b3,
    roles: ['cloud_shaman'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'compliance_bunker', name: 'Compliance Bunker', short: 'COMPLY',
    desc: 'Forms are filed in triplicate, one copy for each plane of existence. Improves audit scores.',
    cost: 280, minW: 3, minH: 3, color: 0x6e7f5a,
    roles: ['compliance_druid'],
    queueCap: 3, service: true, special: 'compliance', category: 'treatment',
  },
  {
    id: 'observatory', name: 'Architecture Observatory', short: 'ARCH',
    desc: 'An Oracle gazes at the big picture. Staffed: slowly restores system stability.',
    cost: 320, minW: 3, minH: 3, color: 0x4a5d8a,
    roles: ['architect_oracle'],
    queueCap: 0, service: false, special: 'observatory', category: 'support',
  },
  {
    id: 'coffee_reactor', name: 'Coffee Reactor', short: 'COFFEE',
    desc: 'Converts beans into productivity. Staff take breaks here. Do not look into the crema.',
    cost: 180, minW: 2, minH: 2, color: 0x8a5a2b,
    roles: [],
    queueCap: 0, service: false, special: 'coffee', category: 'support',
  },
  {
    id: 'war_room', name: 'Incident War Room', short: 'WAR',
    desc: 'Handles management hauntings. Staffed: incidents everywhere escalate slower.',
    cost: 300, minW: 3, minH: 3, color: 0xa8574d,
    roles: ['incident_commander', 'scrum_necromancer'],
    queueCap: 5, service: true, special: 'war', category: 'treatment',
  },
  {
    id: 'ai_sanitarium', name: 'AI Prompt Sanitarium', short: 'AI',
    desc: 'Hallucinating agents lie on a couch and talk about their training data.',
    cost: 340, minW: 3, minH: 3, color: 0xb38ab3,
    roles: ['ai_prompt_therapist'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'server_seance', name: 'Server Séance Room', short: 'SÉANCE',
    desc: 'Contact services that no longer respond to ping. Ask them why. Take notes.',
    cost: 280, minW: 3, minH: 3, color: 0x5a8a7a,
    roles: ['database_medium', 'legacy_priest'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'printer_booth', name: 'Printer Exorcism Booth', short: 'PRINT',
    desc: 'Soundproofed. The chanting is for the printer. The padding is for the staff.',
    cost: 240, minW: 2, minH: 3, color: 0x9a9a4d,
    roles: ['printer_exorcist'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'db_vault', name: 'Database Therapy Vault', short: 'DB',
    desc: 'A safe space for tables with trust issues and indexes with abandonment trauma.',
    cost: 300, minW: 3, minH: 3, color: 0x4d8a5f,
    roles: ['database_medium'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'panic_cell', name: 'Security Panic Cell', short: 'SEC',
    desc: 'Padded, air-gapped, and lit by a single rotating amber light.',
    cost: 320, minW: 3, minH: 3, color: 0xb3763b,
    roles: ['security_goblin'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'refactor_dojo', name: 'Refactoring Dojo', short: 'DOJO',
    desc: 'Staff assigned here train their skill and burn down technical debt.',
    cost: 260, minW: 3, minH: 3, color: 0x707a8a,
    roles: [],
    queueCap: 0, service: false, special: 'refactor', category: 'support',
  },
  {
    id: 'release_ritual', name: 'Release Ritual Room', short: 'RELEASE',
    desc: 'Deployments happen at midnight under a waning moon, as is tradition. Staffed: ships features for daily income.',
    cost: 300, minW: 3, minH: 3, color: 0x8a4d7a,
    roles: ['release_bard', 'devops_janitor'],
    queueCap: 4, service: true, special: 'release', category: 'support',
  },
  {
    id: 'monitoring_shrine', name: 'Monitoring Shrine', short: 'MONITOR',
    desc: 'A wall of dashboards, all green, all lying. Staffed: fewer disasters, better audits.',
    cost: 240, minW: 2, minH: 3, color: 0x3b8a8a,
    roles: ['devops_janitor', 'architect_oracle'],
    queueCap: 0, service: false, special: 'monitor', category: 'support',
  },
  {
    id: 'patch_unit', name: 'Patch Containment Unit', short: 'PATCH',
    desc: 'Hotfixes are quarantined here until they stop biting.',
    cost: 220, minW: 3, minH: 3, color: 0x6a8a3b,
    roles: ['devops_janitor', 'security_goblin'],
    queueCap: 4, service: true, category: 'treatment',
  },
  {
    id: 'backup_lab', name: 'Backup Resurrection Lab', short: 'BACKUP',
    desc: 'Staffed: failing incidents sometimes rise again for a second chance.',
    cost: 280, minW: 3, minH: 3, color: 0x5f6ab3,
    roles: ['qa_revenant', 'database_medium'],
    queueCap: 0, service: false, special: 'backup', category: 'support',
  },

  // --- Outdoor rooms: built on the grounds (the garden), not inside the building.
  {
    id: 'bean_plantation', name: 'Java Bean Plantation', short: 'BEANS',
    desc: 'Rows of caffeinated shrubs. Java, obviously — it is where the beans come from. Passively grows coffee beans; a Groundskeeper doubles the harvest.',
    cost: 220, minW: 2, minH: 2, color: 0x4e7a3a,
    roles: ['groundskeeper'],
    queueCap: 0, service: false, outdoor: true, category: 'grounds',
  },
  {
    id: 'oak_grove', name: 'Oak of Undefined Behaviour', short: 'OAK',
    desc: 'A single ancient oak — the language\'s original name before it was renamed. Its shade lifts staff morale and steadies the system; a Groundskeeper tends it.',
    cost: 260, minW: 2, minH: 2, color: 0x6a5a3a,
    roles: ['groundskeeper'],
    queueCap: 0, service: false, outdoor: true, category: 'grounds',
  },
  {
    id: 'server_farm', name: 'Server Farm (Literal)', short: 'FARM',
    desc: 'An actual barn of servers, grazing. They are load-balanced by a border collie. Ships surplus cycles for daily income; a Server Rancher boosts the yield.',
    cost: 300, minW: 3, minH: 2, color: 0x8a7a3a,
    roles: ['server_rancher'],
    queueCap: 0, service: false, outdoor: true, category: 'grounds',
  },
];

export const ROOM_BY_ID: Record<string, RoomDef> = Object.fromEntries(
  ROOMS.map((r) => [r.id, r]),
);

/** Upgrade cost for going from `level` to `level + 1`. */
export function upgradeCost(def: RoomDef, level: number): number {
  return Math.round(def.cost * 0.6 * level);
}

/** Repair cost for a broken/worn room. */
export function repairCost(def: RoomDef): number {
  return Math.round(def.cost * 0.3);
}

/** Refund on demolish (50% of build cost, upgrades not refunded). */
export function demolishRefund(def: RoomDef): number {
  return Math.round(def.cost * 0.5);
}
