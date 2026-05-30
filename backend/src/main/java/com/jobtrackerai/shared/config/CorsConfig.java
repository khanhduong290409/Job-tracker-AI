package com.jobtrackerai.shared.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS config — cho phép frontend (cross-origin) gọi backend API.
 * Origins đọc từ env var APP_CORS_ALLOWED_ORIGINS (comma-separated).
 *
 * Wire vào SecurityFilterChain ở SecurityConfig (file 14).
 */
@Configuration
public class CorsConfig {

    private final List<String> allowedOrigins;

    public CorsConfig(@Value("#{'${app.cors.allowed-origins}'.split(',')}") List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);   // browser cache preflight response 1 giờ

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
