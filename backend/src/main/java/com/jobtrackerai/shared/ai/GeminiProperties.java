package com.jobtrackerai.shared.ai;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "app.gemini")
@Validated
@Getter
@Setter
public class GeminiProperties {

    @NotBlank
    private String apiKey;

    private String model = "gemini-1.5-flash";
}
