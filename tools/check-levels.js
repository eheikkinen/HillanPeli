// Tarkistaa, että kaikki kentät ovat läpäistäviä.
// Käyttö: node tools/check-levels.js
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "levels.js"), "utf8");
const LEVELS = new Function(src + "; return LEVELS;")();

let failed = 0;
LEVELS.forEach((L, li) => {
  const errs = [], warn = [];
  const map = L.map, H = map.length, W = Math.max(...map.map(r => r.length));
  const at = (x, y) => (x < 0 || y < 0 || y >= H || x >= W) ? " " : (map[y][x] || " ");
  const walkable = ch => !"# YBR|".includes(ch);
  let start = null, goal = null, coins = [], keys = {}, doors = 0, stones = 0, teles = { "1": [], "2": [] }, gatesN = 0, leversN = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = at(x, y);
    if (!"#. @Gohsybr YBR!:v|12ip".includes(ch)) errs.push(`tuntematon merkki '${ch}' kohdassa ${x},${y}`);
    if (ch === "@") { if (start) errs.push("monta @-merkkiä"); start = [x, y]; }
    if (ch === "G") { if (goal) errs.push("monta G-merkkiä"); goal = [x, y]; }
    if (ch === "o") coins.push([x, y]);
    if (ch === "s") stones++;
    if (ch === "1" || ch === "2") teles[ch].push([x, y]);
    if (ch === "|") gatesN++;
    if (ch === "v") leversN++;
    if (ch === "!" || ch === ":") for (const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
      const o = at(x + dx, y + dy);
      if ((o === "!" || o === ":") && o !== ch) errs.push(`laserit ${x},${y} ja ${x+dx},${y+dy} vilkkuvat eri tahdissa vierekkäin – toinen on aina päällä!`);
    }
    if ("ybr".includes(ch)) keys[ch] = [x, y];
    if ("YBR".includes(ch)) { doors++; if (!map.join("").includes(ch.toLowerCase())) errs.push(`ovi ${ch} ilman avainta`); }
    if (walkable(ch) && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) errs.push(`lattia kartan reunalla ${x},${y}`);
    if (walkable(ch)) for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if (at(x+dx, y+dy) === " ") errs.push(`lattia ${x},${y} vieressä tyhjää (puuttuuko seinä?)`);
  }
  for (const id of ["1", "2"]) if (teles[id].length && teles[id].length !== 2) errs.push(`teleportti ${id}: pitää olla tasan kaksi`);
  if (gatesN && !leversN) errs.push("portti | ilman vipua v");
  if (!start) errs.push("ei @-aloitusta");
  if (!goal) errs.push("ei G-maalia");
  // BFS avaimilla
  if (start && goal) {
    const kbit = { y: 1, b: 2, r: 4, v: 8 }, seen = new Set(), q = [[start[0], start[1], 0]];
    const reach = new Set(); let goalOk = false;
    seen.add(start + ",0");
    while (q.length) {
      const [x, y, k] = q.shift(); reach.add(x + "," + y);
      if (x === goal[0] && y === goal[1]) goalOk = true;
      const here = at(x, y), nbrs = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx, dy]) => [x + dx, y + dy]);
      if (here === "1" || here === "2") for (const q of teles[here]) if (q[0] !== x || q[1] !== y) nbrs.push(q);
      for (const [nx, ny] of nbrs) {
        const ch = at(nx, ny);
        let nk = k;
        if (ch === "#" || ch === " ") continue;
        if ("YBR".includes(ch) && !(k & kbit[ch.toLowerCase()])) continue;
        if (ch === "|" && !(k & 8)) continue;
        if ("ybrv".includes(ch)) nk |= kbit[ch];
        const id = nx + "," + ny + "," + nk;
        if (!seen.has(id)) { seen.add(id); q.push([nx, ny, nk]); }
      }
    }
    if (!goalOk) errs.push("maaliin ei pääse!");
    // Loukut: voiko jäädä jumiin (esim. portti sulkeutuu ja vipu jää väärälle puolelle)?
    if (leversN) {
      const tl = { "1": teles["1"], "2": teles["2"] };
      const sid = (x, y, k, g) => ((y * W + x) * 8 + k) * 2 + g;
      const start0 = sid(start[0], start[1], 0, 0), fwd = new Map(), q2 = [start0], goalStates = [];
      fwd.set(start0, []);
      while (q2.length) {
        const id = q2.shift(), g = id % 2, k = ((id - g) / 2) % 8, t2 = Math.floor(((id - g) / 2) / 8), x = t2 % W, y = Math.floor(t2 / W);
        if (x === goal[0] && y === goal[1]) goalStates.push(id);
        const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        const h = at(x, y); if (h === "1" || h === "2") for (const p of tl[h]) if (p[0] !== x || p[1] !== y) nb.push(p);
        for (const [nx, ny] of nb) {
          const ch = at(nx, ny); let nk = k, ng = g;
          if (ch === "#" || ch === " ") continue;
          if ("YBR".includes(ch) && !(k & kbit[ch.toLowerCase()])) continue;
          if (ch === "|" && !g) continue;
          if ("ybr".includes(ch)) nk |= kbit[ch];
          if (ch === "v") ng ^= 1;
          const n = sid(nx, ny, nk, ng);
          fwd.get(id).push(n);
          if (!fwd.has(n)) { fwd.set(n, []); q2.push(n); }
        }
      }
      const rev = new Map(); for (const [a2, ns] of fwd) for (const b of ns) { if (!rev.has(b)) rev.set(b, []); rev.get(b).push(a2); }
      const ok = new Set(goalStates), q3 = [...goalStates];
      while (q3.length) { const b = q3.pop(); for (const a2 of rev.get(b) || []) if (!ok.has(a2)) { ok.add(a2); q3.push(a2); } }
      const traps = [...fwd.keys()].filter(id => !ok.has(id));
      if (traps.length) { const id = traps[0], g = id % 2, t2 = Math.floor(((id - g) / 2) / 8); errs.push(`loukku: voi jäädä jumiin esim. ruutuun ${t2 % W},${Math.floor(t2 / W)} (portit ${g ? "auki" : "kiinni"})`); }
    }
    for (const c of coins) if (!reach.has(c + "")) errs.push(`kolikkoon ${c} ei pääse`);
    for (const s in keys) if (!reach.has(keys[s] + "")) errs.push(`avaimeen ${s} ei pääse`);
  }
  const floorAt = (x, y) => walkable(at(x, y)) && !"YBR|".includes(at(x, y));
  const checkPt = (p, what) => { if (!floorAt(p[0], p[1])) errs.push(`${what} ${p} ei ole lattialla ('${at(p[0], p[1])}')`); };
  (L.guards || []).forEach((g, gi) => {
    if (g.patrol) {
      g.patrol.forEach(p => checkPt(p, `vartija ${gi} reittipiste`));
      for (let i = 0; i < g.patrol.length; i++) {
        const a = g.patrol[i], b = g.patrol[(i + 1) % g.patrol.length];
        if (a[0] !== b[0] && a[1] !== b[1]) errs.push(`vartija ${gi}: reitti ${a}->${b} ei ole vaaka/pysty`);
        const n = Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]));
        for (let s = 0; s <= n; s++) { const x = a[0] + Math.sign(b[0]-a[0]) * s, y = a[1] + Math.sign(b[1]-a[1]) * s; if (!floorAt(x, y)) errs.push(`vartija ${gi}: reitti ${a}->${b} kulkee esteen läpi kohdassa ${x},${y}`); }
      }
      if (start && Math.hypot(g.patrol[0][0]-start[0], g.patrol[0][1]-start[1]) < 4) warn.push(`vartija ${gi} aivan aloituksen vieressä`);
    } else {
      checkPt([g.x, g.y], `vartija ${gi}`);
      if (!g.scan || !g.scan.length) errs.push(`vartija ${gi}: scan puuttuu`);
      if (start && Math.hypot(g.x-start[0], g.y-start[1]) < 4) warn.push(`vartija ${gi} aivan aloituksen vieressä`);
    }
  });
  (L.cameras || []).forEach((c, ci) => { checkPt([c.x, c.y], `kamera ${ci}`); if (!c.scan) errs.push(`kamera ${ci}: scan puuttuu`); });
  if (!L.name) errs.push("nimi puuttuu");
  if (!L.par) warn.push("par puuttuu");
  const status = errs.length ? "VIRHE" : "OK";
  if (errs.length) failed++;
  console.log(`${li + 1}. ${L.name} [${W}x${H}] ${status}  kolikot ${coins.length}, avaimet ${Object.keys(keys).join("")||"-"}, kivet ${stones}, vartijat ${(L.guards||[]).length}, kamerat ${(L.cameras||[]).length}`);
  for (const e of [...new Set(errs)]) console.log("   ✘ " + e);
  for (const w of warn) console.log("   ! " + w);
});
process.exit(failed ? 1 : 0);
