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

// Vai trò sau khi đăng nhập: "owner" (chủ vườn) hoặc "guest" (khách).
// Khách làm được mọi thứ trừ gieo hạt và cho ong thụ phấn.
let ROLE = null;      // "owner" | "guest"
let ME = null;        // { uid, name }
let db = null, auth = null, SV = null, OWNER_MAIL = "", BACKEND_MODE = "mock";
let realDb = null;    // máy chủ thật; `db` bị tráo sang bộ nhớ tạm khi khách "hóa thân chủ vườn" (DEMO)
let DEMO = false;
const isOwner = () => ROLE === "owner";

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
    gift: bool, from: tên người tặng   // hoa mọc từ hạt giống khách tặng: đen trắng, chỉ hái được, không tặng lại được
    missing: ["0:3", ...]   // chữ đã rơi: "bài:vị trí chữ"
  }
  fallen = [{ id, word, flowerId, key, x, b, t }]   // chữ đang nằm dưới đất
  compost = số cục phân bón trong thùng
  Tất cả được đồng bộ từ máy chủ (db: garden/poems, garden/fallen, garden/compost);
  riêng "net" (số chữ đang nằm trong vợt) lưu trên máy của từng người.
*/
let state;              // bản sao dữ liệu vườn, cập nhật qua các listener của máy chủ
let openId = null;      // bài thơ đang mở
let panelFromBasket = false;   // bảng thơ đang mở cho một bông hoa trong giỏ
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

// ---------- Dữ liệu ----------
const NET_KEY = "khuVuonVot";
function loadNet() { try { return parseInt(localStorage.getItem(NET_KEY), 10) || 0; } catch { return 0; } }
function saveNet() { if (DEMO) return; try { localStorage.setItem(NET_KEY, String(state.net)); } catch {} }

state = { poems: [], fallen: [], compost: 0, net: loadNet(), bag: [], order: null, last: null };

const toArr = (v) => Array.isArray(v) ? v
  : v && typeof v === "object" ? Object.keys(v).sort((a, b) => a - b).map((k) => v[k]) : [];
const validType = (t) => (FLOWERS[t] ? t : 0);

// dạng cũ / dạng nhập từ file
function normPoem(p) {
  return {
    id: p.id,
    texts: p.texts || [p.text || ""],
    types: (p.types || [p.type || 0]).map(validType),
    hybrid: !!p.hybrid,
    parents: p.parents || null,
    x: p.x ?? 0.5,
    y: p.y ?? 0.5,
    status: p.status || "garden",
    missing: p.missing || [],
    gift: !!p.gift,
    from: p.from || "",
  };
}
function poemFromDb(id, d) {
  return {
    id,
    texts: toArr(d.texts).map(String),
    types: toArr(d.types).map(validType),
    hybrid: !!d.hybrid,
    parents: d.parents ? toArr(d.parents) : null,
    x: d.x ?? 0.5,
    y: d.y ?? 0.5,
    status: d.status || "garden",
    missing: Object.keys(d.missing || {}),
    gift: !!d.gift,
    from: d.from || "",
    t: d.t || 0,
  };
}
function poemToDb(p) {
  const o = { texts: p.texts, types: p.types, hybrid: !!p.hybrid, x: p.x, y: p.y, status: p.status || "garden", t: Date.now() };
  if (p.parents) o.parents = p.parents;
  if (p.gift) { o.gift = true; o.from = p.from || ""; }
  if (p.missing && p.missing.length) { o.missing = {}; p.missing.forEach((k) => { o.missing[k] = true; }); }
  return o;
}

// Vườn cũ lưu trong trình duyệt (trước khi có máy chủ) để chuyển lên mạng
function readLegacy() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw) return null;
    const o = Array.isArray(raw) ? { poems: raw } : raw;
    const poems = (o.poems || []).map(normPoem);
    return poems.length ? { poems, fallen: o.fallen || [], compost: o.compost || 0 } : null;
  } catch { return null; }
}

// Chọn kiểu hoa cho hạt mới: dùng hết 50 mẫu rồi mới xáo lại (thứ tự khác vòng trước),
// và không bao giờ để hai bông giống nhau mọc liên tiếp. Trạng thái được lưu trên máy chủ.
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
  db.ref("garden/seedbag").set({ bag: state.bag, order: state.order, last: t });
  return t;
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
// Dọn khoảng cách dòng: bỏ khoảng trắng thừa ở đầu/cuối mỗi dòng, bỏ dòng trống ở đầu và cuối bài,
// nhiều dòng trống liền nhau chỉ giữ một (ngăn cách khổ thơ). Dòng trống = mảng rỗng [].
function tidyLines(text) {
  const out = [];
  parseText(text).forEach((line) => {
    let a = 0, b = line.length;
    while (a < b && line[a].ws) a++;
    while (b > a && line[b - 1].ws) b--;
    const l = line.slice(a, b);
    if (l.length) out.push(l);
    else if (out.length && out[out.length - 1].length) out.push([]);
  });
  while (out.length && !out[out.length - 1].length) out.pop();
  return out;
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
  return tidyLines(p.texts[pi]).map((line) =>
    line.map((w) => (!w.ws && isMissing(p, pi, w.idx) ? "···" : w.t)).join("")).join("\n");
}

// ---------- Vẽ hoa ----------
function renderFlower(p, animate) {
  const el = document.createElement("div");
  el.className = "flower" + (p.gift ? " gift" : "");
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
  el.style.setProperty("--drift", "0px");          // bay thẳng lên từ bông hoa
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
  db.ref("garden/poems/" + p.id).update({
    x: clamp(e.clientX / window.innerWidth, 0.04, 0.96),
    y: clamp((vh - e.clientY - 10) / (vh * 0.42), 0, 1),
    status: "garden",
    t: Date.now(),
  });
  touchPoem(p.id);
  toast("Đã trồng lại bông hoa 🌷");
}, true);

// ---------- Gieo hạt ----------
seedToggle.addEventListener("click", () => {
  const open = seedForm.hidden;
  seedForm.hidden = !open;
  seedToggle.setAttribute("aria-expanded", open);
  if (open) poemInput.focus();
});

// Gieo một hạt: tạo bài thơ rồi cho hạt rơi xuống, hoa nở. extra = { gift: true, from } cho hạt được tặng.
function sowSeed(text, extra = {}) {
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
    t: Date.now(),
    ...extra,
  };
  holdRender.add(p.id);               // hạt rơi xong mới cho hoa nở
  state.poems.push(p);
  const saved = db.ref("garden/poems/" + p.id).set(poemToDb(p));
  touchPoem(p.id);
  refreshHint();

  // Hạt rơi xuống rồi hoa nở
  const seed = document.createElement("div");
  seed.className = "seed";
  seed.style.left = p.x * 100 + "%";
  seed.style.bottom = 10 + p.y * (window.innerHeight * 0.42) + "px";
  gardenEl.appendChild(seed);
  let bloomed = false;
  const bloomNow = () => {          // chạy khi hạt rơi xong, hoặc sau 1,3 giây nếu trình duyệt không chạy hoạt ảnh (tab nền)
    if (bloomed) return;
    bloomed = true;
    seed.remove();
    holdRender.delete(p.id);
    if (!flowerEl(p.id) && getPoem(p.id)?.status === "garden") renderFlower(getPoem(p.id), true);
    applyGlow();
  };
  seed.addEventListener("animationend", bloomNow);
  setTimeout(bloomNow, 1300);
  return saved;
}

// Khách tặng hạt giống: bài thơ vào hộp hạt giống tặng của chủ vườn, tự ghi tên khách (tên nhập lúc vào vườn)
function sendSeedGift(text) {
  const btn = seedForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  db.ref("gifts").push().set({ from: ME.name, fromUid: ME.uid, text, t: SV.TIMESTAMP })
    .then(() => {
      poemInput.value = "";
      seedForm.hidden = true;
      seedToggle.setAttribute("aria-expanded", false);
      toast("Đã gửi hạt giống vào hộp quà của chủ vườn 🎁");
    })
    .catch(() => toast("Chưa gửi được hạt giống, bạn thử lại nhé."))
    .finally(() => { btn.disabled = false; });
}

seedForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = poemInput.value.trim();
  if (!text) return;
  if (!isOwner()) { sendSeedGift(text); return; }
  sowSeed(text);
  poemInput.value = "";
  seedForm.hidden = true;
  seedToggle.setAttribute("aria-expanded", false);
});

// Giao diện hạt giống đổi theo vai trò: chủ vườn gieo, khách tặng
function applyRoleUI() {
  const owner = isOwner();
  seedToggle.textContent = owner ? "🌱 Hạt giống" : "🎁 Tặng hạt giống";
  poemInput.placeholder = owner
    ? "Dán bài thơ vào đây, hoặc thả/dán một tấm ảnh có chữ để web tự đọc..."
    : "Viết hoặc dán bài thơ bạn muốn tặng chủ vườn...";
  seedForm.querySelector('button[type="submit"]').textContent = owner ? "Gieo hạt" : "Gửi tặng chủ vườn";
  $("seed-note").hidden = owner;
  $("seed-note-name").textContent = ME ? ME.name : "";
  $("demo-banner").hidden = !DEMO;
}

