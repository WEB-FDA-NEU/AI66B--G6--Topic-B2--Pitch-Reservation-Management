// frontend/js/data/admin.js
export const mockReports = [
  {
    reportId: 'RPT-1048',
    summary: 'Mặt sân bị hỏng và không an toàn để thi đấu',
    description: 'Khi chúng tôi đến nơi, phần cỏ giả gần gôn phía bắc đã bị rách tươm. Hai cầu thủ bị vấp ngã. Cần được bảo trì ngay lập tức.',
    reporterName: 'Alex Morgan',
    reporterId: 'USR-1001',
    reportedEntityType: 'Pitch',
    reportedEntityId: 'PITCH-552',
    reportType: 'Báo cáo sân',
    priority: 'Cao',
    priorityClass: 'badge--danger',
    reportStatus: 'Đã gửi',
    statusClass: 'badge--pending',
    submittedAt: '25 Tháng 9 2026',
    assignedAdmin: null,
    investigationNotes: []
  },
  {
    reportId: 'RPT-1047',
    summary: 'Bị trừ tiền 2 lần cho cùng một đặt sân',
    description: 'Thẻ tín dụng của tôi hiển thị hai lần trừ tiền cho đặt sân BK-8829 vào thứ Bảy. Vui lòng hoàn lại khoản trừ trùng lặp.',
    reporterName: 'Jamie Lee',
    reporterId: 'USR-1002',
    reportedEntityType: 'Booking',
    reportedEntityId: 'BK-8829',
    reportType: 'Báo cáo đặt sân',
    priority: 'Trung bình',
    priorityClass: 'badge--review',
    reportStatus: 'Đang xem xét',
    statusClass: 'badge--review',
    submittedAt: '24 Tháng 9 2026',
    assignedAdmin: 'Morgan Chen',
    investigationNotes: ['Đang kiểm tra nhật ký cổng thanh toán về giao dịch trùng lặp.']
  },
  {
    reportId: 'RPT-1046',
    summary: 'Quản lý từ chối xác nhận đặt sân',
    description: 'Chúng tôi đã đặt và được xác nhận nhưng khi đến nơi, quản lý lại cho đội khác vào đá và đuổi chúng tôi.',
    reporterName: 'Taylor Reed',
    reporterId: 'USR-1003',
    reportedEntityType: 'Pitch Manager',
    reportedEntityId: 'MGR-2002',
    reportType: 'Báo cáo quản lý sân',
    priority: 'Cao',
    priorityClass: 'badge--danger',
    reportStatus: 'Cần điều tra',
    statusClass: 'badge--danger',
    submittedAt: '24 Tháng 9 2026',
    assignedAdmin: 'Jordan Park',
    investigationNotes: ['Đã liên hệ quản lý sân để nghe phía họ.']
  }
];

export const mockActivities = [
  {
    activityId: 'ACT-207',
    actorRole: 'Quản trị viên',
    actorName: 'Morgan Chen',
    actionType: 'Cảnh cáo người dùng',
    targetId: 'Jamie Lee',
    result: 'Thành công',
    resultClass: 'badge--success',
    createdAt: '25 Tháng 9 2026, 10:12',
    details: 'Đã đưa ra cảnh cáo chính thức vì hủy sân muộn.'
  },
  {
    activityId: 'ACT-206',
    actorRole: 'Quản trị viên',
    actorName: 'Jordan Park',
    actionType: 'Đình chỉ sân',
    targetId: 'Hillcrest Sân 2',
    result: 'Thành công',
    resultClass: 'badge--success',
    createdAt: '25 Tháng 9 2026, 08:35',
    details: 'Đình chỉ sân đang chờ kiểm tra bảo trì.'
  },
  {
    activityId: 'ACT-205',
    actorRole: 'Quản trị viên',
    actorName: 'Morgan Chen',
    actionType: 'Cập nhật báo cáo',
    targetId: 'RPT-1044',
    result: 'Thành công',
    resultClass: 'badge--success',
    createdAt: '24 Tháng 9 2026, 16:48',
    details: 'Trạng thái thay đổi từ Cần điều tra sang Đã giải quyết.'
  },
  {
    activityId: 'ACT-204',
    actorRole: 'Quản lý sân',
    actorName: 'Casey Tran',
    actionType: 'Đăng nhập',
    targetId: 'Phiên web',
    result: 'Thành công',
    resultClass: 'badge--success',
    createdAt: '24 Tháng 9 2026, 13:26',
    details: 'Xác thực thành công từ IP mới.'
  }
];

