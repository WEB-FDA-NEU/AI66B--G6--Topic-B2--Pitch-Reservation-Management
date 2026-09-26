import '../components/site-header.js';
import '../components/site-footer.js';
import { isLoggedIn, getUser } from '../auth.js';
import { setFieldError, clearFieldErrors, toast } from '../ui.js';
import { MOCK_PITCHES } from '../data/pitches.js';

const main = document.getElementById('main-content');
const form = document.getElementById('edit-pitch-form');
const btnSubmit = document.getElementById('btn-submit');

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

  // 1. Lấy pitchId từ URL
  const params = new URLSearchParams(location.search);
  const pitchId = params.get('pitchId');

  if (!pitchId) {
    location.replace('404.html');
    return;
  }

  // 2. Tìm sân trong Mock Data
  const pitch = MOCK_PITCHES.find(p => String(p.id) === pitchId);
  if (!pitch) {
    location.replace('404.html');
    return;
  }

  // 3. Điền dữ liệu cũ vào Form
  if (form) {
    form.name.value = pitch.name || '';
    
    // Loại sân trong mock thường là '5', '7', '11' 
    // Chúng ta trích xuất số nếu cần, ở đây giả lập là 5, 7, 11
    if (pitch.typeLabel && pitch.typeLabel.includes('7')) form.type.value = '7';
    else if (pitch.typeLabel && pitch.typeLabel.includes('11')) form.type.value = '11';
    else form.type.value = '5';
    
    form.price.value = pitch.price || '';
    form.address.value = pitch.location || '';
    
    // Mock description/rules
    form.description.value = 'Hệ thống sân cỏ nhân tạo đạt chuẩn FIFA. Đèn LED siêu sáng.';
    form.rules.value = 'Cấm hút thuốc. Cấm mang giày đinh sắt.';
    
    form.addEventListener('submit', handleSubmit);
  }

  if (main) main.hidden = false;
}

async function handleSubmit(e) {
  e.preventDefault();
  clearFieldErrors(form);

  let isValid = true;
  if (!form.name.value.trim()) { setFieldError(form.name, 'Vui lòng nhập tên sân.'); isValid = false; }
  if (!form.type.value) { setFieldError(form.type, 'Vui lòng chọn loại sân.'); isValid = false; }
  if (!form.price.value || Number(form.price.value) < 10000) { setFieldError(form.price, 'Giá sân từ 10.000đ.'); isValid = false; }
  if (!form.address.value.trim()) { setFieldError(form.address, 'Vui lòng nhập địa chỉ.'); isValid = false; }

  if (!isValid) return;

  btnSubmit.disabled = true;
  const originalText = btnSubmit.textContent;
  btnSubmit.textContent = 'Đang lưu...';

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast('Cập nhật thông tin thành công!', 'success');
    
    setTimeout(() => {
      location.href = 'manager-pitches.html';
    }, 1500);

  } catch (err) {
    toast('Đã có lỗi xảy ra. Vui lòng thử lại.', 'error');
    btnSubmit.disabled = false;
    btnSubmit.textContent = originalText;
  }
}

initPage();

