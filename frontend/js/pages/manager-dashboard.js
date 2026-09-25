import '../components/site-header.js';
import '../components/site-footer.js';
import { isLoggedIn, getUser } from '../auth.js';

const main = document.getElementById('main-content');
const nameEl = document.getElementById('manager-name');

// Dữ liệu mô phỏng (Mock data) cho báo cáo nhanh
const MOCK_STATS = {
  pitchesCount: 4,
  pendingBookings: 12,
  todayBookings: 8,
  monthlyRevenue: 15400000
};

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function initDashboard() {
  // 1. Kiểm tra xác thực (Bảo vệ trang S17)
  if (!isLoggedIn()) {
    sessionStorage.setItem('app_return_to', location.pathname + location.search);
    location.replace('login.html');
    return;
  }

  const user = getUser();
  
  // 2. Chặn nếu là customer (Khách hàng không được vào Dashboard Chủ sân)
  if (user && user.role === 'customer') {
    location.replace('index.html');
    return;
  }

  // 3. Hiển thị thông tin chủ sân
  if (nameEl && user && user.display_name) {
    nameEl.textContent = user.display_name;
  }

  // 4. Render số liệu thống kê mô phỏng
  const elPitches = document.getElementById('stat-pitches');
  const elPending = document.getElementById('stat-pending-bookings');
  const elToday = document.getElementById('stat-today-bookings');
  const elRevenue = document.getElementById('stat-revenue');

  if (elPitches) elPitches.textContent = MOCK_STATS.pitchesCount;
  if (elPending) elPending.textContent = MOCK_STATS.pendingBookings;
  if (elToday) elToday.textContent = MOCK_STATS.todayBookings;
  if (elRevenue) elRevenue.textContent = formatVND(MOCK_STATS.monthlyRevenue);

  // 5. Hiển thị giao diện sau khi check thành công
  if (main) {
    main.hidden = false;
  }
}

// Khởi tạo trang
initDashboard();

