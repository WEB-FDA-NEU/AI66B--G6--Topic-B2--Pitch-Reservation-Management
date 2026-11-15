# Frontend — cấu trúc và quy ước

Web đặt sân bóng mini (tiếng Việt) cho 3 vai trò: **khách hàng**, **chủ sân** và **quản trị viên**. Khách chưa đăng nhập được xem sân và tìm kiếm.
- Chỉ dùng HTML, CSS và JavaScript thuần (ES module), không có framework hay bước build.
- Dữ liệu đến từ backend FastAPI (xem `docs/BACKEND.md`). Backend phục vụ luôn thư mục `frontend/` trên cùng địa chỉ với API; mở bằng `file://` hay `python -m http.server` sẽ không có dữ liệu.
- Tiền trong ví là tiền thử nghiệm, không phải tiền thật.

## 1. Cấu trúc thư mục

```
frontend/
├── <ten-man>.html            Mỗi màn một file HTML, tên viết thường nối bằng gạch ngang
├── screen-template.html      Mẫu để tạo màn mới (không phải màn chạy thật)
├── css/
│   ├── reset.css · tokens.css · layout.css · components.css   4 file dùng chung, nạp đúng thứ tự này
│   └── <ten-man>.css         CSS riêng của từng màn (trang chủ dùng home.css)
├── js/
│   ├── core/        Dùng ở mọi trang: config.js (địa chỉ API, hằng số nghiệp vụ), ui.js (shell, header/footer,
│   │                toast, dialog), render.js (el(), định dạng, nhãn trạng thái, infoList, phân trang),
│   │                avatar.js (avatar theo vai trò), list-memory.js (nhớ vị trí danh sách, nút quay lại),
│   │                links.js, motion.js, date-picker.js, page-bootstrap.js (theme trước khi vẽ trang)
│   ├── services/    api-client.js: lớp services, nơi duy nhất trang dùng để đọc/ghi dữ liệu.
│   │                Gọi backend FastAPI qua HTTP (cookie phiên HttpOnly).
│   ├── features/    Phần dùng chung cho nhiều màn: customer-kit, management-kit, pitch-booking,
│   │                auth-forms, checkout, pitch-form
│   ├── components/  Thành phần giao diện: site-header, site-footer, pitch-card, search-form, slot-picker,
│   │                booking-stepper, password-field, appeal-section, pitch-form, image-upload
│   └── pages/       <ten-man>.js: mỗi màn một file (trang chủ là home.js; 403/404/500 dùng error.js)
└── img/
```

**Luồng gọi:** trang (`pages/`) → thành phần/luồng dùng chung (`components/`, `features/`) → `services/api-client.js` → backend.
Backend là FastAPI trong `backend/`. Frontend không bao giờ kết nối thẳng tới database.
Trang không bao giờ import file của trang khác. Code giao diện không chứa CSS inline cố định: style dùng chung nằm trong class `u-*` của `components.css`; chỉ những giá trị phụ thuộc dữ liệu (chiều cao cột biểu đồ…) mới gán trực tiếp.

## 2. Danh sách màn hình

| Nhóm | Màn | File |
|---|---|---|
| Công khai | Trang chủ, Tìm sân, Chi tiết sân, Chủ sân | `index`, `search`, `pitch-detail`, `pitch-owner-profile` |
| Tài khoản | Đăng nhập, Đăng ký, Quên/Đặt lại mật khẩu | `login`, `register`, `forgot-password`, `reset-password` |
| Khách hàng | Đặt sân, Xác nhận, Thanh toán, Kết quả | `booking-schedule`, `booking-confirmation`, `payment`, `booking-result` |
| Khách hàng | Đơn của tôi, Chi tiết đơn, Sân yêu thích, Lịch sử thanh toán | `booking-history`, `booking-details`, `favorite-pitches`, `payment-history` |
| Dùng chung | Tin nhắn, Thông báo, Cài đặt tài khoản, Chế độ hiển thị | `messages`, `notifications`, `account-settings`, `settings` |
| Chủ sân | Tổng quan, Sân của tôi, Thêm sân, Sửa sân, Lịch và giá, Đơn, Doanh thu | `manager-dashboard`, `manager-pitches`, `add-pitch`, `edit-pitch`, `pitch-availability`, `manager-bookings`, `manager-revenue` |
| Quản trị | Tổng quan, Người dùng, Chủ sân, Quản lý sân, Đơn và hoàn tiền, Báo cáo, Nội dung, Nhật ký, Cài đặt | `admin-dashboard`, `admin-users`, `admin-pitch-managers`, `admin-pitch-moderation`, `admin-finance`, `admin-reports`, `admin-content`, `admin-activity-log`, `admin-settings` |
| Lỗi | Không có quyền, Không tìm thấy, Sự cố hệ thống | `403`, `404`, `500` |

