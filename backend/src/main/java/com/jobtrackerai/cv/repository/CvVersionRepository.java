package com.jobtrackerai.cv.repository;

import com.jobtrackerai.cv.entity.CvVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CvVersionRepository extends JpaRepository<CvVersion, Long> {

    // Ownership-safe lookup — không tìm thấy = 404, không lộ "resource tồn tại nhưng không phải của bạn"
    Optional<CvVersion> findByIdAndUserId(Long id, Long userId);

    List<CvVersion> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<CvVersion> findByUserIdAndDefaultCvTrue(Long userId);

    // Dùng trước khi set default mới — bulk update không qua entity nên phải tự thêm deleted_at IS NULL.
    // clearAutomatically = true: flush + clear L1 cache sau bulk UPDATE, tránh entity cũ bị cache stale.
    @Modifying(clearAutomatically = true)
    @Query("UPDATE CvVersion c SET c.defaultCv = false WHERE c.userId = :userId AND c.defaultCv = true AND c.deletedAt IS NULL")
    void clearDefaultByUserId(@Param("userId") Long userId);
}
