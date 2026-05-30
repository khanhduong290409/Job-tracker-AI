package com.jobtrackerai.shared.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Spring Security skeleton cho Phase 0.
 *   - Stateless (JWT thay vì session)
 *   - Apply CORS từ CorsConfig
 *   - Disable CSRF (API stateless không cần)
 *   - Disable HTTP Basic + Form login (default Spring Security)
 *   - Permit public endpoints (actuator, swagger, /auth/**)
 *   - Tất cả endpoint khác require authentication
 *
 * Phase 1 sẽ thêm: JwtAuthFilter trước UsernamePasswordAuthenticationFilter,
 * AuthenticationEntryPoint trả 401 JSON, security headers (CSP, HSTS).
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()   // Phase 1 endpoints
                        .anyRequest().authenticated()
                );
        return http.build();
    }
}
