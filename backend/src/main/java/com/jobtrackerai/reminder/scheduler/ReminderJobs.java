package com.jobtrackerai.reminder.scheduler;

import com.jobtrackerai.reminder.service.ReminderDispatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Điểm vào của scheduled job — chỉ điều phối lịch, logic nằm ở ReminderDispatchService.
 * Gọi qua bean proxy nên @Transactional trong service hoạt động (không self-invocation).
 *
 * try/catch quanh mỗi job: 1 lần chạy lỗi chỉ log, KHÔNG làm chết lịch (lần sau vẫn chạy).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderJobs {

    private final ReminderDispatchService dispatchService;

    // Generator: 08:00 mỗi ngày. Quét nặng, chỉ cần 1 lần/ngày vào giờ cố định.
    @Scheduled(cron = "0 0 8 * * *")
    public void generateAutoReminders() {
        try {
            dispatchService.generateAutoReminders();
        } catch (Exception e) {
            log.error("generateAutoReminders job failed", e);
        }
    }

    // Spring tự động chạy dispatchDueReminders() lặp đi lặp lại, 
    // mỗi lần cách nhau 15 phút, và lần đầu tiên đợi 60 giây sau khi app khởi động.
    @Scheduled(fixedDelay = 900_000L, initialDelay = 60_000L)
    public void dispatchDueReminders() {
        try {
            dispatchService.dispatchDueReminders();
        } catch (Exception e) {
            log.error("dispatchDueReminders job failed", e);
        }
    }
}
