# Handoff Context — 2026-06-24 (Phase 4 AI Integration — BACKEND + FRONTEND XONG, còn US-CV-002 File 20-22)

File này tổng hợp toàn bộ context để chat mới resume project mà không cần đọc lại history dài. **Đọc thứ tự**: file này → [decisions.md](./decisions.md) → [progress.md](./progress.md) → rules.

---

## 1. User Profile

- Sinh viên IT, ~6 tháng kinh nghiệm Spring + React
- Làm intern project 8 tuần (Job-tracker-AI)
- Dev trên Windows 10 + PowerShell (KHÔNG WSL)
- Đọc/viết tiếng Việt, thêm comment tiếng Việt vào file để học
- Thích hiểu sâu — hỏi "tại sao" nhiều, cần giải thích 4 phần sau mỗi file

## 2. Project ở giai đoạn nào

**Phase 4: AI Integration — ĐANG LÀM (19/22 file). Backend 13/13 ✅ · Frontend 6/6 ✅ · CV-002 0/3.**

### Phase 4 — tiến độ chi tiết

**BACKEND HOÀN THÀNH (13/13)** — compile PASS, AiAnalysisServiceTest 9/9 PASS. Chi tiết File 9-13 xem progress.md (2026-06-21). Đã commit local `7904994` (chưa push).

**FRONTEND HOÀN THÀNH (6/6, File 14-19)** — tsc PASS, eslint 0 error. Chi tiết xem progress.md (2026-06-24). Chưa commit.
- `features/ai/types.ts` (mirror DTO) · `api/ai-api.ts` + `queries.ts` (lazy query, force re-analyze)
- `JdInsightSection.tsx` · `AiMatchCard.tsx` (phân biệt lỗi 400 vs 503)
- Nhúng vào `ApplicationDetailPage` · nút auto-fill trong `CreateApplicationPage`
- 1 warning lành tính: `watch('jdContent')` + React Compiler (`react-hooks/incompatible-library`) — chỉ hiện khi `npm run lint`, không ảnh hưởng build. Chưa quyết né hay giữ.

**Next:** US-CV-002 (File 20-22) — File 20 `CvService.updateParsedData()` + `PATCH /api/v1/cv/{id}/parsed-data`. Sau đó manual test UI toàn bộ AI flow trên browser (cần `GEMINI_API_KEY` trong `.env`).

3 endpoint backend đã có:
- `POST /api/v1/ai/extract-jd` (body `{jdContent}`) → JdInsightResponse, stateless auto-fill form
- `GET /api/v1/applications/{id}/jd-insight` → JdInsightResponse (cache theo hash JD)
- `GET /api/v1/applications/{id}/cv-jd-match?force=true` → CvJdMatchResponse (cần application có CV đã parse COMPLETED)

