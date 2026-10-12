// "2 AM at Weed Labs": a Morphy-style voxel skit. San at his real desk, the HQ agent as a glowing robot.
// Timeline is driven by the voice lines (/morphy/audio/lines.json); without it, default durations.
// ?render=1 exposes window.__render(t) for frame-exact MP4 export; ?t=12.5 freezes on a moment.
import * as THREE from '/assets/world/three.module.min.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');

// ---------------------------------------------------------------- script + timeline
const LINES = [
  { id: 's1', who: 'san', text: 'How many releases can we ship before Wednesday?', d: 2.6, beat: 1 },
  { id: 'a1', who: 'agent', text: 'Three. Want me to wake the squads?', d: 2.3, beat: 1 },
  { id: 's2', who: 'san', text: 'Pause all the ads.', d: 1.3, beat: 2 },
  { id: 'a2', who: 'agent', text: 'Done. Meta is sad. Your wallet is less sad.', d: 3.0, beat: 2 },
  { id: 's3', who: 'san', text: "I can't even sell this.", d: 1.5, beat: 3 },
  { id: 'a3', who: 'agent', text: "That's why I emailed your whole list while you slept.", d: 3.0, beat: 3 },
  { id: 's4', who: 'san', text: "Why do you keep saying 'still waiting on the Vicca squad'?", d: 3.2, beat: 4 },
  { id: 'a4', who: 'agent', text: "Because I'm loyal. And they're slow.", d: 2.6, beat: 4 },
  { id: 'a5', who: 'agent', text: 'One guy. Five products. A dozen agents.', d: 3.2, beat: 5 },
];
const HOOK = 2.6, GAP_REPLY = 0.9, GAP_BEAT = 2.6, END_HOLD = 5.0;  // beats breathe: each punchline gets a beat of silence on its monitor gag
let cues = [], TOTAL = 0;
function buildTimeline() {
  let t = HOOK; cues = [];
  LINES.forEach((l, i) => {
    cues.push({ ...l, start: t, end: t + l.d });
    t += l.d;
    const next = LINES[i + 1];
    t += next ? (next.beat !== l.beat ? GAP_BEAT : GAP_REPLY) : END_HOLD;
  });
  TOTAL = t;
  window.__timeline = { total: TOTAL, cues: cues.map((c) => ({ id: c.id, start: +c.start.toFixed(3), end: +c.end.toFixed(3) })) };
}
buildTimeline();

// ---------------------------------------------------------------- renderer
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(RENDER ? 1 : Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120c0a);
scene.fog = new THREE.Fog(0x120c0a, 6, 14);
const camera = new THREE.PerspectiveCamera(42, 9 / 16, 0.05, 50);

// ---------------------------------------------------------------- pixel textures
let seed = 21;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (rgb, f) => rgb.map((c) => Math.max(0, Math.min(255, Math.round(c * f))));
function tex(draw, w = 16, h = 16, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const px = (x, i, j, rgb, a = 1) => { x.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; x.fillRect(i, j, 1, 1); };
const noisy = (hex, amp = 0.08) => (x, w = 16, h = 16) => { const b = hexRgb(hex); for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) px(x, i, j, shade(b, 1 - amp + rnd() * amp * 2)); };
const mats = {};
const M = (hex, amp = 0.07, repeat, o = {}) => {
  const k = hex + amp + (repeat || '') + JSON.stringify(o);
  return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ map: tex(noisy(hex, amp), 16, 16, repeat), roughness: 0.85, metalness: 0, ...o }));
};
function box(w, h, d, mat, x, y, z, parent = scene, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}

