// ================= BẢNG THEME =================
// Chỗ DUY NHẤT để đổi diện mạo khu vườn: màu, bộ chữ, màu thân hoa, màu đất/đường, bộ icon.
// - Muốn thêm một phong cách: chép một khối trong THEMES, đổi tên và các giá trị.
// - Chọn phong cách và bộ chữ ngay trong web: nút "Giao diện" ở thanh công cụ. Hoặc gõ ?theme=watercolor&font=garamond sau địa chỉ web.
// - Lựa chọn được nhớ trên máy; đổi xong web tự tải lại.
// Tệp này nạp trước script.js nên script.js đọc được window.THEME_TOKENS.

(function () {
  // ---------- Bảng bộ chữ (đều có tiếng Việt) ----------
  const FONT_SETS = {
    georgia: {
      label: "Georgia (gốc)", head: "Georgia, 'Times New Roman', serif", body: "Georgia, 'Times New Roman', serif", rootSize: "100%", gf: "",
    },
    garamond: {
      label: "Cormorant Garamond + EB Garamond", head: "'Cormorant Garamond', Georgia, serif", body: "'EB Garamond', Georgia, serif", rootSize: "112%",
      gf: "family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400",
    },
    playfair: {
      label: "Playfair Display + Be Vietnam Pro", head: "'Playfair Display', Georgia, serif", body: "'Be Vietnam Pro', system-ui, sans-serif", rootSize: "100%",
      gf: "family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Be+Vietnam+Pro:wght@300;400;500",
    },
    newsreader: {
      label: "Newsreader", head: "'Newsreader', Georgia, serif", body: "'Newsreader', Georgia, serif", rootSize: "108%",
      gf: "family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400",
    },
    josefin: {
      label: "Josefin Sans + Quicksand", head: "'Josefin Sans', system-ui, sans-serif", body: "'Quicksand', system-ui, sans-serif", rootSize: "100%",
      gf: "family=Josefin+Sans:wght@300;400;500&family=Quicksand:wght@400;500;600",
    },
    spectral: {
      label: "Spectral + Lora", head: "'Spectral', Georgia, serif", body: "'Lora', Georgia, serif", rootSize: "100%",
      gf: "family=Spectral:ital,wght@0,300;0,400;0,500;1,400&family=Lora:ital,wght@0,400;0,500;1,400",
    },
  };

  // ---------- Bảng phong cách ----------
  const THEMES = {
    classic: {
      label: "Mặc định",
      note: "Giao diện hiện tại của khu vườn.",
      font: "garamond",                       // bộ chữ mặc định của phong cách này (đổi được trong bảng Giao diện)
      vars: {                                 // biến CSS đặt lên :root
        "--sky-top": "#dff0fb", "--sky-bottom": "#fdf6e3",
        "--grass": "#cfe3b0", "--grass-dark": "#b5d08f",
        "--ink": "#4a3b32", "--card": "#fffdf7", "--accent": "#f5a3b5",
      },
      tokens: {                               // màu vẽ bằng JS (script.js đọc)
        stem: "#5e7f4b",                      // thân và lá hoa
        path: "#e8d3a2", pathEdge: "#d4bb82", pathDots: "#c9b283",   // đường đi
        tufts: ["#8fb96a", "#7aa85a", "#a3c97c", "#6f9c52"],         // các cụm cỏ
      },
      watercolor: false,                      // true: bật bộ lọc loang màu, nền giấy và icon vẽ tay màu nước
    },
    watercolor: {
      label: "Màu nước",
      note: "Loang màu trên giấy, hoa và đất nhòe mép, icon vẽ tay.",
      font: "garamond",
      vars: {
        "--sky-top": "#cfe3f1", "--sky-bottom": "#fbf0e4",
        "--grass": "#c6dbae", "--grass-dark": "#a6c690",
        "--ink": "#4d4350", "--card": "#fffaf1", "--accent": "#e3a2b6",
        "--wc-line": "#c9a3b2", "--wc-shadow": "rgba(150, 110, 135, .24)",
      },
      tokens: {
        stem: "#86ab8b",
        path: "#efdcb8", pathEdge: "#d9bf92", pathDots: "#cdb48c",
        tufts: ["#93c08f", "#7fae86", "#a9cf9a", "#74a67d"],
      },
      watercolor: true,
    },
  };

  // ---------- Chọn theme + bộ chữ ----------
  const KEY = "khuVuonGiaoDien";
  const params = new URLSearchParams(location.search);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  if (params.get("theme") && THEMES[params.get("theme")]) saved.theme = params.get("theme");
  if (params.get("font") && FONT_SETS[params.get("font")]) saved.font = params.get("font");
  const themeId = THEMES[saved.theme] ? saved.theme : "classic";
  const theme = THEMES[themeId];
  const fontId = FONT_SETS[saved.font] ? saved.font : theme.font;
  const font = FONT_SETS[fontId];
  try { localStorage.setItem(KEY, JSON.stringify({ theme: themeId, font: fontId })); } catch {}

  window.THEME = { id: themeId, font: fontId, def: theme };
  window.THEME_TOKENS = theme.tokens;

  const root = document.documentElement;
  root.dataset.theme = themeId;
  root.dataset.wc = theme.watercolor ? "1" : "0";
  Object.keys(theme.vars).forEach((k) => root.style.setProperty(k, theme.vars[k]));
  root.style.setProperty("--font-head", font.head);
  root.style.setProperty("--font-body", font.body);
  root.style.setProperty("--root-size", font.rootSize);

  const gfURL = (gf) => "https://fonts.googleapis.com/css2?" + gf + "&display=swap";
  function loadFonts(gfList) {
    gfList.filter(Boolean).forEach((gf) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = gfURL(gf);
      document.head.appendChild(l);
    });
  }
  loadFonts([font.gf]);

  // ---------- Bộ lọc loang màu (chỉ khi theme màu nước) ----------
  const FILTERS = `
  <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <!-- hoa: mép rung nhẹ, quầng màu loang quanh, hạt màu lốm đốm như giấy thấm -->
      <filter id="wc-flower" x="-15%" y="-10%" width="130%" height="125%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="warp"/>
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough"/>
        <feGaussianBlur in="rough" stdDeviation="2.2" result="halo"/>
        <feColorMatrix in="halo" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .4 0" result="haloSoft"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="9" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 .62" result="grainA"/>
        <feComposite in="rough" in2="grainA" operator="in" result="pigment"/>
        <feMerge><feMergeNode in="haloSoft"/><feMergeNode in="pigment"/></feMerge>
      </filter>
      <!-- đất + đường: mép đồi nhòe và lệch như vệt cọ rộng -->
      <filter id="wc-ground" x="-3%" y="-8%" width="106%" height="112%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="2" result="warp"/>
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="22" xChannelSelector="R" yChannelSelector="G" result="rough"/>
        <feGaussianBlur in="rough" stdDeviation="1.4" result="soft"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="7" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 .72" result="grainA"/>
        <feComposite in="soft" in2="grainA" operator="in"/>
      </filter>
      <!-- icon nhỏ: nét hơi rung như vẽ tay -->
      <filter id="wc-icon" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="5" result="warp"/>
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
  </svg>`;

  // ---------- Bộ icon màu nước (thay cho emoji khi theme màu nước) ----------
  const P = {
    rose: "#e58aa3", roseD: "#b85a78", blush: "#f6c4d0", coral: "#ee9d86", coralD: "#c0654f",
    peach: "#f6c79b", peachD: "#c98f5e", butter: "#f4d77a", butterD: "#c9a63a",
    sage: "#a4cc9a", sageD: "#5f8f68", leaf: "#7db38a", sky: "#8fc0e6", skyD: "#4f86b3",
    lilac: "#b8a4e2", lilacD: "#7f68b8", brown: "#b58b68", brownD: "#7a5438",
    paper: "#fff6e6", grey: "#b3afc6", greyD: "#6e6a86",
  };
  const sh = (d, fill, stroke, op = 0.74) => `<path d="${d}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-opacity=".6" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round"/>`;
  const ln = (d, stroke, w = 1.1) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-opacity=".8" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ci = (cx, cy, r, fill, stroke) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" fill-opacity=".74" stroke="${stroke || fill}" stroke-opacity=".6" stroke-width=".9"/>`;
  const el = (cx, cy, rx, ry, fill, stroke, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" fill-opacity=".74" stroke="${stroke}" stroke-opacity=".6" stroke-width=".9" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const ring = (n, rx, ry, dist, fill, stroke) => Array.from({ length: n }, (_, i) => el(12, 12 - dist, rx, ry, fill, stroke, (360 / n) * i).replace(`rotate(${(360 / n) * i} 12 ${12 - dist})`, `rotate(${(360 / n) * i} 12 12)`)).join("");
  const svg = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;

  const ICONS = {
    "🎁": svg(sh("M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z", P.rose, P.roseD) + sh("M3 7.5h18V11H3z", P.coral, P.coralD) + sh("M10.6 7.5h2.8V21h-2.8z", P.butter, P.butterD) + sh("M12 7.5C9 3.5 5.5 5 7.5 7.5z", P.butter, P.butterD) + sh("M12 7.5C15 3.5 18.5 5 16.5 7.5z", P.butter, P.butterD)),
    "🗑": svg(sh("M6 8l1.2 12a1 1 0 0 0 1 .9h7.6a1 1 0 0 0 1-.9L18 8z", P.sage, P.sageD) + sh("M4.5 6h15v2h-15z", P.brown, P.brownD) + ln("M9.5 6V4.5h5V6", P.brownD) + ln("M10 11v6M14 11v6", P.sageD, .9)),
    "🌱": svg(ln("M12 21V11", P.sageD, 1.4) + sh("M12 12C6 12 4 8 4 5c4 0 8 1.5 8 7z", P.leaf, P.sageD) + sh("M12 14c0-5 3-8 8-8 0 5-3 8-8 8z", P.sage, P.sageD)),
    "🌷": svg(sh("M7 6c0 6 1.5 9 5 9s5-3 5-9l-2.5 2L12 4.5 9.5 8z", P.rose, P.roseD) + ln("M12 15v6.5", P.sageD, 1.4) + sh("M12 20c-4 0-6-2-6.5-5 4 .2 6 2 6.5 5z", P.leaf, P.sageD)),
    "🎨": svg(sh("M12 3.5C6.8 3.5 3 7 3 11.8c0 4.4 3.4 8.2 7.4 8.2 1.4 0 1.8-.9 1.4-1.9-.5-1.2.3-2.4 1.8-2.4h2.5c2.8 0 4.9-1.9 4.9-4.7C21 6.6 17 3.5 12 3.5z", P.peach, P.peachD) + ci(8, 9, 1.6, P.rose) + ci(12, 7, 1.6, P.sky) + ci(16, 9.5, 1.6, P.butter) + ci(7.5, 13.5, 1.5, P.sage)),
    "✏": svg(sh("M4 20l1-4.5L16.5 4a1.6 1.6 0 0 1 2.3 0l1.2 1.2a1.6 1.6 0 0 1 0 2.3L8.5 19z", P.butter, P.butterD) + sh("M4 20l1-4.5 3.5 3.5z", P.peach, P.peachD) + sh("M16.2 4.3l3.5 3.5-1.4 1.4-3.5-3.5z", P.rose, P.roseD)),
    "☔": svg(sh("M3 12C3 7 7 3.8 12 3.8S21 7 21 12c-1.5-1.4-3-1.4-4.5 0-1.5-1.4-3-1.4-4.5 0-1.5-1.4-3-1.4-4.5 0C6 10.6 4.5 10.6 3 12z", P.sky, P.skyD) + ln("M12 12v6.5a1.7 1.7 0 0 1-3.4 0", P.brownD, 1.3) + sh("M18 15.5c.9 1.4 1.4 2.2 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.8.5-1.6 1.4-3z", P.sky, P.skyD) + sh("M5.5 17c.7 1 1 1.6 1 2.2a1 1 0 0 1-2 0c0-.6.3-1.2 1-2.2z", P.sky, P.skyD)),
    "🐝": svg(el(9, 8, 3.2, 4.2, "#cfe6f7", P.skyD, -25) + el(15, 8, 3.2, 4.2, "#cfe6f7", P.skyD, 25) + el(12, 14.5, 6.5, 4.6, P.butter, P.butterD) + ln("M10 11.2v6.6M13.3 10.6v7.8", P.brownD, 1.6) + sh("M5.5 14.5l-2 .5 2 .6z", P.brown, P.brownD) + ci(18.2, 14, 2.3, P.brown, P.brownD)),
    "📖": svg(sh("M3 5.5C6.5 4.5 9.5 5 12 6.8V20c-2.5-1.8-5.5-2.3-9-1.3z", P.paper, P.lilacD) + sh("M21 5.5c-3.5-1-6.5-.5-9 1.3V20c2.5-1.8 5.5-2.3 9-1.3z", "#fdeef0", P.lilacD) + ln("M5.5 9c1.6-.3 3-.1 4.2.6M5.5 12c1.6-.3 3-.1 4.2.6M14.3 9.6c1.2-.7 2.6-.9 4.2-.6M14.3 12.6c1.2-.7 2.6-.9 4.2-.6", P.lilacD, .8)),
    "🎭": svg(sh("M10 5h10v6c0 3.5-2.2 6-5 6s-5-2.5-5-6z", P.sky, P.skyD) + ln("M12.5 9h1.8M16.5 9h1.8", P.skyD, 1) + sh("M3.5 8h10v6c0 3.6-2.2 6-5 6s-5-2.4-5-6z", P.rose, P.roseD) + ln("M6 12h1.8M9.7 12h1.8", P.roseD, 1) + ln("M6.5 16c1.4 1.2 3 1.2 4.4 0", P.roseD, 1)),
    "🦋": svg(sh("M12 11C9 6 4 5 3.5 8.5c-.4 3 3 4.6 8.5 2.5z", P.sky, P.skyD) + sh("M12 11C15 6 20 5 20.5 8.5c.4 3-3 4.6-8.5 2.5z", P.lilac, P.lilacD) + sh("M12 12.5C8.5 12.5 5.5 14 6.5 17.5c1 2.5 4.2 2 5.5-5z", P.lilac, P.lilacD) + sh("M12 12.5c3.5 0 6.5 1.5 5.5 5-1 2.5-4.2 2-5.5-5z", P.sky, P.skyD) + ln("M12 8.5v9", P.brownD, 1.5) + ln("M12 8.5C11 6.5 10 5.5 9 5M12 8.5c1-2 2-3 3-3.5", P.brownD, .9)),
    "🌸": svg(ring(5, 3.3, 4.4, 4.6, P.blush, P.rose) + ci(12, 12, 2.1, P.butter, P.butterD)),
    "📌": svg(el(12, 20.5, 3, .8, P.greyD, P.greyD) + ln("M12 12.5V21", P.greyD, 1.4) + ci(12, 8, 4.6, P.coral, P.coralD) + ci(10.6, 6.7, 1.2, "#ffffff", "#ffffff")),
    "✨": svg(sh("M12 3c.7 4.7 2.3 6.3 7 7-4.7.7-6.3 2.3-7 7-.7-4.7-2.3-6.3-7-7 4.7-.7 6.3-2.3 7-7z", P.butter, P.butterD) + sh("M19 15.5c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5z", P.peach, P.peachD) + ci(5, 18, 1, P.rose)),
    "✿": svg(ring(5, 2.6, 3.6, 4.4, "#d9cdf3", P.lilacD) + ci(12, 12, 1.8, P.butter, P.butterD)),
    "🧺": svg(sh("M4 11h16l-1.8 8.2a1.6 1.6 0 0 1-1.6 1.3H7.4a1.6 1.6 0 0 1-1.6-1.3z", P.peach, P.brownD) + ln("M6 14.5h12M6.8 17.8h10.4M9 11.5l.8 8.7M15 11.5l-.8 8.7M12 11.5v8.7", P.brownD, .8) + ln("M6.5 11C6.5 4.5 17.5 4.5 17.5 11", P.brownD, 1.4)),
    "🙅": svg(ci(12, 6.2, 3, P.peach, P.peachD) + sh("M7 21c0-4.5 2.2-7.5 5-7.5s5 3 5 7.5z", P.rose, P.roseD) + ln("M8.5 11.5l7 5M15.5 11.5l-7 5", P.roseD, 1.6)),
    "↩": svg(ln("M9 7L4 12l5 5", P.greyD, 1.6) + ln("M4.5 12H15a4.5 4.5 0 0 1 0 9h-3", P.greyD, 1.6)),
    "🚫": svg(`<circle cx="12" cy="12" r="8.4" fill="${P.coral}" fill-opacity=".28" stroke="${P.coralD}" stroke-opacity=".75" stroke-width="2"/>` + ln("M6.2 6.2l11.6 11.6", P.coralD, 2)),
    "🌿": svg(ln("M6 21C8 15 11 11 18 4", P.sageD, 1.3) + sh("M9.5 15.5C5 15.5 4 12 4 9.5 8 9.5 9.5 12 9.5 15.5z", P.leaf, P.sageD) + sh("M12.5 11.5c0-4 2-6.5 6-7 .5 4-1.5 6.5-6 7z", P.sage, P.sageD) + sh("M14.2 15.5c3-1 5-.5 6.5 1.5-3 1.5-5.5 1-6.5-1.5z", P.leaf, P.sageD)),
    "🌼": svg(ring(8, 1.9, 3.6, 5.2, "#fff5d6", P.butterD) + ci(12, 12, 2.7, P.butter, P.butterD)),
    "📒": svg(sh("M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6z", P.butter, P.butterD) + sh("M4 3.5h3v17H4z", P.peach, P.peachD) + ci(5.5, 7, .9, P.brownD) + ci(5.5, 12, .9, P.brownD) + ci(5.5, 17, .9, P.brownD) + ln("M10 8.5h6M10 11.5h6M10 14.5h4", P.brownD, .9)),
    "🔍": svg(`<circle cx="10.5" cy="10.5" r="6" fill="#dcecf8" fill-opacity=".7" stroke="${P.skyD}" stroke-opacity=".75" stroke-width="1.6"/>` + ln("M15 15l5.5 5.5", P.brownD, 2.2) + ln("M7.5 9.5a3.5 3.5 0 0 1 2.5-2.5", "#ffffff", 1.2)),
    "🏚": svg(sh("M5 11h14v9H5z", P.peach, P.peachD) + sh("M3 11.5l9-7.5 9 7.5z", P.brown, P.brownD) + sh("M10.5 14.5h3V20h-3z", P.brown, P.brownD) + sh("M6.5 13h2.5v2.5H6.5z", P.sky, P.skyD)),
    "📤": svg(sh("M3.5 14v5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-5h-4.5l-1.5 2.5h-5L8 14z", P.sage, P.sageD) + ln("M12 12.5V3.5M8.5 7L12 3.5 15.5 7", P.roseD, 1.6)),
    "📥": svg(sh("M3.5 14v5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-5h-4.5l-1.5 2.5h-5L8 14z", P.sage, P.sageD) + ln("M12 3.5v9M8.5 9L12 12.5 15.5 9", P.skyD, 1.6)),
    "🚪": svg(sh("M6 3.5h12v17H6z", P.brown, P.brownD) + ln("M8.5 6.5h7v5h-7zM8.5 13h7v5h-7z", P.brownD, .8) + ci(15.5, 12.5, 1, P.butter, P.butterD)),
    "📷": svg(sh("M3.5 8h3.5l1.5-2.5h7L17 8h3.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z", P.grey, P.greyD) + ci(12, 13, 3.8, P.sky, P.skyD) + ci(12, 13, 1.5, "#ffffff", P.skyD)),
    "🔬": svg(`<rect x="9.5" y="3" width="4.6" height="11" rx="1.5" transform="rotate(25 12 9)" fill="${P.sky}" fill-opacity=".74" stroke="${P.skyD}" stroke-opacity=".6" stroke-width=".9"/>` + ln("M16.5 9a6 6 0 0 1-3.5 9", P.greyD, 1.5) + ln("M5 20.5h14", P.brownD, 1.8) + ln("M8 17.5h4", P.brownD, 1.4)),
    "🗓": svg(sh("M4 6h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z", P.paper, P.roseD) + sh("M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3H3z", P.rose, P.roseD) + ln("M8 3.5V7M16 3.5V7", P.roseD, 1.4) + ci(8, 14, .9, P.roseD) + ci(12, 14, .9, P.roseD) + ci(16, 14, .9, P.roseD) + ci(8, 17.4, .9, P.roseD) + ci(12, 17.4, .9, P.roseD)),
    "😇": svg(ci(12, 13.5, 7, P.butter, P.butterD) + `<ellipse cx="12" cy="5" rx="4.5" ry="1.6" fill="none" stroke="${P.butterD}" stroke-opacity=".85" stroke-width="1.4"/>` + ln("M9.5 13h.01M14.5 13h.01", P.brownD, 1.8) + ln("M9.5 16c1.5 1.5 3.5 1.5 5 0", P.brownD, 1)),
    "🧽": svg(sh("M4.5 8.5h15a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z", P.butter, P.butterD) + sh("M4.5 8.5L6 6h13l1.5 2.5z", "#fbe9a8", P.butterD) + ci(8, 12, .9, P.peachD) + ci(13, 13.5, 1.1, P.peachD) + ci(17, 11.5, .8, P.peachD)),
  };

  // ---------- Thay emoji bằng icon (chỉ khi theme màu nước) ----------
  function iconizer() {
    const keys = Object.keys(ICONS).sort((a, b) => b.length - a.length);
    const re = new RegExp("(" + keys.map((k) => k + "\\uFE0F?").join("|") + ")", "u");
    const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "OPTION", "TITLE", "INPUT"]);
    function convert(textNode) {
      const t = textNode.nodeValue;
      if (!t || !re.test(t)) return;
      const p = textNode.parentNode;
      if (!p || SKIP.has(p.nodeName) || (p.classList && p.classList.contains("ic"))) return;
      const frag = document.createDocumentFragment();
      t.split(re).forEach((part) => {
        if (!part) return;
        const key = part.replace(/️/g, "");
        if (ICONS[key]) {
          const s = document.createElement("span");
          s.className = "ic";
          s.setAttribute("aria-hidden", "true");
          s.innerHTML = ICONS[key];
          frag.appendChild(s);
        } else frag.appendChild(document.createTextNode(part));
      });
      p.replaceChild(frag, textNode);
    }
    function walk(node) {
      if (node.nodeType === 3) { convert(node); return; }
      if (node.nodeType !== 1 || SKIP.has(node.nodeName) || node.classList.contains("ic")) return;
      Array.from(node.childNodes).forEach(walk);
    }
    return { walk, convert };
  }

  function mount() {
    if (theme.watercolor) {
      document.body.insertAdjacentHTML("afterbegin", FILTERS);
      const it = iconizer();
      it.walk(document.body);
      new MutationObserver((muts) => {
        muts.forEach((m) => {
          if (m.type === "characterData") it.convert(m.target);
          else m.addedNodes.forEach((n) => it.walk(n));
        });
      }).observe(document.body, { childList: true, characterData: true, subtree: true });
    }
    buildPanel();
  }

  // ---------- Bảng "Giao diện": chọn phong cách + bộ chữ ----------
  function buildPanel() {
    const toolbar = document.getElementById("toolbar");
    const btn = document.createElement("button");
    btn.id = "theme-btn";
    btn.type = "button";
    btn.title = "Đổi phong cách và bộ chữ";
    btn.textContent = "🎨 Giao diện";
    (toolbar || document.body).appendChild(btn);

    const ov = document.createElement("div");
    ov.id = "theme-overlay";
    ov.hidden = true;
    ov.innerHTML = `
      <div id="theme-box">
        <button id="theme-close" type="button" aria-label="Đóng">×</button>
        <h2>Giao diện</h2>
        <h3>Phong cách</h3>
        <div id="theme-styles"></div>
        <h3>Bộ chữ</h3>
        <div id="theme-fonts"></div>
        <p class="theme-hint">Chọn xong web tự tải lại. Muốn chỉnh màu, chữ, màu thân hoa... thì sửa bảng THEMES trong <code>theme.js</code>.</p>
      </div>`;
    document.body.appendChild(ov);

    let pick = { theme: themeId, font: fontId };
    function render() {
      const st = ov.querySelector("#theme-styles"), fo = ov.querySelector("#theme-fonts");
      st.innerHTML = ""; fo.innerHTML = "";
      Object.keys(THEMES).forEach((id) => {
        const t = THEMES[id], b = document.createElement("button");
        b.type = "button";
        b.className = "theme-opt" + (pick.theme === id ? " on" : "");
        b.innerHTML = `<b></b><span></span><i>${["--sky-top", "--grass", "--accent"].map((k) => `<u style="background:${t.vars[k]}"></u>`).join("")}</i>`;
        b.querySelector("b").textContent = t.label;
        b.querySelector("span").textContent = t.note;
        b.addEventListener("click", () => { pick.theme = id; render(); });
        st.appendChild(b);
      });
      Object.keys(FONT_SETS).forEach((id) => {
        const f = FONT_SETS[id], b = document.createElement("button");
        b.type = "button";
        b.className = "theme-opt font" + (pick.font === id ? " on" : "");
        b.innerHTML = `<b></b><span class="sample"></span>`;
        b.querySelector("b").textContent = f.label;
        const s = b.querySelector(".sample");
        s.style.fontFamily = f.body;
        s.textContent = "Mỗi bài thơ là một bông hoa — Khu vườn thơ của tôi";
        b.addEventListener("click", () => { pick.font = id; render(); });
        fo.appendChild(b);
      });
      const apply = document.createElement("button");
      apply.type = "button";
      apply.id = "theme-apply";
      apply.textContent = "Áp dụng";
      apply.addEventListener("click", () => {
        try { localStorage.setItem(KEY, JSON.stringify(pick)); } catch {}
        const u = new URL(location.href);
        u.searchParams.delete("theme"); u.searchParams.delete("font");
        location.href = u.toString();
      });
      fo.appendChild(apply);
    }
    const open = () => { loadFonts(Object.values(FONT_SETS).map((f) => f.gf)); pick = { theme: themeId, font: fontId }; render(); ov.hidden = false; };
    const close = () => { ov.hidden = true; };
    btn.addEventListener("click", open);
    ov.querySelector("#theme-close").addEventListener("click", close);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !ov.hidden) close(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
