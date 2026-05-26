# 04. Testing Strategy

## Philosophy

Project này dùng **2-layer testing**:

1. **Manual test** cho mọi feature (giống workflow user đã quen)
2. **Mockito unit test** cho 4 critical components (security/business logic phức tạp)

KHÔNG dùng:
- Integration test với Testcontainers
- E2E test với Selenium/Playwright
- Coverage target (vd: 70%)

Lý do: Project intern 8 tuần, viết feature đã đuối. Test có ý nghĩa quan trọng hơn coverage cao.

---

## Manual Test (cho mọi feature)

### Sau khi code xong 1 feature, AI agent đưa guide test theo format:

```markdown
## Cách test feature <name>

### 1. Compile/Start
- Backend: `cd backend && ./mvnw clean compile` → phải PASS, không error
- Backend: `./mvnw spring-boot:run` → phải start được, no exception
- Frontend: `cd frontend && npm run dev` → mở localhost:5173, no console error

### 2. Test API qua Postman/Swagger UI
- Swagger: http://localhost:8080/swagger-ui.html
- Endpoint vừa làm: <method> <path>
- Test 3 cases tối thiểu:
  - Happy path: <example request> → expect <expected response>
  - Invalid input: <example request with bad data> → expect 400 validation
  - Unauthorized: no Authorization header → expect 401

### 3. Test DB
- Connect: `psql -U postgres -d jobtracker` (hoặc DBeaver/pgAdmin)
- Query: `SELECT * FROM <table> WHERE <condition>;`
- Verify: <field> đúng giá trị, <constraint> được apply

### 4. Test UI qua Browser
- URL: localhost:5173/<page>
- Steps:
  1. Login với Google
  2. Navigate to <page>
  3. Thao tác: <input cụ thể>
- Expect: <UI behavior>
- Check DevTools Network tab: request đúng, response 2xx

### 5. Test Edge Cases UI
- Bỏ trống field bắt buộc → hiển thị error message
- Nhập quá max length → block hoặc hiển thị error
- Network throttle (Slow 3G) → loading state hiển thị đúng

### 6. Regression - Không break feature cũ
- Click qua các feature liên quan: <list>
- Verify: tất cả vẫn hoạt động bình thường
```

### Vai trò Manual Test

- **AI verify được**: compile, start app, đọc code, type check
- **User verify được**: bấm UI, xem browser, kiểm tra DB
- **Combine**: AI guide user step-by-step → user thực hiện → screenshot/báo result

---

## Mockito Unit Test (cho 4 critical components)

### Quy tắc cứng

Chỉ viết Mockito unit test cho:
1. `AuthService` - JWT generation/validation
2. `ApplicationStateMachine` - status transitions
3. `AiService` / `GeminiAiService` - prompt building, JSON parsing
4. **Ownership check** - trong các service có access user-owned resources

**KHÔNG viết Mockito test cho**:
- CRUD đơn giản (CvService, UserService, NotificationService, ...)
- Getter/setter
- DTO factory method
- Trivial code

### Lý do

| Component | Tại sao critical? | Risk nếu bug |
|-----------|-------------------|--------------|
| AuthService | Security | Bị hack, giả mạo token |
| StateMachine | Logic phức tạp | Status sai → data corrupt |
| AiService | Logic phức tạp | App crash khi AI fail |
| Ownership | Security | User A xem được data user B |

---

## Test Setup

### Dependencies (đã có trong Spring Boot starter)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

Bao gồm: JUnit 5, Mockito, AssertJ, Spring Test.

### Test Folder Structure

```
backend/src/test/java/com/jobtrackerai/
├── auth/
│   └── AuthServiceTest.java
├── application/
│   ├── ApplicationStateMachineTest.java
│   └── ApplicationServiceOwnershipTest.java
└── ai/
    └── GeminiAiServiceTest.java
```

Mỗi component test trong 1 file riêng. KHÔNG gộp nhiều test vào 1 file.

---

## Test Patterns

### Pattern: Standard Mockito Test

```java
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    
    @Mock
    private JwtProperties jwtProperties;
    
    @InjectMocks
    private AuthService authService;
    
    @Test
    @DisplayName("Should generate valid JWT access token with correct claims")
    void shouldGenerateValidAccessToken() {
        // GIVEN
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        
        when(jwtProperties.getSecret()).thenReturn("test-secret-min-256-bits-aaaaaaaaaa");
        when(jwtProperties.getAccessTokenExpirySeconds()).thenReturn(900);
        
        // WHEN
        String token = authService.generateAccessToken(user);
        
        // THEN
        assertThat(token).isNotBlank();
        Claims claims = parseToken(token);
        assertThat(claims.getSubject()).isEqualTo("1");
        assertThat(claims.get("email")).isEqualTo("test@example.com");
        assertThat(claims.getExpiration()).isAfter(new Date());
    }
}
```

