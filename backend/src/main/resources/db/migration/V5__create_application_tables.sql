-- ============================================================
-- applications
-- ============================================================
CREATE TABLE applications (
    id               BIGSERIAL    PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_version_id    BIGINT       REFERENCES cv_versions(id) ON DELETE SET NULL,
    -- FK → cv_versions.id. ON DELETE SET NULL — xóa CV version thì application vẫn tồn tại, chỉ mất link
    company_name     VARCHAR(255) NOT NULL,
    company_domain   VARCHAR(255),
    position         VARCHAR(255) NOT NULL, --Tên vị trí ứng tuyển
    location         VARCHAR(255),
    work_type        VARCHAR(20),-- ONSITE / HYBRID / REMOTE — có CHECK constraint
    employment_type  VARCHAR(20),-- INTERN / FULLTIME / PARTTIME / CONTRACT — có CHECK constraint
    salary_min       INTEGER,-- Lương tối thiểu (để null nếu không rõ)
    salary_max       INTEGER,-- Lương tối đa
    salary_currency  VARCHAR(10), -- Đơn vị tiền (vd VND, USD) — tách ra để so sánh đúng khi filter
    jd_content       TEXT         NOT NULL, -- nội dung job
    jd_url           VARCHAR(500),-- URL gốc của JD (LinkedIn, TopCV...)
    source           VARCHAR(30)  NOT NULL,-- 	Nguồn JD: LINKEDIN / TOPCV / ITVIEC / COMPANY_WEBSITE / REFERRAL / OTHER
    source_detail    VARCHAR(255),-- Mô tả thêm (vd tên người giới thiệu nếu source = REFERRAL)
    applied_date     DATE,
    status           VARCHAR(30)  NOT NULL DEFAULT 'SAVED',
    contact_person   JSONB,
    notes            TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,

    -- ĐÂY ĐƯỢC GỌI LÀ CHECK CONSTRAINT
    CONSTRAINT chk_application_status CHECK (status IN (
        'SAVED', 'APPLIED', 'PHONE_SCREEN', 'TECHNICAL_INTERVIEW',
        'ONSITE', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'
    )),
    CONSTRAINT chk_application_work_type CHECK (
        work_type IN ('ONSITE', 'HYBRID', 'REMOTE')
    ),
    CONSTRAINT chk_application_employment_type CHECK (
        employment_type IN ('INTERN', 'FULLTIME', 'PARTTIME', 'CONTRACT')
    )
);
-- CÁCH THỨC HOẠT ĐỘNG
-- INSERT INTO applications (status, ...) VALUES ('GHOSTED', ...);
-- -- → ERROR: new row violates check constraint "chk_application_status"
-- Tức là dù Java service không validate, DB vẫn chặn — đây là defense in depth: validate ở cả application layer (Spring @Valid) lẫn DB layer.

-- list applications của 1 user (query phổ biến nhất)


-- cuối file có giải thích rõ hơn về partial index

CREATE INDEX idx_applications_user
    ON applications(user_id)
    WHERE deleted_at IS NULL;

-- filter theo status + user (list page filter)
CREATE INDEX idx_applications_status
    ON applications(user_id, status)
    WHERE deleted_at IS NULL;

-- sort theo ngày apply DESC (default sort của list page)
CREATE INDEX idx_applications_applied_date
    ON applications(user_id, applied_date DESC)
    WHERE deleted_at IS NULL;

-- email matching theo company domain (Phase 6)
CREATE INDEX idx_applications_company_domain
    ON applications(company_domain)
    WHERE deleted_at IS NULL;

-- full-text search trên company + position + JD content
CREATE INDEX idx_applications_fts ON applications USING GIN (
    to_tsvector('english', company_name || ' ' || position || ' ' || jd_content)
);

