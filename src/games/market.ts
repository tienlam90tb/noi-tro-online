import { marketScore } from "../scoring";
import { sfx } from "../sfx";
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

  async play(root) {
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
      <p class="hint">Chạm vào món cần mua. Chạm lần nữa để bỏ ra.</p>
      <div class="stall">${stall.map((i) => `<button class="stall-item" data-emoji="${i.emoji}" aria-label="${i.name}">${i.emoji}</button>`).join("")}</div>
      <button class="btn primary pay">Thanh toán</button>`;

    await new Promise<void>((resolve) => {
      const stop = countdown(root.querySelector(".timer")!, SHOP_SECONDS, resolve);
      root.querySelector(".pay")!.addEventListener("click", () => {
        stop();
        resolve();
      });
      root.querySelectorAll<HTMLButtonElement>(".stall-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const e = btn.dataset.emoji!;
          if (picked.has(e)) picked.delete(e);
          else picked.add(e);
          btn.classList.toggle("picked", picked.has(e));
          root.querySelector(".count")!.textContent = String(picked.size);
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
    root.querySelector(".pay")?.remove();
    if (wrong.length || correct.length < LIST_SIZE) sfx.bad();
    else sfx.good();
    await sleep(1600);

    const wrongNames = wrong.map((e) => ITEMS.find((i) => i.emoji === e)!.name);
    return {
      score: marketScore(correct.length, wrong.length, LIST_SIZE),
      detail: `Mua đúng ${correct.length}/${LIST_SIZE} món${wrongNames.length ? `, mua nhầm ${wrongNames.join(", ")}` : ""}`,
    };
  },
};
