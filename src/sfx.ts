// Âm thanh tạo bằng Web Audio, không cần file âm thanh.

let ctx: AudioContext | null = null;
let muted = localStorage.getItem("noitro.muted") === "1";

function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // iPhone/iPad tạm dừng âm thanh cho tới khi người dùng chạm vào trang.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.15, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  osc.connect(g).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + dur);
}

function noise(dur: number, gain = 0.2, filterFreq = 3000) {
  const a = audio();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  tap: () => tone(660, 0.06, "triangle", 0.1),
  good: () => {
    tone(660, 0.1, "triangle");
    setTimeout(() => tone(990, 0.15, "triangle"), 90);
  },
  bad: () => tone(220, 0.25, "sawtooth", 0.08, 120),
  crash: () => {
    noise(0.35, 0.35, 6000);
    tone(1800, 0.12, "square", 0.05, 600);
  },
  splash: () => noise(0.15, 0.08, 1500),
  pour: () => noise(0.12, 0.05, 900),
  ding: () => tone(1320, 0.4, "sine", 0.12),
  rain: () => noise(1.5, 0.12, 2500),
  thunder: () => noise(1.2, 0.3, 300),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, "triangle", 0.12), i * 120)),
};

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  localStorage.setItem("noitro.muted", value ? "1" : "0");
}
