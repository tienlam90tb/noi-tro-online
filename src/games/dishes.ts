import { dishesScore } from "../scoring";
import { sfx } from "../sfx";
import { countdown, sleep, type Game } from "./types";

const SECONDS = 30;
const SIZE = 280; // kích thước đĩa (px CSS)
const BRUSH = 26;
/** Vuốt nhanh hơn mức này (px/ms) bị cảnh báo; 3 lần cảnh báo thì vỡ bát. */
const FAST = 2.8;
const WARNINGS_TO_BREAK = 3;
const CLEAN_THRESHOLD = 0.04; // còn dưới 4% vết bẩn là sạch

/** Vẽ vết bẩn (mỡ, nước sốt, hạt cơm) lên lớp phủ. */
function paintDirt(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.clearRect(0, 0, SIZE * scale, SIZE * scale);
  const c = SIZE / 2;
  const colors = ["rgba(146,64,14,0.85)", "rgba(180,83,9,0.8)", "rgba(202,138,4,0.75)", "rgba(120,53,15,0.85)"];
  for (let i = 0; i < 14; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.random() * (SIZE * 0.32);
    const x = c + Math.cos(ang) * r;
    const y = c + Math.sin(ang) * r;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.ellipse(x * scale, y * scale, (14 + Math.random() * 26) * scale, (10 + Math.random() * 18) * scale, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hạt cơm dính.
  ctx.fillStyle = "rgba(255,255,240,0.95)";
  for (let i = 0; i < 18; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.random() * (SIZE * 0.34);
    ctx.beginPath();
    ctx.ellipse((c + Math.cos(ang) * r) * scale, (c + Math.sin(ang) * r) * scale, 4 * scale, 2.2 * scale, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Tỉ lệ diện tích còn bẩn, lấy mẫu thưa cho nhanh. */
function dirtRatio(ctx: CanvasRenderingContext2D, px: number): number {
  const data = ctx.getImageData(0, 0, px, px).data;
  let dirty = 0;
  let total = 0;
  const c = px / 2;
  const rr = (px * 0.42) ** 2;
  for (let y = 0; y < px; y += 6) {
    for (let x = 0; x < px; x += 6) {
      if ((x - c) ** 2 + (y - c) ** 2 > rr) continue;
      total++;
      if (data[(y * px + x) * 4 + 3] > 40) dirty++;
    }
  }
  return dirty / total;
}

export const dishes: Game = {
  id: "dishes",
  name: "Rửa bát",
  emoji: "🍽️",
  howTo: `Vuốt để chùi sạch vết bẩn trên đĩa. Rửa càng nhiều đĩa càng tốt trong ${SECONDS} giây, nhưng vuốt mạnh quá là vỡ đấy!`,

  async play(root) {
    root.innerHTML = `
      <div class="game-bar"><span>🍽️ Sạch: <b class="clean">0</b> · 💥 Vỡ: <b class="broken">0</b></span><span class="timer"></span></div>
      <div class="sink">
        <div class="plate-wrap">
          <div class="plate"></div>
          <canvas class="dirt" width="${SIZE}" height="${SIZE}"></canvas>
          <div class="crack hidden">💥</div>
        </div>
        <div class="warn hidden">Nhẹ tay thôi!</div>
        <div class="bubbles">🧽</div>
      </div>
      <div class="meter"><div></div></div>`;

    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(SIZE * scale);
    const canvas = root.querySelector<HTMLCanvasElement>(".dirt")!;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const warnEl = root.querySelector<HTMLElement>(".warn")!;
    const crackEl = root.querySelector<HTMLElement>(".crack")!;
    const meter = root.querySelector<HTMLElement>(".meter > div")!;
    const sponge = root.querySelector<HTMLElement>(".bubbles")!;
    const wrap = root.querySelector<HTMLElement>(".plate-wrap")!;

    let clean = 0;
    let broken = 0;
    let warnings = 0;
    let lastWarn = 0;
    let ratio = 1;
    let startRatio = 1;
    let busy = false; // đang chuyển sang đĩa mới
    let last: { x: number; y: number; t: number } | null = null;
    let lastCheck = 0;

    const newPlate = () => {
      paintDirt(ctx, scale);
      startRatio = ratio = dirtRatio(ctx, px);
      warnings = 0;
      meter.style.width = "0%";
      crackEl.classList.add("hidden");
      wrap.classList.remove("broken", "shine");
      busy = false;
    };

    const finishPlate = async (ok: boolean) => {
      busy = true;
      last = null;
      if (ok) {
        clean++;
        sfx.ding();
        wrap.classList.add("shine");
        root.querySelector(".clean")!.textContent = String(clean);
      } else {
        broken++;
        sfx.crash();
        crackEl.classList.remove("hidden");
        wrap.classList.add("broken");
        root.querySelector(".broken")!.textContent = String(broken);
      }
      await sleep(600);
      newPlate();
    };

    const scrub = (e: PointerEvent) => {
      if (busy) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * px;
      const y = ((e.clientY - rect.top) / rect.height) * px;
      sponge.style.transform = `translate(${e.clientX - rect.left - rect.width / 2}px, ${e.clientY - rect.top - rect.height / 2}px)`;
      const now = performance.now();

      if (last) {
        const dist = Math.hypot(x - last.x, y - last.y) / scale;
        const speed = dist / Math.max(1, now - last.t);
        if (speed > FAST && now - lastWarn > 350) {
          lastWarn = now;
          warnings++;
          warnEl.classList.remove("hidden");
          setTimeout(() => warnEl.classList.add("hidden"), 500);
          if (warnings >= WARNINGS_TO_BREAK) return void finishPlate(false);
          sfx.bad();
        }
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = BRUSH * 2 * scale;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
      last = { x, y, t: now };

      if (now - lastCheck > 120) {
        lastCheck = now;
        ratio = dirtRatio(ctx, px);
        const progress = Math.min(1, (startRatio - ratio) / Math.max(0.01, startRatio - CLEAN_THRESHOLD));
        meter.style.width = `${Math.round(progress * 100)}%`;
        if (ratio <= CLEAN_THRESHOLD) void finishPlate(true);
        else if (Math.random() < 0.15) sfx.splash();
      }
    };

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      last = null;
      scrub(e);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.buttons || e.pointerType === "touch") scrub(e);
    });
    canvas.addEventListener("pointerup", () => (last = null));

    newPlate();
    await new Promise<void>((resolve) => countdown(root.querySelector(".timer")!, SECONDS, resolve));
    busy = true;

    const partial = Math.max(0, Math.min(1, (startRatio - ratio) / Math.max(0.01, startRatio - CLEAN_THRESHOLD)));
    return {
      score: dishesScore(clean, partial, broken),
      detail: `Rửa sạch ${clean} đĩa${broken ? `, làm vỡ ${broken} đĩa` : ", không vỡ cái nào"}`,
    };
  },
};
