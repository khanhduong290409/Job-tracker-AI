package com.jobtrackerai.shared.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;

import java.time.Duration;
import java.util.Map;

/**
 * Redis cache config với TTL per cache name. Dùng JSON serializer (thay vì JDK
 * serialization mặc định) để cache values readable trong Redis CLI khi debug.
 *
 * TTL theo docs/04-ai-integration.md - AI cache lâu hơn để tiết kiệm token.
 * Dùng @Cacheable(value = "cache-name", key = "...") trong service.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeValuesWith(SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer()));
                        //GenericJackson2JsonRedisSerializer() - lưu cache dưới dạng json thay vì binary

        Map<String, RedisCacheConfiguration> perCacheConfigs = Map.of(
                "ai-cv-parse", defaultConfig.entryTtl(Duration.ofDays(90)),
                "ai-cv-jd-match", defaultConfig.entryTtl(Duration.ofDays(30)),
                "ai-jd-insight", defaultConfig.entryTtl(Duration.ofDays(30)),
                "ai-interview-prep", defaultConfig.entryTtl(Duration.ofDays(7)),
                "ai-pattern-analysis", defaultConfig.entryTtl(Duration.ofDays(1)),
                "user-profile", defaultConfig.entryTtl(Duration.ofMinutes(15))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(perCacheConfigs)
                .build();
    }
}