// ---------------------------------------------------------------- room (units = metres)
// back wall at z=0, desk against it; right wall at x=1.9; floor y=0
const WALL = '#8b8478', FLOOR = '#5b4a3e';
box(6, 0.02, 5, M(FLOOR, 0.1, [10, 8]), 0, -0.01, 2.4, scene, false);
box(6, 3.2, 0.1, M(WALL, 0.05, [8, 4]), 0, 1.6, -0.05, scene, false);
box(0.1, 3.2, 5, M('#7d776c', 0.05, [6, 4]), 1.95, 1.6, 2.4, scene, false);
box(6, 0.1, 5, M('#a08a76', 0.05), 0, 3.2, 2.4, scene, false);
// rug edge (front, like the patterned blanket)
box(2.4, 0.02, 1.2, new THREE.MeshStandardMaterial({ map: tex((x) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, (i + j) % 4 < 2 ? [92, 118, 150] : [205, 210, 214]); }), roughness: 1 }), 0.4, 0.005, 3.2, scene, false);
// dark roller blind behind the monitors
box(0.95, 1.45, 0.03, M('#26211d', 0.05), 0.55, 1.75, 0.02);
box(1.0, 0.06, 0.06, M('#1b1815', 0.05), 0.55, 2.5, 0.04);
// wall AC, high on the left
const ac = box(0.9, 0.3, 0.22, M('#ece8e0', 0.03), -1.35, 2.75, 0.13);
box(0.78, 0.04, 0.02, M('#2a2622', 0.03), -1.35, 2.64, 0.245);
// cable running down the wall
box(0.015, 1.2, 0.015, M('#d7d2c8', 0.02), -0.05, 2.1, 0.01, scene, false);

// desk with riser
const DESK = M('#1d1a18', 0.06);
box(1.7, 0.05, 0.72, DESK, 0.25, 0.75, 0.42);
[[-0.55, 0.12], [1.05, 0.12], [-0.55, 0.72], [1.05, 0.72]].forEach(([x, z]) => box(0.05, 0.75, 0.05, M('#141210', 0.04), x, 0.375, z));
box(1.2, 0.04, 0.26, M('#5a3b26', 0.08), 0.1, 0.88, 0.2);      // wooden monitor riser
[[-0.45], [0.65]].forEach(([x]) => box(0.05, 0.1, 0.24, M('#3a2618', 0.08), x, 0.82, 0.2));
// keyboard, mouse, cup, speaker puck
box(0.42, 0.02, 0.14, M('#2b2a2c', 0.05), 0.15, 0.785, 0.62);
box(0.06, 0.02, 0.1, M('#2b2a2c', 0.05), 0.48, 0.785, 0.62);
const cup = box(0.08, 0.14, 0.08, M('#cfd98a', 0.05), -0.42, 0.845, 0.6);
box(0.07, 0.04, 0.07, M('#0e0e10', 0.03), 0.62, 0.795, 0.5);

// monitors: canvas screens we redraw per beat
function screen(w, h, cw, ch) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  return { c, ctx: c.getContext('2d'), t, mat, w, h };
}
const scrL = screen(0.62, 0.36, 640, 372), scrR = screen(0.62, 0.36, 640, 372), scrV = screen(0.34, 0.6, 360, 636);
function monitor(s, x, y, z, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g);
  box(s.w + 0.03, s.h + 0.03, 0.03, M('#0b0b0c', 0.02), 0, 0, -0.016, g);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), s.mat); p.position.z = 0.001; g.add(p);
  return g;
}
monitor(scrL, -0.24, 1.14, 0.2, 0.06);
monitor(scrR, 0.39, 1.14, 0.2, -0.06);
monitor(scrV, 0.93, 1.24, 0.26, -0.18);
box(0.04, 0.24, 0.04, M('#0b0b0c', 0.02), 0.08, 0.98, 0.16);
box(0.04, 0.36, 0.04, M('#0b0b0c', 0.02), 0.93, 0.95, 0.22);
const glowL = new THREE.PointLight(0x7fa8ff, 0.9, 2.2, 2); glowL.position.set(0.1, 1.15, 0.55); scene.add(glowL);

