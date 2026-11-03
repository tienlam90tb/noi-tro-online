// Cách chấm điểm của từng minigame, tách riêng để test được. Điểm luôn 0-100.

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Đi chợ: mỗi món đúng +20, mỗi món nhầm -10. */
export function marketScore(correct: number, wrong: number, total = 5): number {
  return clamp((correct / total) * 100 - wrong * 10);
}

/** Rửa bát: mỗi bát sạch 34 điểm, bát đang rửa dở tính theo phần đã sạch, mỗi bát vỡ -15. */
export function dishesScore(clean: number, partial: number, broken: number): number {
  return clamp(clean * 34 + partial * 34 - broken * 15);
}

/**
 * Nấu cơm: đổ nước (50 điểm, lệch mỗi 1% so với vạch mất 5 điểm)
 * + rút điện (50 điểm, lệch khỏi vùng chín mất dần theo khoảng cách).
 */
export function riceScore(waterDiff: number, cookDiff: number): number {
  const water = Math.max(0, 50 - Math.abs(waterDiff) * 5);
  const cook = Math.max(0, 50 - Math.abs(cookDiff) * 3);
  return clamp(water + cook);
}

/** Phơi đồ: đồ khô cất kịp đủ điểm, đồ chưa khô đã cất được nửa, đồ ướt hoặc chưa phơi 0. */
export function laundryScore(dry: number, damp: number, total: number): number {
  return clamp(((dry + damp * 0.5) / total) * 100);
}

export function average(scores: number[]): number {
  return scores.length ? clamp(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}
