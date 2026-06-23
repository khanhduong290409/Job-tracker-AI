# Progress Log

Nhật ký tiến độ project Job-tracker-AI. Update sau mỗi phase/milestone.

Format: ngày, phase đang làm, what's done, what's next, notes ngắn.

---

## 2026-06-21 — Phase 4: AI Integration — BACKEND HOÀN THÀNH (13/13 file)

**Done thêm hôm nay (File 9-13):**
- File 9: `ai/entity/AiAnalysis.java` ✅ — entity bảng `ai_analyses`. `result` là `JsonNode` (đa hình: chứa JdInsightResponse hoặc CvJdMatchResponse). KHÔNG soft delete (CASCADE), append-only nên chỉ `@PrePersist`, không `@PreUpdate`.
- File 10: `ai/repository/AiAnalysisRepository.java` ✅ — 2 derived query: `findFirst...OrderByCreatedAtDesc` (latest) + `...AndInputHash...` (DB cache check). Cache scope theo `applicationId` (giữ ownership, không tái dùng chéo).
- File 11: `ai/dto/JdInsightResponse.java` + `CvJdMatchResponse.java` ✅ — record khớp Template 3 & 2 (docs/04). Field enum-like để `String` (tolerant output AI), `Integer` thay `int` (thiếu field → null). `@JsonIgnoreProperties(ignoreUnknown=true)`.
- File 12: `ai/service/AiAnalysisService.java` ✅ — lõi: `extractJd` (stateless), `getJdInsight`, `getCvJdMatch(force)`. DB-as-cache hash-keyed (SHA-256 + HexFormat). KHÔNG `@Transactional` ở method public (tránh giữ DB connection suốt lúc gọi Gemini). Generic helper `analyzeAndSave`/`findCached` dùng `valueToTree`/`convertValue`.
- File 13: `ai/dto/ExtractJdRequest.java` + `ai/controller/AiController.java` + `ai/service/AiAnalysisServiceTest.java` ✅ — 3 endpoint + **9 Mockito test PASS** (cache hit/miss, ownership 404, force bypass, CV thiếu/chưa parse → 400, extract blank → 400).

**Verify:** `./mvnw compile` PASS · `./mvnw test -Dtest=AiAnalysisServiceTest` → **9/9 PASS, BUILD SUCCESS**.

**Quyết định hôm nay:**
- **Cache: DB-only (hash-keyed), KHÔNG dùng Redis @Cacheable ở AiAnalysisService** (user chốt). Phát hiện input đổi do `inputHash` (SHA-256) lo, không phải Redis. Redis vẫn còn trong project (CacheConfig + cache `ai-*` khai báo sẵn nhưng tạm chưa dùng cho AI) — có thể thêm tầng 1 sau (cần self-injection `@Lazy`). Defer Phase 7.
- **Endpoint extract-jd path = `/api/v1/ai/extract-jd`** (namespace dưới `/ai`, khác note gốc ghi `/extract-jd`). FE File 15 gọi đúng path này.
- 3 endpoint Phase 4: `POST /api/v1/ai/extract-jd` · `GET /api/v1/applications/{id}/jd-insight` · `GET /api/v1/applications/{id}/cv-jd-match?force=true`.

**Next:** Manual test backend AI (cần `GEMINI_API_KEY` trong `.env`) — user sẽ yêu cầu hướng dẫn sau khi đọc code. Rồi Frontend File 14 — `features/ai/types.ts`.

**Còn lại Phase 4:** Frontend (File 14-19, 6 file) + US-CV-002 (File 20-22, 3 file).

---

## 2026-06-19 — Phase 4: AI Integration — BẮT ĐẦU

**Plan (22 file):**

