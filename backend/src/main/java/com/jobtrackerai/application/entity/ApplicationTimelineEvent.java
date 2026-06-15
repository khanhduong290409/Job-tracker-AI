package com.jobtrackerai.application.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "application_timeline_events")
@Getter
@Setter
@NoArgsConstructor
public class ApplicationTimelineEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private TimelineEventType eventType;

    @Column(name = "event_date", nullable = false)
    private Instant eventDate;

    @Column(name = "title")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Schema chưa được định nghĩa — Phase 4+ sẽ fill khi implement AI analysis events
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
