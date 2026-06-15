package com.jobtrackerai.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record ContactPersonRequest(
        @Size(max = 255) String name,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        @Size(max = 255) String role,
        @Size(max = 500) String linkedinUrl
) {}
