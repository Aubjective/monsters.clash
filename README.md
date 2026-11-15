# Monsters Clash — Elemental Battle Sandbox

Browser-based elemental monster combat prototype with a full-screen landscape lobby, monster collection, team setup, and automated battles.

## Game data (scalable asset registration)

- `roster.json`: ordered list of monster IDs and default deck. Adding monsters does **not** require changing a hardcoded monster count in `index.html`.
- `monsters/<id>.json`: each monster's stats, skills, animation rules, and **actual sprite path** in `art.sheet`. Set `art.status` to `ready` once its image is uploaded.
- `towers.json`: tower IDs, descriptive names, transparent sprite filenames, HP, and future abilities. `default_towers` identifies the blue player tower and red enemy tower for the current test.
- `stage_affinities.json`: elemental battlefield settings.

## Asset folders

```text
assets/
  backgrounds/
    grass-land.png
  monsters/
    m001/mossguard-sheet.png
    m002/cinderhorn-sheet.png
  towers/
    t001/tower-blue.png    # upload when ready
    t002/tower-red.png     # upload when ready
  effects/
    status/
    combat/
    projectiles/
```

The monster sprites that are already uploaded are preserved. Tower filenames are defined in `towers.json`; if the PNG is not present, the prototype draws its fallback rectangular base.

## Sprite standards

- Monsters: 4 columns x 4 rows, transparent PNG, facing right. Row 1: movement; row 2: idle/hit/recovery; row 3: basic attack; row 4: skill.
- Towers: 4 columns x 1 row, transparent PNG. 70–100% HP = frame 0; 30% to below 70% = frame 1; above 0% to below 30% = frame 2; 0% HP = frame 3 (destroyed).
- Status and combat effects belong to shared `assets/effects/` assets rather than being baked into monster poses.

## Add a monster

1. Add `monsters/m###.json` with a unique ID and correct `art.sheet` path.
2. Upload the named sprite sheet to `assets/monsters/m###/`.
3. Add the ID to `roster.json`. Set `art.status` to `ready` when battle-ready.

## Add a tower

1. Upload its four-frame image to `assets/towers/t###/` using a descriptive filename.
2. Add its metadata and sheet path to `towers.json`; change `default_towers` to test it as an active base.
3. Future tower abilities can be recorded in the `abilities` field without renaming assets.

Current game mechanics remain experimental, and future tower abilities still require engine implementation.
