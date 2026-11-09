// Kenttäeditori – Hillan peli
// Käyttää game.js:n globaaleja: show, state, playCustom, goMenu, beep, toast, $, KEY_COLORS
(function () {
  "use strict";
  const STORE = "hillan-peli-omat";
  const SIZES = [
    { id: "s", label: "PIENI", w: 16, h: 10 },
    { id: "m", label: "KESKI", w: 22, h: 13 },
    { id: "l", label: "ISO", w: 30, h: 17 },
  ];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const KC = { y: "#f2b705", b: "#2b7bff", r: "#e8303a" };

  // ---------- työkalut ----------
  // type: "t" = ruutu (ch), "e" = olio (ent),
  const TOOLS = [
    { id: "wall", em: "✏️", lb: "SEINÄ", type: "t", ch: "#" },
    { id: "floor", em: "🧽", lb: "KUMI", type: "t", ch: "." },
    { id: "start", em: "🙂", lb: "MÄ", type: "u", ch: "@" },
    { id: "goal", em: "🏁", lb: "MAALI", type: "u", ch: "G" },
    { id: "coin", em: "🪙", lb: "", type: "t", ch: "o" },
    { id: "bush", em: "🌳", lb: "", type: "t", ch: "h" },
    { id: "stone", em: "🪨", lb: "", type: "t", ch: "s" },
    { id: "ky", em: "🔑", lb: "", type: "t", ch: "y", col: "y" },
    { id: "kb", em: "🔑", lb: "", type: "t", ch: "b", col: "b" },
    { id: "kr", em: "🔑", lb: "", type: "t", ch: "r", col: "r" },
    { id: "dy", em: "🚪", lb: "", type: "t", ch: "Y", col: "y" },
    { id: "db", em: "🚪", lb: "", type: "t", ch: "B", col: "b" },
    { id: "dr", em: "🚪", lb: "", type: "t", ch: "R", col: "r" },
    { id: "las1", em: "🔴", lb: "LASER", type: "t", ch: "!" },
    { id: "las2", em: "🟠", lb: "LASER", type: "t", ch: ":" },
    { id: "guard", em: "💂", lb: "VARTIJA", type: "e", k: "g" },
    { id: "wh", em: "💂↔", lb: "", type: "e", k: "w", axis: "h", dog: false },
    { id: "wv", em: "💂↕", lb: "", type: "e", k: "w", axis: "v", dog: false },
    { id: "dh", em: "🐕↔", lb: "", type: "e", k: "w", axis: "h", dog: true },
    { id: "dv", em: "🐕↕", lb: "", type: "e", k: "w", axis: "v", dog: true },
    { id: "cam", em: "📷", lb: "KAMERA", type: "e", k: "c" },
    { id: "lever", em: "🎚️", lb: "VIPU", type: "t", ch: "v" },
    { id: "gate", em: "▥", lb: "PORTTI", type: "t", ch: "|" },
    { id: "tp1", em: "🌀1", lb: "", type: "tp", ch: "1" },
    { id: "tp2", em: "🌀2", lb: "", type: "tp", ch: "2" },
    { id: "ice", em: "❄️", lb: "JÄÄ", type: "t", ch: "i" },
    { id: "potion", em: "🧪", lb: "JUOMA", type: "t", ch: "p" },
  ];

  // ---------- tila ----------
  let cur = null;          // muokattava kenttä { id, name, w, h, grid, ents, dark, tp:{1:[],2:[]} }
  let tool = TOOLS[0];
  let undoStack = [];
  let root = null, cv = null, ctx = null, stage = null, ro = null;
  let geo = { ts: 20, ox: 0, oy: 0 };
  let screen = "list";

  // ---------- tallennus ----------
  function loadAll() {
    try {
      const a = JSON.parse(localStorage.getItem(STORE) || "[]");
      return Array.isArray(a) ? a.filter(l => l && Array.isArray(l.map) && l.map.length >= 3) : [];
    } catch (e) { return []; }
  }
  function saveAll(arr) {
    try { localStorage.setItem(STORE, JSON.stringify(arr)); return true; } catch (e) { return false; }
  }
  function newId() { return Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }

  // ---------- malli ----------
  function forceBorder(L) {
    for (let x = 0; x < L.w; x++) { L.grid[0][x] = "#"; L.grid[L.h - 1][x] = "#"; }
    for (let y = 0; y < L.h; y++) { L.grid[y][0] = "#"; L.grid[y][L.w - 1] = "#"; }
  }
  function newLevel(size) {
    const all = loadAll();
    let n = 0;
    for (const l of all) { const m = /^OMA (\d+)$/.exec(l.name || ""); if (m) n = Math.max(n, +m[1]); }
    n = Math.max(n, all.length) + 1;
    const L = { id: newId(), name: "OMA " + n, w: size.w, h: size.h, grid: [], ents: [], dark: false };
    for (let y = 0; y < L.h; y++) L.grid.push(Array(L.w).fill("."));
    forceBorder(L);
    const my = Math.floor(L.h / 2);
    L.grid[my][1] = "@"; L.grid[my][L.w - 2] = "G";
    return L;
  }
  function fromSaved(s) {
    const h = s.map.length, w = Math.max(...s.map.map(r => r.length));
    const L = { id: s.id || newId(), name: s.name || "OMA", w, h, grid: [], ents: [], dark: !!s.dark };
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) row.push(s.map[y][x] && s.map[y][x] !== " " ? s.map[y][x] : "#");
      L.grid.push(row);
    }
    forceBorder(L);
    if (s.ed && Array.isArray(s.ed.ents)) L.ents = s.ed.ents.filter(e => e && e.x > 0 && e.y > 0 && e.x < w - 1 && e.y < h - 1);
    return L;
  }
  function snapshot() { return JSON.stringify({ g: cur.grid, e: cur.ents, d: cur.dark }); }
  function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 40) undoStack.shift(); }
  function undo() {
    if (!undoStack.length) return;
    const s = JSON.parse(undoStack.pop());
    cur.grid = s.g; cur.ents = s.e; cur.dark = s.d;
    syncDarkBtn(); draw();
  }
  function entAt(x, y) { return cur.ents.find(e => e.x === x && e.y === y); }
  function removeEntAt(x, y) { cur.ents = cur.ents.filter(e => !(e.x === x && e.y === y)); }
  function tpList(ch) {
    // paikat, joissa on tämä teleportti, vanhin ensin (cur.tpOrder pitää järjestyksen)
    const order = (cur.tpOrder && cur.tpOrder[ch]) || [];
    const res = [];
    for (const [x, y] of order) if (cur.grid[y][x] === ch) res.push([x, y]);
    for (let y = 0; y < cur.h; y++) for (let x = 0; x < cur.w; x++)
      if (cur.grid[y][x] === ch && !res.some(p => p[0] === x && p[1] === y)) res.push([x, y]);
    cur.tpOrder = cur.tpOrder || {};
    cur.tpOrder[ch] = res;
    return res;
  }
  function clearUnique(ch) {
    for (let y = 0; y < cur.h; y++) for (let x = 0; x < cur.w; x++) if (cur.grid[y][x] === ch) cur.grid[y][x] = ".";
  }

  // ---------- maalaus ----------
  function applyTool(x, y, first) {
    if (x <= 0 || y <= 0 || x >= cur.w - 1 || y >= cur.h - 1) return false;
    const g = cur.grid;
    const t = tool;
    if (t.type === "e") {
      const ex = entAt(x, y);
      const same = ex && ex.k === t.k && (t.k !== "w" || (ex.axis === t.axis && !!ex.dog === !!t.dog));
      if (same) {
        if (first && (ex.k === "g" || ex.k === "c")) { ex.dir = (ex.dir + 90) % 360; beep([520], .05, "square", .04); return true; }
        return false;
      }
      if (ex) removeEntAt(x, y);
      g[y][x] = ".";
      const e = { k: t.k, x, y };
      if (t.k === "w") { e.axis = t.axis; e.dog = t.dog; } else e.dir = 0;
      cur.ents.push(e);
      return true;
    }
    if (g[y][x] === tileChar(t) && !entAt(x, y)) return false;
    removeEntAt(x, y);
    if (t.type === "u") { clearUnique(t.ch); g[y][x] = t.ch; return true; }
    if (t.type === "tp") {
      const list = tpList(t.ch);
      g[y][x] = t.ch;
      cur.tpOrder[t.ch] = list.filter(p => !(p[0] === x && p[1] === y)).concat([[x, y]]);
      while (cur.tpOrder[t.ch].length > 2) {
        const old = cur.tpOrder[t.ch].shift();
        g[old[1]][old[0]] = ".";
      }
      return true;
    }
    g[y][x] = t.ch;
    return true;
  }
  function tileChar(t) { return t.ch; }

  // ---------- piirto ----------
  function cellAt(ev) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left - geo.ox) / geo.ts);
    const y = Math.floor((ev.clientY - r.top - geo.oy) / geo.ts);
    if (x < 0 || y < 0 || x >= cur.w || y >= cur.h) return null;
    return [x, y];
  }
  function blocked(x, y) {
    if (x < 0 || y < 0 || x >= cur.w || y >= cur.h) return true;
    return "#YBR|".includes(cur.grid[y][x]);
  }
  function extent(e) {
    const dx = e.axis === "h" ? 1 : 0, dy = e.axis === "h" ? 0 : 1;
    let a = 0, b = 0;
    while (!blocked(e.x - dx * (a + 1), e.y - dy * (a + 1))) a++;
    while (!blocked(e.x + dx * (b + 1), e.y + dy * (b + 1))) b++;
    return { x1: e.x - dx * a, y1: e.y - dy * a, x2: e.x + dx * b, y2: e.y + dy * b };
  }
  function em(c, str, size, x, y) {
    c.font = Math.floor(size) + "px " + EMOJI_FONT;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(str, x, y);
  }
  function arrow(c, cx, cy, dirDeg, dist, size, color) {
    const a = dirDeg * Math.PI / 180;
    const px = cx + Math.cos(a) * dist, py = cy + Math.sin(a) * dist;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(px + Math.cos(a) * size, py + Math.sin(a) * size);
    c.lineTo(px + Math.cos(a + 2.4) * size, py + Math.sin(a + 2.4) * size);
    c.lineTo(px + Math.cos(a - 2.4) * size, py + Math.sin(a - 2.4) * size);
    c.closePath(); c.fill();
  }
  function draw() {
    if (!ctx || !cur) return;
    const dpr = cv._dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv._w, cv._h);
    const ts = geo.ts;
    ctx.save();
    ctx.translate(geo.ox, geo.oy);
    for (let y = 0; y < cur.h; y++) for (let x = 0; x < cur.w; x++) {
      const ch = cur.grid[y][x], px = x * ts, py = y * ts, cx = px + ts / 2, cy = py + ts / 2;
      if (ch === "#") {
        ctx.fillStyle = "#ffc4cc"; ctx.fillRect(px, py, ts, ts);
        ctx.strokeStyle = "#d62828"; ctx.lineWidth = Math.max(1, ts / 14);
        ctx.strokeRect(px + .5, py + .5, ts - 1, ts - 1);
        continue;
      }
      ctx.fillStyle = ch === "i" ? "#d6efff" : "#fffaf0"; ctx.fillRect(px, py, ts, ts);
      ctx.strokeStyle = "#eadfcf"; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, ts - 1, ts - 1);
      if (ch === ".") continue;
      const big = ts * .7;
      if (ch === "o") em(ctx, "🪙", big, cx, cy);
      else if (ch === "h") em(ctx, "🌳", big, cx, cy);
      else if (ch === "s") em(ctx, "🪨", big, cx, cy);
      else if (ch === "@") em(ctx, "🙂", big, cx, cy);
      else if (ch === "G") em(ctx, "🏁", big, cx, cy);
      else if (ch === "v") em(ctx, "🎚️", big, cx, cy);
      else if (ch === "p") em(ctx, "🧪", big, cx, cy);
      else if (ch === "i") em(ctx, "❄️", big * .9, cx, cy);
      else if (ch === "1" || ch === "2") {
        em(ctx, "🌀", big, cx, cy);
        ctx.fillStyle = "#b51d1d"; ctx.font = "bold " + Math.floor(ts * .4) + "px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ch, cx, cy + ts * .02);
      } else if (ch === "|") {
        ctx.fillStyle = "#8a6a4a"; ctx.fillRect(px + ts * .1, py + ts * .1, ts * .8, ts * .8);
        ctx.fillStyle = "#e9d2b0";
        for (let i = 0; i < 4; i++) ctx.fillRect(px + ts * (.17 + i * .19), py + ts * .14, ts * .09, ts * .72);
      } else if (ch === "!" || ch === ":") {
        ctx.strokeStyle = ch === "!" ? "#ff1f2f" : "#ff9a1f"; ctx.lineWidth = Math.max(2, ts / 6);
        ctx.setLineDash(ch === ":" ? [ts / 4, ts / 5] : []);
        ctx.beginPath(); ctx.moveTo(px + ts * .1, cy); ctx.lineTo(px + ts * .9, cy); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#555"; ctx.fillRect(px + 1, cy - ts * .15, ts * .12, ts * .3); ctx.fillRect(px + ts * .88 - 1, cy - ts * .15, ts * .12, ts * .3);
      } else if ("ybr".includes(ch)) {
        ctx.fillStyle = KC[ch]; ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(px + ts * .12, py + ts * .12, ts * .76, ts * .76, ts * .15) : ctx.rect(px + ts * .12, py + ts * .12, ts * .76, ts * .76);
        ctx.fill();
        em(ctx, "🔑", ts * .5, cx, cy);
      } else if ("YBR".includes(ch)) {
        const k = ch.toLowerCase();
        ctx.fillStyle = KC[k]; ctx.fillRect(px + ts * .08, py + ts * .04, ts * .84, ts * .92);
        ctx.strokeStyle = "#222"; ctx.lineWidth = Math.max(1, ts / 12); ctx.strokeRect(px + ts * .08, py + ts * .04, ts * .84, ts * .92);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, ts * .12, 0, 7); ctx.fill();
        ctx.fillRect(cx - ts * .04, cy, ts * .08, ts * .25);
      }
    }
    // vartijat ja kamerat
    for (const e of cur.ents) {
      const px = e.x * ts, py = e.y * ts, cx = px + ts / 2, cy = py + ts / 2;
      if (e.k === "g") {
        ctx.fillStyle = "#d62828"; ctx.beginPath(); ctx.arc(cx, cy, ts * .36, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, ts * .14, 0, 7); ctx.fill();
        arrow(ctx, cx, cy, e.dir, ts * .38, ts * .2, "#7a0f0f");
      } else if (e.k === "c") {
        em(ctx, "📷", ts * .75, cx, cy);
        arrow(ctx, cx, cy, e.dir, ts * .36, ts * .2, "#444");
      } else {
        const ex = extent(e);
        ctx.strokeStyle = "#d62828aa"; ctx.lineWidth = Math.max(2, ts / 8); ctx.setLineDash([ts / 4, ts / 6]);
        ctx.beginPath(); ctx.moveTo(ex.x1 * ts + ts / 2, ex.y1 * ts + ts / 2); ctx.lineTo(ex.x2 * ts + ts / 2, ex.y2 * ts + ts / 2); ctx.stroke();
        ctx.setLineDash([]);
        if (e.dog) {
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, ts * .38, 0, 7); ctx.fill();
          ctx.strokeStyle = "#d62828"; ctx.lineWidth = Math.max(1.5, ts / 12); ctx.stroke();
          em(ctx, "🐕", ts * .6, cx, cy);
        } else {
          ctx.fillStyle = "#d62828"; ctx.beginPath(); ctx.arc(cx, cy, ts * .36, 0, 7); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, ts * .14, 0, 7); ctx.fill();
        }
        const ang = e.axis === "h" ? [0, 180] : [90, -90];
        for (const a of ang) arrow(ctx, cx, cy, a, ts * .4, ts * .17, "#7a0f0f");
      }
    }
    if (cur.dark) {
      ctx.restore(); ctx.save(); ctx.translate(geo.ox, geo.oy);
      ctx.font = Math.floor(Math.max(16, ts * .9)) + "px " + EMOJI_FONT;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("🌑", ts * 1.1, ts * 1.1);
    }
    ctx.restore();
  }
  function layout() {
    if (!stage || !cv || !cur) return;
    const r = stage.getBoundingClientRect();
    const w = Math.max(50, Math.floor(r.width)), h = Math.max(50, Math.floor(r.height));
    const dpr = window.devicePixelRatio || 1;
    cv._dpr = dpr; cv._w = w; cv._h = h;
    cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    const ts = Math.max(8, Math.floor(Math.min((w - 8) / cur.w, (h - 8) / cur.h)));
    geo.ts = ts; geo.ox = Math.floor((w - ts * cur.w) / 2); geo.oy = Math.floor((h - ts * cur.h) / 2);
    draw();
  }

  // ---------- muunnos pelikentäksi ----------
  function norm(a) { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; }
  function toLevel() {
    const map = cur.grid.map(r => r.join(""));
    const guards = [], cameras = [];
    for (const e of cur.ents) {
      if (e.k === "g") guards.push({ x: e.x, y: e.y, scan: [norm(e.dir), norm(e.dir + 90), norm(e.dir), norm(e.dir - 90)] });
      else if (e.k === "c") cameras.push({ x: e.x, y: e.y, scan: [norm(e.dir - 45), norm(e.dir + 45)] });
      else {
        const ex = extent(e);
        let gd;
        if (ex.x1 === ex.x2 && ex.y1 === ex.y2) gd = { x: e.x, y: e.y, scan: [0, 90, 180, -90] };
        else gd = { patrol: [[ex.x1, ex.y1], [ex.x2, ex.y2]] };
        if (e.dog) gd.dog = true;
        guards.push(gd);
      }
    }
    let floors = 0;
    for (const r of cur.grid) for (const c of r) if (c !== "#") floors++;
    const L = {
      name: cur.name, intro: "🎨 OMA KENTTÄ!",
      par: Math.max(30, Math.min(150, Math.round(floors / 4))),
      map, guards, cameras,
    };
    if (cur.dark) L.dark = true;
    return L;
  }
  function toSaved() {
    const L = toLevel();
    L.id = cur.id;
    L.ed = { ents: cur.ents };
    return L;
  }

  // ---------- tarkistus ----------
  function find(ch) {
    const res = [];
    for (let y = 0; y < cur.h; y++) for (let x = 0; x < cur.w; x++) if (cur.grid[y][x] === ch) res.push([x, y]);
    return res;
  }
  function bfs(gatesOpen) {
    const w = cur.w, h = cur.h, g = cur.grid;
    const st = find("@")[0];
    const seen = new Set();
    const q = [];
    const tps = { 1: find("1"), 2: find("2") };
    let goal = false, lever = false;
    const push = (x, y, m) => {
      const k = (y * w + x) * 8 + m;
      if (!seen.has(k)) { seen.add(k); q.push([x, y, m]); }
    };
    push(st[0], st[1], 0);
    while (q.length) {
      const [x, y, m0] = q.pop();
      let m = m0;
      const c = g[y][x];
      if (c === "G") goal = true;
      if (c === "v") lever = true;
      if (c === "y") m |= 1; else if (c === "b") m |= 2; else if (c === "r") m |= 4;
      if (m !== m0) { push(x, y, m); continue; }
      if (c === "1" || c === "2") for (const p of tps[c]) push(p[0], p[1], m);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = g[ny][nx];
        if (n === "#") continue;
        if (n === "Y" && !(m & 1)) continue;
        if (n === "B" && !(m & 2)) continue;
        if (n === "R" && !(m & 4)) continue;
        if (n === "|" && !gatesOpen) continue;
        push(nx, ny, m);
      }
    }
    return { goal, lever };
  }
  function validate() {
    if (find("@").length < 1) return "🙂 PUUTTUU";
    if (find("G").length < 1) return "🏁 PUUTTUU";
    if (find("1").length === 1 || find("2").length === 1) return "🌀 TARVITSEE KAKSI";
    // eri tahdissa vilkkuvat laserit vierekkäin: toinen on aina päällä
    for (const [x, y] of find("!")) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const row = cur.grid[y + dy]; if (row && row[x + dx] === ":") return "🔴🟠 LIIAN LÄHEKKÄIN";
    }
    let r = bfs(false);
    if (!r.goal && r.lever) r = bfs(true);
    if (!r.goal) return "EI PÄÄSE 🏁";
    return null;
  }

  // ---------- näkymät ----------
  function injectStyle() {
    if (document.getElementById("edStyle")) return;
    const st = document.createElement("style");
    st.id = "edStyle";
    st.textContent = `
#editorScreen { overflow: hidden; touch-action: none; background: #fbf7ef; }
#editorScreen * { box-sizing: border-box; }
.ed-root { width: 100%; height: 100%; display: flex; flex-direction: column; color: #b51d1d; font-family: inherit; }
.ed-btn { font: inherit; font-weight: bold; font-size: 20px; min-width: 48px; min-height: 48px; padding: 4px 12px; border-radius: 14px;
  border: 3px solid #d62828; background: #fff; color: #d62828; box-shadow: 0 3px 0 #e8a5a5; text-transform: uppercase; }
.ed-btn.pri { background: #d62828; color: #fff; box-shadow: 0 3px 0 #8f1414; }
.ed-btn:active { transform: translateY(2px); box-shadow: none; }
.ed-btn.sure { background: #ffdede; border-color: #8f1414; color: #8f1414; }
.ed-head { display: flex; align-items: center; gap: 8px; padding: calc(6px + env(safe-area-inset-top)) calc(10px + env(safe-area-inset-right)) 6px calc(10px + env(safe-area-inset-left)); }
.ed-head h2 { flex: 1; margin: 0; font-size: 26px; text-align: center; }
.ed-list { flex: 1; overflow-y: auto; touch-action: pan-y; padding: 4px calc(12px + env(safe-area-inset-right)) 12px calc(12px + env(safe-area-inset-left));
  display: flex; flex-direction: column; gap: 8px; max-width: 560px; width: 100%; margin: 0 auto; }
.ed-row { display: flex; align-items: center; gap: 8px; background: #fff; border: 3px solid #e2b0b0; border-radius: 14px; padding: 4px 8px; }
.ed-row .nm { flex: 1; font-weight: bold; font-size: 22px; }
.ed-row .nm small { display: block; font-size: 12px; color: #5a2a2a; }
.ed-empty { text-align: center; font-size: 22px; color: #5a2a2a; margin: 20px 0; font-weight: bold; }
.ed-sizes { flex: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 14px; padding: 8px; }
.ed-sizes .ed-btn { font-size: 26px; min-width: 150px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.2; }
.ed-sizes .ed-btn small { font-size: 15px; color: inherit; opacity: .8; }
.ed-main { flex: 1; min-height: 0; display: flex; flex-direction: row; }
.ed-stage { flex: 1; min-width: 0; min-height: 0; position: relative; }
.ed-stage canvas { position: absolute; left: 0; top: 0; touch-action: none; display: block; width: auto; height: auto; }
.ed-side { width: 244px; display: flex; flex-direction: column; border-left: 3px solid #e2b0b0; background: #fff6f6;
  padding: calc(4px + env(safe-area-inset-top)) calc(4px + env(safe-area-inset-right)) calc(4px + env(safe-area-inset-bottom)) 4px; }
.ed-acts { display: flex; gap: 4px; padding-bottom: 4px; }
.ed-acts .ed-btn { min-width: 44px; padding: 2px 4px; font-size: 20px; }
.ed-acts .pri { flex: 1; font-size: 15px; }
.ed-tools { flex: 1; overflow-y: auto; touch-action: pan-y; display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; padding-bottom: 6px; }
.ed-tool { width: 54px; height: 50px; border: 3px solid #e2b0b0; border-radius: 12px; background: #fff; color: #5a2a2a; font: inherit;
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; line-height: 1; touch-action: pan-y; }
.ed-tool .em { font-size: 22px; line-height: 24px; white-space: nowrap; }
.ed-tool .em.long { font-size: 17px; }
.ed-tool .lb { font-size: 9px; font-weight: bold; margin-top: 1px; letter-spacing: 0; }
.ed-tool.sel { border-color: #d62828; background: #ffe0e0; box-shadow: 0 0 0 2px #d62828; }
.ed-tool.col .em { padding: 0 3px; border-radius: 6px; }
@media (orientation: portrait) {
  .ed-main { flex-direction: column; }
  .ed-side { width: 100%; height: 44%; border-left: none; border-top: 3px solid #e2b0b0; }
  .ed-acts .ed-btn { min-width: 52px; }
  .ed-tools { justify-content: center; }
  .ed-tool { width: 58px; }
}
`;
    document.head.appendChild(st);
  }
  function mk(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function fresh() {
    if (ro) { ro.disconnect(); ro = null; }
    const host = $("editorScreen");
    host.innerHTML = "";
    root = mk("div", "ed-root");
    host.appendChild(root);
    cv = null; ctx = null; stage = null;
  }

  function showList() {
    screen = "list"; cur = null;
    fresh();
    const head = mk("div", "ed-head");
    const back = mk("button", "ed-btn", "←"); back.onclick = () => goMenu();
    const addB = mk("button", "ed-btn pri", "➕ UUSI"); addB.onclick = showSizes;
    head.append(back, mk("h2", "", "🎨 OMAT"), addB);
    const list = mk("div", "ed-list");
    root.append(head, list);
    const all = loadAll();
    if (!all.length) list.appendChild(mk("div", "ed-empty", "EI VIELÄ KENTTIÄ<br>PAINA ➕ UUSI"));
    all.forEach(s => {
      const row = mk("div", "ed-row");
      const nm = mk("div", "nm", "");
      nm.textContent = s.name || "OMA";
      const sm = mk("small", "", ""); sm.textContent = (s.map[0] ? Math.max(...s.map.map(r => r.length)) : 0) + "×" + s.map.length;
      nm.appendChild(sm);
      const play = mk("button", "ed-btn pri", "▶");
      play.onclick = () => { cur = fromSaved(s); const err = validate(); if (err) { toast(err); cur = null; return; } const L = toLevel(); cur = null; state = "menu"; playCustom(L); keepCur(s); };
      const edit = mk("button", "ed-btn", "✏️");
      edit.onclick = () => showEditor(fromSaved(s));
      const del = mk("button", "ed-btn", "🗑");
      let armed = false, tm = 0;
      del.onclick = () => {
        if (!armed) {
          armed = true; del.classList.add("sure"); del.textContent = "❓";
          tm = setTimeout(() => { armed = false; del.classList.remove("sure"); del.textContent = "🗑"; }, 3000);
          return;
        }
        clearTimeout(tm);
        saveAll(loadAll().filter(l => l.id !== s.id));
        showList();
      };
      row.append(nm, play, edit, del);
      list.appendChild(row);
    });
  }
  // kun pelataan suoraan listasta, pidetään kenttä muistissa jotta pelin jälkeen palataan siihen
  function keepCur(s) { pending = fromSaved(s); }
  let pending = null;

  function showSizes() {
    screen = "sizes"; cur = null;
    fresh();
    const head = mk("div", "ed-head");
    const back = mk("button", "ed-btn", "←"); back.onclick = showList;
    head.append(back, mk("h2", "", "KOKO?"));
    const box = mk("div", "ed-sizes");
    for (const sz of SIZES) {
      const b = mk("button", "ed-btn", sz.label + "<small>" + sz.w + "×" + sz.h + "</small>");
      b.onclick = () => { const L = newLevel(sz); showEditor(L, true); };
      box.appendChild(b);
    }
    root.append(head, box);
  }

  let darkBtn = null;
  function syncDarkBtn() { if (darkBtn) darkBtn.classList.toggle("sel", !!cur.dark); }

  function persist(quiet) {
    const all = loadAll();
    const s = toSaved();
    const i = all.findIndex(l => l.id === s.id);
    if (i >= 0) all[i] = s; else all.push(s);
    const ok = saveAll(all);
    if (!quiet) { if (ok) { toast("💾 OK"); beep([660, 880], .08, "square", .05); } else toast("EI VOI TALLENTAA"); }
    return ok;
  }

  function showEditor(L, isNew) {
    screen = "edit";
    cur = L; undoStack = []; pending = null;
    state = "menu";
    fresh();
    show("editorScreen");
    const main = mk("div", "ed-main");
    stage = mk("div", "ed-stage");
    cv = mk("canvas"); ctx = cv.getContext("2d");
    stage.appendChild(cv);
    const side = mk("div", "ed-side");
    const acts = mk("div", "ed-acts");
    const back = mk("button", "ed-btn", "←");
    back.onclick = () => { persist(true); showList(); };
    const sv = mk("button", "ed-btn", "💾"); sv.onclick = () => persist(false);
    const un = mk("button", "ed-btn", "↩"); un.onclick = undo;
    const pl = mk("button", "ed-btn pri", "▶ TESTAA");
    pl.onclick = () => {
      const err = validate();
      if (err) { toast(err); beep([200, 150], .12, "sawtooth", .06); return; }
      persist(true);
      const lvl = toLevel();
      state = "menu";
      playCustom(lvl);
    };
    acts.append(back, sv, un, pl);
    const tl = mk("div", "ed-tools");
    for (const t of TOOLS) {
      const b = mk("button", "ed-tool" + (t.col ? " col" : "") + (t === tool ? " sel" : ""), "");
      const e = mk("span", "em", t.em);
      if (t.col) e.style.background = KC[t.col];
      if (t.em.length > 2) e.classList.add("long");
      b.appendChild(e);
      if (t.lb) b.appendChild(mk("span", "lb", t.lb));
      b.onclick = () => { tool = t; tl.querySelectorAll(".ed-tool").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); };
      b._tool = t;
      if (t.id === "gate") { b.querySelector(".em").style.fontWeight = "bold"; }
      tl.appendChild(b);
    }
    darkBtn = mk("button", "ed-tool", ""); darkBtn.appendChild(mk("span", "em", "🌑")); darkBtn.appendChild(mk("span", "lb", "PIMEÄ"));
    darkBtn.onclick = () => { pushUndo(); cur.dark = !cur.dark; syncDarkBtn(); draw(); };
    tl.appendChild(darkBtn);
    syncDarkBtn();
    side.append(acts, tl);
    main.append(stage, side);
    root.appendChild(main);

    // osoitin
    let painting = false, last = "";
    cv.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      const c = cellAt(ev); if (!c) return;
      painting = true; last = c.join(",");
      try { cv.setPointerCapture(ev.pointerId); } catch (e) { }
      pushUndo();
      if (!applyTool(c[0], c[1], true)) undoStack.pop();
      draw();
    });
    cv.addEventListener("pointermove", ev => {
      if (!painting) return;
      ev.preventDefault();
      const c = cellAt(ev); if (!c) return;
      const k = c.join(","); if (k === last) return;
      // täytä myös väliin jäävät ruudut, ettei nopeaan vetoon jää aukkoja
      const [lx, ly] = last.split(",").map(Number);
      const n = Math.max(Math.abs(c[0] - lx), Math.abs(c[1] - ly));
      let changed = false;
      for (let i = 1; i <= n; i++) {
        const x = Math.round(lx + (c[0] - lx) * i / n), y = Math.round(ly + (c[1] - ly) * i / n);
        if (applyTool(x, y, false)) changed = true;
      }
      last = k;
      if (changed) draw();
    });
    const end = ev => { painting = false; };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("contextmenu", e => e.preventDefault());

    ro = new ResizeObserver(layout); ro.observe(stage);
    layout();
    requestAnimationFrame(layout);
  }

  window.addEventListener("resize", () => { if (screen === "edit") layout(); });

  window.openEditor = function () {
    injectStyle();
    state = "menu";
    show("editorScreen");
    if (cur) { showEditor(cur); return; }
    if (pending) { const p = pending; pending = null; showEditor(p); return; }
    showList();
  };
})();
