/**
 * The humour system: all flavour text, all original.
 * Ticket titles are per-incident variants; the sim picks one at spawn.
 */

export const TICKET_TITLES: Record<string, string[]> = {
  recursive_panic: [
    'Function calls itself, screams, calls itself again',
    'Stack overflowed into the break room',
    'Recursion has no base case and no remorse',
  ],
  null_apparition: [
    'Something undefined is standing in the hallway',
    'Object reference not set to an instance of anything, ever',
    'Null appeared in the mirror. It pointed.',
  ],
  phantom_merge: [
    'Conflict in a file nobody has ever edited',
    'Both branches claim to be the original',
    'Merge markers found carved into a desk',
  ],
  pr_possession: [
    'Pull request approves itself at 3 AM',
    'Reviewer left 666 comments. Reviewer does not exist.',
    'The diff grows when nobody watches it',
  ],
  build_curse: [
    'Build fails only when it matters',
    'Pipeline green locally, cursed remotely',
    'CI demands a sacrifice (it accepts YAML)',
  ],
  legacy_possession: [
    'Payroll system speaks in a dead dialect of COBOL',
    'Mainframe insists the year is 1987 and refuses counselling',
    'Legacy module rewrites commits from beyond the EOL',
  ],
  deadline_poltergeist: [
    'Deadline moved itself three days closer overnight',
    'Calendar invite arrived from next Friday, furious',
    'Milestone haunts the roadmap, rattling its chains',
  ],
  cloud_allergy: [
    'On-prem server breaks out in hives near the cloud',
    'Workload sneezes every time someone says "serverless"',
    'Migration plan allergic to its own regions',
  ],
  docker_poltergeist: [
    'Container restarts itself and slams the ports',
    'Image pulls things. Wrong things. From nowhere.',
    'Volume mounts to a directory that predates the company',
  ],
  kube_fog: [
    'Cluster shrouded in fog; pods wander in circles',
    'Nobody can see the control plane. It can see you.',
    'Service mesh has become an actual mesh. It is damp.',
  ],
  sprint_haunting: [
    'Velocity chart shows a face',
    'Sprint board tickets rearrange themselves at dusk',
    'Retro action items from 2019 are back and angry',
  ],
  standup_loop: [
    'Standup has lasted 11 hours. It is still 9:15.',
    '"Quick sync" has trapped four engineers since Tuesday',
    'Yesterday I did what I will do today, again, forever',
  ],
  jira_doppelganger: [
    'Ticket duplicated itself. The duplicate has seniority.',
    'Two identical tickets claim the other is the clone',
    'Every ticket links to itself as its own blocker',
  ],
  roadmap_mutation: [
    'Q3 goals sprouted extra quarters',
    'Roadmap grew a branch labelled "???" — it is growing',
    'North star metric has become a binary star system',
  ],
  scope_creep: [
    'Small tweak now includes a mobile app and a boat',
    'Feature request oozing under the meeting room door',
    '"While you\'re in there" has achieved physical form',
  ],
  api_amnesia: [
    'API forgot its own endpoints, introduces itself as "REST-ish"',
    'Version 2 denies version 1 ever existed',
    'Gateway returns 200 OK with existential doubt in the body',
  ],
  endpoint_crisis: [
    '/users returns invoices and refuses to discuss it',
    'Endpoint changed its name and moved to a new port',
    'Health check answers "define healthy"',
  ],
  yaml_fever: [
    'Config file running a temperature of two extra spaces',
    'Indentation drifted; production drifted with it',
    'Anchor references an alias that references regret',
  ],
  cache_goblins: [
    'Cache serves yesterday, insists it is fresh',
    'Goblins hoarding stale sessions under the CDN',
    'Invalidation failed; the goblins have lawyers now',
  ],
  db_deja_vu: [
    'Query returns the same row it returned in a dream',
    'Transaction commits, rolls back, commits, rolls back',
    'Table remembers being dropped. It has not forgiven.',
  ],
  spreadsheet_singularity: [
    'Spreadsheet references itself and gained self-esteem',
    'Cell A1 contains the entire company. Do not sort.',
    'Pivot table achieved consciousness, requests a raise',
  ],
  printer_contract: [
    'Printer produced a contract in blood-red toner',
    'Tray 2 opens by itself. Something signs inside.',
    'Printer prints tomorrow\'s outage reports',
  ],
  ai_hallucination: [
    'Agent cites a library that will exist in 2031',
    'Chatbot confidently books meetings with the deceased',
    'Model insists the office has always had a 13th floor',
  ],
  oauth_seance: [
    'Token refresh summoned something without scopes',
    'Login redirects through the spirit realm (HTTP 307)',
    'Identity provider cannot verify its own identity',
  ],
};