export const mockUsers = [
  {
    id: 'USR-1001',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@email.com',
    role: 'Người dùng',
    accountStatus: 'Hoạt động',
    statusClass: 'badge--success',
    warningCount: 0,
    bookingCount: 12,
    createdAt: '15 Tháng 3 2025',
    lastActivityAt: '25 Tháng 9 2026, 10:30',
      processedBy: '--',
      recentBookings: [{id: 'BK-8000', venue: 'Northside Arena', date: '2026-09-20', status: 'Đã xác nhận'}, {id: 'BK-8001', venue: 'Riverside 5-a-side', date: '2026-09-19', status: 'Đã hoàn thành'}, {id: 'BK-8002', venue: 'Eastfield Sports', date: '2026-09-18', status: 'Đã hoàn thành'}],
      relatedReports: []
  },
  {
    id: 'USR-1002',
    fullName: 'Jamie Lee',
    email: 'jamie.lee@email.com',
    role: 'Người dùng',
    accountStatus: 'Cảnh báo',
    statusClass: 'badge--pending',
    warningCount: 1,
    bookingCount: 8,
    createdAt: '22 Tháng 5 2025',
    lastActivityAt: '24 Tháng 9 2026, 14:20',
      processedBy: 'Morgan Chen',
      adminNote: 'Bị báo cáo vì hủy sân muộn.',
      recentBookings: [{id: 'BK-8000', venue: 'Northside Arena', date: '2026-09-20', status: 'Đã xác nhận'}],
      relatedReports: [{id: 'RPT-1002', type: 'Hành vi người dùng', date: '24 Tháng 9 2026'}]
  },
  {
    id: 'USR-1003',
    fullName: 'Taylor Reed',
    email: 'taylor.reed@email.com',
    role: 'Người dùng',
    accountStatus: 'Đình chỉ',
    statusClass: 'badge--danger',
    warningCount: 2,
    bookingCount: 5,
    createdAt: '10 Tháng 1 2025',
    lastActivityAt: '20 Tháng 9 2026, 16:45',
    suspensionReason: 'Nhiều lần không đến sân'
  },
  {
    id: 'USR-1004',
    fullName: 'Sam Rivera',
    email: 'sam.rivera@email.com',
    role: 'Người dùng',
    accountStatus: 'Hoạt động',
    statusClass: 'badge--success',
    warningCount: 0,
    bookingCount: 15,
    createdAt: '05 Tháng 11 2024',
    lastActivityAt: '25 Tháng 9 2026, 09:15'
  },
  {
    id: 'USR-1006',
    fullName: 'Morgan Chen',
    email: 'morgan.chen@email.com',
    role: 'Người dùng',
    accountStatus: 'Đã khôi phục',
    statusClass: 'badge--review',
    warningCount: 1,
    bookingCount: 7,
    createdAt: '14 Tháng 2 2025',
    lastActivityAt: '25 Tháng 9 2026, 08:00',
      processedBy: 'Jordan Park',
      adminNote: 'Tài khoản được khôi phục sau thời gian xem xét.',
      restoredAt: '01 Tháng 9 2026, 10:00',
      recentBookings: [],
      relatedReports: [{id: 'RPT-1006', type: 'Hành vi người dùng', date: '25 Tháng 9 2026'}]
  }
];

export const mockManagers = [
  {
    id: 'MGR-2001',
    fullName: 'Northside Arena',
    email: 'manager@northsidearena.com',
    role: 'Quản lý sân',
    accountStatus: 'Hoạt động',
    statusClass: 'badge--success',
    managedPitchCount: 3,
    activeBookingCount: '24',
    simulatedBalance: '$12,400',
    createdAt: '01 Tháng 1 2024',
    lastActivityAt: '25 Tháng 9 2026, 09:00'
  },
  {
    id: 'MGR-2002',
    fullName: 'Eastfield Sports',
    email: 'admin@eastfieldsports.com',
    role: 'Quản lý sân',
    accountStatus: 'Cảnh báo',
    statusClass: 'badge--pending',
    managedPitchCount: 2,
    activeBookingCount: '18',
    simulatedBalance: '$8,200',
    createdAt: '15 Tháng 3 2024',
    lastActivityAt: '24 Tháng 9 2026, 15:30'
  },
  {
    id: 'MGR-2003',
    fullName: 'Hillcrest Pitch',
    email: 'owner@hillcrestpitch.com',
    role: 'Quản lý sân',
    accountStatus: 'Đình chỉ',
    statusClass: 'badge--danger',
    managedPitchCount: 1,
    activeBookingCount: '0 (5 affected)',
    simulatedBalance: '$3,100',
    createdAt: '10 Tháng 5 2024',
    lastActivityAt: '20 Tháng 9 2026, 17:00',
    suspensionReason: 'Không phản hồi báo cáo'
  },
  {
    id: 'MGR-2004',
    fullName: 'Riverside 5-a-side',
    email: 'info@riverside5aside.com',
    role: 'Quản lý sân',
    accountStatus: 'Hoạt động',
    statusClass: 'badge--success',
    managedPitchCount: 4,
    activeBookingCount: '31',
    simulatedBalance: '$15,600',
    createdAt: '22 Tháng 8 2024',
    lastActivityAt: '25 Tháng 9 2026, 08:45'
  },
  {
    id: 'MGR-2005',
    fullName: 'Westgate Sports',
    email: 'manager@westgatesports.com',
    role: 'Quản lý sân',
    accountStatus: 'Đã khôi phục',
    statusClass: 'badge--review',
    managedPitchCount: 2,
    activeBookingCount: '12',
    simulatedBalance: '$6,800',
    createdAt: '30 Tháng 11 2024',
    lastActivityAt: '24 Tháng 9 2026, 11:20'
  }
];



