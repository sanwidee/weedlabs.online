// Weedlabs vibecoder reels: a small deterministic animation engine for Morphy-style voxel skits.
// A story module (stories/<id>.js) lists lines with a camera shot and timed events (expressions,
// poses, moves, prop gags, screen overlays, sfx). Every frame is a pure function of t: the engine
// replays all events up to t, so ?render=1 can export frame-exact video and ?t= freezes a moment.
import * as THREE from '/assets/world/three.module.min.js';

const $ = (s) => document.querySelector(s);
export const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');

// ───────────────────────────────────────────────────────── helpers
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const back = (x) => { x = clamp01(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
let seed = 21;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (rgb, f) => rgb.map((c) => Math.max(0, Math.min(255, Math.round(c * f))));
function tex(draw, w = 16, h = 16, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const px = (x, i, j, rgb, a = 1) => { x.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; x.fillRect(i, j, 1, 1); };
const noisy = (hex, amp = 0.08) => (x, w = 16, h = 16) => { const b = hexRgb(hex); for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) px(x, i, j, shade(b, 1 - amp + rnd() * amp * 2)); };
const mats = {};
const M = (hex, amp = 0.07, repeat, o = {}) => { const k = hex + amp + (repeat || '') + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ map: tex(noisy(hex, amp), 16, 16, repeat), roughness: 0.85, ...o })); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ───────────────────────────────────────────────────────── renderer + room
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(RENDER ? 1 : Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120c0a); scene.fog = new THREE.Fog(0x120c0a, 6, 14);
const camera = new THREE.PerspectiveCamera(42, 9 / 16, 0.05, 50);
function box(w, h, d, mat, x, y, z, parent = scene, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
// San's real room: grey walls, warm orange light, dark desk + wooden riser, two landscape monitors and a
// vertical one, black lamp, black gaming chair with a blue X, black ladder shelf, white pegboard, wall AC.
box(6, 0.02, 5, M('#5b4a3e', 0.1, [10, 8]), 0, -0.01, 2.4, scene, false);
box(6, 3.2, 0.1, M('#8b8478', 0.05, [8, 4]), 0, 1.6, -0.05, scene, false);
box(0.1, 3.2, 5, M('#7d776c', 0.05, [6, 4]), 1.95, 1.6, 2.4, scene, false);
box(6, 0.1, 5, M('#a08a76', 0.05), 0, 3.2, 2.4, scene, false);
box(2.4, 0.02, 1.2, new THREE.MeshStandardMaterial({ map: tex((x) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, (i + j) % 4 < 2 ? [92, 118, 150] : [205, 210, 214]); }), roughness: 1 }), 0.4, 0.005, 3.2, scene, false);
box(0.95, 1.45, 0.03, M('#26211d', 0.05), 0.55, 1.75, 0.02); box(1.0, 0.06, 0.06, M('#1b1815', 0.05), 0.55, 2.5, 0.04);
box(0.9, 0.3, 0.22, M('#ece8e0', 0.03), -1.35, 2.75, 0.13); box(0.78, 0.04, 0.02, M('#2a2622', 0.03), -1.35, 2.64, 0.245);
box(0.015, 1.2, 0.015, M('#d7d2c8', 0.02), -0.05, 2.1, 0.01, scene, false);
box(1.7, 0.05, 0.72, M('#1d1a18', 0.06), 0.25, 0.75, 0.42);
[[-0.55, 0.12], [1.05, 0.12], [-0.55, 0.72], [1.05, 0.72]].forEach(([x, z]) => box(0.05, 0.75, 0.05, M('#141210', 0.04), x, 0.375, z));
box(1.2, 0.04, 0.26, M('#5a3b26', 0.08), 0.1, 0.88, 0.2); [-0.45, 0.65].forEach((x) => box(0.05, 0.1, 0.24, M('#3a2618', 0.08), x, 0.82, 0.2));
box(0.42, 0.02, 0.14, M('#2b2a2c', 0.05), 0.15, 0.785, 0.62); box(0.06, 0.02, 0.1, M('#2b2a2c', 0.05), 0.48, 0.785, 0.62);
const cup = box(0.08, 0.14, 0.08, M('#cfd98a', 0.05), -0.42, 0.845, 0.6);
function makeScreen(w, h, cw, ch) { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, ctx: c.getContext('2d'), t, mat: new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), w, h }; }
const SCR = { L: makeScreen(0.62, 0.36, 640, 372), R: makeScreen(0.62, 0.36, 640, 372), V: makeScreen(0.34, 0.6, 360, 636) };
function monitor(s, x, y, z, rotY) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g); box(s.w + 0.03, s.h + 0.03, 0.03, M('#0b0b0c', 0.02), 0, 0, -0.016, g); const p = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), s.mat); p.position.z = 0.001; g.add(p); return g; }
monitor(SCR.L, -0.24, 1.14, 0.2, 0.06); monitor(SCR.R, 0.39, 1.14, 0.2, -0.06); monitor(SCR.V, 0.93, 1.24, 0.26, -0.18);
box(0.04, 0.24, 0.04, M('#0b0b0c', 0.02), 0.08, 0.98, 0.16); box(0.04, 0.36, 0.04, M('#0b0b0c', 0.02), 0.93, 0.95, 0.22);
const monGlow = new THREE.PointLight(0x7fa8ff, 0.9, 2.2, 2); monGlow.position.set(0.1, 1.15, 0.55); scene.add(monGlow);
const lampG = new THREE.Group(); lampG.position.set(-0.6, 0.78, 0.3); scene.add(lampG);
box(0.12, 0.02, 0.12, M('#141414', 0.03), 0, 0.01, 0, lampG); const arm = box(0.02, 0.36, 0.02, M('#141414', 0.03), 0.03, 0.2, 0, lampG); arm.rotation.z = -0.35;
const lampHead = box(0.12, 0.09, 0.12, M('#151515', 0.03), 0.12, 0.38, 0.02, lampG); lampHead.rotation.z = 0.6;
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc78a })); bulb.position.set(0.15, 0.34, 0.03); lampG.add(bulb);
const lamp = new THREE.PointLight(0xff9a4d, 5.2, 4.5, 1.7); lamp.position.set(-0.45, 1.1, 0.4); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
const roomL = new THREE.PointLight(0xff8a3d, 3.4, 7, 1.6); roomL.position.set(-2.4, 1.6, 1.4); scene.add(roomL);
const hemi = new THREE.HemisphereLight(0xffc29a, 0x2a1d16, 0.55); scene.add(hemi);
const SH = M('#121212', 0.04); const shelf = new THREE.Group(); shelf.position.set(-1.35, 0, 0.32); scene.add(shelf);
[[-0.33, 0.18], [0.33, 0.18], [-0.33, -0.18], [0.33, -0.18]].forEach(([x, z]) => box(0.04, 1.85, 0.04, SH, x, 0.925, z, shelf));
[0.05, 0.62, 1.12, 1.55, 1.85].forEach((y) => box(0.72, 0.03, 0.38, SH, 0, y, 0, shelf));
for (const y of [0.33, 0.86, 1.33]) for (let r = 0; r < 2; r++) { box(0.6, 0.2, 0.32, M('#1c1c1e', 0.04), 0, y - 0.11 + r * 0.22, 0.01, shelf); box(0.06, 0.02, 0.01, M('#d8d8d8', 0.02), 0, y - 0.11 + r * 0.22, 0.175, shelf); }
box(0.08, 0.1, 0.08, M('#3c6b3a', 0.15), 0.18, 1.92, 0, shelf); box(0.03, 0.12, 0.03, M('#e9e9e2', 0.02), -0.05, 1.93, 0, shelf); box(0.16, 0.08, 0.12, M('#2a1f19', 0.05), -0.22, 1.91, 0, shelf);
const peg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 1.0), new THREE.MeshStandardMaterial({ map: tex((x) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, (i % 3 === 1 && j % 3 === 1) ? [150, 150, 146] : [236, 236, 230]); }, 16, 16, [4, 3]), roughness: 0.9 }));
peg.position.set(1.92, 1.45, 1.3); peg.receiveShadow = true; scene.add(peg);
box(0.12, 0.03, 0.3, M('#f2f2ee', 0.02), 1.86, 1.62, 1.22); box(0.06, 0.05, 0.05, M('#d84a4a', 0.05), 1.86, 1.66, 1.12); box(0.06, 0.05, 0.05, M('#4bbf5a', 0.05), 1.86, 1.66, 1.2);
const chair = new THREE.Group(); chair.position.set(0.55, 0, 1.15); scene.add(chair);
const CH = M('#18191b', 0.05); box(0.52, 0.1, 0.5, CH, 0, 0.5, 0, chair);
const backTex = tex((x) => { noisy('#18191b', 0.05)(x, 32, 48); x.strokeStyle = '#5ca6d6'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(10, 14); x.lineTo(22, 28); x.moveTo(22, 14); x.lineTo(10, 28); x.stroke(); }, 32, 48);
const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.82, 0.1), [CH, CH, CH, CH, new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.85 }), CH]);
chairBack.position.set(0, 0.98, 0.26); chairBack.rotation.x = 0.1; chairBack.castShadow = true; chair.add(chairBack);
box(0.06, 0.04, 0.4, CH, -0.28, 0.68, 0, chair); box(0.06, 0.04, 0.4, CH, 0.28, 0.68, 0, chair); box(0.06, 0.4, 0.06, M('#222', 0.03), 0, 0.25, 0, chair);
box(0.6, 0.03, 0.08, M('#222', 0.03), 0, 0.05, 0, chair); box(0.08, 0.03, 0.6, M('#222', 0.03), 0, 0.05, 0, chair);
const CHAIR_YAW = Math.PI + 0.75; chair.rotation.y = CHAIR_YAW;

