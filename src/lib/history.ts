import { readJSON, removeKey, writeJSON } from "./storage";

const HISTORY_VERSION = 1;
const MAX_ENTRIES_PER_MODULE = 500;

export type RoundEntry = {
  /** 记录时间戳（ms） */
  ts: number;
  /** 这一轮的题数 */
  items: number;
  /** 这一轮答对的数量 */
  correct: number;
  /** 题目分类标签（例如 ['M3','melodic'] / ['ionian'] / ['minor'] / 难度等级） */
  tags?: string[];
  /** 用户回答（可选，用于复盘） */
  answer?: string;
  /** 正确答案（可选） */
  truth?: string;
};

type HistoryFile = {
  version: number;
  entries: RoundEntry[];
};

const empty: HistoryFile = { version: HISTORY_VERSION, entries: [] };

function key(moduleId: string) {
  return `history/${moduleId}`;
}

export function getHistory(moduleId: string): RoundEntry[] {
  const file = readJSON<HistoryFile>(key(moduleId), empty);
  if (!file || file.version !== HISTORY_VERSION) return [];
  return Array.isArray(file.entries) ? file.entries : [];
}

export function appendEntry(moduleId: string, entry: RoundEntry): void {
  const cur = getHistory(moduleId);
  const next = [...cur, entry];
  // FIFO 截断，避免无限膨胀
  const trimmed =
    next.length > MAX_ENTRIES_PER_MODULE
      ? next.slice(next.length - MAX_ENTRIES_PER_MODULE)
      : next;
  writeJSON<HistoryFile>(key(moduleId), {
    version: HISTORY_VERSION,
    entries: trimmed,
  });
}

export function clearHistory(moduleId: string): void {
  removeKey(key(moduleId));
}

export function clearAllHistory(): void {
  // 因为我们不知道有哪些 moduleId，这里只清楚已知模块
  for (const id of KNOWN_MODULE_IDS) clearHistory(id);
}

const KNOWN_MODULE_IDS = [
  "contour",
  "interval",
  "chord",
  "scale",
  "rhythm",
  "melody",
] as const;

export type Aggregate = {
  rounds: number;
  itemTotal: number;
  itemCorrect: number;
  accuracy: number; // 0..1, NaN if itemTotal === 0
  perfectRounds: number;
  firstTs: number | null;
  lastTs: number | null;
};

export function aggregate(entries: RoundEntry[]): Aggregate {
  let rounds = 0;
  let itemTotal = 0;
  let itemCorrect = 0;
  let perfectRounds = 0;
  let firstTs: number | null = null;
  let lastTs: number | null = null;
  for (const e of entries) {
    rounds++;
    itemTotal += e.items;
    itemCorrect += e.correct;
    if (e.items > 0 && e.correct === e.items) perfectRounds++;
    if (firstTs === null || e.ts < firstTs) firstTs = e.ts;
    if (lastTs === null || e.ts > lastTs) lastTs = e.ts;
  }
  return {
    rounds,
    itemTotal,
    itemCorrect,
    accuracy: itemTotal === 0 ? Number.NaN : itemCorrect / itemTotal,
    perfectRounds,
    firstTs,
    lastTs,
  };
}

export function aggregateSince(
  entries: RoundEntry[],
  sinceTs: number,
): Aggregate {
  return aggregate(entries.filter((e) => e.ts >= sinceTs));
}

export type TagStat = {
  tag: string;
  itemTotal: number;
  itemCorrect: number;
  accuracy: number;
};

/** 按 tag 聚合，返回正确率从低到高（最弱的在前）。
 *  一条 entry 若有多个 tag，每个 tag 都获得整条 entry 的 items/correct 贡献。
 *  因此各 tag 的 itemTotal 之和可能 > 总题数（按维度交叉计数）。 */
export function tagBreakdown(entries: RoundEntry[]): TagStat[] {
  const map = new Map<string, { items: number; correct: number }>();
  for (const e of entries) {
    if (!e.tags?.length) continue;
    const seen = new Set<string>();
    for (const tag of e.tags) {
      if (seen.has(tag)) continue; // 同 entry 内同 tag 只计一次
      seen.add(tag);
      const cur = map.get(tag) ?? { items: 0, correct: 0 };
      cur.items += e.items;
      cur.correct += e.correct;
      map.set(tag, cur);
    }
  }
  const result: TagStat[] = Array.from(map.entries()).map(([tag, v]) => ({
    tag,
    itemTotal: v.items,
    itemCorrect: v.correct,
    accuracy: v.items === 0 ? Number.NaN : v.correct / v.items,
  }));
  // 按正确率升序，相同正确率按题数倒序（数据多的优先）
  result.sort((a, b) => {
    if (Number.isNaN(a.accuracy) && Number.isNaN(b.accuracy)) return 0;
    if (Number.isNaN(a.accuracy)) return 1;
    if (Number.isNaN(b.accuracy)) return -1;
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.itemTotal - a.itemTotal;
  });
  return result;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
