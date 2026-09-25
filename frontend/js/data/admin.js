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

export const mockUsers = [
  {
    id: 'USR-1001',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@email.com',
    role: 'User',
    accountStatus: 'Active',
    statusClass: 'badge--success',
    warningCount: 0,
    bookingCount: 12,
    createdAt: '15 Mar 2025',
    lastActivityAt: '25 Sept 2026, 10:30'
  },
  {
    id: 'USR-1002',
    fullName: 'Jamie Lee',
    email: 'jamie.lee@email.com',
    role: 'User',
    accountStatus: 'Warned',
    statusClass: 'badge--pending',
    warningCount: 1,
    bookingCount: 8,
    createdAt: '22 May 2025',
    lastActivityAt: '24 Sept 2026, 14:20'
  },
  {
    id: 'USR-1003',
    fullName: 'Taylor Reed',
    email: 'taylor.reed@email.com',
    role: 'User',
    accountStatus: 'Suspended',
    statusClass: 'badge--danger',
    warningCount: 2,
    bookingCount: 5,
    createdAt: '10 Jan 2025',
    lastActivityAt: '20 Sept 2026, 16:45',
    suspensionReason: 'Repeated no-shows'
  },
  {
    id: 'USR-1004',
    fullName: 'Sam Rivera',
    email: 'sam.rivera@email.com',
    role: 'User',
    accountStatus: 'Active',
    statusClass: 'badge--success',
    warningCount: 0,
    bookingCount: 15,
    createdAt: '05 Nov 2024',
    lastActivityAt: '25 Sept 2026, 09:15'
  },
  {
    id: 'USR-1006',
    fullName: 'Morgan Chen',
    email: 'morgan.chen@email.com',
    role: 'User',
    accountStatus: 'Restored',
    statusClass: 'badge--review',
    warningCount: 1,
    bookingCount: 7,
    createdAt: '14 Feb 2025',
    lastActivityAt: '25 Sept 2026, 08:00'
  }
];

export const mockManagers = [
  {
    id: 'MGR-2001',
    fullName: 'Northside Arena',
    email: 'manager@northsidearena.com',
    role: 'Manager',
    accountStatus: 'Active',
    statusClass: 'badge--success',
    managedPitchCount: 3,
    activeBookingCount: '24',
    simulatedBalance: '$12,400',
    createdAt: '01 Jan 2024',
    lastActivityAt: '25 Sept 2026, 09:00'
  },
  {
    id: 'MGR-2002',
    fullName: 'Eastfield Sports',
    email: 'admin@eastfieldsports.com',
    role: 'Manager',
    accountStatus: 'Warned',
    statusClass: 'badge--pending',
    managedPitchCount: 2,
    activeBookingCount: '18',
    simulatedBalance: '$8,200',
    createdAt: '15 Mar 2024',
    lastActivityAt: '24 Sept 2026, 15:30'
  },
  {
    id: 'MGR-2003',
    fullName: 'Hillcrest Pitch',
    email: 'owner@hillcrestpitch.com',
    role: 'Manager',
    accountStatus: 'Suspended',
    statusClass: 'badge--danger',
    managedPitchCount: 1,
    activeBookingCount: '0 (5 affected)',
    simulatedBalance: '$3,100',
    createdAt: '10 May 2024',
    lastActivityAt: '20 Sept 2026, 17:00',
    suspensionReason: 'Unresponsive to reports'
  },
  {
    id: 'MGR-2004',
    fullName: 'Riverside 5-a-side',
    email: 'info@riverside5aside.com',
    role: 'Manager',
    accountStatus: 'Active',
    statusClass: 'badge--success',
    managedPitchCount: 4,
    activeBookingCount: '31',
    simulatedBalance: '$15,600',
    createdAt: '22 Aug 2024',
    lastActivityAt: '25 Sept 2026, 08:45'
  },
  {
    id: 'MGR-2005',
    fullName: 'Westgate Sports',
    email: 'manager@westgatesports.com',
    role: 'Manager',
    accountStatus: 'Restored',
    statusClass: 'badge--review',
    managedPitchCount: 2,
    activeBookingCount: '12',
    simulatedBalance: '$6,800',
    createdAt: '30 Nov 2024',
    lastActivityAt: '24 Sept 2026, 11:20'
  }
];
