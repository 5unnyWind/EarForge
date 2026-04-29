import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generateMelody,
  melodyToDirections,
  midiToName,
  whiteKeysInRange,
  chromaticInRange,
  type Direction,
} from "../../lib/music";
import {
  Field,
  GhostButton,
  Hint,
  InstrumentBadge,
  NoteDot,
  PrimaryButton,
  SegBar,
  StatBadge,
  SuccessButton,
  Toggle,
} from "../../components/ui";
import { useRound } from "../../hooks/useRound";
import { loadInstrument, playMelody, playSingleNote } from "../../audio/player";
import { InstrumentPicker } from "../shared/InstrumentPicker";
import {
  DifficultyPresetPicker,
  type DifficultyPreset,
} from "../shared/DifficultyPreset";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CrossIcon,
  HeadphonesIcon,
  ReplayIcon,
  TurtleIcon,
} from "../../components/Icon";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useHistory } from "../../hooks/useHistory";
import { aggregate } from "../../lib/history";
import { HistoryPanel } from "../../components/HistoryPanel";

const MODULE_ID = "contour";

const LENGTH_OPTIONS = [3, 4, 5] as const;
const RANGE_OPTIONS = [
  { id: "narrow", label: "窄 (C4–C5)", low: 60, high: 72 },
  { id: "normal", label: "中 (G3–G5)", low: 55, high: 79 },
  { id: "wide", label: "宽 (C3–C6)", low: 48, high: 84 },
] as const;
const SPEED_OPTIONS = [
  { id: "slow", label: "慢", interval: 1.0 },
  { id: "normal", label: "中", interval: 0.7 },
  { id: "fast", label: "快", interval: 0.45 },
] as const;

const DIFFICULTY_PRESETS = {
  easy: { length: 3, rangeId: "narrow", speedId: "slow", chromatic: false },
  medium: { length: 4, rangeId: "normal", speedId: "normal", chromatic: false },
  hard: { length: 5, rangeId: "wide", speedId: "fast", chromatic: true },
} as const;

type Question = number[]; // MIDI 数组

