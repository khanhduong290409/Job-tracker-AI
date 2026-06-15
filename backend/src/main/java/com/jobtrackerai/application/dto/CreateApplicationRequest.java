package com.jobtrackerai.application.dto;

import com.jobtrackerai.application.entity.ApplicationSource;
import com.jobtrackerai.application.entity.ApplicationStatus;
import com.jobtrackerai.application.entity.EmploymentType;
import com.jobtrackerai.application.entity.WorkType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record CreateApplicationRequest(
        @NotBlank @Size(max = 255) String companyName,
        @Size(max = 255) String companyDomain,
        @NotBlank @Size(max = 255) String position,
        @Size(max = 255) String location,
        WorkType workType,
        EmploymentType employmentType,
        @Min(0) Integer salaryMin,
        @Min(0) Integer salaryMax,
        @Size(max = 10) String salaryCurrency,
        @NotBlank @Size(min = 10, max = 50000) String jdContent,
        @Size(max = 500) String jdUrl,
        @NotNull ApplicationSource source,
        @Size(max = 255) String sourceDetail,
        @PastOrPresent LocalDate appliedDate,
        // Optional — không gửi thì default SAVED. Cho phép mọi status để backfill app đang dở dang.
        ApplicationStatus status,
        Long cvVersionId,
        @Valid ContactPersonRequest contactPerson,
        @Size(max = 10000) String notes
) {}