`messages` và `account-settings` dùng chung cho cả 3 vai trò; code trong file được chia vùng theo vai trò.

**Phân quyền trang:** trang `admin-*` chỉ dành cho quản trị viên; trang của chủ sân (`manager-*`, `add-pitch`, `edit-pitch`, `pitch-availability`) chỉ dành cho chủ sân, vai trò khác bị chuyển sang `403`. Quản trị viên xem đơn của một sân, chủ sân hay khách ở **Đơn và hoàn tiền** (`admin-finance.html?pitchId=… / managerId=… / userId=…`). Backend kiểm tra lại quyền ở mọi API.

## 3. Quy tắc nghiệp vụ chính

Các mốc 10 phút, 7 ngày, 2 giờ dưới đây là mặc định; quản trị viên chỉnh được trong Quy định hệ thống.

- **Giữ chỗ và thanh toán:**
  - Giữ chỗ 10 phút. Chỉ đặt trong 7 ngày tới; các khung giờ phải liền kề nhau.
  - Mỗi khách chỉ có 1 đơn đang giữ chỗ.
  - Thanh toán bằng số dư ví, phải xong trước giờ đá.
- **Hủy đơn:**
  - Khách được hủy và hoàn tiền nếu còn ít nhất 2 giờ trước giờ đá; trận đã bắt đầu thì không hủy được.
  - Mỗi đơn đã hoàn thành chỉ được đánh giá 1 lần.
- **Đổi lịch (BR-15/16):**
  - Khách đổi lịch từ trang Chi tiết đơn, sang khung giờ khác của cùng sân. Điều kiện giống hủy đơn: đơn đã thanh toán, còn ít nhất 2 giờ trước giờ đá.
  - Mỗi đơn chỉ đổi lịch 1 lần. Đơn mới có `reschedule_from_id` và `reschedule_count: 1`, nên không đổi lịch thêm được nữa.
  - Khách giữ khung giờ mới như đặt bình thường (`createHold` kèm `reschedule_from_id`). Chỉ khi thanh toán (`payBooking`), đơn cũ mới bị hủy (`cancel_type: rescheduled`) và hoàn đủ tiền, rồi ví trừ tiền đơn mới, tất cả trong một bước.
  - Nếu khách bỏ giữ chỗ hoặc giữ chỗ hết hạn thì đơn cũ giữ nguyên. Lúc thanh toán, đơn cũ được kiểm tra lại điều kiện; nếu không còn đủ điều kiện thì thanh toán bị từ chối.
- **Trạng thái đơn chỉ có 4 loại:** `pending` (đang giữ chỗ), `confirmed`, `completed`, `cancelled`.
  - Lý do hủy lưu ở `cancel_type`: `hold_expired`, `hold_released`, `customer`, `manager`, `admin`, `account_suspended`, `manager_suspended`, `pitch_paused`, `pitch_suspended`, `rescheduled`.
- **Tài khoản chỉ có trạng thái `active` hoặc `suspended`.** Cảnh cáo chỉ là một thông báo, không phải trạng thái.
- **Khi tài khoản bị khóa:**
  - Đơn đang giữ chỗ bị hủy; nếu đã trừ tiền thì hoàn đủ.
  - Đơn đã xác nhận vẫn giữ (khách vẫn đến đá), nhưng không thao tác thêm được trên hệ thống.
  - Tài khoản bị khóa chỉ được xem và gửi khiếu nại (`account-settings.html#appeal`).
  - Chủ sân bị khóa thì các sân của họ ngừng nhận đơn mới và không hiện khi tìm kiếm.
- **Sân mới không cần kiểm duyệt.** Ảnh sân: tối đa 3 ảnh, tự cắt theo khung 16:10 của thẻ sân, ảnh đầu tiên là ảnh bìa.

## 4. Dữ liệu

- **Nguồn dữ liệu:** `js/core/config.js` đặt `API_BASE = '/api'` (đường dẫn tương đối, cùng địa chỉ với trang).
- **Lớp API:** `js/services/api-client.js` là nơi duy nhất gọi API:
  - `api.entities.<Name>.filter/get/create/update/delete`: đọc theo quyền, ghi chỉ ở một số trường hợp đơn giản.
  - `api.functions.invoke(name, params)`: gọi endpoint nghiệp vụ tương ứng. Lỗi trả về dạng `{ data: { error } }`.
  - `api.auth.*`: đăng nhập, đăng ký, hồ sơ.