// desk lamp (warm, the brightest thing in the room)
const lampG = new THREE.Group(); lampG.position.set(-0.6, 0.78, 0.3); scene.add(lampG);
box(0.12, 0.02, 0.12, M('#141414', 0.03), 0, 0.01, 0, lampG);
const arm = box(0.02, 0.36, 0.02, M('#141414', 0.03), 0.03, 0.2, 0, lampG); arm.rotation.z = -0.35;
const lampHead = box(0.12, 0.09, 0.12, M('#151515', 0.03), 0.12, 0.38, 0.02, lampG); lampHead.rotation.z = 0.6;
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc78a })); bulb.position.set(0.15, 0.34, 0.03); lampG.add(bulb);
const lamp = new THREE.PointLight(0xff9a4d, 5.2, 4.5, 1.7); lamp.position.set(-0.45, 1.1, 0.4); lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
// warm room light from the left (the orange glow in the photo) + faint fill
const roomL = new THREE.PointLight(0xff8a3d, 3.4, 7, 1.6); roomL.position.set(-2.4, 1.6, 1.4); scene.add(roomL);
scene.add(new THREE.HemisphereLight(0xffc29a, 0x2a1d16, 0.55));

// black ladder shelf with drawers (left)
const SH = M('#121212', 0.04);
const shelf = new THREE.Group(); shelf.position.set(-1.35, 0, 0.32); scene.add(shelf);
[[-0.33, 0.18], [0.33, 0.18], [-0.33, -0.18], [0.33, -0.18]].forEach(([x, z]) => box(0.04, 1.85, 0.04, SH, x, 0.925, z, shelf));
[0.05, 0.62, 1.12, 1.55, 1.85].forEach((y) => box(0.72, 0.03, 0.38, SH, 0, y, 0, shelf));
const drawerTex = M('#1c1c1e', 0.04);
for (const [y, rows] of [[0.33, 2], [0.86, 2], [1.33, 2]]) for (let r = 0; r < rows; r++) {
  box(0.6, 0.2, 0.32, drawerTex, 0, y - 0.11 + r * 0.22, 0.01, shelf);
  box(0.06, 0.02, 0.01, M('#d8d8d8', 0.02), 0, y - 0.11 + r * 0.22, 0.175, shelf);
}
box(0.08, 0.1, 0.08, M('#3c6b3a', 0.15), 0.18, 1.92, 0, shelf);                  // little plant
box(0.03, 0.12, 0.03, M('#e9e9e2', 0.02), -0.05, 1.93, 0, shelf);                // bottles
box(0.03, 0.09, 0.03, M('#e9e9e2', 0.02), 0.02, 1.915, 0.04, shelf);
box(0.16, 0.08, 0.12, M('#2a1f19', 0.05), -0.22, 1.91, 0, shelf);

// white pegboard on the right wall
const peg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 1.0), new THREE.MeshStandardMaterial({
  map: tex((x) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(x, i, j, (i % 3 === 1 && j % 3 === 1) ? [150, 150, 146] : [236, 236, 230]); }, 16, 16, [4, 3]), roughness: 0.9,
}));
peg.position.set(1.92, 1.45, 1.3); peg.receiveShadow = true; scene.add(peg);
box(0.12, 0.03, 0.3, M('#f2f2ee', 0.02), 1.86, 1.62, 1.22);
box(0.06, 0.05, 0.05, M('#d84a4a', 0.05), 1.86, 1.66, 1.12); box(0.06, 0.05, 0.05, M('#4bbf5a', 0.05), 1.86, 1.66, 1.2);

// gaming chair: black, blue X
const chair = new THREE.Group(); chair.position.set(0.55, 0, 1.15); scene.add(chair);
const CH = M('#18191b', 0.05);
box(0.52, 0.1, 0.5, CH, 0, 0.5, 0, chair);
const backTex = tex((x) => { noisy('#18191b', 0.05)(x, 32, 48); x.strokeStyle = '#5ca6d6'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(10, 14); x.lineTo(22, 28); x.moveTo(22, 14); x.lineTo(10, 28); x.stroke(); }, 32, 48);
const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.82, 0.1), [CH, CH, CH, CH, new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.85 }), CH]);
back.position.set(0, 0.98, 0.26); back.rotation.x = 0.1; back.castShadow = true; chair.add(back);
box(0.06, 0.04, 0.4, CH, -0.28, 0.68, 0, chair); box(0.06, 0.04, 0.4, CH, 0.28, 0.68, 0, chair);
box(0.06, 0.4, 0.06, M('#222', 0.03), 0, 0.25, 0, chair);
box(0.6, 0.03, 0.08, M('#222', 0.03), 0, 0.05, 0, chair); box(0.08, 0.03, 0.6, M('#222', 0.03), 0, 0.05, 0, chair);
chair.rotation.y = Math.PI + 0.75;   // turned toward the agent on the right

