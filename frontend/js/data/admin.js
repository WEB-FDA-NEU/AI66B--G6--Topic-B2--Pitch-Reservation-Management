// frontend/js/data/admin.js
export const mockReports = [
  {
    reportId: 'RPT-1048',
    summary: 'Pitch surface is damaged and unsafe for play',
    description: 'When we arrived for our booking, the turf near the north goal was completely ripped up. Two players tripped on it. This needs immediate maintenance.',
    reporterName: 'Alex Morgan',
    reporterId: 'USR-1001',
    reportedEntityType: 'Pitch',
    reportedEntityId: 'PITCH-552',
    reportType: 'Pitch report',
    priority: 'High',
    priorityClass: 'badge--danger',
    reportStatus: 'Submitted',
    statusClass: 'badge--pending',
    submittedAt: '25 Sept 2026',
    assignedAdmin: null,
    investigationNotes: []
  },
  {
    reportId: 'RPT-1047',
    summary: 'Charged twice for the same booking',
    description: 'My credit card shows two separate charges for the booking BK-8829 on Saturday. Please refund the duplicate charge.',
    reporterName: 'Jamie Lee',
    reporterId: 'USR-1002',
    reportedEntityType: 'Booking',
    reportedEntityId: 'BK-8829',
    reportType: 'Booking-related report',
    priority: 'Medium',
    priorityClass: 'badge--review',
    reportStatus: 'Under review',
    statusClass: 'badge--review',
    submittedAt: '24 Sept 2026',
    assignedAdmin: 'Morgan Chen',
    investigationNotes: ['Checking payment gateway logs for duplicate transactions.']
  },
  {
    reportId: 'RPT-1046',
    summary: 'Manager refused to honour confirmed booking',
    description: 'We had a confirmed booking but when we arrived, the manager had let another team onto the pitch and told us we had to leave.',
    reporterName: 'Taylor Reed',
    reporterId: 'USR-1003',
    reportedEntityType: 'Pitch Manager',
    reportedEntityId: 'MGR-2002',
    reportType: 'Pitch manager report',
    priority: 'High',
    priorityClass: 'badge--danger',
    reportStatus: 'Investigation required',
    statusClass: 'badge--danger',
    submittedAt: '24 Sept 2026',
    assignedAdmin: 'Jordan Park',
    investigationNotes: ['Reached out to manager for their side of the story.']
  }
];

export const mockActivities = [
  {
    activityId: 'ACT-207',
    actorRole: 'Admin',
    actorName: 'Morgan Chen',
    actionType: 'User warning',
    targetId: 'Jamie Lee',
    result: 'Success',
    resultClass: 'badge--success',
    createdAt: '25 Sept 2026, 10:12',
    details: 'Issued formal warning for late cancellations.'
  },
  {
    activityId: 'ACT-206',
    actorRole: 'Admin',
    actorName: 'Jordan Park',
    actionType: 'Pitch suspension',
    targetId: 'Hillcrest Pitch 2',
    result: 'Success',
    resultClass: 'badge--success',
    createdAt: '25 Sept 2026, 08:35',
    details: 'Suspended pitch pending maintenance review.'
  },
  {
    activityId: 'ACT-205',
    actorRole: 'Admin',
    actorName: 'Morgan Chen',
    actionType: 'Report status update',
    targetId: 'RPT-1044',
    result: 'Success',
    resultClass: 'badge--success',
    createdAt: '24 Sept 2026, 16:48',
    details: 'Status changed from Investigation required to Resolved.'
  },
  {
    activityId: 'ACT-204',
    actorRole: 'Manager',
    actorName: 'Casey Tran',
    actionType: 'Login',
    targetId: 'Web session',
    result: 'Success',
    resultClass: 'badge--success',
    createdAt: '24 Sept 2026, 13:26',
    details: 'Successful authentication from new IP.'
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
