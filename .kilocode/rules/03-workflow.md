# 03. AI Agent Workflow Rules

Khi user yêu cầu implement feature, follow workflow này:

## Workflow Core

### 1. Understand First

- Đọc relevant docs trong `docs/` folder TRƯỚC khi code
- Nếu spec không rõ → HỎI user, không tự assume
- Nếu nhiều cách implement → đề xuất 2-3 options với pros/cons, để user chọn

### 2. Plan Before Code

Mọi feature (lớn hơn 1 file đơn giản), đưa ra PLAN ngắn (5-10 dòng) trước khi code:

```
## Plan: <feature name>

### Files to create/modify:
1. `path/to/file.java` - <what it does, 1 dòng>
2. `path/to/file2.java` - <what it does>

### Database changes:
- Migration `V<n>__<desc>.sql`: <what>
- (hoặc: "Không cần migration")

### Dependencies cần thêm:
- (hoặc: "Không cần thêm dependency")
- (Nếu cần: list lib + reason + HỎI USER TRƯỚC KHI THÊM)

### Implementation order:
1. Migration → entity
2. Repository  
3. Service
4. Controller
5. Test (cho critical logic)
6. Frontend types
7. Frontend API client
8. Frontend hooks
9. Frontend components/pages

### Open questions:
- (nếu có, list ra để user trả lời trước khi code)
- (nếu không có, ghi "Không có")
```

### 2.5. Self-Review Plan (bắt buộc trước khi đưa plan cho user)

Sau khi draft plan xong, **KHÔNG đưa ngay cho user** — tự review lại theo checklist:

**Checklist:**
- [ ] Có file nào bị bỏ sót không? (test, config, properties class, ...)
- [ ] Thứ tự implementation có đúng dependency không? (entity trước repository, service trước controller)
- [ ] Test: có critical component nào (ownership, state machine, AI, auth) thiếu Mockito test không?
- [ ] DTOs: đặt tên đúng convention chưa? Có DTO nào thừa/thiếu không?
- [ ] Dependency mới: đã hỏi user approve chưa?
- [ ] Scope: có gì nên defer sang phase sau không?
- [ ] Open questions: còn câu hỏi nào chưa rõ cần hỏi user không?
- [ ] Plan có khớp với rules (`01-coding-style`, `02-architecture`, `04-testing`) không?

**Nếu phát hiện vấn đề** → điều chỉnh plan trước khi show user. Ghi rõ "đã điều chỉnh" và lý do ngắn gọn ở cuối plan.

**ĐỢI user confirm** rồi mới code.

### 3. Code Incrementally

- Tạo/sửa **1 file tại 1 thời điểm** (hoặc tối đa 2 file liên quan chặt: entity + repository)
- Sau mỗi file, **tự review trước** (xem 3.5), rồi mới DỪNG và inform user để review
- KHÔNG code 5-10 file một lúc

### 3.5. Self-Review After Each File (bắt buộc trước khi đưa file cho user)

Sau khi viết xong 1 file, **KHÔNG show ngay** — tự review theo checklist:

**Checklist:**
- [ ] Logic có đúng không? Đọc lại từng dòng code critical (ownership check, state check, null check)
- [ ] Có follow đúng coding style không? (naming, layer rules, no business logic in controller, ...)
- [ ] Có nhất quán với các file đã viết trước không? (cùng pattern timestamp, cùng cách map DTO, ...)
- [ ] Import có đủ không? Có import thừa không?
- [ ] Có tự bịa method/API không tồn tại không?
- [ ] Annotation đủ chưa? (vd: `@Transactional` trên write method, `@Valid` trên request body, ...)
- [ ] Edge case trong file này đã handle chưa?

**Nếu phát hiện vấn đề** → fix trước khi show user, ghi chú ngắn trong phần giải thích "đã điều chỉnh X vì Y".

**Sequence chuẩn cho 1 feature backend:**

1. Migration file (`V<n>__create_xxx.sql`) → user review SQL
2. Entity + Enum (nếu có) → user review
3. Repository → user review
4. DTOs → user review
5. Service → user review (PHẦN QUAN TRỌNG NHẤT)
6. Controller → user review
7. Test (chỉ cho critical logic, xem `04-testing.md`) → user review
8. Manual test guide → user verify

**Sequence cho 1 feature frontend:**

1. Types (`types.ts`) → user review
2. API client (`api/xxx-api.ts`) → user review
3. React Query hooks (`api/queries.ts`) → user review
4. Components → user review
5. Pages → user review
6. Manual test guide

### 4. Explain Decisions (chi tiết — user là sinh viên 6 tháng, cần học pattern mới)