-- ============================================================
-- application_status_history
-- Tự động log mỗi khi status thay đổi (do service ghi, không phải trigger)
-- ============================================================
CREATE TABLE application_status_history (
    id              BIGSERIAL   PRIMARY KEY,
    application_id  BIGINT      NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30) NOT NULL,
    note            TEXT,-- Ghi chú khi đổi status (vd "Bị reject vòng kỹ thuật")
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- lấy lịch sử status của 1 application, mới nhất trước
CREATE INDEX idx_status_history_application
    ON application_status_history(application_id, changed_at DESC);

-- ============================================================
-- application_timeline_events
-- User thêm sự kiện thủ công (interview, follow-up, ghi chú...)
-- ============================================================
CREATE TABLE application_timeline_events (
    id              BIGSERIAL    PRIMARY KEY,
    application_id  BIGINT       NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    event_type      VARCHAR(50)  NOT NULL,-- Loại sự kiện (vd INTERVIEW, FOLLOW_UP, OFFER_RECEIVED, NOTE) — text tự do, validate ở application layer
    event_date      TIMESTAMPTZ  NOT NULL,
    title           VARCHAR(255),--Tiêu đề ngắn (vd "Round 2 Technical Interview")
    description     TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    -- JSONB linh hoạt — mỗi event_type có thể có schema riêng (vd interview: {"interviewer": "...", "platform": "Zoom"})
);

-- lấy timeline của 1 application, sắp xếp theo thời gian sự kiện
CREATE INDEX idx_timeline_application
    ON application_timeline_events(application_id, event_date DESC);

-- ============================================================
-- application_files
-- File đính kèm per application (CV dùng, cover letter, take-home test...)
-- Endpoint upload defer Phase 4+, bảng tạo sẵn để không cần thêm migration sau
-- Lưu trữ các file đính kèm cho từng application. Mỗi lần ứng tuyển, user có thể đính kèm nhiều file khác nhau: CV đã dùng, cover letter, bài test về nhà...
-- ============================================================
CREATE TABLE application_files (
    id              BIGSERIAL    PRIMARY KEY,
    application_id  BIGINT       NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    file_type       VARCHAR(30)  NOT NULL,-- CV_USED / COVER_LETTER / TAKE_HOME_TEST / OTHER — CHECK constraint
    file_url        VARCHAR(500) NOT NULL,-- URL Cloudinary của file
    file_name       VARCHAR(255) NOT NULL,
    file_size       BIGINT       NOT NULL,
    mime_type       VARCHAR(100),-- application/pdf, image/png... — nullable nhưng nên có để serve đúng Content-Type
    uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_application_file_type CHECK (
        file_type IN ('CV_USED', 'COVER_LETTER', 'TAKE_HOME_TEST', 'OTHER')
    )
);

CREATE INDEX idx_files_application ON application_files(application_id);



-- 1. Partial Index (4 index đầu)

-- WHERE deleted_at IS NULL
-- Tất cả 4 index đầu đều có mệnh đề WHERE này → gọi là Partial Index.

-- Ý nghĩa: Index chỉ chứa các row có deleted_at IS NULL (row chưa bị xóa mềm). Row đã soft-delete không được index.

-- Lợi ích:

-- Index nhỏ hơn (không chứa rác đã xóa) → truy vấn nhanh hơn, tốn ít RAM hơn
-- Mọi query bình thường đều filter WHERE deleted_at IS NULL → partial index này được dùng 100%
-- idx_applications_status — composite index (user_id, status)


-- ON applications(user_id, status) WHERE deleted_at IS NULL
-- Query được tối ưu: WHERE user_id = 5 AND status = 'APPLIED' AND deleted_at IS NULL
-- → Dùng khi user filter danh sách theo trạng thái trên list page.

-- Tại sao user_id đứng trước status? Vì query luôn có user_id trước — composite index hiệu quả nhất khi cột có cardinality cao (nhiều giá trị unique) đứng đầu. user_id có hàng nghìn giá trị, status chỉ có 9.