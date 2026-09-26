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
    accountStatus: 'Hoạt động',
    statusClass: 'badge--success',
    warningCount: 0,
    bookingCount: 12,
    createdAt: '15 Mar 2025',
    lastActivityAt: '25 Sept 2026, 10:30',
      processedBy: '--',
      recentBookings: [{id: 'BK-8000', venue: 'Northside Arena', date: '2026-09-20', status: 'Confirmed'}, {id: 'BK-8001', venue: 'Riverside 5-a-side', date: '2026-09-19', status: 'Completed'}, {id: 'BK-8002', venue: 'Eastfield Sports', date: '2026-09-18', status: 'Completed'}],
      relatedReports: []
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
    lastActivityAt: '24 Sept 2026, 14:20',
      processedBy: 'Morgan Chen',
      adminNote: 'Reported for late cancellation.',
      recentBookings: [{id: 'BK-8000', venue: 'Northside Arena', date: '2026-09-20', status: 'Confirmed'}],
      relatedReports: [{id: 'RPT-1002', type: 'User conduct', date: '24 Sept 2026'}]
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
    accountStatus: 'Hoạt động',
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
    lastActivityAt: '25 Sept 2026, 08:00',
      processedBy: 'Jordan Park',
      adminNote: 'Account restored after review period.',
      restoredAt: '01 Sept 2026, 10:00',
      recentBookings: [],
      relatedReports: [{id: 'RPT-1006', type: 'User conduct', date: '25 Sept 2026'}]
  }
];

export const mockManagers = [
  {
    id: 'MGR-2001',
    fullName: 'Northside Arena',
    email: 'manager@northsidearena.com',
    role: 'Manager',
    accountStatus: 'Hoạt động',
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
    accountStatus: 'Hoạt động',
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



export const mockBanners = [
  { id: 'B-001', title: 'Summer Tournament Registration', description: 'Register your team for the summer tournament.', position: 'Màn hình chính (Hero)', status: 'Hoạt động', statusClass: 'badge--success', startDate: '01 Sept 2026', endDate: '31 Oct 2026', imageUrl: '', link: '/promos/summer' },
  { id: 'B-002', title: 'New Pitch Launch at Riverside', description: 'Book the newly opened pitches at Riverside.', position: 'Màn hình chính (Hero)', status: 'Đã lên lịch', statusClass: 'badge--primary', startDate: '01 Oct 2026', endDate: '30 Nov 2026', imageUrl: '', link: '/pitches/riverside' },
  { id: 'B-003', title: 'Weekend Discount Promo', description: 'Get 20% off weekend bookings at select pitches.', position: 'Thanh bên (Sidebar)', status: 'Hoạt động', statusClass: 'badge--success', startDate: '15 Sept 2026', endDate: '30 Sept 2026', imageUrl: '', link: '/promos/weekend' },
  { id: 'B-004', title: 'Holiday Special Offer', description: 'Special holiday rates for all 5-a-side pitches.', position: 'Thanh bên (Sidebar)', status: 'Bản nháp', statusClass: 'badge--neutral', startDate: '01 Dec 2026', endDate: '31 Dec 2026', imageUrl: '', link: '/promos/holiday' },
  { id: 'B-005', title: 'Partner Spotlight: SportsCo', description: 'Check out our partner SportsCo for pre...', position: 'Footer', status: 'Đã hết hạn', statusClass: 'badge--warning', startDate: '01 Aug 2026', endDate: '31 Aug 2026', imageUrl: '', link: '' },
  { id: 'B-006', title: 'Download Our Mobile App', description: 'Book on the go with our mobile app.', position: 'Booking page top', status: 'Ngừng hoạt động', statusClass: 'badge--neutral', startDate: '01 Sept 2026', endDate: '31 Dec 2026', imageUrl: '', link: '' }
];

export const mockAnnouncements = [
  { id: 'A-001', title: 'Platform Maintenance Notice', content: 'The platform will undergo scheduled maintenance on September 28th from 2:00 AM to 4:00 AM UTC. Some features may be temporarily unavailable.', audience: 'All authenticated users', status: 'Published', statusClass: 'badge--success', publishedDate: '25 Sept 2026', expDate: '29 Sept 2026' },
  { id: 'A-002', title: 'New Feature: Team Chat', content: 'You can now chat with your team members directly on the platform.', audience: 'Registered users', status: 'Published', statusClass: 'badge--success', publishedDate: '22 Sept 2026', expDate: '22 Oct 2026' },
  { id: 'A-003', title: 'Payout Schedule Update', content: 'Manager payouts will now be processed every Monday.', audience: 'Pitch managers', status: 'Published', statusClass: 'badge--success', publishedDate: '20 Sept 2026', expDate: '20 Dec 2026' },
  { id: 'A-004', title: 'Security Policy Update', content: 'Our security policy has been updated.', audience: 'All authenticated users', status: 'Đã lên lịch', statusClass: 'badge--primary', publishedDate: '01 Oct 2026', expDate: '01 Nov 2026' },
  { id: 'A-005', title: 'Admin Training Session', content: 'A training session for new admin tools...', audience: 'Administrators', status: 'Bản nháp', statusClass: 'badge--neutral', publishedDate: '05 Oct 2026', expDate: '05 Oct 2026' },
  { id: 'A-006', title: 'Holiday Schedule', content: 'Modified support hours during the holi...', audience: 'All authenticated users', status: 'Unpublished', statusClass: 'badge--neutral', publishedDate: '10 Sept 2026', expDate: '31 Dec 2026' }
];
