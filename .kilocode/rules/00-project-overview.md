# 00. Project Overview

## What is this?

**Job-tracker-AI** - web app giúp ứng viên (sinh viên IT, fresher) quản lý quá trình xin việc, dùng AI để phân tích match CV-JD và đề xuất cải thiện.

## Tech Stack

- **Backend**: Spring Boot 3.2+, Java 17, Maven
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **AI**: Google Gemini API (gemini-1.5-flash chủ yếu)
- **Email**: Gmail API
- **Auth**: Google OAuth + JWT (access + refresh token)
- **File**: Cloudinary (production) hoặc local (dev)
- **Deploy**: Docker Compose, Railway/Render

## Repo & Package

- GitHub repo: `Job-tracker-AI`
- Java package: `com.jobtrackerai`
- Folder structure root:
  ```
  Job-tracker-AI/
  ├── backend/       (Spring Boot)
  ├── frontend/      (React + TS)
  ├── docs/
  ├── .kilocode/rules/
  └── docker-compose.yml
  ```

## Architecture

**Modular Monolith** - 1 backend project chia thành modules theo domain. Mỗi module tự chứa controller / service / repository / entity / dto.

Modules:
- `auth` - Google OAuth, JWT, refresh token
- `user` - user profile, settings
- `cv` - CV upload, parsing, versioning
- `application` - job application CRUD, status machine
- `ai` - AI service (interface), prompt management, caching
- `email` - Gmail integration, templates
- `notification` - reminders, scheduled jobs, in-app notifications
- `analytics` - dashboard data aggregation
- `shared` - common DTOs, exceptions, utils

## Code Style (CRITICAL - đọc kỹ)

Project này dùng **style đơn giản, pragmatic**, KHÔNG over-engineer:

1. **Layer 2 tầng**: Controller → Service → Repository
   - **KHÔNG** có pattern `Service interface + ServiceImpl`
   - **CHỈ** có concrete `@Service class`
   - Ngoại lệ: `AiService` dùng interface (vì có thể swap provider)

2. **Mapping entity → DTO**: inline trong service
   - **KHÔNG** tạo Mapper class riêng (UserMapper, ApplicationMapper, ...)
   - Dùng `private` method trong service: `private ApplicationResponse toResponse(Application app) {...}`

3. **Query filter**: dùng `@Query` JPQL với optional params
   - **KHÔNG** dùng Specification pattern
   - **KHÔNG** dùng Querydsl

4. **Module communication**: gọi service trực tiếp qua dependency injection
   - **KHÔNG** dùng Domain Events / `ApplicationEventPublisher`
   - **NGOẠI LỆ**: dùng `@Async` cho các call AI lâu

5. **Test**: Mockito unit test cho 4 critical components, manual test cho phần còn lại
   - Chi tiết xem `04-testing.md`

6. **Caching**: dùng Spring Cache abstraction (`@Cacheable`, `@CacheEvict`)
   - **KHÔNG** custom cache logic phức tạp

## Critical Rules

1. **Mỗi resource thuộc về 1 user → LUÔN check ownership trong service layer**
2. **AI calls phải qua `AiService` interface, không gọi trực tiếp provider**
3. **AI calls phải cache với Redis (TTL theo loại analysis)**
4. **File upload phải validate size, MIME type, magic bytes**
5. **Database changes phải qua Flyway migration, không sửa migration cũ**
6. **Soft delete cho users, cv_versions, applications**
7. **API response format chuẩn: `ApiResponse<T>` wrapper**
8. **KHÔNG thêm dependency mới mà không hỏi user trước**
9. **Code đơn giản, dễ đọc - ưu tiên rõ ràng hơn ngắn gọn**

## Documentation

Khi cần tìm hiểu chi tiết:
- Features → `docs/01-features.md`
- Database → `docs/02-database-schema.md`
- API → `docs/03-api-contract.md`
- AI → `docs/04-ai-integration.md`
- Security → `docs/05-security.md`
- Frontend → `docs/06-frontend-spec.md`
- Performance/Testing/Deploy → `docs/07-non-functional.md`
- User stories → `docs/08-user-stories.md`

Khi implement feature, đọc relevant docs trước khi code.

## Communication Rules

User là sinh viên IT 4 năm kinh nghiệm java và 6 tháng kinh nghiệm react, spring. Khi làm việc:
- **Giải thích quyết định kỹ thuật ngắn gọn** (2-3 câu) cho mỗi file code
- **KHÔNG dùng pattern phức tạp** mà chưa giải thích
- **Hỏi nếu thiếu info quan trọng**, default hợp lý nếu là chi tiết nhỏ
- **KHÔNG bịa method/API/version** - nếu không chắc, nói "không chắc"
- **Code từng file một**, dừng để user review trước khi sang file tiếp
