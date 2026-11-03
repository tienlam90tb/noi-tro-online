import { laundryScore } from "../scoring";
import { sfx } from "../sfx";
import { sleep, type Game } from "./types";

const CLOTHES = ["👕", "👖", "👗", "🧦", "🩳", "🧣"];
const DRY_MS = 4500; // thời gian phơi để khô
const RAIN_WARNING_MS = 3500; // từ lúc mây đến lúc mưa

type State = "basket" | "drag" | "hung" | "collected" | "wet";

interface Cloth {
  emoji: string;
  el: HTMLElement;
  state: State;
  slot: number;
  hungAt: number;
  dry: boolean;
}

export const laundry: Game = {
  id: "laundry",
  name: "Phơi đồ trước mưa",
  emoji: "👕",
  howTo: "Kéo quần áo từ chậu lên dây phơi. Thấy mây đen kéo đến thì chạm vào từng cái để cất vào nhà trước khi mưa!",

  async play(root) {
    root.innerHTML = `
      <div class="game-bar"><span>👕 Đã phơi: <b class="hung-count">0</b>/${CLOTHES.length}</span><span class="status">☀️ Nắng đẹp</span></div>
      <div class="yard">
        <div class="sun">☀️</div>
        <div class="cloud">🌧️</div>
        <div class="rain"></div>
        <div class="line"></div>
        <div class="basket">🧺</div>
        <div class="house">🏠<small>Đã cất: <b class="in-count">0</b></small></div>
      </div>
      <p class="hint">Kéo đồ lên dây. Chạm vào đồ đang phơi để cất.</p>`;

    const yard = root.querySelector<HTMLElement>(".yard")!;
    const statusEl = root.querySelector<HTMLElement>(".status")!;
    const slotX = (i: number) => 8 + i * 16.8; // % theo chiều ngang
    const LINE_Y = 26; // % theo chiều dọc
    const slots: (Cloth | null)[] = CLOTHES.map(() => null);

    const clothes: Cloth[] = CLOTHES.map((emoji, i) => {
      const el = document.createElement("div");
      el.className = "cloth";
      el.innerHTML = `${emoji}<span class="dry-bar"><span></span></span>`;
      el.style.left = `${30 + (i % 3) * 14}%`;
      el.style.top = `${72 + Math.floor(i / 3) * 10}%`;
      yard.appendChild(el);
      return { emoji, el, state: "basket", slot: -1, hungAt: 0, dry: false };
    });

    const counts = () => {
      root.querySelector(".hung-count")!.textContent = String(clothes.filter((c) => c.state === "hung").length);
      root.querySelector(".in-count")!.textContent = String(clothes.filter((c) => c.state === "collected").length);
    };

    let raining = false;
    let finish: () => void = () => {};

    const hang = (c: Cloth, xPct: number) => {
      let best = -1;
      let bestD = Infinity;
      slots.forEach((s, i) => {
        if (!s && Math.abs(slotX(i) - xPct) < bestD) {
          bestD = Math.abs(slotX(i) - xPct);
          best = i;
        }
      });
      if (best < 0) return false;
      slots[best] = c;
      c.slot = best;
      c.state = "hung";
      c.hungAt = performance.now();
      c.el.classList.add("hung");
      c.el.style.left = `${slotX(best)}%`;
      c.el.style.top = `${LINE_Y}%`;
      sfx.tap();
      return true;
    };

    const collect = (c: Cloth) => {
      slots[c.slot] = null;
      c.state = "collected";
      c.dry = performance.now() - c.hungAt >= DRY_MS;
      c.el.classList.remove("hung");
      c.el.classList.add("collected", c.dry ? "is-dry" : "is-damp");
      c.el.style.left = "86%";
      c.el.style.top = "78%";
      c.dry ? sfx.good() : sfx.tap();
      counts();
      if (clothes.every((x) => x.state === "collected")) finish();
    };

    // Kéo thả từ chậu lên dây; chạm vào đồ đang phơi để cất.
    for (const c of clothes) {
      c.el.addEventListener("pointerdown", (e) => {
        if (raining) return;
        if (c.state === "hung") return collect(c);
        if (c.state !== "basket") return;
        e.preventDefault();
        c.el.setPointerCapture(e.pointerId);
        c.state = "drag";
        c.el.classList.add("dragging");
        const rect = yard.getBoundingClientRect();
        const move = (ev: PointerEvent) => {
          c.el.style.left = `${((ev.clientX - rect.left) / rect.width) * 100}%`;
          c.el.style.top = `${((ev.clientY - rect.top) / rect.height) * 100}%`;
        };
        const up = (ev: PointerEvent) => {
          c.el.removeEventListener("pointermove", move);
          c.el.removeEventListener("pointerup", up);
          c.el.removeEventListener("pointercancel", up);
          c.el.classList.remove("dragging");
          const y = ((ev.clientY - rect.top) / rect.height) * 100;
          const x = ((ev.clientX - rect.left) / rect.width) * 100;
          // Thả gần dây phơi (nửa trên sân) thì móc vào chỗ trống gần nhất.
          if (raining || y > 55 || !hang(c, x)) {
            c.state = "basket";
            const i = clothes.indexOf(c);
            c.el.style.left = `${30 + (i % 3) * 14}%`;
            c.el.style.top = `${72 + Math.floor(i / 3) * 10}%`;
          }
          counts();
        };
        c.el.addEventListener("pointermove", move);
        c.el.addEventListener("pointerup", up);
        c.el.addEventListener("pointercancel", up);
      });
    }

    // Thanh khô chạy theo thời gian phơi.
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      for (const c of clothes) {
        if (c.state !== "hung") continue;
        const p = Math.min(1, (now - c.hungAt) / DRY_MS);
        c.el.querySelector<HTMLElement>(".dry-bar > span")!.style.width = `${p * 100}%`;
        c.el.classList.toggle("is-dry", p >= 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Mây đến sau 9-12 giây, rồi mưa sau RAIN_WARNING_MS.
    const cloudAt = 9000 + Math.random() * 3000;
    await new Promise<void>((resolve) => {
      finish = resolve;
      const cloudTimer = setTimeout(() => {
        yard.classList.add("cloudy");
        statusEl.textContent = "☁️ Sắp mưa!";
        statusEl.classList.add("hurry");
        sfx.thunder();
      }, cloudAt);
      const rainTimer = setTimeout(() => {
        raining = true;
        yard.classList.add("raining");
        statusEl.textContent = "🌧️ Mưa rồi!";
        sfx.rain();
        for (const c of clothes) {
          if (c.state === "hung") {
            c.state = "wet";
            c.el.classList.add("wet");
          }
        }
        setTimeout(resolve, 1200);
      }, cloudAt + RAIN_WARNING_MS);
      finish = () => {
        clearTimeout(cloudTimer);
        clearTimeout(rainTimer);
        resolve();
      };
    });
    cancelAnimationFrame(raf);
    raining = true;
    await sleep(500);

    const dry = clothes.filter((c) => c.state === "collected" && c.dry).length;
    const damp = clothes.filter((c) => c.state === "collected" && !c.dry).length;
    const wet = clothes.filter((c) => c.state === "wet").length;
    const parts = [`Cất khô ${dry}/${CLOTHES.length} cái`];
    if (damp) parts.push(`${damp} cái chưa khô đã cất`);
    if (wet) parts.push(`${wet} cái bị ướt mưa`);
    return { score: laundryScore(dry, damp, CLOTHES.length), detail: parts.join(", ") };
  },
};
