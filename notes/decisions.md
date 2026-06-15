# Decision Log

Ghi lại các quyết định kỹ thuật/scope quan trọng + lý do. Update khi có decision mới.

Format: ngày, decision, lý do, trade-off (nếu có).

---

## 2026-06-12 — Phase 3 (revise)

### D-017: Giữ state machine CỨNG cho changeStatus (đã cân nhắc, không đổi)
- **Quyết định:** `changeStatus()` tiếp tục validate qua `ApplicationStateMachine` (chặn transition không hợp lệ). KHÔNG chuyển sang mô hình tự do (status là nhãn) hay hybrid cảnh báo.
- **Bối cảnh:** Đã review cách job tracker thật vận hành — đa số consumer tool (Huntr/Teal/Trello-based) để user đổi status tự do, không state machine; state machine cứng phổ biến hơn ở ATS doanh nghiệp nhiều-người. Tức là state machine ở dự án này nghiêng về "học pattern".
- **Lý do giữ:** Đúng mục tiêu intern project (học pattern pro: transition table, validation tập trung, terminal state). Cho dữ liệu `status_history` sạch để analytics/pattern analysis. Trade-off kém linh hoạt được bù bởi D-016 (create cho chọn mọi status → vẫn backfill được).
- **Kết hợp:** create linh hoạt (D-016) + changeStatus cứng (D-017) = "dễ vào, chặt khi đi tiếp".

### D-016: Create cho phép CHỌN MỌI status (override phần restriction của D-015)
- **Quyết định:** `CreateApplicationRequest.status` optional, không gửi → default SAVED, **nhưng cho phép chọn bất kỳ status nào** (kể cả terminal ACCEPTED/REJECTED/WITHDRAWN). Bỏ check `CREATABLE_STATUSES` trong `ApplicationService.create()`.
- **Lý do:** Use case backfill — user mới biết app khi đơn đã ở giữa chừng (vd đã PHONE_SCREEN/TECHNICAL_INTERVIEW). Bắt tạo từ SAVED rồi tự chuyển từng bước = UX tệ + tạo mốc lịch sử giả. App theo dõi cá nhân → user là nguồn sự thật.
- **Mô hình:** "create = chụp ảnh thực tại" (chọn trạng thái hiện có) vs "changeStatus = tiến trình về sau" (state machine ràng buộc). State machine vẫn nguyên vẹn — chỉ quản lý transition kể từ điểm xuất phát. Baseline history row `from=null → to=status` ghi trung thực điểm bắt đầu theo dõi, không bịa mốc trung gian.
- **Override:** phần "chỉ chấp nhận SAVED/APPLIED" của D-015 không còn hiệu lực. Phần `appliedDate` nullable / không auto-set của D-015 VẪN giữ.

### D-015: Default status khi tạo application = SAVED, appliedDate để null
- **Quyết định:** `CreateApplicationRequest` có field `status` optional, không truyền thì default SAVED. `appliedDate` nullable — không auto-set. (Phần restriction "chỉ SAVED/APPLIED" đã bị **D-016 override**.)
- **Lý do:** User có thể paste job link để bookmark/nghiên cứu trước khi apply (feature parse-jd ở Phase 4). Default APPLIED sẽ sai semantic với use case này. `appliedDate` để null tránh data sai — hint trên UI nhắc user điền khi apply thật.

### D-014: Kanban view defer Phase 5+
- **Quyết định:** Phase 3 frontend chỉ làm List view. Kanban drag-drop (cần `@dnd-kit` hoặc `react-beautiful-dnd`) defer sang Phase 5+.
- **Lý do:** Kanban cần thêm dependency chưa được approve + nhiều component phức tạp. Phase 3 đã có ~27 files, thêm Kanban sẽ thành ~35+. List view đủ chức năng để demo và test.
- **Ảnh hưởng:** `docs/01-features.md` + `docs/06-frontend-spec.md` đã update ghi chú defer.

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
