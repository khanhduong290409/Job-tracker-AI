package com.jobtrackerai.shared.config;

import com.jobtrackerai.auth.security.JwtAuthenticationFilter;
import com.jobtrackerai.auth.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)// chỉ cần khi dùng sesion+cookie, app này dùng JWT stateless nên không cần
                .httpBasic(AbstractHttpConfigurer::disable)//tắt popup Basic Auth của trình duyệt
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))//spring không tạo httpsession, 
                // mỗi request tự xác thực lại qua jwt, server không lưu trạng thái
                .exceptionHandling(ex -> ex.authenticationEntryPoint(restAuthenticationEntryPoint))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                 "/actuator/health",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
/*
LỖI TRẢ VỀ 403 THAY VÌ 401

 Logic của nó (mấu chốt):

Nếu request chưa xác thực / anonymous → gọi AuthenticationEntryPoint.commence() (ý nghĩa: "bạn chưa đăng nhập, đây là cách để xác thực" → đáng lẽ là 401).
Nếu request đã xác thực nhưng thiếu quyền → gọi AccessDeniedHandler (→ 403).
*/