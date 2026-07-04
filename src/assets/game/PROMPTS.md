# Image generation prompts — Ghosts in the Machine

Paste the **style preamble** in front of each prompt so everything matches the
game's dark terminal look and drops in cleanly. Save each result with the exact
filename shown (`.png`, transparent unless noted).

IP safety: original artwork only — no real company logos (AWS, Docker, Jira,
Windows, etc.), no recognizable game or character likenesses.

---

## Style preamble (prepend to every prompt)

> Flat vector game asset, transparent background, dark moody palette with a
> phosphor-green accent (#7ee8a2) on near-black (#0b0e12), subtle outer glow,
> spooky-but-comedic "haunted IT office" theme, clean readable silhouette,
> centered subject, consistent soft top light, no text, no logos, no watermark.
> Original artwork, not based on any existing game, brand, or franchise.

---

## 1. Incident ghosts — 128×128, transparent

- `ghost_code.png` — a cute floaty ghost formed from tangled curly braces and brackets, purple glow.
- `ghost_legacy.png` — a wrinkled dusty ghost draped in an old punch-card ribbon, sepia/brown.
- `ghost_cloud.png` — a wispy ghost dissolving into vapor and tiny raindrops, teal.
- `ghost_process.png` — a ghost caught mid-spin inside a looping arrow/clock, muted red.
- `ghost_infra.png` — a ghost woven from frayed network cables and connectors, olive green.
- `ghost_print.png` — a ghost leaking toner and crumpled paper streamers, sickly yellow.
- `ghost_ai.png` — a glitchy ghost with too many mismatched eyes and a flickering halo, lavender.
- `ghost_security.png` — a small goblin-like ghost hugging a glowing padlock, amber.
- `ghost_data.png` — a ghost built from stacked spreadsheet cells and a leaning database drum, green.

## 2. Staff tokens — 96×96, circular-friendly framing, transparent

Each: "a friendly cartoon office worker reimagined as a minor occult IT
specialist, chest-up token portrait, its accent color dominant."

- `staff_bug_whisperer.png` — gently cupping a glowing beetle, violet accent.
- `staff_legacy_priest.png` — robed elder holding a punch-card scroll, brown accent.
- `staff_cloud_shaman.png` — hooded figure with floating cloud wisps, teal accent.
- `staff_security_goblin.png` — grinning goblin with a key-ring necklace, amber accent.
- `staff_scrum_necromancer.png` — dark-robed planner raising sticky-note spirits, red accent.
- `staff_devops_janitor.png` — worker with a mop and a tool-belt of cables, green accent.
- `staff_architect_oracle.png` — serene seer over a floating blueprint orb, blue accent.
- `staff_database_medium.png` — mystic with a crystal ball showing a data drum, green accent.
- `staff_printer_exorcist.png` — figure brandishing a toner cross, olive-yellow accent.
- `staff_ai_prompt_therapist.png` — calm therapist with a clipboard and a floating chat-bubble, lavender accent.
- `staff_qa_revenant.png` — pale returned tester holding a checklist, red accent.
- `staff_compliance_druid.png` — leafy-robed druid sprouting policy scrolls, muted green accent.
- `staff_release_bard.png` — cheerful bard with a lute and a tiny rocket, magenta accent.
- `staff_incident_commander.png` — steady captain with a headset and coffee, blue accent.
- `staff_refactoring_monk.png` — bald monk calmly deleting glowing code lines, slate-gray accent.

## 3. Room icons — 64×64, transparent, simple emblem style

- `room_triage.png` — a triage clipboard with a glowing ticket.
- `room_debug_chapel.png` — a candlelit stained-glass window shaped like a bug.
- `room_legacy_crypt.png` — a stone crypt door with a floppy-disk crest.
- `room_merge_arena.png` — two arrows colliding in a small colosseum.
- `room_cloud_detox.png` — a cloud in a detox bubble/spa.
- `room_compliance_bunker.png` — a reinforced vault door with a stamped seal.
- `room_observatory.png` — a telescope aimed at a blueprint constellation.
- `room_coffee_reactor.png` — a coffee cup with reactor cooling towers.
- `room_war_room.png` — a strategy table with a glowing incident map.
- `room_ai_sanitarium.png` — a therapy couch under a flickering neural halo.
- `room_server_seance.png` — a server rack ringed by floating candles.
- `room_printer_booth.png` — a printer inside a soundproof confession booth.
- `room_db_vault.png` — a database drum on a therapy pillow.
- `room_panic_cell.png` — a padded cell with a rotating amber light.
- `room_refactor_dojo.png` — crossed brooms/katanas over a tidy code scroll.
- `room_release_ritual.png` — a rocket on an altar under a crescent moon.
- `room_monitoring_shrine.png` — a shrine of small glowing dashboards.
- `room_patch_unit.png` — a band-aid/patch in a containment jar.
- `room_backup_lab.png` — a data drum on a resurrection slab with sparks.

## 3b. Room floor-plans (`roomplan_*`) — fill the whole room

These are the **top-down interiors** drawn inside each room on the map; staff and
ghosts walk on top of them. Different from the `room_*` icons (which are only
used in the Build menu). Optimized to 384px.

**Room-plan preamble (use INSTEAD of the sprite preamble — these stay opaque):**

> Top-down orthographic floor plan of a small room, flat-shaded pixel/vector
> game tile, DARK moody palette (near-black #0b0e12 floor with faint green
> accents), themed furniture and equipment arranged mainly around the edges and
> corners leaving the centre floor relatively open and uncluttered, low contrast
> so bright character sprites read clearly on top, cohesive square tile, no text,
> no logos, no people. Original art, not based on any existing game or brand.

Design them roughly **square**. The game **contain-fits** each plan (no
stretching/distortion) centred in the room, with the room's themed tint showing
in any leftover margin and a clean doorway drawn on top by the engine — so do
**not** draw a door into the plan, and keep the centre floor calm (staff/ghosts
stand there). One square plan looks correct at any room size the player draws.

- `roomplan_triage.png` — reception desk, a queue rail, a ticket spike, wall monitors
- `roomplan_debug_chapel.png` — small pews, candles, an altar with a glowing monitor
- `roomplan_legacy_crypt.png` — stone sarcophagi housing ancient mainframes, tape reels, cobwebs
- `roomplan_merge_arena.png` — a small sunken arena pit, two podiums, arrows painted on the floor
- `roomplan_cloud_detox.png` — spa recliners, drip stands of glowing vapour, steam vents
- `roomplan_compliance_bunker.png` — filing cabinets, a stamp desk, a heavy vault door, stacked paperwork
- `roomplan_observatory.png` — a telescope, a drafting table, a faint star-chart painted on the floor
- `roomplan_coffee_reactor.png` — an industrial espresso reactor with pipes, bean silos, scattered mugs
- `roomplan_war_room.png` — a central table with a glowing incident map, chairs, wall screens
- `roomplan_ai_sanitarium.png` — a therapy couch, potted plants, a reclining server "patient", a clipboard
- `roomplan_server_seance.png` — a server rack ringed by lit candles, a séance circle on the floor
- `roomplan_printer_booth.png` — a printer strapped to an altar, warding symbols, padded walls
- `roomplan_db_vault.png` — a therapy couch, a database drum on a pedestal, filing drawers
- `roomplan_panic_cell.png` — padded floor and walls, a single rotating amber light, a locked terminal
- `roomplan_refactor_dojo.png` — tatami mats, training dummies, a rack of brooms/blades
- `roomplan_release_ritual.png` — an altar cradling a small rocket, candles, a crescent-moon floor sigil
- `roomplan_monitoring_shrine.png` — a shrine wall of small dashboards, offering bowls, incense smoke
- `roomplan_patch_unit.png` — quarantine pods, hazard stripes on the floor, a tool bench
- `roomplan_backup_lab.png` — a resurrection slab, data drums, cables and sparks

## 4. Map & branding

- `tile_floor.png` — 80×80 **seamless tileable** dark tech-office floor: subtle grating/carpet texture, faint green grid lines, NOT transparent, very low contrast so sprites stay readable.
- `bg_menu.png` — 1280×720, a dim haunted server room seen in perspective, lots of empty dark space in the center-right for menu buttons, faint green glow, moody.
- `logo_title.png` — ~760×140 transparent wordmark reading "GHOSTS IN THE MACHINE" in a glitchy phosphor-green monospace style with a small ghost emblem, subtle CRT scanlines. (Text is allowed for this one asset.)
- `art_victory.png` — 1280×720, a calm office at dawn, monitors softly green, one content little ghost waving; hopeful and quiet.
- `art_defeat.png` — 1280×720, a dark powered-down office with several lingering translucent ghosts and one blinking red light; ominous but comedic.

---

## Suggested order

1. The 9 `ghost_*` sprites (biggest on-screen change).
2. The 19 `room_*` icons.
3. `bg_menu`, `logo_title`, `tile_floor`.
4. The 15 `staff_*` tokens.
5. `art_victory` / `art_defeat`.
