# TASKS.md — Ghosts in the Machine

Master checklist. Phases map to ROADMAP.md. All items verified against real
command output (`npm run build`, `npm test`) and live browser playtests.

## Phase 1 — Project Setup
- [x] Write CLAUDE.md, GAME_SPEC.md, ROADMAP.md, TASKS.md, README.md
- [x] package.json with dev/build/preview/test scripts (build = tsc --noEmit && vite build)
- [x] tsconfig.json (strict) and vite.config.ts (base './')
- [x] index.html + global CSS (dark, full-viewport canvas)
- [x] src/main.ts boots Phaser with BootScene
- [x] .gitignore (node_modules, dist)
- [x] npm install clean
- [x] npm run build green
- [x] Basic MainMenuScene renders title and menu entries

## Phase 2 — Main Menu & Game Shell
- [x] BootScene → MainMenuScene → Game/Settings scene flow
- [x] Menu buttons: Continue (when a save exists), Campaign, Sandbox, Settings
- [x] UI helpers: button factory, labels, toasts (src/ui/widgets.ts)
- [x] GameScene shell: Esc opens pause menu (Resume / Save / Save & exit / Exit)
- [x] Pause and 1×/2× speed controls (buttons + Space/1/2 keys)
- [x] In-game clock (day + HH:MM) ticking
- [x] HUD: money, trust, debt, stability, coffee/beans, morale, clock, speed
- [x] Sim decoupled from render (plain-TS Sim class, fixed sub-steps, scene renders state)

## Phase 3 — Grid & Room Building
- [x] Grid model with room occupancy (src/sim/grid.ts), 24×15 tiles, entrance corridor
- [x] Grid render layer + build preview highlight (green/red validity)
- [x] 19 room type definitions (src/data/rooms.ts)
- [x] Drag-to-place with validation (bounds, overlap, min size, cost, door access)
- [x] Door tile placement on room perimeter (prefers bottom-centre)
- [x] Demolish with 50% refund + technical-debt penalty
- [x] Room upgrades (level 1–3: faster service, bigger queue)
- [x] Room wear, breakdowns, and repair (condition, BROKEN state, repair cost)
- [x] Build toolbar (right panel) with costs
- [x] Unit tests: placement validation, door access, refund/debt

## Phase 4 — Incidents, Movement, Queues
- [x] Seedable RNG (mulberry32, serialisable state)
- [x] Incident model (type, severity, patience, haunt, bounty, title)
- [x] 24 incident types + original title variants (src/data/incidents.ts, humour.ts)
- [x] Spawn system at the entrance with per-scenario rate curve (faster each day)
- [x] Grid pathfinding (BFS) and incidents walking corridors
- [x] Service chains: Triage Desk first, then 1–2 treatment rooms in sequence
- [x] FIFO door queues with caps + patience decay
- [x] Escalation at patience thresholds (severity/bounty up; War Room slows it)
- [x] Mutation mid-queue into other incident types (scenario-tuned chance)
- [x] Rage-quit on zero patience (trust/debt hit); Backup Lab resurrection chance
- [x] Room processing with staff-skill/energy/morale service-time model
- [x] Unit tests: pathfinding, spawn→chain→resolve lifecycle, failure path

## Phase 5 — Staff
- [x] Staff model (role, skill, salary, energy, morale, quirk)
- [x] 15 roles (src/data/roles.ts) with room compatibility rules
- [x] Candidate pool (5, refreshes daily, always leads with the two generalists)
- [x] Hire panel + signing fee; Fire with morale ripple
- [x] Assign/unassign staff to rooms (room panel and staff panel)
- [x] Role-room compatibility gating of processing
- [x] Energy drain + auto-break at the Coffee Reactor (coffee consumed, morale effects)
- [x] Morale system (coffee, disasters, payday, overwork) + resignations
- [x] Training in the Refactoring Dojo (skill gain + debt burn)
- [x] Unit tests: assignment rules, hiring pool guarantee

## Phase 6 — Economy, Trust, Debt
- [x] Bounty payout (bounty × severity × trust multiplier)
- [x] Payday salary cycle + bankruptcy fail condition
- [x] Coffee bean purchases + Coffee Reactor brewing (staffed = faster)
- [x] Client trust meter; trust tier scales incident severity
- [x] Technical debt sources (failures, demolition, mutation, haunts) and sinks (Dojo)
- [x] System Stability derived meter (debt, breakdowns, ghosts, coffee, morale)
- [x] The Great Refactoring event at debt 100 (slowdown + forced debt burn)
- [x] Release Ritual Room daily income; Observatory stability bonus
- [x] HUD wired to real values
- [x] Unit tests: economy math, outcome detection

