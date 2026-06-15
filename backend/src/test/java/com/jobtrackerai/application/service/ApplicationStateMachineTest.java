package com.jobtrackerai.application.service;

import com.jobtrackerai.application.entity.ApplicationStatus;
import com.jobtrackerai.shared.exception.InvalidStateTransitionException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Logic thuần — không cần mock, khởi tạo trực tiếp.
class ApplicationStateMachineTest {

    private final ApplicationStateMachine stateMachine = new ApplicationStateMachine();

    // ── Transition hợp lệ ───────────────────────────────────────────────────────

    @Test
    @DisplayName("Cho phép SAVED → APPLIED")
    void shouldAllowSavedToApplied() {
        assertThatCode(() -> stateMachine.validateTransition(
                ApplicationStatus.SAVED, ApplicationStatus.APPLIED))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Cho phép APPLIED → PHONE_SCREEN")
    void shouldAllowAppliedToPhoneScreen() {
        assertThatCode(() -> stateMachine.validateTransition(
                ApplicationStatus.APPLIED, ApplicationStatus.PHONE_SCREEN))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Cho phép OFFER → ACCEPTED")
    void shouldAllowOfferToAccepted() {
        assertThatCode(() -> stateMachine.validateTransition(
                ApplicationStatus.OFFER, ApplicationStatus.ACCEPTED))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Cho phép WITHDRAWN từ bất kỳ non-terminal nào (vd SAVED → WITHDRAWN)")
    void shouldAllowSavedToWithdrawn() {
        assertThatCode(() -> stateMachine.validateTransition(
                ApplicationStatus.SAVED, ApplicationStatus.WITHDRAWN))
                .doesNotThrowAnyException();
    }

    // ── Transition không hợp lệ ─────────────────────────────────────────────────

    @Test
    @DisplayName("Chặn APPLIED → ACCEPTED (phải đi qua OFFER)")
    void shouldRejectAppliedToAccepted() {
        assertThatThrownBy(() -> stateMachine.validateTransition(
                ApplicationStatus.APPLIED, ApplicationStatus.ACCEPTED))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("Cannot transition from APPLIED to ACCEPTED");
    }

    @Test
    @DisplayName("Chặn nhảy cóc SAVED → TECHNICAL_INTERVIEW")
    void shouldRejectSavedToTechnicalInterview() {
        assertThatThrownBy(() -> stateMachine.validateTransition(
                ApplicationStatus.SAVED, ApplicationStatus.TECHNICAL_INTERVIEW))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    @Test
    @DisplayName("Chặn chuyển sang chính nó (APPLIED → APPLIED)")
    void shouldRejectSelfTransition() {
        assertThatThrownBy(() -> stateMachine.validateTransition(
                ApplicationStatus.APPLIED, ApplicationStatus.APPLIED))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    // ── Terminal state — không có đường ra ──────────────────────────────────────

    @Test
    @DisplayName("Chặn mọi transition từ terminal ACCEPTED")
    void shouldRejectTransitionFromAccepted() {
        assertThatThrownBy(() -> stateMachine.validateTransition(
                ApplicationStatus.ACCEPTED, ApplicationStatus.OFFER))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    @Test
    @DisplayName("Chặn mọi transition từ terminal REJECTED")
    void shouldRejectTransitionFromRejected() {
        assertThatThrownBy(() -> stateMachine.validateTransition(
                ApplicationStatus.REJECTED, ApplicationStatus.APPLIED))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    @Test
    @DisplayName("Chặn mọi transition từ terminal WITHDRAWN")
    void shouldRejectTransitionFromWithdrawn() {
        assertThatThrownBy(() -> stateMachine.validateTransition(
                ApplicationStatus.WITHDRAWN, ApplicationStatus.APPLIED))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    // ── getAllowedTransitions ───────────────────────────────────────────────────

    @Test
    @DisplayName("getAllowedTransitions trả đúng tập cho APPLIED")
    void shouldReturnAllowedTransitionsForApplied() {
        assertThat(stateMachine.getAllowedTransitions(ApplicationStatus.APPLIED))
                .containsExactlyInAnyOrder(
                        ApplicationStatus.PHONE_SCREEN,
                        ApplicationStatus.TECHNICAL_INTERVIEW,
                        ApplicationStatus.REJECTED,
                        ApplicationStatus.WITHDRAWN);
    }

    @Test
    @DisplayName("getAllowedTransitions trả empty cho terminal state")
    void shouldReturnEmptyForTerminalState() {
        assertThat(stateMachine.getAllowedTransitions(ApplicationStatus.ACCEPTED)).isEmpty();
    }
}
