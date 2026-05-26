# 02. Database Schema

## Conventions

- Table names: snake_case, plural (`users`, `applications`)
- Column names: snake_case (`created_at`, `user_id`)
- Primary key: `id` BIGSERIAL (auto-increment)
- Foreign key: `<entity>_id` (vd: `user_id`, `cv_version_id`)
- Timestamps: `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)
- Soft delete: `deleted_at` TIMESTAMP nullable
- Enums: lưu dạng VARCHAR với CHECK constraint, hoặc PostgreSQL ENUM type
- JSON data: dùng JSONB (faster query than JSON)

## Migration Strategy

- Tool: **Flyway**
- Location: `backend/src/main/resources/db/migration/`
- Naming: `V{version}__{description}.sql`
- Examples:
  - `V1__create_users_table.sql`
  - `V2__create_cv_versions_table.sql`
  - `V3__add_avatar_url_to_users.sql`
- **NEVER modify existing migration files** - create new ones
- Each migration is atomic (use transactions)

## Schema

### users
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    google_id VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    gmail_refresh_token TEXT, -- encrypted
    gmail_connected_at TIMESTAMP WITH TIME ZONE,
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_google_id ON users(google_id) WHERE deleted_at IS NULL;
```

### cv_versions
```sql
CREATE TABLE cv_versions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    raw_text TEXT,
    parsed_data JSONB,
    parse_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING, PROCESSING, COMPLETED, FAILED
    parse_error TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_parse_status CHECK (parse_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX idx_cv_versions_user ON cv_versions(user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_cv_versions_default ON cv_versions(user_id) 
    WHERE is_default = TRUE AND deleted_at IS NULL;
```

### applications
```sql
CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_version_id BIGINT REFERENCES cv_versions(id) ON DELETE SET NULL,
    company_name VARCHAR(255) NOT NULL,
    company_domain VARCHAR(255), -- extracted, dùng cho email matching
    position VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    work_type VARCHAR(20), -- ONSITE, HYBRID, REMOTE
    employment_type VARCHAR(20), -- INTERN, FULLTIME, PARTTIME, CONTRACT
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(10),
    jd_content TEXT NOT NULL,
    jd_url VARCHAR(500),
    source VARCHAR(30) NOT NULL,
    source_detail VARCHAR(255),
    applied_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'SAVED',
    contact_person JSONB, -- { name, email, role }
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_status CHECK (status IN (
        'SAVED', 'APPLIED', 'PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 
        'ONSITE', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'
    )),
    CONSTRAINT chk_work_type CHECK (work_type IN ('ONSITE', 'HYBRID', 'REMOTE')),
    CONSTRAINT chk_employment_type CHECK (employment_type IN ('INTERN', 'FULLTIME', 'PARTTIME', 'CONTRACT'))
);

CREATE INDEX idx_applications_user ON applications(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_status ON applications(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_applied_date ON applications(user_id, applied_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_company_domain ON applications(company_domain) WHERE deleted_at IS NULL;
-- Full-text search index
CREATE INDEX idx_applications_fts ON applications USING GIN (
    to_tsvector('english', company_name || ' ' || position || ' ' || COALESCE(jd_content, ''))
);
```

### application_status_history
```sql
CREATE TABLE application_status_history (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    note TEXT,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_application ON application_status_history(application_id, changed_at DESC);
```

### application_timeline_events
```sql
CREATE TABLE application_timeline_events (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    -- STATUS_CHANGE, INTERVIEW_SCHEDULED, FOLLOW_UP_SENT, NOTE_ADDED, TAKE_HOME_RECEIVED, TAKE_HOME_SUBMITTED
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    metadata JSONB, -- flexible field for event-specific data
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timeline_application ON application_timeline_events(application_id, event_date DESC);
```

### application_files
```sql
CREATE TABLE application_files (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    file_type VARCHAR(30) NOT NULL,
    -- CV_USED, COVER_LETTER, TAKE_HOME_TEST, OTHER
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_application ON application_files(application_id);
```