- **Đặc tả API:** xem `docs/BACKEND.md` §3.
- **Dữ liệu mẫu:** `backend/seed.json`. Muốn làm lại từ đầu: `python -m app.seed --reset` trong `backend/`.
- **Ảnh sân:** ảnh mới tải qua API và lưu file, database giữ URL `/uploads/…`. Tối đa 3 ảnh, mỗi ảnh dưới 450 KB; trình duyệt cắt ảnh, server kiểm tra nội dung.
- **Bảo mật:** mọi quy tắc ở mục 4 được backend kiểm tra lại. Kiểm tra ở frontend chỉ để báo lỗi sớm cho người dùng.

## 5. Tạo màn mới

1. Copy `screen-template.html`, `css/screen-template.css` và `js/pages/screen-template.js` thành `<ten-man>.*`, rồi đổi `data-page`, `<title>`, `<h1>`.
2. CSS của màn chỉ viết trong `css/<ten-man>.css`, scope bằng `:where(body[data-page="<ten-man>"])`.
3. JS của màn gọi `bootCustomerPage(render)` (màn công khai/khách hàng) hoặc `bootManagement(render)` (màn chủ sân/admin).
4. Trong HTML, gọi CSS/JS bằng đường dẫn thường (`css/<ten-man>.css`, `js/pages/<ten-man>.js`), không cần ghi số phiên bản.

## 6. Quy ước giao diện chung

- **Trình bày thông tin:** mỗi thông tin một dòng, không nối bằng dấu "·" hay "—". Dùng `infoList([[nhãn, giá trị]])` (nhãn – giá trị thẳng cột) hoặc `infoLines([...])` trong `render.js`; mô tả trong hộp thoại xuống dòng bằng `
`.
- **Thẻ nội dung** (sân, đơn, người dùng, giao dịch, hội thoại) có viền xanh nhạt `--item-border`, phân biệt với các khối chức năng (tìm kiếm, bộ lọc).
- **Bộ lọc đang áp dụng:** `buildFilterChip(tên, nhãn nút, onClear)` — ô "Đang lọc theo" và nút bỏ lọc cùng một hàng.
- **Avatar:** `buildAvatar(user)` vẽ SVG theo vai trò (khách: quả bóng, chủ sân: gấu đội mũ, quản trị viên: cú trọng tài), màu cố định theo id.
- **Danh sách và quay lại** (`list-memory.js`, tự áp dụng mọi trang): bấm một mục rồi quay lại thì về đúng trang phân trang và đúng thẻ. Mốc là thẻ chứa liên kết (`data-memory-id`, `id` của thẻ, hoặc địa chỉ liên kết). Khi trang phải tải lại, nội dung được giữ ẩn tới khi bố cục đứng yên rồi hiện đúng chỗ. Nút "← Quay lại" trỏ về trang vừa đến thì lùi lịch sử trình duyệt (tránh vòng lặp giữa hai trang). Vào lại từ menu thì mở từ đầu trang.
- **Phân trang:** dùng `createPager()` để số trang được nhớ khi quay lại và khi danh sách tự vẽ lại sau một thao tác.
- **Hộp thoại và cửa sổ nổi:** trang phía sau không cuộn khi hộp thoại, cửa sổ thông báo hoặc menu tài khoản đang mở; nút "Đóng" bên trái, nút xác nhận bên phải.
- **Trang chủ** hiện khung trang ngay (thẻ giữ chỗ trong lúc tải), dữ liệu sân/banner/thông báo chèn vào khi API trả về.

## 7. Cache sau khi sửa code

Không cần làm gì: sửa CSS/JS xong, tải lại trang là thấy bản mới.

Cách hoạt động (`backend/app/assets.py`): mỗi khi trả một trang HTML, server tính số phiên bản từ thời điểm sửa và kích thước của mọi file trong `js/`, `css/`, `img/`, rồi gắn `?v=<số>` vào các thẻ CSS/JS và chèn import map để module import lẫn nhau cũng mang `?v=`. File có `?v=` được trả với `Cache-Control: public, max-age=31536000, immutable` (trình duyệt giữ lại, chuyển trang không phải hỏi lại server) và nén gzip; trang HTML luôn `no-cache`. Sửa một file bất kỳ → số đổi → trình duyệt tải bản mới. Vì vậy phải mở web qua server (`http://localhost:8000/`).