**Done (shared/ai layer — 7 file):**
- `V6__create_ai_analyses_table.sql` — bảng `ai_analyses` (input_hash, result JSONB, CASCADE từ application)
- `shared/ai/GeminiProperties.java` — `@ConfigurationProperties("app.gemini")`, apiKey + model
- `shared/ai/AiPrompt.java` — record: systemPrompt, userPrompt, temperature, maxTokens, jsonMode; factory `AiPrompt.of()`
- `shared/ai/AiResponse.java` — record: rawText, tokensUsed, modelUsed, latencyMs
- `shared/ai/AiService.java` — interface: `generate(AiPrompt)` + `isHealthy()`
- `shared/ai/GeminiAiService.java` — RestClient call Gemini v1beta, retry 3x exponential backoff (1s→2s→4s), phân biệt transient (429/5xx) vs permanent (400/403)
- `shared/ai/JsonResponseParser.java` — strip ```json fence, extract `{…}`, parse thành typed DTO
- `shared/exception/AiException.java` — RuntimeException, handler trả 503 trong GlobalExceptionHandler

**Done (ai/ module — 6 file, File 8-13):**
- `ai/entity/AiAnalysisType.java` — enum: `JD_INSIGHT`, `CV_JD_MATCH`
- `ai/entity/AiAnalysis.java` — entity (result JsonNode, append-only, no soft delete)
- `ai/repository/AiAnalysisRepository.java` — latest + DB-cache-by-hash query
- `ai/dto/JdInsightResponse.java` + `CvJdMatchResponse.java` + `ExtractJdRequest.java`
- `ai/service/AiAnalysisService.java` — lõi (DB-cache hash-keyed, no @Transactional)
- `ai/controller/AiController.java` + `ai/service/AiAnalysisServiceTest.java` (9/9 PASS)

**Quyết định kỹ thuật Phase 4 (thêm vào decisions.md sau):**
- `shared/ai/` = infrastructure (HTTP client) — nhiều module dùng. `ai/` = domain module (business logic + entity + controller)
- `GeminiAiService` dùng `RestClient.Builder` (prototype bean của Spring Boot) thay vì `RestClient.create()` để kế thừa global customizer
- Private nested records trong `GeminiAiService` cho Gemini request/response schema — `@JsonIgnoreProperties` trên response records để tolerant với field mới của Gemini API
- `JsonResponseParser` inject `ObjectMapper` từ Spring context (không `new`) để nhất quán config toàn hệ thống
- `AiException` → 503 SERVICE_UNAVAILABLE (không phải 500) — báo "downstream down", client có thể retry

### Phase 3 — Backend (9/9 XONG ✅ — compile PASS, 23/23 test PASS)

| # | File/Bước | Status |
|---|-----------|--------|
| 1 | `V5__create_application_tables.sql` | ✅ |
| 2 | 5 enum (`ApplicationStatus`, `WorkType`, `EmploymentType`, `ApplicationSource`, `TimelineEventType`) | ✅ |
| 3 | `ContactPerson` record + 3 entity (`Application`, `ApplicationStatusHistory`, `ApplicationTimelineEvent`) | ✅ |
| 4 | 3 repository (`ApplicationRepository` multi-status SpEL, `StatusHistoryRepo`, `TimelineEventRepo`) | ✅ |
| 5 | 10 DTOs | ✅ |
| 6 | `ApplicationStateMachine` + `InvalidStateTransitionException` | ✅ |
| 7 | `ApplicationService` (6 method, ownership tập trung, baseline history) | ✅ |
| 8 | `ApplicationController` (7 endpoint) + `shared/dto/PagedResponse` | ✅ |
| 9 | Tests: `ApplicationStateMachineTest` (12) + `ApplicationServiceOwnershipTest` (11) | ✅ |

✅ Backend đã manual test qua curl (10/10 endpoint PASS) — xem learning/test-phase3-backend.md.

### Phase 3 — Frontend (6/6 XONG ✅ — tsc + eslint + build PASS)

| # | File/Bước | Status |
|---|-----------|--------|
| 10 | `features/applications/types.ts` (+ enum vào `types/common.ts`, `TIMELINE_EVENT_LABELS`) | ✅ |
| 11 | `features/applications/api/application-api.ts` (7 endpoint, `paramsSerializer indexes:null`) | ✅ |
| 12 | `features/applications/api/queries.ts` (TanStack, `keepPreviousData`) | ✅ |
| 13 | `ApplicationStatusBadge.tsx` + `ApplicationCard.tsx` (+ `status-meta.ts`: config + `ALLOWED_TRANSITIONS`) | ✅ |
| 14 | `ApplicationListPage` + `CreateApplicationPage` (RHF+Zod) + `ApplicationDetailPage` | ✅ |
| 15 | `routes.tsx` update (3 route applications) | ✅ |

**PHASE 3 HOÀN THÀNH (backend + frontend).** Còn lại: manual test UI trên browser (chưa làm).

### Cấu trúc package đã dùng (QUAN TRỌNG — follow đúng)

```
application/
├── entity/         ← enums + entities + ContactPerson record
├── repository/     ← 3 repositories
├── service/        ← ApplicationService + ApplicationStateMachine
├── controller/     ← ApplicationController
├── dto/            ← 10 DTOs
└── exception/      ← rỗng (InvalidStateTransitionException đã chuyển sang shared/exception/)
```

### Decisions quan trọng trong session này (xem decisions.md)

- `InvalidStateTransitionException` đặt trong `shared/exception/`, xử lý trong `GlobalExceptionHandler` — không tạo handler riêng per-module
- `ApplicationFilter` là POJO class (Lombok), không phải record — vì `@ModelAttribute` cần setters
- `UpdateApplicationRequest` là POJO class — PATCH semantics: null = giữ nguyên
- `ContactPerson` entity record có 5 field: `name, email, phone, role, linkedinUrl`
- `ApplicationResponse` (detail) include `statusHistory` + `timelineEvents`; `ApplicationListItemResponse` (list) nhẹ hơn, không có `jdContent`
- `ApplicationStateMachine` nằm trong `application/service/` (không phải root)

Defer sang Phase 4+: parse-jd (AI), file upload endpoint, AI analysis, Kanban

### Phase 2 — DONE (tổng kết)

| # | File | Status |
|---|------|--------|
| 1-5 | DB migration, entity, repository, storage layer, DTO | ✅ |
| 6 | `cv/service/CvService.java` | ✅ |
| 7 | `cv/controller/CvController.java` | ✅ |
| 8 | `cv/service/CvServiceOwnershipTest.java` (9 tests) | ✅ |
| 9-13 | Frontend: types, api, queries+polling, components+page, routes | ✅ |

## 3. Decisions quan trọng (đọc decisions.md để đầy đủ)

**D-012:** Cloudinary từ Phase 2, không dùng LocalFileStorageService. `delete()` vẫn no-op (Phase 7).

**D-013:** `QueryClientProvider` phải bọc toàn bộ app trong `App.tsx`. `QueryClient` instance khai báo ngoài component để không bị recreate.

**D-016 (Phase 3):** create application cho phép chọn MỌI status (default SAVED) — override restriction SAVED/APPLIED của D-015, để backfill app đang dở dang. "create = chụp ảnh thực tại" vs "changeStatus = tiến trình về sau".

**D-017 (Phase 3):** giữ state machine CỨNG cho changeStatus (đã cân nhắc vs free-form/hybrid). Lý do: học pattern + cho `status_history` sạch → nền cho reminder Phase 5 (FOLLOW_UP_AFTER_APPLY, STATUS_STALE) + analytics.

**Contract đổi:** query param list `status` → `statuses` (khớp field POJO `ApplicationFilter` + `@ModelAttribute`).

**Kỹ thuật đã dùng (không cần giải thích lại ở session sau):**
- `@Async("aiTaskExecutor")` + self-injection `@Autowired @Lazy` để gọi @Async từ cùng class
- `Loader.loadPDF(byte[])` — PDFBox 3.x API (không phải `PDDocument.load()`)
- `@SQLDelete` + `@SQLRestriction` — soft delete Hibernate 6.4
- `@Modifying(clearAutomatically = true)` — bulk UPDATE
- TanStack Query v5: `refetchInterval: (query) => query.state.data?.some(...) ? 3000 : false`
- `useRef` để reset DOM `<input type="file">` sau submit
- `variables` từ `useMutation` để track per-card loading state
- SpEL trong `@Query`: `:#{#statuses.isEmpty()} = true OR a.status IN :statuses` — multi-status optional filter
- `@JdbcTypeCode(SqlTypes.JSON)` + `columnDefinition = "jsonb"` — JSONB field với typed Java record
- `@PrePersist`/`@PreUpdate` + `Instant.now()` — không dùng Spring Auditing
- `Map.of()` + `Set.of()` — immutable collections cho state machine transition table

