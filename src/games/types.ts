import type { GameId } from "../comments";
import type { Level } from "../levels";
import type { Role } from "../roles";

export interface GameResult {
  score: number;
  /** Tóm tắt kết quả, vd. "Mua đúng 4/5 món". */
  detail: string;
}

export interface Game {
  id: GameId;
  name: string;
  emoji: string;
  howTo(level: Level): string;
  /** Chơi trong `root`, trả kết quả khi xong. */
  play(root: HTMLElement, ctx: { role: Role; level: Level }): Promise<GameResult>;
}

/** Đồng hồ đếm ngược hiển thị ở đầu màn chơi. Trả hàm dừng. */
export function countdown(el: HTMLElement, seconds: number, onEnd: () => void): () => void {
  const end = performance.now() + seconds * 1000;
  let raf = 0;
  const tick = () => {
    const left = Math.max(0, end - performance.now());
    el.textContent = `⏱ ${Math.ceil(left / 1000)}s`;
    el.classList.toggle("hurry", left < 5000);
    if (left <= 0) return onEnd();
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => cancelAnimationFrame(raf);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
