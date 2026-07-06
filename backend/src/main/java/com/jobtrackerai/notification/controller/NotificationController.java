package com.jobtrackerai.notification.controller;

import com.jobtrackerai.notification.dto.NotificationResponse;
import com.jobtrackerai.notification.service.NotificationService;
import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.dto.PagedResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private static final int MAX_PAGE_SIZE = 100;

    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<NotificationResponse>>> list(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = securityUtils.getCurrentUserId();
        // Không truyền Sort — query đã có OrderByCreatedAtDesc.
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        PagedResponse<NotificationResponse> data =
                PagedResponse.of(notificationService.list(userId, unreadOnly, pageable));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Badge chuông: chỉ cần con số → tách endpoint nhẹ, FE poll định kỳ.
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> unreadCount() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(notificationService.unreadCount(userId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        NotificationResponse data = notificationService.markRead(userId, id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Integer>> markAllRead() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(notificationService.markAllRead(userId)));
    }
}
