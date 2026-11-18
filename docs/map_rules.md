# Monsters Clash — Locked Elemental Map Layout Rules v2

## 1. Master design
The approved **Frostveil Valley Water/Ice battlefield without a visible sun, moon, stars or celestial glow** is the new layout reference. All five basic elemental maps reuse its composition, silhouette clearance, continuous ground and fixed gameplay coordinates. Replace terrain, palette, flora, geology and ambient weather—not the geometry.

**Forbidden in all static map artwork:**
- Sun, moon, stars, constellations, planets, sunrise/sunset discs, visible sunbeams or moonbeams
- Fixed day/night sky gradients, strong directional sunlight or moonlight, baked celestial shadows
- Permanent weather particles that should move (falling snow, rain, sparks, embers, drifting leaves)
- Monsters, towers, weapons, attack animations, hazard telegraphs, HUD, text, logos, markers

The sky must be a **time-neutral atmosphere** with sky color, clouds, haze or distant mountains allowed. Crystals and ice may be naturally bright, but should not fake a moonlit or sunlit scene. Ambient snow must be provided by the environment renderer, not painted as fixed sky specks.

## 2. Shared composition and ground geometry
- Game world canvas: **960 × 480** logical units; identical for all maps.
- Preferred artwork ratio: **16:9** (for example 1600 × 900 or 1920 × 1080). Keep a safe center crop for cover rendering.
- **Single uninterrupted, horizontal battle floor.** No holes, stairs, cliffs crossing the combat zone, multi-height platforms or terrain obstacles.
- Combat center kept open. Background hills, arches, trees, ore towers and rocks belong behind the units.
- Ground battle positions from the existing game: y = **343, 363, 385, 407, 429**; keep sufficient visible ground texture behind every row.
- Tower centers: ally x = **80**, enemy x = **880**, near-side approaches x = **170** and **790**.
- Unit spawn x: **198** (ally), **762** (enemy). Avoid a tall foreground prop occluding either spawn area.
- Left and right scenery frame the image without extending into the primary fight area.
- Keep combat silhouettes readable at small screen sizes; avoid intense high-contrast center decorations.
- Background pixels are decorative; the Battle Engine owns real collision, lane positions and targeting.

## 3. Visual layers — composited at runtime
1. **Static map background:** sky, distant horizon, midground silhouettes, side scenery and flat ground.
2. **Time-of-day atmosphere:** Day/Night Engine will tint the existing base map; no baked celestial objects.
3. **Ambient environment:** Elements Engine renders floating snow, leaves, embers, dust, metallic motes etc.
4. **Battle:** towers, monsters, attack projectiles and HP/status indicators.
5. **Triggered environmental hazards:** frost pulses, fire bursts, earth tremors, roots and metal shards, drawn only when a hazard event occurs.
6. **HUD:** buttons, cooldowns, coins, match progress and pause.

The game may choose an implementation-specific draw order for effects in front of or behind sprites, but **ownership** is always separate. Ambient particles never cause combat damage by themselves.

## 4. Time-of-day design (future engine)
- All elemental maps use **one master artwork per landscape**; do not draw separate Day and Night copies to simulate basic lighting.
- Day/Night control belongs to a future `modules/day-night/` engine. It will manage the current phase, sky tint, brightness, contrast, distant fog, lighting transitions and optionally dynamic stars or celestial objects.
- Sky objects, if ever added, are **optional runtime assets controlled by Day/Night** and must not appear in the static backgrounds. We can also choose to have no celestial objects at all.
- The future Light/Dark elements will read the Day/Night phase through a documented interface, not by examining background pixels or changing base map files.
- **Day/Night is independent of the map element.** Fire/Water/Earth/Nature/Metal maps can all run in Day or Night.
- During this first stage, `time_of_day.mode = "neutral_until_engine_ready"` is metadata only and does **not** imply working Day/Night gameplay.

## 5. Standard element maps and reuse
| Core element | First map | Environmental style | Hazard |
| --- | --- | --- | --- |
| Fire | Ember Wasteland | Scorched volcanic floor, embers | Burn (planned) |
| Water | Frostveil Valley — Ice theme | Frozen level floor, blue cliffs, frost | Chill / short Freeze (implemented) |
| Earth | Stonefall Canyon | Rocky level floor, dust | Tremor (planned) |
| Nature | Whisper Meadow | Grassy level floor, leaves | Roots (planned) |
| Metal | Silvercrest Valley | Ore/crystal level floor, metallic glimmers | Shards (planned) |
| Poison | Toxic Marsh | Swamp | **Disabled/on hold** |

Water is the **core element**. Ice is the environment/attack specialization and is **not** a separate sixth core element.

## 6. Authoritative module and map data ownership
- The Water/Ice map is configured exclusively in `data/maps/water-ice.json`. `stage_affinities.json` contains only the source pointer for this map.
- `modules/elements/environment.js` owns environmental animations, map-sourced hazard timers, element immunity and status durations.
- The Battle Engine owns monster damage and normal movement; it consumes the documented environment API rather than copying environmental rules.
- No duplicate per-map JavaScript engines, map-effects helpers, override layers or legacy presets.
- Disabled maps must never appear in the random map pool.
- Time-of-day metadata is reserved for `modules/day-night/` and must not be interpreted as an implemented feature.

## 7. Frostveil Valley Water/Ice rules
- Background: **neutral-sky Ice battlefield** in `assets/backgrounds/frostveil-valley.png`, uploaded and used by the live map configuration.
- Ambient: snow (continuous) and periodic icy wind, configurable independently of hazards.
- Water units—including Ice-specialized Water monsters—receive affinity buffs and ignore **map-sourced** Chill and Freeze.
- Nonmatching monsters on either side may receive -20% movement speed for 3 seconds and 20% chance of 0.6-second Freeze; first hazard about 10 seconds into battle, then every 15–22 seconds.
- Newly deployed monsters get 2 seconds of hazard protection.
- This map does not apply environmental HP damage. Monster-inflicted Freeze still follows the monster/status rules, not automatic environmental immunity.

## 8. Asset quality checklist
- [ ] Same dimensions/aspect ratio and combat floor composition as the master
- [ ] Open center and consistent ground horizon
- [ ] Two towers and spawn areas have clear space
- [ ] No sun, moon, stars or baked time-of-day lighting
- [ ] No permanent moving weather particles or hazard visuals
- [ ] No monsters, bases, projectiles, UI, labels or text
- [ ] Appropriate terrain texture and element visual identity
- [ ] Readable in Day, Night and narrow landscape cover crops
- [ ] Background file exists in the repository **before** its JSON path is switched

## 9. Implementation status
The **rules** are locked for future artwork and engines. The Water/Ice hazard/ambient engine exists; no Day/Night simulation or Light/Dark combat bonuses have been implemented yet. The updated Frostveil Valley artwork is uploaded. Only Frostveil Valley is currently registered for battle. `assets/backgrounds/whisper-meadow.png` is retained exclusively as the main-menu background.
