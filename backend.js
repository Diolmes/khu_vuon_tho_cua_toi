// ================= Lớp máy chủ =================
// - Có cấu hình Firebase (firebase-config.js): dùng Firebase thật (vườn dùng chung cho mọi người).
// - Chưa có cấu hình: dùng bản giả lập lưu trong trình duyệt (chỉ để thử trên máy, không chia sẻ được).
// Cả hai có cùng giao diện với Firebase Realtime Database + Authentication (bản "compat").

const OWNER_EMAIL = "chu-vuon@khuvuontho.app";   // tài khoản chủ vườn trong Firebase Authentication
const MOCK_OWNER_PASSWORD = "thu";                // chỉ dùng ở chế độ thử trên máy (chưa nối Firebase)

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error("Không tải được " + src));
    document.head.appendChild(s);
  });
}

async function initBackend() {
  const cfg = window.FIREBASE_CONFIG;
  if (cfg && cfg.apiKey) {
    const base = "https://www.gstatic.com/firebasejs/10.12.2/";
    await loadScript(base + "firebase-app-compat.js");
    await loadScript(base + "firebase-auth-compat.js");
    await loadScript(base + "firebase-database-compat.js");
    firebase.initializeApp(cfg);
    return {
      mode: "cloud",
      db: firebase.database(),
      auth: firebase.auth(),
      SV: firebase.database.ServerValue,
      OWNER_EMAIL,
    };
  }
  return makeMock();
}

