package com.jobtrackerai.analytics.repository;

import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.entity.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Repository chuyên aggregation cho Analytics — chỉ đọc, KHÔNG ghi.
 *
 * Extends JpaRepository<Application, Long> để có sẵn EntityManager + query trên Application,
 * nhưng các câu ở đây gộp/đếm chứ không CRUD từng entity.
 *
 * Quy ước quan trọng:
 * - MỌI query lọc theo :userId (ownership — user chỉ thấy số liệu của mình).
 * - Query JPQL trên Application tự động bị @SQLRestriction("deleted_at IS NULL") lọc soft-deleted.
 * - Query NATIVE bỏ qua @SQLRestriction → phải TỰ thêm "a.deleted_at IS NULL".
 * - status_history / timeline_events không có cột user_id → join qua application_id về applications
 *   để lấy user_id (theta-join JPQL "h.applicationId = a.id" vì applicationId là Long thuần, không map @ManyToOne).
 */
public interface AnalyticsRepository extends JpaRepository<Application, Long> {

    // ─────────────────────────── OVERVIEW (US-001) ───────────────────────────

    // Tổng đơn (soft-deleted đã bị @SQLRestriction loại).
    long countByUserId(Long userId);

    // Đơn "đang chạy" = không nằm trong các status terminal (service truyền ACCEPTED/REJECTED/WITHDRAWN).
    long countByUserIdAndStatusNotIn(Long userId, Collection<ApplicationStatus> terminalStatuses);

    // Số đơn TỪNG đạt tới 1 status (đọc từ status_history) — dùng cho totalOffers (status = OFFER).
    // COUNT(DISTINCT) phòng đơn quay lại cùng stage nhiều lần.
    /*
 FROM ApplicationStatusHistory h, Application a  -> join 2 bảng này lại
 WHERE h.applicationId = a.id -> điều kiện nối : lịch sử này thuộc về đơn ứng tuyển nào
 AND a.userId = :userId -> từ tập đã JOIN lọc ra các dòng thoả user id này

     */
    @Query("""
            SELECT COUNT(DISTINCT h.applicationId)
            FROM ApplicationStatusHistory h, Application a 
            WHERE h.applicationId = a.id
              AND a.userId = :userId
              AND h.toStatus = :status
            """)
    long countApplicationsReachedStatus(@Param("userId") Long userId,
                                        @Param("status") ApplicationStatus status);

    // Trung bình số NGÀY từ lúc nộp (mốc to_status=APPLIED đầu tiên) đến phản hồi đầu tiên
    // (mốc from_status=APPLIED đầu tiên — tức lần đổi status RỜI khỏi APPLIED, kể cả bị REJECTED).
    // Đơn không có mốc APPLIED (backfill thẳng vào vòng sau) tự bị loại. Chưa đơn nào phản hồi → NULL.

    @Query(value = """
            SELECT AVG(EXTRACT(EPOCH FROM (resp.first_response - app.applied_at)) / 86400.0)
            FROM (
                SELECT h.application_id, MIN(h.changed_at) AS applied_at
                FROM application_status_history h
                JOIN applications a ON a.id = h.application_id
                WHERE a.user_id = :userId AND a.deleted_at IS NULL AND h.to_status = 'APPLIED'
                GROUP BY h.application_id
            ) app
            JOIN (
                SELECT h.application_id, MIN(h.changed_at) AS first_response
                FROM application_status_history h
                WHERE h.from_status = 'APPLIED'
                GROUP BY h.application_id
            ) resp ON resp.application_id = app.application_id
            """, nativeQuery = true)
    Double avgResponseTimeDays(@Param("userId") Long userId);

    // So-sánh-tháng: số đơn NỘP trong khoảng (theo applied_date). SAVED (applied_date null) tự loại.
    long countByUserIdAndAppliedDateBetween(Long userId, LocalDate from, LocalDate to);

    // So-sánh-tháng: số đơn ĐẠT OFFER với thời điểm chuyển sang OFFER nằm trong khoảng.
    @Query("""
            SELECT COUNT(DISTINCT h.applicationId)
            FROM ApplicationStatusHistory h, Application a
            WHERE h.applicationId = a.id
              AND a.userId = :userId
              AND h.toStatus = :status
              AND h.changedAt >= :from AND h.changedAt < :to
            """)
    long countOffersReachedBetween(@Param("userId") Long userId,
                                   @Param("status") ApplicationStatus status,
                                   @Param("from") Instant from,
                                   @Param("to") Instant to);

    // ─────────────────────────── FUNNEL (US-002) ───────────────────────────

