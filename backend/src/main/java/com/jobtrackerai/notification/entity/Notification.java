package com.jobtrackerai.notification.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/* 
1 reminder có thể sinh ra NHIỀU notification, qua nhiều kênh — quan hệ 1-nhiều, không phải 1-1:
Reminder "phỏng vấn ngày mai" (nếu Phase 6 làm) → bắn 1 notification lúc 1 ngày trước + 1 notification nữa lúc 1 giờ trước → 2 notification từ 1 reminder.
Cùng 1 reminder tới hạn có thể bắn in-app (Phase 5) + email (Phase 6) → 2 bản ghi kênh khác nhau.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    // vd "/applications/12" — FE điều hướng tới resource liên quan khi click
    @Column(name = "link_url")
    private String linkUrl;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    // Payload phụ dạng JSON string (vd {"reminderId":5,"applicationId":12}) — FE/debug tra cứu
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
