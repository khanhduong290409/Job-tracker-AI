package com.jobtrackerai.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtrackerai.shared.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Trả 401 + body ApiResponse khi request CHƯA xác thực truy cập endpoint cần auth
 * (vd thiếu token hoàn toàn). Thay default Http403ForbiddenEntryPoint của Spring (trả 403).
 *
 * Lưu ý: token sai/hết hạn đã được {@link JwtAuthenticationFilter} bắt và trả 401 trực tiếp;
 * entry point này chỉ cho nhánh "không có token → SecurityContext rỗng → bị từ chối".
 */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;
    //ObjectMapper là class chính của thư viện Jackson, dùng để chuyển đổi giữa JSON và Java object.
    
    //Spring tự gọi method này khi request chưa xác thực.
    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(),
                ApiResponse.error("UNAUTHORIZED", "Authentication required"));
    }//tạo object response lỗi theo format chuẩn của project, client nhận được dạng:
}//{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }

