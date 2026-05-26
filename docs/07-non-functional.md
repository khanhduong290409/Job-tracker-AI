# 07. Non-Functional Requirements

## Performance Targets

### Response Time
- **Static endpoints** (GET list, detail): < 300ms p95
- **Write endpoints** (POST/PUT/DELETE): < 500ms p95
- **AI endpoints** (sync): < 5s p95 (with cache hit), < 15s without
- **AI endpoints** (async): return ≤ 200ms, processing background
- **File upload**: < 2s for 5MB file
- **Frontend page load**: First Contentful Paint < 1.5s

### Throughput
- Target: 100 concurrent users (project scale)
- Spike: up to 500 concurrent for short bursts
- Database connections: pool size 20

### Scalability
- Stateless backend → horizontal scale ready
- Session-less (JWT) → no sticky sessions needed
- Redis cache → đỡ DB load
- Async processing với @Async + ThreadPoolExecutor

## Availability

- Target: 99% uptime (project demo, không cần 99.99%)
- Graceful degradation:
  - AI down → app vẫn dùng được, hiển thị "AI temporarily unavailable"
  - Email/Gmail down → cho phép manual entry
  - Redis down → fallback to DB query (slower nhưng OK)

## Reliability

### Error Handling
- Global exception handler trong Spring (`@RestControllerAdvice`)
- Mọi exception unhandled → log + return 500 generic message (không leak stack)
- Custom exceptions cho từng domain:
  - `ResourceNotFoundException` → 404
  - `ValidationException` → 400
  - `UnauthorizedException` → 401
  - `ForbiddenException` → 403
  - `InvalidStateTransitionException` → 400
  - `AiServiceException` → 503
  - `RateLimitExceededException` → 429

### Retry Logic
- AI calls: 3 retries với exponential backoff
- Email send: 3 retries (queue-based)
- Webhook calls: retry với dead letter

### Circuit Breaker
- Dùng Resilience4j cho AI service
- Open circuit after 5 consecutive failures
- Half-open after 60s

### Data Integrity
- Database transactions cho multi-step operations
- Optimistic locking với `@Version` cho race conditions
- Foreign key constraints + cascade rules ở DB level

## Testing Strategy

### Unit Tests
- **Framework**: JUnit 5 + Mockito + AssertJ
- **Target coverage**: 70%+ for service layer, 50%+ overall
- **What to test**:
  - Service business logic
  - Validators
  - Mappers
  - Utility functions
- **What NOT to test**: 
  - Getters/setters
  - Simple DTOs
  - Generated code

### Integration Tests
- **Framework**: SpringBootTest + Testcontainers (PostgreSQL + Redis)
- **Target**: cover critical flows end-to-end at API level
- **Critical flows to test**:
  - Auth flow: Google OAuth → access token → protected endpoint
  - CV upload → parse → retrieve
  - Application CRUD với status transitions
  - AI analysis with mocked AI service
  - Email send flow (mock Gmail API)
- **Test data**: factories với Instancio or manual builders

### Test Structure (BDD-style with AssertJ)
```java
@Test
@DisplayName("Should reject status transition from APPLIED to ACCEPTED")
void shouldRejectInvalidStatusTransition() {
    // Given
    Application app = applicationFactory.create(ApplicationStatus.APPLIED);
    
    // When / Then
    assertThatThrownBy(() -> 
        applicationService.changeStatus(app.getId(), ApplicationStatus.ACCEPTED, null)
    )
        .isInstanceOf(InvalidStateTransitionException.class)
        .hasMessageContaining("Cannot transition from APPLIED to ACCEPTED");
}
```

### Frontend Tests
- **Framework**: Vitest + React Testing Library
- **What to test**: Critical user flows, complex components
- **Skip**: simple presentational components
- **Don't aim for 100%**: pragmatic coverage

### Manual Testing
- Maintain test checklist trong `docs/qa-checklist.md`
- Run through trước mỗi major deploy

## Logging

### Logger Setup
- SLF4J + Logback
- Format: JSON cho prod (parsable), human-readable cho dev
- MDC for: traceId, userId, requestPath

### Log Levels
| Level | When to use |
|-------|-------------|
| ERROR | Unexpected errors, system failures |
| WARN | Recoverable issues, deprecated usage, security events |
| INFO | Business events (login, application created, etc.) |
| DEBUG | Detailed flow info for troubleshooting |
| TRACE | Very verbose, performance investigation |

### Log Examples
```java
log.info("Application created: id={}, userId={}, company={}", 
    app.getId(), userId, app.getCompanyName());

log.error("AI service call failed: type={}, userId={}, error={}", 
    analysisType, userId, e.getMessage(), e);

log.warn("Rate limit hit: userId={}, endpoint={}, attempts={}", 
    userId, endpoint, attempts);
```

### Request Logging
- Filter logs mọi request: method, path, status, duration, userId
- Skip /health, /metrics endpoints

## Monitoring

### Application Metrics (Micrometer + Actuator)
Expose `/actuator/metrics`:
- `http.server.requests` - request rate, latency by endpoint
- `jvm.memory.used`
- `hikaricp.connections.active`
- `cache.gets` - Redis cache hit rate
- Custom metrics:
  - `ai.calls.total` - tagged by type, success
  - `ai.tokens.used` - sum
  - `ai.cache.hits` / `ai.cache.misses`

### Health Check
- `/actuator/health` - liveness probe
- `/actuator/health/readiness` - check DB, Redis, AI service reachable

### Error Tracking (Optional)
- Sentry hoặc tự host (GlitchTip)
- Capture unhandled exceptions với context (userId, request)

## Deployment

### Environments
- **Local**: Docker Compose
- **Dev/Staging**: Railway or Render free tier
- **Prod**: same as Dev cho demo (no separate env needed)

### Docker Setup

`backend/Dockerfile`:
```dockerfile
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: jobtracker
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/jobtracker
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      # ... other env vars
    ports:
      - "8080:8080"

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### CI/CD (GitHub Actions)

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven
      - name: Run tests
        run: cd backend && ./mvnw test
      
  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run typecheck
      - run: cd frontend && npm run lint
      - run: cd frontend && npm test

  build-docker:
    needs: [backend-test, frontend-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: |
          docker build -t backend:latest ./backend
          docker build -t frontend:latest ./frontend
      # Push to registry, deploy...
```

### Database Migrations
- Run automatic at app startup (Flyway)
- Rollback strategy: write compensating migration, never modify existing

## Documentation

### API Documentation
- Swagger UI at `/swagger-ui.html`
- OpenAPI 3.0 spec
- Annotate controllers với `@Operation`, `@Schema`

### Code Documentation
- Javadoc cho public APIs (services, important utilities)
- README.md cho project overview
- ARCHITECTURE.md cho high-level design
- Inline comments cho complex logic only (explain WHY, not WHAT)

### README Should Include
- Project description
- Tech stack
- Prerequisites
- Setup instructions
- Run instructions (dev + prod)
- Architecture overview
- Screenshots / demo video link
- Known issues / future improvements

## Internationalization (i18n)

- **Scope project**: chỉ tiếng Anh cho UI lần đầu, có thể add tiếng Việt sau
- Backend error messages: tiếng Anh
- AI prompts: tiếng Anh (AI tự match language của input)
- Date/time format: ISO 8601 in API, locale-formatted in UI

## Accessibility (A11y)

- Semantic HTML
- Keyboard navigation hoạt động
- Focus visible
- Color contrast WCAG AA
- Form labels properly associated
- Skip don't worry about screen reader testing in detail (out of scope cho project)
