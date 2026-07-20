# Handoff Context — 2026-07-21 (APP ĐÃ LIVE: applyist.vercel.app. Phase 7 chỉ còn 7B-3 README + screenshots)

> **Update 2026-07-21 (3) — PHASE 7C DEPLOY XONG. APP LIVE + TEST END-TO-END PASS.** FE **https://applyist.vercel.app** (Vercel) · BE **https://applyist-api.onrender.com** (Render Docker, Root Directory `backend`, region Singapore) · DB **Neon** `ap-southeast-1`. **Điểm quan trọng:** `SPRING_PROFILES_ACTIVE=prod` BẮT BUỘC (để `dev` → Redis health bật → `/actuator/health` DOWN → Render coi service chết; còn in mọi SQL+tham số ra log) · Neon: bỏ `-pooler` khỏi host (Flyway dùng session-level advisory lock, kỵ transaction pooling; app đã có Hikari pool) + `DB_PARAMS=?sslmode=require` (bỏ `channelBinding`) · `VITE_API_BASE_URL` phải gồm `/api/v1`, biến `VITE_*` nướng vào JS lúc build nên **đổi env phải Redeploy** · mọi URL KHÔNG có `/` cuối · biến `VITE_*` set cho cả Production+Preview (thiếu ở Preview → Zod `env.ts` throw → trang trắng). **UptimeRobot** chống spin-down: ping **`/actuator/info`** (KHÔNG dùng `/actuator/health` — health query xuống DB → Neon không ngủ được, đốt compute-hours free), interval 10 phút, HEAD (đã verify trả 200). **Cold start đo thật > 60 giây.** **2 issue nhỏ CHƯA sửa:** `/v3/api-docs` 500 ở prod (Swagger hỏng) · đường dẫn sai trả 500 thay vì 404 (`GlobalExceptionHandler` chưa bắt `NoHandlerFoundException`). Chi tiết đầy đủ xem progress.md 2026-07-21 (2). **CÒN LẠI DUY NHẤT: 7B-3 README + screenshots.**
>
> **Update 2026-07-21 (2) — THƯƠNG HIỆU "Applyist" + debounce search. ĐÃ COMMIT + ĐÃ PUSH (`edb3610`, `38d428a`).** User tự thiết kế logo + banner, bỏ vào `frontend/src/assets/`. **Xử lý asset (đáng nhớ):** file logo user đưa lần 1 là **ảnh mockup** (logo phát sáng trên tường xám, nền tối baked-in 2.1MB) → KHÔNG dùng được; lần 2 user export bản nền trong suốt (RGBA alpha=0) nhưng **logo chỉ chiếm 21% khung** (540×615 giữa canvas 1536×1023, lề 498px mỗi bên) → render `h-8` thì logo thật chỉ còn ~19px. **Đã cắt sát viền bằng PowerShell System.Drawing** thành 2 file: `logo.png` (558×634, lockup icon+chữ+tagline) cho Login và `logo-mark.png` (428×433, CHỈ icon) cho sidebar + favicon (giữ `logo_applyist.png` bản gốc làm nguồn). **`background_login.png` KHÔNG phải background** mà là banner marketing đủ (có sẵn logo+headline+3 feature+mockup dashboard) → user chọn dùng **full-bleed + lớp phủ `bg-slate-950/75` + `backdrop-blur-[2px]`, card đăng nhập căn giữa**; logo đặt TRONG card (nền sáng) vì bảng màu logo (chữ xanh + tagline xám) dành cho nền sáng. **Tên app:** "Applyist" + tagline "Job Tracker AI" (user chọn) → `index.html` title (trước là "frontend"!) + `lang` en→vi + favicon.png 64px sinh từ logo-mark + `env.ts`/`.env.example` `VITE_APP_NAME` (biến này **chưa dùng ở đâu trong code**, chỉ config). **Debounce search** ApplicationListPage: `useEffect`+`setTimeout` 300ms, cleanup `clearTimeout` huỷ timer lần gõ trước → gõ "google" 1 request thay vì 6; bỏ `<form onSubmit>`, input `type="search"`. **Đã cân nhắc & BÁC lọc client-side** (user đề xuất): list chỉ tải 10 đơn/trang nên lọc client sẽ SAI kết quả; query `size:200` chỉ để đếm sidebar, dựa vào nó tạo trần ẩn ở 200 đơn. **CÒN TREO: ảnh nền 2MB** nên xuất lại .jpg q80/.webp (~150-300KB) trước khi deploy — đây là trang đầu tiên user gặp.
>
> **Update 2026-07-20 — REDESIGN TOÀN BỘ UI: XONG MỌI TRANG CHÍNH (chưa commit).** Lần thử 1 (tự đề xuất gu tím) bị user chê "trống/nhạt" → REVERT sạch. Lần thử 2: **user gửi MOCKUP riêng** (sidebar layout) → làm theo, chạy tốt. **Gu chốt:** primary navy `hsl(207 75% 30%)` (user tự tinh chỉnh L từ 40→30), light-only, chỉ đổi `--primary`+`--ring` trong `index.css` (giữ neutral shadcn gốc — KHÔNG overhaul). **Shell:** `ProtectedLayout` = SIDEBAR (logo + nav icon + khe cắm slot + Cài đặt + **user block/avatar/logout** dùng `useLogout`). Khe cắm = React Context + `createPortal` (`components/layout/sidebar-slot.ts`, hook `useSidebarSlot`) để trang bơm section riêng vào sidebar toàn cục. NotificationBell đặt ở header main từng trang. **Đã redesign:** Đơn (list: ApplicationsSidebar Tổng quan+Trạng thái filter portal, +1 query đếm read-only size 200; card có StatusStepper Lưu→Nộp→PV→Offer→Nhận suy từ status + avatar màu theo id; BỎ skill tags v1) · Đơn (detail: 2 CỘT trái JD/AI/Email/Timeline/Lịch sử, phải rail sticky Thông tin/Đổi trạng thái/CV/Nhắc nhở; SectionCard; 4 section nhúng chỉ bỏ mt-8+đồng bộ vỏ) · Tạo đơn (2 card nhóm, icon Sparkles) · CV (list: sidebar Tổng quan CV, grid 2 cột, **CvCard có thumbnail PDF** — xem dưới; detail + editor đồng bộ) · Analytics (chart Funnel+Sources đổ gradient 2 tông qua `chart-colors.ts` hàm `rampColors(count)` nội suy #154B75→#9ECAE1, height cả 2 = 200 cho đều; TimeSeries+Heatmap giữ xanh; OverviewCards thêm icon) · Settings (+card Tài khoản, switch dùng primary) · Login (2 panel navy/marketing + card Google) + Callback. **XÓA /dashboard → mọi redirect về /applications** (routes/PublicLayout/CallbackPage). Chi tiết [[project-redesign-plan]] + [[feedback-redesign-ui-only]] (redesign KHÔNG đụng logic). **fe build 2858 modules PASS, be compile PASS. ĐÃ COMMIT 2026-07-21** — `2420189` "Redesign UI - navy theme + sidebar layout" (29 file, gồm 4 file mới `sidebar-slot.ts`/`StatusStepper.tsx`/`ApplicationsSidebar.tsx`/`chart-colors.ts`) + `0caf1bf` "CV thumbnail PDF + fix B-001 (xem PDF inline)" (3 file: BE `CloudinaryFileStorageService` + `CvCard` + `CvDetailPage`). **ĐÃ PUSH 2026-07-21** (cùng lượt đẩy 6 commit `e6d8d70..68d12a1` gồm cả 7A/7B/7C tồn từ trước).
>
> **ĐÃ XONG 2026-07-21 (user tự test + mình commit):** (1) **Thumbnail PDF CvCard** — user ĐÃ bật Cloudinary setting + upload CV mới, test OK: backend `CloudinaryFileStorageService` đổi `resource_type` raw→image; FE `CvCard` render `<img>` transform URL `pg_1,w_400,h_520,c_fill/....jpg` (helper `pdfThumbUrl`, fallback icon qua `onError` cho CV cũ raw). **USER PHẢI: bật Cloudinary Settings→Security "Allow delivery of PDF and ZIP files"** (không bật → upload CV mới HỎNG cả thumbnail lẫn parse 401) + **upload CV MỚI để test** (CV cũ raw vẫn hiện icon). Cũng fix bug B-001 (CvDetailPage tự download → nay inline). Xem [[project-cv-preview-deferred]]. (2) Test end-to-end redesign trên browser: OK. (3) **COMMIT XONG** — tách đúng 2 commit `2420189` (redesign) + `0caf1bf` (thumbnail CV + B-001). Lưu ý khi đọc lịch sử: `CvCard.tsx`/`CvDetailPage.tsx` mang CẢ 2 loại thay đổi (redesign + thumbnail) nên nằm trong commit thumbnail — không tách hunk được sạch. **CÒN LẠI: Deploy 7C (user thao tác dashboard theo `docs/deployment.md`) + README 7B-3 + screenshots (làm CUỐI CÙNG). ĐÃ PUSH.**
>
> **Update 2026-07-19 (3) — PLAN MỚI (chưa bắt đầu): REDESIGN TOÀN BỘ GIAO DIỆN.** User chốt công việc tiếp theo = **redesign lại TẤT CẢ các trang + bố cục (layout) từng phần** cho hợp lý và **tối ưu trải nghiệm người dùng (UX)**. CHƯA chốt gu/scope chi tiết (user chưa trả lời câu hỏi phong cách/dark mode/dep — sẽ chốt khi bắt đầu). **Phát hiện quan trọng định hình redesign:** project ĐÃ có sẵn "nửa bộ khung" design-system kiểu shadcn/ui nhưng CÁC TRANG KHÔNG DÙNG — `index.css` + `tailwind.config.js` có CSS-variable tokens (`--primary/--card/--border/--radius/--muted`), `Button` xây chuẩn `cva`+`class-variance-authority`+Radix `Slot`+`cn` (deps `clsx`/`tailwind-merge`/`@radix-ui/react-slot` ĐÃ CÓ), nhưng mọi trang viết tay `text-gray-900`/`bg-white`/`border-gray-200` bỏ qua tokens. `components/ui/` mới có `button`+`query-states` (chưa Card/Input/Select/Badge). CHỈ light-mode (tokens chưa có `.dark`). → Phần lớn việc redesign = hoàn thiện + áp dụng nhất quán design-system dang dở (đổi giá trị tokens cho đẹp + dựng primitive + refactor trang) + xem lại bố cục từng trang cho UX. Xem [[project-redesign-plan]]. **Deploy 7C + README 7B-3 vẫn treo, làm xen kẽ/sau.**
>
> **Update 2026-07-19 (2) — Phase 7C (Deploy) — CHUẨN BỊ CODE/CONFIG XONG. Stack: FE Vercel · BE Render (Docker) · DB Neon · KHÔNG Redis.** User chốt stack. Redis bỏ được vì grep toàn backend KHÔNG có `@Cacheable` (chỉ comment trong CacheConfig) → runtime không đụng Redis; prod tắt `management.health.redis.enabled` để /actuator/health không DOWN. **Đã tạo/sửa:** `backend/Dockerfile` (multi-stage maven→jre-alpine; ĐÃ BỎ `dependency:go-offline` vì build đầu rớt daemon do go-offline ngốn RAM khi máy đang chạy IDE — nhớ: `docker build|tail` che exit code, phải xem output thật) + `.dockerignore` · `application.yaml` 3 sửa (`server.port=${PORT:8080}` · `DB_PARAMS` cho Neon `?sslmode=require` · tắt redis health prod) · `frontend/vercel.json` (SPA rewrite) · **`docs/deployment.md`** (runbook đầy đủ: env vars chính xác Render+Vercel, thứ tự Neon→Render→Vercel + quay lại sửa CORS/GOOGLE_REDIRECT_URI với URL Vercel, Google Console redirect URI, smoke test). FE tự dựng `redirect_uri=${window.location.origin}/auth/callback`. `VITE_API_BASE_URL` phải gồm `/api/v1`. `GEMINI_MODEL` prod = `gemini-2.5-flash`. **CÒN LẠI 7C: user tự thao tác dashboard theo docs/deployment.md** (tạo Neon DB → Render web service Docker + env → Vercel + env → cập nhật chéo → smoke test). Rồi **7B-3 README + screenshots (LÀM CUỐI CÙNG)**. **Chưa commit 7C. Chưa push.**
>
> **Update 2026-07-19 — Phase 7B (Polish) — 7B-1 + 7B-2 XONG (tsc+eslint+build PASS 2854 modules).** Chia 7B thành 7B-1 fill-zero TimeSeries · 7B-2 UX states · 7B-3 README+screenshots. **User chốt thứ tự: làm 7C Deploy TRƯỚC, để 7B-3 README + screenshots LÀM SAU CÙNG (sau khi xong mọi thứ).** **7B-1** `TimeSeriesChart.tsx`: thêm `fillGaps(points, interval)` chèn mốc count=0 vào khoảng GIỮA [mốc đầu, mốc cuối] bằng date-fns `eachDay/Week/MonthOfInterval` (week `weekStartsOn:1` khớp Postgres `date_trunc`) → sửa caveat đường phẳng giả. Chỉ fill phần giữa vì response không trả from/to. **7B-2** UX states: tạo `components/ui/query-states.tsx` (`LoadingState` spinner Loader2 · `ErrorState` + nút **Thử lại**→`refetch` · `EmptyState`), adopt vào 5 trang (ApplicationList/CvList/Settings đủ 3 trạng thái+retry; ApplicationDetail/CvDetail đồng bộ loading, giữ not-found+back-link). `CvDetailPage.PageShell` đổi `<p>`→`<div>` để chứa LoadingState hợp lệ HTML. **Next: 7C Deploy** — khuyến nghị đã chốt: deploy live **1 nền tảng** (Railway HOẶC Render, user từng deploy cả 2) + thêm `backend/Dockerfile` (cheap, tái lập). BỎ frontend Dockerfile (deploy FE static). `docker-compose` full-stack optional. Việc thật của 7C = CORS prod + OAuth redirect URI domain thật + env prod (JWT/Gemini/DB managed) + Flyway trên Postgres cloud. **CHƯA push.**
>
> **Update 2026-07-18 (2) — Phase 7A (Analytics) ĐÓNG HOÀN TOÀN + ĐÃ COMMIT `fd8a7f5` "Phase 7A - Analytics (...)".** User tự chạy end-to-end: `docker compose up -d` + `mvnw spring-boot:run` + `npm run dev` → login → `/analytics`. **5 chart render có data → SQL của `AnalyticsRepository` (JPQL + native `date_trunc` + subquery `avgResponseTimeDays`) CHẠY THẬT KHÔNG LỖI** (rủi ro lớn nhất đã qua). Đối chiếu plan: Overview 5 ô ✓ · TimeSeries ✓ · Funnel ✓ · Sources ✓ · Heatmap ✓. **2 điểm làm rõ khi review:** (1) **TimeSeries sparse** — repo `GROUP BY period` chỉ trả mốc CÓ đơn, FE KHÔNG fill mốc 0 → recharts nối thẳng các điểm thưa → đường phẳng y=1 trông như "ngày nào cũng 1 đơn" (KHÔNG bug, là caveat trực quan; muốn thật hơn thì fill-zero ở 7B). (2) Heatmap: **1 ô = 1 NGÀY**, 1 cột = 1 tuần (7 ô dọc thứ 2→CN), tooltip `dd/MM/yyyy`. Commit `fd8a7f5` = 23 file (BE `analytics/` 8 file+test, FE `analytics/` Bước 6-13, routes/ProtectedLayout, comment `AiAnalysis.java`, notes). **Bug commit đã fix:** lần đầu message dính `@` vì gõ `@'...'@` trong Bash tool (Git Bash POSIX, KHÔNG phải PowerShell) → amend bằng heredoc `<<'EOF'`. **CHƯA push.** **Next: Phase 7B Polish (đang plan).**
>
> **Update 2026-07-18 — Phase 7A (Analytics) FRONTEND CODE HOÀN THÀNH (Bước 6-13).** `tsc`+`eslint`(0 error)+`npm run build`(2853 modules) PASS. Nay xong **Bước 11** `SourcesChart` (horizontal bar theo nguồn, 1 hue, tự tạo `SOURCE_LABELS`, KHÔNG dual-axis cho conversionRate) · **Bước 12** `ActivityHeatmap` (grid CSS thuần kiểu GitHub, FE tự dựng 365 ngày qua date-fns + `Map` tra count, 4 bậc màu sequential blue; **fix lint** React Compiler `immutability` — không gán lại `let` trong `.map()` render) · **Bước 13** `AnalyticsPage`+route `/analytics`+link header `BarChart3` (max-w-6xl, mỗi section tự fetch). **⚠️ CÒN LẠI: (1) test end-to-end — `docker compose up -d`+`mvnw spring-boot:run` là LẦN ĐẦU SQL `AnalyticsRepository` (JPQL+native) CHẠY THẬT (test cũ mock repo, compile không validate JPQL → lỗi query nếu có chỉ lộ ở đây, RỦI RO THẬT); `npm run dev`→login→`/analytics` nhìn 5 section (chưa eyeball chart lần nào). (2) commit cả 7A** (BE `analytics/` 8 file + FE Bước 6-13 + routes/ProtectedLayout + comment học tập + notes). User tự test sáng 2026-07-19. Chi tiết progress.md 2026-07-18. **Chưa commit gì.**
>
> **Update 2026-07-17 — Phase 7A (Analytics) FRONTEND Bước 6-10 XONG (tsc PASS EXIT=0).** Backend core-5 đã xong từ 07-15. Nay làm frontend: **Bước 6** `types.ts` (review lại — mirror đúng 100%, `source` non-nullable an toàn vì entity `@Column(nullable=false)`) · **Bước 7** `api/analytics-api.ts`+`queries.ts` (5 GET + 5 `useQuery`, KHÔNG mutation; `staleTime 5p`; params vào query key) · **Bước 8** `OverviewCards` (5 ô, tự fetch, skeleton, `avgResponseTimeDays==null→"—"`) · **Bước 9** `FunnelChart` (horizontal bar, 1 hue xanh `#2a78d6`, tái dùng `APPLICATION_STATUS_CONFIG`) · **Bước 10** `TimeSeriesChart` (LineChart, `SegmentedControl` generic metric+interval, `date-fns`). **Đã LOAD skill `dataviz`** — chốt palette light-mode (fill `#2a78d6`, axis `#898781`, grid `#e1e0d9`; app CHỈ light-mode, không thêm `dark:`). **CHƯA eyeball chart thật** (defer Bước 13). **CÒN LẠI: Bước 11** `SourcesChart` (BarChart nguồn, check có `APPLICATION_SOURCE` label map chưa) · **Bước 12** `ActivityHeatmap` (grid CSS tự dựng, FE sinh ngày trống, sequential blue ramp) · **Bước 13** `AnalyticsPage`+route `/analytics`+link header → **end-to-end test + verify SQL backend thật + commit cả 7A**. `recharts`+`date-fns` có sẵn, KHÔNG thêm dep. Chi tiết progress.md 2026-07-17. **Chưa commit gì. Next: Bước 11.**
>
> **Update 2026-07-15 — Phase 7A (Analytics) BACKEND core-5 HOÀN THÀNH.** Chia Phase 7 thành 3 milestone: **7A Analytics → 7B Polish → 7C Deploy**. Làm 7A trước, scope **core 5 story (US-001/002/003/004/006), DEFER 005 tech-stack**. Module mới `analytics/` (5 file: 5 DTO + repository + service + controller + test), **KHÔNG migration** (aggregate trên bảng có sẵn). `mvnw compile` PASS + `AnalyticsServiceTest` 7/7 PASS. **D-018:** offer đếm theo "TỪNG đạt OFFER" từ `status_history` (nhất quán funnel + overview + sources). ⚠️ CHƯA verify SQL thật (chờ FE test end-to-end). **CÒN LẠI 7A: Frontend Bước 6-13** (types→api/queries→OverviewCards→FunnelChart→TimeSeriesChart→SourcesChart→ActivityHeatmap→AnalyticsPage+route). recharts+date-fns đã có sẵn, KHÔNG thêm dep. **Trước khi viết chart LOAD skill `dataviz`.** Chi tiết đầy đủ xem progress.md 2026-07-15. **Chưa commit gì. Next: Frontend Bước 6.**
>
> **Update 2026-07-14 (3) — Phase 6 ĐÃ COMMIT + ĐÓNG hoàn toàn.** Toàn bộ Phase 6 (BE File 1-13 + FE File 14-17 + notes) đã commit ở **`e6d8d70` "Phase 6 - Email Integration (preferences + reminder email + AI draft)"**. Cây làm việc **sạch** (`git status` clean). Các update phía dưới ghi "CHƯA commit" là do viết TRƯỚC lúc commit — nay đã lỗi thời, giữ lại làm lịch sử. **Next: Phase 7 — Analytics + Polish + Deploy (chưa bắt đầu, đang đọc docs để plan).**
>
> **Update 2026-07-14 (2) — Phase 6 ĐÓNG: test cuối PASS.** User đăng ký Mailtrap (điền `MAIL_USERNAME`/`MAIL_PASSWORD` vào `.env`) + test trên browser OK. Ghi chú: nút "Mở trong ứng dụng mail" (`mailto:`) bấm không phản hồi = KHÔNG bug (máy chưa có mail client mặc định / chưa đăng ký Gmail làm protocol handler) — dùng nút **Copy nội dung** thay thế; AI soạn nháp chạy tốt. Dispatcher timing: `initialDelay=60s`+`fixedDelay=15p` → sau bật app ~60s quét lần đầu (không phải 15p). **CHƯA commit.** **Next: commit Phase 6 (BE File 1-13 + FE File 14-17 + notes) → Phase 7 (Analytics + Polish + Deploy).**
>
> **Update 2026-07-14 — Phase 6 CODE HOÀN THÀNH (BE File 1-13 + FE File 14-17). CHỈ CÒN test cuối (chờ user đăng ký Mailtrap).** Làm nốt FE File 15-17, `tsc` + `eslint` (0 error) + `npm run build` PASS. **File 15** `email/components/EmailDraftSection.tsx` nhúng `ApplicationDetailPage` (sau ReminderSection): chọn template + custom instructions → `useDraftEmail` → seed local state từ onSuccess → form sửa subject/body/toEmail + Copy (`navigator.clipboard` fail-soft) + `Button asChild` bọc `<a mailto:>` (encode subject/body, để nguyên email); `toEmail` input sửa được = khe nối Gmail-send. **File 16** module `features/settings/` types+api+queries (mirror `UserProfileResponse`; `useProfile` key `['profile']`; `useUpdateNotificationPreferences` mutation dùng `setQueryData` vì PUT trả full profile). **File 17** `settings/pages/SettingsPage.tsx` (2 toggle in-app/email bám server state, lưu ngay; Switch tự chế `<button role="switch">`, không thêm dep) + route `/settings` + link header gear icon (`lucide-react` `Settings` cạnh chuông trong ProtectedLayout). **Chưa commit gì** (BE File 1-13 + FE File 14-17). **CÒN LẠI:** test cuối — cần **Docker up** + **Mailtrap creds** (`MAIL_USERNAME/PASSWORD` trong `.env`, user CHƯA đăng ký) + `GEMINI_API_KEY`: backdate reminder due → restart → verify notification(chuông)+email(Mailtrap) theo prefs + manual test draft AI + toggle Settings + `contextLoads` xanh. **PASS rồi → commit Phase 6 → ĐÓNG → Phase 7.**
>
> **Update 2026-07-13 — Phase 6 BACKEND HOÀN THÀNH (File 1-13, compile + test PASS) + FE File 14 xong.** Code nốt File 9-13 (mảng C — AI soạn nháp email) + trả nợ test. **BE File 9-13:** `email/dto/` (`EmailDraftRequest{templateKey enum, customInstructions}` + `EmailDraftResponse{subject, body, tone, toEmail}`, cả 2 `@JsonIgnoreProperties`) · `email/entity/EmailTemplateKey` enum 3 giá trị (FOLLOW_UP_AFTER_APPLY/THANK_YOU_AFTER_INTERVIEW/STATUS_INQUIRY, kèm `description` cho prompt) · `email/service/EmailDraftService` (ownership app `findByIdAndUserIdAndDeletedAtIsNull` → prompt Template 5 temp 0.6 maxTokens 1000 → AiService+JsonResponseParser → điền `toEmail` từ contactPerson.email; **stateless, không lưu DB, không @Transactional**) · `email/controller/EmailController` (`POST /api/v1/applications/{id}/emails/draft`) · `EmailDraftServiceTest` (3) + **FIX** `ReminderDispatchServiceTest` (thêm mock UserRepository+MailService, +2 case pref off / user deleted). **Verify: `mvnw clean compile` PASS · unit test 75/75 PASS** (chỉ `BackendApplicationTests.contextLoads` đỏ — do Docker/Postgres 5433 chưa bật, KHÔNG phải regression). **FE File 14 xong** (`features/email/` types+api+queries, `tsc` PASS): `EmailTemplateKey` union literal + `EMAIL_TEMPLATE_LABELS` (nhãn VN) + `EmailDraftRequest/Response` + `emailApi.draft` + `useDraftEmail` (mutation). **Next: FE File 15-17** (15 `EmailDraftSection` nhúng ApplicationDetailPage; 16 `features/settings` preferences types+api+queries; 17 `SettingsPage`+route+link header). **Rồi test cuối** (cần Docker + Mailtrap creds trong `.env`): backdate reminder due → verify notification(chuông)+email(Mailtrap) theo prefs + manual test draft AI + toggle Settings. **Chưa commit gì (BE File 1-13 + FE File 14).**
>
> **Update 2026-07-12 — Phase 6 (Email, scope 1b) BẮT ĐẦU: backend File 1-8 xong, CHƯA compile.** Scope chốt sau khi tư vấn: **1b = Lean + SMTP** — (A) notification preferences + (B) kênh EMAIL cho reminder qua SMTP (Mailtrap dev) + (C) AI soạn nháp follow-up cho HR (chỉ gen text + `mailto:`, KHÔNG gửi server-side). **KHÔNG Gmail API** (defer option 2 "gửi as-user" sang SAU khi xong project — thêm sau gần như additive nếu giữ 3 khe nối: draft có `toEmail`, UI form sửa được, code trong `email/`). Dep mới (user OK): `spring-boot-starter-mail`. **File 1-8:** V8 migration (users.notification_preferences JSONB) · pom/yaml/.env mail config · `shared/mail/MailService` (@Async fail-soft) · `NotificationPreferences` record + User field · user DTO/Service/Controller (`GET /users/me`, `PUT /users/me/notification-preferences`) · `ReminderDispatchService` bắn theo prefs.inApp/email. (File 1-8 nay đã compile + test PASS ở update 07-13.)
>
> **Update 2026-07-11 — Phase 5 ĐÓNG (code): đã đọc code + manual test + commit FE.** User đọc hết code Phase 5 (BE+FE) và manual test phần reminder CRUD trên UI OK. Thống nhất: test end-to-end mắt xích "gửi" (dispatcher bắn reminder due → notification → badge chuông) **gộp làm khi Phase 6 (Email) xong**, vì Phase 6 cùng đụng notification flow → test 1 lượt cho gọn. Code "gửi notification" KHÔNG thiếu — nằm ở `ReminderDispatchService.dispatchDueReminders()` (scheduled 15', đã verify end-to-end qua psql hôm 07-06); chỉ là chưa quan sát trên browser (reminder tạo qua UI luôn @Future nên dispatcher chưa bắn — muốn thấy phải backdate + restart). **Next: Phase 6 — Email Integration.**
>
> **Update 2026-07-07 — Phase 5 FRONTEND HOÀN THÀNH (File 12-15), backend đã commit `9d1ad17`:** 2 module FE mới `features/notifications/` + `features/reminders/`. File 12 notifications types/api/queries (unread-count poll 30s). File 13 `NotificationBell` (badge + dropdown overlay click-outside, dùng lucide `Bell`) nhúng `ProtectedLayout` (thêm `<header>` sticky). File 14 reminders types/api/queries (list mảng thuần, create luôn CUSTOM). File 15 `ReminderSection` (form tạo + list + dismiss/delete) nhúng `ApplicationDetailPage` sau khối Đổi trạng thái. **tsc + eslint + `npm run build` PASS (1976 modules).** Chi tiết + quyết định kỹ thuật + 2 bài học (Bash heredoc vs PS here-string; grep package.json trước khi tự chế UI) xem progress.md 2026-07-07. **Next: manual test FE trên browser (chuông + reminder) → commit FE → Phase 5 ĐÓNG → Phase 6 Email.**
>
> **Update 2026-07-06 (2) — Phase 5 BACKEND VERIFIED runtime:** Đã chạy backend thật (Docker + `mvnw spring-boot:run`). V7 migration apply mới OK (2 bảng + index + check constraint). App start OK, health UP. **Dispatcher end-to-end PASS** (chèn reminder due → restart → 60s sau bắn `Reminders dispatched: 1` → DB: `sent_at` được ghi + notification tạo đúng metadata) — KHÔNG dính bug transaction/flush kiểu Phase 4. Data test đã dọn. Chi tiết + lưu ý vận hành (DB port 5433, đừng taskkill java giữa compile) xem progress.md 2026-07-06. **Next: Frontend File 12 (FE notifications types/api/queries), rồi 13-15, commit.**
>
> **Update 2026-07-06 (Phase 5 — Reminders & Notifications, BACKEND HOÀN THÀNH):** 2 module mới `reminder/` + `notification/`. Scope IN_APP only (email defer Phase 6), 3 reminder type: CUSTOM + FOLLOW_UP_AFTER_APPLY + STATUS_STALE. `ReminderJobs` @Scheduled: generator cron 08:00 (dedup once-per-app-per-type, terminal guard) + dispatcher fixedDelay 15' bắn reminder due → notification + set sent_at. Polling cho badge (không WebSocket). Compile PASS, **test 16/16 PASS** (ReminderServiceOwnershipTest 7 + NotificationServiceOwnershipTest 4 + ReminderDispatchServiceTest 5). **CHI TIẾT + quyết định kỹ thuật xem progress.md 2026-07-04.** **Next: Frontend File 12-15, commit.**
>
> **Update 2026-07-02:** Manual test upload CV phát hiện & fix 3 bug (xem progress.md + blockers.md B-002/B-003): (1) transaction readOnly làm status kẹt PENDING → `@Transactional(NOT_SUPPORTED)` trên parseCvAsync; (2) Gemini `.env` đổi `gemini-2.5-flash` (2.0-flash free tier limit:0); (3) tắt thinking (`thinkingBudget:0`) + maxTokens parse 8192. CvServiceOwnershipTest 14/14 PASS. Upload→PROCESSING→COMPLETED OK. Đã commit + push `9167607`.
>
> **Update 2026-07-02 (2):** Feature GẮN CV vào application (bật cv-jd-match) — 5 file (backend UpdateApplicationRequest+ApplicationService.update ownership; frontend types+CreatePage dropdown+DetailPage dropdown). Manual test PASS toàn bộ AI flow (extract-jd/jd-insight/cv-jd-match/edit parsed data/gắn CV). **CHƯA commit.** **Phase 4 coi như XONG** → next: commit feature gắn CV, rồi sang Phase 5 (Reminders).

File này tổng hợp toàn bộ context để chat mới resume project mà không cần đọc lại history dài. **Đọc thứ tự**: file này → [decisions.md](./decisions.md) → [progress.md](./progress.md) → rules.

---

## 1. User Profile

- Sinh viên IT, ~6 tháng kinh nghiệm Spring + React
- Làm intern project 8 tuần (Job-tracker-AI)
- Dev trên Windows 10 + PowerShell (KHÔNG WSL)
- Đọc/viết tiếng Việt, thêm comment tiếng Việt vào file để học
- Thích hiểu sâu — hỏi "tại sao" nhiều, cần giải thích 4 phần sau mỗi file

## 2. Project ở giai đoạn nào

**Phase 4: AI Integration — TẤT CẢ CODE XONG. Backend AI 13/13 ✅ · Frontend AI 6/6 ✅ · US-CV-002 backend 5/5 ✅ · US-CV-002 frontend 3/3 ✅. CHỈ CÒN: manual test trên browser (cần GEMINI_API_KEY) → rồi ĐÓNG Phase 4, sang Phase 5.**

### US-CV-002 — XONG (backend 2026-06-27 + frontend 2026-06-28)
**BACKEND (File 20.1-20.5)** — compile PASS, CvServiceOwnershipTest 11/11 PASS.
- AI parse CV auto (Template 1) fill `parsed_data` lúc upload → unblock cv-jd-match.
- Tách transaction: parseCvAsync orchestrator (không @Tx) + self.markProcessing/saveParseSuccess/saveParseFailure (3 tx ngắn), Gemini call ngoài tx. (Đã inline downloadPdf/extractText/aiParse vào parseCvAsync theo feedback no-tiny-method-split.)
- 3 endpoint: `GET /cv/{id}` (kèm parsedData) · `PATCH /cv/{id}/parsed-data` (full-replace) · `POST /cv/{id}/reparse` (202).
- DTO: `CvParsedData` (tolerant, khớp Template 1), `CvDetailResponse` (= CvVersionResponse + parsedData).

**FRONTEND (File 21-23)** — tsc + lint PASS.
- File 21: types (`CvParsedData`, `CvVersionDetail`) + api (getById→detail, updateParsedData, reparse) + queries (useCv tái dùng, polling thêm PENDING, useUpdateParsedData, useReparseCv).
- File 22: `CvParsedDataEditor` (RHF + useFieldArray; list chuỗi = textarea mỗi dòng 1 mục; form model riêng + map toForm/toParsed).
- File 23: `CvDetailPage` MỚI (PDF iframe + editor side-by-side, key=updatedAt remount) + route `/cv/:id` + label CvCard thành link.

**Git:** US-CV-002 (backend + frontend) CHƯA commit.

### Phase 4 — tiến độ chi tiết

**BACKEND HOÀN THÀNH (13/13)** — compile PASS, AiAnalysisServiceTest 9/9 PASS. Chi tiết File 9-13 xem progress.md (2026-06-21). Đã commit local `7904994` (chưa push).

**FRONTEND HOÀN THÀNH (6/6, File 14-19)** — tsc PASS, eslint 0 error. Chi tiết xem progress.md (2026-06-24). Chưa commit.
- `features/ai/types.ts` (mirror DTO) · `api/ai-api.ts` + `queries.ts` (lazy query, force re-analyze)
- `JdInsightSection.tsx` · `AiMatchCard.tsx` (phân biệt lỗi 400 vs 503)
- Nhúng vào `ApplicationDetailPage` · nút auto-fill trong `CreateApplicationPage`
- 1 warning lành tính: `watch('jdContent')` + React Compiler (`react-hooks/incompatible-library`) — chỉ hiện khi `npm run lint`, không ảnh hưởng build. Chưa quyết né hay giữ.

**Next:** US-CV-002 (File 20-22) — File 20 `CvService.updateParsedData()` + `PATCH /api/v1/cv/{id}/parsed-data`. Sau đó manual test UI toàn bộ AI flow trên browser (cần `GEMINI_API_KEY` trong `.env`).

3 endpoint backend đã có:
- `POST /api/v1/ai/extract-jd` (body `{jdContent}`) → JdInsightResponse, stateless auto-fill form
- `GET /api/v1/applications/{id}/jd-insight` → JdInsightResponse (cache theo hash JD)
- `GET /api/v1/applications/{id}/cv-jd-match?force=true` → CvJdMatchResponse (cần application có CV đã parse COMPLETED)

**Done (shared/ai layer — 7 file):**
- `V6__create_ai_analyses_table.sql` — bảng `ai_analyses` (input_hash, result JSONB, CASCADE từ application)
- `shared/ai/GeminiProperties.java` — `@ConfigurationProperties("app.gemini")`, apiKey + model
- `shared/ai/AiPrompt.java` — record: systemPrompt, userPrompt, temperature, maxTokens, jsonMode; factory `AiPrompt.of()`
- `shared/ai/AiResponse.java` — record: rawText, tokensUsed, modelUsed, latencyMs
- `shared/ai/AiService.java` — interface: `generate(AiPrompt)` + `isHealthy()`
- `shared/ai/GeminiAiService.java` — RestClient call Gemini v1beta, retry 3x exponential backoff (1s→2s→4s), phân biệt transient (429/5xx) vs permanent (400/403)
- `shared/ai/JsonResponseParser.java` — strip ```json fence, extract `{…}`, parse thành typed DTO
- `shared/exception/AiException.java` — RuntimeException, handler trả 503 trong GlobalExceptionHandler

**Done (ai/ module — 6 file, File 8-13):**
- `ai/entity/AiAnalysisType.java` — enum: `JD_INSIGHT`, `CV_JD_MATCH`
- `ai/entity/AiAnalysis.java` — entity (result JsonNode, append-only, no soft delete)
- `ai/repository/AiAnalysisRepository.java` — latest + DB-cache-by-hash query
- `ai/dto/JdInsightResponse.java` + `CvJdMatchResponse.java` + `ExtractJdRequest.java`
- `ai/service/AiAnalysisService.java` — lõi (DB-cache hash-keyed, no @Transactional)
- `ai/controller/AiController.java` + `ai/service/AiAnalysisServiceTest.java` (9/9 PASS)

**Quyết định kỹ thuật Phase 4 (thêm vào decisions.md sau):**
- `shared/ai/` = infrastructure (HTTP client) — nhiều module dùng. `ai/` = domain module (business logic + entity + controller)
- `GeminiAiService` dùng `RestClient.Builder` (prototype bean của Spring Boot) thay vì `RestClient.create()` để kế thừa global customizer
- Private nested records trong `GeminiAiService` cho Gemini request/response schema — `@JsonIgnoreProperties` trên response records để tolerant với field mới của Gemini API
- `JsonResponseParser` inject `ObjectMapper` từ Spring context (không `new`) để nhất quán config toàn hệ thống
- `AiException` → 503 SERVICE_UNAVAILABLE (không phải 500) — báo "downstream down", client có thể retry

### Phase 3 — Backend (9/9 XONG ✅ — compile PASS, 23/23 test PASS)

| # | File/Bước | Status |
|---|-----------|--------|
| 1 | `V5__create_application_tables.sql` | ✅ |
| 2 | 5 enum (`ApplicationStatus`, `WorkType`, `EmploymentType`, `ApplicationSource`, `TimelineEventType`) | ✅ |
| 3 | `ContactPerson` record + 3 entity (`Application`, `ApplicationStatusHistory`, `ApplicationTimelineEvent`) | ✅ |
| 4 | 3 repository (`ApplicationRepository` multi-status SpEL, `StatusHistoryRepo`, `TimelineEventRepo`) | ✅ |
| 5 | 10 DTOs | ✅ |
| 6 | `ApplicationStateMachine` + `InvalidStateTransitionException` | ✅ |
| 7 | `ApplicationService` (6 method, ownership tập trung, baseline history) | ✅ |
| 8 | `ApplicationController` (7 endpoint) + `shared/dto/PagedResponse` | ✅ |
| 9 | Tests: `ApplicationStateMachineTest` (12) + `ApplicationServiceOwnershipTest` (11) | ✅ |

✅ Backend đã manual test qua curl (10/10 endpoint PASS) — xem learning/test-phase3-backend.md.

### Phase 3 — Frontend (6/6 XONG ✅ — tsc + eslint + build PASS)

| # | File/Bước | Status |
|---|-----------|--------|
| 10 | `features/applications/types.ts` (+ enum vào `types/common.ts`, `TIMELINE_EVENT_LABELS`) | ✅ |
| 11 | `features/applications/api/application-api.ts` (7 endpoint, `paramsSerializer indexes:null`) | ✅ |
| 12 | `features/applications/api/queries.ts` (TanStack, `keepPreviousData`) | ✅ |
| 13 | `ApplicationStatusBadge.tsx` + `ApplicationCard.tsx` (+ `status-meta.ts`: config + `ALLOWED_TRANSITIONS`) | ✅ |
| 14 | `ApplicationListPage` + `CreateApplicationPage` (RHF+Zod) + `ApplicationDetailPage` | ✅ |
| 15 | `routes.tsx` update (3 route applications) | ✅ |

**PHASE 3 HOÀN THÀNH (backend + frontend).** Còn lại: manual test UI trên browser (chưa làm).

### Cấu trúc package đã dùng (QUAN TRỌNG — follow đúng)

```
application/
├── entity/         ← enums + entities + ContactPerson record
├── repository/     ← 3 repositories
├── service/        ← ApplicationService + ApplicationStateMachine
├── controller/     ← ApplicationController
├── dto/            ← 10 DTOs
└── exception/      ← rỗng (InvalidStateTransitionException đã chuyển sang shared/exception/)
```

### Decisions quan trọng trong session này (xem decisions.md)

- `InvalidStateTransitionException` đặt trong `shared/exception/`, xử lý trong `GlobalExceptionHandler` — không tạo handler riêng per-module
- `ApplicationFilter` là POJO class (Lombok), không phải record — vì `@ModelAttribute` cần setters
- `UpdateApplicationRequest` là POJO class — PATCH semantics: null = giữ nguyên
- `ContactPerson` entity record có 5 field: `name, email, phone, role, linkedinUrl`
- `ApplicationResponse` (detail) include `statusHistory` + `timelineEvents`; `ApplicationListItemResponse` (list) nhẹ hơn, không có `jdContent`
- `ApplicationStateMachine` nằm trong `application/service/` (không phải root)

Defer sang Phase 4+: parse-jd (AI), file upload endpoint, AI analysis, Kanban

### Phase 2 — DONE (tổng kết)

| # | File | Status |
|---|------|--------|
| 1-5 | DB migration, entity, repository, storage layer, DTO | ✅ |
| 6 | `cv/service/CvService.java` | ✅ |
| 7 | `cv/controller/CvController.java` | ✅ |
| 8 | `cv/service/CvServiceOwnershipTest.java` (9 tests) | ✅ |
| 9-13 | Frontend: types, api, queries+polling, components+page, routes | ✅ |

## 3. Decisions quan trọng (đọc decisions.md để đầy đủ)

**D-012:** Cloudinary từ Phase 2, không dùng LocalFileStorageService. `delete()` vẫn no-op (Phase 7).

**D-013:** `QueryClientProvider` phải bọc toàn bộ app trong `App.tsx`. `QueryClient` instance khai báo ngoài component để không bị recreate.

**D-016 (Phase 3):** create application cho phép chọn MỌI status (default SAVED) — override restriction SAVED/APPLIED của D-015, để backfill app đang dở dang. "create = chụp ảnh thực tại" vs "changeStatus = tiến trình về sau".

**D-017 (Phase 3):** giữ state machine CỨNG cho changeStatus (đã cân nhắc vs free-form/hybrid). Lý do: học pattern + cho `status_history` sạch → nền cho reminder Phase 5 (FOLLOW_UP_AFTER_APPLY, STATUS_STALE) + analytics.

**Contract đổi:** query param list `status` → `statuses` (khớp field POJO `ApplicationFilter` + `@ModelAttribute`).

**Kỹ thuật đã dùng (không cần giải thích lại ở session sau):**
- `@Async("aiTaskExecutor")` + self-injection `@Autowired @Lazy` để gọi @Async từ cùng class
- `Loader.loadPDF(byte[])` — PDFBox 3.x API (không phải `PDDocument.load()`)
- `@SQLDelete` + `@SQLRestriction` — soft delete Hibernate 6.4
- `@Modifying(clearAutomatically = true)` — bulk UPDATE
- TanStack Query v5: `refetchInterval: (query) => query.state.data?.some(...) ? 3000 : false`
- `useRef` để reset DOM `<input type="file">` sau submit
- `variables` từ `useMutation` để track per-card loading state
- SpEL trong `@Query`: `:#{#statuses.isEmpty()} = true OR a.status IN :statuses` — multi-status optional filter
- `@JdbcTypeCode(SqlTypes.JSON)` + `columnDefinition = "jsonb"` — JSONB field với typed Java record
- `@PrePersist`/`@PreUpdate` + `Instant.now()` — không dùng Spring Auditing
- `Map.of()` + `Set.of()` — immutable collections cho state machine transition table

## 4. Plan tổng (7 phases)

- **Phase 0:** Setup hạ tầng ← **DONE**
- **Phase 1:** Auth (Google OAuth + JWT) ← **DONE**
- **Phase 2:** CV Management ← **DONE**
- **Phase 3:** Application CRUD + State Machine ← **DONE**
- **Phase 4:** AI Integration + edit parsed CV data (US-CV-002) ← **DONE**
- **Phase 5:** Reminders & Notifications ← **DONE**
- **Phase 6:** Email Integration (scope 1b: preferences + reminder email SMTP + AI draft) ← **DONE · đã commit `e6d8d70`**
- **Phase 7:** Analytics + Polish + Deploy ← **GẦN XONG.** 7A Analytics ✅ (`fd8a7f5`) · 7B-1/7B-2 Polish ✅ (`740054f`) · 7C Deploy ✅ **APP LIVE 2026-07-21** (Vercel + Render + Neon + UptimeRobot) · **CÒN 7B-3: README + screenshots**
- **Ngoài phase:** Redesign UI navy + sidebar ✅ (`2420189`) · CV thumbnail + B-001 ✅ (`0caf1bf`) · Thương hiệu Applyist ✅ (`edb3610`) · Debounce search ✅ (`38d428a`)

## 5. Workflow standard

- Đọc rules + docs liên quan TRƯỚC khi code
- Self-review plan (bước 2.5) trước khi show user
- Code từng file một, self-review (bước 3.5) trước khi show user
- Giải thích 4 phần sau mỗi file: (1) làm gì (2) pattern lạ (3) quyết định kỹ thuật (4) edge case
- Test: Mockito cho 4 critical components, manual test cho phần còn lại
- Không tự thêm dependency, không refactor ngoài scope

## 6. Cách resume

Trong chat mới, user nhắn: **"resume project"** hoặc **"đọc notes/handoff.md"**

Mình sẽ:
1. Đọc handoff.md + decisions.md + progress.md
2. Đọc rules `.kilocode/rules/` liên quan
3. Đọc `docs/` liên quan Phase 3 trước khi plan
4. Đưa plan Phase 3, chờ user confirm, rồi code từng file

## 7. Workflow chạy backend

**Trước khi run, đảm bảo Docker Desktop đang chạy:**

```powershell
# Từ root
docker compose up -d

# Từ backend/
.\mvnw.cmd spring-boot:run
```

Test: `curl.exe http://localhost:8080/actuator/health` → `{"status":"UP"}`

## 8. Workflow chạy frontend

```powershell
cd D:\Job-tracker-AI\frontend
npm run dev
# Dev server: http://localhost:5173
```

## 9. Workflow chạy Docker

- Start: `docker compose up -d` (từ root)
- Stop tạm: `docker compose stop`
- Down (giữ volume): `docker compose down`
- **`docker compose down -v`** — xóa volume = MẤT HẾT DB

---

**File này tự xóa hoặc keep tùy user khi project xong.**