### ai_analyses
```sql
CREATE TABLE ai_analyses (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    analysis_type VARCHAR(30) NOT NULL,
    -- CV_JD_MATCH, JD_INSIGHT, INTERVIEW_PREP, PATTERN_ANALYSIS
    input_hash VARCHAR(64) NOT NULL, -- SHA-256 hash để cache
    result JSONB NOT NULL,
    model_used VARCHAR(50),
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analyses_application ON ai_analyses(application_id, analysis_type);
CREATE INDEX idx_analyses_hash ON ai_analyses(input_hash);
```

### email_threads
```sql
CREATE TABLE email_threads (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id BIGINT REFERENCES applications(id) ON DELETE SET NULL,
    gmail_thread_id VARCHAR(100) NOT NULL,
    subject VARCHAR(500),
    from_email VARCHAR(255),
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 1,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_gmail_thread UNIQUE(user_id, gmail_thread_id)
);

CREATE INDEX idx_threads_application ON email_threads(application_id);
CREATE INDEX idx_threads_user_recent ON email_threads(user_id, last_message_at DESC);
```

### email_messages
```sql
CREATE TABLE email_messages (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    gmail_message_id VARCHAR(100) NOT NULL UNIQUE,
    from_email VARCHAR(255),
    to_emails TEXT, -- comma separated
    subject VARCHAR(500),
    body_text TEXT,
    body_html TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    is_from_user BOOLEAN DEFAULT FALSE, -- true nếu user gửi
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_thread ON email_messages(thread_id, sent_at DESC);
```

### email_templates
```sql
CREATE TABLE email_templates (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_key VARCHAR(50) NOT NULL,
    -- FOLLOW_UP_AFTER_APPLY, FOLLOW_UP_AFTER_INTERVIEW, etc.
    subject_template VARCHAR(500) NOT NULL,
    body_template TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE, -- system-provided template
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_user ON email_templates(user_id);
```

### reminders
```sql
CREATE TABLE reminders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id BIGINT REFERENCES applications(id) ON DELETE CASCADE,
    reminder_type VARCHAR(30) NOT NULL,
    -- FOLLOW_UP_AFTER_APPLY, INTERVIEW_REMINDER, TAKE_HOME_DEADLINE, STATUS_STALE, CUSTOM
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    channels JSONB DEFAULT '["IN_APP"]', -- ["IN_APP", "EMAIL", "PUSH"]
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminders_due ON reminders(scheduled_at) 
    WHERE sent_at IS NULL AND is_dismissed = FALSE;
CREATE INDEX idx_reminders_user ON reminders(user_id, scheduled_at DESC);
```

### notifications
```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) 
    WHERE is_read = FALSE;
```

### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE, -- store hash, not raw token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked = FALSE;
```

## Entity Relationships

```
users (1) ----< (N) cv_versions
users (1) ----< (N) applications
users (1) ----< (N) email_threads
users (1) ----< (N) email_templates
users (1) ----< (N) reminders
users (1) ----< (N) notifications
users (1) ----< (N) refresh_tokens

cv_versions (1) ----< (N) applications

applications (1) ----< (N) application_status_history
applications (1) ----< (N) application_timeline_events
applications (1) ----< (N) application_files
applications (1) ----< (N) ai_analyses
applications (1) ----< (N) email_threads
applications (1) ----< (N) reminders

email_threads (1) ----< (N) email_messages
```

## Index Strategy

Indexes được thiết kế để optimize:
1. List applications của 1 user (idx_applications_user + status)
2. Sort by applied_date DESC (idx_applications_applied_date)
3. Email matching qua company_domain (idx_applications_company_domain)
4. Full-text search trên company/position/JD (idx_applications_fts)
5. Reminders due (partial index where sent_at IS NULL)
6. Unread notifications (partial index where is_read = FALSE)

## Soft Delete Policy

- `users`, `cv_versions`, `applications` dùng soft delete (`deleted_at`)
- Các bảng còn lại dùng hard delete (CASCADE từ parent)
- Query luôn filter `WHERE deleted_at IS NULL` cho soft-delete tables
- JPA: dùng `@SQLDelete` và `@Where` annotations
