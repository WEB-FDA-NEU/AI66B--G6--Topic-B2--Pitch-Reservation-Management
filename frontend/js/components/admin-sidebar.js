class AdminSidebar extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    // Determine the current page to highlight the active link
    const currentPath = window.location.pathname.split('/').pop() || 'admin-dashboard.html';

    this.innerHTML = `
      <aside class="admin-sidebar" aria-label="Điều hướng chính quản trị">
        <div class="admin-sidebar__brand">
          <div class="admin-sidebar__brand-left">
            <div class="admin-brand-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
            </div>
            <span class="admin-brand-name"><strong>Pitch Point</strong> / Admin</span>
          </div>
          <button class="admin-mobile-toggle" aria-label="Toggle menu" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>

        <div class="admin-sidebar__section">
          <p class="admin-sidebar__title">KHÔNG GIAN LÀM VIỆC</p>
          <nav aria-label="Menu quản trị">
            <ul class="admin-menu">
              <li>
                <a href="admin-dashboard.html" class="admin-menu__link ${currentPath.includes('admin-dashboard') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  Tổng quan
                </a>
              </li>
              <li>
                <a href="admin-users.html" class="admin-menu__link ${currentPath.includes('admin-users') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  Quản lý Khách hàng
                </a>
              </li>
              <li>
                <a href="admin-pitch-managers.html" class="admin-menu__link ${currentPath.includes('admin-pitch-managers') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Quản lý Chủ sân
                </a>
              </li>
              <li>
                <a href="admin-pitch-moderation.html" class="admin-menu__link ${currentPath.includes('admin-pitch-moderation') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  Kiểm duyệt Sân bóng
                </a>
              </li>
              <li>
                <a href="admin-reports.html" class="admin-menu__link ${currentPath.includes('admin-reports') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                  Quản lý Báo cáo
                </a>
              </li>
              <li>
                <a href="admin-finance.html" class="admin-menu__link ${currentPath.includes('admin-finance') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Tài chính & Hoàn tiền
                </a>
              </li>
              <li>
                <a href="admin-content.html" class="admin-menu__link ${currentPath.includes('admin-content') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Quản lý Nội dung
                </a>
              </li>
              <li>
                <a href="admin-activity-log.html" class="admin-menu__link ${currentPath.includes('admin-activity-log') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  Nhật ký Hoạt động
                </a>
              </li>
              <li>
                <a href="admin-settings.html" class="admin-menu__link ${currentPath.includes('admin-settings') ? 'active' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  Cài đặt Quản trị
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
    `;
    
    // The "inert and silent" rule for unfinished pages:
    // Actually, I am keeping real URLs (e.g., admin-users.html). 
    // To make them "inert and silent", we can remove the href or use href="#" for ones that aren't the current page.
    // However, the rule says "if the target is not ready, keep the control inert and silent".
    // I will replace href with javascript:void(0) and add a cursor-not-allowed style if not the current page, except for dashboard.
    const links = this.querySelectorAll('a.admin-menu__link');
    const integratedPages = ['admin-dashboard.html', 'admin-users.html', 'admin-pitch-managers.html', 'admin-reports.html', 'admin-activity-log.html'];
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      // If it's not in the integrated pages list and not the current page, make it inert
      const isIntegrated = integratedPages.some(page => href && href.includes(page));
      
      if (!isIntegrated && !link.classList.contains('active')) {
        link.setAttribute('href', '#');
        link.addEventListener('click', e => {
            e.preventDefault(); // Inert and silent
            console.warn('Destination page is not yet integrated.');
        });
        link.style.opacity = '0.6';
        link.style.cursor = 'not-allowed';
      }
    });

    const toggleBtn = this.querySelector('.admin-mobile-toggle');
    const sidebar = this.querySelector('.admin-sidebar');
    
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', isOpen.toString());
        
        if (isOpen) {
          toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        } else {
          toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
        }
      });

      // Close when clicking on the overlay (::before pseudo-element)
      sidebar.addEventListener('click', (e) => {
        if (e.target === sidebar && sidebar.classList.contains('is-open')) {
          sidebar.classList.remove('is-open');
          toggleBtn.setAttribute('aria-expanded', 'false');
          toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
        }
      });
    }
  }
}

customElements.define('admin-sidebar', AdminSidebar);
