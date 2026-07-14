package com.jobtrackerai.email.service;

import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.entity.ContactPerson;
import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.email.dto.EmailDraftRequest;
import com.jobtrackerai.email.dto.EmailDraftResponse;
import com.jobtrackerai.email.entity.EmailTemplateKey;
import com.jobtrackerai.shared.ai.AiPrompt;
import com.jobtrackerai.shared.ai.AiResponse;
import com.jobtrackerai.shared.ai.AiService;
import com.jobtrackerai.shared.ai.JsonResponseParser;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import com.jobtrackerai.user.entity.User;
import com.jobtrackerai.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Soạn nháp email cho ứng viên gửi HR (Phase 6 — mảng C).
 *
 * <p>Stateless: KHÁC {@code AiAnalysisService}, draft KHÔNG lưu DB, KHÔNG cache — mỗi lần bấm là
 * gọi Gemini tạo bản mới (user thường sinh vài lần rồi tự sửa, cache lại phản tác dụng).
 * Không @Transactional: chỉ đọc + gọi AI chậm, không cần giữ transaction (xem ghi chú AiAnalysisService).
 *
 * <p>{@code toEmail} được điền server-side từ {@code contactPerson.email} SAU khi parse JSON của AI —
 * AI chỉ sinh subject/body/tone. Đây là "khe nối" cho tính năng gửi-as-user (Gmail API) sau này.
 */
@Service
@Slf4j
public class EmailDraftService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final AiService aiService;
    private final JsonResponseParser jsonParser;

    public EmailDraftService(ApplicationRepository applicationRepository,
                             UserRepository userRepository,
                             AiService aiService,
                             JsonResponseParser jsonParser) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.aiService = aiService;
        this.jsonParser = jsonParser;
    }

    public EmailDraftResponse draft(Long applicationId, Long userId, EmailDraftRequest request) {
        // Ownership: query kèm userId — không phải đơn của mình thì coi như không tồn tại (404)
        Application app = applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(applicationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        AiPrompt prompt = buildPrompt(app, user, request);
        AiResponse response = aiService.generate(prompt);
        EmailDraftResponse aiDraft = jsonParser.parse(response.rawText(), EmailDraftResponse.class);
        // khi dùng jsonparser nếu thiếu field toemail ở json thì lúc chuyển thành object response field nào không có thì field trong object đó = null không lỗi
        // AI không sinh toEmail — điền từ contactPerson (có thể null nếu đơn chưa gắn HR)
        String toEmail = app.getContactPerson() != null ? app.getContactPerson().email() : null;
        log.info("Email draft generated: applicationId={}, template={}, tokens={}",
                applicationId, request.templateKey(), response.tokensUsed());

        return new EmailDraftResponse(aiDraft.subject(), aiDraft.body(), aiDraft.tone(), toEmail);
    }

    // ── Prompt (schema Template 5, docs/04-ai-integration.md) ───────────────────

    private AiPrompt buildPrompt(Application app, User user, EmailDraftRequest request) {
        EmailTemplateKey template = request.templateKey();
        ContactPerson contact = app.getContactPerson();

        String system = """
                You are a professional email writer helping job candidates communicate with recruiters.
                Write polite, concise, and specific emails. Avoid generic phrases.
                Match the tone to the context (formal for follow-up, warmer for thank you).
                Output ONLY valid JSON.""";

        String user_ = """
                Email type: %s (%s)

                Context:
                - Candidate: %s
                - Company: %s
                - Position: %s
                - Applied date: %s
                - Days since apply/interview: %s
                - Recipient: %s (%s)
                - Custom instructions: %s

                Recent context (status changes, previous emails):
                Current application status: %s

                Generate email:
                {
                  "subject": "string",
                  "body": "string (multi-paragraph, with proper greeting and signature)",
                  "tone": "FORMAL|FRIENDLY|ENTHUSIASTIC"
                }

                Guidelines:
                - 100-200 words body
                - Reference specific details (position name, interview date, etc.)
                - Clear call-to-action if appropriate
                - Sign off with candidate name
                - Use the same language as the recruiter's previous messages (if any) or company location""".formatted(
                template.name(), template.getDescription(),
                user.getFullName(),
                app.getCompanyName(),
                app.getPosition(),
                nvl(app.getAppliedDate()),
                daysSinceApply(app.getAppliedDate()),
                contact != null ? nvl(contact.name()) : "unknown",
                contact != null ? nvl(contact.role()) : "unknown",
                nvl(request.customInstructions()),
                app.getStatus().name());

        return AiPrompt.of(system, user_, 0.6, 1000);
    }

    /** Số ngày từ ngày nộp tới hôm nay; "unknown" nếu chưa có ngày nộp. */
    private String daysSinceApply(LocalDate appliedDate) {
        if (appliedDate == null) {
            return "unknown";
        }
        return String.valueOf(ChronoUnit.DAYS.between(appliedDate, LocalDate.now()));
    }

    /** Thay giá trị null/rỗng bằng "none" để prompt không có placeholder trống khó hiểu cho AI. */
    private String nvl(Object value) {
        if (value == null || value.toString().isBlank()) {
            return "none";
        }
        return value.toString();
    }
}
