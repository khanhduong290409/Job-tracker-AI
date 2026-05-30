package com.jobtrackerai.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Cấu hình 2 thread pool cho @Async:
 *   - aiTaskExecutor: AI calls + PDF parse (long-running, network-bound, retry)
 *   - emailTaskExecutor: Gmail send/sync (network-bound, smaller volume)
 *
 * Dùng: @Async("aiTaskExecutor") trên method service.
 *
 * Rejection policy CallerRunsPolicy: khi queue đầy → caller thread tự chạy task
 * (slow down requests thay vì drop). Bảo toàn không mất task.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "aiTaskExecutor")
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);// Luôn có sẵn 3 thread, kể cả lúc rảnh
        executor.setMaxPoolSize(10);// Tối đa 10 thread khi bận
        executor.setQueueCapacity(50);  // Hàng chờ tối đa 50 task
        executor.setThreadNamePrefix("ai-task-");// Tên thread khi log
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy()); // có giải thích CallerRunPolicy ở file note
        executor.initialize();//khởi động thread pool
        return executor;
    }

    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("email-task-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
