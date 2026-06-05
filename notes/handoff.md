# Handoff Context — 2026-06-06 (Phase 1 DONE, bắt đầu Phase 2)

File này tổng hợp toàn bộ context để chat mới resume project mà không cần đọc lại history dài. **Đọc thứ tự**: file này → [decisions.md](./decisions.md) → [progress.md](./progress.md) → rules.

**File học liệu cho user (KHÔNG đọc khi resume):**
- [../learning/phase-0-frontend-deep-dive.md](../learning/phase-0-frontend-deep-dive.md) — giải thích 9 file frontend Phase 0

---

## 1. User Profile

- Sinh viên IT, ~6 tháng kinh nghiệm
- Làm intern project 8 tuần (Job-tracker-AI)
- Dev trên Windows 10 + PowerShell (KHÔNG WSL)
- Đọc/viết tiếng Việt, thêm comment tiếng Việt vào file để học

## 2. Project ở giai đoạn nào

**Phase 1 HOÀN THÀNH. Bắt đầu Phase 2: CV Management.**

### Phase 1 — DONE (25 file, test pass)

**Backend (18 file):**

| # | File | Status |
|---|------|--------|
| 1 | `pom.xml` — thêm jjwt + springdoc | ✅ |
| 2 | `db/migration/V2__create_users_table.sql` | ✅ |
| 3 | `db/migration/V3__create_refresh_tokens_table.sql` | ✅ |
| 4 | `user/entity/User.java` | ✅ |
| 5 | `user/repository/UserRepository.java` | ✅ |
| 6 | `auth/config/JwtProperties.java` | ✅ |
| 7 | `auth/service/JwtService.java` | ✅ |
| 8 | `auth/entity/RefreshToken.java` | ✅ |
| 9 | `auth/repository/RefreshTokenRepository.java` | ✅ |
| 10 | `auth/dto/` — GoogleAuthRequest, RefreshRequest, LogoutRequest, AuthResponse, UserResponse | ✅ |
| 11 | `auth/config/GoogleProperties.java` + `auth/service/GoogleOAuthService.java` | ✅ |
| 12 | `auth/service/AuthService.java` | ✅ |
| 13 | `auth/security/UserPrincipal.java` | ✅ |
| 14 | `auth/security/JwtAuthenticationFilter.java` | ✅ |
| 15 | `shared/security/SecurityUtils.java` — UPDATE stub → real impl | ✅ |
| 16 | `shared/config/SecurityConfig.java` — UPDATE wire JwtAuthFilter | ✅ |
| 17 | `auth/controller/AuthController.java` | ✅ |
| 18 | `auth/service/AuthServiceTest.java` — Mockito, 8 test cases | ✅ |

**Frontend (7 file):**

| # | File | Status |
|---|------|--------|
| 19 | `features/auth/types.ts` — UserProfile, AuthResponse | ✅ |
| 20 | `features/auth/api/auth-api.ts` — googleLogin, refresh, logout, getMe | ✅ |
| 21 | `features/auth/store/auth-store.ts` — UPDATE dùng UserProfile | ✅ |
| 22 | `features/auth/hooks/useAuth.ts` — useGoogleLogin, useLogout | ✅ |
| 23 | `features/auth/pages/LoginPage.tsx` — Google Sign-In button | ✅ |
| 24 | `features/auth/pages/CallbackPage.tsx` — nhận ?code=, POST BE, redirect dashboard | ✅ |
| 25 | `routes.tsx` — UPDATE thêm /auth/callback, fix PublicLayout redirect | ✅ |

**Manual test PASS:**
- `/login` → Google consent screen → `/auth/callback` → spinner → `/dashboard` ✅
- Backend `{"status":"UP"}`, Flyway migrations apply, Hikari connect DB ✅

### Phase 2 — CV Management (NEXT)

Đọc `docs/02-database-schema.md` và `docs/08-user-stories.md` (epic CV) trước khi plan.

## 3. Blockers đã resolved

- Docker/Postgres port conflict: **đã fix vĩnh viễn** — Docker dùng port 5433, native Postgres v18 giữ 5432, không conflict nữa (xem D-011)
- shadcn CLI bug: dùng manual install (xem decisions.md D-010)

## 4. Plan tổng (7 phases)

- **Phase 0:** Setup hạ tầng ← **DONE**
- **Phase 1:** Auth (Google OAuth + JWT) ← **DONE**
- **Phase 2:** CV Management ← **NEXT**
- **Phase 3:** Application CRUD + State Machine
- **Phase 4:** AI Integration
- **Phase 5:** Reminders & Notifications
- **Phase 6:** Email Integration
- **Phase 7:** Analytics + Polish + Deploy

## 5. Decisions đã chốt

Xem [decisions.md](./decisions.md) — D-001 đến D-010.

## 6. Workflow standard (không đổi)

- Đọc rules + docs liên quan TRƯỚC khi code
- Code từng file một → dừng review
- Giải thích 4 phần sau mỗi file: (1) làm gì (2) pattern lạ (3) quyết định kỹ thuật (4) edge case
- Test: Mockito cho 4 critical components, manual test cho phần còn lại
- Không tự thêm dependency, không refactor ngoài scope

## 7. Cách resume

Trong chat mới, user nhắn: **"resume project, đọc notes/handoff.md"**

Mình sẽ:
1. Đọc handoff.md + decisions.md + progress.md
2. Đọc rules `.kilocode/rules/` liên quan
3. Đọc `docs/02-database-schema.md` + `docs/08-user-stories.md` epic CV
4. Đưa ra plan Phase 2, đợi user confirm rồi code

## 8. Workflow chạy backend

**Trước khi run, đảm bảo:**
1. Docker Desktop đang chạy: `docker compose up -d` (từ root)
2. Native Postgres v18 **không cần stop** — Docker đã dùng port 5433, native giữ 5432, không conflict (D-011)

**Run backend:**
```powershell
cd D:\Job-tracker-AI\backend
.\mvnw.cmd spring-boot:run
```

**Test:**
```powershell
curl.exe http://localhost:8080/actuator/health
# Expect: {"status":"UP"}
```

## 9. Workflow chạy frontend

```powershell
cd D:\Job-tracker-AI\frontend
npm run dev
# Dev server: http://localhost:5173
```

## 10. Workflow chạy Docker

- Start: `docker compose up -d` (từ root)
- Stop tạm: `docker compose stop`
- Down (giữ volume): `docker compose down`
- **`docker compose down -v`** — xóa volume = MẤT HẾT DB

---

**File này tự xóa hoặc keep tùy user khi project xong.**