Backend (13 file):
- File 1: `V6__create_ai_analyses_table.sql`
- File 2: `shared/ai/GeminiProperties.java`
- File 3: `shared/ai/AiPrompt.java`
- File 4: `shared/ai/AiResponse.java`
- File 5: `shared/ai/AiService.java` (interface)
- File 6: `shared/ai/GeminiAiService.java`
- File 7: `shared/ai/JsonResponseParser.java`
- File 8: `ai/entity/AiAnalysisType.java`
- File 9: `ai/entity/AiAnalysis.java`
- File 10: `ai/repository/AiAnalysisRepository.java`
- File 11: `ai/dto/JdInsightResponse.java` + `CvJdMatchResponse.java`
- File 12: `ai/service/AiAnalysisService.java`
- File 13: `ai/controller/AiController.java` + `AiAnalysisServiceTest.java`

Frontend (6 file):
- File 14: `features/ai/types.ts`
- File 15: `features/ai/api/ai-api.ts` + `queries.ts`
- File 16: `features/ai/components/JdInsightSection.tsx`
- File 17: `features/ai/components/AiMatchCard.tsx`
- File 18: Update `ApplicationDetailPage.tsx`
- File 19: Update `CreateApplicationPage.tsx` (JD auto-extract)

US-CV-002 (3 file):
- File 20: `CvService.updateParsedData()` + `PATCH /api/v1/cv/{id}/parsed-data`
- File 21: `features/cv/components/CvParsedDataEditor.tsx`
- File 22: Update `CvListPage.tsx` / `CvDetailPage.tsx`

Endpoints: `POST /extract-jd` · `GET /applications/{id}/jd-insight` · `GET /applications/{id}/cv-jd-match?force=true`
Defer: interview prep (US-AI-004), pattern analysis (US-AI-005) → Phase 7

**Done (8/22 file):**
- File 1: `V6__create_ai_analyses_table.sql` ✅
- File 2: `shared/ai/GeminiProperties.java` ✅
- File 3: `shared/ai/AiPrompt.java` ✅
- File 4: `shared/ai/AiResponse.java` ✅
- File 5: `shared/ai/AiService.java` (interface — exception duy nhất của rule no-interface) ✅
- File 6: `shared/exception/AiException.java` + `shared/ai/GeminiAiService.java` + update `GlobalExceptionHandler` (503 handler) ✅
- File 7: `shared/ai/JsonResponseParser.java` ✅
- File 8: `ai/entity/AiAnalysisType.java` ✅

**Next:** File 9 — `ai/entity/AiAnalysis.java`

---

## 2026-06-15 — Phase 3 FRONTEND HOÀN THÀNH (6 file) → PHASE 3 ĐÓNG

**Done (frontend Phase 3):**
- File 10: `features/applications/types.ts` — mirror DTO; thêm enum `WorkType/EmploymentType/ApplicationSource` vào `types/common.ts`; `TimelineEventType` + `TIMELINE_EVENT_LABELS`.
- File 11: `api/application-api.ts` — 7 endpoint; `paramsSerializer: { indexes: null }` để mảng `statuses` serialize lặp key (khớp `@ModelAttribute`).
- File 12: `api/queries.ts` — TanStack hooks (queries + 5 mutation); `keepPreviousData` cho list.
- File 13: `ApplicationStatusBadge` + `ApplicationCard`; tách `status-meta.ts` (config nhãn/màu + `ALLOWED_TRANSITIONS` mirror state machine).
- File 14: `ApplicationListPage` (filter + search + phân trang) · `CreateApplicationPage` (React Hook Form + Zod — form đầu tiên dùng RHF) · `ApplicationDetailPage` (info + đổi status + ghi chú sự kiện + lịch sử + xóa).
- File 15: `routes.tsx` — 3 route `/applications`, `/applications/new`, `/applications/:id`.

**Verify:** tsc + eslint + `npm run build` đều PASS.

**Tinh chỉnh UX trong lúc review:** đổi nhãn "Dòng thời gian" → "Ghi chú sự kiện"; thêm nhãn VN cho timeline event type; thêm `max={today}` ô Ngày nộp (chặn chọn tương lai, khớp `@PastOrPresent`); sửa typo class `max-w-3xlf`.

**Quyết định style:** `CreateApplicationPage` dùng RHF+Zod (stack chính thức, form 16 field); các form nhỏ khác vẫn `useState`. User chọn giữ RHF và tự học (xem learning/form_react_hook.md).

