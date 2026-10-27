/* ------------------------------------------------------------------ *
 *  Parameters panel: Room, Case, Disc and Motion, with the defaults    *
 *  from the reference. Changes apply live; "Copy share link" puts the  *
 *  changed values in the URL hash.                                     *
 * ------------------------------------------------------------------ */
export const DEFAULTS = Object.freeze({
  room: 'Light',
  background: '#FFFFFF',
  zoom: 0.98,
  exposure: 1.0,
  roomLight: 1.8,
  lamp: 0.8,
  clearPlastic: '#F4F7F8',
  plasticEdges: '#AEB8BC',
  edgeGlow: 0.06,
  reflections: 1.0,
  paperEdge: '#F3F1EC',
  rainbow: 1.05,
  rainbowColour: 1.35,
  ringSize: 0.42,
  ringLight: 2.2,
  ringColour: '#FFFFFF',
  spokes: 1.0,
  spin: 0.55,
  discSilver: '#E6E8EA',
  dragToTurn: true,
  floats: true,
  float: 1.0,
  lidSpeed: 1.0,
  flight: 1.6,
  slideOut: 1.0,
  scrollToBrowse: true,
});

const SCHEMA = [
  {
    title: 'Room',
    open: true,
    items: [
      { key: 'room', label: 'Room', type: 'segment', options: ['Light', 'Dark'] },
      {
        sub: 'Room settings',
        open: true,
        items: [
          { key: 'background', label: 'Background', type: 'color' },
          { key: 'zoom', label: 'Zoom', type: 'range', min: 0.6, max: 1.6, step: 0.01, unit: '×' },
          { key: 'exposure', label: 'Exposure', type: 'range', min: 0.2, max: 2, step: 0.01 },
          { key: 'roomLight', label: 'Room light', type: 'range', min: 0, max: 3.6, step: 0.01 },
          { key: 'lamp', label: 'Lamp', type: 'range', min: 0, max: 2, step: 0.01 },
        ],
      },
    ],
  },
  {
    title: 'Case',
    items: [
      { key: 'clearPlastic', label: 'Clear plastic', type: 'color' },
      { key: 'plasticEdges', label: 'Plastic edges', type: 'color' },
      { key: 'edgeGlow', label: 'Edge glow', type: 'range', min: 0, max: 0.4, step: 0.01 },
      { key: 'reflections', label: 'Reflections', type: 'range', min: 0, max: 2, step: 0.01 },
      { key: 'paperEdge', label: 'Paper edge', type: 'color' },
    ],
  },
  {
    title: 'Disc',
    items: [
      { key: 'rainbow', label: 'Rainbow', type: 'range', min: 0, max: 2, step: 0.01 },
      { key: 'rainbowColour', label: 'Rainbow colour', type: 'range', min: 0, max: 3, step: 0.01 },
      { key: 'ringSize', label: 'Ring light size', type: 'range', min: 0.1, max: 0.85, step: 0.01 },
      { key: 'ringLight', label: 'Ring light', type: 'range', min: 0, max: 4, step: 0.01 },
      { key: 'ringColour', label: 'Ring light colour', type: 'color' },
      { key: 'spokes', label: 'Light spokes', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { key: 'spin', label: 'Spin when lifted', type: 'range', min: 0, max: 2, step: 0.01 },
      { key: 'discSilver', label: 'Disc silver', type: 'color' },
    ],
  },
  {
    title: 'Motion',
    items: [
      { key: 'dragToTurn', label: 'Drag to turn', type: 'toggle' },
      { key: 'floats', label: 'Floats when left alone', type: 'toggle' },
      { key: 'float', label: 'Float', type: 'range', min: 0, max: 3, step: 0.01, unit: '×' },
      { key: 'lidSpeed', label: 'Lid speed', type: 'range', min: 0.2, max: 2.2, step: 0.01, unit: '×' },
      { key: 'flight', label: 'Flight to the viewer', type: 'range', min: 0.4, max: 3, step: 0.01, unit: 's' },
      { key: 'slideOut', label: 'Slides out under the pointer', type: 'range', min: 0, max: 2, step: 0.01, unit: '×' },
      { key: 'scrollToBrowse', label: 'Scroll to browse', type: 'toggle' },
    ],
  },
];

const ICON = {
  chevron: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fold: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 6l3-3 3 3M5 10l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reset: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.6h2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.8-.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

const leaves = (items) => items.flatMap((it) => (it.sub ? leaves(it.items) : [it]));
const same = (a, b) => (typeof a === 'string' && typeof b === 'string' ? a.toUpperCase() === b.toUpperCase() : a === b);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export function readShared() {
  const m = location.hash.match(/p=([^&]+)/);
  if (!m) return {};
  try {
    const obj = JSON.parse(atob(decodeURIComponent(m[1])));
    return Object.fromEntries(Object.entries(obj).filter(([k, v]) => k in DEFAULTS && typeof v === typeof DEFAULTS[k]));
  } catch {
    return {};
  }
}

export function mountPanel(root, params, onChange) {
  const controls = {}; // key -> { sync() }
  const sections = [];

  root.innerHTML = '';
  const head = el('div', 'panel__head');
  head.append(el('span', 'panel__title', 'Parameters'));
  const tools = el('div', 'panel__tools');
  const foldBtn = el('button', 'icon-btn', ICON.fold);
  foldBtn.title = 'Open or close all sections';
  const resetBtn = el('button', 'icon-btn', ICON.reset);
  resetBtn.title = 'Reset everything';
  tools.append(foldBtn, resetBtn);
  head.append(tools);

  const body = el('div', 'panel__body');
  const foot = el('div', 'panel__foot');
  const share = el('button', 'share', `${ICON.link}<span>Copy share link</span>`);
  const changed = el('span', 'changed mono', '0 changed');
  foot.append(share, changed);
  root.append(head, body, foot);

  const fmt = (it, v) => `${Number(v).toFixed(2)}${it.unit ? `<small>${it.unit}</small>` : ''}`;

  function commit(key, value) {
    params[key] = value;
    controls[key]?.sync();
    countChanged();
    onChange(key, value);
  }

  function row(it) {
    if (it.type === 'range') {
      const r = el('div', 'row row--range');
      const top = el('div', 'row__top');
      const label = el('label', 'row__label', it.label);
      const chip = el('output', 'chip mono');
      top.append(label, chip);
      const input = el('input');
      input.type = 'range';
      Object.assign(input, { min: it.min, max: it.max, step: it.step });
      input.setAttribute('aria-label', it.label);
      r.append(top, input);
      const sync = () => {
        const v = params[it.key];
        input.value = v;
        input.style.setProperty('--p', `${((v - it.min) / (it.max - it.min)) * 100}%`);
        chip.innerHTML = fmt(it, v);
      };
      input.addEventListener('input', () => commit(it.key, parseFloat(input.value)));
      label.addEventListener('dblclick', () => commit(it.key, DEFAULTS[it.key]));
      label.title = 'Double-click to reset';
      controls[it.key] = { sync };
      sync();
      return r;
    }
    if (it.type === 'color') {
      const r = el('label', 'row row--color');
      const txt = el('div', 'row__text');
      const name = el('span', 'row__label', it.label);
      const hex = el('span', 'row__hex mono');
      txt.append(name, hex);
      const sw = el('span', 'swatch');
      const input = el('input');
      input.type = 'color';
      input.setAttribute('aria-label', it.label);
      sw.append(input);
      r.append(txt, sw);
      const sync = () => {
        const v = params[it.key].toUpperCase();
        hex.textContent = v;
        sw.style.background = v;
        input.value = v.toLowerCase();
      };
      input.addEventListener('input', () => commit(it.key, input.value.toUpperCase()));
      controls[it.key] = { sync };
      sync();
      return r;
    }
    if (it.type === 'toggle') {
      const r = el('div', 'row row--toggle');
      const label = el('span', 'row__label', it.label);
      const sw = el('button', 'switch', '<i></i>');
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-label', it.label);
      r.append(label, sw);
      const sync = () => sw.setAttribute('aria-checked', String(!!params[it.key]));
      sw.addEventListener('click', () => commit(it.key, !params[it.key]));
      controls[it.key] = { sync };
      sync();
      return r;
    }
    if (it.type === 'segment') {
      const r = el('div', 'row row--seg');
      const top = el('div', 'row__top');
      const val = el('span', 'row__val mono');
      top.append(el('span', 'row__label', it.label), val);
      const seg = el('div', 'seg');
      const btns = it.options.map((o) => {
        const b = el('button', '', o);
        b.addEventListener('click', () => commit(it.key, o));
        seg.append(b);
        return b;
      });
      r.append(top, seg);
      const sync = () => {
        val.textContent = params[it.key];
        btns.forEach((b, i) => b.classList.toggle('is-on', it.options[i] === params[it.key]));
      };
      controls[it.key] = { sync };
      sync();
      return r;
    }
    return el('div');
  }

  function group(cls, title, count, open, items) {
    const s = el('section', `${cls}${open ? ' is-open' : ''}`);
    const h = el('button', `${cls}__head`, `${ICON.chevron}<span>${title}</span>${count != null ? `<span class="${cls}__count mono">${count}</span>` : ''}`);
    h.setAttribute('aria-expanded', String(open));
    const b = el('div', `${cls}__body`);
    for (const it of items) b.append(it.sub ? group('sub', it.sub, null, it.open, it.items) : row(it));
    h.addEventListener('click', () => {
      const on = s.classList.toggle('is-open');
      h.setAttribute('aria-expanded', String(on));
    });
    s.append(h, b);
    if (cls === 'sec') sections.push(s);
    return s;
  }

  for (const sec of SCHEMA) body.append(group('sec', sec.title, leaves(sec.items).length, !!sec.open, sec.items));

  function countChanged() {
    const n = Object.keys(DEFAULTS).filter((k) => !same(params[k], DEFAULTS[k])).length;
    changed.textContent = `${n} changed`;
  }
  countChanged();

  foldBtn.addEventListener('click', () => {
    const anyClosed = sections.some((s) => !s.classList.contains('is-open'));
    sections.forEach((s) => s.classList.toggle('is-open', anyClosed));
  });
  resetBtn.addEventListener('click', () => {
    Object.assign(params, DEFAULTS);
    Object.values(controls).forEach((c) => c.sync());
    countChanged();
    onChange(null);
  });
  share.addEventListener('click', async () => {
    const diff = Object.fromEntries(Object.keys(DEFAULTS).filter((k) => !same(params[k], DEFAULTS[k])).map((k) => [k, params[k]]));
    const url = `${location.origin}${location.pathname}${Object.keys(diff).length ? `#p=${encodeURIComponent(btoa(JSON.stringify(diff)))}` : ''}`;
    history.replaceState(null, '', url);
    const label = share.querySelector('span');
    try {
      await navigator.clipboard.writeText(url);
      label.textContent = 'Link copied';
    } catch {
      label.textContent = 'Link is in the address bar';
    }
    setTimeout(() => (label.textContent = 'Copy share link'), 1600);
  });

  return {
    // set without firing onChange (used when one setting nudges another)
    set(key, value) {
      params[key] = value;
      controls[key]?.sync();
      countChanged();
    },
  };
}
