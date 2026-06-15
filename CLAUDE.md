# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này. Đọc kỹ trước khi code.

## Project

**Job-tracker-AI** — web app giúp ứng viên IT quản lý quá trình xin việc, dùng AI phân tích match CV–JD.

- **Backend**: Spring Boot 3.2+, Java 17, Maven, PostgreSQL 15, Redis 7, package `com.jobtrackerai` (modular monolith)
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS, React Query, Zustand, React Hook Form + Zod, axios
- **AI**: Google Gemini API · **Auth**: Google OAuth + JWT

Cấu trúc: `backend/` (Spring Boot) · `frontend/` (React+TS) · `docs/` (spec) · `.kilocode/rules/` (rule chi tiết)

## Đọc để hiểu dự án

Đọc theo thứ tự sau để nắm toàn bộ context trước khi implement:

### 1. Hiểu sản phẩm & tiến độ (bắt buộc đọc trước)
| File | Nội dung |
|------|----------|
| [notes/handoff.md](notes/handoff.md) | **Đọc đầu tiên** — phase plan 7 phases, phase hiện tại, context resume project |
| [notes/progress.md](notes/progress.md) | Nhật ký tiến độ từng phase — biết đã làm gì, còn gì |
| [notes/decisions.md](notes/decisions.md) | Các quyết định kỹ thuật quan trọng + lý do |
| [docs/08-user-stories.md](docs/08-user-stories.md) | Ai dùng app, dùng để làm gì — bức tranh toàn cảnh từ góc độ user |
| [docs/01-features.md](docs/01-features.md) | Danh sách tính năng chi tiết của toàn bộ app |
| [.kilocode/rules/00-project-overview.md](.kilocode/rules/00-project-overview.md) | Tech stack, danh sách module, critical rules không được vi phạm |

### 2. Hiểu data & API
| File | Nội dung |
|------|----------|
| [docs/02-database-schema.md](docs/02-database-schema.md) | ERD, các bảng, quan hệ — đọc trước khi đụng vào Entity/Repository |
| [docs/03-api-contract.md](docs/03-api-contract.md) | Endpoint, request/response format — contract giữa FE và BE |

### 3. Hiểu phần chuyên biệt (đọc khi liên quan)
| File | Khi nào đọc |
|------|-------------|
| [docs/04-ai-integration.md](docs/04-ai-integration.md) | Trước khi làm AI/Gemini feature |
| [docs/05-security.md](docs/05-security.md) | Trước khi làm auth, JWT, OAuth |
| [docs/06-frontend-spec.md](docs/06-frontend-spec.md) | Trước khi làm UI/UX, component |
| [docs/07-non-functional.md](docs/07-non-functional.md) | Khi cần biết yêu cầu performance, constraint |

### 4. Hiểu cách code (đọc trước khi implement bất kỳ feature nào)
Đọc theo thứ tự:
1. [.kilocode/rules/02-architecture.md](.kilocode/rules/02-architecture.md) — module communication, transaction, cache, security pattern
2. [.kilocode/rules/01-coding-style.md](.kilocode/rules/01-coding-style.md) — naming, cấu trúc file, nguyên tắc viết logic đơn giản
3. [.kilocode/rules/03-workflow.md](.kilocode/rules/03-workflow.md) — sequence làm việc, format giải thích
4. [.kilocode/rules/04-testing.md](.kilocode/rules/04-testing.md) — chiến lược test

---

## Lệnh hay dùng

```bash
# Backend (chạy trong backend/)
./mvnw clean compile          # check compile
./mvnw spring-boot:run        # start app (port 8080, Swagger: /swagger-ui.html)
./mvnw test                   # chạy unit test
./mvnw test -Dtest=ClassName  # chạy 1 test class

# Frontend (chạy trong frontend/)
npm run dev                   # dev server (port 5173)
npm run build                 # tsc -b && vite build
npm run lint                  # eslint
```

## Nguồn chân lý: `.kilocode/rules/`

Toàn bộ convention nằm ở đây — ĐỌC trước khi làm phần liên quan:

- [00-project-overview.md](.kilocode/rules/00-project-overview.md) — tech stack, modules, critical rules
- [01-coding-style.md](.kilocode/rules/01-coding-style.md) — naming, cấu trúc file, **Nguyên tắc viết logic ĐƠN GIẢN**
- [02-architecture.md](.kilocode/rules/02-architecture.md) — module communication, transaction, repository, cache, security
- [03-workflow.md](.kilocode/rules/03-workflow.md) — workflow code feature, cách giải thích, communication
- [04-testing.md](.kilocode/rules/04-testing.md) — chiến lược test (Mockito cho 4 critical component + manual test)

Spec sản phẩm chi tiết ở `docs/01..08`. Đọc doc liên quan trước khi implement feature.

## Quy tắc CỐT LÕI (không được vi phạm)

1. **Code đơn giản, dễ đọc > ngắn gọn / "thông minh"** — theo mục "Nguyên tắc viết logic ĐƠN GIẢN" trong `01-coding-style.md`. Ít state nhất có thể, dùng abstraction sẵn có (vd `async/await`), gộp nhánh làm cùng việc, tên theo ý định.
2. **KHÔNG over-engineer**: không Service interface (trừ `AiService`), không Mapper class (map inline trong service), không Specification (dùng `@Query` JPQL), không Domain Events (gọi service trực tiếp; `@Async` cho AI call lâu).
3. **LUÔN check ownership** trong service layer cho mọi user-owned resource (ưu tiên query kèm `userId`).
4. **KHÔNG thêm dependency** vào `pom.xml` / `package.json` mà chưa hỏi user.
5. **DB changes qua Flyway migration**, không sửa migration cũ. Soft delete cho users/cv_versions/applications.
6. **API response** luôn bọc `ApiResponse<T>`.
7. **KHÔNG bịa** API/method/version. Không chắc → nói "không chắc".
8. **KHÔNG refactor ngoài scope** — thấy issue không liên quan thì NÊU, không tự sửa.

## Cách làm việc với user

User là sinh viên IT (4 năm Java, 6 tháng React/Spring) — đang HỌC pattern của project pro. Vì vậy:

- **Code từng file một**, dừng cho user review trước khi sang file tiếp (theo sequence trong `03-workflow.md`).
- **Giải thích chi tiết sau mỗi file theo 4 phần**: (1) file làm gì · (2) pattern/concept lạ · (3) quyết định kỹ thuật + tại sao · (4) edge case. Dùng heading/bullet, không dump đoạn văn dài. Chi tiết format ở `03-workflow.md` mục 4.
- Pattern đã giải thích ở file/lượt trước → chỉ nhắc tên, không lặp định nghĩa.
- Hỏi cụ thể khi thiếu info quan trọng; default hợp lý cho chi tiết nhỏ.
- Trả lời bằng tiếng Việt.
