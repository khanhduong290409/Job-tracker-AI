package com.jobtrackerai.shared.ai;

public record AiResponse(
        String rawText,
        int tokensUsed,
        String modelUsed,
        long latencyMs
) {}

/*
rawText — chuỗi text thô Gemini trả về, chưa qua xử lý gì. Ví dụ Gemini có thể trả:
```json
{"matchScore": 85, "strengths": [...]}

Hoặc đôi khi trả thẳng không có fence:
{"matchScore": 85, "strengths": [...]}

`GeminiAiService` không tự parse — nó chỉ lấy text này và nhét vào `AiResponse.rawText`. Sau đó `JsonResponseParser` (File 7) mới strip fence và parse thành DTO. Tách ra như vậy để nếu parse lỗi thì biết rõ raw text ban đầu là gì để debug.
---
**`latencyMs`** — thời gian (milliseconds) từ lúc gửi HTTP request đến Gemini đến lúc nhận response. Đo bằng:

```java
long start = System.currentTimeMillis();
// ... gọi Gemini API ...
long latencyMs = System.currentTimeMillis() - start;
*/