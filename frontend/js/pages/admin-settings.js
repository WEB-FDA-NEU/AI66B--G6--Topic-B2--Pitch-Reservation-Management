import '../components/admin-sidebar.js';

let isDirty = false;

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.admin-tab-pill');
  const sections = document.querySelectorAll('.settings-section');
  const form = document.getElementById('settings-form');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');
  const saveStatus = document.getElementById('save-status');

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
  form.addEventListener('input', () => {
    if (!isDirty) {
      isDirty = true;
      saveStatus.hidden = false;
      saveStatus.textContent = 'Unsaved changes';
      saveStatus.style.color = 'var(--c-warning)';
    }
  });

  form.addEventListener('change', () => {
    if (!isDirty) {
      isDirty = true;
      saveStatus.hidden = false;
      saveStatus.textContent = 'Unsaved changes';
      saveStatus.style.color = 'var(--c-warning)';
    }
  });

  // Discard changes
  btnCancel.addEventListener('click', () => {
    if (isDirty && confirm('Discard unsaved changes?')) {
      form.reset();
      isDirty = false;
      saveStatus.hidden = true;
    }
  });

  // Save changes
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validate custom
    if (!form.checkValidity()) {
      saveStatus.textContent = 'Validation error';
      saveStatus.style.color = 'var(--c-danger)';
      return;
    }

    // Simulate saving
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';
    saveStatus.textContent = 'Saving changes...';
    saveStatus.style.color = 'var(--c-muted)';

    setTimeout(() => {
      // 90% success mock
      if (Math.random() > 0.1) {
        btnSave.disabled = false;
        btnSave.textContent = 'Save settings';
        saveStatus.textContent = 'Save successful!';
        saveStatus.style.color = 'var(--c-success)';
        isDirty = false;
        
        setTimeout(() => {
          if (!isDirty) saveStatus.hidden = true;
        }, 3000);
      } else {
        btnSave.disabled = false;
        btnSave.textContent = 'Save settings';
        saveStatus.textContent = 'Save failed. Please try again.';
        saveStatus.style.color = 'var(--c-danger)';
      }
    }, 1000);
  });
});