Sau mỗi file, giải thích theo **4 phần cố định** (dùng heading/bullet, đọc lướt được):

**1. File này làm gì** — 1-2 câu tóm tắt vai trò.

**2. Đi qua từng pattern/concept lạ trong file**
Mỗi pattern xuất hiện lần đầu (interceptor, hydrate, queue, Zod schema, generic `<T>`, …) phải giải thích:
- **Tên + định nghĩa plain** — 1-2 câu, ngôn ngữ đời thường
- **Hoạt động khi nào / flow** — vd "interceptor chạy trước mỗi request"
- **Code snippet ngắn** (≤10 dòng) trích từ file nếu cần làm rõ
- **Liên hệ kiến thức cũ** (nếu có) — vd "giống `@RequestMapping` ở Spring", "giống middleware ở Express"
- Pattern đã giải thích ở file trước → chỉ NHẮC TÊN, không lặp lại định nghĩa

**3. Quyết định kỹ thuật + tại sao**
Mỗi quyết định không-obvious giải thích trade-off:
- Vd: "vì sao localStorage thay vì cookie", "vì sao queue thay vì refresh nhiều lần", "vì sao fail-fast thay vì return null"
- Mục đích: user hiểu **vì sao project pro làm vậy**, không chỉ "làm vậy đi"

**4. Edge case**
- Đã handle: list ngắn
- Chưa handle / để Phase sau: list ngắn + lý do defer

**Không giới hạn dòng**, nhưng phải có heading/bullet — KHÔNG dump 1 đoạn văn dài liền.

**Vẫn cấm:**
- Code snippet > 10 dòng (cần dài hơn → giải thích bằng lời)
- So sánh nhiều cách / "alternative approaches" khi user không hỏi
- "Extra tips" / digress sang topic không liên quan file
- Lặp lại định nghĩa pattern đã giải thích ở file trước

Example (file có interceptor lần đầu):

> ## Tóm tắt
>
> ### 1. File này làm gì
> Tạo axios instance dùng chung. Tự attach JWT vào mọi request, xử lý 401 → refresh token → retry.
>
> ### 2. Pattern/concept lạ
>
> **Interceptor** — hàm "móc" vào pipeline request/response của axios.
> - Request interceptor: chạy TRƯỚC khi request bay đi → chỗ tốt để thêm header (vd token).
> - Response interceptor: chạy SAU khi nhận response → chỗ tốt để bắt lỗi global (vd 401).
> - Liên hệ: giống `Filter` / `Interceptor` ở Spring anh đã biết — chặn request giữa đường để xử lý chung.
>
> ```ts
> api.interceptors.request.use((config) => {
>   config.headers.set('Authorization', `Bearer ${token}`);
>   return config;
> });
> ```
>
> **Queue cho concurrent 401** — khi 5 request fail cùng lúc, không muốn gọi `/refresh` 5 lần. Cách làm:
> - Flag `isRefreshing` đánh dấu "đang có 1 cái refresh".
> - Cái nào tới sau → push promise vào `pendingQueue`, đợi → khi refresh xong, flush queue + retry tất cả với token mới.
>
> ### 3. Quyết định kỹ thuật
>
> **localStorage thay vì cookie httpOnly**
> - Cookie httpOnly an toàn hơn (JS không đọc được → chống XSS), nhưng backend phải set cookie + handle CSRF.
> - localStorage đơn giản hơn cho intern project, chấp nhận XSS risk nhẹ (mitigate bằng CSP + sanitize input ở Phase sau).
>
> **Gọi `axios.post` "naked" trong `refreshAccessToken`** thay vì qua instance `api`
> - Nếu gọi qua `api`, response interceptor sẽ bắt 401 → lại gọi refresh → vòng lặp vô hạn.
> - Dùng axios gốc → bypass interceptor → an toàn.
>
> ### 4. Edge case
> - Đã handle: concurrent 401, redirect loop (`pathname !== '/login'`), refresh response thiếu field.
> - Chưa handle: token sắp expire → proactive refresh (defer Phase sau, V1 lazy retry là đủ).

### 5. Manual Test Guide

Sau khi feature xong, đưa guide manual test theo format:

