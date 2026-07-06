package com.jobtrackerai.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtrackerai.notification.dto.NotificationResponse;
import com.jobtrackerai.notification.entity.Notification;
import com.jobtrackerai.notification.entity.NotificationType;
import com.jobtrackerai.notification.repository.NotificationRepository;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceOwnershipTest {

    @Mock private NotificationRepository notificationRepository;
    // ObjectMapper thật (spy) để test serialize metadata round-trip
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks private NotificationService notificationService;

    // ── markRead ──────────────────────────────────────────────────────────────

    @Test
    void markRead_wrongOwner_throwsNotFound() {
        when(notificationRepository.findByIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markRead(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void markRead_owner_setsReadTrue() {
        Notification notification = new Notification();
        notification.setId(1L);
        notification.setUserId(10L);
        notification.setType(NotificationType.REMINDER);
        notification.setTitle("Nhắc");
        when(notificationRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(notification));

        NotificationResponse response = notificationService.markRead(10L, 1L);

        assertThat(response.read()).isTrue();
        verify(notificationRepository).save(notification);
    }

    // ── create (dispatcher gọi) ────────────────────────────────────────────────

    @Test
    void create_serializesMetadataToJson() {
        when(notificationRepository.save(any())).thenAnswer(i -> {
            Notification n = i.getArgument(0);
            n.setId(5L);
            return n;
        });

        Notification saved = notificationService.create(10L, NotificationType.REMINDER,
                "Theo dõi", "nội dung", "/applications/12",
                Map.of("reminderId", 7L, "applicationId", 12L));

        assertThat(saved.getId()).isEqualTo(5L);
        assertThat(saved.getLinkUrl()).isEqualTo("/applications/12");
        // Map → JSON string
        assertThat(saved.getMetadata()).contains("reminderId").contains("7");
    }

    @Test
    void create_nullMetadata_leavesMetadataNull() {
        when(notificationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Notification saved = notificationService.create(10L, NotificationType.REMINDER,
                "Theo dõi", null, null, null);

        assertThat(saved.getMetadata()).isNull();
    }
}
