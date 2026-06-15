package com.jobtrackerai.application.repository;

import com.jobtrackerai.application.entity.ApplicationTimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationTimelineEventRepository extends JpaRepository<ApplicationTimelineEvent, Long> {

    List<ApplicationTimelineEvent> findByApplicationIdOrderByEventDateDesc(Long applicationId);
}
