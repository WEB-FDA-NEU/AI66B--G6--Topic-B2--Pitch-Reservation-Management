import './motion.js';
import './date-picker.js';
import { api } from '../services/api-client.js';
import { applyRules } from './config.js';
import { translateLink } from './links.js';
import { el, relativeTime, buildAvatar } from './render.js';
import { buildBallIcon } from '../components/pitch-scene.js';

const themes = ['light', 'dark', 'system'];
const ns = 'http://www.w3.org/2000/svg';

function hidePopoverPanels() {
  document.querySelectorAll('.popover-panel').forEach(panel => {
    panel.hidden = true;
    panel.parentElement?.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false');
  });
}

export function getSelectedTheme() {
  const stored = localStorage.getItem('pitch-point:template-theme') || 'system';
  return themes.includes(stored) ? stored : 'system';
}

export function applyTheme(value) {
  const clean = themes.includes(value) ? value : 'dark';
  localStorage.setItem('pitch-point:template-theme', clean);
  const resolved = clean === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : clean;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) { themeMeta = document.createElement('meta'); themeMeta.name = 'theme-color'; document.head.append(themeMeta); }
  themeMeta.content = resolved === 'light' ? '#f1f7f2' : '#101914';
  window.dispatchEvent(new CustomEvent('pitch-point:theme-changed', { detail: { theme: clean, resolved } }));
}

let themeListenerAttached = false;
export function initTheme() {
  applyTheme(getSelectedTheme());
  if (!themeListenerAttached) {
    themeListenerAttached = true;
    const media = matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      if (getSelectedTheme() === 'system') applyTheme('system');
    });
  }
}