**Next:** **Phase 4 — AI Integration** (GeminiAiService, parse-jd auto-fill form, CV-JD match). Manual test UI trên browser của Phase 3 nên làm trước khi sang Phase 4.

---

## 2026-06-13 — Backend run + 4 fix (migration V4/V5, 401, list bytea)

**Chạy backend lần đầu sau Phase 3 → gặp & fix 4 thứ:**
- **V4 Flyway checksum mismatch**: V4 bị sửa (thêm comment) sau khi đã apply → revert file về gốc (`git checkout`), giữ tính bất biến migration. Bài học: KHÔNG sửa migration đã apply.
- **V5 typo `PRIMARY KEYv`** (dòng 98, bảng `application_timeline_events`) → sửa `KEYv` → `KEY`. V5 chưa apply (transaction rollback sạch) nên sửa trực tiếp OK. Sau đó V5 apply thành công, 4 bảng tạo đủ.
- **Auth trả 403 thay vì 401** khi thiếu token (pre-existing Phase 1, ảnh hưởng auto-refresh FE): thêm `auth/security/RestAuthenticationEntryPoint` (trả 401 + body ApiResponse) + wire `.exceptionHandling()` trong `SecurityConfig`. Verify: no-token → 401, token sai/hết hạn vẫn 401 (filter), permitAll (auth/health/swagger) không bị ảnh hưởng.

- **List filter lỗi 500 `function lower(bytea) does not exist`**: trong `ApplicationRepository.findByFilters`, param `:search` khi null bị Hibernate 6 bind nhầm thành `bytea` (null String trong ngữ cảnh CONCAT/LOWER không suy ra kiểu). Fix: `CAST(:search AS string)` ở 2 chỗ LIKE → Hibernate bind đúng varchar. (Param enum `:source` không bị vì `@Enumerated` đã cho biết kiểu.)

**Manual test backend (10 case qua curl, dùng /auth/refresh mint token): 10/10 PASS** — create 201 (+ baseline history null→APPLIED), detail 200, status hợp lệ 200 (+ history APPLIED→PHONE_SCREEN), status sai 400 INVALID_STATE_TRANSITION, PATCH 200, timeline 201, list filter statuses/search 200, validation 400, delete 204, get-deleted 404. **Backend Phase 3 verified.**

**Next:** Frontend Phase 3 — File 10 `features/applications/types.ts`.

---

## 2026-06-13 — Phase 3: Application Management — BACKEND HOÀN THÀNH (9/9 file)

**Done thêm (File 7-9):**
- File 7: `application/service/ApplicationService.java` ✅ — 6 method (create, list, getById, update PATCH, changeStatus, delete, addTimelineEvent); ownership check tập trung `findOwnedOrThrow`; ghi baseline status history lúc create.
- File 8: `application/controller/ApplicationController.java` ✅ — 7 endpoint REST `/api/v1/applications`. Thêm helper dùng chung `shared/dto/PagedResponse.java` (bọc `Page<T>` → `{items, pagination}`). Tự build `Pageable` (whitelist sort field + cap size 100).
- File 9: tests ✅ — `ApplicationStateMachineTest` (12 test, logic thuần) + `ApplicationServiceOwnershipTest` (11 test Mockito). **23/23 PASS**.

**Decisions session này (xem decisions.md):**
- D-016: create cho phép chọn MỌI status (override restriction SAVED/APPLIED của D-015) — hỗ trợ backfill app đang dở dang.
- D-017: giữ state machine CỨNG cho changeStatus (đã cân nhắc vs free-form/hybrid; phục vụ reminder Phase 5 + analytics).
- Contract đổi query param `status` → `statuses` (khớp POJO `ApplicationFilter` + `@ModelAttribute` bind theo tên field).

**Next:** Frontend Phase 3 — File 10 `features/applications/types.ts`. (Backend chưa chạy manual test qua Swagger — làm trước khi/đồng thời với frontend.)

---

## 2026-06-12 — Phase 3: Application Management (đang làm, backend gần xong)

