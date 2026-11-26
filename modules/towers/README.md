# Tower upgrades module

`upgrades.js` is the authoritative shared in-run upgrade engine: prices, purchase validation, attack stat scaling, shield capacity, damage absorption, orbit timing, hit flash and break effects. The main battle engine calls its public interface; no parallel shield implementation. The shield protects the tower only. The tower remains standing in its critical sprite at zero HP and the run ends as breached. Permanent tower selection and unlocks remain in the existing game UI.
