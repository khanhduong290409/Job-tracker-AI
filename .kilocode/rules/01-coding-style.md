# 01. Coding Style

## Java / Backend

### Naming
- **Class**: PascalCase
  - Entity: noun (`Application`, `User`, `CvVersion`)
  - Service: noun + Service (`ApplicationService`, `AuthService`)
  - Controller: noun + Controller (`ApplicationController`)
  - Repository: noun + Repository (`ApplicationRepository`)
- **Method**: camelCase, verb-based (`createApplication`, `findByUserId`)
- **Variable**: camelCase
- **Constant**: UPPER_SNAKE_CASE
- **Package**: lowercase, no underscore (`com.jobtrackerai.application`)
- **DTO**: clear suffix
  - Request: `CreateApplicationRequest`, `UpdateApplicationRequest`
  - Response: `ApplicationResponse`, `ApplicationListResponse`
  - Filter: `ApplicationFilter`

### File Organization (per module)

Style: **đơn giản, không tách interface trừ khi cần**.

```
com.jobtrackerai.application/
├── ApplicationController.java
├── ApplicationService.java          # concrete @Service class
├── ApplicationRepository.java
├── Application.java                 # entity
├── ApplicationStatus.java           # enum
├── ApplicationStateMachine.java     # business logic helper
├── dto/
│   ├── CreateApplicationRequest.java
│   ├── UpdateApplicationRequest.java
│   ├── ApplicationResponse.java
│   ├── ApplicationFilter.java
│   └── ChangeStatusRequest.java
└── exception/
    └── InvalidStateTransitionException.java
```

**KHÔNG** tạo:
- `ApplicationServiceImpl.java` (concrete service đủ rồi)
- `ApplicationMapper.java` (mapping inline trong service)
- `ApplicationSpecifications.java` (dùng `@Query` JPQL)

### Ngoại lệ: AiService dùng interface

Vì có thể swap provider (Gemini → Grok), AI service dùng interface pattern:

```
com.jobtrackerai.ai/
├── AiService.java              # interface
├── GeminiAiService.java        # implementation
├── AiServiceConfig.java        # @Configuration để chọn bean
└── prompt/
    ├── PromptTemplate.java
    └── ...
```

### Layer Rules

- **Controller**: chỉ orchestrate. Nhận request, gọi service, trả response. KHÔNG có business logic.
- **Service**: chứa tất cả business logic. Transactions bắt đầu ở đây. Throw business exceptions.
- **Repository**: data access only. KHÔNG có business logic.
- **Entity**: persistence model. KHÔNG có business logic methods.
- **DTO**: pure data carrier. Dùng record cho immutable.

### Code Examples (THEO STYLE NÀY)

