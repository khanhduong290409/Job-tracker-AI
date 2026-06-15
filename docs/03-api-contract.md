# 03. API Contract

## Base URL
- Dev: `http://localhost:8080/api/v1`
- Prod: `https://api.jobtracker.com/api/v1`

## Authentication
- Bearer token trong header: `Authorization: Bearer <access_token>`
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Token missing or invalid |
| `TOKEN_EXPIRED` | 401 | Access token expired, use refresh |
| `FORBIDDEN` | 403 | No permission for resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_STATE_TRANSITION` | 400 | Cannot transition application status |
| `FILE_TOO_LARGE` | 413 | File exceeds max size |
| `UNSUPPORTED_FILE_TYPE` | 415 | File type not allowed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AI_SERVICE_ERROR` | 503 | AI provider error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoints

### Authentication

#### `POST /auth/google`
Login với Google OAuth code (frontend lấy code từ Google).

Request:
```json
{
  "code": "google_auth_code",
  "redirectUri": "http://localhost:5173/auth/callback"
}
```

Response 200:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": 1,
      "email": "user@gmail.com",
      "fullName": "Nguyen Van A",
      "avatarUrl": "https://..."
    }
  }
}
```

#### `POST /auth/refresh`
Lấy access token mới từ refresh token.

Request:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

Response 200: tương tự `/auth/google`

#### `POST /auth/logout`
Revoke refresh token.

Headers: `Authorization: Bearer <access_token>`

Request:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

Response 204 No Content

#### `GET /auth/me`
Get current user info.

Response 200:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@gmail.com",
    "fullName": "Nguyen Van A",
    "avatarUrl": "https://...",
    "gmailConnected": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

---

### CV Management

#### `POST /cvs`
Upload CV PDF.

Headers: `Content-Type: multipart/form-data`

Request:
```
file: <PDF file>
label: "Backend CV"
setAsDefault: true (optional)
```

Response 201:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "label": "Backend CV",
    "fileName": "nguyen-van-a-cv.pdf",
    "fileUrl": "https://...",
    "parseStatus": "PROCESSING",
    "isDefault": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

#### `GET /cvs`
List user's CVs.

Query params: none

Response 200:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "label": "Backend CV",
      "fileName": "...",
      "parseStatus": "COMPLETED",
      "isDefault": true,
      "createdAt": "..."
    }
  ]
}
```

#### `GET /cvs/{id}`
Get CV detail với parsed data.

Response 200:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "label": "Backend CV",
    "fileName": "...",
    "fileUrl": "...",
    "parseStatus": "COMPLETED",
    "parsedData": {
      "personalInfo": {...},
      "education": [...],
      "experience": [...],
      "skills": [...],
      "projects": [...]
    },
    "isDefault": true,
    "createdAt": "..."
  }
}
```

#### `PATCH /cvs/{id}`
Update CV (label, parsed data, set as default).

Request:
```json
{
  "label": "Updated label",
  "parsedData": { ... },
  "isDefault": true
}
```

Response 200: CV object

#### `DELETE /cvs/{id}`
Soft delete CV.

Response 204

#### `POST /cvs/{id}/reparse`
Trigger re-parse CV (vd: nếu lần đầu fail).

Response 202 Accepted

---

### Job Applications

#### `POST /applications`
Create application.

Request:
```json
{
  "companyName": "Tech Corp",
  "position": "Backend Intern",
  "location": "Ho Chi Minh",
  "workType": "HYBRID",
  "employmentType": "INTERN",
  "salaryMin": 5000000,
  "salaryMax": 8000000,
  "salaryCurrency": "VND",
  "jdContent": "...",
  "jdUrl": "https://...",
  "source": "ITVIEC",
  "appliedDate": "2025-01-15",
  "cvVersionId": 1,
  "contactPerson": {
    "name": "HR Name",
    "email": "hr@techcorp.com",
    "role": "HR Manager"
  },
  "notes": "Referred by friend"
}
```

Response 201:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "APPLIED",
    "aiAnalysisStatus": "PROCESSING",
    ...
  }
}
```

