import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  The sixteen sample albums, and everything printed on paper:         *
 *  front booklet, inside page, tray inlay, back inlay, disc label      *
 *  and spine strip. All drawn with Canvas 2D, no image files.          *
 * ------------------------------------------------------------------ */
export const LABEL = 'Moonfold Records';
export const YEAR = 2026;
const TAU = Math.PI * 2;

/* ---------- helpers ---------- */
function hash(str) {
  let h = 2166136261;
  for (const ch of str) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function isDark(hex) {
  const [r, g, b] = rgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}
function setFont(g, o) {
  const { size, weight = 600, family = 'Inter', style = 'normal', stretch = 'normal', spacing = 0 } = o;
  g.font = `${style} ${weight} ${Math.round(size * 10) / 10}px ${family}`;
  if ('fontStretch' in g) g.fontStretch = stretch;
  if ('letterSpacing' in g) g.letterSpacing = `${spacing * size}px`;
}
function text(g, str, x, y, o) {
  setFont(g, o);
  g.fillStyle = o.color || '#fff';
  g.textAlign = o.align || 'left';
  g.textBaseline = o.baseline || 'alphabetic';
  g.globalAlpha = o.alpha ?? 1;
  g.fillText(str, x, y);
  g.globalAlpha = 1;
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  if ('fontStretch' in g) g.fontStretch = 'normal';
}
function wrap(g, str, x, y, maxW, lineH, o) {
  setFont(g, o);
  const words = str.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      text(g, line, x, y, o);
      line = w;
      y += lineH;
    } else line = test;
  }
  if (line) text(g, line, x, y, o);
  return y;
}
function circle(g, x, y, r, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
function blob(g, x, y, r, color, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(color, a));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
// characters along an arc; `bottom` arcs read left to right along the underside
function arcText(g, str, cx, cy, r, mid, o) {
  setFont(g, { ...o, spacing: 0 });
  g.fillStyle = o.color || '#fff';
  g.globalAlpha = o.alpha ?? 1;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const sp = (o.spacing || 0) * o.size;
  const chars = [...str];
  const cw = chars.map((ch) => g.measureText(ch).width);
  const total = cw.reduce((s, x) => s + x + sp, 0) - sp;
  const dir = o.bottom ? -1 : 1;
  let a = mid - (dir * total) / 2 / r;
  chars.forEach((ch, i) => {
    const ac = a + (dir * cw[i]) / 2 / r;
    g.save();
    g.translate(cx + Math.cos(ac) * r, cy + Math.sin(ac) * r);
    g.rotate(ac + (dir * Math.PI) / 2);
    g.fillText(ch, 0, 0);
    g.restore();
    a += (dir * (cw[i] + sp)) / r;
  });
  g.globalAlpha = 1;
}
let GRAIN = null;
function grain(g, w, h, amount = 0.06) {
  if (!GRAIN) {
    GRAIN = makeCanvas(256, 256);
    const gg = GRAIN.getContext('2d');
    const id = gg.createImageData(256, 256);
    const r = rng(7);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = r() * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    gg.putImageData(id, 0, 0);
  }
  g.save();
  g.globalAlpha = amount;
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = g.createPattern(GRAIN, 'repeat');
  g.fillRect(0, 0, w, h);
  g.restore();
}
// a leafy stem: fern fronds, palm fronds
function frond(g, x, y, len, ang, color, rnd, { leaf = 0.16, spread = 1.05, bendAmt = 0.5, width = 0.13 } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = Math.max(2, len * 0.012);
  const bend = (rnd() - 0.5) * bendAmt;
  const P = (t) => [len * t, Math.sin(t * Math.PI * 0.5) * bend * len * t];
  g.beginPath();
  for (let i = 0; i <= 20; i++) {
    const [px, py] = P(i / 20);
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
  }
  g.stroke();
  for (let t = 0.12; t < 0.97; t += 0.055) {
    const [px, py] = P(t);
    const l = len * leaf * (1 - t * 0.75);
    for (const s of [-1, 1]) {
      g.save();
      g.translate(px, py);
      g.rotate(s * spread + bend * t);
      g.beginPath();
      g.ellipse(l * 0.5, 0, l * 0.5, l * width, 0, 0, TAU);
      g.fill();
      g.restore();
    }
  }
  g.restore();
}

/* ---------- the cover paintings ---------- */
// Each painter fills w x h. `words` = false gives the art alone (for the
// disc label, the tray inlay and the inside page).

function tidal(g, w, h, a, words) {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#86c6e8');
  sky.addColorStop(0.55, '#f2cfd6');
  sky.addColorStop(1, '#fbe2cf');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h * 0.6);
  const sun = g.createRadialGradient(w * 0.7, h * 0.33, 0, w * 0.7, h * 0.33, h * 0.16);
  sun.addColorStop(0, 'rgba(255,249,236,1)');
  sun.addColorStop(0.42, 'rgba(255,244,226,0.98)');
  sun.addColorStop(0.5, 'rgba(255,236,214,0.4)');
  sun.addColorStop(1, 'rgba(255,236,214,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h * 0.6);
  const sea = g.createLinearGradient(0, h * 0.5, 0, h * 0.58);
  sea.addColorStop(0, '#79c3da');
  sea.addColorStop(1, '#a8dae6');
  g.fillStyle = sea;
  g.fillRect(0, h * 0.5, w, h * 0.08);
  g.fillStyle = '#f7efe4';
  g.fillRect(0, h * 0.58, w, h * 0.06);
  g.fillStyle = 'rgba(0,0,0,0.07)';
  g.fillRect(0, h * 0.634, w, h * 0.006);
  const pool = g.createLinearGradient(0, h * 0.64, 0, h);
  pool.addColorStop(0, '#5cc9e4');
  pool.addColorStop(1, '#1e88bd');
  g.fillStyle = pool;
  g.fillRect(0, h * 0.64, w, h * 0.36);
  g.strokeStyle = 'rgba(255,255,255,0.10)';
  g.lineWidth = 2;
  for (let x = 0; x < w; x += w / 14) {
    g.beginPath();
    g.moveTo(x, h * 0.64);
    g.lineTo(x, h);
    g.stroke();
  }
  g.strokeStyle = '#ffffff';
  g.lineWidth = h * 0.004;
  g.lineCap = 'round';
  for (let k = 0; k < 12; k++) {
    const y0 = h * 0.67 + k * h * 0.028;
    g.globalAlpha = k % 3 === 0 ? 0.55 : 0.28;
    g.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const y = y0 + Math.sin(x * 0.018 + k * 1.7) * h * 0.006 + Math.sin(x * 0.043 + k) * h * 0.003;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  // pool ring
  g.lineWidth = h * 0.032;
  g.strokeStyle = '#ff8fa6';
  g.beginPath();
  g.arc(w * 0.64, h * 0.82, h * 0.06, 0, TAU);
  g.stroke();
  g.strokeStyle = '#ffffff';
  g.setLineDash([h * 0.04, h * 0.055]);
  g.beginPath();
  g.arc(w * 0.64, h * 0.82, h * 0.06, 0, TAU);
  g.stroke();
  g.setLineDash([]);
  const rnd = rng(11);
  g.globalAlpha = 0.92;
  for (const [ang, len] of [[0.25, 0.5], [0.7, 0.46], [1.15, 0.4], [-0.1, 0.38]]) {
    frond(g, -w * 0.03, -h * 0.03, h * len, ang, '#2f6d68', rnd, { leaf: 0.28, spread: 1.25, width: 0.09 });
  }
  g.globalAlpha = 1;
  if (words) {
    text(g, 'Tidal House', w * 0.93, h * 0.12, { size: h * 0.055, weight: 600, color: '#ffffff', align: 'right' });
    text(g, a.artist, w * 0.93, h * 0.165, { size: h * 0.03, weight: 500, color: '#ffffff', align: 'right', alpha: 0.88 });
  }
}

function neon(g, w, h, a, words) {
  g.fillStyle = '#0d0a1f';
  g.fillRect(0, 0, w, h);
  const hz = h * 0.66;
  const glow = g.createLinearGradient(0, hz - h * 0.3, 0, hz);
  glow.addColorStop(0, 'rgba(255,79,216,0)');
  glow.addColorStop(1, 'rgba(255,79,216,0.3)');
  g.fillStyle = glow;
  g.fillRect(0, hz - h * 0.3, w, h * 0.3);
  g.strokeStyle = 'rgba(255,79,216,0.6)';
  g.lineWidth = 2;
  for (let i = -14; i <= 14; i++) {
    g.beginPath();
    g.moveTo(w / 2 + i * w * 0.02, hz);
    g.lineTo(w / 2 + i * w * 0.16, h);
    g.stroke();
  }
  for (let k = 0; k <= 8; k++) {
    const y = hz + (h - hz) * Math.pow(k / 8, 1.8);
    g.globalAlpha = 0.25 + (0.6 * k) / 8;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  g.globalAlpha = 1;
  const rnd = rng(hash(a.title));
  for (const [tx, ty, tr] of [[0.22, 0.48, 0.12], [0.53, 0.43, 0.16], [0.82, 0.5, 0.11]]) {
    const x = w * tx;
    const y = h * ty;
    const r = h * tr;
    g.shadowColor = '#4ff0ff';
    g.shadowBlur = 18;
    g.strokeStyle = '#7ff6ff';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x, y + r);
    g.lineTo(x, hz);
    g.stroke();
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.stroke();
    g.shadowColor = '#ff4fd8';
    g.shadowBlur = 26;
    for (let f = 0; f < 7; f++) {
      const ang = rnd() * TAU;
      const d = Math.sqrt(rnd()) * r * 0.72;
      circle(g, x + Math.cos(ang) * d, y + Math.sin(ang) * d, r * 0.09, f % 3 ? '#ff6ae0' : '#ffd84f');
    }
  }
  g.shadowBlur = 0;
  if (words) {
    g.shadowColor = '#ff4fd8';
    g.shadowBlur = 24;
    text(g, 'NEON ORCHARD', w * 0.07, h * 0.14, { size: h * 0.068, weight: 800, family: "'Archivo'", stretch: 'expanded', spacing: 0.04, color: '#ffffff' });
    g.shadowBlur = 0;
    text(g, a.artist.toUpperCase(), w * 0.07, h * 0.19, { size: h * 0.026, weight: 600, spacing: 0.25, color: '#7ff6ff' });
  }
}

function velvet(g, w, h, a, words) {
  const bg = g.createRadialGradient(w * 0.35, h * 0.3, 0, w * 0.5, h * 0.5, h * 0.95);
  bg.addColorStop(0, '#3448c4');
  bg.addColorStop(0.5, '#1a2380');
  bg.addColorStop(1, '#090c33');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const rnd = rng(31);
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const l = 4 + rnd() * rnd() * 120;
    g.fillStyle = rnd() < 0.7 ? `rgba(255,255,255,${0.04 + rnd() * 0.16})` : `rgba(140,160,255,${0.1 + rnd() * 0.25})`;
    g.fillRect(x, y, l, 1.5 + rnd() * 1.5);
  }
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
  const pts = [[w * 0.66, -h * 0.02]];
  while (pts[pts.length - 1][1] < h * 1.02) {
    const [x, y] = pts[pts.length - 1];
    pts.push([x + (rnd() - 0.6) * w * 0.09, y + h * (0.04 + rnd() * 0.06)]);
  }
  const strokeBolt = (p, width) => {
    g.beginPath();
    p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineWidth = width;
    g.stroke();
  };
  g.lineJoin = 'miter';
  g.shadowColor = '#a9b8ff';
  g.shadowBlur = 34;
  g.strokeStyle = 'rgba(220,228,255,0.9)';
  strokeBolt(pts, h * 0.008);
  for (const s of [3, 7, 11]) {
    if (!pts[s]) continue;
    const br = [pts[s]];
    for (let k = 0; k < 4; k++) {
      const [x, y] = br[br.length - 1];
      br.push([x + (rnd() - 0.2) * w * 0.07, y + h * (0.03 + rnd() * 0.04)]);
    }
    strokeBolt(br, h * 0.003);
  }
  g.shadowBlur = 0;
  g.strokeStyle = '#ffffff';
  strokeBolt(pts, h * 0.003);
  if (words) {
    const o = { size: h * 0.13, weight: 900, family: "'Archivo'", stretch: 'condensed', spacing: -0.01, color: '#ffffff' };
    text(g, 'VELVET', w * 0.07, h * 0.18, o);
    text(g, 'STATIC', w * 0.07, h * 0.3, o);
    text(g, a.artist, w * 0.075, h * 0.355, { size: h * 0.03, weight: 500, color: '#dfe4ff', alpha: 0.85 });
  }
}

function moons(g, w, h, a, words) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#232a4d');
  bg.addColorStop(1, '#141833');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const rnd = rng(41);
  for (let i = 0; i < 220; i++) {
    g.globalAlpha = 0.2 + rnd() * 0.7;
    circle(g, rnd() * w, rnd() * h, 0.6 + rnd() * 1.8, '#f3ead2');
  }
  g.globalAlpha = 1;
  // big crescent rising in the corner
  circle(g, w * 0.86, h * 0.98, h * 0.3, '#f3ead2');
  circle(g, w * 0.86 - h * 0.11, h * 0.98 - h * 0.05, h * 0.3, '#151934');
  const cy = h * 0.55;
  const r = h * 0.058;
  const gap = w * 0.16;
  const x0 = w / 2 - gap * 2;
  g.strokeStyle = 'rgba(243,234,210,0.25)';
  g.setLineDash([3, 9]);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, cy);
  g.lineTo(w, cy);
  g.stroke();
  g.setLineDash([]);
  [-1.5, -0.8, 0, 0.8, 1.5].forEach((ph, i) => {
    const x = x0 + i * gap;
    circle(g, x, cy, r, '#f3ead2');
    if (ph !== 0) {
      g.save();
      g.beginPath();
      g.arc(x, cy, r + 1, 0, TAU);
      g.clip();
      circle(g, x + ph * r, cy, r * 1.03, '#1d2343');
      g.restore();
    }
    g.strokeStyle = 'rgba(243,234,210,0.4)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, cy, r, 0, TAU);
    g.stroke();
  });
  if (words) {
    text(g, 'Paper Moons', w / 2, h * 0.27, { size: h * 0.11, weight: 400, family: "'Instrument Serif'", color: '#f3ead2', align: 'center' });
    text(g, a.artist.toUpperCase(), w / 2, h * 0.335, { size: h * 0.024, weight: 600, spacing: 0.3, color: '#f3ead2', align: 'center', alpha: 0.7 });
  }
}

