// Weed Labs world: building-enter animation, framed tools, and the private library (Perpustakaan).
// Lazy-loaded by game.js. Library content comes only from fetch('/library/manifest.json') at runtime.
export const isCheckout = (u) => /scalev|myscalev|checkout|\/offer|\/promo|\/p\//i.test(String(u));
const FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation';
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function h(tag, props = {}, kids = []) {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => (k === 'text' ? (e.textContent = v) : k in e && k !== 'list' ? (e[k] = v) : e.setAttribute(k, v)));
  kids.forEach((c) => e.append(c));
  return e;
}

const CSS = `
#wl-fade{position:fixed;inset:0;z-index:60;opacity:0;pointer-events:none;background:#f4dcae}
body.in-lib .hud,body.in-lib #labels,body.in-lib #card,body.in-lib #joy,body.in-lib #toast,body.in-lib #intro{display:none}
.wl-ui{--wl-ink:#f6e9cf;--wl-dark:#2a190d;--wl-amber:#e0a84a;font-family:var(--font-sans);color:var(--wl-ink)}
.wl-ui[hidden],.wl-ui [hidden]{display:none!important}
#wl-lib{position:fixed;inset:0;z-index:30;pointer-events:none}
#wl-lib>*{pointer-events:auto}
.wl-top{position:absolute;top:0;left:0;right:0;display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;padding:max(12px,env(safe-area-inset-top)) 14px 10px;background:linear-gradient(rgba(34,20,10,.82),rgba(34,20,10,.55) 70%,transparent)}
.wl-btn{font:700 13px/1 var(--font-sans);color:var(--wl-dark);background:#f6e3b8;border:0;border-radius:11px;padding:11px 14px;min-height:40px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
.wl-btn:hover{background:#ffeec6}.wl-btn.ghost{background:rgba(255,255,255,.14);color:var(--wl-ink);box-shadow:none}
.wl-btn:disabled{opacity:.35;cursor:default}
.wl-btn:focus-visible,.wl-search input:focus-visible,.wl-results button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.wl-title{font:800 17px/1 var(--font-sans);letter-spacing:-.01em;margin-right:auto}
.wl-search{position:relative;flex:1 1 260px;max-width:460px}
.wl-search input{width:100%;font:500 14px var(--font-sans);color:var(--wl-ink);background:rgba(255,255,255,.14);border:1px solid rgba(246,227,184,.4);border-radius:11px;padding:11px 12px;min-height:40px;-webkit-user-select:text;user-select:text}
.wl-search input::placeholder{color:rgba(246,233,207,.65)}
.wl-results{position:absolute;top:calc(100% + 6px);left:0;right:0;max-height:min(46vh,340px);overflow:auto;list-style:none;background:rgba(34,20,10,.95);border:1px solid rgba(246,227,184,.3);border-radius:12px;padding:5px;box-shadow:0 12px 30px rgba(0,0,0,.4)}
.wl-results button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;text-align:left;font:inherit;color:var(--wl-ink);background:none;border:0;border-radius:8px;padding:9px 10px;cursor:pointer}
.wl-results button:hover{background:rgba(246,227,184,.14)}
.wl-results .t{font-weight:700;font-size:14px}.wl-results .s{font:500 11px var(--font-mono);color:var(--wl-amber)}
.wl-results .none{padding:10px;font-size:13px;opacity:.8}
.wl-nav{position:absolute;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:center;gap:12px;padding:0 14px}
.wl-nav .wl-btn{width:46px;font-size:20px}
.wl-where{min-width:150px;text-align:center;font:600 13px var(--font-sans);background:rgba(34,20,10,.7);border-radius:10px;padding:10px 12px}
.wl-tip{position:absolute;left:0;top:0;pointer-events:none!important;display:flex;flex-direction:column;gap:2px;max-width:min(280px,80vw);background:rgba(34,20,10,.94);border:1px solid rgba(246,227,184,.4);border-radius:10px;padding:8px 11px;font-size:13px;line-height:1.3}
.wl-tip span{font:500 11px var(--font-mono);color:var(--wl-amber)}
#wl-reader{position:fixed;inset:0;z-index:45;display:grid;place-items:center;padding:12px;background:rgba(24,13,6,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.wl-sheet{width:min(1080px,100%);height:100%;max-height:calc(100dvh - 24px);display:flex;flex-direction:column;background:#fbf3e1;color:var(--wl-dark);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.wl-rh{padding:14px 16px 10px;border-bottom:1px solid rgba(42,25,13,.15)}
.wl-rh h2{font:800 18px/1.2 var(--font-sans);letter-spacing:-.01em}
.wl-meta{font:500 12px var(--font-mono);color:#8a5a2b;margin:3px 0 6px}
.wl-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}.wl-tags span{font:500 11px var(--font-mono);background:#f0dfb8;border-radius:6px;padding:3px 7px}
.wl-sum{font-size:13px;line-height:1.45;color:#4a3320;max-height:4.4em;overflow:auto}
.wl-sheet iframe{flex:1;width:100%;min-height:0;border:0;background:#fff}
.wl-rb{display:flex;gap:8px;justify-content:flex-end;padding:10px 12px max(10px,env(safe-area-inset-bottom));border-top:1px solid rgba(42,25,13,.15)}
.wl-rb .wl-btn{flex:0 1 auto;background:#2a190d;color:#f6e9cf}.wl-rb .wl-btn.ghost{background:#f0dfb8;color:#2a190d}
#wl-sign{position:fixed;z-index:50;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(380px,calc(100% - 24px));background:#fbf3e1;color:var(--wl-dark);border-radius:16px;padding:16px;box-shadow:0 14px 40px rgba(20,10,0,.4)}
#wl-sign p{font:700 15px/1.35 var(--font-sans);margin-bottom:12px}
#wl-sign .row{display:flex;gap:8px}#wl-sign .wl-btn{flex:1;background:#2a190d;color:#f6e9cf}#wl-sign .wl-btn.ghost{background:#f0dfb8;color:#2a190d;flex:0 0 auto}
#wl-frame{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:12px;background:rgba(8,40,32,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:var(--font-sans)}
#wl-frame[hidden]{display:none}
.wl-win{width:min(1100px,100%);height:100%;max-height:calc(100dvh - 24px);display:flex;flex-direction:column;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.wl-bar{display:flex;gap:8px;align-items:center;padding:8px 10px;background:#e8f3ef;border-bottom:1px solid rgba(13,147,115,.25)}
.wl-dots{display:flex;gap:5px}.wl-dots i{width:10px;height:10px;border-radius:50%;background:#0d9373;opacity:.55}
.wl-dom{flex:1;min-width:0;font:500 12px var(--font-mono);color:#07705a;background:#fff;border-radius:8px;padding:8px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wl-bar .wl-btn{background:#0d9373;color:#fff;min-height:36px;padding:9px 12px}.wl-bar .wl-btn.ghost{background:#fff;color:#07705a;border:1px solid rgba(13,147,115,.3);width:40px;padding:0;font-size:18px}
.wl-win iframe{flex:1;width:100%;min-height:0;border:0}
@media (min-width:640px){.wl-dots{margin-right:4px}}
@media (max-width:640px){.wl-dots{display:none}.wl-title{font-size:15px}.wl-search{flex-basis:100%;max-width:none;order:3}.wl-where{min-width:120px}}
@media (prefers-reduced-motion:no-preference){#wl-reader,#wl-frame,#wl-sign{animation:wl-in .25s ease}@keyframes wl-in{from{opacity:0}}}
`;

