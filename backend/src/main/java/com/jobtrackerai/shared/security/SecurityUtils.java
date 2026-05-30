package com.jobtrackerai.shared.security;

import org.springframework.stereotype.Component;

/**
 * Helper lấy thông tin user hiện tại từ Spring Security context.
 *
 * Phase 0: stub fail-fast. Phase 1 sẽ implement đầy đủ với SecurityContextHolder
 * + UserPrincipal sau khi setup JWT filter.
 *
 * Lý do throw thay vì return null: tránh silent NPE nếu service vô tình gọi
 * trước Phase 1 (xem decisions.md D-002).
 */
@Component
public class SecurityUtils {

    public Long getCurrentUserId() {
        throw new IllegalStateException(
                "SecurityUtils.getCurrentUserId() not implemented yet — wire in Phase 1 (Auth)");
    }

    public String getCurrentUserEmail() {
        throw new IllegalStateException(
                "SecurityUtils.getCurrentUserEmail() not implemented yet — wire in Phase 1 (Auth)");
    }
}
