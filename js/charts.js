// charts.js — גרפי SVG מקומיים. בלי ספריית צד ג׳: פחות משקל, RTL נכון, וצבעי המקצועות.
// כל הגרפים מקבלים [{ label, value, color? }] ומחזירים אלמנט מוכן.

import { h } from './ui.js';
import { esc, toISO } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v);
  // flat(Infinity): כל גרף בונה מערכים מקוננים (עמודה + תווית + קו רשת).
  // flat() ברמה אחת היה משאיר מערך, ו-append היה הופך אותו למחרוזת — גרף ריק.
  el.append(...kids.flat(Infinity).filter(Boolean));
  return el;
}
function txt(s) { return document.createTextNode(String(s)); }

function niceMax(v) {
  if (v <= 0) return 1;
  if (v <= 5) return Math.ceil(v);          // ערכים קטנים: סקאלה שלמה, בלי עיגול ל-10
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

/** ערכי סימון ייחודיים בלבד — אחרת מקסימום 1 מייצר "1 1 1 0 0" על הציר. */
function ticksFor(top, fractions) {
  return [...new Set(fractions.map((f) => Math.round(top * f)))].sort((a, b) => a - b);
}

function wrap(node, { title, legend, empty } = {}) {
  if (empty) return h('div', { class: 'chart' }, h('p', { class: 'muted center small', style: { padding: 'var(--space-5)' }, text: empty }));
  return h('div', { class: 'chart' }, title ? h('h3', { class: 'card__title', text: title }) : null, node, legend || null);
}

/**
 * גרף עמודות אנכי. RTL: הפריט הראשון בימין.
 */
export function barChart(data, { height = 210, title, valueFmt = (v) => v, max } = {}) {
  if (!data.length) return wrap(null, { title, empty: 'אין נתונים להצגה' });
  const W = Math.max(280, data.length * 56), H = height;
  const padB = 34, padT = 16, padX = 8;
  const top = max ?? niceMax(Math.max(...data.map((d) => d.value), 0));
  const bw = (W - padX * 2) / data.length;

  const grid = ticksFor(top, [0, 0.25, 0.5, 0.75, 1]).map((v) => {
    const y = padT + (H - padT - padB) * (1 - v / top);
    return [
      svg('line', { class: 'chart__grid', x1: padX, x2: W - padX, y1: y, y2: y }),
      svg('text', { class: 'chart__label', x: W - padX, y: y - 3, 'text-anchor': 'end' }, txt(valueFmt(v))),
    ];
  });

  const bars = data.map((d, i) => {
    const x = W - padX - (i + 1) * bw + bw * 0.18; // מימין לשמאל
    const bh = top ? (H - padT - padB) * (d.value / top) : 0;
    const y = H - padB - bh;
    return [
      svg('rect', {
        class: 'chart__bar', x, y: Math.max(padT, y), width: bw * 0.64, height: Math.max(0, bh),
        rx: 4, fill: d.color || 'var(--brand)',
      }, svg('title', {}, txt(`${d.label}: ${valueFmt(d.value)}`))),
      d.value ? svg('text', { class: 'chart__label', x: x + bw * 0.32, y: y - 4, 'text-anchor': 'middle' }, txt(valueFmt(d.value))) : null,
      svg('text', { class: 'chart__label', x: x + bw * 0.32, y: H - padB + 15, 'text-anchor': 'middle' }, txt(shorten(d.label))),
    ];
  });

  return wrap(svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaFor(title, data, valueFmt) }, grid, bars), { title });
}

