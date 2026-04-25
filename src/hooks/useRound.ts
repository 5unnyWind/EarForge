import { useCallback, useEffect, useRef, useState } from "react";
import {
  INSTRUMENTS,
  pickRandomInstrument,
  type InstrumentDef,
} from "../audio/instruments";
import {
  ensureAudioReady,
  loadInstrument,
  stopAllAudio,
} from "../audio/player";
import * as Tone from "tone";
import { appendEntry } from "../lib/history";
import { readJSON, removeKey, writeJSON } from "../lib/storage";

export type Phase = "idle" | "loading" | "answering" | "revealed";

export type Stats = {
  rounds: number;
  itemCorrect: number;
  itemTotal: number;
  perfectRounds: number;
};

const initialStats: Stats = {
  rounds: 0,
  itemCorrect: 0,
  itemTotal: 0,
  perfectRounds: 0,
};

export type RecordExtra = {
  /** 题目分类标签（写入历史用，例如 ['M3'] / ['ionian'] / 难度等级） */
  tags?: string[];
  /** 用户回答 / 正确答案（写入历史用） */
  answer?: string;
  truth?: string;
};

export type UseRoundOptions<Q> = {
  /** 模块 id；用于本地持久化 stats 和写历史 */
  moduleId: string;
  /** 是否每轮随机抽乐器 */
  randomInstrument: boolean;
  /** 固定乐器 id（randomInstrument=false 时使用） */
  fixedInstrumentId: string;
  /** 生成一轮的题目 */
  generate: () => Q;
  /** 播放一轮的题目，返回 Promise；可以通过 onNoteStart 接入实时高亮 */
  play: (question: Q, sampler: Tone.Sampler) => Promise<void>;
};

export function useRound<Q>(opts: UseRoundOptions<Q>) {
  const sessionStatsKey = `session-stats/${opts.moduleId}`;

  // 把每次渲染都"换新引用"的 opts 钉到 ref，让所有 callback 不再依赖它
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const [phase, setPhase] = useState<Phase>("idle");
  const [instrument, setInstrument] = useState<InstrumentDef | null>(null);
  const [question, setQuestion] = useState<Q | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(() =>
    readJSON<Stats>(sessionStatsKey, initialStats),
  );
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // 同步几个常被 callback 读到的状态到 ref，避免依赖列表抖动
  const instrumentRef = useRef(instrument);
  instrumentRef.current = instrument;
  const questionRef = useRef(question);
  questionRef.current = question;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const lastInstrumentIdRef = useRef<string | undefined>(undefined);
  const nextInstrumentRef = useRef<InstrumentDef | null>(null);
  // 标记当前组件是否还在挂载，避免卸载后还 setState
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // 切换模块 / 卸载：截断上一题的尾音和 UI 调度
      stopAllAudio();
    };
  }, []);

  const safeSet = useCallback(<S,>(setter: (v: S) => void, v: S) => {
    if (mountedRef.current) setter(v);
  }, []);

  const playWithInstrument = useCallback(
    async (q: Q, inst: InstrumentDef) => {
      const sampler = await loadInstrument(inst);
      if (!mountedRef.current) return;
      safeSet(setIsPlaying, true);
      try {
        await optsRef.current.play(q, sampler);
      } finally {
        safeSet(setIsPlaying, false);
      }
    },
    [safeSet],
  );

  const prewarmNextInstrument = useCallback((currentInstrumentId: string) => {
    const o = optsRef.current;
    if (!o.randomInstrument) {
      nextInstrumentRef.current = null;
      return;
    }

    const next = pickRandomInstrument(currentInstrumentId);
    nextInstrumentRef.current = next;

    void loadInstrument(next).catch((e) => {
      console.error(e);
      if (nextInstrumentRef.current?.id === next.id) {
        nextInstrumentRef.current = null;
      }
    });
  }, []);

  const start = useCallback(async () => {
    safeSet(setError, null);
    // 上一题可能还在尾音里，先打断
    stopAllAudio();
    try {
      await ensureAudioReady();
      const o = optsRef.current;
      const warmed = nextInstrumentRef.current;
      const inst = o.randomInstrument
        ? warmed && warmed.id !== lastInstrumentIdRef.current
          ? warmed
          : pickRandomInstrument(lastInstrumentIdRef.current)
        : INSTRUMENTS.find((i) => i.id === o.fixedInstrumentId) ??
          INSTRUMENTS[0];
      nextInstrumentRef.current = null;
      lastInstrumentIdRef.current = inst.id;
      if (!mountedRef.current) return;
      safeSet(setInstrument, inst);
      safeSet(setPhase, "loading" as Phase);

      await loadInstrument(inst);
      if (!mountedRef.current) return;

      const q = o.generate();
      safeSet(setQuestion, q as Q | null);
      safeSet(setPhase, "answering" as Phase);
      prewarmNextInstrument(inst.id);

      await playWithInstrument(q, inst);
    } catch (e) {
      console.error(e);
      safeSet(setError, e instanceof Error ? e.message : String(e));
      safeSet(setPhase, "idle" as Phase);
    }
  }, [playWithInstrument, prewarmNextInstrument, safeSet]);

  const replay = useCallback(async () => {
    const inst = instrumentRef.current;
    const q = questionRef.current;
    if (!inst || !q || isPlayingRef.current) return;
    try {
      await playWithInstrument(q, inst);
    } catch (e) {
      console.error(e);
    }
  }, [playWithInstrument]);

  const recordResult = useCallback(
    (correctCount: number, totalCount: number, extra?: RecordExtra) => {
      const s = statsRef.current;
      const next: Stats = {
        rounds: s.rounds + 1,
        itemCorrect: s.itemCorrect + correctCount,
        itemTotal: s.itemTotal + totalCount,
        perfectRounds:
          s.perfectRounds + (correctCount === totalCount ? 1 : 0),
      };
      statsRef.current = next;
      writeJSON(sessionStatsKey, next);
      safeSet(setStats, next);
      appendEntry(optsRef.current.moduleId, {
        ts: Date.now(),
        items: totalCount,
        correct: correctCount,
        tags: extra?.tags,
        answer: extra?.answer,
        truth: extra?.truth,
      });
      safeSet(setPhase, "revealed" as Phase);
    },
    [sessionStatsKey, safeSet],
  );

  /** 仅清空本次会话计数（StatBadge 那一行） */
  const resetSession = useCallback(() => {
    stopAllAudio();
    statsRef.current = initialStats;
    removeKey(sessionStatsKey);
    safeSet(setStats, initialStats);
    safeSet(setPhase, "idle" as Phase);
    safeSet(setQuestion, null as Q | null);
    safeSet(setInstrument, null as InstrumentDef | null);
    safeSet(setError, null as string | null);
    nextInstrumentRef.current = null;
  }, [sessionStatsKey, safeSet]);

  return {
    phase,
    setPhase,
    instrument,
    question,
    setQuestion,
    isPlaying,
    error,
    stats,
    start,
    replay,
    recordResult,
    /** @deprecated 使用 resetSession 更明确 */
    reset: resetSession,
    resetSession,
  };
}
