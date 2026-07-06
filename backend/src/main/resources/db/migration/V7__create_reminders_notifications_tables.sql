-- ============================================================
-- reminders
-- Lịch nhắc gắn với user (và optional với 1 application).
-- 3 loại dùng ở Phase 5: CUSTOM (user tạo tay), FOLLOW_UP_AFTER_APPLY,
-- STATUS_STALE (2 loại auto sinh bởi scheduled job). INTERVIEW_REMINDER /
-- TAKE_HOME_DEADLINE khai báo sẵn trong CHECK nhưng chưa dùng (defer).
--
-- Vòng đời: scheduled_at tới hạn → dispatcher tạo notification, set sent_at.
-- is_dismissed = user tự tắt (không muốn bị nhắc nữa). Không soft delete
-- (DELETE thật) — reminder là dữ liệu vận hành, không cần giữ lịch sử.
-- ============================================================
CREATE TABLE reminders (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id  BIGINT       REFERENCES applications(id) ON DELETE CASCADE,
    -- Nullable: CUSTOM reminder có thể không gắn application nào.
    -- ON DELETE CASCADE: xóa application thì reminder liên quan biến mất theo.
    reminder_type   VARCHAR(30)  NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    scheduled_at    TIMESTAMP WITH TIME ZONE NOT NULL,   -- thời điểm cần nhắc
    sent_at         TIMESTAMP WITH TIME ZONE,            -- null = chưa bắn notification
    is_dismissed    BOOLEAN      NOT NULL DEFAULT FALSE,
    channels        JSONB        NOT NULL DEFAULT '["IN_APP"]',
    -- Phase 5 chỉ IN_APP. Cột giữ sẵn để Phase 6 thêm EMAIL không cần migration.
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_reminder_type CHECK (reminder_type IN (
        'FOLLOW_UP_AFTER_APPLY', 'INTERVIEW_REMINDER',
        'TAKE_HOME_DEADLINE', 'STATUS_STALE', 'CUSTOM'
    ))
);

-- Dispatcher quét reminder tới hạn chưa bắn: WHERE sent_at IS NULL AND NOT dismissed
-- ORDER BY scheduled_at. Partial index chỉ chứa hàng "còn chờ bắn" → nhỏ, nhanh.
CREATE INDEX idx_reminders_due ON reminders(scheduled_at)
    WHERE sent_at IS NULL AND is_dismissed = FALSE;

-- List reminder của 1 user (mới nhất trước)
CREATE INDEX idx_reminders_user ON reminders(user_id, scheduled_at DESC);

-- ============================================================
-- notifications
-- Bản ghi thông báo in-app (badge + dropdown). Sinh ra khi reminder tới hạn,
-- hoặc trực tiếp bởi các sự kiện khác về sau. type để String (không FK enum
-- table) — linh hoạt thêm loại. link_url để FE điều hướng tới resource liên quan.
-- Không soft delete: append-only, xóa theo CASCADE từ user.
-- ============================================================
CREATE TABLE notifications (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50)  NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    link_url        VARCHAR(500),               -- vd /applications/12 — FE điều hướng khi click
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    metadata        JSONB,                      -- payload phụ (vd reminderId, applicationId)
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Badge đếm chưa đọc + list chưa đọc (mới nhất trước). Partial index chỉ hàng unread.
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
    WHERE is_read = FALSE;

-- List toàn bộ notification của user (kể cả đã đọc), phân trang mới nhất trước.
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
