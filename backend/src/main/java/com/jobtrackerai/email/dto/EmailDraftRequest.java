package com.jobtrackerai.email.dto;

import com.jobtrackerai.email.entity.EmailTemplateKey;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body cho POST /api/v1/applications/{id}/emails/draft — yêu cầu AI soạn nháp email gửi HR.
 *
 * <p>{@code templateKey} để kiểu enum {@link EmailTemplateKey} (không phải String) để Jackson
 * tự validate: giá trị lạ ngoài enum → 400 ngay lúc deserialize, service không cần check tay.
 * {@code customInstructions} là tuỳ chọn (user có thể để trống) — thêm yêu cầu riêng cho AI
 * (vd "nhắc tới việc mình sẵn sàng đi làm ngay"), giới hạn độ dài để chặn prompt quá dài.
 */
public record EmailDraftRequest(
        @NotNull(message = "templateKey must not be null")
        EmailTemplateKey templateKey,

        @Size(max = 500, message = "customInstructions must not exceed 500 characters")
        String customInstructions//yêu cầu riêng gì
) {}