// ---------------------------------------------------------------- San (Weedlabs palette)
function limbTex(top, bottom, split) {
  return tex((x) => { const a = hexRgb(top), b = hexRgb(bottom); for (let i = 0; i < 4; i++) for (let j = 0; j < 12; j++) px(x, i, j, shade(j < split ? a : b, 0.94 + rnd() * 0.1)); }, 4, 12);
}
const SKIN = '#c68e63', HAIR = '#1d1611', SHIRT = '#0d9373', PANTS = '#1a3a32';
const faceT = tex((x) => { noisy(SKIN, 0.04)(x, 8, 8); const h = hexRgb(HAIR); for (let i = 0; i < 8; i++) { px(x, i, 0, h); px(x, i, 1, h); } px(x, 0, 2, h); px(x, 7, 2, h); px(x, 1, 4, [255, 255, 255]); px(x, 2, 4, [30, 30, 40]); px(x, 5, 4, [30, 30, 40]); px(x, 6, 4, [255, 255, 255]); px(x, 2, 3, h); px(x, 5, 3, h); }, 8, 8);
const mouthT = []; // two mouth states for talking
for (const open of [false, true]) mouthT.push(tex((x) => { x.drawImage(faceT.image, 0, 0); const m = [120, 60, 50]; px(x, 3, 6, m); px(x, 4, 6, m); if (open) { px(x, 3, 7, [60, 25, 25]); px(x, 4, 7, [60, 25, 25]); } }, 8, 8));
const sideT = tex((x) => { noisy(SKIN, 0.04)(x, 8, 8); const h = hexRgb(HAIR); for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) px(x, i, j, h); }, 8, 8);
const hairT = tex(noisy(HAIR, 0.08), 8, 8), backT = tex((x) => { noisy(HAIR, 0.08)(x, 8, 8); for (let i = 0; i < 8; i++) px(x, i, 7, hexRgb(SKIN)); }, 8, 8);
const shirtT = tex((x) => { noisy(SHIRT, 0.06)(x, 8, 12); for (let i = 2; i < 6; i++) px(x, i, 0, [7, 112, 90]); px(x, 5, 3, [0, 200, 150]); px(x, 4, 3, [0, 200, 150]); px(x, 5, 4, [0, 200, 150]); }, 8, 12);
const sm = (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
const san = new THREE.Group(); scene.add(san);
const S = 0.42; // San is ~0.9 m tall seated
const faceMat = sm(mouthT[0]);
const head = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 0.5 * S, 0.5 * S), [sm(sideT), sm(sideT), sm(hairT), sm(tex(noisy(SKIN, 0.04), 8, 8)), faceMat, sm(backT)]);
head.position.y = 1.62 * S + 0.25 * S; head.castShadow = true;
const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 0.75 * S, 0.25 * S), [sm(tex(noisy(SHIRT, 0.06), 4, 12)), sm(tex(noisy(SHIRT, 0.06), 4, 12)), sm(tex(noisy(SHIRT, 0.06), 4, 4)), sm(tex(noisy(SHIRT, 0.06), 4, 4)), sm(shirtT), sm(tex(noisy(SHIRT, 0.06), 8, 12))]);
torso.position.y = 1.125 * S + 0.25 * S; torso.castShadow = true;
san.add(head, torso);
function limb(t, x, y, len = 0.75) {
  const pv = new THREE.Group(); pv.position.set(x * S, y * S, 0); san.add(pv);
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.25 * S, len * S, 0.25 * S), sm(t)); m.position.y = -len * S / 2; m.castShadow = true; pv.add(m); return pv;
}
const armL = limb(limbTex(SHIRT, SKIN, 5), -0.375, 1.5 + 0.25), armR = limb(limbTex(SHIRT, SKIN, 5), 0.375, 1.5 + 0.25);
const legL = limb(limbTex(PANTS, '#2b2b2f', 10), -0.125, 0.75 + 0.25), legR = limb(limbTex(PANTS, '#2b2b2f', 10), 0.125, 0.75 + 0.25);
legL.rotation.x = legR.rotation.x = -Math.PI / 2;   // seated
// place San in the chair, facing the same way as the chair
san.position.set(0.55, 0.55 - 0.25 * S - 0.75 * S + 0.06, 1.13);
san.rotation.y = 0.75 - Math.PI + Math.PI;  // chair faces away from desk toward agent; San faces chair forward
san.rotation.y = chair.rotation.y - Math.PI;

