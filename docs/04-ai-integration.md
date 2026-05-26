# 04. AI Integration

## Provider Strategy

- **Primary**: Google Gemini (gemini-1.5-flash for fast tasks, gemini-1.5-pro for complex)
- **Backup**: Grok API (re-use experience từ project 1)
- **Architecture**: Abstract behind `AiService` interface để dễ swap

## AiService Interface (Java)

```java
public interface AiService {
    <T> AiResponse<T> generate(AiPrompt prompt, Class<T> responseType);
    AiResponse<String> generateText(AiPrompt prompt);
    boolean isHealthy();
    String getProviderName();
}

public class AiPrompt {
    private String systemPrompt;
    private String userPrompt;
    private double temperature; // 0.0 - 1.0
    private int maxTokens;
    private boolean jsonMode; // force JSON response
}

public class AiResponse<T> {
    private T data;
    private String rawResponse;
    private int tokensUsed;
    private String modelUsed;
    private Duration latency;
}
```

## Caching Strategy

### Cache Key Generation
```java
String cacheKey = String.format("ai:%s:%s", 
    analysisType, 
    sha256(input).substring(0, 16)
);
```

### TTL
- CV parse: 90 days (CV rarely changes)
- CV-JD match: 30 days
- JD insight: 30 days
- Interview prep: 7 days
- Pattern analysis: 1 day

### Cache Storage
- Redis với prefix `ai:` 
- Also persist to `ai_analyses` table (long-term, audit)
- Lookup order: Redis → DB → AI provider

## Retry & Error Handling

```java
@Retryable(
    value = { AiTransientException.class },
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
```

- Retry 3 lần với exponential backoff (1s, 2s, 4s)
- Distinguish transient vs permanent errors
- Permanent: invalid API key, malformed prompt → don't retry
- Transient: rate limit, network, 5xx → retry
- After max retries: fail gracefully, return cached result if available, else error

## Rate Limiting (User-Level)

- AI analysis: 20 calls/hour/user
- Stored in Redis with sliding window
- Return 429 with `Retry-After` header when exceeded

## JSON Response Handling

### Problem
AI thường trả về JSON kèm markdown code fence hoặc thêm text trước/sau.

### Solution
```java
public class JsonResponseParser {
    public <T> T parse(String rawResponse, Class<T> targetClass) {
        String cleaned = extractJson(rawResponse);
        try {
            return objectMapper.readValue(cleaned, targetClass);
        } catch (JsonProcessingException e) {
            // Retry with prompt asking to fix format
            throw new AiResponseFormatException(rawResponse, e);
        }
    }
    
    private String extractJson(String raw) {
        // Strip ```json ... ``` markers
        // Find first { or [ and last } or ]
        // Trim
    }
}
```

---

## Prompt Templates

### Template 1: Parse CV

**System Prompt:**
```
You are a CV parser. Extract structured information from CV text.
Output ONLY valid JSON matching the exact schema provided. No markdown, no commentary.
If a field is not found, use null or empty array.
Preserve original language (Vietnamese or English) for text content.
Be conservative: if uncertain, leave field empty rather than guess.
```

**User Prompt:**
```
Extract structured data from this CV:

<<CV_TEXT>>

Output schema (JSON):
{
  "personalInfo": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "links": {
      "github": "string|null",
      "linkedin": "string|null",
      "portfolio": "string|null"
    }
  },
  "summary": "string|null",
  "education": [
    {
      "school": "string",
      "degree": "string",
      "major": "string",
      "startDate": "YYYY-MM|null",
      "endDate": "YYYY-MM|null",
      "gpa": "string|null",
      "achievements": ["string"]
    }
  ],
  "experience": [
    {
      "company": "string",
      "position": "string",
      "location": "string|null",
      "startDate": "YYYY-MM|null",
      "endDate": "YYYY-MM|null (or 'Present')",
      "description": "string",
      "technologies": ["string"],
      "achievements": ["string"]
    }
  ],
  "skills": [
    {
      "category": "string (e.g., 'Programming Languages', 'Frameworks', 'Tools')",
      "items": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "role": "string|null",
      "link": "string|null"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "YYYY-MM|null"
    }
  ],
  "languages": [
    {"language": "string", "level": "string"}
  ]
}
```

