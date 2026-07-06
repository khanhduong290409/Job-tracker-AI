# Progress Log

Nhật ký tiến độ project Job-tracker-AI. Update sau mỗi phase/milestone.

Format: ngày, phase đang làm, what's done, what's next, notes ngắn.

---

## 2026-07-06 — Phase 5: CHẠY BACKEND THẬT — verify V7 migration + scheduler end-to-end PASS

**Chạy backend lần đầu sau khi code xong BE Phase 5 (Docker + `mvnw spring-boot:run`) để bắt lỗi runtime (kiểu bug transaction/flush Phase 4). KẾT QUẢ: sạch, không có lỗi.**

- **V7 migration apply mới OK:** DB đang ở V6 → Flyway `Migrating to version "7"` → `Successfully applied 1 migration, now at v7`. Bảng `reminders` + `notifications` tạo đủ (đúng cột, 2 partial index `idx_reminders_due`/`idx_notifications_user_unread`, check constraint `chk_reminder_type` 5 giá trị).
- **App start OK** (~12s), health `{"status":"UP"}`. Chỉ 1 WARN lành tính (generated security password — đã biết từ Phase 0).
- **Dispatcher end-to-end PASS (test thủ công):** chèn 1 reminder CUSTOM `sent_at=NULL`, `scheduled_at` quá khứ cho user 1 → restart app → 60s sau (initialDelay) dispatcher chạy, log `Reminders dispatched: 1`. Verify DB: (a) `reminder.sent_at` ĐƯỢC GHI (update flush đúng — **không kẹt như bug Phase 4** parseCvAsync); (b) `notifications` có 1 dòng `type=REMINDER`, title/message copy đúng, `link_url=null` (CUSTOM ko gắn app), `metadata` JSONB `{reminderId, reminderType}` đúng. `@Transactional` trong `ReminderDispatchService` gọi qua bean proxy `ReminderJobs` commit atomically cả insert notification + update reminder. Đã dọn data test (reminders/notifications về 0).
- **Chưa test qua REST** (endpoints notification list/unread-count/markRead + reminder CRUD) — cần JWT; để lại làm chung lúc integration với FE. Service layer đã có 16/16 unit test, controller mỏng.

**Lưu ý vận hành khi chạy backend:** DB thật dùng user `postgres` / db `jobtracker` / host port **5433** (không phải 5432/jobtracker như một số note cũ) — theo `.env`. Docker Desktop phải chạy trước. **KHÔNG `taskkill java.exe` giữa lúc `spring-boot:run` đang compile** → làm `target/classes` khuyết → `ClassNotFoundException: BackendApplication` khi chạy lại; fix bằng `mvnw clean compile` rồi chạy lại.

**Next:** Frontend File 12 — `features/notifications/` types + api + queries (list, unread-count polling, markRead, markAllRead). Rồi File 13-15. Commit backend Phase 5 (có thể commit trước hoặc sau FE).

---

## 2026-07-04 — Phase 5: Reminders & Notifications — BẮT ĐẦU

**Scope chốt (2 câu hỏi user chọn Recommended):**
- Reminder types: `CUSTOM` (tay) + `FOLLOW_UP_AFTER_APPLY` (7d còn APPLIED) + `STATUS_STALE` (14d không đổi status). Defer `INTERVIEW_REMINDER` + `TAKE_HOME_DEADLINE`.
- Channel: **IN_APP only**. Email defer Phase 6, push out-of-scope. Cột `channels` JSONB giữ sẵn.
- Delivery: polling (D-006), không WebSocket. Notification preferences (US-NOTIF-005) defer.

