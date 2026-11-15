# Hướng dẫn kiểm thử Pitch Point

Tài liệu gồm 10 bài kiểm thử bằng tay và 3 bộ kiểm thử tự động:

- Bài 1–8 đi qua các chức năng chính của khách hàng, chủ sân và quản trị viên.
- Bài 9–10 kiểm tra hệ thống khi server bị tắt đột ngột (crash) giữa lúc người dùng đang thao tác.

Làm đủ 10 bài mất khoảng 60 phút. Mỗi bài ghi rõ mục đích, tài khoản dùng, các bước làm và kết quả đúng phải thấy. Nếu kết quả khác, ghi lại số bài, số bước và chụp màn hình.

## Chuẩn bị

1. Hệ thống đang chạy theo [SETUP.md](SETUP.md) (Bước 4) tại **http://localhost:8000/**.
2. Nên bắt đầu từ dữ liệu mẫu sạch: tắt server (`Ctrl + C`), chạy `python -m app.seed --reset` trong thư mục `backend`, rồi bật lại server. Lệnh này xóa mọi dữ liệu đã tạo khi thử.
3. Mật khẩu mọi tài khoản mẫu là `123456`. Trang đăng nhập có nút điền nhanh **Khách hàng**, **Chủ sân**, **Quản trị**.

| Vai trò | Email | Ghi chú |
|---|---|---|
| Khách hàng | `customer@pitchpoint.test` | Dùng chính |
| Khách hàng | `binh@pitchpoint.test` | Dùng cho bài tranh khung giờ |
| Chủ sân | `manager@pitchpoint.test` | Quản lý Sân bóng Cầu Giấy, Mỹ Đình, Thanh Xuân, Dịch Vọng |
| Quản trị viên | `admin@pitchpoint.test` | |

**Mẹo:** dùng một cửa sổ Chrome thường và một cửa sổ ẩn danh (`Ctrl + Shift + N`) để đăng nhập hai tài khoản cùng lúc. Trước mỗi bài thanh toán hay hủy, ghi lại **số dư ví** (trang *Lịch sử thanh toán* hoặc *Cài đặt tài khoản*) để so sánh sau.

---

## Bài 1. Khách vãng lai xem và tìm sân

**Mục đích:** người chưa đăng nhập xem được sân và lịch trống, nhưng muốn đặt sân thì phải đăng nhập.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | Mở trang chủ khi chưa đăng nhập | Có danh sách *Sân gợi ý*, mỗi sân có giá, tiện ích, giờ trống gần nhất |
| 2 | Ở ô tìm kiếm: gõ *Cầu Giấy*, chọn ngày mai, bấm **Tìm sân trống** | Chỉ còn sân ở Cầu Giấy, có ghi số khung giờ còn trống |
| 3 | Bấm **Bộ lọc nâng cao**, xóa khu vực, chọn *Sân 7 người*, giá tối đa `450000`, sắp xếp *Giá thấp đến cao* | Chỉ còn sân 7 người, giá ≤ 450.000 ₫, giá tăng dần |
| 4 | Bấm **Xem bản đồ** trên một thẻ sân | Bản đồ Google hiện ngay trong thẻ |
| 5 | Mở chi tiết một sân, chọn 2 khung giờ liền nhau | *Tạm tính* bằng tổng giá 2 khung. Khung *Đã có người đặt* không bấm được |
| 6 | Chọn thêm một khung không liền kề | Hệ thống chọn lại từ khung vừa bấm và báo các khung trong một đơn phải liền kề |
| 7 | Bấm **Lưu sân yêu thích** hoặc **Đăng nhập để đặt sân** | Chuyển sang trang đăng nhập |

## Bài 2. Đăng ký và đăng nhập

