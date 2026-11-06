// ================= Khu vườn thơ của tôi =================
const STORAGE_KEY = "khuVuonTho";

const $ = (id) => document.getElementById(id);
const gardenEl = $("garden");
const hintEl = $("empty-hint");
const seedToggle = $("seed-toggle");
const seedForm = $("seed-form");
const poemInput = $("poem-input");
const panel = $("poem-panel");
const poemText = $("poem-text");
const poemMeta = $("poem-meta");
const wordInfo = $("word-info");
const binEl = $("bin");

// Khách (mở qua http/https, ví dụ GitHub Pages): chỉ xem vườn của chủ vườn trong garden.json,
// được vợt chữ / bón phân / gọi mưa nhưng không gieo hạt, hái hoa, thụ phấn, và không lưu gì.
// Chủ vườn mở file trực tiếp (file://) hoặc thêm ?owner vào địa chỉ để sửa vườn.
const GUEST = location.protocol !== "file:" && !new URLSearchParams(location.search).has("owner");
if (GUEST) document.body.classList.add("guest");

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/*
  poem = {
    id, texts: [bài 1, (bài 2 nếu là hoa lai)],
    types: [kiểu hoa] hoặc [kiểu hoa mẹ, kiểu hoa bố],
    hybrid: bool, parents: [idMẹ, idBố] | null,
    x (0..1), y (0..1, 0 = xa, 1 = gần),
    status: "garden" | "basket",
    missing: ["0:3", ...]   // chữ đã rơi: "bài:vị trí chữ"
  }
  fallen = [{ id, word, flowerId, key, x, b }]   // chữ đang nằm dưới đất
  compost = số phần phân bón
*/
let state;              // nạp sau khi FLOWERS được khai báo (xem bên dưới)
let openId = null;      // bài thơ đang mở
let pickedWord = null;  // từ đang được chọn
let mode = null;        // {type:"place", id} | {type:"fert"}

// ---------- Hình hoa (SVG, viewBox 100 x 150) ----------
const GREEN = "#5e7f4b";
const stem = (x1, y1, x2, y2, w = 5) =>
  `<path d="M${x1} ${y1} Q${(x1 + x2) / 2 + 4} ${(y1 + y2) / 2} ${x2} ${y2}" stroke="${GREEN}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
const leaf = (cx, cy, rx, ry, rot, fill = GREEN) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})"/>`;

function petals(cx, cy, n, dist, r, color) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    s += `<circle cx="${cx + Math.cos(a) * dist}" cy="${cy + Math.sin(a) * dist}" r="${r}" fill="${color}"/>`;
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="${dist + 2}" fill="${color}"/>`;
}
function rays(cx, cy, r1, r2, n, color) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s += `<line x1="${cx + Math.cos(a) * r1}" y1="${cy + Math.sin(a) * r1}" x2="${cx + Math.cos(a) * r2}" y2="${cy + Math.sin(a) * r2}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  }
  return s;
}

// Thân chính. Hoa khỏe: thẳng đứng. Hoa héo (d = true): thân cong xuống như cái cần câu,
// gốc vẫn đứng yên, đầu hoa treo ở đầu thân (o = độ vươn ngang, s = hướng cong -1 / +1).
const mainStem = (d, s, o, bx = 50) => d
  ? `<path d="M${bx} 150 L${bx} 100 C${bx} 58 ${50 + s * o} 46 ${50 + s * o} 72" stroke="${GREEN}" stroke-width="5" fill="none" stroke-linecap="round"/>`
  : stem(50, 56, bx, 150);

// Các kiểu thân + lá (thân bắt đầu từ y = 56 để luôn nằm khuất sau đầu hoa)
const BODIES = [
  (d, s, o) => mainStem(d, s, o) + leaf(34, 118, 14, 6, -25),
  (d, s, o) => mainStem(d, s, o) + leaf(66, 112, 14, 6, 25),
  (d, s, o) => mainStem(d, s, o) + leaf(34, 122, 14, 6, -25) + leaf(66, 100, 13, 6, 25),
  (d, s, o) => mainStem(d, s, o) + leaf(30, 105, 20, 8, -30) + leaf(70, 105, 20, 8, 30) +
    leaf(30, 135, 20, 8, -20) + leaf(70, 135, 20, 8, 20),
  (d, s, o) => mainStem(d, s, o, 54) + leaf(72, 118, 12, 26, 28) + leaf(30, 128, 20, 8, -28),
  (d, s, o) => mainStem(d, s, o) + leaf(28, 120, 18, 7, -20) + leaf(72, 128, 18, 7, 20),
  (d, s, o) => mainStem(d, s, o) + leaf(28, 128, 20, 9, -20) + leaf(72, 128, 20, 9, 20) +
    `<path d="M14 128 L42 124 M86 128 L58 124" stroke="#cfe3d0" stroke-width="1.5"/>`,
  (d, s, o) => mainStem(d, s, o, 46) + leaf(66, 126, 16, 6, 20) + leaf(32, 106, 12, 5, -35) + leaf(60, 112, 10, 4, 30),
  (d, s, o) => mainStem(d, s, o) + leaf(36, 143, 12, 5, -10) + leaf(64, 143, 12, 5, 10) +
    leaf(33, 112, 15, 6, -30) + leaf(67, 112, 15, 6, 30),
  (d, s, o) => mainStem(d, s, o, 52) + leaf(72, 128, 12, 20, 35, "#c3d8cc"),
];
const SEPALS = leaf(38, 82, 10, 5, 0) + leaf(62, 82, 10, 5, 0);

