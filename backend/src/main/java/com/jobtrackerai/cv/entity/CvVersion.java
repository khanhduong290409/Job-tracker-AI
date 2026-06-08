package com.jobtrackerai.cv.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "cv_versions")
@Getter
@Setter
@NoArgsConstructor
@SQLDelete(sql = "UPDATE cv_versions SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class CvVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String label;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    // JSONB — lưu raw JSON string, Phase 4 AI service sẽ fill
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parsed_data", columnDefinition = "jsonb")
    private String parsedData;

    @Enumerated(EnumType.STRING)
    @Column(name = "parse_status", nullable = false)
    private CvParseStatus parseStatus = CvParseStatus.PENDING;

    @Column(name = "parse_error")
    private String parseError;

    // Tránh dùng "isDefault" (Lombok sinh getter isDefault() gây nhầm JavaBeans convention)
    @Column(name = "is_default", nullable = false)
    private boolean defaultCv = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
