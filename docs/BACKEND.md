# Backend — thiết kế và đặc tả API

Backend FastAPI cho Pitch Point. Mọi quy tắc nghiệp vụ (xem `docs/FRONTEND.md` §3 và `docs/BR_TRACEABILITY.md`) được kiểm tra **ở server**; frontend chỉ hiển thị.

Công nghệ: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, bcrypt, **PostgreSQL 17** (driver psycopg 3). PostgreSQL là database chính: nhiều người dùng cùng lúc, chống race condition ở tầng database (§2). SQLite chỉ dùng cho bộ pytest mặc định.

Cách cài đặt và chạy: `docs/SETUP.md`.

## 1. Cấu trúc

```
backend/
├── app/
│   ├── main.py          App FastAPI, phục vụ frontend/, xử lý lỗi, job nền (đồng bộ đơn mỗi 30 giây, dọn ảnh, dọn bộ đếm)
│   ├── assets.py        Tự gắn phiên bản ?v= cho CSS/JS trong trang HTML (tính từ thời điểm sửa file) để trình duyệt cache lâu mà vẫn nhận bản mới
│   ├── config.py        Cấu hình và hằng số nghiệp vụ
│   ├── db.py            Kết nối database, khóa khởi tạo khi nhiều worker
│   ├── models.py        Các bảng
│   ├── deps.py          Phụ thuộc của route: phiên đăng nhập, bắt lỗi database
│   ├── security.py      Mật khẩu bcrypt, phiên đăng nhập (token băm SHA-256)
│   ├── access.py        Ai được đọc/ghi gì
│   ├── rules.py         Quy tắc dùng chung: hoàn tiền, khóa dòng, thông báo, đồng bộ đơn
│   ├── services.py      Nghiệp vụ: giữ chỗ, thanh toán, hủy, đổi lịch, tin nhắn, admin
│   ├── availability.py  Tính khung giờ trống
│   ├── settings.py      Cài đặt hệ thống chỉnh được (bảng system_settings)
│   ├── moderation.py    Gắn cờ hủy/hoàn tiền nhiều lần (BR-60)
│   ├── rate_limit.py    Chặn dò mật khẩu và spam quên mật khẩu
│   ├── uploads.py       Lưu và dọn ảnh sân
│   ├── timeutil.py      Giờ UTC và giờ Việt Nam
│   ├── migrate.py       Chạy Alembic (python -m app.migrate)
│   ├── seed.py · demo.py · demo_more.py   Nạp dữ liệu mẫu và dữ liệu demo theo ngày
│   ├── reset_password.py · cleanup_uploads.py   Lệnh quản trị chạy bằng python -m
│   └── routers/         auth.py · business.py · entities.py
├── alembic/             Các revision tạo và nâng cấp bảng
├── scripts/             setup_postgres.sql (tạo database)
└── seed.json            Dữ liệu mẫu: 10 tài khoản, 10 sân, ví
```

## 2. Thiết kế

- **Đăng nhập:**
  - Mật khẩu băm bằng bcrypt (cost 12, chuỗi lưu dạng `$2b$12$…`, salt riêng từng mật khẩu, tối đa 72 byte).
  - Phiên là token ngẫu nhiên. Trình duyệt nhận token trong cookie **HttpOnly, SameSite=Lax** (không để token trong localStorage); curl, `/docs` và app khác gửi cùng loại token qua header `Authorization: Bearer <token>` (lấy ở `POST /api/auth/token`). Database chỉ lưu bản băm SHA-256 của token, nên đăng xuất/đổi mật khẩu/khóa tài khoản làm token hết hiệu lực ngay.
  - Chưa đăng nhập: dữ liệu riêng tư (đơn, ví, thanh toán, thông báo, tin nhắn, yêu thích, cảnh cáo, báo cáo) và mọi thao tác nghiệp vụ trả **401**; chỉ xem sân, lịch trống, tìm kiếm, đánh giá, nội dung trang chủ, hồ sơ công khai chủ sân là mở. Lệnh demo: `docs/DEMO_CURL.md`.
  - Chặn dò mật khẩu: sai 10 lần trong 15 phút thì khóa tạm email đó.
