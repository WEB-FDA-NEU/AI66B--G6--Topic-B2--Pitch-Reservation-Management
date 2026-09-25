// js/pages/admin-dashboard.js
import '../components/admin-sidebar.js';
import { mockReports, mockActivities } from '../data/admin.js';

function renderMockData() {
  // Render Reports
  const reportsTbody = document.getElementById('recent-reports-tbody');
  const reportTemplate = document.getElementById('tpl-report-row');

  if (reportsTbody && reportTemplate) {
    reportsTbody.innerHTML = '';
    mockReports.forEach(report => {
      const clone = reportTemplate.content.cloneNode(true);
      clone.querySelector('.td-report-id').textContent = report.id;
      clone.querySelector('.td-report-meta').textContent = report.reason;
      clone.querySelector('.td-reporter').textContent = report.reporter;
      clone.querySelector('.td-date').textContent = report.date;
      
      const badge = clone.querySelector('.badge');
      badge.textContent = report.statusText;
      badge.className = `badge ${report.statusClass}`;
      
      reportsTbody.appendChild(clone);
    });
  }

  // Render Activities
  const activityList = document.getElementById('recent-activity-list');
  const activityTemplate = document.getElementById('tpl-activity-item');

  if (activityList && activityTemplate) {
    activityList.innerHTML = '';
    mockActivities.forEach(activity => {
      const clone = activityTemplate.content.cloneNode(true);
      clone.querySelector('.activity-title').textContent = activity.action;
      
      const badge = clone.querySelector('.badge');
      badge.textContent = activity.status;
      badge.className = `badge ${activity.statusClass}`;
      
      clone.querySelector('.activity-item__desc').innerHTML = `${activity.adminName} &middot; ${activity.target}`;
      clone.querySelector('.activity-item__date').textContent = activity.date;
      
      activityList.appendChild(clone);
    });
  }
}

function handleTabNavigation() {
  const urlParams = new URLSearchParams(window.location.search);
  let activeTabId = urlParams.get('tab') || 'users';

  // Fallback to 'users' if tab is invalid
  const validTabs = ['users', 'pitches', 'reports'];
  if (!validTabs.includes(activeTabId)) {
    activeTabId = 'users';
  }

  // Activate the initial tab
  activateTab(activeTabId);

  // Bind click events to tab buttons (if they existed in the initial design, 
  // currently we removed tabs in favor of the dashboard cards, but let's safely handle it if they exist)
  const tabButtons = document.querySelectorAll('.tabs-nav__btn');
  if (tabButtons.length > 0) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.target.dataset.tab;
        if (tabId) {
          activateTab(tabId);
          // Update URL without reloading
          const newUrl = new URL(window.location);
          newUrl.searchParams.set('tab', tabId);
          window.history.pushState({ tab: tabId }, '', newUrl);
        }
      });
    });
  }
}

function activateTab(tabId) {
  // Update buttons (if any)
  document.querySelectorAll('.tabs-nav__btn').forEach(btn => {
    const isSelected = btn.dataset.tab === tabId;
    btn.setAttribute('aria-selected', isSelected.toString());
  });

  // Update panels (if any)
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const isSelected = panel.id === `panel-${tabId}`;
    if (isSelected) {
      panel.removeAttribute('hidden');
      panel.classList.remove('hidden');
    } else {
      panel.setAttribute('hidden', '');
      panel.classList.add('hidden');
    }
  });
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  renderMockData();
  handleTabNavigation();
});
