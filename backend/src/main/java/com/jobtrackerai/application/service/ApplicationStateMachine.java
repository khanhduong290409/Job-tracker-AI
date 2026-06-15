package com.jobtrackerai.application.service;

import com.jobtrackerai.application.entity.ApplicationStatus;
import com.jobtrackerai.shared.exception.InvalidStateTransitionException;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;
import java.util.Set;

@Component
public class ApplicationStateMachine {

    // Chỉ định nghĩa các trạng thái CÓ transition. Terminal states (ACCEPTED, REJECTED, WITHDRAWN)
    // không có trong map → getOrDefault trả empty set → validateTransition luôn throw.
    private static final Map<ApplicationStatus, Set<ApplicationStatus>> TRANSITIONS = Map.of(
            ApplicationStatus.SAVED,
                Set.of(ApplicationStatus.APPLIED, ApplicationStatus.WITHDRAWN),
            ApplicationStatus.APPLIED,
                Set.of(ApplicationStatus.PHONE_SCREEN, ApplicationStatus.TECHNICAL_INTERVIEW,
                        ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN),
            ApplicationStatus.PHONE_SCREEN,
                Set.of(ApplicationStatus.TECHNICAL_INTERVIEW,
                        ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN),
            ApplicationStatus.TECHNICAL_INTERVIEW,
                Set.of(ApplicationStatus.ONSITE, ApplicationStatus.OFFER,
                        ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN),
            ApplicationStatus.ONSITE,
                Set.of(ApplicationStatus.OFFER, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN),
            ApplicationStatus.OFFER,
                Set.of(ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)
    );

    public void validateTransition(ApplicationStatus from, ApplicationStatus to) {
        Set<ApplicationStatus> allowed = TRANSITIONS.getOrDefault(from, Collections.emptySet());
        //Lấy tập hợp các trạng thái được phép từ trạng thái from. Nếu from không tồn tại trong map, trả về một Set rỗng thay vì null.
        if (!allowed.contains(to)) {
            throw new InvalidStateTransitionException(
                    String.format("Cannot transition from %s to %s", from, to)
            );
        }
    }

    public Set<ApplicationStatus> getAllowedTransitions(ApplicationStatus from) {
        return TRANSITIONS.getOrDefault(from, Collections.emptySet());
    }
}
