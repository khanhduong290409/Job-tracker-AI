package com.jobtrackerai.cv.service;

import com.jobtrackerai.cv.dto.CvVersionResponse;
import com.jobtrackerai.cv.entity.CvParseStatus;
import com.jobtrackerai.cv.entity.CvVersion;
import com.jobtrackerai.cv.repository.CvVersionRepository;
import com.jobtrackerai.shared.exception.BadRequestException;
import com.jobtrackerai.shared.exception.ResourceNotFoundException;
import com.jobtrackerai.shared.storage.FileStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvServiceOwnershipTest {
    //@Mock - mockito tạo fake object thay thế dependency thật
    @Mock private CvVersionRepository cvVersionRepository;
    @Mock private FileStorageService fileStorageService;

    // @InjectMocks dùng constructor do @RequiredArgsConstructor sinh (inject 2 final field trên).
    // Field `self` không phải final → @InjectMocks không inject → null.
    // An toàn vì: các test ownership không gọi upload(), còn test validation upload()
    // throw exception trong validateUpload() trước khi đến self.parseCvAsync().
    @InjectMocks//@InjectMocks — Mockito tự tạo instance của class cần test và inject mock vào.
    private CvService cvService;

    // ── getById ───────────────────────────────────────────────────────────────

    @Test
    void getById_ownerCanAccess() {
        CvVersion cv = buildCv(1L, 10L);
        when(cvVersionRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(cv));

        CvVersionResponse response = cvService.getById(10L, 1L);

        assertThat(response.id()).isEqualTo(1L);
    }

    @Test
    void getById_wrongOwner_throwsNotFound() {
        when(cvVersionRepository.findByIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cvService.getById(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class)//→ Kiểm tra exception đúng loại ResourceNotFoundException.
                .hasMessageContaining("CV version not found");
    }

    // ── setDefault ────────────────────────────────────────────────────────────

    @Test
    void setDefault_ownerCanSetDefault() {
        CvVersion cv = buildCv(1L, 10L);
        when(cvVersionRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(cv));
        when(cvVersionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        CvVersionResponse response = cvService.setDefault(10L, 1L);

        assertThat(response.defaultCv()).isTrue();
        verify(cvVersionRepository).clearDefaultByUserId(10L); // bulk UPDATE trước khi set cái mới
        //verify kiểm tra xem mock này có được gọi đúng không
        //Nghĩa: "đảm bảo clearDefaultByUserId(10L) đã được gọi đúng 1 lần" — nếu không gọi → test FAIL.
    }

    @Test
    void setDefault_wrongOwner_throwsNotFound() {
        when(cvVersionRepository.findByIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cvService.setDefault(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(cvVersionRepository, never()).clearDefaultByUserId(anyLong()); // không được clear gì
        //never() — nếu ownership check fail thì không được gọi clearDefaultByUserId
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    void delete_ownerCanDelete() {
        CvVersion cv = buildCv(1L, 10L);
        when(cvVersionRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(cv));

        cvService.delete(10L, 1L);

        verify(cvVersionRepository).delete(cv); // @SQLDelete → UPDATE SET deleted_at = NOW()
    }

    @Test
    void delete_wrongOwner_throwsNotFound() {
        when(cvVersionRepository.findByIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cvService.delete(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(cvVersionRepository, never()).delete(any());
    }

    // ── upload validation ─────────────────────────────────────────────────────

    @Test
    void upload_wrongContentType_throwsBadRequest() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("image/png");

        assertThatThrownBy(() -> cvService.upload(10L, file, "My CV"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("PDF");
    }

    @Test
    void upload_fileTooLarge_throwsBadRequest() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("application/pdf");
        when(file.getSize()).thenReturn(6L * 1024 * 1024); // 6MB > giới hạn 5MB

        assertThatThrownBy(() -> cvService.upload(10L, file, "My CV"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("5MB");
    }

    @Test
    void upload_blankLabel_throwsBadRequest() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("application/pdf");
        when(file.getSize()).thenReturn(1024L);

        assertThatThrownBy(() -> cvService.upload(10L, file, "   "))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Label");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private CvVersion buildCv(Long id, Long userId) {
        CvVersion cv = new CvVersion();
        cv.setId(id);
        cv.setUserId(userId);
        cv.setLabel("Test CV");
        cv.setFileUrl("https://res.cloudinary.com/test/cv-uploads/abc123");
        cv.setFileName("cv.pdf");
        cv.setFileSize(1024L);
        cv.setParseStatus(CvParseStatus.COMPLETED);
        return cv;
    }
}
