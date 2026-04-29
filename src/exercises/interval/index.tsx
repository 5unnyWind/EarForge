import { useCallback, useEffect, useMemo, useState } from "react";
import {
  INTERVALS,
  intervalBySemitones,
  midiToName,
  randomChoice,
  randomInt,
  type IntervalDef,
} from "../../lib/music";
import {
  ChipMulti,
  Field,
  GhostButton,
  Hint,
  InstrumentBadge,
  PrimaryButton,
  SegBar,
  SuccessButton,
} from "../../components/ui";
import { useRound } from "../../hooks/useRound";
import { loadInstrument, playChord, playMelody } from "../../audio/player";
import { ExerciseHeader, IdleCard, SettingsCard } from "../shared/Layout";
import { InstrumentPicker } from "../shared/InstrumentPicker";
import {
  DifficultyPresetPicker,
  type DifficultyPreset,
} from "../shared/DifficultyPreset";
import {
  ArrowRightIcon,
  CheckIcon,
  CrossIcon,
  IntervalIcon,
  MusicNoteIcon,
  ReplayIcon,
  TurtleIcon,
} from "../../components/Icon";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useHistory } from "../../hooks/useHistory";
import { aggregate } from "../../lib/history";
import { HistoryPanel } from "../../components/HistoryPanel";

const MODULE_ID = "interval";

const RANGE_OPTIONS = [
  { id: "narrow", label: "C4–C5", low: 60, high: 72 },
  { id: "normal", label: "G3–G5", low: 55, high: 79 },
  { id: "wide", label: "C3–C6", low: 48, high: 84 },
] as const;

const PLAY_MODES = [
  { id: "melodic-up", label: "旋律 (低→高)" },
  { id: "melodic-down", label: "旋律 (高→低)" },
  { id: "melodic-rand", label: "旋律 (随机方向)" },
  { id: "harmonic", label: "和声 (同时)" },
] as const;
type PlayMode = (typeof PLAY_MODES)[number]["id"];

type Question = {
  low: number; // 较低音 MIDI
  high: number; // 较高音 MIDI
  intervalSemis: number;
  // 实际播放顺序（melodic 模式下决定先播哪个）
  playOrder: [number, number];
  isHarmonic: boolean;
};

const DEFAULT_INTERVALS = ["m2", "M2", "m3", "M3", "P4", "P5", "M6", "P8"];

const DIFFICULTY_PRESETS = {
  easy: {
    enabled: ["P4", "P5", "P8"],
    rangeId: "narrow",
    mode: "melodic-up",
  },
  medium: {
    enabled: DEFAULT_INTERVALS,
    rangeId: "normal",
    mode: "melodic-up",
  },
  hard: {
    enabled: INTERVALS.map((i) => i.short),
    rangeId: "wide",
    mode: "harmonic",
  },
} as const;

