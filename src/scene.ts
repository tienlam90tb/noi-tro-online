// Cảnh nền và nhân vật dùng chung cho các minigame: người chơi đứng làm việc,
// tay đưa theo ngón tay; người chấm ló ra nói chen theo lúc chơi.

import type { Role } from "./roles";

export interface SceneOptions {
  /** Lớp cảnh: kitchen (bếp), market (chợ), yard (sân). */
  kind: "kitchen" | "market" | "yard";
  role: Role;
  /** Người đứng nói chen; mặc định là người chấm của vai. */
  speaker?: { emoji: string; name: string };
  /** HTML của khu vực làm việc (bồn rửa, nồi cơm…), đặt trên mặt bàn. */
  work: string;
}

export function sceneHtml(o: SceneOptions): string {
  const speaker = o.speaker ?? { emoji: o.role.judgeEmoji, name: o.role.judge };
  const backdrop =
    o.kind === "kitchen"
      ? `<div class="k-cabinets"><span></span><span></span><span></span></div>
         <div class="k-window"><div class="k-curtain l"></div><div class="k-curtain r"></div></div>
         <div class="k-shelf">🫙🧂🍶</div>`
      : o.kind === "market"
        ? `<div class="m-awning"></div><div class="m-sign">Sạp rau cô Ba</div>`
        : "";
  return `
    <div class="scene ${o.kind} role-${o.role.id}">
      <div class="backdrop">${backdrop}</div>
      <div class="person">
        <div class="head">${o.role.emoji}</div>
        <div class="torso"><div class="apron"></div></div>
      </div>
      <svg class="arms" preserveAspectRatio="none">
        <line class="arm l" /><line class="arm r" />
        <circle class="hand l" r="7" /><circle class="hand r" r="7" />
      </svg>
      <div class="tool hidden"></div>
      <div class="counter"><div class="work">${o.work}</div></div>
      <div class="speaker">
        <div class="say hidden"></div>
        <span class="speaker-emoji" title="${speaker.name}">${speaker.emoji}</span>
      </div>
    </div>`;
}

/** Điều khiển nhân vật và người nói chen sau khi cảnh đã được gắn vào DOM. */
export class Actors {
  private scene: HTMLElement;
  private svg: SVGSVGElement;
  private sayEl: HTMLElement;
  private tool: HTMLElement;
  private sayTimer = 0;
  private lastSay = 0;
  private rest: { l: [number, number]; r: [number, number] } | null = null;

  constructor(root: HTMLElement) {
    this.scene = root.querySelector(".scene, .yard")!;
    this.svg = root.querySelector(".arms")!;
    this.sayEl = root.querySelector(".say")!;
    this.tool = root.querySelector(".tool")!;
    requestAnimationFrame(() => this.relax());
    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => this.relax();

  private hasArms() {
    return !!this.svg && !!this.scene.querySelector(".torso") && !!this.scene.querySelector(".work");
  }

  private shoulders() {
    const s = this.scene.getBoundingClientRect();
    const t = this.scene.querySelector(".torso")!.getBoundingClientRect();
    const y = t.top - s.top + 14;
    return { l: [t.left - s.left + 8, y] as [number, number], r: [t.right - s.left - 8, y] as [number, number], s };
  }

  private draw(side: "l" | "r", from: [number, number], to: [number, number]) {
    const line = this.svg.querySelector<SVGLineElement>(`.arm.${side}`)!;
    const hand = this.svg.querySelector<SVGCircleElement>(`.hand.${side}`)!;
    line.setAttribute("x1", String(from[0]));
    line.setAttribute("y1", String(from[1]));
    line.setAttribute("x2", String(to[0]));
    line.setAttribute("y2", String(to[1]));
    hand.setAttribute("cx", String(to[0]));
    hand.setAttribute("cy", String(to[1]));
  }

  /** Tay về tư thế nghỉ: hai tay đặt lên mép khu vực làm việc. */
  relax() {
    if (!this.hasArms()) return;
    const { l, r, s } = this.shoulders();
    const w = this.scene.querySelector(".work")!.getBoundingClientRect();
    const restY = w.top - s.top + Math.min(40, w.height / 3);
    this.rest = { l: [w.left - s.left + w.width * 0.18, restY], r: [w.right - s.left - w.width * 0.18, restY] };
    this.draw("l", l, this.rest.l);
    this.draw("r", r, this.rest.r);
    this.tool.classList.add("hidden");
  }

  /** Đưa tay phải tới điểm (toạ độ màn hình), có thể cầm theo dụng cụ (emoji). */
  reach(clientX: number, clientY: number, tool?: string) {
    if (!this.hasArms()) return;
    const { l, r, s } = this.shoulders();
    const to: [number, number] = [clientX - s.left, clientY - s.top];
    this.draw("r", r, to);
    if (this.rest) this.draw("l", l, this.rest.l);
    if (tool) {
      this.tool.textContent = tool;
      this.tool.classList.remove("hidden");
      this.tool.style.transform = `translate(${to[0]}px, ${to[1]}px) translate(-50%, -50%)`;
    }
  }

  /** Người chấm nói chen; câu mới chỉ thay câu cũ nếu đủ lâu, trừ khi `force`. */
  say(text: string, ms = 1600, force = false) {
    const now = performance.now();
    if (!force && now - this.lastSay < 900) return;
    this.lastSay = now;
    this.sayEl.textContent = text;
    this.sayEl.classList.remove("hidden");
    this.sayEl.classList.remove("pop");
    void this.sayEl.offsetWidth;
    this.sayEl.classList.add("pop");
    clearTimeout(this.sayTimer);
    this.sayTimer = window.setTimeout(() => this.sayEl.classList.add("hidden"), ms);
  }

  /** Hiệu ứng cảm xúc của nhân vật chính: happy (nhảy), shock (lắc đầu). */
  mood(kind: "happy" | "shock") {
    const person = this.scene.querySelector(".person")!;
    person.classList.remove("happy", "shock");
    void (person as HTMLElement).offsetWidth;
    person.classList.add(kind);
  }

  dispose() {
    clearTimeout(this.sayTimer);
    window.removeEventListener("resize", this.onResize);
  }
}

export const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
