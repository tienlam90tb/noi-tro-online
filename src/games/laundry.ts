import { laundryScore } from "../scoring";
import { sfx } from "../sfx";
import { Actors } from "../scene";
import { byLevel } from "../levels";
import { sleep, type Game } from "./types";

const ALL_CLOTHES = ["👕", "👖", "👗", "🧦", "🩳", "🧣", "👚", "🥼", "👔", "🧤"];

type State = "basket" | "drag" | "hung" | "blown" | "muddy" | "collected" | "wet";

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
  howTo: (level) =>
    byLevel(level, [
      "Kéo quần áo từ chậu lên dây phơi. Thấy mây đen kéo đến thì chạm vào từng cái để cất vào nhà trước khi mưa!",
      "8 món, 2 dây phơi, gió thổi 2 lần. Không có thanh báo khô: đồ còn sẫm màu và nhỏ giọt là chưa khô!",
      "10 món, gió giật 3 lần, mây đến là mưa gần như ngay. Cất đồ chưa khô chỉ được nửa điểm!",
    ]),

  async play(root, { role, level }) {
    const CLOTHES = ALL_CLOTHES.slice(0, byLevel(level, [6, 8, 10]));
    const DRY_MS = byLevel(level, [4500, 5000, 5000]); // thời gian phơi để khô
    const RAIN_WARNING_MS = byLevel(level, [3500, 2800, 2300]); // từ lúc mây đến lúc mưa
    const gustCount = byLevel(level, [1, 2, 3]);
    const twoLines = CLOTHES.length > 6;
    root.innerHTML = `
      <div class="game-bar"><span>👕 Đã phơi: <b class="hung-count">0</b>/${CLOTHES.length}</span><span class="status">☀️ Nắng đẹp</span></div>
      <div class="yard ${level.id === "de" ? "show-dry" : ""} ${twoLines ? "two-lines" : ""}">
        <div class="sun">☀️</div>
        <div class="cloud">🌧️</div>
        <div class="rain"></div>
        <div class="line"></div>${twoLines ? `<div class="line l2"></div>` : ""}
        <div class="basket">🧺</div>
        <div class="house">🏠<small>Đã cất: <b class="in-count">0</b></small></div>
        <div class="person yard-person role-${role.id}"><div class="head">${role.emoji}</div><div class="torso"><div class="apron"></div></div></div>
        <div class="speaker"><div class="say hidden"></div><span class="speaker-emoji">${role.judgeEmoji}</span></div>
      </div>
      <p class="hint">Kéo đồ lên dây. Chạm vào đồ đang phơi để cất.</p>`;

    const yard = root.querySelector<HTMLElement>(".yard")!;
    const actors = new Actors(root);
    actors.say("Nắng đẹp, phơi đồ nhanh lên!", 1800, true);
    const statusEl = root.querySelector<HTMLElement>(".status")!;
    // Chỗ móc đồ: một dây 6 chỗ, hoặc hai dây chia đôi khi nhiều đồ.
    const perLine = twoLines ? Math.ceil(CLOTHES.length / 2) : CLOTHES.length;
    const slotPos = CLOTHES.map((_, i) => {
      const row = Math.floor(i / perLine);
      const col = i % perLine;
      return { x: 8 + col * (84 / (perLine - 1)), y: row ? 43.5 : 22.5 };
    });
    const slots: (Cloth | null)[] = CLOTHES.map(() => null);
    const basketXY = (i: number) => ({ x: 26 + (i % 4) * 11, y: 70 + Math.floor(i / 4) * 9 });

    const clothes: Cloth[] = CLOTHES.map((emoji, i) => {
      const el = document.createElement("div");
      el.className = "cloth";
      el.innerHTML = `${emoji}<span class="dry-bar"><span></span></span>`;
      el.style.left = `${basketXY(i).x}%`;
      el.style.top = `${basketXY(i).y}%`;
      yard.appendChild(el);
      return { emoji, el, state: "basket", slot: -1, hungAt: 0, dry: false };
    });

    const counts = () => {
      root.querySelector(".hung-count")!.textContent = String(clothes.filter((c) => c.state === "hung").length);
      root.querySelector(".in-count")!.textContent = String(clothes.filter((c) => c.state === "collected").length);
    };

    let raining = false;
    let finish: () => void = () => {};

    const hang = (c: Cloth, xPct: number, yPct: number) => {
      let best = -1;
      let bestD = Infinity;
      slots.forEach((s, i) => {
        const d = Math.hypot(slotPos[i].x - xPct, (slotPos[i].y - yPct) * 2);
        if (!s && d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best < 0) return false;
      slots[best] = c;
      c.slot = best;
      c.state = "hung";
      c.hungAt = performance.now();
      c.el.classList.add("hung");
      c.el.style.left = `${slotPos[best].x}%`;
      c.el.style.top = `${slotPos[best].y}%`;
      sfx.tap();
      return true;
    };

    const collect = (c: Cloth) => {
      slots[c.slot] = null;
      c.state = "collected";
      c.dry = performance.now() - c.hungAt >= DRY_MS;
      c.el.classList.remove("hung", "dripping");
      c.el.classList.add("collected", c.dry ? "is-dry" : "is-damp");
      c.el.style.left = "86%";
      c.el.style.top = "78%";
      c.dry ? sfx.good() : sfx.tap();
      counts();
      if (clothes.every((x) => x.state === "collected" || x.state === "muddy")) finish();
    };

    const basketPos = (c: Cloth) => {
      const p = basketXY(clothes.indexOf(c));
      c.el.style.left = `${p.x}%`;
      c.el.style.top = `${p.y}%`;
    };

    const catchBlown = (c: Cloth) => {
      c.state = "basket";
      c.el.classList.remove("blown");
      basketPos(c);
      sfx.good();
      actors.mood("happy");
      actors.say("Chụp được rồi! Phơi lại đi!", 1400, true);
      counts();
    };

    // Gió thổi rơi một món đang phơi; không chụp kịp thì rơi xuống đất bẩn.
    const windTimers: number[] = [];
    const gust = (tries = 0) => {
      if (raining) return;
      const hung = clothes.filter((c) => c.state === "hung");
      if (!hung.length) {
        if (tries < 5) windTimers.push(window.setTimeout(() => gust(tries + 1), 1000));
        return;
      }
      const c = hung[Math.floor(Math.random() * hung.length)];
      slots[c.slot] = null;
      c.state = "blown";
      c.el.classList.remove("hung", "is-dry", "dripping");
      c.el.classList.add("blown");
      c.el.style.left = `${15 + Math.random() * 55}%`;
      c.el.style.top = "58%";
      yard.classList.add("windy");
      setTimeout(() => yard.classList.remove("windy"), 1200);
      sfx.splash();
      actors.say("Gió thổi bay áo kìa! Chụp lấy!", 1800, true);
      counts();
      windTimers.push(window.setTimeout(() => {
        if (c.state !== "blown") return;
        c.state = "muddy";
        c.el.classList.remove("blown");
        c.el.classList.add("muddy");
        sfx.bad();
        actors.mood("shock");
        actors.say("Rơi xuống đất bẩn hết rồi, lại giặt!", 1800, true);
      }, 2200));
    };
    for (let g = 0, t = 4500; g < gustCount; g++, t += 3500 + Math.random() * 1500) {
      windTimers.push(window.setTimeout(() => gust(), t + Math.random() * 2000));
    }

    // Kéo thả từ chậu lên dây; chạm vào đồ đang phơi để cất.
    for (const c of clothes) {
      c.el.addEventListener("pointerdown", (e) => {
        if (raining) return;
        if (c.state === "blown") return catchBlown(c);
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
          if (raining || y > (twoLines ? 62 : 55) || !hang(c, x, y)) {
            c.state = "basket";
            basketPos(c);
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
        // Đồ ướt sẫm màu và nhỏ giọt, khô dần thì sáng lên.
        c.el.style.setProperty("--wet", (1 - p).toFixed(2));
        c.el.classList.toggle("is-dry", p >= 1);
        c.el.classList.toggle("dripping", p < 0.8);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Mây đến sau cloudAt (càng khó càng muộn vì nhiều đồ hơn), rồi mưa sau RAIN_WARNING_MS.
    const cloudAt = byLevel(level, [9000, 11000, 13000]) + Math.random() * 3000;
    await new Promise<void>((resolve) => {
      finish = resolve;
      const cloudTimer = setTimeout(() => {
        yard.classList.add("cloudy");
        statusEl.textContent = "☁️ Sắp mưa!";
        statusEl.classList.add("hurry");
        sfx.thunder();
        actors.say("Mây đen kìa! Cất đồ vào mau!", 2000, true);
      }, cloudAt);
      const rainTimer = setTimeout(() => {
        raining = true;
        yard.classList.add("raining");
        statusEl.textContent = "🌧️ Mưa rồi!";
        sfx.rain();
        let soaked = 0;
        for (const c of clothes) {
          if (c.state === "hung" || c.state === "blown") {
            c.state = "wet";
            c.el.classList.remove("blown", "dripping", "is-dry");
            c.el.classList.add("wet");
            soaked++;
          }
        }
        if (soaked) {
          actors.mood("shock");
          actors.say("Ướt hết quần áo rồi!", 1600, true);
        }
        setTimeout(resolve, 1200);
      }, cloudAt + RAIN_WARNING_MS);
      finish = () => {
        actors.mood("happy");
        actors.say("Cất xong trước mưa, giỏi!", 1500, true);
        clearTimeout(cloudTimer);
        clearTimeout(rainTimer);
        resolve();
      };
    });
    cancelAnimationFrame(raf);
    windTimers.forEach(clearTimeout);
    raining = true;
    await sleep(900);
    actors.dispose();

    const dry = clothes.filter((c) => c.state === "collected" && c.dry).length;
    const damp = clothes.filter((c) => c.state === "collected" && !c.dry).length;
    const wet = clothes.filter((c) => c.state === "wet").length;
    const muddy = clothes.filter((c) => c.state === "muddy").length;
    const parts = [`Cất khô ${dry}/${CLOTHES.length} cái`];
    if (damp) parts.push(`${damp} cái chưa khô đã cất`);
    if (wet) parts.push(`${wet} cái bị ướt mưa`);
    if (muddy) parts.push(`${muddy} cái bị gió thổi rơi xuống đất`);
    return { score: laundryScore(dry, damp, CLOTHES.length), detail: parts.join(", ") };
  },
};
