# Elements module

**Status:** Active environmental renderer + Water/Ice hazard integration.

This is the authoritative engine for environment particles, wind, map-source status timers, immunity checks and future environmental hazards: `modules/elements/environment.js`.

The battle loop calls `configure(map)` at stage selection, `update(dt, units, dmg)` once per simulation tick, `render(ctx, layer)` for weather and `renderStatus(ctx, unit)` for chill/freeze visuals. The module also provides `matchesElement`, `movementMultiplier` and `canAct` so the battle engine consumes status without duplicating environmental rules.

Water/Ice parameters are owned by `data/maps/water-ice.json`, referenced in `stage_affinities.json`. Other maps retain their ambient settings directly in the stage registry pending their own JSON migration. No duplicate `environment_effects.json` is used.

- Water affinity includes legacy Ice monster types, for matching bonuses and map-hazard immunity.
- Only map-generated chill/freeze is exempted for Water units. Monster attacks can later use different resistance rules.
- Environmental hazards are symmetrical for both teams, with 2 seconds of newly summoned-unit protection.
- Toggle entire environment using `setEnabled(false)` or gameplay hazards only using `setHazardsEnabled(false)` in development tests.
- Poison/Toxic Marsh remains disabled in the stage registry.

Other elemental hazards are not active; the engine's generic instant damage route is reserved for later balancing.
