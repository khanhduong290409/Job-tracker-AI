package com.jobtrackerai.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.google")
@Getter
@Setter
public class GoogleProperties {

    private String clientId;// đây là mã định danh app của mình trên google cloud console ( mình tự tạo trên google cloud)
    private String clientSecret;// mật khẩu của app
    private String redirectUri;//url mà google redirect user về sau khi user đồng ý login("http://localhost:5173/auth/callback")
}