// ---------- Đọc chữ từ ảnh (OCR, chạy ngay trong trình duyệt bằng Tesseract.js, tiếng Việt) ----------
let tessLoading = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  if (!tessLoading) tessLoading = loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
  return tessLoading;
}
let ocrBusy = false;
async function readImageText(file) {
  if (ocrBusy || !file) return;
  const status = $("ocr-status");
  if (!file.type.startsWith("image/")) { status.hidden = false; status.textContent = "Đây không phải file ảnh."; return; }
  ocrBusy = true;
  status.hidden = false;
  status.textContent = "Đang tải bộ đọc chữ… (lần đầu hơi lâu)";
  try {
    await loadTesseract();
    const res = await Tesseract.recognize(file, "vie", {
      logger: (m) => {
        if (m.status === "recognizing text") status.textContent = `Đang đọc chữ… ${Math.round(m.progress * 100)}%`;
        else if (m.status) status.textContent = "Đang chuẩn bị…";
      },
    });
    const text = (res.data.text || "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) { status.textContent = "Không đọc được chữ nào trong ảnh. Thử ảnh rõ và thẳng hơn nhé."; return; }
    const cur = poemInput.value.trim();
    poemInput.value = cur ? cur + "\n\n" + text : text;
    status.textContent = "Đã đọc xong. Kiểm tra lại chữ rồi bấm Gieo hạt nhé.";
  } catch (err) {
    status.textContent = "Không đọc được ảnh: " + (err.message || err);
  } finally {
    ocrBusy = false;
  }
}
$("poem-image").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; readImageText(f); });
poemInput.addEventListener("paste", (e) => {                       // dán ảnh từ clipboard
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) { e.preventDefault(); readImageText(item.getAsFile()); }
});
seedForm.addEventListener("dragover", (e) => { e.preventDefault(); seedForm.classList.add("dragover"); });
seedForm.addEventListener("dragleave", () => seedForm.classList.remove("dragover"));
seedForm.addEventListener("drop", (e) => {                         // thả ảnh vào form
  e.preventDefault();
  seedForm.classList.remove("dragover");
  const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
  if (f) readImageText(f);
});

// ---------- Mở bài thơ ----------
function openPoem(id, fromBasket = false) {
  const p = getPoem(id);
  if (!p || p.status !== (fromBasket ? "basket" : "garden")) return;
  if (!fromBasket) closeBasket();       // hoa trong giỏ: bảng thơ hiện đè lên giỏ, giỏ vẫn mở phía sau
  panelFromBasket = fromBasket;
  panel.classList.toggle("from-basket", fromBasket);
  $("delete-btn").style.display = fromBasket ? "none" : "";
  openId = id;
  pickedWord = null;
  if (!fromBasket) touchPoem(id);
  renderPoem(p);
  panel.hidden = false;
  panel.style.animation = "none"; panel.offsetHeight; panel.style.animation = "";
  applyGlow();
}

