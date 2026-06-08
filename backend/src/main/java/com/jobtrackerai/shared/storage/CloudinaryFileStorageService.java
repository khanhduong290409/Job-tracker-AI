package com.jobtrackerai.shared.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryFileStorageService implements FileStorageService {

    private final Cloudinary cloudinary;

    @Override
    @SuppressWarnings("unchecked")
    public String store(MultipartFile file, String filename) {
        try {
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id",     filename,
                            "folder",        "cv-uploads",
                            "resource_type", "raw"
                    )
            );
            String secureUrl = (String) uploadResult.get("secure_url");
            log.info("Uploaded to Cloudinary: {}", secureUrl);
            return secureUrl;
        } catch (Exception e) {
            log.error("Failed to upload file to Cloudinary: {}", filename, e);
            throw new RuntimeException("Could not upload file to Cloudinary", e);
        }
    }

    @Override
    public void delete(String fileUrl) {
        // Phase 2: soft delete only → file giữ nguyên trên Cloudinary
        // Phase 7: implement xóa thật cho GDPR compliance
        log.debug("Cloudinary hard delete deferred to Phase 7. fileUrl: {}", fileUrl);
    }

    @Override
    public Resource load(String fileUrl) {
        // fileUrl là Cloudinary secure_url (HTTPS) → UrlResource đọc trực tiếp được
        // PDFBox sẽ gọi resource.getInputStream() để extract text
        try {
            return new UrlResource(fileUrl);//Resource là interface của Spring đại diện cho "thứ gì đó có thể đọc được"
            //UrlResource là class của Spring, bọc một URL thành đối tượng Resource để code dùng thống nhất
        } catch (MalformedURLException e) {
            throw new RuntimeException("Invalid file URL: " + fileUrl, e);
        }
    }
}
/*
SYNTAX METHOD UPLOAD():
upload(byte[], Map<String, Object> options) — nhận 2 tham số: dữ liệu file và map các option cấu hình.


ObjectUtils — class helper của Cloudinary SDK, cung cấp các method tiện ích.
.asMap("key1", val1, "key2", val2, ...) — tạo Map nhanh từ cặp key-value xen kẽ, thay vì phải viết:

Map<String, Object> opts = new HashMap<>();
opts.put("public_id", filename);
opts.put("folder", "cv-uploads");
opts.put("resource_type", "raw");

*/
