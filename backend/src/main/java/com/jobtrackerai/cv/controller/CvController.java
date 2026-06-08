package com.jobtrackerai.cv.controller;

import com.jobtrackerai.cv.dto.CvVersionResponse;
import com.jobtrackerai.cv.service.CvService;
import com.jobtrackerai.shared.dto.ApiResponse;
import com.jobtrackerai.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cv")
@RequiredArgsConstructor
public class CvController {

    private final CvService cvService;
    private final SecurityUtils securityUtils;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CvVersionResponse>> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam("label") String label) {
        Long userId = securityUtils.getCurrentUserId();
        CvVersionResponse data = cvService.upload(userId, file, label);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(data));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CvVersionResponse>>> list() {
        Long userId = securityUtils.getCurrentUserId();
        List<CvVersionResponse> data = cvService.list(userId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Dùng cho frontend polling parse status (mỗi 3s khi status = PROCESSING)
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CvVersionResponse>> getById(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        CvVersionResponse data = cvService.getById(userId, id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<ApiResponse<CvVersionResponse>> setDefault(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        CvVersionResponse data = cvService.setDefault(userId, id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        cvService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