// ---------------------------------------------------------------- the HQ agent (glowing robot)
const agent = new THREE.Group(); scene.add(agent);
const glowMat = new THREE.MeshStandardMaterial({ color: 0xf4fffb, emissive: 0xdffcf2, emissiveIntensity: 0.7, roughness: 0.4 });
const visorMat = new THREE.MeshStandardMaterial({ color: 0x0a1714, roughness: 0.3 });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00e0a8 });
const aBody = box(0.26, 0.24, 0.2, glowMat, 0, 0.32, 0, agent);
const aHead = box(0.34, 0.26, 0.26, glowMat, 0, 0.62, 0, agent);
const visor = box(0.27, 0.15, 0.01, visorMat, 0, 0.62, 0.131, agent, false);
const eyeL = box(0.045, 0.06, 0.01, eyeMat, -0.06, 0.635, 0.137, agent, false), eyeR = box(0.045, 0.06, 0.01, eyeMat, 0.06, 0.635, 0.137, agent, false);
const mouth = box(0.09, 0.015, 0.01, eyeMat, 0, 0.585, 0.137, agent, false);
box(0.015, 0.1, 0.015, glowMat, 0, 0.8, 0, agent);
const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0x00e0a8 })); tip.position.set(0, 0.87, 0); agent.add(tip);
const aArmL = box(0.06, 0.18, 0.06, glowMat, -0.17, 0.3, 0, agent), aArmR = box(0.06, 0.18, 0.06, glowMat, 0.17, 0.3, 0, agent);
const aLight = new THREE.PointLight(0xc8fff0, 1.6, 2.4, 2); aLight.position.set(0, 0.6, 0.25); agent.add(aLight);
agent.position.set(1.2, 0.72, 1.75);
// yaw only, aimed between San and the audience so the visor reads on camera (three-quarter view)
agent.rotation.set(0, Math.atan2(0.2 - agent.position.x, 3.2 - agent.position.z), 0);