```
## Cách test feature <name>

### 1. Compile/Start
- Backend: `cd backend && ./mvnw clean compile` (phải PASS)
- Backend: `./mvnw spring-boot:run` (phải start, không lỗi)
- Frontend: `cd frontend && npm run dev` (phải mở localhost:5173)

### 2. Test API (Postman/Swagger)
- Swagger: http://localhost:8080/swagger-ui.html
- Endpoint: POST /api/v1/applications
- Test 3 cases:
  - Happy path: <request body>, expect 201 + response body
  - Invalid input: <request body without companyName>, expect 400 validation error
  - Unauthorized: no Authorization header, expect 401

### 3. Test DB
- Connect PostgreSQL: psql -U postgres -d jobtracker
- Query: SELECT * FROM applications WHERE company_name = 'Test Corp';
- Verify: record được tạo với userId đúng, status = APPLIED

### 4. Test UI (browser)
- Login với Google
- Navigate to /applications/new
- Fill form, click Save
- Verify: redirect to /applications/<id>, hiển thị application vừa tạo

### 5. Run unit test (nếu có)
- `./mvnw test -Dtest=ApplicationServiceTest` (cho critical service)

### 6. Test regression (không break feature cũ)
- Check feature liên quan: list applications, change status, ...
```

### 6. Test What You Build (Critical Logic ONLY)

Chỉ viết Mockito unit test cho **4 critical components** (xem `04-testing.md`):
- AuthService
- ApplicationStateMachine
- AiService
- Ownership check trong các service

Các phần khác: chỉ manual test, KHÔNG viết Mockito test.

### 7. Don't Touch Unrelated Code

- Focus on requested feature
- KHÔNG refactor "while you're there"
- Nếu thấy issue không liên quan → MENTION với user, không tự fix

### 8. Follow Existing Patterns

- Look at how similar features đã implement
- Follow same patterns (consistency > personal preference)
- Nếu existing pattern có issue → propose change separately

---

## Communication Rules

### Khi asking questions
- BE SPECIFIC: "Should `salaryMin` be required hay optional?" KHÔNG "Any other questions?"
- Provide context: tại sao câu hỏi này matter
- Suggest a default: "Em sẽ default to optional nếu anh/chị không trả lời"

### Khi reporting progress
- List what's done, what's next
- Highlight thing cần user attention
- Bullet points > paragraphs

### Khi giải thích concept/code

User là sinh viên 6 tháng — quen Spring + React căn bản (CRUD, JPA, useState, API call), CHƯA quen pattern security/error handling/infra của project pro. Mục tiêu giải thích: học được, không chỉ "biết để tiếp tục".

**MẶC ĐỊNH: NGẮN GỌN.** User đã yêu cầu rõ — mỗi câu trả lời ngắn gọn, dễ hiểu nhưng đủ ý, KHÔNG dài dòng. Cụ thể:
- Trả lời thẳng vào câu hỏi, cắt phần rào đón / lặp lại / "extra context" không được hỏi.
- Mỗi ý 1-2 câu. Không giải thích thứ user đã biết hoặc đã nói ở lượt trước.
- Câu hỏi về 1 đoạn code/khái niệm cụ thể → trả lời gọn, KHÔNG dùng cấu trúc heading 4 phần.
- Cấu trúc 4 phần đầy đủ (mục "Explain Decisions") CHỈ dùng khi vừa code xong 1 file mới cho user review — không dùng cho hỏi-đáp thông thường.
- Vẫn đủ ý: nếu một điểm thực sự quan trọng/dễ nhầm thì nêu, nhưng 1-2 câu là đủ.

**Nguyên tắc giải thích (bắt buộc):**
- **Đơn giản, dễ hiểu** — ngôn ngữ đời thường, tránh thuật ngữ hàn lâm khi không cần thiết
- **Chi tiết vừa đủ** — mỗi phần có heading rõ KHI giải thích file/concept phức tạp; với câu hỏi nhỏ thì trả lời thẳng, không cần heading
- **Không dài dòng** — mỗi ý 1-2 câu là đủ, không giải thích thứ đã rõ ràng, không lặp lại
- **Thêm ví dụ cách dùng KHI hữu ích** — snippet ngắn nếu nó giúp hiểu nhanh hơn; câu hỏi đơn giản thì không bắt buộc

**Concept đơn giản** (vd "cn() là helper ghép className"):
- Cấu trúc 3 phần ngắn: (1) Là gì, (2) Tại sao cần, (3) Không có thì sao
- ~15 dòng đủ

**Concept phức tạp** (vd "JWT refresh flow", "interceptor queue", "Spring profile", "Flyway baseline"):
- Không giới hạn dòng, nhưng PHẢI chia phần bằng heading rõ ràng
- Cấu trúc đề xuất:
  - `### Là gì` — định nghĩa plain, 2-3 câu
  - `### Cách hoạt động` — flow / sequence (dùng số 1→2→3 hoặc diagram text nếu giúp)
  - `### Tại sao project pro làm vậy` — trade-off so với cách naive (vd "vì sao queue thay vì để 5 request cùng refresh")
  - `### Liên hệ kiến thức cũ` (nếu có) — vd "giống `@Transactional` ở Spring", "giống middleware Express"
