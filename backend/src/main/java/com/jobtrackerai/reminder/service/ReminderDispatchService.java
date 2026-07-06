package com.jobtrackerai.reminder.service;

import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.entity.ApplicationStatus;
import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.notification.entity.NotificationType;
import com.jobtrackerai.notification.service.NotificationService;
import com.jobtrackerai.reminder.entity.Reminder;
import com.jobtrackerai.reminder.entity.ReminderType;
import com.jobtrackerai.reminder.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Lõi Phase 5. 2 việc do scheduled job (File 9) gọi:
 *   - generateAutoReminders(): quét applications sinh reminder FOLLOW_UP + STATUS_STALE
 *     (dedup 1 lần/loại/app, bỏ qua đơn đã có). Chạy daily.
 *   - dispatchDueReminders(): reminder tới hạn → tạo notification IN_APP, set sent_at.
 *     Chạy mỗi 15'.
 *
 * KHÔNG hook vào write-path của application — self-contained, đọc ApplicationRepository read-only.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReminderDispatchService {

    private static final int FOLLOW_UP_DAYS = 7;
    private static final int STALE_DAYS = 14;

    // Trạng thái kết thúc — đơn ở đây không cần nhắc STATUS_STALE nữa.
    private static final List<ApplicationStatus> TERMINAL_STATUSES = List.of(
            ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN);

    private final ReminderRepository reminderRepository;
    private final ApplicationRepository applicationRepository;
    private final NotificationService notificationService;

    // ── Generator ─────────────────────────────────────────────────────────────

    @Transactional
    public int generateAutoReminders() {
        int created = generateFollowUps() + generateStaleReminders();
        log.info("Auto reminders generated: {}", created);
        return created;
    }

    // theo dõi application đã applied sau 7 ngày mà chưa có phản hồi gì thì gửi reminder
    private int generateFollowUps() {
        LocalDate threshold = LocalDate.now().minusDays(FOLLOW_UP_DAYS);//minusDays(FOLLOW_UP_DAYS) -> lùi lại 7 ngày
        List<Application> apps =
                applicationRepository.findByStatusAndAppliedDateLessThanEqual(ApplicationStatus.APPLIED, threshold);

        int count = 0;
        for (Application app : apps) {
            if (reminderRepository.existsByApplicationIdAndReminderType(
                    app.getId(), ReminderType.FOLLOW_UP_AFTER_APPLY)) {
                continue; // dedup: đã có FOLLOW_UP cho đơn này
            }
            saveAutoReminder(app, ReminderType.FOLLOW_UP_AFTER_APPLY,
                    "Theo dõi đơn ứng tuyển " + app.getCompanyName(),
                    "Đã " + FOLLOW_UP_DAYS + " ngày kể từ khi bạn ứng tuyển vị trí "
                            + app.getPosition() + " tại " + app.getCompanyName()
                            + " mà chưa có cập nhật. Cân nhắc gửi email theo dõi.");
            count++;
        }
        return count;
    }
    private int generateStaleReminders() {//theo dõi application quá 14 ngày chưa cập nhật
        Instant threshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        List<Application> apps = applicationRepository.findStaleApplications(TERMINAL_STATUSES, threshold);

        int count = 0;
        for (Application app : apps) {
            if (reminderRepository.existsByApplicationIdAndReminderType(
                    app.getId(), ReminderType.STATUS_STALE)) {
                continue; // dedup
            }
            saveAutoReminder(app, ReminderType.STATUS_STALE,
                    "Đơn ứng tuyển " + app.getCompanyName() + " lâu chưa cập nhật",
                    "Đơn ứng tuyển vị trí " + app.getPosition() + " tại " + app.getCompanyName()
                            + " không có thay đổi nào trong " + STALE_DAYS + " ngày. "
                            + "Kiểm tra lại trạng thái hoặc theo dõi tiếp.");
            count++;
        }
        return count;
    }

    private void saveAutoReminder(Application app, ReminderType type, String title, String description) {
        Reminder reminder = new Reminder();
        reminder.setUserId(app.getUserId());
        reminder.setApplicationId(app.getId());
        reminder.setReminderType(type);
        reminder.setTitle(title);
        reminder.setDescription(description);
        reminder.setScheduledAt(Instant.now()); 
        reminderRepository.save(reminder);
    }

    // ── Dispatcher ────────────────────────────────────────────────────────────

    @Transactional
    public int dispatchDueReminders() {
        List<Reminder> due = reminderRepository.findDue(Instant.now());

        for (Reminder r : due) {
            notificationService.create(
                    r.getUserId(),
                    NotificationType.REMINDER,
                    r.getTitle(),
                    r.getDescription(),
                    r.getApplicationId() != null ? "/applications/" + r.getApplicationId() : null,
                    buildMetadata(r));
            r.setSentAt(Instant.now());
            reminderRepository.save(r);
        }

        if (!due.isEmpty()) {
            log.info("Reminders dispatched: {}", due.size());
        }
        return due.size();
    }

    private Map<String, Object> buildMetadata(Reminder r) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("reminderId", r.getId());
        metadata.put("reminderType", r.getReminderType().name());
        if (r.getApplicationId() != null) {
            metadata.put("applicationId", r.getApplicationId());
        }
        return metadata;
    }
}
