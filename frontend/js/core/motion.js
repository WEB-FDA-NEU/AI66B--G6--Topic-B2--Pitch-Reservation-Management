const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
document.addEventListener('pointermove', (event) => {
  if (reduced.matches || event.pointerType !== 'mouse') return;
  const hero = event.target.closest?.('.hero');
  if (!hero) return;
  const rect = hero.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  hero.style.setProperty('--hero-x', `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
  hero.style.setProperty('--hero-y', `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
}, { passive: true });

let pitchNavigationPending = false;
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced.matches || !finePointer.matches) return;
  const link = event.target.closest?.('.pitch-card a[href]');
  if (!link || link.target && link.target !== '_self' || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !url.pathname.endsWith('/pitch-detail.html')) return;
  if (pitchNavigationPending) { event.preventDefault(); return; }
  event.preventDefault();
  pitchNavigationPending = true;
  const card = link.closest('.pitch-card');
  const media = card.querySelector('.pitch-card-media') || card;
  const bounds = media.getBoundingClientRect();
  try { sessionStorage.setItem('pitch-point:card-transition', JSON.stringify({ id: url.searchParams.get('id'), at: Date.now(), x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height, viewportWidth: innerWidth, viewportHeight: innerHeight })); } catch { }
  card.classList.add('pitch-card--navigating');
  location.assign(url.href);
});
window.addEventListener('pageshow', () => {
  pitchNavigationPending = false;
  document.querySelectorAll('.pitch-card--navigating').forEach((card) => card.classList.remove('pitch-card--navigating'));
});

const root = document.documentElement;
const readyObserver = new MutationObserver(() => {
  if (!root.classList.contains('page-initializing')) {
    root.classList.add('page-ready');
    readyObserver.disconnect();
  }
});
if (root.classList.contains('page-initializing')) readyObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
else root.classList.add('page-ready');

if (!reduced.matches && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('motion-revealed'); reveal.unobserve(entry.target); }
  }), { threshold: 0.1 });
  const scan = () => document.querySelectorAll('.motion-reveal:not([data-reveal-observed])').forEach((element) => { element.dataset.revealObserved = 'true'; reveal.observe(element); });
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}

function bridgePitchCard() {
  let state; try { state = JSON.parse(sessionStorage.getItem('pitch-point:card-transition') || 'null'); sessionStorage.removeItem('pitch-point:card-transition'); } catch { return; }
  if (!state || reduced.matches || !Element.prototype.animate || !finePointer.matches || document.body.dataset.page !== 'pitch-detail' || state.id !== new URLSearchParams(location.search).get('id') || Date.now() - state.at > 10000 || Math.abs(state.viewportWidth - innerWidth) > 30 || Math.abs(state.viewportHeight - innerHeight) > 30) return;
  const target = document.querySelector('#pitch'); if (!target) return;
  const end = target.getBoundingClientRect(); if (!end.width || !end.height || !state.width || !state.height) return;
  const bridge = document.createElement('div'); bridge.className = 'pitch-transition-bridge'; bridge.setAttribute('aria-hidden', 'true'); document.body.append(bridge);
  Object.assign(bridge.style, { left: `${state.x}px`, top: `${state.y}px`, width: `${state.width}px`, height: `${state.height}px` });
  const animation = bridge.animate([{ transform: 'translate(0,0) scale(1,1)', opacity: .75, borderRadius: '16px' }, { transform: `translate(${end.left-state.x}px,${end.top-state.y}px) scale(${end.width/state.width},${end.height/state.height})`, opacity: 0, borderRadius: '16px' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
  animation.finished.catch(() => {}).finally(() => bridge.remove());
}
if (!root.classList.contains('page-initializing')) bridgePitchCard();
else { const bridgeObserver = new MutationObserver(() => { if (!root.classList.contains('page-initializing')) { bridgeObserver.disconnect(); bridgePitchCard(); } }); bridgeObserver.observe(root, { attributes: true, attributeFilter: ['class'] }); }

let lastDialogTrigger = null;
document.addEventListener('click', event => { const trigger = event.target.closest?.('button, a'); if (trigger) lastDialogTrigger = trigger; }, true);
if ('MutationObserver' in window) {
  const animatedDialogs = new WeakSet();
  const dialogs = new MutationObserver(() => {
    document.querySelectorAll('dialog[open]').forEach(dialog => {
      if (animatedDialogs.has(dialog)) return; animatedDialogs.add(dialog);
      if (reduced.matches || !dialog.animate) return;
      const from = lastDialogTrigger?.isConnected ? lastDialogTrigger.getBoundingClientRect() : null; const to = dialog.getBoundingClientRect();
      if (from && to.width && to.height) dialog.style.transformOrigin = `${Math.max(0, Math.min(to.width, from.left + from.width / 2 - to.left))}px ${Math.max(0, Math.min(to.height, from.top + from.height / 2 - to.top))}px`;
      dialog.animate([{ opacity: 0, transform: 'translateY(8px) scale(.96)', filter: 'blur(3px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
    document.querySelectorAll('dialog:not([open])').forEach(dialog => animatedDialogs.delete(dialog));
  });
  dialogs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
}
if ('MutationObserver' in window) {
  const feedback = new MutationObserver((records) => {
    if (reduced.matches) return;
    for (const record of records) {
      if (record.type !== 'attributes') continue;
      const element = record.target;
      if (!element.isConnected || !element.animate) continue;
      if (record.attributeName === 'aria-pressed' && element.matches('.slot-btn') && element.getAttribute('aria-pressed') === 'true') {
        element.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.18)' }, { filter: 'brightness(1)' }], { duration: 280, easing: 'ease-out' });
      } else if (record.attributeName === 'aria-invalid' && element.getAttribute('aria-invalid') === 'true') {
        element.animate([{ boxShadow: '0 0 0 0 transparent' }, { boxShadow: '0 0 0 3px var(--danger)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 420, easing: 'ease-out' });
      }
    }
  });
  feedback.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-invalid'] });
}
