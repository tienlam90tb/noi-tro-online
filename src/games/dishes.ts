import { dishesScore } from "../scoring";
import { sfx } from "../sfx";
import { Actors, pick, sceneHtml } from "../scene";
import { countdown, sleep, type Game } from "./types";

const SECONDS = 30;
const SIZE = 220; // kích thước đĩa (px CSS)
const BRUSH = 26;
/** Vuốt nhanh hơn mức này (px/ms) bị cảnh báo; 3 lần cảnh báo thì vỡ bát. */
const FAST = 2.8;
const WARNINGS_TO_BREAK = 3;
const CLEAN_THRESHOLD = 0.04; // còn dưới 4% vết bẩn là sạch

/** Vẽ vết bẩn (mỡ, nước sốt, hạt cơm) lên lớp phủ. */
function paintDirt(ctx: CanvasRenderingContext2D, scale: number, blobs = 14, clear = true) {
  if (clear) ctx.clearRect(0, 0, SIZE * scale, SIZE * scale);
  const c = SIZE / 2;
  const colors = ["rgba(146,64,14,0.85)", "rgba(180,83,9,0.8)", "rgba(202,138,4,0.75)", "rgba(120,53,15,0.85)"];
  for (let i = 0; i < blobs; i++) {
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

const SAY_WARN = ["Nhẹ tay thôi!", "Bát chứ có phải đá đâu!", "Từ từ kẻo vỡ bây giờ!"];
const SAY_CLEAN = ["Được đấy!", "Sạch bóng!", "Cũng ra gì đấy!", "Cái nữa nào!"];
const SAY_BREAK = ["Bát của tôi!!!", "Trời ơi bộ bát cưới!", "Lại vỡ rồi!"];
const SAY_IDLE = ["Đứng ngắm à? Rửa đi!", "Nhanh lên, còn cả chồng bát kia!", "Ơ kìa, rửa tiếp đi chứ!"];

export const dishes: Game = {
  id: "dishes",
  name: "Rửa bát",
  emoji: "🍽️",
  howTo: `Vuốt để chùi sạch vết bẩn. Rửa càng nhiều càng tốt trong ${SECONDS} giây. Chà mạnh quá là vỡ, và coi chừng con mèo!`,

  async play(root, { role }) {
    root.innerHTML = `
      <div class="game-bar"><span>🍽️ Sạch: <b class="clean">0</b> · 💥 Vỡ: <b class="broken">0</b></span><span class="timer"></span></div>
      ${sceneHtml({
        kind: "kitchen",
        role,
        work: `
          <div class="sink">
            <div class="plate-wrap">
              <div class="plate"></div>
              <canvas class="dirt" width="${SIZE}" height="${SIZE}"></canvas>
              <div class="crack hidden">💥</div>
            </div>
            <div class="stack" aria-hidden="true">🍽️<br/>🍽️<br/>🍽️</div>
          </div>
          <button class="cat hidden" aria-label="Đuổi mèo">🐈</button>`,
      })}
      <div class="meter"><div></div></div>`;

    const actors = new Actors(root);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(SIZE * scale);
    const canvas = root.querySelector<HTMLCanvasElement>(".dirt")!;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const crackEl = root.querySelector<HTMLElement>(".crack")!;
    const meter = root.querySelector<HTMLElement>(".meter > div")!;
    const wrap = root.querySelector<HTMLElement>(".plate-wrap")!;
    const cat = root.querySelector<HTMLButtonElement>(".cat")!;

    let clean = 0;
    let broken = 0;
    let warnings = 0;
    let lastWarn = 0;
    let ratio = 1;
    let startRatio = 1;
    let busy = false; // đang chuyển sang đĩa mới
    let over = false;
    let last: { x: number; y: number; t: number } | null = null;
    let lastCheck = 0;
    let lastScrub = performance.now();
    let potServed = false;

    const updateMeter = () => {
      const progress = Math.min(1, (startRatio - ratio) / Math.max(0.01, startRatio - CLEAN_THRESHOLD));
      meter.style.width = `${Math.round(Math.max(0, progress) * 100)}%`;
      return Math.max(0, progress);
    };

    /** Đĩa mới; sau đĩa sạch đầu tiên thì "được giao" thêm một cái nồi cháy bẩn hơn. */
    const newPlate = () => {
      const pot = !potServed && clean >= 1;
      if (pot) {
        potServed = true;
        actors.say("Rửa nốt cái nồi cháy này cho mẹ!", 2000, true);
      }
      wrap.classList.toggle("pot", pot);
      paintDirt(ctx, scale, pot ? 26 : 14);
      startRatio = ratio = dirtRatio(ctx, px);
      warnings = 0;
      updateMeter();
      crackEl.classList.add("hidden");
      wrap.classList.remove("broken", "shine");
      busy = false;
    };

    const finishPlate = async (ok: boolean) => {
      busy = true;
      last = null;
      actors.relax();
      if (ok) {
        clean++;
        sfx.ding();
        wrap.classList.add("shine");
        actors.mood("happy");
        actors.say(pick(SAY_CLEAN), 1400, true);
        root.querySelector(".clean")!.textContent = String(clean);
      } else {
        broken++;
        sfx.crash();
        crackEl.classList.remove("hidden");
        wrap.classList.add("broken");
        actors.mood("shock");
        actors.say(pick(SAY_BREAK), 1600, true);
        root.querySelector(".broken")!.textContent = String(broken);
      }
      await sleep(650);
      if (!over) newPlate();
    };

    const scrub = (e: PointerEvent) => {
      if (busy || over) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * px;
      const y = ((e.clientY - rect.top) / rect.height) * px;
      const now = e.timeStamp;
      lastScrub = performance.now();

      if (last) {
        const dist = Math.hypot(x - last.x, y - last.y) / scale;
        const speed = dist / Math.max(1, now - last.t);
        if (speed > FAST && now - lastWarn > 350) {
          lastWarn = now;
          warnings++;
          wrap.classList.remove("wobble");
          void wrap.offsetWidth;
          wrap.classList.add("wobble");
          if (warnings >= WARNINGS_TO_BREAK) return void finishPlate(false);
          actors.say(pick(SAY_WARN), 1200, true);
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
      actors.reach(e.clientX, e.clientY, "🧽");

      if (now - lastCheck > 120) {
        lastCheck = now;
        ratio = dirtRatio(ctx, px);
        updateMeter();
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
    canvas.addEventListener("pointerup", () => {
      last = null;
      actors.relax();
    });

    // Sự kiện con mèo: nhảy lên bồn, không đuổi trong 2,5 giây thì liếm bẩn lại đĩa.
    let catTimer = 0;
    const catAppears = () => {
      if (over) return;
      cat.classList.remove("hidden", "shoo");
      sfx.tap();
      actors.say("Ối, con mèo! Đuổi nó đi!", 1800, true);
      catTimer = window.setTimeout(() => {
        if (over || cat.classList.contains("hidden")) return;
        cat.classList.add("lick");
        paintDirt(ctx, scale, 8, false);
        ratio = dirtRatio(ctx, px);
        updateMeter();
        actors.say("Con mèo nó liếm bát kìa! Rửa lại!", 1800, true);
        sfx.bad();
        setTimeout(() => cat.classList.add("hidden"), 700);
      }, 2500);
    };
    cat.addEventListener("click", () => {
      clearTimeout(catTimer);
      cat.classList.add("shoo");
      sfx.good();
      actors.say("Đuổi mèo nhanh đấy!", 1200, true);
      setTimeout(() => cat.classList.add("hidden"), 400);
    });
    const catAt = window.setTimeout(catAppears, 9000 + Math.random() * 9000);

    // Đứng im lâu thì bị nhắc.
    const idle = window.setInterval(() => {
      if (!busy && !over && performance.now() - lastScrub > 4000) {
        lastScrub = performance.now();
        actors.say(pick(SAY_IDLE));
      }
    }, 1000);

    newPlate();
    await new Promise<void>((resolve) => countdown(root.querySelector(".timer")!, SECONDS, resolve));
    over = busy = true;
    clearTimeout(catAt);
    clearTimeout(catTimer);
    clearInterval(idle);
    actors.relax();
    actors.dispose();

    const partial = updateMeter();
    return {
      score: dishesScore(clean, partial, broken),
      detail: `Rửa sạch ${clean} cái${broken ? `, làm vỡ ${broken} cái` : ", không vỡ cái nào"}`,
    };
  },
};