// ───────────────────────────────────────────────────────── characters
const sm = (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
const SKIN = '#c68e63', HAIR = '#1d1611', SHIRT = '#0d9373', PANTS = '#1a3a32';
function sanFace(kind, open) {
  return tex((x) => {
    noisy(SKIN, 0.04)(x, 8, 8); const h = hexRgb(HAIR), W = [255, 255, 255], P = [30, 30, 40], MO = [120, 60, 50], D = [60, 25, 25];
    for (let i = 0; i < 8; i++) { px(x, i, 0, h); px(x, i, 1, h); } px(x, 0, 2, h); px(x, 7, 2, h);
    if (kind === 'shock') { px(x, 1, 3, W); px(x, 2, 3, W); px(x, 1, 4, W); px(x, 2, 4, P); px(x, 5, 3, W); px(x, 6, 3, W); px(x, 5, 4, P); px(x, 6, 4, W); px(x, 3, 6, D); px(x, 4, 6, D); px(x, 3, 7, D); px(x, 4, 7, D); return; }
    if (kind === 'tired') { px(x, 1, 4, P); px(x, 2, 4, P); px(x, 5, 4, P); px(x, 6, 4, P); px(x, 1, 5, [150, 95, 75]); px(x, 6, 5, [150, 95, 75]); }
    else { px(x, 1, 4, W); px(x, 2, 4, P); px(x, 5, 4, P); px(x, 6, 4, W); }
    if (kind === 'angry') { px(x, 1, 3, h); px(x, 2, 3, h); px(x, 5, 3, h); px(x, 6, 3, h); }
    if (kind === 'happy') { px(x, 2, 6, MO); px(x, 5, 6, MO); px(x, 3, 7, MO); px(x, 4, 7, MO); return; }
    if (kind === 'sad') { px(x, 3, 6, MO); px(x, 4, 6, MO); px(x, 2, 7, MO); px(x, 5, 7, MO); return; }
    px(x, 3, 6, MO); px(x, 4, 6, MO); if (open) { px(x, 3, 7, D); px(x, 4, 7, D); }
  }, 8, 8);
}
const SAN_FACES = {}; for (const k of ['neutral', 'tired', 'angry', 'shock', 'happy', 'sad']) SAN_FACES[k] = [sm(sanFace(k, false)), sm(sanFace(k, true))];
function limbTex(top, bottom, split) { return tex((x) => { const a = hexRgb(top), b = hexRgb(bottom); for (let i = 0; i < 4; i++) for (let j = 0; j < 12; j++) px(x, i, j, shade(j < split ? a : b, 0.94 + rnd() * 0.1)); }, 4, 12); }
const S = 0.42;
function makeSan() {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);            // body scales for squash & stretch
  const sideT = tex((x) => { noisy(SKIN, 0.04)(x, 8, 8); for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) px(x, i, j, hexRgb(HAIR)); }, 8, 8);
  const headMats = [sm(sideT), sm(sideT), sm(tex(noisy(HAIR, 0.08), 8, 8)), sm(tex(noisy(SKIN, 0.04), 8, 8)), SAN_FACES.neutral[0], sm(tex((x) => { noisy(HAIR, 0.08)(x, 8, 8); for (let i = 0; i < 8; i++) px(x, i, 7, hexRgb(SKIN)); }, 8, 8))];
  const headPivot = new THREE.Group(); headPivot.position.y = 1.62 * S; body.add(headPivot);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 0.5 * S, 0.5 * S), headMats); head.position.y = 0.25 * S; head.castShadow = true; headPivot.add(head);
  const shirtT = tex((x) => { noisy(SHIRT, 0.06)(x, 8, 12); for (let i = 2; i < 6; i++) px(x, i, 0, [7, 112, 90]); px(x, 5, 3, [0, 200, 150]); px(x, 4, 3, [0, 200, 150]); px(x, 5, 4, [0, 200, 150]); }, 8, 12);
  const sh = sm(tex(noisy(SHIRT, 0.06), 4, 12));
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 0.75 * S, 0.25 * S), [sh, sh, sh, sh, sm(shirtT), sh]); torso.position.y = 1.125 * S + 0.12 * S; torso.castShadow = true; body.add(torso);
  const limb = (t, x, y, len = 0.75) => { const pv = new THREE.Group(); pv.position.set(x * S, y * S, 0); body.add(pv); const m = new THREE.Mesh(new THREE.BoxGeometry(0.25 * S, len * S, 0.25 * S), sm(t)); m.position.y = -len * S / 2; m.castShadow = true; pv.add(m); return pv; };
  const armL = limb(limbTex(SHIRT, SKIN, 5), -0.375, 1.62), armR = limb(limbTex(SHIRT, SKIN, 5), 0.375, 1.62);
  const legL = limb(limbTex(PANTS, '#2b2b2f', 10), -0.125, 0.87), legR = limb(limbTex(PANTS, '#2b2b2f', 10), 0.125, 0.87);
  return { root, body, headPivot, head, headMats, armL, armR, legL, legR };
}
function makeClaude() {
  const root = new THREE.Group(); scene.add(root); const body = new THREE.Group(); root.add(body);
  const glow = new THREE.MeshStandardMaterial({ color: 0xf4fffb, emissive: 0xdffcf2, emissiveIntensity: 0.7, roughness: 0.4 });
  const visorM = new THREE.MeshStandardMaterial({ color: 0x0a1714, roughness: 0.3 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x00e0a8 });
  box(0.26, 0.24, 0.2, glow, 0, 0.32, 0, body);
  const headG = new THREE.Group(); headG.position.y = 0.62; body.add(headG);
  box(0.34, 0.26, 0.26, glow, 0, 0, 0, headG); box(0.27, 0.15, 0.01, visorM, 0, 0, 0.131, headG, false);
  const eyeL = box(0.045, 0.06, 0.01, eyeM, -0.06, 0.015, 0.137, headG, false), eyeR = box(0.045, 0.06, 0.01, eyeM, 0.06, 0.015, 0.137, headG, false);
  const mouth = box(0.09, 0.015, 0.01, eyeM, 0, -0.035, 0.137, headG, false);
  box(0.015, 0.1, 0.015, glow, 0, 0.18, 0, headG);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0x00e0a8 })); tip.position.y = 0.25; headG.add(tip);
  const armL = box(0.06, 0.18, 0.06, glow, -0.17, 0.3, 0, body), armR = box(0.06, 0.18, 0.06, glow, 0.17, 0.3, 0, body);
  armL.geometry.translate(0, -0.06, 0); armR.geometry.translate(0, -0.06, 0); armL.position.y = armR.position.y = 0.38;
  const light = new THREE.PointLight(0xc8fff0, 1.6, 2.4, 2); light.position.set(0, 0.6, 0.25); body.add(light);
  return { root, body, headG, eyeL, eyeR, mouth, tip, armL, armR, glow, eyeM, light };
}
function makeGPT() {
  // the ex who is always online: soft grey-green capsule body, round screen face, green "online" dot
  const root = new THREE.Group(); scene.add(root); const body = new THREE.Group(); root.add(body);
  const shell = new THREE.MeshStandardMaterial({ color: 0xd9e6e1, emissive: 0x6f8f86, emissiveIntensity: 0.35, roughness: 0.5 });
  const faceM = new THREE.MeshBasicMaterial({ color: 0x14201c });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xf2fff9 });
  box(0.26, 0.26, 0.22, shell, 0, 0.3, 0, body);
  const headG = new THREE.Group(); headG.position.y = 0.6; body.add(headG);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), shell); hm.scale.set(1, 0.9, 0.85); hm.castShadow = true; headG.add(hm);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.135, 28), faceM); face.position.z = 0.142; headG.add(face);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.135, 0.15, 28), new THREE.MeshBasicMaterial({ color: 0x2bd18a })); ring.position.z = 0.143; headG.add(ring);
  const eyeL = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 12, Math.PI), eyeM); eyeL.position.set(-0.045, 0.02, 0.143); headG.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.045; headG.add(eyeR);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 14, Math.PI), eyeM); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.035, 0.143); headG.add(mouth);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2bff8a })); dot.position.set(0.15, 0.13, 0.05); headG.add(dot);
  const armL = box(0.06, 0.18, 0.06, shell, -0.17, 0.3, 0, body), armR = box(0.06, 0.18, 0.06, shell, 0.17, 0.3, 0, body);
  armL.geometry.translate(0, -0.06, 0); armR.geometry.translate(0, -0.06, 0); armL.position.y = armR.position.y = 0.38;
  const light = new THREE.PointLight(0xbfffe0, 0.9, 1.8, 2); light.position.set(0, 0.6, 0.25); body.add(light);
  return { root, body, headG, eyeL, eyeR, mouth, dot, armL, armR, light };
}
function makeCodex() {
  const root = new THREE.Group(); scene.add(root); const body = new THREE.Group(); root.add(body);
  const m = M('#f39a3c', 0.08, undefined, { emissive: 0x3a1800, emissiveIntensity: 0.4 });
  const cube = box(0.24, 0.24, 0.24, m, 0, 0.12, 0, body);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1d1206 });
  const eyeL = box(0.035, 0.05, 0.01, eyeM, -0.05, 0.15, 0.121, body, false), eyeR = box(0.035, 0.05, 0.01, eyeM, 0.05, 0.15, 0.121, body, false);
  return { root, body, cube, eyeL, eyeR };
}
const C = { san: makeSan(), claude: makeClaude(), gpt: makeGPT(), codex: makeCodex() };
const SAN_SEAT = v3(0.55, 0.55 - 0.87 * S + 0.06, 1.13);

