# Demo accounts

Every account uses the password **`123456`**. The login page has quick-fill buttons for the first customer, manager and admin only.

| Role | Email | Name | Notes |
|---|---|---|---|
| Admin | `admin@pitchpoint.test` | Quản trị viên demo | |
| Manager | `manager@pitchpoint.test` | Chủ sân demo | pitch-1, pitch-2, pitch-3, pitch-11 (pitch-11 only with demo data) |
| Manager | `manager2@pitchpoint.test` | Nguyễn Văn Hùng | pitch-4, pitch-5, pitch-6 |
| Manager | `manager3@pitchpoint.test` | Phạm Thị Lan | pitch-7, pitch-8, plus pitch-12 (demo data) |
| Manager | `manager4@pitchpoint.test` | Đỗ Quang Minh | pitch-9, pitch-10, plus pitch-13, pitch-14 (demo data) |
| Manager | `manager5@pitchpoint.test` | Trần Thị Mai | pitch-15, pitch-16, pitch-17 (paused) - demo data only |
| Manager | `manager6@pitchpoint.test` | Lê Hoàng Phúc | pitch-18, pitch-19 (Ho Chi Minh City) - demo data only |
| Manager | `manager7@pitchpoint.test` | Vũ Đình Khoa | pitch-20 - demo data only |
| Manager | `manager8@pitchpoint.test` | Nguyễn Thu Hà | pitch-21 (Da Nang) - demo data only |
| Customer | `customer@pitchpoint.test` | Khách hàng demo | |
| Customer | `binh@pitchpoint.test` | Trần Văn Bình | only with demo data (`SEED_DEMO=true`, default) |
| Customer | `chau@pitchpoint.test` | Lê Minh Châu | only with demo data |
| Customer | `dung@pitchpoint.test` | Hoàng Tiến Dũng | |
| Customer | `giang@pitchpoint.test` | Vũ Thu Giang | sample chat with manager2 (demo data) |
| Customer | `hai@pitchpoint.test` | Ngô Đức Hải | |
| Customer | `khanh@pitchpoint.test` | Bùi Ngọc Khánh | |
| Customer | `linh`, `nam`, `quan`, `trang`, `son`, `tuan`, `yen`, `phong` `@pitchpoint.test` | Đặng Thùy Linh, Phan Hoài Nam, Trịnh Minh Quân, Đinh Thu Trang, Lý Thanh Sơn, Mai Anh Tuấn, Hồ Hải Yến, Cao Gia Phong | demo data only (`SEED_DEMO=true`) |

New accounts start with a 2,000,000 VND test balance. Demo data tops up each customer so the sample bookings are covered.

## Pitches

| Id | Name | Size | Price per hour (VND) |
|---|---|---|---|
| pitch-1 | Sân bóng Cầu Giấy | 5-a-side | 250,000 |
| pitch-2 | Sân bóng Mỹ Đình | 7-a-side | 400,000 |
| pitch-3 | Sân bóng Thanh Xuân | 5-a-side | 220,000 |
| pitch-4 | Sân bóng Hoàng Mai | 5-a-side | 200,000 |
| pitch-5 | Sân bóng Long Biên | 7-a-side | 350,000 |
| pitch-6 | Sân vận động mini Hà Đông | 11-a-side | 900,000 (open 07:00-21:00) |
| pitch-7 | Sân bóng Tây Hồ | 5-a-side | 280,000 |
| pitch-8 | Sân bóng Ba Đình | 7-a-side | 380,000 |
| pitch-9 | Sân bóng Đống Đa | 5-a-side | 230,000 |
| pitch-10 | Sân bóng Hai Bà Trưng | 7-a-side | 360,000 |

With demo data (`SEED_DEMO=true`, default) there are 11 more pitches (pitch-11 to pitch-21) in Ha Noi, Ho Chi Minh City and Da Nang, in all three sizes, several with a higher evening price (from 17:00); pitch-17 is paused. In total: 1 admin, 8 managers, 15 customers, 21 pitches, about 60 bookings with reviews, favourites and sample chats. Without demo data: 1 admin, 4 managers, 7 customers, 10 pitches. Pitch photos are not part of the seed: cards show the default placeholder until a manager uploads a photo.

Pitches without stated hours open 06:00-22:00.

## Reset

- Reset all data (server stopped): `python -m app.seed --reset` in `backend/`. Passwords return to `123456`.
- Forgotten admin password: `python -m app.reset_password admin@pitchpoint.test` in `backend/`.
- Source data: `backend/seed.json`, `backend/app/demo.py` and `backend/app/demo_more.py`.
