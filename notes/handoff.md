# Handoff Context — 2026-06-09 (Phase 2 DONE, chuẩn bị Phase 3)

File này tổng hợp toàn bộ context để chat mới resume project mà không cần đọc lại history dài. **Đọc thứ tự**: file này → [decisions.md](./decisions.md) → [progress.md](./progress.md) → rules.

---

## 1. User Profile

- Sinh viên IT, ~6 tháng kinh nghiệm Spring + React
- Làm intern project 8 tuần (Job-tracker-AI)
- Dev trên Windows 10 + PowerShell (KHÔNG WSL)
- Đọc/viết tiếng Việt, thêm comment tiếng Việt vào file để học
- Thích hiểu sâu — hỏi "tại sao" nhiều, cần giải thích 4 phần sau mỗi file

## 2. Project ở giai đoạn nào

**Phase 2: CV Management — DONE. Bắt đầu Phase 3 tiếp theo.**

### Phase 3 — Application CRUD + State Machine (0 file xong)

Cần đọc trước khi plan:
- `docs/03-api-design.md` — Application endpoints
- `docs/02-database-schema.md` — bảng `applications`
- `docs/08-user-stories.md` — epic Application (US-APP-001..006)

Scope dự kiến Phase 3:
- `ApplicationStatus` enum (APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED, WITHDRAWN)
- CRUD: tạo application, list (filter by status), get detail, update, delete (soft)
- State machine: `ApplicationStatus` transitions theo rules trong docs
- Reminder cho interview (liên quan Phase 5 nhưng data model cần từ Phase 3)

### Phase 2 — DONE (tổng kết)

| # | File | Status |
|---|------|--------|
| 1-5 | DB migration, entity, repository, storage layer, DTO | ✅ |
| 6 | `cv/service/CvService.java` | ✅ |
| 7 | `cv/controller/CvController.java` | ✅ |
| 8 | `cv/service/CvServiceOwnershipTest.java` (9 tests) | ✅ |
| 9-13 | Frontend: types, api, queries+polling, components+page, routes | ✅ |

## 3. Decisions quan trọng (đọc decisions.md để đầy đủ)

**D-012:** Cloudinary từ Phase 2, không dùng LocalFileStorageService. `delete()` vẫn no-op (Phase 7).

**D-013 (MỚI):** `QueryClientProvider` phải bọc toàn bộ app trong `App.tsx`. `QueryClient` instance khai báo ngoài component để không bị recreate.

**Kỹ thuật đã dùng trong Phase 2 (không cần giải thích lại):**
- `@Async("aiTaskExecutor")` + self-injection `@Autowired @Lazy` để gọi @Async từ cùng class
- `Loader.loadPDF(byte[])` — PDFBox 3.x API (không phải `PDDocument.load()`)
- `@SQLDelete` + `@SQLRestriction` — soft delete Hibernate 6.4
- `@Modifying(clearAutomatically = true)` — bulk UPDATE
- TanStack Query v5: `refetchInterval: (query) => query.state.data?.some(...) ? 3000 : false`
- `useRef` để reset DOM `<input type="file">` sau submit
- `variables` từ `useMutation` để track per-card loading state

## 4. Plan tổng (7 phases)

- **Phase 0:** Setup hạ tầng ← **DONE**
- **Phase 1:** Auth (Google OAuth + JWT) ← **DONE**
- **Phase 2:** CV Management ← **DONE**
- **Phase 3:** Application CRUD + State Machine ← **TIẾP THEO**
- **Phase 4:** AI Integration + edit parsed CV data (US-CV-002)
- **Phase 5:** Reminders & Notifications
- **Phase 6:** Email Integration
- **Phase 7:** Analytics + Polish + Deploy

## 5. Workflow standard

- Đọc rules + docs liên quan TRƯỚC khi code
- Self-review plan (bước 2.5) trước khi show user
- Code từng file một, self-review (bước 3.5) trước khi show user
- Giải thích 4 phần sau mỗi file: (1) làm gì (2) pattern lạ (3) quyết định kỹ thuật (4) edge case
- Test: Mockito cho 4 critical components, manual test cho phần còn lại
- Không tự thêm dependency, không refactor ngoài scope

## 6. Cách resume

Trong chat mới, user nhắn: **"resume project"** hoặc **"đọc notes/handoff.md"**

Mình sẽ:
1. Đọc handoff.md + decisions.md + progress.md
2. Đọc rules `.kilocode/rules/` liên quan
3. Đọc `docs/` liên quan Phase 3 trước khi plan
4. Đưa plan Phase 3, chờ user confirm, rồi code từng file

## 7. Workflow chạy backend

**Trước khi run, đảm bảo Docker Desktop đang chạy:**

```powershell
# Từ root
docker compose up -d

# Từ backend/
.\mvnw.cmd spring-boot:run
```

Test: `curl.exe http://localhost:8080/actuator/health` → `{"status":"UP"}`

## 8. Workflow chạy frontend

```powershell
cd D:\Job-tracker-AI\frontend
npm run dev
# Dev server: http://localhost:5173
```

## 9. Workflow chạy Docker

- Start: `docker compose up -d` (từ root)
- Stop tạm: `docker compose stop`
- Down (giữ volume): `docker compose down`
- **`docker compose down -v`** — xóa volume = MẤT HẾT DB

---

**File này tự xóa hoặc keep tùy user khi project xong.**
