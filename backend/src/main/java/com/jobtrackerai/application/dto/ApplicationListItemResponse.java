package com.jobtrackerai.application.dto;

import java.time.Instant;
import java.time.LocalDate;

// Response nhẹ cho list page — không include jdContent (text dài), statusHistory, timelineEvents
public record ApplicationListItemResponse(
        Long id,
        String companyName,
        String companyDomain,
        String position,
        String location,
        String workType,
        String employmentType,
        String status,
        String source,
        LocalDate appliedDate,
        Long cvVersionId,
        Instant createdAt,
        Instant updatedAt
) {}
