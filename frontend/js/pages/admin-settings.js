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
      saveStatusText.textContent = 'Unsaved changes';
      
      btnSave.disabled = false;
      btnSave.style.opacity = '1';
      btnSave.style.cursor = 'pointer';
    }
  };

  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);

  // Save changes
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validate custom
    if (!form.checkValidity()) {
      statusDot.className = 'status-dot dirty';
      saveStatusText.textContent = 'Form validation error';
      return;
    }

    // Simulate saving
    btnSave.disabled = true;
    btnSave.style.opacity = '0.6';
    btnSave.style.cursor = 'not-allowed';
    btnSave.textContent = 'Saving...';
    
    statusDot.className = 'status-dot'; // Grey
    saveStatusText.textContent = 'Saving changes...';

    setTimeout(() => {
      // 90% success mock
      if (Math.random() > 0.1) {
        btnSave.textContent = 'Save changes';
        statusDot.className = 'status-dot saved';
        saveStatusText.textContent = 'Save successful';
        isDirty = false;
        
        setTimeout(() => {
          if (!isDirty) {
            statusDot.className = 'status-dot';
            saveStatusText.textContent = 'No unsaved changes';
          }
        }, 3000);
      } else {
        btnSave.disabled = false;
        btnSave.style.opacity = '1';
        btnSave.style.cursor = 'pointer';
        btnSave.textContent = 'Save changes';
        
        statusDot.className = 'status-dot dirty';
        saveStatusText.textContent = 'Save failed. Please try again.';
      }
    }, 1000);
  });
});
