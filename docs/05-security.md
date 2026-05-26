# 05. Security Specification

## Authentication

### JWT Configuration

**Access Token:**
- Algorithm: HS256 (đủ cho project demo, nâng cấp RS256 cho production)
- Expiry: 15 minutes
- Claims:
  ```json
  {
    "sub": "<user_id>",
    "email": "<email>",
    "iat": <timestamp>,
    "exp": <timestamp>,
    "type": "access"
  }
  ```

**Refresh Token:**
- Random secure string (32 bytes, base64 encoded)
- Expiry: 7 days
- Store SHA-256 hash in DB, never raw
- Single-use: revoke khi refresh, issue new pair
- Track user agent + IP for suspicious activity detection

### JWT Secret Management
- Min 256 bits (32 bytes random)
- Load từ environment variable `JWT_SECRET`
- Never commit to repo
- Different secrets cho dev/staging/prod

### Google OAuth Flow
1. Frontend redirects to Google OAuth với scope: `email`, `profile`
2. Google callback với `code`
3. Frontend send `code` to backend `/auth/google`
4. Backend exchange code → Google access token
5. Backend get user info từ Google
6. Find or create user in DB
7. Issue JWT pair, return to frontend
8. Frontend store: access token in memory (or sessionStorage), refresh token in httpOnly cookie (recommended) hoặc localStorage

### Token Refresh Flow
1. Frontend get 401 từ API
2. Try refresh: POST `/auth/refresh` với refresh token
3. If success: retry original request với new access token
4. If refresh fails: redirect to login

## Authorization

### Resource Ownership
- Mọi resource (CV, Application, etc.) thuộc về 1 user
- Service layer LUÔN check `resource.userId == currentUser.id`
- Implement helper:
  ```java
  @Component
  public class ResourceOwnershipValidator {
      public void validateOwnership(Long resourceUserId, Long currentUserId) {
          if (!Objects.equals(resourceUserId, currentUserId)) {
              throw new ForbiddenException("You don't have access to this resource");
          }
      }
  }
  ```

### Method Security
- Dùng `@PreAuthorize` cho endpoint sensitive
- Default: all endpoints require authentication
- Whitelist: `/auth/google`, `/auth/refresh`, `/health`, `/swagger-ui/**`, `/v3/api-docs/**`

## Input Validation

### Bean Validation
- Dùng `jakarta.validation` annotations trên DTO
- Custom validators cho business rules (vd: phone format, status transition)

```java
public class CreateApplicationRequest {
    @NotBlank(message = "Company name is required")
    @Size(max = 255)
    private String companyName;
    
    @NotBlank
    @Size(max = 255)
    private String position;
    
    @NotBlank
    @Size(min = 10, max = 50000, message = "JD content must be 10-50000 characters")
    private String jdContent;
    
    @Pattern(regexp = "^https?://.*", message = "Invalid URL")
    private String jdUrl;
    
    @ValidEnum(enumClass = ApplicationSource.class)
    private String source;
    
    @PastOrPresent(message = "Applied date cannot be in future")
    private LocalDate appliedDate;
}
```

### Sanitization
- Sanitize HTML input (notes, descriptions) với OWASP Java HTML Sanitizer
- Whitelist: bold, italic, lists, links (without javascript:)
- Strip script tags, event handlers

## File Upload Security

