package com.jobtrackerai.application.repository;

import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.entity.ApplicationSource;
import com.jobtrackerai.application.entity.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    // Ownership-safe lookup — userId trong query: sai userId → 404, không lộ "resource tồn tại nhưng không phải của bạn"
    Optional<Application> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);

    // Multi-status filter: service luôn pass List (empty list = không filter theo status)
    // SpEL #statuses.isEmpty() = true → bỏ qua điều kiện status, trả về tất cả
    @Query("""
            SELECT a FROM Application a
            WHERE a.userId = :userId
              AND a.deletedAt IS NULL
              AND (:#{#statuses.isEmpty()} = true OR a.status IN :statuses)
              AND (:source IS NULL OR a.source = :source)
              AND (:search IS NULL
                   OR LOWER(a.companyName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))
                   OR LOWER(a.position) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))
              AND (:dateFrom IS NULL OR a.appliedDate >= :dateFrom)
              AND (:dateTo IS NULL OR a.appliedDate <= :dateTo)
            """)
    Page<Application> findByFilters(
            @Param("userId") Long userId,
            @Param("statuses") List<ApplicationStatus> statuses,
            @Param("source") ApplicationSource source,
            @Param("search") String search,
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo,
            Pageable pageable
    );
}
/*
:#{#statuses.isEmpty()} — đây là Spring Expression Language (SpEL) nhúng trong JPQL:

:#{...} — cú pháp để nhúng SpEL vào trong @Query
#statuses — tham chiếu đến parameter statuses (dấu # bắt buộc trong SpEL)
.isEmpty() — gọi method Java trên object đó → trả về true / false

IN :statuses nghĩa là gì?
:statuses là named parameter — Spring bind giá trị từ @Param("statuses") vào đây.

IN với một list hoạt động như sau:


// Java truyền vào
List<ApplicationStatus> statuses = [APPLIED, OFFER, PHONE_SCREEN]

// JPQL tự expand thành:
a.status IN ('APPLIED', 'OFFER', 'PHONE_SCREEN')

// Tương đương SQL:
WHERE status = 'APPLIED' OR status = 'OFFER' OR status = 'PHONE_SCREEN'


Phân biệt
#statuses	a.status
Là gì	Parameter truyền vào method (List)	Field của từng row trong DB
Kiểu	List<ApplicationStatus>	ApplicationStatus (1 giá trị)
Thuộc về	Java method	JPQL / database
Đọc lại toàn bộ điều kiện

(:#{#statuses.isEmpty()} = true   OR   a.status IN :statuses)
Dịch ra tiếng người:

"Nếu list statuses truyền vào rỗng thì bỏ qua filter. Nếu không rỗng thì chỉ lấy row có a.status nằm trong list đó."

#statuses.isEmpty() — hỏi cái list tham số: "mày có rỗng không?"
a.status IN :statuses — so sánh field của từng row với các giá trị trong list
*/
