package com.jobtrackerai.email.entity;

/**
 * Loại email AI có thể soạn nháp giúp ứng viên gửi HR (scope Phase 6 — mảng C).
 *
 * <p>{@code description} là mô tả người-đọc-được, dùng để nhét vào prompt Template 5
 * ({@code Email type: <<TEMPLATE_KEY>>}) — cho Gemini hiểu ngữ cảnh rõ hơn tên enum trống.
 * Đây KHÔNG lưu DB (draft stateless, không persist) nên không cần @Enumerated/mapping.
 */
public enum EmailTemplateKey {
    FOLLOW_UP_AFTER_APPLY("Follow-up email after applying, no response yet"),
    THANK_YOU_AFTER_INTERVIEW("Thank-you email after an interview"),
    STATUS_INQUIRY("Polite inquiry about the current status of the application");

    private final String description;

    EmailTemplateKey(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
