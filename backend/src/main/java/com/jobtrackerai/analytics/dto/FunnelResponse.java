package com.jobtrackerai.analytics.dto;

import java.util.List;

/**
 * US-ANALYTICS-002 — phễu tuyển dụng: APPLIED → PHONE_SCREEN → TECHNICAL_INTERVIEW → ONSITE → OFFER.
 *
 * count = số đơn TỪNG đạt tới stage đó (đọc từ application_status_history.to_status),
 * KHÔNG phải số đơn đang ở stage đó — mới đúng nghĩa phễu (đã đi qua thì luôn tính).
 * conversionRate = count[i] / count[i-1]; stage đầu (APPLIED) = 1.0.
 */
public record FunnelResponse(
        List<FunnelStage> stages
) {

    public record FunnelStage(
            String stage,
            long count,
            double conversionRate//tỉ lệ chuyển đổi = count(stage này)/count(stage trước)
    ) {}
}