**Done (backend):**
- File 1: `V5__create_application_tables.sql` ✅
- File 2: 5 enum (`ApplicationStatus`, `WorkType`, `EmploymentType`, `ApplicationSource`, `TimelineEventType`) ✅ — trong `application/entity/`
- File 3: `ContactPerson` record + 3 entity (`Application`, `ApplicationStatusHistory`, `ApplicationTimelineEvent`) ✅ — `@SQLRestriction`, `@PrePersist`/`@PreUpdate`, JSONB
- File 4: 3 repository (`ApplicationRepository` với SpEL multi-status filter, `ApplicationStatusHistoryRepository`, `ApplicationTimelineEventRepository`) ✅ — trong `application/repository/`
- File 5: 10 DTOs ✅ — trong `application/dto/` (`CreateApplicationRequest`, `UpdateApplicationRequest` POJO, `ChangeStatusRequest`, `ApplicationFilter` POJO, `ContactPersonRequest`, `ApplicationListItemResponse`, `ApplicationResponse`, `StatusHistoryResponse`, `TimelineEventResponse`, `CreateTimelineEventRequest`)
- File 6: `ApplicationStateMachine` + `InvalidStateTransitionException` ✅ — StateMachine trong `application/service/`, exception trong `shared/exception/` (xử lý tập trung ở `GlobalExceptionHandler`)

**Fixes trong session này:**
- `01-coding-style.md`: sửa file structure (flat → sub-package), `@Where` → `@SQLRestriction`, `@CreatedDate` → `@PrePersist`, `ApplicationFilter` record → POJO
- `02-architecture.md`: clarify rule về exception trong shared

**Next:** File 7 — `ApplicationService` (trong `application/service/`)

---

## 2026-06-09 — Phase 2: CV Management HOÀN THÀNH (13/13 file)

**Done (backend 8 file):**
- File 1: `V4__create_cv_versions_table.sql` ✅
- File 2: `cv/entity/CvParseStatus.java` + `cv/entity/CvVersion.java` ✅
- File 3: `cv/repository/CvVersionRepository.java` ✅
- File 4: Storage layer → Cloudinary (D-012) ✅
- File 5: `cv/dto/CvVersionResponse.java` ✅
- File 6: `cv/service/CvService.java` (self-injection `@Lazy` + `@Async`, PDFBox 3.x) ✅
- File 7: `cv/controller/CvController.java` ✅
- File 8: `cv/service/CvServiceOwnershipTest.java` — 9 Mockito tests PASSED ✅

**Done (frontend 5 file):**
- File 9: `features/cv/types.ts` ✅
- File 10: `features/cv/api/cv-api.ts` (FormData upload) ✅
- File 11: `features/cv/api/queries.ts` (polling 3s khi PROCESSING) ✅
- File 12: `CvParseStatusBadge.tsx` + `CvCard.tsx` + `UploadCvForm.tsx` + `CvListPage.tsx` ✅
- File 13: `routes.tsx` update (`/cv` trong ProtectedLayout) ✅

**Hotfix:** `QueryClientProvider` bị thiếu trong `App.tsx` → thêm vào sau khi thấy lỗi console.

**Manual test PASS:**
- Upload CV PDF → card xuất hiện, status "Đang xử lý..." → tự chuyển "Hoàn thành" (polling) ✅
- Đặt mặc định → badge "Mặc định" chuyển đúng ✅
- Xóa CV → card biến mất ✅
- Chưa login → `/cv` redirect về `/login` ✅

**Next:** Phase 3 — Application CRUD + State Machine.

---

## 2026-06-07 — Phase 2: CV Management (đang làm, 5/13 file backend xong)

**Done (backend):**
- File 1: `V4__create_cv_versions_table.sql` ✅
- File 2: `cv/entity/CvParseStatus.java` + `cv/entity/CvVersion.java` ✅
- File 3: `cv/repository/CvVersionRepository.java` ✅
- File 4: Storage layer refactor → Cloudinary (D-012):
  - Xóa `LocalFileStorageService`
  - `shared/storage/StorageProperties.java` — nested CloudinaryProperties
  - `shared/storage/FileStorageService.java` — interface
  - `shared/config/CloudinaryConfig.java` — bean Cloudinary
  - `shared/storage/CloudinaryFileStorageService.java` ✅
  - `pom.xml` — thêm `cloudinary-http45:1.36.0` + `pdfbox:3.0.1` ✅