const ICON_PATHS = {
  ChevronLeft: [
    ['path', { d: 'm15 18-6-6 6-6' }]
  ],
  ChevronRight: [
    ['path', { d: 'm9 18 6-6-6-6' }]
  ],
  X: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }]
  ],
  LayoutDashboard: [
    ['rect', { width: '7', height: '9', x: '3', y: '3', rx: '1' }],
    ['rect', { width: '7', height: '5', x: '14', y: '3', rx: '1' }],
    ['rect', { width: '7', height: '9', x: '14', y: '12', rx: '1' }],
    ['rect', { width: '7', height: '5', x: '3', y: '16', rx: '1' }]
  ],
  Building2: [
    ['path', { d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z' }],
    ['path', { d: 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2' }],
    ['path', { d: 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2' }],
    ['path', { d: 'M10 6h4' }],
    ['path', { d: 'M10 10h4' }],
    ['path', { d: 'M10 14h4' }],
    ['path', { d: 'M10 18h4' }]
  ],
  Download: [
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
    ['path', { d: 'm7 10 5 5 5-5' }],
    ['path', { d: 'M12 15V3' }]
  ],
  ReceiptText: [
    ['path', { d: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z' }],
    ['path', { d: 'M14 8H8' }],
    ['path', { d: 'M16 12H8' }],
    ['path', { d: 'M13 16H8' }]
  ],
  Wallet: [
    ['path', { d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1' }],
    ['path', { d: 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' }]
  ],
  MessageSquare: [
    ['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }]
  ],
  Users: [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: '9', cy: '7', r: '4' }],
    ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
    ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]
  ],
  Shield: [
    ['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }]
  ],
  ShieldAlert: [
    ['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }],
    ['path', { d: 'M12 8v4' }],
    ['path', { d: 'M12 16h.01' }]
  ],
  ShieldCheck: [
    ['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }],
    ['path', { d: 'm9 12 2 2 4-4' }]
  ],
  Flag: [
    ['path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }],
    ['line', { x1: '4', x2: '4', y1: '22', y2: '15' }]
  ],
  Megaphone: [
    ['path', { d: 'm3 11 18-5v12L3 14v-3z' }],
    ['path', { d: 'M11.6 16.8a3 3 0 1 1-5.8-1.6' }]
  ],
  ScrollText: [
    ['path', { d: 'M15 12h-5' }],
    ['path', { d: 'M15 8h-5' }],
    ['path', { d: 'M19 17V5a2 2 0 0 0-2-2H4' }],
    ['path', { d: 'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3' }]
  ],
  Settings: [
    ['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }],
    ['circle', { cx: '12', cy: '12', r: '3' }]
  ],
  LogOut: [
    ['path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }],
    ['polyline', { points: '16 17 21 12 16 7' }],
    ['line', { x1: '21', x2: '9', y1: '12', y2: '12' }]
  ],
  LogIn: [
    ['path', { d: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4' }],
    ['polyline', { points: '10 17 15 12 10 7' }],
    ['line', { x1: '15', x2: '3', y1: '12', y2: '12' }]
  ],
  UserPlus: [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: '9', cy: '7', r: '4' }],
    ['line', { x1: '19', x2: '19', y1: '8', y2: '14' }],
    ['line', { x1: '22', x2: '16', y1: '11', y2: '11' }]
  ],
  Lock: [
    ['rect', { width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' }],
    ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }]
  ],
  Menu: [
    ['line', { x1: '4', x2: '20', y1: '12', y2: '12' }],
    ['line', { x1: '4', x2: '20', y1: '6', y2: '6' }],
    ['line', { x1: '4', x2: '20', y1: '18', y2: '18' }]
  ],
  Search: [
    ['circle', { cx: '11', cy: '11', r: '8' }],
    ['path', { d: 'm21 21-4.3-4.3' }]
  ],
  SlidersHorizontal: [
    ['line', { x1: '21', x2: '14', y1: '4', y2: '4' }],
    ['line', { x1: '10', x2: '3', y1: '4', y2: '4' }],
    ['line', { x1: '21', x2: '12', y1: '12', y2: '12' }],
    ['line', { x1: '8', x2: '3', y1: '12', y2: '12' }],
    ['line', { x1: '21', x2: '16', y1: '20', y2: '20' }],
    ['line', { x1: '12', x2: '3', y1: '20', y2: '20' }],
    ['line', { x1: '14', x2: '14', y1: '2', y2: '6' }],
    ['line', { x1: '8', x2: '8', y1: '10', y2: '14' }],
    ['line', { x1: '16', x2: '16', y1: '18', y2: '22' }]
  ],
  Bell: [
    ['path', { d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }],
    ['path', { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }]
  ],
  Sun: [
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['path', { d: 'M12 2v2' }],
    ['path', { d: 'M12 20v2' }],
    ['path', { d: 'm4.93 4.93 1.41 1.41' }],
    ['path', { d: 'm17.66 17.66 1.41 1.41' }],
    ['path', { d: 'M2 12h2' }],
    ['path', { d: 'M20 12h2' }],
    ['path', { d: 'm6.34 17.66-1.41 1.41' }],
    ['path', { d: 'm19.07 4.93-1.41 1.41' }]
  ],
  Moon: [
    ['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]
  ],
  MonitorSmartphone: [
    ['path', { d: 'M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8' }],
    ['path', { d: 'M10 19v-3.96 3.15' }],
    ['path', { d: 'M7 19h5' }],
    ['rect', { width: '6', height: '10', x: '16', y: '12', rx: '2' }]
  ],
  Sparkles: [
    ['path', { d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z' }],
    ['path', { d: 'M5 3v4' }],
    ['path', { d: 'M19 17v4' }],
    ['path', { d: 'M3 5h4' }],
    ['path', { d: 'M17 19h4' }]
  ],
  CalendarCheck: [
    ['path', { d: 'M8 2v4' }],
    ['path', { d: 'M16 2v4' }],
    ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }],
    ['path', { d: 'M3 10h18' }],
    ['path', { d: 'm9 16 2 2 4-4' }]
  ],
  CalendarClock: [
    ['path', { d: 'M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5' }],
    ['path', { d: 'M16 2v4' }],
    ['path', { d: 'M8 2v4' }],
    ['path', { d: 'M3 10h5' }],
    ['path', { d: 'M17.5 17.5 16 16.3V14' }],
    ['circle', { cx: '16', cy: '16', r: '6' }]
  ],
  Ticket: [
    ['path', { d: 'M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z' }],
    ['path', { d: 'M13 5v2' }],
    ['path', { d: 'M13 17v2' }],
    ['path', { d: 'M13 11v2' }]
  ],
  Star: [
    ['polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }]
  ],
  ArrowRight: [
    ['path', { d: 'M5 12h14' }],
    ['path', { d: 'm12 5 7 7-7 7' }]
  ],
  MapPin: [
    ['path', { d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' }],
    ['circle', { cx: '12', cy: '10', r: '3' }]
  ],
  Heart: [
    ['path', { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' }]
  ],
  CheckCircle2: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'm9 12 2 2 4-4' }]
  ]
};

export function createIcon(name, size = 16, className = '') {
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);

  const shapes = ICON_PATHS[name] || ICON_PATHS.Sparkles;
  for (const [tag, attrs] of shapes) {
    const child = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) {
      child.setAttribute(k, v);
    }
    svg.append(child);
  }
  return svg;
}

export function createBrandMarkSvg(width = 24, height = 24) {
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('aria-hidden', 'true');

  const field = document.createElementNS(ns, 'rect');
  for (const [key, value] of Object.entries({ x: '8', y: '12', width: '48', height: '40', rx: '5', fill: 'none', stroke: '#d9f6df', 'stroke-width': '3' })) field.setAttribute(key, value);
  const line = document.createElementNS(ns, 'path');
  for (const [key, value] of Object.entries({ d: 'M32 12v40 M8 24h6v16H8 M56 24h-6v16h6', fill: 'none', stroke: '#d9f6df', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) line.setAttribute(key, value);
  const ring = document.createElementNS(ns, 'circle');
  for (const [key, value] of Object.entries({ cx: '32', cy: '32', r: '7', fill: '#174e2e', stroke: '#b8efca', 'stroke-width': '2.5' })) ring.setAttribute(key, value);
  const point = document.createElementNS(ns, 'circle');
  for (const [key, value] of Object.entries({ cx: '32', cy: '32', r: '3', fill: '#a8ef84' })) point.setAttribute(key, value);
  svg.append(field, line, ring, point);
  return svg;
}

export function createBrandMark({ compact = false, withWordmark = true, className = '' } = {}) {
  const root = el('span', null, { class: `brand ${className}`.trim() }, [
    el('span', null, { class: 'brand-mark-box' }, [createBrandMarkSvg(28, 28)])
  ]);
  if (withWordmark) {
    const textGroup = el('span', null, { class: 'brand-text-group' }, [
      el('span', 'Pitch Point', { class: 'brand-title' }),
      compact ? null : el('span', 'Đặt sân bóng Việt Nam', { class: 'brand-subtitle' })
    ]);
    root.append(textGroup);
  }
  return root;
}

export function createPitchDiagramSvg() {
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 320 450');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'hero-pitch');

  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('x', '20');
  rect.setAttribute('y', '20');
  rect.setAttribute('width', '280');
  rect.setAttribute('height', '410');
  rect.setAttribute('rx', '4');

  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M20 225h280 M110 20v60h100V20 M110 430v-60h100v60');

  const c1 = document.createElementNS(ns, 'circle');
  c1.setAttribute('cx', '160');
  c1.setAttribute('cy', '225');
  c1.setAttribute('r', '42');

  const c2 = document.createElementNS(ns, 'circle');
  c2.setAttribute('cx', '160');
  c2.setAttribute('cy', '225');
  c2.setAttribute('r', '2');
  c2.setAttribute('fill', 'currentColor');

  [rect, path, c1, c2].forEach((shape) => shape.setAttribute('pathLength', '1'));
  svg.append(rect, path, c1, c2);
  return svg;
}

export function animateFormattedValue(targetEl, finalStr, { duration = 520, fromZero = false } = {}) {
  if (!targetEl) return;
  const str = String(finalStr ?? '0');
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    targetEl.textContent = str;
    targetEl.dataset.rawNumber = '';
    return;
  }

  const vndMatch = /^([+-]?\s*)([\d.]+)(\s*₫.*)$/.exec(str);
  const ratioMatch = !vndMatch && /^(\d+(?:\.\d+)?)(\/5.*)$/.exec(str);
  const plainIntMatch = !vndMatch && !ratioMatch && /^([+-]?\d+)$/.exec(str);

  let targetNum = null;
  let formatter = null;

  if (vndMatch) {
    const prefix = vndMatch[1] || '';
    const digits = Number(vndMatch[2].replace(/\./g, ''));
    const suffix = vndMatch[3] || ' ₫';
    if (Number.isFinite(digits)) {
      targetNum = digits;
      formatter = (val) => `${prefix}${Math.round(val).toLocaleString('vi-VN')}${suffix}`;
    }
  } else if (ratioMatch) {
    const num = Number(ratioMatch[1]);
    const suffix = ratioMatch[2];
    if (Number.isFinite(num)) {
      targetNum = num;
      formatter = (val) => `${val.toFixed(1)}${suffix}`;
    }
  } else if (plainIntMatch) {
    const num = Number(plainIntMatch[1]);
    if (Number.isFinite(num)) {
      targetNum = num;
      formatter = (val) => String(Math.round(val));
    }
  }

  if (targetNum === null || !formatter) {
    targetEl.textContent = str;
    return;
  }

  const prevRaw = fromZero ? 0 : Number(targetEl.dataset.rawNumber ?? 0);
  const startNum = Number.isFinite(prevRaw) ? prevRaw : 0;
  targetEl.dataset.rawNumber = String(targetNum);

  if (startNum === targetNum && targetEl.textContent === str) {
    return;
  }

  if (targetEl._countRaf) cancelAnimationFrame(targetEl._countRaf);
  const startTime = performance.now();

  const tick = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = startNum + (targetNum - startNum) * eased;
    targetEl.textContent = t < 1 ? formatter(current) : str;
    if (t < 1) {
      targetEl._countRaf = requestAnimationFrame(tick);
    } else {
      targetEl._countRaf = null;
    }
  };
  targetEl._countRaf = requestAnimationFrame(tick);
}

export function renderStatCard({ label, value, hint = null, icon = 'Building2', tone = 'primary', progress = null }) {
  const toneClass = tone && tone !== 'primary' ? `stat-icon-box--${tone}` : '';
  const pct = progress !== null && progress !== undefined ? Math.max(0, Math.min(100, Math.round(Number(progress) || 0))) : null;
  const fillEl = pct !== null
    ? el('div', null, { class: `stat-progress-fill stat-progress-fill--${tone || 'primary'}`, style: 'width:0%' })
    : null;
  const progressEl = fillEl
    ? el('div', null, { class: 'stat-progress-track', 'aria-hidden': 'true' }, [fillEl])
    : null;
  const valEl = el('p', String(value ?? '0'), { class: 'stat-value' });
  const left = el('div', null, { utility: 'u-min-width-0 u-flex-1' }, [
    el('p', label, { class: 'stat-label' }),
    valEl,
    hint ? (typeof hint === 'object' ? hint : el('p', String(hint), { class: 'stat-hint' })) : null
  ]);
  const iconBox = icon ? el('span', null, { class: `stat-icon-box ${toneClass}`.trim() }, [
    createIcon(icon, 20)
  ]) : null;
  const card = el('div', null, { class: `surface stat-card stat-card--${tone || 'primary'} motion-card` }, [
    el('div', null, { class: 'stat-card-row' }, [left, iconBox]),
    progressEl
  ]);
  requestAnimationFrame(() => {
    if (fillEl) {
      requestAnimationFrame(() => {
        fillEl.style.width = `${pct}%`;
      });
    }
  });
  return card;
}

export function buildThemeToggle({ compact = false } = {}) {
  const OPTIONS = [
    { value: 'light', label: 'Sáng', icon: 'Sun' },
    { value: 'dark', label: 'Tối', icon: 'Moon' },
    { value: 'system', label: 'Theo hệ thống', icon: 'MonitorSmartphone' }
  ];

  if (compact) {
    const wrap = el('div', null, { class: 'popover-wrap header-theme-toggle' });
    const btn = el('button', null, {
      type: 'button',
      class: 'icon-btn',
      'aria-label': 'Chế độ hiển thị',
      title: 'Chế độ hiển thị',
      'aria-expanded': 'false'
    });
    const panel = el('div', null, {
      class: 'popover-panel popover-panel--sm',
      hidden: true,
      role: 'menu',
      'aria-label': 'Chọn chế độ hiển thị'
    });

    function syncCompactIcon() {
      if (!wrap.isConnected && wrap.dataset.wasConnected) {
        window.removeEventListener('pitch-point:theme-changed', syncCompactIcon);
        return;
      }
      if (wrap.isConnected) wrap.dataset.wasConnected = 'true';
      const currentVal = getSelectedTheme();
      const currentOpt = OPTIONS.find(o => o.value === currentVal) || OPTIONS[2];
      btn.setAttribute('aria-label', `Chế độ hiển thị: ${currentOpt.label}`);
      btn.replaceChildren(createIcon(currentOpt.icon, 16));
      panel.replaceChildren();
      for (const opt of OPTIONS) {
        const item = el('button', null, {
          type: 'button',
          class: `popover-item ${opt.value === currentVal ? 'font-bold' : ''}`.trim(),
          role: 'menuitemradio',
          'aria-checked': String(opt.value === currentVal)
        }, [
          createIcon(opt.icon, 15),
          el('span', opt.label)
        ]);
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          applyTheme(opt.value);
          panel.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
        });
        panel.append(item);
      }
    }

    syncCompactIcon();
    queueMicrotask(() => { if (wrap.isConnected) wrap.dataset.wasConnected = 'true'; });
    window.addEventListener('pitch-point:theme-changed', syncCompactIcon);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = panel.hidden;
      hidePopoverPanels();
      panel.hidden = !isHidden;
      btn.setAttribute('aria-expanded', String(isHidden));
    });

    wrap.append(btn, panel);
    return wrap;
  }

  const group = el('div', null, {
    role: 'radiogroup',
    'aria-label': 'Chế độ hiển thị',
    class: 'theme-segmented'
  });

  const segButtons = new Map();
  for (const opt of OPTIONS) {
    const b = el('button', null, {
      type: 'button',
      role: 'radio',
      'aria-checked': 'false',
      'data-theme-opt': opt.value,
      class: 'theme-segmented-btn',
      title: opt.label
    }, [
      createIcon(opt.icon, 14),
      el('span', opt.label)
    ]);
    b.addEventListener('click', () => applyTheme(opt.value));
    segButtons.set(opt.value, b);
    group.append(b);
  }

  function syncSegmented() {
    const currentVal = getSelectedTheme();
    for (const [val, b] of segButtons.entries()) {
      b.setAttribute('aria-checked', String(val === currentVal));
    }
  }

  syncSegmented();
  queueMicrotask(() => updateLiquidIndicator(group, '.theme-segmented-btn[aria-checked="true"]'));
  const onThemeChange = () => {
    if (!group.isConnected) { window.removeEventListener('pitch-point:theme-changed', onThemeChange); return; }
    syncSegmented();
    updateLiquidIndicator(group, '.theme-segmented-btn[aria-checked="true"]');
  };
  window.addEventListener('pitch-point:theme-changed', onThemeChange);
  return group;
}

const NOTIFICATION_POLL_MS = 5000;

function buildNotificationsBell(user) {
  const wrap = el('div', null, { class: 'popover-wrap' });
  const btn = el('button', null, {
    type: 'button',
    class: 'icon-btn',
    'aria-label': 'Thông báo',
    'aria-expanded': 'false'
  });
  const bellIcon = createIcon('Bell', 16);
  bellIcon.classList.add('notification-motion-icon');
  const badge = el('span', '0', { class: 'unread-badge', hidden: true });
  btn.append(bellIcon, badge);

  const panel = el('div', null, { class: 'popover-panel', hidden: true, role: 'region', 'aria-label': 'Thông báo gần đây' });
  const head = el('div', null, { class: 'row-between', utility: 'u-padding-0p5rem-0p75rem u-border-bottom-1px-solid-border u-margin-bottom-0p25rem' }, [
    el('strong', 'Thông báo', { class: 'text-sm' }),
    el('a', 'Xem tất cả', { href: 'notifications.html', class: 'text-xs font-bold', utility: 'u-color-brand-text u-text-decoration-none' })
  ]);
  const list = el('div', null, { class: 'popover-list' });
  panel.append(head, list);
  wrap.append(btn, panel);

  let seenIds = null;
  let lastSignature = '';
  let pollTimer = null;
  let cursor = null;
  let lastUnread = null;
  let checking = false;

  async function checkUpdates() {
    if (!wrap.isConnected && wrap.dataset.wasConnected) { stopPolling(); return; }
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      const r = await api.updates({ since: cursor || '' });
      const first = cursor === null;
      cursor = r.server_time;
      if (first) return;
      const unseen = (r.notifications || []).some(n => !seenIds?.has(n.id));
      if (unseen || r.unread_count !== lastUnread) await refreshNotifications();
    } catch { } finally {
      checking = false;
    }
  }

  function stopPolling() {
    window.removeEventListener('pitch-point:notifications-changed', refreshNotifications);
    document.removeEventListener('visibilitychange', onVisibility);
    clearInterval(pollTimer);
  }

  function announceNew(mine) {
    const fresh = seenIds ? mine.filter(n => !n.read && !seenIds.has(n.id)) : [];
    seenIds = new Set(mine.map(n => n.id));
    const activeConversation = window.__pitchPointActiveConversation;
    const shown = fresh.filter(n => !(activeConversation && String(n.link || '').includes(`conversationId=${activeConversation}`)));
    if (!shown.length) return;
    window.dispatchEvent(new CustomEvent('pitch-point:notification-arrived', { detail: shown }));
    toast(shown.length === 1 ? `🔔 ${shown[0].title || 'Bạn có thông báo mới'}` : `🔔 Bạn có ${shown.length} thông báo mới`);
  }

  async function refreshNotifications() {
    if (!wrap.isConnected && wrap.dataset.wasConnected) {
      stopPolling();
      return;
    }
    if (wrap.isConnected) wrap.dataset.wasConnected = 'true';
    try {
      const { items: mine } = await api.entities.Notification.filter({ recipient_id: user.id }, { sort: '-created_date' });
      announceNew(mine);
      lastUnread = mine.filter(n => !n.read).length;
      const signature = mine.slice(0, 6).map(n => `${n.id}:${n.read ? 1 : 0}`).join(',') + `|${mine.filter(n => !n.read).length}`;
      if (signature === lastSignature) return;
      lastSignature = signature;
      const unread = mine.filter(n => !n.read).length;
      if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.hidden = false;
        bellIcon.classList.add('notification-bell-ring');
        btn.setAttribute('aria-label', `Thông báo (${unread} chưa đọc)`);
      } else {
        badge.hidden = true;
        bellIcon.classList.remove('notification-bell-ring');
        btn.setAttribute('aria-label', 'Thông báo');
      }
      list.replaceChildren();
      const recent = mine.slice(0, 6);
      if (!recent.length) {
        list.append(el('p', 'Chưa có thông báo nào.', { class: 'muted text-sm', utility: 'u-padding-1rem u-text-align-center' }));
        return;
      }
      for (const item of recent) {
        const itemBtn = el('button', null, {
          type: 'button',
          class: `popover-item ${item.read ? '' : 'popover-item--unread'}`.trim(),
          utility: 'u-flex-direction-column u-align-items-flex-start u-gap-0p15rem'
        });
        const title = item.title || 'Thông báo';
        const top = el('div', null, { class: 'notif-preview-top' }, [
          el('strong', title, { class: 'text-sm notif-preview-title', title }),
          el('span', relativeTime(item.created_date), { class: 'text-xs muted notif-preview-time' })
        ]);
        const body = el('p', item.body || '', { class: 'text-xs muted notif-preview-body' });
        const more = el('span', 'Xem đầy đủ', { class: 'text-xs notif-preview-more', hidden: true });
        itemBtn.append(top, body, more);
        const isCut = () => body.scrollHeight > body.clientHeight + 1;
        itemBtn.addEventListener('click', async () => {
          const cut = isCut();
          panel.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          if (!item.read) {
            try { await api.entities.Notification.update(item.id, { read: true }); } catch { }
          }
          location.href = cut
            ? `notifications.html#n-${encodeURIComponent(item.id)}`
            : translateLink(item.link || 'notifications.html');
        });
        list.append(itemBtn);
        requestAnimationFrame(() => { more.hidden = !isCut(); });
      }
    } catch { }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = panel.hidden;
    hidePopoverPanels();
    panel.hidden = !isHidden;
    btn.setAttribute('aria-expanded', String(isHidden));
    if (!panel.hidden) refreshNotifications();
  });

  function onVisibility() {
    if (document.visibilityState === 'visible') checkUpdates();
  }

  window.addEventListener('pitch-point:notifications-changed', refreshNotifications);
  document.addEventListener('visibilitychange', onVisibility);
  pollTimer = setInterval(checkUpdates, NOTIFICATION_POLL_MS);
  refreshNotifications().then(checkUpdates);
  queueMicrotask(() => { if (wrap.isConnected) wrap.dataset.wasConnected = 'true'; });
  return wrap;
}

function buildAccountMenu(user, { isDashboard = false } = {}) {
  const wrap = el('div', null, { class: 'popover-wrap' });
  const btn = el('button', null, {
    type: 'button',
    class: `account-pill-btn ${isDashboard ? 'account-pill-btn--dashboard' : ''}`.trim(),
    'aria-label': 'Tài khoản của tôi',
    'aria-haspopup': 'menu',
    'aria-controls': 'account-menu-panel',
    'aria-expanded': 'false'
  });
  const avatar = buildAvatar(user);
  const nameSpan = el('span', user.full_name || 'Tài khoản', { class: 'account-pill-name', title: user.full_name || '' });
  btn.append(avatar, nameSpan);

  const panel = el('div', null, { id: 'account-menu-panel', class: 'popover-panel popover-panel--menu', hidden: true, role: 'menu', 'aria-label': 'Menu tài khoản' });
  const info = el('div', null, { utility: 'u-padding-0p5rem-0p75rem u-border-bottom-1px-solid-border u-margin-bottom-0p25rem' }, [
    el('div', user.full_name || 'Người dùng', { class: 'font-bold text-sm' }),
    el('div', user.email, { class: 'text-xs muted' })
  ]);
  panel.append(info);

  const roleLinks = [];
  if (user.app_role === 'admin') {
    roleLinks.push(['Bảng quản trị', 'admin-dashboard.html']);
  } else if (user.app_role === 'manager') {
    roleLinks.push(['Khu chủ sân', 'manager-dashboard.html']);
  } else {
    roleLinks.push(
      ['Đơn đặt sân', 'booking-history.html'],
      ['Tin nhắn', 'messages.html'],
      ['Sân yêu thích', 'favorite-pitches.html'],
      ['Lịch sử thanh toán', 'payment-history.html']
    );
  }
  roleLinks.push(
    ['Thông báo', 'notifications.html'],
    ['Cài đặt tài khoản', 'account-settings.html']
  );

  for (const [label, href] of roleLinks) {
    panel.append(el('a', label, { href, class: 'popover-item', role: 'menuitem' }));
  }

  const logoutBtn = el('button', null, {
    type: 'button',
    role: 'menuitem',
    class: 'popover-item',
    utility: 'u-border-top-1px-solid-border u-margin-top-0p25rem'
  }, [
    createIcon('LogOut', 16),
    el('span', 'Đăng xuất')
  ]);
  logoutBtn.addEventListener('click', async () => {
    await api.auth.logout();
    location.href = 'index.html';
  });
  panel.append(logoutBtn);
  wrap.append(btn, panel);
  panel.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [...panel.querySelectorAll('[role="menuitem"]')];
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[index].focus();
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = panel.hidden;
    hidePopoverPanels();
    panel.hidden = !isHidden;
    btn.setAttribute('aria-expanded', String(isHidden));
    if (isHidden) panel.querySelector('[role="menuitem"]')?.focus();
  });

  btn.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    hidePopoverPanels();
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    panel.querySelector('[role="menuitem"]')?.focus();
  });

  return wrap;
}

let docClickAttached = false;
function ensureGlobalPopoverClose() {
  if (docClickAttached) return;
  docClickAttached = true;
  const closePopovers = (restoreFocus = false) => {
    document.querySelectorAll('.popover-panel:not([hidden])').forEach(panel => {
      const trigger = panel.parentElement?.querySelector('[aria-expanded]');
      panel.hidden = true;
      trigger?.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger?.focus();
    });
  };
  document.addEventListener('click', () => {
    closePopovers();
  });
  document.addEventListener('keydown', (e) => {
    const tab = e.target.closest?.('[role="tab"]');
    const tabs = tab?.closest('[role="tablist"]');
    if (tabs && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      const items = [...tabs.querySelectorAll('[role="tab"]')];
      const index = items.indexOf(tab);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
        : (index + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      e.preventDefault();
      items[next]?.click();
      return;
    }
    if (e.key === 'Escape') {
      closePopovers(true);
    }
  });
}

const AUTH_PAGES = new Set(['login', 'register', 'forgot-password', 'reset-password']);
const DASHBOARD_PAGES = new Set([
  'manager-dashboard',
  'manager-pitches',
  'add-pitch',
  'edit-pitch',
  'pitch-availability',
  'manager-bookings',
  'manager-revenue',
  'admin-dashboard',
  'admin-users',
  'admin-pitch-managers',
  'admin-pitch-moderation',
  'admin-finance',
  'admin-reports',
  'admin-content',
  'admin-activity-log',
  'admin-settings'
]);

export function renderHeaderElement(header, user) {
  if (!header) return;
  ensureGlobalPopoverClose();

  const currentPage = document.body.dataset.page || '';
  const currentFile = location.pathname.split('/').pop() || 'index.html';

  if (AUTH_PAGES.has(currentPage) || ['403', '404', '500'].includes(currentPage) || currentFile.startsWith('403') || currentFile.startsWith('500')) {
    header.remove();
    return;
  }

  if (currentFile.startsWith('404')) {
    header.className = 'site-header';
    const wrap = el('div', null, { class: 'container header-inner' }, [
      el('a', null, { href: 'index.html', 'aria-label': 'Pitch Point — trang chủ' }, [createBrandMark()])
    ]);
    header.replaceChildren(wrap);
    return;
  }

  if (!document.querySelector('.skip-link')) {
    const mainEl = document.querySelector('main');
    if (mainEl && !mainEl.id) mainEl.id = 'main';
    const skip = el('a', 'Bỏ qua điều hướng', { href: '#main', class: 'skip-link' });
    document.body.prepend(skip);
  }

  const isDashboard = DASHBOARD_PAGES.has(currentPage) || (currentPage === 'messages' && ['manager', 'admin'].includes(user?.app_role));
  if (isDashboard && (currentPage.startsWith('admin-') || user?.app_role === 'admin')) {
    document.body.classList.add('admin-workspace');
  }

  if (isDashboard) {
    header.className = 'site-header site-header--dashboard';
    const wrap = el('div', null, { class: 'container--dashboard header-inner' });

    const mobileSidebarBtn = el('button', null, {
      type: 'button',
      class: 'icon-btn icon-btn--sm dashboard-mobile-trigger',
      'data-dashboard-drawer-trigger': '',
      'aria-label': 'Mở menu quản lý'
    }, [createIcon('Menu', 16)]);

    const brandLink = el('a', null, { href: 'index.html', 'aria-label': 'Pitch Point — trang chủ' }, [
      createBrandMark({ compact: true })
    ]);

    const actions = el('div', null, { class: 'header-actions' });
    if (user) {
      actions.append(buildNotificationsBell(user));
    }
    actions.append(buildThemeToggle({ compact: true }));
    if (user) {
      actions.append(buildAccountMenu(user, { isDashboard: true }));
    }

    wrap.append(mobileSidebarBtn, brandLink, actions);
    header.replaceChildren(wrap);
    return;
  }

  header.className = 'site-header';
  const wrap = el('div', null, { class: 'container header-inner' });
  const brandLink = el('a', null, { href: 'index.html', 'aria-label': 'Pitch Point — trang chủ' }, [
    createBrandMark({ compact: false })
  ]);
  wrap.append(brandLink);

  const nav = el('nav', null, { class: 'site-nav site-nav--desktop', 'aria-label': 'Điều hướng chính' });
  const links = [
    ['Trang chủ', 'index.html'],
    ['Tìm sân', 'search.html']
  ];
  if (user?.app_role === 'manager') {
    links.push(['Khu chủ sân', 'manager-dashboard.html']);
  } else if (user?.app_role === 'admin') {
    links.push(['Quản trị', 'admin-dashboard.html']);
  } else if (user) {
    links.push(
      ['Đơn đặt sân', 'booking-history.html'],
      ['Sân yêu thích', 'favorite-pitches.html'],
      ['Tin nhắn', 'messages.html']
    );
  }

  const staffHome = user?.app_role === 'manager' ? 'manager-dashboard.html' : user?.app_role === 'admin' ? 'admin-dashboard.html' : null;
  const pitchPages = ['pitch-detail.html', 'booking-schedule.html', 'pitch-owner-profile.html'];
  const navIsCurrent = href => currentFile === href
    || (staffHome
      ? href === staffHome && [...pitchPages, 'booking-details.html', 'messages.html', 'notifications.html'].includes(currentFile)
      : href === 'search.html' && pitchPages.includes(currentFile));
  for (const [label, href] of links) {
    const isCurrent = navIsCurrent(href);
    const link = el('a', null, {
      href,
      class: 'nav-link public-nav-item',
      'aria-current': isCurrent ? 'page' : null
    }, [el('span', label, { class: 'nav-label' })]);
    link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') updateLiquidIndicator(nav, link); });
    nav.append(link);
  }
  nav.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') updateLiquidIndicator(nav, '.public-nav-item[aria-current="page"]'); });
  wrap.append(nav);
  queueMicrotask(() => updateLiquidIndicator(nav, '.public-nav-item[aria-current="page"]'));

  const actions = el('div', null, { class: 'header-actions' });

  const quickSearch = el('button', null, {
    type: 'button', class: 'icon-btn icon-btn--sm header-search-quick',
    'aria-label': 'Tìm sân theo tên', 'aria-expanded': 'false'
  }, [createIcon('Search', 16)]);
  actions.append(quickSearch);
  const searchBox = el('div', null, { class: 'header-search-panel', hidden: true });
  const input = el('input', null, { type: 'search', class: 'header-search-input', placeholder: 'Nhập tên sân…', 'aria-label': 'Tên sân', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': 'header-search-results', autocomplete: 'off' });
  const resultList = el('div', null, { id: 'header-search-results', class: 'header-search-results', role: 'listbox', hidden: true });
  const searchStatus = el('p', '', { class: 'header-search-status', role: 'status', 'aria-live': 'polite' });
  const inputWrap = el('div', null, { class: 'header-search-field' });
  inputWrap.append(input, resultList, searchStatus);
  searchBox.append(inputWrap);
  wrap.append(searchBox);
  let pitches = [], activeIndex = -1, requestId = 0;
  const fold = (value) => String(value || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
  const close = () => { requestId++; wrap.classList.remove('is-search-open'); nav.inert = false; [...actions.children].forEach((child) => { child.inert = false; }); searchBox.hidden = true; resultList.hidden = true; input.value = ''; input.removeAttribute('aria-activedescendant'); quickSearch.setAttribute('aria-expanded', 'false'); quickSearch.focus(); };
  const renderSuggestions = () => {
    const term = fold(input.value); activeIndex = -1; input.removeAttribute('aria-activedescendant'); resultList.replaceChildren();
    if (!term) { resultList.hidden = true; input.setAttribute('aria-expanded', 'false'); searchStatus.textContent = ''; return; }
    const matches = pitches.filter((pitch) => fold(pitch.name).includes(term)).slice(0, 8);
    matches.forEach((pitch, index) => {
      const option = el('a', pitch.name, { href: `pitch-detail.html?id=${encodeURIComponent(pitch.id)}`, role: 'option', id: `header-suggestion-${index}`, class: 'header-search-option', 'aria-selected': 'false' });
      resultList.append(option);
    });
    resultList.hidden = !matches.length; input.setAttribute('aria-expanded', String(!!matches.length));
    searchStatus.textContent = matches.length ? `${matches.length} sân gợi ý` : 'Không tìm thấy sân phù hợp.';
  };
  quickSearch.addEventListener('click', async () => {
    const current = ++requestId; searchBox.hidden = false; wrap.classList.add('is-search-open'); nav.inert = true; [...actions.children].forEach((child) => { child.inert = true; }); quickSearch.setAttribute('aria-expanded', 'true'); input.focus();
    searchStatus.textContent = 'Đang tải danh sách sân…';
    try { const res = await api.entities.Pitch.filter({ status: 'active' }, { limit: 10000 }); if (current !== requestId) return; pitches = res.items || []; searchStatus.textContent = ''; renderSuggestions(); }
    catch { if (current === requestId) searchStatus.textContent = 'Không tải được danh sách sân. Hãy đóng và thử lại.'; }
  });
  input.addEventListener('input', renderSuggestions);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    const options = [...resultList.querySelectorAll('[role="option"]')];
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) { event.preventDefault(); activeIndex = event.key === 'ArrowDown' ? (activeIndex + 1) % options.length : (activeIndex - 1 + options.length) % options.length; options.forEach((option, i) => option.setAttribute('aria-selected', String(i === activeIndex))); input.setAttribute('aria-activedescendant', options[activeIndex].id); options[activeIndex].scrollIntoView({ block: 'nearest' }); }
    else if (event.key === 'Enter' && options.length) { event.preventDefault(); location.assign(options[Math.max(activeIndex, 0)].href); }
  });
  const handleOutsideSearch = (event) => {
    if (!wrap.isConnected) { document.removeEventListener('pointerdown', handleOutsideSearch); return; }
    if (wrap.classList.contains('is-search-open') && !searchBox.contains(event.target)) close();
  };
  document.addEventListener('pointerdown', handleOutsideSearch);

  if (user) {
    actions.append(buildNotificationsBell(user));
  }

  actions.append(buildThemeToggle({ compact: true }));

  if (user) {
    actions.append(buildAccountMenu(user, { isDashboard: false }));
  } else {
    actions.append(
      el('a', 'Đăng nhập', { href: 'login.html', class: 'button ghost sm' }),
      el('a', 'Đăng ký', { href: 'register.html', class: 'button sm' })
    );
  }

  const mobileBtn = el('button', null, {
    type: 'button',
    class: 'icon-btn icon-btn--sm mobile-menu-toggle',
    'aria-label': 'Mở menu',
    'aria-expanded': 'false'
  }, [createIcon('Menu', 16)]);
  actions.append(mobileBtn);
  wrap.append(actions);

  let existingSheet = document.querySelector('#public-mobile-sheet');
  if (existingSheet) existingSheet.remove();
  const sheetBackdrop = el('div', null, { id: 'public-mobile-sheet', class: 'sheet-backdrop', hidden: true });
  const sheetPanel = el('div', null, { class: 'sheet-panel', role: 'dialog', 'aria-label': 'Điều hướng di động' });
  sheetPanel.setAttribute('aria-modal', 'true');
  mobileBtn.setAttribute('aria-controls', 'public-mobile-sheet');
  const closeMenu = () => { sheetBackdrop.hidden = true; mobileBtn.setAttribute('aria-expanded', 'false'); mobileBtn.focus(); };
  const sheetTop = el('div', null, { class: 'row-between' }, [
    createBrandMark({ compact: true }),
    el('button', '✕', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Đóng menu' })
  ]);
  sheetTop.querySelector('button').addEventListener('click', () => {
    closeMenu();
  });

  const drawerNav = el('nav', null, { class: 'sheet-nav', 'aria-label': 'Điều hướng chính' });
  for (const [label, href] of links) {
    const isCurrent = navIsCurrent(href);
    drawerNav.append(el('a', label, {
      href,
      class: 'nav-link',
      'aria-current': isCurrent ? 'page' : null
    }));
  }
  const sheetBottom = el('div', null, { class: 'stack', utility: 'u-margin-top-auto' }, [
    buildThemeToggle({ compact: false })
  ]);
  if (user) {
    const outBtn = el('button', null, { type: 'button', class: 'button secondary full' }, [
      createIcon('LogOut', 16),
      el('span', 'Đăng xuất')
    ]);
    outBtn.addEventListener('click', async () => {
      await api.auth.logout();
      location.href = 'index.html';
    });
    sheetBottom.append(outBtn);
  } else {
    sheetBottom.append(
      el('a', 'Đăng ký', { href: 'register.html', class: 'button full' }),
      el('a', 'Đăng nhập', { href: 'login.html', class: 'button secondary full' })
    );
  }
  sheetPanel.append(sheetTop, drawerNav, sheetBottom);
  sheetBackdrop.append(sheetPanel);
  sheetBackdrop.addEventListener('click', (e) => {
    if (e.target === sheetBackdrop) {
      closeMenu();
    }
  });
  document.body.append(sheetBackdrop);

  sheetPanel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...sheetPanel.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter((item) => item.getClientRects().length);
    if (!controls.length) return;
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
  });

  mobileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sheetBackdrop.hidden = !sheetBackdrop.hidden;
    mobileBtn.setAttribute('aria-expanded', String(!sheetBackdrop.hidden));
    if (!sheetBackdrop.hidden) sheetTop.querySelector('button').focus();
  });

  header.replaceChildren(wrap);
}

export function renderFooterElement(footer, user) {
  if (!footer) return;
  const currentPage = document.body.dataset.page || '';
  const currentFile = location.pathname.split('/').pop() || 'index.html';

  if (
    AUTH_PAGES.has(currentPage) ||
    currentFile.startsWith('403') ||
    currentFile.startsWith('404') ||
    currentFile.startsWith('500')
  ) {
    footer.remove();
    return;
  }

  footer.className = 'site-footer';
  const container = el('div', null, { class: 'container footer-grid' });

  const col1 = el('div', null, { class: 'stack-sm footer-about' }, [
    createBrandMark({ compact: false }),
    el('p', 'Đặt sân theo giờ, thanh toán bằng ví.', { class: 'text-sm muted' })
  ]);

  const roleColTitle = user?.app_role === 'admin' ? 'Quản trị' : user?.app_role === 'manager' ? 'Chủ sân' : 'Tài khoản';
  const roleItems = user?.app_role === 'admin'
    ? [
        ['Bảng điều khiển', 'admin-dashboard.html'],
        ['Quản lý người dùng', 'admin-users.html']
      ]
    : user?.app_role === 'manager'
      ? [
          ['Bảng điều khiển', 'manager-dashboard.html'],
          ['Doanh thu', 'manager-revenue.html'],
          ['Tin nhắn với khách', 'messages.html']
        ]
      : user
        ? [
            ['Đơn đặt sân', 'booking-history.html'],
            ['Tin nhắn', 'messages.html']
          ]
        : [
            ['Đăng nhập', 'login.html'],
            ['Đăng ký', 'register.html']
          ];

  const col2 = el('div', null, {}, [
    el('p', roleColTitle, { class: 'footer-heading' }),
    el('ul', null, { class: 'footer-links' }, roleItems.map(([label, href]) => el('li', null, {}, [el('a', label, { href })])))
  ]);

  const col3 = el('div', null, {}, [
    el('p', 'Khám phá', { class: 'footer-heading' }),
    el('ul', null, { class: 'footer-links' }, [
      el('li', null, {}, [el('a', 'Trang chủ', { href: 'index.html' })]),
      el('li', null, {}, [el('a', 'Tìm sân bóng', { href: 'search.html' })]),
      user ? el('li', null, {}, [el('a', 'Thông báo', { href: 'notifications.html' })]) : null,
      !user ? el('li', null, {}, [el('a', 'Chế độ hiển thị', { href: 'settings.html' })]) : null
    ])
  ]);

  const col4 = el('div', null, { class: 'footer-note' }, [
    el('p', 'Lưu ý', { class: 'footer-heading' }),
    el('p', 'Tiền trong ví là tiền thử nghiệm.', { class: 'text-sm muted' })
  ]);

  container.append(col1, col2, col3, col4);

  const bottom = el('div', `© ${new Date().getFullYear()} Pitch Point, đặt sân bóng đá Việt Nam`, { class: 'footer-bottom' });
  footer.replaceChildren(container, bottom);
}

let restrictionObserver = null;
let accountSuspended = false;
let suspendedGuardInstalled = false;
const APPEAL_HREF = 'account-settings.html#appeal';

export function showSuspendedNotice() {
  let dialog = document.getElementById('suspended-notice');
  if (!dialog) {
    const closeBtn = el('button', 'Đóng', { type: 'button', class: 'button secondary' });
    const appealLink = el('a', 'Gửi khiếu nại', { href: APPEAL_HREF, class: 'button' });
    dialog = el('dialog', null, { id: 'suspended-notice', 'aria-labelledby': 'suspended-notice-title' }, [
      el('div', null, { class: 'stack' }, [
        el('h2', 'Tài khoản đang tạm khóa', { id: 'suspended-notice-title' }),
        el('p', 'Bạn vẫn xem được sân, lịch và các đơn của mình, nhưng chưa thể thực hiện thao tác này cho tới khi tài khoản được mở lại.'),
        el('p', 'Nếu bạn cho rằng đây là nhầm lẫn, hãy gửi khiếu nại để quản trị viên xem xét.', { class: 'muted text-sm' }),
        el('div', null, { class: 'row' }, [closeBtn, appealLink])
      ])
    ]);
    closeBtn.addEventListener('click', () => dialog.close());
    appealLink.addEventListener('click', () => dialog.close());
    document.body.append(dialog);
  }
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('button')?.focus();
}

function installSuspendedGuard() {
  if (suspendedGuardInstalled) return;
  suspendedGuardInstalled = true;
  const blocked = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    showSuspendedNotice();
  };
  document.addEventListener('click', (event) => {
    if (accountSuspended && event.target.closest?.('[data-needs-active]')) blocked(event);
  }, true);
  document.addEventListener('submit', (event) => {
    if (accountSuspended && !event.target.closest?.('[data-suspended-ok]')) blocked(event);
  }, true);
}

function upgradeShellElement(node, tag, marker) {
  if (!node || node.localName === tag) return node;
  const real = document.createElement(tag);
  real.setAttribute(marker, '');
  node.replaceWith(real);
  return real;
}

// Khóa cuộn trang phía sau hộp thoại và cửa sổ nổi trên màn hình cảm ứng.
let modalScrollLockInstalled = false;
function installModalScrollLock() {
  if (modalScrollLockInstalled) return;
  modalScrollLockInstalled = true;
  // Cảm ứng: focus tiêu đề hộp thoại thay vì ô nhập để không tự bật bàn phím.
  if (matchMedia('(hover: none)').matches && typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.__ppTouchFocus) {
    const original = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.__ppTouchFocus = true;
    HTMLDialogElement.prototype.showModal = function showModalTouch(...args) {
      const result = original.apply(this, args);
      const active = document.activeElement;
      if (active && this.contains(active) && active.matches('input, select, textarea')) {
        const heading = this.querySelector('h1, h2, h3, [data-dialog-title]');
        const target = heading || this;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
      return result;
    };
  }
  const canScroll = (node, dialog) => {
    for (let n = node; n && n !== dialog.parentNode; n = n.parentElement) {
      if (!(n instanceof Element)) continue;
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
    }
    return false;
  };
  document.addEventListener('touchmove', (event) => {
    // Chỉ cho cuộn phần cuộn được bên trong lớp đang mở.
    const layer = document.querySelector('dialog[open]:modal')
      || (matchMedia('(hover: none)').matches ? document.querySelector('.site-header .popover-panel:not([hidden])') : null);
    if (!layer) return;
    if (!layer.contains(event.target) || !canScroll(event.target, layer)) event.preventDefault();
  }, { passive: false });
}

// Nút quả bóng "lên đầu trang", hiện khi đã cuộn xuống.
function installBackToTop() {
  if (document.querySelector('.back-to-top') || document.body.dataset.page === 'messages') return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const button = el('button', null, { type: 'button', class: 'back-to-top', 'aria-label': 'Lên đầu trang', title: 'Lên đầu trang', hidden: true }, [
    buildBallIcon('ball-icon back-to-top-ball')
  ]);
  let ticking = false;
  let spinning = false;
  const update = () => {
    ticking = false;
    // Giữ nút hiện cho tới khi quả bóng xoay xong.
    if (spinning) return;
    const show = scrollY > Math.max(480, innerHeight * 0.8);
    if (show === !button.hidden) return;
    if (show) { button.hidden = false; requestAnimationFrame(() => button.classList.add('is-visible')); }
    else { button.classList.remove('is-visible'); button.hidden = true; }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  button.addEventListener('click', () => {
    if (!reduced.matches) {
      spinning = true;
      button.classList.remove('is-kicked'); void button.offsetWidth; button.classList.add('is-kicked');
    }
    scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    const target = document.querySelector('main h1') || document.querySelector('main');
    if (target && matchMedia('(hover: hover)').matches) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
  button.querySelector('.back-to-top-ball')?.addEventListener('animationend', () => {
    button.classList.remove('is-kicked');
    spinning = false;
    update();
  });
  document.body.append(button);
  update();
}

export async function initShell() {
  initTheme();
  let user = null;
  const [, me] = await Promise.allSettled([
    api.settings.rules().then(applyRules),
    api.auth.me()
  ]);
  if (me.status === 'fulfilled') user = me.value;
  const file = location.pathname.split('/').pop() || 'index.html';
  if (user?.must_change_password && !['reset-password.html', 'login.html'].includes(file)) {
    location.replace(`reset-password.html?returnTo=${encodeURIComponent(file + location.search)}`);
    await new Promise(() => {});
  }
  const header = upgradeShellElement(document.querySelector('[data-header], site-header'), 'header', 'data-header');
  if (header) renderHeaderElement(header, user);
  restrictionObserver?.disconnect();
  restrictionObserver = null;
  document.querySelector('[data-account-restriction]')?.remove();
  accountSuspended = user?.status === 'suspended';
  if (accountSuspended) installSuspendedGuard();
  if (accountSuspended) {
    const banner = el('aside', null, { class: 'alert alert--danger', 'aria-label': 'Trạng thái tài khoản', 'aria-live': 'polite', 'data-account-restriction': '' }, [
      document.createTextNode(user.app_role === 'manager'
        ? 'Tài khoản của bạn đang tạm khóa. Các sân của bạn tạm ngừng nhận đơn mới; bạn vẫn xem được thông tin nhưng chưa thể chỉnh sửa sân, hủy đơn hay nhắn tin. Các đơn đã xác nhận vẫn giữ nguyên. '
        : 'Tài khoản của bạn đang tạm khóa. Bạn vẫn xem được thông tin nhưng chưa thể đặt sân, nhắn tin hay thực hiện thao tác khác. '),
      el('a', 'Gửi khiếu nại tới quản trị viên', { href: APPEAL_HREF })
    ]);
    const main = document.querySelector('main');
    if (main) {
      const placeBanner = () => { if (main.isConnected && banner.parentElement !== main) main.prepend(banner); };
      placeBanner();
      restrictionObserver = new MutationObserver(placeBanner);
      restrictionObserver.observe(main, { childList: true });
    } else if (header?.isConnected) header.after(banner);
  }
  const footer = upgradeShellElement(document.querySelector('[data-footer], site-footer'), 'footer', 'data-footer');
  if (footer) renderFooterElement(footer, user);
  installBackToTop();
  installModalScrollLock();
  const flash = sessionStorage.getItem('pitch-point:flash');
  if (flash) {
    sessionStorage.removeItem('pitch-point:flash');
    toast(flash);
  }
  return user;
}

export function toast(message) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = el('div', null, { class: 'toast-stack', 'aria-live': 'polite' });
    document.body.append(stack);
  }
  const item = el('div', null, { class: 'toast' }, [
    el('span', null, { class: 'toast-dot', 'aria-hidden': 'true' }),
    el('span', message, { class: 'toast-text' }),
    el('span', null, { class: 'toast-timer-bar', 'aria-hidden': 'true' })
  ]);
  stack.append(item);
  setTimeout(() => {
    item.classList.add('toast--leaving');
    setTimeout(() => item.remove(), 260);
  }, 3950);
}

export function showError(target, message) {
  if (!target) return;
  target.textContent = message;
  target.hidden = !message;
}

export function clearFieldErrors(form) {
  if (!form) return;
  form.querySelectorAll('[aria-invalid="true"]').forEach(input => {
    input.removeAttribute('aria-invalid');
    const ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && !document.getElementById(id)?.matches('.field-error[data-generated="true"]'));
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
  });
  form.querySelectorAll('.field-error[data-generated="true"]').forEach(err => err.remove());
}

export function setFieldError(input, message) {
  if (!input) return;
  input.setAttribute('aria-invalid', 'true');
  const errId = `${input.id || input.name || 'field'}-error`;
  const ids = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  ids.add(errId);
  input.setAttribute('aria-describedby', [...ids].join(' '));
  let errEl = document.getElementById(errId);
  if (!errEl) {
    errEl = el('p', message, { id: errId, class: 'field-error', 'data-generated': 'true', role: 'alert' });
    (input.closest('.password-input-wrap') || input).insertAdjacentElement('afterend', errEl);
  } else {
    errEl.textContent = message;
  }
  if (!input.dataset.clearsErrorOnInput) {
    input.dataset.clearsErrorOnInput = 'true';
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') !== 'true') return;
      input.removeAttribute('aria-invalid');
      const err = document.getElementById(errId);
      const ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== errId);
      if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
      if (err?.dataset.generated === 'true') err.remove(); else if (err) err.textContent = '';
    });
  }
}

