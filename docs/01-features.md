# 01. Features Specification

## 1. CV Management

### 1.1 Upload CV
- User upload file PDF (max 5MB)
- Hệ thống lưu file vào storage (Cloudinary hoặc local)
- Trigger async job: parse PDF + AI extract structured data
- Return ngay CV ID, status = PROCESSING
- User có thể poll hoặc nhận update qua WebSocket khi parse xong

### 1.2 CV Parsing
- Apache PDFBox extract raw text từ PDF
- Gọi AI (Gemini) để extract structured JSON:
  - Personal info: fullName, email, phone, address, links (github, linkedin, portfolio)
  - Education: list { school, degree, major, startDate, endDate, gpa, achievements }
  - Experience: list { company, position, startDate, endDate, description, technologies }
  - Skills: list { category, items[] } (vd: { "Programming Languages": ["Java", "Python"] })
  - Projects: list { name, description, technologies, role, link }
  - Certifications: list { name, issuer, date }
  - Languages: list { language, level }

### 1.3 CV Versions
- User có thể có nhiều CV versions với label (vd: "Backend CV", "Fullstack CV")
- Đánh dấu 1 version làm default
- User edit lại parsed data nếu AI sai
- Soft delete CV (giữ cho applications cũ vẫn reference được)

### 1.4 CV Preview
- Render parsed data thành formatted view
- Show original PDF (embedded viewer)

---

## 2. Job Application Management

### 2.1 Create Application
- 3 cách tạo:
  - Paste URL job posting → AI fetch + extract (nếu fetch được)
  - Paste JD text → AI extract structured data
  - Manual input tất cả fields

- Fields:
  - companyName (required)
  - position (required)
  - location (optional)
  - workType: ONSITE | HYBRID | REMOTE
  - employmentType: INTERN | FULLTIME | PARTTIME | CONTRACT
  - salaryMin, salaryMax, salaryCurrency (optional)
  - jdContent (required, raw text)
  - jdUrl (optional)
  - source: enum (LINKEDIN, ITVIEC, TOPCV, COMPANY_WEBSITE, REFERRAL, OTHER)
  - sourceDetail (string, free text nếu OTHER)
  - appliedDate
  - cvVersionId (FK)
  - contactPerson: { name, email, role } (optional)
  - notes (rich text)

### 2.2 Status Pipeline
States (enum):
- `SAVED` - đã lưu nhưng chưa apply
- `APPLIED` - đã submit
- `PHONE_SCREEN` - đang vòng screen
- `TECHNICAL_INTERVIEW` - đang vòng technical
- `ONSITE` - vòng onsite/final
- `OFFER` - đã nhận offer
- `ACCEPTED` - chấp nhận offer
- `REJECTED` - bị reject
- `WITHDRAWN` - tự rút

State machine rules:
- SAVED chỉ chuyển sang APPLIED hoặc WITHDRAWN
- APPLIED có thể chuyển sang PHONE_SCREEN, TECHNICAL_INTERVIEW, REJECTED, WITHDRAWN
- Từ interview states có thể chuyển back và forth, hoặc lên OFFER hoặc REJECTED
- OFFER chỉ chuyển sang ACCEPTED, REJECTED, WITHDRAWN
- ACCEPTED/REJECTED/WITHDRAWN là terminal states (không chuyển nữa)

### 2.3 Timeline Events
- Tự động log mỗi khi status thay đổi
- User có thể thêm manual events: { type, date, note }
  - Event types: STATUS_CHANGE, INTERVIEW_SCHEDULED, FOLLOW_UP_SENT, NOTE_ADDED, TAKE_HOME_RECEIVED, TAKE_HOME_SUBMITTED

### 2.4 File Attachments
- Upload nhiều file per application
- Types: CV_USED, COVER_LETTER, TAKE_HOME_TEST, OTHER
- Max 10MB per file
- Allowed: PDF, DOC, DOCX, ZIP

### 2.5 Views
- **List view**: table với filter (status, source, date range), sort, search
- **Kanban view**: drag-drop giữa status columns
- **Detail view**: full info + timeline + AI analysis + email threads + files

---

## 3. AI Analysis Features

### 3.1 CV-JD Match Score
Trigger: tự động chạy khi tạo application + có cvVersionId

Input cho AI:
- CV parsed JSON
- JD content

Output JSON:
```json
{
  "matchScore": 75,
  "strengths": [
    "Strong match: Java, Spring Boot listed in both CV and JD",
    "..."
  ],
  "gaps": [
    "JD requires Kubernetes, not in CV",
    "..."
  ],
  "suggestions": [
    "Add more details about microservices experience",
    "..."
  ],
  "matchedKeywords": ["Java", "Spring Boot", "REST API"],
  "missingKeywords": ["Kubernetes", "AWS"]
}
```

Cache: hash(cv_content + jd_content) → kết quả, TTL 30 ngày

### 3.2 JD Insight Extraction
Tự động chạy khi tạo application