- **Chống CSRF:** request ghi (POST/PATCH/DELETE) **có cookie phiên** phải có header `X-Requested-With: PitchPoint` (frontend tự gửi; trang web lạ không gửi được vì backend không mở CORS). Request không có cookie (curl trần → 401) hoặc dùng `Authorization: Bearer` không cần header này. Đăng nhập, đăng ký, quên mật khẩu luôn cần header.
- **Chống race condition (nhiều người, nhiều worker cùng lúc).** Backend không khóa trong tiến trình; PostgreSQL bảo đảm đúng bằng 3 lớp:
  1. *Khóa dòng* `SELECT … FOR UPDATE` (`rules.lock_bookings`, `wallet_for(lock=True)`): thanh toán, hủy, đổi lịch, tạm dừng/tạm ngưng sân, khóa tài khoản đều khóa đơn trước rồi mới kiểm tra trạng thái; mọi thay đổi số dư khóa dòng ví. Khóa theo thứ tự id để tránh deadlock.
  2. *Ràng buộc trong database*:
     - mỗi (sân, ngày, giờ) chỉ thuộc 1 đơn đang giữ hoặc đã xác nhận (bảng `booking_slots`, UNIQUE);
     - mỗi khách chỉ có 1 đơn đang giữ chỗ (partial unique index);
     - mã đơn duy nhất; mỗi đơn 1 đánh giá; mỗi thanh toán chỉ hoàn tiền 1 lần;
     - bấm "Tạo sân" 2 lần chỉ ra 1 sân (UNIQUE theo `request_id`).
  3. *Đổi trạng thái có điều kiện* (`UPDATE … WHERE status='pending'`), và job hủy giữ chỗ hết hạn dùng `FOR UPDATE SKIP LOCKED` nên không hủy nhầm đơn đang được thanh toán.
  - Request thua cuộc nhận `409` với câu thông báo, không bao giờ `500` (`deps.run` đổi lỗi UNIQUE/deadlock thành 409).
  - Khi nhiều worker khởi động cùng lúc, advisory lock bảo đảm chỉ một worker tạo bảng và nạp dữ liệu mẫu.
  - Kiểm chứng: `tests/backend/test_concurrency.py` (7 kịch bản), chạy 25 lần liền trên PostgreSQL đều đạt; khi bỏ khóa dòng và bỏ xử lý 409 thì test hỏng 5/5 lần (người dùng gặp lỗi 500).
- **Ví có sổ giao dịch:** mọi thay đổi số dư đều ghi một dòng vào `wallet_transactions` (opening, payment, payout, refund, refund_payout), trong cùng transaction với thao tác nghiệp vụ. Cột `balance_vnd` luôn bằng tổng sổ.
- **Trạng thái đơn:** giữ chỗ quá hạn → `cancelled`/`hold_expired`; đơn đã qua giờ đá → `completed`. Việc cập nhật chạy trước mỗi request, và thêm một job định kỳ mỗi 30 giây.
- **Không có CRUD chung:**
  - Đọc dữ liệu luôn bị lọc theo người đang đăng nhập ngay trong câu SQL (`access.read_scope`).
  - Ghi chỉ mở cho đúng 7 trường hợp đơn giản (`access.ALLOWED_WRITES`). Mọi việc liên quan đến tiền và trạng thái phải đi qua endpoint nghiệp vụ.
- **Thời gian:** lưu UTC; ngày giờ sân tính theo giờ Việt Nam (UTC+7).

## 3. Đặc tả API

Lỗi luôn trả JSON `{"error": "<câu tiếng Việt cho người dùng>"}` với mã:

| Mã | Khi nào |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa đăng nhập |
| 403 | Không có quyền, hoặc tài khoản đang bị khóa |
| 404 | Không tìm thấy |
| 409 | Xung đột: khung giờ vừa bị giữ, đã đánh giá, đơn không còn hợp lệ… |
| 429 | Đăng nhập sai quá nhiều lần |

### Đăng nhập (`/api/auth`)

