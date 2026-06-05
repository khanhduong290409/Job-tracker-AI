package com.jobtrackerai.auth.service;

import com.jobtrackerai.auth.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties jwtProperties;

    public String generateAccessToken(Long userId, String email) {
        Instant now = Instant.now();//thời gian khởi tạo
        Instant expiry = now.plusSeconds(jwtProperties.getAccessTokenExpirySeconds());//thời gian hết hạn token

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey())
                .compact();
    }

    // Random 32-byte URL-safe base64 string — không phải JWT
    //(Tạo 32 bytes random → encode thành chuỗi 43 ký tự an toàn cho URL)
    public String generateRefreshToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // Throws ExpiredJwtException nếu hết hạn, JwtException nếu invalid
    public Claims parseAccessToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())// tính lại signature rồi sau đó decode ( trong đó có cả việc check hết hạn )
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenExpired(String token) {
        try {
            parseAccessToken(token);
            return false;
        } catch (ExpiredJwtException e) {
            return true;
        }
    }

    public Long extractUserId(Claims claims) {
        return Long.parseLong(claims.getSubject());
    }

    public String extractEmail(Claims claims) {
        return claims.get("email", String.class);
    }

    private SecretKey signingKey() {
        byte[] keyBytes = Base64.getDecoder().decode(jwtProperties.getSecret());
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
/**
generateRefreshToken()
javabyte[] bytes = new byte[32];
// Tạo mảng 32 bytes trống → [0,0,0,0,...] (32 số)

new SecureRandom().nextBytes(bytes);
// Điền random vào mảng → [x8,f2,a1,...] (32 số ngẫu nhiên)
// SecureRandom: random cryptographic, không đoán được
// (khác Random thường — dùng cho game, không dùng cho bảo mật)

return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
// Base64.getUrlEncoder() → encode thành chuỗi, dùng bảng URL-safe
//   (thay - thay vì +, _ thay vì / → an toàn khi để trong URL/Cookie)
// .withoutPadding() → bỏ dấu = ở cuối (không cần thiết cho token)
// .encodeToString() → convert byte[] → String
// Kết quả: "a3f8c2e1b9d4e7f0..." (43 ký tự)
 */
