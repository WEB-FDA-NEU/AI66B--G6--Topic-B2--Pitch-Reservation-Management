# Hướng dẫn cài đặt và chạy Pitch Point

Hướng dẫn này dành cho người mới, viết cho **Windows 10/11**. Làm lần lượt từng bước, không bỏ bước nào. Mất khoảng 15 phút.

## Bước 0. Cài 3 phần mềm (chỉ làm một lần)

| Phần mềm | Dùng để | Tải ở đâu | Lưu ý khi cài |
|---|---|---|---|
| **Python 3.11 trở lên** | Chạy backend | https://www.python.org/downloads/ | Ở màn hình đầu tiên của bộ cài, **tích ô "Add python.exe to PATH"** rồi mới bấm Install Now |
| **PostgreSQL 17** | Cơ sở dữ liệu | https://www.postgresql.org/download/windows/ (bấm "Download the installer") | Giữ mọi lựa chọn mặc định (cổng `5432`). Khi được hỏi mật khẩu cho tài khoản `postgres`, **đặt một mật khẩu và ghi nhớ** |
| **Git** (nếu lấy code từ GitHub) | Tải mã nguồn | https://git-scm.com/downloads | Bấm Next đến hết |

Google Chrome chỉ cần khi chạy test trình duyệt (Bước 7).

Kiểm tra đã cài đúng: mở **PowerShell** (bấm phím Windows, gõ `powershell`, Enter) và chạy:

```powershell
python --version
```

Phải hiện `Python 3.11` trở lên. Nếu báo "not recognized": cài lại Python và nhớ tích ô "Add python.exe to PATH", rồi **đóng và mở lại PowerShell**.

## Bước 1. Lấy mã nguồn

Nếu đã có thư mục `PitchPoint` (giải nén từ file zip) thì bỏ qua bước tải. Nếu lấy từ GitHub:

```powershell
git clone https://github.com/Aiogr/Football-Pitch-Reservation-Management-System.git
cd Football-Pitch-Reservation-Management-System
```

Từ đây, mọi lệnh chạy trong thư mục chứa file `requirements.txt` (thư mục gốc của dự án). Cách mở PowerShell đúng chỗ: mở thư mục đó trong File Explorer, bấm vào thanh địa chỉ phía trên, gõ `powershell` rồi Enter.

## Bước 2. Cài toàn bộ thư viện bằng một lệnh

```powershell
python -m pip install -r requirements.txt
```

Chờ vài phút cho đến khi hiện `Successfully installed ...`. Lệnh này cài đủ thư viện cho backend, test backend và test trình duyệt.

## Bước 3. Tạo cơ sở dữ liệu (chỉ làm một lần)

Chạy lệnh dưới đây, **nhập mật khẩu `postgres` đã đặt ở Bước 0** khi được hỏi (gõ mật khẩu sẽ không hiện ký tự nào, đó là bình thường, gõ xong bấm Enter):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -f backend/scripts/setup_postgres.sql
```

Kết quả thành công là các dòng `DO`, `CREATE DATABASE`. Lệnh tạo tài khoản `pitchpoint` (mật khẩu `pitchpoint`) cùng hai database: `pitchpoint` (dữ liệu chạy thật) và `pitchpoint_test` (dùng cho test). Chạy lại lệnh này cũng không sao.

## Bước 4. Tạo file cấu hình `.env` (chỉ làm một lần)

Chuỗi kết nối database không viết trong code; hệ thống đọc từ file `backend/.env`. Tạo file này từ file mẫu:

```powershell
Copy-Item backend/.env.example backend/.env
```

File mẫu đã có sẵn `DATABASE_URL` trỏ tới database `pitchpoint` tạo ở Bước 3, nên không cần sửa gì. File `.env` không được đưa lên GitHub. Nếu thiếu file này, server báo *"Chưa cấu hình DATABASE_URL…"* khi khởi động.

## Bước 5. Chạy hệ thống

```powershell
cd backend
python -m app.migrate
python -m uvicorn app.main:app --port 8000
```

- Lệnh `migrate` tạo các bảng trong database.
- Lần chạy đầu tiên, hệ thống tự nạp dữ liệu mẫu (21 sân ở Hà Nội, TP. Hồ Chí Minh, Đà Nẵng; 24 tài khoản: 1 quản trị viên, 8 chủ sân, 15 khách; đơn, đánh giá, tin nhắn mẫu). Sân mẫu dùng ảnh mặc định.
- Khi thấy dòng `Uvicorn running on http://127.0.0.1:8000` là xong. **Giữ nguyên cửa sổ PowerShell này** (đóng cửa sổ là tắt hệ thống).