| Method | Đường dẫn | Body / ghi chú |
|---|---|---|
| GET | `/api/auth/session` | `{user}` hoặc `{user: null}` (frontend dùng endpoint này) |
| GET | `/api/auth/me` | Người đang đăng nhập, 401 nếu chưa đăng nhập |
| POST | `/api/auth/login` | `{email, password}` → đặt cookie (trình duyệt) |
| POST | `/api/auth/token` | Form `username` (email) + `password`, hoặc JSON `{email, password}` → `{access_token, token_type: "bearer", expires_in, user}`. Dùng cho curl và nút Authorize ở `/docs` |
| POST | `/api/auth/register` | `{email, password, full_name, phone}` → tạo tài khoản khách + ví 2.000.000 ₫ |
| PATCH | `/api/auth/me` | `{full_name, phone, preferences}` — `preferences`: `notify_bookings`, `notify_messages`, `notify_reports`, `show_phone` (true/false) |
| POST | `/api/auth/password` | `{current_password, new_password}` → đổi mật khẩu, đăng xuất các thiết bị khác |
| POST | `/api/auth/logout` | Xóa phiên hiện tại (cookie hoặc Bearer token) |
| POST | `/api/auth/password-reset` | `{email, note?}` → gửi yêu cầu cho quản trị viên (không gửi email). Luôn trả cùng một câu, tối đa 3 lần/email/giờ |

### Nghiệp vụ

Cột cuối là tên hàm tương ứng trong `api.functions.invoke(...)` của frontend.

| Method | Đường dẫn | Body | Hàm frontend |
|---|---|---|---|
| POST | `/api/bookings/holds` | `{pitch_id, local_date, start_times[], reschedule_from_id?}` | createHold |
| POST | `/api/bookings/{id}/payment` | | payBooking |
| POST | `/api/bookings/{id}/cancellation` | `{reason?}` (chủ sân/admin bắt buộc có lý do) | cancelBooking |
| POST | `/api/bookings/sync` | | syncBookings |
| POST | `/api/reviews` | `{booking_id, rating, body}` | submitReview |
| GET | `/api/search/pitches` | `?q&location&pitchType&date&time`; sân hết giờ trống trong ngày có thêm `next_slot` | searchPitches |
| GET | `/api/pitches/{id}/availability` | `?local_date=YYYY-MM-DD` | getAvailability |
| GET | `/api/pitches/{id}/next-available-date` | Ngày gần nhất còn trống | nextAvailableDate |
| POST | `/api/pitches` | `{request_id, pitch:{…}}`: tạo sân kèm lịch 7 ngày; gửi lại cùng `request_id` không tạo sân thứ hai | createPitchWithSchedule |
| POST | `/api/pitches/{id}/status` | `{status: active\|paused, reason?}` | setPitchStatus |
| POST | `/api/conversations` | `{pitch_id\|booking_id, body}`; hoặc `{to_admin: true, body}` (khách/chủ sân nhắn quản trị viên); hoặc `{user_id, body}` (admin nhắn người dùng) | startMessage |
| POST | `/api/conversations/{id}/messages` | `{body}` | sendMessage |
| POST | `/api/conversations/{id}/warnings` | `{reason}` | warnCustomer |
| GET | `/api/updates` | query `since` (mốc `server_time` lần trước), `conversations=1`, `conversation_id`: trả `unread_count` và chỉ các thông báo / hội thoại / tin nhắn mới sau `since` mà người xem được phép đọc; `server_time` lùi 2 giây để không sót bản ghi (client lọc trùng theo id). Chuông thông báo hỏi mỗi 5 giây, trang Tin nhắn mỗi 3 giây, chỉ khi tab đang hiện | (router `business.py`) |
| POST | `/api/warnings/{id}/responses` | `{body}` | respondWarning |
| POST | `/api/appeals` | `{body}` (10–1000 ký tự) | submitAppeal |
| POST | `/api/admin/actions` | `{action, …}` | adminAction |

Các `action` của `/api/admin/actions`:
- `warn_user`, `suspend_user`, `restore_user` (`user_id`, `reason`)
- `assign_report`, `resolve_report` (`report_id`, `status`, `decision`)
- `suspend_pitch`, `restore_pitch` (`pitch_id`, `reason`, `permanent`)
- `reset_password` (`user_id`) → trả `temporary_password` **một lần**; người dùng phải đổi mật khẩu khi đăng nhập (không đặt lại được admin; admin quên mật khẩu thì chạy `python -m app.reset_password <email>` trên máy chủ)
- `save_settings` (`settings: {khóa: số}`) — xem §3a

### Đọc dữ liệu (`/api/entities`)