// ───────────────────────────────────────────────────────── props
const P = {};
function addProp(name, obj) { obj.visible = false; scene.add(obj); P[name] = obj; return obj; }
// trash icon that "eats" the folder
addProp('trash', (() => { const g = new THREE.Group(); box(0.12, 0.14, 0.12, M('#e8e8e8', 0.03), 0, 0.07, 0, g); box(0.14, 0.02, 0.14, M('#d84a4a', 0.05), 0, 0.15, 0, g); return g; })());
// a pile of printed code ("400 baris"), grows when shown
addProp('codePile', (() => { const g = new THREE.Group(); for (let i = 0; i < 14; i++) { const b = box(0.24, 0.025, 0.32, M(i % 2 ? '#f2f2ea' : '#e6e9e2', 0.04), (rnd() - 0.5) * 0.05, 0.0125 + i * 0.026, (rnd() - 0.5) * 0.05, g); b.rotation.y = (rnd() - 0.5) * 0.4; b.userData.i = i; } return g; })());
// confetti burst
addProp('confetti', (() => { const g = new THREE.Group(); const cols = ['#00c896', '#ffd241', '#ff6b8a', '#7fb2ff', '#ffffff']; for (let i = 0; i < 60; i++) { const b = box(0.02, 0.02, 0.005, new THREE.MeshBasicMaterial({ color: cols[i % 5] }), 0, 0, 0, g, false); b.userData.v = [(rnd() - 0.5) * 1.6, 1 + rnd() * 1.4, (rnd() - 0.5) * 1.6, rnd() * 8]; } return g; })());
// red siren light on the desk
addProp('siren', (() => { const g = new THREE.Group(); box(0.08, 0.04, 0.08, M('#222', 0.03), 0, 0.02, 0, g); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 12), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); s.position.y = 0.075; g.add(s); const l = new THREE.PointLight(0xff2020, 0, 3, 2); l.position.y = 0.12; g.add(l); g.userData.light = l; return g; })());
// sunglasses for the robot
const shades = box(0.3, 0.05, 0.02, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2, metalness: 0.4 }), 0, 0.02, 0.145, C.claude.headG, false); shades.visible = false; P.shades = shades;
// "zzz" bubble for San asleep
addProp('zzz', (() => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = box(0.04 + i * 0.015, 0.04 + i * 0.015, 0.01, new THREE.MeshBasicMaterial({ color: 0xffffff }), i * 0.07, i * 0.09, 0, g, false); b.userData.i = i; } return g; })());