export default function IntervalExercise() {
  const [enabled, setEnabled] = usePersistedState<string[]>(
    `settings/${MODULE_ID}/enabled`,
    DEFAULT_INTERVALS,
  );
  const [rangeId, setRangeId] = usePersistedState<string>(
    `settings/${MODULE_ID}/rangeId`,
    "normal",
  );
  const [mode, setMode] = usePersistedState<PlayMode>(
    `settings/${MODULE_ID}/mode`,
    "melodic-up",
  );
  const [randomInstrument, setRandomInstrument] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/randomInstrument`,
    false,
  );
  const [fixedInstrumentId, setFixedInstrumentId] = usePersistedState<string>(
    `settings/${MODULE_ID}/fixedInstrumentId`,
    "piano",
  );
  const [difficultyPreset, setDifficultyPreset] =
    usePersistedState<DifficultyPreset>(
      `settings/${MODULE_ID}/difficultyPreset`,
      "medium",
    );

  const historyEntries = useHistory(MODULE_ID);
  const allTime = useMemo(() => aggregate(historyEntries), [historyEntries]);

  const range = useMemo(
    () => RANGE_OPTIONS.find((r) => r.id === rangeId) ?? RANGE_OPTIONS[1],
    [rangeId],
  );

  const enabledDefs = useMemo(
    () => INTERVALS.filter((i) => enabled.includes(i.short)),
    [enabled],
  );
  // 用户清空所有选项时，自动回退到全部，避免没有按钮可点
  const effectiveDefs = enabledDefs.length ? enabledDefs : INTERVALS;
  const isFallback = enabledDefs.length === 0;

  const [answer, setAnswer] = useState<string | null>(null); // interval short
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const markCustomDifficulty = useCallback(() => {
    setDifficultyPreset("custom");
  }, [setDifficultyPreset]);

  const applyDifficultyPreset = useCallback(
    (preset: DifficultyPreset) => {
      setDifficultyPreset(preset);
      if (preset === "custom") return;
      const next = DIFFICULTY_PRESETS[preset];
      setEnabled([...next.enabled]);
      setRangeId(next.rangeId);
      setMode(next.mode as PlayMode);
    },
    [setDifficultyPreset, setEnabled, setMode, setRangeId],
  );

  const round = useRound<Question>({
    moduleId: MODULE_ID,
    randomInstrument,
    fixedInstrumentId,
    generate: () => {
      const def = randomChoice(effectiveDefs);
      const semis = def.semitones;
      const low = randomInt(range.low, range.high - semis);
      const high = low + semis;
      const isHarmonic = mode === "harmonic";
      let order: [number, number];
      if (mode === "melodic-up") order = [low, high];
      else if (mode === "melodic-down") order = [high, low];
      else if (mode === "melodic-rand")
        order = Math.random() < 0.5 ? [low, high] : [high, low];
      else order = [low, high];
      return { low, high, intervalSemis: semis, playOrder: order, isHarmonic };
    },
    play: async (q, sampler) => {
      setPlayingIndex(null);
      if (q.isHarmonic) {
        await playChord(sampler, [q.low, q.high], 1.8);
      } else {
        await playMelody(sampler, q.playOrder, {
          noteInterval: 0.9,
          noteDuration: 0.85,
          onNoteStart: (i) => setPlayingIndex(i),
        });
      }
      setPlayingIndex(null);
    },
  });

  // 新一题清空答案
  useEffect(() => {
    if (round.phase === "answering") setAnswer(null);
  }, [round.phase, round.question]);

  const truth = round.question
    ? intervalBySemitones(round.question.intervalSemis)
    : undefined;

  const submit = useCallback(() => {
    if (!answer || !truth) return;
    round.recordResult(answer === truth.short ? 1 : 0, 1, {
      tags: [truth.short],
      answer,
      truth: truth.short,
    });
  }, [answer, truth, round]);

  const replayReveal = useCallback(async () => {
    if (!round.instrument || !round.question || round.isPlaying) return;
    try {
      const sampler = await loadInstrument(round.instrument);
      const q = round.question;
      if (q.isHarmonic) {
        await playChord(sampler, [q.low, q.high], 2.5);
      } else {
        await playMelody(sampler, q.playOrder, {
          noteInterval: 1.2,
          noteDuration: 1.1,
          onNoteStart: (i) => setPlayingIndex(i),
        });
        setPlayingIndex(null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [round.instrument, round.question, round.isPlaying]);

  // 键盘：1-9 / 0 等映射到当前显示的选项
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if (round.phase === "idle") {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); round.start(); }
      } else if (round.phase === "revealed") {
        if (e.key === "Enter") { e.preventDefault(); round.start(); }
        else if (e.key === " ") { e.preventDefault(); replayReveal(); }
      } else if (round.phase === "answering") {
        if (e.key === " ") { e.preventDefault(); round.replay(); }
        else if (e.key === "Enter") { e.preventDefault(); if (answer) submit(); }
        else if (/^[1-9]$/.test(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < effectiveDefs.length) setAnswer(effectiveDefs[idx].short);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, answer, submit, effectiveDefs, replayReveal]);

  const isRevealed = round.phase === "revealed";

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title="音程识别"
        description="听两个音判断音程关系"
        stats={{
          rounds: round.stats.rounds,
          correct: round.stats.itemCorrect,
          total: round.stats.itemTotal,
        }}
        allTime={{
          rounds: allTime.rounds,
          itemTotal: allTime.itemTotal,
          accuracy: allTime.accuracy,
        }}
      />

      {round.phase === "idle" ? (
        <IdleCard
          Icon={IntervalIcon}
          hint="先在下方设置中选好你想练的音程类型，点开始就会随机考你。"
          onStart={round.start}
          error={round.error}
        />
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
                    <TurtleIcon size={18} /> 慢速重听
                  </span>
                )}
              </GhostButton>
            )}
          </div>

          <div className="rounded-3xl bg-zinc-950/42 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_46px_rgba(0,0,0,0.18)] backdrop-blur-xl p-5 min-h-[140px] flex flex-col items-center justify-center gap-4">
            {isRevealed && round.question && truth ? (
              <RevealView
                q={round.question}
                truth={truth}
                chosen={answer}
                playingIndex={playingIndex}
              />
            ) : (
              <p className="text-white/60 text-sm inline-flex items-center gap-2">
                {round.isPlaying ? (
                  <>
                    <MusicNoteIcon size={18} className="text-zinc-100 animate-pulse" />
                    仔细听…
                  </>
                ) : (
                  "请在下方选择你听到的音程"
                )}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {effectiveDefs.map((def, i) => (
              <ChoiceChip
                key={def.short}
                label={`${def.zh} ${def.short}`}
                hotkey={i < 9 ? String(i + 1) : undefined}
                state={
                  isRevealed
                    ? truth?.short === def.short
                      ? "correct"
                      : answer === def.short
                        ? "wrong"
                        : "idle"
                    : answer === def.short
                      ? "selected"
                      : "idle"
                }
                onClick={() => !isRevealed && setAnswer(def.short)}
                disabled={isRevealed}
              />
            ))}
          </div>

          <Hint>
            {isRevealed
              ? "回车 = 下一题 · 空格 = 慢速重听"
              : "数字键 1–9 直接选 · 空格 = 重听 · 回车 = 提交"}
          </Hint>

          <div className="flex justify-end">
            {!isRevealed ? (
              <SuccessButton onClick={submit} disabled={!answer}>
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
        <Field
          label="启用的音程"
          hint={isFallback ? "未选任何项，已临时使用全部音程" : undefined}
        >
          <ChipMulti
            options={INTERVALS.map((i) => ({ id: i.short, label: `${i.zh} ${i.short}` }))}
            value={enabled}
            onChange={(v) => {
              markCustomDifficulty();
              setEnabled(v);
            }}
          />
        </Field>
        <Field label="播放方式">
          <SegBar
            options={PLAY_MODES.map((m) => ({ id: m.id, label: m.label }))}
            value={mode}
            onChange={(v) => {
              markCustomDifficulty();
              setMode(v as PlayMode);
            }}
          />
        </Field>
        <Field label="根音范围">
          <SegBar
            options={RANGE_OPTIONS.map((r) => ({ id: r.id, label: r.label }))}
            value={rangeId}
            onChange={(v) => {
              markCustomDifficulty();
              setRangeId(v);
            }}
          />
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
        formatTag={(t) => {
          const def = INTERVALS.find((i) => i.short === t);
          return def ? `${def.zh} ${def.short}` : t;
        }}
      />
    </div>
  );
}

function RevealView({
  q,
  truth,
  chosen,
  playingIndex,
}: {
  q: Question;
  truth: IntervalDef;
  chosen: string | null;
  playingIndex: number | null;
}) {
  const isRight = chosen === truth.short;
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className={`text-3xl font-bold ${isRight ? "text-emerald-400" : "text-rose-400"}`}>
        {truth.zh} ({truth.short})
      </div>
      <div className="text-sm text-white/60 inline-flex items-center gap-1.5">
        {isRight ? (
          <>
            <CheckIcon size={16} className="text-emerald-400" />
            答对了
          </>
        ) : (
          <>
            <CrossIcon size={16} className="text-rose-400" />
            你选了 {chosen ?? "—"}
          </>
        )}
      </div>
      <div className="flex gap-3 mt-1 text-xs text-white/50">
        {q.playOrder.map((m, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded border border-white/10 ${
              playingIndex === i ? "bg-white/16 border-zinc-200/60 text-white" : ""
            }`}
          >
            {midiToName(m)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChoiceChip({
  label,
  hotkey,
  state,
  onClick,
  disabled,
}: {
  label: string;
  hotkey?: string;
  state: "idle" | "selected" | "correct" | "wrong";
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls =
    state === "correct"
      ? "bg-emerald-500/30 border-emerald-400 text-emerald-100"
      : state === "wrong"
        ? "bg-rose-500/30 border-rose-400 text-rose-100"
        : state === "selected"
          ? "bg-white/18 border-zinc-200/60 text-white shadow-sm shadow-white/5"
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative px-3 py-2 min-h-[44px] rounded-lg text-sm border transition active:scale-[0.97] ${cls}`}
    >
      {label}
      {hotkey && (
        <span className="ml-2 text-[10px] text-white/40 tabular-nums hidden sm:inline">
          [{hotkey}]
        </span>
      )}
    </button>
  );
}
