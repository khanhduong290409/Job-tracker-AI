# Handoff Context — 2026-05-29 (Phase 0 DONE, sang Phase 1)

File này tổng hợp toàn bộ context để chat mới resume project mà không cần đọc lại history dài. **Đọc thứ tự**: file này → [decisions.md](./decisions.md) → [progress.md](./progress.md) → rules.

**File học liệu cho user (KHÔNG đọc khi resume — đây là output cho user, không phải context Claude). Chỉ mở khi user hỏi/yêu cầu ôn:**
- [../learning/phase-0-frontend-deep-dive.md](../learning/phase-0-frontend-deep-dive.md) — giải thích chi tiết 9 file frontend Phase 0 (file 15-23) với pattern lạ + liên hệ Spring/Java cho sinh viên 6 tháng kinh nghiệm. Tạo 2026-05-29 sau khi anh xác nhận muốn học sâu các pattern Phase 0. Phase sau có file tương tự trong `learning/`.

---

## 1. User Profile

- Sinh viên IT, ~6 tháng kinh nghiệm
- Làm intern project 8 tuần (Job-tracker-AI)
- Dev trên Windows 10 + PowerShell (KHÔNG WSL)
- Đọc/viết tiếng Việt, code comments tiếng Việt OK

## 2. Project ở giai đoạn nào

**Phase 0 HOÀN THÀNH (23/23 file). Smoke test backend + frontend đều pass. Đang chuẩn bị sang Phase 1 (Auth).**

- 2026-05-28: backend verify OK (`/actuator/health` UP, Flyway baseline, Hikari).
- 2026-05-29: backend verify lại sau khi thêm `spring.config.import` → tự đọc `.env` root, không cần load env tay. PASS.
- 2026-05-29: frontend Phase 0 smoke test PASS (routing, ProtectedLayout redirect, 404, hydrate localStorage).

### Files done backend (1-14):
1. `.gitignore` (root) — thêm `uploads/`, `*.jar`
2. `docker-compose.yml` (root) — Postgres 15 + Redis 7
3. `.env.example` (root)
4. `backend/src/main/resources/application.yaml` — 4 docs YAML, 3 profiles dev/test/prod + `spring.config.import` đọc `.env` root
5. `backend/src/main/resources/db/migration/V1__init.sql` — Flyway baseline
6. `shared/dto/ApiResponse.java` + `ErrorInfo.java` + `FieldError.java`
7. `shared/exception/` — 4 classes: ResourceNotFoundException, ForbiddenException, UnauthorizedException, BadRequestException
8. `shared/exception/GlobalExceptionHandler.java`
9. `shared/security/SecurityUtils.java` — stub fail-fast (throw IllegalStateException)
10. **SKIPPED** JacksonConfig (yaml + auto-config đủ)
11. `shared/config/CacheConfig.java` — Redis cache, 6 cache names với TTL khác nhau
12. `shared/config/AsyncConfig.java` — aiTaskExecutor + emailTaskExecutor
13. `shared/config/CorsConfig.java`
14. `shared/config/SecurityConfig.java` — skeleton (stateless, permitAll cho /actuator + /auth)

### Files done frontend (15-23):
15. `frontend/.env.example` — `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_APP_NAME`
16. `frontend/src/config/env.ts` — Zod v4 validate (API mới `z.url()`), fail-fast module top-level
17. `frontend/src/types/api.ts` — `ApiResponse<T>`, `ApiError`, `FieldError`, `Pagination`, `PaginatedResponse<T>`, `ErrorCode` union
18. `frontend/src/types/common.ts` — `ApplicationStatus`, `CvParseStatus` (pattern `as const` + `(typeof X)[number]` vì `erasableSyntaxOnly`)
19. `frontend/src/lib/utils.ts` — `cn()` plain, sẽ swap `clsx + tailwind-merge` ở Phase 1
20. `frontend/src/lib/api/axios.ts` — instance + interceptors + 401 refresh logic với queue + `tokenStorage` helper export
21. `frontend/src/features/auth/store/auth-store.ts` — Zustand skeleton, hydrate localStorage, sync với `tokenStorage`
22. `frontend/src/components/layout/PublicLayout.tsx` + `ProtectedLayout.tsx` — Navigate redirect-after-login pattern (state.from)
23. `frontend/src/routes.tsx` + update `App.tsx` — `<BrowserRouter><AppRoutes/></BrowserRouter>`, placeholder inline `/login` `/dashboard` 404

**Next:** Bắt đầu **Phase 1 — Auth**. Đọc `docs/08-user-stories.md` cho user stories Auth + `docs/03-api-contract.md` cho `/auth/google`, `/auth/refresh`, `/auth/logout`, `/auth/me`. Backend trước (User entity → AuthService → AuthController), frontend sau (Login page + callback). Lên plan tổng cho cả Phase 1 trước khi code file đầu.

## 3. Blocker — đã resolved

- ~~Docker Desktop không start~~ → **đã fix**, container `jobtracker-postgres` + `jobtracker-redis` chạy healthy.
- ~~Password auth failed lúc test backend~~ → root cause: **Postgres native (v18) cài sẵn trên Windows chiếm port 5432**, Spring connect vào nó thay vì container. Fix: `Stop-Service postgresql-x64-18 -Force` + `Set-Service postgresql-x64-18 -StartupType Manual` (terminal admin). Khi muốn dùng lại: `Start-Service postgresql-x64-18`.
- **Lưu ý dev workflow:** mỗi lần restart máy, nếu cần dùng Postgres native cho project khác → start service lại nhưng nhớ stop container trước (tránh port conflict).