export function focusFirstInvalid(form) {
  const first = form?.querySelector('[aria-invalid="true"]');
  if (first && typeof first.focus === 'function') first.focus();
}

export function renderBadge(meta, fallbackLabel = '—') {
  const info = meta || { label: fallbackLabel, tone: 'muted' };
  return el('span', null, { class: `badge badge--${info.tone || 'muted'}` }, [
    el('span', null, { class: 'badge-dot', 'aria-hidden': 'true' }),
    el('span', info.label || fallbackLabel)
  ]);
}

const liquidStateMap = new WeakMap();
let liquidResizeBound = false;
const trackedLiquidContainers = new Set();

function ensureLiquidResizeListener() {
  if (liquidResizeBound) return;
  liquidResizeBound = true;
  window.addEventListener('resize', () => {
    for (const entry of [...trackedLiquidContainers]) {
      if (!entry.container.isConnected) {
        trackedLiquidContainers.delete(entry);
        continue;
      }
      updateLiquidIndicator(entry.container, entry.selector, { immediate: true });
    }
  }, { passive: true });
}

export function replaceChildrenPreservingIndicator(container, ...nodes) {
  if (!container) return;
  const indicator = container.querySelector(':scope > .liquid-pill-indicator');
  if (indicator) {
    container.replaceChildren(indicator, ...nodes.filter(Boolean));
  } else {
    container.replaceChildren(...nodes.filter(Boolean));
  }
}

