package com.jobtrackerai.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Kết quả JD_INSIGHT — thông tin trích xuất từ Job Description.
 * Khớp schema Template 3 trong docs/04-ai-integration.md.
 * Các field "enum-like" (workType, employmentType, experienceLevel, category) để String
 * cho tolerant với output AI — xem giải thích File 11.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
//báo jackson bỏ qua các field thiếu value
public record JdInsightResponse(
        String companyName,
        String position,
        String location,
        String workType,          // ONSITE | HYBRID | REMOTE | null
        String employmentType,    // INTERN | FULLTIME | PARTTIME | CONTRACT | null
        String salaryRange,
        String experienceLevel,   // INTERN | JUNIOR | MID | SENIOR | LEAD | null
        String yearsOfExperience,
        String education,
        List<RequiredSkill> requiredSkills,
        List<NiceToHaveSkill> niceToHaveSkills,
        List<String> responsibilities,
        List<String> benefits,
        TechStack techStack,
        List<String> softSkills
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RequiredSkill(
            String skill,
            String category,          // LANGUAGE | FRAMEWORK | DATABASE | TOOL | CONCEPT | SOFT_SKILL
            Integer yearsRequired
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NiceToHaveSkill(
            String skill,
            String category
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TechStack(
            List<String> languages,
            List<String> frameworks,
            List<String> databases,
            List<String> tools,
            List<String> platforms
    ) {}
}
