/**
 * Type mirror cho response chuẩn từ backend.
 * Shape khớp với `docs/03-api-contract.md` + `shared/dto/ApiResponse.java`.
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_STATE_TRANSITION'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AI_SERVICE_ERROR'
  | 'INTERNAL_ERROR';

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  code: ErrorCode | string;
  message: string;
  details?: FieldError[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface Pagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}
