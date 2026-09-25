// frontend/js/data/admin.js
export const mockReports = [
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

export const mockActivities = [
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
