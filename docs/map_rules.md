# Monsters Clash — Locked Standard Battlefield Layout v1

## Visual master
The approved Water/Ice illustration `moonlit_aurora_ice_battlefield.png` is the **composition master** for all five basic elements. Keep its open, continuous horizontal combat floor, layered distant scenery, left/right side scenery and clear monster/tower silhouettes. Replace only environment-specific visuals, colors, textures and weather. Do not embed units, towers, UI, text, damage indicators, status icons or combat particles into the static map artwork.

## Shared battlefield geometry (authoritative gameplay coordinates)
- Internal canvas: **960 × 480**. Render artwork with cover-fit while retaining the combat anchors; background art can be 16:9 but must tolerate horizontal/vertical cover cropping.
- Ally tower center: **x=80**; enemy tower center: **x=880**. Keep their scenery zones visually uncluttered.
- Tower approaches: **x=170** (ally) and **x=790** (enemy).
- Unit spawn positions: x=198 (ally), x=762 (enemy).
- Ground battle lanes: **y=343, 363, 385, 407, 429**. This is a continuous fightable floor, not floating platforms.
- The shared world geometry determines damage zones; background pixels do not create collision. New maps must never supply separate collision geometry in Phase 1.
- Prefer landscape artwork of a uniform source size for every map (for example, **1600 × 900**, 16:9), preserving a clear playable floor. No labels or game elements baked into static images.

## Five basic elements
- Fire — Ember Wasteland: embers / burning hazard (future)
- Water — Frost Plain (Ice theme): snow, icy wind, chill and short freeze
- Earth — Stonefall Canyon: dust / tremors (future)
- Nature — Whisper Meadow: leaves / roots (future)
- Metal — Silvercrest Valley: metallic glimmers / shards (future)
- Poison — Toxic Marsh: **disabled/hidden**, retained for later.

Water is the core elemental affinity. Ice and snow are environment themes and attack specializations; Ice-specialized monsters have primary element `water` with specialization `ice`, so no compatibility aliases are needed.

## Engine ownership
- Map IDs, active state, background, affinity and hazard parameters are stored in **one authoritative map entry**, not repeated in additional overlay files.
- The Water/Ice map's source is `data/maps/water-ice.json`; `stage_affinities.json` references that path. Other active maps currently remain inline in `stage_affinities.json` until migrated.
- `modules/elements/environment.js` owns all weather particles, weather status timers and environmental hazard triggers. No separate patch/helper engine.
- The main battle loop only calls this module's public methods; its existing `dmg()` remains the authoritative damage calculation for current attacks.
- Ambient snow is cosmetic; a frost hazard event alone applies status.
- Hazard checks target living, non-matching monsters on **both teams**, with a short post-summon protection period.
- Environmental status and bonuses are separate from monster abilities; Water affinity is immune only to **map-sourced** chill/freeze.
- A map with `enabled:false` is excluded from selection and does not play in live random battles.

## Water/Ice environmental sequence
1. Frost Plain selected -> load snowy backdrop and ambient snow effect.
2. Snow falls continuously and wind streaks pass occasionally.
3. First hazard triggers after ~10 seconds; subsequent events every 15–22 seconds.
4. Nonmatching, eligible monsters are chilled: movement speed -20% for 3 seconds.
5. Each eligible target has a 20% chance of a 0.6-second freeze during the event.
6. Fire, Metal, Earth, Nature and Neutral units can be affected; Water units, including Ice-specialized Water units, are immune.
7. Environmental hazards do **not** lower HP on this map; other future hazards can call the regular damage engine.

## Migration and assets
The approved image is held as a locally generated PNG pending a binary-safe repository upload. Until it is uploaded the Water/Ice JSON points to the existing working `assets/backgrounds/frost-plain.png`. Do not fabricate a path to an uncommitted file or replace the approved artwork with unrelated art.

**Status:** Map rules locked; Water/Ice engine implemented. Other elemental hazard types are deliberately not activated until designed.
