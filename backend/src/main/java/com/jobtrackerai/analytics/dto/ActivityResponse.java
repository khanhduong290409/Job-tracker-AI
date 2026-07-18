package com.jobtrackerai.analytics.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * US-ANALYTICS-006 — heatmap hoạt động kiểu GitHub contributions.
 

 */
public record ActivityResponse(
        List<ActivityDay> days
) {

    public record ActivityDay(
            LocalDate date,
            long count//số hoạt động trong ngày(hoạt động ở đây là thay đổi status)
    ) {}
}