export const mockBanners = [
  { id: 'B-001', title: 'Đăng ký Giải đấu Mùa hè', description: 'Đăng ký đội của bạn tham gia giải mùa hè.', position: 'Màn hình chính (Hero)', status: 'Hoạt động', statusClass: 'badge--success', startDate: '01 Tháng 9 2026', endDate: '31 Tháng 10 2026', imageUrl: '', link: '/promos/summer' },
  { id: 'B-002', title: 'Khai trương Sân mới tại Riverside', description: 'Đặt sân mới khai trương tại Riverside.', position: 'Màn hình chính (Hero)', status: 'Đã lên lịch', statusClass: 'badge--primary', startDate: '01 Tháng 10 2026', endDate: '30 Tháng 11 2026', imageUrl: '', link: '/pitches/riverside' },
  { id: 'B-003', title: 'Khuyến mãi Giảm giá Cuối tuần', description: 'Giảm giá 20% cho các đặt sân cuối tuần tại một số sân.', position: 'Thanh bên (Sidebar)', status: 'Hoạt động', statusClass: 'badge--success', startDate: '15 Tháng 9 2026', endDate: '30 Tháng 9 2026', imageUrl: '', link: '/promos/weekend' },
  { id: 'B-004', title: 'Ưu đãi Đặc biệt Ngày lễ', description: 'Giá ưu đãi ngày lễ cho tất cả các sân 5 người.', position: 'Thanh bên (Sidebar)', status: 'Bản nháp', statusClass: 'badge--neutral', startDate: '01 Tháng 12 2026', endDate: '31 Tháng 12 2026', imageUrl: '', link: '/promos/holiday' },
  { id: 'B-005', title: 'Đối tác Nổi bật: SportsCo', description: 'Xem đối tác SportsCo của chúng tôi để...', position: 'Chân trang (Footer)', status: 'Đã hết hạn', statusClass: 'badge--warning', startDate: '01 Tháng 8 2026', endDate: '31 Tháng 8 2026', imageUrl: '', link: '' },
  { id: 'B-006', title: 'Tải Ứng dụng Di động', description: 'Đặt sân nhanh chóng mọi lúc mọi nơi.', position: 'Đầu trang Đặt sân', status: 'Ngừng hoạt động', statusClass: 'badge--neutral', startDate: '01 Tháng 9 2026', endDate: '31 Tháng 12 2026', imageUrl: '', link: '' }
];

export const mockAnnouncements = [
  { id: 'A-001', title: 'Thông báo Bảo trì Hệ thống', content: 'Hệ thống sẽ được bảo trì định kỳ vào ngày 28 tháng 9, từ 2:00 đến 4:00 sáng (UTC). Một số tính năng có thể tạm thời không khả dụng.', audience: 'Tất cả người dùng đã đăng nhập', status: 'Đã phát hành', statusClass: 'badge--success', publishedDate: '25 Tháng 9 2026', expDate: '29 Tháng 9 2026' },
  { id: 'A-002', title: 'Tính năng mới: Chat Nhóm', content: 'Bây giờ bạn có thể chat trực tiếp với đội của mình trên hệ thống.', audience: 'Người dùng đăng ký', status: 'Đã phát hành', statusClass: 'badge--success', publishedDate: '22 Tháng 9 2026', expDate: '22 Tháng 10 2026' },
  { id: 'A-003', title: 'Cập nhật Lịch Chi trả', content: 'Việc chi trả cho chủ sân sẽ được xử lý vào mỗi thứ Hai.', audience: 'Quản lý sân', status: 'Đã phát hành', statusClass: 'badge--success', publishedDate: '20 Tháng 9 2026', expDate: '20 Tháng 12 2026' },
  { id: 'A-004', title: 'Cập nhật Chính sách Bảo mật', content: 'Chính sách bảo mật của chúng tôi đã được cập nhật.', audience: 'Tất cả người dùng đã đăng nhập', status: 'Đã lên lịch', statusClass: 'badge--primary', publishedDate: '01 Tháng 10 2026', expDate: '01 Tháng 11 2026' },
  { id: 'A-005', title: 'Đào tạo Admin', content: 'Một buổi đào tạo về các công cụ admin mới...', audience: 'Quản trị viên', status: 'Bản nháp', statusClass: 'badge--neutral', publishedDate: '05 Tháng 10 2026', expDate: '05 Tháng 10 2026' },
  { id: 'A-006', title: 'Lịch nghỉ Lễ', content: 'Giờ hỗ trợ sẽ được thay đổi trong các ngày lễ...', audience: 'Tất cả người dùng đã đăng nhập', status: 'Chưa phát hành', statusClass: 'badge--neutral', publishedDate: '10 Tháng 9 2026', expDate: '31 Tháng 12 2026' }
];
