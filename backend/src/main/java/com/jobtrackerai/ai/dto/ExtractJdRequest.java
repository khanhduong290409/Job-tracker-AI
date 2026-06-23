package com.jobtrackerai.ai.dto;

import jakarta.validation.constraints.NotBlank;

/** Body cho POST /ai/extract-jd — JD thô để trích xuất insight (auto-fill form tạo application). */
public record ExtractJdRequest(
        @NotBlank(message = "JD content must not be empty")
        String jdContent
) {}
