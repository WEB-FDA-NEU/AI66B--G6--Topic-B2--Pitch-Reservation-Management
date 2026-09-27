import '../components/site-header.js';
import '../components/site-footer.js';
import { requireAuth } from '../services/access-control.js';
import { getSettings, updateSettings } from '../services/settings-service.js';

const ROLE_CONTENT = {
  customer: {
    description: 'Quản lý thông tin và tùy chọn dành cho khách đặt sân.',
    updates: 'Ưu tiên hiển thị cập nhật về booking và thanh toán mô phỏng',
    back: 'booking-history.html',
  },
  manager: {
    description: 'Quản lý thông tin và tùy chọn dành cho chủ sân.',
    updates: 'Ưu tiên hiển thị cập nhật về đơn đặt và doanh thu',
    back: 'manager-dashboard.html',
  },
  admin: {
    description: 'Quản lý thông tin và tùy chọn dành cho quản trị viên.',
    updates: 'Ưu tiên hiển thị cập nhật về báo cáo và hoạt động quản trị',
    back: 'admin-dashboard.html',
  },
};

const form = document.getElementById('settings-form');
const feedback = document.getElementById('settings-feedback');
let currentUser;

async function init() {
  currentUser = requireAuth();
  if (!currentUser) return;
  const content = ROLE_CONTENT[currentUser.role];
  if (!content) {
    location.replace('404.html');
    return;
  }
  const settings = await getSettings(currentUser);
  form.elements.displayName.value = settings.displayName;
  form.elements.phone.value = settings.phone;
  form.elements.compactCards.checked = Boolean(settings.preferences.compactCards);
  form.elements.roleUpdates.checked = Boolean(settings.preferences.roleUpdates);
  document.getElementById('settings-role-description').textContent = content.description;
  document.getElementById('role-updates-label').textContent = content.updates;
  document.getElementById('settings-back-link').href = content.back;
  document.getElementById('main-content').hidden = false;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  feedback.textContent = '';
  try {
    currentUser = await updateSettings(currentUser, {
      displayName: form.elements.displayName.value,
      phone: form.elements.phone.value,
      compactCards: form.elements.compactCards.checked,
      roleUpdates: form.elements.roleUpdates.checked,
    });
    feedback.textContent = 'Đã lưu cài đặt.';
  } catch (error) {
    feedback.textContent = error.message;
  }
});

init();