**Parameters:**
- temperature: 0.1 (deterministic)
- maxTokens: 4000
- jsonMode: true

---

### Template 2: CV-JD Match Analysis

**System Prompt:**
```
You are an experienced technical recruiter helping a candidate evaluate fit for a job.
Analyze the match between the candidate's CV and the Job Description.
Be specific, actionable, and honest. Output ONLY valid JSON matching the schema.
Reference specific skills/experiences from the CV when explaining strengths/gaps.
Use the same language as the JD for output (Vietnamese if JD is Vietnamese, English otherwise).
```

**User Prompt:**
```
CV (parsed):
<<CV_JSON>>

Job Description:
<<JD_TEXT>>

Analyze the match and output JSON:
{
  "matchScore": <integer 0-100>,
  "scoreBreakdown": {
    "technicalSkills": <0-100>,
    "experience": <0-100>,
    "education": <0-100>,
    "softSkills": <0-100>
  },
  "strengths": [
    "<specific strength with reference to CV>"
  ],
  "gaps": [
    "<specific gap that the JD requires but CV lacks>"
  ],
  "suggestions": [
    "<specific actionable suggestion to improve CV for this job>"
  ],
  "matchedKeywords": ["<keyword>"],
  "missingKeywords": ["<keyword>"],
  "overallAssessment": "<2-3 sentence summary>",
  "recommendation": "STRONG_FIT | GOOD_FIT | FAIR_FIT | WEAK_FIT"
}

Rules:
- matchScore: 80+ STRONG_FIT, 60-79 GOOD_FIT, 40-59 FAIR_FIT, <40 WEAK_FIT
- strengths/gaps: 3-7 items each, specific not generic
- suggestions: actionable, not "learn X" but "highlight X experience" or "add Y project"
- matchedKeywords/missingKeywords: technical keywords only (tech stack, tools)
```

**Parameters:**
- temperature: 0.3
- maxTokens: 2000
- jsonMode: true

---

### Template 3: JD Insight Extraction

**System Prompt:**
```
You are a job posting analyzer. Extract structured information from a Job Description.
Be precise: distinguish required vs nice-to-have.
Output ONLY valid JSON. Use same language as JD.
```

**User Prompt:**
```
Job Description:
<<JD_TEXT>>

Extract:
{
  "companyName": "string|null (if mentioned)",
  "position": "string",
  "location": "string|null",
  "workType": "ONSITE|HYBRID|REMOTE|null",
  "employmentType": "INTERN|FULLTIME|PARTTIME|CONTRACT|null",
  "salaryRange": "string|null",
  "experienceLevel": "INTERN|JUNIOR|MID|SENIOR|LEAD|null",
  "yearsOfExperience": "string|null (e.g., '2-3 years')",
  "education": "string|null",
  "requiredSkills": [
    {
      "skill": "string",
      "category": "LANGUAGE|FRAMEWORK|DATABASE|TOOL|CONCEPT|SOFT_SKILL",
      "yearsRequired": <integer|null>
    }
  ],
  "niceToHaveSkills": [
    {"skill": "string", "category": "..."}
  ],
  "responsibilities": ["string"],
  "benefits": ["string"],
  "techStack": {
    "languages": ["string"],
    "frameworks": ["string"],
    "databases": ["string"],
    "tools": ["string"],
    "platforms": ["string"]
  },
  "softSkills": ["string"]
}
```

**Parameters:**
- temperature: 0.2
- maxTokens: 1500

---

### Template 4: Interview Prep Questions

**System Prompt:**
```
You are a technical interview coach.
Generate realistic interview questions based on the Job Description.
Mix difficulty levels appropriately for the experience level.
Provide brief hints on what the interviewer is looking for.
Output ONLY valid JSON.
```

**User Prompt:**
```
Job Description:
<<JD_TEXT>>

Candidate CV summary:
<<CV_SUMMARY>>

Generate interview prep:
{
  "technicalQuestions": [
    {
      "question": "string",
      "category": "string (e.g., 'Java Fundamentals', 'System Design')",
      "difficulty": "EASY|MEDIUM|HARD",
      "hint": "string (what interviewer is looking for)"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "string",
      "tip": "string"
    }
  ],
  "topicsToReview": [
    {
      "topic": "string",
      "reason": "string",
      "priority": "HIGH|MEDIUM|LOW"
    }
  ],
  "potentialChallenges": [
    "<things the interviewer might dig into based on CV gaps>"
  ]
}

Generate:
- 8-12 technical questions
- 4-6 behavioral questions
- 5-8 topics to review
- 2-4 potential challenges
```

