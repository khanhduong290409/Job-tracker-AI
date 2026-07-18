# Deployment (Phase 7C)

Stack deploy: **Frontend → Vercel · Backend → Render (Docker) · Database → Neon (Postgres)**.
Redis KHÔNG deploy (app chưa dùng `@Cacheable`; prod đã tắt Redis health indicator).

> Thứ tự có phụ thuộc chéo (backend cần URL frontend cho CORS/OAuth, frontend cần URL backend cho API).
> Cách xử: deploy **Neon → Render → Vercel**, rồi **quay lại cập nhật vài biến của Render** với URL Vercel thật.

---

## 1. Neon (Postgres)

1. Tạo project mới trên [neon.tech](https://neon.tech) → chọn region gần (VD Singapore).
2. Lấy **connection string**, dạng:
   `postgresql://<user>:<password>@<host>/<dbname>?sslmode=require`
3. Tách ra các phần để điền env Render ở bước 2:

| Env (Render) | Lấy từ connection string | Ví dụ |
|---|---|---|
| `DB_HOST` | phần host | `ep-cool-name-123.ap-southeast-1.aws.neon.tech` |
| `DB_PORT` | `5432` | `5432` |
| `DB_NAME` | phần dbname | `neondb` |
| `DB_USER` | phần user | `neondb_owner` |
| `DB_PASSWORD` | phần password | `npg_xxx` |
| `DB_PARAMS` | **bắt buộc** cho Neon | `?sslmode=require` |

> Flyway sẽ tự chạy V1→V8 tạo schema lúc backend khởi động lần đầu (DB Neon trống, `baseline-on-migrate=true`).

---

## 2. Render (Backend — Docker)

**New → Web Service** → connect repo Git.

- **Root Directory:** `backend`
- **Runtime:** Docker (Render tự nhận `backend/Dockerfile`)
- **Health Check Path:** `/actuator/health`
- **Instance Type:** Free

### Environment variables

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | (từ Neon, bước 1) | |
| `DB_PARAMS` | `?sslmode=require` | Neon bắt buộc SSL |
| `JWT_SECRET` | chuỗi ngẫu nhiên dài ≥ 32 ký tự | **bắt buộc**, không có default. Sinh bằng `openssl rand -base64 48` |
| `GOOGLE_CLIENT_ID` | (Google Console) | |
| `GOOGLE_CLIENT_SECRET` | (Google Console) | |
| `GOOGLE_REDIRECT_URI` | `https://<app>.vercel.app/auth/callback` | điền sau khi có URL Vercel (bước 3) |
| `GEMINI_API_KEY` | (Google AI Studio) | |
| `GEMINI_MODEL` | `gemini-2.5-flash` | **KHÔNG để mặc định** `gemini-2.0-flash` (free tier limit:0) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | (Cloudinary) | cho upload CV |
| `APP_CORS_ALLOWED_ORIGINS` | `https://<app>.vercel.app` | điền sau khi có URL Vercel (bước 3) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD` | (Mailtrap hoặc SMTP thật) | tùy chọn — chỉ cần nếu muốn email nhắc nhở |
| `MAIL_FROM` | `Job Tracker AI <no-reply@...>` | tùy chọn |

> KHÔNG set `PORT` (Render tự inject; app đã đọc `server.port=${PORT:8080}`).
> KHÔNG cần `REDIS_HOST`/`REDIS_PORT`.

Deploy → chờ build (~5–10 phút) → được URL dạng `https://<backend>.onrender.com`.
Kiểm tra: mở `https://<backend>.onrender.com/actuator/health` → `{"status":"UP"}`.

> ⚠️ Free tier **spin-down sau 15 phút không dùng** → request đầu sau đó cold start ~50s. Bình thường cho demo.

---

## 3. Vercel (Frontend — Vite SPA)

**Add New → Project** → import repo.

- **Root Directory:** `frontend`
- **Framework Preset:** Vite (build `npm run build`, output `dist`)
- `vercel.json` đã có sẵn (rewrite mọi path về `index.html` cho React Router).

### Environment variables

| Biến | Giá trị |
|---|---|
| `VITE_API_BASE_URL` | `https://<backend>.onrender.com/api/v1` (URL Render bước 2, **có `/api/v1`**) |
| `VITE_GOOGLE_CLIENT_ID` | (cùng `GOOGLE_CLIENT_ID` backend) |
| `VITE_APP_NAME` | `Job Tracker AI` |

Deploy → được URL `https://<app>.vercel.app`.

---

## 4. Quay lại cập nhật (vì phụ thuộc chéo)

1. **Render** → sửa 2 biến với URL Vercel thật rồi **redeploy**:
   - `APP_CORS_ALLOWED_ORIGINS = https://<app>.vercel.app`
   - `GOOGLE_REDIRECT_URI = https://<app>.vercel.app/auth/callback`
2. **Google Cloud Console** → OAuth 2.0 Client → thêm:
   - **Authorized JavaScript origins:** `https://<app>.vercel.app`
   - **Authorized redirect URIs:** `https://<app>.vercel.app/auth/callback`
   (giữ luôn bản `localhost` để dev vẫn chạy)

---

## 5. Smoke test sau deploy

- [ ] `GET https://<backend>.onrender.com/actuator/health` → UP
- [ ] Mở `https://<app>.vercel.app` → trang login hiện
- [ ] Login Google → về `/auth/callback` → vào được app (không lỗi CORS/redirect_uri_mismatch)
- [ ] Tạo 1 application → reload trang detail (test SPA rewrite không 404)
- [ ] `/analytics` render (Flyway + query chạy trên Neon)
- [ ] Upload CV (test Cloudinary) + 1 AI action (test Gemini)