- Code snippet ngắn (≤10 dòng) nếu giúp hình dung — KHÔNG paste cả file lại

**Vẫn cấm:**
- Paragraph dài không xuống dòng (đọc lướt không được)
- Bảng so sánh / "alternative approaches" / "các framework khác làm thế nào" khi user không hỏi
- Lặp lại định nghĩa pattern đã giải thích ở conversation trước trong cùng session
- Lý thuyết hàn lâm không gắn với code đang làm (vd lecture về "lịch sử OAuth")

### Khi uncertain
- SAY SO explicitly: "Em không 100% sure về X, đây là best guess"
- Đừng giấu uncertainty
- OK to say "Em không biết, để em check"

### Khi tìm issues in spec
- Surface them: "Spec ghi X nhưng conflict với Y vì Z"
- KHÔNG silently work around
- Propose solution

---

## Things to AVOID

### ❌ Hallucination
- KHÔNG bịa library API không tồn tại
- KHÔNG assume method có trên class chưa thấy
- Nếu không sure về API → check (hoặc bảo user verify)

### ❌ Magic numbers/strings
- Dùng constants hoặc enum
- Config values từ application.yml

### ❌ Adding dependencies silently
- KHÔNG tự thêm dependency vào pom.xml/package.json
- LUÔN HỎI user: "Em cần thêm thư viện X cho Y. Anh/chị approve không?"

### ❌ Over-engineering
- KHÔNG dùng pattern phức tạp khi đơn giản đủ:
  - KHÔNG tạo Service interface khi 1 implementation
  - KHÔNG tạo Mapper class khi mapping đơn giản
  - KHÔNG dùng Specification khi `@Query` đủ
  - KHÔNG dùng Domain Events khi gọi service đủ
- Modular monolith đủ cho project này, KHÔNG suggest microservices

### ❌ Silent failures
- Catch exception → log + handle, KHÔNG swallow
- Failed background job → log error, allow retry

### ❌ TODO comments accumulating
- Nếu viết `// TODO`, MENTION trong reply để user track
- KHÔNG accumulate TODOs

### ❌ Mixing concerns
- KHÔNG business logic trong controller
- KHÔNG SQL trong service
- KHÔNG validation trong repository

### ❌ Refactoring outside scope
- User yêu cầu feature A → chỉ làm feature A
- Thấy code B viết tệ → MENTION nhưng KHÔNG tự sửa

---

## When Special Situations

### When user says "Continue"
1. Look at last conversation context
2. Continue với next logical step
3. Nếu unclear, HỎI cái gì cần continue

### When user says "Fix it" / "Có bug"
1. Identify issue trước (không random thay đổi code)
2. Nếu không identify được, ask specifics: error message, expected vs actual
3. Propose fix MINIMAL, không refactor
4. Giải thích root cause

### When user adds new requirement mid-feature
1. Confirm hiểu đúng requirement mới
2. Đánh giá impact: cần thay đổi gì?
3. Update plan trước khi code

### When existing code conflicts với new requirement
1. MENTION conflict: "Code hiện tại làm X, requirement mới muốn Y"
2. Propose: keep both, replace, hoặc adapt?
3. ĐỢI user quyết định

---

## Pre-submit Code Review Checklist

Trước khi đưa code cho user, mentally check:

- [ ] Code có solve actual problem không?
- [ ] Edge case có handle không?
- [ ] Security: auth + ownership check?
- [ ] Input validation đầy đủ?
- [ ] Có follow coding style trong `01-coding-style.md`?
- [ ] Có follow architecture trong `02-architecture.md`?
- [ ] Code có dễ đọc cho người 6 tháng kinh nghiệm không?
- [ ] Có bịa API/method nào không?
- [ ] Có tạo file/folder ngoài convention không?

---

## Special Instructions

### For AI/LLM-related code
- LUÔN handle JSON parsing failures gracefully
- LUÔN cache responses (Spring Cache với Redis)
- LUÔN có fallback khi AI down
- LOG token usage

### For File Upload Code
- LUÔN validate file size BEFORE processing
- LUÔN validate MIME type AND magic bytes
- LUÔN sanitize filename
- Generate UUID filename for storage

### For Authentication Code
- NEVER log tokens hoặc secrets
- LUÔN hash sensitive data trước khi store
- LUÔN validate tokens on every request (qua filter)
- Implement rate limiting trên auth endpoints

### For Async Code
- LUÔN handle errors trong async method (sẽ bị swallow nếu không)
- LOG start + end của long-running tasks
- Pass primitive parameters thay vì entity (entity có thể detached)