### Pattern: Test Naming

- Class: `<ClassUnderTest>Test`
- Method: `should<ExpectedBehavior>When<Condition>`
- `@DisplayName`: human-readable

```java
@Test
@DisplayName("Should throw InvalidStateTransitionException when transition from APPLIED to ACCEPTED")
void shouldThrowWhenInvalidTransitionFromAppliedToAccepted() {
    // ...
}
```

### Pattern: AssertJ (preferred over JUnit assertions)

```java
// ✅ AssertJ
assertThat(response.companyName()).isEqualTo("VNG");
assertThat(applications).hasSize(3);
assertThat(applications)
    .extracting(Application::getStatus)
    .containsExactly(APPLIED, PHONE_SCREEN);
assertThatThrownBy(() -> service.method())
    .isInstanceOf(BusinessException.class)
    .hasMessageContaining("expected message");

// ❌ JUnit (verbose)
assertEquals("VNG", response.companyName());
assertEquals(3, applications.size());
```

---

## Concrete Examples for 4 Critical Components

### 1. AuthServiceTest

Tests cần có (3-4 tests):

```java
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    
    @Mock private UserRepository userRepository;
    @Mock private JwtProperties jwtProperties;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    
    @InjectMocks private AuthService authService;
    
    @Test
    @DisplayName("Should generate JWT with correct user claims")
    void shouldGenerateJwtWithCorrectClaims() {
        // GIVEN, WHEN, THEN as above
    }
    
    @Test
    @DisplayName("Should validate valid JWT and return user ID")
    void shouldValidateValidJwt() {
        // ...
    }
    
    @Test
    @DisplayName("Should throw UnauthorizedException when JWT is expired")
    void shouldThrowWhenJwtExpired() {
        // ...
    }
    
    @Test
    @DisplayName("Should create new user when first time Google OAuth login")
    void shouldCreateUserOnFirstGoogleLogin() {
        // GIVEN
        GoogleUserInfo googleInfo = new GoogleUserInfo(
            "google-123", "test@gmail.com", "Test User", "https://avatar.url"
        );
        when(userRepository.findByGoogleId("google-123"))
            .thenReturn(Optional.empty());
        
        User newUser = new User();
        newUser.setId(1L);
        newUser.setEmail("test@gmail.com");
        when(userRepository.save(any(User.class))).thenReturn(newUser);
        
        // WHEN
        User result = authService.findOrCreateGoogleUser(googleInfo);
        
        // THEN
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getEmail()).isEqualTo("test@gmail.com");
        verify(userRepository).save(any(User.class));
    }
}
```

### 2. ApplicationStateMachineTest

Tests cần có (5-6 tests):

```java
class ApplicationStateMachineTest {
    
    // No mocks needed - this is pure logic
    private final ApplicationStateMachine stateMachine = new ApplicationStateMachine();
    
    @Test
    @DisplayName("Should allow SAVED → APPLIED transition")
    void shouldAllowSavedToApplied() {
        // Không throw exception = pass
        stateMachine.validateTransition(ApplicationStatus.SAVED, ApplicationStatus.APPLIED);
    }
    
    @Test
    @DisplayName("Should allow APPLIED → PHONE_SCREEN transition")
    void shouldAllowAppliedToPhoneScreen() {
        stateMachine.validateTransition(ApplicationStatus.APPLIED, ApplicationStatus.PHONE_SCREEN);
    }
    
    @Test
    @DisplayName("Should reject APPLIED → ACCEPTED transition (must go through OFFER)")
    void shouldRejectAppliedToAccepted() {
        assertThatThrownBy(() -> 
            stateMachine.validateTransition(ApplicationStatus.APPLIED, ApplicationStatus.ACCEPTED))
            .isInstanceOf(InvalidStateTransitionException.class)
            .hasMessageContaining("Cannot transition from APPLIED to ACCEPTED");
    }
    
    @Test
    @DisplayName("Should reject any transition from terminal state ACCEPTED")
    void shouldRejectTransitionFromAcceptedTerminal() {
        assertThatThrownBy(() -> 
            stateMachine.validateTransition(ApplicationStatus.ACCEPTED, ApplicationStatus.OFFER))
            .isInstanceOf(InvalidStateTransitionException.class);
    }
    
    @Test
    @DisplayName("Should reject any transition from terminal state REJECTED")
    void shouldRejectTransitionFromRejectedTerminal() {
        assertThatThrownBy(() -> 
            stateMachine.validateTransition(ApplicationStatus.REJECTED, ApplicationStatus.APPLIED))
            .isInstanceOf(InvalidStateTransitionException.class);
    }
    
    @Test
    @DisplayName("Should allow OFFER → ACCEPTED transition")
    void shouldAllowOfferToAccepted() {
        stateMachine.validateTransition(ApplicationStatus.OFFER, ApplicationStatus.ACCEPTED);
    }
}
```

