package com.jobtrackerai.email.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtrackerai.application.entity.Application;
import com.jobtrackerai.application.entity.ApplicationStatus;
import com.jobtrackerai.application.entity.ContactPerson;
import com.jobtrackerai.application.repository.ApplicationRepository;
import com.jobtrackerai.email.dto.EmailDraftRequest;
import com.jobtrackerai.email.dto.EmailDraftResponse;
import com.jobtrackerai.email.entity.EmailTemplateKey;
import com.jobtrackerai.shared.ai.AiResponse;
import com.jobtrackerai.shared.ai.AiService;
import com.jobtrackerai.shared.ai.JsonResponseParser;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import com.jobtrackerai.user.entity.User;
import com.jobtrackerai.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailDraftServiceTest {

    private static final Long APP_ID = 1L;
    private static final Long USER = 10L;

    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private AiService aiService;

    // JsonResponseParser là utility stateless — dùng thật để verify parse + fill toEmail chạy đúng.
    private final JsonResponseParser jsonParser = new JsonResponseParser(new ObjectMapper());
    private EmailDraftService service;

    @BeforeEach
    void setUp() {
        service = new EmailDraftService(applicationRepository, userRepository, aiService, jsonParser);
    }

    @Test
    void draft_fillsToEmailFromContact_andKeepsAiFields() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.of(ownedApp(contact("hr@vng.com"))));
        when(userRepository.findByIdAndDeletedAtIsNull(USER)).thenReturn(Optional.of(user()));
        // AI chỉ trả subject/body/tone, KHÔNG có toEmail
        when(aiService.generate(any())).thenReturn(aiJson(
                "{\"subject\":\"Follow-up\",\"body\":\"Dear HR...\",\"tone\":\"FORMAL\"}"));

        EmailDraftResponse result = service.draft(APP_ID, USER, request(EmailTemplateKey.FOLLOW_UP_AFTER_APPLY));

        assertThat(result.subject()).isEqualTo("Follow-up");
        assertThat(result.body()).isEqualTo("Dear HR...");
        assertThat(result.tone()).isEqualTo("FORMAL");
        assertThat(result.toEmail()).isEqualTo("hr@vng.com"); // điền server-side từ contactPerson
    }

    @Test
    void draft_noContact_toEmailNull() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.of(ownedApp(null))); // đơn chưa gắn HR
        when(userRepository.findByIdAndDeletedAtIsNull(USER)).thenReturn(Optional.of(user()));
        when(aiService.generate(any())).thenReturn(aiJson(
                "{\"subject\":\"S\",\"body\":\"B\",\"tone\":\"FRIENDLY\"}"));

        EmailDraftResponse result = service.draft(APP_ID, USER, request(EmailTemplateKey.STATUS_INQUIRY));

        assertThat(result.toEmail()).isNull();
        assertThat(result.subject()).isEqualTo("S");
    }

    @Test
    void draft_applicationNotOwned_throwsAndSkipsAi() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.empty()); // đơn của người khác / không tồn tại

        assertThatThrownBy(() -> service.draft(APP_ID, USER, request(EmailTemplateKey.FOLLOW_UP_AFTER_APPLY)))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(aiService); // không tốn 1 lời gọi Gemini
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private EmailDraftRequest request(EmailTemplateKey key) {
        return new EmailDraftRequest(key, null);
    }

    private Application ownedApp(ContactPerson contact) {
        Application app = new Application();
        app.setId(APP_ID);
        app.setUserId(USER);
        app.setCompanyName("VNG");
        app.setPosition("Backend Intern");
        app.setStatus(ApplicationStatus.APPLIED);
        app.setContactPerson(contact);
        return app;
    }

    private ContactPerson contact(String email) {
        return new ContactPerson("Ms. Lan", email, null, "Recruiter", null);
    }

    private User user() {
        User u = new User();
        u.setId(USER);
        u.setFullName("Nguyen Van A");
        u.setEmail("a@example.com");
        return u;
    }

    private AiResponse aiJson(String json) {
        return new AiResponse(json, 100, "gemini-2.5-flash", 500L);
    }
}
