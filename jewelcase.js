import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ *
 *  A standard CD jewel case, built from thin parts.                    *
 *  Units: 1 = 100 mm. The case is 142 x 125 x 10.4 mm.                 *
 *  Local axes: x right (hinge on the left), y up, z out of the front.  *
 * ------------------------------------------------------------------ */
export const CASE = {
  W: 1.42, H: 1.25, T: 0.104,
  SPINE: 0.09, // ribbed hinge strip on the left
  WALL: 0.012, // plastic wall thickness
  BOOK_W: 1.28, BOOK_H: 1.19, BOOK_X: 0.02, // front booklet
  DISC_R: 0.6, HOLE_R: 0.075, HUB_R: 0.165, DATA_R0: 0.235, DATA_R1: 0.585, DISC_T: 0.012,
};
const { W, H, T, SPINE, WALL, BOOK_W, BOOK_H, BOOK_X, DISC_R, HOLE_R, HUB_R, DISC_T } = CASE;
const LIP = 0.026; // width of the lid's frame
const ZB = -T / 2; // back face
const ZF = T / 2; // front face

export const LID_PIVOT = new THREE.Vector3(-W / 2 + 0.02, 0, ZF - 0.03);
export const LID_MAX = THREE.MathUtils.degToRad(172); // the lid lies almost flat when open
export const DISC_SEAT = new THREE.Vector3(0.04, 0, -0.027);
export const OPEN_SHIFT = -LID_PIVOT.x; // slide the case right so the open spread is centred

const TRAY_X0 = -W / 2 + SPINE + 0.005;
const TRAY_X1 = W / 2 - WALL - 0.003;
const TRAY_W = TRAY_X1 - TRAY_X0;
const TRAY_CX = (TRAY_X0 + TRAY_X1) / 2;
const INNER_H = H - 2 * WALL - 0.006;

