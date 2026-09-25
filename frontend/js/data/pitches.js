// Dữ liệu sân mô phỏng dùng chung cho Home và Search Results.
// Khi có backend, giữ nguyên tên trường để thay nguồn dữ liệu mà không đổi giao diện.
export const MOCK_PITCHES = [
  { id: 1, ownerId: 'O001', name: 'Sân bóng Bách Khoa', location: 'Hai Bà Trưng, Hà Nội', type: '7-a-side', typeLabel: 'Sân 7 người', price: 420000, rating: 4.9, badge: 'Đặt nhiều', image: 'img/placeholder.svg', featured: true },
  { id: 2, ownerId: 'O002', name: 'Green Field Minh Khai', location: 'Bắc Từ Liêm, Hà Nội', type: '5-a-side', typeLabel: 'Sân 5 người', price: 300000, rating: 4.8, badge: 'Còn giờ đẹp', image: 'img/placeholder.svg', featured: true },
  { id: 3, ownerId: 'O001', name: 'Arena Tây Hồ', location: 'Tây Hồ, Hà Nội', type: '7-a-side', typeLabel: 'Sân 7 người', price: 500000, rating: 4.7, badge: 'Mới', image: 'img/placeholder.svg', featured: true },
  { id: 4, ownerId: 'O002', name: 'Sân bóng Thành Công', location: 'Ba Đình, Hà Nội', type: '11-a-side', typeLabel: 'Sân 11 người', price: 900000, rating: 4.8, badge: 'Đánh giá cao', image: 'img/placeholder.svg', featured: true },
  { id: 5, ownerId: 'O001', name: 'Victory Field Cầu Giấy', location: 'Cầu Giấy, Hà Nội', type: '5-a-side', typeLabel: 'Sân 5 người', price: 320000, rating: 4.6, badge: 'Phổ biến', image: 'img/placeholder.svg', featured: false },
  { id: 6, ownerId: 'O002', name: 'Sân bóng Hoàng Mai', location: 'Hoàng Mai, Hà Nội', type: '7-a-side', typeLabel: 'Sân 7 người', price: 390000, rating: 4.5, badge: 'Giá tốt', image: 'img/placeholder.svg', featured: false },
  { id: 7, ownerId: 'O001', name: 'Long Biên Football Hub', location: 'Long Biên, Hà Nội', type: '11-a-side', typeLabel: 'Sân 11 người', price: 850000, rating: 4.7, badge: 'Sân mới', image: 'img/placeholder.svg', featured: false },
  { id: 8, ownerId: 'O002', name: 'Phủi Arena Đống Đa', location: 'Đống Đa, Hà Nội', type: '5-a-side', typeLabel: 'Sân 5 người', price: 280000, rating: 4.4, badge: 'Còn chỗ', image: 'img/placeholder.svg', featured: false },
];

export const formatPitchPrice = value =>
  `${new Intl.NumberFormat('vi-VN').format(value)}đ / giờ`;