// ---------------------------------------------------------------- monitor content
const termLines = [];
const words = ['deploy', 'redeploy.sh', 'smoke', '200', 'OK', 'gen_ads_perf', 'claim', '/iklan', 'nginx -t', 'reload', 'scalev', 'webhook', 'backup', 'done', 'ROAS', 'cpp', 'vicca-squad', 'qlipper-squad', 'commit', 'push', 'build', 'healthy'];
for (let i = 0; i < 400; i++) { let s = '', n = 3 + Math.floor(rnd() * 6); for (let k = 0; k < n; k++) s += words[Math.floor(rnd() * words.length)] + ' '; termLines.push({ s, c: rnd() < 0.15 ? '#00c896' : rnd() < 0.08 ? '#ffb86b' : '#b9d7ff' }); }
function drawTerm(s, t, offset, title) {
  const { ctx, c } = s; ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#16223a'; ctx.fillRect(0, 0, c.width, 26);
  ctx.font = '500 15px "DM Mono", monospace'; ctx.fillStyle = '#86e7c7'; ctx.fillText(title, 12, 18);
  ctx.font = '400 14px "DM Mono", monospace';
  const first = Math.floor(t * 6 + offset);
  for (let i = 0; i < 22; i++) { const l = termLines[(first + i) % termLines.length]; ctx.fillStyle = l.c; ctx.fillText('› ' + l.s, 12, 46 + i * 15); }
  s.t.needsUpdate = true;
}
function banner(s, text, sub, color) {
  const { ctx, c } = s;
  ctx.fillStyle = 'rgba(6,16,13,0.82)'; ctx.fillRect(30, c.height / 2 - 70, c.width - 60, 140);
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(30, c.height / 2 - 70, c.width - 60, 140);
  ctx.fillStyle = color; ctx.font = '800 46px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, c.width / 2, c.height / 2 + 4);
  ctx.fillStyle = '#dff3ec'; ctx.font = '500 20px "DM Mono", monospace'; ctx.fillText(sub, c.width / 2, c.height / 2 + 42); ctx.textAlign = 'left';
  s.t.needsUpdate = true;
}
function drawBoard(s, t, beat, local) {
  const { ctx, c } = s; ctx.fillStyle = '#0d1a17'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#86e7c7'; ctx.font = '700 24px "Plus Jakarta Sans", sans-serif'; ctx.fillText('weedLabs', 18, 40);
  ctx.font = '500 15px "DM Mono", monospace'; ctx.fillStyle = '#93bfb2'; ctx.fillText('squads · tonight', 18, 64);
  const squads = [['qlipper-squad', '#00c896'], ['vicca-squad', '#ffb86b'], ['wads-squad', '#00c896'], ['weedlabs-squad', '#00c896'], ['lamarpintar', '#7a9e94']];
  squads.forEach(([n, col], i) => {
    const y = 96 + i * 66; ctx.fillStyle = '#132a24'; ctx.fillRect(14, y, c.width - 28, 54);
    ctx.fillStyle = col; ctx.fillRect(14, y, 6, 54); ctx.fillStyle = '#dff3ec'; ctx.font = '600 18px "Plus Jakarta Sans", sans-serif'; ctx.fillText(n, 32, y + 24);
    let st = n === 'vicca-squad' ? (beat >= 4 ? 'still waiting…' : 'building') : n === 'lamarpintar' ? 'frozen' : beat >= 1 && local > 1 ? 'shipping' : 'idle';
    if (n === 'vicca-squad' && beat >= 4) st += ' ' + '|/-\\'[Math.floor(t * 6) % 4];
    ctx.fillStyle = '#93bfb2'; ctx.font = '500 14px "DM Mono", monospace'; ctx.fillText(st, 32, y + 44);
  });
  s.t.needsUpdate = true;
}

// ---------------------------------------------------------------- camera shots
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const SHOTS = {
  wide: { p: v(0.35, 1.6, 4.1), l: v(0.55, 1.0, 0.9), fov: 50 },
  agentClose: { p: v(0.3, 1.3, 3.65), l: v(1.1, 1.0, 1.75), fov: 40 },
  sanClose: { p: v(1.3, 1.3, 2.8), l: v(0.55, 0.82, 1.15), fov: 38 },
  monitors: { p: v(-0.25, 1.3, 0.98), l: v(0.25, 1.1, 0.2), fov: 44 },
  twoShot: { p: v(0.3, 1.4, 3.6), l: v(0.85, 1.05, 1.4), fov: 42 },
  pull: { p: v(-0.6, 2.2, 4.8), l: v(0.4, 1.0, 0.8), fov: 52 },
};
const SHOT_FOR = { s1: 'wide', a1: 'agentClose', s2: 'sanClose', a2: 'monitors', s3: 'sanClose', a3: 'twoShot', s4: 'sanClose', a4: 'agentClose', a5: 'pull' };

// ---------------------------------------------------------------- frame
const subWho = $('#sub .who'), subLine = $('#sub .line'), typed = $('#typed'), stateEl = $('#state'), clock = $('#clock'), endEl = $('#end'), caret = $('#caret');
let lastLineId = null;
function setSub(cue, p) {
  if (!cue) { subWho.style.visibility = 'hidden'; subLine.innerHTML = ''; lastLineId = null; return; }
  if (cue.id !== lastLineId) {
    lastLineId = cue.id;
    subWho.style.visibility = 'visible';
    subWho.className = 'who ' + cue.who; subWho.textContent = cue.who === 'san' ? 'San' : 'HQ agent';
    subLine.innerHTML = cue.text.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
  }
  const ws = subLine.querySelectorAll('.w'); const n = Math.ceil(p * ws.length + 0.001);
  ws.forEach((w, i) => w.classList.toggle('on', i < n));
}
const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