// Mỗi kiểu hoa = { body(d,s,o), head(), extra?(), info }
//  info.c   = tâm đầu hoa, info.w = bề rộng đầu hoa,
//  info.box = [x, y, nửa rộng, nửa cao] của vùng nằm trọn trong đầu hoa (để viết thơ lên)
function centerOf(kind, c1, c2, n, dist) {
  if (kind === "disc") return `<circle cx="50" cy="42" r="${dist - 6}" fill="${c1}"/><circle cx="50" cy="42" r="${(dist - 6) / 2.2}" fill="${c2}"/>`;
  if (kind === "rays") return rays(50, 42, 6, 14, n === 6 ? 10 : 12, c1) + `<circle cx="50" cy="42" r="5" fill="${c1}"/>`;
  if (kind === "dots") return rays(50, 42, 8, 8.1, 1, c1) + Array.from({ length: 6 }, (_, i) =>
    `<circle cx="${50 + Math.cos(i * 1.0472) * 9}" cy="${42 + Math.sin(i * 1.0472) * 9}" r="2.4" fill="${c1}"/>`).join("") +
    `<circle cx="50" cy="42" r="4.5" fill="${c2}"/>`;
  return `<circle cx="50" cy="42" r="7" fill="${c1}"/>`; // "dot"
}
function roundSpec(n, dist, r, color, cen, bi) {
  const half = Math.sin(Math.PI / n) * dist, proj = Math.cos(Math.PI / n) * dist;
  const inter = proj + Math.sqrt(Math.max(0, r * r - half * half));   // chỗ lõm giữa hai cánh
  const b = (inter * 0.92) / 1.42;
  return {
    body: BODIES[bi],
    head: () => petals(50, 42, n, dist, r, color) + centerOf(cen[0], cen[1], cen[2], n, dist),
    info: { c: [50, 42], w: 2 * (dist + r), box: [50, 42, b, b] },
  };
}
function cosmosSpec(c1, c2, cc, bi) {
  return {
    body: BODIES[bi],
    head: () => petals(50, 42, 8, 19, 10, c1) + petals(50, 42, 6, 9, 8, c2) + `<circle cx="50" cy="42" r="5" fill="${cc}"/>`,
    info: { c: [50, 42], w: 58, box: [50, 42, 15, 15] },
  };
}
function daisySpec(n, rx, ry, dist, color, cc, rc, bi) {
  const b = (0.72 * (dist + ry)) / 1.42;
  return {
    body: BODIES[bi],
    head: () => Array.from({ length: n }, (_, i) =>
      `<ellipse cx="50" cy="${42 - dist}" rx="${rx}" ry="${ry}" fill="${color}" transform="rotate(${(i * 360) / n} 50 42)"/>`).join("") +
      `<circle cx="50" cy="42" r="${rc}" fill="${cc}"/>`,
    info: { c: [50, 42], w: 2 * (dist + ry), box: [50, 42, b, b] },
  };
}
const TULIPS = {
  3: { d: "M28 38 Q26 8 40 18 Q50 4 60 18 Q74 8 72 38 Q70 64 50 64 Q30 64 28 38Z", info: { c: [50, 36], w: 46, box: [50, 41, 12, 13] } },
  4: { d: "M36 40 Q34 18 44 24 Q50 14 56 24 Q66 18 64 40 Q62 58 50 58 Q38 58 36 40Z", info: { c: [50, 38], w: 32, box: [50, 40, 9, 11] } },
  5: { d: "M26 40 Q22 14 40 20 Q50 8 62 16 Q78 8 76 38 Q72 66 48 64 Q28 62 26 40Z", info: { c: [50, 38], w: 54, box: [50, 40, 15, 16] } },
  6: { d: "M30 36 Q30 10 40 14 L50 4 L60 14 Q70 10 70 36 Q68 62 50 62 Q32 62 30 36Z", info: { c: [50, 36], w: 40, box: [50, 40, 11, 13] } },
  7: { d: "M30 30 Q30 8 50 8 Q70 8 70 30 Q72 60 50 64 Q28 60 30 30Z", info: { c: [50, 36], w: 40, box: [50, 38, 12, 13] } },
};
function tulipSpec(shape, color, bi) {
  const t = TULIPS[shape];
  return { body: BODIES[bi], head: () => `<path d="${t.d}" fill="${color}"/>`, info: t.info };
}
function budSpec(color, tip, bi) {
  return {
    body: BODIES[bi],
    head: () => `<ellipse cx="50" cy="44" rx="11" ry="17" fill="${color}"/><rect x="48" y="21" width="4" height="8" fill="${tip}"/>`,
    info: { c: [50, 44], w: 22, box: [50, 44, 7, 11.5] },
  };
}
function roseSpec(color, top) {
  return {
    body: (d, s, o) => BODIES[6](d, s, o) + (d ? "" : SEPALS),
    head: () => `<path d="M24 24 Q30 14 38 20 Q44 12 52 18 Q60 10 68 20 Q74 14 78 26 Z" fill="${top}"/>` +
      `<path d="M18 40 Q16 22 36 24 L66 24 Q86 22 84 44 Q82 74 50 74 Q20 72 18 40Z" fill="${color}"/>`,
    info: { c: [50, 48], w: 68, box: [50, 47, 21, 17] },
  };
}

const FLOWERS = [
  // ---- 9 mẫu gốc theo ảnh tham khảo ----
  roundSpec(5, 17, 15, "#ffc94d", ["disc", "#f9d6d6", "#ff5fa2"], 0),            // 0  hoa vàng
  roundSpec(5, 17, 15, "#b0d0f5", ["rays", "#6b3a2a"], 1),                        // 1  hoa xanh
  roundSpec(6, 16, 13, "#fbf3d0", ["rays", "#f08a24"], 2),                        // 2  hoa kem
  tulipSpec(3, "#f5acc0", 3),                                                     // 3  tulip hồng nhạt
  { ...tulipSpec(4, "#ff9aa2", 8),                                                // 4  tulip hồng đào + hai nụ bên
    extra: () => stem(50, 140, 24, 98, 4) + stem(50, 128, 78, 90, 4) +
      `<path d="M8 92 Q8 76 17 82 Q24 72 30 84 Q34 100 22 104 Q10 104 8 92Z" fill="#ff9aa2"/>` +
      `<path d="M70 84 Q72 66 80 72 Q88 66 92 80 Q92 96 80 96 Q70 96 70 84Z" fill="#ff9aa2"/>` },
  tulipSpec(5, "#ff8fa0", 4),                                                     // 5  tulip hồng đậm
  daisySpec(10, 8, 14, 18, "#ffc94d", "#5e3a2c", 15, 5),                          // 6  hướng dương
  { ...budSpec("#f79aa6", "#7a3b2a", 9),                                          // 7  cành nụ hồng
    extra: () => stem(50, 92, 28, 50, 4) + stem(51, 98, 78, 48, 4) + stem(51, 118, 18, 100, 4) +
      `<ellipse cx="26" cy="38" rx="10" ry="15" fill="#f79aa6"/><rect x="24" y="16" width="4" height="8" fill="#7a3b2a"/>` +
      `<ellipse cx="80" cy="38" rx="10" ry="15" fill="#f79aa6"/><rect x="78" y="16" width="4" height="8" fill="#7a3b2a"/>` +
      `<ellipse cx="14" cy="96" rx="10" ry="13" fill="#f79aa6" transform="rotate(-70 14 96)"/>` },
  roseSpec("#f5acc0", "#ff7f2a"),                                                 // 8  hồng-cam, lá có gân

  // ---- 41 biến thể cùng phong cách ----
  // hoa tròn 5-6 cánh (14)
  roundSpec(5, 17, 15, "#cdb8f0", ["disc", "#fff3c4", "#f08a24"], 1),
  roundSpec(5, 17, 15, "#ffc9a8", ["rays", "#6b3a2a"], 0),
  roundSpec(6, 16, 13, "#f5acc0", ["dot", "#ffd23f"], 2),
  roundSpec(5, 17, 15, "#9fd3f2", ["disc", "#fffaf0", "#ffc94d"], 5),
  roundSpec(6, 16, 13, "#b8e3c8", ["rays", "#4a6b4a"], 3),
  roundSpec(5, 17, 15, "#f2b8e0", ["dot", "#fff3c4"], 7),
  roundSpec(6, 16, 13, "#ffe58a", ["disc", "#ffffff", "#e0505e"], 0),
  roundSpec(5, 17, 15, "#ff9aa2", ["rays", "#7a3b2a"], 1),
  roundSpec(6, 16, 13, "#fde0cc", ["disc", "#ffc94d", "#e0505e"], 2),
  roundSpec(5, 16, 14, "#a9b8f2", ["rays", "#fff3c4"], 5),
  roundSpec(5, 17, 15, "#ffb066", ["disc", "#fff3c4", "#6b3a2a"], 0),
  roundSpec(6, 16, 13, "#fa9a85", ["dot", "#fffaf0"], 7),
  roundSpec(5, 17, 15, "#f59fa8", ["dots", "#fff3c4", "#e0505e"], 1),
  roundSpec(6, 16, 13, "#cfe9f7", ["dots", "#ffd23f", "#f08a24"], 2),
  // hoa nhiều lớp (5)
  cosmosSpec("#f5acc0", "#fff3f6", "#ffd23f", 1),
  cosmosSpec("#cdb8f0", "#f6eeff", "#f08a24", 5),
  cosmosSpec("#ffc9a8", "#fbf3d0", "#e0505e", 0),
  cosmosSpec("#b0d0f5", "#e8f3ff", "#ffd23f", 2),
  cosmosSpec("#ff9aa2", "#ffe3e0", "#6b3a2a", 7),
  // hoa cúc / hướng dương nhỏ (8)
  daisySpec(12, 5, 13, 18, "#dfeaff", "#ffc94d", 11, 3),
  daisySpec(10, 6, 13, 18, "#cdb8f0", "#ffd23f", 12, 1),
  daisySpec(8, 8, 13, 18, "#f5acc0", "#f08a24", 11, 5),
  daisySpec(14, 4, 12, 17, "#ffe58a", "#6b3a2a", 13, 2),
  daisySpec(9, 7, 14, 19, "#ffb066", "#5e3a2c", 14, 7),
  daisySpec(10, 6, 12, 17, "#9fd3f2", "#fff3c4", 11, 0),
  daisySpec(12, 5, 13, 18, "#ff9aa2", "#ffd23f", 10, 5),
  daisySpec(8, 8, 14, 19, "#fff0a8", "#8a4a7a", 12, 1),
  // tulip (9)
  tulipSpec(3, "#cdb8f0", 3),
  tulipSpec(3, "#ffb89a", 4),
  tulipSpec(4, "#ffb3c1", 8),
  tulipSpec(4, "#ffc94d", 1),
  tulipSpec(5, "#f7a8c8", 0),
  tulipSpec(5, "#ffb066", 5),
  tulipSpec(6, "#f5acc0", 2),
  tulipSpec(6, "#ffd6a5", 7),
  tulipSpec(7, "#9fd3f2", 3),
  // nụ (3)
  budSpec("#cdb8f0", "#5e3a6a", 9),
  budSpec("#ffd23f", "#8a5a2a", 1),
  budSpec("#b8e3c8", "#3f6b4a", 0),
  // hồng (2)
  roseSpec("#f9c0cf", "#ff9a55"),
  roseSpec("#cdb8f0", "#e07ac0"),
];

