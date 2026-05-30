/**
 * Ghép className có điều kiện. Filter các giá trị falsy rồi join bằng space.
 *
 * Vd:
 *   cn('p-4', isActive && 'bg-blue-500', error && 'border-red')
 *   → 'p-4 bg-blue-500'
 *
 * Phase 1 (khi setup shadcn/ui) sẽ replace bằng `clsx + tailwind-merge`
 * để xử lý conflict Tailwind class. Call site `cn(...)` không đổi.
 */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ');
}