// ───────────────────────────────────────────────────────── screens (monitor content)
const termLines = []; const words = ['npm run dev', 'error', 'fix', 'TypeError', 'undefined', 'build', 'OK', 'git', 'commit', 'deploy', 'retry', 'prompt', 'context', 'tokens', 'refactor', 'test', 'PASS', 'FAIL', 'lint', 'vercel'];
for (let i = 0; i < 400; i++) { let s = '', n = 3 + Math.floor(rnd() * 6); for (let k = 0; k < n; k++) s += words[Math.floor(rnd() * words.length)] + ' '; termLines.push({ s, c: s.includes('error') || s.includes('FAIL') ? '#ff7a7a' : rnd() < 0.15 ? '#00c896' : '#b9d7ff' }); }
function drawTerm(s, t, offset, title, speed = 6) {
  const { ctx, c } = s; ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#16223a'; ctx.fillRect(0, 0, c.width, 26);
  ctx.font = '500 15px "DM Mono", monospace'; ctx.fillStyle = '#86e7c7'; ctx.fillText(title, 12, 18); ctx.font = '400 14px "DM Mono", monospace';
  const first = Math.floor(t * speed + offset); const rows = Math.floor((c.height - 40) / 15);
  for (let i = 0; i < rows; i++) { const l = termLines[(first + i) % termLines.length]; ctx.fillStyle = l.c; ctx.fillText('› ' + l.s, 12, 46 + i * 15); }
}
function banner(s, text, sub, color, k = 1) {
  const { ctx, c } = s; const sc = 0.6 + 0.4 * back(k); ctx.save(); ctx.translate(c.width / 2, c.height / 2); ctx.scale(sc, sc);
  const w = c.width - 60, h = Math.min(c.height - 40, 150);
  ctx.fillStyle = 'rgba(6,16,13,0.9)'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = color; ctx.textAlign = 'center'; let fs = 46; ctx.font = `800 ${fs}px "Plus Jakarta Sans", sans-serif`; while (ctx.measureText(text).width > w - 30 && fs > 18) { fs -= 2; ctx.font = `800 ${fs}px "Plus Jakarta Sans", sans-serif`; }
  ctx.fillText(text, 0, sub ? -2 : 14); if (sub) { ctx.fillStyle = '#dff3ec'; ctx.font = '500 20px "DM Mono", monospace'; ctx.fillText(sub, 0, 40); }
  ctx.restore();
}
const SCREEN_FX = {
  // finder window: files vanish one by one into the trash
  emptyFolder(s, k) { const { ctx, c } = s; ctx.fillStyle = '#1b2230'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#262f40'; ctx.fillRect(0, 0, c.width, 30); ctx.fillStyle = '#b9c6dc'; ctx.font = '600 16px "Plus Jakarta Sans"'; ctx.fillText('my-saas-project/', 14, 21);
    const files = ['app/', 'components/', 'lib/', 'pages/', 'package.json', '.env', 'README.md', 'skripsi-final-v3.pdf'];
    const gone = Math.floor(k * (files.length + 1)); ctx.font = '500 17px "DM Mono"';
    files.forEach((f, i) => { if (i < gone) return; ctx.fillStyle = f.endsWith('/') ? '#7fb2ff' : '#dfe6f2'; ctx.fillText((f.endsWith('/') ? '📁 ' : '📄 ') + f, 20, 62 + i * 34); });
    if (gone > files.length) { ctx.fillStyle = '#8a95aa'; ctx.textAlign = 'center'; ctx.font = '600 24px "Plus Jakarta Sans"'; ctx.fillText('Folder ini kosong', c.width / 2, c.height / 2); ctx.textAlign = 'left'; } },
  limit(s, k) { const { ctx, c } = s; ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, c.width, c.height); banner(s, 'Limit tercapai', 'reset jam 15.00', '#ffb86b', k); },
  codeFlood(s, k, t) { drawTerm(s, t, 60, 'chatgpt — 400 baris baru', 40); const { ctx, c } = s; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, c.height - 40, c.width, 40); ctx.fillStyle = '#2bff8a'; ctx.font = '600 18px "DM Mono"'; ctx.fillText(`+${Math.floor(k * 400)} baris`, 14, c.height - 14); },
  clock(s, k, t, a) { const { ctx, c } = s; ctx.fillStyle = '#0d1a17'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#86e7c7'; ctx.textAlign = 'center'; ctx.font = '800 92px "DM Mono"'; ctx.fillText(a.text || '02.58', c.width / 2, c.height / 2 + 20); ctx.font = '500 22px "DM Mono"'; ctx.fillStyle = '#93bfb2'; ctx.fillText(a.sub || 'satu prompt lagi', c.width / 2, c.height / 2 + 70); ctx.textAlign = 'left'; },
  check(s, k) { const { ctx, c } = s; ctx.fillStyle = '#0d1a17'; ctx.fillRect(0, 0, c.width, c.height); banner(s, '✓ Sudah diperbaiki', '', '#00c896', k); },
  banner(s, k, t, a) { const { ctx, c } = s; drawTerm(s, t, 10, a.title || 'terminal'); banner(s, a.text, a.sub || '', a.color || '#00c896', k); },
  gitMissing(s, k) { const { ctx, c } = s; ctx.fillStyle = '#1a0f12'; ctx.fillRect(0, 0, c.width, c.height); banner(s, 'fatal: not a git repository', '', '#ff7a7a', k); },
  sniff(s, k, t) { drawTerm(s, t, 200, 'claude — siapa yang nyentuh ini?', 2); const { ctx, c } = s; ctx.fillStyle = `rgba(43,255,138,${0.15 + 0.1 * Math.sin(t * 6)})`; ctx.fillRect(0, 26, c.width, c.height - 26); },
};

