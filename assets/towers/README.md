# Towers — compact sprite standards

Each tower has stable ID folder `t001`, `t002`, etc., and is independent of team ownership.

## Team flags
`assets/flags/blue-flag.gif` and `assets/flags/red-flag.gif` are animated, small, and drawn **behind** every tower. Artwork should not contain team-specific flags.

## Compact tower sheet: 4 columns × 2 rows
- **Row 1 / frames 0–3:** intact, slightly damaged, heavily damaged, destroyed.
- **Row 2 / frames 4–7:** basic attack idle, charging, release, recovery.
- No people, archers, monsters, or other creatures in tower artwork; the shooting deck/window emits arrows, while the electric crystal emits electricity.
- Both rows should retain identical tower position, dimensions, and perspective, with transparent pixels outside the tower/effects.

## Current art
- Archer Tower `t001`: `assets/towers/t001/archer-tower-sheet.png`
- Electric Tower `t002`: `assets/towers/t002/electric-tower-sheet.png`

The two newly designed PNG sheets must be uploaded to those exact paths to go live. Until they are uploaded, the renderer keeps using the original `tower-blue.png` and `tower-red.png` 4×1 sheets and continues to work. If the new sheet loads, it automatically switches to 4×2 framing.

## Combat
All towers share the `Fortified Foundation` passive from `battle_rules.json`: 10% less incoming direct monster damage.
The tower's `basic_attack` in `towers.json` specifies attack type, range, damage, and cooldown. Tower basic attacks operate automatically for both sides with separate arrow/electric VFX. Unique active abilities and persistent upgrades will be added separately.

A tower is registered in `towers.json`; never hardcode an individual tower ID or filename into the renderer.