function box(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/* ---------- shared geometry (built once, used by all 16 cases) ---------- */
let G = null;
function geometries() {
  if (G) return G;
  const px = LID_PIVOT.x;
  const pz = LID_PIVOT.z;
  const lidW = W - 0.012;
  const lidCX = W / 2 - lidW / 2;
  const tabZ = ZF - 0.012 - pz;

  const flapBottom = new THREE.PlaneGeometry(TRAY_W, 0.07);
  flapBottom.rotateX(Math.PI / 2); // faces -y, text reads upright from the front edge
  flapBottom.translate(TRAY_CX, -H / 2 + WALL + 0.002, ZB + 0.047);
  const flapTop = new THREE.PlaneGeometry(TRAY_W, 0.07);
  flapTop.rotateX(-Math.PI / 2);
  flapTop.rotateZ(Math.PI);
  flapTop.translate(TRAY_CX, H / 2 - WALL - 0.002, ZB + 0.047);

  const hub = new THREE.CylinderGeometry(0.07, 0.07, 0.01, 40);
  hub.rotateX(Math.PI / 2);
  hub.translate(DISC_SEAT.x, 0, -0.029);

  const ring = (r0, r1, seg, back, z) => {
    const g = new THREE.RingGeometry(r0, r1, seg, 1);
    if (back) g.rotateY(Math.PI);
    g.translate(0, 0, z);
    return g;
  };
  const tube = (r, seg) => {
    const g = new THREE.CylinderGeometry(r, r, DISC_T, seg, 1, true);
    g.rotateX(Math.PI / 2);
    return g;
  };

  G = {
    hit: new THREE.BoxGeometry(W, H, T),
    backPlate: box(W - 0.006, H - 0.006, 0.008, 0, 0, ZB + 0.004),
    baseEdges: mergeGeometries([
      box(W, WALL, T - 0.026, 0, H / 2 - WALL / 2, ZB + (T - 0.026) / 2),
      box(W, WALL, T - 0.026, 0, -H / 2 + WALL / 2, ZB + (T - 0.026) / 2),
      box(WALL, H - 2 * WALL, T - 0.026, W / 2 - WALL / 2, 0, ZB + (T - 0.026) / 2),
    ]),
    spine: box(SPINE, H - 2 * WALL, T - 0.022, -W / 2 + SPINE / 2, 0, ZB + (T - 0.022) / 2),
    inlay: box(TRAY_W, INNER_H, 0.003, TRAY_CX, 0, ZB + 0.0115),
    flapBottom,
    flapTop,
    tray: mergeGeometries([box(TRAY_W, INNER_H, 0.005, TRAY_CX, 0, ZB + 0.0155), hub]),
    lidPlate: box(lidW, H, 0.01, lidCX - px, 0, ZF - 0.005 - pz),
    lidEdges: mergeGeometries([
      // the lid's frame: wider than the walls, it reads as the grey border face-on
      box(lidW, LIP, 0.03, lidCX - px, H / 2 - LIP / 2, ZF - 0.015 - pz),
      box(lidW, LIP, 0.03, lidCX - px, -H / 2 + LIP / 2, ZF - 0.015 - pz),
      box(LIP, H - 2 * LIP, 0.03, W / 2 - LIP / 2 - px, 0, ZF - 0.015 - pz),
      // the two tabs on the opening side that hold the booklet
      box(0.05, 0.09, 0.004, W / 2 - LIP - 0.02 - px, 0.4, tabZ),
      box(0.05, 0.09, 0.004, W / 2 - LIP - 0.02 - px, -0.4, tabZ),
      // little corner tabs
      box(0.045, 0.022, 0.004, BOOK_X - BOOK_W / 2 + 0.03 - px, H / 2 - LIP - 0.007, tabZ),
      box(0.045, 0.022, 0.004, BOOK_X - BOOK_W / 2 + 0.03 - px, -H / 2 + LIP + 0.007, tabZ),
      box(0.045, 0.022, 0.004, W / 2 - LIP - 0.03 - px, H / 2 - LIP - 0.007, tabZ),
      box(0.045, 0.022, 0.004, W / 2 - LIP - 0.03 - px, -H / 2 + LIP + 0.007, tabZ),
    ]),
    booklet: box(BOOK_W, BOOK_H, 0.004, BOOK_X - px, 0, ZF - 0.016 - pz),
    discPrint: ring(HOLE_R, DISC_R, 160, false, DISC_T / 2),
    discData: ring(HUB_R, DISC_R, 160, true, -DISC_T / 2),
    discHubBack: ring(HOLE_R, HUB_R, 64, true, -DISC_T / 2),
    discRim: tube(DISC_R, 160),
    discHole: tube(HOLE_R, 48),
  };
  return G;
}

/* ---------- materials ---------- */

// Clear plastic: the body is nearly invisible, but reflections are kept at
// full strength (premultiplied blending), with a fresnel rim that thickens
// towards grazing angles, like real polystyrene.
function glass(opts, U) {
  const m = new THREE.MeshStandardMaterial({
    transparent: true,
    depthWrite: false,
    metalness: 0,
    roughness: 0.05,
    ...opts,
  });
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.OneFactor;
  m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = U.edgeGlow;
    sh.uniforms.uRefl = U.refl;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow;\nuniform float uRefl;')
      .replace(
        '#include <opaque_fragment>',
        `float facing = clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0);
        float fres = pow(1.0 - facing, 4.0);
        // keep reflections face-on, hush them at grazing angles so covers stay crisp in the tower
        float graze = smoothstep(0.18, 0.55, 1.0 - facing);
        float glassA = clamp(diffuseColor.a + fres * 0.02, 0.0, 1.0);
        vec3 glassC = totalDiffuse * glassA + totalSpecular * uRefl * mix(0.25, 0.03, graze) + totalEmissiveRadiance + vec3(uGlow * fres * 2.5);
        gl_FragColor = vec4(glassC, glassA);`
      );
  };
  m.customProgramCacheKey = () => 'cd-glass';
  return m;
}

