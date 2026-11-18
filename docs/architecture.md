# Monsters Clash — Modular Engine Architecture

Each system has one authoritative module. No override layers, duplicate engines or temporary compatibility logic that becomes permanent. Preserve the working `index.html` while migrating one feature at a time.

## Modules
battle, monsters, elements, collection, leveling, evolution, team, deployment, towers, disasters, guardians, economy, progression, save, animation.

## Current engine status
- `modules/elements/environment.js`: **active**, directly loaded by `index.html`. Owns weather particles and environmental hazard statuses.
- `data/maps/water-ice.json`: authoritative config for Frost Plain, referenced by `stage_affinities.json`.
- `docs/map_rules.md`: locked standard battlefield geometry and visual layout.
- `stage_affinities.json`: registered stages; disabled maps excluded at runtime; other maps retain their ambient values inline until migrated.
- Remaining modules: reserved folders; their real engines have not been extracted from the existing game yet.

## Migration rules
1. Commit existing working baseline.
2. Move one authoritative engine into its own module, not an override layer.
3. Connect its documented interface to battle without duplicating feature logic.
4. Test feature on/off, saving compatibility and regressions.
5. Delete superseded code/config only after replacement works.
6. Do not treat future artwork as a requirement for logic to function.
