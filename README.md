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
    whisper-meadow.png
    ember-wasteland.png
    frost-plain.png
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

## Music and sound effects

- `assets/bgms/main-menu-bgm.mp3`: uploaded menu music.
- `assets/bgms/battle-bgm-001.mp3`: uploaded battle music.
- `audio.json`: volume, looping, and named SFX event presets. The existing tracks are referenced directly; no duplicates were created.
- `assets/sfx/`: upload reusable sound clips when available, and set each matching preset's `file` field in `audio.json`. Until then, lightweight synthesized cues cover summon, attack, impact, skill, shield, stun, freeze, tower hit, victory and defeat. Stun and freeze cues are prepared, but their gameplay status effects have not yet been implemented.
- Music and SFX can be independently disabled through the `+` menu. Music starts following user interaction, respecting browser autoplay policies.
- The Pet Slime collection from BENNESSism/NoanLi is CC BY 4.0: https://github.com/bennessism/musicstation/blob/main/music/pet-slime-bgm/music_license.txt

## Cooldown-only deployment rules

- `battle_rules.json` sets the maximum 10 active monsters per side, rarity / summon-tier caps, and enemy summon interval.
- Each monster's `deployment.cooldown_seconds` and `deployment.max_active_copies` provide individual balance. Its effective cap is the smaller of the tier cap and individual cap.
- No mana resource is consumed. Deploy buttons show cooldown or active count.
- Initial balance: Mossguard 8s cooldown / 5 copies; Cinderhorn 6s cooldown / 5 copies. Team selection still uses two monster types in the current UI.
- Monsters and enemy AI must obey total capacity, per-type caps and cooldown. Dead units free their slots.

## Battlefield backgrounds and locked map rules

- The only **active battle map** is **Frostveil Valley**, Water element / Ice theme. Its image is `assets/backgrounds/frostveil-valley.png`, and `data/maps/water-ice.json` owns its environment and hazard settings.
- `stage_affinities.json` registers Frostveil Valley as playable and Tideglass Bay as **disabled**, pending its PNG upload. Deleted legacy battle maps remain unregistered.
- Preserve `assets/backgrounds/whisper-meadow.png` **only as the main-menu/lobby background**. It is not an active battle map.
- [Map layout rules](docs/map_rules.md) lock shared battlefield geometry and no baked sun, moon, stars or time-of-day lighting.
- `modules/elements/environment.js` is the single environmental effects engine; it renders Ice snowfall/Chill/Freeze and Water sea spray/Coastal Current, with parameters read from each map's own JSON.
- **Tideglass Bay** (Water element / coastal environment) is prepared in `data/maps/tideglass-bay.json`, with ocean spray and Coastal Current slowdown. It remains disabled until `assets/backgrounds/tideglass-bay.png` is uploaded. Poison and other future elements remain on hold.
- Ice is a Water specialization, not a sixth core element.

## Random battlefields

- Battle selection chooses only registered, enabled maps. With one map uploaded, all battles use Frostveil Valley.
- Matching-element bonuses and environmental hazards apply to both player and enemy units.
- No old deleted map backgrounds are restored as placeholders.

## Team carrying slots and coins (prototype economy)

- Main menu shows PLAY and MY TEAM; the Bestiary and Settings remain accessible as compact header icons.
- Players start with **8 team carrying slots**, independent of the limit of 10 simultaneously active creatures on each side of a battlefield.
- Carrying slots 9–12 can be bought for **250, 500, 900, and 1,400 coins**, respectively. Values live in `progression.json`.
- Winning earns **100 coins**, plus **100** if finished within 90 seconds, **60** within 180 seconds, or **30** within 300 seconds. A slower win still earns 100; defeats earn zero.
- Results award coins once per concluded battle. Restart begins a new battle with a new random stage. Coins, unlocked carrying slots, and saved team choices use the existing browser-local profile (`monsters-clash-profile-v1`), so no cross-device synchronization exists yet.
- Only owned, battle-ready monsters can be selected. The roster can grow without adding hardcoded buttons for each monster.
- Coin rewards and slot prices are initial test-balancing values, not a final economic model.

## Bestiary profiles and cross-platform navigation

- Every Bestiary entry opens an in-game profile. Encountered monsters show their artwork (if available), description, element, rarity, combat role, statistics and skill information from their own `monsters/<id>.json`.
- Undiscovered monsters remain greyed and show an unknown profile without revealing identifying details.
- Profiles use the existing in-game screen navigation. On the standalone GitHub Pages site, optional deep links use `#/bestiary/m001` (or the corresponding monster ID). The game's core screens do **not** require URL routing.
- Embedded hosts (including Telegram launch URLs using hash parameters and iframe-based platforms) are not dependent on or rewritten by the optional hash route. Native host back buttons and platform save APIs will require platform-specific integration during packaging.

## Continuous battle runs

- PLAY starts a run at Battle 1 with the currently equipped team. Winning awards that battle's normal time-based coins immediately and shows NEXT BATTLE and MAIN MENU.
- NEXT BATTLE preserves the run's battle number, wins and cumulative rewards while resetting both castles, active monsters, deployment cooldowns and the combat field. The next battlefield is randomly chosen from `stage_affinities.json`, excluding the map just completed when more than one map exists.
- Enemy castle HP and enemy monster HP, basic damage and dash damage increase by **5% per battle**. The ally castle and allied monster statistics do not increase.
- On defeat the run ends and displays total victories, cumulative coins and elapsed battle time, with RESTART RUN and MAIN MENU actions.
- Restart Run (including the in-battle restart buttons) starts back at Battle 1, not the next stage. Leaving the battlefield ends the active run. Coins awarded for previous wins remain in the browser-local wallet.
- `assets/ui/coin.svg` is the standard game currency icon shown in the wallet, slot purchase prices and result screen, replacing unsupported emoji glyphs.
- A victory award is settled at most once per concluded battle. Run state is in memory only for now; closing or reloading the page does not resume an unfinished run.
