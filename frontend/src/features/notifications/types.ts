/**
 * Type mirror cho notification in-app — khớp `NotificationResponse.java`.
 *
 * `type` để `string` (không phải union hẹp) vì backend trả tên enum thô và có thể
 * thêm loại mới ở phase sau (EMAIL_RECEIVED, STATUS_CHANGED...). FE tolerant:
 * component chọn icon/nhãn theo `type` với nhánh fallback cho giá trị lạ.
 */
export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  // null khi reminder không gắn application (vd CUSTOM) → không có chỗ điều hướng.
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

// Query param cho GET /notifications (đều optional, backend có default).
export interface NotificationListParams {
  unreadOnly?: boolean;//undeadonly:true -> backend chỉ trả về các thông báo chưa đọc(read = false)
  page?: number;
  size?: number;
}
