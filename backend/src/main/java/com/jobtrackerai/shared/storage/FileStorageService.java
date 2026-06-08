package com.jobtrackerai.shared.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    /**
     * Lưu file vào storage, trả về fileUrl để lưu vào DB.
     * Dev: trả về filename (relative path). Prod: trả về Cloudinary URL.
     */
    String store(MultipartFile file, String filename);

    void delete(String fileUrl);

    // Dùng để đọc file (vd: PDFBox extract text từ CV)
    Resource load(String fileUrl);
}