// ---------- Bản giả lập (lưu trong localStorage, đồng bộ giữa các tab cùng trình duyệt) ----------
function makeMock() {
  const KEY = "khuVuonMockDb";
  const SV = { TIMESTAMP: { ".sv": "timestamp" } };
  let root = {};
  let listeners = [];
  let discon = [];
  let counter = 0;

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(root)); } catch {} };
  const sync = () => { root = read(); };
  const clone = (v) => (v === null || v === undefined ? null : JSON.parse(JSON.stringify(v)));
  const parts = (p) => String(p).split("/").filter(Boolean);

  const resolveSV = (v) => {
    if (v && typeof v === "object") {
      if (v[".sv"] === "timestamp") return Date.now();
      if (Array.isArray(v)) return v.map(resolveSV);
      const o = {};
      for (const k in v) o[k] = resolveSV(v[k]);
      return o;
    }
    return v;
  };
  const clean = (v) => {                      // bỏ null / object rỗng như Firebase
    if (v && typeof v === "object") {
      if (Array.isArray(v)) return v.map((x) => (x === undefined ? null : clean(x)));
      const o = {};
      let n = 0;
      for (const k in v) {
        const c = clean(v[k]);
        if (c !== null && c !== undefined) { o[k] = c; n++; }
      }
      return n ? o : null;
    }
    return v === undefined ? null : v;
  };
  const getAt = (path) => {
    let cur = root;
    for (const k of parts(path)) {
      if (cur === null || typeof cur !== "object") return null;
      cur = cur[k];
    }
    return cur === undefined ? null : cur;
  };
  const setAt = (path, val) => {
    const ps = parts(path);
    if (!ps.length) { root = clean(val) || {}; return; }
    let cur = root;
    for (let i = 0; i < ps.length - 1; i++) {
      if (cur[ps[i]] === null || cur[ps[i]] === undefined || typeof cur[ps[i]] !== "object") cur[ps[i]] = {};
      cur = cur[ps[i]];
    }
    const c = clean(val);
    if (c === null) delete cur[ps[ps.length - 1]];
    else cur[ps[ps.length - 1]] = c;
    root = clean(root) || {};
  };

  const snap = (path, val) => ({
    key: parts(path).pop() || null,
    val: () => clone(val),
    exists: () => val !== null && val !== undefined,
    forEach(fn) {
      if (val && typeof val === "object") for (const k of Object.keys(val)) { if (fn(snap(path + "/" + k, val[k])) === true) return true; }
      return false;
    },
  });

  function view(L) {
    const cur = getAt(L.path);
    if (L.limit && cur && typeof cur === "object") {
      const keys = Object.keys(cur).sort().slice(-L.limit);
      const o = {};
      keys.forEach((k) => { o[k] = cur[k]; });
      return o;
    }
    return cur;
  }
  function fire(L) {
    const cur = view(L);
    if (L.type === "value") {
      const j = JSON.stringify(cur);
      if (L.lastJ !== j) { L.lastJ = j; L.cb(snap(L.path, clone(cur))); }
      return;
    }
    const prev = L.last || {};
    const now = cur && typeof cur === "object" ? cur : {};
    for (const k in now) {
      if (!(k in prev)) { if (L.type === "child_added") L.cb(snap(L.path + "/" + k, clone(now[k]))); }
      else if (JSON.stringify(prev[k]) !== JSON.stringify(now[k]) && L.type === "child_changed") L.cb(snap(L.path + "/" + k, clone(now[k])));
    }
    for (const k in prev) if (!(k in now) && L.type === "child_removed") L.cb(snap(L.path + "/" + k, prev[k]));
    L.last = clone(now) || {};
  }
  const notify = () => listeners.slice().forEach(fire);

  function pushId() {
    counter++;
    return Date.now().toString(36).padStart(9, "0") + counter.toString(36).padStart(3, "0") + Math.random().toString(36).slice(2, 5);
  }

  function ref(path = "", limit = 0) {
    path = parts(path).join("/");
    const r = {
      key: parts(path).pop() || null,
      path,
      child: (c) => ref(path + "/" + c),
      set(v) { sync(); setAt(path, resolveSV(v)); write(); notify(); return Promise.resolve(); },
      update(obj) {
        sync();
        for (const k in obj) setAt(path + "/" + k, resolveSV(obj[k]));
        write(); notify();
        return Promise.resolve();
      },
      remove() { return r.set(null); },
      push(v) {
        const c = ref(path + "/" + pushId());
        if (v !== undefined) c.set(v);
        return c;
      },
      once() { sync(); return Promise.resolve(snap(path, clone(getAt(path)))); },
      on(type, cb) {
        sync();
        const L = { path, type, cb, limit, last: null, lastJ: undefined };
        listeners.push(L);
        setTimeout(() => { if (listeners.includes(L)) { sync(); fire(L); } }, 0);
        return cb;
      },
      off(type, cb) { listeners = listeners.filter((L) => !(L.path === path && (!cb || L.cb === cb) && (!type || L.type === type))); },
      transaction(fn) {
        sync();
        const cur = clone(getAt(path));
        const res = fn(cur);
        if (res === undefined) return Promise.resolve({ committed: false, snapshot: snap(path, cur) });
        setAt(path, resolveSV(res));
        write(); notify();
        return Promise.resolve({ committed: true, snapshot: snap(path, clone(getAt(path))) });
      },
      onDisconnect() {
        return {
          remove() { discon.push(() => setAt(path, null)); return Promise.resolve(); },
          update(o) { discon.push(() => { for (const k in o) setAt(path + "/" + k, resolveSV(o[k])); }); return Promise.resolve(); },
        };
      },
      limitToLast: (n) => ref(path, n),
    };
    return r;
  }

  window.addEventListener("storage", (e) => { if (e.key === KEY) { sync(); notify(); } });
  window.addEventListener("pagehide", () => {
    sync();
    discon.forEach((f) => f());
    discon = [];
    write();
  });
  sync();

  // ----- đăng nhập giả lập (mỗi tab một người) -----
  const cbs = [];
  let user = null;
  try { user = JSON.parse(sessionStorage.getItem("khuVuonMockUser")); } catch {}
  const setUser = (u) => {
    user = u;
    try { sessionStorage.setItem("khuVuonMockUser", JSON.stringify(u)); } catch {}
    cbs.forEach((cb) => cb(user));
  };
  const auth = {
    get currentUser() { return user; },
    onAuthStateChanged(cb) { cbs.push(cb); setTimeout(() => cb(user), 0); },
    async signInAnonymously() {
      const u = { uid: "khach-" + Math.random().toString(36).slice(2, 10), email: null, isAnonymous: true };
      setUser(u);
      return { user: u };
    },
    async signInWithEmailAndPassword(email, pass) {
      if (email === OWNER_EMAIL && pass === MOCK_OWNER_PASSWORD) {
        const u = { uid: "chu-vuon", email, isAnonymous: false };
        setUser(u);
        return { user: u };
      }
      const e = new Error("Sai mật khẩu");
      e.code = "auth/invalid-credential";
      throw e;
    },
    async signOut() { setUser(null); },
  };

  return { mode: "mock", db: { ref: (p) => ref(p) }, auth, SV, OWNER_EMAIL };
}
