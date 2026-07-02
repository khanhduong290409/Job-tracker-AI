package com.jobtrackerai.cv.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Dữ liệu CV đã được AI trích xuất thành cấu trúc — khớp schema Template 1 trong docs/04-ai-integration.md.
 *
 * Dùng 2 chiều:
 *  - OUTPUT: AI parse rawText → CvParsedData → lưu xuống cv_versions.parsed_data (JSON), trả về FE để xem/sửa.
 *  - INPUT : FE gửi bản đã sửa qua PATCH /cv/{id}/parsed-data → lưu lại.
 *
 * MỌI field đều nullable + @JsonIgnoreProperties(ignoreUnknown = true) trên từng record:
 *  - AI có thể bỏ qua field không tìm thấy (CV mỗi người mỗi khác) → field thiếu = null, không crash.
 *  - User sửa cũng có thể để trống → null hợp lệ.
 *  - AI lỡ trả thêm field lạ → Jackson bỏ qua thay vì ném lỗi.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CvParsedData(
        PersonalInfo personalInfo,
        String summary,
        List<Education> education,
        List<Experience> experience,
        List<SkillGroup> skills,
        List<Project> projects,
        List<Certification> certifications,
        List<Language> languages
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PersonalInfo(
            String fullName,
            String email,
            String phone,
            String address,
            Links links
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Links(
            String github,
            String linkedin,
            String portfolio
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Education(
            String school,
            String degree,
            String major,
            String startDate,        // YYYY-MM | null
            String endDate,          // YYYY-MM | null
            String gpa,
            List<String> achievements
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Experience(
            String company,
            String position,
            String location,
            String startDate,        // YYYY-MM | null
            String endDate,          // YYYY-MM | "Present" | null
            String description,
            List<String> technologies,
            List<String> achievements
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SkillGroup(
            String category,         // vd: "Programming Languages", "Frameworks", "Tools"
            List<String> items
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Project(
            String name,
            String description,
            List<String> technologies,
            String role,
            String link
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Certification(
            String name,
            String issuer,
            String date              // YYYY-MM | null
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Language(
            String language,
            String level
    ) {}
}
