# 02. Architecture Rules

## Modular Monolith - Đơn giản hóa

Project chia thành modules theo domain (xem `00-project-overview.md`).

### Module Communication

**Cách giao tiếp giữa modules: gọi service trực tiếp qua dependency injection.**

```java
// ✅ ĐÚNG: ApplicationService gọi CvVersionRepository và AiService
@Service
@RequiredArgsConstructor
public class ApplicationService {
    private final ApplicationRepository applicationRepository;
    private final CvVersionRepository cvVersionRepository;  // từ module cv
    private final AiService aiService;                       // từ module ai
    
    public ApplicationResponse create(...) {
        // logic gọi cvVersionRepository và aiService
    }
}
```

**KHÔNG dùng Domain Events pattern (`ApplicationEventPublisher`)** trừ trường hợp đặc biệt async với AI.

```java
// ❌ KHÔNG dùng pattern này:
eventPublisher.publishEvent(new ApplicationCreatedEvent(savedId));
```

### Module Dependency Graph (informal, không strict)

Module có thể inject service từ module khác. KHÔNG có rule cứng "module A không được gọi module B".

Tuy nhiên có nguyên tắc lỏng:
- `shared` không phụ thuộc module nào
- `auth` ít phụ thuộc (chỉ shared, user)
- `application` phụ thuộc cv, ai (qua interface)
- `analytics` phụ thuộc application (chỉ đọc data)

Nếu thấy 2 module phụ thuộc cyclic → refactor (vd: tách shared logic ra `shared` module).

### Shared Module

`com.jobtrackerai.shared` chứa:
- `ApiResponse`, `ErrorInfo`, `FieldError`
- Common exceptions: `ResourceNotFoundException`, `ForbiddenException`, `BadRequestException`
- `SecurityUtils` (get current user)
- Common config: `JacksonConfig`, `WebConfig`, `CacheConfig`
- Common utilities: `DateUtils`, etc.

**Rule**: `shared` KHÔNG depend module nào khác.

## Transaction Boundaries

### Where to Place `@Transactional`

- **Service**: YES (class-level readOnly mặc định, override cho write method)
- **Controller**: NO
- **Repository**: NO

```java
@Service
@Transactional(readOnly = true)  // class-level: read-only
public class ApplicationService {
    
    public ApplicationResponse getById(...) {
        // read-only inherited
    }
    
    @Transactional  // override cho write
    public ApplicationResponse create(...) {
        // can write
    }
}
```

### Async + Transaction

- `@Async` chạy thread riêng → ngoài transaction của caller
- Nếu async method cần đọc data đã save bởi caller, dùng `@TransactionalEventListener(AFTER_COMMIT)` hoặc pass data qua parameters

```java
// AI analysis chạy async sau khi application được save
@Async("aiTaskExecutor")
public void analyzeApplicationAsync(Long applicationId) {
    // load application và phân tích
    // CHẠY TRONG THREAD RIÊNG, ngoài transaction caller
}
```

## Repository Patterns

### Filter Query - dùng `@Query` JPQL

**KHÔNG dùng Specification pattern.**

```java
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    
    @Query("""
        SELECT a FROM Application a 
        WHERE a.userId = :userId 
          AND a.deletedAt IS NULL
          AND (:status IS NULL OR a.status = :status)
          AND (:source IS NULL OR a.source = :source)
          AND (:search IS NULL 
               OR LOWER(a.companyName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(a.position) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:dateFrom IS NULL OR a.appliedDate >= :dateFrom)
          AND (:dateTo IS NULL OR a.appliedDate <= :dateTo)
        """)
    Page<Application> findByFilters(
        @Param("userId") Long userId,
        @Param("status") ApplicationStatus status,
        @Param("source") String source,
        @Param("search") String search,
        @Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo,
        Pageable pageable
    );
}
```

**Pros của cách này**:
- Đọc 1 lần biết query gì
- Dễ debug (copy paste vào psql là chạy được)
- Không tạo thêm class

**Cons**:
- Filter rất phức tạp (10+ điều kiện) thì query dài
- Khi đó refactor: tách method, hoặc dùng Specification (nhưng đợi đến lúc đó)

### Method Query Convention (cho query đơn giản)

```java
Optional<Application> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);
long countByUserIdAndStatusAndDeletedAtIsNull(Long userId, ApplicationStatus status);
List<Application> findTop5ByUserIdOrderByCreatedAtDesc(Long userId);
```

### Avoid N+1 Queries

Khi cần load entity kèm relation, dùng `@EntityGraph` hoặc fetch join:

```java
@EntityGraph(attributePaths = {"cvVersion"})
Optional<Application> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);
```

Hoặc explicit JOIN FETCH trong `@Query`:
```java
@Query("""
    SELECT a FROM Application a
    LEFT JOIN FETCH a.cvVersion
    WHERE a.id = :id AND a.userId = :userId AND a.deletedAt IS NULL
    """)
```

## Async Processing

### Khi nào dùng `@Async`?

- AI calls (long-running)
- Email sending (Gmail API)
- File processing (PDF parsing)
- Bất cứ task nào > 1 giây mà user không cần đợi

