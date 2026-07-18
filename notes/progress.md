# Progress Log

Nhật ký tiến độ project Job-tracker-AI. Update sau mỗi phase/milestone.

Format: ngày, phase đang làm, what's done, what's next, notes ngắn.

---

## 2026-07-19 (2) — Phase 7C (Deploy) — chuẩn bị code/config XONG (Vercel + Render + Neon)

**User chốt stack: Frontend → Vercel · Backend → Render (Docker) · DB → Neon (Postgres). KHÔNG deploy Redis.** Phần code/config phía mình lo được đã xong; phần còn lại là user thao tác dashboard theo `docs/deployment.md`.

- **Redis bỏ được:** grep toàn `backend/src/main` KHÔNG có `@Cacheable/@CacheEvict/@CachePut` (chỉ 1 comment trong `CacheConfig`). `RedisCacheManager` bean tạo nhưng không ai gọi → Redis vô dụng runtime. App start OK không cần Redis. Chỉ tắt actuator Redis health indicator ở prod để `/actuator/health` không DOWN.
- **`application.yaml` — 3 sửa cho cloud:** (1) `server.port: ${PORT:8080}` (Render inject PORT). (2) datasource url thêm `${DB_PARAMS:}` (mặc định rỗng; Neon cần `?sslmode=require`). (3) prod profile thêm `management.health.redis.enabled: false`. *(Gặp lỗi typo lồng dư `redis.redis` → IDE báo unknown property → sửa.)*
- **`backend/Dockerfile` + `.dockerignore`:** multi-stage `maven:3.9-eclipse-temurin-17` → `eclipse-temurin:17-jre-alpine`, `mvn clean package -DskipTests`, `-XX:MaxRAMPercentage=75.0`. Dùng image maven (không `./mvnw`) tránh lỗi CRLF. **Bài học:** build đầu (có `dependency:go-offline`) rớt daemon (rpc EOF) vì go-offline ngốn RAM lúc máy đang chạy IDE/app → **bỏ go-offline**, để `package` tự tải dep. Và `docker build ... | tail` khiến exit code lấy của `tail` (=0) che lỗi build thật — phải đọc output.
- **`frontend/vercel.json`:** rewrite `/(.*)` → `/index.html` cho React Router (refresh deep-link không 404).
- **`docs/deployment.md`:** runbook đầy đủ — bảng env vars chính xác cho Render (SPRING_PROFILES_ACTIVE=prod, DB_*, DB_PARAMS, JWT_SECRET bắt buộc, GOOGLE_*, GEMINI_MODEL=gemini-2.5-flash, CLOUDINARY_*, APP_CORS_ALLOWED_ORIGINS, MAIL_* optional) + Vercel (VITE_API_BASE_URL gồm `/api/v1`, VITE_GOOGLE_CLIENT_ID, VITE_APP_NAME) + thứ tự Neon→Render→Vercel (phụ thuộc chéo: quay lại sửa CORS + GOOGLE_REDIRECT_URI với URL Vercel) + Google Console redirect URI + smoke test checklist. FE tự dựng `redirect_uri=${window.location.origin}/auth/callback`.
- **Memory:** lưu [[project-deploy-stack]].

**CÒN LẠI 7C:** user tự thao tác dashboard (Neon → Render → Vercel → cập nhật chéo → smoke test). **Sau 7C: 7B-3 README + screenshots (LÀM CUỐI CÙNG).** **Chưa commit 7C.**

---

## 2026-07-19 — Phase 7B (Polish) — 7B-1 (fill-zero TimeSeries) + 7B-2 (UX states) XONG

**Phase 7B bắt đầu. Chia 3 bước: 7B-1 fill-zero TimeSeries · 7B-2 UX states đồng bộ · 7B-3 README+screenshots. User chốt thứ tự: 7C Deploy làm TRƯỚC, 7B-3 README làm SAU CÙNG (sau khi xong hết). Verify: `tsc -p tsconfig.app.json` PASS · `eslint` 0 error · `npm run build` PASS (2854 modules).**

- **7B-1** `analytics/components/TimeSeriesChart.tsx` — thêm helper `fillGaps(points, interval)`: backend `GROUP BY period` chỉ trả mốc CÓ dữ liệu → giữa 2 mốc thưa recharts nối thẳng thành đường phẳng giả (VD "Ngày": 3 đơn/3 ngày rời → đường phẳng y=1). Fix: chèn mốc count=0 cho mọi bước trống TRONG [mốc đầu, mốc cuối] bằng date-fns `eachDayOfInterval`/`eachWeekOfInterval({weekStartsOn:1})`/`eachMonthOfInterval` (each* khớp mốc vì backend đã `date_trunc` canh sẵn: tuần=thứ 2, tháng=ngày 1) + tra `Map<period,count>` `?? 0`. **Chỉ fill phần GIỮA** vì `TimeSeriesResponse` không trả from/to → không biết ranh đầu/cuối thật (mà phần đó cũng không hiển thị). Guard `points.length < 2` return thẳng. Fix ở FE, không đụng SQL.
- **7B-2** UX states — tạo `components/ui/query-states.tsx`: 3 presentational component `LoadingState`(spinner `Loader2` lucide + "Đang tải..."), `ErrorState`(text đỏ + nút **Thử lại** optional gọi `refetch`), `EmptyState`(message bắt buộc). Adopt: **ApplicationListPage** + **CvListPage** + **SettingsPage** (đủ loading/error+retry/empty; destructure thêm `refetch` từ useQuery hook) · **ApplicationDetailPage** + **CvDetailPage** (đồng bộ loading = LoadingState, GIỮ nhánh not-found + link quay lại vì not-found retry vô nghĩa). `CvDetailPage.PageShell` đổi `<p>`→`<div>` để chứa LoadingState (div) hợp lệ HTML. Đặt ở `components/ui/` vì primitive dùng xuyên feature. KHÔNG thêm dep (Loader2 đã có).
- **CÒN LẠI 7B-3 (làm SAU CÙNG):** `README.md` hoàn chỉnh (mô tả/tech stack/prerequisites/setup/run dev+prod/architecture/known issues) + screenshots (user chụp, bỏ `docs/screenshots/`).

**Next: 7C Deploy.** Khuyến nghị đã chốt (xem handoff): deploy live 1 nền tảng (Railway hoặc Render) + `backend/Dockerfile`; bỏ frontend Dockerfile (FE static); docker-compose full-stack optional. Trọng tâm 7C: CORS prod + OAuth redirect URI + env prod + Flyway trên Postgres cloud. **Commit 7B-1+2 (chưa push).**

---

## 2026-07-18 (2) — Phase 7A (Analytics) — ĐÓNG + ĐÃ COMMIT `fd8a7f5`

**User tự chạy end-to-end test trên browser → PASS. Phase 7A đóng hoàn toàn (code + verify SQL thật + eyeball chart + commit).**