| Method | Đường dẫn |
|---|---|
| GET | `/api/entities/{Name}?where={json}&sort=-created_date&limit=50` → `{items, total}` |
| GET | `/api/entities/{Name}/{id}` |

- `where` hỗ trợ `{field: value}` và `{field: {$in, $gte, $lte}}`.
- `Name` là một trong: User, Wallet, Pitch, PitchSchedule, AvailabilityOverride, Booking, Payment, Refund, Favorite, Review, Conversation, Message, Notification, Report, Warning, WarningResponse, AuditEvent, ContentItem.

Ai đọc được gì:

| Đối tượng | Được đọc |
|---|---|
| Pitch, PitchSchedule, AvailabilityOverride, Review | Công khai |
| Booking, Payment, Refund, Conversation, Message | Khách hoặc chủ sân của bản ghi đó |
| Wallet, Favorite, Notification, Report | Chủ của bản ghi |
| User | Chính mình; hồ sơ công khai của chủ sân (không có email) |
| AuditEvent | Chỉ admin |
| Mọi bảng | Admin |

### Ghi dữ liệu đơn giản (chỉ những trường hợp sau)

| Entity | POST | PATCH | DELETE | Ai |
|---|---|---|---|---|
| Favorite | ✓ | | ✓ | Chủ của bản ghi |
| Notification | | `read` | | Người nhận (tài khoản bị khóa vẫn được) |
| Report | ✓ | `status, decision, assigned_to` | | Tạo: người dùng; sửa: admin |
| Pitch | | thông tin sân (không có `status`) | | Chủ sân của sân, admin |
| PitchSchedule | ✓ | ✓ | ✓ | Chủ sân của sân |
| AvailabilityOverride | ✓ | | ✓ | Chủ sân của sân |
| ContentItem | ✓ | ✓ | ✓ | Admin |

### 3a. Tài khoản, cài đặt hệ thống, tin nhắn hỗ trợ

- **Cài đặt tài khoản:** đổi mật khẩu (`POST /api/auth/password`); tùy chọn thông báo và quyền riêng tư trong `preferences`. Thông báo thuộc nhóm `bookings` / `messages` / `reports` tắt được; thông báo quan trọng (khóa tài khoản, cảnh cáo, đơn bị người khác hủy và hoàn tiền, sân tạm ngưng, kết luận báo cáo, mật khẩu) luôn gửi. `show_phone=false` ẩn số điện thoại chủ sân với người khác.
- **Quên mật khẩu (không dùng email):** người dùng gửi yêu cầu → thành Report `target_type='password_reset'`, admin nhận thông báo → admin `reset_password` → mật khẩu tạm 10 ký tự, mọi phiên bị đăng xuất, `must_change_password=true`. Khi cờ này bật, server chặn mọi thao tác ghi (403) trừ đổi mật khẩu / đăng nhập / đăng xuất; frontend chuyển sang `reset-password.html`.
- **Quy định hệ thống** (trang `admin-settings.html`; `app/settings.py`, bảng `system_settings`; `GET /api/settings` công khai, `GET /api/admin/settings` cho admin):

  | Khóa | Mặc định | Giới hạn |
  |---|---|---|
  | `hold_minutes` | 10 | 5–30 phút |
  | `booking_advance_days` | 7 | 1–14 ngày |
  | `cancellation_notice_hours` | 2 | 1–48 giờ (hủy / đổi lịch) |
  | `initial_balance_vnd` | 2.000.000 | 0–10.000.000 ₫ (BR-32) |
  | `password_min_length` | 6 | 6–32 ký tự |
  | `session_days` | 14 | 1–30 ngày |
  | `cancellation_review_count` | 4 | 2–20 lần (BR-60) |
  | `cancellation_review_days` | 30 | 1–90 ngày (BR-60) |

  Đổi cài đặt có hiệu lực ngay cho mọi worker; đơn đã tạo giữ nguyên quy tắc lúc tạo. Mỗi lần lưu ghi nhật ký (giá trị cũ → mới).
- **Tin nhắn hỗ trợ với quản trị viên:** hội thoại `kind='support'` (người dùng ở `customer_id`, `manager_id='support'`), mỗi người dùng đúng một hội thoại. Người dùng gửi → báo mọi admin; admin gửi → báo người dùng. Admin chỉ xem (không gửi) hội thoại khách ↔ chủ sân.