function renderPoem(p) {
  poemMeta.textContent = p.gift ? `🎁 hạt giống tặng từ ${p.from || "một người bạn"}` : p.hybrid ? "chùm thơ lai · 2 bài" : "";
  poemText.innerHTML = "";
  p.texts.forEach((text, pi) => {
    if (pi > 0) {
      const sep = document.createElement("div");
      sep.className = "sep";
      sep.textContent = "✿";
      poemText.appendChild(sep);
    }
    tidyLines(text).forEach((line) => {
      const div = document.createElement("div");
      div.className = line.length ? "line" : "line gap";
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

// Căn lề bài thơ (trái / giữa / phải): mỗi người tự chọn, nhớ trên máy của mình
const ALIGN_KEY = "khuVuonCanLe";
let poemAlign = (() => { try { const a = localStorage.getItem(ALIGN_KEY); return ["left", "center", "right"].includes(a) ? a : "left"; } catch { return "left"; } })();
function applyAlign() {
  poemText.style.textAlign = poemAlign;
  document.querySelectorAll("#align-bar button").forEach((b) => b.classList.toggle("on", b.dataset.align === poemAlign));
}
document.querySelectorAll("#align-bar button").forEach((b) => b.addEventListener("click", () => {
  poemAlign = b.dataset.align;
  try { localStorage.setItem(ALIGN_KEY, poemAlign); } catch {}
  applyAlign();
}));
applyAlign();

function closePanel() {
  panel.hidden = true;
  panelFromBasket = false;
  openId = null;
  pickedWord = null;
  applyGlow();
}
$("panel-close").addEventListener("click", closePanel);

// Hái hoa bỏ vào giỏ
$("delete-btn").addEventListener("click", () => {
  const p = getPoem(openId);
  if (!p) return;
  db.ref("garden/poems/" + p.id).update({ status: "basket", t: Date.now() });
  closePanel();
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
  art.className = "card-art" + (p.hybrid ? " hybrid" : "") + (p.gift ? " gift" : "");
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
  art.addEventListener("click", () => openPoem(p.id, true));      // bấm vào hoa: bài thơ hiện như hoa trong vườn
  card.appendChild(art);

  const hint = document.createElement("p");
  hint.className = "card-hint";
  hint.textContent = p.gift ? `🎁 tặng từ ${p.from || "một người bạn"} · chạm vào hoa để đọc` : "chạm vào hoa để đọc";
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
  gift.addEventListener("click", () => askGift(p));
  const trash = document.createElement("button");
  trash.textContent = "🗑️ Thùng rác hữu cơ";
  trash.addEventListener("click", () => {
    if (!confirm("Bỏ hẳn bông hoa này vào thùng rác hữu cơ?\nBông hoa sẽ biến mất và không lấy lại được.")) return;
    db.ref("garden/poems/" + p.id).remove();
    toast("Đã bỏ bông hoa vào thùng rác hữu cơ 🗑️");
  });
  actions.append(replant);
  if (isOwner()) actions.append(trash);          // xóa hẳn: chỉ chủ vườn
  if (isOwner() && !p.gift) actions.append(gift);   // chỉ chủ vườn được tặng hoa, và hoa được tặng thì không tặng lại
  card.appendChild(actions);
  return card;
}

// Hộp thoại "ô ghi tên": ghi tên người nhận (hoặc bỏ qua) rồi mới tặng
let giftTarget = null;
function askGift(p) {
  if (!isOwner() || p.gift) return;
  giftTarget = p;
  $("gift-name").value = "";
  $("gift-overlay").hidden = false;
  setTimeout(() => $("gift-name").focus(), 50);
}
function closeGift() { $("gift-overlay").hidden = true; giftTarget = null; }
$("gift-box").addEventListener("submit", (e) => {
  e.preventDefault();
  const p = giftTarget, to = $("gift-name").value.trim().replace(/\s+/g, " ");
  closeGift();
  if (p) giftPoem(p, to);
});
$("gift-skip").addEventListener("click", () => { const p = giftTarget; closeGift(); if (p) giftPoem(p, ""); });
$("gift-cancel").addEventListener("click", closeGift);
$("gift-overlay").addEventListener("click", (e) => { if (e.target === $("gift-overlay")) closeGift(); });

// Tặng = vẽ thẻ hoa thành ảnh PNG, chép vào clipboard (nếu trình duyệt không cho thì tải ảnh về), rồi bỏ khỏi giỏ
async function giftPoem(p, to = "") {
  if (!isOwner() || p.gift) return;
  const blobPromise = renderCardPNG(p, to);
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
  db.ref("garden/poems/" + p.id).remove();
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

// Vẽ một bông hoa (đầu hoa chiếm ~72% bề rộng), bài thơ nằm trọn trong đầu hoa
async function drawBloomImage(ctx, bt, ht, text, ox, W, H) {
  const info = FLOWERS[ht].info;
  const vw = Math.max(info.w, 46) / 0.66, vh = (vw * H) / W;
  const vx = info.c[0] - vw / 2, vy = info.c[1] - vh * 0.43;
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
  drawPoemPatch(ctx, text, ox + (bx - vx) * k, (by - vy) * k, bw * 2 * k, bh * 2 * k, Math.round(W * 0.042));
}

async function renderCardPNG(p, to = "") {
  const W = 720, H = 920;                       // mỗi bông một khung; hoa lai có hai khung cạnh nhau
  const total = W * (p.hybrid ? 2 : 1);
  const canvas = document.createElement("canvas");
  canvas.width = total;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // giấy kem
  ctx.fillStyle = "#fff7e8";
  ctx.fillRect(0, 0, total, H);

  if (p.hybrid) {
    const [a, b] = p.types;
    await drawBloomImage(ctx, a, b, p.texts[0], 0, W, H);
    await drawBloomImage(ctx, b, a, p.texts[1], W, W, H);
  } else {
    await drawBloomImage(ctx, p.types[0], p.types[0], p.texts[0], 0, W, H);
  }

  // dải giấy ở chân và đầu ảnh để chữ không đè lên hoa, rồi khung mảnh
  ctx.fillStyle = "#fff7e8";
  ctx.fillRect(0, H * 0.9, total, H * 0.1);
  if (to) ctx.fillRect(0, 0, total, H * 0.11);
  ctx.strokeStyle = "#e6d3b0";
  ctx.lineWidth = 3;
  roundRectPath(ctx, 18, 18, total - 36, H - 36, 26);
  ctx.stroke();

  // dòng "tặng ai" ở trên
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (to) {
    ctx.fillStyle = "#8a6a4f";
    ctx.font = `italic ${Math.round(H * 0.034)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(`gửi ${to}`, total / 2, H * 0.068);
  }
  // thẻ ghi nguồn + năm ở dưới
  ctx.fillStyle = "#a28a70";
  ctx.font = `italic ${Math.round(H * 0.026)}px Georgia, "Times New Roman", serif`;
  ctx.fillText(`hoa từ khu vườn thơ của tôi - diolmes ${new Date().getFullYear()}`, total / 2, H * 0.947);

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
}

$("basket-btn").addEventListener("click", openBasket);
$("basket-close").addEventListener("click", closeBasket);
$("basket-overlay").addEventListener("click", (e) => { if (e.target === $("basket-overlay")) closeBasket(); });

// ---------- Cảnh vườn: đường đi + cỏ ----------
(function makeScenery() {
  const ground = $("ground");
  // đường đất uốn lượn từ dưới lên chân trời (thu nhỏ dần cho có chiều sâu)
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "path");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.innerHTML = `
    <path d="M40 100 C42 82 58 74 54 58 C51 46 44 40 49 26 C51 20 53 14 53.5 8 L55.5 8 C56 14 59 22 58 28 C56 42 70 48 70 62 C70 78 62 88 66 100 Z" fill="#e8d3a2"/>
    <path d="M40 100 C42 82 58 74 54 58 C51 46 44 40 49 26 C51 20 53 14 53.5 8" fill="none" stroke="#d4bb82" stroke-width=".7" stroke-linecap="round"/>
    <path d="M66 100 C62 88 70 78 70 62 C70 48 56 42 58 28 C59 22 56 14 55.5 8" fill="none" stroke="#d4bb82" stroke-width=".7" stroke-linecap="round"/>
    <g fill="#c9b283">
      <ellipse cx="52" cy="90" rx="1.6" ry=".9"/><ellipse cx="58" cy="82" rx="1.2" ry=".7"/>
      <ellipse cx="55" cy="68" rx="1" ry=".6"/><ellipse cx="62" cy="58" rx="1" ry=".55"/>
      <ellipse cx="52" cy="46" rx=".8" ry=".45"/><ellipse cx="53" cy="30" rx=".6" ry=".35"/>
    </g>`;
  ground.appendChild(svg);

  // cỏ rải rác (tránh lòng đường)
  const blade = (c) => `<svg viewBox="0 0 26 20"><path d="M3 20 Q4 8 1 3 Q7 8 9 20 M10 20 Q11 5 12 0 Q17 7 16 20 M17 20 Q19 9 24 4 Q22 12 23 20" fill="${c}"/></svg>`;
  const greens = ["#8fb96a", "#7aa85a", "#a3c97c", "#6f9c52"];
  for (let i = 0; i < 46; i++) {
    const y = rand(10, 98);                       // % chiều cao vùng đất
    const roadL = 40 + (60 - 40) * 0, roadR = 70;  // xấp xỉ bề ngang đường, hẹp dần lên trên
    const t = y / 100;
    const cx = 54 + (1 - t) * 4, half = 3 + t * 11;
    let x = rand(2, 98);
    if (Math.abs(x - cx) < half + 2) x = x < cx ? rand(2, Math.max(3, cx - half - 2)) : rand(Math.min(97, cx + half + 2), 98);
    const el = document.createElement("div");
    el.className = "tuft";
    el.style.left = x + "%";
    el.style.top = y + "%";
    const sc = 0.55 + t * 0.9;
    el.style.width = 26 * sc + "px";
    el.style.height = 20 * sc + "px";
    el.innerHTML = blade(greens[i % greens.length]);
    ground.appendChild(el);
  }
})();

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
function startRain(execute = false) {
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
  if (execute) setTimeout(dropWords, 3000);   // chỉ máy khởi động cơn mưa mới làm rụng chữ
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
  const vh = window.innerHeight;
  const upd = {};
  take.forEach((s) => {
    upd[`poems/${id}/missing/${s.key}`] = true;
    upd[`fallen/${newId()}`] = {
      word: s.word,
      flowerId: id,
      key: s.key,
      x: clamp(p.x + rand(-0.05, 0.05), 0.03, 0.97),
      b: clamp(10 + p.y * vh * 0.42 + rand(-24, 24), 10, 10 + vh * 0.42),
      t: Date.now(),
    };
  });
  db.ref("garden").update(upd);
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

function updateBin() {}   // đã bỏ bộ đếm số phân bón
function updateNet() {
  $("net-count").textContent = state.net;
  $("net-count").hidden = state.net === 0;
}

// n chữ biến thành n cục phân bón
function addCompost(n) {
  const first = state.compost === 0;
  db.ref("garden/compost").transaction((c) => (c || 0) + n);
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
      el.remove();
      db.ref("garden/fallen/" + f.id).remove();
      addCompost(1);
    } else {
      const vh = window.innerHeight;
      f.x = clamp(ev.clientX / window.innerWidth, 0.02, 0.98);
      f.b = clamp(vh - ev.clientY - 10, 10, 10 + vh * 0.42);
      el.style.left = f.x * 100 + "%";
      el.style.bottom = f.b + "px";
      db.ref("garden/fallen/" + f.id).update({ x: f.x, b: f.b });
    }
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
  gardenEl.querySelectorAll(".fallen:not(.scooped)").forEach((el) => {
    const r = el.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - hx, r.top + r.height / 2 - hy);
    if (d > (HOOP.r + 14) * k) return;
    db.ref("garden/fallen/" + el.dataset.id).remove();
    el.style.pointerEvents = "none";
    el.classList.add("scooped");
    setTimeout(() => el.remove(), 300);
    got++;
  });
  if (got) { state.net += got; updateNet(); saveNet(); }
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
      saveNet();
      addCompost(n);
      toast(`Đã đổ ${n} chữ vào thùng phân hữu cơ.`);
    } else if (!moved) {
      toast("Kéo vợt quét qua các chữ rơi, rồi kéo vợt tới thùng phân để đổ.");
    }
    netEl.style.left = netEl.style.top = netEl.style.right = netEl.style.bottom = "";   // về chỗ cũ
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
async function fertilize(id) {
  const p = getPoem(id);
  if (!p || !p.missing.length) return;
  const res = await db.ref("garden/compost").transaction((c) => ((c || 0) > 0 ? c - 1 : undefined));
  if (!res.committed) { toast("Thùng phân đang trống."); return; }
  const upd = { [`poems/${id}/missing`]: null };
  state.fallen.filter((f) => f.flowerId === id).forEach((f) => { upd[`fallen/${f.id}`] = null; });
  db.ref("garden").update(upd);
  touchPoem(id);
  const pt = headPoint(id);
  if (pt) { puff(pt, "🌿"); puff(pt, "✨"); }
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

const alive = (id) => { const p = getPoem(id); return !!p && p.status === "garden" && !p.hybrid && !p.gift; };
const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };

async function visit(bee, id) {
  const pt = headPoint(id);
  if (!pt) return false;
  await bee.goTo(pt.x, pt.y);
  puff(pt, "🌼");
  await sleep(1200);
  return true;
}

// chỉ hoa thường mới được làm bố mẹ, và mỗi cặp chỉ có một hoa con
function pickPair() {
  const parents = state.poems.filter((p) => p.status === "garden" && !p.hybrid && !p.gift);
  const pairs = [];
  for (let i = 0; i < parents.length; i++) {
    for (let j = i + 1; j < parents.length; j++) {
      const a = parents[i], b = parents[j];
      const used = state.poems.some((c) => c.hybrid && c.parents && c.parents.includes(a.id) && c.parents.includes(b.id));
      if (!used) pairs.push([a, b]);
    }
  }
  if (!pairs.length) return null;
  const [a, b] = shuffle(pairs)[0];
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

// Ong bay đi thăm hai bông hoa. spawn = true: chỉ máy giành được lượt hôm nay mới tạo hoa con.
async function runPollination(momId, dadId, spawn) {
  const bee = bees.find((b) => !b.busy);
  if (!bee) {
    if (spawn && getPoem(momId) && getPoem(dadId)) spawnChild(getPoem(momId), getPoem(dadId));
    return;
  }
  bee.busy = true;
  try {
    if (!(await visit(bee, momId)) || !alive(momId) || !alive(dadId)) return;
    if (!(await visit(bee, dadId)) || !alive(momId) || !alive(dadId)) return;
    if (spawn) spawnChild(getPoem(momId), getPoem(dadId));
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
  db.ref("garden/poems/" + child.id).set(poemToDb(child));
  setTimeout(() => { const pt = headPoint(child.id); if (pt) puff(pt, "✨"); }, 600);
  toast("Ong vừa thụ phấn: một chùm thơ lai hai bài đã nở 🌸");
}

// Ong chỉ đi thụ phấn 1 lần mỗi ngày (cả vườn dùng chung một lượt)
let beeSeen = null;
async function claimPollination(manual) {
  if (manual && !isOwner()) return;                    // khách không được gọi ong
  if (state.poems.filter((p) => p.hybrid).length >= 12) { if (manual) toast("Vườn đã đông hoa lai rồi."); return false; }
  const pair = pickPair();
  if (!pair) {
    if (manual) toast("Cần ít nhất hai bông hoa thường (chưa có con chung) trong vườn để ong thụ phấn.");
    return false;
  }
  const today = dayKey();
  const myId = newId();
  beeSeen = myId;      // đánh dấu trước để máy này không tự chạy lại như người ngoài
  const res = await db.ref("garden/bee").transaction((cur) => {
    if (cur && cur.lastDay === today) return undefined;
    return { lastDay: today, mom: pair[0].id, dad: pair[1].id, at: Date.now(), id: myId, by: ME.uid };
  });
  if (!res.committed) {
    if (manual) toast("Hôm nay ong đã đi thụ phấn rồi, mai nhé 🐝");
    return false;
  }
  runPollination(pair[0].id, pair[1].id, true);
  return true;
}

// Mưa: ai bấm ☔ cũng được, không giới hạn số cơn mưa trong ngày. Một cơn mưa kéo dài 10 giây;
// đang mưa mà bấm thì chỉ nhắc, không tính vào số lần gọi.
const RAIN_MS = 10000;
let rainSeen = null;
async function triggerRain(manual) {
  const myId = newId();
  rainSeen = myId;     // đánh dấu trước, kẻo listener nhìn thấy cơn mưa của chính mình rồi chạy như người ngoài
  const res = await db.ref("garden/rainNow").transaction((cur) => {
    const now = Date.now();
    if (cur && now - cur.at < (manual ? RAIN_MS : 60000)) return undefined;     // máy khác vừa gọi mưa xong
    return { at: now, id: myId, by: ME.uid };
  });
  if (!res.committed) { if (manual) toast("Đang mưa rồi nè ☔"); return false; }
  startRain(true);
  return true;
}

// ---------- Bướm: bay một vòng, đậu lên bài thơ vừa được chạm tới gần nhất, rồi bay thêm một vòng ----------
const BTF_SVG = `<svg viewBox="0 0 40 34">
  <g class="wing l">
    <ellipse cx="11" cy="11" rx="10" ry="9" fill="var(--bw)" transform="rotate(-20 11 11)"/>
    <ellipse cx="13" cy="25" rx="7.5" ry="6" fill="var(--bw)" transform="rotate(15 13 25)"/>
    <circle cx="9" cy="10" r="2.6" fill="var(--bw2)"/>
  </g>
  <g class="wing r">
    <ellipse cx="29" cy="11" rx="10" ry="9" fill="var(--bw)" transform="rotate(20 29 11)"/>
    <ellipse cx="27" cy="25" rx="7.5" ry="6" fill="var(--bw)" transform="rotate(-15 27 25)"/>
    <circle cx="31" cy="10" r="2.6" fill="var(--bw2)"/>
  </g>
  <ellipse cx="20" cy="18" rx="1.9" ry="10" fill="#4a3b32"/>
  <path d="M20 9 Q16 2 12 3 M20 9 Q24 2 28 3" stroke="#4a3b32" stroke-width="1.2" fill="none" stroke-linecap="round"/>
</svg>`;
const BTF_COLORS = [["#f59a3d", "#fff0c8"], ["#6fb7e9", "#eaf6ff"], ["#e98bb5", "#ffe9f2"], ["#9a86d9", "#f0eaff"], ["#f2d04a", "#fffbe0"]];

// chạy một đoạn hoạt ảnh trong `ms` mili giây, fn(u) với u từ 0 đến 1
function animate(ms, fn) {
  return new Promise((res) => {
    const t0 = performance.now();
    (function step(now) {
      const u = clamp((now - t0) / ms, 0, 1);
      fn(u);
      if (u < 1) requestAnimationFrame(step); else res();
    })(t0);
  });
}

// bài thơ để bướm đậu: bài được chạm tới (mở đọc, bón phân, trồng lại, gieo) gần nhất
function pickButterflyTarget() {
  const garden = state.poems.filter((p) => p.status === "garden");
  if (!garden.length) return null;
  const t = state.touch;
  if (t && garden.some((p) => p.id === t.id)) return t.id;
  return garden.slice().sort((a, b) => (b.t || 0) - (a.t || 0))[0].id;    // chưa ai chạm vào: bông mới nhất
}
function touchPoem(id) {
  try { db.ref("garden/lastTouch").set({ id, at: SV.TIMESTAMP }); } catch {}
}

const BTF_MAX = 3;            // tối đa 3 con bướm trong vườn cùng lúc
const BTF_LIFE = 42000;       // một chuyến bay dài tối đa chừng này mili giây (quá hạn thì coi như đã bay đi, đề phòng máy gọi bướm bị tắt giữa chừng)
const BTF_SLOT_DELAY = 3000;  // bướm bay khỏi màn hình rồi, chờ chừng này mili giây mới trả chỗ
const btfActive = new Set();
async function runButterfly(poemId, seedId = "", owned = false) {
  if (btfActive.has(seedId)) return;
  btfActive.add(seedId);
  const el = document.createElement("div");
  el.className = "bf";
  el.innerHTML = BTF_SVG;
  const [c1, c2] = BTF_COLORS[[...(seedId || poemId)].reduce((h, c) => h + c.charCodeAt(0), 0) % BTF_COLORS.length];
  el.style.setProperty("--bw", c1);
  el.style.setProperty("--bw2", c2);
  $("bee-layer").appendChild(el);
  const vw = window.innerWidth, vh = window.innerHeight;
  const pos = { x: -50, y: vh * rand(0.35, 0.55), dir: 1, t: 0 };
  const spin = Math.random() < 0.5 ? 1 : -1;                  // mỗi con lượn theo một chiều
  const off = { x: rand(-14, 14), y: rand(-3, 3) };           // đậu lệch nhau chút nếu cùng một bài
  const place = (x, y) => {
    if (Math.abs(x - pos.x) > 0.3) pos.dir = x > pos.x ? 1 : -1;
    pos.x = x; pos.y = y; pos.t += 0.016;
    const wob = el.classList.contains("landed") ? 0 : Math.sin(pos.t * 9) * 4;
    el.style.transform = `translate(${x - 19}px, ${y - 17 + wob}px) scaleX(${pos.dir})`;
  };
  const flyTo = (x, y) => {
    const x0 = pos.x, y0 = pos.y, d = Math.hypot(x - x0, y - y0);
    const nx = d ? -(y - y0) / d : 0, ny = d ? (x - x0) / d : 0;          // hướng vuông góc để lượn sóng
    return animate(clamp(d / 140, 0.9, 4.5) * 1000, (u) => {
      const e = u * u * (3 - 2 * u), w = Math.sin(u * Math.PI * 3) * 16 * Math.sin(u * Math.PI);
      place(x0 + (x - x0) * e + nx * w, y0 + (y - y0) * e + ny * w);
    });
  };
  // bay một vòng elip: bắt đầu từ góc `a0` (0 = bên phải, π/2 = phía dưới, π = bên trái)
  const orbit = async (cx, cy, rx, ry, a0, ms) => {
    rx *= rand(0.85, 1.15); ry *= rand(0.85, 1.15);
    const at = (a) => ({ x: clamp(cx + Math.cos(a) * rx, 24, window.innerWidth - 24), y: Math.max(70, cy + Math.sin(a) * ry) });
    const s = at(a0);
    if (Math.hypot(s.x - pos.x, s.y - pos.y) > 8) await flyTo(s.x, s.y);
    await animate(ms, (u) => { const p = at(a0 + spin * u * Math.PI * 2); place(p.x, p.y); });
  };

  try {
    // 1) vào vườn, bay một vòng quanh khu vườn
    await orbit(vw / 2, vh * 0.5, vw * 0.34, vh * 0.17, Math.PI, 6500);
    // 2) đậu lên bài thơ
    let h = headPoint(poemId);
    if (h) {
      await flyTo(h.x + off.x, h.y - 6 + off.y);
      el.classList.add("landed");
      emitScent(poemId);
      await animate(8500, (u) => {
        const n = headPoint(poemId);
        if (n) { h = n; place(n.x + off.x + Math.sin(u * 40) * 1.2, n.y - 6 + off.y); }
      });
      el.classList.remove("landed");
      // 3) cất cánh, bay thêm một vòng quanh bông hoa
      await orbit(h.x, h.y - 70, 150, 70, Math.PI / 2, 5500);
    }
    // 4) bay đi
    await flyTo(window.innerWidth + 60, pos.y - 90);
  } finally {
    el.remove();
    btfActive.delete(seedId);
    // bay đi khỏi màn hình khoảng 3 giây thì mới trả chỗ cho con khác
    if (owned) setTimeout(() => { try { db.ref("garden/butterfly/" + seedId).remove(); } catch {} }, BTF_SLOT_DELAY);
  }
}

// Gọi bướm: tối đa 3 con cùng lúc (đủ thì phải đợi một con bay đi), không giới hạn số lượt.
// Chủ vườn bấm quá 5 lần trong 1 phút thì bướm "mệt".
let btfSeen = new Set();
const btfPress = [];
async function claimButterfly(manual) {
  if (manual) {
    if (!isOwner()) return false;
    const now = Date.now();
    while (btfPress.length && now - btfPress[0] > 60000) btfPress.shift();
    btfPress.push(now);
    if (btfPress.length > 5) { toast("Bướm bay nhiều cũng biết mệt chứ bồ 🦋"); return false; }
  }
  const target = pickButterflyTarget();
  if (!target) { if (manual) toast("Vườn chưa có bông hoa nào để bướm đậu."); return false; }
  const myId = newId();
  btfSeen.add(myId);
  const res = await db.ref("garden/butterfly").transaction((cur) => {
    const now = Date.now(), flying = {};
    let n = 0;
    for (const k in cur || {}) {
      const v = cur[k];
      if (v && typeof v === "object" && v.poem && now - v.at < BTF_LIFE) { flying[k] = v; n++; }
    }
    if (n >= BTF_MAX) return undefined;
    flying[myId] = { at: now, poem: target, by: ME.uid };
    return flying;
  });
  if (!res.committed) { if (manual) toast(`Vườn đã có đủ ${BTF_MAX} con bướm rồi, đợi một con bay đi nhé 🦋`); return false; }
  runButterfly(target, myId, true);
  return true;
}

// Kế hoạch mỗi ngày: một giờ mưa, một giờ ong thụ phấn và một giờ bướm bay, chọn ngẫu nhiên trong 8h-22h
async function ensurePlan() {
  const today = dayKey();
  await db.ref("garden/plan").transaction((cur) => {
    if (cur && cur.day === today) return undefined;
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0).getTime();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0).getTime();
    const now = Date.now();
    const pick = () => Math.round(rand(Math.max(start, now + 30000), Math.max(end, now + 120000)));
    return { day: today, rainAt: pick(), beeAt: pick(), butterflyAt: pick(), rainDone: false, beeDone: false, butterflyDone: false };
  });
}
async function checkPlans() {
  if (!db || !ME) return;
  const pl = state.plan;
  if (!pl || pl.day !== dayKey()) { await ensurePlan(); return; }
  const now = Date.now();
  if (!pl.rainDone && now >= pl.rainAt && !raining) {
    const r = await db.ref("garden/plan").transaction((cur) => (cur && !cur.rainDone ? { ...cur, rainDone: true } : undefined));
    if (r.committed) triggerRain(false);
  }
  if (!pl.beeDone && now >= pl.beeAt) {
    const r = await db.ref("garden/plan").transaction((cur) => (cur && !cur.beeDone ? { ...cur, beeDone: true } : undefined));
    if (r.committed) claimPollination(false);
  }
  if (pl.butterflyAt == null) {          // kế hoạch hôm nay lập từ trước khi có bướm: thêm giờ bướm
    const end = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 22, 0).getTime();
    const at = Math.round(rand(now + 30000, Math.max(end, now + 120000)));
    await db.ref("garden/plan").transaction((cur) => (cur && cur.butterflyAt == null ? { ...cur, butterflyAt: at, butterflyDone: false } : undefined));
  } else if (!pl.butterflyDone && now >= pl.butterflyAt) {
    const r = await db.ref("garden/plan").transaction((cur) => (cur && !cur.butterflyDone ? { ...cur, butterflyDone: true } : undefined));
    if (r.committed) claimButterfly(false);
  }
}

$("bee-btn").addEventListener("click", () => claimPollination(true));
$("butterfly-btn").addEventListener("click", () => claimButterfly(true));
// Gọi mưa tối đa 3 lần trong 1 phút
const rainPress = [];
$("rain-btn").addEventListener("click", async () => {
  if (raining) { toast("Đang mưa rồi nè ☔"); return; }          // đang mưa thì không tính lần gọi
  const now = Date.now();
  while (rainPress.length && now - rainPress[0] > 60000) rainPress.shift();
  if (rainPress.length >= 3) { toast("Mưa nhiều quá, đợi một chút rồi gọi tiếp nhé ☔"); return; }
  rainPress.push(now);
  if (!(await triggerRain(true))) rainPress.pop();                  // máy khác vừa gọi mưa: cũng không tính
});

// ---------- Đồng bộ với máy chủ ----------
const holdRender = new Set();           // hoa vừa gieo, chờ hạt rơi xong mới nở
const fallenEl = (id) => gardenEl.querySelector(`.fallen[data-id="${id}"]`);

function refreshAfterPoems() {
  updateBasketCount();
  refreshHint();
  if (!$("basket-overlay").hidden) renderBasket();
}
function applyPoem(id, d) {
  const np = poemFromDb(id, d);
  let p = getPoem(id);
  if (p) Object.assign(p, np);
  else { p = np; state.poems.push(p); }
  if (p.status === "garden") {
    if (!holdRender.has(id)) {
      const el = flowerEl(id);
      if (!el) { renderFlower(p, Date.now() - (p.t || 0) < 15000); applyGlow(); }
      else { placeFlower(el, p); updateDroop(el, p); }
    }
    if (openId === id) {
      if (panelFromBasket) closePanel();      // hoa vừa được trồng lại
      else { renderPoem(p); applyGlow(); }
    }
  } else {
    flowerEl(id)?.remove();
    if (openId === id) { if (panelFromBasket) renderPoem(p); else closePanel(); }
  }
  refreshAfterPoems();
}
function removePoem(id) {
  state.poems = state.poems.filter((p) => p.id !== id);
  flowerEl(id)?.remove();
  if (openId === id) closePanel();
  refreshAfterPoems();
}
function onFallenAdded(id, d) {
  if (state.fallen.some((f) => f.id === id)) return;
  const f = { id, word: d.word, flowerId: d.flowerId, key: d.key, x: d.x, b: d.b, t: d.t || 0 };
  state.fallen.push(f);
  renderFallen(f, Date.now() - f.t < 8000 ? headPoint(f.flowerId) : null);
}
function onFallenChanged(id, d) {
  const f = state.fallen.find((x) => x.id === id);
  if (!f) return;
  f.x = d.x; f.b = d.b;
  const el = fallenEl(id);
  if (el && !el.classList.contains("dragging")) { el.style.left = f.x * 100 + "%"; el.style.bottom = f.b + "px"; }
}
function onFallenRemoved(id) {
  state.fallen = state.fallen.filter((f) => f.id !== id);
  const el = fallenEl(id);
  if (el && !el.classList.contains("scooped")) el.remove();
}

let syncOffs = [];       // các listener dữ liệu vườn, để gỡ ra khi khách chuyển sang vườn thử
function listen(ref, type, cb) {
  ref.on(type, cb);
  syncOffs.push(() => ref.off(type, cb));
}
function detachSync() {
  syncOffs.forEach((off) => { try { off(); } catch {} });
  syncOffs = [];
}

function attachSync() {
  const poems = db.ref("garden/poems");
  listen(poems, "child_added", (s) => applyPoem(s.key, s.val()));
  listen(poems, "child_changed", (s) => applyPoem(s.key, s.val()));
  listen(poems, "child_removed", (s) => removePoem(s.key));

  const fallen = db.ref("garden/fallen");
  listen(fallen, "child_added", (s) => onFallenAdded(s.key, s.val()));
  listen(fallen, "child_changed", (s) => onFallenChanged(s.key, s.val()));
  listen(fallen, "child_removed", (s) => onFallenRemoved(s.key));

  listen(db.ref("garden/compost"), "value", (s) => { state.compost = s.val() || 0; updateBin(); });
  listen(db.ref("garden/seedbag"), "value", (s) => {
    const v = s.val();
    state.bag = v ? toArr(v.bag) : [];
    state.order = v && v.order ? toArr(v.order) : null;
    state.last = v && v.last !== undefined ? v.last : null;
  });
  listen(db.ref("garden/plan"), "value", (s) => { state.plan = s.val(); });
  listen(db.ref("garden/rainNow"), "value", (s) => {
    const v = s.val();
    if (v && v.id !== rainSeen && Date.now() - v.at < 15000) { rainSeen = v.id; startRain(false); }
  });
  listen(db.ref("garden/bee"), "value", (s) => {
    const v = s.val();
    if (v && v.id && v.id !== beeSeen && Date.now() - v.at < 45000) { beeSeen = v.id; runPollination(v.mom, v.dad, false); }
  });
  listen(db.ref("garden/lastTouch"), "value", (s) => { state.touch = s.val(); });
  listen(db.ref("garden/butterfly"), "child_added", (s) => {      // có con bướm mới: ai trong vườn cũng thấy
    const v = s.val();
    if (v && v.poem && !btfSeen.has(s.key) && Date.now() - v.at < 12000) { btfSeen.add(s.key); runButterfly(v.poem, s.key); }
  });
  // hộp hạt giống tặng: chỉ chủ vườn đọc được (luật máy chủ cũng chặn khách)
  if (isOwner()) listen(db.ref("gifts"), "value", (s) => { state.gifts = s.val() || {}; updateGiftsCount(); });
  refreshHint();
  updateNet();
  applyGlow();
}

// ---------- Hộp hạt giống được tặng (chủ vườn) ----------
state.gifts = {};
const giftRows = () => Object.keys(state.gifts || {}).map((id) => ({ id, ...state.gifts[id] })).sort((a, b) => (b.t || 0) - (a.t || 0));
function updateGiftsCount() {
  $("gifts-count").textContent = giftRows().length;
  if (!$("seedgift-overlay").hidden) renderSeedGifts();
}
function renderSeedGifts() {
  const rows = giftRows();
  $("seedgift-empty").hidden = rows.length > 0;
  const list = $("seedgift-list");
  list.innerHTML = "";
  rows.forEach((g) => {
    const item = document.createElement("div");
    item.className = "sg-item";
    const head = document.createElement("div");
    head.className = "sg-head";
    const who = document.createElement("b");
    who.textContent = "🎁 từ " + (g.from || "một người bạn");
    const when = document.createElement("span");
    when.textContent = g.t ? fmtTime(g.t) : "";
    head.append(who, when);
    const body = document.createElement("div");
    body.className = "sg-text";
    body.textContent = g.text || "";
    const act = document.createElement("div");
    act.className = "sg-actions";
    const sow = document.createElement("button");
    sow.type = "button";
    sow.textContent = "🌱 Gieo";
    sow.addEventListener("click", () => sowGift(g));
    const drop = document.createElement("button");
    drop.type = "button";
    drop.textContent = "Bỏ đi";
    drop.addEventListener("click", () => {
      if (confirm(`Bỏ hạt giống của ${g.from || "người này"}? Bạn không lấy lại được.`)) db.ref("gifts/" + g.id).remove();
    });
    act.append(sow, drop);
    item.append(head, body, act);
    list.appendChild(item);
  });
}
function openSeedGifts() {
  if (!isOwner()) return;
  renderSeedGifts();
  $("seedgift-overlay").hidden = false;
}
function closeSeedGifts() { $("seedgift-overlay").hidden = true; }
function sowGift(g) {
  if (!isOwner() || !g.text) return;
  closeSeedGifts();
  sowSeed(g.text, { gift: true, from: g.from || "" })
    .then(() => db.ref("gifts/" + g.id).remove())
    .catch(() => toast("Chưa gieo được hạt này, hạt vẫn còn trong hộp."));
  toast(`Đã gieo hạt giống của ${g.from || "một người bạn"} 🌱`);
}
$("gifts-btn").addEventListener("click", openSeedGifts);
$("seedgift-close").addEventListener("click", closeSeedGifts);
$("seedgift-overlay").addEventListener("click", (e) => { if (e.target === $("seedgift-overlay")) closeSeedGifts(); });

// ---------- Khách "hóa thân" chủ vườn để thử (mọi thay đổi chỉ nằm trong bộ nhớ, tắt trang là mất) ----------
// Dọn khu vườn trên màn hình để nạp lại từ một cơ sở dữ liệu khác
function resetGardenView() {
  detachSync();
  closePanel(); closeBasket(); closeSeedGifts(); setMode(null);
  gardenEl.querySelectorAll(".flower, .fallen, .seed").forEach((el) => el.remove());
  holdRender.clear();
  Object.assign(state, { poems: [], fallen: [], compost: 0, bag: [], order: null, last: null, plan: null, touch: null, gifts: {} });
}

async function enterDemo() {
  if (DEMO || ROLE !== "guest") return;
  if (!confirm("Hóa thân thành chủ vườn để trải nghiệm?\n\nMọi thay đổi bạn làm trong lúc trải nghiệm chỉ để thử: khu vườn thật không bị ảnh hưởng, và tất cả sẽ biến mất khi bạn thoát chế độ trải nghiệm hoặc thoát khỏi trang.")) return;
  let snap;
  try { snap = (await db.ref("garden").once("value")).val() || {}; }
  catch { toast("Chưa tải được vườn để thử, bạn thử lại nhé."); return; }
  delete snap.plan; delete snap.rainNow; delete snap.bee; delete snap.butterfly;      // để khách tự thử gọi mưa, gọi ong, gọi bướm
  resetGardenView();
  realDb = realDb || db;
  db = makeMemoryDb({ garden: snap });
  DEMO = true;
  ROLE = "owner";
  document.body.classList.remove("guest");
  document.body.classList.add("demo");
  applyRoleUI();
  updateGiftsCount();
  attachSync();
  ensurePlan();
  toast("Bạn đang là chủ vườn thử. Mọi thay đổi sẽ biến mất khi thoát chế độ này 🎭");
}

// Thoát chế độ trải nghiệm: bỏ sạch thay đổi thử, quay về vườn thật ở vai khách (những gì đã làm ở chế độ thường vẫn còn)
function exitDemo() {
  if (!DEMO) return;
  resetGardenView();
  db = realDb;
  DEMO = false;
  ROLE = "guest";
  state.net = loadNet();
  document.body.classList.remove("demo");
  document.body.classList.add("guest");
  applyRoleUI();
  updateGiftsCount();
  attachSync();
  updateNet();
  toast("Đã thoát chế độ trải nghiệm, mọi thay đổi thử đã biến mất. Bạn lại là khách 🐝");
}
$("demo-btn").addEventListener("click", enterDemo);
$("demo-exit").addEventListener("click", exitDemo);

// ---------- Ai đang trong vườn + con trỏ ----------
const peers = {};            // uid -> {name, role, x, y, t}
const cursorEls = {};
const hueOf = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

function updateWho() {
  const names = Object.values(peers).map((p) => (p.role === "owner" ? "🌷 " : "") + p.name);
  const who = $("who");
  who.hidden = names.length === 0;
  who.innerHTML = "";
  const b = document.createElement("b");
  b.textContent = "Trong vườn: ";
  who.append(b, names.slice(0, 8).join(", ") + (names.length > 8 ? ` +${names.length - 8}` : ""));
}
function setPeer(uid, d) {
  if (!d || typeof d.name !== "string" || !d.name) {       // mục presence thiếu tên (vừa bị xóa rồi ghi lại dở dang): không vẽ
    if (peers[uid]) removePeer(uid);
    return;
  }
  peers[uid] = d;
  updateWho();
  const hasChar = setCharacter(uid, d);
  if (uid === ME.uid) return;
  let el = cursorEls[uid];
  if (!el) {
    el = document.createElement("div");
    el.className = "cursor";
    el.style.setProperty("--c", `hsl(${hueOf(uid)} 55% 42%)`);
    el.innerHTML = `<svg viewBox="0 0 18 22"><path d="M1 1 L1 17 L5 13 L8 20 L11 19 L8 12 L14 12 Z" fill="var(--c)" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg><span></span>`;
    $("cursor-layer").appendChild(el);
    cursorEls[uid] = el;
  }
  el.querySelector("span").textContent = (d.role === "owner" ? "🌷 " : "") + d.name;
  el.style.display = hasChar ? "none" : "";       // có nhân vật thì nhân vật thay con trỏ
  el.style.transform = `translate(${clamp(d.x, 0, 1) * window.innerWidth}px, ${clamp(d.y, 0, 1) * window.innerHeight}px)`;
  el.classList.toggle("idle", Date.now() - (d.t || 0) > 45000);
}
function removePeer(uid) {
  delete peers[uid];
  removeCharacter(uid);
  cursorEls[uid]?.remove();
  delete cursorEls[uid];
  updateWho();
}
function startPresence() {
  const me = db.ref("presence/" + ME.uid);
  me.onDisconnect().remove();
  const av = isOwner() ? "" : myAvatar();       // nhân vật chỉ dành cho khách
  me.set({ name: ME.name, role: ROLE, x: 0.5, y: 0.5, t: Date.now(), ...(av ? { avatar: av } : {}) });
  document.addEventListener("pointermove", (e) => {          // nhân vật của mình đi theo con trỏ ngay, không chờ máy chủ
    const c = chars[ME.uid];
    if (c) { c.nx = e.clientX / window.innerWidth; c.ny = e.clientY / window.innerHeight; }
  }, { passive: true });
  let last = 0;
  document.addEventListener("pointermove", (e) => {
    const now = Date.now();
    if (now - last < 90) return;
    last = now;
    me.update({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, t: now });
  }, { passive: true });
  // còn ở đó (kèm tên, vai trò, nhân vật để dựng lại mục nếu máy chủ đã xóa khi mạng chập chờn)
  setInterval(() => {
    const a = isOwner() ? "" : myAvatar();
    me.update({ t: Date.now(), name: ME.name, role: ROLE, ...(a ? { avatar: a } : {}) });
  }, 20000);
  setInterval(() => Object.keys(cursorEls).forEach((u) => {
    cursorEls[u].classList.toggle("idle", Date.now() - (peers[u]?.t || 0) > 45000);
  }), 10000);
  const ps = db.ref("presence");
  ps.on("child_added", (s) => setPeer(s.key, s.val()));
  ps.on("child_changed", (s) => setPeer(s.key, s.val()));
  ps.on("child_removed", (s) => removePeer(s.key));
}

// ---------- Nhân vật của khách (tự vẽ, không bắt buộc) ----------
const AVATAR_KEY = "khuVuonNhanVat";
const validAvatar = (s) => typeof s === "string" && s.startsWith("data:image/png;base64,") && s.length < 40000;
function myAvatar() { try { const a = localStorage.getItem(AVATAR_KEY); return validAvatar(a) ? a : ""; } catch { return ""; } }

function refreshAvatarPreview() {
  const a = myAvatar();
  const img = $("gate-avatar-preview");
  img.hidden = !a;
  if (a) img.src = a;
  $("gate-draw").textContent = a ? "🎨 Vẽ lại nhân vật" : "🎨 Vẽ nhân vật (không bắt buộc)";
}
function setMyAvatar(a) {
  try { a ? localStorage.setItem(AVATAR_KEY, a) : localStorage.removeItem(AVATAR_KEY); } catch {}
  refreshAvatarPreview();
  if (ME && entered) (realDb || db).ref("presence/" + ME.uid).update({ avatar: a || null });
}

// Nhân vật đi bộ trong vườn theo con trỏ của chủ nhân (chỉ đi trên phần đất)
const chars = {};          // uid -> { el, body, img, nx, ny, x, y, face, phase, moving }
function setCharacter(uid, d) {
  if (!validAvatar(d.avatar)) { removeCharacter(uid); return false; }
  let c = chars[uid];
  if (!c) {
    const el = document.createElement("div");
    el.className = "char";
    el.style.setProperty("--c", `hsl(${hueOf(uid)} 55% 42%)`);
    el.innerHTML = `<div class="char-body"><img alt="" draggable="false"></div><span></span>`;
    $("char-layer").appendChild(el);
    c = chars[uid] = { el, body: el.firstChild, img: el.querySelector("img"), label: el.querySelector("span"), src: "", nx: d.x ?? 0.5, ny: d.y ?? 0.5, x: null, y: null, face: 1, phase: 0, moving: false };
  }
  if (c.src !== d.avatar) { c.src = d.avatar; c.img.src = d.avatar; }
  c.label.textContent = (d.role === "owner" ? "🌷 " : "") + (d.name || "");
  if (!ME || uid !== ME.uid) { c.nx = d.x ?? c.nx; c.ny = d.y ?? c.ny; }
  c.el.classList.toggle("idle", Date.now() - (d.t || 0) > 45000);
  return true;
}
function removeCharacter(uid) {
  const c = chars[uid];
  if (!c) return;
  c.el.remove();
  delete chars[uid];
}
let charLast = performance.now();
function charLoop(now) {
  const dt = Math.min(0.05, (now - charLast) / 1000);
  charLast = now;
  const vw = window.innerWidth, vh = window.innerHeight;
  const top = vh * 0.5, bottom = vh - 28;                // phần đất: nửa dưới màn hình
  for (const uid in chars) {
    const c = chars[uid];
    const tx = clamp(c.nx * vw, 36, vw - 36), ty = clamp(c.ny * vh, top, bottom);
    if (c.x === null) { c.x = tx; c.y = ty; }
    const dx = tx - c.x, dy = ty - c.y, dist = Math.hypot(dx, dy);
    const s = 0.55 + 0.6 * clamp((c.y - top) / (vh - top), 0, 1);       // ở xa thì bé, ở gần thì to
    if (dist > 4) {
      const step = Math.min(dist, 190 * s * dt);
      c.x += (dx / dist) * step;
      c.y += (dy / dist) * step;
      if (Math.abs(dx) > 3) c.face = dx > 0 ? 1 : -1;
      c.moving = true;
      c.phase += dt * 11;
    } else {
      c.moving = false;
      c.phase += dt * 2;
    }
    const bob = c.moving ? -Math.abs(Math.sin(c.phase)) * 7 : Math.sin(c.phase) * 1.4;
    c.el.style.transform = `translate(${c.x}px, ${c.y}px)`;
    c.el.style.zIndex = Math.round(c.y);
    c.body.style.transform = `scale(${s})`;
    c.img.style.transform = `translateY(${bob}px) rotate(${c.moving ? Math.sin(c.phase) * 5 : 0}deg) scaleX(${c.face})`;
  }
  requestAnimationFrame(charLoop);
}
requestAnimationFrame(charLoop);

// ----- Khung vẽ nhân vật: bút marker, bánh xe màu, tẩy -----
const dc = $("draw-canvas");
const dctx = dc.getContext("2d", { willReadFrequently: true });
const wheel = $("color-wheel");
let drawTool = "pen", penH = 0, penS = 0.85, penV = 0.95, penSize = 9, drawing = false, lastPt = null;
const undoStack = [];

function hsv2rgb(h, s, v) {
  const f = (n) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}
const penColor = () => `rgb(${hsv2rgb(penH, penS, penV).join(",")})`;
function drawWheel() {
  const g = wheel.getContext("2d"), n = wheel.width, R = n / 2;
  const img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = x - R + 0.5, dy = y - R + 0.5, r = Math.hypot(dx, dy);
    if (r > R) continue;
    const [rr, gg, bb] = hsv2rgb((Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1, r / R, penV);
    const i = (y * n + x) * 4;
    img.data[i] = rr; img.data[i + 1] = gg; img.data[i + 2] = bb; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const a = penH * Math.PI * 2, rr = penS * (R - 3);       // vòng tròn đánh dấu màu đang chọn
  g.beginPath();
  g.arc(R + Math.cos(a) * rr, R + Math.sin(a) * rr, 6, 0, Math.PI * 2);
  g.lineWidth = 2.5; g.strokeStyle = "#fff"; g.stroke();
  g.lineWidth = 1; g.strokeStyle = "#333"; g.stroke();
  $("color-swatch").style.background = penColor();
}
function pickColor(e) {
  const r = wheel.getBoundingClientRect();
  const dx = (e.clientX - r.left) / r.width * wheel.width - wheel.width / 2;
  const dy = (e.clientY - r.top) / r.height * wheel.height - wheel.height / 2;
  penH = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
  penS = clamp(Math.hypot(dx, dy) / (wheel.width / 2 - 3), 0, 1);
  setTool("pen");
  drawWheel();
}
let pickingColor = false;
wheel.addEventListener("pointerdown", (e) => { e.preventDefault(); wheel.setPointerCapture(e.pointerId); pickingColor = true; pickColor(e); });
wheel.addEventListener("pointermove", (e) => { if (pickingColor) pickColor(e); });
["pointerup", "pointercancel"].forEach((t) => wheel.addEventListener(t, () => { pickingColor = false; }));
$("color-val").addEventListener("input", (e) => { penV = e.target.value / 100; setTool("pen"); drawWheel(); });
$("brush-size").addEventListener("input", (e) => { penSize = +e.target.value; });

function setTool(t) {
  drawTool = t;
  $("tool-pen").classList.toggle("on", t === "pen");
  $("tool-eraser").classList.toggle("on", t === "eraser");
}
$("tool-pen").addEventListener("click", () => setTool("pen"));
$("tool-eraser").addEventListener("click", () => setTool("eraser"));

const dpos = (e) => { const r = dc.getBoundingClientRect(); return { x: (e.clientX - r.left) * dc.width / r.width, y: (e.clientY - r.top) * dc.height / r.height }; };
function stroke(a, b) {
  dctx.save();
  dctx.globalCompositeOperation = drawTool === "eraser" ? "destination-out" : "source-over";
  dctx.strokeStyle = penColor();
  dctx.lineWidth = drawTool === "eraser" ? penSize * 1.8 : penSize;
  dctx.lineCap = dctx.lineJoin = "round";
  dctx.beginPath();
  dctx.moveTo(a.x, a.y);
  dctx.lineTo(b.x + 0.01, b.y);
  dctx.stroke();
  dctx.restore();
}
function pushUndo() {
  undoStack.push(dctx.getImageData(0, 0, dc.width, dc.height));
  if (undoStack.length > 25) undoStack.shift();
}
dc.addEventListener("pointerdown", (e) => { e.preventDefault(); dc.setPointerCapture(e.pointerId); pushUndo(); drawing = true; lastPt = dpos(e); stroke(lastPt, lastPt); });
dc.addEventListener("pointermove", (e) => { if (!drawing) return; const p = dpos(e); stroke(lastPt, p); lastPt = p; });
["pointerup", "pointercancel"].forEach((t) => dc.addEventListener(t, () => { drawing = false; }));
$("draw-undo").addEventListener("click", () => { const im = undoStack.pop(); if (im) dctx.putImageData(im, 0, 0); });
$("draw-clear").addEventListener("click", () => { pushUndo(); dctx.clearRect(0, 0, dc.width, dc.height); });

function openDraw() {
  undoStack.length = 0;
  dctx.clearRect(0, 0, dc.width, dc.height);
  const a = myAvatar();
  if (a) { const im = new Image(); im.onload = () => dctx.drawImage(im, 0, 0, dc.width, dc.height); im.src = a; }   // vẽ lại từ nhân vật cũ
  setTool("pen");
  drawWheel();
  $("draw-overlay").hidden = false;
}
function closeDraw() { $("draw-overlay").hidden = true; drawing = false; }

// Cắt sát hình vẽ, thu về ảnh 96x96, chân nhân vật nằm sát đáy
function exportAvatar() {
  const { width: w, height: h } = dc;
  const d = dctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return "";
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, N = 96;
  const k = Math.min((N - 4) / bw, (N - 4) / bh);
  const out = document.createElement("canvas");
  out.width = out.height = N;
  const g = out.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(dc, x0, y0, bw, bh, (N - bw * k) / 2, N - 2 - bh * k, bw * k, bh * k);
  return out.toDataURL("image/png");
}
$("draw-done").addEventListener("click", () => {
  const a = exportAvatar();
  closeDraw();
  setMyAvatar(a);
  toast(a ? "Đã lưu nhân vật của bạn 🎨" : "Bạn chưa vẽ gì nên chưa có nhân vật.");
});
$("draw-remove").addEventListener("click", () => { closeDraw(); setMyAvatar(""); toast("Đã bỏ nhân vật."); });
$("draw-close").addEventListener("click", closeDraw);
$("draw-overlay").addEventListener("click", (e) => { if (e.target === $("draw-overlay")) closeDraw(); });
$("gate-draw").addEventListener("click", openDraw);
$("avatar-btn").addEventListener("click", openDraw);
refreshAvatarPreview();

// ---------- Nhật ký ra vào vườn ----------
let visitRef = null;
function logVisit() {
  visitRef = db.ref("visits").push();
  visitRef.set({ uid: ME.uid, name: ME.name, role: ROLE, at: SV.TIMESTAMP });
  visitRef.onDisconnect().update({ leftAt: SV.TIMESTAMP });
}
const fmtTime = (ts) => new Date(ts).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

let logQuery = null, logCb = null;
function renderLog(obj) {
  const rows = Object.keys(obj || {}).map((k) => obj[k]).sort((a, b) => (b.at || 0) - (a.at || 0));
  $("log-empty").hidden = rows.length > 0;
  $("log-table-wrap").hidden = rows.length === 0;
  const tb = $("log-table").querySelector("tbody");
  tb.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const who = document.createElement("td");
    who.textContent = r.name || "?";
    const tag = document.createElement("span");
    tag.className = "role-tag";
    tag.textContent = r.role === "owner" ? "chủ vườn" : "khách";
    who.appendChild(tag);
    const inn = document.createElement("td");
    inn.textContent = r.at ? fmtTime(r.at) : "";
    const out = document.createElement("td");
    if (r.leftAt) out.textContent = fmtTime(r.leftAt);
    else if (peers[r.uid]) { out.textContent = "đang ở trong vườn"; out.className = "still-in"; }
    else out.textContent = "—";
    tr.append(who, inn, out);
    tb.appendChild(tr);
  });
}
function openLog() {
  if (!isOwner()) return;
  $("log-overlay").hidden = false;
  logQuery = db.ref("visits").limitToLast(300);
  logCb = logQuery.on("value", (s) => renderLog(s.val()));
}
function closeLog() {
  $("log-overlay").hidden = true;
  if (logQuery) { logQuery.off("value", logCb); logQuery = null; }
}
$("log-btn").addEventListener("click", openLog);
$("log-close").addEventListener("click", closeLog);
$("log-overlay").addEventListener("click", (e) => { if (e.target === $("log-overlay")) closeLog(); });

// ---------- Sao lưu / nhập vườn (chủ vườn) ----------
function exportGarden() {
  const data = {
    version: 2,
    poems: state.poems.map(({ id, texts, types, hybrid, parents, x, y, status, missing, gift, from }) => ({ id, texts, types, hybrid, parents, x, y, status, missing, gift, from })),
    fallen: state.fallen.map(({ id, word, flowerId, key, x, b }) => ({ id, word, flowerId, key, x, b })),
    compost: state.compost,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sao-luu-khu-vuon.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Đã sao lưu ${data.poems.length} bông hoa ra file.`);
}

function importData(o) {
  const poems = (Array.isArray(o) ? o : o.poems || []).map(normPoem).map((p) => ({ ...p, id: p.id || newId() }));
  if (!poems.length) { toast("File không có bông hoa nào."); return false; }
  if (!confirm(`Nhập ${poems.length} bông hoa vào vườn? (hoa trùng mã sẽ được ghi đè)`)) return false;
  const upd = {};
  poems.forEach((p) => { upd[`poems/${p.id}`] = poemToDb(p); });
  (o.fallen || []).forEach((f) => {
    if (f && f.word && f.flowerId) upd[`fallen/${f.id || newId()}`] = { word: f.word, flowerId: f.flowerId, key: f.key, x: f.x ?? 0.5, b: f.b ?? 60, t: 0 };
  });
  db.ref("garden").update(upd);
  if (o.compost > 0) db.ref("garden/compost").transaction((c) => (c || 0) + o.compost);
  toast(`Đã nhập ${poems.length} bông hoa.`);
  return true;
}

function importFromLegacy() {
  const legacy = readLegacy();
  if (!legacy) return false;
  const ok = importData(legacy);
  if (ok && !DEMO) { try { localStorage.setItem("khuVuonDaNhap", "1"); } catch {} }
  return ok;
}

$("export-btn").addEventListener("click", exportGarden);
$("import-btn").addEventListener("click", () => {
  const legacy = readLegacy();
  if (legacy && confirm(`Tìm thấy vườn cũ trong trình duyệt này (${legacy.poems.length} bông hoa).\nBấm OK để nhập vườn cũ, hoặc Hủy để chọn file sao lưu.`)) {
    importFromLegacy();
    return;
  }
  $("import-file").click();
});
$("import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try { importData(JSON.parse(await file.text())); }
  catch { toast("Không đọc được file này."); }
});

// ---------- Cổng vào vườn ----------
let entered = false;
const NAME_KEY = "khuVuonTen";
const savedName = () => { try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; } };

function showGate() {
  $("gate").hidden = false;
  document.body.classList.add("locked");
}

function enter(role, name, user) {
  if (entered) return;
  entered = true;
  ROLE = role;
  ME = { uid: user.uid, name };
  document.body.classList.toggle("guest", role !== "owner");
  document.body.classList.remove("locked");
  $("gate").hidden = true;
  applyRoleUI();
  startGarden();
}

function authMessage(err) {
  const c = (err && err.code) || "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(c)) return "Sai mật khẩu.";
  if (c === "auth/too-many-requests") return "Thử sai nhiều lần quá, chờ một lát rồi thử lại nhé.";
  if (c === "auth/network-request-failed") return "Không có mạng.";
  if (c === "auth/operation-not-allowed" || c === "auth/admin-restricted-operation") return "Chưa bật kiểu đăng nhập này trong Firebase (xem SETUP.md).";
  if (c === "auth/unauthorized-domain") return "Tên miền này chưa được thêm vào Firebase (xem SETUP.md, bước 6).";
  return (err && err.message) || "Không vào được vườn.";
}

$("gate-owner").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = $("owner-pass").value;
  const err = $("owner-err");
  err.textContent = "";
  if (!pass) { err.textContent = "Nhập mật khẩu nhé."; return; }
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    const r = await auth.signInWithEmailAndPassword(OWNER_MAIL, pass);
    enter("owner", "Chủ vườn", r.user);
  } catch (ex) {
    err.textContent = authMessage(ex);
  } finally {
    btn.disabled = false;
    $("owner-pass").value = "";
  }
});

$("gate-guest").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("guest-name").value.trim().replace(/\s+/g, " ");
  const err = $("guest-err");
  err.textContent = "";
  if (!name) { err.textContent = "Cho mình biết tên bạn nhé."; return; }
  try { localStorage.setItem(NAME_KEY, name); } catch {}
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    let user = auth.currentUser;
    if (!user || user.email === OWNER_MAIL) {
      if (user) await auth.signOut();
      user = (await auth.signInAnonymously()).user;
    }
    enter("guest", name, user);
  } catch (ex) {
    err.textContent = authMessage(ex);
  } finally {
    btn.disabled = false;
  }
});