function poppy(g, x, y, r, rot) {
  for (let k = 0; k < 5; k++) {
    const an = rot + (k * TAU) / 5;
    g.fillStyle = k % 2 ? 'rgba(232,97,58,0.92)' : 'rgba(214,64,44,0.92)';
    g.beginPath();
    g.ellipse(x + Math.cos(an) * r * 0.45, y + Math.sin(an) * r * 0.45, r * 0.62, r * 0.5, an, 0, TAU);
    g.fill();
  }
  circle(g, x, y, r * 0.22, '#2b2320');
  for (let k = 0; k < 10; k++) {
    const an = (k * TAU) / 10;
    circle(g, x + Math.cos(an) * r * 0.32, y + Math.sin(an) * r * 0.32, r * 0.04, '#2b2320');
  }
}
function cornflower(g, x, y, r, rot) {
  for (let k = 0; k < 12; k++) {
    const an = rot + (k * TAU) / 12;
    g.fillStyle = k % 2 ? '#3f62c8' : '#5677d6';
    g.beginPath();
    g.moveTo(x + Math.cos(an - 0.18) * r * 0.2, y + Math.sin(an - 0.18) * r * 0.2);
    g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
    g.lineTo(x + Math.cos(an + 0.18) * r * 0.2, y + Math.sin(an + 0.18) * r * 0.2);
    g.fill();
  }
  circle(g, x, y, r * 0.2, '#2a3f8f');
}
function daisy(g, x, y, r, rot) {
  for (let k = 0; k < 14; k++) {
    const an = rot + (k * TAU) / 14;
    g.fillStyle = '#fffdf6';
    g.strokeStyle = 'rgba(0,0,0,0.07)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(x + Math.cos(an) * r * 0.55, y + Math.sin(an) * r * 0.55, r * 0.45, r * 0.12, an, 0, TAU);
    g.fill();
    g.stroke();
  }
  circle(g, x, y, r * 0.24, '#f0b429');
}
function wildflower(g, w, h, a, words) {
  g.fillStyle = '#f1ece0';
  g.fillRect(0, 0, w, h);
  const rnd = rng(51);
  for (let i = 0; i < 300; i++) {
    g.strokeStyle = `rgba(120,100,70,${0.03 + rnd() * 0.05})`;
    g.lineWidth = 1;
    const x = rnd() * w;
    const y = rnd() * h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 30);
    g.stroke();
  }
  for (let i = 0; i < 7; i++) {
    frond(g, rnd() * w, h * (0.45 + rnd() * 0.65), h * (0.25 + rnd() * 0.2), -Math.PI / 2 + (rnd() - 0.5) * 1.4, rnd() < 0.5 ? '#5f7d4b' : '#7d9561', rnd);
  }
  const fl = [];
  for (let i = 0; i < 24; i++) {
    fl.push({ x: w * (0.04 + rnd() * 0.92), y: h * (0.25 + rnd() * 0.73), r: h * (0.035 + rnd() * 0.045), kind: Math.floor(rnd() * 3), rot: rnd() * TAU, bend: (rnd() - 0.5) * 80 });
  }
  g.strokeStyle = '#6b8a55';
  g.lineWidth = 3;
  for (const f of fl) {
    g.beginPath();
    g.moveTo(f.x, f.y);
    g.quadraticCurveTo(f.x + f.bend, f.y + h * 0.15, f.x + f.bend * 0.4, f.y + h * 0.35);
    g.stroke();
  }
  for (const f of fl) [poppy, cornflower, daisy][f.kind](g, f.x, f.y, f.r, f.rot);
  if (words) {
    text(g, 'Wildflower Hymns', w / 2, h * 0.12, { size: h * 0.07, weight: 400, style: 'italic', family: "'Instrument Serif'", color: '#5a4636', align: 'center' });
    text(g, a.artist.toUpperCase(), w / 2, h * 0.165, { size: h * 0.022, weight: 600, spacing: 0.3, color: '#8a7663', align: 'center' });
  }
}

