package com.jobtrackerai.auth.controller;

import com.jobtrackerai.auth.dto.AuthResponse;
import com.jobtrackerai.auth.dto.GoogleAuthRequest;
import com.jobtrackerai.auth.dto.LogoutRequest;
import com.jobtrackerai.auth.dto.RefreshRequest;
import com.jobtrackerai.auth.dto.UserResponse;
import com.jobtrackerai.auth.service.AuthService;
import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final SecurityUtils securityUtils;

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(
            @Valid @RequestBody GoogleAuthRequest request,
            HttpServletRequest httpRequest) {

        String userAgent = httpRequest.getHeader("User-Agent");//Đọc header User-Agent từ HTTP request — string mô tả trình duyệt/thiết bị của client.
        String ipAddress = httpRequest.getRemoteAddr();//Lấy IP address của client gửi request.


        AuthResponse data = authService.googleLogin(request, userAgent, ipAddress);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshRequest request) {

        AuthResponse data = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        authService.logout(userId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMe() {
        Long userId = securityUtils.getCurrentUserId();
        UserResponse data = authService.getMe(userId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