// Một bông hoa: thân của hoa bt + đầu của hoa ht (hoa thường thì bt = ht)
function bloom(bt, ht, { droop = false, s = 1, extra = false } = {}) {
  const o = clamp(FLOWERS[ht].info.w / 2 + 6, 22, 42);
  let head = FLOWERS[ht].head();
  if (droop) head = `<g transform="translate(${s * o} 14) rotate(${s * 160} 50 58)">${head}</g>`;
  return FLOWERS[bt].body(droop, s, o) + (extra && FLOWERS[bt].extra ? FLOWERS[bt].extra() : "") + head;
}

// Hoa lai = chùm hai bông: thân của hoa này + đầu của hoa kia (chéo nhau), buộc nơ ở gốc.
const HYBRID_BLOOMS = [{ tx: 26, rot: -12, s: -1 }, { tx: 34, rot: 12, s: 1 }];
function hybridInner([a, b], droop) {
  const bl = (bt, ht, k) => {
    const { tx, rot, s } = HYBRID_BLOOMS[k];
    return `<g transform="translate(${tx} 24) rotate(${rot} 41 123) scale(.82)">${bloom(bt, ht, { droop, s })}</g>`;
  };
  const bow = `<g transform="translate(75 134)"><path d="M0 0 L-15 -9 L-15 9Z M0 0 L15 -9 L15 9Z" fill="#f5acc0"/><circle r="4.5" fill="#e98aa5"/></g>`;
  return `<g transform="translate(4 0)">${bl(a, b, 0)}${bl(b, a, 1)}</g>${bow}`;
}
// toạ độ trong một bông của hoa lai -> toạ độ trong viewBox 150x150 của chùm
function hybridPoint(k, x, y) {
  const { tx, rot } = HYBRID_BLOOMS[k];
  const r = (rot * Math.PI) / 180;
  const dx = x * 0.82 - 41, dy = y * 0.82 - 123;
  return [41 + dx * Math.cos(r) - dy * Math.sin(r) + tx + 4, 123 + dx * Math.sin(r) + dy * Math.cos(r) + 24];
}

const leanSign = (p) => (p.id.charCodeAt(p.id.length - 1) % 2 ? 1 : -1);

function flowerSVG(p, droop = false) {
  const inner = p.hybrid
    ? hybridInner(p.types, droop)
    : bloom(p.types[0], p.types[0], { droop, s: leanSign(p), extra: true });
  return `<svg viewBox="${p.hybrid ? "0 0 150 150" : "0 0 100 150"}">${inner}</svg>`;
}

// ---------- Lưu trữ ----------
state = load();

function normPoem(p) {
  return {
    id: p.id,
    texts: p.texts || [p.text || ""],
    types: (p.types || [p.type || 0]).map((t) => (FLOWERS[t] ? t : 0)),
    hybrid: !!p.hybrid,
    parents: p.parents || null,
    x: p.x ?? 0.5,
    y: p.y ?? 0.5,
    status: p.status || "garden",
    missing: p.missing || [],
  };
}

function load() {
  let raw = null;
  if (!GUEST) { try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch {} }
  const s = Array.isArray(raw) ? { poems: raw } : (raw || {}); // bản cũ chỉ lưu mảng bài thơ
  s.poems = (s.poems || []).map(normPoem);
  s.fallen = s.fallen || [];
  s.compost = s.compost || 0;   // số cục phân bón trong thùng
  s.net = s.net || 0;           // số chữ đang nằm trong vợt
  s.bag = s.bag || [];          // các kiểu hoa chưa dùng trong vòng hiện tại
  s.order = s.order || null;    // thứ tự của vòng hiện tại
  s.last = s.last ?? null;      // kiểu hoa vừa gieo
  s.rain = s.rain || null;      // {day, at, done}: mưa một lần mỗi ngày
  return s;
}

