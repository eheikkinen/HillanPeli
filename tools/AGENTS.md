# tools/ — development tools (never published)

Back to the overview: [../AGENTS.md](../AGENTS.md)

## check-levels.js (static checker, Node)

```bash
node tools/check-levels.js
```

Exits 1 on any error. It checks:

- Known map chars only. Exactly one `@` and one `G`. Floor never touches the map edge or a void space.
- Reachability with key, lever/gate and teleport state, for the goal, every coin and every key.
- Guards and cameras stand on floor. Patrol segments are straight, unobstructed, and include the last→first segment.
- Teleporters come in exact pairs. Gates have a lever.
- **Lasers of different phase (`!` next to `:`, including diagonally) are an error**, because one of them is always on.
- Trap detection: no reachable state from which the goal becomes unreachable.

It does **not** know about guard vision or timing. Use the solver for that.

## solver.js (timed solver, runs in the browser)

It plays each level as a perfect player over time. It steps the real engine guards (`updateGuard`), uses the real vision maths, blinks lasers, and toggles gates with levers. It is conservative: no stones, no potion and zero tolerance for being seen (the game allows 0.35 s), with gates treated as open for vision. Ice is treated as normal floor.

Run it on a game page opened in **your own tab** (localhost or production):

```js
eval(await fetch('tools/solver.js?' + Date.now()).then(r => r.text()));
solveAll();   // "N. NAME: ✔ maali 12.3 s" or "❌ EI RATKEA", plus unreachable coins/keys
```

The browser can serve a stale `levels.js`. To force fresh levels before solving:

```js
const src = await fetch('levels.js?' + Date.now()).then(r => r.text());
eval(src.replace('const LEVELS', 'window.LEVELS2')); LEVELS.length = 0; LEVELS.push(...window.LEVELS2);
```

`tools/` is not deployed, so on production paste the file contents instead of fetching them.

**Both the checker and the solver must pass for all levels before shipping.**

## build.sh

Copies the published game files into `dist/`. Netlify runs it as the build command. If you add a new runtime file, add it here **and** to `FILES` in `sw.js`.
