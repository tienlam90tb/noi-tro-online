export interface Role {
  id: string;
  label: string;
  emoji: string;
  /** Người chấm điểm và cách người đó gọi người chơi. */
  judge: string;
  judgeEmoji: string;
  call: string;
  /** Tên danh hiệu theo vai, ghép với danh hiệu theo điểm. */
  noun: string;
}

export const ROLES: Role[] = [
  { id: "chong", label: "Chồng", emoji: "🧔", judge: "Vợ", judgeEmoji: "👩", call: "anh", noun: "Chồng" },
  { id: "vo", label: "Vợ", emoji: "👩", judge: "Mẹ chồng", judgeEmoji: "👵", call: "con", noun: "Nàng dâu" },
  { id: "contrai", label: "Con trai", emoji: "👦", judge: "Mẹ", judgeEmoji: "👩‍🦱", call: "con", noun: "Con trai" },
  { id: "congai", label: "Con gái", emoji: "👧", judge: "Mẹ", judgeEmoji: "👩‍🦱", call: "con", noun: "Con gái" },
  { id: "sinhvien", label: "Sinh viên ở trọ", emoji: "🧑‍🎓", judge: "Bà chủ trọ", judgeEmoji: "👵", call: "cháu", noun: "Sinh viên" },
];

export function roleById(id: string): Role {
  return ROLES.find((r) => r.id === id) ?? ROLES[0];
}
