# Ghosts in the Machine

> A haunted IT management sim for the browser. Any resemblance to your production environment is entirely coincidental and also your own fault.

Run **NetherNet Solutions**, a paranormal IT support company built over a decommissioned mainframe graveyard. Construct rooms inside a haunted office building, hire staff of questionable qualification, and route an endless queue of absurd tickets — from *"Keyboard speaks only in umlauts"* to *"Printer produced a contract in blood-red toner"* — while juggling money, client trust, technical debt, system stability, coffee supply, staff morale, audits, and the occasional Decaf Riot.

Built with **TypeScript + Vite + Phaser**. Fully static: no backend, no server runtime, no database. Your saves live in your browser's LocalStorage, where nobody can audit them (yet).

**▶ Play it:** `https://<your-username>.github.io/ghostsinthemachine/` *(live once GitHub Pages is enabled — see below)*

## Features

- **22 original rooms** — from the Ticket Triage Desk and Debugging Chapel to the Printer Exorcism Booth and Backup Resurrection Lab — with upgrades, wear, breakdowns, repair, demolition, and **rotatable doors** (press `R` while placing)
- **17 original staff roles** (Bug Whisperer, Scrum Necromancer, Printer Exorcist, Groundskeeper, …) with skills, salaries, fatigue, morale, quirks, training, and the occasional dramatic resignation
- **24 original incident types** that spawn at the gate, **queue up along the walkway**, file in **through the building's entrance door**, escalate, mutate mid-queue, and follow multi-room service chains
- **Buildings you actually build inside** — each campaign map has its own building footprint with a real entrance; ghosts respect the walls and can only get in through the door
- **The Grounds** — an outdoor garden where you plant a **Java Bean Plantation** (it grows coffee beans; Java, obviously), raise an **Oak of Undefined Behaviour** (Java's original name; steadies morale), and run a literal **Server Farm**, each tended by dedicated grounds staff
- Economy, client-trust tiers, technical debt (with **The Great Refactoring** at 100), derived system stability, and a beans → Coffee Reactor → energy supply chain with escalating alerts
- **6 disasters** (Incident Storm, The Update, Vending Machine Uprising, …) and audits by the Bureau of Digital Sanctity, who bring clipboards that audit you back
- **7-scenario campaign** with per-contract **absurd cold-open cutscenes**, sequential unlocks, and star ratings — plus a configurable **sandbox mode**
- **WebAudio sound effects** (synthesised at runtime, never downloaded) and contextual **thought bubbles** — watch staff and ghosts hold genuinely unhinged IT conversations
- Categorised build menu, scrolling panels, contextual hint banner, save/load via LocalStorage (autosave, manual save, corrupt-save quarantine), and victory/failure screens

## Requirements

- Node.js 20+ and npm

## Install / Run / Build

```bash
npm install     # install dependencies
npm run dev     # dev server at http://localhost:5173
npm test        # vitest unit tests (sim, grid, economy, footprints, save round-trip)
npm run build   # type-check + production build to dist/
npm run preview # serve the production build locally
```

## How to play

1. **Build a Ticket Triage Desk** (Build tab → *Core*) — every incident checks in there first. Drag it out on the lit building floor; the ghosts queue on the walkway outside.
2. Build treatment rooms (Debugging Chapel and Patch Containment Unit cover the early tickets) and a **Coffee Reactor** — no reactor means no recharging, and tired staff burn out.
3. **Hire** staff (Hire tab) and click a room to **assign** them — roles matter; each candidate lists which rooms they can work in.
4. Out on **The Grounds**, plant a Java Bean Plantation for free coffee beans and drop an Oak of Undefined Behaviour to keep morale up.
5. Keep beans stocked, repair worn rooms, train staff in the **Refactoring Dojo** to burn technical debt, and hit the objectives in the top-left before the office hits *you*.

**Controls:** mouse to build (drag), inspect, and assign • `R` rotates a room's door while placing • hover ghosts/staff/stats for tooltips • mouse wheel scrolls the side panel and zooms the office • `Space` pause • `1`/`2` speed • `Esc` menu / cancel build • right-click cancels build mode and pans.

## Deploy to GitHub Pages

The site builds to plain static files with a relative base path (`vite.config.ts` sets `base: './'`), so it works from any subpath — no per-repo configuration needed.

1. Push this repository to GitHub (public repo, e.g. `ghostsinthemachine`).
2. In the repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push to `main`. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs the tests, builds the project, and publishes `dist/` to Pages.
4. Your site goes live at `https://<your-username>.github.io/ghostsinthemachine/`.

## Originality & IP note

Ghosts in the Machine is an **original work**. It shares only broad, unprotectable genre traits with classic management sims — building rooms, queues, staff assignment, absurd humour, escalating chaos, economic pressure. All concrete content is invented for this project: the setting, room names, incident names, staff roles, characters, jokes, UI, and visual identity. It does not recreate, reference, or derive from Theme Hospital, Bullfrog, EA, or any other protected game or asset.

## Asset policy

- **No paid assets.** Everything ships free.
- **No copyrighted third-party assets.** No downloaded sprites, ripped audio, restrictively-licensed fonts, or borrowed content of any kind.
- Art is original: procedural Phaser graphics plus optional self-made PNGs auto-discovered from `src/assets/game/` (rooms without art fall back to a labelled colour chip).
- **All audio is synthesised at runtime via WebAudio** — no audio files are ever downloaded or bundled.

## Project docs

- [GAME_SPEC.md](GAME_SPEC.md) — full game design (matches the implementation)
- [ROADMAP.md](ROADMAP.md) — phased build plan
- [TASKS.md](TASKS.md) — verified task checklist
- [CLAUDE.md](CLAUDE.md) — working rules for AI-assisted development

## Credits

Made by **Jan Van Wassenhove** — Chief Exorcist of Undefined Behaviour and the only person who reads the logs after 2 AM. More at [mityjohn.com](https://mityjohn.com/). All ghosts are fictional. The technical debt is real.