## 4. Tính năng bổ sung

### Migration

`python -m app.migrate` nâng database lên phiên bản mới nhất bằng Alembic (`backend/alembic/versions/`). Migration nền có đầy đủ UNIQUE và partial unique index giữ chỗ. `--reset` của `seed.py` xóa dữ liệu mẫu, không dùng để nâng cấp dữ liệu cần giữ. Luôn sao lưu trước khi nâng cấp database đang dùng thật.

### Chống spam dùng chung

`app/rate_limit.py`, bảng `auth_rate_buckets`: cửa sổ trượt lưu timestamp UTC, khóa transaction PostgreSQL khi cập nhật từng khóa. Khóa email/IP được băm SHA-256. Sai đăng nhập/đổi mật khẩu tối đa 10 lần/15 phút, quên mật khẩu 3 lần/email/giờ và 10 lần/IP/giờ. Request đang kiểm tra mật khẩu giữ một lượt; đăng nhập/đổi mật khẩu thành công xóa bộ đếm tương ứng. Job định kỳ xóa cửa sổ hết hạn.

### Ảnh sân lưu file

`POST /api/uploads/images`, JSON `{image: "data:image/png;base64,..."}` → `{url: "/uploads/<hash>.png"}`. Chỉ chủ sân/admin đang hoạt động; server kiểm tra nội dung ảnh bằng Pillow, MIME JPG/PNG/WebP, tối đa 450 KiB và 16 triệu pixel. File phục vụ công khai tại `/uploads/…`, mặc định ở `backend/uploads/`, đổi bằng `UPLOAD_DIR`. Form sân upload qua `api-client.js` và lưu URL; API tạo/sửa sân cũng chuyển data URL hợp lệ thành file. URL nội bộ phải trỏ tới file đã có. Sao lưu cả database và thư mục ảnh.


**Dọn ảnh không còn dùng:** server tự xóa khoảng 10 phút một lần những ảnh không còn sân nào dùng (ảnh đã thay/xóa khỏi sân, hoặc tải lên rồi bỏ form). Ảnh mới tải lên dưới 6 giờ được giữ lại, phòng khi chủ sân đang điền dở form (đổi bằng `UPLOAD_ORPHAN_GRACE_SECONDS`). Ảnh dùng chung giữa nhiều sân không bị xóa vì tên file là mã băm nội dung. Muốn dọn ngay: `python -m app.cleanup_uploads` (giữ ảnh mới dưới 6 giờ) hoặc `python -m app.cleanup_uploads --now` (xóa ngay mọi ảnh không còn dùng, nên tắt server trước).

### Phục vụ giao diện

- Khi `SERVE_FRONTEND=true` (mặc định), backend phục vụ thư mục `frontend/` cùng địa chỉ với API.
- Trang HTML trả qua `assets.render_html()`: gắn `?v=<số phiên bản>` vào các thẻ CSS/JS và chèn import map. Số phiên bản tính từ thời điểm sửa và kích thước file trong `js/`, `css/`, `img/` (quét lại tối đa 1 lần/giây), nên sửa giao diện không cần chạy lệnh gì.
- File có `?v=` trả `Cache-Control: public, max-age=31536000, immutable`; trang HTML `no-cache`; API `no-store`. Phản hồi lớn hơn 1 KB được nén gzip.
- Trang 404/500 cũng đi qua `assets.render_html()`.

### Nghiệp vụ bổ sung

- Booking: thêm `booked_facilities`, `booked_rules`. Đơn mới snapshot tại giữ chỗ và hiển thị ở chi tiết đơn.
- Cài đặt thêm `cancellation_review_count` (4, giới hạn 2–20) và `cancellation_review_days` (30, giới hạn 1–90). Hủy có hoàn tiền do khách thực hiện đạt ngưỡng tạo báo cáo cho admin; không tự khóa. Khóa dòng người dùng để tránh báo cáo trùng khi nhiều đơn bị hủy cùng lúc.
- ContentItem thêm `announcement_sent_at`. Khi công bố lần đầu thông báo toàn hệ thống, gửi một thông báo mỗi tài khoản trong transaction và khóa nội dung để không gửi trùng. Trên frontend, thông báo mới nhất đang công bố hiện thành banner ở đầu trang chủ (kể cả khách chưa đăng nhập).
