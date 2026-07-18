package com.jobtrackerai.ai.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * Kết quả một lần phân tích AI gắn với 1 application.
 * Không soft delete — xóa theo CASCADE khi application bị xóa (xem V6 migration).
 * {@code result} là JSONB đa hình: chứa JdInsightResponse (JD_INSIGHT) hoặc
 * CvJdMatchResponse (CV_JD_MATCH) tùy {@code analysisType} — nên lưu dạng JsonNode,
 * service tự convert sang DTO đúng kiểu khi đọc.
 */
@Entity
@Table(name = "ai_analyses")
@Getter
@Setter
@NoArgsConstructor
public class AiAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_type", nullable = false, length = 30)
    private AiAnalysisType analysisType;

    // SHA-256 của input (hex 64 ký tự) — dùng tìm lại kết quả cũ khi input không đổi
    @Column(name = "input_hash", nullable = false, length = 64)
    private String inputHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result", columnDefinition = "jsonb", nullable = false)
    private JsonNode result;//result là kết quả gemini trả về dưới dạng json sau khi phân tích xong theo format mình đã yêu cầu

    @Column(name = "model_used", length = 50)
    private String modelUsed;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
