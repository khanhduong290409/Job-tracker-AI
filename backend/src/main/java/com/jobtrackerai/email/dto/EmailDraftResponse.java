package com.jobtrackerai.email.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Nháp email do AI soạn — khớp schema Template 5 trong docs/04-ai-integration.md.
 *
 * <p>{@code subject}, {@code body}, {@code tone} đến TỪ AI (JSON). {@code tone} để String cho
 * tolerant với output AI (enum-like FORMAL|FRIENDLY|ENTHUSIASTIC — xem pattern JdInsightResponse).
 *
 * <p>{@code toEmail} KHÔNG đến từ AI — service điền từ {@code application.contactPerson.email}
 * để frontend dựng sẵn link {@code mailto:} (có thể null nếu đơn chưa có email HR). Vì record parse
 * trực tiếp từ JSON của AI, field này luôn null lúc parse rồi service tạo bản mới kèm toEmail.
 * {@code @JsonIgnoreProperties} để không vỡ nếu AI trả thừa field.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EmailDraftResponse(
        String subject,//tiêu đề
        String body,// nội dung email
        String tone,      // giọng văn AI đã chọn :FORMAL | FRIENDLY | ENTHUSIASTIC
        String toEmail     //Mail của HR điền server-side từ contactPerson.email, không phải AI
) {}
