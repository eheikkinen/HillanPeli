# Level design guide

Back to the overview: [../AGENTS.md](../AGENTS.md) · Validation tools: [../tools/AGENTS.md](../tools/AGENTS.md)

Levels live in `levels.js` as `const LEVELS = [ {...}, ... ]`, played in order. Level 1 "HILLAN KARTTA" is the child's own paper design (`hillan-suunnitelma.jpg`). **Never change its layout.**

## Level object

```js
{
  name: "VIPU",                          // 1–2 UPPERCASE Finnish words
  intro: "UUSI: 🎚️ VIPU AVAA PORTIN.",   // ≤ 6–8 UPPERCASE words, emojis as hints; "UUSI:" when introducing a mechanic
  par: 60,                               // target seconds (time bonus = (par - time) * 3)
  dark: true,                            // optional: only ~3.4 tiles around the player visible
  map: [ "#####", "#@.G#", "#####" ],    // rows of chars, see below
  guards:  [ {x, y, scan:[0, 90]}, {patrol:[[x1,y1],[x2,y2]], dog:true} ],
  cameras: [ {x, y, scan:[-45, 45]} ],
}
```

Angles are in degrees: 0 is right, 90 down, 180 left, -90 up. Patrols walk straight segments and loop from the last point back to the first, so every segment, including last→first, must be axis-aligned and clear.

## Map chars

| Char | Meaning | Char | Meaning |
|---|---|---|---|
| `#` | wall | ` ` | void (outside) |
| `.` | floor | `@` / `G` | start / goal (exactly one each) |
| `o` | coin | `h` | bush (hidden from vision; touching a guard still catches you) |
| `s` | throwable stone (lures non-camera guards within 7.5 tiles) | `p` | potion (6 s invisible) |
| `y b r` | key (yellow/blue/red) | `Y B R` | door of that colour |
| `!` / `:` | laser, phase A / B (2.2 s each) | `i` | ice (inertia, always stops by itself) |
| `v` | lever (toggles all gates) | `\|` | gate (closed at start) |
| `1` / `2` | teleporter pair (exactly two each) | | |

## Numbers that matter

| Thing | Value |
|---|---|
| Player speed | 3.4 tiles/s (radius 0.3) |
| Guard vision | range 4.6, half-angle 32°; walks at 1.6 tiles/s |
| Dog vision | range 3.4, half-angle 45°; walks at 2.8 tiles/s |
| Camera vision | range 5.5, half-angle 26°; doesn't hear stones |
| Getting caught | seen for 0.35 s, or touching a guard |

## Fairness rules

- The start is safe: no guard within ~5 tiles, and nothing sees `@` in the first seconds.
- Every mandatory 1-wide passage must be passable by timing, a bush, a stone or a potion. A cone must never cover it permanently.
- Lasers belong in 1-wide gaps. **Lasers of different phase must be at least 2 floor tiles apart**, so the player can wait between them.
- Use 5–10 coins per level, all reachable. Collecting all of them can be an optional extra risk.
- Introduce one new mechanic per level, then combine them. Difficulty rises gently.
- The level should fit a landscape phone reasonably (about 24–44 × 12–24 tiles).

## Before you're done

1. `node tools/check-levels.js` → all OK.
2. Run the browser solver → every level "✔", with no unreachable coins or keys.
3. Look at the new level at 740×360.
