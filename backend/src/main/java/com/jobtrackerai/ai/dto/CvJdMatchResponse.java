package com.jobtrackerai.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Kết quả CV_JD_MATCH — phân tích độ khớp giữa CV và JD.
 * Khớp schema Template 2 trong docs/04-ai-integration.md.
 * Dùng Integer (không int) để field thiếu → null thay vì 0 (tránh hiểu nhầm điểm = 0).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CvJdMatchResponse(
        Integer matchScore,           // 0-100
        ScoreBreakdown scoreBreakdown,
        List<String> strengths,
        List<String> gaps,
        List<String> suggestions,
        List<String> matchedKeywords,
        List<String> missingKeywords,
        String overallAssessment,
        String recommendation         // STRONG_FIT | GOOD_FIT | FAIR_FIT | WEAK_FIT
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ScoreBreakdown(
            Integer technicalSkills,
            Integer experience,
            Integer education,
            Integer softSkills
    ) {}
}
/*
đoạn record lồng bên trong 
ScoreBreakdown chỉ có nghĩa khi đứng cạnh CvJdMatchResponse — nó là một phần của kết quả match, không dùng ở chỗ nào khác.

Lồng vào trong = nói rõ "cái này thuộc về cái kia", code gọn hơn thay vì tạo file riêng.
*/