/** גרף קווי/שטח למגמות. */
export function lineChart(data, { height = 210, title, valueFmt = (v) => v } = {}) {
  if (data.length < 2) return wrap(null, { title, empty: 'צריך לפחות שתי נקודות למגמה' });
  const W = Math.max(300, data.length * 34), H = height;
  const padB = 30, padT = 16, padX = 30;
  const top = niceMax(Math.max(...data.map((d) => d.value), 1));
  const innerW = W - padX * 2, innerH = H - padT - padB;
  // RTL: אינדקס 0 בימין
  const px = (i) => W - padX - (i / (data.length - 1)) * innerW;
  const py = (v) => padT + innerH * (1 - v / top);

  const pts = data.map((d, i) => [px(i), py(d.value)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts.at(-1)[0].toFixed(1)},${H - padB} L${pts[0][0].toFixed(1)},${H - padB} Z`;

  const grid = ticksFor(top, [0, 0.5, 1]).map((v) => {
    const y = padT + innerH * (1 - v / top);
    return [
      svg('line', { class: 'chart__grid', x1: padX, x2: W - padX, y1: y, y2: y }),
      svg('text', { class: 'chart__label', x: W - padX + 4, y: y + 4, 'text-anchor': 'start' }, txt(valueFmt(v))),
    ];
  });

  const step = Math.ceil(data.length / 8);
  const labels = data.map((d, i) => (i % step === 0
    ? svg('text', { class: 'chart__label', x: px(i), y: H - padB + 15, 'text-anchor': 'middle' }, txt(shorten(d.label, 8)))
    : null));

  const dots = data.map((d, i) => svg('circle', { class: 'chart__dot', cx: px(i), cy: py(d.value), r: 3 },
    svg('title', {}, txt(`${d.label}: ${valueFmt(d.value)}`))));

  return wrap(svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaFor(title, data, valueFmt) },
    grid, svg('path', { class: 'chart__area', d: area }), svg('path', { class: 'chart__line', d: line }), dots, labels,
  ), { title });
}

/** דונאט להתפלגויות. */
export function donutChart(data, { size = 190, title, centerLabel, centerValue } = {}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return wrap(null, { title, empty: 'אין נתונים להצגה' });
  const r = size / 2 - 12, cx = size / 2, cy = size / 2, sw = 24;
  const C = 2 * Math.PI * r;
  let acc = 0;

  const arcs = data.filter((d) => d.value > 0).map((d) => {
    const frac = d.value / total;
    const el = svg('circle', {
      cx, cy, r, fill: 'none', stroke: d.color || 'var(--brand)', 'stroke-width': sw,
      'stroke-dasharray': `${(C * frac).toFixed(2)} ${(C * (1 - frac)).toFixed(2)}`,
      'stroke-dashoffset': (-C * acc).toFixed(2),
      transform: `rotate(-90 ${cx} ${cy})`,
    }, svg('title', {}, txt(`${d.label}: ${d.value} (${Math.round(frac * 100)}%)`)));
    acc += frac;
    return el;
  });

  const legend = h('div', { class: 'chart-legend' }, ...data.filter((d) => d.value > 0).map((d) => h('span', {},
    h('i', { style: { background: d.color || 'var(--brand)' } }),
    h('span', { text: `${d.label} · ${d.value}` }))));

  return wrap(svg('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: 'img', 'aria-label': ariaFor(title, data) },
    arcs,
    centerValue !== undefined ? svg('text', { x: cx, y: cy + 2, 'text-anchor': 'middle', style: 'font-size:26px;font-weight:700;fill:var(--text)' }, txt(centerValue)) : null,
    centerLabel ? svg('text', { x: cx, y: cy + 20, 'text-anchor': 'middle', class: 'chart__label' }, txt(centerLabel)) : null,
  ), { title, legend });
}

/** מפת חום שנתית של פעילות — שבוע לעמודה, RTL. */
export function heatmap(counts, { weeks = 18, title } = {}) {
  const cell = 13, gap = 3, rows = 7;
  const W = weeks * (cell + gap), H = rows * (cell + gap) + 18;
  const today = new Date();
  const max = Math.max(1, ...Object.values(counts));
  const squares = [];

  for (let w = 0; w < weeks; w++) {
    for (let dow = 0; dow < rows; dow++) {
      const d = new Date(today);
      d.setDate(today.getDate() - ((weeks - 1 - w) * 7 + (6 - dow)) + (6 - today.getDay()));
      if (d > today) continue;
      const iso = toISO(d); // תאריך מקומי — toISOString היה מזיז את כל המפה ביום
      const n = counts[iso] || 0;
      squares.push(svg('rect', {
        x: W - (w + 1) * (cell + gap), y: dow * (cell + gap), width: cell, height: cell, rx: 3,
        fill: n ? `color-mix(in srgb, var(--brand) ${Math.round(22 + 78 * (n / max))}%, var(--surface-3))` : 'var(--surface-3)',
      }, svg('title', {}, txt(`${iso}: ${n} משימות`))));
    }
  }
  return wrap(svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${title || 'פעילות'} — ${weeks} שבועות אחרונים` }, squares), { title });
}

function shorten(s, n = 10) {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function ariaFor(title, data, fmt = (v) => v) {
  return `${title || 'גרף'}: ${data.slice(0, 12).map((d) => `${esc(d.label)} ${fmt(d.value)}`).join(', ')}`;
}
