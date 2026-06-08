# Progress Log

Nhật ký tiến độ project Job-tracker-AI. Update sau mỗi phase/milestone.

Format: ngày, phase đang làm, what's done, what's next, notes ngắn.

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