**Mục đích:** form báo lỗi đúng; đăng ký xong được đăng nhập ngay và quay lại đúng trang đang đặt.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | Làm tiếp từ bước 7 Bài 1. Ở trang đăng nhập, bấm **Đăng nhập** khi chưa điền gì | Báo *Vui lòng nhập địa chỉ email hợp lệ* và *Vui lòng nhập mật khẩu* |
| 2 | Nhập `customer@pitchpoint.test` với mật khẩu sai | Báo *Email hoặc mật khẩu không đúng* |
| 3 | Bấm **Đăng ký**. Nhập số điện thoại `abc`, mật khẩu `123`, nhập lại `456` | Ba ô báo lỗi tương ứng bằng tiếng Việt |
| 4 | Sửa cho hợp lệ nhưng dùng email `customer@pitchpoint.test` | Báo *Email đã được đăng ký* |
| 5 | Đổi sang email mới (ví dụ `tester1@pitchpoint.test`), mật khẩu `123456`, bấm **Tạo tài khoản & đăng nhập** | Được đăng nhập ngay, quay về trang sân ở Bài 1 và vẫn giữ các khung giờ đã chọn. Ví có 2.000.000 ₫ |

## Bài 3. Quên mật khẩu và cấp lại mật khẩu

**Mục đích:** người dùng quên mật khẩu được quản trị viên cấp mật khẩu tạm và phải đổi mật khẩu mới.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | Đăng xuất. Ở trang đăng nhập bấm **Quên mật khẩu?**, nhập email đã tạo ở Bài 2, ghi chú số điện thoại, bấm gửi | Báo *Đã gửi yêu cầu*. Thông báo không cho biết email có tồn tại hay không |
| 2 | Đăng nhập **admin** → **Tổng quan** | Mục *Báo cáo cần xử lý* có *Yêu cầu đặt lại mật khẩu* của tài khoản đó |
| 3 | Bấm **Xử lý** → **Mở tài khoản để đặt lại mật khẩu** → **Đặt lại mật khẩu** → **Tạo mật khẩu tạm** | Hiện mật khẩu tạm, chỉ hiện một lần. Chép lại. Nhãn *Yêu cầu đặt lại mật khẩu* trên tài khoản biến mất |
| 4 | Đăng xuất admin. Đăng nhập tài khoản đó bằng **mật khẩu cũ** | Báo sai mật khẩu |
| 5 | Đăng nhập bằng **mật khẩu tạm** | Bị chuyển sang trang *Đặt mật khẩu mới* |
| 6 | Gõ thẳng địa chỉ `http://localhost:8000/booking-history.html` | Vẫn bị đưa về trang *Đặt mật khẩu mới* |
| 7 | Nhập mật khẩu tạm và mật khẩu mới, bấm **Lưu mật khẩu mới** | Vào được hệ thống. Từ giờ đăng nhập bằng mật khẩu mới |

## Bài 4. Đặt sân và thanh toán bằng ví

**Mục đích:** giữ chỗ 10 phút, thanh toán trừ ví đúng một lần.

**Tài khoản:** `customer@pitchpoint.test`. Ghi lại số dư ví trước khi làm.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | Mở một sân, chọn ngày mai, chọn 2 khung liền kề, **bấm đúp** vào **Giữ chỗ ngay (10 phút)** | Sang trang *Xác nhận & thanh toán*, có mã đơn và đồng hồ đếm ngược 10 phút. Chỉ tạo **1** đơn |
| 2 | Bấm **Xác nhận & thanh toán** khi chưa tích ô điều khoản | Báo phải đồng ý điều khoản |
| 3 | Tích ô điều khoản, **bấm đúp** vào nút thanh toán | Trang *Đặt sân thành công*. Ví bị trừ đúng 1 lần số tiền đơn |
| 4 | Bấm nút **Back** của trình duyệt | Không quay lại được bước thanh toán; vẫn ở trang kết quả |
| 5 | Mở **Đơn đặt sân** và **Lịch sử thanh toán** | Đơn ở tab *Sắp tới*. Có 1 giao dịch thanh toán, số dư khớp |
| 6 | Mở chuông thông báo | Có thông báo *Đặt sân thành công* |

## Bài 5. Đổi lịch và hủy đơn có hoàn tiền

**Mục đích:** đổi lịch tính tiền đúng và chỉ được đổi một lần; hủy đơn hoàn đủ tiền.