// Chọn kiểu hoa cho hạt mới: dùng hết 50 mẫu rồi mới xáo lại (thứ tự khác vòng trước),
// và không bao giờ để hai bông giống nhau mọc liên tiếp.
function nextType() {
  if (!state.bag.length) {
    const ids = FLOWERS.map((_, i) => i);
    let order, tries = 0;
    do {
      order = shuffle(ids);
      tries++;
    } while (tries < 30 && (order[0] === state.last || (state.order && order.join() === state.order.join())));
    state.order = order;
    state.bag = order.slice();
  }
  const t = state.bag.shift();
  state.last = t;
  return t;
}
function save() {
  if (GUEST) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
const getPoem = (id) => state.poems.find((p) => p.id === id);
const flowerEl = (id) => gardenEl.querySelector(`.flower[data-id="${id}"]`);

// ---------- Xử lý chữ ----------
const normalize = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const tokens = (text) => text.split(/\s+/).filter(Boolean);

// Chia bài thơ thành dòng -> mảnh; mỗi chữ có chỉ số idx (khớp với tokens())
function parseText(text) {
  let idx = 0;
  return text.split("\n").map((line) =>
    line.split(/(\s+)/).filter((s) => s !== "").map((part) =>
      /^\s+$/.test(part) ? { t: part, ws: true } : { t: part, idx: idx++ }));
}
const isMissing = (p, pi, ti) => p.missing.includes(pi + ":" + ti);

function wordsOf(p) {
  const set = new Set();
  p.texts.forEach((t, pi) => tokens(t).forEach((w, ti) => {
    if (isMissing(p, pi, ti)) return;
    const n = normalize(w);
    if (n) set.add(n);
  }));
  return set;
}
function plainText(p, pi) {
  return parseText(p.texts[pi]).map((line) =>
    line.map((w) => (!w.ws && isMissing(p, pi, w.idx) ? "···" : w.t)).join("")).join("\n");
}

// ---------- Vẽ hoa ----------
function renderFlower(p, animate) {
  const el = document.createElement("div");
  el.className = "flower";
  el.dataset.id = p.id;
  el.title = p.texts[0].split("\n")[0].slice(0, 40);
  el.innerHTML = flowerSVG(p, false);
  el.dataset.droop = "false";
  placeFlower(el, p);
  updateDroop(el, p, false);
  if (!animate) el.classList.add("settled");
  el.addEventListener("animationend", (e) => {
    if (e.target === el) el.classList.add("settled");
  });
  el.addEventListener("click", () => openPoem(p.id));
  el.addEventListener("pointerenter", () => emitScent(p.id));
  gardenEl.appendChild(el);
  return el;
}

// Hoa co giãn theo cỡ màn hình: điện thoại nhỏ hơn, màn hình lớn to hơn
const flowerScale = () => clamp(Math.min(window.innerWidth, window.innerHeight * 1.4) / 1100, 0.6, 1.25);

// Hoa ở xa (y nhỏ) thì bé hơn, hoa ở gần thì to hơn
function placeFlower(el, p) {
  const vh = window.innerHeight;
  const size = (80 + p.y * 70) * (p.hybrid ? 1.4 : 1) * flowerScale();
  el.style.width = size + "px";
  el.style.left = `calc(${p.x * 100}% - ${size / 2}px)`;
  el.style.bottom = 10 + p.y * (vh * 0.42) + "px";
  el.style.zIndex = Math.round(p.y * -100) + 100;
}

// Hoa bị rơi chữ thì héo: gốc đứng yên, thân cong xuống, đầu hoa ngoẹo treo ở đầu thân.
// Vẽ lại SVG theo trạng thái (thân hoa phải cong thật, không phải nghiêng cả bông).
function updateDroop(el, p, morph = true) {
  const droop = p.missing.length > 0;
  el.classList.toggle("droop", droop);
  if (el.dataset.droop === String(droop)) return;
  el.dataset.droop = String(droop);
  el.innerHTML = flowerSVG(p, droop);
  if (morph) el.querySelector("svg").classList.add("morph");
}

function headPoint(id) {
  const p = getPoem(id), el = flowerEl(id);
  if (!p || !el) return null;
  const r = el.getBoundingClientRect();
  const f = p.missing.length ? 0.55 : p.hybrid ? 0.4 : 0.28;
  return { x: r.left + r.width / 2, y: r.top + r.height * f };
}

// ---------- Hương thơm: câu thơ đầu bay lên theo hình lượn sóng ----------
const scentCooldown = {};
function emitScent(id) {
  const now = Date.now();
  if (scentCooldown[id] && now - scentCooldown[id] < 5000) return;
  const p = getPoem(id), pt = headPoint(id);
  if (!p || !pt) return;
  scentCooldown[id] = now;

  let line = plainText(p, 0).split("\n").map((l) => l.trim()).find(Boolean) || "";
  if (line.length > 46) line = line.slice(0, 45).trim() + "…";
  if (!line) return;

  const el = document.createElement("div");
  el.className = "scent";
  [...line].forEach((ch, i) => {
    const s = document.createElement("span");
    s.textContent = ch === " " ? " " : ch;
    s.style.setProperty("--i", i);
    el.appendChild(s);
  });
  $("scent-layer").appendChild(el);
  const w = el.offsetWidth;
  const x = clamp(pt.x - w / 2, 8, window.innerWidth - w - 8);
  el.style.setProperty("--sx", x + "px");
  el.style.setProperty("--sy", pt.y - 20 + "px");
  el.style.setProperty("--drift", rand(-40, 40) + "px");
  setTimeout(() => el.remove(), 5600);
}

function refreshHint() {
  hintEl.classList.toggle("gone", state.poems.some((p) => p.status === "garden"));
}

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3400);
}

function puff(pt, emoji = "✨") {
  const el = document.createElement("div");
  el.className = "puff";
  el.textContent = emoji;
  el.style.setProperty("--px", pt.x - 9 + rand(-8, 8) + "px");
  el.style.setProperty("--py", pt.y - 9 + rand(-8, 8) + "px");
  $("bee-layer").appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

// ---------- Chế độ (trồng lại / bón phân) ----------
function setMode(m, text) {
  mode = m;
  document.body.classList.toggle("mode-place", !!m && m.type === "place");
  $("mode-banner").hidden = !m;
  $("mode-text").textContent = text || "";
}
$("mode-cancel").addEventListener("click", () => setMode(null));

// Chế độ trồng lại: bấm vào vườn để chọn chỗ
gardenEl.addEventListener("click", (e) => {
  if (!mode || mode.type !== "place") return;
  e.stopPropagation();
  e.preventDefault();
  const p = getPoem(mode.id);
  setMode(null);
  if (!p) return;
  const vh = window.innerHeight;
  p.x = clamp(e.clientX / window.innerWidth, 0.04, 0.96);
  p.y = clamp((vh - e.clientY - 10) / (vh * 0.42), 0, 1);
  p.status = "garden";
  save();
  renderFlower(p, true);
  updateBasketCount();
  refreshHint();
  applyGlow();
  toast("Đã trồng lại bông hoa 🌷");
}, true);

// ---------- Gieo hạt ----------
seedToggle.addEventListener("click", () => {
  const open = seedForm.hidden;
  seedForm.hidden = !open;
  seedToggle.setAttribute("aria-expanded", open);
  if (open) poemInput.focus();
});

seedForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = poemInput.value.trim();
  if (!text) return;

  const p = {
    id: newId(),
    texts: [text],
    types: [nextType()],
    hybrid: false,
    parents: null,
    x: 0.06 + Math.random() * 0.88,
    y: Math.random(),
    status: "garden",
    missing: [],
  };
  state.poems.push(p);
  save();
  poemInput.value = "";
  seedForm.hidden = true;
  seedToggle.setAttribute("aria-expanded", false);
  refreshHint();

  // Hạt rơi xuống rồi hoa nở
  const seed = document.createElement("div");
  seed.className = "seed";
  seed.style.left = p.x * 100 + "%";
  seed.style.bottom = 10 + p.y * (window.innerHeight * 0.42) + "px";
  gardenEl.appendChild(seed);
  seed.addEventListener("animationend", () => {
    seed.remove();
    renderFlower(p, true);
    applyGlow();
  });
});

// ---------- Mở bài thơ ----------
function openPoem(id) {
  const p = getPoem(id);
  if (!p || p.status !== "garden") return;
  closeBasket();
  openId = id;
  pickedWord = null;
  renderPoem(p);
  panel.hidden = false;
  panel.style.animation = "none"; panel.offsetHeight; panel.style.animation = "";
  applyGlow();
}

function renderPoem(p) {
  poemMeta.textContent = p.hybrid ? "chùm thơ lai · 2 bài" : "";
  poemText.innerHTML = "";
  p.texts.forEach((text, pi) => {
    if (pi > 0) {
      const sep = document.createElement("div");
      sep.className = "sep";
      sep.textContent = "✿";
      poemText.appendChild(sep);
    }
    parseText(text).forEach((line) => {
      const div = document.createElement("div");
      div.className = "line";
      line.forEach((w) => {
        if (w.ws) { div.append(w.t); return; }
        const span = document.createElement("span");
        if (isMissing(p, pi, w.idx)) {
          span.className = "word missing";
          span.textContent = "·".repeat(clamp(w.t.length, 3, 7));
          span.title = "chữ này đã rơi mất";
        } else {
          span.className = "word";
          span.textContent = w.t;
          span.dataset.w = normalize(w.t);
          span.addEventListener("click", () => pickWord(span.dataset.w));
        }
        div.append(span);
      });
      poemText.appendChild(div);
    });
  });
}

