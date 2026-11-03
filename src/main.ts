import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { drawCertificate, shareCertificate } from "./certificate";
import { pickComment, titleFor } from "./comments";
import { dishes } from "./games/dishes";
import { laundry } from "./games/laundry";
import { market } from "./games/market";
import { rice } from "./games/rice";
import type { Game, GameResult } from "./games/types";
import { byLevel, levelById, LEVELS, type Level } from "./levels";
import { roleById, ROLES, type Role } from "./roles";
import { average } from "./scoring";
import { isMuted, setMuted, sfx } from "./sfx";

registerSW({ immediate: true });

const GAMES: Game[] = [market, dishes, rice, laundry];
const app = document.getElementById("app")!;
const SHARE_URL = location.href.split("#")[0].split("?")[0];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Mức tập sự giữ khoá cũ để không mất kỷ lục đã có.
const bestKey = (roleId: string, level: Level) => `noitro.best.${roleId}${level.id === "de" ? "" : `.${level.id}`}`;
const best = (roleId: string, level: Level) => Number(localStorage.getItem(bestKey(roleId, level)) ?? 0);

function muteButton() {
  return `<button class="icon-btn mute" aria-label="Bật/tắt âm thanh">${isMuted() ? "🔇" : "🔊"}</button>`;
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".mute");
  if (!btn) return;
  setMuted(!isMuted());
  btn.textContent = isMuted() ? "🔇" : "🔊";
});

function home() {
  const lastName = localStorage.getItem("noitro.name") ?? "";
  const lastRole = localStorage.getItem("noitro.role") ?? "chong";
  let level = levelById(localStorage.getItem("noitro.level"));
  app.innerHTML = `
    <header class="top">${muteButton()}</header>
    <main class="home">
      <div class="logo">🏠🍳</div>
      <h1>Nội trợ online</h1>
      <p class="tagline">Ngoài đời rửa bát vỡ bát?<br/>Lên đây chứng minh mình đảm đang!</p>
      <label class="field">Tên của bạn
        <input class="name" maxlength="24" placeholder="Ví dụ: Tuấn" value="${esc(lastName)}" autocomplete="off" />
      </label>
      <div class="field">Bạn là…</div>
      <div class="roles">
        ${ROLES.map(
          (r) => `<button class="role ${r.id === lastRole ? "selected" : ""}" data-role="${r.id}">
            <span class="role-emoji">${r.emoji}</span>${r.label}
            <small class="best"></small>
          </button>`,
        ).join("")}
      </div>
      <p class="muted small">Người chấm: <b class="judge"></b></p>
      <div class="field">Độ khó</div>
      <div class="levels">
        ${LEVELS.map(
          (l) => `<button class="level ${l.id === level.id ? "selected" : ""}" data-level="${l.id}">
            <span class="level-emoji">${l.emoji}</span>${l.label}
          </button>`,
        ).join("")}
      </div>
      <p class="muted small level-desc"></p>
      <button class="btn primary big start">Bắt đầu làm việc nhà</button>
      <p class="muted small">4 việc: ${GAMES.map((g) => `${g.emoji} ${g.name}`).join(" · ")}</p>
    </main>`;

  let roleId = lastRole;
  const judgeEl = app.querySelector<HTMLElement>(".judge")!;
  const showJudge = () => {
    const r = roleById(roleId);
    judgeEl.textContent = `${r.judge} ${r.judgeEmoji}`;
  };
  showJudge();
  const showLevel = () => {
    app.querySelector(".level-desc")!.textContent = level.desc;
    app.querySelectorAll<HTMLElement>(".role").forEach((b) => {
      const n = best(b.dataset.role!, level);
      b.querySelector(".best")!.textContent = n ? `Kỷ lục: ${n}` : "";
    });
  };
  showLevel();
  app.querySelectorAll<HTMLButtonElement>(".level").forEach((btn) =>
    btn.addEventListener("click", () => {
      level = levelById(btn.dataset.level!);
      app.querySelectorAll(".level").forEach((b) => b.classList.toggle("selected", b === btn));
      showLevel();
      sfx.tap();
    }),
  );
  app.querySelectorAll<HTMLButtonElement>(".role").forEach((btn) =>
    btn.addEventListener("click", () => {
      roleId = btn.dataset.role!;
      app.querySelectorAll(".role").forEach((b) => b.classList.toggle("selected", b === btn));
      showJudge();
      sfx.tap();
    }),
  );
  app.querySelector(".start")!.addEventListener("click", () => {
    const name = app.querySelector<HTMLInputElement>(".name")!.value.trim();
    localStorage.setItem("noitro.name", name);
    localStorage.setItem("noitro.role", roleId);
    localStorage.setItem("noitro.level", level.id);
    sfx.tap();
    void run(roleById(roleId), level, name);
  });
}

