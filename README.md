# Job-tracker-AI

Web app giúp ứng viên (sinh viên IT, fresher) quản lý quá trình xin việc, có AI hỗ trợ phân tích match CV-JD và đề xuất cải thiện.

## Tech Stack

- **Backend**: Spring Boot 3.2+, Java 17
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **AI**: Gemini API (primary)
- **Email**: Gmail API
- **File Storage**: Cloudinary (production) hoặc local filesystem (dev)
- **Build**: Maven (backend), Vite (frontend)
- **Container**: Docker + Docker Compose

## Documentation Structure

### `docs/` - Feature & API specs
- `01-features.md` - Mô tả features chi tiết
- `02-database-schema.md` - Database design, migration strategy
- `03-api-contract.md` - REST API endpoints, request/response
- `04-ai-integration.md` - Prompt templates, AI service design
- `05-security.md` - Auth, validation, security rules
- `06-frontend-spec.md` - Frontend architecture, components
- `07-non-functional.md` - Performance, testing, deployment
- `08-user-stories.md` - User stories với acceptance criteria

### `.kilocode/rules/` - AI agent rules (tự load mỗi chat)
- `00-project-overview.md` - Tóm tắt project, code style philosophy
- `01-coding-style.md` - Java + TS conventions, code patterns
- `02-architecture.md` - Module rules, transaction, caching
- `03-workflow.md` - Cách AI agent làm việc với user
- `04-testing.md` - Testing strategy (Mockito + manual)

## Project Structure

```
Job-tracker-AI/
├── backend/                    # Spring Boot (com.jobtrackerai)
│   └── src/main/java/com/jobtrackerai/
│       ├── auth/
│       ├── user/
│       ├── cv/
│       ├── application/
│       ├── ai/
│       ├── email/
│       ├── notification/
│       ├── analytics/
│       └── shared/
├── frontend/                   # React + TS
│   └── src/
│       ├── features/
│       ├── components/
│       ├── lib/
│       └── hooks/
├── docs/                       # Specifications
├── .kilocode/rules/            # AI agent rules
└── docker-compose.yml
```

## Quick Start

### Prerequisites
- Java 17+
- Node 20+
- Maven 3.6+
- Docker + Docker Compose
- Google Cloud account (cho OAuth + Gmail API)
- Gemini API key

### Setup

```bash
# 1. Clone repo
git clone https://github.com/khanhduong290409/Job-tracker-AI.git
cd Job-tracker-AI

# 2. Setup environment
cp .env.example .env
# Fill in API keys: GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.

# 3. Start PostgreSQL + Redis với Docker
docker-compose up -d postgres redis

# 4. Run backend (terminal 1)
cd backend
./mvnw spring-boot:run
# → http://localhost:8080
# → Swagger: http://localhost:8080/swagger-ui.html

# 5. Run frontend (terminal 2)
cd frontend
npm install  # lần đầu
npm run dev
# → http://localhost:5173
```

## Code Style Philosophy

Project này dùng **style đơn giản, pragmatic**:

- Controller → Service (concrete, không interface) → Repository
- Mapping entity ↔ DTO inline trong service
- Filter query dùng JPQL `@Query`, KHÔNG dùng Specification pattern
- Module communication: gọi service trực tiếp
- Test: Mockito cho 4 critical components, manual test cho phần còn lại

Lý do: code rõ ràng, dễ đọc, dễ explain trong phỏng vấn. Không over-engineer.

Xem `.kilocode/rules/01-coding-style.md` cho code examples.

## Development Workflow

1. **Mỗi feature = 1 chat session với AI agent**
2. **AI agent đọc rules trong `.kilocode/rules/`** trước khi code
3. **AI agent đưa PLAN trước**, đợi user confirm rồi mới code
4. **Code từng file một**, dừng cho user review
5. **Manual test** sau mỗi feature (Postman + browser)
6. **Mockito test** cho 4 critical: AuthService, ApplicationStateMachine, AiService, Ownership

## Critical Logic Test Coverage

| Component | Tests | Why |
|-----------|-------|-----|
| AuthService | 3-4 | Security critical |
| ApplicationStateMachine | 5-6 | Business logic phức tạp |
| AiService | 3-4 | Logic phức tạp, AI có thể fail |
| Ownership check | 2-3 | Security critical |

Total: ~15 Mockito unit tests cho cả project.
