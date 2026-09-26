import '../components/admin-sidebar.js';

let isDirty = false;

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.admin-tab-pill');
  const sections = document.querySelectorAll('.settings-section');
  const form = document.getElementById('settings-form');
  const btnSave = document.getElementById('btn-save');
  
  const statusDot = document.getElementById('status-dot');
  const saveStatusText = document.getElementById('save-status-text');

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const targetId = tab.id.replace('tab-', 'sec-');
      sections.forEach(sec => {
        sec.hidden = sec.id !== targetId;
      });
    });
  });

  // Track changes
  const markDirty = () => {
    if (!isDirty) {
      isDirty = true;
      statusDot.className = 'status-dot dirty';
      saveStatusText.textContent = 'Chưa lưu thay đổi';
      
      btnSave.disabled = false;
      btnSave.style.opacity = '1';
      btnSave.style.cursor = 'pointer';
    }
  };

  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);

  // Lưu thay đổi
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validate custom
    if (!form.checkValidity()) {
      statusDot.className = 'status-dot dirty';
      saveStatusText.textContent = 'Lỗi xác thực dữ liệu';
      return;
    }

    // Simulate saving
    btnSave.disabled = true;
    btnSave.style.opacity = '0.6';
    btnSave.style.cursor = 'not-allowed';
    btnSave.textContent = 'Đang lưu...';
    
    statusDot.className = 'status-dot'; // Grey
    saveStatusText.textContent = 'Đang lưu thay đổi...';

    setTimeout(() => {
      // 90% success mock
      if (Math.random() > 0.1) {
        btnSave.textContent = 'Lưu thay đổi';
        statusDot.className = 'status-dot saved';
        saveStatusText.textContent = 'Lưu thành công';
        isDirty = false;
        
        setTimeout(() => {
          if (!isDirty) {
            statusDot.className = 'status-dot';
            saveStatusText.textContent = 'Không có thay đổi nào chưa lưu';
          }
        }, 3000);
      } else {
        btnSave.disabled = false;
        btnSave.style.opacity = '1';
        btnSave.style.cursor = 'pointer';
        btnSave.textContent = 'Lưu thay đổi';
        
        statusDot.className = 'status-dot dirty';
        saveStatusText.textContent = 'Lưu thất bại. Vui lòng thử lại.';
      }
    }, 1000);
  });
});