function renderAt(t) {
  // current cue (or the last one that started, while we are in the gap after it)
  let cur = null, active = null;
  for (const c of cues) { if (t >= c.start) cur = c; if (t >= c.start && t < c.end) active = c; }
  const beat = cur ? cur.beat : 0;
  // camera: shot of the current cue, eased in over 0.45 s from the previous shot (cut feel, but smooth)
  const idx = cur ? cues.indexOf(cur) : -1;
  const shot = SHOTS[cur ? SHOT_FOR[cur.id] : 'wide'];
  const prev = SHOTS[idx > 0 ? SHOT_FOR[cues[idx - 1].id] : 'wide'];
  const k = cur ? ease((t - cur.start) / 0.45) : 1;
  camPos.copy(prev.p).lerp(shot.p, k); camLook.copy(prev.l).lerp(shot.l, k);
  const drift = Math.sin(t * 0.35) * 0.04;          // slow handheld drift
  camera.position.set(camPos.x + drift, camPos.y + Math.sin(t * 0.5) * 0.015, camPos.z);
  camera.fov = prev.fov + (shot.fov - prev.fov) * k; camera.updateProjectionMatrix();
  camera.lookAt(camLook);

  // characters
  const sanTalk = active && active.who === 'san', agentTalk = active && active.who === 'agent';
  faceMat.map = mouthT[sanTalk && Math.floor(t * 9) % 2 ? 1 : 0];
  head.rotation.x = sanTalk ? Math.sin(t * 7) * 0.05 : Math.sin(t * 0.8) * 0.02;
  armR.rotation.x = sanTalk ? -0.9 + Math.sin(t * 5) * 0.25 : -0.5;
  armL.rotation.x = -0.55; armR.rotation.z = -0.1; armL.rotation.z = 0.1;
  if (beat === 3 && sanTalk) { head.rotation.x = 0.25; armR.rotation.x = -1.6; }                 // facepalm-ish on "can't sell"
  agent.position.y = 0.72 + Math.sin(t * 2.1) * 0.035;
  aHead.rotation.z = agentTalk ? Math.sin(t * 3) * 0.06 : 0;
  const blink = (t % 3.1) < 0.12 ? 0.15 : 1;
  eyeL.scale.y = eyeR.scale.y = blink;
  mouth.scale.x = agentTalk ? 0.6 + Math.abs(Math.sin(t * 12)) * 0.9 : 0.8;
  glowMat.emissiveIntensity = 0.55 + (agentTalk ? 0.35 + Math.sin(t * 10) * 0.08 : 0.1);
  aLight.intensity = 1.3 + (agentTalk ? 0.8 : 0);
  aArmR.rotation.z = agentTalk ? -0.5 + Math.sin(t * 4) * 0.2 : 0;
  if (beat === 4 && agentTalk) { aArmL.rotation.z = 0.9; aArmR.rotation.z = -0.9; } else aArmL.rotation.z = 0;   // proud pose on "loyal"

  // monitors
  drawTerm(scrL, t, 0, 'hq — claude');
  drawTerm(scrR, t, 140, 'squads — logs');
  drawBoard(scrV, t, beat, cur ? t - cur.start : 0);
  if (beat === 1 && cur && cur.id === 'a1') banner(scrR, '3 releases', 'before Wednesday · ready', '#00c896');
  if (beat === 2 && cur && (cur.id === 'a2')) banner(scrR, 'ADS PAUSED', 'meta · all campaigns', '#ffb86b');
  if (beat === 3 && cur && cur.id === 'a3') { const n = Math.min(100, Math.floor(ease((t - cur.start) / 2.4) * 100)); banner(scrR, `sending… ${n}%`, 'email · whole list', '#00c896'); }
  if (beat === 4) banner(scrR, 'waiting on vicca-squad', '|/-\\'[Math.floor(t * 6) % 4] + ' still building', '#ffb86b');

  // HUD: clock, chat strip, subtitles, end card
  const mins = [0, 0, 7, 19, 41, 62][beat] + Math.floor(cur ? (t - cur.start) / 6 : 0);
  clock.textContent = `${String(2 + Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')} AM`;
  const lastSan = [...cues].reverse().find((c) => c.who === 'san' && t >= c.start);
  if (lastSan) { const tp = Math.min(1, (t - lastSan.start) / Math.max(0.6, lastSan.d * 0.75)); typed.textContent = lastSan.text.toLowerCase().replace(/[?.]$/, '').slice(0, Math.ceil(lastSan.text.length * tp)); }
  else typed.textContent = '';
  stateEl.textContent = agentTalk ? 'replying…' : sanTalk ? 'listening' : 'online';
  caret.style.opacity = Math.floor(t * 2) % 2 ? 1 : 0.15;
  setSub(active, active ? (t - active.start) / Math.max(0.3, active.d * 0.92) : 0);
  const a5 = cues[cues.length - 1];
  const endK = ease((t - (a5.end - 0.2)) / 0.6);
  endEl.style.opacity = endK;
  document.getElementById('sub').style.opacity = 1 - endK;

  renderer.render(scene, camera);
}

