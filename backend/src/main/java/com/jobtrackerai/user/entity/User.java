package com.jobtrackerai.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "google_id", nullable = false, unique = true)
    private String googleId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "gmail_connected", nullable = false)
    private boolean gmailConnected = false;

    // Khởi tạo default để user MỚI insert luôn có JSON hợp lệ (cột NOT NULL) —
    // Hibernate include cột này trong INSERT, null sẽ vi phạm NOT NULL.
    // User cũ đọc từ DB thì Hibernate ghi đè bằng giá trị đã lưu.
    @JdbcTypeCode(SqlTypes.JSON)//biên dịch object thành json lúc lưu xuống db
    @Column(name = "notification_preferences", columnDefinition = "jsonb", nullable = false)//quyết định kiểu cột này là jsonb
    private NotificationPreferences notificationPreferences = NotificationPreferences.defaults();

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

    public static User create(String googleId, String email, String fullName, String avatarUrl) {
        User user = new User();
        user.googleId = googleId;
        user.email = email;
        user.fullName = fullName;
        user.avatarUrl = avatarUrl;
        return user;
    }
}