export default function create(ctx) {
  const { THREE, renderer, canvas, params } = ctx;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const fade = h('div', { id: 'wl-fade' }); document.body.append(fade);
  let busy = false, inLib = false, frameSpot = null;

  function fadeTo(v, ms) {
    fade.style.pointerEvents = v > 0 ? 'auto' : 'none';
    fade.style.transition = ms ? `opacity ${ms}ms ease` : 'none';
    void fade.offsetWidth; fade.style.opacity = v;
    return wait(ms || 0);
  }

  // ---------- enter-building animation ----------
  function push(spot, dur, color) {
    ctx.lock(true); fade.style.background = color;
    if (reduce()) { return fadeTo(1, 250); }
    return new Promise((res) => {
      const a = ctx.anchor(spot), c0 = ctx.camPos.clone(), l0 = ctx.camLook.clone();
      const c1 = new THREE.Vector3(a.x, 1.75, a.z + 1.1), l1 = new THREE.Vector3(a.x, 1.6, a.z - 3);
      let t0 = 0, done = false;
      fade.style.pointerEvents = 'auto'; fade.style.transition = 'none';
      ctx.setCine((now) => {
        if (done) return; // camera stays at the door
        if (!t0) t0 = now;
        const t = Math.min(1, (now - t0) / (dur * 1000)), e = t * t * (3 - 2 * t);
        ctx.camPos.lerpVectors(c0, c1, e); ctx.camLook.lerpVectors(l0, l1, e);
        fade.style.opacity = Math.max(0, (t - 0.4) / 0.6);
        if (t > 0.8) ctx.setPlayerVisible(false);
        if (t >= 1 && !done) { done = true; res(); }
      });
    });
  }
  function comeOut(spot) {
    ctx.placeOutside(spot); ctx.setPlayerVisible(true); ctx.setCine(null); ctx.lock(false);
    busy = false; return fadeTo(0, reduce() ? 250 : 550);
  }
  const reset = () => { fade.style.opacity = 0; fade.style.pointerEvents = 'none'; ctx.setCine(null); ctx.lock(false); ctx.setPlayerVisible(true); busy = false; };
  addEventListener('pageshow', (e) => { if (e.persisted && !inLib && !frameSpot) reset(); });

  // ---------- product CTA ----------
  async function visit(spot) {
    if (busy) return;
    if (spot.id === 'library') return enterLibrary();
    busy = true; ctx.closeCard();
    const url = new URL(spot.href, location.href);
    await push(spot, 0.9, '#e6f6f1');
    if (url.origin !== location.origin || isCheckout(url.href)) { location.assign(url.href); return; }
    openFrame(spot, url);
  }
  let fr = null;
  function openFrame(spot, url) {
    if (!fr) {
      const dom = h('div', { className: 'wl-dom' }), full = h('a', { className: 'wl-btn', text: 'Buka penuh' });
      const close = h('button', { type: 'button', className: 'wl-btn ghost', text: '×' }); close.setAttribute('aria-label', 'Tutup');
      const ifr = h('iframe', { title: 'Pratinjau' }); ifr.setAttribute('sandbox', FRAME_SANDBOX);
      const win = h('div', { className: 'wl-win' }, [h('div', { className: 'wl-bar' }, [h('span', { className: 'wl-dots' }, [h('i'), h('i'), h('i')]), dom, full, close]), ifr]);
      const root = h('div', { id: 'wl-frame', hidden: true, role: 'dialog' }, [win]); root.setAttribute('aria-label', 'Pratinjau alat');
      document.body.append(root); fr = { root, dom, full, close, ifr };
      close.addEventListener('click', closeFrame);
    }
    frameSpot = spot;
    fr.dom.textContent = url.host + url.pathname; fr.full.href = url.href; fr.ifr.src = url.href; fr.ifr.title = spot.name;
    fr.root.hidden = false; fr.close.focus({ preventScroll: true });
    fadeTo(0, reduce() ? 250 : 450);
  }
  async function closeFrame() {
    if (!frameSpot) return;
    const s = frameSpot; frameSpot = null; fr.ifr.src = 'about:blank';
    await fadeTo(1, 200); fr.root.hidden = true; await comeOut(s);
  }

  // ---------- sign-in panel ----------
  let sign = null;
  function showSignIn() {
    if (!sign) {
      const a = h('a', { className: 'wl-btn', text: 'Masuk dengan Google', href: '/oauth2/sign_in?rd=' + encodeURIComponent(location.origin + '/?enter=library') });
      const x = h('button', { type: 'button', className: 'wl-btn ghost', text: 'Tutup' });
      sign = h('div', { id: 'wl-sign', role: 'dialog', hidden: true }, [h('p', { text: 'Perpustakaan ini khusus pemilik.' }), h('div', { className: 'row' }, [a, x])]);
      sign.setAttribute('aria-label', 'Perpustakaan privat'); sign.classList.add('wl-ui');
      x.addEventListener('click', () => { sign.hidden = true; });
      document.body.append(sign); sign.a = a;
    }
    sign.hidden = false; sign.a.focus({ preventScroll: true });
  }

  // ---------- library data ----------
  async function fetchManifest() {
    const o = params.get('libmanifest'), url = o && o[0] === '/' && o[1] !== '/' ? o : '/library/manifest.json';
    try {
      const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
      const m = await r.json();
      return m && Array.isArray(m.books) ? m : null;
    } catch (e) { return null; }
  }

  async function enterLibrary(opts = {}) {
    if (busy || inLib) return; busy = true; ctx.closeCard();
    const m = await fetchManifest();
    if (!m) { busy = false; showSignIn(); return; }
    const spot = ctx.spots.library;
    if (opts.instant) { ctx.lock(true); fade.style.background = '#f4dcae'; fade.style.opacity = 1; }
    const pushed = opts.instant ? null : push(spot, 1.2, '#f4dcae'); // dolly plays while fonts and shelves load
    try { await Promise.race([document.fonts.load('700 24px "Plus Jakarta Sans"'), wait(900)]); } catch (e) { /* fallback font */ }
    try { build(m); await pushed; } catch (e) { console.error(e); reset(); fadeTo(0, 200); return; }
    ctx.setPlayerVisible(false);
    openInterior();
    busy = false;
    fadeTo(0, reduce() ? 250 : 700);
  }

  // ---------- interior ----------
  const PAL = [['#2f6b4f', '#c8553d', '#e0a84a', '#3b5b7a'], ['#6a4c93', '#2e86ab', '#e8a87c', '#41615a'], ['#8c2f39', '#1d3557', '#f1c453', '#4a4e69'], ['#33415c', '#5c677d', '#d68c45', '#2a6f6b'], ['#b5446e', '#f2a541', '#2b7a78', '#7a5c3e']];
  const ROWS = 4, PITCH = 1.2, Y0 = 0.25, FOV = 36;
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const shadeHex = (hex, f) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join('');
  function wrap(x, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
    const push1 = (w) => { while (x.measureText(w).width > maxW) { let k = w.length - 1; while (k > 1 && x.measureText(w.slice(0, k)).width > maxW) k--; lines.push(w.slice(0, k)); w = w.slice(k); } cur = w; };
    words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width <= maxW) cur = t; else { if (cur) lines.push(cur); push1(w); } });
    if (cur) lines.push(cur);
    return lines;
  }
  function cvs(w, hh) { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; }
  function mkTex(c, nearest) {
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } else t.anisotropy = 4;
    return t;
  }
  function noiseTex(hex, amp, rep, kind) {
    const c = cvs(16, 16), x = c.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const f = (kind === 'plank' && j % 8 === 7 ? 0.74 : 0.94 + rnd() * amp * 2); x.fillStyle = shadeHex(hex, f); x.fillRect(i, j, 1, 1); }
    const t = mkTex(c, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); return t;
  }
  function spineTex(title, w, hh, bg, acc) {
    const S = 300, cw = Math.max(72, Math.round(w * S)), ch = Math.round(hh * S), c = cvs(cw, ch), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, cw, 0); g.addColorStop(0, shadeHex(bg, 1.14)); g.addColorStop(0.5, bg); g.addColorStop(1, shadeHex(bg, 0.8));
    x.fillStyle = g; x.fillRect(0, 0, cw, ch);
    x.fillStyle = acc; x.fillRect(0, ch * 0.05, cw, ch * 0.02); x.fillRect(0, ch * 0.93, cw, ch * 0.02);
    x.fillStyle = lum(bg) > 0.55 ? '#2b1b0e' : '#fbf1dc'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const L = ch * 0.82, T = cw * 0.8; let fs = Math.min(cw * 0.42, 46), lines;
    x.save(); x.translate(cw / 2, ch / 2); x.rotate(Math.PI / 2);
    for (; fs >= 13; fs--) { x.font = `700 ${fs}px "Plus Jakarta Sans", system-ui, sans-serif`; lines = wrap(x, title, L); if (lines.length <= 3 && lines.length * fs * 1.2 <= T) break; }
    if (lines.length > 3 || lines.length * fs * 1.2 > T) { lines = lines.slice(0, Math.max(1, Math.min(3, Math.floor(T / (fs * 1.2))))); let l = lines[lines.length - 1] + '…'; while (l.length > 2 && x.measureText(l).width > L) l = l.slice(0, -2) + '…'; lines[lines.length - 1] = l; }
    lines.forEach((ln, k) => x.fillText(ln, 0, (k - (lines.length - 1) / 2) * fs * 1.2));
    x.restore();
    return mkTex(c, false);
  }
  function plateTex(name, sub, w, hh, dark) {
    const c = cvs(w, hh), x = c.getContext('2d');
    x.fillStyle = dark ? '#3a2412' : '#6b4524'; x.fillRect(0, 0, w, hh); x.strokeStyle = '#d9a64c'; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, hh - 12);
    x.fillStyle = '#f3d78c'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = hh * (sub ? 0.4 : 0.5); x.font = `800 ${fs}px "Plus Jakarta Sans", system-ui, sans-serif`;
    while (x.measureText(name).width > w - 40 && fs > 10) { fs--; x.font = `800 ${fs}px "Plus Jakarta Sans", system-ui, sans-serif`; }
    x.fillText(name, w / 2, sub ? hh * 0.42 : hh / 2);
    if (sub) { x.fillStyle = '#e6c27a'; x.font = `500 ${hh * 0.2}px "DM Mono", ui-monospace, monospace`; x.fillText(sub, w / 2, hh * 0.76); }
    return mkTex(c, false);
  }

  const ui = h('div', { id: 'wl-lib', className: 'wl-ui', hidden: true });
  const exitBtn = h('button', { type: 'button', className: 'wl-btn ghost', text: 'Keluar' });
  const search = h('input', { type: 'search', placeholder: 'Cari judul, tag, ringkasan…', autocomplete: 'off' }); search.setAttribute('aria-label', 'Cari buku'); search.setAttribute('aria-controls', 'wl-results');
  const resList = h('ul', { id: 'wl-results', className: 'wl-results', hidden: true });
  const count = h('span', { className: 'sr-only', role: 'status' });
  const searchBox = h('div', { className: 'wl-search' }, [search, resList, count]);
  ui.append(h('div', { className: 'wl-top' }, [exitBtn, h('h1', { className: 'wl-title', text: 'Perpustakaan' }), searchBox]));
  const prevB = h('button', { type: 'button', className: 'wl-btn', text: '‹' }), nextB = h('button', { type: 'button', className: 'wl-btn', text: '›' });
  prevB.setAttribute('aria-label', 'Rak sebelumnya'); nextB.setAttribute('aria-label', 'Rak berikutnya');
  const where = h('span', { className: 'wl-where' });
  ui.append(h('div', { className: 'wl-nav' }, [prevB, where, nextB]));
  const tip = h('div', { className: 'wl-tip', hidden: true }), tipT = h('b'), tipD = h('span'); tip.append(tipT, tipD); ui.append(tip);
  document.body.append(ui);

  // reader
  const rTitle = h('h2'), rMeta = h('div', { className: 'wl-meta' }), rTags = h('div', { className: 'wl-tags' }), rSum = h('p', { className: 'wl-sum' });
  const rFrame = h('iframe', { title: 'Isi dokumen' });
  const rFull = h('a', { className: 'wl-btn', text: 'Buka penuh', target: '_blank', rel: 'noopener' }), rBack = h('button', { type: 'button', className: 'wl-btn ghost', text: 'Kembali ke rak' });
  const reader = h('div', { id: 'wl-reader', className: 'wl-ui', hidden: true, role: 'dialog' }, [h('div', { className: 'wl-sheet' }, [h('div', { className: 'wl-rh' }, [rTitle, rMeta, rTags, rSum]), rFrame, h('div', { className: 'wl-rb' }, [rBack, rFull])])]);
  reader.setAttribute('aria-modal', 'true'); reader.setAttribute('aria-label', 'Pembaca dokumen'); document.body.append(reader);

  let scene, cam, books = [], cases = [], pick = [], matchSet = null, hovered = null, camX = 0, camTo = 0, dist = 13, drag = null, opener = null, bookSpot = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v3 = new THREE.Vector3();
  const fmtDate = (d) => { const t = new Date(d); return isNaN(t) ? String(d || '') : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  const bookUrl = (b) => '/library/' + String(b.file).split('/').map(encodeURIComponent).join('/');

  function disposeScene() {
    if (!scene) return;
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
    scene = null; books = []; cases = []; pick = [];
  }

  function build(m) {
    disposeScene(); sd = 7; hovered = null; matchSet = null; search.value = '';
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a180c);
    cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
    scene.add(new THREE.AmbientLight(0xffe6c0, 1.25));
    const key = new THREE.DirectionalLight(0xfff1d8, 0.9); key.position.set(2, 8, 12); scene.add(key);
    const names = (m.shelves || []).map(String); m.books.forEach((b) => { if (!names.includes(b.shelf)) names.push(String(b.shelf || 'Lainnya')); });
    const mats = {}, mat = (hex) => mats[hex] || (mats[hex] = new THREE.MeshLambertMaterial({ color: hex }));
    const woodMat = new THREE.MeshLambertMaterial({ map: noiseTex('#7a4e2a', 0.05, [1, 1]) }), darkWood = new THREE.MeshLambertMaterial({ map: noiseTex('#4a2d16', 0.05, [1, 1]) });
    const box = (w, hh, d, mt, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mt); o.position.set(x, y, z); parent.add(o); return o; };
    const GAP = 1.1, H = Y0 + ROWS * PITCH + 0.12;
    let cursor = 0;
    books = m.books.map((b, i) => ({ b, i, hay: norm([b.title, (b.tags || []).join(' '), b.summary].join(' ')) }));
    names.forEach((name, ci) => {
      const own = books.filter((x) => x.b.shelf === name), pal = PAL[ci % PAL.length];
      const W = Math.max(3.6, 0.4 + Math.ceil(own.length / ROWS) * 0.62), cx = cursor + W / 2; cursor += W + GAP;
      const g = new THREE.Group(); g.position.x = cx; scene.add(g);
      cases.push({ name, cx, W, n: own.length });
      box(W, H, 0.08, darkWood, 0, H / 2, -0.44, g);
      [-1, 1].forEach((s) => box(0.14, H, 0.95, woodMat, s * (W / 2 - 0.07), H / 2, 0, g));
      box(W, Y0, 0.95, woodMat, 0, Y0 / 2, 0, g);
      for (let r = 0; r <= ROWS; r++) box(W - 0.28, 0.08, 0.95, woodMat, 0, Y0 + r * PITCH - 0.04, 0, g);
      box(W + 0.2, 0.16, 1.05, woodMat, 0, H + 0.06, 0.02, g);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.62), new THREE.MeshLambertMaterial({ map: plateTex(name, own.length ? `${own.length} dokumen` : 'kosong', 540, 124) }));
      pl.position.set(0, H + 0.62, 0.55); g.add(pl);
      // fill rows: real books (row order 2,1,3,0), decor after them
      const order = [2, 1, 3, 0], inner = W - 0.4, rows = order.map(() => ({ items: [], used: 0 }));
      own.forEach((o) => {
        const w = 0.46 + (parseInt(String(o.b.slug || o.i).replace(/\W/g, '').slice(0, 4), 36) % 17) / 100, hh = 0.84 + rnd() * 0.2;
        let ri = rows.findIndex((r) => r.used + w <= inner); if (ri < 0) ri = 0;
        rows[ri].items.push({ real: o, w, h: hh }); rows[ri].used += w + 0.02;
      });
      rows.forEach((r, k) => {
        const decorMax = own.length ? (r.items.length ? inner * 0.6 : inner * 0.35 * rnd()) : (k === 0 || k === 3 ? inner * 0.45 : 0);
        while (r.used < decorMax) { const w = 0.16 + rnd() * 0.16; if (r.used + w > inner) break; r.items.push({ w, h: 0.7 + rnd() * 0.32 }); r.used += w + 0.015; }
      });
      rows.forEach((r, k) => {
        const row = order[k], by = Y0 + row * PITCH; let x = -inner / 2;
        r.items.forEach((it) => {
          const bg = it.real ? pal[it.real.i % pal.length] : shadeHex(pal[Math.floor(rnd() * pal.length)], 0.72), acc = shadeHex(bg, lum(bg) > 0.5 ? 0.55 : 1.7);
          const cover = new THREE.MeshLambertMaterial({ color: shadeHex(bg, 0.78) }), pages = new THREE.MeshLambertMaterial({ color: '#efe3c6' });
          const spine = it.real ? new THREE.MeshLambertMaterial({ map: spineTex(String(it.real.b.title || ''), it.w, it.h, bg, acc) }) : new THREE.MeshLambertMaterial({ color: bg });
          const tilt = !it.real && rnd() < 0.08;
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(it.w, it.h, 0.8), [cover, cover, pages, cover, spine, cover]);
          mesh.position.set(x + it.w / 2, by + it.h / 2, -0.02); if (tilt) mesh.rotation.z = -0.1;
          g.add(mesh); x += it.w + (it.real ? 0.02 : 0.015);
          if (it.real) {
            const bk = it.real; bk.mesh = mesh; bk.mats = [cover, spine]; bk.baseZ = mesh.position.z; bk.hov = 0; bk.dim = 0; bk.ci = ci; bk.h = it.h;
            [cover, spine].forEach((mm) => { mm.userData.base = mm === spine ? new THREE.Color(1, 1, 1) : mm.color.clone(); });
            mesh.userData.bk = bk; pick.push(mesh);
          }
        });
      });
      if (!own.length) { const kp = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.42), new THREE.MeshLambertMaterial({ map: plateTex('kosong', '', 300, 84, true) })); kp.position.set(0, Y0 + 2 * PITCH + 0.5, 0.2); g.add(kp); }
    });
    // room
    const total = cursor - GAP, mid = total / 2, RW = total + 60;
    const wallT = noiseTex('#e9d9b4', 0.03, [RW / 2, 6]), floorT = noiseTex('#8b5a30', 0.05, [RW / 1.5, 14], 'plank');
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(RW, 14), new THREE.MeshLambertMaterial({ map: wallT })); wall.position.set(mid, 7, -0.5); scene.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, 30), new THREE.MeshLambertMaterial({ map: floorT })); floor.rotation.x = -Math.PI / 2; floor.position.set(mid, 0, 14.5); scene.add(floor);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(total + 6, 5), new THREE.MeshLambertMaterial({ color: '#8c3b2e' })); rug.rotation.x = -Math.PI / 2; rug.position.set(mid, 0.01, 3.2); scene.add(rug);
    const wain = new THREE.Mesh(new THREE.PlaneGeometry(RW, 1.2), new THREE.MeshLambertMaterial({ color: '#6b4524' })); wain.position.set(mid, 0.6, -0.49); scene.add(wain);
    for (let i = 0; i < cases.length - 1; i++) {
      const lx = (cases[i].cx + cases[i].W / 2 + cases[i + 1].cx - cases[i + 1].W / 2) / 2;
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), new THREE.MeshBasicMaterial({ color: '#ffe3a1' })); lamp.position.set(lx, 3.6, -0.2); scene.add(lamp);
      const pt = new THREE.PointLight(0xffc77a, 6, 9); pt.position.set(lx, 3.6, 1.2); scene.add(pt);
    }
    cases.mid = mid; camX = camTo = cases[0].cx; resize();
    renderResults(); updateWhere();
  }

  function resize() {
    if (!cam) return;
    const asp = innerWidth / innerHeight; cam.aspect = asp; cam.fov = FOV; cam.updateProjectionMatrix();
    const t = Math.tan((FOV * Math.PI) / 360);
    dist = Math.max(4.4 / (2 * t * asp), 7.4 / (2 * t)) + 0.4;
  }
  addEventListener('resize', resize);
  const portrait = () => innerWidth / innerHeight < 1;
  const upp = () => (2 * dist * Math.tan((FOV * Math.PI) / 360) * (innerWidth / innerHeight)) / innerWidth;
  const clampX = (x) => Math.max(cases[0].cx, Math.min(cases[cases.length - 1].cx, x));
  const nearest = (x) => cases.reduce((b, c, i) => (Math.abs(c.cx - x) < Math.abs(cases[b].cx - x) ? i : b), 0);
  function panTo(i) { camTo = cases[Math.max(0, Math.min(cases.length - 1, i))].cx; if (reduce()) camX = camTo; updateWhere(); }
  function updateWhere() {
    if (!cases.length) return; const i = nearest(camTo);
    where.textContent = `${i + 1}/${cases.length} · ${cases[i].name}`; prevB.disabled = i === 0; nextB.disabled = i === cases.length - 1;
  }

  // search
  function matchList(q) { const terms = norm(q).split(/\s+/).filter(Boolean); return terms.length ? books.filter((b) => terms.every((t) => b.hay.includes(t))) : null; }
  function renderResults() {
    const list = matchList(search.value), shown = list || books;
    matchSet = list ? new Set(list.map((b) => b.i)) : null;
    resList.replaceChildren();
    shown.forEach((b) => {
      const bt = h('button', { type: 'button' }, [h('span', { className: 't', text: String(b.b.title || '') }), h('span', { className: 's', text: String(b.b.shelf || '') })]);
      bt.addEventListener('click', () => openReader(b, bt));
      resList.append(h('li', {}, [bt]));
    });
    if (!shown.length) resList.append(h('li', { className: 'none', text: 'Tidak ada hasil.' }));
    count.textContent = list ? `${list.length} hasil` : '';
    return list;
  }
  search.addEventListener('input', () => { const l = renderResults(); resList.hidden = false; if (l && l.length) panTo(l[0].ci); });
  search.addEventListener('focus', () => { resList.hidden = false; });
  searchBox.addEventListener('focusout', (e) => { if (!searchBox.contains(e.relatedTarget)) resList.hidden = true; });
  resList.addEventListener('pointerdown', (e) => e.preventDefault());
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const l = matchList(search.value); if (l && l.length) openReader(l[0], search); }
    else if (e.key === 'ArrowDown') { const b = resList.querySelector('button'); if (b) { b.focus(); e.preventDefault(); } }
    else if (e.key === 'Escape') { if (search.value) { search.value = ''; renderResults(); } else { resList.hidden = true; search.blur(); } e.stopPropagation(); }
  });
  resList.addEventListener('keydown', (e) => {
    const bs = [...resList.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && bs[i + 1]) { bs[i + 1].focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { (bs[i - 1] || search).focus(); e.preventDefault(); }
  });

  // reader
  function openReader(bk, from) {
    const b = bk.b; opener = from || document.activeElement;
    rTitle.textContent = String(b.title || ''); rMeta.textContent = [b.shelf, fmtDate(b.date)].filter(Boolean).join(' · ');
    rTags.replaceChildren(...(b.tags || []).map((t) => h('span', { text: String(t) }))); rSum.textContent = String(b.summary || '');
    const u = bookUrl(b); rFrame.src = u; rFull.href = u;
    setHover(null); resList.hidden = true; reader.hidden = false; ui.inert = true; rBack.focus({ preventScroll: true });
  }
  function closeReader() {
    if (reader.hidden) return; reader.hidden = true; ui.inert = false; rFrame.src = 'about:blank';
    const o = opener && document.contains(opener) && !opener.closest('[hidden]') ? opener : canvas; o.focus({ preventScroll: true });
  }
  rBack.addEventListener('click', closeReader);

  // hover + tooltip
  function setHover(bk) {
    if (hovered === bk) return; hovered = bk; canvas.style.cursor = bk ? 'pointer' : '';
    if (bk) { tipT.textContent = String(bk.b.title || ''); tipD.textContent = fmtDate(bk.b.date); tip.hidden = false; } else tip.hidden = true;
  }
  function pickAt(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(pick, false)[0]; return hit ? hit.object.userData.bk : null;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!inLib || !reader.hidden) return;
    drag = { id: e.pointerId, x: e.clientX, cx: camTo, moved: false, lx: e.clientX, lt: e.timeStamp, vx: 0 };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older Safari */ }
    setHover(pickAt(e)); resList.hidden = true; if (document.activeElement === search) search.blur();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!inLib || !reader.hidden) return;
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 8) { drag.moved = true; setHover(null); }
      if (drag.moved) {
        camTo = clampX(drag.cx - dx * upp()); if (reduce()) camX = camTo;
        const dt = Math.max(1, e.timeStamp - drag.lt); drag.vx = drag.vx * 0.6 + (-(e.clientX - drag.lx) * upp() / dt * 1000) * 0.4; drag.lx = e.clientX; drag.lt = e.timeStamp;
        updateWhere();
      }
    } else if (e.pointerType === 'mouse') setHover(pickAt(e));
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag; drag = null;
    if (e.type === 'pointerup') {
      if (!d.moved) { const bk = pickAt(e); if (bk) openReader(bk, canvas); }
      else if (portrait()) panTo(nearest(clampX(camTo + d.vx * 0.2)));
    }
    if (e.pointerType !== 'mouse') setHover(null);
  };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  prevB.addEventListener('click', () => panTo(nearest(camTo) - 1)); nextB.addEventListener('click', () => panTo(nearest(camTo) + 1));

  const held = new Set();
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!reader.hidden) { closeReader(); e.preventDefault(); } else if (sign && !sign.hidden) sign.hidden = true; else if (frameSpot) closeFrame();
      return;
    }
    if (!inLib || !reader.hidden || e.target === search) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { held.add(e.key); e.preventDefault(); }
  });
  addEventListener('keyup', (e) => held.delete(e.key));

  function render(dt, now) {
    if (!scene) return;
    const rm = reduce(), k = rm ? 1 : 1 - Math.exp(-dt * 9);
    if (held.size && reader.hidden) { const dir = (held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0); camTo = clampX(camTo + dir * 7 * dt); if (rm) camX = camTo; updateWhere(); }
    camX += (camTo - camX) * k;
    cam.position.set(camX, 2.55, dist); cam.lookAt(camX, 2.55 + (portrait() ? 0.15 : 0.5), 0);
    books.forEach((b) => {
      if (!b.mesh) return;
      b.hov += ((b === hovered ? 1 : 0) - b.hov) * (rm ? 1 : Math.min(1, dt * 14));
      b.dim += ((matchSet && !matchSet.has(b.i) ? 1 : 0) - b.dim) * (rm ? 1 : Math.min(1, dt * 8));
      b.mesh.position.z = b.baseZ + 0.34 * b.hov;
      const f = 1 - 0.78 * b.dim; b.mats.forEach((m) => { m.color.copy(m.userData.base).multiplyScalar(f); if (m.emissive) m.emissive.setScalar(0.16 * b.hov); });
    });
    if (hovered && !tip.hidden) {
      hovered.mesh.getWorldPosition(v3); v3.y += hovered.h / 2 + 0.08; v3.project(cam);
      const tw = tip.offsetWidth, x = Math.max(8 + tw / 2, Math.min(innerWidth - 8 - tw / 2, (v3.x * 0.5 + 0.5) * innerWidth)), y = Math.max(tip.offsetHeight + 90, (-v3.y * 0.5 + 0.5) * innerHeight - 6);
      tip.style.transform = `translate(${x - tw / 2}px, ${y - tip.offsetHeight}px)`;
    }
    renderer.render(scene, cam);
  }

  function openInterior() {
    inLib = true; document.body.classList.add('in-lib'); ui.hidden = false; ctx.setAlt(render); resize(); canvas.focus({ preventScroll: true });
  }
  async function exitLibrary() {
    if (!inLib || busy) return; busy = true;
    await fadeTo(1, reduce() ? 250 : 450);
    closeReader(); setHover(null); inLib = false; ui.hidden = true; ctx.setAlt(null); document.body.classList.remove('in-lib');
    await comeOut(ctx.spots.library);
  }
  exitBtn.addEventListener('click', exitLibrary);

  return { visit, enterLibrary, isCheckout, reset };
}
