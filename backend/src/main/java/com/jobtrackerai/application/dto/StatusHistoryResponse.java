package com.jobtrackerai.application.dto;

import java.time.Instant;
//Response DTO — định dạng dữ liệu trả về cho frontend khi lấy lịch sử thay đổi trạng thái của một application.
public record StatusHistoryResponse(
        Long id,// ID của record lịch sử
        String fromStatus,// Trạng thái từ (ví dụ: "APPLIED")
        String toStatus,// Trạng thái đến (ví dụ: "PHONE_SCREEN")
        String note,// Ghi chú khi thay đổi (optional)
        Instant changedAt // Thời điểm thay đổi
) {}
