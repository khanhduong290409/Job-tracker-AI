package com.jobtrackerai.user.dto;

import com.jobtrackerai.user.entity.NotificationPreferences;
import com.jobtrackerai.user.entity.User;

import java.time.Instant;

/**
 * Response cho GET /users/me. Khác UserResponse (auth) ở chỗ kèm
 * notificationPreferences — phục vụ trang Settings. Tách DTO riêng để không
 * đổi shape response của luồng auth (login/refresh dùng UserResponse).
 */
public record UserProfileResponse(
        Long id,
        String email,
        String fullName,
        String avatarUrl,
        boolean gmailConnected,
        NotificationPreferences notificationPreferences,
        Instant createdAt
) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.isGmailConnected(),
                user.getNotificationPreferences(),
                user.getCreatedAt()
        );
    }
}
