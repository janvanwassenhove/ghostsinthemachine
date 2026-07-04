# GAME_SPEC.md — Ghosts in the Machine

A haunted IT management sim for the browser. You run **NetherNet Solutions**, a paranormal IT support company whose data centre was built on top of a decommissioned mainframe graveyard. Legacy systems are possessed, printers behave like demons, cloud migrations cause supernatural incidents, AI agents hallucinate in production, and technical debt can become sentient. Your job: build rooms, hire staff, route an endless flood of absurd IT incidents through queues, keep clients trusting you, keep technical debt from collapsing the stack, and keep the coffee flowing.

**Tone:** dry, absurd IT humour. Bureaucratic horror played for laughs. Everything concrete — names, incidents, rooms, staff, jokes — is original to this project.

**Status: implemented.** This spec matches the shipped v1. See TASKS.md for the verified checklist.

---

## 1. Core Loop

1. Incidents (tickets) spawn at the office entrance and walk to the **Ticket Triage Desk**.
2. After triage they follow a **service chain** to one or two treatment rooms, queueing at each door.
3. Staff assigned to rooms process tickets; resolution earns money and client trust, failure costs both.
4. Money buys rooms, staff, upgrades, repairs, and coffee beans. Trust raises incident severity and payouts.
5. Technical debt and instability accumulate from failures and shortcuts, triggering disasters.
6. Periodic audits and escalating haunt activity force the player to balance expansion vs. stability.

## 2. Playable Space — Grid & Room Building

- The office floor is a 24×15 tile grid. Column 0 is the entrance corridor (incidents spawn and leave there).
- Player picks a room from the Build panel and drags a rectangle; each room type has a minimum size and cost.
- Every room gets a **door tile** on its perimeter (bottom-centre preferred) with a corridor tile outside; placements with no corridor access are rejected.
- Corridors are unbuilt tiles; incidents pathfind along them (BFS).
- Rooms can be **upgraded** (levels 1–3: faster service, larger queues), **wear out** with use, **break down**, be **repaired**, and be **demolished** (50% refund, +technical debt).

### Room types (22, all original)

19 indoor rooms (below) plus 3 outdoor **Grounds** rooms (see §17): Java Bean Plantation, Oak of Undefined Behaviour, Server Farm.

| Room | Role in play |
|---|---|
| **Ticket Triage Desk** | First stop of every incident's service chain |
| **Debugging Chapel** | Treats code hauntings (recursions, null apparitions) |
| **Legacy Crypt** | Treats possessed legacy systems |
| **Merge Conflict Arena** | Treats phantom merges and possessed pull requests |
| **Cloud Detox Chamber** | Treats cloud allergies, container poltergeists, cluster fog |
| **Compliance Bunker** | Treats contract/compliance steps; big audit-score bonus |
| **Architecture Observatory** | Staffed: passively restores system stability |
| **Coffee Reactor** | Brews beans into coffee; staff take breaks here |
| **Incident War Room** | Treats management hauntings; staffed: slower escalation everywhere |
| **AI Prompt Sanitarium** | Treats hallucinating AI agents |
| **Server Séance Room** | Contacts unresponsive services; diagnosis step for legacy possession |
| **Printer Exorcism Booth** | De-possesses printers |
| **Database Therapy Vault** | Treats database déjà vu and spreadsheet singularities |
| **Security Panic Cell** | Treats OAuth séance failures and security scares |
| **Refactoring Dojo** | Staff train here (skill up) while burning technical debt |
| **Release Ritual Room** | Treats pipeline curses; staffed: ships releases for daily income |
| **Monitoring Shrine** | Staffed: fewer disasters, better audit scores |
| **Patch Containment Unit** | Treats YAML fever, cache goblins, hotfix fallout |
| **Backup Resurrection Lab** | Staffed: failing incidents sometimes get restored from backup |

## 3. Incidents

Each incident has: **type**, **severity (1–5)**, **patience timer**, **haunt level (0–3)**, **bounty**, and a randomly picked absurd title from original string tables.

### The 24 incident types