Mở trình duyệt vào **http://localhost:8000/**. Tài liệu API tự sinh nằm ở http://localhost:8000/api/docs.

Muốn tắt hệ thống: bấm `Ctrl + C` trong cửa sổ PowerShell.

## Bước 6. Đăng nhập thử

Mật khẩu của mọi tài khoản mẫu là `123456`. Trang đăng nhập có sẵn nút điền nhanh cho 3 tài khoản đầu:

| Vai trò | Email |
|---|---|
| Khách hàng | `customer@pitchpoint.test` |
| Chủ sân | `manager@pitchpoint.test` |
| Quản trị viên | `admin@pitchpoint.test` |

Danh sách đầy đủ: [ACCOUNTS.md](ACCOUNTS.md). Tiền trong ví là tiền thử nghiệm.

## Bước 7. Chạy test (tùy chọn)

Mở một cửa sổ PowerShell mới, vào thư mục gốc dự án. Các bộ test chạy riêng, đừng chạy gộp `pytest tests`. Hướng dẫn kiểm thử bằng tay (10 bài, gồm cả crash): [TEST_GUIDE.md](TEST_GUIDE.md).

**Test backend** (khoảng 30 giây). Chạy ở thư mục gốc dự án, nơi có `requirements.txt`:

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"
python -m pytest -q tests/backend
```

Kết quả đúng là `82 passed`. Test xóa sạch database `pitchpoint_test` mỗi lần chạy, không đụng tới database `pitchpoint` đang dùng.

**Test trình duyệt thật** (khoảng 5 phút, cần cài Google Chrome, cửa sổ Chrome chạy ẩn):

```powershell
$env:E2E_DATABASE_URL = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"
python -m pytest -q tests/e2e
```

Kết quả đúng là `29 passed`. Bộ test tự bật server riêng ở cổng 8002 nên không cần tắt hệ thống đang chạy ở cổng 8000.

**Test crash** (khoảng 2–3 phút): server bị tắt đột ngột giữa lúc đặt sân, thanh toán, hoàn tiền, đổi lịch, rồi kiểm tra dữ liệu sau khi bật lại:

```powershell
$env:CRASH_DATABASE_URL = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"
python tests/crash/run_crash.py
```

Kết quả đúng là `KẾT QUẢ: 12/12 kịch bản đạt`. Server thử chạy ở cổng 8003. Giải thích từng kịch bản: [TEST_GUIDE.md](TEST_GUIDE.md), Bài 10.

**Không bao giờ** đặt `TEST_DATABASE_URL`, `E2E_DATABASE_URL` hoặc `CRASH_DATABASE_URL` trỏ vào database `pitchpoint`, vì test sẽ xóa sạch dữ liệu của database đó.

## Mở trên điện thoại (cùng Wi-Fi với laptop)

1. Tắt hệ thống đang chạy (`Ctrl + C`), rồi chạy lại với thêm `--host 0.0.0.0`:
   ```powershell
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   Nếu Windows hiện hộp thoại tường lửa, bấm **Allow access**.
2. Lấy địa chỉ IP của laptop: chạy `ipconfig`, tìm dòng `IPv4 Address` của mạng Wi-Fi (ví dụ `192.168.1.20`). IP có thể đổi khi đổi mạng.
3. Trên điện thoại (cùng Wi-Fi), mở `http://192.168.1.20:8000` (thay bằng IP của bạn).