**Kiến trúc:** 2 module mới `reminder/` + `notification/`. `ReminderJobs` scheduled 2 việc: (1) generator (daily 08:00 cron, quét applications sinh reminder auto, dedup 1/loại/app chưa dismissed, guard terminal status) + (2) dispatcher (fixedDelay 15', reminder tới hạn → NotificationService.create → set sent_at). Reminder module inject `ApplicationRepository` read-only (precedent: ai module import CvVersionRepository). `@EnableScheduling` qua shared/config. KHÔNG trang /reminders riêng (user chốt bỏ) — quản lý reminder trong ApplicationDetailPage + bell notification.

**Plan file (15 file):**
- BE (11 file, XONG ✅): (1) V7 migration · (2) ReminderType+Reminder entity · (3) ReminderRepository · (4) reminder DTOs · (5) ReminderService (CRUD custom + ownership) · (6) Notification entity+repo+dto · (7) NotificationService · (8) ReminderDispatchService (generator+dispatcher) · (9) SchedulingConfig + ReminderJobs · (10) 2 controller · (11) 3 test class
- FE (4 file, chưa làm): (12) notifications types+api+queries · (13) NotificationBell → ProtectedLayout · (14) reminders types+api+queries · (15) reminder section trong ApplicationDetailPage

**BACKEND HOÀN THÀNH (File 1-11) — compile PASS, test 16/16 PASS.**
- 2 module mới `reminder/` + `notification/`. `ReminderJobs` (@Scheduled): generator cron `0 0 8 * * *` (FOLLOW_UP + STATUS_STALE, dedup once-per-app-per-type, terminal guard) + dispatcher `fixedDelay 900_000ms` (initialDelay 60s) bắn reminder due → NotificationService.create → set sent_at.
- Thêm 2 query vào `ApplicationRepository`: `findByStatusAndAppliedDateLessThanEqual` (FOLLOW_UP) + `findStaleApplications` (STATUS_STALE, NOT IN terminal). @SQLRestriction tự lọc soft-deleted.
- `@EnableScheduling` qua `shared/config/SchedulingConfig`.
- Endpoint: `GET/POST /api/v1/reminders`, `PUT /reminders/{id}/dismiss`, `DELETE /reminders/{id}` · `GET /notifications` (unreadOnly+paginate), `GET /notifications/unread-count` (thêm ngoài contract, cho badge poll), `PUT /notifications/{id}/read`, `PUT /notifications/read-all`.
- Test: ReminderServiceOwnershipTest 7 + NotificationServiceOwnershipTest 4 + ReminderDispatchServiceTest 5 = 16/16 PASS.

**Quyết định kỹ thuật cần nhớ:**
- Dedup reminder auto = "once per app per type ever" (`existsByApplicationIdAndReminderType`, KHÔNG kèm DismissedFalse) — tránh spam khi user dismiss. Trade-off: STATUS_STALE không nhắc lại lần 2 sau 14 ngày nữa. Chấp nhận cho demo.
- STATUS_STALE dùng `updatedAt` làm proxy cho "không đổi status" — thực chất là "không đụng gì tới đơn 14 ngày" (updatedAt reset khi sửa bất kỳ field). Nếu cần chính xác theo status → soi status_history.changed_at.
- Cột `channels` JSONB KHÔNG map trong Reminder entity (Phase 5 chỉ IN_APP, DB default lo) — Phase 6 map khi thêm EMAIL.
- Dispatcher 1 transaction cho cả batch — 1 reminder lỗi → cả batch rollback. Nếu cần cô lập lỗi → tách tx per-reminder (self-injection).
- NotificationType enum 1 value REMINDER (Phase 5 mọi notif từ reminder). metadata serialize fail-soft (log + null, không chặn tạo notif).

**CHƯA làm:** (a) chạy backend thật verify migration V7 apply + scheduler khởi động (đề xuất làm trước FE, bắt lỗi runtime kiểu transaction/flush như Phase 4). (b) Frontend File 12-15. (c) commit.

**Next:** File 12 — `features/notifications/` types + api + queries (list, unread-count polling, markRead, markAllRead).

---

## 2026-07-02 (2) — Phase 4: Feature GẮN CV vào application (bật cv-jd-match) + manual test AI flow

**Bối cảnh:** manual test phát hiện `cv-jd-match` không test được qua UI — application không có cách gắn CV (backend `create` nhận `cvVersionId` nhưng form không có ô chọn; `update` không có field này). Làm feature gắn CV NGAY trước Phase 5 (user chốt, không dồn Phase 5).

**Done (5 file):**
- Backend: `UpdateApplicationRequest` thêm `cvVersionId`; `ApplicationService.update()` xử lý kèm **check ownership** (tái dùng pattern `findByIdAndUserId` như create). Compile PASS.
- Frontend: `types.ts` `UpdateApplicationRequest` bỏ `cvVersionId` khỏi Omit (giờ update được); `CreateApplicationPage` thêm dropdown CV (useCvList, optional); `ApplicationDetailPage` thêm dropdown gắn/đổi CV (controlled bám `app.cvVersionId`, gọi useUpdateApplication). tsc PASS, lint 0 error (1 warning cũ watch).

**Quyết định:**
- Dropdown liệt kê MỌI CV, nhãn "(chưa parse xong)" cho CV chưa COMPLETED — không chặn cứng, match tự báo lỗi 400 nếu chọn CV chưa xong.
- **Chưa hỗ trợ gỡ CV (unlink)** — PATCH null=giữ nguyên; chọn "-- Chưa gắn CV --" ở detail không mutate. Defer (hiếm dùng, tránh phá pattern PATCH).
- DetailPage select controlled bám server state (`app.cvVersionId`), không dùng useState riêng.

**Manual test PASS:** tạo app gắn CV, đổi CV ở detail; cv-jd-match chạy (điểm + breakdown + strengths/gaps/suggestions), force re-analyze OK; jd-insight OK; extract-jd auto-fill OK. AI analyses lưu bảng `ai_analyses` (cache theo inputHash); extract-jd stateless không lưu.

**Note DB test:** app id=4 từng patch tay `cv_version_id=11` để test nhanh trước khi có UI — giờ đổi qua UI được.

**Next:** commit feature này. Rồi Phase 4 coi như ĐÓNG (mọi flow AI + edit parsed data + gắn CV đều PASS) → sang Phase 5 (Reminders & Notifications).

---

## 2026-07-02 — Phase 4: MANUAL TEST flow AI → fix 3 bug → CV auto-parse chạy thông

**Manual test upload CV → phát hiện & fix 3 vấn đề (parse trước đó treo PENDING mãi):**

1. **Bug transaction (nghiêm trọng, code):** `parseCvAsync` thừa kế `@Transactional(readOnly=true)` cấp class → các `self.markProcessing/saveParseSuccess/saveParseFailure` (propagation REQUIRED) join vào tx readOnly → Hibernate FlushMode MANUAL → **không flush → status không bao giờ ghi** (CV kẹt PENDING, FE poll vô hạn). Xác nhận: DB `updated_at` == `created_at`, log không có UPDATE nào. Stack trace cho thấy parseCvAsync chạy trong TransactionInterceptor. **Fix:** `@Transactional(propagation = Propagation.NOT_SUPPORTED)` trên `parseCvAsync` → 3 method self.* mỗi cái tự mở tx read-write mới.

2. **Gemini quota (config/.env):** `gemini-2.0-flash` free tier `limit: 0` → 429 RESOURCE_EXHAUSTED mọi call. Test trực tiếp key: ListModels OK, `gemini-2.5-flash` → HTTP 200 (còn quota), `2.0-flash`/`2.5-pro` → 429. **Key KHÔNG hỏng**, chỉ cần đổi model. **Fix:** `.env` `GEMINI_MODEL=gemini-2.5-flash`. (Default trong application.yaml vẫn `gemini-2.0-flash` — chưa đổi, `.env` override.)

3. **Thinking cắt cụt JSON (code):** `gemini-2.5-flash` là model "thinking" — tiêu output tokens cho suy luận (`thoughtsTokenCount`) đẩy JSON vượt `maxTokens=4000` → response cắt cụt → parse fail. **Fix:** (a) `GeminiAiService` thêm `thinkingConfig{thinkingBudget:0}` vào GenerationConfig (tắt thinking toàn cục — mọi tác vụ đều xuất JSON deterministic temp thấp); (b) `CvService` nâng maxTokens parse CV 4000 → 8192.

**Test:** thêm 3 Mockito test (saveParseSuccess→COMPLETED, saveParseFailure→FAILED+error, cv-deleted→no-save) vào `CvServiceOwnershipTest` → **14/14 PASS**. Lưu ý: bug transaction chỉ manual-test bắt được (runtime flush), Mockito chỉ khóa logic set status.

**Manual test PASS:** upload CV → PROCESSING → COMPLETED, xem/sửa parsed data OK.

**Dọn DB:** xóa sạch cv_versions test (9 dòng, gồm cả soft-deleted) → 0.

**Next:** commit US-CV-002 + 3 fix hôm nay. Rồi manual test nốt extract-jd/jd-insight/cv-jd-match (giờ CV có parsed_data + Gemini chạy) → đóng Phase 4 → Phase 5.

---

## 2026-06-28 — Phase 4: US-CV-002 FRONTEND HOÀN THÀNH (File 21-23) → US-CV-002 ĐÓNG

**Done hôm nay (frontend view + edit parsed CV data):**
- File 21: `cv/types.ts` + `api/cv-api.ts` + `api/queries.ts` ✅
  - types: `CvParsedData` (+ 8 sub-type, mọi field nullable, mirror backend Template 1) + `CvVersionDetail = CvVersion + parsedData`.
  - api: `getById` đổi trả `CvVersionDetail`; thêm `updateParsedData(id, data)` (PATCH), `reparse(id)` (POST).
  - queries: tái dùng `useCv(id)` (đổi kiểu detail); polling thêm `PENDING` (helper `isParsing`, cần cho reparse); thêm `useUpdateParsedData(id)` (setQueryData detail), `useReparseCv(id)` (setQueryData + invalidate list).
- File 22: `cv/components/CvParsedDataEditor.tsx` ✅ — RHF + `useFieldArray` (6 mảng object). Form model riêng `CvParsedDataForm` (toàn string) + map `toForm`/`toParsed`. **List chuỗi (technologies/achievements/skill items) edit bằng textarea, mỗi dòng 1 mục** (`splitLines`/`joinLines`) — tránh nested fieldArray. `'' → null` khi lưu. Component thuần (props onSave/isSaving/saveError). Sub-component tái dùng `SectionHeader`/`ItemCard`.
- File 23: `cv/pages/CvDetailPage.tsx` (MỚI) + route `/cv/:id` + link từ `CvCard` ✅ — 2 cột: PDF iframe (+ link "Mở PDF" fallback) | editor. `key={cv.updatedAt}` để remount editor khi data đổi (reparse/lưu xong). Render editor cả khi FAILED (user nhập tay). Nút "Phân tích lại bằng AI".

**Verify:** `tsc --noEmit` PASS · `npm run lint` 0 error (1 warning cũ `incompatible-library` ở CreateApplicationPage:124, không liên quan).

**Quyết định kỹ thuật hôm nay:**
- **List chuỗi = textarea mỗi dòng 1 mục** thay vì nested `useFieldArray` — đơn giản hơn nhiều, đổi lại có map layer toForm/toParsed.
- **Polling thêm trạng thái PENDING** — reparse trả PENDING (async chưa kịp set PROCESSING); chỉ poll PROCESSING thì sau reparse query đứng im. Vá luôn race lúc upload.
- **`key={cv.updatedAt}` remount editor** — RHF defaultValues chỉ đọc lúc mount; đổi key = reset form theo data mới.
- **Editor là component thuần** — page wire hook (onSave), tách UI/data.
- **`getById`/`useCv` tái dùng** thay vì tạo `useCvDetail` mới (CvVersionDetail là superset của CvVersion → consumer cũ không vỡ).

**Next:** Manual test toàn flow AI trên browser (cần `GEMINI_API_KEY` trong `.env`): upload CV → auto AI-parse → CvDetailPage xem/sửa parsed data → lưu → reparse; + extract-jd auto-fill, jd-insight, cv-jd-match (giờ chạy được vì CV có parsed_data). Sau manual test xong → Phase 4 ĐÓNG, sang Phase 5 (Reminders).

**Git:** US-CV-002 (backend File 20.x + frontend File 21-23) CHƯA commit. Backend trước đó còn có chỉnh inline parseCvAsync (gỡ 3 helper downloadPdf/extractText/aiParse) theo feedback "đừng tách method vụn".

**Known issue (defer Phase 7 — xem blockers.md B-001):** Mở CvDetailPage → PDF iframe TỰ TẢI VỀ file tên UUID thay vì render inline. Do upload `resource_type: "raw"` + public_id không đuôi `.pdf` → Cloudinary trả attachment/octet-stream. Fix ở Phase 7 (đổi resource_type "image" + `.pdf` + bật PDF delivery Cloudinary, làm chung thumbnail). KHÔNG block manual test editor.

---

## 2026-06-27 — Phase 4: US-CV-002 BACKEND HOÀN THÀNH (File 20.1-20.5)

**Done hôm nay (backend edit/sửa CV để view + edit parsed data + AI parse CV):**
- File 20.1: `cv/dto/CvParsedData.java` ✅ — typed DTO khớp Template 1 (personalInfo+links, summary, education[], experience[], skills[], projects[], certifications[], languages[]). Nested records, MỌI field nullable + `@JsonIgnoreProperties(ignoreUnknown=true)` từng record (tolerant). Date/gpa để String.
- File 20.2: `cv/dto/CvDetailResponse.java` ✅ — = CvVersionResponse + `parsedData`. Pattern list-item (nhẹ) vs detail (đầy đủ). List vẫn dùng CvVersionResponse.
- File 20.3: `cv/service/CvService.java` ✅ — (a) parse pipeline thêm bước gọi Gemini Template 1 fill parsed_data; (b) **TÁCH TRANSACTION**: `parseCvAsync` thành orchestrator KHÔNG @Transactional, gọi `self.markProcessing/saveParseSuccess/saveParseFailure` (3 tx ngắn qua proxy), I/O nặng (PDF+Gemini) chạy NGOÀI tx; (c) `getDetail` (thay `getById`), `updateParsedData`, `reparse`. Inject thêm AiService/JsonResponseParser/ObjectMapper.
- File 20.4: `cv/controller/CvController.java` ✅ — `GET /{id}`→getDetail (CvDetailResponse), `PATCH /{id}/parsed-data` (full-replace), `POST /{id}/reparse` (202).
- File 20.5: `cv/service/CvServiceOwnershipTest.java` ✅ — getById→getDetail, thêm 2 test updateParsedData (round-trip qua `@Spy ObjectMapper` thật). **11/11 PASS**.

**Verify:** `mvnw compile` PASS · `mvnw test -Dtest=CvServiceOwnershipTest` → **11/11 PASS, BUILD SUCCESS**.

**Quyết định kỹ thuật hôm nay:**
- **AI parse CV auto khi upload** (Template 1, temp 0.1, maxTokens 4000) — unblock luôn cv-jd-match (vốn đòi `parsed_data != null`, trước đó luôn null nên match luôn báo "CV chưa parse xong").
- **AI parse lỗi → status FAILED** + `parseError` (không phải COMPLETED-data-null, tránh mâu thuẫn vì match cần parsedData). Kèm `POST /{id}/reparse` để cứu CV FAILED (cặp bắt buộc).
- **Tách transaction** (user chốt): Gemini call NGOÀI @Transactional, tránh giữ DB connection ~vài giây — đúng nguyên tắc AiAnalysisService đã ghi. Phát hiện kèm: code cũ load Cloudinary trong tx (issue có sẵn, nay đã tách luôn vì đang sửa method này).
- **CvService gọi shared/ai trực tiếp** (AiService+JsonResponseParser), KHÔNG qua AiAnalysisService — tránh vòng phụ thuộc cv↔ai (ai module đã import CvVersionRepository).
- **Guard PDF blank** (ảnh scan) → FAILED rõ ràng thay vì gửi text rỗng cho Gemini.

**Next (Phase 4 còn lại — Frontend US-CV-002, File 21-23):**
- File 21: `cv/types.ts` (+ CvParsedData, CvDetailResponse tolerant) + `cv-api.ts` (getCvDetail, updateParsedData, reparseCv) + `queries.ts` (useCvDetail, useUpdateParsedData, useReparseCv).
- File 22: `cv/components/CvParsedDataEditor.tsx` (RHF + useFieldArray, có thể tách 2 file con nếu dài).
- File 23: `cv/pages/CvDetailPage.tsx` (MỚI: PDF embed + editor side-by-side) + route `/cv/:id` + link từ CvCard.

**Lưu ý FE:** PDF preview Cloudinary `raw` URL có thể tải về thay vì render inline trong iframe → làm best-effort + nút "Mở PDF" fallback (thumbnail vẫn defer Phase 7).

**Manual test defer:** test toàn bộ flow AI (extract-jd, jd-insight, cv-jd-match, CV auto-parse, edit parsed data) trên browser sau khi xong FE + có `GEMINI_API_KEY` trong `.env`.

**Git:** backend US-CV-002 chưa commit.

---

## 2026-06-24 — Phase 4: AI Integration — FRONTEND HOÀN THÀNH (File 14-19)

**Done hôm nay (6 file frontend):**
- File 14: `features/ai/types.ts` ✅ — mirror 3 DTO backend. Field enum-like để `string` (tolerant output AI), số `number | null`, mọi field `| null` (AI có thể bỏ qua → component phải guard).
- File 15: `features/ai/api/ai-api.ts` + `queries.ts` ✅ — 3 hàm API + 4 hook. **AI call lazy** (`enabled` do caller bật khi bấm nút) tránh tự nướng quota. `extract-jd` = mutation; `jd-insight`/`cv-jd-match` = query `staleTime: Infinity`; `useReanalyzeMatch` (force) ghi đè cache qua `setQueryData`.
- File 16: `features/ai/components/JdInsightSection.tsx` ✅ — lazy trigger, render info + chip kỹ năng/tech stack + bullet trách nhiệm/quyền lợi. Mỗi nhóm tự ẩn khi rỗng.
- File 17: `features/ai/components/AiMatchCard.tsx` ✅ — điểm khớp (màu theo ngưỡng 80/60), 4 thanh breakdown, strengths/gaps/suggestions, chip keyword, nút "Phân tích lại" (force). `describeError` phân biệt **400** (thiếu CV parse) vs **503** (AI down).
- File 18: `ApplicationDetailPage.tsx` ✅ — nhúng `JdInsightSection` + `AiMatchCard` (truyền `appId`) sau khối Nội dung JD.
- File 19: `CreateApplicationPage.tsx` ✅ — nút "✨ Phân tích JD & tự điền": `useExtractJd` → map `JdInsight` vào field (companyName/position/location + workType/employmentType validate enum). `setIf` không clobber field user bằng null. Dùng `setValue/getValues/watch` của RHF.

**Verify:** `tsc --noEmit` PASS · `eslint` 0 error (1 warning lành tính `react-hooks/incompatible-library` ở `watch('jdContent')` — React Compiler bỏ qua memo component này, KHÔNG ảnh hưởng build/hành vi; chỉ hiện khi `npm run lint`).

**Quyết định kỹ thuật:**
- AI call **lazy on-demand**, KHÔNG auto-fetch lúc mount (tốn phí + chậm). Query nhận `enabled` từ component.
- Field enum AI để `string` ở FE + validate `includes()` trước khi `setValue` (auto-fill) → tránh chọn giá trị rác lệch enum.
- `force` re-analyze = mutation riêng + `setQueryData`, KHÔNG nhét vào queryKey (tránh 2 cache entry rời).
- Phân biệt lỗi 400 vs 503 ở match card vì 400 cần user hành động khác (gắn CV parse) — khác JdInsight gộp chung message.

**Next (Phase 4 còn lại — US-CV-002, 3 file):**
- File 20: `CvService.updateParsedData()` + `PATCH /api/v1/cv/{id}/parsed-data` (backend)
- File 21: `features/cv/components/CvParsedDataEditor.tsx`
- File 22: update `CvListPage`/`CvDetailPage`

**Manual test UI defer:** sẽ test toàn bộ flow AI trên browser sau khi có `GEMINI_API_KEY` trong `.env` (extract-jd auto-fill + jd-insight + cv-jd-match).

**Lưu ý git:** backend Phase 4 đã commit local `7904994` (chưa push — user tự push). Frontend File 14-19 chưa commit.

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
