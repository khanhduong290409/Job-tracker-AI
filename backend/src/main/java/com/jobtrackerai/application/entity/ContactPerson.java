package com.jobtrackerai.application.entity;

public record ContactPerson(
        String name,
        String email,
        String phone,
        String role,
        String linkedinUrl
) {}