- File 5: `cv/dto/CvVersionResponse.java` ✅

**Next (session mới bắt đầu từ đây):**
- File 6: `cv/service/CvService.java` ← TIẾP THEO
- File 7: `cv/controller/CvController.java`
- File 8: `cv/service/CvServiceOwnershipTest.java` (Mockito)
- File 9-13: Frontend (types, api, queries+polling, components+page, routes)

**Decisions session này:**
- D-012: Cloudinary từ Phase 2, bỏ local storage — xem decisions.md
- `SqlTypes.JSONB` không tồn tại trong Hibernate version này → dùng `SqlTypes.JSON`
- Thêm bước 2.5 (self-review plan) và 3.5 (self-review after file) vào `03-workflow.md`
- `fileUrl` có trong `CvVersionResponse` vì Cloudinary URL là URL thật

**Cloudinary credentials:** đã điền đầy đủ trong `.env` (cloud name: dm1xwivqn)

---

## 2026-05-26 — Phase 0: Setup hạ tầng (bắt đầu)

**Done:**
- Đọc xong toàn bộ rules (`.kilocode/rules/00-04`) + docs (`docs/01-08`)
- Lên plan tổng 7 phases cho project
- Lên plan chi tiết Phase 0 (23 files)
- File 1: `.gitignore` — bổ sung `uploads/`, `*.jar`, exception cho maven-wrapper.jar
- File 2: `docker-compose.yml` — Postgres 15 + Redis 7 với healthcheck, volumes persist
- Tạo `notes/` folder: progress.md, decisions.md, blockers.md

**Notes:**
- Project rất lớn (8 epics, ~40 user stories) → strategy: làm core trước (Auth → CV → Application → AI), defer Email/Analytics nâng cao
- Decisions quan trọng: xem [decisions.md](./decisions.md)

---

## 2026-05-28 — Phase 0: backend VERIFIED, sang frontend

**Done:**
- Smoke test backend Phase 0: `./mvnw spring-boot:run` → Tomcat up port 8080, Hikari connect Postgres OK, Flyway apply V1 baseline OK, `/actuator/health` trả `{"status":"UP"}`.
- Fix blocker: Postgres native v18 (cài sẵn trên Windows) chiếm port 5432. Stop service + set startup Manual.

**Warning chấp nhận được (không fix Phase 0):**
- `Using generated security password: ...` — do `UserDetailsService` chưa register (Phase 0 chưa có Auth). Vô hại vì HTTP Basic/Form login đã disable, actuator đã permitAll. Phase 1 register thật → warning tự biến mất.

**Next:** File 15 — `frontend/.env.example`

---

## 2026-05-29 — Phase 0 HOÀN THÀNH (23/23 file)

**Done thêm (file 15-23, frontend Phase 0 skeleton):**
- File 15: `frontend/.env.example` — 3 vars `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_APP_NAME`.
- File 16: `frontend/src/config/env.ts` — Zod v4 validate (`z.url()` API mới), fail-fast tại module top-level.
- File 17: `frontend/src/types/api.ts` — `ApiResponse<T>`, `ApiError`, `FieldError`, `Pagination`, `PaginatedResponse<T>`, `ErrorCode` union literal.
- File 18: `frontend/src/types/common.ts` — `ApplicationStatus` + `CvParseStatus` dùng pattern `as const` array + `(typeof X)[number]` (vì `erasableSyntaxOnly: true` chặn TS enum). Defer AiAnalysisType/ReminderType đến phase sau.
- File 19: `frontend/src/lib/utils.ts` — `cn()` plain version, Phase 1 swap sang `clsx + tailwind-merge` khi setup shadcn.
- File 20: `frontend/src/lib/api/axios.ts` — instance + request interceptor attach Bearer + response interceptor 401→refresh→retry với queue (concurrent 401 chỉ refresh 1 lần). `tokenStorage` export ra dùng chung.
- File 21: `frontend/src/features/auth/store/auth-store.ts` — Zustand skeleton, hydrate manual từ localStorage, sync với `tokenStorage`.
- File 22: `PublicLayout.tsx` + `ProtectedLayout.tsx` — Navigate redirect-after-login pattern qua `state.from`.
- File 23: `routes.tsx` + update `App.tsx` — `<BrowserRouter><AppRoutes/></BrowserRouter>`, placeholder inline cho `/login` + `/dashboard` + 404.

