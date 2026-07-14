package com.jobtrackerai.shared.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Infrastructure gửi email qua SMTP (giống shared/ai là hạ tầng dùng chung, không
 * chứa business logic). Bọc {@link JavaMailSender} mà Spring Boot tự tạo từ
 * spring.mail.* trong application.yaml.
 *
 * send() chạy @Async("emailTaskExecutor") — gửi ở luồng nền: latency SMTP không
 * chặn caller, và lỗi gửi KHÔNG làm rollback transaction của caller (vd dispatcher
 * đã tạo notification + set sent_at). Email là kênh phụ → fail-soft (log, không throw).
 */
@Service
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;//interface của spring dùng để gửi mail theo giao thức SMTP
    private final String fromAddress;//Nó là "cái máy gửi thư" — bạn đưa nội dung email, nó lo việc kết nối tới mail server và bắn đi.

    public MailService(JavaMailSender mailSender,
                       @Value("${app.mail.from}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Async("emailTaskExecutor")
    public void send(String to, String subject, String body) {//to:người nhận, subject:tiêu đề, body:nội dung text
        if (!StringUtils.hasText(to)) {//check nội dung text truyền vào có rỗng không
            log.warn("Skip sending email: recipient is blank (subject={})", subject);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            //object đóng gói email text thuần, chọn nó vì reminder chi cần text, không cần html đính kèm
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent: to={}, subject={}", to, subject);
        } catch (MailException e) {
            // Fire-and-forget: gửi email là kênh phụ, lỗi SMTP (config sai, server down...)
            // không được làm hỏng việc đã làm ở caller. Log rồi bỏ qua.
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
