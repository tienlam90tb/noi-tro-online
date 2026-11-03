// Mức độ khó: càng lên cao càng ít gợi ý, nhiều sự cố, phải nhìn hình mà đoán.

export type LevelId = "de" | "kho" | "acmong";

export interface Level {
  id: LevelId;
  label: string;
  emoji: string;
  desc: string;
}

export const LEVELS: Level[] = [
  { id: "de", label: "Tập sự", emoji: "🐣", desc: "Có vạch, có thanh đo, ít sự cố" },
  { id: "kho", label: "Đảm đang", emoji: "🔥", desc: "Mua theo số lượng, mỡ cứng, ít gợi ý hơn" },
  { id: "acmong", label: "Mẹ chồng khó tính", emoji: "😈", desc: "Không thanh đo, không vạch: nhìn hình mà đoán" },
];

export const levelById = (id: string | null): Level => LEVELS.find((l) => l.id === id) ?? LEVELS[0];

/** Chọn giá trị theo mức: [tập sự, đảm đang, mẹ chồng khó tính]. */
export function byLevel<T>(level: Level, values: [T, T, T]): T {
  return values[LEVELS.indexOf(level)];
}
