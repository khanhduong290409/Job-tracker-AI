# 08. User Stories & Acceptance Criteria

Format: Given / When / Then. Each story có ID để reference từ commits, tests.

## Epic 1: Authentication

### US-AUTH-001: Sign in with Google
**As a** new user  
**I want to** sign in using my Google account  
**So that** I don't need to remember another password

**Acceptance Criteria:**
- Given I'm on the login page
- When I click "Sign in with Google"
- Then I'm redirected to Google OAuth
- And after granting permission, I'm redirected back to the app
- And I see the dashboard with my name and avatar
- And a user record is created in DB (if first time)

**Edge cases:**
- User cancels OAuth → stay on login page với message
- Google returns error → show error toast

### US-AUTH-002: Session management
**As a** logged-in user  
**I want** my session to persist  
**So that** I don't need to login every time I open the app

**Acceptance Criteria:**
- Given I'm logged in
- When I close the browser and reopen within 7 days
- Then I'm still logged in (refresh token valid)
- When refresh token expires
- Then I'm redirected to login page

### US-AUTH-003: Logout
- Given I'm logged in
- When I click "Logout" in user menu
- Then refresh token is revoked
- And I'm redirected to login page
- And I cannot access protected pages

---

## Epic 2: CV Management

### US-CV-001: Upload CV
**As a** user  
**I want to** upload my CV as PDF  
**So that** the system can analyze it for me

**Acceptance Criteria:**
- Given I'm on the CV page
- When I click "Upload CV" and select a PDF file ≤ 5MB
- Then file is uploaded
- And I see the CV listed với status "Processing"
- And after processing (async), status becomes "Completed"
- And I can see parsed data

**Edge cases:**
- File > 5MB → error message "File too large (max 5MB)"
- Non-PDF file → error "Only PDF allowed"
- Corrupt PDF → status becomes "Failed", show error message
- AI parse fails → status "Failed", offer re-parse option

### US-CV-002: View and edit parsed CV
- Given my CV is parsed
- When I open CV detail
- Then I see PDF preview và parsed structured data side by side
- And I can edit any field of parsed data
- When I save changes
- Then updated data is persisted

### US-CV-003: Multiple CV versions
- Given I have 1 CV uploaded
- When I upload another CV with different label
- Then both are listed
- And I can mark one as default
- When applying for a job, I can choose which CV version to use

### US-CV-004: Delete CV
- Given I have a CV
- When I click delete + confirm
- Then CV is soft-deleted
- And applications referencing it still show the CV info (preserved data)

---

## Epic 3: Application Management

### US-APP-001: Create application from JD text
- Given I'm on "New Application" page
- When I paste a Job Description text
- Then AI extracts company name, position, location, salary, requirements
- And I see preview of extracted data
- When I click "Continue", I can edit extracted fields
- When I select a CV version and click "Create"
- Then application is created with status "APPLIED"
- And AI analysis (CV-JD match + JD insight) starts in background

### US-APP-002: Create application from URL
- Given I'm on "New Application" page
- When I paste a job posting URL
- Then system fetches the page và extracts JD
- (If fetch fails, allow user to paste manually)
- Continue same as US-APP-001

### US-APP-003: List applications - List view
- Given I have applications
- When I open Applications page
- Then I see list with: company, position, status badge, applied date, source
- And I can filter by status (multi-select)
- And I can filter by source
- And I can filter by date range
- And I can search by company/position/JD content
- And I can sort by date or company name
- And pagination works (20 per page)

### US-APP-004: List applications - Kanban view
- Given I'm on Applications page
- When I switch to Kanban view
- Then I see columns: Saved, Applied, Phone Screen, Technical, Onsite, Offer, Closed
- And cards in each column
- When I drag a card to another column
- Then status updates (if transition is valid)
- (Invalid transition → snap back + show error)

### US-APP-005: Change application status
- Given I'm on application detail
- When I change status
- Then status updates only if transition is valid per state machine
- And a timeline event is recorded
- And I can add a note for the status change

### US-APP-006: Add timeline event
- Given I'm on application detail timeline tab
- When I click "Add event"
- Then I can choose event type và fill details
- After save, event appears in timeline

### US-APP-007: Attach file to application
- Given I'm on application detail
- When I upload a file (≤ 10MB)
- Then file is attached and listed
- And I can download or delete it later

---

## Epic 4: AI Analysis

### US-AI-001: View CV-JD match score
- Given an application was created with a CV version
- When AI analysis completes (≤ 15s typically)
- Then I see match score (0-100) with color coding (green/yellow/red)
- And I see strengths, gaps, and suggestions
- And I see matched/missing keywords

