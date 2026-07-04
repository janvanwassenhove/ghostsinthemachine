import type { RoleDef } from './types';

/** All staff roles. */
export const ROLES: RoleDef[] = [
  {
    id: 'bug_whisperer', name: 'Bug Whisperer', salary: 60, color: 0x8a6fbf, initials: 'BW',
    desc: 'Speaks softly to defects until they reveal their reproduction steps.',
  },
  {
    id: 'legacy_priest', name: 'Legacy Priest', salary: 75, color: 0x7a6a4f, initials: 'LP',
    desc: 'Ordained in dead languages. Reads mainframe last rites fluently.',
  },
  {
    id: 'cloud_shaman', name: 'Cloud Shaman', salary: 80, color: 0x5aa3b3, initials: 'CS',
    desc: 'Communes with regions us-east-1 through the veil of the status page.',
  },
  {
    id: 'security_goblin', name: 'Security Goblin', salary: 78, color: 0xb3763b, initials: 'SG',
    desc: 'Lives under the firewall. Bites unattended credentials.',
  },
  {
    id: 'scrum_necromancer', name: 'Scrum Necromancer', salary: 72, color: 0xa8574d, initials: 'SN',
    desc: 'Raises dead sprints and makes them walk to the definition of done.',
  },
  {
    id: 'devops_janitor', name: 'DevOps Janitor', salary: 65, color: 0x6a8a3b, initials: 'DJ',
    desc: 'Mops up pipelines. Knows where every body — and every YAML file — is buried.',
  },
  {
    id: 'architect_oracle', name: 'Architect Oracle', salary: 95, color: 0x4a5d8a, initials: 'AO',
    desc: 'Sees all futures. In every one of them, the diagram is already outdated.',
  },
  {
    id: 'database_medium', name: 'Database Medium', salary: 82, color: 0x4d8a5f, initials: 'DM',
    desc: 'Channels the spirits of dropped tables. SELECT * FROM the_beyond.',
  },
  {
    id: 'printer_exorcist', name: 'Printer Exorcist', salary: 70, color: 0x9a9a4d, initials: 'PE',
    desc: 'Armed with a toner cross and a blessed USB cable.',
  },
  {
    id: 'ai_prompt_therapist', name: 'AI Prompt Therapist', salary: 88, color: 0xb38ab3, initials: 'AT',
    desc: '"And how does that context window make you feel?"',
  },
  {
    id: 'qa_revenant', name: 'QA Revenant', salary: 68, color: 0xb35a5a, initials: 'QA',
    desc: 'Died in a production incident. Returned to make sure it never ships again.',
  },
  {
    id: 'compliance_druid', name: 'Compliance Druid', salary: 74, color: 0x6e7f5a, initials: 'CD',
    desc: 'Grows policy documents from acorns. They too become mighty and unreadable.',
  },
  {
    id: 'release_bard', name: 'Release Bard', salary: 76, color: 0x8a4d7a, initials: 'RB',
    desc: 'Sings the changelog. The deploy only works if the song is on key.',
  },
  {
    id: 'incident_commander', name: 'Incident Commander', salary: 90, color: 0x4d7ea8, initials: 'IC',
    desc: 'Stays calm in a burning server room. Mostly because of the coffee.',
  },
  {
    id: 'refactoring_monk', name: 'Refactoring Monk', salary: 85, color: 0x707a8a, initials: 'RM',
    desc: 'Has taken a vow of simplicity. Deletes more code than they write.',
  },
  {
    id: 'groundskeeper', name: 'Groundskeeper', salary: 55, color: 0x4e7a3a, initials: 'GK',
    desc: 'Tends the Java bean rows and the old oak. Talks to the plants in shell scripts.',
  },
  {
    id: 'server_rancher', name: 'Server Rancher', salary: 62, color: 0x8a7a3a, initials: 'SR',
    desc: 'Herds the grazing servers at dusk. Brands each one with a MAC address.',
  },
];

export const ROLE_BY_ID: Record<string, RoleDef> = Object.fromEntries(
  ROLES.map((r) => [r.id, r]),
);

/** Salary for a candidate of given skill (1..5). */
export function salaryFor(role: RoleDef, skill: number): number {
  return Math.round(role.salary * (0.7 + skill * 0.15));
}
