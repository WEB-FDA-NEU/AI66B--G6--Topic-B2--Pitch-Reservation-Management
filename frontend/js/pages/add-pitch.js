import '../components/site-header.js';
import '../components/site-footer.js';
import { isLoggedIn, getUser } from '../auth.js';
import { setFieldError, clearFieldErrors, toast } from '../ui.js';

const main = document.getElementById('main-content');
const form = document.getElementById('add-pitch-form');
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

  if (main) main.hidden = false;

  // Lắng nghe sự kiện submit
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  clearFieldErrors(form);

  // 1. Kiểm tra Validate cơ bản (Frontend)
  let isValid = true;

  if (!form.name.value.trim()) {
    setFieldError(form.name, 'Vui lòng nhập tên sân bóng.');
    isValid = false;
  }

  if (!form.type.value) {
    setFieldError(form.type, 'Vui lòng chọn loại sân.');
    isValid = false;
  }

  if (!form.price.value || Number(form.price.value) < 10000) {
    setFieldError(form.price, 'Giá sân phải từ 10.000đ trở lên.');
    isValid = false;
  }

  if (!form.address.value.trim()) {
    setFieldError(form.address, 'Vui lòng nhập địa chỉ.');
    isValid = false;
  }

  if (!isValid) return;

  // 2. Mô phỏng quá trình lưu lên Server (Mock)
  btnSubmit.disabled = true;
  const originalText = btnSubmit.textContent;
  btnSubmit.textContent = 'Đang lưu...';

  try {
    // Giả lập API gọi mất 1 giây
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Lưu ý: Do đây là file tĩnh, ta không thể Push thật vào file pitches.js
    // Tính năng này chỉ mô phỏng UI thành công. Hợp đồng tích hợp backend sẽ xử lý thật.
    
    toast('Tạo sân bóng thành công!', 'success');
    
    // Chuyển hướng về danh sách sau 1.5 giây
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
