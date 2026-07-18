package com.jobtrackerai.analytics.service;

import com.jobtrackerai.analytics.dto.ActivityResponse;
import com.jobtrackerai.analytics.dto.FunnelResponse;
import com.jobtrackerai.analytics.dto.OverviewResponse;
import com.jobtrackerai.analytics.dto.SourceAnalysisResponse;
import com.jobtrackerai.analytics.dto.TimeSeriesResponse;
import com.jobtrackerai.analytics.repository.AnalyticsRepository;
import com.jobtrackerai.application.entity.ApplicationSource;
import com.jobtrackerai.application.entity.ApplicationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test logic TÍNH của AnalyticsService (offerRate, conversion funnel, so-tháng, merge heatmap) —
 * repository mock, không đụng DB. Query SQL đúng hay không phải verify khi chạy app thật.
 */
@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    private static final Long USER = 10L;

    @Mock private AnalyticsRepository repository;
    private AnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new AnalyticsService(repository);
    }

    @Test
    void getOverview_computesOfferRateAndComparison() {
        when(repository.countByUserId(USER)).thenReturn(25L);
        when(repository.countByUserIdAndStatusNotIn(eq(USER), any())).thenReturn(8L);
        when(repository.countApplicationsReachedStatus(USER, ApplicationStatus.OFFER)).thenReturn(2L);
        when(repository.avgResponseTimeDays(USER)).thenReturn(5.16);
        // 2 lần gọi: tháng này rồi tháng trước
        when(repository.countByUserIdAndAppliedDateBetween(eq(USER), any(), any())).thenReturn(12L, 10L);
        when(repository.countOffersReachedBetween(eq(USER), eq(ApplicationStatus.OFFER), any(), any())).thenReturn(2L, 1L);

        OverviewResponse res = service.getOverview(USER);

        assertThat(res.totalApplications()).isEqualTo(25);
        assertThat(res.activeApplications()).isEqualTo(8);
        assertThat(res.totalOffers()).isEqualTo(2);
        assertThat(res.offerRate()).isEqualTo(0.08, within(1e-9));
        assertThat(res.avgResponseTimeDays()).isEqualTo(5.2); // làm tròn 1 chữ số
        assertThat(res.comparedToLastMonth().applications()).isEqualTo("+20%"); // (12-10)/10
        assertThat(res.comparedToLastMonth().offers()).isEqualTo("+1");         // 2-1
    }

    @Test
    void getOverview_emptyData_noDivideByZeroOrNpe() {
        when(repository.countByUserId(USER)).thenReturn(0L);
        when(repository.countByUserIdAndStatusNotIn(eq(USER), any())).thenReturn(0L);
        when(repository.countApplicationsReachedStatus(USER, ApplicationStatus.OFFER)).thenReturn(0L);
        when(repository.avgResponseTimeDays(USER)).thenReturn(null);
        when(repository.countByUserIdAndAppliedDateBetween(eq(USER), any(), any())).thenReturn(0L, 0L);
        when(repository.countOffersReachedBetween(eq(USER), any(), any(), any())).thenReturn(0L, 0L);

        OverviewResponse res = service.getOverview(USER);

        assertThat(res.offerRate()).isEqualTo(0.0);
        assertThat(res.avgResponseTimeDays()).isNull();
        assertThat(res.comparedToLastMonth().applications()).isEqualTo("0%");
        assertThat(res.comparedToLastMonth().offers()).isEqualTo("+0");
    }

    @Test
    void getFunnel_fillsMissingStagesAndGuardsDivideByZero() {
        // ONSITE bị thiếu (không có đơn nào đạt) → count 0, và OFFER conversion chia cho 0 phải ra 0.0.
        when(repository.countByReachedStage(eq(USER), any())).thenReturn(List.of(
                new Object[]{ApplicationStatus.APPLIED, 10L},
                new Object[]{ApplicationStatus.PHONE_SCREEN, 5L},
                new Object[]{ApplicationStatus.TECHNICAL_INTERVIEW, 4L},
                new Object[]{ApplicationStatus.OFFER, 1L}
        ));

        FunnelResponse res = service.getFunnel(USER);

        assertThat(res.stages()).hasSize(5); // luôn đủ 5 bậc
        assertThat(res.stages().get(0).stage()).isEqualTo("APPLIED");
        assertThat(res.stages().get(0).conversionRate()).isEqualTo(1.0);
        assertThat(res.stages().get(1).conversionRate()).isEqualTo(0.5); // 5/10
        assertThat(res.stages().get(2).conversionRate()).isEqualTo(0.8); // 4/5
        assertThat(res.stages().get(3).count()).isEqualTo(0);            // ONSITE thiếu → 0
        assertThat(res.stages().get(4).conversionRate()).isEqualTo(0.0); // 1/0 guard → 0
    }

    @Test
    void getSources_computesConversionAndSortsByCountDesc() {
        when(repository.countBySource(USER)).thenReturn(List.of(
                new Object[]{ApplicationSource.ITVIEC, 12L},
                new Object[]{ApplicationSource.LINKEDIN, 20L}
        ));
        when(repository.countOffersBySource(USER, ApplicationStatus.OFFER)).thenReturn(List.of(
                new Object[]{ApplicationSource.LINKEDIN, 3L},
                new Object[]{ApplicationSource.ITVIEC, 1L}
        ));

        SourceAnalysisResponse res = service.getSources(USER);

        // Sort giảm dần theo count → LINKEDIN (20) đứng trước ITVIEC (12).
        assertThat(res.sources()).hasSize(2);
        assertThat(res.sources().get(0).source()).isEqualTo("LINKEDIN");
        assertThat(res.sources().get(0).count()).isEqualTo(20);
        assertThat(res.sources().get(0).offers()).isEqualTo(3);
        assertThat(res.sources().get(0).conversionRate()).isEqualTo(0.15, within(1e-9)); // 3/20
        assertThat(res.sources().get(1).source()).isEqualTo("ITVIEC");
    }

    @Test
    void getTimeSeries_appliesDefaultsAndMapsRows() {
        when(repository.countApplicationsByPeriod(eq(USER), eq("week"), any(), any())).thenReturn(List.of(
                new Object[]{Date.valueOf("2026-07-01"), 3L},
                new Object[]{Date.valueOf("2026-07-08"), 5L}
        ));

        // metric + interval null → default applications/week; nhánh applications KHÔNG gọi interviews.
        TimeSeriesResponse res = service.getTimeSeries(USER, null, null, null, null);

        assertThat(res.metric()).isEqualTo("applications");
        assertThat(res.interval()).isEqualTo("week");
        assertThat(res.points()).hasSize(2);
        assertThat(res.points().get(0).period()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(res.points().get(0).count()).isEqualTo(3);
        verify(repository).countApplicationsByPeriod(eq(USER), eq("week"), any(), any());
    }

    @Test
    void getTimeSeries_interviewsMetricRoutesToInterviewQuery() {
        when(repository.countInterviewsByPeriod(eq(USER), eq("month"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.<Object[]>of(new Object[]{Date.valueOf("2026-06-01"), 4L}));

        TimeSeriesResponse res = service.getTimeSeries(USER, "interviews", "month", null, null);

        assertThat(res.metric()).isEqualTo("interviews");
        assertThat(res.points()).hasSize(1);
        assertThat(res.points().get(0).count()).isEqualTo(4);
    }

    @Test
    void getActivity_mergesStatusAndTimelineByDay() {
        when(repository.countStatusChangesByDay(eq(USER), any(), any())).thenReturn(List.of(
                new Object[]{Date.valueOf("2026-07-01"), 2L},
                new Object[]{Date.valueOf("2026-07-02"), 1L}
        ));
        when(repository.countTimelineEventsByDay(eq(USER), any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{Date.valueOf("2026-07-01"), 3L}
        ));

        ActivityResponse res = service.getActivity(USER, null, null);

        // 07-01: 2 (status) + 3 (timeline) = 5; 07-02: 1. Sort tăng dần theo ngày.
        assertThat(res.days()).hasSize(2);
        assertThat(res.days().get(0).date()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(res.days().get(0).count()).isEqualTo(5);
        assertThat(res.days().get(1).count()).isEqualTo(1);
    }
}
