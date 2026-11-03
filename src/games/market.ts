import { marketScore } from "../scoring";
import { sfx } from "../sfx";
import { Actors, pick, sceneHtml } from "../scene";
import { byLevel } from "../levels";
import { countdown, sleep, type Game } from "./types";

interface Item {
  emoji: string;
  name: string;
  /** Đơn vị khi mua theo số lượng, vd. "3 quả cà chua". */
  unit: string;
  /** Món dễ nhầm, được ưu tiên bày cạnh để đánh lừa. */
  lookalike?: string;
}

const ITEMS: Item[] = [
  { emoji: "🧄", name: "tỏi", unit: "củ", lookalike: "🧅" },
  { emoji: "🧅", name: "hành tây", unit: "củ", lookalike: "🧄" },
  { emoji: "🌶️", name: "ớt", unit: "quả", lookalike: "🫑" },
  { emoji: "🫑", name: "ớt chuông", unit: "quả", lookalike: "🌶️" },
  { emoji: "🍅", name: "cà chua", unit: "quả", lookalike: "🍎" },
  { emoji: "🍎", name: "táo", unit: "quả", lookalike: "🍅" },
  { emoji: "🥔", name: "khoai tây", unit: "củ", lookalike: "🍠" },
  { emoji: "🍠", name: "khoai lang", unit: "củ", lookalike: "🥔" },
  { emoji: "🐟", name: "cá", unit: "con", lookalike: "🦐" },
  { emoji: "🦐", name: "tôm", unit: "lạng", lookalike: "🐟" },
  { emoji: "🥬", name: "rau cải", unit: "bó", lookalike: "🥦" },
  { emoji: "🥦", name: "súp lơ", unit: "cây", lookalike: "🥬" },
  { emoji: "🥒", name: "dưa chuột", unit: "quả", lookalike: "🍆" },
  { emoji: "🍆", name: "cà tím", unit: "quả", lookalike: "🥒" },
  { emoji: "🍋", name: "chanh", unit: "quả", lookalike: "🍊" },
  { emoji: "🍊", name: "cam", unit: "quả", lookalike: "🍋" },
  { emoji: "🥚", name: "trứng", unit: "quả" },
  { emoji: "🥕", name: "cà rốt", unit: "củ" },
  { emoji: "🍄", name: "nấm", unit: "gói" },
  { emoji: "🍌", name: "chuối", unit: "nải" },
  { emoji: "🥩", name: "thịt", unit: "miếng" },
  { emoji: "🌽", name: "ngô", unit: "bắp" },
];