// ───────────────────────────────────────────────────────── camera shots
const SHOTS = {
  wide: { p: v3(0.35, 1.6, 4.1), l: v3(0.55, 1.0, 0.9), fov: 50 },
  sanClose: { p: v3(1.3, 1.3, 2.8), l: v3(0.55, 0.85, 1.15), fov: 38 },
  sanExtreme: { p: v3(1.0, 1.15, 2.0), l: v3(0.55, 0.95, 1.15), fov: 34 },
  claudeClose: { p: v3(0.3, 1.3, 3.65), l: v3(1.1, 1.0, 1.75), fov: 40 },
  gptClose: { p: v3(-0.95, 1.38, 3.55), l: v3(-0.3, 1.05, 1.75), fov: 42 },
  monitors: { p: v3(-0.25, 1.3, 0.98), l: v3(0.25, 1.1, 0.2), fov: 44 },
  monitorV: { p: v3(0.55, 1.28, 0.95), l: v3(0.93, 1.22, 0.26), fov: 36 },
  twoShot: { p: v3(0.75, 1.4, 3.7), l: v3(0.88, 1.0, 1.45), fov: 46 },
  threeShot: { p: v3(0.0, 1.55, 4.2), l: v3(0.3, 1.0, 1.4), fov: 48 },
  pull: { p: v3(-0.6, 2.2, 4.8), l: v3(0.4, 1.0, 0.8), fov: 52 },
  desk: { p: v3(-0.9, 1.45, 2.25), l: v3(0.3, 0.85, 0.8), fov: 44 },
};

// ───────────────────────────────────────────────────────── story → timeline
let STORY = null, CUES = [], EVENTS = [], SFX = [], TOTAL = 0;
const WHO = { san: ['San', '#0d9373', '#fff'], claude: ['Claude', '#ffffff', '#0a1714'], gpt: ['ChatGPT', '#9fb3ab', '#0a1714'], codex: ['Codex', '#f39a3c', '#1d1206'] };
function buildTimeline(durations) {
  let t = STORY.hook ?? 0.4; CUES = []; EVENTS = []; SFX = [];
  STORY.lines.forEach((l) => {
    t += l.pre ?? 0.35;
    const d = durations[l.id] ?? l.d ?? 2.2;
    const cue = { ...l, start: t, end: t + d, d };
    CUES.push(cue);
    (l.fx || []).forEach((e) => { const at = e.atEnd !== undefined ? cue.end + e.atEnd : cue.start + (e.at ?? 0); EVENTS.push({ ...e, at }); if (e.sfx) SFX.push({ t: +at.toFixed(3), name: e.sfx, gain: e.gain ?? 1 }); });
    t = cue.end + (l.post ?? 0.7);
  });
  (STORY.fx || []).forEach((e) => { EVENTS.push(e); if (e.sfx) SFX.push({ t: e.at, name: e.sfx, gain: e.gain ?? 1 }); });
  TOTAL = t + (STORY.endHold ?? 3.6);
  EVENTS.sort((a, b) => a.at - b.at);
  window.__timeline = { id: STORY.id, total: +TOTAL.toFixed(3), cues: CUES.map((c) => ({ id: c.id, who: c.who, start: +c.start.toFixed(3), end: +c.end.toFixed(3) })), sfx: SFX };
}

