# Monsters Clash — Elemental Tower Defence

Continuous escalating rounds; protect the player tower, defeat a finite enemy wave with a final elite or boss, then advance to another map automatically. Each kill earns temporary Battle Coins for in-run upgrades. Each cleared round awards both Battle Coins and persistent Gold for tower/monster/team-slot unlocks. Battle Coins reset on a new run; existing saved coins remain Gold. Round progression automatically scales allied monster HP and attack. Tower shield replenishes and tower HP resets on each new map; purchased run upgrades persist until restart or defeat. All six maps and environmental effects remain active. Day/Night alternates every 30 seconds. See `progression.json`, `towers.json`, `battle_rules.json`, `roster.json` and `data/maps/` for authoritative values. Only artwork-ready monsters spawn or can be unlocked. Existing profile coins and owned team are preserved. No cross-device saves.

Support drone artwork path: `assets/drones/d001/sentry-drone-sheet.png` (four horizontal HP-stage frames, pending asset; only healthy frame used until drone damage is implemented). Tower range caps at 425 logical units. Elites have 150% of normal round HP and attack and 200% sprite size.

Tower upgrades are owned by `modules/towers/upgrades.js`. The shared shield uses orbiting reflective plates and protects the tower only. Zero tower HP ends the run as breached, retaining the critical tower sprite. Elite/boss self-effect visuals use the same scale as their monster sprites.

The top battle HUD shows Battle Coins, permanent Gold and Gold earned this run. Kill rewards float above defeated enemies. Rank palettes reuse existing sprite sheets; allied HP bars are blue, enemy HP bars red, elites have gold frames and bosses purple frames.

Main Menu → Upgrades provides Towers, Shields and Drones, with Gold unlocks and a persisted equipped loadout. `towers.json` owns equipment definitions; `progression.json` owns round and economy rules. My Team contains monster collection and carrying slots only.

Bestiary has independent Monsters, Elites and Bosses tabs and saved rank discovery records. `roster.json` includes `special_boss_ids` for future standalone boss definitions under `monsters/`; these appear in the Boss tab, not the player team. Special boss battle spawning is not enabled yet. Existing ordinary discoveries are preserved; ranked discoveries begin independently.
