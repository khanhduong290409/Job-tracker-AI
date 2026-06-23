package com.jobtrackerai.ai.controller;

import com.jobtrackerai.ai.dto.CvJdMatchResponse;
import com.jobtrackerai.ai.dto.ExtractJdRequest;
import com.jobtrackerai.ai.dto.JdInsightResponse;
import com.jobtrackerai.ai.service.AiAnalysisService;
import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AiController {

    private final AiAnalysisService aiAnalysisService;
    private final SecurityUtils securityUtils;

    /** Trích xuất insight từ JD thô — chưa gắn application (auto-fill form). Stateless, không cần ownership. */
    @PostMapping("/ai/extract-jd")
    public ResponseEntity<ApiResponse<JdInsightResponse>> extractJd(@Valid @RequestBody ExtractJdRequest request) {
        JdInsightResponse data = aiAnalysisService.extractJd(request.jdContent());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /** JD insight cho 1 application đã có (cache theo hash của JD). */
    @GetMapping("/applications/{id}/jd-insight")
    public ResponseEntity<ApiResponse<JdInsightResponse>> jdInsight(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        JdInsightResponse data = aiAnalysisService.getJdInsight(id, userId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /** Phân tích độ khớp CV–JD. force=true để bỏ qua cache, phân tích lại. */
    @GetMapping("/applications/{id}/cv-jd-match")
    public ResponseEntity<ApiResponse<CvJdMatchResponse>> cvJdMatch(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean force) {
        Long userId = securityUtils.getCurrentUserId();
        CvJdMatchResponse data = aiAnalysisService.getCvJdMatch(id, userId, force);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
