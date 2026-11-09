# AGENTS.md — Hillan peli

Start here. This file is the top of a small hierarchy:

| Read when you touch… | File |
|---|---|
| anything (overview, rules, workflows) | this file |
| levels, level design, `levels.js` | [docs/AGENTS.levels.md](docs/AGENTS.levels.md) |
| `tools/` (checker, solver, build) | [tools/AGENTS.md](tools/AGENTS.md) |

## What this is

A top-down stealth game for a young child (**just learning to read**) who plays it on an **Android phone in landscape**. She drew level 1 on paper (`docs/hillan-suunnitelma.jpg`). Her parent asks for features; the child gives feedback. Plain HTML5 canvas + vanilla JS, no dependencies, no build step. It's a PWA that works offline. Deployed at https://hillan-peli.netlify.app.

## Non-negotiable product rules

1. **Phone first.** Test at 740×360 landscape (and check that 375×812 portrait doesn't break). Touch targets ≥ 44 px, nothing hidden under notches (`env(safe-area-inset-*)`), no page scroll during play.
2. **Player-facing text is Finnish, SHORT and UPPERCASE.** It is read by a beginner reader: 1–2 words for names and ≤ 6–8 words for sentences, with emojis as hints. CSS already uppercases everything, but write it in uppercase anyway.
3. **Every level must be beatable.** Run both checks in [tools/AGENTS.md](tools/AGENTS.md) after any level or engine change. A player once found an impossible laser spot; don't repeat it.
4. **Fair, not punishing.** The start is safe, nothing is pixel-perfect, ice always stops by itself, and coins and stealth are optional extra stars.
5. **Never break saves.** Save data is in localStorage and only ever gets extended (new fields with defaults via `Object.assign`).

## File map

```
index.html      Screens (overlays) + CSS. Loads levels.js → game.js → editor.js (classic scripts, shared globals).
levels.js       const LEVELS = [...] — all 20 levels. Format documented in its header and in docs/AGENTS.levels.md.
game.js         Engine + UI logic (see sections below).
editor.js       Level editor (IIFE). Exposes window.openEditor(); calls game globals show(), playCustom(), toast(), beep().
sw.js           Service worker: network-first (cache: "no-cache"), falls back to cache offline. BUMP `CACHE` VERSION ON EVERY RELEASE.
manifest.webmanifest, icon-*.png   PWA install.
netlify.toml    Build = sh tools/build.sh → dist/ (only game files are published). Headers: no-cache, manifest MIME.
tools/          Dev-only: level checker, timed solver, build script. Never published.
docs/           Original paper design photo + level design guide.
```

## game.js map (search for the `// ----------` section headers)

- **Tallennus** (save): `save` object in localStorage key `hillan-peli-save-v2`. Fields: `levels{i:{done,coins,stealth,best}}`, `color`, `hat`, `wallet`, `owned[]`, `pet`, `trail`, `bag` (bought stones), `sound`, `medals[]`, `stats{}`. Custom levels are stored separately in `hillan-peli-omat` (editor).
- **Asut / Kauppa / Mitalit**: data tables `COLORS`, `HATS` (unlocked by total stars), `PETS`, `TRAILS` (bought with coins), `MEDALS` with `medal(id)` and `stat(key)`. Custom-drawn pets (`draw:` key) are rendered by `drawDog()`.
- **Kenttä** (level): `loadLevel(i)` parses map chars into `grid` (VOID/FLOOR/WALL/DOOR/GATE) + item lists. `i < 0` means a custom level (`customLevel`). `reset()` rebuilds the player and guards.
- **Vartijat** (guards): `makeGuard()` sets `range/half/speed` (dog and camera variants). `updateGuard()` handles scan, patrol and investigate/return (BFS `findPath` toward stone noises). `guardSees()` returns 2 on touch, 1 on seen, 0 otherwise.
- **Päivitys** (update): movement (ice = inertia), alarm (0.35 s of being seen = caught), lasers (`LASER_ON` = 2.2 s phases), pickups, levers (`toggleGates`), teleports, doors, goal → `win()`.
- **Käyttöliittymä**: `show(id)` switches overlays (add new screens to `SCREENS` and to the no-HUD list). Flow: menu → levels → intro → play → win/caught → (shop) → next.
- **Piirto** (draw): marker-on-paper style. Stationary guards are red, walking guards purple with feet and a dashed route, dogs 🐕, cameras blue cones. `drawDark()` handles dark levels.

## Workflows

- **Run locally:** `python -m http.server 5179` in the repo root, then open http://localhost:5179. `.claude/launch.json` has a `peli` config for the desktop preview.
- **Test in a browser tab you open yourself.** The user often plays in the existing preview tab, so don't reload it. The engine globals are scriptable, e.g. `openLevel(4); startPlay();`, or set `player.x/y` and call `update(0.016)`. Screenshots lag one frame, so wait ~1 s first.
- **Deploy:** bump `CACHE` in `sw.js`, then deploy via Netlify (site `hillan-peli`, id `56633404-6b95-484b-a848-06b118254ca1`). With the Netlify MCP, `deploy-site` gives an `npx @netlify/mcp …` command. Run it from the repo root with `npm_config_cache` pointed at a writable temp dir (the global npm cache on this machine is not writable).
- **Windows quirk:** a local hook blocks `rm` on relative paths, so use absolute paths for deletions.

## Style

Code comments are short and in Finnish, matching the existing code. Keep the zero-dependency, single-folder setup. Prefer extending the data tables (`PETS`, `MEDALS`, `LEVELS`, …) over special-casing.