### US-AI-002: Re-run analysis
- Given an application has analysis
- When I update my CV or change CV version
- Then I can click "Re-analyze"
- And new analysis is generated (bypasses cache)

### US-AI-003: View JD insights
- Given an application is created
- When AI extracts JD insights
- Then I see required skills, nice-to-have, tech stack, experience level
- All as visual tags/badges

### US-AI-004: Interview prep
- Given application status is "Technical Interview"
- When I click "Generate Interview Prep"
- Then I see list of technical and behavioral questions
- And topics to review
- (Cached for 7 days)

### US-AI-005: Pattern analysis
- Given I have ≥ 10 applications with results (offer or reject)
- When I open Analytics > Pattern Analysis
- Then I see AI insight about my application patterns
- And actionable suggestions

---

## Epic 5: Email Integration

### US-EMAIL-001: Connect Gmail
- Given I haven't connected Gmail
- When I click "Connect Gmail" in settings
- Then I'm redirected to Google OAuth với gmail scopes
- After granting, refresh token is stored
- And I see "Connected" status

### US-EMAIL-002: Auto-link emails to applications
- Given Gmail is connected
- When new emails arrive (synced every 15 min)
- Then system matches sender domain với company domains of my applications
- And links email thread to matched application
- And I see email count badge on application

### US-EMAIL-003: Generate email draft
- Given I'm on application detail
- When I click "Compose follow-up email"
- Then I choose a template (e.g., FOLLOW_UP_AFTER_APPLY)
- And AI generates personalized draft based on context
- And I can edit before sending

### US-EMAIL-004: Send email
- Given I have a draft email
- When I click "Send"
- Then email is sent from my Gmail
- And recorded in email_messages table
- (Or schedule for later → save as scheduled)

### US-EMAIL-005: View email thread
- Given application has linked emails
- When I open Emails tab
- Then I see threads chronologically
- And I can expand to read full conversation

---

## Epic 6: Reminders & Notifications

### US-NOTIF-001: Receive follow-up reminder
- Given I applied 7 days ago và status is still APPLIED
- When scheduled job runs
- Then reminder is created
- And I see notification badge
- When I click notification, I navigate to application

### US-NOTIF-002: Interview reminder
- Given I have an interview scheduled (timeline event)
- When 1 day before và 1 hour before
- Then reminder notification is created
- (If email enabled, also send email)

### US-NOTIF-003: Custom reminder
- Given I'm on application detail
- When I click "Add Reminder"
- Then I can set date/time và description
- At scheduled time, notification fires

### US-NOTIF-004: Manage notifications
- Given I have notifications
- When I click bell icon
- Then I see dropdown với recent notifications
- And I can mark as read individually or all
- And I can navigate to related resource

### US-NOTIF-005: Notification preferences
- Given I'm in Settings
- When I toggle notification types (in-app, email)
- Then preferences are saved
- And future notifications respect preferences

---

## Epic 7: Analytics

### US-ANALYTICS-001: View overview
- Given I have applications
- When I open Dashboard
- Then I see: total apps, active, offers, avg response time
- And comparison with last month

### US-ANALYTICS-002: View funnel
- Given applications across various statuses
- When I view funnel chart
- Then I see conversion rate at each stage
- (% from previous stage)

### US-ANALYTICS-003: Time series
- Given applications over time
- When I view time series chart
- Then I see applications per week (or month)
- And can change date range

### US-ANALYTICS-004: Source analysis
- Given applications from different sources
- When I view sources chart
- Then I see count + conversion rate per source

### US-ANALYTICS-005: Tech stack demand
- Given applications with parsed JDs
- When I view tech stack chart
- Then I see top 20 required skills
- And whether I have each skill (based on default CV)

### US-ANALYTICS-006: Activity heatmap
- Given activity over time (applies, interviews, follow-ups)
- When I view heatmap
- Then I see GitHub-style heatmap of activity per day

---

## Epic 8: Settings

### US-SETTINGS-001: Update profile
- Given I'm in Settings > Profile
- When I update name or avatar
- Then changes are saved

### US-SETTINGS-002: Manage email templates
- Given I'm in Settings > Email Templates
- When I see list of system + custom templates
- I can create/edit/delete custom templates

### US-SETTINGS-003: Delete account
- Given I want to leave
- When I click "Delete Account" và confirm with email
- Then all my data is deleted (or anonymized)
- And I'm logged out

---

## Out-of-Scope (V1)

For clarity, these are explicitly NOT in scope:
- Multi-user collaboration / team accounts
- Mobile native app
- Job recommendations (suggesting jobs to apply)
- Resume builder
- Direct job board integration (auto-import)
- Payment / premium tier
- Admin panel
- Multi-language UI (English only V1)
