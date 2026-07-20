// Sequential palette 2 tông: sinh `count` màu chuyển dần từ RAMP_START (đậm) → RAMP_END (nhạt).
// Dùng cho bar chart nhiều cột — mỗi cột 1 sắc, cả dải trải đủ 2 tông dù số cột thay đổi.
// Muốn đổi gu: chỉ sửa 2 hằng dưới đây.
const RAMP_START = '#154B75'; // xanh đậm
const RAMP_END = '#9ECAE1'; // xanh nhạt

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Nội suy tuyến tính từng kênh R/G/B giữa 2 màu → mảng `count` màu chuyển dần.
export function rampColors(count: number): string[] {
  if (count <= 0) return [];
  const [r1, g1, b1] = hexToRgb(RAMP_START);
  const [r2, g2, b2] = hexToRgb(RAMP_END);
  if (count === 1) return [RAMP_START];
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1); // 0 → 1 theo vị trí cột
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  });
}