**Tài khoản:** `customer@pitchpoint.test`, dùng đơn vừa đặt ở Bài 4.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | Mở chi tiết đơn → **Đổi lịch**, chọn 1 khung giờ ở ngày khác, bấm **Giữ khung giờ mới** | Trang xác nhận ghi rõ: số dư hiện tại, *Hoàn từ đơn cũ*, số tiền đơn mới, số dư sau thanh toán |
| 2 | Tích điều khoản, bấm **Xác nhận đổi lịch & thanh toán** | Đổi lịch thành công. Ví = số dư cũ + tiền đơn cũ − tiền đơn mới |
| 3 | Mở chi tiết đơn mới | Ghi *đơn này không đổi lịch thêm được*, không còn nút **Đổi lịch** |
| 4 | Bấm **Hủy đơn và hoàn tiền**, nhập lý do, xác nhận | Đơn chuyển *Khách hủy đơn – Đã hoàn tiền*. Ví được cộng lại đúng tiền đơn |
| 5 | Mở **Lịch sử thanh toán** | Có đủ các khoản thanh toán và hoàn tiền, số dư khớp |

## Bài 6. Hai khách tranh cùng một khung giờ

**Mục đích:** một khung giờ không bao giờ bị hai người đặt cùng lúc.

**Tài khoản:** `customer@pitchpoint.test` (cửa sổ thường) và `binh@pitchpoint.test` (cửa sổ ẩn danh).

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | Hai cửa sổ cùng mở một sân, cùng ngày, cùng chọn một khung giờ còn trống | Cả hai thấy khung *Còn trống* |
| 2 | Cửa sổ thứ nhất bấm **Giữ chỗ ngay** | Giữ chỗ thành công |
| 3 | Cửa sổ thứ hai bấm **Giữ chỗ ngay** | Báo khung giờ không còn trống, yêu cầu chọn lại; không tạo đơn |
| 4 | Cửa sổ thứ hai tải lại trang | Khung đó hiện *Đã có người đặt* |
| 5 | Cửa sổ thứ nhất bấm **Hủy giữ chỗ và chọn lại** | Cửa sổ thứ hai tải lại thì thấy khung trống lại |

## Bài 7. Chủ sân quản lý sân và đơn

**Mục đích:** chủ sân sửa sân, khóa giờ, hủy đơn của khách và xem doanh thu đúng.

**Tài khoản:** `manager@pitchpoint.test`.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | **Tổng quan** | Số sân, đơn sắp tới, doanh thu tháng, đánh giá gần đây |
| 2 | **Sân của tôi** → **Chỉnh sửa** một sân. Nhập giá `1000`, rồi `30000000`, rồi giờ đóng cửa trước giờ mở | Mỗi lần báo lỗi đúng (giá từ 50.000 ₫ đến 20.000.000 ₫; giờ đóng phải sau giờ mở) |
| 3 | Nhập giá hợp lệ, bấm **Lưu cập nhật sân** | Danh sách sân hiện giá mới. Trang chi tiết sân cho khách cũng đổi giá |
| 4 | **Lịch & giá** của sân Cầu Giấy. Ở *Ngoại lệ theo ngày*, chọn một khung **đã có đơn**, bấm **Thêm ngoại lệ** | Bị chặn: *Có 1 đơn đã xác nhận trùng khung giờ* |
| 5 | Chọn một khung **còn trống**, bấm **Thêm ngoại lệ** | Banner lỗi cũ biến mất, báo *Đã thêm ngoại lệ*. Trang sân của khách hiện khung đó là *Chủ sân khóa* |
| 6 | **Đơn đặt sân** → **Hủy đơn** một đơn sắp tới; bấm xác nhận khi chưa nhập lý do, rồi nhập lý do | Lần đầu báo phải nhập lý do. Lần sau hủy được, khách được hoàn đủ tiền và nhận thông báo |
| 7 | **Doanh thu** | *Đã thu − Đã hoàn = Thực nhận* và bằng *Số dư ví* |
| 8 | Gõ địa chỉ `http://localhost:8000/admin-users.html` | Trang 403 *Không có quyền truy cập* |

## Bài 8. Quản trị viên

**Mục đích:** quản trị viên khóa tài khoản, tạm ngưng sân (kèm hoàn tiền) và đổi quy định hệ thống.

