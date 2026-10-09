// Weed Labs voxel world: a scroll-built, Minecraft-style island where each product is an office.
// Three.js is vendored next to this file and loaded lazily. Debug: add ?worldp=0.6 to freeze progress.
const section = document.getElementById('world');
if (section) init();

function init() {
  const params = new URLSearchParams(location.search);
  const forcedP = params.has('worldp') ? Math.min(1, Math.max(0, parseFloat(params.get('worldp')) || 0)) : null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!gl) { section.classList.add('world--off'); return; }
  if (reduced || forcedP !== null) section.classList.add('world--static');
  let started = false;
  const go = () => { if (started) return; started = true; import('./three.module.min.js').then((THREE) => build(THREE, { forcedP, reduced })); };
  if (forcedP !== null) go();
  else {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '300px' });
    io.observe(section);
  }
}

function build(THREE, { forcedP, reduced }) {
  const canvas = section.querySelector('canvas');
  const labelsEl = section.querySelector('.world-labels');
  const beatEl = section.querySelector('.world-beat');
  const pctEl = section.querySelector('.world-pct');
  const small = window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 400);
  const target = new THREE.Vector3(0, 2, 0);

  scene.add(new THREE.HemisphereLight(0xf2fbff, 0x5c7a4a, 1.05));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
  sun.position.set(28, 46, 18);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // ---------- pixel textures (16x16, nearest filter) ----------
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const shade = (rgb, f) => rgb.map((c) => Math.max(0, Math.min(255, Math.round(c * f))));
  function tex(draw) {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const x = c.getContext('2d'); draw(x);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const px = (x, i, j, rgb, a = 1) => { x.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; x.fillRect(i, j, 1, 1); };
  const noisy = (hex, amp = 0.08) => (x) => { const b = hexRgb(hex); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, shade(b, 1 - amp + rnd() * amp * 2)); };
  const matCache = {};
  function lam(key, map, opts = {}) { if (!matCache[key]) matCache[key] = new THREE.MeshLambertMaterial({ map, ...opts }); return matCache[key]; }
  const M = {
    grassTop: () => lam('grassTop', tex(noisy('#62ad4b', 0.12))),
    grassSide: () => lam('grassSide', tex((x) => { noisy('#8a5d3c', 0.1)(x); const g = hexRgb('#62ad4b'); for (let i = 0; i < 16; i++) { const h = 3 + Math.floor(rnd() * 3); for (let j = 0; j < h; j++) px(x, i, j, shade(g, 0.9 + rnd() * 0.2)); } })),
    dirt: () => lam('dirt', tex(noisy('#8a5d3c', 0.12))),
    stone: () => lam('stone', tex(noisy('#9b9d98', 0.12))),
    gravel: () => lam('gravel', tex((x) => { const b = hexRgb('#b9b3a6'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, shade(b, rnd() < 0.18 ? 0.78 : 0.95 + rnd() * 0.1)); })),
    logSide: () => lam('logSide', tex((x) => { const b = hexRgb('#6b4a2b'); for (let i = 0; i < 16; i++) { const f = i % 4 === 0 ? 0.78 : 0.95 + rnd() * 0.1; for (let j = 0; j < 16; j++) px(x, i, j, shade(b, f * (0.95 + rnd() * 0.1))); } })),
    logTop: () => lam('logTop', tex((x) => { const b = hexRgb('#a8804f'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const r = Math.hypot(i - 7.5, j - 7.5); px(x, i, j, shade(b, Math.floor(r) % 3 === 0 ? 0.82 : 1)); } })),
    leaves: () => lam('leaves', tex((x) => { const b = hexRgb('#3f8b3a'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, shade(b, rnd() < 0.2 ? 0.7 : 0.9 + rnd() * 0.25)); })),
    sprout: () => lam('sprout', tex((x) => { const b = hexRgb('#00c896'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, shade(b, rnd() < 0.18 ? 0.82 : 0.95 + rnd() * 0.12)); })),
    glass: () => lam('glass', tex((x) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const edge = i === 0 || j === 0 || i === 15 || j === 15; px(x, i, j, edge ? [235, 248, 250] : [168, 220, 236], edge ? 0.95 : 0.42); } px(x, 4, 3, [255, 255, 255], 0.8); px(x, 3, 4, [255, 255, 255], 0.8); }), { transparent: true }),
    water: () => lam('water', tex((x) => { const b = hexRgb('#3d82d8'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, shade(b, rnd() < 0.12 ? 1.25 : 0.95 + rnd() * 0.1), 0.82); }), { transparent: true }),
    cloud: () => (matCache.cloud = matCache.cloud || new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })),
    door: () => lam('door', tex((x) => { noisy('#3b2a1d', 0.08)(x); for (let j = 0; j < 16; j++) { px(x, 0, j, [30, 20, 14]); px(x, 15, j, [30, 20, 14]); } px(x, 12, 8, [230, 200, 120]); })),
    pole: () => lam('pole', tex((x) => { noisy('#c9cdd2', 0.05)(x); for (let i = 0; i < 16; i += 5) for (let j = 0; j < 16; j++) px(x, i, j, [150, 155, 162]); })),
    solid: (hex) => lam('s' + hex, tex(noisy(hex, 0.05))),
    planks: (hex) => lam('p' + hex, tex((x) => { const b = hexRgb(hex); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(x, i, j, shade(b, j % 4 === 3 ? 0.8 : 0.94 + rnd() * 0.1)); })),
  };

  // ---------- world model ----------
  const blocks = []; // {k: material key, x,y,z, at, w (transition width)}
  const occ = new Set();
  const key = (x, y, z) => `${x},${y},${z}`;
  function put(k, x, y, z, at, w = 0.035) { const id = key(x, y, z); if (occ.has(id)) return false; occ.add(id); blocks.push({ k, x, y, z, at, w }); return true; }

  const X0 = -15, X1 = 14, Z0 = -11, Z1 = 10;
  const plots = [];
  const inRect = (x, z, r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  // layout keeps every office off the camera's back diagonal so HQ never hides one
  const streets = (x, z) => z === 3 || (x === 6 && z <= 3) || (x === -6 && z >= -5);
  const pond = { x0: -12, x1: -8, z0: -9, z1: -6 };

  // products: brand colours from _brand/<slug>.md and the live sites (9 Oct 2026)
  const P = [
    { id: 'hq', name: 'Weed Labs HQ', domain: 'weedlabs.online', href: '#products', dot: '#0d9373', r: { x0: -3, x1: 2, z0: -3, z1: 2 }, h: 6, wall: '#e9f7f2', corner: '#0d9373', roof: '#07705a', front: 'glass', at: [0.32, 0.47], hq: true },
    { id: 'qlipper', name: 'Qlipper', domain: 'qlipper.id', href: 'https://qlipper.id', dot: '#F59E0B', r: { x0: -12, x1: -8, z0: 4, z1: 8 }, h: 4, wall: '#FFFBF2', corner: '#F59E0B', roof: '#F59E0B', at: [0.48, 0.55] },
    { id: 'vicca', name: 'Vicca', domain: 'vicca.id', href: 'https://vicca.id', dot: '#4F46E5', r: { x0: 1, x1: 5, z0: -10, z1: -6 }, h: 5, wall: '#4F46E5', corner: '#F8FAFC', roof: '#2563EB', at: [0.55, 0.62] },
    { id: 'lamarpintar', name: 'LamarPintar', domain: 'lamarpintar.online', href: 'https://lamarpintar.online', dot: '#bd7f46', r: { x0: 8, x1: 12, z0: -5, z1: -1 }, h: 3, wall: '#6f4a2f', corner: '#fbf6ef', roof: '#bd7f46', awning: '#e6a94e', at: [0.62, 0.69] },
    { id: 'pidgo', name: 'Pidgo', domain: 'pidgoapp.online', href: 'https://pidgoapp.online', dot: '#b3244f', r: { x0: -4, x1: 0, z0: 5, z1: 9 }, h: 4, wall: '#f0e6d3', corner: '#3b352c', roof: '#b3244f', at: [0.69, 0.76] },
    { id: 'wads', name: 'Wads', domain: 'wads.weedlabs.online', note: 'under construction', href: 'https://wads.weedlabs.online', dot: '#198A86', r: { x0: 7, x1: 10, z0: 5, z1: 8 }, h: 5, scaffold: true, at: [0.76, 0.84] },
  ];
  P.forEach((p) => plots.push(p.r));
  const blocked = (x, z) => plots.some((r) => inRect(x, z, { x0: r.x0 - 2, x1: r.x1 + 2, z0: r.z0 - 2, z1: r.z1 + 2 })) || streets(x, z) || inRect(x, z, { x0: pond.x0 - 1, x1: pond.x1 + 1, z0: pond.z0 - 1, z1: pond.z1 + 1 });

  // ground: grows outward from the centre block
  const maxD = Math.hypot(15, 11);
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    const d = Math.hypot(x + 0.5, z + 0.5);
    const at = x === 0 && z === 0 ? -1 : 0.02 + 0.12 * (d / maxD) + rnd() * 0.01;
    const isStreet = streets(x, z) && !plots.some((r) => inRect(x, z, r));
    const isPond = inRect(x, z, pond);
    if (isPond) { put('water', x, 0, z, 0.19 + rnd() * 0.02); put('dirt', x, -1, z, at); }
    else put(isStreet ? 'gravel' : 'grass', x, 0, z, isStreet ? 0.16 + rnd() * 0.03 : at);
    const edge = x === X0 || x === X1 || z === Z0 || z === Z1;
    if (edge) { put('dirt', x, -1, z, at); put('stone', x, -2, z, at); }
  }

  // trees on free grass, deterministic
  const trees = [];
  for (let i = 0; i < 600 && trees.length < 11; i++) {
    const x = X0 + 1 + Math.floor(rnd() * (X1 - X0 - 2)), z = Z0 + 1 + Math.floor(rnd() * (Z1 - Z0 - 2));
    if (blocked(x, z) || trees.some((t) => Math.abs(t.x - x) < 3 && Math.abs(t.z - z) < 3) || (Math.abs(x) < 2 && Math.abs(z) < 2)) continue;
    trees.push({ x, z, h: 3 + Math.floor(rnd() * 2) });
  }
  trees.forEach((t, i) => {
    const at = 0.2 + 0.1 * (i / trees.length);
    for (let y = 1; y <= t.h; y++) put('log', t.x, y, t.z, at + y * 0.002);
    for (let y = t.h - 1; y <= t.h + 1; y++) {
      const r = y === t.h + 1 ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && y <= t.h) continue;
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && rnd() < 0.7) continue;
        put('leaves', t.x + dx, y, t.z + dz, at + 0.015 + rnd() * 0.01);
      }
    }
  });

  // offices
  function office(p) {
    const { r, h } = p, [a0, a1] = p.at, H = h + 2;
    const atY = (y) => a0 + (a1 - a0) * (y / H) + rnd() * 0.004;
    const midX = Math.floor((r.x0 + r.x1) / 2);
    for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) put('s' + (p.hq ? '#cfe9e1' : '#d9d4c7'), x, 0, z, atY(0) - 0.01);
    for (let y = 1; y <= h; y++) for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
      const edgeX = x === r.x0 || x === r.x1, edgeZ = z === r.z0 || z === r.z1;
      if (!edgeX && !edgeZ) continue;
      let k = 's' + p.wall;
      if (edgeX && edgeZ) k = 's' + p.corner;
      else if (z === r.z1 && x === midX && y <= 2) k = 'door';
      else if (p.front === 'glass' && z === r.z1 && y >= 2) k = 'glass';
      else if (y >= 2 && y < h + (p.hq ? 0 : 1) && ((edgeZ ? x : z) % 2 === 0)) k = 'glass';
      put(k, x, y, z, atY(y));
    }
    for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) put('p' + p.roof, x, h + 1, z, atY(h + 1));
    for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) if (x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1) put('s' + p.corner, x, h + 2, z, atY(h + 2));
    if (p.awning) for (let x = r.x0; x <= r.x1; x++) put('p' + p.awning, x, 3, r.z1 + 1, atY(3));
    if (p.hq) { // rooftop sprout, the logo in blocks
      const cx = 0, cz = 0, y0 = h + 2, at = a1;
      put('s#07705a', cx, y0, cz, at); put('s#07705a', cx, y0 + 1, cz, at); put('s#07705a', cx, y0 + 2, cz, at);
      [[-1, 3], [-2, 4], [-3, 4], [1, 3], [2, 4], [3, 5]].forEach(([dx, dy]) => put('sprout', cx + dx, y0 + dy, cz, at + 0.004));
    }
  }
  function scaffold(p) {
    const { r } = p, [a0, a1] = p.at, H = 9;
    const atY = (y) => a0 + (a1 - a0) * (y / H) + rnd() * 0.004;
    for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) put('s#198A86', x, 0, z, atY(0) - 0.01);
    for (let y = 1; y <= p.h; y++) for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
      const edgeX = x === r.x0 || x === r.x1, edgeZ = z === r.z0 || z === r.z1;
      if (edgeX && edgeZ) put('pole', x, y, z, atY(y));
      else if ((edgeX || edgeZ) && (y === 3 || y === p.h)) put('pole', x, y, z, atY(y));
      else if ((x === r.x1 || z === r.z1) && y <= 2 && (edgeX || edgeZ)) put('s#198A86', x, y, z, atY(y));
    }
    const cx = r.x1 + 1, cz = r.z0; // crane
    for (let y = 1; y <= 9; y++) put('s#FFD241', cx, y, cz, atY(y));
    for (let dx = -4; dx <= 2; dx++) put('s#FFD241', cx + dx, 9, cz, atY(9));
    put('s#0F1F1C', cx - 3, 8, cz, atY(9)); put('s#FFF3DF', cx - 3, 7, cz, atY(9));
  }
  P.forEach((p) => (p.scaffold ? scaffold(p) : office(p)));

  // clouds drift above the island
  const clouds = [];
  [[-14, -13], [0, -15], [12, -12], [-17, 1]].forEach(([cx, cz], c) => {
    const w = 3 + Math.floor(rnd() * 3), d = 2, at = 0.84 + c * 0.015;
    const ids = [];
    for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < d; dz++) if (!(rnd() < 0.2 && (dx === 0 || dx === w - 1))) { const n = blocks.length; if (put('cloud', cx + dx, 17 + (c % 2), cz + dz, at)) ids.push(n); }
    clouds.push({ ids, speed: 0.25 + rnd() * 0.3, phase: rnd() * 6 });
  });

  // ---------- instancing ----------
  const geo = new THREE.BoxGeometry(1, 1, 1);
  function materialFor(k) {
    if (k === 'grass') return [M.grassSide(), M.grassSide(), M.grassTop(), M.dirt(), M.grassSide(), M.grassSide()];
    if (k === 'log') return [M.logSide(), M.logSide(), M.logTop(), M.logTop(), M.logSide(), M.logSide()];
    if (k[0] === 's' && k[1] === '#') return M.solid(k.slice(1));
    if (k[0] === 'p' && k[1] === '#') return M.planks(k.slice(1));
    return M[k]();
  }
  const groups = {};
  blocks.forEach((b, i) => { (groups[b.k] = groups[b.k] || []).push(i); });
  const meshes = [];
  const dummy = new THREE.Object3D();
  Object.entries(groups).forEach(([k, idx]) => {
    const mesh = new THREE.InstancedMesh(geo, materialFor(k), idx.length);
    const see = k === 'glass' || k === 'water' || k === 'cloud';
    mesh.castShadow = !see && renderer.shadowMap.enabled;
    mesh.receiveShadow = k !== 'cloud' && renderer.shadowMap.enabled;
    mesh.frustumCulled = false;
    if (see) mesh.renderOrder = 2;
    idx.forEach((bi, j) => { blocks[bi].mesh = mesh; blocks[bi].j = j; });
    scene.add(mesh); meshes.push(mesh);
  });

  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
  let cloudShift = 0;
  const cloudOf = new Map(); clouds.forEach((c) => c.ids.forEach((id) => cloudOf.set(id, c)));
  function placeAll(p) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const s = ease((p - b.at) / b.w);
      const c = cloudOf.get(i);
      const off = c ? Math.sin(cloudShift * c.speed * 0.4 + c.phase) * 2.5 : 0;
      dummy.position.set(b.x + off, b.y + 0.5 + (1 - s) * 1.6, b.z);
      const sc = Math.max(s, 0.0001);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      b.mesh.setMatrixAt(b.j, dummy.matrix);
    }
    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }

  // ---------- labels (real links, the accessible path) ----------
  const labels = P.map((p) => {
    const a = document.createElement('a');
    a.className = 'world-label' + (p.hq ? ' world-label--hq' : '');
    a.href = p.href;
    if (!p.href.startsWith('#')) { a.target = '_blank'; a.rel = 'noopener'; }
    a.innerHTML = `<b>${p.name}</b><span>${p.domain}${p.note ? '<em> · ' + p.note + '</em>' : ''}</span>`;
    labelsEl.appendChild(a);
    const r = p.r, top = (p.scaffold ? 6.5 : p.h + (p.hq ? 9 : 3)) + 0.6;
    return { a, p, pos: new THREE.Vector3((r.x0 + r.x1) / 2, top, (r.z0 + r.z1) / 2) };
  });
  const v = new THREE.Vector3();
  function placeLabels(p) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    labels.forEach((L) => {
      const on = p >= L.p.at[1] - 0.005;
      if (L.a.classList.contains('on') !== on) { L.a.classList.toggle('on', on); L.a.tabIndex = on ? 0 : -1; }
      v.copy(L.pos).project(camera);
      L.a.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    });
  }

  // ---------- story beats ----------
  const beats = [
    [0, 'Everything here started as one block.'],
    [0.15, 'Ground first. Something that grows comes next.'],
    [0.31, 'Weed Labs HQ, where the products get built.'],
    [0.48, 'Each product gets its own address.'],
    [0.76, 'Wads is still under construction.'],
    [0.88, 'Five products and one small lab, still growing. Tap a building to visit it.'],
  ];
  let lastBeat = -1;
  function setBeat(p) {
    let bi = 0; beats.forEach((b, i) => { if (p >= b[0]) bi = i; });
    if (bi !== lastBeat) { lastBeat = bi; beatEl.textContent = beats[bi][1]; beatEl.classList.remove('in'); void beatEl.offsetWidth; beatEl.classList.add('in'); }
    pctEl.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
    section.classList.toggle('world--moving', p > 0.02);
  }

  // ---------- camera ----------
  let pointerX = 0;
  section.addEventListener('pointermove', (e) => { const r = section.getBoundingClientRect(); pointerX = ((e.clientX - r.left) / r.width - 0.5) * 2; });
  function placeCamera(p) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const zoomIn = p < 0.12 ? 1 + (0.12 - p) * 20 : 1; // start close on the first block
    const halfH = Math.max(16.5, (aspect < 1 ? 16 : 19.5) / aspect) / zoomIn;
    camera.left = -halfH * aspect; camera.right = halfH * aspect; camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    const theta = (40 + 10 * p + pointerX * 4) * Math.PI / 180, R = 60;
    target.set(0, 1 + 3 * ease(p) - (aspect < 1 ? 2.5 * ease(p) : 0), 0);
    camera.position.set(target.x + R * Math.sin(theta), target.y + R * 0.78, target.z + R * Math.cos(theta));
    camera.lookAt(target);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  function progress() {
    if (forcedP !== null) return forcedP;
    if (reduced) return 1;
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
  }

  let visible = true;
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }).observe(section);
  let last = performance.now(), lastP = -1, lastPointer = 0, lastDraw = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = progress();
    // idle: only the clouds move, so redraw at ~20fps instead of every frame
    const idle = Math.abs(p - lastP) < 1e-4 && pointerX === lastPointer;
    if (visible && (!idle || now - lastDraw > 50)) {
      lastP = p; lastPointer = pointerX; lastDraw = now;
      if (!reduced && forcedP === null) cloudShift = now / 1000;
      placeCamera(p); placeAll(p); placeLabels(p); setBeat(p);
      renderer.render(scene, camera);
    }
    if (forcedP === null || !window.__worldDone) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (forcedP !== null) setTimeout(() => { window.__worldDone = true; document.documentElement.dataset.worldReady = '1'; }, 400);
  section.classList.add('world--ready');
}
