package com.jobtrackerai.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtrackerai.shared.dto.ApiResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.jobtrackerai.auth.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
//OncePerRequestFilter đây là 1 class spring dùng để chặn lại(để xử lí) mọi http request trước khi request đến controller. 
//mỗi request chỉ chạy filter này đúng 1 lần ( tránh trường hợp filter bị gọi nhiều lần do redirect nội bộ)

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);

        if (token == null) {//nếu không có token -> không chặn, chuyển tiếp cho filter tiếp theo 
            filterChain.doFilter(request, response);//JwtAuthenticationFilter luôn chạy trước bước kiểm tra quyền (securityconfig)
            return;
        }

        try {
            Claims claims = jwtService.parseAccessToken(token);
            Long userId = jwtService.extractUserId(claims);
            String email = jwtService.extractEmail(claims);

            UserPrincipal principal = new UserPrincipal(userId, email);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);

            filterChain.doFilter(request, response);
        } catch (ExpiredJwtException e) {
            writeError(response, "TOKEN_EXPIRED", "Access token expired");
        } catch (JwtException e) {
            writeError(response, "UNAUTHORIZED", "Invalid access token");
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private void writeError(HttpServletResponse response, String code, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiResponse.error(code, message));
    }
}

/*
new WebAuthenticationDetailsSource()
Class có sẵn của Spring Security, dùng để tạo object chứa thông tin phụ về request.

.buildDetails(request)
Đọc từ HttpServletRequest và tạo ra WebAuthenticationDetails gồm 2 field:

Field	Lấy từ	Ví dụ
remoteAddress	IP của client	"192.168.1.1"
sessionId	HTTP session ID	"ABC123XYZ"
auth.setDetails(...)
Gắn thêm 2 thông tin trên vào authentication object — phục vụ audit/logging (biết request đến từ IP nào), không ảnh hưởng đến việc xác thực.




ApiResponse.error(code, message) tạo ra Java object trông như này trong memory:


ApiResponse {
    success = false,
    code    = "TOKEN_EXPIRED",
    message = "Access token expired"
}
objectMapper.writeValue() nhìn vào object đó, đọc từng field, rồi tự động viết thành JSON:


field success = false   →   "success": false
field code    = "..."   →   "code": "TOKEN_EXPIRED"
field message = "..."   →   "message": "Access token expired"
Kết quả ghi thẳng vào response.getWriter() — tức là ghi vào body của HTTP response trả về client.

Cơ chế Jackson đọc field dựa vào tên field trong class ApiResponse. Tên field trong class = tên key trong JSON. Không cần cấu hình thêm gì.
*/