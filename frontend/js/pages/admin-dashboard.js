// admin-dashboard.js
// Mock Data (to be replaced by Admin Service in the future)

const mockReports = [
  {
    id: 'RPT-1048',
    reason: 'Pitch condition',
    reporter: 'Alex Morgan',
    date: '25 Sept 2026',
    statusText: 'Pending',
    statusClass: 'badge--pending'
  },
  {
    id: 'RPT-1047',
    reason: 'Booking dispute',
    reporter: 'Jamie Lee',
    date: '24 Sept 2026',
    statusText: 'In review',
    statusClass: 'badge--review'
  },
  {
    id: 'RPT-1046',
    reason: 'Manager conduct',
    reporter: 'Taylor Reed',
    date: '24 Sept 2026',
    statusText: 'Pending',
    statusClass: 'badge--pending'
  }
];

const mockActivities = [
  {
    action: 'User warning',
    adminName: 'Morgan Chen',
    target: 'Alex Morgan',
    date: '25 Sept 2026, 10:12 UTC',
    status: 'Completed',
    statusClass: 'badge--success'
  },
  {
    action: 'Pitch suspension',
    adminName: 'Jordan Park',
    target: 'Hillcrest Pitch 2',
    date: '25 Sept 2026, 08:35 UTC',
    status: 'Completed',
    statusClass: 'badge--success'
  },
  {
    action: 'Report resolution',
    adminName: 'Morgan Chen',
    target: 'RPT-1044',
    date: '24 Sept 2026, 16:48 UTC',
    status: 'Completed',
    statusClass: 'badge--success'
  }
];

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

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  renderMockData();
});
