package com.jobtrackerai.application.dto;

import com.jobtrackerai.application.entity.ApplicationSource;
import com.jobtrackerai.application.entity.ApplicationStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

// POJO class thay vì record — @ModelAttribute cần no-arg constructor + setters để bind query params
@Getter
@Setter
@NoArgsConstructor
public class ApplicationFilter {

    // ?statuses=APPLIED&statuses=PHONE_SCREEN → Spring bind thành List
    private List<ApplicationStatus> statuses;
    private ApplicationSource source;
    private String search;
    private LocalDate dateFrom;
    private LocalDate dateTo;
}
