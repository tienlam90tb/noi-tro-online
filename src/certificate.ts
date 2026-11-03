import type { Role } from "./roles";

export interface CertData {
  name: string;
  role: Role;
  title: string;
  total: number;
  rows: { emoji: string; name: string; score: number }[];
  url: string;
}

const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Vẽ giấy chứng nhận khổ 4:5 (hợp đăng Facebook/Instagram). */
export function drawCertificate(d: CertData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (size: number, weight = 700) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  // Nền giấy và viền đôi.
  ctx.fillStyle = "#fff7ed";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#c2410c";
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 3;
  ctx.strokeRect(62, 62, W - 124, H - 124);

  ctx.textAlign = "center";
  ctx.fillStyle = "#9a3412";
  ctx.font = font(34, 600);
  ctx.fillText("CỘNG HÒA XÃ HỘI CHỦ NGHĨA BẾP NÚC", W / 2, 140);
  ctx.font = font(28, 500);
  ctx.fillText("Sạch sẽ – Gọn gàng – Đúng giờ cơm", W / 2, 184);

  ctx.fillStyle = "#c2410c";
  ctx.font = font(78, 800);
  ctx.fillText("GIẤY CHỨNG NHẬN", W / 2, 300);

  ctx.fillStyle = "#1f2937";
  ctx.font = font(34, 500);
  ctx.fillText("Hội đồng gia đình chứng nhận", W / 2, 370);

  ctx.font = font(66, 800);
  const name = d.name.trim() || d.role.label;
  ctx.fillText(`${d.role.emoji} ${name}`, W / 2, 465, W - 180);

  ctx.font = font(34, 500);
  ctx.fillText("đạt danh hiệu", W / 2, 530);

  ctx.fillStyle = "#c2410c";
  ctx.font = font(70, 900);
  wrap(ctx, d.title.toUpperCase(), W - 200).forEach((line, i) => ctx.fillText(line, W / 2, 625 + i * 80));

  // Bảng điểm từng việc.
  ctx.textAlign = "left";
  ctx.font = font(38, 600);
  d.rows.forEach((r, i) => {
    const y = 820 + i * 66;
    ctx.fillStyle = "#374151";
    ctx.fillText(`${r.emoji}  ${r.name}`, 190, y);
    ctx.textAlign = "right";
    ctx.fillStyle = r.score >= 75 ? "#15803d" : r.score >= 40 ? "#b45309" : "#b91c1c";
    ctx.fillText(`${r.score} điểm`, W - 190, y);
    ctx.textAlign = "left";
  });

  // Con dấu tổng điểm.
  ctx.save();
  ctx.translate(W - 230, 1150);
  ctx.rotate(-0.2);
  ctx.strokeStyle = "#dc2626";
  ctx.fillStyle = "#dc2626";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 95, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = font(76, 900);
  ctx.fillText(String(d.total), 0, 22);
  ctx.font = font(24, 700);
  ctx.fillText("ĐIỂM", 0, 60);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.fillStyle = "#6b7280";
  ctx.font = font(28, 500);
  ctx.fillText(`Người chấm: ${d.role.judge} ${d.role.judgeEmoji}`, 110, 1140);
  ctx.fillText("Thử tài nội trợ của bạn tại:", 110, 1200);
  ctx.fillStyle = "#c2410c";
  ctx.font = font(30, 700);
  ctx.fillText(d.url.replace(/^https?:\/\//, ""), 110, 1245, W - 400);

  return canvas;
}

/** Chia sẻ ảnh (điện thoại) hoặc tải ảnh về (máy tính). */
export async function shareCertificate(canvas: HTMLCanvasElement, text: string, url: string) {
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  const file = new File([blob], "giay-chung-nhan-noi-tro.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${text} ${url}` });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return "downloaded";
}
