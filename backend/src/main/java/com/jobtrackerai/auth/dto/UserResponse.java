package com.jobtrackerai.auth.dto;

import com.jobtrackerai.user.entity.User;

import java.time.Instant;

public record UserResponse(
        Long id,
        String email,
        String fullName,
        String avatarUrl,
        boolean gmailConnected,
        Instant createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.isGmailConnected(),
                user.getCreatedAt()
        );
    }
}
