# Decision Log

Ghi lại các quyết định kỹ thuật/scope quan trọng + lý do. Update khi có decision mới.

Format: ngày, decision, lý do, trade-off (nếu có).

---

## 2026-06-09 — Phase 2 hotfix

### D-013: QueryClientProvider bắt buộc bọc toàn bộ app trong App.tsx
- **Quyết định:** `QueryClient` instance khai báo ở module level (ngoài component), `QueryClientProvider` bọc `BrowserRouter` trong `App.tsx`.
- **Lý do:** Bị thiếu khi setup Phase 0 skeleton — `@tanstack/react-query` chưa được dùng ở Phase 0 nên chưa thêm Provider. Phase 2 là lần đầu dùng → phát hiện lỗi "No QueryClient set".
- **Lưu ý:** `QueryClient` khai báo ngoài component để tránh recreate mỗi re-render → cache bị xóa.

---

## 2026-06-07 — Phase 2 storage decision

### D-012: Dùng Cloudinary từ Phase 2, bỏ LocalFileStorageService
- **Quyết định:** Xóa `LocalFileStorageService`. Chỉ có `CloudinaryFileStorageService` (không cần `@Profile`). `fileUrl` trong DB luôn là Cloudinary `secure_url` (HTTPS URL thật).
- **Lý do:** `LocalFileStorageService` lưu file local → `fileUrl` chỉ là filename thuần, frontend không dùng được để hiển thị PDF. Cloudinary free tier đủ dùng cho dev. Dev/prod nhất quán hoàn toàn.
- **Ảnh hưởng:** Phase 7 bớt task "implement CloudinaryFileStorageService". `delete()` vẫn no-op (Phase 7 implement GDPR delete).
- **Override:** D-003 (LocalFileStorageService cho dev) không còn hiệu lực.

---

## 2026-06-06 — Dev environment

### D-011: Docker Postgres dùng port 5433 thay vì 5432
- **Quyết định:** `docker-compose.yml` map `5433:5432` (host:container). Spring Boot kết nối `localhost:5433` qua `DB_PORT=5433` trong `.env`.
- **Lý do:** Native PostgreSQL v18 cài sẵn trên máy dev (dùng cho project khác) giữ port 5432. Đổi Docker sang 5433 để hai cái không conflict — không cần stop native Postgres trước khi chạy project này nữa.
- **Ảnh hưởng:** Chỉ áp dụng cho dev local. Prod (Phase 7) dùng Docker Compose network nội bộ, không expose port ra host.

---

## 2026-05-31 — Phase 1 setup decisions

### D-008: Defer Rate Limiting (Bucket4j) sang Phase 7
- **Quyết định:** KHÔNG implement rate limiting cho `/auth/**` ở Phase 1. Defer sang Phase 7 (Polish).
- **Lý do:** Thêm Bucket4j dependency + filter logic làm phức tạp Phase 1. Project demo intern, risk thấp.
- **Khi implement:** Thêm `bucket4j-redis` dependency, tạo `RateLimitingFilter extends OncePerRequestFilter`, config limits theo `docs/05-security.md` (10/min per IP cho `/auth/**`).

### D-009: Swagger UI enable trong dev
- **Quyết định:** Thêm `springdoc-openapi-starter-webmvc-ui 2.5.0`. Swagger luôn bật ở `dev`, sẽ disable ở `prod` (Phase 7 deploy checklist).
- **Lý do:** Tiện test API trong quá trình dev mà không cần Postman.

### D-010: shadcn/ui — Manual Install thay vì CLI
- **Quyết định:** KHÔNG dùng `npx shadcn@latest init`. Cài thủ công 4 package + copy component code.
- **Lý do:** shadcn CLI v4 có bug workspace detection trên Windows (lỗi "Could not load workspace config"). Nhiều version đều fail.
- **Cách thêm component mới:** Vào https://ui.shadcn.com/docs/components/[tên], copy code trong tab "Manual" → đặt vào `src/components/ui/[tên].tsx`. ESLint rule `react-refresh/only-export-components` đã tắt cho `src/components/ui/**`.
- **Packages cần thiết (đã install):** `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`

---

## 2026-05-26 — Phase 0 setup decisions

### D-001: Single-module Maven (không multi-module)
- **Quyết định:** Backend dùng 1 module Maven duy nhất, `shared` chỉ là package convention (`com.jobtrackerai.shared`).
- **Lý do:** Project scope intern 8 tuần, multi-module thêm overhead pom hierarchy, dependency management phức tạp mà không có lợi rõ ràng cho project nhỏ.
- **Trade-off:** Mất khả năng enforce strict module boundaries ở compile time. Chấp nhận vì rules đã clear về module dependency.

### D-002: SecurityUtils stub fail-fast
- **Quyết định:** Phase 0 `SecurityUtils.getCurrentUserId()` throw `IllegalStateException("SecurityUtils not wired yet — implement in Phase 1")`, KHÔNG return null.
- **Lý do:** Tránh silent NPE nếu dev vô tình gọi trước Phase 1. Fail-fast giúp debug nhanh.

### D-003: FileStorageService — interface với profile-based impl
- **Quyết định:** `FileStorageService` interface trong `shared` module, 2 implementations:
  - `LocalFileStorageService` (`@Profile("!prod")`) — lưu local filesystem
  - `CloudinaryFileStorageService` (`@Profile("prod")`) — Cloudinary SDK upload server-side
- **Lý do:** Dev không cần Cloudinary account, prod dùng cloud storage. Spring tự pick impl theo profile. Service business inject interface, không biết về impl.
- **Bảo mật:** TUYỆT ĐỐI không upload trực tiếp từ FE lên Cloudinary (lộ credentials). FE → BE → storage.
- **Implement khi:** Phase 2 (CV upload feature cần), defer khỏi Phase 0.

### D-004: Defer shadcn/ui đến Phase 1
- **Quyết định:** Phase 0 frontend chỉ setup routing/layout với plain Tailwind. shadcn init khi bắt đầu Login UI (Phase 1).
- **Lý do:** Phase 0 chưa có UI cụ thể cần component library, defer giảm setup overhead trước.

### D-005: AI provider — chỉ Gemini cho V1
- **Quyết định:** Implement `GeminiAiService` ở Phase 4. `AiService` interface vẫn giữ pattern abstract để future swap, nhưng KHÔNG implement Grok backup ở V1.
- **Lý do:** Scope time 8 tuần. Backup provider chỉ làm khi còn thời gian sau khi core xong.

### D-006: WebSocket → polling cho V1
- **Quyết định:** CV parse progress + AI analysis progress dùng FE polling mỗi 3s khi status = `PROCESSING`. KHÔNG implement WebSocket V1.
- **Lý do:** WebSocket setup phức tạp (STOMP, fallback). Polling đơn giản, đủ cho project demo.

### D-007: Out-of-scope V1
- Mock Interview Chatbot (US-AI-005 mở rộng)
- Browser push notification
- Gmail Pub/Sub push notification (chỉ poll 15 phút)
- Multi-language UI (English only)
- Frontend Mockito/Vitest test (manual test đủ)
