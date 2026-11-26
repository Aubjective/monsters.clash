# Day/Night engine

Implemented in `engine.js`. Call `configure(map)` on battle reset, `update(dt)` on simulation steps, and `render(ctx,x,y,w,h)` after drawing the background. `getPhase()`, `getState()` and `matchesAffinity(monster)` expose the live phase for future Light/Dark combat bonuses; no bonuses are applied yet. `updateLabel(node)` shows phase and seconds remaining. Day and Night each last 30 seconds, transitioning visually over 5 seconds. Indoor maps use fixed lighting but share the clock. No separate map images or baked celestial visuals.