### Restrictions
- **Max size**: 5MB cho CV, 10MB cho attachments
- **Allowed MIME types**:
  - CV: `application/pdf`
  - Attachments: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/zip`
- **Filename sanitization**: remove `../`, special chars
- **Magic bytes check**: verify file actually matches MIME (vd: PDF starts with `%PDF-`)

### Storage
- KHÔNG lưu file vào folder serve static
- Lưu với UUID filename, original name in DB
- For Cloudinary: dùng signed URLs với expiry
- For local: serve qua controller với auth check

### Antivirus (Optional)
- Integrate ClamAV nếu deploy production
- Skip cho project demo

## API Security

### Rate Limiting

Sử dụng Bucket4j với Redis-backed storage:

```java
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    // Buckets configured per endpoint pattern + per user
}
```

Limits:
| Endpoint Pattern | Limit |
|------------------|-------|
| `/auth/**` | 10/min per IP |
| `/applications/*/analyze` | 20/hour per user |
| `/applications/parse-jd` | 30/hour per user |
| `/cvs` POST | 10/hour per user |
| `/email/send` | 20/hour per user |
| Others | 100/min per user |

Response khi exceed:
```
HTTP 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705320000
```

### CORS

```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "http://localhost:5173",  // dev
            "https://jobtracker.com"  // prod
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-RateLimit-*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        return source;
    }
}
```

### Security Headers

```java
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp.policyDirectives(
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' https: data:; " +
        "connect-src 'self' https://generativelanguage.googleapis.com"
    ))
    .frameOptions(frame -> frame.deny())
    .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
    .contentTypeOptions(Customizer.withDefaults())
    .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31536000))
);
```

## Data Protection

### Secrets Encryption (at rest)
- Gmail refresh token: encrypt với AES-256-GCM trước khi lưu DB
- Encryption key trong env var, không trong code
- Implement `@Convert(converter = EncryptedStringConverter.class)` trên JPA field

### Password
- KHÔNG có password trong system (chỉ Google OAuth)
- Nếu thêm sau, dùng BCrypt với strength 12

### SQL Injection
- LUÔN dùng JPA/Hibernate parameterized queries
- KHÔNG concat string vào query
- Native query phải dùng `:param` binding

```java
// ❌ BAD
@Query("SELECT a FROM Application a WHERE a.companyName = '" + name + "'")

// ✅ GOOD
@Query("SELECT a FROM Application a WHERE a.companyName = :name")
List<Application> findByCompanyName(@Param("name") String name);
```

### XSS Prevention
- Frontend: React tự escape, nhưng cẩn thận với `dangerouslySetInnerHTML`
- Nếu cần render HTML (notes, AI output): sanitize với DOMPurify
- Backend: sanitize input HTML, validate URL fields (no `javascript:`)

### CSRF
- API stateless với JWT → không cần CSRF token
- Nhưng nếu dùng cookie-based auth: enable CSRF protection

## Logging & Audit

### What to Log
- Authentication events: login, logout, refresh, failed attempts
- Authorization failures
- Data modifications: create/update/delete trên sensitive resources
- AI calls: user, type, tokens
- Errors with stack trace

### What NOT to Log
- Passwords (không có nhưng để rule)
- Full JWT tokens (chỉ log user id)
- API keys, secrets
- Personal sensitive info: full email body, SSN-like data

### Log Format
```
[timestamp] [level] [traceId] [userId] [action] [details]
```

### Audit Trail
- Bảng `audit_log` (optional advanced) track changes trên applications
- Hoặc đơn giản: status_history và timeline_events đã đủ cho project

## Sensitive Configuration

`.env` file (KHÔNG commit):
```
# Database
DB_URL=jdbc:postgresql://localhost:5432/jobtracker
DB_USER=postgres
DB_PASSWORD=<random_strong>

# JWT
JWT_SECRET=<32_byte_base64>
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Gmail API (same client ID/secret, different scope)

# AI
GEMINI_API_KEY=
GROK_API_KEY=

# Encryption (for Gmail tokens)
ENCRYPTION_KEY=<32_byte_base64>

# Redis
REDIS_URL=redis://localhost:6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Production Deployment Checklist

- [ ] HTTPS only (TLS 1.2+)
- [ ] Strong JWT secret (rotated regularly)
- [ ] DB credentials rotated
- [ ] Rate limiting enabled
- [ ] CORS restricted to actual frontend domains
- [ ] CSP headers configured
- [ ] Error messages don't leak stack traces (use generic 500 message)
- [ ] Disable Swagger UI in prod (or protect with auth)
- [ ] Database backup automated
- [ ] Monitoring & alerting (Sentry, Datadog, etc.)
- [ ] Dependency scan (OWASP Dependency Check)
- [ ] Container image scan
