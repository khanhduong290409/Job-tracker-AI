package com.jobtrackerai.application.dto;

import java.time.Instant;

//Ghi lại sự kiện do user tạo (ghi chú, lịch hẹn, v.v.)  
public record TimelineEventResponse(
        Long id,
        String eventType,
        Instant eventDate,
        String title,
        String description,
        Instant createdAt
) {}
