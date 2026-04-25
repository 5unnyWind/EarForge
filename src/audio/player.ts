import * as Tone from "tone";
import { midiToName } from "../lib/music";
import { instrumentSampleUrls, type InstrumentDef } from "./instruments";

const samplerCache = new Map<string, Tone.Sampler>();
const inflight = new Map<string, Promise<Tone.Sampler>>();

/**
 * 立刻停掉所有正在播放的音和 UI 调度。
 * 用于切换模块 / 组件卸载时打断"上一题"的尾音。
 */
export function stopAllAudio(): void {
  // 取消所有 Tone.Draw 的 UI 回调（onNoteStart/onHitStart）
  try {
    Tone.getDraw().cancel(0);
  } catch {
    /* ignore */
  }
  // 释放每个 sampler 上的所有音符
  for (const sampler of samplerCache.values()) {
    try {
      sampler.releaseAll();
    } catch {
      /* ignore */
    }
  }
}

export async function ensureAudioReady(): Promise<void> {
  if (Tone.getContext().state !== "running") {
    await Tone.start();
  }
}

export function loadInstrument(def: InstrumentDef): Promise<Tone.Sampler> {
  const cached = samplerCache.get(def.id);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(def.id);
  if (pending) return pending;

  const urls = instrumentSampleUrls(def);
  const promise = new Promise<Tone.Sampler>((resolve, reject) => {
    const sampler = new Tone.Sampler({
      urls,
      release: def.release ?? 1,
      volume: def.volume ?? -6,
      onload: () => {
        samplerCache.set(def.id, sampler);
        inflight.delete(def.id);
        resolve(sampler);
      },
      onerror: (err) => {
        inflight.delete(def.id);
        const msg = err instanceof Error ? err.message : String(err);
        reject(new Error(`乐器「${def.name}」采样加载失败：${msg}`));
      },
    }).toDestination();
  });

  inflight.set(def.id, promise);
  return promise;
}

export type PlayOptions = {
  noteInterval?: number;
  noteDuration?: number;
  /** 每个音开始时的回调（在音频线程上调度，UI 同步用） */
  onNoteStart?: (index: number) => void;
  /** 全部播放结束的回调 */
  onEnd?: () => void;
};

export async function playMelody(
  sampler: Tone.Sampler,
  midiNotes: number[],
  opts: PlayOptions = {},
): Promise<void> {
  await ensureAudioReady();
  const interval = opts.noteInterval ?? 0.7;
  const duration = opts.noteDuration ?? 0.6;

  const start = Tone.now() + 0.1;
  midiNotes.forEach((m, i) => {
    const t = start + i * interval;
    sampler.triggerAttackRelease(midiToName(m), duration, t);
    if (opts.onNoteStart) {
      Tone.getDraw().schedule(() => opts.onNoteStart!(i), t);
    }
  });

  const total = (midiNotes.length - 1) * interval + duration + 0.2;
  await new Promise<void>((r) => setTimeout(r, total * 1000 + 100));
  opts.onEnd?.();
}

export async function playSingleNote(
  sampler: Tone.Sampler,
  midi: number,
  duration = 1.0,
): Promise<void> {
  await ensureAudioReady();
  sampler.triggerAttackRelease(midiToName(midi), duration);
  await new Promise<void>((r) => setTimeout(r, duration * 1000 + 100));
}

/** 同时奏响多个音（和弦），等播完才 resolve */
export async function playChord(
  sampler: Tone.Sampler,
  midiNotes: number[],
  duration = 1.5,
): Promise<void> {
  await ensureAudioReady();
  const start = Tone.now() + 0.05;
  const names = midiNotes.map(midiToName);
  sampler.triggerAttackRelease(names, duration, start);
  await new Promise<void>((r) => setTimeout(r, duration * 1000 + 200));
}

/** 播放节奏序列：每个 beat 是一个 0/1（或带音高 MIDI）。drumMidi 用于打击声。 */
export type RhythmHit = { time: number; duration: number };

export async function playRhythm(
  sampler: Tone.Sampler,
  hits: RhythmHit[],
  drumMidi: number,
  opts: { onHitStart?: (i: number) => void; onEnd?: () => void } = {},
): Promise<void> {
  await ensureAudioReady();
  const start = Tone.now() + 0.1;
  const noteName = midiToName(drumMidi);
  hits.forEach((h, i) => {
    const t = start + h.time;
    sampler.triggerAttackRelease(noteName, h.duration, t);
    if (opts.onHitStart) {
      Tone.getDraw().schedule(() => opts.onHitStart!(i), t);
    }
  });
  const end = hits.length
    ? hits[hits.length - 1].time + hits[hits.length - 1].duration + 0.3
    : 0.3;
  await new Promise<void>((r) => setTimeout(r, end * 1000 + 100));
  opts.onEnd?.();
}