Recursive Panic, Null Reference Apparition, Phantom Merge Conflict, Pull Request Possession, Build Pipeline Curse, Legacy Possession, Deadline Poltergeist, Cloud Allergy, Docker Poltergeist, Kubernetes Fog, Sprint Haunting, Standup Time Loop, Ticket Doppelgänger, Roadmap Mutation, Scope Creep Slime, API Amnesia, Endpoint Identity Crisis, YAML Fever, Cache Goblin Infestation, Database Déjà Vu, Spreadsheet Singularity, Printer Demon Contract, AI Hallucination Leak, OAuth Séance Failure.

- **Service chains:** every incident is triaged first, then visits its treatment room; the nastier ones (Legacy Possession, Docker Poltergeist, Pull Request Possession, Printer Demon Contract, Scope Creep Slime, Ticket Doppelgänger) need two rooms in sequence.
- **Escalation:** waiting incidents escalate at patience thresholds — severity and bounty rise, and so do the stakes. A staffed Incident War Room slows escalation office-wide.
- **Mutation:** in some scenarios, queued incidents mutate into other types (new title, new target room, +debt). AI-heavy contracts mutate most.
- **Failure:** at zero patience an incident rage-quits: trust and debt take a hit. A staffed Backup Resurrection Lab sometimes restores the incident for a second chance.
- **Severity scaling:** client trust tier and campaign day push severity (and payouts) upward.

## 4. Staff

### The 17 roles

Bug Whisperer, Legacy Priest, Cloud Shaman, Security Goblin, Scrum Necromancer, DevOps Janitor, Architect Oracle, Database Medium, Printer Exorcist, AI Prompt Therapist, QA Revenant, Compliance Druid, Release Bard, Incident Commander, Refactoring Monk, plus two grounds roles — **Groundskeeper** and **Server Rancher** (see §17).

- Each staff member has skill (1–5), salary, **energy**, **morale**, and one random quirk ("afraid of PDFs", "on a first-name basis with the ghosts", …).
- Rooms only process incidents when staffed with a compatible role; service speed scales with skill, energy, and morale.
- The candidate pool (5, refreshed daily) always leads with a Bug Whisperer and a DevOps Janitor so a fresh office is never unstaffable.
- Energy drains while working; tired staff walk to the Coffee Reactor. With coffee: full recharge and a morale bump. Without: partial recharge and a morale hit.
- Low morale slows work and eventually causes resignations. Paydays and coffee help; disasters and empty pots hurt.
- Staff assigned to the Refactoring Dojo **train** (skill rises daily) while reducing technical debt.

## 5. Economy

- **Money** in: resolved bounties (× severity × trust multiplier), audit grants, Release Ritual income. Out: rooms, upgrades, repairs, signing fees, daily salaries, beans, disaster buy-offs, audit fines.
- Bankruptcy (money below −300) fails the contract (toggleable in sandbox).

## 6. Client Trust

- Global 0–100 meter. Resolutions raise it (by severity); rage-quits, disasters, and failed audits lower it.
- Higher trust raises incident severity tier — and payouts. Trust below 10 collapses the contract.

## 7. Technical Debt & System Stability

- **Technical Debt (0–100)**: rises from failed incidents, haunted rage-quits, demolitions, and mutations; falls via the Refactoring Dojo.
- **System Stability (100–0)**: derived from debt, breakdowns, possessions, active disasters, coffee supply, open incident load, morale, and staffed Observatories. Low stability raises disaster probability and makes the HUD glitch.
- Debt at 100 triggers **The Great Refactoring**: services slow drastically while debt burns off. Survivable but painful.

## 8. Coffee Supply

- The Coffee Reactor converts purchased beans into coffee stock (faster when staffed). Staff consume a coffee per break.
- No coffee: slow recharges, morale decay, and the **Decaf Riot** disaster becomes possible.

## 9. Audits

- The **Bureau of Digital Sanctity** audits on a per-scenario cycle, with a warning the day before.
- Score = f(technical debt, open incident count, staffed Compliance Bunker, staffed Monitoring Shrine).
- Pass: grant + trust. Fail: fine + trust hit.

