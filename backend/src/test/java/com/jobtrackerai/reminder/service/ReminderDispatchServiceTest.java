package com.jobtrackerai.reminder.service;

import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.entity.ApplicationStatus;
import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.notification.entity.NotificationType;
import com.jobtrackerai.notification.service.NotificationService;
import com.jobtrackerai.reminder.entity.Reminder;
import com.jobtrackerai.reminder.entity.ReminderType;
import com.jobtrackerai.reminder.repository.ReminderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReminderDispatchServiceTest {

    @Mock private ReminderRepository reminderRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private ReminderDispatchService dispatchService;

    // ── Generator: FOLLOW_UP ────────────────────────────────────────────────────

    @Test
    void generate_followUp_skipsWhenReminderAlreadyExists() {
        Application app = buildApp(50L, 1L, ApplicationStatus.APPLIED);
        when(applicationRepository.findByStatusAndAppliedDateLessThanEqual(
                eq(ApplicationStatus.APPLIED), any())).thenReturn(List.of(app));
        when(reminderRepository.existsByApplicationIdAndReminderType(
                50L, ReminderType.FOLLOW_UP_AFTER_APPLY)).thenReturn(true); // dedup hit

        int created = dispatchService.generateAutoReminders();

        assertThat(created).isZero();
        verify(reminderRepository, never()).save(any());
    }

    @Test
    void generate_followUp_createsForNewApplication() {
        Application app = buildApp(50L, 1L, ApplicationStatus.APPLIED);
        when(applicationRepository.findByStatusAndAppliedDateLessThanEqual(
                eq(ApplicationStatus.APPLIED), any())).thenReturn(List.of(app));
        when(reminderRepository.existsByApplicationIdAndReminderType(
                50L, ReminderType.FOLLOW_UP_AFTER_APPLY)).thenReturn(false);

        int created = dispatchService.generateAutoReminders();

        assertThat(created).isEqualTo(1);
        ArgumentCaptor<Reminder> captor = ArgumentCaptor.forClass(Reminder.class);
        verify(reminderRepository).save(captor.capture());
        Reminder saved = captor.getValue();
        assertThat(saved.getReminderType()).isEqualTo(ReminderType.FOLLOW_UP_AFTER_APPLY);
        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getApplicationId()).isEqualTo(50L);
        assertThat(saved.getScheduledAt()).isNotNull(); // due ngay
    }

    // ── Generator: STATUS_STALE + terminal guard ────────────────────────────────

    @Test
    void generate_stale_createsAndExcludesTerminalStatuses() {
        Application app = buildApp(60L, 2L, ApplicationStatus.SAVED);
        when(applicationRepository.findStaleApplications(any(), any())).thenReturn(List.of(app));
        when(reminderRepository.existsByApplicationIdAndReminderType(
                60L, ReminderType.STATUS_STALE)).thenReturn(false);

        int created = dispatchService.generateAutoReminders();

        assertThat(created).isEqualTo(1);
        // Terminal guard: query nhận đúng danh sách trạng thái kết thúc để loại trừ
        verify(applicationRepository).findStaleApplications(
                eq(List.of(ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)),
                any());

        ArgumentCaptor<Reminder> captor = ArgumentCaptor.forClass(Reminder.class);
        verify(reminderRepository).save(captor.capture());
        assertThat(captor.getValue().getReminderType()).isEqualTo(ReminderType.STATUS_STALE);
    }

    // ── Dispatcher ──────────────────────────────────────────────────────────────

    @Test
    void dispatch_dueReminder_createsNotificationAndSetsSentAt() {
        Reminder reminder = buildReminder(5L, 1L, 12L); // gắn application 12

        when(reminderRepository.findDue(any())).thenReturn(List.of(reminder));

        int sent = dispatchService.dispatchDueReminders();

        assertThat(sent).isEqualTo(1);
        assertThat(reminder.getSentAt()).isNotNull(); // đánh dấu đã bắn
        verify(notificationService).create(
                eq(1L), eq(NotificationType.REMINDER),
                eq(reminder.getTitle()), eq(reminder.getDescription()),
                eq("/applications/12"), any());
        verify(reminderRepository).save(reminder);
    }

    @Test
    void dispatch_customReminderWithoutApplication_nullLinkUrl() {
        Reminder reminder = buildReminder(6L, 1L, null); // độc lập, không app

        when(reminderRepository.findDue(any())).thenReturn(List.of(reminder));

        dispatchService.dispatchDueReminders();

        verify(notificationService).create(
                eq(1L), eq(NotificationType.REMINDER),
                any(), any(), isNull(), any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Application buildApp(Long id, Long userId, ApplicationStatus status) {
        Application app = new Application();
        app.setId(id);
        app.setUserId(userId);
        app.setCompanyName("VNG");
        app.setPosition("Backend Intern");
        app.setStatus(status);
        return app;
    }

    private Reminder buildReminder(Long id, Long userId, Long applicationId) {
        Reminder r = new Reminder();
        r.setId(id);
        r.setUserId(userId);
        r.setApplicationId(applicationId);
        r.setReminderType(applicationId != null ? ReminderType.FOLLOW_UP_AFTER_APPLY : ReminderType.CUSTOM);
        r.setTitle("Theo dõi đơn");
        r.setDescription("nội dung nhắc");
        r.setScheduledAt(Instant.now());
        return r;
    }
}
