package com.jobtrackerai.shared.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtrackerai.shared.exception.AiException;
import org.springframework.stereotype.Component;

@Component
public class JsonResponseParser {

    private final ObjectMapper objectMapper;

    public JsonResponseParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public <T> T parse(String rawText, Class<T> targetClass) {
        String cleaned = extractJson(rawText);
        try {
            return objectMapper.readValue(cleaned, targetClass);
        } catch (Exception e) {
            throw new AiException("Failed to parse AI response into " + targetClass.getSimpleName()
                    + ". Raw text: " + rawText, e);
        }
    }

    private String extractJson(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AiException("AI returned empty response");
        }

        String trimmed = raw.trim();

        // Strip ```json ... ``` hoặc ``` ... ```
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline != -1 && lastFence > firstNewline) {
                trimmed = trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        // đoạn này mặc dù là trả về json string và đã quy định gemini trả về application/json
        //nhưng application/json chỉ bảo gemini trả JSON - không quy định object hay array

        // Tìm { hoặc [ đầu tiên → ] hoặc } cuối cùng
        int jsonStart = -1;
        char openChar = '{';
        char closeChar = '}';

        int objStart = trimmed.indexOf('{');
        int arrStart = trimmed.indexOf('[');

        if (objStart == -1 && arrStart == -1) {
            throw new AiException("No JSON object or array found in AI response: " + raw);
        }

        if (arrStart != -1 && (objStart == -1 || arrStart < objStart)) {
            jsonStart = arrStart;
            openChar = '[';
            closeChar = ']';
        } else {
            jsonStart = objStart;
        }

        int jsonEnd = trimmed.lastIndexOf(closeChar);
        if (jsonEnd <= jsonStart) {
            throw new AiException("Malformed JSON in AI response: " + raw);
        }

        return trimmed.substring(jsonStart, jsonEnd + 1);
    }
}
/*
```json\n{"matchScore": 75}\n```
         ↑                 ↑
    firstNewline+1=8    lastFence=27

→ substring(8, 27).strim() = {"matchScore": 75}

kết quả khi mà dùng substring(8, 27) thì kết quả ra là {"matchScore": 75}/n 
nhưng mà \n lúc này là ký tự xuống dòng thật (whitespace) trong Java string — và trim() xóa mọi whitespace ở đầu/cuối, bao gồm cả \n.
.trim() xóa khoảng trắng/newline thừa ở đầu cuối → còn lại JSON thuần.

objectMapper.readValue(cleaned, targetClass)
//                      ↑           ↑
//                  JSON string   Class muốn convert thành
Jackson đọc JSON string → map từng key vào field của class theo tên:
"matchScore"     →  field matchScore  = 75
"recommendation" →  field recommendation = "GOOD_FIT"

*/