const VENDOR_HELLO = ["Rau sạch đây em ơi, mua gì cô lấy cho!", "Hàng mới về sáng nay, tươi lắm em!", "Vào xem đi em, cô bán rẻ!"];
const VENDOR_PICK = ["Ừ, cái này ngon đấy!", "Em chọn khéo ghê!", "Lấy thêm đi em!", "Cô cân cho nhé!"];

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export const market: Game = {
  id: "market",
  name: "Đi chợ",
  emoji: "🛒",
  howTo: (level) =>
    byLevel(level, [
      "Nhớ danh sách 5 món trong 6 giây, rồi chọn đúng món ở sạp. Mua nhầm bị trừ điểm!",
      "Nhớ cả món lẫn số lượng (vd. 3 quả cà chua). Chạm món để bỏ vào giỏ, chạm trong giỏ để bỏ ra.",
      "6 món kèm số lượng, chỉ 5 giây để nhớ. Cô bán hàng sẽ xếp lại sạp và lén bỏ thêm đồ vào giỏ, coi chừng!",
    ]),

  async play(root, { role, level }) {
    const listSize = byLevel(level, [5, 5, 6]);
    const stallSize = byLevel(level, [12, 16, 16]);
    const memorize = byLevel(level, [6, 7, 5]);
    const shopSeconds = byLevel(level, [20, 22, 20]);
    const withQty = level.id !== "de";
    const sneaky = level.id === "acmong";

    const wanted = shuffle(ITEMS).slice(0, listSize);
    const qty = new Map(wanted.map((i) => [i.emoji, withQty ? 1 + Math.floor(Math.random() * 3) : 1]));
    const totalUnits = [...qty.values()].reduce((a, b) => a + b, 0);
    // Bày món dễ nhầm trước, rồi thêm món ngẫu nhiên cho đủ sạp.
    const decoys = wanted.map((i) => ITEMS.find((x) => x.emoji === i.lookalike)).filter((x): x is Item => !!x && !qty.has(x.emoji));
    const rest = shuffle(ITEMS.filter((i) => !qty.has(i.emoji) && !decoys.includes(i)));
    let stall = shuffle([...wanted, ...decoys, ...rest].slice(0, stallSize));
    const itemOf = (e: string) => ITEMS.find((i) => i.emoji === e)!;

    // Bước 1: nhớ danh sách (chỉ có chữ, phải tự hình dung ra món).
    root.innerHTML = `
      <div class="game-bar"><span>📝 Ghi nhớ</span><span class="timer"></span></div>
      <div class="note">
        <div class="note-title">${role.judge} dặn mua:</div>
        <ol>${wanted.map((i) => `<li>${withQty ? `${qty.get(i.emoji)} ${i.unit} ` : ""}${i.name}</li>`).join("")}</ol>
      </div>`;
    await new Promise<void>((resolve) => countdown(root.querySelector(".timer")!, memorize, resolve));

    // Bước 2: đi chợ. Giỏ đếm theo số lượng từng món.
    const basket = new Map<string, number>();
    const units = () => [...basket.values()].reduce((a, b) => a + b, 0);
    const stallHtml = () => stall.map((i) => `<button class="stall-item" data-emoji="${i.emoji}" aria-label="${i.name}">${i.emoji}</button>`).join("");
    root.innerHTML = `
      <div class="game-bar"><span>🧺 Giỏ: <b class="count">0</b> món</span><span class="timer"></span></div>
      ${sceneHtml({
        kind: "market",
        role,
        speaker: { emoji: "👩‍🌾", name: "Cô bán rau" },
        work: `<div class="stall">${stallHtml()}</div>`,
      })}
      <div class="basket-row"><span class="basket-icon">🧺</span><div class="basket-items"><span class="muted small">Giỏ còn trống</span></div></div>
      <p class="hint">Chạm món ở sạp để bỏ vào giỏ. Chạm món trong giỏ để bỏ bớt.</p>
      <button class="btn primary pay">Thanh toán</button>`;
    const actors = new Actors(root);
    actors.say(pick(VENDOR_HELLO), 1800, true);
    const basketEl = root.querySelector<HTMLElement>(".basket-items")!;

    const renderBasket = () => {
      root.querySelector(".count")!.textContent = String(units());
      basketEl.innerHTML = basket.size
        ? [...basket.entries()].map(([e, n]) => `<button class="in-basket" data-emoji="${e}">${e}${n > 1 ? `<b>×${n}</b>` : ""}</button>`).join("")
        : `<span class="muted small">Giỏ còn trống</span>`;
    };

    /** Bay một bản sao món từ sạp xuống giỏ cho trực quan. */
    const fly = (from: HTMLElement, emoji: string) => {
      const a = from.getBoundingClientRect();
      const b = root.querySelector(".basket-icon")!.getBoundingClientRect();
      const ghost = document.createElement("div");
      ghost.className = "flyer";
      ghost.textContent = emoji;
      ghost.style.left = `${a.left + a.width / 2}px`;
      ghost.style.top = `${a.top + a.height / 2}px`;
      document.body.appendChild(ghost);
      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(0.5)`;
        ghost.style.opacity = "0.3";
      });
      setTimeout(() => ghost.remove(), 450);
    };

    const add = (e: string, btn: HTMLElement) => {
      basket.set(e, (basket.get(e) ?? 0) + 1);
      fly(btn, e);
      setTimeout(renderBasket, 380);
      const r = btn.getBoundingClientRect();
      actors.reach(r.left + r.width / 2, r.top + r.height / 2);
      setTimeout(() => actors.relax(), 350);
      actors.say(pick(VENDOR_PICK));
      sfx.tap();
    };

    const bindStall = () =>
      root.querySelectorAll<HTMLButtonElement>(".stall-item").forEach((btn) => btn.addEventListener("click", () => add(btn.dataset.emoji!, btn)));
    bindStall();
    basketEl.addEventListener("click", (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>(".in-basket");
      if (!btn) return;
      const e = btn.dataset.emoji!;
      const n = (basket.get(e) ?? 0) - 1;
      if (n > 0) basket.set(e, n);
      else basket.delete(e);
      renderBasket();
      sfx.tap();
    });

    // Giữa chừng cô bán hàng dụ mua thêm một món không có trong danh sách.
    const upsell = stall.find((i) => !qty.has(i.emoji))!;
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        actors.say(`Mua thêm ít ${upsell.name} không em? Cô bớt cho!`, 2200, true);
        root.querySelector(`.stall-item[data-emoji="${upsell.emoji}"]`)?.classList.add("promo");
      }, 6000),
    );
    if (sneaky) {
      // Lén bỏ thêm một món vào giỏ.
      timers.push(
        window.setTimeout(() => {
          const extra = shuffle(stall.filter((i) => !qty.has(i.emoji)))[0];
          basket.set(extra.emoji, (basket.get(extra.emoji) ?? 0) + 1);
          renderBasket();
          basketEl.querySelector(`[data-emoji="${extra.emoji}"]`)?.classList.add("sneak");
          actors.say("Cô bỏ thêm cho em ít, khỏi cảm ơn!", 2000, true);
          sfx.tap();
        }, 9000),
      );
      // Xếp lại sạp: món đổi chỗ, phải tìm lại.
      timers.push(
        window.setTimeout(() => {
          stall = shuffle(stall);
          root.querySelector(".stall")!.innerHTML = stallHtml();
          root.querySelector(".stall")!.classList.add("reshuffle");
          bindStall();
          actors.say("Để cô xếp lại hàng cho đẹp nhé!", 1800, true);
        }, 13000),
      );
    }

    await new Promise<void>((resolve) => {
      const stop = countdown(root.querySelector(".timer")!, shopSeconds, resolve);
      root.querySelector(".pay")!.addEventListener("click", () => {
        stop();
        resolve();
      });
    });
    timers.forEach(clearTimeout);

    // Chấm theo từng đơn vị: đúng món, đúng số lượng.
    let correct = 0;
    let wrong = 0;
    for (const [e, n] of basket) {
      const want = qty.get(e) ?? 0;
      correct += Math.min(n, want);
      wrong += Math.max(0, n - want);
    }

    // Lật kết quả: đúng xanh, nhầm đỏ, quên/thiếu viền vàng.
    root.querySelectorAll<HTMLButtonElement>(".stall-item").forEach((btn) => {
      const e = btn.dataset.emoji!;
      const got = basket.get(e) ?? 0;
      const want = qty.get(e) ?? 0;
      btn.disabled = true;
      if (want && got === want) btn.classList.add("right");
      else if (!want && got) btn.classList.add("wrong");
      else if (want) {
        btn.classList.add(got > want ? "wrong" : "missed");
        if (withQty) btn.insertAdjacentHTML("beforeend", `<small class="tally">${got}/${want}</small>`);
      }
    });
    basketEl.querySelectorAll<HTMLButtonElement>(".in-basket").forEach((b) => {
      b.disabled = true;
      b.classList.add(qty.get(b.dataset.emoji!) === basket.get(b.dataset.emoji!) ? "right" : "wrong");
    });
    root.querySelector(".pay")?.remove();
    if (wrong || correct < totalUnits) {
      sfx.bad();
      actors.mood("shock");
      actors.say(wrong ? "Cảm ơn em nhé, lần sau lại mua nhầm ủng hộ cô!" : "Còn thiếu đồ kìa em ơi!", 1800, true);
    } else {
      sfx.good();
      actors.mood("happy");
      actors.say("Đi chợ khéo thế, cô tặng thêm nắm hành!", 1600, true);
    }
    await sleep(2000);
    actors.dispose();

    const wrongNames = [...basket.keys()].filter((e) => !qty.has(e)).map((e) => itemOf(e).name);
    const qtyOff = wanted.filter((i) => basket.has(i.emoji) && basket.get(i.emoji) !== qty.get(i.emoji)).length;
    const parts = [withQty ? `Đúng ${correct}/${totalUnits} phần` : `Mua đúng ${correct}/${totalUnits} món`];
    if (wrongNames.length) parts.push(`mua nhầm ${wrongNames.join(", ")}`);
    if (withQty && qtyOff) parts.push(`${qtyOff} món sai số lượng`);
    return { score: marketScore(correct, wrong, totalUnits), detail: parts.join(", ") };
  },
};
