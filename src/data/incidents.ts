import type { IncidentDef } from './types';

/**
 * All 24 incident types. `rooms` is the service chain visited AFTER the
 * Ticket Triage Desk. Multi-room chains model diagnosis → treatment.
 */
export const INCIDENTS: IncidentDef[] = [
  // ---- code ----
  {
    id: 'recursive_panic', name: 'Recursive Panic', category: 'code',
    rooms: ['debug_chapel'], bounty: 60, service: 6, patience: 45, haunt: 0,
    mutateTo: ['null_apparition'],
  },
  {
    id: 'null_apparition', name: 'Null Reference Apparition', category: 'code',
    rooms: ['debug_chapel'], bounty: 70, service: 7, patience: 45, haunt: 1,
    mutateTo: ['recursive_panic', 'build_curse'],
  },
  {
    id: 'phantom_merge', name: 'Phantom Merge Conflict', category: 'code',
    rooms: ['merge_arena'], bounty: 75, service: 7, patience: 40, haunt: 1,
    mutateTo: ['pr_possession'],
  },
  {
    id: 'pr_possession', name: 'Pull Request Possession', category: 'code',
    rooms: ['merge_arena', 'debug_chapel'], bounty: 110, service: 8, patience: 50, haunt: 2,
  },
  {
    id: 'build_curse', name: 'Build Pipeline Curse', category: 'code',
    rooms: ['release_ritual'], bounty: 85, service: 8, patience: 45, haunt: 1,
    mutateTo: ['yaml_fever'],
  },
  // ---- legacy ----
  {
    id: 'legacy_possession', name: 'Legacy Possession', category: 'legacy',
    rooms: ['server_seance', 'legacy_crypt'], bounty: 140, service: 9, patience: 60, haunt: 3,
    mutateTo: ['db_deja_vu'],
  },
  {
    id: 'deadline_poltergeist', name: 'Deadline Poltergeist', category: 'process',
    rooms: ['war_room'], bounty: 90, service: 7, patience: 35, haunt: 2,
    mutateTo: ['scope_creep'],
  },
  // ---- cloud ----
  {
    id: 'cloud_allergy', name: 'Cloud Allergy', category: 'cloud',
    rooms: ['cloud_detox'], bounty: 80, service: 7, patience: 50, haunt: 0,
    mutateTo: ['kube_fog'],
  },
  {
    id: 'docker_poltergeist', name: 'Docker Poltergeist', category: 'cloud',
    rooms: ['cloud_detox', 'patch_unit'], bounty: 120, service: 8, patience: 50, haunt: 2,
  },
  {
    id: 'kube_fog', name: 'Kubernetes Fog', category: 'cloud',
    rooms: ['cloud_detox'], bounty: 95, service: 9, patience: 55, haunt: 1,
    mutateTo: ['docker_poltergeist'],
  },
  // ---- process ----
  {
    id: 'sprint_haunting', name: 'Sprint Haunting', category: 'process',
    rooms: ['war_room'], bounty: 70, service: 6, patience: 45, haunt: 1,
    mutateTo: ['standup_loop'],
  },
  {
    id: 'standup_loop', name: 'Standup Time Loop', category: 'process',
    rooms: ['war_room'], bounty: 75, service: 7, patience: 40, haunt: 1,
    mutateTo: ['jira_doppelganger'],
  },
  {
    id: 'jira_doppelganger', name: 'Ticket Doppelgänger', category: 'process',
    rooms: ['war_room', 'triage'], bounty: 85, service: 6, patience: 45, haunt: 1,
  },
  {
    id: 'roadmap_mutation', name: 'Roadmap Mutation', category: 'process',
    rooms: ['war_room'], bounty: 100, service: 8, patience: 50, haunt: 2,
    mutateTo: ['scope_creep', 'deadline_poltergeist'],
  },
  {
    id: 'scope_creep', name: 'Scope Creep Slime', category: 'process',
    rooms: ['war_room', 'refactor_dojo_service'], bounty: 110, service: 9, patience: 55, haunt: 2,
  },
  // ---- infra ----
  {
    id: 'api_amnesia', name: 'API Amnesia', category: 'infra',
    rooms: ['server_seance'], bounty: 85, service: 7, patience: 50, haunt: 1,
    mutateTo: ['endpoint_crisis'],
  },
  {
    id: 'endpoint_crisis', name: 'Endpoint Identity Crisis', category: 'infra',
    rooms: ['server_seance'], bounty: 90, service: 8, patience: 50, haunt: 1,
  },
  {
    id: 'yaml_fever', name: 'YAML Fever', category: 'infra',
    rooms: ['patch_unit'], bounty: 65, service: 6, patience: 40, haunt: 0,
    mutateTo: ['cache_goblins'],
  },
  {
    id: 'cache_goblins', name: 'Cache Goblin Infestation', category: 'infra',
    rooms: ['patch_unit'], bounty: 80, service: 7, patience: 45, haunt: 1,
  },
  // ---- data ----
  {
    id: 'db_deja_vu', name: 'Database Déjà Vu', category: 'data',
    rooms: ['db_vault'], bounty: 95, service: 8, patience: 55, haunt: 1,
    mutateTo: ['spreadsheet_singularity'],
  },
  {
    id: 'spreadsheet_singularity', name: 'Spreadsheet Singularity', category: 'data',
    rooms: ['db_vault'], bounty: 130, service: 10, patience: 60, haunt: 2,
  },
  // ---- print ----
  {
    id: 'printer_contract', name: 'Printer Demon Contract', category: 'print',
    rooms: ['printer_booth', 'compliance_bunker'], bounty: 135, service: 8, patience: 55, haunt: 3,
  },
  // ---- ai ----
  {
    id: 'ai_hallucination', name: 'AI Hallucination Leak', category: 'ai',
    rooms: ['ai_sanitarium'], bounty: 120, service: 9, patience: 50, haunt: 2,
    mutateTo: ['oauth_seance'],
  },
  // ---- security ----
  {
    id: 'oauth_seance', name: 'OAuth Séance Failure', category: 'security',
    rooms: ['panic_cell'], bounty: 105, service: 8, patience: 45, haunt: 2,
  },
];

// Scope Creep Slime's second step points at the dojo conceptually; route it to
// the Patch Containment Unit as the actual service room (dojo is non-service).
for (const def of INCIDENTS) {
  def.rooms = def.rooms.map((r) => (r === 'refactor_dojo_service' ? 'patch_unit' : r));
}

export const INCIDENT_BY_ID: Record<string, IncidentDef> = Object.fromEntries(
  INCIDENTS.map((i) => [i.id, i]),
);

export const CATEGORY_COLORS: Record<string, number> = {
  code: 0x8a6fbf,
  legacy: 0x7a6a4f,
  cloud: 0x5aa3b3,
  process: 0xa8574d,
  infra: 0x6a8a3b,
  print: 0x9a9a4d,
  ai: 0xb38ab3,
  security: 0xb3763b,
  data: 0x4d8a5f,
};