function soft(g, w, h, a, words) {
  g.fillStyle = '#f3f1ec';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#161616';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(w * 0.07, h * 0.3);
  g.lineTo(w * 0.93, h * 0.3);
  g.stroke();
  g.beginPath();
  g.arc(w * 0.68, h * 0.56, h * 0.24, 0, TAU);
  g.stroke();
  g.beginPath();
  g.moveTo(w * 0.4, h * 0.9);
  g.lineTo(w * 0.96, h * 0.24);
  g.stroke();
  g.fillStyle = '#e2402f';
  g.fillRect(w * 0.07, h * 0.07, h * 0.14, h * 0.14);
  text(g, '08', w * 0.035, h * 0.98, { size: h * 0.6, weight: 900, family: "'Archivo'", spacing: -0.05, color: '#141414' });
  if (words) {
    text(g, 'Soft Machines', w * 0.93, h * 0.115, { size: h * 0.036, weight: 600, color: '#141414', align: 'right' });
    text(g, a.artist, w * 0.93, h * 0.16, { size: h * 0.026, weight: 400, color: '#141414', align: 'right', alpha: 0.7 });
  }
}

function glassHours(g, w, h, a, words) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#2c1f72');
  bg.addColorStop(1, '#120c38');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.filter = `blur(${Math.round(h * 0.06)}px)`;
  circle(g, w * 0.34, h * 0.6, h * 0.3, '#ff5fa8');
  circle(g, w * 0.72, h * 0.42, h * 0.26, '#ff9a4a');
  circle(g, w * 0.56, h * 0.84, h * 0.24, '#7a5cff');
  circle(g, w * 0.18, h * 0.22, h * 0.16, '#5a7bff');
  g.filter = 'none';
  blob(g, w * 0.5, h * 0.5, h * 0.25, '#ffd2a8', 0.35);
  if (words) {
    text(g, 'Glass Hours', w * 0.06, h * 0.6, { size: h * 0.16, weight: 400, style: 'italic', family: "'Instrument Serif'", color: '#ffffff' });
    text(g, a.artist, w * 0.07, h * 0.92, { size: h * 0.03, weight: 500, color: '#ffffff', alpha: 0.85 });
  }
}