    // Đếm số đơn từng đạt mỗi stage, gộp 1 query. Trả [ApplicationStatus, Long].
    @Query("""
            SELECT h.toStatus, COUNT(DISTINCT h.applicationId)
            FROM ApplicationStatusHistory h, Application a
            WHERE h.applicationId = a.id
              AND a.userId = :userId
              AND h.toStatus IN :stages
            GROUP BY h.toStatus
            """)
    List<Object[]> countByReachedStage(@Param("userId") Long userId,
                                       @Param("stages") List<ApplicationStatus> stages);

    // ─────────────────────────── SOURCES (US-004) ───────────────────────────

    // Tổng đơn theo từng nguồn. Trả [ApplicationSource, Long].
    //COUNT(a) ở đây là đếm số theo số record application, ở đây ta dùng COUNT(*) cũng được
    @Query("""
            SELECT a.source, COUNT(a)
            FROM Application a
            WHERE a.userId = :userId
            GROUP BY a.source
            """)
    List<Object[]> countBySource(@Param("userId") Long userId);

    // Số đơn từng đạt OFFER theo từng nguồn. Trả [ApplicationSource, Long].
    @Query("""
            SELECT a.source, COUNT(DISTINCT h.applicationId)
            FROM ApplicationStatusHistory h, Application a
            WHERE h.applicationId = a.id
              AND a.userId = :userId
              AND h.toStatus = :status
            GROUP BY a.source
            """)
    List<Object[]> countOffersBySource(@Param("userId") Long userId,
                                       @Param("status") ApplicationStatus status);

    // ─────────────────────────── TIME SERIES (US-003) ───────────────────────────
    // date_trunc(:interval, ...) — arg đầu nhận text bind ('day'|'week'|'month'). Kết quả ::date để JDBC trả java.sql.Date.

    // metric = "applications": đếm đơn theo mốc applied_date.
    @Query(value = """
            SELECT date_trunc(:interval, applied_date)::date AS period, COUNT(*) AS cnt
            FROM applications
            WHERE user_id = :userId AND deleted_at IS NULL
              AND applied_date IS NOT NULL
              AND applied_date >= :from AND applied_date <= :to
            GROUP BY period ORDER BY period
            """, nativeQuery = true)
    List<Object[]> countApplicationsByPeriod(@Param("userId") Long userId,
                                             @Param("interval") String interval,
                                             @Param("from") LocalDate from,
                                             @Param("to") LocalDate to);

    // metric = "interviews": đếm số đơn chuyển sang vòng phỏng vấn theo mốc changed_at.
    @Query(value = """
            SELECT date_trunc(:interval, h.changed_at)::date AS period, COUNT(DISTINCT h.application_id) AS cnt
            FROM application_status_history h
            JOIN applications a ON a.id = h.application_id
            WHERE a.user_id = :userId AND a.deleted_at IS NULL
              AND h.to_status IN ('PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'ONSITE')
              AND h.changed_at >= :from AND h.changed_at <= :to
            GROUP BY period ORDER BY period
            """, nativeQuery = true)
    List<Object[]> countInterviewsByPeriod(@Param("userId") Long userId,
                                           @Param("interval") String interval,
                                           @Param("from") Instant from,
                                           @Param("to") Instant to);

    // ─────────────────────────── ACTIVITY HEATMAP (US-006) ───────────────────────────
    // 2 nguồn hoạt động, gộp theo ngày ở service. Cả 2 trả [java.sql.Date, Long].

    @Query(value = """
            SELECT h.changed_at::date AS day, COUNT(*) AS cnt
            FROM application_status_history h
            JOIN applications a ON a.id = h.application_id
            WHERE a.user_id = :userId AND a.deleted_at IS NULL
              AND h.changed_at >= :from AND h.changed_at <= :to
            GROUP BY day
            """, nativeQuery = true)
    List<Object[]> countStatusChangesByDay(@Param("userId") Long userId,
                                           @Param("from") Instant from,
                                           @Param("to") Instant to);

    @Query(value = """
            SELECT e.event_date::date AS day, COUNT(*) AS cnt
            FROM application_timeline_events e
            JOIN applications a ON a.id = e.application_id
            WHERE a.user_id = :userId AND a.deleted_at IS NULL
              AND e.event_date >= :from AND e.event_date <= :to
            GROUP BY day
            """, nativeQuery = true)
    List<Object[]> countTimelineEventsByDay(@Param("userId") Long userId,
                                            @Param("from") Instant from,
                                            @Param("to") Instant to);
}
