package com.jobtrackerai.email.controller;

import com.jobtrackerai.email.dto.EmailDraftRequest;
import com.jobtrackerai.email.dto.EmailDraftResponse;
import com.jobtrackerai.email.service.EmailDraftService;
import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class EmailController {

    private final EmailDraftService emailDraftService;
    private final SecurityUtils securityUtils;

    /** AI soạn nháp email gửi HR cho 1 application (stateless — không lưu, không gửi). */
    @PostMapping("/applications/{id}/emails/draft")
    public ResponseEntity<ApiResponse<EmailDraftResponse>> draft(
            @PathVariable Long id,
            @Valid @RequestBody EmailDraftRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        EmailDraftResponse data = emailDraftService.draft(id, userId, request);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
