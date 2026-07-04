# CLAUDE.md — Operational Rules for "Ghosts in the Machine"

Browser game: TypeScript + Vite + Phaser. Static site, no backend, no server runtime, no database. Persistence via LocalStorage only. Deployed to GitHub Pages.

## Commands

- `npm install` — install dependencies
- `npm run dev` — dev server
- `npm run build` — type-check (`tsc --noEmit`) then production build to `dist/`
- `npm run preview` — serve the production build locally

## Rules

1. **Keep the build working.** `npm run build` must pass after every change set. Never leave the repo in a broken state at the end of a phase.
2. **Prefer simple, maintainable code.** Small modules, plain data structures, explicit types. Phaser Scenes for screens, plain TypeScript classes/functions for simulation logic so it stays testable and renderer-independent.
3. **Do not over-engineer.** No frameworks beyond the declared stack, no state-management libraries, no ECS libraries, no premature abstraction. Add structure only when a second concrete use exists.
4. **Do not stop at planning.** Plans in ROADMAP.md/TASKS.md exist to be executed. Implement, then verify.
5. **Do not ask for confirmation between phases.** Proceed phase to phase autonomously.
6. **Only pause** for destructive actions, real scope changes, or input only the user can provide.
7. **Verify before reporting.** Before claiming something works, check the claim against actual command output (build logs, dev-server output, file contents). Never report a phase done on assumption.
8. **After each implementation phase:** run `npm run build` (and tests, once they exist), fix all failures before moving on, and tick off completed items in TASKS.md.
9. **IP safety is a hard constraint.** Do not add copyrighted assets or any references to protected game IP — no names, sprites, audio, UI likeness, room names, disease/incident names, jokes, or characters from Theme Hospital, Bullfrog, EA, or any other protected game. Only broad genre traits (management sim, queues, room building, staff, absurd humour) are shared.
10. **Keep all concrete creative elements original.** Room types, incident names, staff roles, flavour text, art, and sounds must be invented for this project. Art is original programmatic/procedural graphics or self-drawn assets; audio, if any, is generated (e.g., WebAudio) — never downloaded copyrighted files. No paid assets.

## Key files

- `GAME_SPEC.md` — full game design specification
- `ROADMAP.md` — phased execution plan with acceptance criteria and verification commands
- `TASKS.md` — checklist of all tasks; keep it updated as work completes
- `src/main.ts` — entry point; Phaser scenes live in `src/scenes/`, simulation logic in `src/sim/`
