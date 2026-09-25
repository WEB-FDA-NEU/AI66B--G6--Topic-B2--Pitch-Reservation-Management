import '../components/site-header.js';
import '../components/site-footer.js';

// Elements
const tabButtons = document.querySelectorAll('.tabs-nav__btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Mock Data (to be replaced by Admin Service in the future)
const mockKpiData = {
  users: {
    newUsers: 142,
    pendingManagers: 18,
    suspended: 5
  },
  pitches: {
    pending: 12,
    active: 304,
    suspended: 3
  },
  reports: {
    new: 27,
    progress: 14,
    resolved: 189
  }
};

/**
 * Switch to a specific tab
 * @param {string} tabId - e.g., 'users', 'pitches', 'reports'
 * @param {boolean} updateUrl - whether to pushState to URL
 */
function activateTab(tabId, updateUrl = true) {
  // Update buttons
  tabButtons.forEach(btn => {
    const isSelected = btn.getAttribute('data-tab') === tabId;
    btn.setAttribute('aria-selected', isSelected);
  });

  // Update panels
  tabPanels.forEach(panel => {
    if (panel.id === `panel-${tabId}`) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
  });

  // Update URL
  if (updateUrl) {
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
  }
}

/**
 * Initialize tab from URL on load
 */
function initTabs() {
  const params = new URLSearchParams(window.location.search);
  const currentTab = params.get('tab');
  
  // Validate tab parameter
  const validTabs = ['users', 'pitches', 'reports'];
  const activeTab = validTabs.includes(currentTab) ? currentTab : 'users';
  
  activateTab(activeTab, false);

  // Add click listeners
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      activateTab(tabId);
    });
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tab');
    activateTab(validTabs.includes(t) ? t : 'users', false);
  });
}

/**
 * Render mock KPIs to demonstrate screen functionality
 */
function renderMockData() {
  // Users KPI
  const kpiNewUsers = document.getElementById('kpi-new-users');
  const kpiPendingManagers = document.getElementById('kpi-pending-managers');
  const kpiSuspended = document.getElementById('kpi-suspended');
  
  if (kpiNewUsers) kpiNewUsers.textContent = mockKpiData.users.newUsers;
  if (kpiPendingManagers) kpiPendingManagers.textContent = mockKpiData.users.pendingManagers;
  if (kpiSuspended) kpiSuspended.textContent = mockKpiData.users.suspended;

  // Pitches KPI
  const kpiPendingPitches = document.getElementById('kpi-pending-pitches');
  const kpiActivePitches = document.getElementById('kpi-active-pitches');
  const kpiSuspendedPitches = document.getElementById('kpi-suspended-pitches');

  if (kpiPendingPitches) kpiPendingPitches.textContent = mockKpiData.pitches.pending;
  if (kpiActivePitches) kpiActivePitches.textContent = mockKpiData.pitches.active;
  if (kpiSuspendedPitches) kpiSuspendedPitches.textContent = mockKpiData.pitches.suspended;

  // Reports KPI
  const kpiNewReports = document.getElementById('kpi-new-reports');
  const kpiProgressReports = document.getElementById('kpi-progress-reports');
  const kpiResolvedReports = document.getElementById('kpi-resolved-reports');

  if (kpiNewReports) kpiNewReports.textContent = mockKpiData.reports.new;
  if (kpiProgressReports) kpiProgressReports.textContent = mockKpiData.reports.progress;
  if (kpiResolvedReports) kpiResolvedReports.textContent = mockKpiData.reports.resolved;
}

// Initialize
initTabs();
renderMockData();