export function updateLiquidIndicator(container, activeTargetOrSelector = '[aria-selected="true"], [aria-current="page"], .active', { immediate = false } = {}) {
  if (!container) return;
  ensureLiquidResizeListener();

  const resolveActive = () => typeof activeTargetOrSelector === 'string'
    ? container.querySelector(activeTargetOrSelector)
    : activeTargetOrSelector;

  if (typeof activeTargetOrSelector === 'string') {
    let found = false;
    for (const item of trackedLiquidContainers) {
      if (item.container === container) {
        item.selector = activeTargetOrSelector;
        found = true;
        break;
      }
    }
    if (!found) trackedLiquidContainers.add({ container, selector: activeTargetOrSelector });
  }

  let indicator = container.querySelector(':scope > .liquid-pill-indicator');
  const activeEl = resolveActive();
  if (!activeEl) {
    if (indicator) indicator.style.opacity = '0';
    return;
  }

  if (!indicator) {
    indicator = el('span', null, {
      class: 'liquid-pill-indicator liquid-pill-indicator--instant',
      'aria-hidden': 'true'
    });
    container.prepend(indicator);
  }

  const measure = () => {
    const target = resolveActive();
    if (!container.isConnected || !target || !target.isConnected) return;
    const cRect = container.getBoundingClientRect();
    const aRect = target.getBoundingClientRect();
    if (cRect.width === 0 || aRect.width === 0) return;

    const directConversation = container.id === 'conversations' && target.offsetParent === container;
    const x = directConversation ? target.offsetLeft : Math.round((aRect.left - cRect.left + container.scrollLeft) * 10) / 10;
    const y = directConversation ? target.offsetTop : Math.round((aRect.top - cRect.top + container.scrollTop) * 10) / 10;
    const w = directConversation ? target.offsetWidth : Math.round(aRect.width * 10) / 10;
    const h = directConversation ? target.offsetHeight : Math.round(aRect.height * 10) / 10;

    const prev = liquidStateMap.get(container);
    const isFirst = !prev || immediate;

    if (isFirst) {
      indicator.classList.add('liquid-pill-indicator--instant');
    }

    indicator.style.setProperty('--liquid-x', `${x}px`);
    indicator.style.setProperty('--liquid-y', `${y}px`);
    indicator.style.setProperty('--liquid-w', `${w}px`);
    indicator.style.setProperty('--liquid-h', `${h}px`);
    indicator.style.opacity = '1';
    container.classList.add('has-liquid-indicator');

    liquidStateMap.set(container, { x, y, w, h });

    if (isFirst) {
      void indicator.offsetWidth;
      indicator.classList.remove('liquid-pill-indicator--instant');
    }
  };

  if (!container.isConnected || container.getBoundingClientRect().width === 0) {
    requestAnimationFrame(measure);
  } else {
    measure();
  }
}

