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
