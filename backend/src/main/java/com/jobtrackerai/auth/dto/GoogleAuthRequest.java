package com.jobtrackerai.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank String code,
        @NotBlank String redirectUri
) {}
