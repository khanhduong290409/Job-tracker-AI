package com.jobtrackerai.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtrackerai.ai.dto.CvJdMatchResponse;
import com.jobtrackerai.ai.dto.JdInsightResponse;
import com.jobtrackerai.ai.entity.AiAnalysis;
import com.jobtrackerai.ai.entity.AiAnalysisType;
import com.jobtrackerai.ai.repository.AiAnalysisRepository;
import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.cv.entity.CvParseStatus;
import com.jobtrackerai.cv.entity.CvVersion;
import com.jobtrackerai.cv.repository.CvVersionRepository;
import com.jobtrackerai.shared.ai.AiPrompt;
import com.jobtrackerai.shared.ai.AiResponse;
import com.jobtrackerai.shared.ai.AiService;
import com.jobtrackerai.shared.ai.JsonResponseParser;
import com.jobtrackerai.shared.exception.BadRequestException;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Lõi AI analysis: lấy input (JD / parsed CV) từ application có kiểm tra ownership,
 * dùng bảng ai_analyses làm cache bền (key theo inputHash SHA-256), gọi Gemini khi cache miss.
 *
 * KHÔNG đặt @Transactional ở method public: phần đọc không cần transaction, còn lời gọi Gemini
 * chậm (retry tới 4s) — bọc transaction sẽ giữ DB connection suốt cả lúc gọi AI. repository.save()
 * tự chạy trong transaction riêng của nó là đủ (bản ghi append-only, race chỉ tạo row thừa vô hại).
 */
@Service
@Slf4j
public class AiAnalysisService {

    private final ApplicationRepository applicationRepository;
    private final CvVersionRepository cvVersionRepository;
    private final AiAnalysisRepository analysisRepository;
    private final AiService aiService;
    private final JsonResponseParser jsonParser;
    private final ObjectMapper objectMapper;

    public AiAnalysisService(ApplicationRepository applicationRepository,
                             CvVersionRepository cvVersionRepository,
                             AiAnalysisRepository analysisRepository,
                             AiService aiService,
                             JsonResponseParser jsonParser,
                             ObjectMapper objectMapper) {
        this.applicationRepository = applicationRepository;
        this.cvVersionRepository = cvVersionRepository;
        this.analysisRepository = analysisRepository;
        this.aiService = aiService;
        this.jsonParser = jsonParser;
        this.objectMapper = objectMapper;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Trích xuất insight từ JD thô — phục vụ auto-fill form tạo application (chưa có application).
     * Stateless: không gắn application_id nên không lưu DB, không cache.
     */
    public JdInsightResponse extractJd(String jdContent) {
        if (jdContent == null || jdContent.isBlank()) {
            throw new BadRequestException("JD content must not be empty");
        }
        AiResponse response = aiService.generate(buildJdInsightPrompt(jdContent));
        return jsonParser.parse(response.rawText(), JdInsightResponse.class);
    }

    /** JD insight cho 1 application (persist + cache theo hash của jdContent). */
    public JdInsightResponse getJdInsight(Long applicationId, Long userId) {
        Application app = findOwnedApplication(applicationId, userId);
        String inputHash = sha256(app.getJdContent());//hash cái jdcontent là cái rawtext là user paste vào input, lưu vào trong db mà không xử lí 

        return findCached(applicationId, AiAnalysisType.JD_INSIGHT, inputHash, JdInsightResponse.class)
                .orElseGet(() -> analyzeAndSave(applicationId, AiAnalysisType.JD_INSIGHT, inputHash,
                        buildJdInsightPrompt(app.getJdContent()), JdInsightResponse.class));
    }

    /**
     * Phân tích độ khớp CV–JD cho 1 application.
     * @param force true = bỏ qua cache, luôn gọi Gemini lại (user muốn phân tích mới).
     */
    public CvJdMatchResponse getCvJdMatch(Long applicationId, Long userId, boolean force) {
        Application app = findOwnedApplication(applicationId, userId);
        String parsedCv = loadParsedCv(app, userId);
        // Hash gộp cả JD lẫn CV: 1 trong 2 đổi → hash đổi → tính lại, không trả kết quả cũ
        String inputHash = sha256(app.getJdContent() + "\n---\n" + parsedCv);

        if (!force) {
            Optional<CvJdMatchResponse> cached =
                    findCached(applicationId, AiAnalysisType.CV_JD_MATCH, inputHash, CvJdMatchResponse.class);
            if (cached.isPresent()) {
                return cached.get();
            }
        }
        return analyzeAndSave(applicationId, AiAnalysisType.CV_JD_MATCH, inputHash,
                buildCvJdMatchPrompt(app.getJdContent(), parsedCv), CvJdMatchResponse.class);
    }

    // ── Helpers: ownership + input ─────────────────────────────────────────────

    private Application findOwnedApplication(Long applicationId, Long userId) {
        return applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(applicationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));
    }