**Tài khoản:** `admin@pitchpoint.test`.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | **Quy định hệ thống**: nhập thời gian giữ chỗ `99`, bấm **Lưu cài đặt** | Báo chỉ nhận từ 5 đến 30 phút |
| 2 | Đổi thành `15`, lưu. Mở trang chủ | Trang chủ ghi *giữ chỗ 15 phút*. Sau đó **đổi lại `10`** |
| 3 | **Quản lý sân** → **Tạm ngưng sân** một sân có *Đơn sắp tới* | Hộp thoại báo trước số đơn và số tiền sẽ hoàn. Xác nhận xong: sân *Bị tạm ngưng*, các đơn sắp tới bị hủy và hoàn tiền, sân không còn trong kết quả tìm kiếm |
| 4 | **Người dùng** → tìm tài khoản đã tạo ở Bài 2 → **Xử lý tài khoản** → *Tạm khóa tài khoản*, nhập lý do | Tài khoản chuyển *Tạm khóa* |
| 5 | Đăng nhập tài khoản bị khóa, thử giữ chỗ một sân | Xem được thông tin nhưng không giữ chỗ được; có nút **Gửi khiếu nại** |
| 6 | Gửi khiếu nại. Quay lại admin → **Báo cáo** | Thấy khiếu nại. Mở khóa lại tài khoản ở **Người dùng** |
| 7 | **Nội dung & banner**: tạo *Thông báo hệ thống*, công khai ngay | Trang chủ (kể cả khi chưa đăng nhập) hiện banner. Bấm ✕ thì banner ẩn và không hiện lại khi tải trang |
| 8 | **Nhật ký hoạt động** | Có đủ các thao tác vừa làm, ghi người làm và lý do |

Kiểm tra API trả 401 khi không có token: làm theo [DEMO_CURL.md](DEMO_CURL.md).

---

## Bài 9. Server bị tắt đột ngột khi người dùng đang thao tác

**Mục đích:** server chết rồi bật lại thì không mất dữ liệu, người dùng vẫn đăng nhập, giữ chỗ dở dang không khóa sân mãi.

**Lưu ý:** bấm `Ctrl + C` là tắt **có trật tự**, không phải crash. Để giả lập mất điện hay chương trình bị treo phải giết tiến trình. Mở một cửa sổ PowerShell **thứ hai** và chuẩn bị sẵn lệnh:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

(Cách khác: bấm nút ✕ đóng hẳn cửa sổ PowerShell đang chạy server.)

**Phần A. Server chết khi khách đang giữ chỗ, bật lại ngay.** Tài khoản: `customer@pitchpoint.test`.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | Giữ chỗ một khung giờ. Đến trang thanh toán thì **dừng lại, chưa bấm thanh toán** | Có mã đơn và đồng hồ đếm ngược |
| 2 | Chạy lệnh tắt server ở cửa sổ PowerShell thứ hai | Bấm bất kỳ nút nào trên trang đều báo lỗi kết nối |
| 3 | Ở cửa sổ thứ nhất, bật lại server: `python -m uvicorn app.main:app --port 8000` | Server chạy lại |
| 4 | Tải lại trang thanh toán (`F5`) | **Vẫn đăng nhập**. Đơn vẫn đang giữ chỗ, đồng hồ đếm tiếp (không bị đặt lại về 10 phút) |
| 5 | Thanh toán | Thành công, ví bị trừ đúng 1 lần |

**Phần B. Server chết khi khách đang giữ chỗ, bật lại sau khi quá hạn.**

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1 | Để đỡ chờ: admin đặt *Thời gian giữ chỗ* = `5` phút | |
| 2 | Khách giữ chỗ một khung giờ, ghi lại mã đơn, rồi tắt server bằng lệnh ở trên | |
| 3 | Đợi hơn 5 phút, bật lại server, đợi thêm 30 giây | |
| 4 | Khách mở **Đơn đặt sân** → tab *Đã hủy / Hết hạn* | Đơn đó đã tự hủy vì hết hạn giữ chỗ, ví không bị trừ |
| 5 | Mở lại trang sân | Khung giờ đó *Còn trống*, đặt lại được. Nhớ đổi *Thời gian giữ chỗ* về `10` |

