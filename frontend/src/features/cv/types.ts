import type { CvParseStatus } from '@/types/common';

export interface CvVersion {
  id: number;
  label: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  parseStatus: CvParseStatus;
  parseError: string | null;
  defaultCv: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Parsed data (mirror backend CvParsedData — khớp Template 1) ───────────────
// MỌI field nullable: AI có thể bỏ field, user có thể để trống. Component phải guard.
// Mảng có thể null HOẶC [] → luôn dùng (arr ?? []) trước khi map.

export interface CvLinks {
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
}

export interface CvPersonalInfo {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  links: CvLinks | null;
}

export interface CvEducation {
  school: string | null;
  degree: string | null;
  major: string | null;
  startDate: string | null; // YYYY-MM
  endDate: string | null;
  gpa: string | null;
  achievements: string[] | null;
}

export interface CvExperience {
  company: string | null;
  position: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null; // YYYY-MM | "Present"
  description: string | null;
  technologies: string[] | null;
  achievements: string[] | null;
}

export interface CvSkillGroup {
  category: string | null;
  items: string[] | null;
}

export interface CvProject {
  name: string | null;
  description: string | null;
  technologies: string[] | null;
  role: string | null;
  link: string | null;
}

export interface CvCertification {
  name: string | null;
  issuer: string | null;
  date: string | null;
}

export interface CvLanguage {
  language: string | null;
  level: string | null;
}

export interface CvParsedData {
  personalInfo: CvPersonalInfo | null;
  summary: string | null;
  education: CvEducation[] | null;
  experience: CvExperience[] | null;
  skills: CvSkillGroup[] | null;
  projects: CvProject[] | null;
  certifications: CvCertification[] | null;
  languages: CvLanguage[] | null;
}

// Detail trả từ GET /cv/{id} — = CvVersion + parsedData.
export interface CvVersionDetail extends CvVersion {
  parsedData: CvParsedData | null;
}
