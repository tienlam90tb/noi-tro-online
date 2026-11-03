import { marketScore } from "../scoring";
import { sfx } from "../sfx";
import { Actors, pick, sceneHtml } from "../scene";
import { countdown, sleep, type Game } from "./types";

interface Item {
  emoji: string;
  name: string;
  /** Món dễ nhầm, được ưu tiên bày cạnh để đánh lừa. */
  lookalike?: string;
}

const ITEMS: Item[] = [
  { emoji: "🧄", name: "tỏi", lookalike: "🧅" },
  { emoji: "🧅", name: "hành tây", lookalike: "🧄" },
  { emoji: "🌶️", name: "ớt", lookalike: "🫑" },
  { emoji: "🫑", name: "ớt chuông", lookalike: "🌶️" },
  { emoji: "🍅", name: "cà chua", lookalike: "🍎" },
  { emoji: "🍎", name: "táo", lookalike: "🍅" },
  { emoji: "🥔", name: "khoai tây", lookalike: "🍠" },
  { emoji: "🍠", name: "khoai lang", lookalike: "🥔" },
  { emoji: "🐟", name: "cá", lookalike: "🦐" },
  { emoji: "🦐", name: "tôm", lookalike: "🐟" },
  { emoji: "🥬", name: "rau cải", lookalike: "🥦" },
  { emoji: "🥦", name: "súp lơ", lookalike: "🥬" },
  { emoji: "🥒", name: "dưa chuột", lookalike: "🍆" },
  { emoji: "🍆", name: "cà tím", lookalike: "🥒" },
  { emoji: "🍋", name: "chanh", lookalike: "🍊" },
  { emoji: "🍊", name: "cam", lookalike: "🍋" },
  { emoji: "🥚", name: "trứng" },
  { emoji: "🥕", name: "cà rốt" },
  { emoji: "🍄", name: "nấm" },
  { emoji: "🍌", name: "chuối" },
  { emoji: "🥩", name: "thịt" },
  { emoji: "🌽", name: "ngô" },
];

const VENDOR_HELLO = ["Rau sạch đây em ơi, mua gì cô lấy cho!", "Hàng mới về sáng nay, tươi lắm em!", "Vào xem đi em, cô bán rẻ!"];
const VENDOR_PICK = ["Ừ, cái này ngon đấy!", "Em chọn khéo ghê!", "Lấy thêm đi em!", "Cô cân cho nhé!"];