Output JSON:
```json
{
  "requiredSkills": [
    {"skill": "Java", "level": "PROFICIENT", "yearsRequired": 2}
  ],
  "niceToHaveSkills": [...],
  "experienceLevel": "JUNIOR | MID | SENIOR",
  "yearsOfExperience": "1-3",
  "education": "Bachelor's degree in Computer Science",
  "softSkills": ["communication", "teamwork"],
  "responsibilities": ["..."],
  "techStack": {
    "languages": ["Java"],
    "frameworks": ["Spring Boot"],
    "databases": ["PostgreSQL"],
    "tools": ["Docker", "Git"]
  }
}
```

### 3.3 Pattern Analysis (Aggregate Insight)
Trigger: manual hoặc weekly cron

Khi user có ≥10 applications với kết quả (offer/reject):
- AI phân tích pattern các job được/không được nhận
- Output: textual insight + actionable suggestions

### 3.4 Interview Prep
Trigger: khi status chuyển sang TECHNICAL_INTERVIEW

Output:
- 10-15 câu hỏi technical possible (based on JD)
- 5 câu hỏi behavioral
- Suggested topics to review

### 3.5 Mock Interview Chatbot (optional, advanced)
- Chat-based interface
- AI đóng vai interviewer, hỏi câu hỏi từ list ở 3.4
- User trả lời text
- AI cho feedback sau mỗi câu

---

## 4. Email Integration (Gmail API)

### 4.1 OAuth Authorization
- Scope: `gmail.readonly`, `gmail.send`, `gmail.modify`
- Incremental authorization (không yêu cầu hết scope lúc login)
- Store refresh_token encrypted trong DB

### 4.2 Email Sync
- Poll Gmail mỗi 15 phút (Spring Scheduler)
- Hoặc dùng Gmail Push Notification qua Pub/Sub (advanced)
- Match email với application qua:
  - Domain của sender match với companyDomain (extract từ companyName)
  - Subject chứa position name
  - User confirm manual nếu uncertain

### 4.3 Email Templates
Pre-defined templates:
- `FOLLOW_UP_AFTER_APPLY` - 7 ngày sau apply
- `FOLLOW_UP_AFTER_INTERVIEW` - 2 ngày sau interview
- `THANK_YOU_AFTER_INTERVIEW` - ngay sau interview
- `OFFER_ACCEPT`
- `OFFER_DECLINE`
- `WITHDRAW_APPLICATION`

Template với variables: `{{companyName}}`, `{{position}}`, `{{interviewerName}}`, `{{daysSinceApply}}`

### 4.4 AI Email Suggestion
- User chọn template + AI customize dựa trên application context
- User edit final text trước khi send

### 4.5 Send Email
- Send qua Gmail API (giả lập gửi từ chính email user)
- Track sent emails, link với application
- Schedule send (gửi sau X giờ/ngày)

---

## 5. Reminders & Notifications

### 5.1 Reminder Types
- `FOLLOW_UP_AFTER_APPLY` - 7 ngày sau apply, nếu status vẫn APPLIED
- `INTERVIEW_REMINDER` - 1 ngày trước + 1 giờ trước interview
- `TAKE_HOME_DEADLINE` - 1 ngày trước deadline
- `STATUS_STALE` - 14 ngày không update status
- `CUSTOM` - user tự tạo

### 5.2 Notification Channels
- In-app notification (badge + dropdown)
- Email notification (gửi qua chính Gmail của app)
- Browser push (optional, advanced)

### 5.3 Scheduled Jobs
- Daily 8AM: check reminders due today
- Hourly: check urgent reminders (interview trong 1h)
- Weekly Sunday: send weekly summary email

---

## 6. Analytics Dashboard

### 6.1 Overview Cards
- Total applications
- Active (not in terminal state)
- Offer rate (offers / applied)
- Average response time

### 6.2 Funnel Chart
APPLIED → PHONE_SCREEN → TECHNICAL_INTERVIEW → ONSITE → OFFER
Show count + conversion rate giữa các stage

### 6.3 Time Series
- Applications per week (line chart)
- Response time trend

### 6.4 Source Analysis
- Bar chart: applications per source
- Conversion rate per source

### 6.5 Tech Stack Demand
- Aggregate tech requirements từ all JDs
- Word cloud hoặc bar chart top 20
- Highlight tech bạn có vs không có (compare với default CV)

### 6.6 Activity Heatmap
- Heatmap dạng GitHub contributions: ngày nào có activity (apply, interview, follow-up)

---

## 7. Authentication & Authorization

### 7.1 Sign Up / Sign In
- Google OAuth only (no password) - đơn giản và secure
- Tạo user record lần đầu login
- JWT access token (15 min) + refresh token (7 days)

### 7.2 Profile Management
- Update name, avatar
- Connect/disconnect Gmail integration
- Notification preferences
- Delete account (GDPR-compliant)

### 7.3 Authorization
- Single-tenant per user: user chỉ thấy data của mình
- Không có role-based access (chưa cần admin)