## 4. Plan tổng (7 phases)

- **Phase 0:** Setup hạ tầng ← **DONE**
- **Phase 1:** Auth (Google OAuth + JWT) ← **DONE**
- **Phase 2:** CV Management ← **DONE**
- **Phase 3:** Application CRUD + State Machine ← **DONE**
- **Phase 4:** AI Integration + edit parsed CV data (US-CV-002) ← **TIẾP THEO**
- **Phase 5:** Reminders & Notifications
- **Phase 6:** Email Integration
- **Phase 7:** Analytics + Polish + Deploy

## 5. Workflow standard

- Đọc rules + docs liên quan TRƯỚC khi code
- Self-review plan (bước 2.5) trước khi show user
- Code từng file một, self-review (bước 3.5) trước khi show user
- Giải thích 4 phần sau mỗi file: (1) làm gì (2) pattern lạ (3) quyết định kỹ thuật (4) edge case
- Test: Mockito cho 4 critical components, manual test cho phần còn lại
- Không tự thêm dependency, không refactor ngoài scope

## 6. Cách resume

Trong chat mới, user nhắn: **"resume project"** hoặc **"đọc notes/handoff.md"**

Mình sẽ:
1. Đọc handoff.md + decisions.md + progress.md
2. Đọc rules `.kilocode/rules/` liên quan
3. Đọc `docs/` liên quan Phase 3 trước khi plan
4. Đưa plan Phase 3, chờ user confirm, rồi code từng file

## 7. Workflow chạy backend

**Trước khi run, đảm bảo Docker Desktop đang chạy:**

```powershell
# Từ root
docker compose up -d

# Từ backend/
.\mvnw.cmd spring-boot:run
```

Test: `curl.exe http://localhost:8080/actuator/health` → `{"status":"UP"}`

## 8. Workflow chạy frontend

```powershell
cd D:\Job-tracker-AI\frontend
npm run dev
# Dev server: http://localhost:5173
```

## 9. Workflow chạy Docker

- Start: `docker compose up -d` (từ root)
- Stop tạm: `docker compose stop`
- Down (giữ volume): `docker compose down`
- **`docker compose down -v`** — xóa volume = MẤT HẾT DB

---

**File này tự xóa hoặc keep tùy user khi project xong.**
