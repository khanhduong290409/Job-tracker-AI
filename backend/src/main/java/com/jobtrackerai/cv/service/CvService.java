package com.jobtrackerai.cv.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtrackerai.cv.dto.CvDetailResponse;
import com.jobtrackerai.cv.dto.CvParsedData;
import com.jobtrackerai.cv.dto.CvVersionResponse;
import com.jobtrackerai.cv.entity.CvParseStatus;
import com.jobtrackerai.cv.entity.CvVersion;
import com.jobtrackerai.cv.repository.CvVersionRepository;
import com.jobtrackerai.shared.ai.AiPrompt;
import com.jobtrackerai.shared.ai.AiResponse;
import com.jobtrackerai.shared.ai.AiService;
import com.jobtrackerai.shared.ai.JsonResponseParser;
import com.jobtrackerai.shared.exception.BadRequestException;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import com.jobtrackerai.shared.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class CvService {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5MB
    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final CvVersionRepository cvVersionRepository;
    private final FileStorageService fileStorageService;
    private final AiService aiService;
    private final JsonResponseParser jsonResponseParser;
    private final ObjectMapper objectMapper;

    // Cần gọi các method qua Spring proxy để @Async / @Transactional hoạt động đúng.
    // Gọi this.method() trực tiếp → bypass proxy → mất @Async/@Transactional.
    // @Lazy tránh circular dependency khi Spring container khởi động.
    @Autowired
    @Lazy
    private CvService self;

    @Transactional
    public CvVersionResponse upload(Long userId, MultipartFile file, String label) {
        validateUpload(file, label);

        String filename = UUID.randomUUID().toString();
        String fileUrl = fileStorageService.store(file, filename);

        CvVersion cv = new CvVersion();
        cv.setUserId(userId);
        cv.setLabel(label.strip());
        cv.setFileUrl(fileUrl);
        cv.setFileName(file.getOriginalFilename());
        cv.setFileSize(file.getSize());
        cv.setParseStatus(CvParseStatus.PENDING);

        CvVersion saved = cvVersionRepository.save(cv);
        log.info("CV uploaded: userId={}, cvId={}, fileName={}", userId, saved.getId(), saved.getFileName());

        // Gọi qua self (proxy) để @Async được áp dụng → chạy trên aiTaskExecutor thread
        self.parseCvAsync(saved.getId());
        return toResponse(saved);
    }

    public List<CvVersionResponse> list(Long userId) {
        return cvVersionRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CvDetailResponse getDetail(Long userId, Long cvId) {
        CvVersion cv = cvVersionRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
        return toDetailResponse(cv);
    }

    @Transactional
    public CvVersionResponse setDefault(Long userId, Long cvId) {
        CvVersion cv = cvVersionRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));

        // Bulk UPDATE xóa default cũ trước, sau đó set cái mới.
        // clearAutomatically=true trong repository đã flush + clear L1 cache sau bulk UPDATE.
        cvVersionRepository.clearDefaultByUserId(userId);
        cv.setDefaultCv(true);
        CvVersion saved = cvVersionRepository.save(cv);
        log.info("CV set as default: userId={}, cvId={}", userId, cvId);
        return toResponse(saved);
    }

    /** US-CV-002: user sửa lại dữ liệu CV đã parse (thay thế toàn bộ parsed_data). */
    @Transactional
    public CvDetailResponse updateParsedData(Long userId, Long cvId, CvParsedData data) {
        CvVersion cv = cvVersionRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
        cv.setParsedData(writeJson(data));
        CvVersion saved = cvVersionRepository.save(cv);
        log.info("CV parsed data updated: userId={}, cvId={}", userId, cvId);
        return toDetailResponse(saved);
    }

    /** Chạy lại parse (vd CV bị FAILED do Gemini lúc đó down). Reset trạng thái rồi trigger async. */
    @Transactional
    public CvDetailResponse reparse(Long userId, Long cvId) {
        CvVersion cv = cvVersionRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
        cv.setParseStatus(CvParseStatus.PENDING);
        cv.setParseError(null);
        cvVersionRepository.save(cv);

        self.parseCvAsync(cvId);
        return toDetailResponse(cv);
    }

    @Transactional
    public void delete(Long userId, Long cvId) {
        CvVersion cv = cvVersionRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
        // @SQLDelete trên entity chuyển lệnh delete → UPDATE SET deleted_at = NOW()
        cvVersionRepository.delete(cv);
        log.info("CV soft-deleted: userId={}, cvId={}", userId, cvId);
    }

    // ── Parse pipeline (async) ─────────────────────────────────────────────────
    // Orchestrator KHÔNG @Transactional: phần nặng (tải PDF + extract text + gọi Gemini, ~vài giây)
    // chạy NGOÀI transaction để không giữ DB connection suốt lúc gọi AI.
    // Các bước ghi DB là transaction NGẮN riêng, gọi qua self (proxy) để @Transactional có hiệu lực.

    // NOT_SUPPORTED: chạy PHI transaction. Bắt buộc vì class có @Transactional(readOnly=true) ở cấp class,
    // nếu không override thì parseCvAsync thừa kế tx readOnly → các self.markProcessing/saveParse* (propagation
    // REQUIRED) sẽ JOIN vào tx readOnly đó → Hibernate không flush → status không bao giờ được ghi (kẹt PENDING).
    // NOT_SUPPORTED khiến 3 method self.* mỗi cái tự mở tx read-write mới → flush + persist bình thường.
    @Async("aiTaskExecutor")
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void parseCvAsync(Long cvId) {
        log.info("Starting CV parse: cvId={}", cvId);

        // Bước 1 (tx ngắn): set PROCESSING + lấy fileUrl. null = CV không tồn tại / đã xóa.
        String fileUrl = self.markProcessing(cvId);
        if (fileUrl == null) {
            return;
        }

        try {
            // Bước 2 (NGOÀI tx): I/O nặng — tải PDF, extract text, gọi Gemini parse.
            byte[] pdfBytes;
            try (InputStream is = fileStorageService.load(fileUrl).getInputStream()) {
                pdfBytes = is.readAllBytes();
            }//sau khi trả về dạng có thể đọc được từ fileurl thì đọc toàn bộ byte

            String rawText;
            try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
                rawText = new PDFTextStripper().getText(doc);
            }// giải mã byte đó thành cấu trúc PDF trong bộ nhớ, sau đó gettext rồi lưu vào biến
            if (rawText == null || rawText.isBlank()) {
                throw new IllegalStateException("PDF không chứa text (có thể là ảnh scan) — không thể parse");
            }

            AiResponse aiResponse = aiService.generate(buildCvParsePrompt(rawText));
            CvParsedData parsed = jsonResponseParser.parse(aiResponse.rawText(), CvParsedData.class);
            String parsedJson = writeJson(parsed);

            // Bước 3 (tx ngắn): lưu kết quả thành công.
            self.saveParseSuccess(cvId, rawText, parsedJson);
        } catch (Exception e) {
            log.error("CV parse failed: cvId={}", cvId, e);
            self.saveParseFailure(cvId, e.getMessage());
        }
    }

    @Transactional
    public String markProcessing(Long cvId) {
        // orElse(null): async task có thể chạy khi upload/reparse tx chưa commit, hoặc CV đã bị xóa.
        //lí do không dùng findbyidanduserid vì đây là 1 method của hệ thống, tức là user không gọi nó ta không phần xác thực user 
        CvVersion cv = cvVersionRepository.findById(cvId).orElse(null);
        if (cv == null) {
            log.warn("CV {} not found or already deleted, skipping parse", cvId);
            return null;
        }
        cv.setParseStatus(CvParseStatus.PROCESSING);
        cvVersionRepository.save(cv);
        return cv.getFileUrl();
    }

    @Transactional
    public void saveParseSuccess(Long cvId, String rawText, String parsedJson) {
        CvVersion cv = cvVersionRepository.findById(cvId).orElse(null);
        if (cv == null) {
            log.warn("CV {} deleted during parse, discarding result", cvId);
            return;
        }
        cv.setRawText(rawText);
        cv.setParsedData(parsedJson);
        cv.setParseStatus(CvParseStatus.COMPLETED);
        cv.setParseError(null);
        cvVersionRepository.save(cv);
        log.info("CV parse completed: cvId={}, chars={}", cvId, rawText.length());
    }

    @Transactional
    public void saveParseFailure(Long cvId, String errorMessage) {
        CvVersion cv = cvVersionRepository.findById(cvId).orElse(null);
        if (cv == null) {
            log.warn("CV {} deleted during parse, skip marking FAILED", cvId);
            return;
        }
        cv.setParseStatus(CvParseStatus.FAILED);
        cv.setParseError(errorMessage);
        cvVersionRepository.save(cv);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void validateUpload(MultipartFile file, String label) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        if (!PDF_CONTENT_TYPE.equals(file.getContentType())) {
            throw new BadRequestException("Only PDF files are accepted");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size must not exceed 5MB");
        }
        if (label == null || label.isBlank()) {
            throw new BadRequestException("Label is required");
        }
    }

    private String writeJson(CvParsedData data) {
        try {
            return objectMapper.writeValueAsString(data);// method có sẵn : nhận object rồi chuyển thành chuỗi JSON
        } catch (JsonProcessingException e) {
            // Gần như không xảy ra với POJO thuần — báo lỗi rõ thay vì nuốt.
            throw new BadRequestException("Dữ liệu parsed CV không hợp lệ");
        }
    }

    private CvParsedData readParsedData(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, CvParsedData.class);
        } catch (JsonProcessingException e) {
            // parsed_data trong DB lỗi định dạng — không chặn cả response, trả null + log.
            log.warn("Không đọc được parsed_data: {}", e.getMessage());
            return null;
        }
    }

    private AiPrompt buildCvParsePrompt(String rawText) {
        String system = """
                You are a CV parser. Extract structured information from CV text.
                Output ONLY valid JSON matching the exact schema provided. No markdown, no commentary.
                If a field is not found, use null or empty array.
                Preserve original language (Vietnamese or English) for text content.
                Be conservative: if uncertain, leave field empty rather than guess.""";

        String user = """
                Extract structured data from this CV:

                %s

                Output schema (JSON):
                {
                  "personalInfo": {"fullName": "string", "email": "string", "phone": "string", "address": "string", "links": {"github": "string|null", "linkedin": "string|null", "portfolio": "string|null"}},
                  "summary": "string|null",
                  "education": [{"school": "string", "degree": "string", "major": "string", "startDate": "YYYY-MM|null", "endDate": "YYYY-MM|null", "gpa": "string|null", "achievements": ["string"]}],
                  "experience": [{"company": "string", "position": "string", "location": "string|null", "startDate": "YYYY-MM|null", "endDate": "YYYY-MM|null (or 'Present')", "description": "string", "technologies": ["string"], "achievements": ["string"]}],
                  "skills": [{"category": "string (e.g., 'Programming Languages', 'Frameworks', 'Tools')", "items": ["string"]}],
                  "projects": [{"name": "string", "description": "string", "technologies": ["string"], "role": "string|null", "link": "string|null"}],
                  "certifications": [{"name": "string", "issuer": "string", "date": "YYYY-MM|null"}],
                  "languages": [{"language": "string", "level": "string"}]
                }""".formatted(rawText);

        // maxTokens 8192: CV dài → JSON output lớn. 4000 dễ bị cắt cụt với CV nhiều kinh nghiệm/dự án.
        return AiPrompt.of(system, user, 0.1, 8192);
    }

    private CvVersionResponse toResponse(CvVersion cv) {
        return new CvVersionResponse(
                cv.getId(),
                cv.getLabel(),
                cv.getFileName(),
                cv.getFileSize(),
                cv.getFileUrl(),
                cv.getParseStatus().name(),
                cv.getParseError(),
                cv.isDefaultCv(),
                cv.getCreatedAt(),
                cv.getUpdatedAt()
        );
    }

    private CvDetailResponse toDetailResponse(CvVersion cv) {
        return new CvDetailResponse(
                cv.getId(),
                cv.getLabel(),
                cv.getFileName(),
                cv.getFileSize(),
                cv.getFileUrl(),
                cv.getParseStatus().name(),
                cv.getParseError(),
                cv.isDefaultCv(),
                readParsedData(cv.getParsedData()),
                cv.getCreatedAt(),
                cv.getUpdatedAt()
        );
    }
}
