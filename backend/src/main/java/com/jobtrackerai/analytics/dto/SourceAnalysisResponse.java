package com.jobtrackerai.analytics.dto;

import java.util.List;

/**
 * US-ANALYTICS-004 — hiệu quả theo nguồn ứng tuyển (LinkedIn, ITViec, TopCV...).
 *
 * count = tổng đơn từ nguồn đó; offers = số đơn từng đạt OFFER (nhất quán với funnel & card offer);
 * conversionRate = offers / count. Sort giảm dần theo count (nguồn nhiều đơn lên đầu).
 */
public record SourceAnalysisResponse(
        List<SourceStat> sources
) {

    public record SourceStat(
            String source,
            long count,
            long offers,
            double conversionRate//tỉ lệ các application đạt được offer theo từng nguồn 
    ) {}
}