export default function ContourExercise() {
  const [length, setLength] = usePersistedState<number>(
    `settings/${MODULE_ID}/length`,
    4,
  );
  const [rangeId, setRangeId] = usePersistedState<string>(
    `settings/${MODULE_ID}/rangeId`,
    "narrow",
  );
  const [speedId, setSpeedId] = usePersistedState<string>(
    `settings/${MODULE_ID}/speedId`,
    "normal",
  );
  const [chromatic, setChromatic] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/chromatic`,
    false,
  );
  const [randomInstrument, setRandomInstrument] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/randomInstrument`,
    false,
  );
  const [fixedInstrumentId, setFixedInstrumentId] = usePersistedState<string>(
    `settings/${MODULE_ID}/fixedInstrumentId`,
    "piano",
  );
  const [debugMode, setDebugMode] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/debugMode`,
    false,
  );
  const [difficultyPreset, setDifficultyPreset] =
    usePersistedState<DifficultyPreset>(
      `settings/${MODULE_ID}/difficultyPreset`,
      "medium",
    );

  const [answer, setAnswer] = useState<(Direction | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const markCustomDifficulty = useCallback(() => {
    setDifficultyPreset("custom");
  }, [setDifficultyPreset]);

  const applyDifficultyPreset = useCallback(
    (preset: DifficultyPreset) => {
      setDifficultyPreset(preset);
      if (preset === "custom") return;
      const next = DIFFICULTY_PRESETS[preset];
      setLength(next.length);
      setRangeId(next.rangeId);
      setSpeedId(next.speedId);
      setChromatic(next.chromatic);
    },
    [setChromatic, setDifficultyPreset, setLength, setRangeId, setSpeedId],
  );

  const historyEntries = useHistory(MODULE_ID);
  const allTime = useMemo(() => aggregate(historyEntries), [historyEntries]);

  const range = useMemo(
    () => RANGE_OPTIONS.find((r) => r.id === rangeId) ?? RANGE_OPTIONS[0],
    [rangeId],
  );
  const speed = useMemo(
    () => SPEED_OPTIONS.find((s) => s.id === speedId) ?? SPEED_OPTIONS[1],
    [speedId],
  );

  const round = useRound<Question>({
    moduleId: MODULE_ID,
    randomInstrument,
    fixedInstrumentId,
    generate: () => {
      const pool = chromatic
        ? chromaticInRange(range.low, range.high)
        : whiteKeysInRange(range.low, range.high);
      return generateMelody(pool, length);
    },
    play: async (q, sampler) => {
      setPlayingIndex(null);
      await playMelody(sampler, q, {
        noteInterval: speed.interval,
        noteDuration: Math.min(speed.interval * 0.85, 0.7),
        onNoteStart: (i) => setPlayingIndex(i),
      });
      setPlayingIndex(null);
    },
  });

  const melody = round.question ?? [];
  const truth = useMemo(() => melodyToDirections(melody), [melody]);

  // 题目生成后初始化答题状态
  useEffect(() => {
    if (round.phase === "answering" && melody.length) {
      setAnswer(new Array(melody.length - 1).fill(null));
      setFocusIndex(0);
    }
  }, [round.phase, melody.length]);

  const setAnswerAt = useCallback(
    (idx: number, dir: Direction) => {
      if (round.phase !== "answering") return;
      setAnswer((prev) => {
        const next = [...prev];
        next[idx] = dir;
        return next;
      });
      setFocusIndex((i) => Math.min(Math.max(i, idx + 1), Math.max(0, answer.length - 1)));
    },
    [round.phase, answer.length],
  );

  const allFilled = answer.length > 0 && answer.every((a) => a !== null);

  const submit = useCallback(() => {
    if (!allFilled) return;
    const correct = answer.reduce(
      (acc, a, i) => acc + (a === truth[i] ? 1 : 0),
      0,
    );
    round.recordResult(correct, truth.length, {
      tags: [`len-${truth.length}`, chromatic ? "chromatic" : "diatonic"],
    });
  }, [allFilled, answer, truth, round, chromatic]);

  const replayReveal = useCallback(async () => {
    if (!round.instrument || round.isPlaying || !melody.length) return;
    try {
      const sampler = await loadInstrument(round.instrument);
      setPlayingIndex(null);
      await playMelody(sampler, melody, {
        noteInterval: Math.max(speed.interval, 0.9),
        noteDuration: 0.8,
        onNoteStart: (i) => setPlayingIndex(i),
      });
      setPlayingIndex(null);
    } catch (e) {
      console.error(e);
    }
  }, [melody, round.instrument, round.isPlaying, speed.interval]);

  const playOne = useCallback(
    async (i: number) => {
      if (!round.instrument || round.isPlaying) return;
      try {
        const sampler = await loadInstrument(round.instrument);
        setPlayingIndex(i);
        await playSingleNote(sampler, melody[i], 1.0);
        setPlayingIndex(null);
      } catch (e) {
        console.error(e);
      }
    },
    [melody, round.instrument, round.isPlaying],
  );

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;

      if (round.phase === "idle") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          round.start();
        }
        return;
      }
      if (round.phase === "revealed") {
        if (e.key === "Enter") {
          e.preventDefault();
          round.start();
        } else if (e.key === " ") {
          e.preventDefault();
          replayReveal();
        }
        return;
      }
      if (round.phase === "answering") {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          if (focusIndex < 0 || focusIndex >= answer.length) return;
          setAnswerAt(focusIndex, e.key === "ArrowUp" ? "up" : "down");
        } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
          e.preventDefault();
          const prevIdx = Math.max(0, focusIndex - 1);
          setAnswer((prev) => {
            const next = [...prev];
            next[prevIdx] = null;
            return next;
          });
          setFocusIndex(prevIdx);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setFocusIndex((i) => Math.min(answer.length - 1, i + 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (allFilled) submit();
        } else if (e.key === " ") {
          e.preventDefault();
          round.replay();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, focusIndex, answer.length, allFilled, setAnswerAt, submit, replayReveal]);

  const isRevealed = round.phase === "revealed";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3 flex-wrap px-1 sm:px-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em]">上下行</h2>
          <p className="text-sm text-zinc-300/60">
            听一段旋律，判断每相邻两音是上行还是下行
          </p>
        </div>
        <StatBadge
          rounds={round.stats.rounds}
          correct={round.stats.itemCorrect}
          total={round.stats.itemTotal}
          allTime={{
            rounds: allTime.rounds,
            itemTotal: allTime.itemTotal,
            accuracy: allTime.accuracy,
          }}
        />
      </header>

      {round.phase === "idle" ? (
        <IdleCard onStart={round.start} error={round.error} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <InstrumentBadge
              label={round.instrument?.name ?? "—"}
              loading={round.phase === "loading"}
            />
            {!isRevealed ? (
              <GhostButton
                onClick={round.replay}
                disabled={round.isPlaying || round.phase === "loading"}
              >
                {round.isPlaying ? (
                  "播放中…"
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <ReplayIcon size={16} /> 重听
                  </span>
                )}
              </GhostButton>
            ) : (
              <GhostButton onClick={replayReveal} disabled={round.isPlaying}>
                {round.isPlaying ? (
                  "播放中…"
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <TurtleIcon size={18} /> 慢速回放
                  </span>
                )}
              </GhostButton>
            )}
          </div>

          <div className="rounded-3xl bg-zinc-950/42 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_46px_rgba(0,0,0,0.18)] backdrop-blur-xl p-3 sm:p-5 overflow-x-auto no-scrollbar">
            {!isRevealed ? (
              <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-3 min-w-max mx-auto">
                {melody.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <NoteDot
                      index={i + 1}
                      label={debugMode ? midiToName(m) : undefined}
                      active={playingIndex === i}
                    />
                    {i < melody.length - 1 && (
                      <DirectionPicker
                        value={answer[i]}
                        focused={focusIndex === i}
                        onFocus={() => setFocusIndex(i)}
                        onChoose={(d) => setAnswerAt(i, d)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-3 min-w-max mx-auto">
                {melody.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <NoteDot
                      index={i + 1}
                      label={midiToName(m)}
                      active={playingIndex === i}
                      onClick={() => playOne(i)}
                    />
                    {i < melody.length - 1 && (
                      <DirectionResult correct={truth[i]} chosen={answer[i]} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Hint>
            {isRevealed
              ? "点音圈可单独试听 · 键盘：回车=下一题 · 空格=慢速回放"
              : "点上下箭头填答案 · 键盘：方向键填答案 · 回车=提交 · 空格=重听"}
          </Hint>

          <div className="flex justify-end gap-3">
            {!isRevealed ? (
              <SuccessButton onClick={submit} disabled={!allFilled}>
                提交答案
              </SuccessButton>
            ) : (
              <PrimaryButton onClick={round.start}>
                <span className="inline-flex items-center gap-1.5">
                  下一题 <ArrowRightIcon size={16} />
                </span>
              </PrimaryButton>
            )}
          </div>
        </div>
      )}

      <SettingsCard>
        <DifficultyPresetPicker
          value={difficultyPreset}
          onChange={applyDifficultyPreset}
        />
        <Field label="音符数量">
          <SegBar
            options={LENGTH_OPTIONS.map((n) => ({ id: String(n), label: `${n} 个` }))}
            value={String(length)}
            onChange={(v) => {
              markCustomDifficulty();
              setLength(Number(v));
            }}
          />
        </Field>
        <Field label="速度">
          <SegBar
            options={SPEED_OPTIONS.map((s) => ({ id: s.id, label: s.label }))}
            value={speedId}
            onChange={(v) => {
              markCustomDifficulty();
              setSpeedId(v);
            }}
          />
        </Field>
        <Field label="音域">
          <SegBar
            options={RANGE_OPTIONS.map((r) => ({ id: r.id, label: r.label }))}
            value={rangeId}
            onChange={(v) => {
              markCustomDifficulty();
              setRangeId(v);
            }}
          />
        </Field>
        <Field label="包含黑键 (半音)">
          <Toggle
            checked={chromatic}
            onChange={(v) => {
              markCustomDifficulty();
              setChromatic(v);
            }}
          />
        </Field>
        <Field label="调试模式 (显示音名)">
          <Toggle checked={debugMode} onChange={setDebugMode} />
        </Field>
        <InstrumentPicker
          random={randomInstrument}
          setRandom={setRandomInstrument}
          fixedId={fixedInstrumentId}
          setFixedId={setFixedInstrumentId}
        />
      </SettingsCard>

      <HistoryPanel
        moduleId={MODULE_ID}
        onResetSession={round.resetSession}
        formatTag={(t) =>
          t.startsWith("len-")
            ? `${t.slice(4)} 音`
            : t === "chromatic"
              ? "含半音"
              : t === "diatonic"
                ? "白键"
                : t
        }
      />
    </div>
  );
}

/* ---------- 子组件 ---------- */

function IdleCard({ onStart, error }: { onStart: () => void; error: string | null }) {
  return (
    <div className="relative overflow-hidden text-center py-9 rounded-[1.75rem] bg-zinc-950/38 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.35),0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-white/35 to-transparent" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-white/8 blur-3xl" />
      <div className="mb-4 flex justify-center text-zinc-100/90">
        <HeadphonesIcon
          size={56}
          className="drop-shadow-[0_4px_16px_rgba(255,255,255,0.2)]"
        />
      </div>
      <h2 className="text-xl font-semibold mb-2">准备好了吗？</h2>
      <p className="text-zinc-300/65 text-sm mb-6 px-4">
        点击开始，会随机抽一种乐器，播放几个音；你来判断每两个相邻音的方向。
      </p>
      <PrimaryButton onClick={onStart}>开始练习</PrimaryButton>
      {error && <p className="mt-4 text-sm text-rose-300">出错了：{error}</p>}
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-zinc-950/32 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_46px_rgba(0,0,0,0.18)] backdrop-blur-xl p-4 sm:p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-zinc-100/68 mb-3 sm:mb-4">设置</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">{children}</div>
    </section>
  );
}

function DirectionPicker({
  value,
  focused,
  onFocus,
  onChoose,
}: {
  value: Direction | null;
  focused: boolean;
  onFocus: () => void;
  onChoose: (d: Direction) => void;
}) {
  return (
    <div
      onClick={onFocus}
      className={`flex flex-col gap-1.5 p-1 rounded-lg transition cursor-pointer ${
        focused ? "ring-2 ring-white/55 bg-white/8" : "ring-2 ring-transparent"
      }`}
    >
      <DirBtn dir="up" active={value === "up"} onClick={() => onChoose("up")} />
      <DirBtn dir="down" active={value === "down"} onClick={() => onChoose("down")} />
    </div>
  );
}

function DirBtn({
  dir,
  active,
  onClick,
}: {
  dir: Direction;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "up" ? "上行" : "下行"}
      className={`w-10 h-10 sm:w-9 sm:h-9 rounded-md flex items-center justify-center transition border active:scale-95 ${
        active
          ? "bg-white/18 border-zinc-200/60 text-white shadow-md shadow-white/10"
          : "bg-white/5 border-white/10 text-zinc-300/65 hover:bg-white/10 hover:text-white"
      }`}
    >
      {dir === "up" ? <ArrowUpIcon size={18} /> : <ArrowDownIcon size={18} />}
    </button>
  );
}

function DirectionResult({
  correct,
  chosen,
}: {
  correct: Direction;
  chosen: Direction | null;
}) {
  const isRight = chosen === correct;
  const CorrectArrow = correct === "up" ? ArrowUpIcon : ArrowDownIcon;
  const ChosenArrow = chosen === "up" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <div className="flex flex-col items-center gap-1">
      <CorrectArrow
        size={22}
        className={isRight ? "text-emerald-400" : "text-rose-400"}
      />
      <span className="inline-flex items-center gap-0.5 text-[10px] text-white/40">
        {isRight ? (
          <CheckIcon size={12} className="text-emerald-400" />
        ) : (
          <>
            <CrossIcon size={10} className="text-rose-400" />
            你选
            <ChosenArrow size={10} />
          </>
        )}
      </span>
    </div>
  );
}
