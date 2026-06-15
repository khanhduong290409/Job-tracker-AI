package com.jobtrackerai.application.service;

import com.jobtrackerai.application.dto.ApplicationResponse;
import com.jobtrackerai.application.dto.ChangeStatusRequest;
import com.jobtrackerai.application.dto.CreateApplicationRequest;
import com.jobtrackerai.application.dto.CreateTimelineEventRequest;
import com.jobtrackerai.application.dto.TimelineEventResponse;
import com.jobtrackerai.application.dto.UpdateApplicationRequest;
import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.entity.ApplicationSource;
import com.jobtrackerai.application.entity.ApplicationStatus;
import com.jobtrackerai.application.entity.ApplicationTimelineEvent;
import com.jobtrackerai.application.entity.TimelineEventType;
import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.application.repository.ApplicationStatusHistoryRepository;
import com.jobtrackerai.application.repository.ApplicationTimelineEventRepository;
import com.jobtrackerai.cv.entity.CvVersion;
import com.jobtrackerai.cv.repository.CvVersionRepository;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceOwnershipTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationStatusHistoryRepository statusHistoryRepository;
    @Mock private ApplicationTimelineEventRepository timelineEventRepository;
    @Mock private CvVersionRepository cvVersionRepository;
    @Mock private ApplicationStateMachine stateMachine;

    @InjectMocks private ApplicationService applicationService;

    // ── getById ───────────────────────────────────────────────────────────────

    @Test
    void getById_ownerCanAccess() {
        Application app = buildApp(1L, 10L, ApplicationStatus.APPLIED);
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 10L))
                .thenReturn(Optional.of(app));
        stubEmptyChildren();

        ApplicationResponse response = applicationService.getById(10L, 1L);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.companyName()).isEqualTo("VNG");
    }

    @Test
    void getById_wrongOwner_throwsNotFound() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.getById(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Application not found");
    }

    // ── update ──────────────────────────────────────────────────────────────────

    @Test
    void update_wrongOwner_throwsNotFound() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.update(99L, 1L, new UpdateApplicationRequest()))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(applicationRepository, never()).save(any());
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    void delete_ownerCanDelete() {
        Application app = buildApp(1L, 10L, ApplicationStatus.APPLIED);
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 10L))
                .thenReturn(Optional.of(app));

        applicationService.delete(10L, 1L);

        verify(applicationRepository).delete(app); // @SQLDelete → UPDATE SET deleted_at = NOW()
    }

    @Test
    void delete_wrongOwner_throwsNotFound() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.delete(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(applicationRepository, never()).delete(any());
    }

    // ── changeStatus ────────────────────────────────────────────────────────────

    @Test
    void changeStatus_wrongOwner_throwsNotFound() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.changeStatus(
                99L, 1L, new ChangeStatusRequest(ApplicationStatus.PHONE_SCREEN, null)))
                .isInstanceOf(ResourceNotFoundException.class);

        // Ownership fail trước → không được validate transition hay ghi history
        verify(stateMachine, never()).validateTransition(any(), any());
        verify(statusHistoryRepository, never()).save(any());
    }

    @Test
    void changeStatus_ownerValidTransition_savesHistory() {
        Application app = buildApp(1L, 10L, ApplicationStatus.APPLIED);
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 10L))
                .thenReturn(Optional.of(app));
        stubEmptyChildren();

        ApplicationResponse response = applicationService.changeStatus(
                10L, 1L, new ChangeStatusRequest(ApplicationStatus.PHONE_SCREEN, "Đã hẹn lịch"));

        assertThat(response.status()).isEqualTo("PHONE_SCREEN");
        verify(stateMachine).validateTransition(ApplicationStatus.APPLIED, ApplicationStatus.PHONE_SCREEN);
        verify(statusHistoryRepository).save(any());
        verify(applicationRepository).save(app);
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    void create_withOtherUsersCv_throwsNotFound() {
        // CV không thuộc currentUser → findByIdAndUserId trả empty → 404 (ownership-safe)
        when(cvVersionRepository.findByIdAndUserId(50L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.create(1L, buildCreateRequest(50L)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("CV version not found");

        verify(applicationRepository, never()).save(any());
    }

    @Test
    void create_withOwnCv_succeeds() {
        CvVersion ownCv = new CvVersion();
        ownCv.setId(50L);
        ownCv.setUserId(1L);
        when(cvVersionRepository.findByIdAndUserId(50L, 1L)).thenReturn(Optional.of(ownCv));
        when(applicationRepository.save(any())).thenAnswer(i -> {
            Application a = i.getArgument(0);
            a.setId(100L);
            return a;
        });
        stubEmptyChildren();

        ApplicationResponse response = applicationService.create(1L, buildCreateRequest(50L));

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.status()).isEqualTo("APPLIED");
        verify(applicationRepository).save(any());
        verify(statusHistoryRepository).save(any()); // baseline history null → APPLIED
    }

    // ── addTimelineEvent ──────────────────────────────────────────────────────

    @Test
    void addTimelineEvent_wrongOwner_throwsNotFound() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.addTimelineEvent(
                99L, 1L, new CreateTimelineEventRequest(
                        TimelineEventType.NOTE, Instant.now(), "T", "D")))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(timelineEventRepository, never()).save(any());
    }

    @Test
    void addTimelineEvent_owner_succeeds() {
        Application app = buildApp(1L, 10L, ApplicationStatus.APPLIED);
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(1L, 10L))
                .thenReturn(Optional.of(app));
        when(timelineEventRepository.save(any())).thenAnswer(i -> {
            ApplicationTimelineEvent e = i.getArgument(0);
            e.setId(7L);
            return e;
        });

        TimelineEventResponse response = applicationService.addTimelineEvent(
                10L, 1L, new CreateTimelineEventRequest(
                        TimelineEventType.PHONE_SCREEN, Instant.now(), "Round 1", "Java"));

        assertThat(response.id()).isEqualTo(7L);
        assertThat(response.eventType()).isEqualTo("PHONE_SCREEN");
        assertThat(response.title()).isEqualTo("Round 1");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    // Stub 2 query con để toDetailResponse() không NPE khi map (mock trả null mặc định)
    private void stubEmptyChildren() {
        when(statusHistoryRepository.findByApplicationIdOrderByChangedAtDesc(anyLong()))
                .thenReturn(List.of());
        when(timelineEventRepository.findByApplicationIdOrderByEventDateDesc(anyLong()))
                .thenReturn(List.of());
    }//Bất cứ khi nào code gọi 2 method repository này (với id bất kỳ), hãy trả về list rỗng thay vì chạy thật xuống DB

    private Application buildApp(Long id, Long userId, ApplicationStatus status) {
        Application app = new Application();
        app.setId(id);
        app.setUserId(userId);
        app.setCompanyName("VNG");
        app.setPosition("Backend Intern");
        app.setSource(ApplicationSource.ITVIEC);
        app.setStatus(status);
        return app;
    }

    private CreateApplicationRequest buildCreateRequest(Long cvVersionId) {
        return new CreateApplicationRequest(
                "Tech Corp", null, "Backend Intern", null, null, null,
                null, null, null, "Valid JD content here", null,
                ApplicationSource.ITVIEC, null, null,
                ApplicationStatus.APPLIED, cvVersionId, null, null);
    }
}
