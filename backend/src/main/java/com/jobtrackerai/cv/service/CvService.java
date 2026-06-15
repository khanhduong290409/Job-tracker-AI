package com.jobtrackerai.cv.service;

import com.jobtrackerai.cv.dto.CvVersionResponse;
import com.jobtrackerai.cv.entity.CvParseStatus;
import com.jobtrackerai.cv.entity.CvVersion;
import com.jobtrackerai.cv.repository.CvVersionRepository;
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

    // Cần gọi parseCvAsync() qua Spring proxy để @Async hoạt động đúng.
    // Nếu gọi this.parseCvAsync() trực tiếp → bypass proxy → chạy đồng bộ, không đúng ý định.
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

    public CvVersionResponse getById(Long userId, Long cvId) {
        CvVersion cv = cvVersionRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
        return toResponse(cv);
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

    @Transactional
    public void delete(Long userId, Long cvId) {
        CvVersion cv = cvVersionRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
        // @SQLDelete trên entity chuyển lệnh delete → UPDATE SET deleted_at = NOW()
        cvVersionRepository.delete(cv);
        log.info("CV soft-deleted: userId={}, cvId={}", userId, cvId);
    }

    // Chạy bất đồng bộ trên aiTaskExecutor — transaction độc lập với caller.
    // Gọi qua self.parseCvAsync() từ upload() để đảm bảo proxy được kích hoạt.
    @Async("aiTaskExecutor")
    @Transactional
    public void parseCvAsync(Long cvId) {// đọc file PDF và trích xuất text, chạy bất đồng bộ (không block user chờ).
        log.info("Starting CV parse: cvId={}", cvId);

        // orElse(null) thay vì orElseThrow vì đây là async background task:
        // upload() transaction có thể chưa commit khi thread này bắt đầu (race condition lý thuyết),
        // hoặc user đã xóa CV ngay sau khi upload.
        CvVersion cv = cvVersionRepository.findById(cvId).orElse(null);
        if (cv == null) {
            log.warn("CV {} not found or already deleted, skipping parse", cvId);
            return;
        }

        cv.setParseStatus(CvParseStatus.PROCESSING);
        cvVersionRepository.save(cv);

        try {
            byte[] pdfBytes;
            try (InputStream is = fileStorageService.load(cv.getFileUrl()).getInputStream()) {
                pdfBytes = is.readAllBytes();
            }
            try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
                //Loader.loadPDF(bytes) → PDFBox parse mảng bytes thành đối tượng PDF có cấu trúc (trang, font, text...)
                String rawText = new PDFTextStripper().getText(doc);
                //PDFBox duyệt qua từng trang, trích xuất toàn bộ text thành một String dài.
                cv.setRawText(rawText);
                cv.setParseStatus(CvParseStatus.COMPLETED);
                cv.setParseError(null);
                log.info("CV parse completed: cvId={}, chars={}", cvId, rawText.length());
            }
        } catch (Exception e) {
            log.error("CV parse failed: cvId={}", cvId, e);
            cv.setParseStatus(CvParseStatus.FAILED);
            cv.setParseError(e.getMessage());
        }

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
}
