import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(), // phải là URL hợp lệ
  VITE_GOOGLE_CLIENT_ID: z.string().default(''),// chuỗi bất kỳ, mặc định là ''
  VITE_APP_NAME: z.string().min(1).default('Job Tracker AI'),// chuỗi, không được rỗng
});

const parsed = envSchema.safeParse(import.meta.env);// đọc file .env và kiểm tra
//import.meta.env là object chứa tất cả biến từ .env. 
// safeParse kiểm tra nó có khớp schema không, trả về:
//{ success: true,  data: { VITE_API_BASE_URL: '...', ... } }  // hợp lệ
//{ success: false, error: { issues: [...] } }                  // có lỗi
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(
    `Invalid frontend environment variables — check frontend/.env:\n${issues}`,
  );
}

export const env = parsed.data;
/*
1. File này làm gì
Đọc biến môi trường từ .env, kiểm tra hợp lệ, rồi export ra để cả app dùng. Nếu thiếu hoặc sai → crash ngay khi khởi động, báo lỗi rõ ràng.

z.object dùng khi data cần validate là object có nhiều field — đúng với trường hợp này vì import.meta.env là object:


// import.meta.env trông như này:
{
  VITE_API_BASE_URL: 'http://localhost:8080',
  VITE_GOOGLE_CLIENT_ID: 'abc123',
  VITE_APP_NAME: 'Job Tracker AI'
}
Nên schema cũng phải là object để khớp từng field một:


z.object({
  VITE_API_BASE_URL: z.url(),      // kiểm tra field này
  VITE_GOOGLE_CLIENT_ID: z.string(), // kiểm tra field này
  VITE_APP_NAME: z.string().min(1),  // kiểm tra field này
})
Nếu chỉ validate 1 giá trị đơn lẻ, không cần z.object:


// Validate 1 string thôi
const nameSchema = z.string().min(1);
nameSchema.safeParse('John');  // ✅
nameSchema.safeParse('');      // ❌
Tóm lại: data là object → dùng z.object. Data là giá trị đơn → dùng thẳng z.string(), z.number()...
 


PARSED.DATA TRẢ VỀ GÌ ? 

// Khi hợp lệ
parsed = {
  success: true,
  data: {
    VITE_API_BASE_URL: 'http://localhost:8080',
    VITE_GOOGLE_CLIENT_ID: 'abc123',
    VITE_APP_NAME: 'Job Tracker AI'
  }
}

// Khi không hợp lệ
parsed = {
  success: false,
  error: { issues: [...] }  // không có field data
}

*/