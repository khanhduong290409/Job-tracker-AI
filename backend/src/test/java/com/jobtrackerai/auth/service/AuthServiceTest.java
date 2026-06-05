package com.jobtrackerai.auth.service;

import com.jobtrackerai.auth.config.JwtProperties;
import com.jobtrackerai.auth.dto.AuthResponse;
import com.jobtrackerai.auth.dto.GoogleAuthRequest;
import com.jobtrackerai.auth.dto.LogoutRequest;
import com.jobtrackerai.auth.dto.RefreshRequest;
import com.jobtrackerai.auth.entity.RefreshToken;
import com.jobtrackerai.auth.repository.RefreshTokenRepository;
import com.jobtrackerai.shared.exception.UnauthorizedException;
import com.jobtrackerai.user.entity.User;
import com.jobtrackerai.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private JwtService jwtService;
    @Mock private GoogleOAuthService googleOAuthService;
    @Mock private JwtProperties jwtProperties;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.create("google-123", "test@gmail.com", "Test User", "https://avatar.url");
    }

    // ── googleLogin ───────────────────────────────────────────────────────────

    @Test
    void googleLogin_newUser_createsUserAndReturnsTokens() {
        GoogleAuthRequest request = new GoogleAuthRequest("auth-code", "http://localhost:5173/auth/callback");
        GoogleOAuthService.GoogleUserInfo googleUser =
                new GoogleOAuthService.GoogleUserInfo("google-123", "test@gmail.com", "Test User", "https://avatar.url");

        when(googleOAuthService.exchangeCode("auth-code", "http://localhost:5173/auth/callback"))
                .thenReturn(googleUser);
        when(userRepository.findByGoogleIdAndDeletedAtIsNull("google-123"))
                .thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateAccessToken(any(), anyString())).thenReturn("access-token");
        when(jwtService.generateRefreshToken()).thenReturn("raw-refresh-token");
        when(jwtProperties.getRefreshTokenExpirySeconds()).thenReturn(604800);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

        AuthResponse response = authService.googleLogin(request, "Mozilla/5.0", "127.0.0.1");

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("raw-refresh-token");
        assertThat(response.user().email()).isEqualTo("test@gmail.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void googleLogin_existingUser_doesNotCreateNewUser() {
        GoogleAuthRequest request = new GoogleAuthRequest("auth-code", "http://localhost:5173/auth/callback");
        GoogleOAuthService.GoogleUserInfo googleUser =
                new GoogleOAuthService.GoogleUserInfo("google-123", "test@gmail.com", "Test User", "https://avatar.url");

        when(googleOAuthService.exchangeCode(anyString(), anyString())).thenReturn(googleUser);
        when(userRepository.findByGoogleIdAndDeletedAtIsNull("google-123"))
                .thenReturn(Optional.of(testUser));
        when(jwtService.generateAccessToken(any(), anyString())).thenReturn("access-token");
        when(jwtService.generateRefreshToken()).thenReturn("raw-refresh-token");
        when(jwtProperties.getRefreshTokenExpirySeconds()).thenReturn(604800);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

        authService.googleLogin(request, null, null);

        // save chỉ được gọi cho RefreshToken, không phải User mới
        verify(userRepository, never()).save(any(User.class));
    }

    // ── refresh ───────────────────────────────────────────────────────────────

    @Test
    void refresh_validToken_returnsNewTokenPair() {
        RefreshToken token = RefreshToken.create(1L, "hashed-token", null, null, 604800);

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(refreshTokenRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(jwtService.generateAccessToken(any(), anyString())).thenReturn("new-access-token");
        when(jwtService.generateRefreshToken()).thenReturn("new-refresh-token");
        when(jwtProperties.getRefreshTokenExpirySeconds()).thenReturn(604800);

        AuthResponse response = authService.refresh(new RefreshRequest("any-raw-token"));

        assertThat(response.accessToken()).isEqualTo("new-access-token");
        assertThat(response.refreshToken()).isEqualTo("new-refresh-token");
        assertThat(token.isRevoked()).isTrue(); // token cũ phải bị revoke
    }

    @Test
    void refresh_tokenNotFound_throwsUnauthorized() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(new RefreshRequest("invalid-token")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid refresh token");
    }

    @Test
    void refresh_revokedToken_throwsUnauthorized() {
        RefreshToken token = RefreshToken.create(1L, "hash", null, null, 604800);
        token.revoke();

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authService.refresh(new RefreshRequest("revoked-token")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("expired or revoked");
    }

    // ── logout ────────────────────────────────────────────────────────────────

    @Test
    void logout_validToken_revokesToken() {
        RefreshToken token = RefreshToken.create(1L, "hashed", null, null, 604800);

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));
        when(refreshTokenRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        authService.logout(1L, new LogoutRequest("any-raw-token"));

        assertThat(token.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(token);
    }

    @Test
    void logout_tokenNotFound_doesNotThrow() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        // không throw — logout phải idempotent
        authService.logout(1L, new LogoutRequest("unknown-token"));

        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void logout_tokenBelongsToDifferentUser_doesNotRevoke() {
        RefreshToken token = RefreshToken.create(99L, "hashed", null, null, 604800); // userId = 99

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        authService.logout(1L, new LogoutRequest("any-token")); // userId = 1

        assertThat(token.isRevoked()).isFalse();
        verify(refreshTokenRepository, never()).save(any());
    }
}
