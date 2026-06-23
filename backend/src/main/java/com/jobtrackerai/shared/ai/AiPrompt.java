package com.jobtrackerai.shared.ai;

public record AiPrompt(
        String systemPrompt,
        String userPrompt,
        double temperature,
        int maxTokens,
        boolean jsonMode
) {
    public static AiPrompt of(String systemPrompt, String userPrompt, double temperature, int maxTokens) {
        return new AiPrompt(systemPrompt, userPrompt, temperature, maxTokens, true);
    }
}
/*
AiPrompt là object chứa toàn bộ tham số để thực hiện một lần gọi Gemini API. 
systemPrompt
Hướng dẫn cho AI về vai trò và hành vi. AI đọc cái này trước để biết mình đang đóng vai gì:


"You are an experienced technical recruiter.
 Analyze the match between CV and Job Description.
 Output ONLY valid JSON. No markdown, no commentary."
userPrompt
Nội dung thực sự cần phân tích — dữ liệu đầu vào thay đổi theo từng request:


"CV: { ...parsedCvData... }
 Job Description: Backend Developer tại VNG..."

 temperature — double
Độ "sáng tạo" của AI, từ 0.0 đến 1.0:

Giá trị	Hành vi	Dùng khi
0.1	Rất ổn định, ít biến động	Parse CV, JD insight (cần nhất quán)
0.3	Cân bằng	CV-JD match
0.6+	Sáng tạo hơn	Draft email, interview prep

maxTokens — int
Giới hạn độ dài response. 1 token ≈ 0.75 từ tiếng Anh. Đặt giới hạn để:

Tránh response vô tận làm tốn tiền
Force AI trả lời ngắn gọn theo schema
jsonMode — boolean
Khi true → bảo Gemini chỉ trả về JSON thuần, không thêm markdown hay text giải thích. Giảm công JsonResponseParser phải xử lý.
*/