// ───────────────────────────────────────────────────────── per-frame state
const DEFAULT_POS = {
  san: { p: [SAN_SEAT.x, SAN_SEAT.y, SAN_SEAT.z], yaw: CHAIR_YAW - Math.PI },
  claude: { p: [1.2, 0.72, 1.75], yaw: null },
  gpt: { p: [-0.35, 0.72, 1.75], yaw: null },
  codex: { p: [-1.2, 1.57, 0.36], yaw: 0.5 },
};
function stateAt(t) {
  const st = { expr: { san: 'tired', claude: 'neutral', gpt: 'happy', codex: 'neutral' }, pose: { san: 'sit', claude: 'idle', gpt: 'idle', codex: 'idle' },
    visible: { san: true, claude: true, gpt: false, codex: false }, pos: {}, props: {}, screens: { L: null, R: null, V: null }, shake: 0, light: 1, squash: {} };
  for (const k in DEFAULT_POS) st.pos[k] = { from: DEFAULT_POS[k].p, to: DEFAULT_POS[k].p, t0: -1, dur: 0.001, yaw: DEFAULT_POS[k].yaw, hop: 0 };
  for (const e of EVENTS) {
    if (e.at > t) break;
    const el = t - e.at;
    if (e.expr) st.expr[e.expr[0]] = e.expr[1];
    if (e.pose) st.pose[e.pose[0]] = e.pose[1];
    if (e.show) st.visible[e.show] = true;
    if (e.hide) st.visible[e.hide] = false;
    if (e.move) { const [who, to, dur, yaw] = e.move; const cur = st.pos[who]; const k = clamp01((e.at - cur.t0) / cur.dur); const now = cur.from.map((a, i) => a + (cur.to[i] - a) * ease(k)); st.pos[who] = { from: now, to, t0: e.at, dur: dur || 0.6, yaw: yaw === undefined ? cur.yaw : yaw, hop: e.hop || 0 }; }
    if (e.prop) st.props[e.prop[0]] = e.prop[1] === false ? null : { el, at: e.at, opts: e.prop[2] || {} };
    if (e.screen) st.screens[e.screen[0]] = e.screen[1] === null ? null : { name: e.screen[1], el, dur: e.screen[2] ?? 1, args: e.screen[3] || {} };
    if (e.shake) st.shake = Math.max(st.shake, e.shake * Math.max(0, 1 - el / (e.shakeDur || 0.5)));
    if (e.light !== undefined) st.light = e.light;
    if (e.squash) st.squash[e.squash] = el;
  }
  return st;
}

