package com.jobtrackerai.reminder.service;

import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.reminder.dto.CreateReminderRequest;
import com.jobtrackerai.reminder.dto.ReminderResponse;
import com.jobtrackerai.reminder.entity.Reminder;
import com.jobtrackerai.reminder.entity.ReminderType;
import com.jobtrackerai.reminder.repository.ReminderRepository;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * CRUD reminder CUSTOM do user thao tác qua API. Ownership check tập trung
 * (findByIdAndUserId → 404 nếu không phải của mình). 2 loại auto do
 * ReminderDispatchService sinh — KHÔNG đi qua service này.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class ReminderService {

    private final ReminderRepository reminderRepository;
    private final ApplicationRepository applicationRepository;

    @Transactional
    public ReminderResponse create(Long userId, CreateReminderRequest req) {
        // Nếu gắn application → phải thuộc chính user này (tránh nhắc chéo app người khác).
        if (req.applicationId() != null) {
            applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(req.applicationId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        }

        Reminder reminder = new Reminder();
        reminder.setUserId(userId);
        reminder.setApplicationId(req.applicationId());
        reminder.setReminderType(ReminderType.CUSTOM);
        reminder.setTitle(req.title().strip());
        reminder.setDescription(req.description());
        reminder.setScheduledAt(req.scheduledAt());

        Reminder saved = reminderRepository.save(reminder);
        log.info("Reminder created (CUSTOM): userId={}, reminderId={}, appId={}",
                userId, saved.getId(), req.applicationId());
        return toResponse(saved);
    }

    // applicationId null → list toàn bộ reminder của user; có → chỉ reminder của app đó.
    public List<ReminderResponse> list(Long userId, Long applicationId) {
        List<Reminder> reminders = applicationId != null
                ? reminderRepository.findByUserIdAndApplicationIdOrderByScheduledAtDesc(userId, applicationId)
                : reminderRepository.findByUserIdOrderByScheduledAtDesc(userId);
        return reminders.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ReminderResponse dismiss(Long userId, Long id) {
        Reminder reminder = findOwnedOrThrow(userId, id);
        reminder.setDismissed(true);// = true tức là user chủ động bỏ qua thông báo
        reminderRepository.save(reminder);
        log.info("Reminder dismissed: userId={}, reminderId={}", userId, id);
        return toResponse(reminder);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Reminder reminder = findOwnedOrThrow(userId, id);
        reminderRepository.delete(reminder); // hard delete — reminder không soft delete
        log.info("Reminder deleted: userId={}, reminderId={}", userId, id);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Reminder findOwnedOrThrow(Long userId, Long id) {
        return reminderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found"));
    }

    private ReminderResponse toResponse(Reminder r) {
        return new ReminderResponse(
                r.getId(),
                r.getApplicationId(),
                r.getReminderType().name(),
                r.getTitle(),
                r.getDescription(),
                r.getScheduledAt(),
                r.getSentAt(),
                r.isDismissed(),
                r.getCreatedAt()
        );
    }
}
