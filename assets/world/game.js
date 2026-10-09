// Weed Labs walkable block world. Every building is a product; walk to its door to see what it does.
// Controls: WASD / arrows (Shift runs), or press-and-drag anywhere for a floating joystick (touch and mouse).
// Debug: ?shot=intro|spawn|hq|qlipper… jumps straight to a view for screenshots.
const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const params = new URLSearchParams(location.search);
const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
if (!hasGL) document.body.classList.add('no-gl');
else import('./three.module.min.js').then(start);

function start(THREE) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const SKY = 0xbfe9f5;
  renderer.setClearColor(SKY);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SKY, 60, 140);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);

  scene.add(new THREE.HemisphereLight(0xf2fbff, 0x5c7a4a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.65);
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // ---------- pixel textures ----------
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const shade = (rgb, f) => rgb.map((c) => Math.max(0, Math.min(255, Math.round(c * f))));
  function tex(draw, w = 16, h = 16) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const px = (x, i, j, rgb, a = 1) => { x.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; x.fillRect(i, j, 1, 1); };
  const noisy = (hex, amp = 0.08) => (x, w = 16, h = 16) => { const b = hexRgb(hex); for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) px(x, i, j, shade(b, 1 - amp + rnd() * amp * 2)); };
  const cache = {};
  const lam = (key, make) => cache[key] || (cache[key] = make());
  const L = (map, o = {}) => new THREE.MeshLambertMaterial({ map, ...o });
  const M = {
    grassTop: () => lam('grassTop', () => L(tex(noisy('#62ad4b', 0.12)))),
    grassSide: () => lam('grassSide', () => L(tex((x) => { noisy('#8a5d3c', 0.1)(x); const g = hexRgb('#62ad4b'); for (let i = 0; i < 16; i++) { const h = 3 + Math.floor(rnd() * 3); for (let j = 0; j < h; j++) px(x, i, j, shade(g, 0.9 + rnd() * 0.2)); } }))),
    dirt: () => lam('dirt', () => L(tex(noisy('#8a5d3c', 0.12)))),
    sand: () => lam('sand', () => L(tex(noisy('#e8d9a0', 0.07)))),
    gravel: () => lam('gravel', () => L(tex((x) => { const b = hexRgb('#b9b3a6'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, shade(b, rnd() < 0.18 ? 0.78 : 0.95 + rnd() * 0.1)); }))),
    logSide: () => lam('logSide', () => L(tex((x) => { const b = hexRgb('#6b4a2b'); for (let i = 0; i < 16; i++) { const f = i % 4 === 0 ? 0.78 : 0.95 + rnd() * 0.1; for (let j = 0; j < 16; j++) px(x, i, j, shade(b, f * (0.95 + rnd() * 0.1))); } }))),
    logTop: () => lam('logTop', () => L(tex((x) => { const b = hexRgb('#a8804f'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const r = Math.hypot(i - 7.5, j - 7.5); px(x, i, j, shade(b, Math.floor(r) % 3 === 0 ? 0.82 : 1)); } }))),
    leaves: () => lam('leaves', () => L(tex((x) => { const b = hexRgb('#3f8b3a'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, shade(b, rnd() < 0.2 ? 0.7 : 0.9 + rnd() * 0.25)); }))),
    sprout: () => lam('sprout', () => L(tex(noisy('#00c896', 0.1)))),
    glass: () => lam('glass', () => L(tex((x) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const e = i === 0 || j === 0 || i === 15 || j === 15; px(x, i, j, e ? [235, 248, 250] : [168, 220, 236], e ? 0.95 : 0.45); } px(x, 4, 3, [255, 255, 255], 0.8); px(x, 3, 4, [255, 255, 255], 0.8); }), { transparent: true })),
    water: () => lam('water', () => { const t = tex((x) => { const b = hexRgb('#3d82d8'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, shade(b, rnd() < 0.12 ? 1.25 : 0.95 + rnd() * 0.1)); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return L(t, { transparent: true, opacity: 0.86 }); }),
    door: () => lam('door', () => L(tex((x) => { noisy('#5a3d27', 0.08)(x); for (let j = 0; j < 16; j++) { px(x, 0, j, [40, 26, 16]); px(x, 15, j, [40, 26, 16]); } for (let i = 0; i < 16; i++) { px(x, i, 0, [40, 26, 16]); px(x, i, 7, [40, 26, 16]); } px(x, 12, 9, [230, 200, 120]); px(x, 12, 10, [230, 200, 120]); }))),
    pole: () => lam('pole', () => L(tex((x) => { noisy('#c9cdd2', 0.05)(x); for (let i = 0; i < 16; i += 5) for (let j = 0; j < 16; j++) px(x, i, j, [150, 155, 162]); }))),
    lamp: () => lam('lamp', () => new THREE.MeshBasicMaterial({ map: tex(noisy('#ffe7a0', 0.06)) })),
    cloud: () => lam('cloud', () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })),
    solid: (hex) => lam('s' + hex, () => L(tex(noisy(hex, 0.05)))),
    planks: (hex) => lam('p' + hex, () => L(tex((x) => { const b = hexRgb(hex); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(x, i, j, shade(b, j % 4 === 3 ? 0.8 : 0.94 + rnd() * 0.1)); }))),
  };
  function materialFor(k) {
    if (k === 'grass') return [M.grassSide(), M.grassSide(), M.grassTop(), M.dirt(), M.grassSide(), M.grassSide()];
    if (k === 'log') return [M.logSide(), M.logSide(), M.logTop(), M.logTop(), M.logSide(), M.logSide()];
    if (k[0] === 's' && k[1] === '#') return M.solid(k.slice(1));
    if (k[0] === 'p' && k[1] === '#') return M.planks(k.slice(1));
    return M[k]();
  }

  // ---------- world model ----------
  // block (x,y,z) fills x±0.5, y..y+1, z±0.5; ground layer is y=0 so feet stand at y=1
  const X0 = -28, X1 = 27, Z0 = -22, Z1 = 21;
  const blocks = [];
  const occ = new Set();
  const solid = new Set();
  const K = (x, z) => x + ',' + z;
  function put(k, x, y, z, o = {}) {
    const id = x + ',' + y + ',' + z;
    if (occ.has(id) && !o.force) return false;
    occ.add(id);
    blocks.push({ k, x, y, z, sx: o.sx || o.s || 1, sy: o.sy || o.s || 1, sz: o.sz || o.s || 1, oy: o.oy || 0 });
    if (o.solid) solid.add(K(x, z));
    return true;
  }
  const inR = (x, z, r, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;

  // brand colours: _brand/<slug>.md and the live sites (checked 9 Oct 2026)
  const SPOTS = [
    { id: 'hq', name: 'Weed Labs HQ', domain: 'weedlabs.online', href: '/classic/', go: 'See everything in list view', sameTab: true, badge: 'HQ', swatch: '#0d9373',
      desc: 'Where every product on this island gets designed, built and shipped. One person, one server, a lot of late nights.',
      r: { x0: -4, x1: 4, z0: -14, z1: -8 }, h: 7, wall: '#e9f7f2', corner: '#0d9373', roof: '#07705a', front: 'glass', hq: true },
    { id: 'qlipper', name: 'Qlipper AI', domain: 'qlipper.id', href: 'https://qlipper.id', badge: 'Product', swatch: '#F59E0B',
      desc: 'Turns long podcasts into shorts on your own GPU. Runs locally, no cloud upload, pay once.',
      r: { x0: -21, x1: -15, z0: -13, z1: -8 }, h: 4, wall: '#FFFBF2', corner: '#F59E0B', roof: '#F59E0B' },
    { id: 'vicca', name: 'Vicca', domain: 'vicca.id', href: 'https://vicca.id', badge: 'Product', swatch: '#4F46E5',
      desc: 'Self-hosted AI bot answering Instagram and WhatsApp DMs.',
      r: { x0: 15, x1: 21, z0: -13, z1: -8 }, h: 5, wall: '#4F46E5', corner: '#F8FAFC', roof: '#2563EB' },
    { id: 'lamarpintar', name: 'LamarPintar', domain: 'lamarpintar.online', href: 'https://lamarpintar.online', badge: 'Product', swatch: '#bd7f46',
      desc: 'Rewrites your CV for each job posting so it clears the ATS filter.',
      r: { x0: -21, x1: -15, z0: 0, z1: 5 }, h: 3, wall: '#6f4a2f', corner: '#fbf6ef', roof: '#bd7f46', awning: '#e6a94e' },
    { id: 'pidgo', name: 'Pidgo', domain: 'pidgoapp.online', href: 'https://pidgoapp.online', badge: 'Product', swatch: '#b3244f',
      desc: 'AI landing page generator with the tracking pixel already wired in.',
      r: { x0: 15, x1: 21, z0: 0, z1: 5 }, h: 4, wall: '#f0e6d3', corner: '#3b352c', roof: '#b3244f' },
    { id: 'wads', name: 'Wads', domain: 'wads.weedlabs.online', href: 'https://wads.weedlabs.online', badge: 'New', swatch: '#198A86',
      desc: 'Creative companion for video ads. Inspiration in, blueprint out, ads shipped. The newest building, still going up.',
      r: { x0: 6, x1: 11, z0: 9, z1: 13 }, h: 5, scaffold: true },
    { id: 'typeflow', name: 'TypeFlow', domain: 'weedlabs.online/typeflow', href: '/typeflow/', badge: 'Free', swatch: '#5b3fd1', sameTab: true,
      desc: 'Local voice to text on macOS. Hold a key, speak, paste.', stall: { x0: -15, x1: -13, zc: 11, a: '#3730A3', b: '#ffffff' } },
    { id: 'photoframe', name: 'PhotoFrame', domain: 'weedlabs.online/public-project', href: '/public-project/photoframe/', badge: 'Free', swatch: '#22c55e', sameTab: true,
      desc: 'Overlay frames on photos. Drag, resize, export.', stall: { x0: -11, x1: -9, zc: 11, a: '#22c55e', b: '#ffffff' } },
    { id: 'photoshop', name: 'Photoshop × Claude', domain: 'github.com/sanwidee/adb-mcp', href: 'https://github.com/sanwidee/adb-mcp', badge: 'Free', swatch: '#31A8FF',
      desc: 'Mac launcher for adb-mcp. Drive Photoshop in plain language.', stall: { x0: -7, x1: -5, zc: 11, a: '#001E36', b: '#31A8FF' } },
    { id: 'welcome', name: 'Welcome to Weed Labs', domain: '@buildwithdeee', href: 'https://instagram.com/buildwithdeee', go: 'Follow the build on Instagram', badge: 'Start', swatch: '#00c896',
      desc: 'A one-man lab shipping AI products from Indonesia. Each building is a live product. Walk up to a door to see what it does.', sign: { x: 3, z: 15 } },
  ];
  const byId = Object.fromEntries(SPOTS.map((s) => [s.id, s]));

  const streets = (x, z) => z === -7 || z === -6 || z === 6 || z === 7 || (x >= -1 && x <= 1 && z >= -7 && z <= 20);
  const pond = { x0: 6, x1: 11, z0: -20, z1: -17 };
  const plaza = { x0: -3, x1: 3, z0: 16, z1: 20 };
  const footprint = (s) => s.r || (s.stall && { x0: s.stall.x0, x1: s.stall.x1, z0: s.stall.zc - 1, z1: s.stall.zc + 1 }) || (s.sign && { x0: s.sign.x, x1: s.sign.x, z0: s.sign.z, z1: s.sign.z });

  // ground
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    const edge = x === X0 || x === X1 || z === Z0 || z === Z1;
    if (inR(x, z, pond)) { put('water', x, 0, z, { solid: true }); continue; }
    put(edge ? 'sand' : streets(x, z) || inR(x, z, plaza) ? 'gravel' : 'grass', x, 0, z);
  }

  function office(p) {
    const { r, h } = p, doorX = Math.round((r.x0 + r.x1) / 2);
    for (let y = 1; y <= h; y++) for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
      const ex = x === r.x0 || x === r.x1, ez = z === r.z0 || z === r.z1;
      if (!ex && !ez) continue;
      let k = 's' + p.wall;
      if (ex && ez) k = 's' + p.corner;
      else if (z === r.z1 && x === doorX && y <= 2) k = 'door';
      else if (p.front === 'glass' && z === r.z1 && y >= 2) k = 'glass';
      else if (y >= 2 && y < h + (p.hq ? 0 : 1) && ((ez ? x : z) % 2 === 0)) k = 'glass';
      put(k, x, y, z, { solid: true });
    }
    for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
      solid.add(K(x, z));
      put('p' + p.roof, x, h + 1, z);
      if (x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1) put('s' + p.corner, x, h + 2, z);
    }
    if (p.awning) for (let x = r.x0; x <= r.x1; x++) put('p' + p.awning, x, 3, r.z1 + 1, { sy: 0.25, oy: 0.75 });
    if (p.hq) {
      const y0 = h + 2;
      [0, 1, 2].forEach((d) => put('s#07705a', 0, y0 + d, -11));
      [[-1, 3], [-2, 4], [-3, 4], [1, 3], [2, 4], [3, 5]].forEach(([dx, dy]) => put('sprout', dx, y0 + dy, -11));
    }
    p.door = { x: doorX, z: r.z1 };
    p.zone = { x0: doorX - 1.6, x1: doorX + 1.6, z0: r.z1 + 0.5, z1: r.z1 + 2.9 };
    p.top = h + (p.hq ? 9 : 3) + 0.4;
  }
  function scaffold(p) {
    const { r } = p;
    for (let y = 1; y <= p.h; y++) for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
      const ex = x === r.x0 || x === r.x1, ez = z === r.z0 || z === r.z1;
      if (ex && ez) put('pole', x, y, z, { solid: true });
      else if ((ex || ez) && (y === 3 || y === p.h)) put('pole', x, y, z, { sy: 0.3, oy: 0.7 });
      else if ((x === r.x1 || z === r.z1) && y <= 2 && (ex || ez)) put('s#198A86', x, y, z, { solid: true });
      else if (!ex && !ez && y === 1) put('s#A7E9D7', x, y, z);
    }
    for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) solid.add(K(x, z));
    const cx = r.x1 + 1, cz = r.z0;
    for (let y = 1; y <= 9; y++) put('s#FFD241', cx, y, cz, { solid: true });
    for (let dx = -4; dx <= 2; dx++) put('s#FFD241', cx + dx, 9, cz);
    put('s#0F1F1C', cx - 3, 8, cz, { s: 0.4, oy: 0.3 }); put('s#FFF3DF', cx - 3, 7, cz);
    p.zone = { x0: r.x0 - 1.8, x1: cx + 1.2, z0: r.z0 - 1.8, z1: r.z1 + 1.8 };
    p.top = 7.2;
  }
  function stall(p) {
    const { x0, x1, zc, a, b } = p.stall;
    for (let x = x0; x <= x1; x++) put('p#a0703f', x, 1, zc, { solid: true });
    [[x0, zc - 1], [x1, zc - 1], [x0, zc + 1], [x1, zc + 1]].forEach(([x, z]) => { for (let y = 1; y <= 3; y++) put('log', x, y, z, { sx: 0.25, sz: 0.25, solid: true }); });
    for (let x = x0; x <= x1; x++) for (let z = zc - 1; z <= zc + 1; z++) put('s' + ((x - x0) % 2 === 0 ? a : b), x, 4, z, { sy: 0.4 });
    put('s' + p.swatch, Math.round((x0 + x1) / 2), 2, zc, { s: 0.5 });
    p.zone = { x0: x0 - 1.4, x1: x1 + 1.4, z0: zc - 2.4, z1: zc + 2.4 };
    p.top = 5.6;
  }
  function signpost(p) {
    const { x, z } = p.sign;
    put('log', x, 1, z, { sx: 0.25, sz: 0.25, solid: true });
    put('log', x, 2, z, { sx: 0.25, sz: 0.25 });
    put('p#c79a5b', x, 2, z, { sx: 1.8, sy: 0.9, sz: 0.2, oy: 0.35, force: true });
    p.zone = { x0: x - 2.2, x1: x + 2.2, z0: z - 2, z1: z + 2.4 };
    p.top = 3.9;
  }
  SPOTS.forEach((p) => (p.hq || p.wall ? office(p) : p.scaffold ? scaffold(p) : p.stall ? stall(p) : signpost(p)));

  // street lamps along the avenue
  [[-3, -3], [3, -3], [-3, 3], [3, 3], [-3, 11], [3, 11]].forEach(([x, z]) => {
    put('s#3b3b3b', x, 1, z, { sx: 0.2, sz: 0.2, solid: true });
    put('s#3b3b3b', x, 2, z, { sx: 0.2, sz: 0.2 });
    put('lamp', x, 3, z, { s: 0.45 });
  });

  // trees and flowers fill the free grass
  const blockedForTree = (x, z) => x <= X0 + 1 || x >= X1 - 1 || z <= Z0 + 1 || z >= Z1 - 1 ||
    SPOTS.some((s) => inR(x, z, footprint(s), 3)) || inR(x, z, pond, 2) || inR(x, z, plaza, 3) ||
    streets(x, z) || streets(x + 1, z) || streets(x - 1, z) || streets(x, z + 1) || streets(x, z - 1) || streets(x, z + 2) || streets(x, z - 2) || Math.abs(x) <= 4 && z > -8;
  const trees = [];
  for (let i = 0; i < 4000 && trees.length < 46; i++) {
    const x = X0 + 2 + Math.floor(rnd() * (X1 - X0 - 3)), z = Z0 + 2 + Math.floor(rnd() * (Z1 - Z0 - 3));
    if (blockedForTree(x, z) || trees.some((t) => Math.abs(t.x - x) < 3 && Math.abs(t.z - z) < 3)) continue;
    trees.push({ x, z, h: 3 + Math.floor(rnd() * 2) });
  }
  trees.forEach((t) => {
    for (let y = 1; y <= t.h; y++) put('log', t.x, y, t.z, { solid: true });
    for (let y = t.h - 1; y <= t.h + 1; y++) {
      const r = y === t.h + 1 ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && y <= t.h) continue;
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && rnd() < 0.75) continue;
        put('leaves', t.x + dx, y, t.z + dz);
      }
    }
  });
  const flowerCols = ['#e5484d', '#ffd241', '#ffffff', '#f2a7d0'];
  for (let i = 0, n = 0; i < 2000 && n < 90; i++) {
    const x = X0 + 1 + Math.floor(rnd() * (X1 - X0 - 1)), z = Z0 + 1 + Math.floor(rnd() * (Z1 - Z0 - 1));
    if (streets(x, z) || inR(x, z, pond, 1) || inR(x, z, plaza) || SPOTS.some((s) => inR(x, z, footprint(s), 1)) || occ.has(x + ',1,' + z)) continue;
    if (put('s' + flowerCols[n % 4], x, 1, z, { s: 0.22 })) n++;
  }

  // ---------- instancing (static) ----------
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const groups = {};
  blocks.forEach((b) => (groups[b.k] = groups[b.k] || []).push(b));
  const dummy = new THREE.Object3D();
  Object.entries(groups).forEach(([k, list]) => {
    const mesh = new THREE.InstancedMesh(geo, materialFor(k), list.length);
    const see = k === 'glass' || k === 'water';
    mesh.castShadow = !see && k !== 'lamp' && renderer.shadowMap.enabled;
    mesh.receiveShadow = renderer.shadowMap.enabled;
    if (see) mesh.renderOrder = 2;
    list.forEach((b, j) => {
      dummy.position.set(b.x, b.y + b.oy + b.sy / 2, b.z);
      dummy.scale.set(b.sx, b.sy, b.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(j, dummy.matrix);
    });
    mesh.computeBoundingSphere();
    scene.add(mesh);
  });

  // ocean plane around the island
  const seaTex = M.water().map.clone(); seaTex.needsUpdate = true; seaTex.repeat.set(140, 140);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), new THREE.MeshLambertMaterial({ map: seaTex, color: 0xb9d9ff }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0.18; sea.receiveShadow = renderer.shadowMap.enabled;
  scene.add(sea);

  // clouds drift over
  const clouds = new THREE.Group();
  const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let c = 0; c < 9; c++) {
    const g = new THREE.Group(); const w = 4 + Math.floor(rnd() * 5), d = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) if (!(rnd() < 0.25 && (i === 0 || i === w - 1))) { const m = new THREE.Mesh(cloudGeo, M.cloud()); m.position.set(i, 0, j); g.add(m); }
    g.position.set(-60 + rnd() * 120, 22 + rnd() * 4, -50 + rnd() * 80);
    g.userData.v = 0.4 + rnd() * 0.5;
    clouds.add(g);
  }
  scene.add(clouds);

  // ---------- player (blocky) ----------
  const skinRGB = '#e0ac7e', hairRGB = '#3b2a1d';
  const ptex = (w, h, draw) => tex(draw, w, h);
  const headTex = {
    front: ptex(8, 8, (x) => { noisy(skinRGB, 0.04)(x, 8, 8); const hr = hexRgb(hairRGB); for (let i = 0; i < 8; i++) { px(x, i, 0, hr); px(x, i, 1, hr); } px(x, 0, 2, hr); px(x, 7, 2, hr); px(x, 1, 4, [255, 255, 255]); px(x, 2, 4, [40, 50, 80]); px(x, 5, 4, [40, 50, 80]); px(x, 6, 4, [255, 255, 255]); px(x, 3, 6, [170, 110, 80]); px(x, 4, 6, [170, 110, 80]); }),
    side: ptex(8, 8, (x) => { noisy(skinRGB, 0.04)(x, 8, 8); const hr = hexRgb(hairRGB); for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) px(x, i, j, hr); for (let j = 3; j < 5; j++) px(x, 7, j, hr); }),
    back: ptex(8, 8, (x) => { noisy(hairRGB, 0.08)(x, 8, 8); for (let i = 0; i < 8; i++) px(x, i, 7, hexRgb(skinRGB)); }),
    top: ptex(8, 8, noisy(hairRGB, 0.08)),
    bottom: ptex(8, 8, noisy(skinRGB, 0.04)),
  };
  const shirtTex = ptex(8, 12, (x) => { noisy('#0d9373', 0.06)(x, 8, 12); for (let i = 2; i < 6; i++) px(x, i, 0, [7, 112, 90]); px(x, 5, 3, [0, 200, 150]); px(x, 5, 4, [0, 200, 150]); px(x, 4, 3, [0, 200, 150]); });
  const shirtSide = ptex(4, 12, noisy('#0d9373', 0.06));
  const armTex = ptex(4, 12, (x) => { noisy('#0d9373', 0.06)(x, 4, 12); for (let i = 0; i < 4; i++) for (let j = 5; j < 12; j++) px(x, i, j, shade(hexRgb(skinRGB), 0.96 + rnd() * 0.08)); });
  const legTex = ptex(4, 12, (x) => { noisy('#1f3a5a', 0.06)(x, 4, 12); for (let i = 0; i < 4; i++) for (let j = 10; j < 12; j++) px(x, i, j, [50, 50, 55]); });
  const pm = (t) => new THREE.MeshLambertMaterial({ map: t });
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x00c896, transparent: true, opacity: 0.45, depthWrite: false, depthFunc: THREE.GreaterDepth });
  const player = new THREE.Group();
  function part(w, h, d, mats, parent, x, y, z) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mats); m.position.set(x, y, z); m.castShadow = true;
    const gh = new THREE.Mesh(g, ghostMat); gh.position.copy(m.position); gh.renderOrder = 20;
    parent.add(m, gh);
    return m;
  }
  const H = headTex;
  part(0.5, 0.5, 0.5, [pm(H.side), pm(H.side), pm(H.top), pm(H.bottom), pm(H.front), pm(H.back)], player, 0, 1.75, 0);
  const sm = [pm(shirtSide), pm(shirtSide), pm(shirtSide), pm(shirtSide), pm(shirtTex), pm(shirtTex)];
  part(0.5, 0.75, 0.25, sm, player, 0, 1.125, 0);
  const limb = (t, x, y) => { const pivot = new THREE.Group(); pivot.position.set(x, y, 0); player.add(pivot); part(0.25, 0.75, 0.25, pm(t), pivot, 0, -0.375, 0); return pivot; };
  const armL = limb(armTex, -0.375, 1.5), armR = limb(armTex, 0.375, 1.5);
  const legL = limb(legTex, -0.125, 0.75), legR = limb(legTex, 0.125, 0.75);
  player.scale.setScalar(0.92);
  scene.add(player);
  const pos = new THREE.Vector3(0, 1, 16.5);
  let yaw = Math.PI, walkPhase = 0, moveAmt = 0;

  // ---------- labels ----------
  const labelsEl = $('#labels');
  const signs = SPOTS.map((s) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sign far' + (s.stall || s.sign ? ' sign--named' : ''); b.tabIndex = -1;
    b.innerHTML = `<b>${s.name}</b><span>${s.domain}</span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); openCard(s, true); });
    labelsEl.appendChild(b);
    const f = footprint(s);
    return { el: b, s, p: new THREE.Vector3((f.x0 + f.x1) / 2, s.top, (f.z0 + f.z1) / 2) };
  });

  // ---------- card ----------
  const card = $('#card');
  let cardSpot = null, cardManual = false, dismissed = null;
  function openCard(s, manual) {
    cardSpot = s; cardManual = manual;
    card.querySelector('.card-swatch').style.background = s.swatch;
    card.querySelector('.card-title').textContent = s.name;
    card.querySelector('.card-domain').textContent = s.domain;
    card.querySelector('.card-badge').textContent = s.badge;
    card.querySelector('.card-desc').textContent = s.desc;
    const go = card.querySelector('.card-go');
    go.href = s.href; go.textContent = s.go || (s.badge === 'Free' ? `Open ${s.name}` : `Open ${s.domain} ↗`);
    if (s.sameTab) { go.removeAttribute('target'); } else { go.target = '_blank'; }
    card.classList.add('open'); card.setAttribute('aria-hidden', 'false');
  }
  function closeCard() { card.classList.remove('open'); card.setAttribute('aria-hidden', 'true'); cardSpot = null; cardManual = false; }
  card.querySelector('.card-close').addEventListener('click', () => { dismissed = cardSpot; closeCard(); });
  card.addEventListener('pointerdown', (e) => e.stopPropagation());

  // ---------- input ----------
  const keys = new Set();
  const KEYMAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('a,button,input')) { if (e.key !== 'Escape') return; }
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); beginPlay(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.add('run');
    if ((e.code === 'KeyE' || e.code === 'Enter') && cardSpot && playing) card.querySelector('.card-go').click();
    if (e.code === 'Escape') { if (cardSpot) { dismissed = cardSpot; closeCard(); } }
  });
  addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); if (e.code.startsWith('Shift')) keys.delete('run'); });
  addEventListener('blur', () => keys.clear());

  const joyEl = $('#joy'), knob = joyEl.querySelector('i');
  const JR = 52;
  let joy = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (joy || !playing) return;
    joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older Safari */ }
    joyEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    knob.style.transform = 'translate(0,0)';
    joyEl.classList.add('on');
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!joy || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > JR) { dx *= JR / d; dy *= JR / d; }
    joy.x = dx / JR; joy.y = dy / JR;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const endJoy = (e) => { if (joy && e.pointerId === joy.id) { joy = null; joyEl.classList.remove('on'); } };
  canvas.addEventListener('pointerup', endJoy);
  canvas.addEventListener('pointercancel', endJoy);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  let zoom = 1;
  canvas.addEventListener('wheel', (e) => { zoom = Math.min(1.6, Math.max(0.6, zoom * (e.deltaY > 0 ? 1.08 : 0.93))); e.preventDefault(); }, { passive: false });

  // ---------- intro / flow ----------
  const intro = $('#intro'), startBtn = $('#start'), toast = $('#toast');
  let playing = false, introT = 0, flyT = 1;
  function toastMsg(t, ms = 4200) { toast.textContent = t; toast.classList.add('on'); clearTimeout(toastMsg.h); toastMsg.h = setTimeout(() => toast.classList.remove('on'), ms); }
  function beginPlay() {
    if (playing) return;
    playing = true; flyT = 0;
    intro.classList.add('hide');
    canvas.focus({ preventScroll: true });
    setTimeout(() => toastMsg(isTouch ? 'Drag anywhere to walk. Doors open product cards.' : 'WASD to walk, Shift to run. Walk up to a door.'), 900);
  }
  startBtn.addEventListener('click', beginPlay);
  $('#help').addEventListener('click', () => { playing = false; intro.classList.remove('hide'); startBtn.textContent = 'Back to the world'; });
  startBtn.disabled = false; startBtn.textContent = 'Start exploring';

  // ---------- minimap ----------
  const mm = $('#minimap'), mctx = mm.getContext('2d');
  const MW = mm.width, MH = mm.height, mpad = 6;
  const msx = (MW - mpad * 2) / (X1 - X0 + 1), msz = (MH - mpad * 2) / (Z1 - Z0 + 1);
  const mx = (x) => mpad + (x - X0 + 0.5) * msx, mz = (z) => mpad + (z - Z0 + 0.5) * msz;
  const base = document.createElement('canvas'); base.width = MW; base.height = MH;
  (() => {
    const b = base.getContext('2d');
    b.fillStyle = '#7cc6ea'; b.fillRect(0, 0, MW, MH);
    b.fillStyle = '#e8d9a0'; b.fillRect(mx(X0) - msx / 2, mz(Z0) - msz / 2, (X1 - X0 + 1) * msx, (Z1 - Z0 + 1) * msz);
    b.fillStyle = '#62ad4b'; b.fillRect(mx(X0 + 1) - msx / 2, mz(Z0 + 1) - msz / 2, (X1 - X0 - 1) * msx, (Z1 - Z0 - 1) * msz);
    for (let x = X0 + 1; x < X1; x++) for (let z = Z0 + 1; z < Z1; z++) {
      if (streets(x, z) || inR(x, z, plaza)) { b.fillStyle = '#cfc9bb'; b.fillRect(mx(x) - msx / 2, mz(z) - msz / 2, msx + 0.5, msz + 0.5); }
      if (inR(x, z, pond)) { b.fillStyle = '#3d82d8'; b.fillRect(mx(x) - msx / 2, mz(z) - msz / 2, msx + 0.5, msz + 0.5); }
    }
    trees.forEach((t) => { b.fillStyle = '#2f7a2c'; b.fillRect(mx(t.x) - msx * 1.2, mz(t.z) - msz * 1.2, msx * 2.4, msz * 2.4); });
    SPOTS.forEach((s) => { const f = footprint(s); b.fillStyle = s.swatch; b.fillRect(mx(f.x0) - msx / 2, mz(f.z0) - msz / 2, (f.x1 - f.x0 + 1) * msx, (f.z1 - f.z0 + 1) * msz); });
  })();
  function drawMinimap() {
    mctx.drawImage(base, 0, 0);
    const x = mx(pos.x), z = mz(pos.z);
    mctx.save(); mctx.translate(x, z); mctx.rotate(-yaw + Math.PI);
    mctx.fillStyle = '#ffffff'; mctx.strokeStyle = '#07705a'; mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.moveTo(0, -5); mctx.lineTo(4, 4); mctx.lineTo(-4, 4); mctx.closePath(); mctx.fill(); mctx.stroke();
    mctx.restore();
  }

  // ---------- movement + collision ----------
  const RADIUS = 0.3;
  function hits(x, z) {
    for (let cx = Math.round(x - RADIUS); cx <= Math.round(x + RADIUS); cx++) for (let cz = Math.round(z - RADIUS); cz <= Math.round(z + RADIUS); cz++) {
      if (!solid.has(K(cx, cz))) continue;
      const nx = Math.max(cx - 0.5, Math.min(x, cx + 0.5)), nz = Math.max(cz - 0.5, Math.min(z, cz + 0.5));
      if ((nx - x) ** 2 + (nz - z) ** 2 < RADIUS * RADIUS) return true;
    }
    return x < X0 + 0.2 || x > X1 - 0.2 || z < Z0 + 0.2 || z > Z1 - 0.2;
  }
  const zoneAt = (x, z) => SPOTS.find((s) => s.zone && x >= s.zone.x0 && x <= s.zone.x1 && z >= s.zone.z0 && z <= s.zone.z1) || null;

  // ---------- debug shots ----------
  const shot = params.get('shot');
  if (shot && shot !== 'intro') {
    const s = byId[shot];
    if (s) { pos.set(s.door ? s.door.x : (s.zone.x0 + s.zone.x1) / 2, 1, s.zone ? s.zone.z1 - 0.6 : 18); yaw = Math.PI; }
    beginPlay(); flyT = 1;
  }

  // ---------- camera ----------
  const CY = 0.55; // camera yaw: looking from the south-south-east so walls show depth
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 50 : 38;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  function camGoal(out, look) {
    const portrait = camera.aspect < 1;
    const dist = (portrait ? 31 : 25) * zoom;
    const ahead = portrait ? 5 : 3.5; // keep the player in the lower part of the screen so more world shows ahead
    const lx = pos.x - Math.sin(CY) * ahead, lz = pos.z - Math.cos(CY) * ahead;
    look.set(lx, 1.2, lz);
    out.set(lx + Math.sin(CY) * dist * 0.6, 1.2 + dist * 0.8, lz + Math.cos(CY) * dist * 0.6);
  }
  camGoal(camPos, camLook);

  // ---------- loop ----------
  const v3 = new THREE.Vector3();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (document.hidden) { requestAnimationFrame(frame); return; }

    // input → world velocity (camera faces -z, so screen up is -z)
    let ix = 0, iz = 0;
    if (playing) {
      if (keys.has('u')) iz -= 1; if (keys.has('d')) iz += 1; if (keys.has('l')) ix -= 1; if (keys.has('r')) ix += 1;
      if (joy) { ix += joy.x; iz += joy.y; }
    }
    { const rx = ix * Math.cos(CY) + iz * Math.sin(CY), rz = -ix * Math.sin(CY) + iz * Math.cos(CY); ix = rx; iz = rz; }
    let mag = Math.hypot(ix, iz);
    if (mag < 0.12) { ix = iz = 0; mag = 0; } else if (mag > 1) { ix /= mag; iz /= mag; mag = 1; }
    const run = keys.has('run') || (joy && mag > 0.92);
    const speed = (run ? 7 : 4.3) * mag;
    if (mag > 0) {
      const nx = pos.x + ix / Math.max(mag, 1e-6) * speed * dt, nz = pos.z + iz / Math.max(mag, 1e-6) * speed * dt;
      if (!hits(nx, pos.z)) pos.x = nx;
      if (!hits(pos.x, nz)) pos.z = nz;
      const target = Math.atan2(ix, iz);
      let d = target - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * Math.min(1, dt * 12);
    }
    moveAmt += ((mag > 0 ? 1 : 0) - moveAmt) * Math.min(1, dt * 10);
    walkPhase += dt * (run ? 13 : 9) * (mag > 0 ? 1 : 0);
    const sw = Math.sin(walkPhase) * 0.75 * moveAmt;
    legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * 0.9; armR.rotation.x = sw * 0.9;
    armL.rotation.z = -0.04 - Math.sin(now / 900) * 0.02 * (1 - moveAmt); armR.rotation.z = -armL.rotation.z;
    player.position.set(pos.x, pos.y + Math.abs(Math.sin(walkPhase)) * 0.06 * moveAmt, pos.z);
    player.rotation.y = yaw;

    // zones → cards
    if (playing) {
      const z = zoneAt(pos.x, pos.z);
      if (z !== dismissed && dismissed && !z) dismissed = null;
      if (z && z !== cardSpot && z !== dismissed) openCard(z, false);
      else if (!z && cardSpot && !cardManual) closeCard();
      else if (!z && cardSpot && cardManual && mag > 0 && !zoneAt(pos.x, pos.z)) { /* manual cards stay until closed */ }
    }

    // camera: orbit while the intro shows, then follow
    if (!playing && flyT >= 1 && (!shot || shot === 'intro')) {
      introT += dt * 0.08;
      camLook.set(0, 3, -2);
      camPos.set(Math.sin(introT) * 40, 30, -2 + Math.cos(introT) * 40);
    } else {
      camGoal(tmp, tmp2);
      if (flyT < 1) { flyT = Math.min(1, flyT + dt * 0.7); const e = 1 - Math.pow(1 - flyT, 3); camPos.lerp(tmp, e * 0.25 + 0.02); camLook.lerp(tmp2, e * 0.25 + 0.02); }
      else { const k = 1 - Math.exp(-dt * 6); camPos.lerp(tmp, k); camLook.lerp(tmp2, k); }
    }
    camera.position.copy(camPos); camera.lookAt(camLook);

    // sun and shadows follow the player
    sun.position.set(pos.x + 18, 34, pos.z + 12); sun.target.position.set(pos.x, 0, pos.z);
    seaTex.offset.x = (now / 60000) % 1; seaTex.offset.y = (now / 90000) % 1;
    clouds.children.forEach((g) => { g.position.x += g.userData.v * dt; if (g.position.x > 70) g.position.x = -70; });

    // labels near the player
    const w = window.innerWidth, h = window.innerHeight;
    signs.forEach((sg) => {
      const dist = Math.hypot(sg.p.x - pos.x, sg.p.z - pos.z);
      v3.copy(sg.p).project(camera);
      const show = playing && dist < 30 && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      sg.el.classList.toggle('far', !show);
      sg.el.tabIndex = show ? 0 : -1;
      if (show) sg.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    });

    drawMinimap();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setTimeout(() => { document.documentElement.dataset.worldReady = '1'; }, 600);
  window.__wl = { pos, SPOTS };
}
