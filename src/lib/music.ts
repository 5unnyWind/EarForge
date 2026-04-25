// MIDI 编号 <-> 音名 工具
// 约定：A4 = MIDI 69 = 440Hz；C4 = MIDI 60 (中央 C)

const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
] as const;

export function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const PC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};
export function nameToMidi(name: string): number {
  const m = name.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!m) throw new Error("bad note: " + name);
  return PC[m[1]] + (parseInt(m[2], 10) + 1) * 12;
}

// C 大调白键的 MIDI 编号（在 [low, high] 区间内）
export function whiteKeysInRange(low: number, high: number): number[] {
  const whites = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
  const out: number[] = [];
  for (let m = low; m <= high; m++) {
    if (whites.includes(m % 12)) out.push(m);
  }
  return out;
}

export function chromaticInRange(low: number, high: number): number[] {
  const out: number[] = [];
  for (let m = low; m <= high; m++) out.push(m);
  return out;
}

export function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(low: number, high: number): number {
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

// 生成一段无重复相邻音的随机旋律
export function generateMelody(
  pool: readonly number[],
  length: number,
): number[] {
  const out: number[] = [];
  let prev = -1;
  for (let i = 0; i < length; i++) {
    let pick = randomChoice(pool);
    let guard = 0;
    while (pick === prev && guard < 16) {
      pick = randomChoice(pool);
      guard++;
    }
    out.push(pick);
    prev = pick;
  }
  return out;
}

export type Direction = "up" | "down";

export function melodyToDirections(notes: number[]): Direction[] {
  const out: Direction[] = [];
  for (let i = 1; i < notes.length; i++) {
    out.push(notes[i] > notes[i - 1] ? "up" : "down");
  }
  return out;
}

/* ==================== 音程 ==================== */

export type IntervalDef = {
  semitones: number;
  short: string;   // P5, m3, ...
  zh: string;      // 纯五度
};

export const INTERVALS: IntervalDef[] = [
  { semitones: 1, short: "m2", zh: "小二度" },
  { semitones: 2, short: "M2", zh: "大二度" },
  { semitones: 3, short: "m3", zh: "小三度" },
  { semitones: 4, short: "M3", zh: "大三度" },
  { semitones: 5, short: "P4", zh: "纯四度" },
  { semitones: 6, short: "TT", zh: "三全音" },
  { semitones: 7, short: "P5", zh: "纯五度" },
  { semitones: 8, short: "m6", zh: "小六度" },
  { semitones: 9, short: "M6", zh: "大六度" },
  { semitones: 10, short: "m7", zh: "小七度" },
  { semitones: 11, short: "M7", zh: "大七度" },
  { semitones: 12, short: "P8", zh: "纯八度" },
];

export function intervalBySemitones(semi: number): IntervalDef | undefined {
  return INTERVALS.find((i) => i.semitones === semi);
}

/* ==================== 和弦 ==================== */

export type ChordDef = {
  id: string;
  zh: string;          // 大三和弦、属七和弦…
  short: string;       // M, m, dim, aug, M7, m7, 7, dim7, m7b5
  intervals: number[]; // 半音偏移（含 0）
};

export const CHORDS: ChordDef[] = [
  { id: "M",      zh: "大三和弦", short: "M",     intervals: [0, 4, 7] },
  { id: "m",      zh: "小三和弦", short: "m",     intervals: [0, 3, 7] },
  { id: "dim",    zh: "减三和弦", short: "dim",   intervals: [0, 3, 6] },
  { id: "aug",    zh: "增三和弦", short: "aug",   intervals: [0, 4, 8] },
  { id: "M7",     zh: "大七和弦", short: "maj7",  intervals: [0, 4, 7, 11] },
  { id: "m7",     zh: "小七和弦", short: "m7",    intervals: [0, 3, 7, 10] },
  { id: "7",      zh: "属七和弦", short: "7",     intervals: [0, 4, 7, 10] },
  { id: "m7b5",   zh: "半减七和弦", short: "m7♭5", intervals: [0, 3, 6, 10] },
  { id: "dim7",   zh: "减七和弦", short: "dim7",  intervals: [0, 3, 6, 9] },
];

export function buildChord(rootMidi: number, def: ChordDef): number[] {
  return def.intervals.map((s) => rootMidi + s);
}

/* ==================== 音阶 ==================== */

export type ScaleDef = {
  id: string;
  zh: string;
  intervals: number[]; // 从根音开始的半音步进（含起点 0 和终点八度）
};

export const SCALES: ScaleDef[] = [
  { id: "major",        zh: "自然大调",     intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  { id: "natural-min",  zh: "自然小调",     intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
  { id: "harmonic-min", zh: "和声小调",     intervals: [0, 2, 3, 5, 7, 8, 11, 12] },
  { id: "melodic-min",  zh: "旋律小调(上行)", intervals: [0, 2, 3, 5, 7, 9, 11, 12] },
  { id: "dorian",       zh: "多利亚调式",   intervals: [0, 2, 3, 5, 7, 9, 10, 12] },
  { id: "mixolydian",   zh: "混合利底亚",   intervals: [0, 2, 4, 5, 7, 9, 10, 12] },
  { id: "phrygian",     zh: "弗里几亚调式", intervals: [0, 1, 3, 5, 7, 8, 10, 12] },
  { id: "lydian",       zh: "利底亚调式",   intervals: [0, 2, 4, 6, 7, 9, 11, 12] },
  { id: "penta-major",  zh: "大调五声",     intervals: [0, 2, 4, 7, 9, 12] },
  { id: "blues",        zh: "蓝调音阶",     intervals: [0, 3, 5, 6, 7, 10, 12] },
];

export function buildScale(rootMidi: number, def: ScaleDef): number[] {
  return def.intervals.map((s) => rootMidi + s);
}
