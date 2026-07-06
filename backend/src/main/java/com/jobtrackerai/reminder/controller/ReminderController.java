package com.jobtrackerai.reminder.controller;

import com.jobtrackerai.reminder.dto.CreateReminderRequest;
import com.jobtrackerai.reminder.dto.ReminderResponse;
import com.jobtrackerai.reminder.service.ReminderService;
import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;
    private final SecurityUtils securityUtils;

    // applicationId optional: có → list reminder của app đó (dùng ở ApplicationDetailPage); không → toàn bộ
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReminderResponse>>> list(
            @RequestParam(required = false) Long applicationId) {
        Long userId = securityUtils.getCurrentUserId();
        List<ReminderResponse> data = reminderService.list(userId, applicationId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReminderResponse>> create(
            @Valid @RequestBody CreateReminderRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        ReminderResponse data = reminderService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(data));
    }

    @PutMapping("/{id}/dismiss")
    public ResponseEntity<ApiResponse<ReminderResponse>> dismiss(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        ReminderResponse data = reminderService.dismiss(userId, id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        reminderService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
