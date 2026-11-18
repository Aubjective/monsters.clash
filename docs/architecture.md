# Monsters Clash — Modular Engine Architecture

Each system has one authoritative module. No override layers, duplicate engines or temporary compatibility logic that becomes permanent. Preserve the working `index.html` while migrating one feature at a time.

## Modules
battle, monsters, elements, collection, leveling, evolution, team, deployment, towers, disasters, guardians, economy, progression, save, animation, day-night (reserved).

## Current engine status
- `modules/elements/environment.js`: **active**, directly loaded by `index.html`. Owns weather particles and environmental hazard statuses.
- `data/maps/water-ice.json`: authoritative config for Frostveil Valley, referenced by `stage_affinities.json`.
- `docs/map_rules.md`: locked standard battlefield geometry and visual layout.
- `stage_affinities.json`: active map registry; currently references only Frostveil Valley. Other maps are added individually when their assets and definitions are ready.
- Remaining modules: reserved folders; their real engines have not been extracted from the existing game yet.

## Reserved day/night responsibilities
- `modules/day-night/` is reserved for later time-of-day phase and ambient lighting. It must not change monster combat unless enabled and connected by the elemental engine.
- Static elemental map backgrounds have no sun, moon, stars, or fixed time-of-day effects. See `docs/map_rules.md`.

## Migration rules
1. Commit existing working baseline.
2. Move one authoritative engine into its own module, not an override layer.
3. Connect its documented interface to battle without duplicating feature logic.
4. Test feature on/off, saving compatibility and regressions.
5. Delete superseded code/config only after replacement works.
6. Do not treat future artwork as a requirement for logic to function.

## In-game text and terminology
- Use clear **Title Case** for UI headings, buttons, menus, status labels and stat labels; reserve proper names for entities such as Frostveil Valley and Monsters Clash. Use normal sentence case for longer descriptions and instructional sentences.
- Elements use their proper display name: **Water Element**, **Ice Environment**, **Water Monsters**, **Water Monster Bonuses**, and **Hazard Immunity: Water Monsters**. A map's elemental name and hazard values always come from the map JSON, not copied constants.
- Core labels: **Main Menu**, **My Team**, **Bestiary**, **Settings**, **Battle Menu**, **Next Battle**, **Restart Run**, **Sound Effects**, **Battlefield**, **Allied Monsters**, **Team Slots**.
- Battle results: **Victory**, **Defeat**, **Coins Earned**, **Battle**, **Wins**, **Time**. Cooldowns use the unit `s`; stat percentages are shown as `+10%` or `−20%`, with a clear affected stat.
- In map information, distinguish matching-element **bonuses** from environmental **hazards**, show whom hazards affect, and explicitly identify immunity. Both teams follow the same environment rules.
- Keep game behavior, IDs, persistence keys and JSON schema separate from display copy. Update presentation wording at the existing owning view; do not add a parallel localization/helper layer solely to override text.
