package com.jobtrackerai.application.dto;

import com.jobtrackerai.application.entity.ContactPerson;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

// Response đầy đủ cho detail page — include jdContent, statusHistory, timelineEvents
public record ApplicationResponse(
        Long id,
        String companyName,
        String companyDomain,
        String position,
        String location,
        String workType,
        String employmentType,
        Integer salaryMin,
        Integer salaryMax,
        String salaryCurrency,
        String jdContent,
        String jdUrl,
        String source,
        String sourceDetail,
        LocalDate appliedDate,
        String status,
        ContactPerson contactPerson,
        String notes,
        Long cvVersionId,
        List<StatusHistoryResponse> statusHistory,
        List<TimelineEventResponse> timelineEvents,
        Instant createdAt,
        Instant updatedAt
) {}
