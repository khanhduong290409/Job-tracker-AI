package com.jobtrackerai.auth.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "app.jwt")// Spring tự map toàn bộ prefix app.jwt vào class:
@Validated
@Getter
@Setter
public class JwtProperties {

    @NotBlank
    private String secret;

    @Positive
    private int accessTokenExpirySeconds = 900;// 15 phút

    @Positive
    private int refreshTokenExpirySeconds = 604800;//7 ngày
    //giá trị thật của nó vẫn được lấy từ .env nhưng mà khi được set trong java như thế này
    //nếu trong .env không có giá trị giá trị trong java này thành giá trị default, tức là khi dùng ta sẽ lấy giá trị này

}
