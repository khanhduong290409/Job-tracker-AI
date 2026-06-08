package com.jobtrackerai.shared.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.jobtrackerai.shared.storage.StorageProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class CloudinaryConfig {

    private final StorageProperties storageProperties;

    @Bean
    public Cloudinary cloudinary() {
        StorageProperties.CloudinaryProperties props = storageProperties.getCloudinary();
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", props.getCloudName(),
                "api_key",    props.getApiKey(),
                "api_secret", props.getApiSecret(),
                "secure",     true
        ));
    }
}
