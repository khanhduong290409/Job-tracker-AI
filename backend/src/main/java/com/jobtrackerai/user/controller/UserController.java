package com.jobtrackerai.user.controller;

import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import com.jobtrackerai.user.dto.NotificationPreferencesRequest;
import com.jobtrackerai.user.dto.UserProfileResponse;
import com.jobtrackerai.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SecurityUtils securityUtils;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMe() {
        Long userId = securityUtils.getCurrentUserId();
        UserProfileResponse data = userService.getMe(userId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/me/notification-preferences")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateNotificationPreferences(
            @Valid @RequestBody NotificationPreferencesRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        UserProfileResponse data = userService.updateNotificationPreferences(userId, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
