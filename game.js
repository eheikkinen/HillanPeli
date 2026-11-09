"use strict";
const $ = id => document.getElementById(id);
const DEG = Math.PI / 180;
const RED = "#d62828";
const VOID = 0, FLOOR = 1, WALL = 2, DOOR = 3, GATE = 4;
const KEY_COLORS = { y: "#f2b705", b: "#2b7bff", r: "#e8303a" };
const KEY_NAMES = { y: "keltainen", b: "sininen", r: "punainen" };

// ---------- Tallennus ----------
const SAVE_KEY = "hillan-peli-save-v2";
let save = { levels: {}, color: "blue", hat: "none", wallet: 0, owned: [], pet: "none", trail: "none", bag: 0, sound: true, medals: [], stats: {} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const lvlSave = i => save.levels[i] || (save.levels[i] = { done: false, coins: false, stealth: false, best: 0 });
const starsOf = i => { const s = save.levels[i]; return s ? (s.done ? 1 : 0) + (s.coins ? 1 : 0) + (s.stealth ? 1 : 0) : 0; };
const totalStars = () => LEVELS.reduce((a, _, i) => a + starsOf(i), 0);
const totalScore = () => LEVELS.reduce((a, _, i) => a + ((save.levels[i] && save.levels[i].best) || 0), 0);
const unlockedLevel = i => i === 0 || (save.levels[i - 1] && save.levels[i - 1].done);

// ---------- Asut ----------
const COLORS = [
  { id: "blue", name: "Sininen", need: 0, fill: "#3a7bfd", line: "#1a3f99" },
  { id: "green", name: "Vihreä", need: 3, fill: "#2fb35a", line: "#14692f" },
  { id: "pink", name: "Pinkki", need: 6, fill: "#ff6fb5", line: "#a8246a" },
  { id: "purple", name: "Violetti", need: 10, fill: "#9b5cff", line: "#55219e" },
  { id: "orange", name: "Oranssi", need: 14, fill: "#ff9a1f", line: "#a35400" },
  { id: "gold", name: "Kulta", need: 18, fill: "#ffd23f", line: "#a07800" },
  { id: "ninja", name: "Ninja", need: 22, fill: "#2b2b33", line: "#000" },
  { id: "rainbow", name: "Sateenkaari", need: 27, fill: "rainbow", line: "#444" },
];
const HATS = [
  { id: "none", name: "EI", need: 0, ic: "—" },
  { id: "cap", name: "Lippis", need: 2, ic: "🧢" },
  { id: "bow", name: "Rusetti", need: 5, ic: "🎀" },
  { id: "flower", name: "Kukka", need: 8, ic: "🌸" },
  { id: "crown", name: "Kruunu", need: 12, ic: "👑" },
  { id: "glasses", name: "LASIT", need: 16, ic: "🕶️" },
  { id: "tophat", name: "TAIKURI", need: 20, ic: "🎩" },
  { id: "unicorn", name: "Yksisarvinen", need: 25, ic: "🦄" },
];

// ---------- Mitalit ----------
const MEDALS = [
  { id: "first", ic: "🥇", name: "EKA 🏁" },
  { id: "ninja", ic: "🙈", name: "NINJA" },
  { id: "fast", ic: "⚡", name: "NOPEA" },
  { id: "rich", ic: "💰", name: "100 🪙" },
  { id: "thrower", ic: "🪨", name: "10 HEITTOA" },
  { id: "brave", ic: "💪", name: "SINNIKÄS" },
  { id: "pet", ic: "🐾", name: "LEMMIKKI" },
  { id: "potion", ic: "🧪", name: "TAIKA" },
  { id: "jump", ic: "🌀", name: "HYPPY" },
  { id: "gate", ic: "🎚️", name: "VIPU" },
  { id: "builder", ic: "🎨", name: "RAKENTAJA" },
  { id: "stars30", ic: "⭐", name: "30 ⭐" },
  { id: "allstars", ic: "🌟", name: "KAIKKI ⭐" },
  { id: "master", ic: "🏆", name: "MESTARI" },
];
let winMedals = [];
function stat(k, n = 1) { save.stats[k] = (save.stats[k] || 0) + n; store(); return save.stats[k]; }
function medal(id) {
  if (!save.medals) save.medals = [];
  if (save.medals.includes(id)) return;
  const m = MEDALS.find(x => x.id === id); if (!m) return;
  save.medals.push(id); store();
  if (state === "win") { winMedals.push(m.ic + " " + m.name); return; }
  setTimeout(() => { toast("🏅 UUSI MITALI: " + m.ic + " " + m.name); beep([784, 988, 1175, 1568], .1, "triangle", .1); }, 400);
}

// ---------- Kauppa ----------
const PETS = [
  { id: "aapeli", name: "AAPELI", draw: "dachshund", price: 30 },
  { id: "muska", name: "MUSKA", draw: "jamt", price: 30 },
  { id: "chick", name: "TIPU", ic: "🐥", price: 10 },
  { id: "cat", name: "KISSA", ic: "🐱", price: 20 },
  { id: "dog", name: "KOIRA", ic: "🐶", price: 20 },
  { id: "bunny", name: "PUPU", ic: "🐰", price: 30 },
  { id: "fox", name: "KETTU", ic: "🦊", price: 45 },
  { id: "dragon", name: "LOHIKÄÄRME", ic: "🐉", price: 80 },
];
const TRAILS = [
  { id: "steps", name: "ASKEL", ic: "👣", price: 10 },
  { id: "sparkle", name: "KIMALLE", ic: "✨", price: 25 },
  { id: "hearts", name: "SYDÄN", ic: "💖", price: 35 },
  { id: "stars", name: "TÄHTI", ic: "⭐", price: 50 },
  { id: "rainbow", name: "SATEENKAARI", ic: "🌈", price: 70 },
];
const STONE_PRICE = 5;
const owns = id => save.owned.includes(id);

// Itse piirretyt koirat: Aapeli (musta mäyräkoira) ja Muska (jämtlanninpystykorva)
// c = piirtokonteksti, (x,y) = keskikohta, s = koko pikseleinä, dir = 1 oikealle / -1 vasemmalle
function drawDog(c, kind, x, y, s, dir, step) {
  c.save(); c.translate(x, y); c.scale(dir, 1);
  const leg = (lx, ph, len, col) => {
    const sw = Math.sin(step + ph) * s * .06;
    c.strokeStyle = col; c.lineWidth = s * (kind === "jamt" ? .11 : .09); c.lineCap = "round";
    c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx + sw, len); c.stroke();
  };
  if (kind === "dachshund") {
    const B = "#1c1a1a", T = "#b8672a";
    // häntä
    c.strokeStyle = B; c.lineWidth = s * .07; c.lineCap = "round";
    c.beginPath(); c.moveTo(-s * .45, -s * .05); c.quadraticCurveTo(-s * .62, -s * .15, -s * .62, -s * .3); c.stroke();
    // jalat (lyhyet)
    for (const [lx, ph] of [[-s * .32, 0], [-s * .22, Math.PI], [s * .22, Math.PI], [s * .32, 0]]) leg(lx, ph, s * .14, B);
    // pitkä vartalo
    c.fillStyle = B; c.beginPath(); c.ellipse(0, -s * .02, s * .48, s * .15, 0, 0, Math.PI * 2); c.fill();
    // pää ja kuono
    c.beginPath(); c.ellipse(s * .5, -s * .14, s * .15, s * .13, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(s * .66, -s * .1, s * .12, s * .065, .15, 0, Math.PI * 2); c.fill();
    c.fillStyle = T; c.beginPath(); c.ellipse(s * .7, -s * .08, s * .07, s * .04, .15, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * .5, -s * .22, s * .03, 0, Math.PI * 2); c.fill(); // kulmamerkki
    c.fillStyle = "#000"; c.beginPath(); c.arc(s * .78, -s * .11, s * .035, 0, Math.PI * 2); c.fill(); // nenä
    c.fillStyle = "#fff"; c.beginPath(); c.arc(s * .55, -s * .17, s * .03, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#000"; c.beginPath(); c.arc(s * .56, -s * .17, s * .015, 0, Math.PI * 2); c.fill();
    // lerppakorva
    c.fillStyle = "#3a2a20"; c.beginPath(); c.ellipse(s * .43, -s * .06, s * .06, s * .13, .3, 0, Math.PI * 2); c.fill();
    // rinnan ruskea
    c.fillStyle = T; c.beginPath(); c.ellipse(s * .36, s * .06, s * .07, s * .05, 0, 0, Math.PI * 2); c.fill();
  } else {
    const G = "#7d838c", L = "#e9e3d6", D = "#4b5058";
    // kippurahäntä selän päällä
    c.strokeStyle = G; c.lineWidth = s * .12; c.lineCap = "round";
    c.beginPath(); c.arc(-s * .3, -s * .3, s * .13, Math.PI * .2, Math.PI * 1.7); c.stroke();
    c.strokeStyle = L; c.lineWidth = s * .05; c.beginPath(); c.arc(-s * .3, -s * .3, s * .13, Math.PI * .6, Math.PI * 1.4); c.stroke();
    // pitkät jalat
    for (const [lx, ph] of [[-s * .26, 0], [-s * .16, Math.PI], [s * .16, Math.PI], [s * .26, 0]]) leg(lx, ph, s * .26, G);
    // vartalo ja vaalea vatsa
    c.fillStyle = G; c.beginPath(); c.ellipse(0, -s * .05, s * .36, s * .19, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = L; c.beginPath(); c.ellipse(s * .05, s * .06, s * .26, s * .07, 0, 0, Math.PI * 2); c.fill();
    // pää
    c.fillStyle = G; c.beginPath(); c.ellipse(s * .38, -s * .28, s * .16, s * .14, 0, 0, Math.PI * 2); c.fill();
    // pystykorvat
    c.beginPath(); c.moveTo(s * .27, -s * .36); c.lineTo(s * .3, -s * .58); c.lineTo(s * .38, -s * .38); c.fill();
    c.beginPath(); c.moveTo(s * .38, -s * .38); c.lineTo(s * .45, -s * .58); c.lineTo(s * .49, -s * .36); c.fill();
    c.fillStyle = D; c.beginPath(); c.moveTo(s * .3, -s * .39); c.lineTo(s * .31, -s * .52); c.lineTo(s * .36, -s * .4); c.fill();
    // vaalea naamio ja kuono
    c.fillStyle = L; c.beginPath(); c.ellipse(s * .5, -s * .22, s * .11, s * .07, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#000"; c.beginPath(); c.arc(s * .6, -s * .23, s * .035, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * .42, -s * .31, s * .025, 0, Math.PI * 2); c.fill();
    // vaalea rinta
    c.fillStyle = L; c.beginPath(); c.ellipse(s * .3, -s * .08, s * .08, s * .12, 0, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function dogIcon(kind) {
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 48;
  cv.style.width = "40px"; cv.style.height = "30px";
  drawDog(cv.getContext("2d"), kind, 26, 30, 44, 1, 0);
  return cv;
}

// ---------- Kenttä ----------
let W = 0, H = 0, grid = new Uint8Array(0), doorColor = {}, hides = new Set(), lasers = [];
let customLevel = null, level, levelIdx = 0, START = { x: 1.5, y: 1.5 }, GOAL = { x: 1.5, y: 1.5 };
let coins = [], keyItems = [], stoneItems = [], potions = [], levers = [], gates = [], teles = [], ice = new Set();
let gatesOpen = false, leverLock = null, teleLock = null, invis = 0, fx = [];
let player, guards, keysHeld, stones, coinsGot, alarm, everSeen, state = "menu", elapsed = 0, t = 0;
let noises = [], flying = [], pet = null, hist = [], trail = [], trailT = 0;
const RANGE = 4.6, HALF = 32 * DEG, PR = 0.3, CAM_RANGE = 5.5, CAM_HALF = 26 * DEG;

const tileAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? VOID : grid[y * W + x];
const solid = (x, y) => tileAt(x, y) !== FLOOR;
const solidAt = (px, py) => solid(Math.floor(px), Math.floor(py));
const isHide = (px, py) => hides.has(Math.floor(px) + "," + Math.floor(py));

function loadLevel(i) {
  levelIdx = i; level = i < 0 ? customLevel : LEVELS[i];
  H = level.map.length; W = Math.max(...level.map.map(r => r.length));
  grid = new Uint8Array(W * H); doorColor = {}; hides = new Set(); lasers = [];
  coins = []; keyItems = []; stoneItems = []; potions = []; levers = []; gates = []; teles = []; ice = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = level.map[y][x] || " ", c = { x: x + .5, y: y + .5 };
    let v = FLOOR;
    if (ch === "#") v = WALL; else if (ch === " ") v = VOID;
    else if (ch === "@") START = c;
    else if (ch === "G") GOAL = c;
    else if (ch === "o") coins.push({ ...c, got: false });
    else if (ch === "h") hides.add(x + "," + y);
    else if (ch === "s") stoneItems.push({ ...c, got: false });
    else if ("ybr".includes(ch)) keyItems.push({ ...c, color: ch, got: false });
    else if ("YBR".includes(ch)) { v = DOOR; doorColor[y * W + x] = ch.toLowerCase(); }
    else if (ch === "p") potions.push({ ...c, got: false });
    else if (ch === "v") levers.push({ x, y });
    else if (ch === "|") { gates.push({ x, y }); v = GATE; }
    else if (ch === "1" || ch === "2") teles.push({ x, y, id: ch });
    else if (ch === "i") ice.add(x + "," + y);
    else if (ch === "!" || ch === ":") lasers.push({ x, y, phase: ch === "!" ? 0 : 1, horiz: null });
    grid[y * W + x] = v;
  }
  for (const l of lasers) l.horiz = solid(l.x - 1, l.y) && solid(l.x + 1, l.y) ? false : true;
}

function makeGuard(d, camera) {
  let g;
  if (d.patrol) {
    const pts = d.patrol.map(p => [p[0] + .5, p[1] + .5]);
    g = { type: "patrol", x: pts[0][0], y: pts[0][1], dir: 0, pts, idx: 1 % pts.length, wait: .8, mode: "normal" };
  } else {
    const angles = (d.scan || [0]).map(a => a * DEG);
    g = { type: "scan", x: d.x + .5, y: d.y + .5, dir: angles[0], angles, idx: 0, wait: 1, mode: "normal" };
  }
  g.camera = camera; g.dog = !!d.dog;
  g.range = camera ? CAM_RANGE : g.dog ? 3.4 : RANGE;
  g.half = camera ? CAM_HALF : g.dog ? 45 * DEG : HALF;
  g.speed = g.dog ? 2.8 : 1.6;
  return g;
}

function reset() {
  loadLevel(levelIdx);
  player = { x: START.x, y: START.y, face: 0, moving: false, vx: 0, vy: 0 };
  gatesOpen = false; leverLock = null; teleLock = null; invis = 0; fx = [];
  guards = (level.guards || []).map(d => makeGuard(d, false)).concat((level.cameras || []).map(d => makeGuard(d, true)));
  keysHeld = new Set(); stones = 0; coinsGot = 0; pet = null; hist = []; trail = []; trailT = 0; alarm = 0; everSeen = false; elapsed = 0;
  noises = []; flying = [];
  updateHud();
}

// ---------- Ohjaus ----------
const keys = {};
addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
  if (e.key === " " && state === "play") throwStone();
  if (e.key === "Escape" && state === "play") pause();
});
addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
const joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
const canvas = $("c");
canvas.addEventListener("pointerdown", e => {
  if (joy.active) return;
  joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", e => { if (joy.active && e.pointerId === joy.id) { joy.dx = e.clientX - joy.ox; joy.dy = e.clientY - joy.oy; } });
const endJoy = e => { if (e.pointerId === joy.id) { joy.active = false; joy.dx = joy.dy = 0; } };
canvas.addEventListener("pointerup", endJoy);
canvas.addEventListener("pointercancel", endJoy);
const JOY_MAX = 55;
function inputVec() {
  let x = 0, y = 0;
  if (keys["arrowleft"] || keys["a"]) x -= 1;
  if (keys["arrowright"] || keys["d"]) x += 1;
  if (keys["arrowup"] || keys["w"]) y -= 1;
  if (keys["arrowdown"] || keys["s"]) y += 1;
  if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
  if (joy.active) {
    const l = Math.hypot(joy.dx, joy.dy);
    if (l < 8) return { x: 0, y: 0 };
    const m = Math.min(1, l / JOY_MAX);
    return { x: joy.dx / l * m, y: joy.dy / l * m };
  }
  return { x: 0, y: 0 };
}

// ---------- Äänet ----------
let actx = null;
function beep(freqs, dur = .12, type = "square", vol = .08) {
  if (save.sound === false) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    let when = actx.currentTime;
    for (const f of freqs) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(.001, when + dur);
      o.connect(g).connect(actx.destination); o.start(when); o.stop(when + dur);
      when += dur * .9;
    }
  } catch (e) {}
}

// ---------- Apufunktiot ----------
function collides(x, y) {
  return solidAt(x - PR, y - PR) || solidAt(x + PR, y - PR) || solidAt(x - PR, y + PR) || solidAt(x + PR, y + PR);
}
function los(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.08);
  for (let i = 1; i < n; i++) { const k = i / n; if (solidAt(ax + (bx - ax) * k, ay + (by - ay) * k)) return false; }
  return true;
}
const angDiff = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
function turnToward(g, target, speed, dt) {
  const d = angDiff(g.dir, target), s = speed * dt;
  if (Math.abs(d) <= s) { g.dir = target; return true; }
  g.dir += Math.sign(d) * s; return false;
}
// Reitinhaku ruudukossa (vartijat menevät katsomaan ääntä)
function findPath(sx, sy, tx, ty) {
  sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
  if (solid(tx, ty)) return null;
  const prev = new Int32Array(W * H).fill(-1), q = [sy * W + sx]; prev[sy * W + sx] = sy * W + sx;
  while (q.length) {
    const c = q.shift(); if (c === ty * W + tx) break;
    const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
      if (solid(nx, ny) || prev[n] !== -1) continue;
      prev[n] = c; q.push(n);
    }
  }
  if (prev[ty * W + tx] === -1) return null;
  const path = []; let c = ty * W + tx;
  while (c !== sy * W + sx) { path.unshift([c % W + .5, ((c / W) | 0) + .5]); c = prev[c]; }
  if (path.length > 40) return null;
  return path;
}

// ---------- Vartijat ----------
function walkTo(g, tx, ty, speed, dt) {
  const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
  if (d < 0.04) { g.x = tx; g.y = ty; return true; }
  if (!turnToward(g, Math.atan2(dy, dx), 4, dt) && d > 0.3) return false;
  const s = Math.min(d, speed * dt); g.x += dx / d * s; g.y += dy / d * s;
  return false;
}
function updateGuard(g, dt) {
  if (g.mode === "investigate" || g.mode === "return") {
    if (g.path.length) { if (walkTo(g, g.path[0][0], g.path[0][1], g.mode === "investigate" ? g.speed * 1.4 : g.speed, dt)) g.path.shift(); return; }
    if (g.mode === "investigate") {
      g.look -= dt; g.dir += Math.sin(t * 3) * 2.2 * dt;
      if (g.look <= 0) {
        g.mode = "return"; g.path = findPath(g.x, g.y, g.rx, g.ry) || [[g.rx, g.ry]];
      }
      return;
    }
    if (turnToward(g, g.rdir, 3, dt)) { g.mode = "normal"; g.wait = .6; }
    return;
  }
  if (g.wait > 0) { g.wait -= dt; return; }
  if (g.type === "scan") {
    if (turnToward(g, g.angles[g.idx], g.camera ? .9 : 1.3, dt)) { g.idx = (g.idx + 1) % g.angles.length; g.wait = g.camera ? .7 : 1.1; }
  } else {
    const [tx, ty] = g.pts[g.idx];
    if (walkTo(g, tx, ty, g.speed, dt)) { g.idx = (g.idx + 1) % g.pts.length; g.wait = 1; }
  }
}
function alertGuards(nx, ny) {
  for (const g of guards) {
    if (g.camera || Math.hypot(g.x - nx, g.y - ny) > 7.5) continue;
    const path = findPath(g.x, g.y, nx, ny);
    if (!path) continue;
    if (g.mode === "normal") { g.rx = g.x; g.ry = g.y; g.rdir = g.dir; }
    if (g.mode === "return") { /* keep old return point */ }
    g.mode = "investigate"; g.path = path; g.look = 2.2; g.surprise = 1;
  }
}
function guardSees(g) {
  const dx = player.x - g.x, dy = player.y - g.y, d = Math.hypot(dx, dy);
  if (!g.camera && d < 0.7) return 2; // törmäys
  if (invis > 0 || isHide(player.x, player.y)) return 0;
  if (d > g.range) return 0;
  if (Math.abs(angDiff(g.dir, Math.atan2(dy, dx))) > g.half) return 0;
  return los(g.x, g.y, player.x, player.y) ? 1 : 0;
}

// ---------- Laserit ----------
const LASER_ON = 2.2;
const laserOn = l => (Math.floor(t / LASER_ON) % 2) === l.phase;

// ---------- Kivi ----------
function throwStone() {
  if (state !== "play" || stones + save.bag <= 0) return;
  if (stones > 0) stones--; else { save.bag--; store(); }
  if (stat("thrown") >= 10) medal("thrower");
  const cx = Math.cos(player.face), cy = Math.sin(player.face);
  let d = 0; while (d < 4.5 && !solidAt(player.x + cx * (d + .2), player.y + cy * (d + .2))) d += .1;
  const tx = player.x + cx * d, ty = player.y + cy * d;
  flying.push({ sx: player.x, sy: player.y, tx, ty, k: 0 });
  beep([500], .05, "triangle", .06);
  updateHud();
}

// ---------- Päivitys ----------
function update(dt) {
  t += dt;
  if (state !== "play") return;
  elapsed += dt;
  const v = inputVec(), sp = 3.4;
  player.moving = !!(v.x || v.y);
  if (player.moving) {
    hist.push([player.x, player.y]); if (hist.length > 40) hist.shift();
    trailT -= dt;
    if (save.trail !== "none" && trailT <= 0) { trailT = .14; trail.push({ x: player.x, y: player.y + .2, life: 1 }); }
  }
  for (const p of trail) p.life -= dt / 1.4;
  trail = trail.filter(p => p.life > 0);
  if (save.pet !== "none") {
    if (!pet) pet = { x: player.x - .6, y: player.y + .3 };
    const tg = hist.length > 10 ? hist[hist.length - 10] : null;
    if (tg) {
      const ddx = (tg[0] - pet.x) * Math.min(1, dt * 6);
      pet.x += ddx; pet.y += (tg[1] - pet.y) * Math.min(1, dt * 6);
      if (Math.abs(ddx) > .002) pet.face = ddx > 0 ? 1 : -1;
      pet.step = (pet.step || 0) + Math.hypot(ddx, tg[1] - pet.y) * 40;
    }
  }
  if (player.moving) player.face = Math.atan2(v.y, v.x);
  const onIce = ice.has(Math.floor(player.x) + "," + Math.floor(player.y));
  if (onIce) {
    // liukas: ohjaus ja pysähtyminen hitaita, mutta hahmo pysähtyy aina itsestään
    const k = Math.min(1, dt * 1.6);
    player.vx += (v.x * sp - player.vx) * k; player.vy += (v.y * sp - player.vy) * k;
    if (Math.hypot(player.vx, player.vy) > 0.05) player.moving = true;
  } else { player.vx = v.x * sp; player.vy = v.y * sp; }
  const nx = player.x + player.vx * dt; if (!collides(nx, player.y)) player.x = nx; else player.vx = 0;
  const ny = player.y + player.vy * dt; if (!collides(player.x, ny)) player.y = ny; else player.vy = 0;
  if (invis > 0) invis = Math.max(0, invis - dt);
  for (const f of fx) f.life -= dt;
  fx = fx.filter(f => f.life > 0);

  // lentävät kivet
  for (const f of flying) {
    f.k += dt / .35;
    if (f.k >= 1 && !f.done) { f.done = true; noises.push({ x: f.tx, y: f.ty, r: 0 }); alertGuards(f.tx, f.ty); beep([180, 140], .08, "square", .07); }
  }
  flying = flying.filter(f => !f.done);
  for (const n of noises) n.r += dt * 6;
  noises = noises.filter(n => n.r < 7.5);

  let seen = false;
  for (const g of guards) {
    updateGuard(g, dt);
    if (g.surprise) g.surprise = Math.max(0, g.surprise - dt);
    const s = guardSees(g); g.sees = s > 0;
    if (s === 2) return caught("💥 TÖRMÄSIT VARTIJAAN.");
    if (s) seen = true;
  }
  if (seen) everSeen = true;
  alarm = seen ? alarm + dt / 0.35 : Math.max(0, alarm - dt);
  if (alarm >= 1) return caught("👀 VARTIJA NÄKI SINUT.");

  for (const l of lasers) {
    if (!laserOn(l)) continue;
    const cx = l.x + .5, cy = l.y + .5;
    const hit = l.horiz ? Math.abs(player.y - cy) < PR + .06 && Math.abs(player.x - cx) < .5 + PR
                        : Math.abs(player.x - cx) < PR + .06 && Math.abs(player.y - cy) < .5 + PR;
    if (hit) return caught("🔴 OSUIT LASERIIN.");
  }

  for (const c of coins) if (!c.got && Math.hypot(player.x - c.x, player.y - c.y) < .6) {
    c.got = true; coinsGot++; beep([988, 1319], .07, "square", .06); updateHud();
  }
  for (const k of keyItems) if (!k.got && Math.hypot(player.x - k.x, player.y - k.y) < .7) {
    k.got = true; keysHeld.add(k.color); beep([660, 880, 1320], .1); toast("🔑 SAIT AVAIMEN!"); updateHud();
  }
  for (const s of stoneItems) if (!s.got && Math.hypot(player.x - s.x, player.y - s.y) < .6) {
    s.got = true; stones++; beep([300, 400], .06, "triangle", .07); updateHud();
    if (!save.seenStoneTip) { save.seenStoneTip = true; store(); toast("🪨 PAINA HEITÄ!"); }
  }
  const ptile = Math.floor(player.x) + "," + Math.floor(player.y);
  for (const p of potions) if (!p.got && Math.hypot(player.x - p.x, player.y - p.y) < .6) {
    p.got = true; invis = 6; medal("potion"); beep([800, 600, 1000], .1, "sine", .1); toast("🧪 NÄKYMÄTÖN!");
  }
  const lv = levers.find(l => l.x + "," + l.y === ptile);
  if (lv && leverLock !== ptile) { leverLock = ptile; toggleGates(); }
  if (!lv) leverLock = null;
  const tp = teles.find(q => q.x + "," + q.y === ptile);
  if (tp && teleLock !== ptile) {
    const other = teles.find(q => q.id === tp.id && q !== tp);
    if (other) {
      fx.push({ x: player.x, y: player.y, life: .5 });
      player.x = other.x + .5; player.y = other.y + .5; player.vx = player.vy = 0; teleLock = other.x + "," + other.y; hist = [];
      fx.push({ x: player.x, y: player.y, life: .5 }); beep([400, 800, 1200], .06, "sine", .1); medal("jump");
    }
  }
  if (!tp) teleLock = null;
  // ovet aukeavat kun avain mukana
  const px = Math.floor(player.x), py = Math.floor(player.y);
  for (let yy = py - 1; yy <= py + 1; yy++) for (let xx = px - 1; xx <= px + 1; xx++) {
    const idx = yy * W + xx;
    if (tileAt(xx, yy) === DOOR && keysHeld.has(doorColor[idx]) && Math.hypot(player.x - xx - .5, player.y - yy - .5) < 1.3) {
      openDoor(xx, yy, doorColor[idx]);
    }
  }
  if (Math.hypot(player.x - GOAL.x, player.y - GOAL.y) < 0.7) win();
  if (Math.floor(elapsed) !== Math.floor(elapsed - dt)) updateHud();
}
function toggleGates() {
  if (gatesOpen) {
    const blocked = gates.some(q => (Math.abs(player.x - q.x - .5) < .5 + PR && Math.abs(player.y - q.y - .5) < .5 + PR) ||
      guards.some(g => Math.floor(g.x) === q.x && Math.floor(g.y) === q.y));
    if (blocked) return;
  }
  gatesOpen = !gatesOpen; medal("gate");
  for (const q of gates) grid[q.y * W + q.x] = gatesOpen ? FLOOR : GATE;
  beep(gatesOpen ? [200, 300] : [300, 200], .1, "square", .08);
  toast(gatesOpen ? "🎚️ PORTTI AUKI!" : "🎚️ PORTTI KIINNI!");
}
function openDoor(x, y, color) {
  // avaa koko yhtenäisen oven
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop(), i = cy * W + cx;
    if (tileAt(cx, cy) !== DOOR || doorColor[i] !== color) continue;
    grid[i] = FLOOR;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  beep([300, 450, 600], .12, "triangle", .12);
}

// ---------- Käyttöliittymä ----------
const fmt = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
let toastTimer = 0;
function toast(msg) { const el = $("toast"); el.textContent = msg; el.style.display = "block"; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.style.display = "none", 2200); }
function updateHud() {
  $("hLevel").textContent = (levelIdx < 0 ? "🎨 " : (levelIdx + 1) + ". ") + level.name;
  $("hCoins").textContent = "🪙 " + coinsGot + "/" + coins.length;
  const ks = [...new Set(keyItems.map(k => k.color))];
  $("hKeys").style.display = ks.length ? "" : "none";
  $("hKeys").innerHTML = ks.map(c => `<span style="background:${KEY_COLORS[c]};border-radius:6px;padding:0 3px;margin:0 1px;${keysHeld.has(c) ? "" : "opacity:.25"}">🔑</span>`).join("");
  $("hTime").textContent = fmt(elapsed);
  const tb = $("throwBtn");
  const st = stones + save.bag;
  tb.classList.toggle("show", state === "play" && (st > 0 || stoneItems.length > 0));
  tb.textContent = "🪨 HEITÄ " + st;
  tb.disabled = st <= 0; tb.style.opacity = st > 0 ? 1 : .4;
}
const SCREENS = ["menuScreen", "levelsScreen", "introScreen", "pauseScreen", "caughtScreen", "winScreen", "wardrobeScreen", "helpScreen", "shopScreen", "editorScreen", "medalScreen"];
function show(id) {
  for (const s of SCREENS) $(s).classList.toggle("show", s === id);
  $("hud").classList.toggle("show", !["menuScreen", "levelsScreen", "wardrobeScreen", "helpScreen", "shopScreen", "editorScreen", "medalScreen"].includes(id));
  $("throwBtn").classList.toggle("show", false);
  $("rotateHint").classList.toggle("on", !id);
}
function goMenu() {
  state = "menu"; show("menuScreen");
  $("menuStats").textContent = "⭐ " + totalStars() + "/" + LEVELS.length * 3 + "   🪙 " + save.wallet + "   🏆 " + totalScore();
}
function goLevels() {
  state = "menu"; show("levelsScreen");
  const g = $("levelGrid"); g.innerHTML = "";
  LEVELS.forEach((L, i) => {
    const b = document.createElement("button"), open = unlockedLevel(i), s = starsOf(i);
    b.className = "lvl" + (open ? "" : " locked");
    b.innerHTML = open ? `${i + 1}<small>${"★".repeat(s)}${"☆".repeat(3 - s)}</small><span class="nm">${L.name}</span>` : "🔒";
    if (open) b.onclick = () => openLevel(i);
    g.appendChild(b);
  });
}
function openLevel(i) {
  levelIdx = i; reset(); state = "intro";
  $("introTitle").textContent = (i < 0 ? "🎨 " : (i + 1) + ". ") + level.name;
  $("introText").textContent = level.intro || "";
  show("introScreen");
}
let wakeLock = null;
async function keepAwake() { try { if ("wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => wakeLock = null); } } catch (e) {} }
function startPlay() { show(null); state = "play"; updateHud(); beep([1], .01, "sine", 0.0001); keepAwake(); }
function pause() { if (state !== "play") return; state = "pause"; show("pauseScreen"); }
function caught(msg) {
  if (stat("caught") >= 20) medal("brave");
  state = "caught"; beep([400, 300, 200], .18, "sawtooth", .1);
  try { navigator.vibrate && navigator.vibrate(250); } catch (e) {}
  $("caughtText").textContent = msg;
  show("caughtScreen");
}
function win() {
  state = "win"; beep([523, 659, 784, 1047], .15, "triangle", .12);
  const before = totalStars();
  const allCoins = coinsGot === coins.length, stealth = !everSeen;
  const par = level.par || 60, timeBonus = Math.max(0, Math.round((par - elapsed) * 3));
  const score = 100 + coinsGot * 10 + (allCoins ? 50 : 0) + (stealth ? 100 : 0) + timeBonus;
  const custom = levelIdx < 0;
  const s = custom ? { best: 0 } : lvlSave(levelIdx);
  const newBest = !custom && score > s.best;
  if (!custom) save.wallet += coinsGot;
  s.done = true; s.coins = s.coins || allCoins; s.stealth = s.stealth || stealth; s.best = Math.max(s.best, score);
  store();
  const st = [true, allCoins, stealth];
  $("winStars").innerHTML = st.map(x => `<span class="${x ? "" : "star-off"}">⭐</span>`).join("");
  $("winScore").innerHTML =
    `<div>🏁 100</div><div>🪙 ${coinsGot}/${coins.length}: ${coinsGot * 10 + (allCoins ? 50 : 0)}</div>` +
    `<div>🙈 ${stealth ? "100" : "0"}</div><div>⏱️ ${fmt(elapsed)}: ${timeBonus}</div>` +
    `<div><b>= ${score}${newBest ? " 🏆 ENNÄTYS!" : ""}</b></div>`;
  const after = totalStars();
  winMedals = [];
  medal("first");
  if (stealth) medal("ninja");
  if (elapsed < 30) medal("fast");
  if (custom) medal("builder");
  if (stat("coinsTotal", custom ? 0 : coinsGot) >= 100) medal("rich");
  if (after >= 30) medal("stars30");
  if (after >= LEVELS.length * 3) medal("allstars");
  if (LEVELS.every((_, i) => save.levels[i] && save.levels[i].done)) medal("master");
  const unlocked = COLORS.concat(HATS).filter(u => u.need > before && u.need <= after);
  $("winExtra").textContent = (coinsGot && !custom ? "+" + coinsGot + " 🪙  " : "") + (unlocked.length ? "🎁 UUTTA: " + unlocked.map(u => u.name).join(", ") : "");
  $("nextBtn").style.display = !custom && levelIdx < LEVELS.length - 1 ? "" : "none";
  if (levelIdx === LEVELS.length - 1) $("winExtra").textContent += " 🏆 KAIKKI KENTÄT!";
  if (winMedals.length) { $("winExtra").textContent += "  🏅 " + winMedals.join(", "); beep([784, 988, 1175, 1568], .1, "triangle", .1); }
  show("winScreen");
}
let shopReturn = null;
function goShop(ret) {
  if (ret !== undefined) shopReturn = ret;
  state = "menu"; show("shopScreen");
  $("shopBack").textContent = shopReturn === "next" ? "SEURAAVA →" : "←";
  $("shopWallet").textContent = "🪙 " + save.wallet;
  const build = (list, el, key) => {
    el.innerHTML = "";
    for (const u of list) {
      const b = document.createElement("button"), have = owns(u.id);
      b.className = "item" + (save[key] === u.id ? " sel" : "");
      b.innerHTML = `<span class="ic">${u.ic || ""}</span><span>${have ? u.name : "🪙 " + u.price}</span>`;
      if (u.draw) { const ic = b.querySelector(".ic"); ic.appendChild(dogIcon(u.draw)); if (!have) b.lastChild.textContent = u.name + " 🪙" + u.price; }
      b.onclick = () => {
        if (have) save[key] = save[key] === u.id ? "none" : u.id;
        else if (save.wallet >= u.price) { save.wallet -= u.price; save.owned.push(u.id); save[key] = u.id; beep([660, 990], .08); if (key === "pet") medal("pet"); }
        else { toast("🪙 " + (u.price - save.wallet) + " PUUTTUU"); return; }
        store(); goShop();
      };
      el.appendChild(b);
    }
  };
  build(PETS, $("shopPets"), "pet");
  build(TRAILS, $("shopTrails"), "trail");
  const bag = $("shopBag"); bag.innerHTML = "";
  const b = document.createElement("button"); b.className = "item";
  b.innerHTML = `<span class="ic">🪨</span><span>🪙 ${STONE_PRICE}</span>`;
  b.onclick = () => {
    if (save.wallet < STONE_PRICE) { toast("🪙 " + (STONE_PRICE - save.wallet) + " PUUTTUU"); return; }
    save.wallet -= STONE_PRICE; save.bag++; store(); beep([300, 400], .06, "triangle"); goShop();
  };
  bag.appendChild(b);
  const have = document.createElement("div"); have.className = "item"; have.style.border = "none";
  have.innerHTML = `<span class="ic">🎒</span><span>${save.bag}</span>`; bag.appendChild(have);
}
function goWardrobe() {
  state = "menu"; show("wardrobeScreen");
  const n = totalStars();
  $("wardStars").textContent = "SINULLA ON ⭐ " + n;
  const build = (list, el, key, render) => {
    el.innerHTML = "";
    for (const u of list) {
      const b = document.createElement("button"), open = n >= u.need;
      b.className = "item" + (save[key] === u.id ? " sel" : "") + (open ? "" : " locked");
      b.innerHTML = open ? render(u) + `<span>${u.name}</span>` : `<span class="ic">🔒</span><span>⭐ ${u.need}</span>`;
      if (open) b.onclick = () => { save[key] = u.id; store(); goWardrobe(); };
      el.appendChild(b);
    }
  };
  build(COLORS, $("wardColors"), "color", u => `<span class="swatch" style="background:${u.fill === "rainbow" ? "linear-gradient(90deg,red,orange,yellow,green,blue,violet)" : u.fill}"></span>`);
  build(HATS, $("wardHats"), "hat", u => `<span class="ic">${u.ic}</span>`);
}

$("playBtn").onclick = () => {
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {})).catch(() => {}); } catch (e) {}
  goLevels();
};
$("wardrobeBtn").onclick = goWardrobe;
$("shopBtn").onclick = () => goShop(null);
$("winShopBtn").onclick = () => goShop(levelIdx >= 0 && levelIdx < LEVELS.length - 1 ? "next" : "levels");
$("shopBack").onclick = () => { const r = shopReturn; shopReturn = null; if (r === "next") openLevel(levelIdx + 1); else if (r === "levels") goBack(); else goMenu(); };
$("helpBtn").onclick = () => show("helpScreen");
function goMedals() {
  state = "menu"; show("medalScreen");
  const got = save.medals || [];
  $("medalCount").textContent = "🏅 " + got.length + "/" + MEDALS.length;
  const g = $("medalGrid"); g.innerHTML = "";
  for (const m of MEDALS) {
    const d = document.createElement("div"), has = got.includes(m.id);
    d.className = "item" + (has ? " sel" : " locked");
    d.innerHTML = `<span class="ic">${has ? m.ic : "❔"}</span><span>${m.name}</span>`;
    g.appendChild(d);
  }
}
$("medalBtn").onclick = goMedals;
function soundLabel() { $("soundBtn").textContent = save.sound === false ? "🔇" : "🔊"; }
$("soundBtn").onclick = () => { save.sound = save.sound === false; store(); soundLabel(); beep([660], .08); };
soundLabel();
$("introGo").onclick = startPlay;
$("pauseBtn").onclick = pause;
$("resumeBtn").onclick = () => { show(null); state = "play"; updateHud(); keepAwake(); };
$("restartBtn").onclick = () => { reset(); startPlay(); };
$("retryBtn").onclick = () => { reset(); startPlay(); };
$("againBtn").onclick = () => { reset(); startPlay(); };
$("nextBtn").onclick = () => openLevel(levelIdx + 1);
$("throwBtn").addEventListener("pointerdown", e => { e.stopPropagation(); throwStone(); });
function goBack() { if (levelIdx < 0 && window.openEditor) window.openEditor(); else goLevels(); }
document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => b.dataset.go === "menu" ? goMenu() : goBack());
// Oman kentän pelaaminen (editori kutsuu tätä). Kenttä on samaa muotoa kuin LEVELS-taulukon kentät.
function playCustom(L) { customLevel = L; openLevel(-1); }
$("editorBtn").onclick = () => { if (window.openEditor) window.openEditor(); };
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

