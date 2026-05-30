import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(),
  VITE_GOOGLE_CLIENT_ID: z.string().default(''),
  VITE_APP_NAME: z.string().min(1).default('Job Tracker AI'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(
    `Invalid frontend environment variables — check frontend/.env:\n${issues}`,
  );
}

export const env = parsed.data;