## 10. Disasters

Triggered probabilistically — more likely at low stability, less likely with a staffed Monitoring Shrine. Each has a telegraph, a timed effect, an optional buy-off, and a dry post-mortem one-liner:

- **Incident Storm** — spawn rate triples.
- **Decaf Riot** — staff down tools (only when the coffee runs dry).
- **Screenwraith Possession** — a random room becomes unusable.
- **Cable Gremlin Infestation** — everyone walks at half speed.
- **The Update** — everything pauses at 37%; queues keep filling.
- **Vending Machine Uprising** — morale drains until terms are reached.

## 11. Campaign Mode

Seven scenarios, unlocked sequentially, each with its own incident pool, twist, and win conditions. Completion is starred (1–3) by final trust and money.

1. **Basement Helpdesk of Mild Concern** — tutorial; resolve 12 simple incidents.
2. **The Office With the Printer** — exorcise 8 printer incidents; 20 total; keep trust ≥ 40.
3. **Cloud Migration Gone Sideways** — survive 5 days of cloud chaos with trust ≥ 45.
4. **The Legacy System That Would Not Die** — inherit debt 70; dig to below 25 and resolve 25.
5. **Audit Season** — audits every 2 days; pass 3.
6. **The AI Agent Incident** — heavy mutation; resolve 30 and survive 4 days.
7. **Ghosts in the Machine** — everything at once; survive 8 days, resolve 50, end with trust ≥ 55.

## 12. Sandbox Mode

Free play with configurable starting money, disaster frequency, audits, mutation rate, and optional fail conditions. Unlocked from the start.

## 13. Save / Load

- LocalStorage only. Versioned JSON schema; incompatible or corrupt saves are quarantined, never crash the boot.
- Autosave every in-game day and on tab-hide; manual save from the pause menu; campaign progress and settings stored separately.

## 14. Presentation

- Phaser 3, single canvas 1280×720 (FIT scaling). All art is original programmatic graphics (generated ghost texture, tinted shapes). No external asset files.
- HUD: money, trust, debt, stability, coffee/beans, morale, clock, speed controls, objectives, disaster chips, office-chatter ticker.
- Controls: mouse (build/drag, click rooms/staff, hover tooltips), Space pause, 1/2 speed, Esc menu, right-click cancels build mode.

## 15. Technical Constraints

- TypeScript strict mode. Vite build. Phaser is the only runtime dependency.
- No backend, no server runtime, no database, no network calls at runtime.
- Simulation is plain serialisable TypeScript in `src/sim/` (seeded RNG, renderer-independent, vitest-covered). Scenes in `src/scenes/` render sim state.
- Deployable to GitHub Pages as a static site (relative base path).

## 16. Out of Scope

Multiplayer, accounts, monetisation, mobile-native builds, mod support, localisation, manual queue re-prioritisation.

## 17. Post-v1 additions (shipped)

- **Buildings & the Grounds.** Each campaign map has a building footprint inset from the map edges, surrounded by garden. Indoor rooms may only be placed inside the building; **outdoor rooms** (Java Bean Plantation → grows beans; Oak of Undefined Behaviour → morale + stability; Server Farm → daily income) go on the grounds and are tended by the **Groundskeeper** and **Server Rancher** roles.
- **Walls & entrances.** The building perimeter blocks movement; ghosts and staff may only cross at an **entrance door** (one per building wing, auto-placed toward the campus gate). Indoor room doors are forced to face an inside corridor, so nothing queues against an outside wall. A walkway leads arrivals from the gate to the door, where they queue in an orderly line instead of stacking.
- **Door rotation.** Press `R` while placing to cycle a room's door side; already-placed doors can be rotated too, re-routing anyone in transit.
- **Campaign intros & About.** Each contract opens with a short absurd cutscene; an About screen credits the creator.
- **Build menu categories, scrolling panels, audio.** Rooms are grouped (Core / Treatment / Support / The Grounds); side panels scroll; sound effects are synthesised at runtime via WebAudio (never downloaded). Staff and ghosts surface contextual thought bubbles and hold nonsense IT conversations.
