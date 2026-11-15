# Demo bước 4 và 6: mật khẩu bcrypt, curl không token trả 401

Chạy trong PowerShell khi server đang chạy ở cổng 8000 (`uvicorn app.main:app --port 8000` trong `backend/`).
Dùng `curl.exe` (có sẵn trên Windows 10/11) để không bị nhầm với lệnh `curl` của PowerShell cũ.

## Bước 6: curl không token → 401

```powershell
$B = 'http://localhost:8000'

# 1. Gọi API dữ liệu riêng tư khi chưa đăng nhập -> 401
curl.exe -i "$B/api/entities/Booking"
#    HTTP/1.1 401 Unauthorized   {"error":"Vui lòng đăng nhập."}

# 2. Đăng nhập lấy token (chuẩn OAuth2 của FastAPI: username = email)
$TOKEN = (curl.exe -s -X POST "$B/api/auth/token" -d "username=customer@pitchpoint.test&password=123456" | ConvertFrom-Json).access_token
$TOKEN

# 3. Gọi lại kèm token -> 200, chỉ thấy đơn của chính khách này
curl.exe -i -H "Authorization: Bearer $TOKEN" "$B/api/entities/Booking"

# 4. Token sai -> 401
curl.exe -i -H "Authorization: Bearer abc" "$B/api/auth/me"

# 5. Thao tác ghi khi chưa đăng nhập cũng 401 (giữ chỗ)
curl.exe -i -X POST "$B/api/bookings/holds" -H "Content-Type: application/json" -d '{}'

# 6. Đăng xuất -> token hết hiệu lực ngay -> 401
curl.exe -s -X POST -H "Authorization: Bearer $TOKEN" "$B/api/auth/logout"
curl.exe -i -H "Authorization: Bearer $TOKEN" "$B/api/auth/me"
```

Thêm cho bước 7 (404):

```powershell
curl.exe -i "$B/api/entities/Pitch/khong-co"     # 404 Not Found
```

## Trên /docs

Mở `http://localhost:8000/docs` (chuyển sang `/api/docs`). Bấm **Authorize**, nhập email vào ô *username*, mật khẩu `123456`, bấm Authorize rồi Close. Sau đó "Try it out" ở `GET /api/auth/me` trả về tài khoản đang đăng nhập. Chưa Authorize thì cùng endpoint trả 401.

Trang /docs tải giao diện Swagger từ cdn.jsdelivr.net, nên máy cần có Internet khi mở trang này. Các API vẫn chạy bình thường khi không có mạng.

## Bước 4: mật khẩu lưu bằng bcrypt

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U pitchpoint -h localhost -d pitchpoint -c "SELECT email, password_hash FROM users LIMIT 3;"
```

Cột `password_hash` có dạng `$2b$12$<22 ký tự salt><31 ký tự hash>`: `2b` là phiên bản bcrypt, `12` là cost (2^12 vòng, khoảng 0,2 giây mỗi lần băm), salt ngẫu nhiên riêng cho từng mật khẩu. Hai tài khoản cùng mật khẩu `123456` vẫn có hash khác nhau. Code: `backend/app/security.py` (`hash_password`, `verify_password`).

## Giải thích ngắn khi được hỏi

- **Token ở đâu?** Đăng nhập tạo một token ngẫu nhiên 32 byte (`secrets.token_urlsafe`). Database chỉ lưu SHA-256 của token (bảng `sessions`, có hạn dùng). Trình duyệt nhận token trong cookie HttpOnly (JavaScript không đọc được, chống đánh cắp qua XSS). curl, /docs và app khác gửi token qua header `Authorization: Bearer`. Backend chấp nhận cả hai: `deps.session_token()`.
- **Vì sao không dùng JWT?** Token lưu ở database thì đăng xuất, đổi mật khẩu hay bị khóa tài khoản có hiệu lực ngay (xóa dòng là token chết). JWT tự chứa thông tin, phải chờ hết hạn hoặc làm thêm danh sách thu hồi.
- **401 khác 403 thế nào?** 401 = chưa đăng nhập hoặc token sai. 403 = đã đăng nhập nhưng không có quyền (ví dụ chủ sân gọi API giữ chỗ, khách gọi API admin).
- **Header `X-Requested-With: PitchPoint` để làm gì?** Chống CSRF cho trình duyệt: cookie được trình duyệt tự gửi kèm, nên request ghi có cookie phải mang header riêng mà trang web lạ không tự thêm được. Request không có cookie (curl trần) hoặc dùng Bearer token không cần header này. Đăng nhập, đăng ký, quên mật khẩu bằng cookie luôn cần header.
- **API nào mở cho khách chưa đăng nhập?** Xem sân, lịch trống, tìm kiếm, đánh giá, nội dung trang chủ, hồ sơ công khai chủ sân. Mọi dữ liệu riêng tư (đơn, ví, thanh toán, thông báo, tin nhắn, yêu thích, cảnh cáo, báo cáo) trả 401.