function orbit(g, w, h, a, words) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#474c6f');
  bg.addColorStop(1, '#2e3250');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const cx = w * 0.6;
  const cy = h * 0.37;
  g.strokeStyle = 'rgba(255,255,255,0.17)';
  g.lineWidth = Math.max(1.5, h * 0.0022);
  for (let r = h * 0.075; r < h * 1.7; r += h * 0.048) {
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
  }
  const pl = g.createRadialGradient(cx - h * 0.015, cy - h * 0.015, 0, cx, cy, h * 0.047);
  pl.addColorStop(0, '#ffffff');
  pl.addColorStop(1, '#e3e6f2');
  circle(g, cx, cy, h * 0.047, pl);
  circle(g, w * 0.42, h * 0.63, h * 0.029, '#e8876a');
  if (words) {
    text(g, 'LOW ORBIT', w * 0.11, h * 0.86, { size: h * 0.072, weight: 700, family: "'Archivo'", stretch: 'expanded', spacing: 0.08, color: '#ffffff' });
    text(g, a.artist, w * 0.11, h * 0.92, { size: h * 0.032, weight: 500, color: '#ffffff', alpha: 0.85 });
    text(g, '08', w * 0.94, h * 0.95, { size: h * 0.018, weight: 600, color: '#ffffff', align: 'right', alpha: 0.6 });
  }
}

function tigers(g, w, h, a, words) {
  g.fillStyle = '#f2a57f';
  g.fillRect(0, 0, w, h);
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(-0.62);
  g.fillStyle = '#3e414b';
  const sw = w * 0.075;
  for (let x = -w * 1.2; x < w * 1.2; x += sw * 2) g.fillRect(x, -h * 1.2, sw, h * 2.4);
  g.restore();
  g.fillStyle = '#f7f4ef';
  g.fillRect(0, h * 0.3, w, h * 0.145);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.fillRect(0, h * 0.445, w, h * 0.006);
  if (words) {
    text(g, 'PAPER TIGERS', w / 2, h * 0.4, { size: h * 0.078, weight: 800, style: 'italic', family: "'Archivo'", stretch: 'expanded', spacing: 0.12, color: '#4a4c55', align: 'center' });
    g.fillStyle = '#3e414b';
    g.fillRect(w * 0.07, h * 0.88, w * 0.26, h * 0.05);
    text(g, a.artist.toUpperCase(), w * 0.085, h * 0.913, { size: h * 0.022, weight: 700, spacing: 0.2, color: '#f7f4ef' });
  }
}

function nightbus(g, w, h, a, words) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#41444b');
  bg.addColorStop(1, '#25272c');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const s = w * 0.022;
  for (let y = s / 2; y < h; y += s) {
    for (let x = s / 2; x < w; x += s) {
      const t = 0.5 + 0.5 * Math.sin(x * 0.004 + y * 0.003);
      circle(g, x, y, s * (0.08 + 0.2 * t * (y / h)), 'rgba(230,232,240,0.32)');
    }
  }
  for (let k = 0; k < 5; k++) {
    g.fillStyle = '#e7df4a';
    g.fillRect(w * 0.1 + k * w * 0.075, h * 0.34, w * 0.05, h * 0.013);
  }
  if (words) {
    text(g, 'night bus', w * 0.08, h * 0.54, { size: h * 0.11, weight: 700, family: "'Archivo'", stretch: 'expanded', spacing: 0.05, color: '#ffffff' });
    text(g, a.artist, w * 0.082, h * 0.61, { size: h * 0.03, weight: 500, color: '#cfd2da' });
  }
}

