# Decision Log

Ghi lại các quyết định kỹ thuật/scope quan trọng + lý do. Update khi có decision mới.

Format: ngày, decision, lý do, trade-off (nếu có).

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