function closePanel() {
  panel.hidden = true;
  openId = null;
  pickedWord = null;
  applyGlow();
}
$("panel-close").addEventListener("click", closePanel);

// Hái hoa bỏ vào giỏ
$("delete-btn").addEventListener("click", () => {
  const p = getPoem(openId);
  if (!p) return;
  p.status = "basket";
  save();
  flowerEl(p.id)?.remove();
  closePanel();
  updateBasketCount();
  refreshHint();
  toast("Đã hái bông hoa bỏ vào giỏ 🧺");
});

// ---------- Chọn từ -> hoa phát sáng ----------
function pickWord(w) {
  pickedWord = pickedWord === w ? null : w;
  applyGlow();
}

function applyGlow() {
  document.querySelectorAll(".word").forEach((s) =>
    s.classList.toggle("picked", pickedWord !== null && s.dataset.w === pickedWord));

  let count = 0;
  document.querySelectorAll(".flower").forEach((el) => {
    const p = getPoem(el.dataset.id);
    const has = pickedWord && p && wordsOf(p).has(pickedWord);
    if (has) count++;
    el.classList.toggle("glow", !!has);
    el.classList.toggle("dim", !!pickedWord && !has);
    el.classList.toggle("active", el.dataset.id === openId && !pickedWord);
  });

  wordInfo.textContent = pickedWord
    ? `"${pickedWord}" nở trong ${count} bông hoa`
    : "chạm vào một từ để xem những bông hoa cùng từ ấy";
}

// ---------- Giỏ hoa ----------
const basketItems = () => state.poems.filter((p) => p.status === "basket");
function updateBasketCount() { $("basket-count").textContent = basketItems().length; }

function openBasket() {
  setMode(null);
  closePanel();
  renderBasket();
  $("basket-overlay").hidden = false;
}
function closeBasket() { $("basket-overlay").hidden = true; }

function renderBasket() {
  const list = $("basket-list");
  list.innerHTML = "";
  const items = basketItems();
  $("basket-empty").hidden = items.length > 0;
  items.forEach((p) => list.appendChild(buildCard(p)));
}

// Thẻ hoa: hình bông hoa (template có sẵn) với bài thơ viết lên đầu hoa
function buildCard(p) {
  const card = document.createElement("div");
  card.className = "card";

  const art = document.createElement("div");
  art.className = "card-art" + (p.hybrid ? " hybrid" : "");
  art.innerHTML = flowerSVG(p);
  p.texts.forEach((_, pi) => {
    const t = document.createElement("div");
    t.className = "card-text t" + pi;
    t.textContent = plainText(p, pi);
    // đặt khung chữ nằm trọn trong đầu hoa của kiểu hoa này
    const headType = p.hybrid ? p.types[1 - pi] : p.types[0];
    const [bx, by, bw, bh] = FLOWERS[headType].info.box;
    let cx = bx, cy = by, w = bw * 2, h = bh * 2, vbW = 100;
    if (p.hybrid) {
      [cx, cy] = hybridPoint(pi, bx, by);
      w *= 0.82; h *= 0.82; vbW = 150;
    }
    const vbH = 150;
    t.style.left = ((cx - w / 2) / vbW) * 100 + "%";
    t.style.top = ((cy - h / 2) / vbH) * 100 + "%";
    t.style.width = (w / vbW) * 100 + "%";
    t.style.height = (h / vbH) * 100 + "%";
    t.style.fontSize = Math.max(3, (w / vbW) * 100 * 0.14) + "cqw";
    art.appendChild(t);
  });
  art.addEventListener("click", () => art.classList.toggle("open"));
  card.appendChild(art);

  const hint = document.createElement("p");
  hint.className = "card-hint";
  hint.textContent = "chạm vào hoa để đọc to";
  card.appendChild(hint);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const replant = document.createElement("button");
  replant.textContent = "🌱 Trồng lại";
  replant.addEventListener("click", () => {
    closeBasket();
    setMode({ type: "place", id: p.id }, "Bấm vào mảnh đất để trồng bông hoa");
  });
  const gift = document.createElement("button");
  gift.textContent = "🎁 Tặng";
  gift.addEventListener("click", () => giftPoem(p));
  actions.append(replant, gift);
  card.appendChild(actions);
  return card;
}

// Tặng = vẽ thẻ hoa thành ảnh PNG, chép vào clipboard (nếu trình duyệt không cho thì tải ảnh về), rồi bỏ khỏi giỏ
async function giftPoem(p) {
  const blobPromise = renderCardPNG(p);
  let how = null;
  try {
    // đưa promise vào ClipboardItem để vẫn tính là thao tác bấm của người dùng
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
    how = "clipboard";
  } catch {
    try {
      const blob = await blobPromise;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "bong-hoa-tho.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      how = "download";
    } catch {}
  }
  if (!how) { toast("Không tạo được ảnh, bông hoa vẫn còn trong giỏ."); return; }
  state.poems = state.poems.filter((q) => q.id !== p.id);
  save();
  renderBasket();
  updateBasketCount();
  toast(how === "clipboard"
    ? "Đã chép ảnh bông hoa vào clipboard. Dán gửi cho người ấy nhé 🎁"
    : "Trình duyệt không cho chép vào clipboard nên ảnh đã được tải về máy 🎁");
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Ngắt dòng theo độ rộng
function wrapLines(ctx, text, maxW) {
  const out = [];
  text.split("\n").forEach((line) => {
    if (!line.trim()) { out.push(""); return; }
    let cur = "";
    line.split(/\s+/).filter(Boolean).forEach((w) => {
      const test = cur ? cur + " " + w : w;
      if (cur && ctx.measureText(test).width > maxW) { out.push(cur); cur = w; }
      else cur = test;
    });
    out.push(cur);
  });
  return out;
}

// Viết bài thơ lên một mảnh giấy đặt ở đầu hoa, tự chỉnh cỡ chữ cho vừa
function drawPoemPatch(ctx, text, cx, cy, w, h, maxFont) {
  ctx.fillStyle = "rgba(255, 253, 247, .84)";
  roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(36, w * 0.12));
  ctx.fill();

  const pad = Math.max(12, w * 0.06);
  const innerW = w - pad * 2, innerH = h - pad * 2;
  let size = maxFont, lines;
  for (; size >= 14; size -= 2) {
    ctx.font = `${size}px Georgia, "Times New Roman", serif`;
    lines = wrapLines(ctx, text, innerW);
    if (lines.length * size * 1.4 <= innerH) break;
  }
  const lh = size * 1.4;
  const fit = Math.max(1, Math.floor(innerH / lh));
  if (lines.length > fit) {                       // quá dài: cắt bớt và thêm …
    lines = lines.slice(0, fit);
    lines[fit - 1] = lines[fit - 1].replace(/\s*\S*$/, "") + " …";
  }
  ctx.fillStyle = "#4a3b32";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const top = cy - (lines.length * lh) / 2 + lh / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, top + i * lh));
}