**Phần C. Đối chiếu dữ liệu sau crash.** Chạy ở thư mục gốc dự án (file chỉ đọc, không sửa gì):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U pitchpoint -h localhost -d pitchpoint -f tests/crash/check_consistency.sql
```

Mật khẩu là `pitchpoint`. Kết quả đúng: mục 1–6 đều `(0 rows)`. Ý nghĩa: số dư mọi ví khớp sổ giao dịch, không đơn nào bị trừ hay hoàn tiền 2 lần, không khung giờ nào bị đặt trùng, không đơn hủy nào còn khóa khung giờ, không giữ chỗ quá hạn nào bị bỏ sót.

## Bài 10. Crash đúng giữa lúc thanh toán, hoàn tiền, đổi lịch (tự động)

**Mục đích:** kiểm tra những thời điểm không thể bấm tay cho đúng lúc. Server bị giết **trong lúc đang trừ tiền** hoặc **ngay sau khi vừa lưu xong mà chưa kịp trả lời người dùng**.

Script chạy server thật ở cổng `8003` (không ảnh hưởng server đang chạy ở cổng 8000). Nó tự gây crash ở từng thao tác, bật lại server, kiểm tra database rồi làm lại thao tác như người dùng bấm lại. Database dùng là `pitchpoint_test` và **bị xóa sạch** mỗi lần chạy. Script tự từ chối chạy nếu trỏ vào database `pitchpoint`.

```powershell
$env:CRASH_DATABASE_URL = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"
python tests/crash/run_crash.py
```

Mất khoảng 2–3 phút. Kết quả đúng là dòng cuối `KẾT QUẢ: 12/12 kịch bản đạt`. Mỗi kịch bản in ra người dùng thấy gì, dữ liệu sau khi bật lại ra sao, và kết quả kiểm tra toàn bộ ví, thanh toán, hoàn tiền, khung giờ.

| # | Kịch bản | Kết quả đúng |
|---|---|---|
| 1 | Đăng ký – chết trước khi lưu | Không có tài khoản dở dang; đăng ký lại được |
| 2 | Đăng ký – chết ngay sau khi lưu | Tài khoản đã có; đăng ký lại báo *Email đã được đăng ký*; đăng nhập được |
| 3 | Giữ chỗ – chết trước khi lưu | Không có đơn; khung giờ vẫn trống |
| 4 | Thanh toán – chết khi đang trừ tiền | Đơn vẫn đang giữ chỗ, ví không bị trừ; thanh toán lại thì trừ đúng 1 lần |
| 5 | Thanh toán – chết ngay sau khi trừ tiền | Đơn đã thanh toán; bấm lại bị từ chối, **không trừ lần 2** |
| 6 | Khách hủy – chết khi đang hoàn tiền | Đơn còn nguyên, chưa hoàn; hủy lại thì hoàn đúng 1 lần |
| 7 | Khách hủy – chết ngay sau khi hoàn tiền | Đơn đã hủy; bấm lại bị từ chối, **không hoàn lần 2** |
| 8 | Đổi lịch – chết khi đang hoàn đơn cũ và trừ đơn mới | Đơn cũ còn nguyên, tiền không đổi; làm lại thì đổi lịch đúng |
| 9 | Chủ sân hủy đơn – chết khi đang hoàn tiền | Ví khách và chủ sân không đổi; token đăng nhập vẫn dùng được; làm lại thì hoàn đúng |
| 10 | Admin tạm ngưng sân – chết khi đang hủy và hoàn nhiều đơn | Sân vẫn hoạt động, không đơn nào bị hoàn dở; làm lại thì hoàn đủ; tổng tiền hệ thống không đổi |
| 11 | Server tắt khi đang giữ chỗ, bật lại sau khi quá hạn | Đơn tự hủy, khung giờ trống lại, ví không đổi |
| 12 | Tắt đột ngột 6 lần khi 6 khách đặt, thanh toán, hủy cùng lúc | Mọi thao tác server đã báo thành công đều còn nguyên; dữ liệu khớp hoàn toàn |

Chạy bằng pytest (in kết quả từng kịch bản khi thêm `-s`):

```powershell
python -m pytest -q tests/crash
```

### Vì sao hệ thống chịu được crash

Phần này dùng để trả lời khi được hỏi.

- **Mỗi thao tác là một giao dịch database** (`backend/app/deps.py`, hàm `run`). Mọi thay đổi của một thao tác (trừ ví, ghi thanh toán, xác nhận đơn, gửi thông báo) chỉ có hiệu lực khi `commit`. Server chết trước `commit` thì PostgreSQL tự hủy toàn bộ, nên không có chuyện trừ tiền mà đơn chưa xác nhận.
- **Chống bấm lại trừ tiền 2 lần:** thanh toán chỉ đổi đơn từ `pending` sang `confirmed` khi đơn còn `pending` (`services.pay_booking`). Hủy chỉ áp dụng cho đơn chưa hủy. Server chết sau `commit` mà người dùng bấm lại thì bị từ chối.
- **Khóa dòng** (`SELECT ... FOR UPDATE` trong `rules.lock_bookings`, `rules.wallet_for`): hai request cùng sửa một đơn hay một ví phải chờ nhau, nên không ghi đè lên nhau.
- **Hạn giữ chỗ lưu trong database** (`bookings.hold_expires_at`), không nằm trong bộ nhớ server. Bật lại server thì job nền (`rules.sync`, chạy định kỳ và ở mỗi request) tự hủy giữ chỗ quá hạn và trả khung giờ.
- **Phiên đăng nhập lưu trong database** (bảng `sessions`), nên người dùng không bị đăng xuất khi server khởi động lại.
- **Sổ ví** (`wallet_transactions`): mọi lần cộng hay trừ ví đều ghi một dòng sổ trong cùng giao dịch, nên luôn đối chiếu được số dư với sổ (file `tests/crash/check_consistency.sql`).

**Giới hạn:** khi server chết ngay sau khi lưu, người dùng thấy lỗi kết nối dù thao tác đã xong. Họ cần mở lại *Đơn đặt sân* hoặc *Lịch sử thanh toán* để xem trạng thái thật. Hệ thống không trừ hay hoàn tiền lần 2. Server không tự khởi động lại; người vận hành phải bật lại.

---

## Kiểm thử tự động

Chạy ở thư mục gốc dự án, trong cửa sổ PowerShell mới. Ba bộ chạy riêng, **không chạy gộp `pytest tests`**. Cả ba dùng database `pitchpoint_test` (bị xóa sạch mỗi lần), không đụng vào `pitchpoint`.

| Bộ | Lệnh | Thời gian | Kết quả đúng |
|---|---|---|---|
| API backend | `$env:TEST_DATABASE_URL = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"` rồi `python -m pytest -q` | ~30 giây | `82 passed` |
| Trình duyệt thật (cần Chrome) | `$env:E2E_DATABASE_URL = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"` rồi `python -m pytest -q tests/e2e` | ~5 phút | `29 passed` |
| Crash | `$env:CRASH_DATABASE_URL = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"` rồi `python tests/crash/run_crash.py` | ~2–3 phút | `12/12 kịch bản đạt` |

Bộ e2e dùng cổng 8002, bộ crash dùng cổng 8003 (đổi bằng biến `CRASH_PORT` nếu bị trùng). Log server của bộ crash nằm ở `%TEMP%\pitchpoint-crash-server.log`.

## Gặp lỗi khi chạy bộ crash

| Thông báo | Cách xử lý |
|---|---|
| `Không kết nối được PostgreSQL` | PostgreSQL chưa chạy, hoặc chưa làm Bước 3 trong [SETUP.md](SETUP.md) (tạo `pitchpoint_test`) |
| `Database 'pitchpoint' sẽ bị xóa sạch...` | `CRASH_DATABASE_URL` đang trỏ vào database thật. Đổi sang `.../pitchpoint_test` |
| `Cổng 8003 đang bị chương trình khác dùng` | Chạy lại với `$env:CRASH_PORT = "8013"` |
| Một kịch bản báo `LỖI` | Đọc dòng mô tả bên dưới kịch bản đó và xem log server; gửi cả hai cho người phụ trách backend |
