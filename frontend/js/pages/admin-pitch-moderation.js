import '../components/site-header.js';
import '../components/site-footer.js';
import { ROLES, requireRole } from '../services/access-control.js';
import { listPitchesForModeration, listReviewedPitchReports, moderatePitch, preparePitchCatalog } from '../services/pitch-service.js';

const labels = { active: 'Đang mở', deactivated: 'Tạm ngừng', suspended: 'Đình chỉ tạm thời', 'permanently-suspended': 'Đình chỉ vĩnh viễn' };
const list = document.getElementById('pitch-list');
const template = document.getElementById('tpl-moderation-pitch');
const decisionForm = document.getElementById('decision-form');
const feedback = document.getElementById('moderation-feedback');
let admin;
let selectedPitchId = null;

function renderList(filters = {}) {
  const pitches = listPitchesForModeration(admin, filters);
  list.replaceChildren(...pitches.map(pitch => {
    const node = template.content.cloneNode(true);
    const button = node.querySelector('button');
    button.classList.toggle('is-selected', pitch.id === selectedPitchId);
    button.querySelector('strong').textContent = pitch.name;
    button.querySelector('small').textContent = `${pitch.ownerName} · #${pitch.id}`;
    button.querySelector('em').textContent = labels[pitch.status] ?? pitch.status;
    button.addEventListener('click', () => selectPitch(pitch));
    return node;
  }));
}

function selectPitch(pitch) {
  selectedPitchId = pitch.id;
  document.getElementById('selected-pitch').textContent = `${pitch.name} — ${labels[pitch.status] ?? pitch.status}`;
  const reports = listReviewedPitchReports(admin, pitch.id);
  const reportSelect = document.getElementById('reviewed-report');
  reportSelect.replaceChildren(...reports.map(report => {
    const option = document.createElement('option'); option.value = report.id; option.textContent = `${report.id} — ${report.summary}`; return option;
  }));
  decisionForm.hidden = false;
  decisionForm.querySelector('button').disabled = !reports.length;
  feedback.textContent = reports.length ? '' : 'Sân này chưa có báo cáo đang được rà soát nên chưa thể áp dụng xử lý.';
  const action = document.getElementById('moderation-action');
  [...action.options].forEach(option => { option.disabled = option.value === 'restore' ? pitch.status !== 'suspended' : ['suspended','permanently-suspended'].includes(pitch.status); });
  action.value = pitch.status === 'suspended' ? 'restore' : 'suspend-temporary';
  renderList(Object.fromEntries(new FormData(document.getElementById('filter-form'))));
}

async function init() {
  await preparePitchCatalog();
  admin = requireRole([ROLES.ADMIN]);
  if (!admin) return;
  const filterForm = document.getElementById('filter-form');
  filterForm.addEventListener('submit', event => { event.preventDefault(); renderList(Object.fromEntries(new FormData(filterForm))); });
  decisionForm.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(decisionForm));
      const updated = moderatePitch(admin, { ...values, pitchId: selectedPitchId, confirmed: values.confirmed === 'on' });
      decisionForm.reset();
      selectPitch(updated);
      feedback.textContent = `Đã cập nhật ${updated.name}: ${labels[updated.status]}. Báo cáo đã được kết thúc xử lý.`;
    } catch (error) { feedback.textContent = error.message; }
  });
  renderList();
  const initialId = Number(new URLSearchParams(location.search).get('pitchId'));
  if (initialId) { const pitch = listPitchesForModeration(admin).find(item => item.id === initialId); if (pitch) selectPitch(pitch); }
  document.getElementById('main-content').hidden = false;
}

init().catch(() => { location.replace('403.html'); });
