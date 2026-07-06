package com.jobtrackerai.reminder.repository;

import com.jobtrackerai.reminder.entity.Reminder;
import com.jobtrackerai.reminder.entity.ReminderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    // Ownership-safe lookup — userId trong query: dismiss/delete reminder không phải của mình → 404
    Optional<Reminder> findByIdAndUserId(Long id, Long userId);

    // List reminder của 1 application (dùng ở reminder section trong ApplicationDetailPage)
    List<Reminder> findByUserIdAndApplicationIdOrderByScheduledAtDesc(Long userId, Long applicationId);

    // List toàn bộ reminder của user (GET /reminders khi không lọc theo application)
    List<Reminder> findByUserIdOrderByScheduledAtDesc(Long userId);

    // Dispatcher: reminder tới hạn mà CHƯA bắn notification và CHƯA bị dismiss.
    // Khớp partial index idx_reminders_due (sent_at IS NULL AND is_dismissed = FALSE).
    @Query("""
            SELECT r FROM Reminder r
            WHERE r.scheduledAt <= :now
              AND r.sentAt IS NULL
              AND r.dismissed = false
            ORDER BY r.scheduledAt ASC
            """)
    List<Reminder> findDue(@Param("now") Instant now);

    // Generator dedup: application này đã có reminder auto loại này chưa (bất kể đã bắn/dismiss)?
    // "Once per app per type" — tránh sinh trùng mỗi lần job chạy.
    boolean existsByApplicationIdAndReminderType(Long applicationId, ReminderType reminderType);
}
