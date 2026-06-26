/**
 * Mirror các DTO của AI module backend (xem docs/04-ai-integration.md + docs/03-api-contract.md).
 *
 * Quy ước (khớp backend record):
 * - Field "enum-like" (workType, category, recommendation...) để `string` thay vì union literal —
 *   vì backend trả String để tolerant với output AI (model có thể trả giá trị ngoài enum). Không ép union.
 * - Field số dùng `number | null` (backend dùng Integer, thiếu field → null, KHÔNG default 0).
 * - Mọi field đều có thể null/thiếu (AI có thể bỏ qua) → đánh dấu `| null`, component phải guard.
 */

// ── Request: POST /api/v1/ai/extract-jd ───────────────────────────────────────
export interface ExtractJdRequest {
  jdContent: string;
}

// ── JD Insight (extract-jd + GET /applications/{id}/jd-insight) ───────────────

export interface RequiredSkill {
  skill: string | null;
  category: string | null; // LANGUAGE | FRAMEWORK | DATABASE | TOOL | CONCEPT | SOFT_SKILL
  yearsRequired: number | null;
}

export interface NiceToHaveSkill {
  skill: string | null;
  category: string | null;
}

export interface TechStack {
  languages: string[] | null;
  frameworks: string[] | null;
  databases: string[] | null;
  tools: string[] | null;
  platforms: string[] | null;
}

export interface JdInsight {
  companyName: string | null;
  position: string | null;
  location: string | null;
  workType: string | null; // ONSITE | HYBRID | REMOTE | null
  employmentType: string | null; // INTERN | FULLTIME | PARTTIME | CONTRACT | null
  salaryRange: string | null;
  experienceLevel: string | null; // INTERN | JUNIOR | MID | SENIOR | LEAD | null
  yearsOfExperience: string | null;
  education: string | null;
  requiredSkills: RequiredSkill[] | null;
  niceToHaveSkills: NiceToHaveSkill[] | null;
  responsibilities: string[] | null;
  benefits: string[] | null;
  techStack: TechStack | null;
  softSkills: string[] | null;
}

// ── CV–JD Match (GET /applications/{id}/cv-jd-match?force=) ────────────────────

export interface ScoreBreakdown {
  technicalSkills: number | null;
  experience: number | null;
  education: number | null;
  softSkills: number | null;
}

export interface CvJdMatch {
  matchScore: number | null; // 0-100
  scoreBreakdown: ScoreBreakdown | null;
  strengths: string[] | null;
  gaps: string[] | null;
  suggestions: string[] | null;
  matchedKeywords: string[] | null;
  missingKeywords: string[] | null;
  overallAssessment: string | null;
  recommendation: string | null; // STRONG_FIT | GOOD_FIT | FAIR_FIT | WEAK_FIT
}
