package com.jobtrackerai.analytics.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * US-ANALYTICS-003 — số đơn (hoặc phỏng vấn) theo thời gian.
 *
 * metric: "applications" (theo applied_date) | "interviews" (status_history đổi sang vòng phỏng vấn).
 * interval: "day" | "week" | "month" — quyết định mốc gom (date_trunc trong query).
 * points: mỗi điểm = 1 mốc thời gian (period = đầu ngày/tuần/tháng) + count. Đã sort tăng dần theo period.
 */
public record TimeSeriesResponse(//số liệu biểu thị cho biểu đồ line 
        String metric,//nhãn applications hoặc interviews
        String interval,// "day" | "week" | "month"
        List<TimeSeriesPoint> points
) {

    public record TimeSeriesPoint(
            LocalDate period,//mốc thời gian của 1 điểm
            long count// số lượng ở mốc thời gian đó
    ) {}
}
