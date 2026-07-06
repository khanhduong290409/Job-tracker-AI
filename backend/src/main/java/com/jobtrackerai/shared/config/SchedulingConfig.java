package com.jobtrackerai.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Bật @Scheduled toàn app (dùng bởi reminder/scheduler/ReminderJobs).
 * Tách riêng khỏi AsyncConfig (@EnableAsync) cho rõ trách nhiệm.
 *
 * Mặc định Spring chạy scheduled task trên 1 thread đơn, tuần tự. Với Phase 5 tải nhẹ
 * (2 job, đụng DB nhanh) là đủ. Nếu sau cần chạy song song → khai TaskScheduler pool riêng.
 */
@Configuration
@EnableScheduling // bật cơ chế gọi tự động theo chu kì
public class SchedulingConfig {
}
