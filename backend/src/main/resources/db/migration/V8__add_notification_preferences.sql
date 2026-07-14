-- ============================================================
-- users.notification_preferences  (Phase 6 — US-NOTIF-005)
-- Tùy chọn kênh nhận thông báo của từng user, lưu dạng JSONB:
--   { "inApp": <bool>, "email": <bool> }
--   - inApp: có tạo notification in-app (chuông) khi reminder tới hạn không
--   - email: có gửi email thật (SMTP) khi reminder tới hạn không
--
-- Vì sao ADD COLUMN (không tạo bảng riêng): preferences là dữ liệu 1-1 với user,
-- ít trường, đọc kèm user — nhét thẳng vào bảng users gọn hơn 1 bảng phụ + join.
-- JSONB (không phải 2 cột bool) để sau này thêm kênh (PUSH...) không cần migration.
--
-- DEFAULT áp cho MỌI hàng user hiện có (backfill tự động) + user tạo mới sau này
-- → không có user nào rơi vào trạng thái preferences = null.
-- ============================================================
ALTER TABLE users
    ADD COLUMN notification_preferences JSONB NOT NULL DEFAULT '{"inApp": true, "email": true}';
