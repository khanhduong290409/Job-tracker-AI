package com.jobtrackerai.application.dto;

import com.jobtrackerai.application.entity.ApplicationSource;
import com.jobtrackerai.application.entity.EmploymentType;
import com.jobtrackerai.application.entity.WorkType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

// POJO class thay vì record — PATCH cần null-check từng field:
// null = "không gửi, giữ nguyên" vs non-null = "cập nhật giá trị mới"
@Getter
@Setter
@NoArgsConstructor
public class UpdateApplicationRequest {

    @Size(max = 255) private String companyName;
    @Size(max = 255) private String companyDomain;
    @Size(max = 255) private String position;
    @Size(max = 255) private String location;
    private WorkType workType;
    private EmploymentType employmentType;
    @Min(0) private Integer salaryMin;
    @Min(0) private Integer salaryMax;
    @Size(max = 10) private String salaryCurrency;
    @Size(min = 10, max = 50000) private String jdContent;
    @Size(max = 500) private String jdUrl;
    private ApplicationSource source;
    @Size(max = 255) private String sourceDetail;
    @PastOrPresent private LocalDate appliedDate;
    @Valid private ContactPersonRequest contactPerson;
    @Size(max = 10000) private String notes;
}
