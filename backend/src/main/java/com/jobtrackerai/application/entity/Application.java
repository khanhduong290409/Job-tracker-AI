package com.jobtrackerai.application.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "applications")
@Getter
@Setter
@NoArgsConstructor
@SQLDelete(sql = "UPDATE applications SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "cv_version_id")
    private Long cvVersionId;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(name = "company_domain")
    private String companyDomain;

    @Column(nullable = false)
    private String position;

    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_type")
    private WorkType workType;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type")
    private EmploymentType employmentType;

    @Column(name = "salary_min")
    private Integer salaryMin;

    @Column(name = "salary_max")
    private Integer salaryMax;

    @Column(name = "salary_currency")
    private String salaryCurrency;

    @Column(name = "jd_content", columnDefinition = "TEXT", nullable = false)
    private String jdContent;

    @Column(name = "jd_url")
    private String jdUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationSource source;

    @Column(name = "source_detail")
    private String sourceDetail;

    @Column(name = "applied_date")
    private LocalDate appliedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status = ApplicationStatus.SAVED;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contact_person", columnDefinition = "jsonb")
    private ContactPerson contactPerson;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