function intro(game: Game, index: number, level: Level): Promise<void> {
  return new Promise((resolve) => {
    app.innerHTML = `
      <header class="top"><span class="step">Việc ${index + 1}/${GAMES.length} · ${level.emoji} ${level.label}</span>${muteButton()}</header>
      <main class="center">
        <div class="big-emoji">${game.emoji}</div>
        <h2>${game.name}</h2>
        <p class="howto">${game.howTo(level)}</p>
        <button class="btn primary big go">Sẵn sàng!</button>
      </main>`;
    app.querySelector(".go")!.addEventListener("click", () => {
      sfx.tap();
      resolve();
    });
  });
}

function verdict(role: Role, game: Game, result: GameResult): Promise<void> {
  const comment = pickComment(game.id, result.score, role.call);
  return new Promise((resolve) => {
    app.innerHTML = `
      <header class="top"><span class="step">${game.emoji} ${game.name}</span>${muteButton()}</header>
      <main class="center">
        <div class="score-pop ${result.score >= 75 ? "good" : result.score >= 40 ? "ok" : "bad"}">${result.score}<small>điểm</small></div>
        <p class="detail">${esc(result.detail)}</p>
        <div class="speech">
          <span class="speaker">${role.judgeEmoji}</span>
          <div class="bubble"><b>${role.judge}:</b> ${esc(comment)}</div>
        </div>
        <button class="btn primary big next">Tiếp tục</button>
      </main>`;
    app.querySelector(".next")!.addEventListener("click", () => {
      sfx.tap();
      resolve();
    });
  });
}

async function run(role: Role, level: Level, name: string) {
  const results: GameResult[] = [];
  for (const [i, game] of GAMES.entries()) {
    await intro(game, i, level);
    app.innerHTML = `<main class="play"></main>`;
    const result = await game.play(app.querySelector<HTMLElement>(".play")!, { role, level });
    results.push(result);
    await verdict(role, game, result);
  }
  finish(role, level, name, results);
}

function finish(role: Role, level: Level, name: string, results: GameResult[]) {
  const total = average(results.map((r) => r.score));
  const title = titleFor(role.noun, total);
  const isRecord = total > best(role.id, level);
  if (isRecord) localStorage.setItem(bestKey(role.id, level), String(total));

  const canvas = drawCertificate({
    name,
    role,
    title,
    level,
    total,
    rows: GAMES.map((g, i) => ({ emoji: g.emoji, name: g.name, score: results[i].score })),
    url: SHARE_URL,
  });
  const levelNote = byLevel(level, ["", " ở mức Đảm đang 🔥", " ở mức Mẹ chồng khó tính 😈"]);
  const shareText = `Mình vừa được chứng nhận "${title}" với ${total} điểm${levelNote} 😎 Bạn đảm đang tới đâu?`;

  app.innerHTML = `
    <header class="top"><span class="step">Kết quả</span>${muteButton()}</header>
    <main class="center result">
      ${isRecord && best(role.id, level) ? `<p class="record">🎉 Kỷ lục mới!</p>` : ""}
      <img class="cert" alt="Giấy chứng nhận" src="${canvas.toDataURL("image/png")}" />
      <button class="btn primary big share">📤 Khoe ngay</button>
      <div class="row">
        <button class="btn again">🔁 Chơi lại</button>
        <button class="btn home-btn">👥 Đổi vai</button>
      </div>
      <p class="muted small share-note"></p>
    </main>`;
  sfx.fanfare();

  app.querySelector(".share")!.addEventListener("click", async () => {
    const outcome = await shareCertificate(canvas, shareText, SHARE_URL);
    if (outcome === "downloaded") {
      app.querySelector(".share-note")!.textContent = "Đã tải ảnh về máy. Đăng ảnh lên Facebook/Zalo và rủ bạn bè chơi nhé!";
    }
  });
  app.querySelector(".again")!.addEventListener("click", () => void run(role, level, name));
  app.querySelector(".home-btn")!.addEventListener("click", home);
}

home();
