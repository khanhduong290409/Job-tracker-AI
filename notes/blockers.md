# Blockers Log

Ghi vấn đề gặp phải khi implement + cách giải quyết. Khi resolve xong, update RESOLVED + ngày.

Format:

```
### B-XXX: <tên vấn đề> — [OPEN | RESOLVED YYYY-MM-DD]
- **Phase/File:** <context>
- **Vấn đề:** <mô tả>
- **Đã thử:** <approaches đã thử>
- **Giải pháp:** <giải quyết bằng cách nào> (chỉ điền khi RESOLVED)
```

---

### B-002: CV upload kẹt PENDING mãi (parse status không ghi) — [RESOLVED 2026-07-02]
- **Phase/File:** Phase 4 US-CV-002 · `CvService.parseCvAsync`
- **Vấn đề:** Upload CV → treo "Đang xử lý" vô hạn, FE poll mãi không dừng. DB: status PENDING, `updated_at`==`created_at`; log không có câu UPDATE parse_status nào.
- **Nguyên nhân:** `parseCvAsync` không tự khai `@Transactional` nhưng thừa kế `@Transactional(readOnly=true)` cấp class → chạy trong tx readOnly. Các `self.markProcessing/saveParseSuccess/saveParseFailure` (propagation REQUIRED) join tx readOnly đó → Hibernate FlushMode MANUAL → `save()` không flush → không ghi gì. Xác nhận qua stack trace (parseCvAsync trong TransactionInterceptor).
- **Giải pháp:** `@Transactional(propagation = Propagation.NOT_SUPPORTED)` trên `parseCvAsync` → chạy phi-tx, 3 method self.* mỗi cái tự mở tx read-write mới → flush + persist đúng.

### B-003: Gemini 429 + JSON parse cắt cụt (đổi sang 2.5-flash) — [RESOLVED 2026-07-02]
- **Phase/File:** Phase 4 · `.env` · `GeminiAiService` · `CvService`
- **Vấn đề:** (a) mọi call Gemini 429 RESOURCE_EXHAUSTED; (b) sau khi đổi model thì "Failed to parse AI response into CvParsedData" — JSON cắt cụt giữa chừng.
- **Nguyên nhân:** (a) `gemini-2.0-flash` free tier `limit: 0` (key ổn, ListModels OK; 2.5-flash test HTTP 200); (b) `gemini-2.5-flash` là thinking model, `thoughtsTokenCount` đẩy JSON vượt `maxTokens=4000` → cắt cụt.
- **Giải pháp:** (a) `.env` `GEMINI_MODEL=gemini-2.5-flash`; (b) `GeminiAiService` set `thinkingConfig{thinkingBudget:0}` (tắt thinking toàn cục) + `CvService` nâng maxTokens parse CV → 8192.
- **Lưu ý:** `thinkingConfig` gửi cho model không hỗ trợ (vd 2.0-flash) có thể 400 — nếu đổi model sau này nhớ chỗ này. Default application.yaml vẫn 2.0-flash, `.env` override.

### B-001: PDF không xem inline được — tự download khi mở CvDetailPage — [OPEN — defer Phase 7]
- **Phase/File:** Phase 4 US-CV-002 · `CvDetailPage.tsx` (iframe PDF) · `CloudinaryFileStorageService.java`
- **Vấn đề:** Vào `/cv/{id}`, iframe `src={cv.fileUrl}` khiến browser TỰ TẢI VỀ 1 file tên UUID (vd `003c5be9-...`) thay vì render PDF inline.
- **Nguyên nhân:** Upload dùng `resource_type: "raw"` → Cloudinary phục vụ với `Content-Disposition: attachment` + content-type `application/octet-stream`; thêm nữa `public_id` là UUID KHÔNG có đuôi `.pdf` → browser không nhận ra PDF. Cả iframe lẫn link "Mở PDF" đều bị tải về.
- **Đã thử:** iframe + link fallback (File 23) — vẫn tải về vì cùng URL raw/attachment.
- **Giải pháp (Phase 7):** Đổi `resource_type` `"raw"` → `"image"` khi upload + URL có `.pdf` (`.../image/upload/<public_id>.pdf`), bật setting Cloudinary "Allow delivery of PDF and ZIP files". Lưu ý chỉ ăn với CV upload MỚI. Làm chung với thumbnail trang đầu (pg_1) — xem memory `project-cv-preview-deferred`. Giải pháp tạm nếu cần xem ngay: Google Docs viewer embed (FE-only). KHÔNG block US-CV-002 (feature test là editor parsed data).