**Parameters:**
- temperature: 0.5
- maxTokens: 2500

---

### Template 5: Email Draft

**System Prompt:**
```
You are a professional email writer helping job candidates communicate with recruiters.
Write polite, concise, and specific emails. Avoid generic phrases.
Match the tone to the context (formal for follow-up, warmer for thank you).
Output ONLY valid JSON.
```

**User Prompt:**
```
Email type: <<TEMPLATE_KEY>>

Context:
- Candidate: <<USER_NAME>>
- Company: <<COMPANY_NAME>>
- Position: <<POSITION>>
- Applied date: <<APPLIED_DATE>>
- Days since apply/interview: <<DAYS>>
- Recipient: <<RECIPIENT_NAME>> (<<RECIPIENT_ROLE>>)
- Custom instructions: <<CUSTOM>>

Recent context (status changes, previous emails):
<<RECENT_CONTEXT>>

Generate email:
{
  "subject": "string",
  "body": "string (multi-paragraph, with proper greeting and signature)",
  "tone": "FORMAL|FRIENDLY|ENTHUSIASTIC"
}

Guidelines:
- 100-200 words body
- Reference specific details (position name, interview date, etc.)
- Clear call-to-action if appropriate
- Sign off with candidate name
- Use same language as the recruiter's previous messages (if any) or company location
```

**Parameters:**
- temperature: 0.6
- maxTokens: 1000

---

### Template 6: Pattern Analysis (Aggregate)

**System Prompt:**
```
You are a career advisor analyzing job application patterns.
Identify patterns in successful vs unsuccessful applications.
Provide actionable, specific insights based on the data.
Output ONLY valid JSON.
```

**User Prompt:**
```
Application history (last 6 months):
<<APPLICATIONS_SUMMARY>>

Each entry includes: position, company, status outcome, JD requirements, time at each stage.

Analyze patterns:
{
  "totalAnalyzed": <integer>,
  "outcomesByCategory": {
    "byTechStack": [
      {"category": "string", "appliedCount": <int>, "offerRate": <float>}
    ],
    "byCompanySize": [...],
    "byExperienceLevel": [...]
  },
  "successPatterns": [
    "<pattern observed in successful applications>"
  ],
  "rejectionPatterns": [
    "<pattern observed in rejections>"
  ],
  "skillGapInsights": [
    {
      "skill": "string",
      "frequency": "<how often required>",
      "impact": "<correlation with outcome>"
    }
  ],
  "actionableSuggestions": [
    {
      "suggestion": "string",
      "priority": "HIGH|MEDIUM|LOW",
      "reasoning": "string"
    }
  ]
}
```

---

## Cost Optimization

### Token Estimation
- CV parse: ~3000-5000 input tokens, ~2000 output → ~$0.001 per call (Gemini Flash)
- CV-JD match: ~4000 input, ~1500 output → ~$0.001
- JD insight: ~1500 input, ~1000 output → ~$0.0005
- Interview prep: ~2500 input, ~2000 output → ~$0.001

### Budget Limits (configurable)
- Per user: $0.50/day, $5/month
- Total system: alert at $50/day
- Implement circuit breaker khi vượt budget

### Optimization Techniques
1. **Aggressive caching**: hash both CV và JD content
2. **Smart batching**: combine CV-JD match + JD insight in one call if possible
3. **Model tiering**: dùng Flash cho tasks đơn giản, Pro cho complex
4. **Prompt compression**: tóm tắt CV trước khi gửi (e.g., chỉ skills + summary)
5. **Skip duplicate analysis**: nếu user re-apply same position, dùng lại analysis cũ

## Monitoring

Log mỗi AI call:
- userId, analysisType, model, tokensUsed, latencyMs, cacheHit, success
- Aggregate vào dashboard (admin only): tokens used per day, cost estimate, error rate

## Fallback Strategy

If primary AI fails:
1. Try cached result (even if expired - better than nothing)
2. Try backup provider (Grok)
3. Return user-friendly error: "AI analysis temporarily unavailable, please try again later"
4. Allow manual retry button