// ---------- Piirto ----------
const ctx = canvas.getContext("2d");
let ts = 30, camX = 0, camY = 0, vw = 0, vh = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  vw = innerWidth; vh = innerHeight;
  canvas.width = vw * dpr; canvas.height = vh * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);

function label(text, x, y, size = 0.42, color = RED) {
  ctx.font = `bold ${Math.round(ts * size)}px "Comic Sans MS", "Comic Neue", system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = ts * .12; ctx.strokeStyle = "rgba(251,247,239,.9)"; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function emoji(e, x, y, size) {
  ctx.font = `${Math.round(ts * size)}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y);
}
function visionPoly(g) {
  const range = g.range, half = g.half;
  const pts = [[g.x, g.y]], N = 36;
  for (let i = 0; i <= N; i++) {
    const a = g.dir - half + (2 * half) * i / N, cx = Math.cos(a), cy = Math.sin(a);
    let d = 0;
    while (d < range) { d += 0.06; if (solidAt(g.x + cx * d, g.y + cy * d)) break; }
    pts.push([g.x + cx * Math.min(d, range), g.y + cy * Math.min(d, range)]);
  }
  return pts;
}
function drawKey(x, y, color, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.5);
  ctx.strokeStyle = "#5a3a00"; ctx.lineWidth = s * .06; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(-s * .22, 0, s * .17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-s * .22, 0, s * .06, 0, Math.PI * 2); ctx.fillStyle = "#fbf7ef"; ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(-s * .06, -s * .05, s * .4, s * .1); ctx.strokeRect(-s * .06, -s * .05, s * .4, s * .1);
  ctx.fillRect(s * .2, s * .05, s * .07, s * .1); ctx.fillRect(s * .3, s * .05, s * .05, s * .14);
  ctx.restore();
}
function playerColor() {
  const c = COLORS.find(c => c.id === save.color) || COLORS[0];
  if (c.fill === "rainbow") return { fill: `hsl(${(t * 90) % 360},85%,58%)`, line: "#333" };
  return c;
}
function drawPlayer(X, Y, r, alpha) {
  const col = playerColor();
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(X, Y);
  const wob = player.moving ? Math.sin(t * 14) * r * .08 : 0;
  ctx.beginPath();
  ctx.moveTo(-r * 1.15, r * .95);
  ctx.quadraticCurveTo(-r * 1.2, -r * 1.3, r * .15, -r * 1.05 + wob);
  ctx.quadraticCurveTo(r * 1.4, -r * .8, r * 1.0, r * .7);
  ctx.quadraticCurveTo(r * .2, r * 1.15, -r * .5, r * .55);
  ctx.closePath();
  ctx.fillStyle = col.fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col.line; ctx.stroke();
  if (save.color === "ninja") { ctx.fillStyle = "#d62828"; ctx.fillRect(-r * .95, -r * .55, r * 1.95, r * .2); }
  const ex = Math.cos(player.face) * r * .07, ey = Math.sin(player.face) * r * .07;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(s * r * .35, -r * .25, r * .16, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(s * r * .35 + ex, -r * .25 + ey, r * .08, 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
  }
  const hat = HATS.find(h => h.id === save.hat);
  if (hat && hat.id !== "none") {
    if (hat.id === "glasses") emoji(hat.ic, 0, -r * .2, .42);
    else emoji(hat.ic, r * .1, -r * 1.25 + wob, hat.id === "bow" || hat.id === "flower" ? .38 : .5);
  }
  ctx.restore();
}

function draw() {
  ctx.fillStyle = "#fbf7ef"; ctx.fillRect(0, 0, vw, vh);
  if (!level) return;
  ts = Math.max(Math.min(vw / W, (vh - 44) / H), Math.min(26, Math.min(vw, vh) / 12));
  const mw = W * ts, mh = H * ts;
  camX = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, player.x * ts - vw / 2));
  camY = mh <= vh - 40 ? (mh - vh) / 2 - 20 : Math.max(-44, Math.min(mh - vh, player.y * ts - vh / 2));
  ctx.save(); ctx.translate(-camX, -camY);

  ctx.strokeStyle = "rgba(120,150,200,.12)"; ctx.lineWidth = 1;
  for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * ts); ctx.lineTo(mw, y * ts); ctx.stroke(); }

  // pensaat (alla)
  for (const k of hides) {
    const [x, y] = k.split(",").map(Number), X = x * ts, Y = y * ts;
    ctx.fillStyle = "#8fd18f";
    for (const [ox, oy, rr] of [[.3, .35, .3], [.7, .35, .3], [.5, .65, .33], [.25, .7, .25], [.75, .7, .25]]) {
      ctx.beginPath(); ctx.arc(X + ox * ts, Y + oy * ts, rr * ts, 0, Math.PI * 2); ctx.fill();
    }
  }

  // jää ja teleportit
  for (const k of ice) {
    const [x, y] = k.split(",").map(Number);
    ctx.fillStyle = "#cdeefe"; ctx.fillRect(x * ts, y * ts, ts, ts);
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x * ts + ts * .2, y * ts + ts * .7); ctx.lineTo(x * ts + ts * .5, y * ts + ts * .4); ctx.stroke();
  }
  for (const q of teles) {
    const X = (q.x + .5) * ts, Y = (q.y + .5) * ts;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(t * 2 * (q.id === "1" ? 1 : -1));
    ctx.strokeStyle = q.id === "1" ? "#8a4dff" : "#00a3a3"; ctx.lineWidth = ts * .1;
    ctx.beginPath(); ctx.arc(0, 0, ts * .36, 0, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, ts * .2, Math.PI, Math.PI * 2.6); ctx.stroke();
    ctx.restore();
  }
  // liikkuvien vartijoiden reitit katkoviivana
  ctx.save(); ctx.setLineDash([ts * .15, ts * .2]); ctx.lineWidth = Math.max(2, ts * .08);
  for (const g of guards) if (g.type === "patrol" && !g.camera) {
    ctx.strokeStyle = g.dog ? "rgba(160,100,40,.45)" : "rgba(124,58,237,.4)";
    ctx.beginPath(); ctx.moveTo(g.pts[0][0] * ts, g.pts[0][1] * ts);
    for (const q of g.pts) ctx.lineTo(q[0] * ts, q[1] * ts);
    if (g.pts.length > 2) ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
  // näköalueet
  for (const g of guards) {
    const p = visionPoly(g);
    ctx.beginPath(); ctx.moveTo(p[0][0] * ts, p[0][1] * ts);
    for (const q of p) ctx.lineTo(q[0] * ts, q[1] * ts);
    ctx.closePath();
    ctx.fillStyle = g.sees ? "rgba(255,60,40,.35)" : g.camera ? "rgba(120,200,255,.28)" : "rgba(255,200,0,.28)"; ctx.fill();
  }

  // seinät
  const isWall = (x, y) => tileAt(x, y) === WALL;
  ctx.fillStyle = "#f8dcd6";
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isWall(x, y)) ctx.fillRect(x * ts - .5, y * ts - .5, ts + 1, ts + 1);
  ctx.strokeStyle = RED; ctx.lineWidth = Math.max(2, ts * .13); ctx.lineCap = "round"; ctx.beginPath();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isWall(x, y)) continue;
    const X = x * ts, Y = y * ts;
    if (!isWall(x, y - 1)) { ctx.moveTo(X, Y); ctx.lineTo(X + ts, Y); }
    if (!isWall(x, y + 1)) { ctx.moveTo(X, Y + ts); ctx.lineTo(X + ts, Y + ts); }
    if (!isWall(x - 1, y)) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + ts); }
    if (!isWall(x + 1, y)) { ctx.moveTo(X + ts, Y); ctx.lineTo(X + ts, Y + ts); }
  }
  ctx.stroke();

  // ovet
  for (const i in doorColor) {
    const x = i % W, y = (i / W) | 0;
    if (tileAt(x, y) !== DOOR) continue;
    const c = KEY_COLORS[doorColor[i]];
    ctx.fillStyle = c; ctx.globalAlpha = .85; ctx.fillRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4); ctx.globalAlpha = 1;
    ctx.strokeStyle = "#5c2c10"; ctx.lineWidth = 2; ctx.strokeRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4);
    emoji("🔒", (x + .5) * ts, (y + .5) * ts, .5);
  }

  // portit ja vivut
  for (const q of gates) {
    const X = q.x * ts, Y = q.y * ts;
    ctx.strokeStyle = gatesOpen ? "rgba(90,90,100,.25)" : "#4a4a55"; ctx.lineWidth = gatesOpen ? 2 : ts * .1;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) { ctx.moveTo(X + ts * i / 4, Y + 2); ctx.lineTo(X + ts * i / 4, Y + ts - 2); }
    if (!gatesOpen) { ctx.moveTo(X + 2, Y + ts * .3); ctx.lineTo(X + ts - 2, Y + ts * .3); ctx.moveTo(X + 2, Y + ts * .7); ctx.lineTo(X + ts - 2, Y + ts * .7); }
    ctx.stroke();
  }
  for (const l of levers) {
    const X = (l.x + .5) * ts, Y = (l.y + .5) * ts, a = gatesOpen ? .6 : -.6;
    ctx.fillStyle = "#777"; ctx.fillRect(X - ts * .25, Y + ts * .1, ts * .5, ts * .2);
    ctx.strokeStyle = "#333"; ctx.lineWidth = ts * .08; ctx.beginPath(); ctx.moveTo(X, Y + ts * .15);
    ctx.lineTo(X + Math.sin(a) * ts * .4, Y + ts * .15 - Math.cos(a) * ts * .4); ctx.stroke();
    ctx.beginPath(); ctx.arc(X + Math.sin(a) * ts * .4, Y + ts * .15 - Math.cos(a) * ts * .4, ts * .1, 0, Math.PI * 2);
    ctx.fillStyle = gatesOpen ? "#2fb35a" : RED; ctx.fill();
  }
  for (const p of potions) if (!p.got) emoji("🧪", p.x * ts, (p.y + Math.sin(t * 4) * .06) * ts, .6);
  for (const f of fx) { ctx.beginPath(); ctx.arc(f.x * ts, f.y * ts, (1 - f.life / .5) * ts, 0, Math.PI * 2); ctx.strokeStyle = `rgba(138,77,255,${f.life * 2})`; ctx.lineWidth = 3; ctx.stroke(); }
  // laserit
  for (const l of lasers) {
    const on = laserOn(l), X = l.x * ts, Y = l.y * ts;
    ctx.save();
    ctx.strokeStyle = on ? "#ff1744" : "rgba(255,23,68,.25)"; ctx.lineWidth = on ? ts * .14 : 2;
    if (!on) ctx.setLineDash([4, 5]);
    ctx.beginPath();
    if (l.horiz) { ctx.moveTo(X, Y + ts / 2); ctx.lineTo(X + ts, Y + ts / 2); } else { ctx.moveTo(X + ts / 2, Y); ctx.lineTo(X + ts / 2, Y + ts); }
    ctx.stroke();
    if (on) { ctx.strokeStyle = "rgba(255,23,68,.25)"; ctx.lineWidth = ts * .45; ctx.stroke(); }
    ctx.restore();
  }

  // kolikot, kivet, avaimet, maali
  for (const c of coins) if (!c.got) {
    const sq = Math.abs(Math.cos(t * 3 + c.x));
    ctx.beginPath(); ctx.ellipse(c.x * ts, c.y * ts, ts * .22 * sq + 1, ts * .22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffcc22"; ctx.fill(); ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 2; ctx.stroke();
  }
  for (const s of stoneItems) if (!s.got) {
    ctx.beginPath(); ctx.ellipse(s.x * ts, s.y * ts, ts * .2, ts * .15, .3, 0, Math.PI * 2);
    ctx.fillStyle = "#8a8f99"; ctx.fill(); ctx.strokeStyle = "#444"; ctx.lineWidth = 2; ctx.stroke();
  }
  for (const k of keyItems) if (!k.got) drawKey(k.x * ts, (k.y + Math.sin(t * 3) * .1) * ts, KEY_COLORS[k.color], ts * 1.1);
  emoji("🏁", GOAL.x * ts, GOAL.y * ts, .8);
  label("MAALI", GOAL.x * ts, (GOAL.y - .85) * ts, .34);

  // äänet ja kivet
  for (const n of noises) {
    ctx.beginPath(); ctx.arc(n.x * ts, n.y * ts, n.r * ts, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(90,90,110,${Math.max(0, .5 - n.r / 15)})`; ctx.lineWidth = 3; ctx.stroke();
  }
  for (const f of flying) {
    const k = Math.min(1, f.k), x = f.sx + (f.tx - f.sx) * k, y = f.sy + (f.ty - f.sy) * k - Math.sin(k * Math.PI) * .8;
    ctx.beginPath(); ctx.arc(x * ts, y * ts, ts * .13, 0, Math.PI * 2); ctx.fillStyle = "#666"; ctx.fill();
  }

  // vartijat ja kamerat
  for (const g of guards) {
    const X = g.x * ts, Y = g.y * ts, r = ts * .4;
    if (g.camera) {
      ctx.save(); ctx.translate(X, Y); ctx.rotate(g.dir);
      ctx.fillStyle = "#4a5568"; ctx.fillRect(-r * .8, -r * .45, r * 1.3, r * .9);
      ctx.fillStyle = "#222"; ctx.fillRect(r * .5, -r * .3, r * .4, r * .6);
      ctx.restore();
      ctx.beginPath(); ctx.arc(X, Y, r * .18, 0, Math.PI * 2); ctx.fillStyle = (t % 1 < .5) ? "#ff3030" : "#600"; ctx.fill();
      if (g.sees) label("!", X, Y - ts * .8, .7);
      continue;
    }
    if (g.dog) {
      ctx.save(); ctx.translate(X, Y); if (Math.cos(g.dir) > 0) ctx.scale(-1, 1);
      emoji("🐕", 0, Math.sin(t * 16) * ts * .03, .85); ctx.restore();
      if (g.sees) label("!", X, Y - ts * .8, .8);
      else if (g.mode === "investigate") label("?", X, Y - ts * .8, .7, "#555");
      else label("KOIRA", X, Y - ts * .65, .26);
      continue;
    }
    const walker = g.type === "patrol";
    if (walker) {
      // jalat heiluvat
      const sw = Math.sin(t * 12) * r * .35, px = -Math.sin(g.dir), py = Math.cos(g.dir);
      for (const s2 of [-1, 1]) {
        const fx2 = X + px * s2 * r * .45 + Math.cos(g.dir) * sw * s2, fy2 = Y + py * s2 * r * .45 + Math.sin(g.dir) * sw * s2;
        ctx.beginPath(); ctx.ellipse(fx2, fy2, r * .3, r * .2, g.dir, 0, Math.PI * 2); ctx.fillStyle = "#3b1d6e"; ctx.fill();
      }
    }
    ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fillStyle = walker ? "#7c3aed" : RED; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = walker ? "#3b1d6e" : "#8f1414"; ctx.stroke();
    if (!walker) { // paikallaan: lakki
      ctx.beginPath(); ctx.arc(X, Y, r * .45, 0, Math.PI * 2); ctx.fillStyle = "#8f1414"; ctx.fill();
    }
    for (const s of [-1, 1]) {
      const ea = g.dir + s * .55, ex = X + Math.cos(ea) * r * .55, ey = Y + Math.sin(ea) * r * .55;
      ctx.beginPath(); ctx.arc(ex, ey, r * .22, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.beginPath(); ctx.arc(ex + Math.cos(g.dir) * r * .08, ey + Math.sin(g.dir) * r * .08, r * .11, 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
    }
    if (g.sees) label("!", X, Y - ts * .85, .8);
    else if (g.mode === "investigate") label("?", X, Y - ts * .85, .7, "#555");
    else label(walker ? "KÄVELEE" : "VAHTII", X, Y - ts * .7, .28, walker ? "#5b21b6" : RED);
  }

  // jälki ja lemmikki
  const tr = TRAILS.find(x => x.id === save.trail);
  if (tr) for (const p of trail) { ctx.globalAlpha = Math.max(0, p.life) * .8; emoji(tr.ic, p.x * ts, p.y * ts, .32); }
  ctx.globalAlpha = 1;
  const pt = PETS.find(x => x.id === save.pet);
  if (pt && pet) {
    if (pt.draw) {
      drawDog(ctx, pt.draw, pet.x * ts, (pet.y + .1) * ts, ts * .95, pet.face || 1, pet.step || 0);
      label(pt.name, pet.x * ts, (pet.y + .62) * ts, .26, "#5a2a2a");
    } else emoji(pt.ic, pet.x * ts, (pet.y + Math.sin(t * 8) * .04) * ts, .55);
  }
  // pelaaja
  {
    const X = player.x * ts, Y = player.y * ts, hidden = isHide(player.x, player.y);
    drawPlayer(X, Y, ts * .36, invis > 0 ? .3 + .1 * Math.sin(t * 10) : hidden ? .45 : 1);
    label(invis > 0 ? "🧪 " + Math.ceil(invis) : hidden ? "PIILOSSA" : "MÄ", X, Y - ts * .9, hidden || invis > 0 ? .32 : .4, "#1a3f99");
  }
  ctx.restore();
  if (level.dark) drawDark();

  if (alarm > 0 && state === "play") { ctx.fillStyle = "rgba(214,40,40," + (alarm * .25) + ")"; ctx.fillRect(0, 0, vw, vh); }
  if (joy.active && state === "play") {
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_MAX, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(214,40,40,.4)"; ctx.lineWidth = 3; ctx.stroke();
    const l = Math.hypot(joy.dx, joy.dy), m = Math.min(l, JOY_MAX), k = l ? m / l : 0;
    ctx.beginPath(); ctx.arc(joy.ox + joy.dx * k, joy.oy + joy.dy * k, 22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214,40,40,.45)"; ctx.fill();
  }
}

// Pimeä kenttä: näkyy vain pelaajan ympäriltä ja vartijoiden taskulamppujen valossa
const darkCv = document.createElement("canvas"), dctx = darkCv.getContext("2d");
function drawDark() {
  if (darkCv.width !== canvas.width || darkCv.height !== canvas.height) { darkCv.width = canvas.width; darkCv.height = canvas.height; }
  const dpr = canvas.width / vw;
  dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dctx.globalCompositeOperation = "source-over";
  dctx.clearRect(0, 0, vw, vh);
  dctx.fillStyle = "rgba(12,12,35,.93)"; dctx.fillRect(0, 0, vw, vh);
  dctx.globalCompositeOperation = "destination-out";
  dctx.translate(-camX, -camY);
  const px = player.x * ts, py = player.y * ts, R = ts * 3.4;
  const gr = dctx.createRadialGradient(px, py, R * .3, px, py, R);
  gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  dctx.fillStyle = gr; dctx.beginPath(); dctx.arc(px, py, R, 0, Math.PI * 2); dctx.fill();
  dctx.fillStyle = "rgba(0,0,0,.75)";
  for (const g of guards) {
    const p = visionPoly(g);
    dctx.beginPath(); dctx.moveTo(p[0][0] * ts, p[0][1] * ts);
    for (const q of p) dctx.lineTo(q[0] * ts, q[1] * ts);
    dctx.closePath(); dctx.fill();
    dctx.beginPath(); dctx.arc(g.x * ts, g.y * ts, ts * .7, 0, Math.PI * 2); dctx.fill();
  }
  dctx.beginPath(); dctx.arc(GOAL.x * ts, GOAL.y * ts, ts * .9, 0, Math.PI * 2); dctx.fill();
  ctx.drawImage(darkCv, 0, 0, vw, vh);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw();
  requestAnimationFrame(frame);
}
resize(); levelIdx = 0; reset(); goMenu(); requestAnimationFrame(frame);

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