    private String loadParsedCv(Application app, Long userId) {
        Long cvId = app.getCvVersionId();
        if (cvId == null) {
            throw new BadRequestException("Application chưa gắn CV — không thể phân tích độ khớp CV–JD");
        }
        CvVersion cv = cvVersionRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("CV not found: " + cvId));
        if (cv.getParseStatus() != CvParseStatus.COMPLETED || cv.getParsedData() == null) {
            throw new BadRequestException("CV chưa parse xong — chưa thể phân tích độ khớp CV–JD");
        }
        return cv.getParsedData();
    }

    // ── Helpers: cache (DB) + persist ──────────────────────────────────────────

    private <T> Optional<T> findCached(Long applicationId, AiAnalysisType type, String inputHash, Class<T> dtoClass) {
        return analysisRepository
                .findFirstByApplicationIdAndAnalysisTypeAndInputHashOrderByCreatedAtDesc(applicationId, type, inputHash)
                .map(a -> objectMapper.convertValue(a.getResult(), dtoClass));
    }

    private <T> T analyzeAndSave(Long applicationId, AiAnalysisType type, String inputHash,
                                 AiPrompt prompt, Class<T> dtoClass) {
        AiResponse response = aiService.generate(prompt);
        T dto = jsonParser.parse(response.rawText(), dtoClass);

        AiAnalysis analysis = new AiAnalysis();
        analysis.setApplicationId(applicationId);
        analysis.setAnalysisType(type);
        analysis.setInputHash(inputHash);
        analysis.setResult(objectMapper.valueToTree(dto));
        analysis.setModelUsed(response.modelUsed());
        analysis.setTokensUsed(response.tokensUsed());
        analysisRepository.save(analysis);

        log.info("AI analysis saved: type={}, applicationId={}, tokens={}", type, applicationId, response.tokensUsed());
        return dto;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash); // 64 ký tự hex, khớp VARCHAR(64)
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 luôn có trong JDK — nhánh này thực tế không xảy ra
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    // ── Prompt builders (schema theo docs/04-ai-integration.md) ─────────────────

    private AiPrompt buildJdInsightPrompt(String jdContent) {
        String system = """
                You are a job posting analyzer. Extract structured information from a Job Description.
                Be precise: distinguish required vs nice-to-have.
                Output ONLY valid JSON. Use same language as JD.""";

        String user = """
                Job Description:
                %s

                Extract:
                {
                  "companyName": "string|null",
                  "position": "string",
                  "location": "string|null",
                  "workType": "ONSITE|HYBRID|REMOTE|null",
                  "employmentType": "INTERN|FULLTIME|PARTTIME|CONTRACT|null",
                  "salaryRange": "string|null",
                  "experienceLevel": "INTERN|JUNIOR|MID|SENIOR|LEAD|null",
                  "yearsOfExperience": "string|null",
                  "education": "string|null",
                  "requiredSkills": [{"skill": "string", "category": "LANGUAGE|FRAMEWORK|DATABASE|TOOL|CONCEPT|SOFT_SKILL", "yearsRequired": "integer|null"}],
                  "niceToHaveSkills": [{"skill": "string", "category": "..."}],
                  "responsibilities": ["string"],
                  "benefits": ["string"],
                  "techStack": {"languages": ["string"], "frameworks": ["string"], "databases": ["string"], "tools": ["string"], "platforms": ["string"]},
                  "softSkills": ["string"]
                }""".formatted(jdContent);
            // dấu """ là để dùng cho 1 đoạn string dài, nếu như không dùng thì lúc xuống dòng thì ta cần dùng \n còn nếu như 
            // dùng """ thì xuống dòng 1 cách tự do mà không cần \n
        return AiPrompt.of(system, user, 0.2, 1500);
    }

    private AiPrompt buildCvJdMatchPrompt(String jdContent, String parsedCvJson) {
        String system = """
                You are an experienced technical recruiter helping a candidate evaluate fit for a job.
                Analyze the match between the candidate's CV and the Job Description.
                Be specific, actionable, and honest. Output ONLY valid JSON matching the schema.
                Reference specific skills/experiences from the CV when explaining strengths/gaps.
                Use the same language as the JD for output (Vietnamese if JD is Vietnamese, English otherwise).""";

        String user = """
                CV (parsed):
                %s

                Job Description:
                %s

                Analyze the match and output JSON:
                {
                  "matchScore": "integer 0-100",
                  "scoreBreakdown": {"technicalSkills": "0-100", "experience": "0-100", "education": "0-100", "softSkills": "0-100"},
                  "strengths": ["specific strength with reference to CV"],
                  "gaps": ["specific gap that the JD requires but CV lacks"],
                  "suggestions": ["specific actionable suggestion to improve CV for this job"],
                  "matchedKeywords": ["keyword"],
                  "missingKeywords": ["keyword"],
                  "overallAssessment": "2-3 sentence summary",
                  "recommendation": "STRONG_FIT|GOOD_FIT|FAIR_FIT|WEAK_FIT"
                }

                Rules:
                - matchScore: 80+ STRONG_FIT, 60-79 GOOD_FIT, 40-59 FAIR_FIT, <40 WEAK_FIT
                - strengths/gaps: 3-7 items each, specific not generic
                - suggestions: actionable, e.g. "highlight X experience" or "add Y project", not "learn X"
                - matchedKeywords/missingKeywords: technical keywords only (tech stack, tools)""".formatted(parsedCvJson, jdContent);

        return AiPrompt.of(system, user, 0.3, 2000);
    }
}
