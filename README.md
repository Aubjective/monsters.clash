# Monsters Clash — Elemental Battle Sandbox

New clean prototype for `Aubjective/monsters.clash`.

## Current build
- Ten editable individual monster JSONs in `monsters/`
- `elements.json`, `stage_affinities.json`, and `roster.json`
- First two original test monsters: Mossguard (nature tank) and Cinderhorn (fire bruiser)
- Transparent front/side SVG assets for these two monsters
- Single-lane browser test with allied and enemy bases, mana deployment, cooldown, auto-advance, basic attacks, skill triggers and win/loss
- Stage bonuses apply to both teams, not just the player

The SVG files are the editable originals for the prepared test art. The PNG exports were not transferred in this repository commit. Sprite art remains provisional.

The first two monsters can be deployed in the battle sandbox. The other eight are roster data awaiting artwork and integration. Values are provisional.

## Asset rules
One unit per asset, transparent background, no ground shadow, glow, scenery or particles. Use front art for cards, right-facing side art in battle; enemies can be flipped. Locomotion, attack, hit and disappearance should be configured per entity, but executed through a shared unit engine.