## 4. Plan tổng (7 phases)

- **Phase 0:** Setup hạ tầng ← **DONE**
- **Phase 1:** Auth (Google OAuth + JWT) — module `auth`, `user` ← **đang chuẩn bị**
- **Phase 2:** CV Management — upload PDF, parse, versions. **FileStorageService** sẽ tạo ở phase này
- **Phase 3:** Application CRUD + State Machine (KHÔNG có AI)
- **Phase 4:** AI Integration — Gemini, prompt templates, cache
- **Phase 5:** Reminders & Notifications
- **Phase 6:** Email Integration (Gmail OAuth + sync)
- **Phase 7:** Analytics + Polish + Deploy

## 5. Decisions đã chốt (chi tiết trong decisions.md)

- **D-001:** Single-module Maven (không multi-module). `shared` chỉ là package convention.
- **D-002:** SecurityUtils stub throw `IllegalStateException` (fail-fast), không return null.
- **D-003:** FileStorageService — interface trong `shared`, 2 impl theo `@Profile`:
  - `LocalFileStorageService` (`@Profile("!prod")`)
  - `CloudinaryFileStorageService` (`@Profile("prod")`)
  - Server-side upload only, không upload trực tiếp FE → Cloudinary
  - Implement ở Phase 2
- **D-004:** Defer shadcn/ui đến Phase 1 (khi cần Login UI)
- **D-005:** AI provider chỉ Gemini cho V1, không implement Grok backup
- **D-006:** WebSocket → dùng polling đơn giản (3s) cho V1
- **D-007:** Out-of-scope V1: Mock Interview Chatbot, Browser push, Gmail Pub/Sub, multi-lang UI, FE Mockito/Vitest test

## 6. Rules đã update từ default

- File `.kilocode/rules/03-workflow.md` section "Communication Rules" — **THÊM subsection "Khi giải thích concept/code"**:
  - Max 15-20 dòng total
  - Cấu trúc 3 phần: (1) Là gì (2) Tại sao cần (3) Không có thì sao
  - KHÔNG tự thêm bảng so sánh, code ví dụ dài, alternative approaches trừ khi user hỏi
  - User là sinh viên 6 tháng kinh nghiệm — đủ ý chính là OK

## 7. Workflow standard

- **Mọi feature:** PLAN ngắn 5-10 dòng trước → đợi user confirm → code từng file một → dừng review
- **Mỗi file:** giải thích 2-3 câu tại sao
- **Không tự thêm dependency:** hỏi user approve trước
- **Test:** chỉ Mockito cho 4 critical components (AuthService, ApplicationStateMachine, AiService, Ownership) — phần còn lại manual test
- **Notes folder:** mình tự update sau mỗi phase xong (không spam mỗi file)

## 8. Cách resume

Trong chat mới, user nhắn: **"resume project, đọc notes/handoff.md"**.

Mình sẽ:
1. Đọc handoff.md → biết phase đang ở đâu
2. Đọc decisions.md → biết constraints
3. Đọc rules → biết style/workflow
4. Đọc `docs/08-user-stories.md` (Auth section) + `docs/03-api-contract.md` (endpoints `/auth/*`) + `docs/05-security.md`
5. Trình bày plan tổng Phase 1 (Auth) — list module/file dự kiến, thứ tự implement (backend trước → frontend sau), open questions → đợi user confirm
6. Code file đầu tiên (thường là `V2__auth_tables.sql` migration cho `users` table) → review → tiếp tục

## 9. Workflow chạy backend (sau fix 2026-05-28)

**Trước khi run, đảm bảo:**
1. Docker Desktop đang chạy (`docker ps` thấy `jobtracker-postgres` + `jobtracker-redis` healthy). Nếu chưa start: `cd D:\Job-tracker-AI && docker compose up -d`.
2. Postgres native v18 **đang stopped** (đã `Set-Service Manual`, không tự bật khi reboot). Kiểm tra: `Get-NetTCPConnection -LocalPort 5432 | Get-Process` — process phải là `com.docker.backend`, KHÔNG phải `postgres`.

**Run backend (1 lệnh duy nhất, không cần load `.env` tay):**
```powershell
cd D:\Job-tracker-AI\backend
.\mvnw.cmd spring-boot:run
```

Spring tự đọc `.env` qua `spring.config.import` trong `application.yaml`. Log expect: `Started BackendApplication`.

**Test endpoint (terminal mới):**
```powershell
curl.exe http://localhost:8080/actuator/health
```
Expect: `{"status":"UP"}`

**Stop:** `Ctrl + C` trong terminal Spring → cmd hỏi `Terminate batch job (Y/N)?` → gõ `Y`.

## 10. Workflow chạy Docker

- Start: `docker compose up -d` (từ root project)
- Stop tạm (giữ data): `docker compose stop`
- Stop + xóa container/network (giữ volume): `docker compose down`
- **`docker compose down -v`** — xóa luôn volume = MẤT HẾT DB. Chỉ dùng khi reset sạch.
- Sau reboot Windows: Docker Desktop KHÔNG tự start (trừ khi config Start on login). Mở Docker Desktop xong phải `docker compose up -d` lại.
- Container chưa set `restart: always` → khi máy tắt, container cũng tắt.

---

**File này tự xóa hoặc keep tùy user khi project xong.**