export function animateTabPanel(panel) {
  if (!panel) return;
  panel.classList.remove('tab-panel-Swap');
  void panel.offsetWidth;
  panel.classList.add('tab-panel-Swap');
}

export const DASHBOARD_NAV_GROUPS = {
  admin: [
    {
      label: null,
      items: [['Tổng quan', 'admin-dashboard.html', 'LayoutDashboard']]
    },
    {
      label: 'Tài khoản',
      items: [
        ['Người dùng', 'admin-users.html', 'Users'],
        ['Chủ sân', 'admin-pitch-managers.html', 'Shield']
      ]
    },
    {
      label: 'Vận hành',
      items: [
        ['Quản lý sân', 'admin-pitch-moderation.html', 'Building2'],
        ['Đơn & hoàn tiền', 'admin-finance.html', 'ReceiptText'],
        ['Báo cáo', 'admin-reports.html', 'Flag']
      ]
    },
    {
      label: 'Hệ thống',
      items: [
        ['Nội dung & banner', 'admin-content.html', 'Megaphone'],
        ['Nhật ký hoạt động', 'admin-activity-log.html', 'ScrollText'],
        ['Tin nhắn', 'messages.html', 'MessageSquare'],
        ['Quy định hệ thống', 'admin-settings.html', 'Settings']
      ]
    }
  ],
  manager: [
    {
      label: null,
      items: [
        ['Tổng quan', 'manager-dashboard.html', 'LayoutDashboard'],
        ['Sân của tôi', 'manager-pitches.html', 'Building2'],
        ['Đơn đặt sân', 'manager-bookings.html', 'ReceiptText'],
        ['Doanh thu', 'manager-revenue.html', 'Wallet'],
        ['Tin nhắn', 'messages.html', 'MessageSquare']
      ]
    }
  ]
};