## Phase 7 — Disasters, Audits, Humour
- [x] Disaster framework (trigger chance from stability, telegraph toast, timed effect, buy-off, post-mortem one-liner)
- [x] 6 disasters: Incident Storm, Decaf Riot, Screenwraith Possession, Cable Gremlin Infestation, The Update, Vending Machine Uprising
- [x] Monitoring Shrine reduces disaster chance and boosts audits
- [x] Audit scheduling with day-before warning, score (debt, open tickets, Compliance Bunker, Monitoring Shrine), pass grant / fail fine
- [x] Humour system: 72+ ticket titles, office-chatter ticker, staff quirks, resolve/fail/audit/victory/defeat lines — all original
- [x] Low-stability HUD glitch effect (clock jitter)

## Phase 8 — Campaign & Sandbox
- [x] Scenario definition format (start money/debt/trust, spawn curve, pool, disasters, audits, mutation, win/fail)
- [x] 7 campaign scenarios with distinct pools, twists, and win conditions
- [x] Level select with sequential unlock + best-star display
- [x] Win/fail detection + End scene (victory/failure, stats, stars, next/retry)
- [x] Sandbox configuration screen (money, disasters, audits, mutation, fail toggle)
- [x] Sandbox options verified to alter the simulation (fail-off confirmed live)

## Phase 9 — Save/Load & Settings
- [x] Versioned JSON save schema (SAVE_VERSION, mismatch → quarantine)
- [x] Full sim state serialise/restore (round-trip tested in node and browser)
- [x] LocalStorage slots: autosave, manual save, campaign progress, settings
- [x] Autosave on new day and on tab-hide (visibilitychange)
- [x] Corrupt save quarantined (.corrupt key), boot never crashes
- [x] Settings scene: chatter toggle, autosave toggle, default speed, reset progress (two-click confirm)
- [x] Unit tests: serialisation round-trip

## Phase 10 — GitHub Pages Deployment
- [x] Relative base ('./') verified in built output
- [x] .github/workflows/deploy.yml (build + actions/deploy-pages on main)
- [x] README deployment instructions match the workflow

## Phase 11 — Polish, Balancing, README
- [x] Balance pass: tutorial spawn rate/trust softened after live playtest
- [x] Console clean during playtests (no errors)
- [x] Final README (features, controls, how to play)
- [x] TASKS.md reconciled

## Phase 12 — Post-v1 features
- [x] WebAudio-synthesised sound effects (clicks, build, hire, resolve, disaster, day) + settings toggle
- [x] Contextual thought bubbles for staff and ghosts, plus absurd staff↔ghost conversations
- [x] Room door rotation (`R` while placing; requeues ghosts, re-routes staff to the new door)
- [x] Building footprints per campaign map — the building no longer fills the grid
- [x] The Grounds (garden) outside the building with outdoor-only rooms
- [x] Outdoor rooms: Java Bean Plantation, Oak of Undefined Behaviour, Server Farm (with staffed bonuses)
- [x] Dedicated grounds staff roles (Groundskeeper, Server Rancher)
- [x] Building wall collision — ghosts/staff may only cross the footprint at an entrance door
- [x] Indoor room doors forced to face an inside corridor (rotate to fix)
- [x] Arriving ghosts queue along the walkway instead of stacking on the entrance tile
- [x] Campaign intro cutscenes (per-contract absurd cold opens) + About screen (creator credit)
- [x] Categorised build menu (Core / Treatment / Support / The Grounds) with placeholder chips
- [x] Scrollable side panel (mouse wheel) so long hire/build lists stay reachable
- [x] Coffee-chain clarity: HUD stat tooltips, "no reactor!" alert, escalating hints
- [x] Unit tests: room rotation, footprint zones, wall collision, bean growth, arrival queue

## Deferred (intentionally out of scope)
- [ ] Manual queue re-prioritisation (drag a ticket up a queue)
- [ ] Object pooling (entity counts stay low; 60fps holds without it)
- [ ] Downloadable custom PNG art for the outdoor buildings (procedural chips stand in for now)