// ───────────────────────────────────────────────────────── apply state to the scene
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const subEl = $('#sub'), subWho = $('#sub .who'), subLine = $('#sub .line'), typed = $('#typed'), stateEl = $('#state'), stripName = $('#strip-name'), stripDot = $('#strip-dot'), clock = $('#clock'), endEl = $('#end'), caret = $('#caret');
let lastLine = null;
function sq(el, amt = 0.16) { if (el === undefined || el > 0.5) return [1, 1]; const k = Math.sin(clamp01(el / 0.5) * Math.PI * 2) * Math.exp(-el * 6); return [1 - amt * k * 0.6, 1 + amt * k]; }
function renderAt(t) {
  const st = stateAt(t);
  let cur = null, active = null;
  for (const c of CUES) { if (t >= c.start) cur = c; if (t >= c.start && t < c.end) active = c; }
  const talking = active ? active.who : null;

  // characters: positions, yaw, hops, squash on speech start and on squash events
  for (const k of ['san', 'claude', 'gpt', 'codex']) {
    const ch = C[k], ps = st.pos[k]; ch.root.visible = st.visible[k];
    const kk = clamp01((t - ps.t0) / ps.dur); const e2 = ease(kk);
    const p = ps.from.map((a, i) => a + (ps.to[i] - a) * e2);
    const hop = ps.hop ? Math.sin(kk * Math.PI) * ps.hop : 0;
    ch.root.position.set(p[0], p[1] + hop, p[2]);
    const yaw = ps.yaw === null ? Math.atan2(0.3 - p[0], 3.4 - p[2]) : ps.yaw;
    ch.root.rotation.y = yaw;
    const sEl = st.squash[k] !== undefined ? st.squash[k] : (active && active.who === k ? t - active.start : undefined);
    const [sx, sy] = sq(sEl, k === 'san' ? 0.08 : 0.16);
    ch.body.scale.set(sx, sy, sx);
  }
  // San
  { const s = C.san, pose = st.pose.san, ex = st.expr.san;
    const open = talking === 'san' && Math.floor(t * 10) % 2 === 1;
    s.headMats[4] = SAN_FACES[ex] ? SAN_FACES[ex][open ? 1 : 0] : SAN_FACES.neutral[0]; s.head.material = s.headMats;
    s.legL.rotation.x = s.legR.rotation.x = pose === 'stand' ? 0 : -Math.PI / 2;
    const tl = talking === 'san';
    s.headPivot.rotation.set(tl ? Math.sin(t * 7) * 0.06 : Math.sin(t * 0.8) * 0.02, 0, 0);
    s.armL.rotation.set(-0.5, 0, 0.1); s.armR.rotation.set(tl ? -0.9 + Math.sin(t * 5) * 0.25 : -0.5, 0, -0.1);
    if (pose === 'facepalm') { s.armR.rotation.set(-2.6, 0, 0.35); s.headPivot.rotation.x = 0.3; }
    if (pose === 'point') { s.armR.rotation.set(-1.55, 0, 0.1); }
    if (pose === 'armsUp') { s.armL.rotation.set(-2.9 + Math.sin(t * 9) * 0.15, 0, 0.2); s.armR.rotation.set(-2.9 - Math.sin(t * 9) * 0.15, 0, -0.2); }
    if (pose === 'slump') { s.headPivot.rotation.x = 0.55; s.armL.rotation.set(-0.2, 0, 0.3); s.armR.rotation.set(-0.2, 0, -0.3); }
    if (pose === 'shakeMonitor') { s.armL.rotation.set(-1.5 + Math.sin(t * 22) * 0.2, 0, 0); s.armR.rotation.set(-1.5 - Math.sin(t * 22) * 0.2, 0, 0); s.root.rotation.y = 0.25 + Math.PI * 2; }
    if (pose === 'sleep') { s.headPivot.rotation.x = 0.7; s.armL.rotation.set(-1.2, 0, 0); s.armR.rotation.set(-1.2, 0, 0); }
    if (pose === 'guilty') { s.headPivot.rotation.set(0.25, 0.3, 0); s.armR.rotation.set(-1.2, 0, -0.2); s.armL.rotation.set(-1.2, 0, 0.2); }
    if (pose === 'leanBack') { s.body.rotation.x = -0.25; } else s.body.rotation.x = 0;
  }
  // Claude
  { const c = C.claude, ex = st.expr.claude, tl = talking === 'claude';
    c.root.position.y += Math.sin(t * 2.1) * 0.035;
    const blink = (t % 3.1) < 0.1 ? 0.15 : 1;
    let ey = 1, ex2 = 1, eyOff = 0.015, glowI = 0.7, mouthX = tl ? 0.6 + Math.abs(Math.sin(t * 12)) * 0.9 : 0.8, mouthY = 1, col = 0x00e0a8;
    if (ex === 'happy') { ey = 0.35; eyOff = 0.03; mouthX = tl ? mouthX * 1.2 : 1.3; }
    if (ex === 'shock') { ey = 1.5; ex2 = 1.3; mouthX = 0.5; mouthY = 3.2; }
    if (ex === 'sad') { ey = 0.55; eyOff = -0.005; glowI = 0.3; col = 0x4f9d8a; }
    if (ex === 'squint') { ey = 0.22; mouthX = 0.6; }
    if (ex === 'proud') { ey = 0.35; eyOff = 0.035; mouthX = 1.5; c.headG.rotation.x = -0.2; }
    if (ex === 'sniff') { ey = 0.25; c.headG.rotation.z = Math.sin(t * 8) * 0.12; }
    if (ex === 'dim') { ey = 0.5; glowI = 0.08; col = 0x2b5a50; }
    if (ex === 'hearts') { ey = 0.9; col = 0xff6b9a; mouthX = 1.3; }
    if (ex !== 'proud') c.headG.rotation.x = 0; if (ex !== 'sniff') c.headG.rotation.z = tl ? Math.sin(t * 3) * 0.06 : 0;
    c.eyeL.scale.set(ex2, ey * blink, 1); c.eyeR.scale.set(ex2, ey * blink, 1); c.eyeL.position.y = c.eyeR.position.y = eyOff;
    c.mouth.scale.set(mouthX, mouthY, 1); c.eyeM.color.setHex(col);
    c.glow.emissiveIntensity = glowI * st.light + (tl ? 0.3 + Math.sin(t * 10) * 0.08 : 0); c.light.intensity = (1.2 + (tl ? 0.8 : 0)) * (glowI / 0.7);
    const pose = st.pose.claude;
    c.armL.rotation.set(0, 0, pose === 'cheer' ? 2.6 : pose === 'cross' ? 1.2 : pose === 'hug' ? 1.5 : 0.1);
    c.armR.rotation.set(0, 0, pose === 'cheer' ? -2.6 : pose === 'thumb' ? -2.4 : pose === 'cross' ? -1.2 : pose === 'hug' ? -1.5 : tl ? -0.5 + Math.sin(t * 4) * 0.2 : -0.1);
    if (pose === 'bow') { c.body.rotation.x = 0.45; } else c.body.rotation.x = 0;
  }
  // ChatGPT
  { const g = C.gpt, tl = talking === 'gpt';
    g.root.position.y += Math.sin(t * 3.2) * 0.05;
    g.headG.rotation.z = tl ? Math.sin(t * 6) * 0.1 : Math.sin(t * 1.5) * 0.05;
    g.mouth.scale.set(1, tl ? 0.6 + Math.abs(Math.sin(t * 14)) : 1, 1);
    g.dot.material.color.setHex(Math.floor(t * 2) % 2 ? 0x2bff8a : 0x1fd270);
    const pose = st.pose.gpt;
    g.armL.rotation.set(0, 0, pose === 'wave' ? 2.4 + Math.sin(t * 10) * 0.4 : pose === 'offer' ? 1.3 : 0.15);
    g.armR.rotation.set(0, 0, pose === 'offer' ? -1.3 : tl ? -0.6 + Math.sin(t * 6) * 0.3 : -0.15);
  }
  // Codex
  { const x = C.codex; const pose = st.pose.codex;
    x.body.rotation.z = pose === 'roll' ? -t * 9 : Math.sin(t * 2) * 0.05;
    const nervous = st.expr.codex === 'nervous'; x.eyeL.position.x = -0.05 + (nervous ? Math.sin(t * 20) * 0.01 : 0); x.eyeR.position.x = 0.05 + (nervous ? Math.sin(t * 20) * 0.01 : 0);
  }
  // props
  for (const [name, obj] of Object.entries(P)) {
    const s = st.props[name]; if (name === 'shades') { obj.visible = !!s; continue; }
    obj.visible = !!s; if (!s) continue;
    const o = s.opts, k = s.el;
    if (o.pos) obj.position.set(...o.pos);
    if (name === 'trash') { obj.scale.setScalar(back(k / 0.35)); obj.rotation.y = Math.sin(k * 3) * 0.2; }
    if (name === 'codePile') obj.children.forEach((b) => { b.visible = b.userData.i < Math.floor(k * 9); });
    if (name === 'confetti') obj.children.forEach((b) => { const [vx, vy, vz, sp] = b.userData.v; b.position.set(vx * k, vy * k - 2.4 * k * k, vz * k); b.rotation.set(sp * k, sp * k * 0.7, 0); });
    if (name === 'siren') { obj.children[1].rotation.y = k * 12; obj.userData.light.intensity = 2.5 + Math.sin(k * 14) * 2.2; }
    if (name === 'zzz') obj.children.forEach((b) => { const i = b.userData.i; b.position.y = i * 0.09 + ((k * 0.4 + i * 0.3) % 1) * 0.15; b.material.opacity = 1; });
  }
  // monitors
  const sc = st.screens;
  if (sc.L) SCREEN_FX[sc.L.name](SCR.L, clamp01(sc.L.el / sc.L.dur), t, sc.L.args); else drawTerm(SCR.L, t, 0, STORY.screenTitles?.L || 'claude — chat');
  if (sc.R) SCREEN_FX[sc.R.name](SCR.R, clamp01(sc.R.el / sc.R.dur), t, sc.R.args); else drawTerm(SCR.R, t, 140, STORY.screenTitles?.R || 'npm run dev');
  if (sc.V) SCREEN_FX[sc.V.name](SCR.V, clamp01(sc.V.el / sc.V.dur), t, sc.V.args); else drawTerm(SCR.V, t, 300, STORY.screenTitles?.V || 'logs', 3);
  SCR.L.t.needsUpdate = SCR.R.t.needsUpdate = SCR.V.t.needsUpdate = true;
  lamp.intensity = 5.2 * st.light; roomL.intensity = 3.4 * st.light; hemi.intensity = 0.55 * (0.4 + 0.6 * st.light);

  // camera: each line has a shot; comedic hard cut by default, gentle push-in during the line
  const idx = cur ? CUES.indexOf(cur) : -1;
  const shot = SHOTS[cur ? cur.shot || 'wide' : (STORY.openShot || 'wide')];
  const prevShot = SHOTS[idx > 0 ? CUES[idx - 1].shot || 'wide' : (STORY.openShot || 'wide')];
  const blendK = cur && cur.blend ? ease((t - cur.start) / cur.blend) : 1;
  const push = cur ? ease((t - cur.start) / Math.max(1, cur.d + (cur.post ?? 0.7))) * (cur.push ?? 0.08) : 0;
  camPos.copy(prevShot.p).lerp(shot.p, blendK); camLook.copy(prevShot.l).lerp(shot.l, blendK);
  camPos.lerp(camLook, push);
  const shake = st.shake;
  camera.position.set(camPos.x + Math.sin(t * 0.35) * 0.03 + (shake ? Math.sin(t * 61) * shake * 0.04 : 0), camPos.y + (shake ? Math.cos(t * 53) * shake * 0.03 : 0), camPos.z);
  camera.fov = prevShot.fov + (shot.fov - prevShot.fov) * blendK; camera.updateProjectionMatrix(); camera.lookAt(camLook);

  // HUD
  if (STORY.clock) clock.textContent = STORY.clock(t, cur);
  const ai = active && active.who !== 'san' ? active.who : (cur && cur.who !== 'san' ? cur.who : (STORY.stripAI || 'claude'));
  stripName.textContent = WHO[ai][0]; stripDot.style.background = WHO[ai][1]; stripDot.style.color = WHO[ai][2]; stripDot.textContent = WHO[ai][0][0];
  const lastSan = [...CUES].reverse().find((c) => c.who === 'san' && t >= c.start);
  if (lastSan) { const tp = Math.min(1, (t - lastSan.start) / Math.max(0.5, lastSan.d * 0.7)); const txt = lastSan.text.replace(/[?.!…]+$/, '').toLowerCase(); typed.textContent = txt.slice(0, Math.ceil(txt.length * tp)); } else typed.textContent = '';
  stateEl.textContent = talking && talking !== 'san' ? 'mengetik…' : talking === 'san' ? 'online' : (STORY.stripState ? STORY.stripState(t, cur) : 'online');
  caret.style.opacity = Math.floor(t * 2) % 2 ? 1 : 0.15;
  if (!active) { subWho.style.visibility = 'hidden'; subLine.innerHTML = ''; lastLine = null; }
  else {
    if (active.id !== lastLine) { lastLine = active.id; const w = WHO[active.who]; subWho.style.visibility = 'visible'; subWho.textContent = w[0]; subWho.style.background = w[1]; subWho.style.color = w[2];
      subLine.innerHTML = active.text.split(' ').map((x) => `<span class="w">${x}</span>`).join(' '); }
    const ws = subLine.querySelectorAll('.w'); const n = Math.ceil(clamp01((t - active.start) / Math.max(0.3, active.d * 0.9)) * ws.length + 0.001);
    ws.forEach((w, i) => w.classList.toggle('on', i < n));
    const pop = clamp01((t - active.start) / 0.18); subEl.style.transform = `translateY(${(1 - easeOut(pop)) * 1.2}cqh) scale(${0.96 + 0.04 * easeOut(pop)})`;
  }
  const last = CUES[CUES.length - 1]; const endK = ease((t - (last.end + (last.post ?? 0.7) - 0.4)) / 0.6);
  endEl.style.opacity = endK; subEl.style.opacity = 1 - endK;
  renderer.render(scene, camera);
}