#### `POST /applications/parse-jd`
AI parse JD text → structured data (for preview before save).

Request:
```json
{
  "jdContent": "We are looking for...",
  "jdUrl": "https://..." (optional)
}
```

Response 200:
```json
{
  "success": true,
  "data": {
    "extractedFields": {
      "companyName": "Tech Corp",
      "position": "Backend Developer",
      "location": "Ho Chi Minh",
      "salaryRange": "10-15M VND",
      ...
    },
    "jdInsight": { ... }
  }
}
```

#### `GET /applications`
List applications.

Query params:
- `statuses`: filter by status (can be multiple: `?statuses=APPLIED&statuses=PHONE_SCREEN`)
- `source`: filter by source
- `search`: search in company/position/JD (full-text)
- `dateFrom`, `dateTo`: applied date range
- `sortBy`: `appliedDate`, `createdAt`, `companyName` (default: `createdAt`)
- `sortDir`: `asc`, `desc` (default: `desc`)
- `page`: default 0
- `size`: default 20, max 100

Response 200: paginated list

#### `GET /applications/{id}`
Get application detail (include status history, timeline, files, latest AI analysis).

Response 200:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "companyName": "...",
    "position": "...",
    "status": "TECHNICAL_INTERVIEW",
    "cvVersion": {...},
    "statusHistory": [...],
    "timelineEvents": [...],
    "files": [...],
    "aiAnalysis": {
      "cvJdMatch": {...},
      "jdInsight": {...}
    },
    "emailThreadCount": 3,
    ...
  }
}
```

#### `PATCH /applications/{id}`
Update application fields (NOT status - use separate endpoint).

#### `PUT /applications/{id}/status`
Change status (validated against state machine).

Request:
```json
{
  "newStatus": "TECHNICAL_INTERVIEW",
  "note": "Scheduled for next Monday"
}
```

Response 200: updated application

#### `DELETE /applications/{id}`
Soft delete.

#### `POST /applications/{id}/files`
Upload file attachment.

Multipart form:
```
file: <file>
fileType: CV_USED | COVER_LETTER | TAKE_HOME_TEST | OTHER
```

Response 201: file object

#### `DELETE /applications/{id}/files/{fileId}`
Delete file.

#### `POST /applications/{id}/timeline-events`
Add manual timeline event.

Request:
```json
{
  "eventType": "INTERVIEW_SCHEDULED",
  "eventDate": "2025-01-20T14:00:00Z",
  "title": "Technical Interview with Tech Lead",
  "description": "Focus on Java and Spring Boot"
}
```

---

### AI Analysis

#### `POST /applications/{id}/analyze`
Trigger AI analysis (CV-JD match + JD insight).

Request:
```json
{
  "analysisTypes": ["CV_JD_MATCH", "JD_INSIGHT"],
  "force": false  // true để bypass cache
}
```

Response 202 Accepted:
```json
{
  "success": true,
  "data": {
    "jobIds": ["analysis_job_1", "analysis_job_2"]
  }
}
```

#### `GET /applications/{id}/analysis`
Get all AI analyses của application.

Response 200:
```json
{
  "success": true,
  "data": {
    "cvJdMatch": {
      "matchScore": 75,
      "strengths": [...],
      "gaps": [...],
      "suggestions": [...],
      "createdAt": "..."
    },
    "jdInsight": { ... },
    "interviewPrep": null
  }
}
```

#### `POST /applications/{id}/interview-prep`
Generate interview prep questions.

Response 200: list of questions + topics

#### `GET /insights/pattern-analysis`
Get aggregate pattern analysis (requires ≥10 applications with results).

Response 200:
```json
{
  "success": true,
  "data": {
    "successPatterns": [...],
    "rejectionPatterns": [...],
    "actionableSuggestions": [...],
    "lastUpdated": "..."
  }
}
```

---

### Email Integration

#### `GET /email/auth-url`
Get Gmail OAuth URL.

Response 200:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/..."
  }
}
```

