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

**ĐỢI user confirm** rồi mới code.

### 3. Code Incrementally

- Tạo/sửa **1 file tại 1 thời điểm** (hoặc tối đa 2 file liên quan chặt: entity + repository)
- Sau mỗi file, DỪNG và inform user để review
- KHÔNG code 5-10 file một lúc

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

### 4. Explain Decisions (NGẮN, 2-3 câu sau mỗi file)

Sau mỗi file, giải thích **ngắn gọn**:
- File này làm gì?
- Có quyết định kỹ thuật nào đáng chú ý không? Tại sao?
- Edge case nào đã handle?

KHÔNG dump 1 page lý thuyết. Ngắn gọn, đủ ý.

Example:
> "ApplicationService.create() này:
> - Validate CV version thuộc về user trước khi save (security)
> - Status mặc định là APPLIED khi tạo
> - Mapping inline với `toResponse()` private method
> - Không gọi AI ngay, để frontend trigger separately để keep response time nhanh"

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
