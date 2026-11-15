# Towers

Each tower has a stable ID folder (`t001`, `t002`, etc.) and a descriptive filename (`tower-blue.png`, `tower-red.png`).

Register a new tower in `/towers.json` with its `id`, display `name`, exact `sheet` path, `max_hp` and optional `abilities`. The battle engine reads that registry; do not add a hardcoded file path to `index.html`.

Tower artwork: transparent PNG, one row of 4 equal cells. Frame 0: HP >=70%; frame 1: HP <70% and >=30%; frame 2: HP <30% and >0%; frame 3: HP 0% (destroyed). Both towers may be assigned to either team later.

The image paths in the registry are filenames to upload; missing files retain the game fallback tower visuals.
