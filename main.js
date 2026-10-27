import * as THREE from 'three';
import { gsap } from 'gsap';
import { ALBUMS, LABEL, loadFonts, makeCoverTexture, makeSpineTexture, makeDetailTextures } from './covers.js';
import { CASE, OPEN_SHIFT, JewelCase, createMaterials, setRingSize } from './jewelcase.js';
import { DEFAULTS, mountPanel, readShared } from './panel.js';

/* ------------------------------------------------------------------ *
 *  Tunables                                                           *
 * ------------------------------------------------------------------ */
const FOV = 24; // camera field of view (deg)
const TILT = 0.46; // the tower leans its top towards you (rad): upper cases look bigger
const SPACING = 0.41; // distance between cases in the tower
const FLOAT_SPEED = 0.085; // upward drift (units/s) at Float 1.0×
const SLIDE = 0.34; // how far a hovered case slides out towards you at 1.0×
const ARC = 0.35; // flights bow out towards the viewer by this much
const START = 7; // album in the middle at load (Low Orbit)

const shared = readShared();
const params = { ...DEFAULTS, ...shared };
if (matchMedia('(prefers-reduced-motion: reduce)').matches && !('floats' in shared)) params.floats = false;

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const canvas = $('gl');
const ui = {
  kicker: $('kicker'),
  title: $('cap-title'),
  sub: $('cap-sub'),
  caption: $('caption'),
  hint: $('hint'),
  dock: $('dock'),
  back: $('btn-back'),
  flip: $('btn-flip'),
  status: $('status'),
  a11y: $('a11y'),
};

/* ---------- renderer, scene, camera ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  ui.status.textContent = 'No WebGL';
  ui.hint.textContent = 'This page needs WebGL to draw the cases.';
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.LinearToneMapping; // keeps printed colours true; Exposure still applies
renderer.autoClear = false; // two passes: the tower, then the case in focus on top

// A soft photo studio for reflections: a grey gradient room, a few softboxes
// and a ring light behind the viewer (it shows up as a ring on the plastic).
function studioEnvironment() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(30, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP;
        void main() {
          float y = vP.y;
          vec3 c = y > 0.0 ? mix(vec3(0.78), vec3(1.0), smoothstep(0.0, 0.9, y)) : mix(vec3(0.78), vec3(0.36), smoothstep(0.0, 0.6, -y));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  env.add(room);
  const light = (geo, I, x, y, z) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(I, I, I), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  light(new THREE.PlaneGeometry(12, 5), 2.6, 0, 16, 3); // overhead key
  light(new THREE.PlaneGeometry(14, 4), 0.5, 0, 11, -12); // high back (sheen on the tower)
  light(new THREE.PlaneGeometry(3, 14), 2.0, -16, 2, 4); // left strip
  light(new THREE.PlaneGeometry(3, 14), 1.4, 16, 2, -2); // right strip
  light(new THREE.TorusGeometry(5, 0.32, 12, 64), 2.4, 0, 1, 18); // ring light behind the viewer
  return env;
}

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studioEnvironment(), 0.02).texture;

const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 200);
const lamp = new THREE.DirectionalLight(0xffffff, 1);
lamp.position.set(-2.5, 4, 5);
lamp.layers.enableAll();
scene.add(lamp);

const M = createMaterials(params);
const DU = M.discData.userData.DU;
DU.uLampDir.value.copy(lamp.position).normalize(); // camera never rotates, so view = world

const tower = new THREE.Group();
tower.rotation.x = TILT;
scene.add(tower);
const ghost = new THREE.Object3D(); // stand-in used to work out a slot's world pose
tower.add(ghost);

// where the case in focus lives: rig (framing) > turn (drag / float)
const rig = new THREE.Group();
const turn = new THREE.Group();
rig.add(turn);
scene.add(rig);

// the overlay: a plane in the room's colour that fades in over the tower
const veil = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({ color: params.background, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false })
);
veil.renderOrder = 999;
scene.add(veil);

const raycaster = new THREE.Raycaster();

/* ---------- framing ---------- */
const view = { w: 1, h: 1, camZ: 6, k: 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)), dClosed: 4, dOpen: 5, upp: 0.01 };
function layout() {
  const w = Math.max(1, stage.clientWidth);
  const h = Math.max(1, stage.clientHeight);
  view.w = w;
  view.h = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const { k } = view;
  const asp = camera.aspect;
  // tower: ~6 cases tall, never wider than 56% of the stage
  const visH = Math.max(2.35, CASE.W / 0.56 / asp) / params.zoom;
  view.camZ = visH / k;
  camera.position.set(0, 0, view.camZ);
  camera.updateProjectionMatrix();
  // focus: the case fills ~60% of the height; open, the spread fills ~84% of the width
  view.dClosed = Math.max(CASE.H / 0.6 / k, CASE.W / 0.66 / (k * asp)) / params.zoom;
  view.dOpen = Math.max(view.dClosed, (2 * CASE.W + 0.06) / 0.84 / (k * asp) / params.zoom);
  view.upp = visH / h / Math.cos(TILT); // tower units per screen pixel
  veil.position.z = view.camZ - 1;
}
new ResizeObserver(layout).observe(stage);