async function leave() {
  try {
    await visitRef?.update({ leftAt: SV.TIMESTAMP });
    await (realDb || db).ref("presence/" + ME.uid).remove();
  } catch {}
  await auth.signOut();
  location.reload();
}
$("leave-btn").addEventListener("click", leave);

function startGarden() {
  attachSync();
  startPresence();
  logVisit();
  ensurePlan();
  setInterval(checkPlans, 20000);
  setTimeout(checkPlans, 4000);
  if (isOwner() && !localStorage.getItem("khuVuonDaNhap")) {
    // vườn cũ trong trình duyệt (từ trước khi có máy chủ) -> hỏi chuyển lên mạng khi vườn trên mạng còn trống
    db.ref("garden/poems").once("value").then((s) => {
      const legacy = readLegacy();
      if (!s.exists() && legacy && confirm(`Tìm thấy vườn cũ trong trình duyệt này (${legacy.poems.length} bông hoa).\nChuyển lên vườn trực tuyến?`)) importFromLegacy();
    }).catch(() => {});
  }
}

// ---------- Phím tắt ----------
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("draw-overlay").hidden) closeDraw();
  else if (!panel.hidden && panelFromBasket) closePanel();
  else if (!$("gift-overlay").hidden) closeGift();
  else if (!$("seedgift-overlay").hidden) closeSeedGifts();
  else if (!$("log-overlay").hidden) closeLog();
  else if (!$("basket-overlay").hidden) closeBasket();
  else if (mode) setMode(null);
  else if (!panel.hidden) closePanel();
});

