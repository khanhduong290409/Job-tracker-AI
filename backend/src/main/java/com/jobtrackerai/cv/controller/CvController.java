package com.jobtrackerai.cv.controller;

import com.jobtrackerai.cv.dto.CvDetailResponse;
import com.jobtrackerai.cv.dto.CvParsedData;
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
import org.springframework.web.bind.annotation.RequestBody;
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

    // Chi tiết 1 CV kèm parsed data — cũng dùng cho frontend polling parse status (mỗi 3s khi PROCESSING)
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CvDetailResponse>> getDetail(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        CvDetailResponse data = cvService.getDetail(userId, id);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // US-CV-002: user sửa lại dữ liệu CV đã parse (thay thế toàn bộ parsed_data)
    @PatchMapping("/{id}/parsed-data")
    public ResponseEntity<ApiResponse<CvDetailResponse>> updateParsedData(
            @PathVariable Long id,
            @RequestBody CvParsedData parsedData) {
        Long userId = securityUtils.getCurrentUserId();
        CvDetailResponse data = cvService.updateParsedData(userId, id, parsedData);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Chạy lại parse (vd CV bị FAILED do AI down) — 202 vì parse chạy bất đồng bộ
    @PostMapping("/{id}/reparse")
    public ResponseEntity<ApiResponse<CvDetailResponse>> reparse(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        CvDetailResponse data = cvService.reparse(userId, id);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.success(data));
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
