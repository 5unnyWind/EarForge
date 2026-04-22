// MIDI 编号 <-> 音名 工具
// 约定：A4 = MIDI 69 = 440Hz；C4 = MIDI 60 (中央 C)

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
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

export function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

// 把一串音符转换成相邻方向的数组（长度 = 音符数 - 1）
export function melodyToDirections(notes: number[]): Direction[] {
  const out: Direction[] = [];
  for (let i = 1; i < notes.length; i++) {
    out.push(notes[i] > notes[i - 1] ? "up" : "down");
  }
  return out;
}
