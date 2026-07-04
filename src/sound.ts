/**
 * WebAudio-synthesised sound effects.
 *
 * Every sound is generated at runtime — no downloaded/external audio files, per
 * the project's asset policy (no copyrighted or paid assets). The AudioContext
 * is created lazily on the first user gesture (browser autoplay policy).
 */

type Osc = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One enveloped tone, optionally pitch-sliding, optionally delayed. */
function blip(
  freq: number, dur: number, type: Osc = 'sine', gain = 0.3,
  slideTo?: number, delay = 0,
): void {
  const c = ensure();
  if (!c || !master || !enabled) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** A short burst of filtered noise (thuds, static). */
function noise(dur: number, gain = 0.2, delay = 0, hp = 200): void {
  const c = ensure();
  if (!c || !master || !enabled) return;
  const t0 = c.currentTime + delay;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur);
}

export const Sound = {
  setEnabled(v: boolean): void { enabled = v; },
  isEnabled(): boolean { return enabled; },
  /** Call from a user gesture to unlock audio. */
  unlock(): void { ensure(); },

  click(): void { blip(480, 0.05, 'square', 0.12); },
  tab(): void { blip(660, 0.04, 'triangle', 0.1); },

  build(): void { noise(0.12, 0.22, 0, 300); blip(150, 0.14, 'square', 0.18); },
  hire(): void { blip(440, 0.1, 'triangle', 0.16); blip(660, 0.14, 'triangle', 0.16, undefined, 0.09); },
  coffee(): void { blip(300, 0.06, 'sine', 0.1); blip(360, 0.06, 'sine', 0.1, undefined, 0.06); blip(420, 0.08, 'sine', 0.1, undefined, 0.12); },

  resolve(): void {
    blip(523, 0.12, 'triangle', 0.16);
    blip(659, 0.12, 'triangle', 0.16, undefined, 0.07);
    blip(784, 0.18, 'triangle', 0.17, undefined, 0.14);
  },
  fail(): void { blip(200, 0.28, 'sawtooth', 0.18, 90); },
  spawn(): void { blip(280, 0.35, 'sine', 0.1, 620); noise(0.18, 0.05, 0, 800); },
  disaster(): void {
    blip(440, 0.18, 'square', 0.16, 300);
    blip(330, 0.18, 'square', 0.16, 220, 0.2);
  },
  day(): void { blip(392, 0.14, 'sine', 0.12); blip(587, 0.2, 'sine', 0.12, undefined, 0.12); },
};
