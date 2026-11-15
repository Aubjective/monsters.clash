# Monsters

Monster IDs (`m001`, `m002`, etc.) are stable and each has an individual JSON in `/monsters/`. Store artwork under `/assets/monsters/<ID>/` using the monster's full name, such as `m001/mossguard-sheet.png` and `m002/cinderhorn-sheet.png`.

The **single source of truth** for each sheet path is the corresponding monster JSON's `art.sheet`. Set `art.status` to `ready` only once its sheet is uploaded. The collection is discovered through `/roster.json` (`ids`) rather than a hardcoded list in game code.

Sprite sheets: transparent PNG, 4 columns x 4 rows. Row 1 movement, row 2 idle/hit/recover, row 3 basic attack, row 4 special skill. Effects belong in `/assets/effects/`.

To add a monster: add its JSON in `/monsters/`, add its ID to `/roster.json`, and upload its image. No changes in the battle engine or extra helper layers needed.
