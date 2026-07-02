package com.jobtrackerai.application.service;

import com.jobtrackerai.application.dto.*;
import com.jobtrackerai.application.entity.*;
import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.application.repository.ApplicationStatusHistoryRepository;
import com.jobtrackerai.application.repository.ApplicationTimelineEventRepository;
import com.jobtrackerai.cv.repository.CvVersionRepository;
import com.jobtrackerai.shared.exception.BadRequestException;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository statusHistoryRepository;
    private final ApplicationTimelineEventRepository timelineEventRepository;
    private final CvVersionRepository cvVersionRepository;
    private final ApplicationStateMachine stateMachine;

    @Transactional
    public ApplicationResponse create(Long userId, CreateApplicationRequest req) {
        validateSalaryRange(req.salaryMin(), req.salaryMax());

        // Create = chụp ảnh thực tại: user nhập app đang ở trạng thái nào thì ghi đúng ở đó
        // (hỗ trợ backfill app đang dở dang). State machine chỉ quản lý các transition VỀ SAU.
        // Default SAVED nếu client không gửi status.
        ApplicationStatus status = req.status() != null ? req.status() : ApplicationStatus.SAVED;

        // Ownership: cvVersionId (nếu có) phải thuộc về chính user này.
        if (req.cvVersionId() != null) {
            cvVersionRepository.findByIdAndUserId(req.cvVersionId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
        }

        Application app = new Application();
        app.setUserId(userId);
        app.setCvVersionId(req.cvVersionId());
        app.setCompanyName(req.companyName().strip());
        app.setCompanyDomain(req.companyDomain());
        app.setPosition(req.position().strip());
        app.setLocation(req.location());
        app.setWorkType(req.workType());
        app.setEmploymentType(req.employmentType());
        app.setSalaryMin(req.salaryMin());
        app.setSalaryMax(req.salaryMax());
        app.setSalaryCurrency(req.salaryCurrency());
        app.setJdContent(req.jdContent());
        app.setJdUrl(req.jdUrl());
        app.setSource(req.source());
        app.setSourceDetail(req.sourceDetail());
        app.setAppliedDate(req.appliedDate());
        app.setStatus(status);
        app.setContactPerson(toContactPerson(req.contactPerson()));
        app.setNotes(req.notes());

        Application saved = applicationRepository.save(app);

        // Ghi baseline status history: from=null → to=status khởi tạo (audit đầy đủ từ đầu).
        recordStatusHistory(saved.getId(), null, status, null);

        log.info("Application created: userId={}, appId={}, status={}", userId, saved.getId(), status);
        return toDetailResponse(saved);
    }

    public Page<ApplicationListItemResponse> list(Long userId, ApplicationFilter filter, Pageable pageable) {
        // Repo dùng SpEL #statuses.isEmpty() → phải truyền list non-null (null sẽ NPE trong SpEL).
        List<ApplicationStatus> statuses =
                filter.getStatuses() != null ? filter.getStatuses() : Collections.emptyList();

        return applicationRepository.findByFilters(
                userId,
                statuses,
                filter.getSource(),
                filter.getSearch(),
                filter.getDateFrom(),
                filter.getDateTo(),
                pageable
        ).map(this::toListItem);
    }

    public ApplicationResponse getById(Long userId, Long id) {
        Application app = findOwnedOrThrow(userId, id);
        return toDetailResponse(app);
    }

    @Transactional
    public ApplicationResponse update(Long userId, Long id, UpdateApplicationRequest req) {
        Application app = findOwnedOrThrow(userId, id);

        // PATCH semantics: chỉ field non-null mới ghi đè, null = giữ nguyên.
        // Status KHÔNG đổi ở đây — dùng changeStatus() (state machine validate).
        if (req.getCompanyName() != null) app.setCompanyName(req.getCompanyName().strip());
        if (req.getCompanyDomain() != null) app.setCompanyDomain(req.getCompanyDomain());
        if (req.getPosition() != null) app.setPosition(req.getPosition().strip());
        if (req.getLocation() != null) app.setLocation(req.getLocation());
        if (req.getWorkType() != null) app.setWorkType(req.getWorkType());
        if (req.getEmploymentType() != null) app.setEmploymentType(req.getEmploymentType());
        if (req.getSalaryMin() != null) app.setSalaryMin(req.getSalaryMin());
        if (req.getSalaryMax() != null) app.setSalaryMax(req.getSalaryMax());
        if (req.getSalaryCurrency() != null) app.setSalaryCurrency(req.getSalaryCurrency());
        if (req.getJdContent() != null) app.setJdContent(req.getJdContent());
        if (req.getJdUrl() != null) app.setJdUrl(req.getJdUrl());
        if (req.getSource() != null) app.setSource(req.getSource());
        if (req.getSourceDetail() != null) app.setSourceDetail(req.getSourceDetail());
        if (req.getAppliedDate() != null) app.setAppliedDate(req.getAppliedDate());
        if (req.getContactPerson() != null) app.setContactPerson(toContactPerson(req.getContactPerson()));
        if (req.getNotes() != null) app.setNotes(req.getNotes());

        // Đổi CV: cvVersionId (nếu gửi) phải thuộc về chính user này (giống create()).
        if (req.getCvVersionId() != null) {
            cvVersionRepository.findByIdAndUserId(req.getCvVersionId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
            app.setCvVersionId(req.getCvVersionId());
        }

        // Validate sau khi merge: giá trị mới có thể đến từ req hoặc giá trị cũ trên entity.
        validateSalaryRange(app.getSalaryMin(), app.getSalaryMax());

        Application saved = applicationRepository.save(app);
        log.info("Application updated: userId={}, appId={}", userId, id);
        return toDetailResponse(saved);
    }

    @Transactional
    public ApplicationResponse changeStatus(Long userId, Long id, ChangeStatusRequest req) {
        Application app = findOwnedOrThrow(userId, id);
        ApplicationStatus from = app.getStatus();
        ApplicationStatus to = req.newStatus();

        // State machine throw InvalidStateTransitionException nếu transition không hợp lệ
        // (bao gồm cả từ terminal state hoặc chuyển sang chính nó).
        stateMachine.validateTransition(from, to);

        app.setStatus(to);
        applicationRepository.save(app);
        recordStatusHistory(id, from, to, req.note());

        log.info("Application status changed: appId={}, {} -> {}", id, from, to);
        return toDetailResponse(app);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Application app = findOwnedOrThrow(userId, id);
        // @SQLDelete trên entity → UPDATE SET deleted_at = NOW() (soft delete).
        applicationRepository.delete(app);
        log.info("Application soft-deleted: userId={}, appId={}", userId, id);
    }

    @Transactional
    public TimelineEventResponse addTimelineEvent(Long userId, Long id, CreateTimelineEventRequest req) {
        // Check ownership của application trước khi gắn event.
        findOwnedOrThrow(userId, id);

        ApplicationTimelineEvent event = new ApplicationTimelineEvent();
        event.setApplicationId(id);
        event.setEventType(req.eventType());
        event.setEventDate(req.eventDate());
        event.setTitle(req.title());
        event.setDescription(req.description());

        ApplicationTimelineEvent saved = timelineEventRepository.save(event);
        log.info("Timeline event added: appId={}, type={}", id, req.eventType());
        return toTimelineResponse(saved);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    // Ownership check tập trung: sai userId → 404 (không lộ resource tồn tại).
    private Application findOwnedOrThrow(Long userId, Long id) {
        return applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
    }

    private void validateSalaryRange(Integer min, Integer max) {
        if (min != null && max != null && min > max) {
            throw new BadRequestException("salaryMin must not be greater than salaryMax");
        }
    }

    private void recordStatusHistory(Long applicationId, ApplicationStatus from, ApplicationStatus to, String note) {
        ApplicationStatusHistory history = new ApplicationStatusHistory();
        history.setApplicationId(applicationId);
        history.setFromStatus(from);
        history.setToStatus(to);
        history.setNote(note);
        statusHistoryRepository.save(history);
    }

    private ContactPerson toContactPerson(ContactPersonRequest req) {
        if (req == null) {
            return null;
        }
        return new ContactPerson(req.name(), req.email(), req.phone(), req.role(), req.linkedinUrl());
    }

    private ApplicationResponse toDetailResponse(Application app) {
        List<StatusHistoryResponse> history =
                statusHistoryRepository.findByApplicationIdOrderByChangedAtDesc(app.getId())
                        .stream()
                        .map(h -> new StatusHistoryResponse(
                                h.getId(),
                                h.getFromStatus() != null ? h.getFromStatus().name() : null,
                                h.getToStatus().name(),
                                h.getNote(),
                                h.getChangedAt()))
                        .toList();
        // Ghi lại sự kiện do user tạo (ghi chú, lịch hẹn, v.v.)                    
        List<TimelineEventResponse> events =
                timelineEventRepository.findByApplicationIdOrderByEventDateDesc(app.getId())
                        .stream()
                        .map(this::toTimelineResponse)
                        .toList();

        return new ApplicationResponse(
                app.getId(),
                app.getCompanyName(),
                app.getCompanyDomain(),
                app.getPosition(),
                app.getLocation(),
                app.getWorkType() != null ? app.getWorkType().name() : null,
                app.getEmploymentType() != null ? app.getEmploymentType().name() : null,
                app.getSalaryMin(),
                app.getSalaryMax(),
                app.getSalaryCurrency(),
                app.getJdContent(),
                app.getJdUrl(),
                app.getSource().name(),
                app.getSourceDetail(),
                app.getAppliedDate(),
                app.getStatus().name(),
                app.getContactPerson(),
                app.getNotes(),
                app.getCvVersionId(),
                history,
                events,
                app.getCreatedAt(),
                app.getUpdatedAt()
        );
    }

    private ApplicationListItemResponse toListItem(Application app) {
        return new ApplicationListItemResponse(
                app.getId(),
                app.getCompanyName(),
                app.getCompanyDomain(),
                app.getPosition(),
                app.getLocation(),
                app.getWorkType() != null ? app.getWorkType().name() : null,
                app.getEmploymentType() != null ? app.getEmploymentType().name() : null,
                app.getStatus().name(),
                app.getSource().name(),
                app.getAppliedDate(),
                app.getCvVersionId(),
                app.getCreatedAt(),
                app.getUpdatedAt()
        );
    }

    private TimelineEventResponse toTimelineResponse(ApplicationTimelineEvent event) {
        return new TimelineEventResponse(
                event.getId(),
                event.getEventType().name(),
                event.getEventDate(),
                event.getTitle(),
                event.getDescription(),
                event.getCreatedAt()
        );
    }
}
