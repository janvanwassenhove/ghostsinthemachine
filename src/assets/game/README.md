# Custom art drop-in folder

Drop `*.png` files here to replace the game's procedural graphics. The texture
key is the filename without extension (e.g. `ghost_code.png` -> `ghost_code`).
Anything you don't provide falls back to the built-in procedural rendering, so
you can add art one file at a time.

**After adding or renaming files, restart `npm run dev` (or rebuild)** so Vite
re-scans this folder.

All art must be original and IP-safe: no real company logos, no recognizable
game/character likenesses. Centered subject. Transparent backgrounds are ideal,
but a flat white or dark background is fine — the game knocks it out at load
time (edge flood-fill in src/render/assets.ts).

## Optimizing

Generated art is often 1000px+ and huge. After adding files, run:

```
pwsh ./scripts/optimize-assets.ps1
```

It downscales sprites to 256px (backgrounds to 1280px, logo to 900px) and
re-encodes them, backing up the full-res originals to `_originals/` (which is
gitignored and NOT loaded by the game). Re-runnable and non-destructive.

## Filenames the game looks for

### Incident ghosts (tinted fallback today) — ~128×128
`ghost_code` · `ghost_legacy` · `ghost_cloud` · `ghost_process` · `ghost_infra`
· `ghost_print` · `ghost_ai` · `ghost_security` · `ghost_data`

### Staff tokens (colored circle fallback) — ~96×96, circular framing
`staff_bug_whisperer` · `staff_legacy_priest` · `staff_cloud_shaman` ·
`staff_security_goblin` · `staff_scrum_necromancer` · `staff_devops_janitor` ·
`staff_architect_oracle` · `staff_database_medium` · `staff_printer_exorcist` ·
`staff_ai_prompt_therapist` · `staff_qa_revenant` · `staff_compliance_druid` ·
`staff_release_bard` · `staff_incident_commander` · `staff_refactoring_monk`

### Room icons (corner badge) — ~64×64
`room_triage` · `room_debug_chapel` · `room_legacy_crypt` · `room_merge_arena` ·
`room_cloud_detox` · `room_compliance_bunker` · `room_observatory` ·
`room_coffee_reactor` · `room_war_room` · `room_ai_sanitarium` ·
`room_server_seance` · `room_printer_booth` · `room_db_vault` · `room_panic_cell`
· `room_refactor_dojo` · `room_release_ritual` · `room_monitoring_shrine` ·
`room_patch_unit` · `room_backup_lab`

### Room floor-plans (fill the whole room in-game; optional) — square, ~384×384
`roomplan_triage` · `roomplan_debug_chapel` · `roomplan_legacy_crypt` ·
`roomplan_merge_arena` · `roomplan_cloud_detox` · `roomplan_compliance_bunker` ·
`roomplan_observatory` · `roomplan_coffee_reactor` · `roomplan_war_room` ·
`roomplan_ai_sanitarium` · `roomplan_server_seance` · `roomplan_printer_booth` ·
`roomplan_db_vault` · `roomplan_panic_cell` · `roomplan_refactor_dojo` ·
`roomplan_release_ritual` · `roomplan_monitoring_shrine` · `roomplan_patch_unit`
· `roomplan_backup_lab`
(These stay opaque — no background knockout. `room_*` icons show only in the
Build menu; `roomplan_*` fill the room on the map with staff/ghosts on top.)

### Map & branding
`tile_floor` (seamless, 80×80) · `bg_menu` (1280×720) · `logo_title` (~760×140,
transparent) · `art_victory` (1280×720) · `art_defeat` (1280×720)

See PROMPTS.md in this folder for ready-to-paste ChatGPT prompts.
