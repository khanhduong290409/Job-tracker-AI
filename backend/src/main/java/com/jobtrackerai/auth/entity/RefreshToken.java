package com.jobtrackerai.auth.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
@Getter
@NoArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;// refreshToken da duoc hash SHA-256

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;//thời điểm thu hồi token thủ công(null = chưa thu hồi, có giá trị = đã bị thu hồi)

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static RefreshToken create(Long userId, String tokenHash,
                                      String userAgent, String ipAddress,
                                      int expirySeconds) {
        RefreshToken token = new RefreshToken();
        token.userId = userId;
        token.tokenHash = tokenHash;
        token.userAgent = userAgent;
        token.ipAddress = ipAddress;
        token.expiresAt = Instant.now().plusSeconds(expirySeconds);
        token.createdAt = Instant.now();
        return token;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isValid() {
        return !isExpired() && !isRevoked();
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }
}
/*
 userAgent và ipAddress — thông tin thiết bị

private String userAgent;   // "Mozilla/5.0 (Windows NT...) Chrome/120..."
private String ipAddress;   // "113.185.xx.xx"
 */