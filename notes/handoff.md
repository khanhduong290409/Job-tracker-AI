# Handoff Context — 2026-07-14 (Phase 6 — Email Integration scope 1b, HOÀN THÀNH + test PASS, chờ commit)

> **Update 2026-07-14 (2) — Phase 6 ĐÓNG: test cuối PASS.** User đăng ký Mailtrap (điền `MAIL_USERNAME`/`MAIL_PASSWORD` vào `.env`) + test trên browser OK. Ghi chú: nút "Mở trong ứng dụng mail" (`mailto:`) bấm không phản hồi = KHÔNG bug (máy chưa có mail client mặc định / chưa đăng ký Gmail làm protocol handler) — dùng nút **Copy nội dung** thay thế; AI soạn nháp chạy tốt. Dispatcher timing: `initialDelay=60s`+`fixedDelay=15p` → sau bật app ~60s quét lần đầu (không phải 15p). **CHƯA commit.** **Next: commit Phase 6 (BE File 1-13 + FE File 14-17 + notes) → Phase 7 (Analytics + Polish + Deploy).**
>
> **Update 2026-07-14 — Phase 6 CODE HOÀN THÀNH (BE File 1-13 + FE File 14-17). CHỈ CÒN test cuối (chờ user đăng ký Mailtrap).** Làm nốt FE File 15-17, `tsc` + `eslint` (0 error) + `npm run build` PASS. **File 15** `email/components/EmailDraftSection.tsx` nhúng `ApplicationDetailPage` (sau ReminderSection): chọn template + custom instructions → `useDraftEmail` → seed local state từ onSuccess → form sửa subject/body/toEmail + Copy (`navigator.clipboard` fail-soft) + `Button asChild` bọc `<a mailto:>` (encode subject/body, để nguyên email); `toEmail` input sửa được = khe nối Gmail-send. **File 16** module `features/settings/` types+api+queries (mirror `UserProfileResponse`; `useProfile` key `['profile']`; `useUpdateNotificationPreferences` mutation dùng `setQueryData` vì PUT trả full profile). **File 17** `settings/pages/SettingsPage.tsx` (2 toggle in-app/email bám server state, lưu ngay; Switch tự chế `<button role="switch">`, không thêm dep) + route `/settings` + link header gear icon (`lucide-react` `Settings` cạnh chuông trong ProtectedLayout). **Chưa commit gì** (BE File 1-13 + FE File 14-17). **CÒN LẠI:** test cuối — cần **Docker up** + **Mailtrap creds** (`MAIL_USERNAME/PASSWORD` trong `.env`, user CHƯA đăng ký) + `GEMINI_API_KEY`: backdate reminder due → restart → verify notification(chuông)+email(Mailtrap) theo prefs + manual test draft AI + toggle Settings + `contextLoads` xanh. **PASS rồi → commit Phase 6 → ĐÓNG → Phase 7.**
>
> **Update 2026-07-13 — Phase 6 BACKEND HOÀN THÀNH (File 1-13, compile + test PASS) + FE File 14 xong.** Code nốt File 9-13 (mảng C — AI soạn nháp email) + trả nợ test. **BE File 9-13:** `email/dto/` (`EmailDraftRequest{templateKey enum, customInstructions}` + `EmailDraftResponse{subject, body, tone, toEmail}`, cả 2 `@JsonIgnoreProperties`) · `email/entity/EmailTemplateKey` enum 3 giá trị (FOLLOW_UP_AFTER_APPLY/THANK_YOU_AFTER_INTERVIEW/STATUS_INQUIRY, kèm `description` cho prompt) · `email/service/EmailDraftService` (ownership app `findByIdAndUserIdAndDeletedAtIsNull` → prompt Template 5 temp 0.6 maxTokens 1000 → AiService+JsonResponseParser → điền `toEmail` từ contactPerson.email; **stateless, không lưu DB, không @Transactional**) · `email/controller/EmailController` (`POST /api/v1/applications/{id}/emails/draft`) · `EmailDraftServiceTest` (3) + **FIX** `ReminderDispatchServiceTest` (thêm mock UserRepository+MailService, +2 case pref off / user deleted). **Verify: `mvnw clean compile` PASS · unit test 75/75 PASS** (chỉ `BackendApplicationTests.contextLoads` đỏ — do Docker/Postgres 5433 chưa bật, KHÔNG phải regression). **FE File 14 xong** (`features/email/` types+api+queries, `tsc` PASS): `EmailTemplateKey` union literal + `EMAIL_TEMPLATE_LABELS` (nhãn VN) + `EmailDraftRequest/Response` + `emailApi.draft` + `useDraftEmail` (mutation). **Next: FE File 15-17** (15 `EmailDraftSection` nhúng ApplicationDetailPage; 16 `features/settings` preferences types+api+queries; 17 `SettingsPage`+route+link header). **Rồi test cuối** (cần Docker + Mailtrap creds trong `.env`): backdate reminder due → verify notification(chuông)+email(Mailtrap) theo prefs + manual test draft AI + toggle Settings. **Chưa commit gì (BE File 1-13 + FE File 14).**
>
> **Update 2026-07-12 — Phase 6 (Email, scope 1b) BẮT ĐẦU: backend File 1-8 xong, CHƯA compile.** Scope chốt sau khi tư vấn: **1b = Lean + SMTP** — (A) notification preferences + (B) kênh EMAIL cho reminder qua SMTP (Mailtrap dev) + (C) AI soạn nháp follow-up cho HR (chỉ gen text + `mailto:`, KHÔNG gửi server-side). **KHÔNG Gmail API** (defer option 2 "gửi as-user" sang SAU khi xong project — thêm sau gần như additive nếu giữ 3 khe nối: draft có `toEmail`, UI form sửa được, code trong `email/`). Dep mới (user OK): `spring-boot-starter-mail`. **File 1-8:** V8 migration (users.notification_preferences JSONB) · pom/yaml/.env mail config · `shared/mail/MailService` (@Async fail-soft) · `NotificationPreferences` record + User field · user DTO/Service/Controller (`GET /users/me`, `PUT /users/me/notification-preferences`) · `ReminderDispatchService` bắn theo prefs.inApp/email. (File 1-8 nay đã compile + test PASS ở update 07-13.)
>
> **Update 2026-07-11 — Phase 5 ĐÓNG (code): đã đọc code + manual test + commit FE.** User đọc hết code Phase 5 (BE+FE) và manual test phần reminder CRUD trên UI OK. Thống nhất: test end-to-end mắt xích "gửi" (dispatcher bắn reminder due → notification → badge chuông) **gộp làm khi Phase 6 (Email) xong**, vì Phase 6 cùng đụng notification flow → test 1 lượt cho gọn. Code "gửi notification" KHÔNG thiếu — nằm ở `ReminderDispatchService.dispatchDueReminders()` (scheduled 15', đã verify end-to-end qua psql hôm 07-06); chỉ là chưa quan sát trên browser (reminder tạo qua UI luôn @Future nên dispatcher chưa bắn — muốn thấy phải backdate + restart). **Next: Phase 6 — Email Integration.**
>
> **Update 2026-07-07 — Phase 5 FRONTEND HOÀN THÀNH (File 12-15), backend đã commit `9d1ad17`:** 2 module FE mới `features/notifications/` + `features/reminders/`. File 12 notifications types/api/queries (unread-count poll 30s). File 13 `NotificationBell` (badge + dropdown overlay click-outside, dùng lucide `Bell`) nhúng `ProtectedLayout` (thêm `<header>` sticky). File 14 reminders types/api/queries (list mảng thuần, create luôn CUSTOM). File 15 `ReminderSection` (form tạo + list + dismiss/delete) nhúng `ApplicationDetailPage` sau khối Đổi trạng thái. **tsc + eslint + `npm run build` PASS (1976 modules).** Chi tiết + quyết định kỹ thuật + 2 bài học (Bash heredoc vs PS here-string; grep package.json trước khi tự chế UI) xem progress.md 2026-07-07. **Next: manual test FE trên browser (chuông + reminder) → commit FE → Phase 5 ĐÓNG → Phase 6 Email.**
>
> **Update 2026-07-06 (2) — Phase 5 BACKEND VERIFIED runtime:** Đã chạy backend thật (Docker + `mvnw spring-boot:run`). V7 migration apply mới OK (2 bảng + index + check constraint). App start OK, health UP. **Dispatcher end-to-end PASS** (chèn reminder due → restart → 60s sau bắn `Reminders dispatched: 1` → DB: `sent_at` được ghi + notification tạo đúng metadata) — KHÔNG dính bug transaction/flush kiểu Phase 4. Data test đã dọn. Chi tiết + lưu ý vận hành (DB port 5433, đừng taskkill java giữa compile) xem progress.md 2026-07-06. **Next: Frontend File 12 (FE notifications types/api/queries), rồi 13-15, commit.**
>
> **Update 2026-07-06 (Phase 5 — Reminders & Notifications, BACKEND HOÀN THÀNH):** 2 module mới `reminder/` + `notification/`. Scope IN_APP only (email defer Phase 6), 3 reminder type: CUSTOM + FOLLOW_UP_AFTER_APPLY + STATUS_STALE. `ReminderJobs` @Scheduled: generator cron 08:00 (dedup once-per-app-per-type, terminal guard) + dispatcher fixedDelay 15' bắn reminder due → notification + set sent_at. Polling cho badge (không WebSocket). Compile PASS, **test 16/16 PASS** (ReminderServiceOwnershipTest 7 + NotificationServiceOwnershipTest 4 + ReminderDispatchServiceTest 5). **CHI TIẾT + quyết định kỹ thuật xem progress.md 2026-07-04.** **Next: Frontend File 12-15, commit.**
>
> **Update 2026-07-02:** Manual test upload CV phát hiện & fix 3 bug (xem progress.md + blockers.md B-002/B-003): (1) transaction readOnly làm status kẹt PENDING → `@Transactional(NOT_SUPPORTED)` trên parseCvAsync; (2) Gemini `.env` đổi `gemini-2.5-flash` (2.0-flash free tier limit:0); (3) tắt thinking (`thinkingBudget:0`) + maxTokens parse 8192. CvServiceOwnershipTest 14/14 PASS. Upload→PROCESSING→COMPLETED OK. Đã commit + push `9167607`.
>
> **Update 2026-07-02 (2):** Feature GẮN CV vào application (bật cv-jd-match) — 5 file (backend UpdateApplicationRequest+ApplicationService.update ownership; frontend types+CreatePage dropdown+DetailPage dropdown). Manual test PASS toàn bộ AI flow (extract-jd/jd-insight/cv-jd-match/edit parsed data/gắn CV). **CHƯA commit.** **Phase 4 coi như XONG** → next: commit feature gắn CV, rồi sang Phase 5 (Reminders).

File này tổng hợp toàn bộ context để chat mới resume project mà không cần đọc lại history dài. **Đọc thứ tự**: file này → [decisions.md](./decisions.md) → [progress.md](./progress.md) → rules.

---

## 1. User Profile

- Sinh viên IT, ~6 tháng kinh nghiệm Spring + React
- Làm intern project 8 tuần (Job-tracker-AI)
- Dev trên Windows 10 + PowerShell (KHÔNG WSL)
- Đọc/viết tiếng Việt, thêm comment tiếng Việt vào file để học
- Thích hiểu sâu — hỏi "tại sao" nhiều, cần giải thích 4 phần sau mỗi file

## 2. Project ở giai đoạn nào

**Phase 4: AI Integration — TẤT CẢ CODE XONG. Backend AI 13/13 ✅ · Frontend AI 6/6 ✅ · US-CV-002 backend 5/5 ✅ · US-CV-002 frontend 3/3 ✅. CHỈ CÒN: manual test trên browser (cần GEMINI_API_KEY) → rồi ĐÓNG Phase 4, sang Phase 5.**

### US-CV-002 — XONG (backend 2026-06-27 + frontend 2026-06-28)
**BACKEND (File 20.1-20.5)** — compile PASS, CvServiceOwnershipTest 11/11 PASS.
- AI parse CV auto (Template 1) fill `parsed_data` lúc upload → unblock cv-jd-match.
- Tách transaction: parseCvAsync orchestrator (không @Tx) + self.markProcessing/saveParseSuccess/saveParseFailure (3 tx ngắn), Gemini call ngoài tx. (Đã inline downloadPdf/extractText/aiParse vào parseCvAsync theo feedback no-tiny-method-split.)
- 3 endpoint: `GET /cv/{id}` (kèm parsedData) · `PATCH /cv/{id}/parsed-data` (full-replace) · `POST /cv/{id}/reparse` (202).
- DTO: `CvParsedData` (tolerant, khớp Template 1), `CvDetailResponse` (= CvVersionResponse + parsedData).

**FRONTEND (File 21-23)** — tsc + lint PASS.
- File 21: types (`CvParsedData`, `CvVersionDetail`) + api (getById→detail, updateParsedData, reparse) + queries (useCv tái dùng, polling thêm PENDING, useUpdateParsedData, useReparseCv).
- File 22: `CvParsedDataEditor` (RHF + useFieldArray; list chuỗi = textarea mỗi dòng 1 mục; form model riêng + map toForm/toParsed).
- File 23: `CvDetailPage` MỚI (PDF iframe + editor side-by-side, key=updatedAt remount) + route `/cv/:id` + label CvCard thành link.

**Git:** US-CV-002 (backend + frontend) CHƯA commit.

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
- **Phase 4:** AI Integration + edit parsed CV data (US-CV-002) ← **DONE**
- **Phase 5:** Reminders & Notifications ← **DONE**
- **Phase 6:** Email Integration (scope 1b: preferences + reminder email SMTP + AI draft) ← **DONE (code + test cuối PASS) · chờ commit**
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