- **SQL verify PASS (rủi ro lớn nhất của 7A):** `docker compose up -d` + `mvnw spring-boot:run` + `npm run dev` → login → `/analytics`. 5 chart đều render CÓ DATA → toàn bộ query `AnalyticsRepository` (JPQL group/count + native `date_trunc` time-series/heatmap + native subquery `avgResponseTimeDays` join 2 mốc APPLIED) **chạy thật không lỗi**. "Phản hồi TB 2.5 ngày" hiện ra = subquery đúng.
- **Đối chiếu plan (data test: 3 đơn):** Overview 5 ô (3/3/0/0%/2.5 ngày) · Funnel Đã nộp 1 / PV điện thoại 2 / PV kỹ thuật 1 (đếm theo history "từng đạt" — D-018) · Sources ITviec/Khác/TopDev mỗi cái 1 · Heatmap cụm xanh Th6-7. Khớp hết.
- **2 điểm làm rõ khi user review lại (đáng nhớ):**
  1. **TimeSeries sparse (caveat, KHÔNG bug):** repo `GROUP BY period` chỉ trả mốc CÓ đơn (mốc trống không thành dòng); FE ([TimeSeriesChart.tsx:127](../frontend/src/features/analytics/components/TimeSeriesChart.tsx#L127)) vẽ thẳng `data.points`, KHÔNG fill mốc 0 → recharts nối thẳng các điểm thưa → ở interval "Ngày" thành đường phẳng y=1 (3 đơn ở 3 ngày khác nhau). Trông như "ngày nào cũng 1 đơn". Muốn thật hơn: fill-zero cho mốc trống (như heatmap) — để 7B nếu cần. Khác Heatmap: FE tự sinh đủ 365 ô nên ngày trống hiện xám đúng.
  2. **Heatmap: 1 ô = 1 NGÀY**, 1 cột = 1 tuần (7 ô dọc, thứ 2→CN). Bằng chứng: `week.map((day)=>...)` mỗi ô + tooltip `title` = `dd/MM/yyyy: X lần đổi trạng thái`. Màu: 0→xám `#eef1f4`, 4 bậc xanh ≥1/≥3/≥5/≥7.
- **Commit `fd8a7f5` "Phase 7A - Analytics (overview, funnel, time-series, sources, activity heatmap)"** — 23 file, 1667 insertions: BE `analytics/` (8 file + test) + FE `features/analytics/` (Bước 6-13) + `routes.tsx` + `ProtectedLayout.tsx` + comment học tập `AiAnalysis.java` + notes. **CHƯA push.**
- **Bug commit đã fix:** commit đầu (`672d323`) dính ký tự `@` đầu message vì gõ here-string PowerShell `@'...'@` trong **Bash tool** (Git Bash = POSIX shell, không hiểu `@'`) → `@` lọt vào literal. Amend bằng heredoc `<<'EOF'` → `fd8a7f5`. **Đúng bài học đã ghi 2026-07-07: Bash tool dùng heredoc, PowerShell tool mới dùng `@'...'@`.**

**Next: Phase 7B — Polish** (chưa bắt đầu, đang plan). Sau đó 7C Deploy. US-005 tech-stack-demand vẫn defer (stretch).

---

## 2026-07-18 — Phase 7A (Analytics) — FRONTEND CODE HOÀN THÀNH (Bước 11-13). tsc+eslint+build PASS. Chỉ còn test end-to-end + commit.

**Code nốt Bước 11-13 → TOÀN BỘ frontend 7A xong. Verify: `tsc -p tsconfig.app.json` PASS · `npm run lint` 0 error (chỉ còn 1 warning cũ `incompatible-library` ở CreateApplicationPage — không liên quan) · `npm run build` PASS (2853 modules, 1.65s).**

- **Bước 11** `components/SourcesChart.tsx` (US-004) — horizontal bar theo nguồn (cấu trúc y hệt FunnelChart: 1 hue xanh, `LabelList` count, custom tooltip). Bar = count (backend đã sort giảm dần), tooltip thêm offers + conversionRate. **KHÔNG dual-axis** cho conversionRate (skill dataviz cấm — anti-pattern #1). Tự tạo `SOURCE_LABELS: Record<ApplicationSource,string>` (form hiện render enum thô, chưa có map dùng chung — chưa nâng lên shared vì YAGNI). Chiều cao động `Math.max(rows.length*44, 160)`.
- **Bước 12** `components/ActivityHeatmap.tsx` (US-006) — grid CSS thuần kiểu GitHub (recharts không hợp heatmap). FE tự dựng 365 ngày: `end=today`, `start=startOfWeek(subDays(end,364), {weekStartsOn:1})`, `eachDayOfInterval` → chunk 7 (`toWeeks`). Tra count qua `Map<yyyy-MM-dd, count>` (backend chỉ trả ngày count>0). Màu 4 bậc sequential blue + xám cho 0. Nhãn tháng tràn phải qua ô trống. Tooltip = `title` HTML gốc (365 ô, custom tooltip quá nặng). **Lỗi lint gặp:** React Compiler `react-hooks/immutability` cấm gán lại `let lastMonth` trong `.map()` lúc render → sửa thành map thuần so tháng với tuần liền trước (index i-1); tháng tăng đơn điệu qua tuần nên tương đương.
- **Bước 13** `pages/AnalyticsPage.tsx` + route `/analytics` (routes.tsx) + link header icon `BarChart3` lucide (ProtectedLayout, cạnh chuông+settings). Page chỉ dàn khung (`max-w-6xl` rộng hơn `max-w-3xl` các trang khác vì có chart+heatmap): Overview(full) → TimeSeries(full) → Funnel+Sources(grid 2 cột lg) → Heatmap(full). Mỗi section tự fetch → page không giữ state chung.

**⚠️ CÒN LẠI DUY NHẤT — test end-to-end + commit (user tự làm sáng 2026-07-19):**
1. `docker compose up -d` → `mvnw spring-boot:run`. **ĐÂY LÀ LẦN ĐẦU SQL của `AnalyticsRepository` (JPQL + native `date_trunc`) THỰC SỰ CHẠY** — `AnalyticsServiceTest` mock repo, `mvnw compile` không validate JPQL → lỗi query (nếu có) chỉ lộ lúc app start / gọi endpoint có data. Rủi ro thật, có thể phải fix backend.
2. `npm run dev` → login → `/analytics` (icon 📊 header) → kiểm 5 section + đổi metric/interval + hover tooltip + heatmap ô/nhãn tháng/legend. (Đây là bước "render & look" skill dataviz yêu cầu — CHƯA eyeball chart lần nào.)
3. Fix nếu lỗi.
4. **Commit cả Phase 7A**: BE `analytics/` (8 file, từ 07-15) + FE `analytics/` (Bước 6-13) + sửa routes.tsx/ProtectedLayout.tsx + 2 comment học tập (`AiAnalysis.java`, `FunnelChart.tsx`, `TimeSeriesChart.tsx`, `ActivityHeatmap.tsx`) + notes.

**Sau 7A:** 7B Polish + 7C Deploy (chưa bắt đầu). US-005 tech-stack-demand vẫn defer (stretch). **Chưa commit gì.**

---

## 2026-07-17 — Phase 7A (Analytics) — FRONTEND Bước 6-10 XONG (tsc PASS), dừng trước Bước 11

**Làm tiếp phần frontend 7A. Review lại Bước 6 (đã đúng) rồi code Bước 7-10. Mỗi bước `tsc -p tsconfig.app.json --noEmit` PASS, EXIT=0. CHƯA eyeball chart thật (defer sang Bước 13 khi có trang + route + backend chạy — cũng là lúc verify SQL backend thật).**

- **Bước 6** `types.ts` — REVIEW LẠI: mirror khớp 100% 5 DTO. Đã kiểm 4 điểm dễ sai: union `ApplicationStatus`/`ApplicationSource` đủ giá trị; `avgResponseTimeDays` Double→`number|null`; **`source` khai non-nullable AN TOÀN** vì `Application.source` là `@Column(nullable=false)`; tên param khớp controller. Không sửa gì.
- **Bước 7** `api/analytics-api.ts` + `api/queries.ts` — 5 hàm GET unwrap `.data.data!`; 5 hook `useQuery` (analytics toàn chỉ-đọc, KHÔNG mutation). `time-series`/`activity` đưa `params` vào query key → mỗi filter 1 cache entry. `staleTime = 5 phút` (khác `ai/` dùng Infinity vì ai cache theo hash backend; analytics không cache backend). Truyền cả object params kể cả field undefined — axios tự bỏ field undefined.
- **Bước 8** `components/OverviewCards.tsx` — 5 ô (tổng đơn/đang theo dõi/offer/tỉ lệ offer/phản hồi TB), tự fetch `useOverview`, loading=skeleton `animate-pulse`, lỗi=banner đỏ. `StatCard` sub-component, `delta?` optional (chỉ 2/5 ô có so-tháng). `avgResponseTimeDays==null → "—"` (không phải "0.0 ngày"). Format % + đơn vị ở FE, số thô ở backend.
- **Bước 9** `components/FunnelChart.tsx` — horizontal bar (`BarChart layout="vertical"`, KHÔNG dùng `<Funnel>` trapezoid), **1 hue xanh `#2a78d6`** cho mọi stage (bar length đã tải magnitude → màu không cần phân biệt; skill dataviz "sequential=one hue"). Tái dùng `APPLICATION_STATUS_CONFIG` cho nhãn VN. `LabelList` số đơn cuối thanh, tooltip tỉ lệ chuyển. Guard `every(count===0)` → empty state. **Đã LOAD skill `dataviz`** — chốt palette light-mode: fill `#2a78d6`, axis ink `#898781`, grid `#e1e0d9` (app hiện CHỈ light-mode, component cũ không có `dark:` → không tự thêm dark).
- **Bước 10** `components/TimeSeriesChart.tsx` — LineChart, 2 bộ nút `SegmentedControl<T>` generic (metric: đơn/phỏng vấn · interval: ngày/tuần/tháng) trong `useState`. `date-fns` `parseISO`+`format` (lần đầu project dùng): tháng→`MM/yyyy`, ngày/tuần→`dd/MM`. 1 đường 1 màu không legend. `dot={false}`+`activeDot r=4`, `strokeWidth 2`. from/to để trống → backend default 6 tháng.

**CÒN LẠI 7A — Bước 11-13:**
- **Bước 11** `SourcesChart` (US-004, BarChart theo nguồn: count + tỉ lệ chuyển). Dữ liệu `SourceAnalysisResponse` đã sort giảm dần theo count. Cân nhắc: bar count + hiện conversionRate (label/tooltip). Nhãn nguồn tiếng Việt — CHECK xem có `APPLICATION_SOURCE` label map chưa (giống status-meta), chưa có thì tự map gọn.
- **Bước 12** `ActivityHeatmap` (US-006, grid CSS tự dựng kiểu GitHub, recharts không hợp heatmap). Backend chỉ trả ngày có count>0 → FE tự sinh lưới ngày trống. Màu theo bậc (sequential blue ramp `palette.md`: step 100→700).
- **Bước 13** `AnalyticsPage` gộp 5 section + route `/analytics` + link header (gear/chart icon `lucide-react` trong `ProtectedLayout`, cạnh chuông+settings). **Đây là lúc chạy end-to-end**: FE test trên browser (cần Docker+backend+login) → verify 5 chart hiển thị + **verify SQL backend thật** (JPQL/native chưa chạy lần nào) → fix nếu lỗi → commit CẢ Phase 7A (BE + FE).

**Ghi chú:** user thêm comment học tập tiếng Việt vào `FunnelChart.tsx` (`.every()`) + `AiAnalysis.java` (result JSONB) — comment-only, gộp commit sau. **Chưa commit gì.** **Next session: Bước 11 SourcesChart.**

---

## 2026-07-15 — Phase 7A (Analytics) — BACKEND core-5 HOÀN THÀNH (compile + 7/7 test PASS)

**Phase 7 bắt đầu. Chốt chia 3 milestone tuần tự: 7A Analytics → 7B Polish → 7C Deploy.** User chọn làm Analytics trước. Scope Analytics: **core 5 story (US-001/002/003/004/006), DEFER 005 tech-stack-demand** làm stretch cuối (phức tạp: aggregate JSONB `ai_analyses` + phụ thuộc nhiều đơn đã AI-parse).

**Quyết định chốt trước khi code (D-018):** "offer" đếm theo **"TỪNG đạt OFFER" từ `application_status_history`** (không phải current status IN (OFFER,ACCEPTED)) — nhất quán 1 định nghĩa offer toàn dashboard (overview card + funnel + sources đều dùng history), không sót ca offer-rồi-từ-chối/rút. User đã hỏi kỹ chỗ này → đổi từ current-status sang history.

**BE core-5 XONG (5 file, module mới `analytics/`, KHÔNG migration/bảng mới — aggregate trên bảng có sẵn):**
- **DTO ×5** `analytics/dto/`: `OverviewResponse`(+MonthComparison) · `FunnelResponse`(+FunnelStage) · `TimeSeriesResponse`(+Point) · `SourceAnalysisResponse`(+SourceStat) · `ActivityResponse`(+ActivityDay). Output thuần → KHÔNG `@JsonIgnoreProperties`. `comparedToLastMonth` để String sẵn dấu ("+15%"/"+1"); `avgResponseTimeDays` Double nullable.
- **`AnalyticsRepository`** (14 method): JPQL cho count/group (tự lọc soft-delete qua @SQLRestriction) + **native SQL** cho time-series/heatmap (cần `date_trunc(:interval,...)`; native BỎ QUA @SQLRestriction → TỰ thêm `a.deleted_at IS NULL`). Theta-join JPQL `FROM ApplicationStatusHistory h, Application a WHERE h.applicationId=a.id` vì status_history/timeline_events không có user_id (applicationId là Long thuần, không map @ManyToOne). `avgResponseTimeDays` = native subquery (applied_at = MIN changed_at to_status=APPLIED; first_response = MIN changed_at from_status=APPLIED).
- **`AnalyticsService`** `@Transactional(readOnly=true)`: map `List<Object[]>` → DTO, tính offerRate/conversion/so-tháng, merge 2 nguồn heatmap (`Map.merge(...,Long::sum)`). Validate mềm metric/interval (giá trị lạ → default applications/week). Default range: time-series 6 tháng, heatmap 1 năm. Ranh giới tháng dùng UTC (khớp changedAt=Instant.now()). Guard chia 0 mọi rate. Helper `toLocalDate`(java.sql.Date)/`toLong`(Number → nhận cả BigInteger/Long từ native).
- **`AnalyticsController`** 5 GET `/api/v1/analytics/{overview,funnel,time-series,sources,activity}`. userId TỪ SecurityUtils (không nhận client). `@DateTimeFormat(iso=DATE)` cho param from/to. Bám đúng contract docs/03 §Analytics.
- **`AnalyticsServiceTest`** 7 test (mock repository, không đụng DB): offerRate+so-tháng, empty-data no-NPE, funnel fill-missing+guard-chia-0, sources conversion+sort, time-series default+mapping, interviews routing, heatmap merge. Lỗi gặp: `List.of(new Object[]{...})` 1 phần tử bị suy `List<Object>` → fix `List.<Object[]>of(...)`.

**Verify:** `mvnw compile` PASS · `mvnw test -Dtest=AnalyticsServiceTest` → **7/7 PASS (EXIT=0)**. ⚠️ **CHƯA verify SQL thật** (JPQL/native chỉ lộ lỗi lúc app khởi động + query cần data thật) — làm khi có FE test end-to-end hoặc test REST riêng.

**CÒN LẠI 7A — Frontend (Bước 6-13, chưa làm), dùng recharts ^3.8.1 + date-fns ĐÃ CÓ SẴN (không thêm dep):**
- Bước 6 `features/analytics/types.ts` (mirror 5 DTO) · Bước 7 `api/analytics-api.ts`+`queries.ts` (5 GET + hooks)
- Bước 8 `OverviewCards` (US-001) · Bước 9 `FunnelChart` (US-002, recharts) · Bước 10 `TimeSeriesChart` (US-003, LineChart, đổi interval) · Bước 11 `SourcesChart` (US-004, BarChart) · Bước 12 `ActivityHeatmap` (US-006, grid CSS tự dựng — recharts không hợp heatmap)
- Bước 13 `AnalyticsPage` + route `/analytics` + link header
- **Trước khi viết chart (9-12) LOAD skill `dataviz`** để màu/layout nhất quán.

**Quyết định khác:** 1 trang `/analytics` gộp hết (không tách Dashboard vs Analytics như frontend-spec). Heatmap chỉ trả ngày có hoạt động (count>0), FE tự vẽ ô trống.

**Chưa commit gì.** **Next session: Frontend Bước 6.**

---

## 2026-07-14 (3) — Phase 6 ĐÃ COMMIT → ĐÓNG hoàn toàn

**Toàn bộ Phase 6 đã commit ở `e6d8d70` "Phase 6 - Email Integration (preferences + reminder email + AI draft)"** (BE File 1-13 + FE File 14-17 + notes). `git status` **clean**. Các dòng "CHƯA commit" ở những entry phía dưới là viết trước lúc commit → nay lỗi thời (giữ làm lịch sử).

**Next: Phase 7 — Analytics + Polish + Deploy** (chưa bắt đầu). Đang đọc `docs/01-features.md` + `docs/08-user-stories.md` để chốt scope + plan.

---

## 2026-07-14 (2) — Phase 6: TEST CUỐI PASS → PHASE 6 ĐÓNG

**User đã đăng ký Mailtrap (điền `MAIL_USERNAME`/`MAIL_PASSWORD` vào `.env`) + chạy test cuối trên browser → OK.** Chốt Phase 6 hoàn thành cả code lẫn test.

**Ghi chú làm rõ trong lúc test (đáng nhớ):**
- **Nút "Mở trong ứng dụng mail" (`mailto:`) bấm không thấy gì** = KHÔNG phải bug. `mailto:` mở app mail MẶC ĐỊNH của OS; máy user (Windows, dùng Edge) chưa có mail client desktop + trình duyệt chưa đăng ký Gmail làm protocol handler → im. Cách dùng thực tế: (1) đăng ký Gmail làm handler trong Edge/Chrome (icon ◆◆ ở address bar khi đang MỞ Gmail), hoặc (2) dùng nút **Copy nội dung** rồi dán vào Gmail. Chức năng chính (AI soạn nháp) chạy tốt. Gửi thẳng qua Gmail = option 2 (Gmail API) đã defer.
- **Timing dispatcher** (giải thích lại cho user, xem `ReminderJobs.java:34`): `initialDelay=60s` + `fixedDelay=15p`. Từ lúc bật app chỉ **~60 giây** là quét lần đầu (KHÔNG phải 15 phút); 15 phút là chu kỳ lặp giữa các lần sau. `fixedDelay` đếm từ lúc job trước *kết thúc* (không chồng lần). Test nhanh = backdate reminder due → restart → chờ ~60s.

**Chưa commit.** **Next: commit toàn bộ Phase 6 (BE File 1-13 + FE File 14-17 + notes) → sang Phase 7 (Analytics + Polish + Deploy).**

---

## 2026-07-14 — Phase 6: FE File 15-17 XONG → CODE PHASE 6 HOÀN THÀNH (chỉ còn test cuối)

**Làm nốt 3 file FE cuối, `tsc` + `eslint` (0 error) + `npm run build` (built 3.17s) đều PASS.**

- **FE File 15** `features/email/components/EmailDraftSection.tsx` — nhúng `ApplicationDetailPage` (sau `ReminderSection`). Chọn template (union literal `EmailTemplateKey`) + custom instructions (maxLength 500 khớp `@Size`) → bấm **Soạn nháp** (`useDraftEmail` mutation) → **seed local state từ `onSuccess`** (subject/body/toEmail/tone) để user **sửa được** → nút **Copy nội dung** (`navigator.clipboard`, try/catch fail-soft) + **Mở trong ứng dụng mail** (`Button asChild` bọc `<a mailto:>`, chỉ encode subject/body, để nguyên địa chỉ email). `toEmail` là **input sửa được** (đơn chưa gắn HR → null → user tự nhập) = khe nối cho Gmail-send tương lai. `draftErrorMessage` phân biệt 503 (AI down) vs message backend. Đổi nhãn nút "Soạn nháp"→"Soạn lại" khi đã có nháp.
- **FE File 16** module `features/settings/` (types + api + queries): `types.ts` mirror `UserProfileResponse` (`UserProfile` + `NotificationPreferences`; `NotificationPreferencesRequest` = alias của `NotificationPreferences` vì full-replace cùng shape) · `settings-api.ts` `getProfile` (GET /users/me) + `updateNotificationPreferences` (PUT) · `queries.ts` `useProfile` (query key `['profile']` không tham số — luôn là "me") + `useUpdateNotificationPreferences` (mutation, **`setQueryData` ghi thẳng cache** vì PUT trả full profile, khỏi refetch — pattern như `useUpdateParsedData`).
- **FE File 17** `features/settings/pages/SettingsPage.tsx` + route `/settings` (trong ProtectedLayout) + **link header** (gear icon `lucide-react` `Settings` cạnh chuông trong `ProtectedLayout`). 2 công tắc in-app/email: **toggle bám server state** (`checked={prefs.inApp}`, không local state) → bật/tắt **lưu ngay** gửi PUT cả 2 field. `Switch` tự chế `<button role="switch" aria-checked>` (không thêm dep). Không optimistic — pending thì disable + "Đang lưu...", lỗi thì cache giữ nguyên (toggle tự về đúng).

**PHASE 6 CODE HOÀN THÀNH** — BE File 1-13 + FE File 14-17. **Chưa commit gì.**

**CÒN LẠI DUY NHẤT — test cuối** (chờ user đăng ký Mailtrap): cần **Docker up** + **Mailtrap creds** (`MAIL_USERNAME/PASSWORD` trong `.env`) + **`GEMINI_API_KEY`**. Backdate 1 reminder due → restart backend → verify (a) notification (chuông) + (b) email (Mailtrap) đúng theo preferences · manual test draft AI (soạn email HR) · toggle Settings on/off · `contextLoads` cũng xanh khi Docker up.

**Next session:** user tự chạy test cuối sau khi có Mailtrap creds. Nếu PASS → commit Phase 6 → ĐÓNG → Phase 7 (Analytics + Polish + Deploy).

---

## 2026-07-13 — Phase 6: BACKEND HOÀN THÀNH (File 1-13, verify PASS) + FE File 14

**Verify File 1-8 (session trước để nợ):** `mvnw clean compile` → **BUILD SUCCESS** (108 files) — dep `spring-boot-starter-mail` resolve OK, `User.notificationPreferences` JSONB mapping hợp lệ. Chạy riêng `ReminderDispatchServiceTest` xác nhận đúng nợ đã ghi: 2/5 ĐỎ do NPE `userRepository` null (dispatcher inject thêm mà test chưa stub) — không phải lỗi lạ.

**BE File 9-13 (mảng C — AI soạn nháp email gửi HR):**
- **File 9** `email/dto/` — `EmailDraftRequest{EmailTemplateKey templateKey (@NotNull), String customInstructions (@Size max 500)}` + `EmailDraftResponse{subject, body, tone, toEmail}` (`@JsonIgnoreProperties`). Quyết định: templateKey để **enum** (input client → validate chặt, giá trị lạ = 400); tone/toEmail để **String** (output AI tolerant). `toEmail` KHÔNG từ AI — service điền sau (khe nối cho Gmail-send tương lai).
- **File 10** `email/entity/EmailTemplateKey` — enum 3 giá trị FOLLOW_UP_AFTER_APPLY / THANK_YOU_AFTER_INTERVIEW / STATUS_INQUIRY, mỗi giá trị kèm `description` (tiếng Anh) nhét vào prompt. Enum có field+constructor. KHÔNG lưu DB (draft stateless).
- **File 11** `email/service/EmailDraftService` — `draft(appId, userId, request)`: ownership `findByIdAndUserIdAndDeletedAtIsNull` (404 nếu không sở hữu, chặn trước khi tốn quota) + load User (tên ký email) → `buildPrompt` Template 5 (temp 0.6, maxTokens 1000; helper `nvl`→"none", `daysSinceApply`) → `AiService.generate` + `jsonParser.parse(EmailDraftResponse)` → tạo record mới điền `toEmail` từ `contactPerson.email`. **Stateless: KHÔNG lưu DB, KHÔNG cache, KHÔNG @Transactional** (khác AiAnalysisService — draft user sinh nhiều lần rồi sửa, cache phản tác dụng).
- **File 12** `email/controller/EmailController` — `POST /api/v1/applications/{id}/emails/draft`, pattern y hệt AiController (SecurityUtils lấy userId, @Valid body, ApiResponse bọc). POST vì có body + sinh nội dung tốn AI.
- **File 13** `EmailDraftServiceTest` (3: fill toEmail từ contact / no-contact→null / not-owned→404 + verifyNoInteractions AiService; dùng **JsonResponseParser thật** để test parse+fill) + **FIX `ReminderDispatchServiceTest`**: thêm `@Mock UserRepository`+`MailService`, stub `findByIdAndDeletedAtIsNull` trả user có prefs; thêm 2 case: `emailPrefOff` (tắt email vẫn notify + set sentAt), `userDeleted` (bỏ cả 2 kênh nhưng **vẫn set sentAt** tránh kẹt due). 5→7 test.

**Verify BE:** `mvnw clean compile` PASS · `mvnw test -Dtest=EmailDraftServiceTest,ReminderDispatchServiceTest` → **10/10 PASS** · full suite **75/76** — 1 đỏ duy nhất `BackendApplicationTests.contextLoads` do `Connection to localhost:5433 refused` (Docker/Postgres chưa bật, integration test cần DB thật) — **KHÔNG phải regression** (stacktrace dừng ở flywayInitializer/entityManagerFactory, không đụng code Phase 6). Sẽ xanh khi `docker compose up -d`.

**FE File 14** (`features/email/` types+api+queries — `tsc --noEmit` PASS):
- `types.ts` — `EmailTemplateKey` **union literal** (input client → type-safe, khác field enum-like AI để string) + `EMAIL_TEMPLATE_LABELS` (`Record<EmailTemplateKey,string>` nhãn VN, ép khai báo đủ) + `EmailDraftRequest` (customInstructions optional) + `EmailDraftResponse` (mọi field `| null` bám backend).
- `api/email-api.ts` — `emailApi.draft(appId, body)` → POST, unwrap `.data.data!`.
- `api/queries.ts` — `useDraftEmail(appId)` **mutation** (hành động sinh nội dung mỗi lần bấm, backend stateless nên không cache/invalidate — khác useJdInsight là query vì backend cache theo hash).

**CÒN LẠI Phase 6:**
- FE **File 15** `EmailDraftSection.tsx` nhúng `ApplicationDetailPage` (chọn template + custom instructions → bấm soạn → form sửa subject/body + nút Copy + link `mailto:{toEmail}?subject=&body=`; toEmail null → user tự điền) · **File 16** `features/settings/` (hoặc user) types+api+queries preferences (GET /users/me, PUT /users/me/notification-preferences) · **File 17** `SettingsPage.tsx` + route `/settings` + link header (toggle in-app/email).
- **Test cuối** (gộp phần defer Phase 5): cần **Docker up** + **Mailtrap creds** (`MAIL_USERNAME/PASSWORD` trong `.env`). Backdate 1 reminder due trong DB → restart backend → xác nhận dispatcher (a) tạo notification (chuông) + (b) gửi email (xem Mailtrap) đúng theo preferences. + manual test draft AI (cần GEMINI_API_KEY) + toggle Settings. `contextLoads` cũng xanh khi Docker up.

**Chưa commit gì** (BE File 1-13 + FE File 14). **Next session: FE File 15.**

---

## 2026-07-12 — Phase 6: Email Integration (scope 1b) — BẮT ĐẦU, backend File 1-8 xong (CHƯA compile/test)

**Chốt scope sau khi tư vấn kỹ (user phân vân → mình phân tích trade-off):** chọn **1b — Lean + SMTP**. Gồm 3 mảng: (A) notification preferences · (B) kênh EMAIL cho reminder qua SMTP · (C) AI soạn nháp email follow-up cho HR (chỉ gen text, user tự copy/`mailto:` gửi — KHÔNG gửi server-side). **KHÔNG làm Gmail API** (đọc/sync/send-as-user).

**Vì sao KHÔNG option 2/3 (Gmail API):** `gmail.readonly` (đọc/sync) là *restricted scope* cần Google security assessment — nặng, ít giá trị học. `gmail.send` (gửi as-user) là *sensitive scope*, dùng được ở Testing mode (không cần domain/verify) nhưng cần luồng OAuth thứ 2 (offline access + refresh token) + AesEncryptor (project CHƯA có) + build MIME. Quyết định: **defer option 2 sang SAU khi xong project** (nếu dư thời gian). Đã xác nhận với user: thêm option 2 sau **gần như thuần additive** — cột `users.gmail_refresh_token`/`gmail_connected_at` docs có sẵn (dù migration thật chưa có), luồng login KHÔNG bị đụng, Send chỉ là endpoint mới ăn theo draft. 3 "khe nối" phải giữ NGAY ở 1b: (1) draft response có `toEmail`, (2) UI draft là form sửa được, (3) code trong module `email/`.

**Dependency (đã hỏi + user OK):** thêm `spring-boot-starter-mail`.

**Backend File 1-8 XONG (chưa compile — File 2 thêm dep, cần Maven reload/download; chưa chạy `mvnw`):**
- **File 1** `V8__add_notification_preferences.sql` — ALTER `users` ADD `notification_preferences JSONB NOT NULL DEFAULT '{"inApp":true,"email":true}'`. (DB thật KHÔNG có `notification_preferences`/`gmail_refresh_token` như docs schema — migration lệch docs từ trước; users thật chỉ có `gmail_connected` boolean.)
- **File 2** `pom.xml` (+`spring-boot-starter-mail`) + `application.yaml` (`spring.mail.*` host/port/user/pass, default **Mailtrap** `sandbox.smtp.mailtrap.io:2525` + starttls; `app.mail.from`) + `.env.example` (section MAIL_* + hướng dẫn Mailtrap).
- **File 3** `shared/mail/MailService.java` — wrapper `JavaMailSender`, `@Async("emailTaskExecutor")` (bean có sẵn từ Phase 0) `send(to,subject,body)` dùng `SimpleMailMessage`, **fail-soft** (catch `MailException`, log, không throw) + guard `to` rỗng. `from` đọc bằng `@Value("${app.mail.from}")`, constructor thủ công.
- **File 4** `user/entity/NotificationPreferences.java` (record `{boolean inApp, boolean email}` + `defaults()`=(true,true) + `@JsonIgnoreProperties`) + sửa `User.java` thêm field `@JdbcTypeCode(SqlTypes.JSON)` `columnDefinition="jsonb"` **khởi tạo = defaults()** (tránh INSERT null vi phạm NOT NULL — Hibernate include cột dù field null).
- **File 5** `user/dto/` — `UserProfileResponse` (tách khỏi auth `UserResponse` để không đổi shape login; kèm `notificationPreferences`) + `NotificationPreferencesRequest` (`Boolean`+`@NotNull` cả 2, `toPreferences()`).
- **File 6** `UserRepository` +`findByIdAndDeletedAtIsNull` · `user/service/UserService.java` (`getMe`, `updateNotificationPreferences`, helper `findActiveOrThrow`→404).
- **File 7** `user/controller/UserController.java` — `GET /api/v1/users/me` + `PUT /api/v1/users/me/notification-preferences` (pattern ReminderController + SecurityUtils; authenticated mặc định).
- **File 8** `ReminderDispatchService.dispatchDueReminders()` (sửa) — inject `UserRepository`+`MailService`; mỗi reminder: `findByIdAndDeletedAtIsNull(userId).ifPresent` → `prefs.inApp` mới tạo notification, `prefs.email` mới `mailService.send`; **`setSentAt` LUÔN chạy** (ngoài ifPresent) tránh kẹt due. Helper `buildEmailBody` (description||title + "— Job Tracker AI").

**⚠️ NỢ cần làm ở File 13:** `ReminderDispatchServiceTest` (5 test Phase 5) giờ ĐỎ — dispatcher load `userRepository` nhưng test chưa stub → notification không tạo. Phải thêm stub `findByIdAndDeletedAtIsNull` trả user có prefs + thêm case pref tắt kênh.

**CÒN LẠI Phase 6:**
- BE **File 9** `email/dto/` (`EmailDraftRequest{templateKey, customInstructions}` + `EmailDraftResponse{subject, body, tone, toEmail}`) · **File 10** `email/entity/EmailTemplateKey` enum (FOLLOW_UP_AFTER_APPLY, THANK_YOU_AFTER_INTERVIEW, STATUS_INQUIRY) · **File 11** `email/service/EmailDraftService` (ownership app `findByIdAndUserId` → prompt **Template 5** docs/04 temp 0.6 maxTokens 1000 → `AiService`+`JsonResponseParser` → điền `toEmail` từ `contactPerson.email`; stateless không lưu DB) · **File 12** `email/controller/EmailController` `POST /api/v1/applications/{id}/emails/draft` · **File 13** `EmailDraftServiceTest` + FIX `ReminderDispatchServiceTest`.
- FE **File 14** `features/email/` types+api+queries (mutation draft) · **File 15** `EmailDraftSection.tsx` nhúng `ApplicationDetailPage` (chọn template + custom instructions → form sửa subject/body + Copy + `mailto:`) · **File 16** `features/settings/` (hoặc user) types+api+queries preferences · **File 17** `SettingsPage.tsx` + route `/settings` + link header (toggle in-app/email).

**Test cuối Phase 6 (gộp luôn phần defer Phase 5):** cần **Mailtrap creds** trong `.env` (MAIL_USERNAME/PASSWORD). Backdate 1 reminder due trong DB → restart backend → xác nhận dispatcher (a) tạo notification (chuông) + (b) gửi email (xem ở Mailtrap) đúng theo preferences. + manual test draft AI + toggle Settings.

**Next session:** (1) Maven reload + `mvnw clean compile` verify File 1-8 (nhất là dep mail + User JSONB mapping). (2) Code File 9-13 (mảng C + fix test). (3) File 14-17 FE. Chưa commit gì.

---

## 2026-07-11 — Phase 5: đọc code + manual test xong → commit FE → ĐÓNG (code)

**User đã đọc hết code Phase 5 (BE+FE) + manual test phần reminder trên UI.** Trong lúc đọc có thêm comment tiếng Việt học tập vào 4 file backend (Notification.java, NotificationService.java, ReminderDispatchService.java, ReminderService.java) — **comment-only, không đổi logic** — gộp luôn vào commit FE.

**Làm rõ 1 hiểu nhầm (đáng ghi):** "gửi notification" KHÔNG thiếu. Mắt xích gửi = `ReminderDispatchService.dispatchDueReminders()` (scheduled fixedDelay 15', initialDelay 60s): quét reminder due (`scheduled_at <= now`, `sent_at IS NULL`, chưa dismiss) → `NotificationService.create()` → set `sent_at`. Đã verify end-to-end qua psql hôm 07-06 (log `Reminders dispatched: 1`). Lý do chưa "thấy" trên browser: reminder tạo qua UI luôn @Future → dispatcher chưa đụng. Muốn quan sát phải backdate reminder trong DB + restart backend (60s initialDelay), hoặc chèn thẳng notification vào DB để test riêng chuông FE.

**Quyết định:** test end-to-end đầy đủ (dispatcher → notification → badge) + retest kỹ **gộp làm khi Phase 6 (Email) xong** — Phase 6 cùng đụng notification flow (thêm kênh EMAIL), test 1 lượt cho gọn thay vì test 2 lần.

**Commit:** FE Phase 5 (File 12-15: `features/notifications/` + `features/reminders/` + sửa ProtectedLayout + ApplicationDetailPage) + 4 file backend comment + notes.

**Next: Phase 6 — Email Integration.** Đọc `docs/08-user-stories.md` epic Email + `docs/04-ai-integration.md` (nếu email dùng template) trước khi plan. Cột `channels` JSONB trong reminders đã giữ sẵn cho EMAIL; NotificationType/kênh mở rộng từ đây.

---

## 2026-07-07 — Phase 5: FRONTEND HOÀN THÀNH (File 12-15) + commit backend

**Backend Phase 5 đã commit** `9d1ad17` "Phase 5 (backend) - Reminders & Notifications" (23 file, kèm notes). Lưu ý nhỏ: commit đầu `c9e0797` lỡ dính ký tự `@` vào message do gõ nhầm here-string PowerShell (`@'...'@`) trong Bash tool → đã `--amend` bằng heredoc `<<'EOF'` thành `9d1ad17`. Bài học: Bash tool dùng heredoc, PowerShell tool mới dùng `@'...'@`.

**Frontend Phase 5 (File 12-15) XONG — tsc + eslint + `npm run build` PASS (1976 modules, 0 lỗi).**
- **File 12** `features/notifications/` — types (`Notification`, `NotificationListParams`, `type` để string tolerant) + api (list paginated, unreadCount, markRead, markAllRead) + queries (`useNotifications`, `useUnreadCount` poll 30s vô điều kiện, 2 mutation invalidate `['notifications']`).
- **File 13** `NotificationBell.tsx` + nhúng `ProtectedLayout` — chuông + badge unread (cap "9+") + dropdown 10 notif gần nhất, click item → markRead + `navigate(linkUrl)`. Dropdown tự chế bằng overlay `fixed inset-0` click-outside (không thêm dep popover). Thêm `<header>` sticky vào ProtectedLayout (trước đó chỉ có `<Outlet/>`, chưa có navbar).
- **File 14** `features/reminders/` — types (`Reminder`, `CreateReminderRequest` KHÔNG có reminderType — backend gán CUSTOM, `REMINDER_TYPE_LABELS` + `getReminderTypeLabel` fallback) + api (list trả **mảng thuần** không paginate, create/dismiss/delete) + queries (`useReminders`, 3 mutation).
- **File 15** `ReminderSection.tsx` (component riêng, nhận `applicationId`) + nhúng `ApplicationDetailPage` sau khối "Đổi trạng thái" — form useState tạo CUSTOM (title/scheduledAt datetime-local/description) + list + nút Tắt (dismiss) / Xóa (delete confirm). `new Date(local).toISOString()` gửi backend, `min=now` chặn quá khứ (2 lớp với backend @Future).

**Sửa giữa chừng (feedback user):** File 13 ban đầu mình tự vẽ inline SVG bell vì tưởng project không có icon lib (chỉ check thư mục `components/ui/`, thấy dùng emoji). User chỉ ra **`lucide-react ^1.16.0` đã có sẵn** (CallbackPage đã dùng `Loader2`) → đổi sang `<Bell/>` lucide. **Bài học ghi nhớ: trước khi tự chế UI primitive, grep `package.json` + tìm chỗ đã dùng, đừng suy từ mỗi thư mục `ui/`.**

**CHƯA làm:** (a) manual test trên browser (chuông poll/đọc/mark-all, tạo/tắt/xóa reminder, badge cập nhật) — cần backend chạy + login. (b) commit FE Phase 5 + update handoff/progress (đang ghi). (c) Nhắc kiểm tra `line-clamp-2` ở NotificationBell hiển thị đúng (cần Tailwind ≥3.3).

**Next (session sau):** manual test FE Phase 5 trên browser → fix nếu có → commit FE → Phase 5 ĐÓNG → Phase 6 (Email Integration).

---

## 2026-07-06 — Phase 5: CHẠY BACKEND THẬT — verify V7 migration + scheduler end-to-end PASS

**Chạy backend lần đầu sau khi code xong BE Phase 5 (Docker + `mvnw spring-boot:run`) để bắt lỗi runtime (kiểu bug transaction/flush Phase 4). KẾT QUẢ: sạch, không có lỗi.**

- **V7 migration apply mới OK:** DB đang ở V6 → Flyway `Migrating to version "7"` → `Successfully applied 1 migration, now at v7`. Bảng `reminders` + `notifications` tạo đủ (đúng cột, 2 partial index `idx_reminders_due`/`idx_notifications_user_unread`, check constraint `chk_reminder_type` 5 giá trị).
- **App start OK** (~12s), health `{"status":"UP"}`. Chỉ 1 WARN lành tính (generated security password — đã biết từ Phase 0).
- **Dispatcher end-to-end PASS (test thủ công):** chèn 1 reminder CUSTOM `sent_at=NULL`, `scheduled_at` quá khứ cho user 1 → restart app → 60s sau (initialDelay) dispatcher chạy, log `Reminders dispatched: 1`. Verify DB: (a) `reminder.sent_at` ĐƯỢC GHI (update flush đúng — **không kẹt như bug Phase 4** parseCvAsync); (b) `notifications` có 1 dòng `type=REMINDER`, title/message copy đúng, `link_url=null` (CUSTOM ko gắn app), `metadata` JSONB `{reminderId, reminderType}` đúng. `@Transactional` trong `ReminderDispatchService` gọi qua bean proxy `ReminderJobs` commit atomically cả insert notification + update reminder. Đã dọn data test (reminders/notifications về 0).
- **Chưa test qua REST** (endpoints notification list/unread-count/markRead + reminder CRUD) — cần JWT; để lại làm chung lúc integration với FE. Service layer đã có 16/16 unit test, controller mỏng.

**Lưu ý vận hành khi chạy backend:** DB thật dùng user `postgres` / db `jobtracker` / host port **5433** (không phải 5432/jobtracker như một số note cũ) — theo `.env`. Docker Desktop phải chạy trước. **KHÔNG `taskkill java.exe` giữa lúc `spring-boot:run` đang compile** → làm `target/classes` khuyết → `ClassNotFoundException: BackendApplication` khi chạy lại; fix bằng `mvnw clean compile` rồi chạy lại.

**Next:** Frontend File 12 — `features/notifications/` types + api + queries (list, unread-count polling, markRead, markAllRead). Rồi File 13-15. Commit backend Phase 5 (có thể commit trước hoặc sau FE).

---

## 2026-07-04 — Phase 5: Reminders & Notifications — BẮT ĐẦU

**Scope chốt (2 câu hỏi user chọn Recommended):**
- Reminder types: `CUSTOM` (tay) + `FOLLOW_UP_AFTER_APPLY` (7d còn APPLIED) + `STATUS_STALE` (14d không đổi status). Defer `INTERVIEW_REMINDER` + `TAKE_HOME_DEADLINE`.
- Channel: **IN_APP only**. Email defer Phase 6, push out-of-scope. Cột `channels` JSONB giữ sẵn.
- Delivery: polling (D-006), không WebSocket. Notification preferences (US-NOTIF-005) defer.

**Kiến trúc:** 2 module mới `reminder/` + `notification/`. `ReminderJobs` scheduled 2 việc: (1) generator (daily 08:00 cron, quét applications sinh reminder auto, dedup 1/loại/app chưa dismissed, guard terminal status) + (2) dispatcher (fixedDelay 15', reminder tới hạn → NotificationService.create → set sent_at). Reminder module inject `ApplicationRepository` read-only (precedent: ai module import CvVersionRepository). `@EnableScheduling` qua shared/config. KHÔNG trang /reminders riêng (user chốt bỏ) — quản lý reminder trong ApplicationDetailPage + bell notification.

**Plan file (15 file):**
- BE (11 file, XONG ✅): (1) V7 migration · (2) ReminderType+Reminder entity · (3) ReminderRepository · (4) reminder DTOs · (5) ReminderService (CRUD custom + ownership) · (6) Notification entity+repo+dto · (7) NotificationService · (8) ReminderDispatchService (generator+dispatcher) · (9) SchedulingConfig + ReminderJobs · (10) 2 controller · (11) 3 test class
- FE (4 file, chưa làm): (12) notifications types+api+queries · (13) NotificationBell → ProtectedLayout · (14) reminders types+api+queries · (15) reminder section trong ApplicationDetailPage

**BACKEND HOÀN THÀNH (File 1-11) — compile PASS, test 16/16 PASS.**
- 2 module mới `reminder/` + `notification/`. `ReminderJobs` (@Scheduled): generator cron `0 0 8 * * *` (FOLLOW_UP + STATUS_STALE, dedup once-per-app-per-type, terminal guard) + dispatcher `fixedDelay 900_000ms` (initialDelay 60s) bắn reminder due → NotificationService.create → set sent_at.
- Thêm 2 query vào `ApplicationRepository`: `findByStatusAndAppliedDateLessThanEqual` (FOLLOW_UP) + `findStaleApplications` (STATUS_STALE, NOT IN terminal). @SQLRestriction tự lọc soft-deleted.
- `@EnableScheduling` qua `shared/config/SchedulingConfig`.
- Endpoint: `GET/POST /api/v1/reminders`, `PUT /reminders/{id}/dismiss`, `DELETE /reminders/{id}` · `GET /notifications` (unreadOnly+paginate), `GET /notifications/unread-count` (thêm ngoài contract, cho badge poll), `PUT /notifications/{id}/read`, `PUT /notifications/read-all`.
- Test: ReminderServiceOwnershipTest 7 + NotificationServiceOwnershipTest 4 + ReminderDispatchServiceTest 5 = 16/16 PASS.

**Quyết định kỹ thuật cần nhớ:**
- Dedup reminder auto = "once per app per type ever" (`existsByApplicationIdAndReminderType`, KHÔNG kèm DismissedFalse) — tránh spam khi user dismiss. Trade-off: STATUS_STALE không nhắc lại lần 2 sau 14 ngày nữa. Chấp nhận cho demo.
- STATUS_STALE dùng `updatedAt` làm proxy cho "không đổi status" — thực chất là "không đụng gì tới đơn 14 ngày" (updatedAt reset khi sửa bất kỳ field). Nếu cần chính xác theo status → soi status_history.changed_at.
- Cột `channels` JSONB KHÔNG map trong Reminder entity (Phase 5 chỉ IN_APP, DB default lo) — Phase 6 map khi thêm EMAIL.
- Dispatcher 1 transaction cho cả batch — 1 reminder lỗi → cả batch rollback. Nếu cần cô lập lỗi → tách tx per-reminder (self-injection).
- NotificationType enum 1 value REMINDER (Phase 5 mọi notif từ reminder). metadata serialize fail-soft (log + null, không chặn tạo notif).

**CHƯA làm:** (a) chạy backend thật verify migration V7 apply + scheduler khởi động (đề xuất làm trước FE, bắt lỗi runtime kiểu transaction/flush như Phase 4). (b) Frontend File 12-15. (c) commit.

**Next:** File 12 — `features/notifications/` types + api + queries (list, unread-count polling, markRead, markAllRead).

---

## 2026-07-02 (2) — Phase 4: Feature GẮN CV vào application (bật cv-jd-match) + manual test AI flow

**Bối cảnh:** manual test phát hiện `cv-jd-match` không test được qua UI — application không có cách gắn CV (backend `create` nhận `cvVersionId` nhưng form không có ô chọn; `update` không có field này). Làm feature gắn CV NGAY trước Phase 5 (user chốt, không dồn Phase 5).

**Done (5 file):**
- Backend: `UpdateApplicationRequest` thêm `cvVersionId`; `ApplicationService.update()` xử lý kèm **check ownership** (tái dùng pattern `findByIdAndUserId` như create). Compile PASS.
- Frontend: `types.ts` `UpdateApplicationRequest` bỏ `cvVersionId` khỏi Omit (giờ update được); `CreateApplicationPage` thêm dropdown CV (useCvList, optional); `ApplicationDetailPage` thêm dropdown gắn/đổi CV (controlled bám `app.cvVersionId`, gọi useUpdateApplication). tsc PASS, lint 0 error (1 warning cũ watch).

**Quyết định:**
- Dropdown liệt kê MỌI CV, nhãn "(chưa parse xong)" cho CV chưa COMPLETED — không chặn cứng, match tự báo lỗi 400 nếu chọn CV chưa xong.
- **Chưa hỗ trợ gỡ CV (unlink)** — PATCH null=giữ nguyên; chọn "-- Chưa gắn CV --" ở detail không mutate. Defer (hiếm dùng, tránh phá pattern PATCH).
- DetailPage select controlled bám server state (`app.cvVersionId`), không dùng useState riêng.

**Manual test PASS:** tạo app gắn CV, đổi CV ở detail; cv-jd-match chạy (điểm + breakdown + strengths/gaps/suggestions), force re-analyze OK; jd-insight OK; extract-jd auto-fill OK. AI analyses lưu bảng `ai_analyses` (cache theo inputHash); extract-jd stateless không lưu.

**Note DB test:** app id=4 từng patch tay `cv_version_id=11` để test nhanh trước khi có UI — giờ đổi qua UI được.

**Next:** commit feature này. Rồi Phase 4 coi như ĐÓNG (mọi flow AI + edit parsed data + gắn CV đều PASS) → sang Phase 5 (Reminders & Notifications).

---

## 2026-07-02 — Phase 4: MANUAL TEST flow AI → fix 3 bug → CV auto-parse chạy thông

**Manual test upload CV → phát hiện & fix 3 vấn đề (parse trước đó treo PENDING mãi):**

1. **Bug transaction (nghiêm trọng, code):** `parseCvAsync` thừa kế `@Transactional(readOnly=true)` cấp class → các `self.markProcessing/saveParseSuccess/saveParseFailure` (propagation REQUIRED) join vào tx readOnly → Hibernate FlushMode MANUAL → **không flush → status không bao giờ ghi** (CV kẹt PENDING, FE poll vô hạn). Xác nhận: DB `updated_at` == `created_at`, log không có UPDATE nào. Stack trace cho thấy parseCvAsync chạy trong TransactionInterceptor. **Fix:** `@Transactional(propagation = Propagation.NOT_SUPPORTED)` trên `parseCvAsync` → 3 method self.* mỗi cái tự mở tx read-write mới.

2. **Gemini quota (config/.env):** `gemini-2.0-flash` free tier `limit: 0` → 429 RESOURCE_EXHAUSTED mọi call. Test trực tiếp key: ListModels OK, `gemini-2.5-flash` → HTTP 200 (còn quota), `2.0-flash`/`2.5-pro` → 429. **Key KHÔNG hỏng**, chỉ cần đổi model. **Fix:** `.env` `GEMINI_MODEL=gemini-2.5-flash`. (Default trong application.yaml vẫn `gemini-2.0-flash` — chưa đổi, `.env` override.)

3. **Thinking cắt cụt JSON (code):** `gemini-2.5-flash` là model "thinking" — tiêu output tokens cho suy luận (`thoughtsTokenCount`) đẩy JSON vượt `maxTokens=4000` → response cắt cụt → parse fail. **Fix:** (a) `GeminiAiService` thêm `thinkingConfig{thinkingBudget:0}` vào GenerationConfig (tắt thinking toàn cục — mọi tác vụ đều xuất JSON deterministic temp thấp); (b) `CvService` nâng maxTokens parse CV 4000 → 8192.

**Test:** thêm 3 Mockito test (saveParseSuccess→COMPLETED, saveParseFailure→FAILED+error, cv-deleted→no-save) vào `CvServiceOwnershipTest` → **14/14 PASS**. Lưu ý: bug transaction chỉ manual-test bắt được (runtime flush), Mockito chỉ khóa logic set status.

**Manual test PASS:** upload CV → PROCESSING → COMPLETED, xem/sửa parsed data OK.

**Dọn DB:** xóa sạch cv_versions test (9 dòng, gồm cả soft-deleted) → 0.

**Next:** commit US-CV-002 + 3 fix hôm nay. Rồi manual test nốt extract-jd/jd-insight/cv-jd-match (giờ CV có parsed_data + Gemini chạy) → đóng Phase 4 → Phase 5.

---

## 2026-06-28 — Phase 4: US-CV-002 FRONTEND HOÀN THÀNH (File 21-23) → US-CV-002 ĐÓNG

**Done hôm nay (frontend view + edit parsed CV data):**
- File 21: `cv/types.ts` + `api/cv-api.ts` + `api/queries.ts` ✅
  - types: `CvParsedData` (+ 8 sub-type, mọi field nullable, mirror backend Template 1) + `CvVersionDetail = CvVersion + parsedData`.
  - api: `getById` đổi trả `CvVersionDetail`; thêm `updateParsedData(id, data)` (PATCH), `reparse(id)` (POST).
  - queries: tái dùng `useCv(id)` (đổi kiểu detail); polling thêm `PENDING` (helper `isParsing`, cần cho reparse); thêm `useUpdateParsedData(id)` (setQueryData detail), `useReparseCv(id)` (setQueryData + invalidate list).
- File 22: `cv/components/CvParsedDataEditor.tsx` ✅ — RHF + `useFieldArray` (6 mảng object). Form model riêng `CvParsedDataForm` (toàn string) + map `toForm`/`toParsed`. **List chuỗi (technologies/achievements/skill items) edit bằng textarea, mỗi dòng 1 mục** (`splitLines`/`joinLines`) — tránh nested fieldArray. `'' → null` khi lưu. Component thuần (props onSave/isSaving/saveError). Sub-component tái dùng `SectionHeader`/`ItemCard`.
- File 23: `cv/pages/CvDetailPage.tsx` (MỚI) + route `/cv/:id` + link từ `CvCard` ✅ — 2 cột: PDF iframe (+ link "Mở PDF" fallback) | editor. `key={cv.updatedAt}` để remount editor khi data đổi (reparse/lưu xong). Render editor cả khi FAILED (user nhập tay). Nút "Phân tích lại bằng AI".

**Verify:** `tsc --noEmit` PASS · `npm run lint` 0 error (1 warning cũ `incompatible-library` ở CreateApplicationPage:124, không liên quan).

**Quyết định kỹ thuật hôm nay:**
- **List chuỗi = textarea mỗi dòng 1 mục** thay vì nested `useFieldArray` — đơn giản hơn nhiều, đổi lại có map layer toForm/toParsed.
- **Polling thêm trạng thái PENDING** — reparse trả PENDING (async chưa kịp set PROCESSING); chỉ poll PROCESSING thì sau reparse query đứng im. Vá luôn race lúc upload.
- **`key={cv.updatedAt}` remount editor** — RHF defaultValues chỉ đọc lúc mount; đổi key = reset form theo data mới.
- **Editor là component thuần** — page wire hook (onSave), tách UI/data.
- **`getById`/`useCv` tái dùng** thay vì tạo `useCvDetail` mới (CvVersionDetail là superset của CvVersion → consumer cũ không vỡ).

**Next:** Manual test toàn flow AI trên browser (cần `GEMINI_API_KEY` trong `.env`): upload CV → auto AI-parse → CvDetailPage xem/sửa parsed data → lưu → reparse; + extract-jd auto-fill, jd-insight, cv-jd-match (giờ chạy được vì CV có parsed_data). Sau manual test xong → Phase 4 ĐÓNG, sang Phase 5 (Reminders).

**Git:** US-CV-002 (backend File 20.x + frontend File 21-23) CHƯA commit. Backend trước đó còn có chỉnh inline parseCvAsync (gỡ 3 helper downloadPdf/extractText/aiParse) theo feedback "đừng tách method vụn".

**Known issue (defer Phase 7 — xem blockers.md B-001):** Mở CvDetailPage → PDF iframe TỰ TẢI VỀ file tên UUID thay vì render inline. Do upload `resource_type: "raw"` + public_id không đuôi `.pdf` → Cloudinary trả attachment/octet-stream. Fix ở Phase 7 (đổi resource_type "image" + `.pdf` + bật PDF delivery Cloudinary, làm chung thumbnail). KHÔNG block manual test editor.

---

## 2026-06-27 — Phase 4: US-CV-002 BACKEND HOÀN THÀNH (File 20.1-20.5)

**Done hôm nay (backend edit/sửa CV để view + edit parsed data + AI parse CV):**
- File 20.1: `cv/dto/CvParsedData.java` ✅ — typed DTO khớp Template 1 (personalInfo+links, summary, education[], experience[], skills[], projects[], certifications[], languages[]). Nested records, MỌI field nullable + `@JsonIgnoreProperties(ignoreUnknown=true)` từng record (tolerant). Date/gpa để String.
- File 20.2: `cv/dto/CvDetailResponse.java` ✅ — = CvVersionResponse + `parsedData`. Pattern list-item (nhẹ) vs detail (đầy đủ). List vẫn dùng CvVersionResponse.
- File 20.3: `cv/service/CvService.java` ✅ — (a) parse pipeline thêm bước gọi Gemini Template 1 fill parsed_data; (b) **TÁCH TRANSACTION**: `parseCvAsync` thành orchestrator KHÔNG @Transactional, gọi `self.markProcessing/saveParseSuccess/saveParseFailure` (3 tx ngắn qua proxy), I/O nặng (PDF+Gemini) chạy NGOÀI tx; (c) `getDetail` (thay `getById`), `updateParsedData`, `reparse`. Inject thêm AiService/JsonResponseParser/ObjectMapper.
- File 20.4: `cv/controller/CvController.java` ✅ — `GET /{id}`→getDetail (CvDetailResponse), `PATCH /{id}/parsed-data` (full-replace), `POST /{id}/reparse` (202).
- File 20.5: `cv/service/CvServiceOwnershipTest.java` ✅ — getById→getDetail, thêm 2 test updateParsedData (round-trip qua `@Spy ObjectMapper` thật). **11/11 PASS**.

**Verify:** `mvnw compile` PASS · `mvnw test -Dtest=CvServiceOwnershipTest` → **11/11 PASS, BUILD SUCCESS**.

**Quyết định kỹ thuật hôm nay:**
- **AI parse CV auto khi upload** (Template 1, temp 0.1, maxTokens 4000) — unblock luôn cv-jd-match (vốn đòi `parsed_data != null`, trước đó luôn null nên match luôn báo "CV chưa parse xong").
- **AI parse lỗi → status FAILED** + `parseError` (không phải COMPLETED-data-null, tránh mâu thuẫn vì match cần parsedData). Kèm `POST /{id}/reparse` để cứu CV FAILED (cặp bắt buộc).
- **Tách transaction** (user chốt): Gemini call NGOÀI @Transactional, tránh giữ DB connection ~vài giây — đúng nguyên tắc AiAnalysisService đã ghi. Phát hiện kèm: code cũ load Cloudinary trong tx (issue có sẵn, nay đã tách luôn vì đang sửa method này).
- **CvService gọi shared/ai trực tiếp** (AiService+JsonResponseParser), KHÔNG qua AiAnalysisService — tránh vòng phụ thuộc cv↔ai (ai module đã import CvVersionRepository).
- **Guard PDF blank** (ảnh scan) → FAILED rõ ràng thay vì gửi text rỗng cho Gemini.

**Next (Phase 4 còn lại — Frontend US-CV-002, File 21-23):**
- File 21: `cv/types.ts` (+ CvParsedData, CvDetailResponse tolerant) + `cv-api.ts` (getCvDetail, updateParsedData, reparseCv) + `queries.ts` (useCvDetail, useUpdateParsedData, useReparseCv).
- File 22: `cv/components/CvParsedDataEditor.tsx` (RHF + useFieldArray, có thể tách 2 file con nếu dài).
- File 23: `cv/pages/CvDetailPage.tsx` (MỚI: PDF embed + editor side-by-side) + route `/cv/:id` + link từ CvCard.

**Lưu ý FE:** PDF preview Cloudinary `raw` URL có thể tải về thay vì render inline trong iframe → làm best-effort + nút "Mở PDF" fallback (thumbnail vẫn defer Phase 7).

**Manual test defer:** test toàn bộ flow AI (extract-jd, jd-insight, cv-jd-match, CV auto-parse, edit parsed data) trên browser sau khi xong FE + có `GEMINI_API_KEY` trong `.env`.

**Git:** backend US-CV-002 chưa commit.

---

## 2026-06-24 — Phase 4: AI Integration — FRONTEND HOÀN THÀNH (File 14-19)

**Done hôm nay (6 file frontend):**
- File 14: `features/ai/types.ts` ✅ — mirror 3 DTO backend. Field enum-like để `string` (tolerant output AI), số `number | null`, mọi field `| null` (AI có thể bỏ qua → component phải guard).
- File 15: `features/ai/api/ai-api.ts` + `queries.ts` ✅ — 3 hàm API + 4 hook. **AI call lazy** (`enabled` do caller bật khi bấm nút) tránh tự nướng quota. `extract-jd` = mutation; `jd-insight`/`cv-jd-match` = query `staleTime: Infinity`; `useReanalyzeMatch` (force) ghi đè cache qua `setQueryData`.
- File 16: `features/ai/components/JdInsightSection.tsx` ✅ — lazy trigger, render info + chip kỹ năng/tech stack + bullet trách nhiệm/quyền lợi. Mỗi nhóm tự ẩn khi rỗng.
- File 17: `features/ai/components/AiMatchCard.tsx` ✅ — điểm khớp (màu theo ngưỡng 80/60), 4 thanh breakdown, strengths/gaps/suggestions, chip keyword, nút "Phân tích lại" (force). `describeError` phân biệt **400** (thiếu CV parse) vs **503** (AI down).
- File 18: `ApplicationDetailPage.tsx` ✅ — nhúng `JdInsightSection` + `AiMatchCard` (truyền `appId`) sau khối Nội dung JD.
- File 19: `CreateApplicationPage.tsx` ✅ — nút "✨ Phân tích JD & tự điền": `useExtractJd` → map `JdInsight` vào field (companyName/position/location + workType/employmentType validate enum). `setIf` không clobber field user bằng null. Dùng `setValue/getValues/watch` của RHF.

**Verify:** `tsc --noEmit` PASS · `eslint` 0 error (1 warning lành tính `react-hooks/incompatible-library` ở `watch('jdContent')` — React Compiler bỏ qua memo component này, KHÔNG ảnh hưởng build/hành vi; chỉ hiện khi `npm run lint`).

**Quyết định kỹ thuật:**
- AI call **lazy on-demand**, KHÔNG auto-fetch lúc mount (tốn phí + chậm). Query nhận `enabled` từ component.
- Field enum AI để `string` ở FE + validate `includes()` trước khi `setValue` (auto-fill) → tránh chọn giá trị rác lệch enum.
- `force` re-analyze = mutation riêng + `setQueryData`, KHÔNG nhét vào queryKey (tránh 2 cache entry rời).
- Phân biệt lỗi 400 vs 503 ở match card vì 400 cần user hành động khác (gắn CV parse) — khác JdInsight gộp chung message.

**Next (Phase 4 còn lại — US-CV-002, 3 file):**
- File 20: `CvService.updateParsedData()` + `PATCH /api/v1/cv/{id}/parsed-data` (backend)
- File 21: `features/cv/components/CvParsedDataEditor.tsx`
- File 22: update `CvListPage`/`CvDetailPage`

**Manual test UI defer:** sẽ test toàn bộ flow AI trên browser sau khi có `GEMINI_API_KEY` trong `.env` (extract-jd auto-fill + jd-insight + cv-jd-match).

**Lưu ý git:** backend Phase 4 đã commit local `7904994` (chưa push — user tự push). Frontend File 14-19 chưa commit.

---

## 2026-06-21 — Phase 4: AI Integration — BACKEND HOÀN THÀNH (13/13 file)

**Done thêm hôm nay (File 9-13):**
- File 9: `ai/entity/AiAnalysis.java` ✅ — entity bảng `ai_analyses`. `result` là `JsonNode` (đa hình: chứa JdInsightResponse hoặc CvJdMatchResponse). KHÔNG soft delete (CASCADE), append-only nên chỉ `@PrePersist`, không `@PreUpdate`.
- File 10: `ai/repository/AiAnalysisRepository.java` ✅ — 2 derived query: `findFirst...OrderByCreatedAtDesc` (latest) + `...AndInputHash...` (DB cache check). Cache scope theo `applicationId` (giữ ownership, không tái dùng chéo).
- File 11: `ai/dto/JdInsightResponse.java` + `CvJdMatchResponse.java` ✅ — record khớp Template 3 & 2 (docs/04). Field enum-like để `String` (tolerant output AI), `Integer` thay `int` (thiếu field → null). `@JsonIgnoreProperties(ignoreUnknown=true)`.
- File 12: `ai/service/AiAnalysisService.java` ✅ — lõi: `extractJd` (stateless), `getJdInsight`, `getCvJdMatch(force)`. DB-as-cache hash-keyed (SHA-256 + HexFormat). KHÔNG `@Transactional` ở method public (tránh giữ DB connection suốt lúc gọi Gemini). Generic helper `analyzeAndSave`/`findCached` dùng `valueToTree`/`convertValue`.
- File 13: `ai/dto/ExtractJdRequest.java` + `ai/controller/AiController.java` + `ai/service/AiAnalysisServiceTest.java` ✅ — 3 endpoint + **9 Mockito test PASS** (cache hit/miss, ownership 404, force bypass, CV thiếu/chưa parse → 400, extract blank → 400).

**Verify:** `./mvnw compile` PASS · `./mvnw test -Dtest=AiAnalysisServiceTest` → **9/9 PASS, BUILD SUCCESS**.

**Quyết định hôm nay:**
- **Cache: DB-only (hash-keyed), KHÔNG dùng Redis @Cacheable ở AiAnalysisService** (user chốt). Phát hiện input đổi do `inputHash` (SHA-256) lo, không phải Redis. Redis vẫn còn trong project (CacheConfig + cache `ai-*` khai báo sẵn nhưng tạm chưa dùng cho AI) — có thể thêm tầng 1 sau (cần self-injection `@Lazy`). Defer Phase 7.
- **Endpoint extract-jd path = `/api/v1/ai/extract-jd`** (namespace dưới `/ai`, khác note gốc ghi `/extract-jd`). FE File 15 gọi đúng path này.
- 3 endpoint Phase 4: `POST /api/v1/ai/extract-jd` · `GET /api/v1/applications/{id}/jd-insight` · `GET /api/v1/applications/{id}/cv-jd-match?force=true`.

**Next:** Manual test backend AI (cần `GEMINI_API_KEY` trong `.env`) — user sẽ yêu cầu hướng dẫn sau khi đọc code. Rồi Frontend File 14 — `features/ai/types.ts`.

**Còn lại Phase 4:** Frontend (File 14-19, 6 file) + US-CV-002 (File 20-22, 3 file).

---

## 2026-06-19 — Phase 4: AI Integration — BẮT ĐẦU

**Plan (22 file):**

Backend (13 file):
- File 1: `V6__create_ai_analyses_table.sql`
- File 2: `shared/ai/GeminiProperties.java`
- File 3: `shared/ai/AiPrompt.java`
- File 4: `shared/ai/AiResponse.java`
- File 5: `shared/ai/AiService.java` (interface)
- File 6: `shared/ai/GeminiAiService.java`
- File 7: `shared/ai/JsonResponseParser.java`
- File 8: `ai/entity/AiAnalysisType.java`
- File 9: `ai/entity/AiAnalysis.java`
- File 10: `ai/repository/AiAnalysisRepository.java`
- File 11: `ai/dto/JdInsightResponse.java` + `CvJdMatchResponse.java`
- File 12: `ai/service/AiAnalysisService.java`
- File 13: `ai/controller/AiController.java` + `AiAnalysisServiceTest.java`

Frontend (6 file):
- File 14: `features/ai/types.ts`
- File 15: `features/ai/api/ai-api.ts` + `queries.ts`
- File 16: `features/ai/components/JdInsightSection.tsx`
- File 17: `features/ai/components/AiMatchCard.tsx`
- File 18: Update `ApplicationDetailPage.tsx`
- File 19: Update `CreateApplicationPage.tsx` (JD auto-extract)

US-CV-002 (3 file):
- File 20: `CvService.updateParsedData()` + `PATCH /api/v1/cv/{id}/parsed-data`
- File 21: `features/cv/components/CvParsedDataEditor.tsx`
- File 22: Update `CvListPage.tsx` / `CvDetailPage.tsx`

Endpoints: `POST /extract-jd` · `GET /applications/{id}/jd-insight` · `GET /applications/{id}/cv-jd-match?force=true`
Defer: interview prep (US-AI-004), pattern analysis (US-AI-005) → Phase 7

**Done (8/22 file):**
- File 1: `V6__create_ai_analyses_table.sql` ✅
- File 2: `shared/ai/GeminiProperties.java` ✅
- File 3: `shared/ai/AiPrompt.java` ✅
- File 4: `shared/ai/AiResponse.java` ✅
- File 5: `shared/ai/AiService.java` (interface — exception duy nhất của rule no-interface) ✅
- File 6: `shared/exception/AiException.java` + `shared/ai/GeminiAiService.java` + update `GlobalExceptionHandler` (503 handler) ✅
- File 7: `shared/ai/JsonResponseParser.java` ✅
- File 8: `ai/entity/AiAnalysisType.java` ✅

**Next:** File 9 — `ai/entity/AiAnalysis.java`

---

## 2026-06-15 — Phase 3 FRONTEND HOÀN THÀNH (6 file) → PHASE 3 ĐÓNG

**Done (frontend Phase 3):**
- File 10: `features/applications/types.ts` — mirror DTO; thêm enum `WorkType/EmploymentType/ApplicationSource` vào `types/common.ts`; `TimelineEventType` + `TIMELINE_EVENT_LABELS`.
- File 11: `api/application-api.ts` — 7 endpoint; `paramsSerializer: { indexes: null }` để mảng `statuses` serialize lặp key (khớp `@ModelAttribute`).
- File 12: `api/queries.ts` — TanStack hooks (queries + 5 mutation); `keepPreviousData` cho list.
- File 13: `ApplicationStatusBadge` + `ApplicationCard`; tách `status-meta.ts` (config nhãn/màu + `ALLOWED_TRANSITIONS` mirror state machine).
- File 14: `ApplicationListPage` (filter + search + phân trang) · `CreateApplicationPage` (React Hook Form + Zod — form đầu tiên dùng RHF) · `ApplicationDetailPage` (info + đổi status + ghi chú sự kiện + lịch sử + xóa).
- File 15: `routes.tsx` — 3 route `/applications`, `/applications/new`, `/applications/:id`.

**Verify:** tsc + eslint + `npm run build` đều PASS.

**Tinh chỉnh UX trong lúc review:** đổi nhãn "Dòng thời gian" → "Ghi chú sự kiện"; thêm nhãn VN cho timeline event type; thêm `max={today}` ô Ngày nộp (chặn chọn tương lai, khớp `@PastOrPresent`); sửa typo class `max-w-3xlf`.

**Quyết định style:** `CreateApplicationPage` dùng RHF+Zod (stack chính thức, form 16 field); các form nhỏ khác vẫn `useState`. User chọn giữ RHF và tự học (xem learning/form_react_hook.md).

**Next:** **Phase 4 — AI Integration** (GeminiAiService, parse-jd auto-fill form, CV-JD match). Manual test UI trên browser của Phase 3 nên làm trước khi sang Phase 4.

---

## 2026-06-13 — Backend run + 4 fix (migration V4/V5, 401, list bytea)

**Chạy backend lần đầu sau Phase 3 → gặp & fix 4 thứ:**
- **V4 Flyway checksum mismatch**: V4 bị sửa (thêm comment) sau khi đã apply → revert file về gốc (`git checkout`), giữ tính bất biến migration. Bài học: KHÔNG sửa migration đã apply.
- **V5 typo `PRIMARY KEYv`** (dòng 98, bảng `application_timeline_events`) → sửa `KEYv` → `KEY`. V5 chưa apply (transaction rollback sạch) nên sửa trực tiếp OK. Sau đó V5 apply thành công, 4 bảng tạo đủ.
- **Auth trả 403 thay vì 401** khi thiếu token (pre-existing Phase 1, ảnh hưởng auto-refresh FE): thêm `auth/security/RestAuthenticationEntryPoint` (trả 401 + body ApiResponse) + wire `.exceptionHandling()` trong `SecurityConfig`. Verify: no-token → 401, token sai/hết hạn vẫn 401 (filter), permitAll (auth/health/swagger) không bị ảnh hưởng.

- **List filter lỗi 500 `function lower(bytea) does not exist`**: trong `ApplicationRepository.findByFilters`, param `:search` khi null bị Hibernate 6 bind nhầm thành `bytea` (null String trong ngữ cảnh CONCAT/LOWER không suy ra kiểu). Fix: `CAST(:search AS string)` ở 2 chỗ LIKE → Hibernate bind đúng varchar. (Param enum `:source` không bị vì `@Enumerated` đã cho biết kiểu.)

**Manual test backend (10 case qua curl, dùng /auth/refresh mint token): 10/10 PASS** — create 201 (+ baseline history null→APPLIED), detail 200, status hợp lệ 200 (+ history APPLIED→PHONE_SCREEN), status sai 400 INVALID_STATE_TRANSITION, PATCH 200, timeline 201, list filter statuses/search 200, validation 400, delete 204, get-deleted 404. **Backend Phase 3 verified.**

**Next:** Frontend Phase 3 — File 10 `features/applications/types.ts`.

---

## 2026-06-13 — Phase 3: Application Management — BACKEND HOÀN THÀNH (9/9 file)

**Done thêm (File 7-9):**
- File 7: `application/service/ApplicationService.java` ✅ — 6 method (create, list, getById, update PATCH, changeStatus, delete, addTimelineEvent); ownership check tập trung `findOwnedOrThrow`; ghi baseline status history lúc create.
- File 8: `application/controller/ApplicationController.java` ✅ — 7 endpoint REST `/api/v1/applications`. Thêm helper dùng chung `shared/dto/PagedResponse.java` (bọc `Page<T>` → `{items, pagination}`). Tự build `Pageable` (whitelist sort field + cap size 100).
- File 9: tests ✅ — `ApplicationStateMachineTest` (12 test, logic thuần) + `ApplicationServiceOwnershipTest` (11 test Mockito). **23/23 PASS**.

**Decisions session này (xem decisions.md):**
- D-016: create cho phép chọn MỌI status (override restriction SAVED/APPLIED của D-015) — hỗ trợ backfill app đang dở dang.
- D-017: giữ state machine CỨNG cho changeStatus (đã cân nhắc vs free-form/hybrid; phục vụ reminder Phase 5 + analytics).
- Contract đổi query param `status` → `statuses` (khớp POJO `ApplicationFilter` + `@ModelAttribute` bind theo tên field).

**Next:** Frontend Phase 3 — File 10 `features/applications/types.ts`. (Backend chưa chạy manual test qua Swagger — làm trước khi/đồng thời với frontend.)

---

## 2026-06-12 — Phase 3: Application Management (đang làm, backend gần xong)

**Done (backend):**
- File 1: `V5__create_application_tables.sql` ✅
- File 2: 5 enum (`ApplicationStatus`, `WorkType`, `EmploymentType`, `ApplicationSource`, `TimelineEventType`) ✅ — trong `application/entity/`
- File 3: `ContactPerson` record + 3 entity (`Application`, `ApplicationStatusHistory`, `ApplicationTimelineEvent`) ✅ — `@SQLRestriction`, `@PrePersist`/`@PreUpdate`, JSONB
- File 4: 3 repository (`ApplicationRepository` với SpEL multi-status filter, `ApplicationStatusHistoryRepository`, `ApplicationTimelineEventRepository`) ✅ — trong `application/repository/`
- File 5: 10 DTOs ✅ — trong `application/dto/` (`CreateApplicationRequest`, `UpdateApplicationRequest` POJO, `ChangeStatusRequest`, `ApplicationFilter` POJO, `ContactPersonRequest`, `ApplicationListItemResponse`, `ApplicationResponse`, `StatusHistoryResponse`, `TimelineEventResponse`, `CreateTimelineEventRequest`)
- File 6: `ApplicationStateMachine` + `InvalidStateTransitionException` ✅ — StateMachine trong `application/service/`, exception trong `shared/exception/` (xử lý tập trung ở `GlobalExceptionHandler`)

**Fixes trong session này:**
- `01-coding-style.md`: sửa file structure (flat → sub-package), `@Where` → `@SQLRestriction`, `@CreatedDate` → `@PrePersist`, `ApplicationFilter` record → POJO
- `02-architecture.md`: clarify rule về exception trong shared

**Next:** File 7 — `ApplicationService` (trong `application/service/`)

---

## 2026-06-09 — Phase 2: CV Management HOÀN THÀNH (13/13 file)

**Done (backend 8 file):**
- File 1: `V4__create_cv_versions_table.sql` ✅
- File 2: `cv/entity/CvParseStatus.java` + `cv/entity/CvVersion.java` ✅
- File 3: `cv/repository/CvVersionRepository.java` ✅
- File 4: Storage layer → Cloudinary (D-012) ✅
- File 5: `cv/dto/CvVersionResponse.java` ✅
- File 6: `cv/service/CvService.java` (self-injection `@Lazy` + `@Async`, PDFBox 3.x) ✅
- File 7: `cv/controller/CvController.java` ✅
- File 8: `cv/service/CvServiceOwnershipTest.java` — 9 Mockito tests PASSED ✅

**Done (frontend 5 file):**
- File 9: `features/cv/types.ts` ✅
- File 10: `features/cv/api/cv-api.ts` (FormData upload) ✅
- File 11: `features/cv/api/queries.ts` (polling 3s khi PROCESSING) ✅
- File 12: `CvParseStatusBadge.tsx` + `CvCard.tsx` + `UploadCvForm.tsx` + `CvListPage.tsx` ✅
- File 13: `routes.tsx` update (`/cv` trong ProtectedLayout) ✅

**Hotfix:** `QueryClientProvider` bị thiếu trong `App.tsx` → thêm vào sau khi thấy lỗi console.

**Manual test PASS:**
- Upload CV PDF → card xuất hiện, status "Đang xử lý..." → tự chuyển "Hoàn thành" (polling) ✅
- Đặt mặc định → badge "Mặc định" chuyển đúng ✅
- Xóa CV → card biến mất ✅
- Chưa login → `/cv` redirect về `/login` ✅

**Next:** Phase 3 — Application CRUD + State Machine.

---

## 2026-06-07 — Phase 2: CV Management (đang làm, 5/13 file backend xong)

**Done (backend):**
- File 1: `V4__create_cv_versions_table.sql` ✅
- File 2: `cv/entity/CvParseStatus.java` + `cv/entity/CvVersion.java` ✅
- File 3: `cv/repository/CvVersionRepository.java` ✅
- File 4: Storage layer refactor → Cloudinary (D-012):
  - Xóa `LocalFileStorageService`
  - `shared/storage/StorageProperties.java` — nested CloudinaryProperties
  - `shared/storage/FileStorageService.java` — interface
  - `shared/config/CloudinaryConfig.java` — bean Cloudinary
  - `shared/storage/CloudinaryFileStorageService.java` ✅
  - `pom.xml` — thêm `cloudinary-http45:1.36.0` + `pdfbox:3.0.1` ✅
- File 5: `cv/dto/CvVersionResponse.java` ✅

**Next (session mới bắt đầu từ đây):**
- File 6: `cv/service/CvService.java` ← TIẾP THEO
- File 7: `cv/controller/CvController.java`
- File 8: `cv/service/CvServiceOwnershipTest.java` (Mockito)
- File 9-13: Frontend (types, api, queries+polling, components+page, routes)

**Decisions session này:**
- D-012: Cloudinary từ Phase 2, bỏ local storage — xem decisions.md
- `SqlTypes.JSONB` không tồn tại trong Hibernate version này → dùng `SqlTypes.JSON`
- Thêm bước 2.5 (self-review plan) và 3.5 (self-review after file) vào `03-workflow.md`
- `fileUrl` có trong `CvVersionResponse` vì Cloudinary URL là URL thật

**Cloudinary credentials:** đã điền đầy đủ trong `.env` (cloud name: dm1xwivqn)

---

## 2026-05-26 — Phase 0: Setup hạ tầng (bắt đầu)

**Done:**
- Đọc xong toàn bộ rules (`.kilocode/rules/00-04`) + docs (`docs/01-08`)
- Lên plan tổng 7 phases cho project
- Lên plan chi tiết Phase 0 (23 files)
- File 1: `.gitignore` — bổ sung `uploads/`, `*.jar`, exception cho maven-wrapper.jar
- File 2: `docker-compose.yml` — Postgres 15 + Redis 7 với healthcheck, volumes persist
- Tạo `notes/` folder: progress.md, decisions.md, blockers.md

**Notes:**
- Project rất lớn (8 epics, ~40 user stories) → strategy: làm core trước (Auth → CV → Application → AI), defer Email/Analytics nâng cao
- Decisions quan trọng: xem [decisions.md](./decisions.md)

---

## 2026-05-28 — Phase 0: backend VERIFIED, sang frontend

**Done:**
- Smoke test backend Phase 0: `./mvnw spring-boot:run` → Tomcat up port 8080, Hikari connect Postgres OK, Flyway apply V1 baseline OK, `/actuator/health` trả `{"status":"UP"}`.
- Fix blocker: Postgres native v18 (cài sẵn trên Windows) chiếm port 5432. Stop service + set startup Manual.

**Warning chấp nhận được (không fix Phase 0):**
- `Using generated security password: ...` — do `UserDetailsService` chưa register (Phase 0 chưa có Auth). Vô hại vì HTTP Basic/Form login đã disable, actuator đã permitAll. Phase 1 register thật → warning tự biến mất.

**Next:** File 15 — `frontend/.env.example`

---

## 2026-05-29 — Phase 0 HOÀN THÀNH (23/23 file)

**Done thêm (file 15-23, frontend Phase 0 skeleton):**
- File 15: `frontend/.env.example` — 3 vars `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_APP_NAME`.
- File 16: `frontend/src/config/env.ts` — Zod v4 validate (`z.url()` API mới), fail-fast tại module top-level.
- File 17: `frontend/src/types/api.ts` — `ApiResponse<T>`, `ApiError`, `FieldError`, `Pagination`, `PaginatedResponse<T>`, `ErrorCode` union literal.
- File 18: `frontend/src/types/common.ts` — `ApplicationStatus` + `CvParseStatus` dùng pattern `as const` array + `(typeof X)[number]` (vì `erasableSyntaxOnly: true` chặn TS enum). Defer AiAnalysisType/ReminderType đến phase sau.
- File 19: `frontend/src/lib/utils.ts` — `cn()` plain version, Phase 1 swap sang `clsx + tailwind-merge` khi setup shadcn.
- File 20: `frontend/src/lib/api/axios.ts` — instance + request interceptor attach Bearer + response interceptor 401→refresh→retry với queue (concurrent 401 chỉ refresh 1 lần). `tokenStorage` export ra dùng chung.
- File 21: `frontend/src/features/auth/store/auth-store.ts` — Zustand skeleton, hydrate manual từ localStorage, sync với `tokenStorage`.
- File 22: `PublicLayout.tsx` + `ProtectedLayout.tsx` — Navigate redirect-after-login pattern qua `state.from`.
- File 23: `routes.tsx` + update `App.tsx` — `<BrowserRouter><AppRoutes/></BrowserRouter>`, placeholder inline cho `/login` + `/dashboard` + 404.

**Smoke test frontend (passed):**
- `npm run dev` → Vite up port 5173, không lỗi Console.
- Chưa login → `/` redirect `/login` → thấy placeholder Login.
- Manual set `jt_access_token` + `jt_user` localStorage → reload → `/` redirect `/dashboard` → thấy placeholder.
- URL bừa → 404 placeholder.
- `localStorage.clear()` → reload → quay về `/login`. ✅

**Phase 0 DONE.** Hạ tầng đủ để Phase 1 build Auth (Google OAuth + JWT).

**Next:** Phase 1 — Auth module. User stories tham khảo `docs/08-user-stories.md`. Backend: User entity + Google OAuth verify + JWT issue/refresh. Frontend: thay `LoginPlaceholder` bằng Google Login button + callback handler.

---

## 2026-06-06 — Phase 1 HOÀN THÀNH (25/25 file)

**Done (backend 18 file + frontend 7 file):**
- Backend: User entity, RefreshToken entity, JwtService, GoogleOAuthService, AuthService (+ 8 Mockito tests), JwtAuthFilter, SecurityConfig, AuthController
- Frontend: auth types, auth-api, auth-store (UserProfile), useAuth hooks, LoginPage, CallbackPage, routes update, PublicLayout auth redirect
- `.env` root: Google OAuth credentials + JWT secret điền đầy đủ

**Manual test PASS:**
- Google OAuth full flow: `/login` → Google consent → `/auth/callback` → spinner → `/dashboard` ✅
- Backend health: `{"status":"UP"}` ✅
- localStorage có `jt_access_token`, `jt_refresh_token`, `jt_user` sau login ✅

**Blocker tái hiện + fix:** Postgres native v18 tự start lại chiếm port 5432 → stop qua services.msc.

**Next:** Phase 2 — CV Management. Đọc `docs/02-database-schema.md` + `docs/08-user-stories.md` epic CV trước khi plan.

---

## 2026-05-27 — Phase 0: tiếp tục, tạm dừng ở file 4/23

**Done thêm:**
- File 3: `.env.example` — placeholders cho DB, JWT, Google OAuth, Gemini, encryption, Cloudinary, CORS. Có comment hướng dẫn sinh secret cho cả Linux/Mac và PowerShell.
- File 4: `application.yaml` — 4 documents YAML (base + dev/test/prod profile). Flyway `baseline-on-migrate: true`, Hibernate `ddl-auto: validate`, `open-in-view: false`, hide stacktrace khỏi response, multipart 10MB/12MB. Custom `app.*` properties bind cho JWT/Google/Gemini/storage/cors.

**Status:** Tạm dừng ở file 4/23 để user nghiên cứu kỹ 4 file đã làm (gitignore, docker-compose, .env.example, application.yaml). Đây là phần foundation quan trọng — hiểu rõ rồi mới đi tiếp.

**Next khi resume:**
- File 5: `V1__init.sql` — Flyway baseline migration (comment baseline)
- File 6-14: backend `shared` package (DTOs, exceptions, configs)
- File 15-23: frontend skeleton (env, types, axios, store, layouts, routing)

**Notes:**
- 4 files đã làm cover: ignore rules, run DB/Redis dễ dàng, env vars template, Spring config 3 profile
- Sau khi hiểu 4 file này, user sẽ nắm được flow: `.env` → `application.yaml` → Spring Boot → connect docker-compose services