**Controller:**
```java
@RestController
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class ApplicationController {
    
    private final ApplicationService applicationService;
    private final SecurityUtils securityUtils;
    
    @PostMapping
    public ResponseEntity<ApiResponse<ApplicationResponse>> create(
            @Valid @RequestBody CreateApplicationRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        ApplicationResponse response = applicationService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationResponse>> getById(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        ApplicationResponse response = applicationService.getById(userId, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ApplicationResponse>>> list(
            @ModelAttribute ApplicationFilter filter,
            @PageableDefault(size = 20) Pageable pageable) {
        Long userId = securityUtils.getCurrentUserId();
        Page<ApplicationResponse> response = applicationService.list(userId, filter, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

**Service (concrete class, không interface):**
```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class ApplicationService {
    
    private final ApplicationRepository applicationRepository;
    private final CvVersionRepository cvVersionRepository;
    private final ApplicationStateMachine stateMachine;
    
    @Transactional
    public ApplicationResponse create(Long userId, CreateApplicationRequest request) {
        log.info("Creating application: userId={}, company={}", userId, request.companyName());
        
        // Validate CV version belongs to user
        if (request.cvVersionId() != null) {
            CvVersion cv = cvVersionRepository.findById(request.cvVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("CV version not found"));
            if (!cv.getUserId().equals(userId)) {
                throw new ForbiddenException("CV version does not belong to user");
            }
        }
        
        // Build entity
        Application application = new Application();
        application.setUserId(userId);
        application.setCompanyName(request.companyName());
        application.setPosition(request.position());
        application.setLocation(request.location());
        application.setJdContent(request.jdContent());
        application.setJdUrl(request.jdUrl());
        application.setSource(request.source());
        application.setAppliedDate(request.appliedDate());
        application.setCvVersionId(request.cvVersionId());
        application.setStatus(ApplicationStatus.APPLIED);
        application.setNotes(request.notes());
        
        Application saved = applicationRepository.save(application);
        return toResponse(saved);
    }
    
    public ApplicationResponse getById(Long userId, Long applicationId) {
        Application application = applicationRepository
            .findByIdAndUserIdAndDeletedAtIsNull(applicationId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        return toResponse(application);
    }
    
    public Page<ApplicationResponse> list(Long userId, ApplicationFilter filter, Pageable pageable) {
        Page<Application> applications = applicationRepository.findByFilters(
            userId,
            filter.status(),
            filter.source(),
            filter.search(),
            pageable
        );
        return applications.map(this::toResponse);
    }
    
    @Transactional
    public ApplicationResponse changeStatus(Long userId, Long applicationId, 
                                            ChangeStatusRequest request) {
        Application application = applicationRepository
            .findByIdAndUserIdAndDeletedAtIsNull(applicationId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        
        ApplicationStatus from = application.getStatus();
        ApplicationStatus to = request.newStatus();
        
        // Validate transition (throw exception nếu invalid)
        stateMachine.validateTransition(from, to);
        
        application.setStatus(to);
        Application saved = applicationRepository.save(application);
        return toResponse(saved);
    }
    
    /**
     * Map Entity → DTO. Inline trong service, không tạo Mapper class riêng.
     */
    private ApplicationResponse toResponse(Application app) {
        return new ApplicationResponse(
            app.getId(),
            app.getCompanyName(),
            app.getPosition(),
            app.getLocation(),
            app.getStatus().name(),
            app.getAppliedDate(),
            app.getSource(),
            app.getJdContent(),
            app.getJdUrl(),
            app.getNotes(),
            app.getCvVersionId(),
            app.getCreatedAt(),
            app.getUpdatedAt()
        );
    }
}
```

**Repository (dùng `@Query` JPQL, KHÔNG dùng Specification):**
```java
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    
    Optional<Application> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);
    
    @Query("""
        SELECT a FROM Application a 
        WHERE a.userId = :userId 
          AND a.deletedAt IS NULL
          AND (:status IS NULL OR a.status = :status)
          AND (:source IS NULL OR a.source = :source)
          AND (:search IS NULL 
               OR LOWER(a.companyName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(a.position) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<Application> findByFilters(
        @Param("userId") Long userId,
        @Param("status") ApplicationStatus status,
        @Param("source") String source,
        @Param("search") String search,
        Pageable pageable
    );
    
    long countByUserIdAndStatusAndDeletedAtIsNull(Long userId, ApplicationStatus status);
}
```

**Entity:**
```java
@Entity
@Table(name = "applications")
@Getter
@Setter
@NoArgsConstructor
@SQLDelete(sql = "UPDATE applications SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
public class Application {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "company_name", nullable = false)
    private String companyName;
    
    @Column(nullable = false)
    private String position;
    
    private String location;
    
    @Column(name = "jd_content", columnDefinition = "TEXT")
    private String jdContent;
    
    @Column(name = "jd_url")
    private String jdUrl;
    
    private String source;
    
    @Column(name = "applied_date")
    private LocalDate appliedDate;
    
    @Column(name = "cv_version_id")
    private Long cvVersionId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    @Column(name = "deleted_at")
    private Instant deletedAt;
}
```

**DTO (record cho immutable):**
```java
public record CreateApplicationRequest(
    @NotBlank @Size(max = 255) String companyName,
    @NotBlank @Size(max = 255) String position,
    @Size(max = 255) String location,
    @NotBlank @Size(min = 10, max = 50000) String jdContent,
    @Pattern(regexp = "^https?://.*") String jdUrl,
    @NotBlank String source,
    @PastOrPresent LocalDate appliedDate,
    Long cvVersionId,
    String notes
) {}

public record ApplicationResponse(
    Long id,
    String companyName,
    String position,
    String location,
    String status,
    LocalDate appliedDate,
    String source,
    String jdContent,
    String jdUrl,
    String notes,
    Long cvVersionId,
    Instant createdAt,
    Instant updatedAt
) {}

public record ApplicationFilter(
    ApplicationStatus status,
    String source,
    String search,
    LocalDate dateFrom,
    LocalDate dateTo
) {}
```

### State Machine (helper class trong module application)

```java
@Component
public class ApplicationStateMachine {
    
    private static final Map<ApplicationStatus, Set<ApplicationStatus>> TRANSITIONS = Map.of(
        ApplicationStatus.SAVED, 
            Set.of(ApplicationStatus.APPLIED, ApplicationStatus.WITHDRAWN),
        ApplicationStatus.APPLIED, 
            Set.of(ApplicationStatus.PHONE_SCREEN, ApplicationStatus.TECHNICAL_INTERVIEW, 
                   ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN),
        ApplicationStatus.PHONE_SCREEN, 
            Set.of(ApplicationStatus.TECHNICAL_INTERVIEW, ApplicationStatus.REJECTED, 
                   ApplicationStatus.WITHDRAWN),
        ApplicationStatus.TECHNICAL_INTERVIEW,
            Set.of(ApplicationStatus.ONSITE, ApplicationStatus.OFFER, 
                   ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN),
        ApplicationStatus.ONSITE,
            Set.of(ApplicationStatus.OFFER, ApplicationStatus.REJECTED, 
                   ApplicationStatus.WITHDRAWN),
        ApplicationStatus.OFFER,
            Set.of(ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, 
                   ApplicationStatus.WITHDRAWN)
        // ACCEPTED, REJECTED, WITHDRAWN: terminal
    );
    
    public void validateTransition(ApplicationStatus from, ApplicationStatus to) {
        Set<ApplicationStatus> allowed = TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new InvalidStateTransitionException(
                String.format("Cannot transition from %s to %s", from, to)
            );
        }
    }
}
```

### Exception Handling

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404)
            .body(ApiResponse.error("NOT_FOUND", e.getMessage()));
    }
    
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(ForbiddenException e) {
        return ResponseEntity.status(403)
            .body(ApiResponse.error("FORBIDDEN", e.getMessage()));
    }
    
    @ExceptionHandler(InvalidStateTransitionException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidTransition(InvalidStateTransitionException e) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.error("INVALID_STATE_TRANSITION", e.getMessage()));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        List<FieldError> errors = e.getBindingResult().getFieldErrors().stream()
            .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
            .toList();
        return ResponseEntity.badRequest()
            .body(ApiResponse.validationError("VALIDATION_ERROR", "Validation failed", errors));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(500)
            .body(ApiResponse.error("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}
```

### ApiResponse Wrapper

```java
public record ApiResponse<T>(
    boolean success,
    T data,
    String message,
    ErrorInfo error
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, null);
    }
    
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message, null);
    }
    
    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, null, new ErrorInfo(code, message, null));
    }
    
    public static <T> ApiResponse<T> validationError(String code, String message, List<FieldError> errors) {
        return new ApiResponse<>(false, null, null, new ErrorInfo(code, message, errors));
    }
}

public record ErrorInfo(String code, String message, List<FieldError> details) {}
public record FieldError(String field, String message) {}
```

### Lombok Usage

- ✅ `@Getter`, `@Setter`, `@RequiredArgsConstructor`, `@NoArgsConstructor`, `@Slf4j`
- ✅ `@Builder` cho complex DTO (nếu cần)
- ❌ Tránh `@Data` (gây vấn đề với JPA entity equals/hashCode)
- ❌ Tránh `@AllArgsConstructor` cho entity

### Common Imports

- Validation: `jakarta.validation.constraints.*`
- JPA: `jakarta.persistence.*`
- Spring: `org.springframework.*`
- DateTime: `java.time.*` (KHÔNG dùng `java.util.Date`)

---

## TypeScript / Frontend

### Naming
- **Component**: PascalCase, `ApplicationList.tsx`, `CreateApplicationForm.tsx`
- **Hook**: camelCase với `use` prefix, `useApplications.ts`
- **Util function**: camelCase
- **Constant**: UPPER_SNAKE_CASE
- **Type/Interface**: PascalCase
- **File**: kebab-case cho non-component, PascalCase cho component

### File Structure (per feature)
```
features/applications/
├── pages/
│   ├── ApplicationsListPage.tsx
│   ├── ApplicationDetailPage.tsx
│   └── CreateApplicationPage.tsx
├── components/
│   ├── ApplicationCard.tsx
│   ├── ApplicationStatusBadge.tsx
│   └── CreateApplicationForm.tsx
├── hooks/
│   └── useApplicationForm.ts
├── api/
│   ├── application-api.ts        # API functions
│   └── queries.ts                # React Query hooks
├── types.ts                       # TS types/interfaces
└── utils.ts                       # helpers
```

### Component Pattern
```typescript
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ApplicationCardProps {
  application: Application;
  onStatusChange?: (newStatus: ApplicationStatus) => void;
  className?: string;
}

export function ApplicationCard({ 
  application, 
  onStatusChange,
  className 
}: ApplicationCardProps) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h3 className="font-semibold">{application.companyName}</h3>
      <p className="text-sm text-gray-600">{application.position}</p>
      {/* ... */}
    </div>
  );
}
```

### API Function Pattern
```typescript
// features/applications/api/application-api.ts
import { apiClient } from '@/lib/api/axios';
import type { 
  Application, 
  CreateApplicationRequest, 
  ApplicationFilter 
} from '../types';

export const applicationApi = {
  list: async (filter: ApplicationFilter, page = 0, size = 20) => {
    const { data } = await apiClient.get('/applications', {
      params: { ...filter, page, size }
    });
    return data.data;
  },
  
  get: async (id: number) => {
    const { data } = await apiClient.get(`/applications/${id}`);
    return data.data;
  },
  
  create: async (request: CreateApplicationRequest) => {
    const { data } = await apiClient.post('/applications', request);
    return data.data;
  },
  
  update: async (id: number, request: Partial<CreateApplicationRequest>) => {
    const { data } = await apiClient.patch(`/applications/${id}`, request);
    return data.data;
  },
  
  delete: async (id: number) => {
    await apiClient.delete(`/applications/${id}`);
  },
  
  changeStatus: async (id: number, newStatus: ApplicationStatus, note?: string) => {
    const { data } = await apiClient.put(`/applications/${id}/status`, {
      newStatus,
      note
    });
    return data.data;
  },
};
```

### React Query Pattern (đơn giản, không nested key hierarchies)
```typescript
// features/applications/api/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationApi } from './application-api';

export function useApplications(filter: ApplicationFilter, page = 0, size = 20) {
  return useQuery({
    queryKey: ['applications', filter, page, size],
    queryFn: () => applicationApi.list(filter, page, size),
  });
}

export function useApplication(id: number) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationApi.get(id),
    enabled: !!id,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applicationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
```

### Type Definition
```typescript
// features/applications/types.ts
export type ApplicationStatus = 
  | 'SAVED' | 'APPLIED' | 'PHONE_SCREEN' | 'TECHNICAL_INTERVIEW' 
  | 'ONSITE' | 'OFFER' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface Application {
  id: number;
  companyName: string;
  position: string;
  location?: string;
  status: ApplicationStatus;
  appliedDate?: string;
  source: string;
  jdContent: string;
  jdUrl?: string;
  notes?: string;
  cvVersionId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationRequest {
  companyName: string;
  position: string;
  location?: string;
  jdContent: string;
  jdUrl?: string;
  source: string;
  appliedDate?: string;
  cvVersionId?: number;
  notes?: string;
}

export interface ApplicationFilter {
  status?: ApplicationStatus;
  source?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

### Imports Order
1. External libs (`react`, `axios`, etc.)
2. Internal absolute (`@/components/...`, `@/lib/...`)
3. Relative (`./...`, `../...`)
4. Types (with `import type`)
5. CSS (if any)

### Don'ts
- ❌ `any` type (use `unknown` if truly unknown)
- ❌ Default exports (prefer named)
- ❌ Class components (use function)
- ❌ Inline styles (use Tailwind)
- ❌ `console.log` in committed code

---

## Nguyên tắc viết logic ĐƠN GIẢN (ưu tiên dễ hiểu hơn "thông minh")

> Áp dụng cho MỌI đoạn code (Java & TypeScript). Mục tiêu: người đọc hiểu mà không cần vẽ sơ đồ. Khi có 2 cách cho cùng một kết quả, **chọn cách ít khái niệm hơn**, kể cả khi dài hơn vài dòng. Code được đọc nhiều lần hơn được viết.

### Quy tắc chung

1. **Ít trạng thái (state) nhất có thể.**
   Mỗi biến, mỗi cờ boolean là một thứ phải tự đồng bộ → nguồn bug. Trước khi thêm biến, hỏi: có suy ra được từ thứ đã có không? Thường 1 biến gộp thay được cho nhiều cờ rời rạc.

2. **Một đường đi (happy path) thẳng và phẳng.**
   Loại các case ngoại lệ bằng *early-return* ở đầu hàm, phần chính không lồng sâu. Tránh `if/else` lồng quá 2 tầng.

3. **Gộp các nhánh làm cùng một việc.**
   Nếu nhiều trường hợp cuối cùng dẫn tới cùng hành động, cho chúng đi chung một đoạn code, đừng nhân bản logic ra mỗi nhánh.

4. **Đặt tên theo *ý định*, không theo *cơ chế*.**
   Tên nói "làm gì / để làm gì" (`getCurrentUser`, `validateTransition`) dễ hiểu hơn tên mô tả thuật toán nội bộ.

5. **Dùng đúng công cụ sẵn có của ngôn ngữ/thư viện, không tự dựng lại.**
   Có abstraction cấp cao rồi thì dùng (vd: `async/await` thay vì tự ghép callback; method có sẵn của lib thay vì tự viết). Chỉ "xuống tay thủ công" khi thật sự cần.

6. **Một hàm = một nhiệm vụ.**
   Hàm dài/khó đặt tên gọn = dấu hiệu nên tách. Mỗi hàm nên giải thích được trong một câu.

7. **Chấp nhận "thừa thao tác vô hại" để đổi lấy đơn giản.**
   Nếu một cách viết hơi lặp/thừa nhưng không sai kết quả và dễ hiểu hơn nhiều, ưu tiên nó hơn cơ chế tối ưu nhưng rối.

8. **Tránh tối ưu sớm và "phòng xa" không cần thiết.**
   Không thêm tham số, lớp trừu tượng, config cho tình huống chưa xảy ra. Viết cho yêu cầu hiện tại.

9. **Comment giải thích "tại sao", không lặp lại "cái gì".**
   Code đã nói nó làm gì; comment dành cho lý do/quyết định/cạm bẫy mà code không tự nói được.

### Checklist trước khi commit một đoạn logic
- [ ] Có thể bỏ bớt biến trạng thái nào không?
- [ ] Có nhánh `if/else` nào đang làm cùng việc → gộp được không?
- [ ] Có chỗ nào tự dựng lại thứ ngôn ngữ/thư viện đã có sẵn không?
- [ ] Tên hàm/biến nói lên *ý định* chưa?
- [ ] Người mới đọc có hiểu trong 30 giây không?
