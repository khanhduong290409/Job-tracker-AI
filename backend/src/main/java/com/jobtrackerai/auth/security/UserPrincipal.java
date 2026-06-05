package com.jobtrackerai.auth.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class UserPrincipal implements UserDetails {

    private final Long userId;
    private final String email;

    public UserPrincipal(Long userId, String email) {
        this.userId = userId;
        this.email = email;
    }

    public Long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    // ── UserDetails contract ──────────────────────────────────────────────────

    @Override
    public String getUsername() {//Spring dùng field này làm identifier, project dùng email thay username
        return email;
    }

    @Override
    public String getPassword() {
        return null; //	Project không dùng password — auth qua Google OAuth + JWT
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(); // Phase 1 chưa có role-based access
    }

    @Override
    public boolean isAccountNonExpired() {//Không có cơ chế expire account
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {//Không có cơ chế lock account
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {//Credential ở đây là JWT, expire do JWT tự quản lý
        return true;
    }

    @Override
    public boolean isEnabled() {//Không có trạng thái disabled trong Phase 1
        return true;
    }
}

/*
UserPrincipal là đối tượng đại diện cho user đã đăng nhập bên trong Spring Security. Sau khi JWT được verify thành công, filter sẽ tạo một UserPrincipal và nhét vào SecurityContext — từ đó mọi service có thể gọi SecurityUtils.getCurrentUserId() để lấy ID user hiện tại.
Nó không phải là entity database. Nó chỉ là "cái thẻ nhận dạng" user tồn tại trong phạm vi 1 HTTP request.

2. Pattern/Concept lạ — UserDetails Interface
UserDetails là contract của Spring Security — nếu bạn implement interface này, Spring Security hiểu cách "đọc thông tin user" mà không cần biết bạn lưu trữ user như thế nào.

Toàn bộ interface có 7 method. File này override tất cả.

GrantedAuthority — interface của Spring, đại diện cho 1 quyền/role (vd: ROLE_ADMIN, ROLE_USER).
? extends GrantedAuthority — wildcard generic: chấp nhận bất kỳ class nào implement GrantedAuthority (vd: SimpleGrantedAuthority).
 


*/