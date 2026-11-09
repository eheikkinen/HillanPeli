// Ajastettu ratkaisija: pelaa kentän "täydellisenä pelaajana" ajan kanssa.
// Vartijat liikkuvat oikean pelimoottorin mukaan, laserit vilkkuvat, vivut kääntävät portteja.
// Varovainen arvio: ei kiviä, ei juomaa, ei yhtään näkyviin jäämistä.
// Käyttö selaimessa pelisivulla: fetch("tools/solver.js").then(r=>r.text()).then(eval); solveAll()
(function () {
  const SLOT = 0.25;          // yksi askel = 0.25 s (pelaaja liikkuu 3.4 ruutua/s, eli ruutu ~0.3 s)
  const HORIZON = 200;        // sekuntia
  const NS = Math.round(HORIZON / SLOT);

  window.solveLevel = function (li) {
    levelIdx = li; reset(); state = "menu";
    const L = level, at = (x, y) => (L.map[y] || "")[x] || " ";
    const nT = W * H;
    // --- vartijoiden näkemät ruudut joka aika-askeleella (portit auki = pahin tapaus) ---
    for (const q of gates) grid[q.y * W + q.x] = FLOOR;
    const seen = new Uint8Array(NS * nT);
    const sub = 5, dt = SLOT / sub;
    const mark = (s) => {
      for (const g of guards) {
        const r = Math.ceil(g.range) + 1;
        for (let y = Math.max(0, Math.floor(g.y) - r); y <= Math.min(H - 1, Math.floor(g.y) + r); y++)
          for (let x = Math.max(0, Math.floor(g.x) - r); x <= Math.min(W - 1, Math.floor(g.x) + r); x++) {
            if (solid(x, y) && tileAt(x, y) !== DOOR) continue;
            const px = x + .5, py = y + .5, dx = px - g.x, dy = py - g.y, d = Math.hypot(dx, dy);
            if (!g.camera && d < 1.0) { seen[s * nT + y * W + x] = 2; continue; } // törmäys
            if (hides.has(x + "," + y)) continue;
            if (d > g.range || Math.abs(angDiff(g.dir, Math.atan2(dy, dx))) > g.half) continue;
            if (los(g.x, g.y, px, py)) seen[s * nT + y * W + x] = 1;
          }
      }
    };
    let tt = 0;
    for (let s = 0; s < NS; s++) {
      mark(s);
      for (let k = 0; k < sub; k++) { for (const g of guards) updateGuard(g, dt); tt += dt; if (k === 2) mark(s); }
    }
    reset(); // palauta portit jne.
    const laserAt = {}; for (const l of lasers) laserAt[l.y * W + l.x] = l.phase;
    const laserOnAt = (idx, s) => { // päällä jossain kohtaa askelta s
      const ph = laserAt[idx]; if (ph === undefined) return false;
      const a = Math.floor((s * SLOT) / LASER_ON) % 2, b = Math.floor(((s + 1) * SLOT - 1e-6) / LASER_ON) % 2;
      return a === ph || b === ph;
    };
    const kb = { y: 1, b: 2, r: 4 };
    const telePair = {}; for (const q of teles) { const o = teles.find(z => z.id === q.id && z !== q); if (o) telePair[q.y * W + q.x] = o.y * W + o.x; }
    const leverSet = new Set(levers.map(l => l.y * W + l.x));
    const gateSet = new Set(gates.map(q => q.y * W + q.x));
    // tila: ruutu, avaimet (3 bittiä), portit auki (1 bitti), aika-askel
    const visited = new Uint8Array(16 * nT * NS);
    const reachTile = new Uint8Array(nT);
    const sx = Math.floor(START.x), sy = Math.floor(START.y), gIdx = Math.floor(GOAL.y) * W + Math.floor(GOAL.x);
    let frontier = [[sy * W + sx, 0]], goalTime = null;
    visited[(0 * nT + sy * W + sx) * NS + 0] = 1;
    const passable = (idx, ks, gOpen) => {
      const x = idx % W, y = (idx / W) | 0, ch = at(x, y);
      if (ch === "#" || ch === " ") return false;
      if ("YBR".includes(ch) && !(ks & kb[ch.toLowerCase()])) return false;
      if (gateSet.has(idx) && !gOpen) return false;
      return true;
    };
    for (let s = 0; s < NS - 1 && frontier.length; s++) {
      const next = [];
      for (const [idx, st] of frontier) {
        reachTile[idx] = 1;
        if (idx === gIdx) { goalTime = goalTime ?? s * SLOT; }
        const ks = st & 7, gOpen = (st >> 3) & 1;
        const x = idx % W, y = (idx / W) | 0;
        for (const n of [idx, idx + 1, idx - 1, idx + W, idx - W]) {
          if (n !== idx && Math.abs((n % W) - x) + Math.abs(((n / W) | 0) - y) !== 1) continue;
          if (!passable(n, ks, gOpen)) continue;
          if (seen[(s + 1) * nT + n] || seen[s * nT + n] === 2) continue;
          if (laserOnAt(n, s) || laserOnAt(n, s + 1)) continue;
          let m = n, nk = ks, ng = gOpen;
          const ch = at(n % W, (n / W) | 0);
          if ("ybr".includes(ch)) nk |= kb[ch];
          if (n !== idx && leverSet.has(n)) ng ^= 1;
          if (n !== idx && telePair[n] !== undefined) { m = telePair[n]; if (seen[(s + 1) * nT + m]) continue; }
          const ns = nk | (ng << 3), v = (ns * nT + m) * NS + s + 1;
          if (visited[v]) continue;
          visited[v] = 1; next.push([m, ns]);
        }
      }
      // pidä tilat yksikäsitteisinä
      frontier = next;
    }
    const coinMiss = coins.filter(c => !reachTile[Math.floor(c.y) * W + Math.floor(c.x)]).map(c => [Math.floor(c.x), Math.floor(c.y)]);
    const keyMiss = keyItems.filter(c => !reachTile[Math.floor(c.y) * W + Math.floor(c.x)]).map(c => c.color);
    return { name: L.name, goal: goalTime, coinMiss, keyMiss };
  };
  window.solveAll = function () {
    const out = [];
    for (let i = 0; i < LEVELS.length; i++) {
      const r = solveLevel(i);
      out.push(`${i + 1}. ${r.name}: ${r.goal === null ? "❌ EI RATKEA" : "✔ maali " + r.goal.toFixed(1) + " s"}` +
        (r.coinMiss.length ? `, kolikot ei: ${JSON.stringify(r.coinMiss)}` : "") + (r.keyMiss.length ? `, avaimet ei: ${r.keyMiss}` : ""));
    }
    state = "menu";
    return out.join("\n");
  };
})();
