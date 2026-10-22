# Monsters Clash

A browser-based, side-view monster defense prototype using the existing [Isekaimania](https://github.com/Aubjective/isekaimania) monster database.

## Version 0.1

- Hero defense, increasing waves, enemy movement and automatic combat.
- Six starter monster deployment cards, energy regeneration and a 12-unit cap.
- Hero AOE burst, elemental battlefield selector, health bars and combat log.
- Fetches monsters, active skills and passive skills from the Isekaimania GitHub Pages JSON manifests.
- Loads monster images from the original Isekaimania `monstersprite/` folder; no duplicate monster data or sprite assets.

## Running

Open `index.html` through a static web server or GitHub Pages. The browser must have network access to `https://aubjective.github.io/isekaimania/`.

## Prototype limitations

Combat conversion rules are provisional. The engine currently implements basic physical damage, skill damage, healing and Root; other structured effects (buffs, shields, status effects, passive bonuses, etc.) are reserved for the next iteration. Skill selection is simplified, and deployment, range, elemental bonuses and derived stats need balancing. No persistent saves or authentication.

## Hosting

Enable GitHub Pages for the repository, deploying the default branch from the repository root. The expected URL is `https://aubjective.github.io/monsters.clash/` after Pages has been enabled and published.
