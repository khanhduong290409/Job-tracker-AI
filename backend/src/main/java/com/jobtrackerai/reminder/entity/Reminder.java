package com.jobtrackerai.reminder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Lịch nhắc của user, optional gắn với 1 application.
 *
 * Vòng đời: scheduled_at tới hạn → dispatcher tạo notification IN_APP, set sentAt.
 * dismissed = user tự tắt (không muốn bị nhắc). KHÔNG soft delete — DELETE thật.
 *
 * Cột `channels` (JSONB, DB default ["IN_APP"]) CỐ TÌNH không map ở entity:
 * Phase 5 chỉ IN_APP nên logic không đọc field này → map vào = state thừa.
 * DB tự điền default lúc INSERT. Phase 6 (thêm EMAIL) sẽ map khi thật sự cần đọc.
 */
@Entity
@Table(name = "reminders")
@Getter
@Setter
@NoArgsConstructor
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Nullable: CUSTOM reminder có thể không gắn application nào
    @Column(name = "application_id")
    private Long applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reminder_type", nullable = false)
    private ReminderType reminderType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    // null = chưa bắn notification. Dispatcher set khi tạo notification.
    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "is_dismissed", nullable = false)
    private boolean dismissed = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