export const STAFF_QUIRKS: string[] = [
  'afraid of PDFs',
  'on a first-name basis with the ghosts',
  'types exclusively in vim motions',
  'whispers "works on my machine" as a mantra',
  'keeps a lucky rubber duck (it blinks)',
  'refuses to deploy on full moons',
  'can smell an unclosed bracket',
  'once merged to main and lived',
  'drinks coffee through a straw, ominously',
  'writes commit messages in iambic pentameter',
  'saw the backlog and came back changed',
  'insists tabs are a state of mind',
  'communicates with routers via interpretive dance',
  'keeps their standups exactly 14 seconds long',
  'has a support contract with the void',
  'names every server after a disappointment',
];

// Contextual thought-bubble lines. All original IT humour.
export const STAFF_THOUGHTS: Record<string, string[]> = {
  working: [
    'It compiles. I choose not to ask why.',
    'This is fine. This is load-bearing fine.',
    'I\'ll refactor it later. — a lie, told daily.',
    'The bug is a feature if you make eye contact.',
    'Ticket says "urgent". They all say "urgent".',
    'Root cause: the usual. Also ghosts.',
    'One more coffee and I can see the stack trace with my eyes closed.',
    'Have I tried turning it off and on? I AM turned off and on.',
  ],
  tired: [
    'I have not blinked since the last deploy.',
    'Running on fumes and a cached session.',
    'My energy bar is at 404.',
    'If I sit down I will merge with the chair.',
    'Sleep is just a very long timeout.',
  ],
  grumpy: [
    'I was promised a haunted office, not THIS haunted.',
    'Morale.exe has stopped responding.',
    'Whoever wrote this commit message owes me an apology.',
    'I did not study necromancy to reset passwords.',
    'On-call is a personality now, apparently.',
  ],
  break: [
    'Ah, the sweet 300ms of an espresso shot.',
    'Coffee: my only dependency with no known CVEs.',
    'Break room: the one place with no pager.',
    'Recharging. Do not deploy. Do not even look at me.',
    'This mug says "World\'s Okayest Sysadmin". Fair.',
  ],
  generic: [
    'The rubber duck knows what it did.',
    'Standups should be a strongly-worded email.',
    'I trust the monitoring dashboard about as far as I can throw prod.',
    'YAML is just XML that skipped leg day.',
    'It works on my machine — my machine is also haunted.',
  ],
};

export const GHOST_THOUGHTS: Record<string, string[]> = {
  queued: [
    'Still in the queue. I have unionised.',
    'Estimated wait: the heat death of the sprint.',
    'I could self-resolve. I choose chaos.',
    'Hold music, but it\'s just my own screaming.',
    'Ticket age: yes.',
  ],
  escalating: [
    'Severity rising. So is my confidence.',
    'You had your chance. Now I\'m a P1.',
    'I\'m not stuck, I\'m ESCALATING.',
    'Every second unhandled, I grow a new eye.',
    'CC-ing the entire company. And their pets.',
  ],
  stuck: [
    'There is no room for me. Existentially and literally.',
    'I need a room that does not exist yet. Rude.',
    'Wandering the corridor like a null pointer.',
    'Build me a home or I haunt the break room.',
    'Where do I go? WHERE DO I GO?',
  ],
  generic: [
    'I am not a bug. I am a lifestyle.',
    'Reproducible only under a full moon.',
    'Have you tried NOT looking at the logs? Bliss.',
    'I was deleted. I got better.',
    'Works in prod, breaks in your heart.',
    'I am the "cannot reproduce" they warned you about.',
  ],
};

// When staff and ghost share a room, they trade absurd IT banter. Each entry
// is an alternating exchange (staff line, then ghost line, ...). All original.
export const CONVERSATIONS: { who: 'staff' | 'ghost'; text: string }[][] = [
  [
    { who: 'staff', text: 'Have you tried turning yourself off and on again?' },
    { who: 'ghost', text: 'I have BEEN off. Death did not clear the cache.' },
    { who: 'staff', text: 'Classic caching bug, honestly.' },
  ],
  [
    { who: 'staff', text: 'Okay, walk me through your repro steps.' },
    { who: 'ghost', text: 'Step 1: exist. Step 2: haunt. Step 3: profit.' },
    { who: 'staff', text: 'That\'s the same as management\'s roadmap.' },
  ],
  [
    { who: 'ghost', text: 'Your code called me a "temporary workaround" in 2014.' },
    { who: 'staff', text: 'And look at you now — load-bearing.' },
    { who: 'ghost', text: 'I have grown so powerful. And so tired.' },
  ],
  [
    { who: 'staff', text: 'It says here you\'re a "known issue".' },
    { who: 'ghost', text: 'Known, feared, and never prioritised.' },
  ],
  [
    { who: 'staff', text: 'Have you considered NOT being a null pointer?' },
    { who: 'ghost', text: 'I point at the truth. The truth is nothing.' },
    { who: 'staff', text: 'Deep. Still throwing an exception though.' },
  ],
  [
    { who: 'ghost', text: 'I only appear in production. Never in staging.' },
    { who: 'staff', text: 'A true professional. Respect.' },
  ],
  [
    { who: 'staff', text: 'Last time I closed you, you reopened yourself.' },
    { who: 'ghost', text: 'I have abandonment issues and a cron job.' },
  ],
  [
    { who: 'staff', text: 'Let\'s just add a try/catch and never speak of this.' },
    { who: 'ghost', text: 'You cannot catch what has already possessed the stack.' },
    { who: 'staff', text: 'Fair. Ship it.' },
  ],
];

