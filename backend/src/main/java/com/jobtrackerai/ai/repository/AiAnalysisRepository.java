package com.jobtrackerai.ai.repository;

import com.jobtrackerai.ai.entity.AiAnalysis;
import com.jobtrackerai.ai.entity.AiAnalysisType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, Long> {

    // Lấy kết quả phân tích MỚI NHẤT của 1 application theo loại.
    // Dùng cho GET /jd-insight, GET /cv-jd-match — trả bản ghi gần nhất (append-only, không update).
    // findFirst + OrderByCreatedAtDesc → SQL LIMIT 1, khớp index idx_analyses_application.
    Optional<AiAnalysis> findFirstByApplicationIdAndAnalysisTypeOrderByCreatedAtDesc(
            Long applicationId, AiAnalysisType analysisType);

    // DB cache (layer 2 sau Redis): đã phân tích ĐÚNG input này cho application này chưa?
    // inputHash khớp = input (jdContent / jdContent+CV) không đổi → tái dùng kết quả, khỏi gọi lại Gemini.
    // Scope theo applicationId để giữ ownership rõ ràng (không tái dùng chéo application/user).
    Optional<AiAnalysis> findFirstByApplicationIdAndAnalysisTypeAndInputHashOrderByCreatedAtDesc(
            Long applicationId, AiAnalysisType analysisType, String inputHash);
}
