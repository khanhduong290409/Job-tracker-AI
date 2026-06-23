-- ============================================================
-- ai_analyses
-- Lưu kết quả phân tích AI gắn với từng application.
-- Dùng input_hash (SHA-256) để detect duplicate và cache ở DB layer
-- (layer 2 sau Redis). Không soft delete — xóa theo CASCADE từ application.
-- ============================================================
CREATE TABLE ai_analyses (
    id              BIGSERIAL    PRIMARY KEY,
    application_id  BIGINT       NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    analysis_type   VARCHAR(30)  NOT NULL,
    -- CV_JD_MATCH: phân tích độ khớp CV–JD
    -- JD_INSIGHT  : trích xuất thông tin từ JD (skills, tech stack, exp level...)
    input_hash      VARCHAR(64)  NOT NULL,
    -- SHA-256 của input (jdContent cho JD_INSIGHT; jdContent+parsedCvData cho CV_JD_MATCH)
    -- Dùng để tìm lại kết quả cũ khi input không đổi (tránh gọi Gemini lại)
    result          JSONB        NOT NULL,
    model_used      VARCHAR(50),
    tokens_used     INTEGER,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_analysis_type CHECK (analysis_type IN ('CV_JD_MATCH', 'JD_INSIGHT'))
);

-- Tìm analysis theo application + type (dùng trong AiAnalysisService.getLatest*)
CREATE INDEX idx_analyses_application ON ai_analyses(application_id, analysis_type, created_at DESC);

-- Tìm theo hash để check DB cache (layer 2 sau Redis)
CREATE INDEX idx_analyses_hash ON ai_analyses(input_hash);
