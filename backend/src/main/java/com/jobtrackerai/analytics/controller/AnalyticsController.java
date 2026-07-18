package com.jobtrackerai.analytics.controller;

import com.jobtrackerai.analytics.dto.ActivityResponse;
import com.jobtrackerai.analytics.dto.FunnelResponse;
import com.jobtrackerai.analytics.dto.OverviewResponse;
import com.jobtrackerai.analytics.dto.SourceAnalysisResponse;
import com.jobtrackerai.analytics.dto.TimeSeriesResponse;
import com.jobtrackerai.analytics.service.AnalyticsService;
import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Analytics Dashboard — 5 endpoint chỉ đọc số liệu của user hiện tại.
 * userId luôn lấy từ SecurityUtils (không nhận từ client) → không thể xem dashboard người khác.
 */
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final SecurityUtils securityUtils;

    /** US-001 — 4 ô số tổng quan + so tháng trước. */
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<OverviewResponse>> overview() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getOverview(userId)));
    }

    /** US-002 — phễu tuyển dụng APPLIED → OFFER. */
    @GetMapping("/funnel")
    public ResponseEntity<ApiResponse<FunnelResponse>> funnel() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getFunnel(userId)));
    }

    /**
     * US-003 — số đơn/phỏng vấn theo thời gian.
     * Param optional: metric (applications|interviews), interval (day|week|month), from, to (yyyy-MM-dd).
     * Thiếu/không hợp lệ → service tự dùng default (applications, week, 6 tháng gần nhất).
     */
    @GetMapping("/time-series")
    public ResponseEntity<ApiResponse<TimeSeriesResponse>> timeSeries(
            @RequestParam(required = false) String metric,
            @RequestParam(required = false) String interval,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getTimeSeries(userId, metric, interval, from, to)));
    }

    /** US-004 — count + conversion theo nguồn ứng tuyển. */
    @GetMapping("/sources")
    public ResponseEntity<ApiResponse<SourceAnalysisResponse>> sources() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getSources(userId)));
    }

    /**
     * US-006 — heatmap hoạt động theo ngày.
     * Param optional: from, to (yyyy-MM-dd). Thiếu → default 1 năm gần nhất.
     */
    @GetMapping("/activity")
    public ResponseEntity<ApiResponse<ActivityResponse>> activity(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getActivity(userId, from, to)));
    }
}