#### `POST /email/connect`
Complete Gmail OAuth.

Request:
```json
{
  "code": "google_auth_code"
}
```

#### `DELETE /email/disconnect`
Disconnect Gmail.

#### `POST /email/sync`
Manually trigger email sync.

#### `GET /applications/{id}/emails`
Get email threads của application.

Response 200: list of threads với messages

#### `GET /email/templates`
List user's email templates.

#### `POST /email/templates`
Create custom template.

#### `POST /applications/{id}/emails/draft`
Generate AI email draft.

Request:
```json
{
  "templateKey": "FOLLOW_UP_AFTER_APPLY",
  "customInstructions": "Mention my recent project"
}
```

Response 200:
```json
{
  "success": true,
  "data": {
    "subject": "...",
    "body": "...",
    "to": "hr@techcorp.com"
  }
}
```

#### `POST /applications/{id}/emails/send`
Send email.

Request:
```json
{
  "to": "hr@techcorp.com",
  "subject": "...",
  "body": "...",
  "scheduledAt": "2025-01-20T09:00:00Z" // optional, immediate if null
}
```

---

### Reminders

#### `GET /reminders`
List reminders.

Query: `status` (PENDING, SENT, DISMISSED), `upcoming` (true/false)

#### `POST /reminders`
Create custom reminder.

#### `PUT /reminders/{id}/dismiss`
Dismiss reminder.

#### `DELETE /reminders/{id}`

---

### Notifications

#### `GET /notifications`
List notifications.

Query: `unreadOnly` (default false), pagination

#### `PUT /notifications/{id}/read`
Mark as read.

#### `PUT /notifications/read-all`
Mark all as read.

---

### Analytics

#### `GET /analytics/overview`
Response 200:
```json
{
  "success": true,
  "data": {
    "totalApplications": 25,
    "activeApplications": 8,
    "totalOffers": 2,
    "offerRate": 0.08,
    "avgResponseTimeDays": 5.2,
    "comparedToLastMonth": {
      "applications": "+15%",
      "offers": "+1"
    }
  }
}
```

#### `GET /analytics/funnel`
Response 200:
```json
{
  "success": true,
  "data": {
    "stages": [
      { "stage": "APPLIED", "count": 25, "conversionRate": 1.0 },
      { "stage": "PHONE_SCREEN", "count": 12, "conversionRate": 0.48 },
      { "stage": "TECHNICAL_INTERVIEW", "count": 8, "conversionRate": 0.67 },
      { "stage": "ONSITE", "count": 4, "conversionRate": 0.5 },
      { "stage": "OFFER", "count": 2, "conversionRate": 0.5 }
    ]
  }
}
```

#### `GET /analytics/time-series`
Query: `metric` (applications, interviews), `interval` (day, week, month), `from`, `to`

#### `GET /analytics/sources`
Conversion rate by source.

#### `GET /analytics/tech-stack`
Tech stack demand from JDs.

Response 200:
```json
{
  "success": true,
  "data": {
    "topSkills": [
      { "skill": "Java", "count": 18, "userHasSkill": true },
      { "skill": "Kubernetes", "count": 12, "userHasSkill": false }
    ]
  }
}
```

#### `GET /analytics/activity`
Heatmap data.

---

### WebSocket Endpoints (Optional)

#### `WS /ws/notifications`
Subscribe to notifications.

#### `WS /ws/cv-parse/{cvId}`
Subscribe to CV parse progress.

#### `WS /ws/analysis/{applicationId}`
Subscribe to AI analysis progress.

---

## Rate Limiting

- Authentication endpoints: 10 requests/minute per IP
- AI endpoints (analyze, parse-jd, draft email): 20 requests/hour per user
- File upload: 10 requests/hour per user
- Other endpoints: 100 requests/minute per user

Headers in response:
- `X-RateLimit-Limit`: max requests
- `X-RateLimit-Remaining`: remaining
- `X-RateLimit-Reset`: timestamp (epoch seconds)