window.addEventListener("resize", () => {
  document.querySelectorAll(".flower").forEach((el) => {
    const p = getPoem(el.dataset.id);
    if (p) placeFlower(el, p);
  });
  Object.keys(peers).forEach((u) => { if (u !== ME?.uid) setPeer(u, peers[u]); });
});

// ---------- Khởi động ----------
async function boot() {
  document.body.classList.add("locked");
  $("guest-name").value = savedName();
  try {
    const be = await initBackend();
    db = realDb = be.db; auth = be.auth; SV = be.SV; OWNER_MAIL = be.OWNER_EMAIL; BACKEND_MODE = be.mode;
  } catch (err) {
    showGate();
    $("gate-note").textContent = "Không kết nối được máy chủ: " + err.message;
    return;
  }
  $("gate-note").textContent = BACKEND_MODE === "mock"
    ? "Chế độ thử (chưa nối máy chủ): dữ liệu chỉ lưu trong trình duyệt này, không chia sẻ cho ai. Mật khẩu chủ vườn ở chế độ thử là: thu"
    : "";
  auth.onAuthStateChanged((user) => {
    if (entered) return;
    if (user && user.email === OWNER_MAIL) enter("owner", "Chủ vườn", user);
    else if (user && savedName()) enter("guest", savedName(), user);
    else showGate();
  });
}
boot();
