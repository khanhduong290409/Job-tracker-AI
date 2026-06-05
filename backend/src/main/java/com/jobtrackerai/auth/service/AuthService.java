package com.jobtrackerai.auth.service;

import com.jobtrackerai.auth.config.JwtProperties;
import com.jobtrackerai.auth.dto.AuthResponse;
import com.jobtrackerai.auth.dto.GoogleAuthRequest;
import com.jobtrackerai.auth.dto.LogoutRequest;
import com.jobtrackerai.auth.dto.RefreshRequest;
import com.jobtrackerai.auth.dto.UserResponse;
import com.jobtrackerai.auth.entity.RefreshToken;
import com.jobtrackerai.auth.repository.RefreshTokenRepository;
import com.jobtrackerai.shared.exception.UnauthorizedException;
import com.jobtrackerai.user.entity.User;
import com.jobtrackerai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final GoogleOAuthService googleOAuthService;
    private final JwtProperties jwtProperties;

    @Transactional
    public AuthResponse googleLogin(GoogleAuthRequest request, String userAgent, String ipAddress) {
        GoogleOAuthService.GoogleUserInfo googleUser =
                googleOAuthService.exchangeCode(request.code(), request.redirectUri());

        User user = findOrCreateUser(googleUser);
        return issueTokenPair(user, userAgent, ipAddress);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        String tokenHash = hashToken(request.refreshToken());

        RefreshToken token = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (!token.isValid()) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        User user = userRepository.findById(token.getUserId())
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new UnauthorizedException("User account not found"));

        // Token rotation: revoke old token, issue new pair
        token.revoke(); // thu hồi refresh token
        refreshTokenRepository.save(token);

        return issueTokenPair(user, null, null);
    }

    @Transactional
    public void logout(Long userId, LogoutRequest request) {
        String tokenHash = hashToken(request.refreshToken());

        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            if (token.getUserId().equals(userId)) {
                token.revoke();
                refreshTokenRepository.save(token);
            }
        });
    }

    public UserResponse getMe(Long userId) {
        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new UnauthorizedException("User account not found"));
        return UserResponse.from(user);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User findOrCreateUser(GoogleOAuthService.GoogleUserInfo googleUser) {
        return userRepository.findByGoogleIdAndDeletedAtIsNull(googleUser.googleId())
                .map(existing -> syncUserProfile(existing, googleUser))
                .orElseGet(() -> {
                    User newUser = User.create(
                            googleUser.googleId(),
                            googleUser.email(),
                            googleUser.fullName(),
                            googleUser.avatarUrl()
                    );
                    log.info("New user registered: {}", googleUser.email());
                    return userRepository.save(newUser);
                });
    }

    //đồng bộ userinfo của google hiện tại với database trong trường hợp user có thay đổi thông tin của tài khoản google thì nó sẽ cập nhật db với info tài khoản google hiện tại
    private User syncUserProfile(User user, GoogleOAuthService.GoogleUserInfo googleUser) {
        boolean changed = false;

        if (!user.getEmail().equals(googleUser.email())) {
            user.setEmail(googleUser.email());
            changed = true;
        }
        if (!user.getFullName().equals(googleUser.fullName())) {
            user.setFullName(googleUser.fullName());
            changed = true;
        }
        if (!Objects.equals(user.getAvatarUrl(), googleUser.avatarUrl())) {
            user.setAvatarUrl(googleUser.avatarUrl());
            changed = true;
        }

        return changed ? userRepository.save(user) : user;
    }

    //tạo access và refresh token của user id và lưu vào db -> trả về authrespo
    private AuthResponse issueTokenPair(User user, String userAgent, String ipAddress) {
        String rawRefreshToken = jwtService.generateRefreshToken();
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());

        RefreshToken refreshToken = RefreshToken.create(
                user.getId(),
                hashToken(rawRefreshToken),
                userAgent,
                ipAddress,
                jwtProperties.getRefreshTokenExpirySeconds()
        );
        refreshTokenRepository.save(refreshToken);

        return new AuthResponse(accessToken, rawRefreshToken, UserResponse.from(user));
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            //Lấy implementation của thuật toán SHA-256 từ Java crypto. MessageDigest là class chuẩn của Java — không cần thư viện ngoài.
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
/*
 byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
2 việc trong 1 dòng:

.getBytes(UTF_8) — convert chuỗi token thành byte[]
.digest(bytes) — chạy SHA-256 → ra byte[] hash (32 bytes)
StandardCharsets.UTF_8 để đảm bảo encode nhất quán — máy nào chạy cũng cho kết quả giống nhau.


return HexFormat.of().formatHex(hash);
Convert byte[] → chuỗi hex để lưu vào DB dạng text:


[e3, b0, c4, 42, ...] → "e3b0c44298fc1c14..."
HexFormat là utility của Java 17+ — thay cho cách cũ phải tự loop convert từng byte.
 
//GIẢI THÍCH ĐOẠN TẠI SAO LẠI THU HỒI REFRESHTOKEN TRONG FUNCTION REFRESH
// vậy là chỉ trong trường hợp user không sử dụng website trong vòng 7 ngày thì cái refresh token mới 
// thực sự hết hạn sử dụng 7 ngày thôi chứ nếu mà đang dùng thì nó sẽ được refresh theo access token


*/