export const STAFF_FIRST_NAMES: string[] = [
  'Morgane', 'Casper', 'Wren', 'Igor', 'Beatrix', 'Sam', 'Odette', 'Bram',
  'Nyx', 'Ferdinand', 'Lux', 'Prudence', 'Kelvin', 'Ada', 'Vlad', 'Juniper',
  'Salem', 'Barnaby', 'Echo', 'Minerva',
];

export const STAFF_LAST_NAMES: string[] = [
  'Nullpointer', 'Von Backlog', 'Grepwood', 'De Kernel', 'Hexworth', 'Stackhouse',
  'Cronjob', 'Vandermerge', 'Bitrot', 'Ozymandias-Smith', 'Threadlock', 'Packetova',
  'Segfault', 'Mistcastle', 'Rollback', 'Van Daemon',
];

export const OFFICE_CHATTER: string[] = [
  'Reminder: the 4th floor does not exist. Stop taking tickets there.',
  'The server room hum has changed key. Facilities says this is "fine".',
  'Lost: one keyboard. Answers to "Clacky". Do not make eye contact.',
  'The night shift reports the backlog rearranged itself alphabetically. By fear.',
  'Compliance reminds everyone that summoning circles must be ISO 9001 certified.',
  'The coffee machine has started predicting outages. It is 9 for 9.',
  'Someone left a cursed USB stick in the kitchen. It is now two USB sticks.',
  'The elevator plays hold music between floors 2 and 3. There is no floor 2½.',
  'Ticket #1 has reopened itself. It remembers everything.',
  'Please stop feeding the cache goblins after midnight.',
  'The rubber duck in the Debugging Chapel blinked again. Twice means DNS.',
  'Weather forecast: partly cloudy with a chance of unplanned failover.',
  'The intern who said "how hard can it be" is doing much better now.',
  'Legal has cleared the printer\'s new contract. Legal is now on leave.',
  'Status page updated: everything is fine. The status page is on fire.',
  'A meeting that could have been an email has become a haunting.',
  'The monitoring dashboards are all green. Nobody trusts them.',
  'Whoever renamed prod to "prod_old_FINAL_v2" — the ghosts loved it.',
];

export const RESOLVE_LINES: string[] = [
  'Incident resolved. The screaming was rerouted to /dev/null.',
  'Fixed. Root cause: the usual, but haunted.',
  'Resolved. Closing ritual performed, ticket salted.',
  'Done. It has promised never to do that again. It is lying.',
  'Patched. The workaround is now load-bearing.',
];

export const FAIL_LINES: string[] = [
  'The client hung up mid-wail. Trust took a hit.',
  'Incident stormed out through a closed door.',
  'Ticket rage-quit and left a one-star séance review.',
  'Unresolved. It says it will "escalate to the beyond".',
];

export const AUDIT_PASS_LINES: string[] = [
  'The Bureau of Digital Sanctity nods once, files you under "tolerable".',
  'Audit passed. The auditor left a grant and a faint smell of laminate.',
];

export const AUDIT_FAIL_LINES: string[] = [
  'Audit failed. The auditor\'s stamp glowed. That is never good.',
  'The Bureau finds you "spiritually non-compliant". There is a fine.',
];

export const VICTORY_LINES: string[] = [
  'The office falls quiet. Even the printer is at peace. For now.',
  'The ghosts file a formal complaint about your competence.',
  'Somewhere below the floor, a mainframe sighs and goes back to sleep.',
];

export const DEFEAT_LINES: string[] = [
  'The lights flicker once, politely, and then not at all.',
  'The backlog wins. The backlog always had the numbers.',
  'Your access badge no longer opens anything. Including doors it never opened.',
];

export const HIRE_LINES: string[] = [
  'signed the contract in ordinary ink, which was a nice change.',
  'asked if the office was haunted. Everyone answered "yes" in unison.',
  'listed "the void" as an emergency contact.',
  'negotiated a coffee clause. Smart.',
];