const LIST_SIZE = 5;
const STALL_SIZE = 12;
const MEMORIZE_SECONDS = 6;
const SHOP_SECONDS = 20;

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
  howTo: `Nhớ danh sách ${LIST_SIZE} món trong ${MEMORIZE_SECONDS} giây, rồi chọn đúng món ở sạp. Mua nhầm bị trừ điểm!`,

  async play(root, { role }) {
    const wanted = shuffle(ITEMS).slice(0, LIST_SIZE);
    const wantedSet = new Set(wanted.map((i) => i.emoji));
    // Bày món dễ nhầm trước, rồi thêm món ngẫu nhiên cho đủ sạp.
    const decoys = wanted.map((i) => ITEMS.find((x) => x.emoji === i.lookalike)).filter((x): x is Item => !!x && !wantedSet.has(x.emoji));
    const rest = shuffle(ITEMS.filter((i) => !wantedSet.has(i.emoji) && !decoys.includes(i)));
    const stall = shuffle([...wanted, ...decoys, ...rest].slice(0, STALL_SIZE));

    // Bước 1: nhớ danh sách (chỉ có chữ, phải tự hình dung ra món).
    root.innerHTML = `
      <div class="game-bar"><span>📝 Ghi nhớ</span><span class="timer"></span></div>
      <div class="note">
        <div class="note-title">Mẹ dặn mua:</div>
        <ol>${wanted.map((i) => `<li>${i.name}</li>`).join("")}</ol>
      </div>`;
    await new Promise<void>((resolve) => countdown(root.querySelector(".timer")!, MEMORIZE_SECONDS, resolve));

    // Bước 2: đi chợ.
    const picked = new Set<string>();
    root.innerHTML = `
      <div class="game-bar"><span>🛒 Giỏ: <b class="count">0</b>/${LIST_SIZE}</span><span class="timer"></span></div>
      ${sceneHtml({
        kind: "market",
        role,
        speaker: { emoji: "👩‍🌾", name: "Cô bán rau" },
        work: `<div class="stall">${stall.map((i) => `<button class="stall-item" data-emoji="${i.emoji}" aria-label="${i.name}">${i.emoji}</button>`).join("")}</div>`,
      })}
      <p class="hint">Chạm vào món cần mua. Chạm lần nữa để bỏ ra.</p>
      <button class="btn primary pay">Thanh toán</button>`;
    const actors = new Actors(root);
    actors.say(pick(VENDOR_HELLO), 1800, true);
    // Giữa chừng cô bán hàng dụ mua thêm một món không có trong danh sách.
    const upsell = stall.find((i) => !wantedSet.has(i.emoji))!;
    const upsellTimer = window.setTimeout(() => {
      actors.say(`Mua thêm ít ${upsell.name} không em? Cô bớt cho!`, 2200, true);
      root.querySelector(`.stall-item[data-emoji="${upsell.emoji}"]`)?.classList.add("promo");
    }, 7000);

    await new Promise<void>((resolve) => {
      const stop = countdown(root.querySelector(".timer")!, SHOP_SECONDS, resolve);
      root.querySelector(".pay")!.addEventListener("click", () => {
        stop();
        resolve();
      });
      root.querySelector(".timer")!.addEventListener("animationstart", () => actors.say("Nhanh lên em, cô sắp dọn hàng!", 1500));
      root.querySelectorAll<HTMLButtonElement>(".stall-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const e = btn.dataset.emoji!;
          if (picked.has(e)) picked.delete(e);
          else picked.add(e);
          btn.classList.toggle("picked", picked.has(e));
          root.querySelector(".count")!.textContent = String(picked.size);
          const r = btn.getBoundingClientRect();
          actors.reach(r.left + r.width / 2, r.top + r.height / 2);
          setTimeout(() => actors.relax(), 350);
          if (picked.has(e)) actors.say(pick(VENDOR_PICK));
          sfx.tap();
        });
      });
    });

    // Lật kết quả: đúng xanh, nhầm đỏ, quên viền vàng.
    const correct = [...picked].filter((e) => wantedSet.has(e));
    const wrong = [...picked].filter((e) => !wantedSet.has(e));
    root.querySelectorAll<HTMLButtonElement>(".stall-item").forEach((btn) => {
      const e = btn.dataset.emoji!;
      btn.disabled = true;
      if (picked.has(e)) btn.classList.add(wantedSet.has(e) ? "right" : "wrong");
      else if (wantedSet.has(e)) btn.classList.add("missed");
    });
    clearTimeout(upsellTimer);
    root.querySelector(".pay")?.remove();
    if (wrong.length || correct.length < LIST_SIZE) {
      sfx.bad();
      actors.mood("shock");
      actors.say(wrong.length ? "Cảm ơn em nhé, lần sau lại mua nhầm ủng hộ cô!" : "Còn quên món kìa em ơi!", 1600, true);
    } else {
      sfx.good();
      actors.mood("happy");
      actors.say("Đi chợ khéo thế, cô tặng thêm nắm hành!", 1600, true);
    }
    await sleep(1800);
    actors.dispose();

    const wrongNames = wrong.map((e) => ITEMS.find((i) => i.emoji === e)!.name);
    return {
      score: marketScore(correct.length, wrong.length, LIST_SIZE),
      detail: `Mua đúng ${correct.length}/${LIST_SIZE} món${wrongNames.length ? `, mua nhầm ${wrongNames.join(", ")}` : ""}`,
    };
  },
};
