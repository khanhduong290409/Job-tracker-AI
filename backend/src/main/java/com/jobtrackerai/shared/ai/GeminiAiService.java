package com.jobtrackerai.shared.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.jobtrackerai.shared.exception.AiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;

@Slf4j
@Service
public class GeminiAiService implements AiService {

    //URL gốc của Gemini API
    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final int MAX_RETRIES = 3;
    //Số lần thử lại tối đa khi Gemini trả lỗi transient (429, 5xx)
    private final RestClient restClient;// để gọi api bên ngoài 
    private final GeminiProperties properties;//

    public GeminiAiService(GeminiProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.baseUrl(BASE_URL).build();
    }

    @Override
    public AiResponse generate(AiPrompt prompt) {
        // Ghép URL tuyệt đối: nếu để tương đối "model:generateContent", dấu ':' ở segment đầu
        // khiến RestClient hiểu nhầm model là URI scheme → "invalid URI scheme". URL tuyệt đối
        // (scheme https, ':' nằm sau '/') thì hợp lệ. baseUrl trên RestClient bị bỏ qua khi uri tuyệt đối.
        String uri = BASE_URL + properties.getModel() + ":generateContent?key=" + properties.getApiKey();
        GeminiRequest request = buildRequest(prompt);

        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                long start = System.currentTimeMillis();

                GeminiApiResponse response = restClient.post()
                        .uri(uri)
                        .contentType(MediaType.APPLICATION_JSON)//Dòng này set Content-Type: application/json ( báo rằng request format json)
                        .body(request)
                        .retrieve()// gửi HTTP request, nhận response về
                        .body(GeminiApiResponse.class);// đọc thành object chỉ định

                if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
                    throw new AiException("Gemini trả về response không có candidate nào");
                }
                Candidate candidate = response.candidates().get(0);

                // finishReason != STOP nghĩa là Gemini dừng bất thường. Hay gặp nhất là MAX_TOKENS:
                // JSON bị cắt giữa chừng, để lọt xuống parser sẽ chỉ báo "parse fail" rất khó đoán bệnh.
                // Chặn ngay tại đây và KHÔNG retry — gửi lại y hệt request thì vẫn cắt đúng chỗ đó.
                if ("MAX_TOKENS".equals(candidate.finishReason())) {
                    throw new AiException("Gemini bị cắt do chạm maxOutputTokens=" + prompt.maxTokens()
                            + " — nội dung cần trả về dài hơn giới hạn. Rút ngắn input hoặc tăng maxTokens.");
                }
                if (candidate.content() == null || candidate.content().parts() == null
                        || candidate.content().parts().isEmpty()) {
                    // SAFETY, RECITATION, PROHIBITED_CONTENT... — candidate có nhưng rỗng nội dung
                    throw new AiException("Gemini không trả về nội dung, finishReason=" + candidate.finishReason());
                }

                String rawText = candidate.content().parts().get(0).text();
                int tokensUsed = response.usageMetadata() != null
                        ? response.usageMetadata().totalTokenCount() : 0;
                String modelUsed = response.modelVersion() != null
                        ? response.modelVersion() : properties.getModel();

                return new AiResponse(rawText, tokensUsed, modelUsed, System.currentTimeMillis() - start);

            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                if (status == 429 || status >= 500) {
                    log.warn("Gemini transient error (attempt {}/{}): status={}", attempt, MAX_RETRIES, status);
                    lastException = e;
                    sleepBeforeRetry(attempt);
                } else {
                    // 400 bad request, 403 invalid key — lỗi cố định, không retry
                    throw new AiException("Gemini permanent error: status=" + status + ", body=" + e.getResponseBodyAsString());
                }
            } catch (ResourceAccessException e) {
                log.warn("Gemini network error (attempt {}/{}): {}", attempt, MAX_RETRIES, e.getMessage());
                lastException = e;
                sleepBeforeRetry(attempt);
            }
        }

        throw new AiException("Gemini failed after " + MAX_RETRIES + " attempts", lastException);
    }

    @Override
    public boolean isHealthy() {
        try {
            AiPrompt ping = new AiPrompt(null, "Reply with JSON: {\"status\":\"ok\"}", 0.0, 20, true);
            AiResponse response = generate(ping);
            return response.rawText() != null && !response.rawText().isBlank();
        } catch (Exception e) {
            log.error("Gemini health check failed: {}", e.getMessage());
            return false;
        }
    }

    private GeminiRequest buildRequest(AiPrompt prompt) {
        Content userContent = new Content(List.of(new Part(prompt.userPrompt())));

        Content systemInstruction = prompt.systemPrompt() != null
                ? new Content(List.of(new Part(prompt.systemPrompt())))
                : null;

        String mimeType = prompt.jsonMode() ? "application/json" : "text/plain";
        // thinkingLevel=minimal: hạn chế tối đa chế độ "thinking" (Gemini 3.x). Các tác vụ của app đều là
        // xuất JSON có cấu trúc ở temp thấp — thinking tiêu tốn output tokens cho suy luận nội bộ, đẩy JSON
        // vượt maxOutputTokens → response bị cắt cụt → parse fail (đã dính thật với default thinking).
        // Lưu ý: Gemini 3.x KHÔNG nhận thinkingBudget (400 INVALID_ARGUMENT) — param đó chỉ dành cho dòng 2.5.
        GenerationConfig config = new GenerationConfig(prompt.temperature(), prompt.maxTokens(), mimeType, new ThinkingConfig("minimal"));

        return new GeminiRequest(List.of(userContent), systemInstruction, config);
    }

    private void sleepBeforeRetry(int attempt) {//85-129 LEARNING CÓ GIẢI THÍCH
        try {
            long delayMs = 1000L * (1L << (attempt - 1)); // 1s → 2s → 4s
            Thread.sleep(delayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiException("Interrupted during retry wait", e);
        }
    }

    // ── Request records (Java → JSON, serialization only) ────────────────────

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record GeminiRequest(
            List<Content> contents,//danh sách (1 phần tử) trong hội thoại
            Content systemInstruction,//prompt hướng dẫn gemini
            GenerationConfig generationConfig
    ) {}//1-38 của learning có giải thích

    private record Content(List<Part> parts) {}

    private record Part(String text) {}
    //tại sao lại vừa khai báo content vừa khai báo Part mà không viết đơn giản hơn ?
    // đơn giản vì Gemini API quy định cấu trúc JSOn phải thế
    /*    
    {
  "contents": [
    {
      "parts": [
        { "text": "nội dung tin nhắn" }
      ]
    }
  ]
}
    */

    private record GenerationConfig(
            double temperature,
            int maxOutputTokens,
            String responseMimeType,
            ThinkingConfig thinkingConfig
    ) {}

    // Gemini 3.x: điều khiển thinking bằng mức ("minimal"/"low"/"high"), không còn thinkingBudget theo token.
    private record ThinkingConfig(String thinkingLevel) {}

    // ── Response records (JSON → Java, deserialization only) ─────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GeminiApiResponse(
            List<Candidate> candidates,
            UsageMetadata usageMetadata,
            String modelVersion
    ) {}//40-85 LEARNING CÓ GIẢI THÍCH

    @JsonIgnoreProperties(ignoreUnknown = true)
    //->Bảo Jackson: "gặp field nào không khai báo trong record → bỏ qua, đừng throw exception".
    private record Candidate(Content content, String finishReason) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record UsageMetadata(int promptTokenCount, int candidatesTokenCount, int totalTokenCount) {}
}
