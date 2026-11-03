import { riceScore } from "../scoring";
import { sfx } from "../sfx";
import { sleep, type Game } from "./types";

const POUR_RATE = 28; // % mỗi giây khi giữ nút
const COOK_MS = 7000; // thời gian thanh "chín" chạy từ 0 tới 100
const ZONE = 12; // độ rộng vùng cơm chín vừa (%)

export const rice: Game = {
  id: "rice",
  name: "Nấu cơm",
  emoji: "🍚",
  howTo: "Giữ nút để đổ nước, thả tay đúng vạch. Sau đó bấm rút điện đúng lúc cơm chín, chậm là khê, sớm là sống!",

  async play(root) {
    const target = 45 + Math.random() * 25; // vạch nước, % chiều cao nồi
    root.innerHTML = `
      <div class="game-bar"><span>🍚 Bước 1: Đổ nước</span><span></span></div>
      <div class="pot-scene">
        <div class="pot">
          <div class="water"></div>
          <div class="rice-grains"></div>
          <div class="mark" style="bottom:${target}%"><span>vạch nước</span></div>
        </div>
      </div>
      <button class="btn primary hold">Giữ để đổ nước 💧</button>
      <p class="hint">Thả tay ra khi mực nước chạm vạch đỏ.</p>`;

    const water = root.querySelector<HTMLElement>(".water")!;
    const hold = root.querySelector<HTMLButtonElement>(".hold")!;
    let level = 0;

    // Bước 1: giữ để đổ nước. Một lần giữ duy nhất, thả tay là chốt.
    await new Promise<void>((resolve) => {
      let raf = 0;
      let lastT = 0;
      let lastPour = 0;
      const step = (t: number) => {
        if (lastT) level = Math.min(100, level + ((t - lastT) / 1000) * POUR_RATE);
        lastT = t;
        water.style.height = `${level}%`;
        if (t - lastPour > 140) {
          lastPour = t;
          sfx.pour();
        }
        if (level >= 100) return release();
        raf = requestAnimationFrame(step);
      };
      const release = () => {
        cancelAnimationFrame(raf);
        hold.removeEventListener("pointerup", release);
        hold.removeEventListener("pointerleave", release);
        hold.removeEventListener("pointercancel", release);
        resolve();
      };
      hold.addEventListener(
        "pointerdown",
        (e) => {
          e.preventDefault();
          hold.classList.add("active");
          raf = requestAnimationFrame(step);
          hold.addEventListener("pointerup", release);
          hold.addEventListener("pointerleave", release);
          hold.addEventListener("pointercancel", release);
        },
        { once: true },
      );
    });

    const waterDiff = level - target;
    const waterNote = Math.abs(waterDiff) <= 3 ? "Nước vừa chuẩn" : waterDiff > 0 ? "Hơi nhiều nước" : "Hơi ít nước";
    hold.disabled = true;
    hold.textContent = waterNote;
    Math.abs(waterDiff) <= 3 ? sfx.good() : sfx.bad();
    await sleep(1000);

    // Bước 2: nấu, bấm rút điện khi kim chạy vào vùng chín.
    const zoneStart = 55 + Math.random() * 25;
    root.innerHTML = `
      <div class="game-bar"><span>🔥 Bước 2: Canh cơm</span><span></span></div>
      <div class="pot-scene"><div class="cooker">🍚<div class="steam">♨️</div></div></div>
      <div class="cook-bar">
        <div class="zone" style="left:${zoneStart}%;width:${ZONE}%"></div>
        <div class="needle"></div>
        <div class="labels"><span>Sống</span><span>Chín</span><span>Khê</span></div>
      </div>
      <button class="btn primary unplug">Rút điện 🔌</button>
      <p class="hint">Bấm khi kim nằm trong vùng xanh.</p>`;

    const needle = root.querySelector<HTMLElement>(".needle")!;
    const steam = root.querySelector<HTMLElement>(".steam")!;
    let pos = 0;
    await new Promise<void>((resolve) => {
      const start = performance.now();
      let raf = 0;
      const step = (t: number) => {
        pos = Math.min(100, ((t - start) / COOK_MS) * 100);
        needle.style.left = `${pos}%`;
        steam.style.opacity = String(Math.min(1, pos / 50));
        if (pos >= 100) return done();
        raf = requestAnimationFrame(step);
      };
      const done = () => {
        cancelAnimationFrame(raf);
        resolve();
      };
      root.querySelector(".unplug")!.addEventListener("click", done, { once: true });
      raf = requestAnimationFrame(step);
    });

    const cookDiff = pos < zoneStart ? zoneStart - pos : pos > zoneStart + ZONE ? pos - (zoneStart + ZONE) : 0;
    const cookNote = cookDiff === 0 ? "cơm chín tới" : pos < zoneStart ? "cơm còn sống" : "cơm bị khê";
    root.querySelector<HTMLButtonElement>(".unplug")!.disabled = true;
    root.querySelector(".cooker")!.classList.add(cookDiff === 0 ? "done" : pos < zoneStart ? "raw" : "burnt");
    cookDiff === 0 ? sfx.ding() : sfx.bad();
    await sleep(1200);

    return {
      score: riceScore(waterDiff, cookDiff),
      detail: `${waterNote}, ${cookNote}`,
    };
  },
};
