-- Tạo tài khoản và database PostgreSQL cho Pitch Point (chạy một lần trên mỗi máy).
--
-- Windows (PostgreSQL 17 cài bằng bộ cài chính thức), trong thư mục backend/:
--   "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -f scripts/setup_postgres.sql
-- macOS / Linux:
--   psql -U postgres -h localhost -f scripts/setup_postgres.sql
-- psql hỏi mật khẩu của tài khoản postgres (đặt lúc cài PostgreSQL); bạn tự nhập.
--
-- Mật khẩu 'pitchpoint' dưới đây chỉ dùng cho máy phát triển, khớp với DATABASE_URL mặc định trong
-- app/config.py. Khi triển khai thật: đổi mật khẩu ở đây và đặt DATABASE_URL trong backend/.env.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pitchpoint') THEN
    CREATE ROLE pitchpoint LOGIN PASSWORD 'pitchpoint';
  END IF;
END
$$;

SELECT 'CREATE DATABASE pitchpoint OWNER pitchpoint ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pitchpoint')\gexec

-- Database riêng cho pytest (bị xóa sạch mỗi lần chạy test, không dùng chung với dữ liệu thật).
SELECT 'CREATE DATABASE pitchpoint_test OWNER pitchpoint ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pitchpoint_test')\gexec
