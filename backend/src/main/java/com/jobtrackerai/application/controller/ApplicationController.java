package com.jobtrackerai.application.controller;

import com.jobtrackerai.application.dto.*;
import com.jobtrackerai.application.service.ApplicationService;
import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.dto.PagedResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class ApplicationController {

    // Whitelist field được phép sort — chặn sort theo field tùy ý (an toàn + tránh lỗi property không tồn tại)
    private static final Set<String> SORTABLE = Set.of("appliedDate", "createdAt", "companyName");
    private static final int MAX_PAGE_SIZE = 100;

    private final ApplicationService applicationService;
    private final SecurityUtils securityUtils;

    @PostMapping
    public ResponseEntity<ApiResponse<ApplicationResponse>> create(
            @Valid @RequestBody CreateApplicationRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        ApplicationResponse data = applicationService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(data));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ApplicationListItemResponse>>> list(
            @ModelAttribute ApplicationFilter filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,//số item trong 1 trang
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Long userId = securityUtils.getCurrentUserId();
        Pageable pageable = buildPageable(page, size, sortBy, sortDir);
        PagedResponse<ApplicationListItemResponse> data =
                PagedResponse.of(applicationService.list(userId, filter, pageable));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationResponse>> getById(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        ApplicationResponse data = applicationService.getById(userId, id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateApplicationRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        ApplicationResponse data = applicationService.update(userId, id, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ApplicationResponse>> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody ChangeStatusRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        ApplicationResponse data = applicationService.changeStatus(userId, id, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        applicationService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/timeline-events")
    public ResponseEntity<ApiResponse<TimelineEventResponse>> addTimelineEvent(
            @PathVariable Long id,
            @Valid @RequestBody CreateTimelineEventRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        TimelineEventResponse data = applicationService.addTimelineEvent(userId, id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(data));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    // Tự build Pageable từ query param (sortBy/sortDir riêng theo contract) thay vì dùng
    // Spring Pageable resolver (?sort=field,dir) — để whitelist field + cap size.
    private Pageable buildPageable(int page, int size, String sortBy, String sortDir) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String sortField = SORTABLE.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        //Sort.Direction là enum của Spring, chỉ có 2 giá trị: ASC (tăng dần) và DESC (giảm dần).
        return PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));
    }//PageRequest.of(...) là một static factory method của Spring Data — dùng để tạo ra một object Pageable
}