function lemon(g, w, h, a, words) {
  g.fillStyle = '#f2f4c6';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(140,150,40,0.16)';
  g.lineWidth = 2;
  for (let x = 0; x < w; x += w * 0.045) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let y = 0; y < h; y += w * 0.045) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  g.strokeStyle = '#ffffff';
  g.lineWidth = h * 0.012;
  g.strokeRect(w * 0.06, h * 0.06, w * 0.88, h * 0.88);
  const cx = w * 0.64;
  const cy = h * 0.6;
  const r = h * 0.19;
  circle(g, cx, cy, r, '#e9d93a');
  circle(g, cx, cy, r * 0.9, '#fbf6d8');
  for (let k = 0; k < 10; k++) {
    const a0 = (k * TAU) / 10 + 0.05;
    const a1 = ((k + 1) * TAU) / 10 - 0.05;
    g.fillStyle = '#f6e45a';
    g.beginPath();
    g.moveTo(cx + Math.cos((a0 + a1) / 2) * r * 0.1, cy + Math.sin((a0 + a1) / 2) * r * 0.1);
    g.arc(cx, cy, r * 0.82, a0, a1);
    g.closePath();
    g.fill();
  }
  if (words) {
    text(g, 'Lemon Light', w * 0.11, h * 0.2, { size: h * 0.062, weight: 600, color: '#6f7420' });
    text(g, a.artist, w * 0.11, h * 0.25, { size: h * 0.03, weight: 400, color: '#6f7420', alpha: 0.8 });
  }
}

function cobalt(g, w, h, a, words) {
  g.fillStyle = '#1f47d6';
  g.fillRect(0, 0, w, h);
  const rnd = rng(121);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const x = w * (0.1 + i * 0.2 + (j % 2) * 0.1);
      const y = h * (0.08 + j * 0.19);
      const r = h * (0.05 + rnd() * 0.035);
      const petals = 6 + Math.floor(rnd() * 4);
      const rot = rnd() * TAU;
      for (let k = 0; k < petals; k++) {
        const an = rot + (k * TAU) / petals;
        g.fillStyle = rnd() < 0.25 ? '#b9c9ff' : 'rgba(255,255,255,0.94)';
        g.beginPath();
        g.ellipse(x + Math.cos(an) * r * 0.55, y + Math.sin(an) * r * 0.55, r * 0.5, r * 0.22, an, 0, TAU);
        g.fill();
      }
      circle(g, x, y, r * 0.2, '#1f47d6');
      circle(g, x, y, r * 0.08, '#ffffff');
    }
  }
  if (words) {
    g.fillStyle = '#1f47d6';
    g.fillRect(0, h * 0.83, w, h * 0.17);
    text(g, 'COBALT GARDEN', w * 0.07, h * 0.92, { size: h * 0.055, weight: 800, family: "'Archivo'", stretch: 'expanded', spacing: 0.06, color: '#ffffff' });
    text(g, a.artist, w * 0.93, h * 0.92, { size: h * 0.028, weight: 500, color: '#ffffff', align: 'right', alpha: 0.85 });
  }
}

function sundown(g, w, h, a, words) {
  const bands = ['#2b1838', '#4d1f47', '#8a2d52', '#d9534f', '#f39a4c', '#f9d27a'];
  const bh = (h * 0.7) / bands.length;
  bands.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(0, i * bh, w, bh + 1);
  });
  const sun = g.createLinearGradient(0, h * 0.5, 0, h * 0.7);
  sun.addColorStop(0, '#ffe29a');
  sun.addColorStop(1, '#ff8a5c');
  g.save();
  g.beginPath();
  g.rect(0, 0, w, h * 0.7);
  g.clip();
  circle(g, w * 0.5, h * 0.7, h * 0.2, sun);
  g.restore();
  g.fillStyle = '#d9534f';
  for (let k = 0; k < 4; k++) g.fillRect(0, h * (0.6 + k * 0.026), w, h * (0.004 + k * 0.003));
  g.fillStyle = '#1b1022';
  g.fillRect(0, h * 0.7, w, h * 0.3);
  // neon sign
  g.shadowColor = '#ff6f91';
  g.shadowBlur = 22;
  g.strokeStyle = '#ff9ab3';
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(w * 0.1, h * 0.12, w * 0.28, h * 0.12, h * 0.02);
  g.stroke();
  g.beginPath();
  g.moveTo(w * 0.24, h * 0.24);
  g.lineTo(w * 0.24, h * 0.7);
  g.stroke();
  text(g, 'VACANCY', w * 0.24, h * 0.195, { size: h * 0.04, weight: 700, family: "'Archivo'", stretch: 'expanded', spacing: 0.12, color: '#ffd0dc', align: 'center' });
  g.shadowBlur = 0;
  if (words) {
    text(g, 'Sundown Motel', w * 0.08, h * 0.86, { size: h * 0.1, weight: 400, style: 'italic', family: "'Instrument Serif'", color: '#ffe9d2' });
    text(g, a.artist, w * 0.082, h * 0.92, { size: h * 0.028, weight: 500, color: '#ffe9d2', alpha: 0.8 });
  }
}

function morse(g, w, h, a, words) {
  g.fillStyle = '#121212';
  g.fillRect(0, 0, w, h);
  const rnd = rng(141);
  for (let row = 0; row < 12; row++) {
    const y = h * (0.2 + row * 0.058);
    let x = w * 0.08;
    while (x < w * 0.9) {
      const dash = rnd() < 0.45;
      g.fillStyle = rnd() < 0.82 ? '#ff4b3e' : '#f2f2f2';
      if (dash) {
        g.beginPath();
        g.roundRect(x, y - h * 0.012, w * 0.06, h * 0.024, h * 0.012);
        g.fill();
        x += w * 0.06 + w * 0.025;
      } else {
        circle(g, x + h * 0.012, y, h * 0.012, g.fillStyle);
        x += h * 0.024 + w * 0.025;
      }
      if (rnd() < 0.18) x += w * 0.05;
    }
  }
  if (words) {
    text(g, 'MORSE HEARTS', w * 0.08, h * 0.11, { size: h * 0.032, weight: 500, family: "'JetBrains Mono'", spacing: 0.2, color: '#ffffff' });
    text(g, a.artist, w * 0.92, h * 0.94, { size: h * 0.028, weight: 500, color: '#ffffff', align: 'right', alpha: 0.75 });
  }
}

