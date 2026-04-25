/** 节奏型：1 小节 4/4 拍，按 16 个十六分音符位划分。
 *  数组中 1 表示击音起点，0 表示静音/延音保持。
 *  注意：不区分起音 vs 延长，所以一个全音符就是 [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]。
 */
export type RhythmPattern = {
  id: string;
  onsets: number[]; // length 16
  difficulty: 1 | 2 | 3;
};

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  // === 简单 (4 个四分音符内) ===
  { id: "s1", difficulty: 1, onsets: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] }, // ♩ ♩ ♩ ♩
  { id: "s2", difficulty: 1, onsets: [1,0,0,0, 0,0,0,0, 1,0,0,0, 1,0,0,0] }, // 𝅗𝅥 ♩ ♩
  { id: "s3", difficulty: 1, onsets: [1,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] }, // ♩ ♩ 𝅗𝅥
  { id: "s4", difficulty: 1, onsets: [1,0,0,0, 1,0,0,0, 1,0,0,0, 0,0,0,0] }, // ♩ ♩ ♩ -
  { id: "s5", difficulty: 1, onsets: [1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0] }, // 𝅗𝅥 𝅗𝅥

  // === 中等 (含 8 分) ===
  { id: "m1", difficulty: 2, onsets: [1,0,1,0, 1,0,0,0, 1,0,1,0, 1,0,0,0] }, // ♫ ♩ ♫ ♩
  { id: "m2", difficulty: 2, onsets: [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,1,0] }, // ♩ ♫ ♩ ♫
  { id: "m3", difficulty: 2, onsets: [1,0,1,0, 1,0,1,0, 1,0,0,0, 1,0,0,0] },
  { id: "m4", difficulty: 2, onsets: [1,0,0,0, 1,0,1,0, 0,0,0,0, 1,0,0,0] },
  { id: "m5", difficulty: 2, onsets: [1,0,1,0, 0,0,1,0, 1,0,0,0, 1,0,1,0] }, // 切分一点
  { id: "m6", difficulty: 2, onsets: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,0,0] },

  // === 较难 (含 16 分 / 切分) ===
  { id: "h1", difficulty: 3, onsets: [1,1,1,1, 1,0,0,0, 1,0,1,0, 1,0,0,0] }, // ♬♬ ♩ ♫ ♩
  { id: "h2", difficulty: 3, onsets: [1,0,0,1, 0,0,1,0, 1,0,1,0, 1,0,0,0] }, // 切分
  { id: "h3", difficulty: 3, onsets: [1,0,1,1, 1,0,0,0, 1,1,1,0, 1,0,0,0] },
  { id: "h4", difficulty: 3, onsets: [1,0,1,0, 1,1,1,1, 1,0,0,0, 1,0,1,0] },
  { id: "h5", difficulty: 3, onsets: [1,1,0,1, 1,0,1,0, 1,0,0,1, 1,0,0,0] },
];

/** 取相同难度的 N 个不同节奏型作为候选项（含正确答案） */
export function pickCandidates(
  difficulty: 1 | 2 | 3,
  count: number,
): { correct: RhythmPattern; choices: RhythmPattern[] } {
  const pool = RHYTHM_PATTERNS.filter((p) => p.difficulty === difficulty);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const choices = shuffled.slice(0, Math.min(count, shuffled.length));
  const correct = choices[Math.floor(Math.random() * choices.length)];
  return { correct, choices };
}
