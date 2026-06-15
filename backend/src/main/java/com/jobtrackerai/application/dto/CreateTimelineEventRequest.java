package com.jobtrackerai.application.dto;

import com.jobtrackerai.application.entity.TimelineEventType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateTimelineEventRequest(
        @NotNull TimelineEventType eventType,
        @NotNull Instant eventDate,
        @Size(max = 255) String title,
        @Size(max = 5000) String description
) {}