### 3. GeminiAiServiceTest

Tests cần có (3-4 tests):

```java
@ExtendWith(MockitoExtension.class)
class GeminiAiServiceTest {
    
    @Mock private RestTemplate restTemplate;  // hoặc WebClient
    @Mock private GeminiProperties geminiProperties;
    @Mock private ObjectMapper objectMapper;
    
    @InjectMocks private GeminiAiService aiService;
    
    @Test
    @DisplayName("Should parse valid JSON response into target type")
    void shouldParseValidJsonResponse() throws Exception {
        // GIVEN
        String rawResponse = """
            {
              "matchScore": 75,
              "strengths": ["Java", "Spring"],
              "gaps": ["Docker"]
            }
            """;
        
        CvJdMatchResult expected = new CvJdMatchResult(75, List.of("Java", "Spring"), List.of("Docker"));
        when(objectMapper.readValue(anyString(), eq(CvJdMatchResult.class)))
            .thenReturn(expected);
        
        // WHEN
        CvJdMatchResult result = aiService.parseResponse(rawResponse, CvJdMatchResult.class);
        
        // THEN
        assertThat(result.matchScore()).isEqualTo(75);
        assertThat(result.strengths()).containsExactly("Java", "Spring");
    }
    
    @Test
    @DisplayName("Should extract JSON from markdown code fence wrapped response")
    void shouldExtractJsonFromMarkdownFence() {
        String rawResponse = """
            Here's the analysis:
            ```json
            {"matchScore": 80}
            ```
            """;
        
        String extracted = aiService.extractJson(rawResponse);
        
        assertThat(extracted).isEqualTo("{\"matchScore\": 80}");
    }
    
    @Test
    @DisplayName("Should throw AiResponseFormatException on malformed JSON")
    void shouldThrowOnMalformedJson() throws Exception {
        when(objectMapper.readValue(anyString(), any(Class.class)))
            .thenThrow(new JsonProcessingException("Invalid JSON") {});
        
        assertThatThrownBy(() -> 
            aiService.parseResponse("not json", CvJdMatchResult.class))
            .isInstanceOf(AiResponseFormatException.class);
    }
    
    @Test
    @DisplayName("Should build prompt with all required placeholders replaced")
    void shouldBuildPromptCorrectly() {
        String cvContent = "Java developer with 2 years";
        String jdContent = "Need Java engineer";
        
        String prompt = aiService.buildCvJdMatchPrompt(cvContent, jdContent);
        
        assertThat(prompt)
            .contains(cvContent)
            .contains(jdContent)
            .contains("Output schema")  // structure preserved
            .doesNotContain("<<CV_JSON>>");  // placeholders replaced
    }
}
```

### 4. Ownership Test (trong ApplicationService)

Tests cần có (2-3 tests):

```java
@ExtendWith(MockitoExtension.class)
class ApplicationServiceOwnershipTest {
    
    @Mock private ApplicationRepository applicationRepository;
    @Mock private CvVersionRepository cvVersionRepository;
    @Mock private ApplicationStateMachine stateMachine;
    
    @InjectMocks private ApplicationService applicationService;
    
    @Test
    @DisplayName("Should throw NotFound when user accesses another user's application")
    void shouldThrowNotFoundForOtherUsersApplication() {
        // GIVEN
        Long currentUserId = 1L;
        Long applicationId = 100L;
        
        // Repository return empty when query with currentUserId
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(applicationId, currentUserId))
            .thenReturn(Optional.empty());
        
        // WHEN / THEN
        assertThatThrownBy(() -> applicationService.getById(currentUserId, applicationId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Application not found");
    }
    
    @Test
    @DisplayName("Should return application when user accesses own resource")
    void shouldReturnOwnApplication() {
        Long userId = 1L;
        Long applicationId = 100L;
        
        Application app = new Application();
        app.setId(applicationId);
        app.setUserId(userId);
        app.setCompanyName("VNG");
        app.setStatus(ApplicationStatus.APPLIED);
        
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(applicationId, userId))
            .thenReturn(Optional.of(app));
        
        ApplicationResponse response = applicationService.getById(userId, applicationId);
        
        assertThat(response.id()).isEqualTo(applicationId);
        assertThat(response.companyName()).isEqualTo("VNG");
    }
    
    @Test
    @DisplayName("Should throw Forbidden when creating application with CV of another user")
    void shouldThrowForbiddenForOtherUsersCv() {
        Long currentUserId = 1L;
        Long otherUserId = 2L;
        Long cvId = 50L;
        
        CreateApplicationRequest request = new CreateApplicationRequest(
            "Tech Corp", "Backend", null, "JD content...", null, "ITVIEC", null, cvId, null
        );
        
        // CV exists but belongs to otherUser
        CvVersion otherUserCv = new CvVersion();
        otherUserCv.setId(cvId);
        otherUserCv.setUserId(otherUserId);
        
        when(cvVersionRepository.findById(cvId)).thenReturn(Optional.of(otherUserCv));
        
        assertThatThrownBy(() -> applicationService.create(currentUserId, request))
            .isInstanceOf(ForbiddenException.class)
            .hasMessageContaining("CV version does not belong to user");
    }
}
```