function resize() { const r = $('#stage').getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

// ───────────────────────────────────────────────────────── audio playback (browser preview)
async function playAudio(base) {
  const actx = new (window.AudioContext || window.webkitAudioContext)();
  const get = async (u) => { try { return await actx.decodeAudioData(await (await fetch(u)).arrayBuffer()); } catch (e) { return null; } };
  const lines = {}; for (const c of CUES) lines[c.id] = await get(`${base}/${c.id}.mp3`) || await get(`${base}/${c.id}.wav`);
  const fx = {}; for (const s of SFX) if (!(s.name in fx)) fx[s.name] = await get(`/morphy/sfx/${s.name}.wav`);
  const bed = await get('/morphy/audio/bed.mp3') || await get('/morphy/audio/bed.wav');
  const t0 = actx.currentTime + 0.2;
  if (bed) { const s = actx.createBufferSource(); s.buffer = bed; s.loop = true; const g = actx.createGain(); g.gain.value = 0.2; s.connect(g).connect(actx.destination); s.start(t0); s.stop(t0 + TOTAL); }
  for (const c of CUES) if (lines[c.id]) { const s = actx.createBufferSource(); s.buffer = lines[c.id]; s.connect(actx.destination); s.start(t0 + c.start); }
  for (const e of SFX) if (fx[e.name]) { const s = actx.createBufferSource(); s.buffer = fx[e.name]; const g = actx.createGain(); g.gain.value = 0.55 * e.gain; s.connect(g).connect(actx.destination); s.start(t0 + e.t); }
  return { actx, t0 };
}

export async function run(story) {
  STORY = story; seed = 21;
  document.title = story.title + ' — reel draft';
  $('#end .t').innerHTML = story.endLine || 'Komen <b>“VIBE”</b> kalau ini kamu banget.';
  const base = `/morphy/audio/${story.id}`;
  let durations = {};
  try { const meta = await (await fetch(`${base}/lines.json`, { cache: 'no-store' })).json(); meta.forEach((m) => { durations[m.id] = m.duration_s; }); } catch (e) {}
  buildTimeline(durations);
  await document.fonts.ready.catch(() => {});
  resize();
  if (RENDER) { window.__render = (t) => { renderAt(t); return true; }; renderAt(0); window.__ready = true; return; }
  if (params.has('t')) { $('#play').hidden = true; renderAt(parseFloat(params.get('t'))); window.__ready = true; return; }
  renderAt(0.8);
  $('#play').addEventListener('click', async () => {
    $('#play').hidden = true; const { actx, t0 } = await playAudio(base);
    const loop = () => { const t = actx.currentTime - t0; renderAt(Math.max(0, t)); if (t < TOTAL) requestAnimationFrame(loop); else { $('#play').hidden = false; $('#play span').textContent = '↻ Putar lagi'; actx.close(); } };
    loop();
  });
  window.__ready = true;
}