// Vẽ một bông hoa to (đầu hoa chiếm ~88% bề rộng ảnh), bài thơ nằm trọn trong đầu hoa
async function drawBloomImage(ctx, bt, ht, text, ox, W, H) {
  const info = FLOWERS[ht].info;
  const vw = Math.max(info.w, 44) / 0.88, vh = (vw * H) / W;
  const vx = info.c[0] - vw / 2, vy = info.c[1] - vh * 0.36;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${vx} ${vy} ${vw} ${vh}">${bloom(bt, ht)}</svg>`;
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  ctx.drawImage(img, ox, 0, W, H);
  const k = W / vw;
  const [bx, by, bw, bh] = info.box;
  drawPoemPatch(ctx, text, ox + (bx - vx) * k, (by - vy) * k, bw * 2 * k, bh * 2 * k, 56);
}

async function renderCardPNG(p) {
  const W = 1000, H = 1250;
  const canvas = document.createElement("canvas");
  canvas.width = W * (p.hybrid ? 2 : 1);
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff7e8";
  ctx.fillRect(0, 0, canvas.width, H);

  if (p.hybrid) {
    const [a, b] = p.types;
    await drawBloomImage(ctx, a, b, p.texts[0], 0, W, H);
    await drawBloomImage(ctx, b, a, p.texts[1], W, W, H);
  } else {
    await drawBloomImage(ctx, p.types[0], p.types[0], p.texts[0], 0, W, H);
  }
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
}

$("basket-btn").addEventListener("click", openBasket);
$("basket-close").addEventListener("click", closeBasket);
$("basket-overlay").addEventListener("click", (e) => { if (e.target === $("basket-overlay")) closeBasket(); });

// ---------- Mây ----------
(function makeClouds() {
  const sky = $("sky");
  for (let i = 0; i < 6; i++) {
    const c = document.createElement("div");
    const w = rand(130, 260);
    c.className = "cloud";
    c.style.width = w + "px";
    c.style.height = w * 0.28 + "px";
    c.style.top = rand(8, 34) + "%";
    const dur = rand(90, 190);
    c.style.animationDuration = dur + "s";
    c.style.animationDelay = -rand(0, dur) + "s";
    c.style.opacity = rand(0.7, 0.95);
    sky.appendChild(c);
  }
})();

// ---------- Mưa + chữ rơi ----------
let raining = false;
function startRain() {
  if (raining) return;
  raining = true;
  document.body.classList.add("raining");
  const rain = $("rain");
  rain.innerHTML = "";
  for (let i = 0; i < 90; i++) {
    const d = document.createElement("i");
    d.className = "drop";
    d.style.left = Math.random() * 100 + "%";
    d.style.animationDuration = rand(0.55, 1.05) + "s";
    d.style.animationDelay = -rand(0, 1.2) + "s";
    rain.appendChild(d);
  }
  rain.classList.add("on");
  setTimeout(dropWords, 3000);
  setTimeout(stopRain, 10000);
}
function stopRain() {
  raining = false;
  document.body.classList.remove("raining");
  $("rain").classList.remove("on");
  setTimeout(() => { if (!raining) $("rain").innerHTML = ""; }, 1600);
}

// các chữ còn có thể rơi (không để hoa mất quá nửa số chữ)
function lossRoom(p) {
  const total = p.texts.reduce((n, t) => n + tokens(t).length, 0);
  return Math.floor(total * 0.5) - p.missing.length;
}

function dropWords() {
  const cands = shuffle(state.poems.filter((p) => p.status === "garden" && lossRoom(p) > 0));
  const n = 1 + Math.floor(Math.random() * 2);   // mưa ít thôi để kịp nhặt chữ
  cands.slice(0, n).forEach((p, i) => setTimeout(() => loseWords(p.id), i * 800));
}

function loseWords(id) {
  const p = getPoem(id);
  if (!p || p.status !== "garden") return;
  const room = lossRoom(p);
  if (room <= 0) return;
  const slots = [];
  p.texts.forEach((t, pi) => tokens(t).forEach((w, ti) => {
    if (!isMissing(p, pi, ti) && normalize(w)) slots.push({ key: pi + ":" + ti, word: w });
  }));
  const take = shuffle(slots).slice(0, Math.min(room, 1 + Math.floor(Math.random() * 2)));
  const from = headPoint(id);
  take.forEach((s) => {
    p.missing.push(s.key);
    const vh = window.innerHeight;
    const f = {
      id: newId(),
      word: s.word,
      flowerId: id,
      key: s.key,
      x: clamp(p.x + rand(-0.05, 0.05), 0.03, 0.97),
      b: clamp(10 + p.y * vh * 0.42 + rand(-24, 24), 10, 10 + vh * 0.42),
    };
    state.fallen.push(f);
    renderFallen(f, from);
  });
  const el = flowerEl(id);
  if (el) updateDroop(el, p);
  if (openId === id) { renderPoem(p); applyGlow(); }
  save();
}

function renderFallen(f, from) {
  const el = document.createElement("div");
  el.className = "fallen";
  el.dataset.id = f.id;
  el.textContent = f.word;
  el.style.left = f.x * 100 + "%";
  el.style.bottom = f.b + "px";
  el.style.setProperty("--tilt", rand(-7, 7) + "deg");
  if (from) {
    const targetY = window.innerHeight - f.b;
    el.style.setProperty("--fall", Math.max(40, targetY - from.y) + "px");
    el.style.setProperty("--dx", from.x - f.x * window.innerWidth + "px");
    el.classList.add("dropping");
    el.addEventListener("animationend", () => el.classList.remove("dropping"), { once: true });
  }
  el.addEventListener("pointerdown", startDrag);
  gardenEl.appendChild(el);
}

// ---------- Nhặt chữ -> thùng phân ----------
const inRect = (el, x, y, pad = 0) => {
  const r = el.getBoundingClientRect();
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
};
const coarse = () => window.matchMedia("(pointer: coarse)").matches;
const overBin = (ev) => inRect(binEl, ev.clientX, ev.clientY, coarse() ? 30 : 12);

function updateBin() { $("bin-count").textContent = state.compost; }
function updateNet() {
  $("net-count").textContent = state.net;
  $("net-count").hidden = state.net === 0;
}

// n chữ biến thành n cục phân bón
function addCompost(n) {
  const first = state.compost === 0;
  state.compost += n;
  updateBin();
  binEl.classList.remove("plop"); binEl.offsetHeight; binEl.classList.add("plop");
  if (first) toast("Chữ đã thành phân bón. Kéo cục phân từ thùng ra thả vào bông hoa ngoẹo đầu 🌿");
}

// Kéo từng chữ bỏ vào thùng
function startDrag(e) {
  e.preventDefault();
  const el = e.currentTarget;
  const f = state.fallen.find((x) => x.id === el.dataset.id);
  if (!f) return;
  el.classList.remove("dropping");
  el.classList.add("dragging");
  el.setPointerCapture(e.pointerId);

  const move = (ev) => {
    el.style.left = ev.clientX + "px";
    el.style.bottom = window.innerHeight - ev.clientY - 10 + "px";
    binEl.classList.toggle("hot", overBin(ev));
  };
  const up = (ev) => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.classList.remove("dragging");
    binEl.classList.remove("hot");
    if (overBin(ev)) {
      state.fallen = state.fallen.filter((x) => x.id !== f.id);
      el.remove();
      addCompost(1);
    } else {
      const vh = window.innerHeight;
      f.x = clamp(ev.clientX / window.innerWidth, 0.02, 0.98);
      f.b = clamp(vh - ev.clientY - 10, 10, 10 + vh * 0.42);
      el.style.left = f.x * 100 + "%";
      el.style.bottom = f.b + "px";
    }
    save();
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  move(e);
}

