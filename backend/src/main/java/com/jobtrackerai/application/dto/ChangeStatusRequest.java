package com.jobtrackerai.application.dto;

import com.jobtrackerai.application.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChangeStatusRequest(
        @NotNull ApplicationStatus newStatus,
        @Size(max = 1000) String note
) {}
