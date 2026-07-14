package com.jobtrackerai.user.service;

import com.jobtrackerai.user.dto.NotificationPreferencesRequest;
import com.jobtrackerai.user.dto.UserProfileResponse;
import com.jobtrackerai.user.entity.User;
import com.jobtrackerai.user.repository.UserRepository;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Profile + notification preferences của user hiện tại. Ownership tự nhiên:
 * mọi thao tác khóa theo userId lấy từ JWT (SecurityUtils ở controller) —
 * user chỉ đọc/sửa chính mình.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    public UserProfileResponse getMe(Long userId) {
        User user = findActiveOrThrow(userId);
        return UserProfileResponse.from(user);
    }

    @Transactional
    public UserProfileResponse updateNotificationPreferences(Long userId, NotificationPreferencesRequest request) {
        User user = findActiveOrThrow(userId);
        user.setNotificationPreferences(request.toPreferences());
        userRepository.save(user);
        log.info("Notification preferences updated: userId={}, inApp={}, email={}",
                userId, request.inApp(), request.email());
        return UserProfileResponse.from(user);
    }

    private User findActiveOrThrow(Long userId) {
        return userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