// ---------- Cái vợt: vợt hàng loạt chữ rơi, rồi đổ cả vợt vào thùng ----------
const netEl = $("net");
const HOOP = { x: 35, y: 30, r: 34 };   // tâm + bán kính vành vợt (px, so với góc trên-trái của vợt)

const netScale = () => netEl.getBoundingClientRect().width / 70;

function scoopAt(hx, hy) {
  let got = 0;
  const k = netScale();
  gardenEl.querySelectorAll(".fallen").forEach((el) => {
    const r = el.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - hx, r.top + r.height / 2 - hy);
    if (d > (HOOP.r + 14) * k) return;
    state.fallen = state.fallen.filter((f) => f.id !== el.dataset.id);
    el.style.pointerEvents = "none";
    el.classList.add("scooped");
    setTimeout(() => el.remove(), 300);
    got++;
  });
  if (got) { state.net += got; updateNet(); }
}

netEl.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const r0 = netEl.getBoundingClientRect();
  const gx = e.clientX - r0.left, gy = e.clientY - r0.top;      // chỗ đang cầm trên cán vợt
  const sx = e.clientX, sy = e.clientY;
  let moved = false;
  netEl.setPointerCapture(e.pointerId);
  netEl.classList.add("dragging");

  const hoopPt = () => {
    const r = netEl.getBoundingClientRect();
    const k = netScale();
    return { x: r.left + HOOP.x * k, y: r.top + HOOP.y * k };
  };
  const move = (ev) => {
    if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true;
    netEl.style.right = "auto";
    netEl.style.bottom = "auto";
    netEl.style.left = ev.clientX - gx + "px";
    netEl.style.top = ev.clientY - gy + "px";
    const h = hoopPt();
    scoopAt(h.x, h.y);
    binEl.classList.toggle("hot", state.net > 0 && inRect(binEl, h.x, h.y, 20));
  };
  const up = () => {
    netEl.removeEventListener("pointermove", move);
    netEl.removeEventListener("pointerup", up);
    netEl.removeEventListener("pointercancel", up);
    netEl.classList.remove("dragging");
    binEl.classList.remove("hot");
    const h = hoopPt();
    if (state.net > 0 && inRect(binEl, h.x, h.y, 20)) {
      const n = state.net;
      state.net = 0;
      updateNet();
      addCompost(n);
      toast(`Đã đổ ${n} chữ vào thùng phân hữu cơ.`);
    } else if (!moved) {
      toast("Kéo vợt quét qua các chữ rơi, rồi kéo vợt tới thùng phân để đổ.");
    }
    netEl.style.left = netEl.style.top = netEl.style.right = netEl.style.bottom = "";   // về chỗ cũ
    save();
  };
  netEl.addEventListener("pointermove", move);
  netEl.addEventListener("pointerup", up);
  netEl.addEventListener("pointercancel", up);
});

// ---------- Bón phân: kéo cục phân từ thùng ra thả vào bông hoa ngoẹo đầu ----------
const LUMP_SVG = `<svg viewBox="0 0 48 46">
  <ellipse cx="24" cy="37" rx="19" ry="8" fill="#7a5230"/>
  <ellipse cx="24" cy="27" rx="14" ry="8" fill="#8a5a33"/>
  <ellipse cx="24" cy="18" rx="9" ry="6.5" fill="#9a6a3d"/>
  <path d="M24 12 Q26 7 29 9" fill="#9a6a3d"/>
  <path d="M10 36 Q24 41 38 36" stroke="#a87a4d" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M15 26 Q24 31 33 26" stroke="#a87a4d" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <path d="M19 17 Q24 21 29 17" stroke="#b58a5c" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path d="M24 9 Q22 3 17 2" stroke="#5e7f4b" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="15" cy="2.5" rx="4" ry="2.2" fill="#7fb069" transform="rotate(-20 15 2.5)"/>
</svg>`;

// bông hoa héo gần chỗ thả nhất (đầu hoa treo lệch ra ngoài nên nới vùng bắt)
function nearestDroop(x, y) {
  let best = null, bd = Infinity;
  state.poems.forEach((p) => {
    if (p.status !== "garden" || !p.missing.length) return;
    const el = flowerEl(p.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (x < r.left - 50 || x > r.right + 50 || y < r.top - 30 || y > r.bottom + 20) return;
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height * 0.6));
    if (d < bd) { bd = d; best = p.id; }
  });
  return best;
}

binEl.addEventListener("pointerdown", (e) => {
  if (state.compost <= 0) {
    toast("Thùng phân đang trống. Hãy vợt hoặc nhặt những chữ rơi dưới đất bỏ vào đây.");
    return;
  }
  if (!state.poems.some((p) => p.status === "garden" && p.missing.length)) {
    toast("Chưa có bông hoa nào cần bón.");
    return;
  }
  e.preventDefault();
  const lump = document.createElement("div");
  lump.id = "lump";
  lump.innerHTML = LUMP_SVG;
  document.body.appendChild(lump);
  document.body.classList.add("mode-fert");
  binEl.setPointerCapture(e.pointerId);
  const sx = e.clientX, sy = e.clientY;
  let moved = false, target = null;

  const move = (ev) => {
    lump.style.left = ev.clientX + "px";
    lump.style.top = ev.clientY + "px";
    if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
    const id = nearestDroop(ev.clientX, ev.clientY);
    if (id !== target) {
      if (target) flowerEl(target)?.classList.remove("fert-target");
      target = id;
      if (target) flowerEl(target)?.classList.add("fert-target");
    }
  };
  const up = () => {
    binEl.removeEventListener("pointermove", move);
    binEl.removeEventListener("pointerup", up);
    binEl.removeEventListener("pointercancel", up);
    lump.remove();
    document.body.classList.remove("mode-fert");
    if (target) flowerEl(target)?.classList.remove("fert-target");
    if (!moved) toast("Kéo cục phân ra khỏi thùng, thả vào bông hoa đang ngoẹo đầu.");
    else if (target) fertilize(target);
  };
  binEl.addEventListener("pointermove", move);
  binEl.addEventListener("pointerup", up);
  binEl.addEventListener("pointercancel", up);
  move(e);
});

// Mỗi bông hoa chỉ cần bón một cục phân là khỏe hẳn: thân thẳng lại, các chữ rơi trở về
function fertilize(id) {
  const p = getPoem(id);
  if (!p || !p.missing.length || state.compost <= 0) return;
  state.compost--;
  p.missing = [];
  state.fallen = state.fallen.filter((f) => {
    if (f.flowerId !== id) return true;
    gardenEl.querySelector(`.fallen[data-id="${f.id}"]`)?.remove();
    return false;
  });
  const el = flowerEl(id);
  if (el) updateDroop(el, p);
  const pt = headPoint(id);
  if (pt) { puff(pt, "🌿"); puff(pt, "✨"); }
  if (openId === id) { renderPoem(p); applyGlow(); }
  updateBin();
  save();
  toast("Bông hoa đã đứng thẳng lại 🌼");
}

// ---------- Ong + thụ phấn ----------
const BEE_SVG = `<svg viewBox="0 0 40 30">
  <ellipse class="wing" cx="15" cy="9" rx="7" ry="6" fill="#e3f4ff" opacity=".85"/>
  <ellipse class="wing" cx="25" cy="9" rx="7" ry="6" fill="#e3f4ff" opacity=".85"/>
  <ellipse cx="20" cy="18" rx="13" ry="8" fill="#ffc94d"/>
  <path d="M15 11 v14 M21 10.5 v15" stroke="#4a3b32" stroke-width="3"/>
  <circle cx="33" cy="17" r="5" fill="#4a3b32"/>
  <circle cx="35" cy="15.5" r="1.2" fill="#fff"/>
</svg>`;