---

## How to Run Tests

```bash
# Chạy tất cả test
cd backend
./mvnw test

# Chạy 1 test class
./mvnw test -Dtest=ApplicationStateMachineTest

# Chạy 1 test method
./mvnw test -Dtest=ApplicationStateMachineTest#shouldAllowSavedToApplied

# Skip test khi build
./mvnw clean package -DskipTests
```

---

## Frontend Testing

### Approach: KHÔNG viết frontend test trong V1

Lý do:
- React Testing Library setup tốn thời gian
- Component đa số là presentational (xem & click)
- Manual test với browser DevTools đã cover đủ

Nếu sau khi xong V1 còn thời gian, có thể thêm test cho:
- Custom hooks (logic)
- Utility functions (vd: date formatters, currency formatter)

KHÔNG test:
- UI components đơn thuần
- React Query hooks (đã test trong useQuery của library)
- Page components (manual test trong browser tốt hơn)

---

## What NOT to Test

KHÔNG viết Mockito test cho:

❌ Service CRUD đơn giản (chỉ findById, save, delete)
- Spring Data JPA đã test rồi
- Test bằng manual API call qua Postman

❌ Controllers
- Controller chỉ orchestrate
- Test logic ở service layer, controller test bằng Postman/Swagger

❌ Repositories
- Spring Data tự generate
- Custom `@Query` test bằng manual SQL execution

❌ DTOs
- Pure data carrier, không có logic

❌ Entities
- Persistence model, không có business logic

❌ Mappers (vì không có mapper class riêng)
- Mapping inline trong service
- Test thông qua service test (nếu cần)

---

## Common Patterns to Remember

### 1. Mock vs InjectMocks

- `@Mock`: dependency của class under test (repository, helper)
- `@InjectMocks`: class under test (service)

### 2. when().thenReturn() pattern

```java
when(mockRepo.findById(1L)).thenReturn(Optional.of(entity));
```

Khi gọi `mockRepo.findById(1L)`, mock return `Optional.of(entity)`.

### 3. verify() to check interactions

```java
verify(mockRepo, times(1)).save(any(Entity.class));
```

Verify `save()` được gọi đúng 1 lần với bất kỳ Entity nào.

### 4. ArgumentCaptor when need to inspect what was passed

```java
ArgumentCaptor<Application> captor = ArgumentCaptor.forClass(Application.class);
verify(applicationRepository).save(captor.capture());
Application saved = captor.getValue();
assertThat(saved.getUserId()).isEqualTo(1L);
assertThat(saved.getStatus()).isEqualTo(ApplicationStatus.APPLIED);
```

### 5. @Nested for grouping tests

```java
class ApplicationServiceOwnershipTest {
    
    @Nested
    @DisplayName("getById()")
    class GetById {
        @Test
        void shouldReturnOwnApplication() { ... }
        
        @Test
        void shouldThrowNotFoundForOtherUser() { ... }
    }
    
    @Nested
    @DisplayName("create()")
    class Create {
        @Test
        void shouldCreateWithValidCv() { ... }
        
        @Test
        void shouldThrowForbiddenForOtherUsersCv() { ... }
    }
}
```

---

## Pre-commit Checklist

Trước khi commit:

- [ ] `./mvnw clean compile` PASS
- [ ] `./mvnw test` PASS (tất cả unit test)
- [ ] App start được không error
- [ ] Manual test 3 case (happy/invalid/unauth) đã làm
- [ ] DB record được tạo đúng (nếu CRUD)
- [ ] UI render đúng (nếu có thay đổi frontend)