## Làm lại dữ liệu mẫu từ đầu

Tắt hệ thống, rồi chạy trong thư mục `backend`:

```powershell
python -m app.seed --reset
```

Lệnh này **xóa toàn bộ dữ liệu** và nạp lại dữ liệu mẫu (mật khẩu mọi tài khoản trở về `123456`).

## Cấu hình tùy chọn

Các biến nằm trong `backend/.env` (tạo ở Bước 4). Muốn đổi biến tùy chọn, bỏ dấu `#` ở dòng tương ứng.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | **bắt buộc** (file mẫu: `postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint`) | Địa chỉ database. Chạy thử không có PostgreSQL: `sqlite:///./pitchpoint.db` (chỉ một người dùng) |
| `TEST_DATABASE_URL` | trống | Database cho pytest. Để trống thì test dùng file SQLite tạm |
| `INITIAL_BALANCE_VND` | `2000000` | Số dư thử nghiệm tặng tài khoản mới |
| `SEED_DEMO` | `true` | Sinh thêm dữ liệu demo (đơn, đánh giá, tin nhắn) theo ngày hiện tại |
| `UPLOAD_DIR` | `backend/uploads` | Thư mục lưu ảnh sân |

## Gặp lỗi?

| Thông báo / hiện tượng | Cách xử lý |
|---|---|
| `RuntimeError: Chưa cấu hình DATABASE_URL…` | Chưa tạo `backend/.env`. Làm Bước 4: `Copy-Item backend/.env.example backend/.env` |
| `python` hoặc `pip` "is not recognized" | Cài lại Python và tích "Add python.exe to PATH"; đóng và mở lại PowerShell. Luôn gõ `python -m pip ...` thay vì `pip ...` |
| `psql.exe` không tìm thấy | Kiểm tra thư mục `C:\Program Files\PostgreSQL\17\bin`. Nếu cài bản khác 17, đổi số `17` trong đường dẫn |
| `password authentication failed for user "postgres"` | Gõ sai mật khẩu `postgres` ở Bước 3. Nếu quên, cài lại PostgreSQL |
| `connection refused` hoặc `could not connect to server` khi chạy hệ thống | PostgreSQL chưa chạy. Bấm Windows, gõ `services.msc`, tìm `postgresql-x64-17`, bấm chuột phải chọn Start |
| `password authentication failed for user "pitchpoint"` | Chưa chạy Bước 3, hoặc đã đổi mật khẩu. Chạy lại lệnh ở Bước 3 |
| `Address already in use` / cổng 8000 bận | Dùng cổng khác: thêm `--port 8001` rồi mở `http://localhost:8001/` |
| Trang web mở lên nhưng không có dữ liệu | Phải mở qua `http://localhost:8000/`. Mở file HTML trực tiếp hoặc dùng `python -m http.server` sẽ không có dữ liệu |
| Sửa CSS/JS nhưng trình duyệt vẫn hiện bản cũ | Server tự đổi phiên bản file khi có sửa đổi; tải lại trang (`Ctrl + Shift + R` nếu cần). Kiểm tra đang mở web qua `http://localhost:8000/`, không mở file HTML trực tiếp |

## Đọc tiếp

- [TEST_GUIDE.md](TEST_GUIDE.md): 10 bài kiểm thử bằng tay (chức năng chính và crash), cách chạy các bộ test tự động.
- [BACKEND.md](BACKEND.md): cấu trúc backend, thiết kế, đặc tả API.
- [FRONTEND.md](FRONTEND.md): cấu trúc giao diện, quy tắc nghiệp vụ, cách tạo màn mới.
- [DEMO_CURL.md](DEMO_CURL.md): lệnh `curl` chứng minh API trả 401 khi chưa đăng nhập.
- [BR_TRACEABILITY.md](BR_TRACEABILITY.md): 60 quy tắc nghiệp vụ, code, test, và các điểm khác đặc tả PDF.
