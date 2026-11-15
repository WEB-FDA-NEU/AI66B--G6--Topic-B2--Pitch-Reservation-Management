import { el } from '../core/render.js';
import { createBrandMark } from '../core/ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const M = 30;
const L = 1050;
const W = 680;
const CY = M + W / 2;

function svgNode(parent, tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.append(node);
  return node;
}

function drawPitchMarkings(g) {
  const mirror = (x) => 2 * M + L - x;
  svgNode(g, 'rect', { x: M, y: M, width: L, height: W });
  svgNode(g, 'line', { x1: M + L / 2, y1: M, x2: M + L / 2, y2: M + W });
  svgNode(g, 'circle', { cx: M + L / 2, cy: CY, r: 91.5 });
  svgNode(g, 'circle', { cx: M + L / 2, cy: CY, r: 5, class: 'spot' });
  for (const side of [0, 1]) {
    const x = (v) => (side ? mirror(v) : v);
    const box = (depth, width) => {
      const x1 = x(M), x2 = x(M + depth);
      svgNode(g, 'rect', { x: Math.min(x1, x2), y: CY - width / 2, width: depth, height: width });
    };
    box(165, 403);
    box(55, 183);
    svgNode(g, 'circle', { cx: x(M + 110), cy: CY, r: 5, class: 'spot' });
    const arcX = x(M + 165), dy = Math.sqrt(91.5 ** 2 - 55 ** 2);
    svgNode(g, 'path', { d: `M${arcX} ${CY - dy}A91.5 91.5 0 0 ${side ? 0 : 1} ${arcX} ${CY + dy}` });
    const gx1 = x(M), gx2 = x(M - 20);
    svgNode(g, 'rect', { x: Math.min(gx1, gx2), y: CY - 36.6, width: 20, height: 73.2, class: 'goal' });
  }
  const r = 10;
  svgNode(g, 'path', { d: `M${M + r} ${M}A${r} ${r} 0 0 1 ${M} ${M + r}` });
  svgNode(g, 'path', { d: `M${M + L - r} ${M}A${r} ${r} 0 0 0 ${M + L} ${M + r}` });
  svgNode(g, 'path', { d: `M${M} ${M + W - r}A${r} ${r} 0 0 1 ${M + r} ${M + W}` });
  svgNode(g, 'path', { d: `M${M + L} ${M + W - r}A${r} ${r} 0 0 0 ${M + L - r} ${M + W}` });
}

function drawBall(parent, clipId, transform = `translate(${M + L - 110} ${CY}) rotate(18) scale(0.45)`) {
  const ball = svgNode(parent, 'g', { class: 'pitch-scene-ball', transform });
  const clip = svgNode(svgNode(ball, 'defs'), 'clipPath', { id: clipId });
  svgNode(clip, 'circle', { r: 47 });
  svgNode(ball, 'circle', { r: 47, class: 'pitch-scene-ball-skin' });
  const patches = svgNode(ball, 'g', { 'clip-path': `url(#${clipId})` });
  const pentagon = (cx, cy, size, rot) => Array.from({ length: 5 }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / 5;
    return `${(cx + size * Math.cos(a)).toFixed(1)},${(cy + size * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  svgNode(patches, 'polygon', { points: pentagon(0, 0, 15, -Math.PI / 2), class: 'pitch-scene-ball-patch' });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const jx = 34 * Math.cos(a), jy = 34 * Math.sin(a);
    svgNode(patches, 'line', { x1: 15 * Math.cos(a), y1: 15 * Math.sin(a), x2: jx, y2: jy, class: 'pitch-scene-ball-seam' });
    svgNode(patches, 'polygon', { points: pentagon(48 * Math.cos(a), 48 * Math.sin(a), 15, a + Math.PI), class: 'pitch-scene-ball-patch' });
    for (const b of [a + Math.PI / 5, a - Math.PI / 5]) {
      svgNode(patches, 'line', { x1: jx, y1: jy, x2: 47 * Math.cos(b), y2: 47 * Math.sin(b), class: 'pitch-scene-ball-seam' });
    }
  }
  svgNode(ball, 'circle', { r: 47, class: 'pitch-scene-ball-shade' });
}

const CARD_COLORS = {
  yellow: ['#fde047', '#facc15', '#eab308'],
  red: ['#f87171', '#dc2626', '#b91c1c']
};

function drawCard(svg, card, orientation) {
  const colors = CARD_COLORS[card];
  if (!colors) return;
  const id = `pitch-scene-card-${card}-${orientation}`;
  const grad = svgNode(svgNode(svg, 'defs'), 'linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 });
  colors.forEach((color, i) => svgNode(grad, 'stop', { offset: `${i * 50}%`, 'stop-color': color }));
  const [cx, cy] = orientation === 'portrait' ? [99, 95] : [112, 99];
  const g = svgNode(svg, 'g', { class: `pitch-scene-card pitch-scene-card--${card}`, transform: `translate(${cx} ${cy}) rotate(-14)` });
  svgNode(g, 'rect', { x: -28, y: -42, width: 56, height: 84, rx: 6, fill: `url(#${id})` });
}

function buildPitchSvg(orientation, card) {
  const portrait = orientation === 'portrait';
  const svg = svgNode(null, 'svg', {
    viewBox: portrait ? `0 0 ${W + 2 * M} ${L + 2 * M}` : `0 0 ${L + 2 * M} ${W + 2 * M}`,
    preserveAspectRatio: 'xMidYMin meet',
    class: `pitch-scene-lines pitch-scene-lines--${orientation}`,
    'aria-hidden': 'true'
  });
  drawCard(svg, card, orientation);
  const g = svgNode(svg, 'g', portrait ? { transform: `translate(${W + 2 * M} 0) rotate(90)` } : {});
  drawPitchMarkings(g);
  drawBall(g, `pitch-scene-ball-clip-${orientation}`);
  return svg;
}

let ballIconCount = 0;
export function buildBallIcon(className = 'ball-icon') {
  const svg = svgNode(null, 'svg', { viewBox: '-50 -50 100 100', class: className, 'aria-hidden': 'true', focusable: 'false' });
  drawBall(svg, `ball-icon-clip-${++ballIconCount}`, 'rotate(18)');
  return svg;
}

export function buildPitchBrand(extra = null) {
  return el('div', null, { class: 'pitch-scene-brand' }, [
    el('a', null, { href: 'index.html', 'aria-label': 'Về trang chủ Pitch Point' }, [createBrandMark()]),
    extra
  ]);
}

export function buildPitchScene({ content, card = null, labelledBy = null, wide = false }) {
  return el('section', null, { class: 'pitch-scene', 'aria-labelledby': labelledBy }, [
    buildPitchSvg('landscape', card),
    buildPitchSvg('portrait', card),
    el('div', null, { class: `pitch-scene-content${wide ? ' pitch-scene-content--form' : ''}` }, content)
  ]);
}
