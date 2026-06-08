CREATE TABLE cv_versions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(100) NOT NULL,
    file_url    VARCHAR(500) NOT NULL,
    file_name   VARCHAR(255) NOT NULL,
    file_size   BIGINT       NOT NULL,
    raw_text    TEXT,
    parsed_data JSONB,
    parse_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    parse_error TEXT,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    CONSTRAINT chk_parse_status CHECK (parse_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

-- list CVs của 1 user (query phổ biến nhất)
CREATE INDEX idx_cv_versions_user ON cv_versions(user_id) WHERE deleted_at IS NULL;

-- đảm bảo mỗi user chỉ có đúng 1 default CV tại 1 thời điểm
CREATE UNIQUE INDEX idx_cv_versions_default
    ON cv_versions(user_id)
    WHERE is_default = TRUE AND deleted_at IS NULL;



-- GIẢI THÍCH 
-- user_id — Liên kết tới bảng users, nếu user bị xóa thì toàn bộ CV của họ cũng bị xóa theo (ON DELETE CASCADE)
-- raw_text	Nội dung text thuần sau khi extract từ PDF
-- parsed_data	Dữ liệu CV đã parse thành JSON (tên, kỹ năng, kinh nghiệm...)
-- parse_status	Trạng thái pipeline AI parse CV
-- deleted_at	Soft delete — xóa = set timestamp, không xóa row
-- parsed_data JSONB — Lưu kết quả AI parse CV dạng JSON (tên, kỹ năng, kinh nghiệm...).
-- parse_status VARCHAR(20) DEFAULT 'PENDING' — Trạng thái pipeline AI: PENDING → PROCESSING → COMPLETED / FAILED. Default PENDING khi mới upload, không cần truyền từ code Java.
-- parse_error TEXT — Lưu thông báo lỗi nếu AI parse thất bại. NULL khi thành công. Dùng TEXT vì lỗi có thể dài, không muốn bị cắt.
-- is_default BOOLEAN DEFAULT FALSE — Đánh dấu CV mặc định dùng khi tạo application. Default FALSE để user phải tự chọn, tránh vô tình ghi đè. Partial unique index ở cuối file đảm bảo mỗi user chỉ có đúng 1 default.