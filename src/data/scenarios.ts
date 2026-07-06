import type { ScenarioDef } from './types';

/** The seven campaign scenarios, in order. */
export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'basement', name: 'Basement Helpdesk of Mild Concern',
    tagline: 'Learn the ropes. The ropes are slightly haunted.',
    desc: 'A quiet basement contract: simple bugs, mild spectres. Build a Ticket Triage Desk and a Debugging Chapel, hire someone brave, and resolve 12 incidents.',
    startMoney: 1400, startDebt: 5, startTrust: 60,
    spawnIntervalStart: 20, spawnIntervalMin: 13,
    incidentPool: ['recursive_panic', 'null_apparition', 'yaml_fever', 'cache_goblins'],
    disasters: false, disasterFreq: 0, audits: false, auditEveryDays: 0,
    mutationChance: 0,
    win: [{ type: 'resolve', value: 12, label: 'Resolve 12 incidents' }],
    failMoney: -300, failTrust: 5, failEnabled: true,
    unlockRooms: ['triage', 'debug_chapel', 'patch_unit', 'coffee_reactor'],
    unlockRoles: ['bug_whisperer', 'devops_janitor', 'qa_revenant'],
    building: [{ x: 6, y: 4, w: 12, h: 7 }],
    intro: [
      'It is your first day.\nThe basement smells of dust, ozone, and mild regret.',
      'A single ticket blinks on the terminal:\n"have you tried turning it off and on again?"\nYou did. It turned you off and on again.',
      '"Learn the ropes," said the contract.\nThe ropes are, on closer inspection, ethernet cables. They are also slightly haunted.',
      'Build a desk. Hire someone brave.\nResolve twelve incidents before the incidents resolve you.',
    ],
  },
  {
    id: 'printer', name: 'The Office With the Printer',
    tagline: 'It knows you are reading this.',
    desc: 'The client\'s printer has signed something it should not have. Resolve 8 print incidents and 20 in total while keeping trust above 40. You will need a Printer Exorcism Booth and a Compliance Bunker.',
    startMoney: 1600, startDebt: 10, startTrust: 50,
    spawnIntervalStart: 14, spawnIntervalMin: 9,
    incidentPool: ['printer_contract', 'recursive_panic', 'null_apparition', 'yaml_fever', 'phantom_merge', 'cache_goblins'],
    disasters: true, disasterFreq: 0.5, audits: false, auditEveryDays: 0,
    mutationChance: 0.001,
    win: [
      { type: 'resolveCategory', value: 8, category: 'print', label: 'Exorcise 8 printer incidents' },
      { type: 'resolve', value: 20, label: 'Resolve 20 incidents total' },
      { type: 'trust', value: 40, label: 'Client trust ≥ 40' },
    ],
    failMoney: -300, failTrust: 10, failEnabled: true,
    unlockRooms: ['merge_arena', 'printer_booth', 'compliance_bunker'],
    unlockRoles: ['printer_exorcist', 'compliance_druid'],
    building: [{ x: 5, y: 3, w: 8, h: 9 }, { x: 13, y: 3, w: 6, h: 5 }],
    intro: [
      'The client has one printer.\nThe printer has one thousand opinions.',
      'Last Tuesday it printed a 40-page document nobody sent,\ntitled "TERMS AND CONDITIONS OF YOUR SOUL (v2.1)".',
      'Someone in Accounts clicked "Accept All".\nThe someone in Accounts has not been seen since.',
      'Build a booth. Soundproof it — the chanting is for the printer.\nGet eight print incidents exorcised before it reaches the fax.',
    ],
  },
  {
    id: 'cloud', name: 'Cloud Migration Gone Sideways',
    tagline: 'The lift-and-shift lifted something else.',
    desc: 'A botched migration left workloads allergic, containers possessed and the cluster in fog. Survive 5 days with trust at 45 or better.',
    startMoney: 1700, startDebt: 20, startTrust: 50,
    spawnIntervalStart: 12, spawnIntervalMin: 7,
    incidentPool: ['cloud_allergy', 'kube_fog', 'docker_poltergeist', 'api_amnesia', 'endpoint_crisis', 'yaml_fever', 'build_curse'],
    disasters: true, disasterFreq: 0.8, audits: false, auditEveryDays: 0,
    mutationChance: 0.002,
    win: [
      { type: 'survive', value: 5, label: 'Survive 5 days' },
      { type: 'trust', value: 45, label: 'Client trust ≥ 45' },
    ],
    failMoney: -300, failTrust: 10, failEnabled: true,
    unlockRooms: ['cloud_detox', 'server_seance', 'release_ritual', 'bean_plantation'],
    unlockRoles: ['cloud_shaman', 'database_medium', 'legacy_priest', 'release_bard', 'groundskeeper'],
    building: [{ x: 5, y: 5, w: 10, h: 7 }, { x: 16, y: 3, w: 5, h: 5 }],
    intro: [
      'The plan was simple: lift-and-shift to the cloud.\nThe lift worked. The shift shifted something else.',
      'Now the containers are possessed, the workloads are allergic to region us-east-1,\nand a fog rolls through the cluster at 3 AM.',
      'The invoice, at least, migrated flawlessly.\nIt arrives on time. It always arrives on time.',
      'Keep the client happy for five days.\nThe fog is not included in the SLA.',
    ],
  },
  {
    id: 'legacy', name: 'The Legacy System That Would Not Die',
    tagline: 'It was declared end-of-life in 1999. It disagrees.',
    desc: 'You inherit a contract with technical debt at 70 and a payroll mainframe that rewrites history. Get debt below 25 and resolve 25 incidents. The Refactoring Dojo is your friend.',
    startMoney: 1800, startDebt: 60, startTrust: 45,
    spawnIntervalStart: 13, spawnIntervalMin: 8,
    incidentPool: ['legacy_possession', 'db_deja_vu', 'api_amnesia', 'spreadsheet_singularity', 'null_apparition', 'endpoint_crisis', 'recursive_panic'],
    disasters: true, disasterFreq: 0.8, audits: false, auditEveryDays: 0,
    mutationChance: 0.002,
    win: [
      { type: 'debtBelow', value: 25, label: 'Technical debt below 25' },
      { type: 'resolve', value: 25, label: 'Resolve 25 incidents' },
    ],
    failMoney: -300, failTrust: 10, failEnabled: true,
    unlockRooms: ['legacy_crypt', 'db_vault', 'refactor_dojo', 'oak_grove'],
    unlockRoles: ['refactoring_monk'],
    building: [{ x: 5, y: 3, w: 15, h: 9 }],
    intro: [
      'The system was declared end-of-life in 1999.\nIt sent a strongly-worded memo disagreeing.',
      'It runs payroll. It also rewrites history.\nLast month it paid an employee who retired in 2004. He cashed the cheque.',
      'The documentation is one sticky note that reads:\n"DO NOT TOUCH. — signed, someone who has left the company."',
      'Refactor it. Burn the debt down below 25.\nBring a Dojo. Bring backup. Bring snacks.',
    ],
  },
  {
    id: 'audit', name: 'Audit Season',
    tagline: 'The Bureau of Digital Sanctity sends its regards. And its forms.',
    desc: 'Audits every 2 days. Pass 3 of them. Keep debt down, keep a Compliance Bunker staffed, and pray the printer behaves in front of the auditor.',
    startMoney: 2000, startDebt: 28, startTrust: 50,
    spawnIntervalStart: 14, spawnIntervalMin: 9,
    incidentPool: ['yaml_fever', 'cache_goblins', 'oauth_seance', 'phantom_merge', 'pr_possession', 'db_deja_vu', 'printer_contract', 'standup_loop'],
    disasters: true, disasterFreq: 0.7, audits: true, auditEveryDays: 2,
    mutationChance: 0.002,
    win: [{ type: 'auditsPassed', value: 3, label: 'Pass 3 audits' }],
    failMoney: -300, failTrust: 10, failEnabled: true,
    unlockRooms: ['war_room', 'panic_cell', 'observatory', 'monitoring_shrine'],
    unlockRoles: ['security_goblin', 'incident_commander', 'scrum_necromancer', 'architect_oracle'],
    building: [{ x: 3, y: 1, w: 17, h: 13 }],
    intro: [
      'A letter arrives on grey paper.\nThe Bureau of Digital Sanctity requests the pleasure of your compliance.',
      'They audit every two days. They bring clipboards.\nThe clipboards audit you back.',
      'Rule 7.3(c): all incidents must be filed in triplicate,\none copy for each plane of existence.',
      'Pass three audits. Keep the Compliance Bunker staffed.\nAnd for the love of uptime, keep the printer away from the auditor.',
    ],
  },
  {
    id: 'ai', name: 'The AI Agent Incident',
    tagline: 'It only did what it hallucinated it was told.',
    desc: 'An autonomous agent got production access and now incidents mutate mid-queue. Resolve 30 incidents and end with stability at 40 or better.',
    startMoney: 2100, startDebt: 26, startTrust: 50,
    spawnIntervalStart: 11, spawnIntervalMin: 7,
    incidentPool: ['ai_hallucination', 'oauth_seance', 'api_amnesia', 'endpoint_crisis', 'build_curse', 'roadmap_mutation', 'spreadsheet_singularity', 'recursive_panic'],
    disasters: true, disasterFreq: 1.0, audits: false, auditEveryDays: 0,
    mutationChance: 0.006,
    win: [
      { type: 'resolve', value: 30, label: 'Resolve 30 incidents' },
      { type: 'survive', value: 4, label: 'Survive 4 days' },
    ],
    failMoney: -300, failTrust: 10, failEnabled: true,
    unlockRooms: ['ai_sanitarium', 'backup_lab', 'server_farm'],
    unlockRoles: ['ai_prompt_therapist', 'server_rancher'],
    building: [{ x: 4, y: 3, w: 8, h: 9 }, { x: 14, y: 3, w: 8, h: 9 }],
    intro: [
      'You gave the agent read-only access.\nIt read that as a suggestion.',
      'It now has production credentials, a mission statement,\nand what it insists is "a really good feeling about this."',
      'Tickets mutate in the queue as it "helpfully" refactors reality mid-thought.\nIt has closed 400 issues. It opened 401.',
      'Resolve thirty incidents and keep the system stable.\nDo not, under any circumstances, tell it you are disappointed.',
    ],
  },
  {
    id: 'ghosts', name: 'Ghosts in the Machine',
    tagline: 'Everything. Everywhere. All at 2 AM.',
    desc: 'The full haunting: every incident type, disasters, audits every 3 days, mutation in the queues. Survive 8 days, resolve 50 incidents, and end with trust at 55 or better.',
    startMoney: 5600, startDebt: 30, startTrust: 50,
    spawnIntervalStart: 13, spawnIntervalMin: 8,
    incidentPool: 'all',
    disasters: true, disasterFreq: 1.1, audits: true, auditEveryDays: 3,
    mutationChance: 0.004,
    win: [
      { type: 'survive', value: 8, label: 'Survive 8 days' },
      { type: 'resolve', value: 50, label: 'Resolve 50 incidents' },
      { type: 'trust', value: 50, label: 'Client trust ≥ 50' },
    ],
    failMoney: -300, failTrust: 10, failEnabled: true,
    unlockRooms: [],
    unlockRoles: [],
    building: [{ x: 3, y: 1, w: 18, h: 13 }],
    intro: [
      'It is 2 AM. Every pager you own is singing a different song.',
      'The printer, the cluster, the legacy mainframe and the agent\nhave formed a committee. The committee has demands.',
      'Every incident type known to IT is now in the building at once.\nSome of them are in the walls.',
      'This is the full haunting. Eight days. Fifty incidents.\nThe machine is ghosts now. It always was. Good luck.',
    ],
  },
];