### Setup

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean(name = "aiTaskExecutor")
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("ai-task-");
        executor.initialize();
        return executor;
    }
    
    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("email-task-");
        executor.initialize();
        return executor;
    }
}
```

### Usage

```java
@Async("aiTaskExecutor")
public void analyzeApplicationAsync(Long applicationId) {
    log.info("Starting async AI analysis for application {}", applicationId);
    try {
        // load + analyze logic
    } catch (Exception e) {
        log.error("AI analysis failed for application {}", applicationId, e);
        // KHÔNG để exception bị nuốt → log để debug
    }
}
```

**LUÔN log start + log error trong async method** (vì exception ngoài controller bị swallow).

## Caching Strategy

### Dùng Spring Cache Abstraction (đơn giản)

```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .disableCachingNullValues();
        
        Map<String, RedisCacheConfiguration> configs = new HashMap<>();
        configs.put("ai-cv-jd-match", defaultConfig.entryTtl(Duration.ofDays(30)));
        configs.put("ai-jd-insight", defaultConfig.entryTtl(Duration.ofDays(30)));
        configs.put("ai-cv-parse", defaultConfig.entryTtl(Duration.ofDays(90)));
        configs.put("user-profile", defaultConfig.entryTtl(Duration.ofMinutes(15)));
        
        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(configs)
            .build();
    }
}
```

### Usage

```java
@Service
public class AiAnalysisService {
    
    @Cacheable(value = "ai-cv-jd-match", key = "#cacheKey")
    public CvJdMatchResult matchCvJd(String cacheKey, String cvContent, String jdContent) {
        // Tính match score qua AI, kết quả được cache
    }
    
    @CacheEvict(value = "user-profile", key = "#userId")
    public void updateUserProfile(Long userId, UpdateProfileRequest request) {
        // ...
    }
}
```

### Cache Key Generation

Cache key cần unique theo input. Dùng SHA-256 hash của input content:

```java
private String generateCacheKey(String type, String... inputs) {
    String concatenated = String.join("|", inputs);
    String hash = DigestUtils.sha256Hex(concatenated).substring(0, 16);
    return String.format("%s:%s", type, hash);
}
```

## Validation Strategy

### 2 lớp validation

1. **DTO validation** (Bean Validation): syntactic
2. **Service validation**: semantic + business rules

```java
public record CreateApplicationRequest(
    @NotBlank @Size(max = 255) String companyName,
    @NotBlank String position,
    @NotBlank @Size(min = 10, max = 50000) String jdContent,
    @PastOrPresent LocalDate appliedDate,
    Long cvVersionId
) {}

@Service
public class ApplicationService {
    
    @Transactional
    public ApplicationResponse create(Long userId, CreateApplicationRequest request) {
        // Service-level validation (business rule)
        if (request.cvVersionId() != null) {
            CvVersion cv = cvVersionRepository.findById(request.cvVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
            if (!cv.getUserId().equals(userId)) {
                throw new ForbiddenException("CV version does not belong to user");
            }
        }
        
        // ... save logic
    }
}
```

## Security in Service Layer

### Ownership Check Pattern (CRITICAL)

**LUÔN check ownership trong mọi service method động vào user-owned resource.**

#### Pattern 1: Query với userId (ĐƯỢC ƯU TIÊN)

```java
public ApplicationResponse getById(Long userId, Long applicationId) {
    Application application = applicationRepository
        .findByIdAndUserIdAndDeletedAtIsNull(applicationId, userId)  // include userId
        .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
    return toResponse(application);
}
```

**Pros**: Một query, automatic security. Nếu wrong userId → throw NotFound (không reveal resource exists).

#### Pattern 2: Load → check (cho case phức tạp)

```java
public void deleteCv(Long userId, Long cvId) {
    CvVersion cv = cvVersionRepository.findById(cvId)
        .orElseThrow(() -> new ResourceNotFoundException("CV not found"));
    
    if (!cv.getUserId().equals(userId)) {
        throw new ForbiddenException("You don't have access to this resource");
    }
    
    cvVersionRepository.delete(cv);
}
```

**Khi nào dùng Pattern 2**: khi cần access object trước khi check (vd: cần biết file URL để xóa file trên Cloudinary).

**Ưu tiên Pattern 1** khi có thể.

## SecurityUtils Helper

```java
@Component
public class SecurityUtils {
    
    public Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new UnauthorizedException("Not authenticated");
        }
        // Implement based on UserDetails / JWT claims
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return principal.getUserId();
    }
    
    public String getCurrentUserEmail() {
        // ...
    }
}
```

Controllers inject `SecurityUtils` và gọi `getCurrentUserId()` để pass vào service.

## Configuration

### application.yml structure

3 profiles: `dev` (default), `test`, `prod`.

```yaml
spring:
  application:
    name: job-tracker-ai
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration
  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT}

logging:
  level:
    com.jobtrackerai: INFO

# Custom config
app:
  jwt:
    secret: ${JWT_SECRET}
    access-token-expiry-seconds: ${JWT_ACCESS_EXPIRY:900}
    refresh-token-expiry-seconds: ${JWT_REFRESH_EXPIRY:604800}
  google:
    client-id: ${GOOGLE_CLIENT_ID}
    client-secret: ${GOOGLE_CLIENT_SECRET}
  gemini:
    api-key: ${GEMINI_API_KEY}
    model: gemini-1.5-flash
```

### @ConfigurationProperties Pattern

```java
@ConfigurationProperties(prefix = "app.jwt")
@Validated
@Getter
@Setter
public class JwtProperties {
    @NotBlank
    private String secret;
    
    @Positive
    private int accessTokenExpirySeconds = 900;
    
    @Positive
    private int refreshTokenExpirySeconds = 604800;
}
```

Enable trong main class:
```java
@SpringBootApplication
@ConfigurationPropertiesScan
public class JobTrackerAiApplication { ... }
```