// The ribbed hinge strip seen through the lid on the left of the cover.
function ribTexture() {
  // across the spine (0.09 wide): outer plastic, then ribs up to the booklet
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(205,211,215,0.55)';
  g.fillRect(0, 0, 256, 8);
  g.fillStyle = 'rgba(150,158,165,0.75)';
  g.fillRect(0, 0, 10, 8);
  g.fillStyle = 'rgba(245,247,248,0.8)';
  g.fillRect(10, 0, 6, 8);
  for (let i = 0; i < 9; i++) {
    const x = 104 + i * 16;
    g.fillStyle = 'rgba(78,86,94,0.85)';
    g.fillRect(x, 0, 5, 8);
    g.fillStyle = 'rgba(250,251,252,0.9)';
    g.fillRect(x + 5, 0, 5, 8);
  }
  g.fillStyle = 'rgba(120,128,135,0.8)';
  g.fillRect(250, 0, 6, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const DISC_GLSL = /* glsl */ `
varying vec3 vRad;
varying vec3 vTan;
varying float vR;
uniform vec3 uLampDir;
uniform float uRingS;
uniform float uRingA;
uniform float uRing;
uniform vec3 uRingColor;
uniform float uRainbow;
uniform float uSat;
uniform float uSpokes;
uniform vec2 uData;

// Zucconi's 6-bump fit of the visible spectrum (nm -> rgb)
vec3 cdBump(vec3 x, vec3 yo) { vec3 y = vec3(1.0) - x * x; return clamp(y - yo, 0.0, 1.0); }
vec3 cdSpectrum(float w) {
  float x = clamp((w - 400.0) / 300.0, 0.0, 1.0);
  const vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
  const vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
  const vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);
  const vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
  const vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
  const vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);
  float win = smoothstep(380.0, 420.0, w) * (1.0 - smoothstep(680.0, 730.0, w));
  return (cdBump(c1 * (x - x1), y1) + cdBump(c2 * (x - x2), y2)) * win;
}
// Diffraction off concentric tracks (1.6 um pitch). The grooves run along
// the tangent, so light is split along the radius: a bright spoke wherever
// the half vector has no tangential part, coloured by its radial part.
vec3 cdGrating(vec3 L, vec3 V, vec3 N, vec3 cdR, vec3 cdT, float sharp) {
  float nl = dot(N, L);
  if (nl <= 0.0) return vec3(0.0);
  vec3 hv = L + V;
  float along = dot(hv, cdT);
  float lobe = exp(-along * along * sharp);
  float u = abs(dot(hv, cdR));
  vec3 c = cdSpectrum(u * 1600.0) + cdSpectrum(u * 800.0) * 0.6 + cdSpectrum(u * 533.3) * 0.35;
  return c * lobe * nl;
}
`;

function discMaterial(p) {
  const DU = {
    uLampDir: { value: new THREE.Vector3(0, 0, 1) },
    uRingS: { value: 0.4 },
    uRingA: { value: 0.4 },
    uRing: { value: p.ringLight },
    uRingColor: { value: new THREE.Color(p.ringColour) },
    uRainbow: { value: p.rainbow },
    uSat: { value: p.rainbowColour },
    uSpokes: { value: p.spokes },
    uData: { value: new THREE.Vector2(CASE.DATA_R0, CASE.DATA_R1) },
  };
  setRingSize(DU, p.ringSize);
  const m = new THREE.MeshStandardMaterial({ color: p.discSilver, metalness: 1, roughness: 0.16 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, DU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRad;\nvarying vec3 vTan;\nvarying float vR;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vR = length(position.xy);
        vec2 cdRd = position.xy / max(vR, 1e-4);
        vRad = normalize(normalMatrix * vec3(cdRd, 0.0));
        vTan = normalize(normalMatrix * vec3(-cdRd.y, cdRd.x, 0.0));`
      );
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${DISC_GLSL}`).replace(
      '#include <opaque_fragment>',
      `{
        vec3 cdV = normalize(vViewPosition);
        vec3 cdN = normal;
        vec3 cdRd = normalize(vRad);
        vec3 cdTd = normalize(vTan);
        float track = smoothstep(uData.x, uData.x + 0.012, vR) * (1.0 - smoothstep(uData.y - 0.008, uData.y, vR));
        // the lamp makes a sharp spoke
        vec3 rb = uSpokes * cdGrating(uLampDir, cdV, cdN, cdRd, cdTd, 140.0) * 1.6;
        // a ring light around the viewer makes the classic rainbow halo
        for (int k = 0; k < 24; k++) {
          float a = float(k) * 0.2617994;
          vec3 L = normalize(vec3(cos(a) * uRingS, sin(a) * uRingS, 1.0));
          rb += uRing * uRingColor * cdGrating(L, cdV, cdN, cdRd, cdTd, 22.0) * 0.16;
        }
        float lum = dot(rb, vec3(0.2126, 0.7152, 0.0722));
        rb = max(mix(vec3(lum), rb, uSat), 0.0) * uRainbow * track;
        // mirror reflection of the ring light itself
        vec3 cdRefl = reflect(-cdV, cdN);
        float th = acos(clamp(cdRefl.z, -1.0, 1.0));
        vec3 ringHi = uRing * uRingColor * 0.25 * exp(-pow((th - uRingA) / 0.035, 2.0));
        outgoingLight += rb + ringHi;
      }
      #include <opaque_fragment>`
    );
  };
  m.customProgramCacheKey = () => 'cd-disc';
  m.userData.DU = DU;
  return m;
}

export function setRingSize(DU, size) {
  const a = 0.12 + size * 0.75; // angular radius of the ring light (rad)
  DU.uRingA.value = a;
  DU.uRingS.value = Math.tan(a);
}

// One set of materials shared by every case, so the panel can tune them live.
export function createMaterials(p) {
  const U = { edgeGlow: { value: p.edgeGlow }, refl: { value: p.reflections } };
  return {
    U,
    hit: new THREE.MeshBasicMaterial({ visible: false }),
    plastic: glass({ color: p.clearPlastic, opacity: 0.005, roughness: 0.04 }, U),
    tray: glass({ color: p.clearPlastic, opacity: 0.08, roughness: 0.08 }, U),
    hub: glass({ color: p.clearPlastic, opacity: 0.04, roughness: 0.08, side: THREE.DoubleSide }, U),
    edge: glass({ color: p.plasticEdges, opacity: 0.58, roughness: 0.18 }, U),
    ribs: glass({ color: '#ffffff', map: ribTexture(), opacity: 1, roughness: 0.2 }, U),
    paperEdge: new THREE.MeshStandardMaterial({ color: p.paperEdge, roughness: 0.85 }),
    discRim: new THREE.MeshStandardMaterial({ color: p.discSilver, metalness: 1, roughness: 0.3 }),
    discData: discMaterial(p),
  };
}

const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- one case ---------- */
export class JewelCase {
  constructor(album, M, tex) {
    this.album = album;
    const g = geometries();
    const root = (this.root = new THREE.Group());

    // animated state (tweened from main.js)
    this.slide = 0; // hover slide-out in the tower
    this.open = 0; // lid 0..1
    this.lift = 0; // disc out of the tray 0..1
    this.flip = 0; // disc turned over 0..1
    this.openTarget = 0;
    this.liftTarget = 0;
    this.flipTarget = 0;
    this.discYaw = this.discYawT = 0;
    this.discPitch = this.discPitchT = 0;
    this.spinAngle = 0;
    this.hasDetail = false;

    const tint = new THREE.Color(album.bg);
    this.mats = {
      cover: new THREE.MeshPhysicalMaterial({ map: tex.cover, roughness: 0.6, specularIntensity: 0.3 }),
      liner: new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 }),
      inlayFront: new THREE.MeshStandardMaterial({ color: tint, roughness: 0.7 }),
      inlayBack: new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 }),
      spine: new THREE.MeshStandardMaterial({ map: tex.spine, roughness: 0.6 }),
      print: new THREE.MeshStandardMaterial({ color: tint, roughness: 0.42, alphaTest: 0.5 }),
    };
    const pe = M.paperEdge;
    const add = (geo, mat, parent = root, part = 'case') => {
      const m = new THREE.Mesh(geo, mat);
      m.userData.part = part;
      parent.add(m);
      return m;
    };

    this.hit = add(g.hit, M.hit, root, 'hit');

    // base: back plate, printed inlay, clear tray, walls, ribbed hinge
    add(g.backPlate, M.plastic);
    add(g.inlay, [pe, pe, pe, pe, this.mats.inlayFront, this.mats.inlayBack]);
    add(g.flapBottom, this.mats.spine);
    add(g.flapTop, this.mats.spine);
    add(g.tray, M.tray);
    add(g.baseEdges, M.edge);
    add(g.spine, [M.edge, M.edge, M.edge, M.edge, M.ribs, M.edge]);

    // lid: hinged on the left, carries the booklet
    const lid = (this.lid = new THREE.Group());
    lid.position.copy(LID_PIVOT);
    root.add(lid);
    add(g.booklet, [pe, pe, pe, pe, this.mats.cover, this.mats.liner], lid);
    add(g.lidPlate, M.plastic, lid);
    add(g.lidEdges, M.edge, lid);

    // disc: mount (position, flip) > spin > meshes
    this.discMount = new THREE.Group();
    this.discMount.position.copy(DISC_SEAT);
    root.add(this.discMount);
    this.discSpin = new THREE.Group();
    this.discMount.add(this.discSpin);
    add(g.discPrint, this.mats.print, this.discSpin, 'disc');
    add(g.discData, M.discData, this.discSpin, 'disc');
    add(g.discHubBack, M.hub, this.discSpin, 'disc');
    add(g.discRim, M.discRim, this.discSpin, 'disc');
    add(g.discHole, M.hub, this.discSpin, 'disc');

    root.traverse((o) => (o.userData.owner = this));
  }

  // inside page, tray inlay, back inlay and disc label: made on first open
  setDetail(t) {
    const set = (m, map) => {
      m.map = map;
      m.color.set('#ffffff');
      m.needsUpdate = true;
    };
    set(this.mats.liner, t.liner);
    set(this.mats.inlayFront, t.inlay);
    set(this.mats.inlayBack, t.back);
    set(this.mats.print, t.disc);
    this.hasDetail = true;
  }

  setLayer(n) {
    this.root.traverse((o) => o.layers.set(n));
  }

  // lid, disc lift, flip and spin; called every frame while in focus
  updatePose(dt, spin) {
    this.lid.rotation.y = -this.open * LID_MAX;
    const e = this.lift;
    const cx = -this.root.position.x; // centre of the view, in case space
    this.discMount.position.set(
      lerp(DISC_SEAT.x, cx, e),
      0,
      lerp(DISC_SEAT.z, 0.62, e) + Math.sin(e * Math.PI) * 0.12
    );
    this.discMount.rotation.set(this.discPitch * e, this.flip * Math.PI + this.discYaw * e, 0);
    this.spinAngle += dt * spin * 2.4 * e;
    this.discSpin.rotation.z = this.spinAngle;
  }

  resetPose() {
    this.open = this.lift = this.flip = 0;
    this.openTarget = this.liftTarget = this.flipTarget = 0;
    this.discYaw = this.discYawT = this.discPitch = this.discPitchT = 0;
    this.root.position.x = 0;
    this.updatePose(0, 0);
  }
}