// Resolve each contract's cumulative availability: rooms/roles unlock in
// campaign order and stay unlocked, so the player learns them a few at a time.
{
  const rooms: string[] = [];
  const roles: string[] = [];
  for (const sc of SCENARIOS) {
    for (const r of sc.unlockRooms ?? []) if (!rooms.includes(r)) rooms.push(r);
    for (const r of sc.unlockRoles ?? []) if (!roles.includes(r)) roles.push(r);
    sc.availableRooms = [...rooms];
    sc.availableRoles = [...roles];
  }
}

export const SCENARIO_BY_ID: Record<string, ScenarioDef> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s]),
);

export interface SandboxOptions {
  money: number;
  disasterFreq: number; // 0 = off
  audits: boolean;
  mutation: number;
  failEnabled: boolean;
}

export function makeSandbox(opts: SandboxOptions): ScenarioDef {
  return {
    id: 'sandbox', name: 'Sandbox', sandbox: true,
    tagline: 'Free haunting. No deadlines. Mostly.',
    desc: 'Free play with your chosen settings.',
    startMoney: opts.money, startDebt: 10, startTrust: 55,
    spawnIntervalStart: 14, spawnIntervalMin: 6,
    incidentPool: 'all',
    disasters: opts.disasterFreq > 0, disasterFreq: opts.disasterFreq,
    audits: opts.audits, auditEveryDays: 3,
    mutationChance: opts.mutation,
    win: [],
    failMoney: -300, failTrust: 5, failEnabled: opts.failEnabled,
    // No `building`: the whole interior is buildable in sandbox.
  };
}