function quiet(g, w, h, a, words) {
  g.fillStyle = '#c8d1c2';
  g.fillRect(0, 0, w, h);
  const cx = w * 0.56;
  const cy = h * 0.44;
  const r = h * 0.3;
  g.strokeStyle = '#2f5d46';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.stroke();
  g.lineWidth = 3;
  for (let k = 0; k < 60; k++) {
    const an = (k * TAU) / 60;
    const l = k % 5 ? 0.06 : 0.12;
    g.beginPath();
    g.moveTo(cx + Math.cos(an) * r * (1 - l), cy + Math.sin(an) * r * (1 - l));
    g.lineTo(cx + Math.cos(an) * r * 0.97, cy + Math.sin(an) * r * 0.97);
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, r * 0.55, -0.4, 2.2);
  g.stroke();
  g.beginPath();
  g.moveTo(0, cy);
  g.lineTo(w, cy);
  g.stroke();
  circle(g, cx, cy, h * 0.05, '#2f5d46');
  circle(g, cx + Math.cos(-1.1) * r, cy + Math.sin(-1.1) * r, h * 0.018, '#e9eee5');
  if (words) {
    text(g, 'Quiet Engines', w * 0.08, h * 0.88, { size: h * 0.052, weight: 500, color: '#26332a' });
    text(g, a.artist, w * 0.08, h * 0.93, { size: h * 0.03, weight: 400, color: '#26332a', alpha: 0.8 });
  }
}

function polar(g, w, h, a, words) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#eef5fb');
  bg.addColorStop(1, '#cfe2f3');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.filter = `blur(${Math.round(h * 0.05)}px)`;
  circle(g, w * 0.5, h * 0.45, h * 0.2, '#ff9fb8');
  circle(g, w * 0.58, h * 0.5, h * 0.12, '#ffd1dc');
  g.filter = 'none';
  for (let k = 0; k < 6; k++) {
    const an = (k * TAU) / 6 - Math.PI / 2;
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.ellipse(w * 0.5 + Math.cos(an) * h * 0.14, h * 0.45 + Math.sin(an) * h * 0.14, h * 0.14, h * 0.06, an, 0, TAU);
    g.fill();
  }
  const rnd = rng(161);
  for (let i = 0; i < 120; i++) circle(g, rnd() * w, rnd() * h, 1 + rnd() * 3, 'rgba(255,255,255,0.8)');
  if (words) {
    text(g, 'Polar Bloom', w / 2, h * 0.84, { size: h * 0.1, weight: 400, family: "'Instrument Serif'", color: '#22334f', align: 'center' });
    text(g, a.artist.toUpperCase(), w / 2, h * 0.9, { size: h * 0.022, weight: 600, spacing: 0.3, color: '#22334f', align: 'center', alpha: 0.7 });
  }
}

/* ---------- the albums ---------- */
const RAW = [
  { title: 'Tidal House', artist: 'The Shorelines', season: 'Summer 2025', bg: '#f3d7c9', ink: '#3a2f2c', accent: '#2fa7cf', paint: tidal, tagline: 'Tidal House: ten songs written poolside and mixed with the windows open.' },
  { title: 'Neon Orchard', artist: 'Velour Moth', season: 'Autumn 2025', bg: '#120d26', ink: '#f4ecff', accent: '#ff4fd8', paint: neon, tagline: 'Neon Orchard: fruit under streetlight, a record for the night shift.' },
  { title: 'Velvet Static', artist: 'Odessa Lane', season: 'Winter 2025', bg: '#141c5e', ink: '#eef1ff', accent: '#8fa2ff', paint: velvet, tagline: 'Velvet Static: radio songs for a city that never quite goes quiet.' },
  { title: 'Paper Moons', artist: 'June Harbor', season: 'Winter 2025', bg: '#1d2240', ink: '#f3ead2', accent: '#e9c46a', paint: moons, tagline: 'Paper Moons: lullabies for grown-ups who still cannot sleep.' },
  { title: 'Wildflower Hymns', artist: 'Hollis & the Fern', season: 'Spring 2026', bg: '#f1ece0', ink: '#4a3b2c', accent: '#c8442f', paint: wildflower, tagline: 'Wildflower Hymns: pressed between pages, played on porches.' },
  { title: 'Soft Machines', artist: 'Kites Over Berlin', season: 'Spring 2026', bg: '#f3f1ec', ink: '#1b1b1b', accent: '#e2402f', paint: soft, tagline: 'Soft Machines: eight pieces for drum machine and open window.' },
  { title: 'Glass Hours', artist: 'Mira Vale', season: 'Summer 2026', bg: '#241a5e', ink: '#fff3ec', accent: '#ff8a5c', paint: glassHours, tagline: 'Glass Hours: a slow record about the light at the end of the day.' },
  { title: 'Low Orbit', artist: 'The Satellites', season: 'Autumn 2026', bg: '#3b3f5e', ink: '#eef0f8', accent: '#e8876a', paint: orbit, tagline: 'Low Orbit: songs for the long way home, from Moonfold Records.' },
  { title: 'Paper Tigers', artist: 'Hollow Coast', season: 'Autumn 2026', bg: '#40434d', ink: '#f6f3ee', accent: '#f2a57f', paint: tigers, tagline: 'Paper Tigers: loud guitars and soft hearts, recorded live in one room.' },
  { title: 'Night Bus', artist: 'Lantern Club', season: 'Autumn 2026', bg: '#33363d', ink: '#f2f2ee', accent: '#e7df4a', paint: nightbus, tagline: 'Night Bus: the last ride home, the long way round.' },
  { title: 'Lemon Light', artist: 'Pale Season', season: 'Winter 2026', bg: '#f2f4c6', ink: '#4d5220', accent: '#c9cf3c', paint: lemon, tagline: 'Lemon Light: bright, sour, and over before you know it.' },
  { title: 'Cobalt Garden', artist: 'The Arbors', season: 'Winter 2026', bg: '#1f47d6', ink: '#f2f5ff', accent: '#b9c9ff', paint: cobalt, tagline: 'Cobalt Garden: blue songs that grow in the shade.' },
  { title: 'Sundown Motel', artist: 'Ruby & the Vacancies', season: 'Spring 2027', bg: '#2b1838', ink: '#ffe9d2', accent: '#ff6f91', paint: sundown, tagline: 'Sundown Motel: one night, twelve rooms, every light still on.' },
  { title: 'Morse Hearts', artist: 'Signal Choir', season: 'Spring 2027', bg: '#121212', ink: '#f2f2f2', accent: '#ff4b3e', paint: morse, tagline: 'Morse Hearts: love songs sent in short and long.' },
  { title: 'Quiet Engines', artist: 'Halden', season: 'Summer 2027', bg: '#c8d1c2', ink: '#26332a', accent: '#2f5d46', paint: quiet, tagline: 'Quiet Engines: ambient pieces for long drives and slow mornings.' },
  { title: 'Polar Bloom', artist: 'North Fable', season: 'Summer 2027', bg: '#e3eef8', ink: '#22334f', accent: '#ff9fb8', paint: polar, tagline: 'Polar Bloom: something warm growing in the cold.' },
];

