# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này. Đọc kỹ trước khi code.

## Project

**Job-tracker-AI** — web app giúp ứng viên IT quản lý quá trình xin việc, dùng AI phân tích match CV–JD.

- **Backend**: Spring Boot 3.2+, Java 17, Maven, PostgreSQL 15, Redis 7, package `com.jobtrackerai` (modular monolith)
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS, React Query, Zustand, React Hook Form + Zod, axios
- **AI**: Google Gemini API · **Auth**: Google OAuth + JWT

Cấu trúc: `backend/` (Spring Boot) · `frontend/` (React+TS) · `docs/` (spec) · `.kilocode/rules/` (rule chi tiết)

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
