import { byLevel } from "../levels";
import { riceScore } from "../scoring";
import { sfx } from "../sfx";
import { Actors, sceneHtml } from "../scene";
import { sleep, type Game } from "./types";

export const rice: Game = {
  id: "rice",
  name: "Nấu cơm",
  emoji: "🍚",
  howTo: (level) =>
    byLevel(level, [
      "Giữ nút để đổ nước, thả tay đúng vạch. Sau đó bấm rút điện đúng lúc cơm chín, chậm là khê, sớm là sống!",
      "Nước chảy nhanh hơn. Thanh nấu không còn vùng xanh: nhìn qua ô kính, cơm chín khi vừa cạn nước. Để quá là cháy đáy!",
      "Vạch nước chỉ hiện 2 giây rồi biến mất, phải nhớ. Không có thanh nấu: nhìn nước cạn, hơi bốc, vung rung mà đoán!",
    ]),

  async play(root, { role, level }) {
    const pourRate = byLevel(level, [28, 36, 36]); // % mỗi giây khi giữ nút
    const cookMs = byLevel(level, [7000, 6500, 6000]); // thời gian từ gạo sống tới cháy hẳn
    const zone = byLevel(level, [12, 9, 8]); // độ rộng khoảng cơm chín vừa (%)
    const showZone = level.id === "de";
    const showBar = level.id !== "acmong";
    const hideMark = level.id === "acmong";

    const target = 45 + Math.random() * 25; // vạch nước, % chiều cao nồi
    root.innerHTML = `
      <div class="game-bar"><span>🍚 Bước 1: Đổ nước</span><span></span></div>
      ${sceneHtml({
        kind: "kitchen",
        role,
        work: `<div class="pot-scene">
          <div class="pot">
            <div class="stream hidden"></div>
            <div class="water"></div>
            <div class="rice-grains"></div>
            <div class="mark" style="bottom:${target}%"><span>vạch nước</span></div>
          </div>
        </div>`,
      })}
      <button class="btn primary hold">Giữ để đổ nước 💧</button>
      <p class="hint">${hideMark ? "Nhớ kỹ vạch đỏ, nó sắp biến mất!" : "Thả tay ra khi mực nước chạm vạch đỏ."}</p>`;

    const water = root.querySelector<HTMLElement>(".water")!;
    const stream = root.querySelector<HTMLElement>(".stream")!;
    const hold = root.querySelector<HTMLButtonElement>(".hold")!;
    let actors = new Actors(root);
    let waterLevel = 0;
    const potTop = () => {
      const r = root.querySelector(".pot")!.getBoundingClientRect();
      return [r.left + r.width * 0.7, r.top - 10] as const;
    };

    let markTimer = 0;
    if (hideMark) {
      actors.say("Nhìn kỹ vạch nước đi, mẹ cất thước đây!", 2200, true);
      markTimer = window.setTimeout(() => root.querySelector(".mark")?.classList.add("fade"), 2500);
    }

    // Bước 1: giữ để đổ nước. Một lần giữ duy nhất, thả tay là chốt.
    await new Promise<void>((resolve) => {
      let raf = 0;
      let lastT = 0;
      let lastPour = 0;
      const step = (t: number) => {
        if (lastT) waterLevel = Math.min(100, waterLevel + ((t - lastT) / 1000) * pourRate);
        lastT = t;
        water.style.height = `${waterLevel}%`;
        if (!hideMark) {
          if (waterLevel > target + 4) actors.say("Nhiều nước quá rồi đấy!");
          else if (waterLevel > target - 8 && waterLevel < target) actors.say("Từ từ thôi…");
        }
        if (t - lastPour > 140) {
          lastPour = t;
          sfx.pour();
        }
        if (waterLevel >= 100) return release();
        raf = requestAnimationFrame(step);
      };
      const release = () => {
        cancelAnimationFrame(raf);
        stream.classList.add("hidden");
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
          stream.classList.remove("hidden");
          actors.reach(...potTop(), "🫗");
          raf = requestAnimationFrame(step);
          hold.addEventListener("pointerup", release);
          hold.addEventListener("pointerleave", release);
          hold.addEventListener("pointercancel", release);
        },
        { once: true },
      );
    });
    clearTimeout(markTimer);

    const waterDiff = waterLevel - target;
    const waterNote = Math.abs(waterDiff) <= 3 ? "Nước vừa chuẩn" : waterDiff > 0 ? "Hơi nhiều nước" : "Hơi ít nước";
    hold.disabled = true;
    hold.textContent = waterNote;
    // Hiện lại vạch để người chơi thấy mình lệch bao nhiêu.
    root.querySelector(".mark")?.classList.remove("fade");
    actors.relax();
    if (Math.abs(waterDiff) <= 3) {
      sfx.good();
      actors.mood("happy");
      actors.say("Chuẩn rồi, cắm điện đi!", 1500, true);
    } else {
      sfx.bad();
      actors.mood("shock");
      actors.say(waterDiff > 0 ? "Thế này thì thành cháo mất!" : "Ít nước thế, cơm khô như sỏi!", 1500, true);
    }
    actors.dispose();
    await sleep(1200);

    // Bước 2: nấu. Nhìn qua ô kính: nước cạn dần là sắp chín, quá vùng chín thì cháy đáy.
    const zoneStart = 55 + Math.random() * 25;
    const zoneEnd = zoneStart + zone;
    root.innerHTML = `
      <div class="game-bar"><span>🔥 Bước 2: Canh cơm</span><span></span></div>
      ${sceneHtml({
        kind: "kitchen",
        role,
        work: `<div class="pot-scene">
          <div class="rc">
            <div class="rc-steam"><span></span><span></span><span></span></div>
            <div class="rc-lid"><i></i></div>
            <div class="rc-body">
              <div class="rc-window">
                <div class="rc-rice"></div>
                <div class="rc-water"></div>
                <div class="rc-crust"></div>
              </div>
              <div class="rc-panel"><span class="rc-light"></span>NẤU</div>
            </div>
          </div>
        </div>`,
      })}
      <div class="cook-bar ${showBar ? "" : "hidden"}">
        ${showZone ? `<div class="zone" style="left:${zoneStart}%;width:${zone}%"></div>` : ""}
        <div class="needle"></div>
        <div class="labels"><span>Sống</span><span>Chín</span><span>Khê</span></div>
      </div>
      <button class="btn primary unplug">Rút điện 🔌</button>
      <p class="hint">${showZone ? "Bấm khi kim nằm trong vùng xanh." : "Cơm chín khi vừa cạn nước trong ô kính."}</p>`;

    actors = new Actors(root);
    const rc = root.querySelector<HTMLElement>(".rc")!;
    const needle = root.querySelector<HTMLElement>(".needle")!;
    let saidSmell = false;
    let saidBurn = false;
    let pos = 0;
    /** Vẽ nồi theo tiến độ nấu: nước cạn dần, gạo nở, cháy đáy, hơi thành khói. */
    const render = () => {
      const waterLeft = Math.max(0, 1 - pos / zoneStart);
      const cooked = Math.min(1, pos / zoneStart);
      const burnt = Math.max(0, (pos - zoneEnd) / (100 - zoneEnd));
      rc.style.setProperty("--water", String(waterLeft));
      rc.style.setProperty("--cooked", String(cooked));
      rc.style.setProperty("--burnt", String(burnt));
      rc.style.setProperty("--steam", String(Math.min(1, pos / (zoneStart * 0.8))));
      rc.classList.toggle("boiling", pos > 15 && waterLeft > 0);
      rc.classList.toggle("rattle", pos > zoneStart - 14);
      rc.classList.toggle("smoke", pos > zoneEnd + 4);
    };
    render();

    await new Promise<void>((resolve) => {
      const start = performance.now();
      let raf = 0;
      const step = (t: number) => {
        pos = Math.min(100, ((t - start) / cookMs) * 100);
        needle.style.left = `${pos}%`;
        render();
        if (!saidSmell && pos > 35) {
          saidSmell = true;
          actors.say("Ngửi xem cơm chín chưa…", 1500);
        }
        if (!saidBurn && pos > zoneEnd + 8) {
          saidBurn = true;
          actors.say("Khét! Khét rồi kìa!", 1500, true);
        }
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

    const c = rc.getBoundingClientRect();
    actors.reach(c.right - 10, c.top + c.height * 0.7, "🔌");
    const cookDiff = pos < zoneStart ? zoneStart - pos : pos > zoneEnd ? pos - zoneEnd : 0;
    const cookNote = cookDiff === 0 ? "cơm chín tới" : pos < zoneStart ? "cơm còn sống" : "cơm bị khê";
    root.querySelector<HTMLButtonElement>(".unplug")!.disabled = true;
    rc.classList.remove("boiling", "rattle");
    rc.classList.add("off", cookDiff === 0 ? "done" : pos < zoneStart ? "raw" : "burnt");
    // Lộ vùng chín trên thanh để người chơi biết mình lệch bao nhiêu.
    const bar = root.querySelector<HTMLElement>(".cook-bar")!;
    if (!showZone) bar.insertAdjacentHTML("afterbegin", `<div class="zone" style="left:${zoneStart}%;width:${zone}%"></div>`);
    bar.classList.remove("hidden");
    if (cookDiff === 0) {
      sfx.ding();
      actors.mood("happy");
      actors.say("Thơm quá, cơm dẻo rồi!", 1500, true);
    } else {
      sfx.bad();
      actors.mood("shock");
      actors.say(pos < zoneStart ? "Rút sớm thế, cơm còn sống nguyên!" : "Cháy khét cả nồi rồi!", 1500, true);
    }
    await sleep(1800);
    actors.dispose();

    return {
      score: riceScore(waterDiff, cookDiff),
      detail: `${waterNote}, ${cookNote}`,
    };
  },
};