export function populateDashboardNav(container, role, onNavigate = null) {
  if (!container) return;
  const currentFile = location.pathname.split('/').pop() || '';
  const groups = DASHBOARD_NAV_GROUPS[role === 'admin' ? 'admin' : 'manager'];
  container.className = 'sidebar-nav';
  container.replaceChildren();

  for (const g of groups) {
    const groupEl = el('div', null, { class: 'sidebar-group' });
    if (g.label) {
      groupEl.append(el('p', g.label, { class: 'sidebar-group-label' }));
    }
    for (const [label, href, iconName] of g.items) {
      const isCurrent = currentFile === href || (href === 'manager-pitches.html' && ['add-pitch.html', 'edit-pitch.html', 'pitch-availability.html'].includes(currentFile));
      const link = el('a', null, {
        href,
        class: 'sidebar-link dashboard-nav-item',
        'aria-current': isCurrent ? 'page' : null
      }, [
        createIcon(iconName, 16),
        el('span', label, { class: 'sidebar-link-label' })
      ]);
      // Dải chỉ báo chỉ đi theo chuột, không theo cảm ứng.
      link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') updateLiquidIndicator(container, link); });
      link.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        container.querySelectorAll('.dashboard-nav-item[aria-current="page"]').forEach(a => a.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'page');
        updateLiquidIndicator(container, link);
      });
      if (onNavigate) link.addEventListener('click', onNavigate);
      groupEl.append(link);
    }
    container.append(groupEl);
  }

  if (!container.dataset.liquidLeaveBound) {
    container.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      updateLiquidIndicator(container, '.dashboard-nav-item[aria-current="page"]');
    });
    container.dataset.liquidLeaveBound = 'true';
  }

  queueMicrotask(() => {
    updateLiquidIndicator(container, '.dashboard-nav-item[aria-current="page"]');
  });
}

