import '../components/site-header.js';
import '../components/site-footer.js';
import { isLoggedIn, getUser } from '../auth.js';
import { toast } from '../ui.js';
import { MOCK_PITCHES } from '../data/pitches.js';

const main = document.getElementById('main-content');
const form = document.getElementById('config-form');
const titleEl = document.getElementById('pitch-name-display');
const btnTop = document.getElementById('btn-save-top');
const btnBottom = document.getElementById('btn-save-bottom');

function initPage() {
  if (!isLoggedIn()) {
    sessionStorage.setItem('app_return_to', location.pathname + location.search);
    location.replace('login.html');
    return;
  }

  const user = getUser();
  if (user && user.role === 'customer') {
    location.replace('403.html');
    return;
  }

  // 1. Lấy ID sân từ URL
  const params = new URLSearchParams(location.search);
  const pitchId = params.get('pitchId');

  if (!pitchId) {
    location.replace('404.html');
    return;
  }

  // 2. Tìm thông tin sân để đổi Tên tiêu đề
  const pitch = MOCK_PITCHES.find(p => String(p.id) === pitchId);
  if (!pitch) {
    location.replace('404.html');
    return;
  }
  
  if (titleEl) {
    titleEl.textContent = `Cấu hình: ${pitch.name}`;
  }

  // 3. Xử lý tương tác Checkbox dịch vụ -> Disable input giá nếu không check
  document.querySelectorAll('.service-item').forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    const input = item.querySelector('input[type="number"]');
    if (cb && input) {
      input.disabled = !cb.checked;
      cb.addEventListener('change', () => {
        input.disabled = !cb.checked;
        if (cb.checked) input.focus();
      });
    }
  });

  // 4. Xử lý Toggle khung giờ -> Làm mờ dòng nếu tắt
  document.querySelectorAll('.slot-row:not(.slot-header)').forEach(row => {
    const toggle = row.querySelector('.toggle input');
    const priceInput = row.querySelector('input[type="number"]');
    if (toggle && priceInput) {
      toggle.addEventListener('change', () => {
        if (toggle.checked) {
          row.classList.remove('disabled');
          priceInput.disabled = false;
        } else {
          row.classList.add('disabled');
          priceInput.disabled = true;
        }
      });
    }
  });

  // 5. Submit form
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  if (main) main.hidden = false;
}

async function handleSubmit(e) {
  e.preventDefault();
  
  btnTop.disabled = true;
  btnBottom.disabled = true;
  const originalText = btnBottom.textContent;
  btnBottom.textContent = 'Đang lưu...';
  btnTop.textContent = 'Đang lưu...';

  try {
    // Giả lập lưu
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast('Đã lưu cấu hình Khung giờ & Tiện ích thành công!', 'success');
  } catch (err) {
    toast('Lỗi lưu cấu hình.', 'error');
  } finally {
    btnTop.disabled = false;
    btnBottom.disabled = false;
    btnBottom.textContent = originalText;
    btnTop.textContent = originalText;
  }
}

initPage();
