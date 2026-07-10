package com.jobtrackerai.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtrackerai.notification.dto.NotificationResponse;
import com.jobtrackerai.notification.entity.Notification;
import com.jobtrackerai.notification.entity.NotificationType;
import com.jobtrackerai.notification.repository.NotificationRepository;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Quản lý notification in-app. create() gọi NỘI BỘ bởi ReminderDispatchService
 * (không expose qua API). Phần còn lại (list/unreadCount/markRead/markAllRead)
 * phục vụ NotificationController. Ownership check ở markRead.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    // Gọi nội bộ (dispatcher). metadata = payload phụ (reminderId, applicationId...) — có thể null.
    @Transactional
    public Notification create(Long userId, NotificationType type, String title,
                              String message, String linkUrl, Map<String, Object> metadata) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setLinkUrl(linkUrl);
        notification.setMetadata(toJson(metadata));

        Notification saved = notificationRepository.save(notification);
        log.info("Notification created: userId={}, notifId={}, type={}", userId, saved.getId(), type);
        return saved;
    }

    public Page<NotificationResponse> list(Long userId, boolean unreadOnly, Pageable pageable) {
        Page<Notification> page = unreadOnly
                ? notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId, pageable)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return page.map(this::toResponse);// tương đương page.map(n -> this.toResponse(n));

    }

    public long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public NotificationResponse markRead(Long userId, Long id) {
        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
        return toResponse(notification);
    }

    @Transactional
    public int markAllRead(Long userId) {
        int updated = notificationRepository.markAllRead(userId);
        log.info("Notifications marked all read: userId={}, count={}", userId, updated);
        return updated;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String toJson(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(metadata);// đọc object thành json string
            //Ví dụ: Map {applicationId=5, type="INTERVIEW"} → chuỗi "{\"applicationId\":5,\"type\":\"INTERVIEW\"}".
        } catch (JsonProcessingException e) {
            // metadata chỉ là payload phụ — không đáng làm hỏng việc tạo notification.
            // Log rồi bỏ qua (notification vẫn tạo được với metadata null).
            log.warn("Failed to serialize notification metadata, skipping: {}", e.getMessage());
            return null;
        }
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType().name(),
                n.getTitle(),
                n.getMessage(),
                n.getLinkUrl(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}
