import '../components/site-header.js';
import '../components/site-footer.js';

document.querySelector('[data-retry]')?.addEventListener('click', () => {
  const status = document.querySelector('[data-status]');
  if (!status) return;
  status.textContent = 'Đang thử tải lại trang…';
  status.hidden = false;
  window.setTimeout(() => window.location.reload(), 250);
});