function resize() {
  const r = $('#stage').getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- audio (Web Audio, scheduled to the cues)
let actx = null, buffers = {}, bedBuf = null, audioStart = 0, playing = false;
async function loadAudio() {
  try {
    const meta = await (await fetch('/morphy/audio/lines.json', { cache: 'no-store' })).json();
    meta.forEach((m) => { const l = LINES.find((x) => x.id === m.id); if (l && m.duration_s) l.d = m.duration_s; });
    buildTimeline();
    return meta;
  } catch (e) { return null; }
}
async function startPlayback(meta) {
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const get = async (f) => actx.decodeAudioData(await (await fetch('/morphy/audio/' + f)).arrayBuffer());
  if (meta) for (const m of meta) { try { buffers[m.id] = await get(m.file.split('/').pop()); } catch (e) {} }
  try { bedBuf = await get('bed.wav'); } catch (e) {}
  audioStart = actx.currentTime + 0.15;
  if (bedBuf) { const s = actx.createBufferSource(); s.buffer = bedBuf; s.loop = true; const g = actx.createGain(); g.gain.value = 0.22; s.connect(g).connect(actx.destination); s.start(audioStart); }
  cues.forEach((c) => { const b = buffers[c.id]; if (!b) return; const s = actx.createBufferSource(); s.buffer = b; s.connect(actx.destination); s.start(audioStart + c.start); });
  playing = true;
}

(async function boot() {
  const meta = await loadAudio();
  await document.fonts.ready.catch(() => {});
  resize();
  if (RENDER) {
    window.__render = (t) => { renderAt(t); return true; };
    window.__ready = true;
    window.__dbg = () => { const w = new THREE.Vector3(); agent.getWorldPosition(w); const pr = w.clone().project(camera); const hw = new THREE.Vector3(); aHead.getWorldPosition(hw); return { head: hw.toArray().map(n=>+n.toFixed(2)), headProj: hw.clone().project(camera).toArray().map(n=>+n.toFixed(2)), agent: w.toArray().map(n=>+n.toFixed(2)), children: agent.children.length, proj: pr.toArray().map(n=>+n.toFixed(2)), cam: camera.position.toArray().map(n=>+n.toFixed(2)), visible: agent.visible }; };
    renderAt(0);
    return;
  }
  const frozen = params.has('t') ? parseFloat(params.get('t')) : null;
  if (frozen !== null) { $('#play').hidden = true; renderAt(frozen); window.__ready = true; return; }
  renderAt(0);
  $('#play').addEventListener('click', async () => {
    $('#play').hidden = true;
    await startPlayback(meta);
    const loop = () => {
      const t = actx.currentTime - audioStart;
      renderAt(Math.max(0, t));
      if (t < TOTAL) requestAnimationFrame(loop); else { $('#play').hidden = false; $('#play').querySelector('span').textContent = '↻ Play again'; actx.close(); }
    };
    loop();
  });
  window.__ready = true;
})();
