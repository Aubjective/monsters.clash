# Day/Night engine — reserved module

**Status:** Design only, not implemented or imported.

This will be the single authoritative engine for time-of-day phase, neutral-sky tint, scene brightness, contrast, ambient color, optional dynamic sky objects, and smooth phase transitions.

It must not draw the sun, moon or stars into base map artwork. Any celestial visuals, if later desired, must be optional runtime assets owned by this module.

It will expose documented phase/lighting state for future Light/Dark gameplay while staying independent of the core elemental map (Fire, Water, Earth, Nature, Metal). Existing combat and environment effects continue to work with this module disabled.

No duplicate visual filters, runtime override patches or day/night logic in index.html. See `docs/map_rules.md` for the locked map layout and art rules.
