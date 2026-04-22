// 乐器配置：使用 nbrosowsky/tonejs-instruments 的在线采样
// 采样托管在 GitHub Pages：https://nbrosowsky.github.io/tonejs-instruments/samples/<inst>/<note>.mp3
// 注意：音名中的 "#" 在文件里写作 "s"，例如 C#4 -> Cs4.mp3
// 下面每个乐器的采样列表都是从仓库里实际验证过的，不能随便加。

const BASE = "https://nbrosowsky.github.io/tonejs-instruments/samples";

export type InstrumentDef = {
  id: string;
  name: string;
  folder: string;
  ext: "mp3";
  /** 实际存在的采样音名列表（带八度，使用 # 表示升号） */
  samples: string[];
  /** 推荐使用的最低 MIDI（音域低于此会拉伸过头，音质变差） */
  minMidi: number;
  /** 推荐使用的最高 MIDI */
  maxMidi: number;
  volume?: number;
  release?: number;
};

function buildUrlMap(folder: string, ext: "mp3", notes: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const n of notes) {
    const file = n.replace("#", "s");
    map[n] = `${BASE}/${folder}/${file}.${ext}`;
  }
  return map;
}

export function instrumentSampleUrls(def: InstrumentDef): Record<string, string> {
  return buildUrlMap(def.folder, def.ext, def.samples);
}

// 音名 -> MIDI（C-1 = 0, A4 = 69）
const NAME_TO_PC: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};
function nameToMidi(n: string): number {
  const m = n.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) throw new Error("bad note: " + n);
  return NAME_TO_PC[m[1]] + (parseInt(m[2], 10) + 1) * 12;
}
function rangeOf(samples: string[]): { minMidi: number; maxMidi: number } {
  const ms = samples.map(nameToMidi);
  return { minMidi: Math.min(...ms), maxMidi: Math.max(...ms) };
}

function inst(
  id: string,
  name: string,
  folder: string,
  samples: string[],
  extra: Partial<InstrumentDef> = {},
): InstrumentDef {
  const { minMidi, maxMidi } = rangeOf(samples);
  return {
    id,
    name,
    folder,
    ext: "mp3",
    samples,
    minMidi,
    maxMidi,
    release: 1,
    volume: -6,
    ...extra,
  };
}

export const INSTRUMENTS: InstrumentDef[] = [
  inst("piano", "钢琴", "piano",
    ["C3", "D#3", "F#3", "A3", "C4", "D#4", "F#4", "A4", "C5", "D#5", "F#5", "A5", "C6"],
    { release: 1.2 }),

  inst("guitar-acoustic", "原声吉他", "guitar-acoustic",
    ["E2", "A2", "D3", "G3", "B3", "E4", "A4", "C5"],
    { release: 1.0 }),

  inst("violin", "小提琴", "violin",
    ["G3", "C4", "E4", "A4", "C5", "E5", "G5", "C6"],
    { release: 1.5 }),

  inst("cello", "大提琴", "cello",
    ["C2", "G2", "C3", "G3", "C4", "G4"],
    { release: 1.5 }),

  inst("flute", "长笛", "flute",
    ["C4", "E4", "A4", "C5", "E5", "A5", "C6", "E6", "A6", "C7"],
    { release: 1.0 }),

  inst("harp", "竖琴", "harp",
    ["C3", "E3", "G3", "B3", "D4", "F4", "A4", "C5", "E5", "G5", "B5", "A6"],
    { release: 1.5 }),

  inst("xylophone", "木琴", "xylophone",
    ["G4", "C5", "G5", "C6", "G6", "C7"],
    { release: 0.6 }),

  inst("trumpet", "小号", "trumpet",
    ["A3", "C4", "D#4", "F4", "G4", "A#4", "D5", "F5", "A5", "C6"],
    { release: 0.8 }),

  inst("saxophone", "萨克斯", "saxophone",
    ["C#3", "D3", "E3", "G3", "A#3", "C4", "D4", "F4", "A4", "C5", "D5", "F5", "A5"],
    { release: 1.0 }),
];

export function pickRandomInstrument(excludeId?: string): InstrumentDef {
  const candidates = excludeId
    ? INSTRUMENTS.filter((i) => i.id !== excludeId)
    : INSTRUMENTS;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getInstrumentById(id: string): InstrumentDef | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}