/* ---------- state ---------- */
const N = ALBUMS.length;
const LOOP = N * SPACING;
const cases = [];
const hits = [];
const state = {
  mode: 'loading', // tower | flying | focus | leaving
  offset: -START * SPACING,
  vel: 0,
  hovered: null,
  centre: null,
  focus: null,
  veil: 0,
  recede: 0,
  openView: 0,
  yaw: 0,
  pitch: 0,
  yawT: 0,
  pitchT: 0,
  lastTurn: -10,
};
let clock = 0;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const wrapY = (v) => ((((v + LOOP / 2) % LOOP) + LOOP) % LOOP) - LOOP / 2;
const slotY = (i) => wrapY(i * SPACING + state.offset);

// a case's pose in the tower: lying face up, sliding out when hovered, bobbing
function towerPose(obj, i, slide, t) {
  const f = params.floats ? 1 : 0;
  const bob = Math.sin(t * 0.9 + i * 0.8) * 0.006 * f;
  obj.position.set(0, slotY(i) + bob + slide * 0.015, slide * SLIDE * params.slideOut);
  obj.rotation.set(-Math.PI / 2 + slide * 0.06, Math.sin(t * 0.6 + i * 1.3) * 0.008 * f, 0);
}

/* ---------- build ---------- */
function buildCases() {
  for (const album of ALBUMS) {
    const c = new JewelCase(album, M, { cover: makeCoverTexture(album, renderer), spine: makeSpineTexture(album, renderer) });
    c.index = album.index;
    tower.add(c.root);
    cases.push(c);
    hits.push(c.hit);
    renderer.initTexture(c.mats.cover.map);
    renderer.initTexture(c.mats.spine.map);

    const b = document.createElement('button');
    b.textContent = `Open ${album.title} by ${album.artist}`;
    b.addEventListener('click', () => focusCase(c));
    ui.a11y.append(b);
  }
}

/* ---------- captions & hints ---------- */
let shownKey = '';
function setCaption(album, kicker) {
  const key = `${album.cat}|${kicker}`;
  if (key === shownKey) return;
  shownKey = key;
  ui.caption.classList.remove('is-in');
  void ui.caption.offsetWidth; // restart the fade
  ui.kicker.textContent = kicker;
  ui.title.textContent = album.title;
  ui.sub.textContent = `${album.artist} · ${album.cat}`;
  ui.caption.classList.add('is-in');
}
function updateUI() {
  const c = state.focus;
  const inFocus = !!c && (state.mode === 'flying' || state.mode === 'focus');
  stage.classList.toggle('is-focus', inFocus);
  ui.dock.hidden = !inFocus;
  if (inFocus) {
    setCaption(c.album, `${LABEL} · ${c.album.season}`);
    ui.hint.textContent = c.liftTarget
      ? 'Drag to turn the disc · tap it to put it back'
      : c.openTarget
        ? 'Tap the disc to lift it out · tap the case to close'
        : 'Tap the case to open · drag to turn';
    ui.flip.disabled = !c.openTarget;
  } else {
    ui.hint.textContent = 'Tap a case to open it · scroll or drag to browse';
    const a = (state.hovered || state.centre)?.album;
    if (a) setCaption(a, 'The collection');
  }
}

/* ---------- picking ---------- */
const pointer = { inside: false, ndc: new THREE.Vector2(9, 9), down: false, dragging: false, id: null, x: 0, y: 0, sx: 0, sy: 0, lt: 0, vx: 0, vy: 0 };
function setNdc(e) {
  const r = canvas.getBoundingClientRect();
  pointer.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}
