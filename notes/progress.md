# Progress Log

Nhật ký tiến độ project Job-tracker-AI. Update sau mỗi phase/milestone.

Format: ngày, phase đang làm, what's done, what's next, notes ngắn.

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
