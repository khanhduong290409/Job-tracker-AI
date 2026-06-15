package com.jobtrackerai.application.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "application_status_history")
@Getter
@Setter
@NoArgsConstructor
public class ApplicationStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status")
    private ApplicationStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false)
    private ApplicationStatus toStatus;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    @PrePersist
    void onCreate() {
        changedAt = Instant.now();
    }
}
