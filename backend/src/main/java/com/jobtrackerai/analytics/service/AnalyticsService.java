package com.jobtrackerai.analytics.service;

import com.jobtrackerai.analytics.dto.ActivityResponse;
import com.jobtrackerai.analytics.dto.ActivityResponse.ActivityDay;
import com.jobtrackerai.analytics.dto.FunnelResponse;
import com.jobtrackerai.analytics.dto.FunnelResponse.FunnelStage;
import com.jobtrackerai.analytics.dto.OverviewResponse;
import com.jobtrackerai.analytics.dto.OverviewResponse.MonthComparison;
import com.jobtrackerai.analytics.dto.SourceAnalysisResponse;
import com.jobtrackerai.analytics.dto.SourceAnalysisResponse.SourceStat;
import com.jobtrackerai.analytics.dto.TimeSeriesResponse;
import com.jobtrackerai.analytics.dto.TimeSeriesResponse.TimeSeriesPoint;
import com.jobtrackerai.analytics.repository.AnalyticsRepository;
import com.jobtrackerai.application.entity.ApplicationSource;
import com.jobtrackerai.application.entity.ApplicationStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Lõi Analytics — đọc số liệu tổng hợp cho 5 chart dashboard (US-001/002/003/004/006).
 *
 * @Transactional(readOnly = true): mỗi method chạy nhiều query đọc → gom 1 transaction read-only
 * cho nhất quán snapshot + Hibernate tối ưu (không dirty-check). KHÔNG ghi gì.
 * Ownership: mọi method nhận userId (controller lấy từ SecurityUtils) → repository lọc theo userId.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    // Status kết thúc — đơn ở đây không còn "đang chạy".
    private static final List<ApplicationStatus> TERMINAL_STATUSES = List.of(
            ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN);

    // Các bậc phễu, đúng thứ tự tiến trình.
    private static final List<ApplicationStatus> FUNNEL_STAGES = List.of(
            ApplicationStatus.APPLIED, ApplicationStatus.PHONE_SCREEN,
            ApplicationStatus.TECHNICAL_INTERVIEW, ApplicationStatus.ONSITE, ApplicationStatus.OFFER);

    private final AnalyticsRepository repository;

    public AnalyticsService(AnalyticsRepository repository) {
        this.repository = repository;
    }

    // ─────────────────────────── OVERVIEW (US-001) ───────────────────────────

    public OverviewResponse getOverview(Long userId) {
        long total = repository.countByUserId(userId);
        long active = repository.countByUserIdAndStatusNotIn(userId, TERMINAL_STATUSES);
        long offers = repository.countApplicationsReachedStatus(userId, ApplicationStatus.OFFER);
        double offerRate = total == 0 ? 0.0 : (double) offers / total;

        Double avg = repository.avgResponseTimeDays(userId);
        Double avgRounded = avg == null ? null : Math.round(avg * 10) / 10.0;

        return new OverviewResponse(total, active, offers, offerRate, avgRounded, buildMonthComparison(userId));
    }

    // So sánh tháng này (từ đầu tháng đến hôm nay) với tháng trước (trọn tháng).
    // Hai khoảng lệch độ dài (tháng này chưa hết) — chấp nhận cho metric demo; ranh giới tháng dùng UTC.
    private MonthComparison buildMonthComparison(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate thisMonthStart = today.withDayOfMonth(1);// ngày 1 tháng hiện tại
        LocalDate lastMonthStart = thisMonthStart.minusMonths(1);//lùi lại 1 tháng -> ngày 1 tháng trước

        long thisApps = repository.countByUserIdAndAppliedDateBetween(userId, thisMonthStart, today);
        long lastApps = repository.countByUserIdAndAppliedDateBetween(userId, lastMonthStart, thisMonthStart.minusDays(1));

        Instant thisMonthStartAt = thisMonthStart.atStartOfDay(ZoneOffset.UTC).toInstant();//atStartOfDay(...) = gắn thêm giờ 00:00:00 vào ngày đó → biến LocalDate thành LocalDateTime
        Instant lastMonthStartAt = lastMonthStart.atStartOfDay(ZoneOffset.UTC).toInstant();//Truyền ZoneOffset.UTC vào → nói rõ: "giờ 00:00:00 này tính theo múi giờ UTC" → kết quả là kiểu ZonedDateTime
        Instant tomorrowAt = today.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        long thisOffers = repository.countOffersReachedBetween(userId, ApplicationStatus.OFFER, thisMonthStartAt, tomorrowAt);
        long lastOffers = repository.countOffersReachedBetween(userId, ApplicationStatus.OFFER, lastMonthStartAt, thisMonthStartAt);

        return new MonthComparison(formatPercentChange(thisApps, lastApps), formatCountChange(thisOffers, lastOffers));
    }//phần trăm tăng bao nhiêu đơn so với tháng trước và chênh lệch các application nhận được offer so với tháng trước

    // "+15%" / "-8%" / "0%". Tháng trước = 0: coi 0→n là "+100%" (tăng trưởng vô cực, cap để hiển thị).
    private String formatPercentChange(long current, long previous) {
        if (previous == 0) {
            return current == 0 ? "0%" : "+100%";
        }
        long pct = Math.round((current - previous) * 100.0 / previous);
        return (pct >= 0 ? "+" : "") + pct + "%";
    }

    // "+1" / "-2" / "0" — chênh lệch tuyệt đối (dùng cho số offer, giá trị nhỏ nên hiện delta rõ hơn %).
    private String formatCountChange(long current, long previous) {
        long diff = current - previous;
        return (diff >= 0 ? "+" : "") + diff;
    }

    // ─────────────────────────── FUNNEL (US-002) ───────────────────────────

    public FunnelResponse getFunnel(Long userId) {
        Map<ApplicationStatus, Long> counts = new LinkedHashMap<>();
        for (Object[] row : repository.countByReachedStage(userId, FUNNEL_STAGES)) {
            counts.put((ApplicationStatus) row[0], (Long) row[1]);
        }

        List<FunnelStage> stages = new ArrayList<>();
        long previousCount = 0;
        for (int i = 0; i < FUNNEL_STAGES.size(); i++) {
            ApplicationStatus stage = FUNNEL_STAGES.get(i);
            long count = counts.getOrDefault(stage, 0L);
            // Bậc đầu (APPLIED) = 1.0; bậc sau = count / bậc-trước (0 nếu bậc trước rỗng → tránh chia 0).
            double conversion = i == 0 ? 1.0 : (previousCount == 0 ? 0.0 : (double) count / previousCount);
            stages.add(new FunnelStage(stage.name(), count, conversion));
            previousCount = count;
        }
        return new FunnelResponse(stages);
    }

    // ─────────────────────────── SOURCES (US-004) ───────────────────────────
    //trả về tỉ lệ nguồn ứng tuyển 
    public SourceAnalysisResponse getSources(Long userId) {
        Map<ApplicationSource, Long> totals = new LinkedHashMap<>();
        for (Object[] row : repository.countBySource(userId)) {
            totals.put((ApplicationSource) row[0], (Long) row[1]);
        }
        Map<ApplicationSource, Long> offers = new LinkedHashMap<>();
        for (Object[] row : repository.countOffersBySource(userId, ApplicationStatus.OFFER)) {
            offers.put((ApplicationSource) row[0], (Long) row[1]);
        }
        //entryset trả về tập key-value
        List<SourceStat> sources = totals.entrySet().stream()
                .map(e -> {
                    long count = e.getValue();
                    long offerCount = offers.getOrDefault(e.getKey(), 0L);
                    double conversion = count == 0 ? 0.0 : (double) offerCount / count;
                    return new SourceStat(e.getKey().name(), count, offerCount, conversion);
                })
                .sorted((a, b) -> Long.compare(b.count(), a.count())) // nhiều đơn lên đầu
                .toList();
        return new SourceAnalysisResponse(sources);
    }

    // ─────────────────────────── TIME SERIES (US-003) ───────────────────────────
    // theo thời gian, số đơn nộp (hoặc số đơn vào phỏng vấn) biến động thế nào
    public TimeSeriesResponse getTimeSeries(Long userId, String metric, String interval, LocalDate from, LocalDate to) {
        String safeMetric = "interviews".equals(metric) ? "interviews" : "applications";
        //interviews -> số đơn chuyển sang vòng phỏng vấn, applications -> số đơn ứng tuyển
        String safeInterval = switch (interval == null ? "" : interval) {
            case "day", "month" -> interval;
            default -> "week";
        };
        LocalDate safeTo = to == null ? LocalDate.now() : to;
        LocalDate safeFrom = from == null ? safeTo.minusMonths(6) : from;

        List<Object[]> rows;
        if ("interviews".equals(safeMetric)) {
            Instant fromAt = safeFrom.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant toAt = safeTo.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            rows = repository.countInterviewsByPeriod(userId, safeInterval, fromAt, toAt);
        } else {//phía treen dùng instant vì interview so sánh bằng change at có cả giờ còn phía dưới chỉ dùng ngày vì so sánh bằng localdate
            rows = repository.countApplicationsByPeriod(userId, safeInterval, safeFrom, safeTo);
        }

        List<TimeSeriesPoint> points = rows.stream()
                .map(row -> new TimeSeriesPoint(toLocalDate(row[0]), toLong(row[1])))
                .toList();
        return new TimeSeriesResponse(safeMetric, safeInterval, points);
    }

    // ─────────────────────────── ACTIVITY HEATMAP (US-006) ───────────────────────────

    public ActivityResponse getActivity(Long userId, LocalDate from, LocalDate to) {
        LocalDate safeTo = to == null ? LocalDate.now() : to;
        LocalDate safeFrom = from == null ? safeTo.minusYears(1) : from; // mặc định 1 năm kiểu GitHub
        Instant fromAt = safeFrom.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toAt = safeTo.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        // Gộp 2 nguồn (đổi status + timeline event) theo ngày. TreeMap để sort tăng dần sẵn.
        Map<LocalDate, Long> perDay = new TreeMap<>();
        for (Object[] row : repository.countStatusChangesByDay(userId, fromAt, toAt)) {
            perDay.merge(toLocalDate(row[0]), toLong(row[1]), Long::sum);
        }//ở đây không put mà dùng merge để cộng dồn giá trị để cộng dồn số hoạt động trong ngày
        for (Object[] row : repository.countTimelineEventsByDay(userId, fromAt, toAt)) {
            perDay.merge(toLocalDate(row[0]), toLong(row[1]), Long::sum);
        }

        List<ActivityDay> days = perDay.entrySet().stream()
                .map(e -> new ActivityDay(e.getKey(), e.getValue()))
                .toList();
        return new ActivityResponse(days);
    }

    // ─────────────────────────── Helper map row native ───────────────────────────
    // Native query ::date → java.sql.Date; COUNT → Number (BigInteger/Long tùy driver). Chuẩn hóa về LocalDate/long.

    private static LocalDate toLocalDate(Object value) {
        return ((java.sql.Date) value).toLocalDate();
    }

    private static long toLong(Object value) {
        return ((Number) value).longValue();
    }
}
