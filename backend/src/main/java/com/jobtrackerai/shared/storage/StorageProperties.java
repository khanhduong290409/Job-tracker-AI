package com.jobtrackerai.shared.storage;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "app.storage")
@Validated
@Getter
@Setter
public class StorageProperties {

    private final CloudinaryProperties cloudinary = new CloudinaryProperties();

    @Getter
    @Setter
    public static class CloudinaryProperties {

        @NotBlank
        private String cloudName;

        @NotBlank
        private String apiKey;

        @NotBlank
        private String apiSecret;
    }
}