**Smoke test frontend (passed):**
- `npm run dev` → Vite up port 5173, không lỗi Console.
- Chưa login → `/` redirect `/login` → thấy placeholder Login.
- Manual set `jt_access_token` + `jt_user` localStorage → reload → `/` redirect `/dashboard` → thấy placeholder.
- URL bừa → 404 placeholder.
- `localStorage.clear()` → reload → quay về `/login`. ✅

**Phase 0 DONE.** Hạ tầng đủ để Phase 1 build Auth (Google OAuth + JWT).

**Next:** Phase 1 — Auth module. User stories tham khảo `docs/08-user-stories.md`. Backend: User entity + Google OAuth verify + JWT issue/refresh. Frontend: thay `LoginPlaceholder` bằng Google Login button + callback handler.

---

## 2026-06-06 — Phase 1 HOÀN THÀNH (25/25 file)

**Done (backend 18 file + frontend 7 file):**
- Backend: User entity, RefreshToken entity, JwtService, GoogleOAuthService, AuthService (+ 8 Mockito tests), JwtAuthFilter, SecurityConfig, AuthController
- Frontend: auth types, auth-api, auth-store (UserProfile), useAuth hooks, LoginPage, CallbackPage, routes update, PublicLayout auth redirect
- `.env` root: Google OAuth credentials + JWT secret điền đầy đủ

**Manual test PASS:**
- Google OAuth full flow: `/login` → Google consent → `/auth/callback` → spinner → `/dashboard` ✅
- Backend health: `{"status":"UP"}` ✅
- localStorage có `jt_access_token`, `jt_refresh_token`, `jt_user` sau login ✅

**Blocker tái hiện + fix:** Postgres native v18 tự start lại chiếm port 5432 → stop qua services.msc.

**Next:** Phase 2 — CV Management. Đọc `docs/02-database-schema.md` + `docs/08-user-stories.md` epic CV trước khi plan.

---

## 2026-05-27 — Phase 0: tiếp tục, tạm dừng ở file 4/23

**Done thêm:**
- File 3: `.env.example` — placeholders cho DB, JWT, Google OAuth, Gemini, encryption, Cloudinary, CORS. Có comment hướng dẫn sinh secret cho cả Linux/Mac và PowerShell.
- File 4: `application.yaml` — 4 documents YAML (base + dev/test/prod profile). Flyway `baseline-on-migrate: true`, Hibernate `ddl-auto: validate`, `open-in-view: false`, hide stacktrace khỏi response, multipart 10MB/12MB. Custom `app.*` properties bind cho JWT/Google/Gemini/storage/cors.

**Status:** Tạm dừng ở file 4/23 để user nghiên cứu kỹ 4 file đã làm (gitignore, docker-compose, .env.example, application.yaml). Đây là phần foundation quan trọng — hiểu rõ rồi mới đi tiếp.

**Next khi resume:**
- File 5: `V1__init.sql` — Flyway baseline migration (comment baseline)
- File 6-14: backend `shared` package (DTOs, exceptions, configs)
- File 15-23: frontend skeleton (env, types, axios, store, layouts, routing)

**Notes:**
- 4 files đã làm cover: ignore rules, run DB/Redis dễ dàng, env vars template, Spring config 3 profile
- Sau khi hiểu 4 file này, user sẽ nắm được flow: `.env` → `application.yaml` → Spring Boot → connect docker-compose services
