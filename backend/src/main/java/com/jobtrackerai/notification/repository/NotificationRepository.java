package com.jobtrackerai.notification.repository;

import com.jobtrackerai.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // GET /notifications — toàn bộ notification của user (mới nhất trước), phân trang
    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // GET /notifications?unreadOnly=true — chỉ chưa đọc (khớp partial index idx_notifications_user_unread)
    Page<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // Badge đếm số chưa đọc
    long countByUserIdAndReadFalse(Long userId);

    // Ownership-safe lookup cho mark-as-read
    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    
    @Modifying(clearAutomatically = true)//@Modifying báo cho spring data đây là câu ghi, không phải câu đọc
    //dọn state cũ trong persistence context ( vùng nhớ tạm cache)
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
    int markAllRead(@Param("userId") Long userId);
}
/*
Mặc định @Query được coi là SELECT → Spring gọi kiểu getResultList() và mong nhận về entity/DTO.
Câu này là UPDATE ... SET .... Không có @Modifying, Spring sẽ chạy sai kiểu và ném exception (InvalidDataAccessApiUsageException).
@Modifying chuyển sang gọi executeUpdate(), trả về int = số dòng bị ảnh hưởng (đó là lý do method trả int markAllRead).


Persistence context = vùng nhớ tạm (cache cấp 1) mà Hibernate dùng để quản lý entity trong 1 transaction.

Hiểu ngắn gọn qua 3 ý:

Là cái Map trong RAM: mỗi entity bạn load (vd findById(5)) được Hibernate giữ 1 bản ở đây, theo dõi suốt transaction.

Tự lưu thay đổi (dirty checking): sửa entity đang được quản lý thì không cần gọi save() — cuối transaction Hibernate tự so sánh và sinh UPDATE.

Sống theo transaction: mở khi transaction bắt đầu, xóa khi kết thúc.

Liên hệ clearAutomatically: bulk UPDATE chạy thẳng xuống DB, không qua context → bản entity trong context bị cũ (stale). clear() dọn sạch context để lần đọc sau lấy lại từ DB
*/
