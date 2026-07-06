package com.jobtrackerai.reminder.service;

import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.reminder.dto.CreateReminderRequest;
import com.jobtrackerai.reminder.dto.ReminderResponse;
import com.jobtrackerai.reminder.entity.Reminder;
import com.jobtrackerai.reminder.entity.ReminderType;
import com.jobtrackerai.reminder.repository.ReminderRepository;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReminderServiceOwnershipTest {

    @Mock private ReminderRepository reminderRepository;
    @Mock private ApplicationRepository applicationRepository;

    @InjectMocks private ReminderService reminderService;

    private final Instant future = Instant.now().plus(1, ChronoUnit.DAYS);

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    void create_withOtherUsersApplication_throwsNotFound() {
        // Gắn app không thuộc user → findByIdAndUserId... trả empty → 404
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(50L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> reminderService.create(1L,
                new CreateReminderRequest(50L, "Nhắc", null, future)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Application not found");

        verify(reminderRepository, never()).save(any());
    }

    @Test
    void create_ownApplication_savesCustomReminder() {
        Application app = new Application();
        app.setId(50L);
        app.setUserId(1L);
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(50L, 1L))
                .thenReturn(Optional.of(app));
        when(reminderRepository.save(any())).thenAnswer(i -> {
            Reminder r = i.getArgument(0);
            r.setId(9L);
            return r;
        });

        ReminderResponse response = reminderService.create(1L,
                new CreateReminderRequest(50L, "  Gọi HR  ", "chi tiết", future));

        assertThat(response.id()).isEqualTo(9L);
        assertThat(response.reminderType()).isEqualTo("CUSTOM"); // service hardcode CUSTOM
        assertThat(response.title()).isEqualTo("Gọi HR");        // title().strip()
        assertThat(response.applicationId()).isEqualTo(50L);
    }

    @Test
    void create_withoutApplication_skipsOwnershipCheck() {
        when(reminderRepository.save(any())).thenAnswer(i -> {
            Reminder r = i.getArgument(0);
            r.setId(3L);
            return r;
        });

        ReminderResponse response = reminderService.create(1L,
                new CreateReminderRequest(null, "Reminder độc lập", null, future));

        assertThat(response.applicationId()).isNull();
        // applicationId null → không đụng ApplicationRepository
        verify(applicationRepository, never()).findByIdAndUserIdAndDeletedAtIsNull(any(), any());
    }

    // ── dismiss ───────────────────────────────────────────────────────────────

    @Test
    void dismiss_wrongOwner_throwsNotFound() {
        when(reminderRepository.findByIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reminderService.dismiss(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(reminderRepository, never()).save(any());
    }

    @Test
    void dismiss_owner_setsDismissedTrue() {
        Reminder reminder = buildReminder(1L, 10L);
        when(reminderRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(reminder));

        ReminderResponse response = reminderService.dismiss(10L, 1L);

        assertThat(response.dismissed()).isTrue();
        verify(reminderRepository).save(reminder);
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    void delete_wrongOwner_throwsNotFound() {
        when(reminderRepository.findByIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reminderService.delete(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(reminderRepository, never()).delete(any());
    }

    @Test
    void delete_owner_hardDeletes() {
        Reminder reminder = buildReminder(1L, 10L);
        when(reminderRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(reminder));

        reminderService.delete(10L, 1L);

        verify(reminderRepository).delete(reminder);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Reminder buildReminder(Long id, Long userId) {
        Reminder r = new Reminder();
        r.setId(id);
        r.setUserId(userId);
        r.setReminderType(ReminderType.CUSTOM);
        r.setTitle("Test");
        r.setScheduledAt(future);
        return r;
    }
}