const SONGS = ['Harbour Lights', 'Slow Satellites', 'Paper Boats', 'Night Swim', 'Static Bloom', 'Afterglow', 'Long Way Home', 'Glass Garden', 'Low Tide', 'Telephone Wires', 'Northern Line', 'Orange Moon', 'Quiet Hours', 'Silver Hour', 'Half Light', 'Kites', 'Small Engines', 'Moth Song', 'Blue Hour', 'Last Bus', 'Polaroid', 'Postcards', 'Echo Park', 'Velvet Room', 'Cold Water', 'Hollow Heart', 'Open Window', 'Signal Fire', 'Lantern', 'Drifting', 'Undertow', 'Holiday', 'Overpass', 'Neon Rain', 'Seaside', 'Morning Radio'];
const PEOPLE = ['M. Okafor', 'Inez Hartwell', 'R. Lindqvist', 'Tomas Vey', 'Ada Brennan', 'J. Ishikawa', 'Lena Moraes', 'Kit Calder'];
const STUDIOS = ['Low Tide Studio, Room B', 'Harbour Lane Studios', 'The Greenhouse, Leeds', 'Blue Room, Lisbon', 'Kiln Studio', 'Fernhill Barn'];

export const ALBUMS = RAW.map((a, i) => {
  const r = rng(hash(a.title));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const pool = SONGS.slice();
  const tracks = [];
  for (let k = 0; k < 10; k++) {
    const name = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const sec = 150 + Math.floor(r() * 150);
    tracks.push({ name, time: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` });
  }
  return {
    ...a,
    index: i,
    cat: `HMR-${String(i + 1).padStart(3, '0')}`,
    tracks,
    credits: [
      ['Performed by', a.artist],
      ['Produced by', `${a.artist.split(' ').slice(-1)[0]} & ${pick(PEOPLE)}`],
      ['Recorded at', pick(STUDIOS)],
      ['Mastered by', pick(PEOPLE)],
      ['Artwork', 'Moonfold Studio'],
    ],
  };
});

/* ---------- fonts ---------- */
export async function loadFonts() {
  if (!document.fonts) return;
  const faces = ['700 40px Archivo', 'italic 800 40px Archivo', '600 20px Inter', '400 20px Inter', '400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"', '500 20px "JetBrains Mono"'];
  try {
    await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* draw with fallbacks */
  }
}

/* ---------- canvases ---------- */
function moonMark(g, x, y, r, ink, bg) {
  circle(g, x, y, r, ink);
  circle(g, x + r * 0.45, y - r * 0.3, r * 0.85, bg);
}

export function coverCanvas(a, w = 1100, h = 1024) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  a.paint(g, w, h, a, true);
  grain(g, w, h, 0.05);
  return c;
}

// inside page of the booklet (seen when the lid is open)
function linerCanvas(a) {
  const w = 1100;
  const h = 1024;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  a.paint(g, w, h, a, false);
  const wash = g.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, rgba(a.bg, 0.2));
  wash.addColorStop(0.34, rgba(a.bg, 0.9));
  wash.addColorStop(1, rgba(a.bg, 0.97));
  g.fillStyle = wash;
  g.fillRect(0, 0, w, h);
  const ink = a.ink;
  const x0 = w * 0.07;
  moonMark(g, x0 + 11, h * 0.42, 12, ink, a.bg);
  text(g, 'MOONFOLD', x0 + 34, h * 0.428, { size: h * 0.02, weight: 700, spacing: 0.18, color: ink });
  text(g, a.cat, w * 0.93, h * 0.428, { size: h * 0.02, weight: 600, spacing: 0.15, color: ink, align: 'right', alpha: 0.8 });
  let y = wrap(g, a.tagline, x0, h * 0.53, w * 0.84, h * 0.062, { size: h * 0.05, weight: 400, style: 'italic', family: "'Instrument Serif'", color: ink });
  y += h * 0.05;
  g.fillStyle = a.accent;
  g.fillRect(x0, y, w * 0.05, 4);
  y += h * 0.06;
  for (const [k, v] of a.credits) {
    text(g, k.toUpperCase(), x0, y, { size: h * 0.016, weight: 700, spacing: 0.18, color: ink, alpha: 0.7 });
    text(g, v, x0 + w * 0.27, y, { size: h * 0.022, weight: 600, color: ink });
    y += h * 0.042;
  }
  text(g, `℗ © ${YEAR} ${LABEL}. All rights reserved. Unauthorised copying, hiring, lending and broadcasting prohibited.`, x0, h * 0.95, { size: h * 0.014, weight: 400, color: ink, alpha: 0.6 });
  grain(g, w, h, 0.04);
  return c;
}

// the art printed on the inside of the back inlay, seen through the clear tray
function inlayCanvas(a) {
  const w = 1024;
  const h = 954;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  a.paint(g, w, h, a, false);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.fillRect(0, 0, w, h);
  grain(g, w, h, 0.05);
  return c;
}

// the back of the case: tracklist, barcode, small print
function backCanvas(a) {
  const w = 1024;
  const h = 954;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = a.bg;
  g.fillRect(0, 0, w, h);
  g.save();
  g.beginPath();
  g.rect(0, 0, w, h * 0.3);
  g.clip();
  g.translate(0, -h * 0.3);
  a.paint(g, w, h, a, false);
  g.restore();
  const fade = g.createLinearGradient(0, h * 0.1, 0, h * 0.3);
  fade.addColorStop(0, rgba(a.bg, 0));
  fade.addColorStop(1, rgba(a.bg, 1));
  g.fillStyle = fade;
  g.fillRect(0, h * 0.1, w, h * 0.2 + 1);
  const ink = a.ink;
  const x0 = w * 0.08;
  text(g, a.title, x0, h * 0.38, { size: h * 0.05, weight: 700, color: ink });
  text(g, a.artist, x0, h * 0.425, { size: h * 0.028, weight: 500, color: ink, alpha: 0.75 });
  const colW = w * 0.42;
  a.tracks.forEach((t, i) => {
    const col = i < 5 ? 0 : 1;
    const x = x0 + col * (colW + w * 0.02);
    const y = h * 0.52 + (i % 5) * h * 0.05;
    text(g, String(i + 1).padStart(2, '0'), x, y, { size: h * 0.02, weight: 500, family: "'JetBrains Mono'", color: ink, alpha: 0.6 });
    text(g, t.name, x + w * 0.05, y, { size: h * 0.026, weight: 500, color: ink });
    text(g, t.time, x + colW - w * 0.02, y, { size: h * 0.02, weight: 500, family: "'JetBrains Mono'", color: ink, alpha: 0.6, align: 'right' });
  });
  // barcode
  const bx = w * 0.7;
  const by = h * 0.82;
  g.fillStyle = '#ffffff';
  g.fillRect(bx, by, w * 0.22, h * 0.11);
  const r = rng(hash(a.cat));
  let x = bx + w * 0.012;
  g.fillStyle = '#111111';
  while (x < bx + w * 0.205) {
    const bw = 1 + Math.floor(r() * 4);
    if (r() < 0.55) g.fillRect(x, by + h * 0.012, bw, h * 0.07);
    x += bw + 1;
  }
  text(g, `5 0${(hash(a.title) % 1e9).toString().padStart(9, '0')} 2`, bx + w * 0.11, by + h * 0.103, { size: h * 0.016, weight: 500, family: "'JetBrains Mono'", color: '#111111', align: 'center' });
  moonMark(g, x0 + 11, h * 0.86, 12, ink, a.bg);
  text(g, `${LABEL.toUpperCase()} · ${a.cat}`, x0 + 34, h * 0.868, { size: h * 0.02, weight: 700, spacing: 0.15, color: ink });
  text(g, `℗ © ${YEAR} ${LABEL}. Made in the EU.`, x0, h * 0.91, { size: h * 0.016, weight: 400, color: ink, alpha: 0.6 });
  grain(g, w, h, 0.04);
  return c;
}

function discCanvas(a) {
  const S = 1024;
  const R = S / 2;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  const px = R / 0.6; // pixels per unit (disc radius 0.6)
  g.save();
  g.beginPath();
  g.arc(R, R, R - 1, 0, TAU);
  g.clip();
  a.paint(g, S, S, a, false);
  grain(g, S, S, 0.05);
  const v = g.createRadialGradient(R, R, R * 0.6, R, R, R);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.14)');
  g.fillStyle = v;
  g.fillRect(0, 0, S, S);
  const ink = isDark(a.bg) ? '#ffffff' : '#1a1a1a';
  arcText(g, `${a.title.toUpperCase()}   ·   ${a.artist.toUpperCase()}`, R, R, R * 0.84, -Math.PI / 2, { size: 26, weight: 700, spacing: 0.22, color: ink });
  arcText(g, `℗ © ${YEAR} ${LABEL.toUpperCase()} · ${a.cat} · ALL RIGHTS RESERVED`, R, R, R * 0.86, Math.PI / 2, { size: 16, weight: 600, spacing: 0.18, color: ink, alpha: 0.8, bottom: true });
  text(g, 'STEREO', R - R * 0.6, R, { size: 17, weight: 700, spacing: 0.2, color: ink, align: 'center', baseline: 'middle' });
  text(g, a.cat, R + R * 0.6, R, { size: 17, weight: 700, spacing: 0.2, color: ink, align: 'center', baseline: 'middle' });
  g.restore();
  const band = 0.235 * px;
  const hub = 0.165 * px;
  g.save();
  g.globalCompositeOperation = 'destination-out';
  circle(g, R, R, band, '#000');
  g.restore();
  const sil = g.createRadialGradient(R, R, hub, R, R, band);
  sil.addColorStop(0, '#8e949a');
  sil.addColorStop(0.55, '#d4d8dc');
  sil.addColorStop(1, '#9ca2a8');
  g.fillStyle = sil;
  g.beginPath();
  g.arc(R, R, band, 0, TAU);
  g.arc(R, R, hub, 0, TAU, true);
  g.fill();
  arcText(g, `${a.cat}  ·  MADE IN EU`, R, R, (hub + band) / 2, -Math.PI / 2, { size: 11, weight: 600, spacing: 0.25, color: '#6f747a' });
  return c;
}

function spineCanvas(a) {
  const w = 1024;
  const h = 56;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  // the paper edge of the back inlay, seen through the bottom wall
  g.fillStyle = '#f3f1ec';
  g.fillRect(0, 0, w, h);
  g.fillStyle = a.accent;
  g.fillRect(0, 0, 10, h);
  const ink = '#55565c';
  text(g, `${a.title.toUpperCase()}  ·  ${a.artist.toUpperCase()}`, 30, h / 2 + 1, { size: 13, weight: 600, spacing: 0.18, color: ink, baseline: 'middle', alpha: 0.85 });
  text(g, `${LABEL.toUpperCase()} · ${a.cat}`, w - 30, h / 2 + 1, { size: 13, weight: 600, spacing: 0.18, color: ink, baseline: 'middle', align: 'right', alpha: 0.85 });
  return c;
}

/* ---------- textures ---------- */
function tex(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  return t;
}
export const makeCoverTexture = (a, r) => tex(coverCanvas(a), r);
export const makeSpineTexture = (a, r) => tex(spineCanvas(a), r);
export function makeDetailTextures(a, r) {
  return { liner: tex(linerCanvas(a), r), inlay: tex(inlayCanvas(a), r), back: tex(backCanvas(a), r), disc: tex(discCanvas(a), r) };
}