class Bee {
  constructor(layer) {
    this.el = document.createElement("div");
    this.el.className = "bee";
    this.el.innerHTML = BEE_SVG;
    layer.appendChild(this.el);
    this.x = Math.random() * window.innerWidth;
    this.y = window.innerHeight * rand(0.3, 0.7);
    this.tx = this.x; this.ty = this.y;
    this.busy = false;
    this.dir = 1;
    this.wait = 0;
    this.t = Math.random() * 10;
    this.onArrive = null;
  }
  goTo(x, y) {
    this.tx = x; this.ty = y;
    return new Promise((res) => { this.onArrive = res; });
  }
  tick(dt) {
    this.t += dt;
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 4) {
      const step = Math.min(d, (this.busy ? 190 : 90) * dt);
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      if (Math.abs(dx) > 3) this.dir = dx < 0 ? -1 : 1;
    } else if (this.onArrive) {
      const done = this.onArrive;
      this.onArrive = null;
      done();
    } else if (!this.busy) {
      this.wait -= dt;
      if (this.wait <= 0) {
        this.tx = rand(40, window.innerWidth - 40);
        this.ty = rand(window.innerHeight * 0.25, window.innerHeight * 0.85);
        this.wait = rand(0.4, 2.2);
      }
    }
    const bob = Math.sin(this.t * 9) * 3;
    this.el.style.transform = `translate(${this.x - 16}px, ${this.y - 12 + bob}px) scaleX(${this.dir})`;
  }
}

const bees = [new Bee($("bee-layer")), new Bee($("bee-layer"))];
let lastT = performance.now();
(function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  bees.forEach((b) => b.tick(dt));
  requestAnimationFrame(loop);
})(lastT);

const alive = (id) => { const p = getPoem(id); return !!p && p.status === "garden" && !p.hybrid; };

async function visit(bee, id) {
  const pt = headPoint(id);
  if (!pt) return false;
  await bee.goTo(pt.x, pt.y);
  puff(pt, "🌼");
  await sleep(1200);
  return true;
}

async function pollinate(manual) {
  if (GUEST) return;
  const bee = bees.find((b) => !b.busy);
  if (!bee) return;
  if (state.poems.filter((p) => p.hybrid).length >= 12) {
    if (manual) toast("Vườn đã đông hoa lai rồi.");
    return;
  }
  // chỉ hoa thường mới được làm bố mẹ, và mỗi cặp chỉ có một hoa con
  const parents = state.poems.filter((p) => p.status === "garden" && !p.hybrid);
  const pairs = [];
  for (let i = 0; i < parents.length; i++) {
    for (let j = i + 1; j < parents.length; j++) {
      const a = parents[i], b = parents[j];
      const used = state.poems.some((c) => c.hybrid && c.parents && c.parents.includes(a.id) && c.parents.includes(b.id));
      if (!used) pairs.push([a, b]);
    }
  }
  if (!pairs.length) {
    if (manual) toast("Cần ít nhất hai bông hoa thường (chưa có con chung) trong vườn để ong thụ phấn.");
    return;
  }
  const [a, b] = shuffle(pairs)[0];
  const [mom, dad] = Math.random() < 0.5 ? [a, b] : [b, a];

  bee.busy = true;
  try {
    if (!(await visit(bee, mom.id)) || !alive(mom.id) || !alive(dad.id)) return;
    if (!(await visit(bee, dad.id)) || !alive(mom.id) || !alive(dad.id)) return;
    spawnChild(mom, dad);
  } finally {
    bee.busy = false;
    bee.wait = 0;
  }
}

function spawnChild(mom, dad) {
  const child = {
    id: newId(),
    texts: [mom.texts[0], dad.texts[0]],
    types: [mom.types[0], dad.types[0]],
    hybrid: true,
    parents: [mom.id, dad.id],
    x: clamp((mom.x + dad.x) / 2 + rand(-0.03, 0.03), 0.06, 0.94),
    y: clamp((mom.y + dad.y) / 2 + rand(-0.08, 0.08), 0, 1),
    status: "garden",
    missing: [],
  };
  state.poems.push(child);
  save();
  renderFlower(child, true);
  setTimeout(() => { const pt = headPoint(child.id); if (pt) puff(pt, "✨"); }, 500);
  applyGlow();
  toast("Ong vừa thụ phấn: một chùm thơ lai hai bài đã nở 🌸");
}

$("bee-btn").addEventListener("click", () => pollinate(true));
$("rain-btn").addEventListener("click", () => {
  if (raining) { toast("Trời đang mưa rồi."); return; }
  startRain();
});

// Mưa ngẫu nhiên đúng 1 lần mỗi ngày (giờ mưa được chọn ngẫu nhiên trong 8h-22h;
// nếu lúc đó chưa mở trang thì mưa ngay khi bạn ghé vườn lần đầu sau giờ ấy)
const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
function checkDailyRain() {
  const today = dayKey();
  if (!state.rain || state.rain.day !== today) {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0).getTime();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0).getTime();
    const now = Date.now();
    state.rain = { day: today, at: rand(Math.max(start, now + 30000), Math.max(end, now + 120000)), done: false };
    save();
  }
  if (!state.rain.done && !raining && Date.now() >= state.rain.at) {
    state.rain.done = true;
    save();
    startRain();
  }
}
setInterval(checkDailyRain, 20000);
checkDailyRain();
(function scheduleBee() {
  setTimeout(() => { pollinate(false); scheduleBee(); }, rand(45000, 100000));
})();

// ---------- Phím tắt ----------
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("basket-overlay").hidden) closeBasket();
  else if (mode) setMode(null);
  else if (!panel.hidden) closePanel();
});

// ---------- Xuất vườn (chủ vườn) -> garden.json để đăng cho khách xem ----------
function exportGarden() {
  const poems = state.poems.filter((p) => p.status === "garden")
    .map(({ id, texts, types, hybrid, parents, x, y }) => ({ id, texts, types, hybrid, parents, x, y }));
  const blob = new Blob([JSON.stringify({ version: 1, poems }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "garden.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Đã xuất ${poems.length} bông hoa ra garden.json. Bỏ file này vào thư mục dự án rồi đăng lên nhé.`);
}
$("export-btn").addEventListener("click", exportGarden);

// ---------- Khởi động ----------
function init() {
  state.poems.filter((p) => p.status === "garden").forEach((p) => renderFlower(p, false));
  state.fallen.forEach((f) => renderFallen(f, null));
  refreshHint();
  updateBasketCount();
  updateBin();
  updateNet();
  applyGlow();
}

async function boot() {
  if (GUEST) {
    try {
      const res = await fetch("garden.json", { cache: "no-cache" });
      const data = await res.json();
      state.poems = (data.poems || []).map((p) => ({ ...normPoem(p), status: "garden", missing: [] }));
    } catch {}
    if (!state.poems.length) hintEl.textContent = "Khu vườn đang được chuẩn bị, bạn quay lại sau nhé ✿";
    else hintEl.textContent = "";
  }
  init();
}
boot();
window.addEventListener("resize", () =>
  document.querySelectorAll(".flower").forEach((el) => {
    const p = getPoem(el.dataset.id);
    if (p) placeFlower(el, p);
  }));