export function mountDashboardShell({ mainEl, navEl, contentNodes = [], role = 'manager' }) {
  if (!mainEl) return;
  const normalizedRole = role === 'admin' ? 'admin' : 'manager';
  mainEl.className = 'container--dashboard dashboard-body';

  let navNode = navEl;
  if (!navNode) {
    navNode = el('nav', null, { id: 'management-nav', 'aria-label': normalizedRole === 'admin' ? 'Điều hướng quản trị' : 'Điều hướng chủ sân' });
  }

  if (!mainEl.querySelector('.dashboard-shell')) {
    const shell = el('div', null, { class: 'dashboard-shell' });
    const sidebar = el('aside', null, {
      class: 'dashboard-sidebar',
      'aria-label': normalizedRole === 'admin' ? 'Điều hướng quản trị' : 'Điều hướng chủ sân'
    });
    const mainArea = el('div', null, { class: 'dashboard-main stack-lg page-flow' });

    sidebar.append(navNode);
    for (const node of contentNodes) {
      if (node) mainArea.append(node);
    }
    shell.append(sidebar, mainArea);
    mainEl.replaceChildren(shell);
  }

  populateDashboardNav(navNode, normalizedRole);

  const mobileTrigger = document.querySelector('[data-dashboard-drawer-trigger]');
  if (mobileTrigger && !mobileTrigger.dataset.bound) {
    mobileTrigger.dataset.bound = 'true';
    const sheetBackdrop = el('div', null, { class: 'sheet-backdrop', hidden: true });
    const closeBtn = el('button', '✕', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Đóng menu' });
    const mobileNav = el('nav', null, {
      class: 'sidebar-nav',
      'aria-label': normalizedRole === 'admin' ? 'Điều hướng quản trị' : 'Điều hướng chủ sân'
    });
    const sheetPanel = el('aside', null, {
      class: 'sheet-panel sheet-panel--left',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': normalizedRole === 'admin' ? 'Menu quản trị' : 'Menu chủ sân',
      hidden: true
    }, [
      el('div', null, { class: 'row-between', utility: 'u-margin-bottom-0p5rem' }, [
        createBrandMark({ compact: true }),
        closeBtn
      ]),
      mobileNav
    ]);
    sheetBackdrop.append(sheetPanel);
    document.body.append(sheetBackdrop);
    mobileTrigger.setAttribute('aria-expanded', 'false');

    const toggleSheet = (open) => {
      sheetBackdrop.hidden = !open;
      sheetPanel.hidden = !open;
      mobileTrigger.setAttribute('aria-expanded', String(open));
      if (open) {
        populateDashboardNav(mobileNav, normalizedRole, () => toggleSheet(false));
        closeBtn.focus();
      } else {
        mobileTrigger.focus();
      }
    };
    mobileTrigger.addEventListener('click', () => toggleSheet(sheetPanel.hidden));
    closeBtn.addEventListener('click', () => toggleSheet(false));
    sheetBackdrop.addEventListener('click', (event) => {
      if (event.target === sheetBackdrop) toggleSheet(false);
    });
    sheetPanel.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const controls = [...sheetPanel.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(item => item.getClientRects().length);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
        event.preventDefault();
        controls[0].focus();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !sheetPanel.hidden) {
        toggleSheet(false);
        mobileTrigger.focus();
      }
    });
  }
}