function pick(layer, objects, recursive) {
  scene.updateMatrixWorld();
  raycaster.setFromCamera(pointer.ndc, camera);
  raycaster.layers.set(layer);
  return raycaster.intersectObjects(objects, recursive);
}

/* ---------- tower ---------- */
function updateTower(dt) {
  if (!pointer.dragging) {
    // drift up when left alone; scroll / fling impulses decay back to the drift
    const drift = params.floats ? FLOAT_SPEED * params.float : 0;
    const target = state.hovered ? 0 : drift;
    state.vel = damp(state.vel, target, state.hovered ? 4 : 1.6, dt);
    state.offset += state.vel * dt;
  }
  // hover
  let hovered = null;
  if (pointer.inside && !pointer.dragging) {
    const h = pick(0, hits, false)[0];
    if (h) hovered = h.object.userData.owner;
  }
  state.hovered = hovered;
  stage.style.cursor = pointer.dragging ? 'grabbing' : hovered ? 'pointer' : '';
  // the case nearest the middle names the caption when nothing is hovered
  let best = null;
  let bestD = Infinity;
  for (const c of cases) {
    const d = Math.abs(slotY(c.index));
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  state.centre = best;
  updateUI();
}

/* ---------- focus: fly in ---------- */
const _p0 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _pt = new THREE.Vector3();
const _qt = new THREE.Quaternion();
function place(obj, p0, q0, pt, qt, t) {
  obj.position.lerpVectors(p0, pt, t);
  obj.position.z += Math.sin(t * Math.PI) * ARC;
  obj.quaternion.slerpQuaternions(q0, qt, t);
}

function focusCase(c) {
  if (state.mode !== 'tower') return;
  state.mode = 'flying';
  state.focus = c;
  state.hovered = null;
  stage.style.cursor = '';
  if (!c.hasDetail) c.setDetail(makeDetailTextures(c.album, renderer));
  c.resetPose();
  c.setLayer(1);
  state.yaw = state.yawT = state.pitch = state.pitchT = 0;
  state.openView = 0;
  turn.rotation.set(0, 0, 0);

  c.root.updateWorldMatrix(true, false);
  const p0 = c.root.getWorldPosition(new THREE.Vector3());
  const q0 = c.root.getWorldQuaternion(new THREE.Quaternion());
  scene.attach(c.root);

  const fl = { t: 0 };
  gsap.to(state, { veil: 1, recede: 1, duration: params.flight * 0.75, ease: 'power2.inOut', overwrite: 'auto' });
  gsap.to(fl, {
    t: 1,
    duration: params.flight,
    ease: 'power3.inOut',
    onUpdate: () => {
      turn.updateWorldMatrix(true, false);
      turn.getWorldPosition(_pt);
      turn.getWorldQuaternion(_qt);
      place(c.root, p0, q0, _pt, _qt, fl.t);
    },
    onComplete: () => {
      turn.attach(c.root);
      c.root.position.set(0, 0, 0);
      c.root.quaternion.identity();
      state.mode = 'focus';
      updateUI();
    },
  });
  updateUI();
}

/* ---------- focus: lid, disc ---------- */
function setOpen(v) {
  const c = state.focus;
  if (!c) return;
  c.openTarget = v ? 1 : 0;
  const d = 1.05 / params.lidSpeed;
  gsap.to(c, { open: c.openTarget, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
  gsap.to(state, { openView: c.openTarget, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
  updateUI();
}
function setLift(v) {
  const c = state.focus;
  if (!c) return;
  c.liftTarget = v ? 1 : 0;
  if (!v) {
    c.discYawT = c.discPitchT = 0;
    if (c.flipTarget) {
      c.flipTarget = 0;
      gsap.to(c, { flip: 0, duration: 0.6, ease: 'power2.inOut', overwrite: 'auto' });
    }
  }
  gsap.to(c, { lift: c.liftTarget, duration: 0.95, ease: 'power3.inOut', overwrite: 'auto' });
  updateUI();
}
function flipDisc() {
  const c = state.focus;
  if (!c || state.mode !== 'focus') return;
  let delay = 0;
  if (!c.openTarget) {
    setOpen(true);
    delay += 0.8 / params.lidSpeed;
  }
  if (!c.liftTarget) {
    gsap.delayedCall(delay, () => setLift(true));
    delay += 0.55;
  }
  c.flipTarget = c.flipTarget ? 0 : 1;
  gsap.to(c, { flip: c.flipTarget, duration: 0.9, delay, ease: 'power2.inOut', overwrite: 'auto' });
  updateUI();
}

/* ---------- focus: fly home ---------- */
async function unfocus() {
  if (state.mode !== 'focus') return;
  const c = state.focus;
  state.mode = 'leaving';
  stage.classList.remove('is-focus');
  ui.dock.hidden = true;
  ui.hint.textContent = 'Tap a case to open it · scroll or drag to browse';
  if (c.liftTarget || c.lift > 0.01 || c.flip > 0.01) {
    c.liftTarget = c.flipTarget = 0;
    c.discYawT = c.discPitchT = 0;
    await gsap.to(c, { lift: 0, flip: 0, duration: 0.55, ease: 'power2.inOut', overwrite: 'auto' });
  }
  if (c.openTarget || c.open > 0.01) {
    c.openTarget = 0;
    const d = 0.75 / params.lidSpeed;
    gsap.to(state, { openView: 0, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
    await gsap.to(c, { open: 0, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
  }
  c.root.updateWorldMatrix(true, false);
  c.root.getWorldPosition(_p0);
  c.root.getWorldQuaternion(_q0);
  const p0 = _p0.clone();
  const q0 = _q0.clone();
  scene.attach(c.root);
  const fl = { t: 0 };
  gsap.to(state, { veil: 0, recede: 0, duration: params.flight * 0.85, ease: 'power2.inOut', overwrite: 'auto' });
  gsap.to(fl, {
    t: 1,
    duration: params.flight,
    ease: 'power3.inOut',
    onUpdate: () => {
      towerPose(ghost, c.index, 0, clock);
      ghost.updateWorldMatrix(true, false);
      ghost.getWorldPosition(_pt);
      ghost.getWorldQuaternion(_qt);
      place(c.root, p0, q0, _pt, _qt, fl.t);
    },
    onComplete: () => {
      tower.attach(c.root);
      c.setLayer(0);
      c.slide = 0;
      state.focus = null;
      state.vel = 0;
      state.mode = 'tower';
      shownKey = '';
      updateUI();
    },
  });
}

function updateFocus(dt) {
  const c = state.focus;
  rig.position.z = view.camZ - THREE.MathUtils.lerp(view.dClosed, view.dOpen, state.openView);
  // drag to turn; drifts home after a while when left alone
  const idle = clock - state.lastTurn > 2.2 && !pointer.dragging;
  if (idle) {
    state.yawT = damp(state.yawT, 0, 1.1, dt);
    state.pitchT = damp(state.pitchT, 0, 1.1, dt);
  }
  state.yaw = damp(state.yaw, state.yawT, 8, dt);
  state.pitch = damp(state.pitch, state.pitchT, 8, dt);
  const f = params.floats && state.mode !== 'leaving' ? 1 : 0;
  turn.rotation.set(state.pitch + Math.sin(clock * 0.7) * 0.035 * f, state.yaw + Math.sin(clock * 0.45) * 0.07 * f, 0);
  turn.position.y = Math.sin(clock * 0.9) * 0.02 * f;
  if (!c) return;
  if (c.root.parent === turn) c.root.position.x = OPEN_SHIFT * c.open;
  if (idle) {
    c.discYawT = damp(c.discYawT, 0, 1.1, dt);
    c.discPitchT = damp(c.discPitchT, 0, 1.1, dt);
  }
  c.discYaw = damp(c.discYaw, c.discYawT, 8, dt);
  c.discPitch = damp(c.discPitch, c.discPitchT, 8, dt);
  c.updatePose(dt, params.spin);
}

function turnBy(dx, dy) {
  const c = state.focus;
  state.lastTurn = clock;
  if (c.liftTarget) {
    c.discYawT += dx * 0.008;
    c.discPitchT = clamp(c.discPitchT + dy * 0.006, -1.2, 1.2);
  } else {
    state.yawT += dx * 0.0065;
    state.pitchT = clamp(state.pitchT + dy * 0.005, -0.7, 0.7);
  }
}

/* ---------- input ---------- */
function click() {
  if (state.mode === 'tower') {
    const h = pick(0, hits, false)[0];
    if (h) focusCase(h.object.userData.owner);
    return;
  }
  if (state.mode !== 'focus') return;
  const c = state.focus;
  const h = pick(1, [c.root], true).find((x) => x.object.userData.part !== 'hit');
  if (!h) return unfocus();
  const onDisc = h.object.userData.part === 'disc';
  if (c.liftTarget) return setLift(false);
  if (onDisc && c.openTarget) return setLift(true);
  setOpen(!c.openTarget);
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || pointer.down) return;
  setNdc(e);
  Object.assign(pointer, { down: true, dragging: false, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, lt: performance.now(), vx: 0, vy: 0 });
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  setNdc(e);
  pointer.inside = true;
  if (!pointer.down || e.pointerId !== pointer.id) return;
  const dx = e.clientX - pointer.x;
  const dy = e.clientY - pointer.y;
  const now = performance.now();
  const dtm = Math.max(1, now - pointer.lt);
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.lt = now;
  if (!pointer.dragging && Math.hypot(e.clientX - pointer.sx, e.clientY - pointer.sy) > 6) {
    pointer.dragging = true;
    state.hovered = null;
  }
  if (!pointer.dragging) return;
  pointer.vx = THREE.MathUtils.lerp(pointer.vx, (dx / dtm) * 1000, 0.4);
  pointer.vy = THREE.MathUtils.lerp(pointer.vy, (dy / dtm) * 1000, 0.4);
  if (state.mode === 'tower') {
    state.offset -= dy * view.upp;
    state.vel = 0;
  } else if (state.mode === 'focus' && params.dragToTurn) turnBy(dx, dy);
});
function pointerEnd(e) {
  if (!pointer.down || e.pointerId !== pointer.id) return;
  pointer.down = false;
  if (pointer.dragging) {
    pointer.dragging = false;
    // fling, unless the pointer had already stopped
    if (state.mode === 'tower' && performance.now() - pointer.lt < 90) state.vel = clamp(-pointer.vy * view.upp, -4, 4);
  } else if (e.type === 'pointerup') click();
  if (e.pointerType !== 'mouse') {
    pointer.inside = false;
    pointer.ndc.set(9, 9);
  }
}
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener('pointerleave', () => {
  if (pointer.down) return;
  pointer.inside = false;
  pointer.ndc.set(9, 9);
});
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (state.mode !== 'tower' || !params.scrollToBrowse) return;
    const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * view.h : e.deltaY;
    state.vel = clamp(state.vel + px * 0.0035, -5, 5);
  },
  { passive: false }
);
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, button, .panel')) return;
  if (state.mode === 'tower') {
    if (e.key === 'ArrowUp') state.vel = clamp(state.vel - 1.2, -5, 5);
    else if (e.key === 'ArrowDown') state.vel = clamp(state.vel + 1.2, -5, 5);
    else if (e.key === 'Enter' && state.centre) focusCase(state.centre);
  } else if (state.mode === 'focus') {
    if (e.key === 'Escape') unfocus();
    else if (e.key === ' ') {
      e.preventDefault();
      if (state.focus.liftTarget) setLift(false);
      else setOpen(!state.focus.openTarget);
    }
  }
});
const panelBtn = $('btn-panel');
panelBtn.addEventListener('click', () => {
  const on = document.body.classList.toggle('panel-open');
  panelBtn.setAttribute('aria-expanded', String(on));
});
// the panel is a floating window: drag it by its title bar
{
  const win = $('panel');
  let d = null;
  win.addEventListener('pointerdown', (e) => {
    const bar = e.target.closest('.panel__head');
    if (!bar || e.target.closest('button')) return;
    const r = win.getBoundingClientRect();
    d = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    win.style.right = 'auto';
    win.style.bottom = 'auto';
    win.style.left = `${r.left}px`;
    win.style.top = `${r.top}px`;
    win.style.height = `${r.height}px`;
    win.classList.add('is-dragging');
    bar.setPointerCapture(e.pointerId);
  });
  win.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    win.style.left = `${clamp(e.clientX - d.dx, 8, innerWidth - 120)}px`;
    win.style.top = `${clamp(e.clientY - d.dy, 8, innerHeight - 60)}px`;
  });
  const end = () => { d = null; win.classList.remove('is-dragging'); };
  win.addEventListener('pointerup', end);
  win.addEventListener('pointercancel', end);
}
ui.back.addEventListener('click', unfocus);
ui.flip.addEventListener('click', flipDisc);

/* ---------- parameters ---------- */
function luminance(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // linear
}
function apply(key) {
  const p = params;
  renderer.setClearColor(p.background);
  veil.material.color.set(p.background);
  document.documentElement.style.setProperty('--stage-bg', p.background);
  stage.classList.toggle('is-dark', luminance(p.background) < 0.18);
  renderer.toneMappingExposure = p.exposure;
  scene.environmentIntensity = p.roomLight * 0.42;
  lamp.intensity = p.lamp * 0.8;
  M.plastic.color.set(p.clearPlastic);
  M.tray.color.set(p.clearPlastic);
  M.hub.color.set(p.clearPlastic);
  M.edge.color.set(p.plasticEdges);
  M.paperEdge.color.set(p.paperEdge);
  M.U.edgeGlow.value = p.edgeGlow;
  M.U.refl.value = p.reflections;
  DU.uRainbow.value = p.rainbow;
  DU.uSat.value = p.rainbowColour;
  DU.uRing.value = p.ringLight;
  DU.uRingColor.value.set(p.ringColour);
  DU.uSpokes.value = p.spokes;
  setRingSize(DU, p.ringSize);
  M.discData.color.set(p.discSilver);
  M.discRim.color.set(p.discSilver);
  if (key === 'zoom' || key == null) layout();
}
const panel = mountPanel($('panel'), params, (key, value) => {
  if (key === 'room') {
    const bg = params.background.toUpperCase();
    if (value === 'Dark' && bg === '#FFFFFF') panel.set('background', '#111113');
    if (value === 'Light' && bg === '#111113') panel.set('background', '#FFFFFF');
  }
  apply(key);
});

/* ---------- loop ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  tick(now);
}
function tick(now) {
  const dt = Math.min(0.05, Math.max(0, now - last) / 1000);
  last = now;
  clock += dt;
  if (cases.length) {
    if (state.mode === 'tower') updateTower(dt);
    for (const c of cases) {
      if (c === state.focus) continue;
      c.slide = damp(c.slide, c === state.hovered ? 1 : 0, 9, dt);
      towerPose(c.root, c.index, c.slide, clock);
    }
    updateFocus(dt);
    tower.position.z = -1.3 * state.recede;
  }
  veil.material.opacity = state.veil;
  veil.visible = state.veil > 0.001;
  draw();
}
function draw() {
  renderer.clear();
  camera.layers.set(0);
  renderer.render(scene, camera);
  if (state.focus) {
    renderer.clearDepth();
    camera.layers.set(1);
    renderer.render(scene, camera);
  }
}

// ?debug: window.cdProbe([[x, y], ...]) renders a frame and returns pixel colours at CSS points
if (/debug/.test(location.search)) {
  window.cdProbe = (pts, steps = 30) => {
    for (let i = 0; i < steps; i++) tick(last + 16.7);
    const gl = renderer.getContext();
    const r = canvas.getBoundingClientRect();
    return pts.map(([x, y]) => {
      const b = new Uint8Array(4);
      gl.readPixels(Math.round(((x - r.left) * canvas.width) / r.width), Math.round(canvas.height - ((y - r.top) * canvas.height) / r.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
      return [b[0], b[1], b[2]];
    });
  };
  window.cdState = state;
  window.cdParams = params;
  window.cdM = M;
  window.cdCases = cases;
  // advance animations by `sec` seconds without relying on requestAnimationFrame
  window.cdAdvance = (sec) => {
    gsap.ticker.lagSmoothing(0);
    const tl = gsap.globalTimeline;
    for (let t = 0; t < sec; t += 1 / 60) {
      tl.totalTime(tl.totalTime() + 1 / 60);
      tick(last + 1000 / 60);
    }
    return state.mode;
  };
  window.cdClick = (x, y) => {
    const r = canvas.getBoundingClientRect();
    pointer.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    pointer.inside = true;
    click();
    return state.mode;
  };
}

async function start() {
  layout();
  apply(null);
  requestAnimationFrame(frame);
  await loadFonts();
  buildCases();
  state.mode = 'tower';
  ui.status.textContent = 'WebGL';
  stage.classList.add('is-ready');
  const m = location.hash.match(/album=(\d+)/);
  if (m) state.offset = -clamp(parseInt(m[1], 10) - 1, 0, N - 1) * SPACING;
}
start();
