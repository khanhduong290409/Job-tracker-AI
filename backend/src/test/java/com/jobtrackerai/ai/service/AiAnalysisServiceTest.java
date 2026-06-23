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
import com.jobtrackerai.shared.ai.AiResponse;
import com.jobtrackerai.shared.ai.AiService;
import com.jobtrackerai.shared.ai.JsonResponseParser;
import com.jobtrackerai.shared.exception.BadRequestException;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiAnalysisServiceTest {

    private static final Long APP_ID = 1L;
    private static final Long USER = 10L;
    private static final Long CV_ID = 5L;

    @Mock private ApplicationRepository applicationRepository;
    @Mock private CvVersionRepository cvVersionRepository;
    @Mock private AiAnalysisRepository analysisRepository;
    @Mock private AiService aiService;
    @Mock private JsonResponseParser jsonParser;

    // ObjectMapper là utility stateless — dùng thật (không mock) để valueToTree/convertValue chạy đúng.
    private final ObjectMapper objectMapper = new ObjectMapper();
    private AiAnalysisService service;

    @BeforeEach
    void setUp() {
        service = new AiAnalysisService(applicationRepository, cvVersionRepository,
                analysisRepository, aiService, jsonParser, objectMapper);
    }

    // ── getJdInsight ────────────────────────────────────────────────────────────

    @Test
    void getJdInsight_cacheHit_returnsCached_noAiCall() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.of(ownedApp()));
        AiAnalysis cachedRow = new AiAnalysis();
        cachedRow.setResult(objectMapper.valueToTree(jdInsight("Backend Dev")));
        when(analysisRepository.findFirstByApplicationIdAndAnalysisTypeAndInputHashOrderByCreatedAtDesc(
                eq(APP_ID), eq(AiAnalysisType.JD_INSIGHT), anyString()))
                .thenReturn(Optional.of(cachedRow));

        JdInsightResponse result = service.getJdInsight(APP_ID, USER);

        assertThat(result.position()).isEqualTo("Backend Dev");
        verify(aiService, never()).generate(any());
        verify(analysisRepository, never()).save(any());
    }

    @Test
    void getJdInsight_cacheMiss_callsAiAndSaves() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.of(ownedApp()));
        when(analysisRepository.findFirstByApplicationIdAndAnalysisTypeAndInputHashOrderByCreatedAtDesc(
                eq(APP_ID), eq(AiAnalysisType.JD_INSIGHT), anyString()))
                .thenReturn(Optional.empty());
        when(aiService.generate(any())).thenReturn(new AiResponse("raw", 120, "gemini-1.5-flash", 88));
        when(jsonParser.parse("raw", JdInsightResponse.class)).thenReturn(jdInsight("Java Backend"));

        JdInsightResponse result = service.getJdInsight(APP_ID, USER);

        assertThat(result.position()).isEqualTo("Java Backend");
        verify(aiService).generate(any());

        ArgumentCaptor<AiAnalysis> captor = ArgumentCaptor.forClass(AiAnalysis.class);
        verify(analysisRepository).save(captor.capture());
        AiAnalysis saved = captor.getValue();
        assertThat(saved.getApplicationId()).isEqualTo(APP_ID);
        assertThat(saved.getAnalysisType()).isEqualTo(AiAnalysisType.JD_INSIGHT);
        assertThat(saved.getInputHash()).hasSize(64); // SHA-256 hex
        assertThat(saved.getTokensUsed()).isEqualTo(120);
        assertThat(saved.getResult().get("position").asText()).isEqualTo("Java Backend");
    }

    @Test
    void getJdInsight_wrongOwner_throwsNotFound() {
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getJdInsight(APP_ID, USER))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(aiService, never()).generate(any());
    }

    // ── getCvJdMatch ──────────────────────────────────────────────────────────────

    @Test
    void getCvJdMatch_cacheHit_returnsCached_noAiCall() {
        Application app = ownedApp();
        app.setCvVersionId(CV_ID);
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.of(app));
        when(cvVersionRepository.findByIdAndUserId(CV_ID, USER)).thenReturn(Optional.of(completedCv()));
        AiAnalysis cachedRow = new AiAnalysis();
        cachedRow.setResult(objectMapper.valueToTree(cvMatch(75)));
        when(analysisRepository.findFirstByApplicationIdAndAnalysisTypeAndInputHashOrderByCreatedAtDesc(
                eq(APP_ID), eq(AiAnalysisType.CV_JD_MATCH), anyString()))
                .thenReturn(Optional.of(cachedRow));

        CvJdMatchResponse result = service.getCvJdMatch(APP_ID, USER, false);

        assertThat(result.matchScore()).isEqualTo(75);
        verify(aiService, never()).generate(any());
    }

    @Test
    void getCvJdMatch_force_bypassesCache_callsAi() {
        Application app = ownedApp();
        app.setCvVersionId(CV_ID);
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.of(app));
        when(cvVersionRepository.findByIdAndUserId(CV_ID, USER)).thenReturn(Optional.of(completedCv()));
        when(aiService.generate(any())).thenReturn(new AiResponse("raw", 200, "gemini-1.5-flash", 99));
        when(jsonParser.parse("raw", CvJdMatchResponse.class)).thenReturn(cvMatch(90));

        CvJdMatchResponse result = service.getCvJdMatch(APP_ID, USER, true);

        assertThat(result.matchScore()).isEqualTo(90);
        verify(aiService).generate(any());
        // force = true → KHÔNG đụng cache lookup
        verify(analysisRepository, never())
                .findFirstByApplicationIdAndAnalysisTypeAndInputHashOrderByCreatedAtDesc(any(), any(), any());
        verify(analysisRepository).save(any());
    }

    @Test
    void getCvJdMatch_noCvAttached_throwsBadRequest() {
        Application app = ownedApp(); // cvVersionId = null
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.of(app));

        assertThatThrownBy(() -> service.getCvJdMatch(APP_ID, USER, false))
                .isInstanceOf(BadRequestException.class);
        verify(aiService, never()).generate(any());
    }

    @Test
    void getCvJdMatch_cvNotParsed_throwsBadRequest() {
        Application app = ownedApp();
        app.setCvVersionId(CV_ID);
        when(applicationRepository.findByIdAndUserIdAndDeletedAtIsNull(APP_ID, USER))
                .thenReturn(Optional.of(app));
        CvVersion processing = new CvVersion();
        processing.setParseStatus(CvParseStatus.PROCESSING);
        when(cvVersionRepository.findByIdAndUserId(CV_ID, USER)).thenReturn(Optional.of(processing));

        assertThatThrownBy(() -> service.getCvJdMatch(APP_ID, USER, false))
                .isInstanceOf(BadRequestException.class);
        verify(aiService, never()).generate(any());
    }

    // ── extractJd ────────────────────────────────────────────────────────────────

    @Test
    void extractJd_blank_throwsBadRequest_noAiCall() {
        assertThatThrownBy(() -> service.extractJd("   "))
                .isInstanceOf(BadRequestException.class);
        verify(aiService, never()).generate(any());
    }

    @Test
    void extractJd_valid_callsAiAndReturns_noPersist() {
        when(aiService.generate(any())).thenReturn(new AiResponse("raw", 50, "gemini-1.5-flash", 10));
        when(jsonParser.parse("raw", JdInsightResponse.class)).thenReturn(jdInsight("DevOps"));

        JdInsightResponse result = service.extractJd("Real JD text");

        assertThat(result.position()).isEqualTo("DevOps");
        verify(aiService).generate(any());
        verifyNoInteractions(analysisRepository); // stateless: không lưu DB
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private Application ownedApp() {
        Application app = new Application();
        app.setUserId(USER);
        app.setJdContent("Backend Developer JD content...");
        return app;
    }

    private CvVersion completedCv() {
        CvVersion cv = new CvVersion();
        cv.setParseStatus(CvParseStatus.COMPLETED);
        cv.setParsedData("{\"skills\":[\"Java\",\"Spring\"]}");
        return cv;
    }

    private JdInsightResponse jdInsight(String position) {
        return new JdInsightResponse(null, position, null, null, null, null, null, null, null,
                null, null, null, null, null, null);
    }

    private CvJdMatchResponse cvMatch(Integer score) {
        return new CvJdMatchResponse(score, null, null, null, null, null, null, null, "GOOD_FIT");
    }
}
