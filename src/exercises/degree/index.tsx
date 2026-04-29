import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SCALES,
  midiToName,
  randomChoice,
  randomInt,
  type ScaleDef,
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
import { loadInstrument, playMelody, playSingleNote } from "../../audio/player";
import { ExerciseHeader, IdleCard, SettingsCard } from "../shared/Layout";
import { InstrumentPicker } from "../shared/InstrumentPicker";
import {
  DifficultyPresetPicker,
  type DifficultyPreset,
} from "../shared/DifficultyPreset";
import { ChoiceChip, ChoiceGrid } from "../shared/SingleChoice";
import {
  ArrowRightIcon,
  CheckIcon,
  CrossIcon,
  MusicNoteIcon,
  ReplayIcon,
  ScaleIcon,
  TurtleIcon,
} from "../../components/Icon";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useHistory } from "../../hooks/useHistory";
import { aggregate } from "../../lib/history";
import { HistoryPanel } from "../../components/HistoryPanel";

const MODULE_ID = "degree";

const ROOT_OPTIONS = [
  { id: "c", label: "C4", root: 60 },
  { id: "mid", label: "C4–B4", root: -1 },
  { id: "low", label: "C3–B3", root: -2 },
] as const;

const PLAY_CONTEXTS = [
  { id: "root-target", label: "主音 + 目标音" },
  { id: "scale-target", label: "音阶 + 目标音" },
] as const;

const DEFAULT_SCALES = ["major", "natural-min", "dorian", "mixolydian"];
const TARGET_PAUSE_MS = 550;
const SLOW_TARGET_PAUSE_MS = 750;

const DIFFICULTY_PRESETS = {
  easy: {
    enabled: ["major", "natural-min"],
    rootMode: "c",
    playContext: "root-target",
  },
  medium: {
    enabled: DEFAULT_SCALES,
    rootMode: "c",
    playContext: "root-target",
  },
  hard: {
    enabled: SCALES.map((s) => s.id),
    rootMode: "mid",
    playContext: "scale-target",
  },
} as const;

type RootMode = (typeof ROOT_OPTIONS)[number]["id"];
type PlayContext = (typeof PLAY_CONTEXTS)[number]["id"];

type Question = {
  rootMidi: number;
  targetMidi: number;
  degreeIndex: number;
  scale: ScaleDef;
  scaleNotes: number[];
  sequence: number[];
};

const SOLFEGE = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];

function degreeLabel(index: number): string {
  return `${index + 1}级`;
}

function degreeSub(index: number): string | undefined {
  return SOLFEGE[index];
}

function pickRoot(mode: RootMode): number {
  if (mode === "c") return 60;
  if (mode === "low") return randomInt(48, 59);
  return randomInt(60, 71);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DegreeExercise() {
  const [enabled, setEnabled] = usePersistedState<string[]>(
    `settings/${MODULE_ID}/enabled`,
    DEFAULT_SCALES,
  );
  const [rootMode, setRootMode] = usePersistedState<RootMode>(
    `settings/${MODULE_ID}/rootMode`,
    "c",
  );
  const [playContext, setPlayContext] = usePersistedState<PlayContext>(
    `settings/${MODULE_ID}/playContext`,
    "root-target",
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

  const enabledScales = useMemo(
    () => SCALES.filter((s) => enabled.includes(s.id)),
    [enabled],
  );
  const effectiveScales = enabledScales.length ? enabledScales : SCALES;
  const isFallback = enabledScales.length === 0;

  const [answer, setAnswer] = useState<number | null>(null);
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
      setRootMode(next.rootMode as RootMode);
      setPlayContext(next.playContext as PlayContext);
    },
    [setDifficultyPreset, setEnabled, setPlayContext, setRootMode],
  );

  const round = useRound<Question>({
    moduleId: MODULE_ID,
    randomInstrument,
    fixedInstrumentId,
    generate: () => {
      const scale = randomChoice(effectiveScales);
      const rootMidi = pickRoot(rootMode);
      const degreeIntervals = scale.intervals.slice(0, -1);
      const degreeIndex = randomInt(0, degreeIntervals.length - 1);
      const scaleNotes = degreeIntervals.map((interval) => rootMidi + interval);
      const targetMidi = scaleNotes[degreeIndex];
      const sequence =
        playContext === "scale-target"
          ? [...scaleNotes, targetMidi]
          : [rootMidi, targetMidi];
      return { rootMidi, targetMidi, degreeIndex, scale, scaleNotes, sequence };
    },
    play: async (q, sampler) => {
      setPlayingIndex(null);
      if (playContext === "scale-target") {
        await playMelody(sampler, q.scaleNotes, {
          noteInterval: 0.28,
          noteDuration: 0.24,
          onNoteStart: (i) => setPlayingIndex(i),
        });
        setPlayingIndex(null);
        await wait(TARGET_PAUSE_MS);
        setPlayingIndex(q.scaleNotes.length);
        await playSingleNote(sampler, q.targetMidi, 0.62);
      } else {
        await playMelody(sampler, q.sequence, {
          noteInterval: 0.72,
          noteDuration: 0.62,
          onNoteStart: (i) => setPlayingIndex(i),
        });
      }
      setPlayingIndex(null);
    },
  });

  useEffect(() => {
    if (round.phase === "answering") setAnswer(null);
  }, [round.phase, round.question]);

  const truth = round.question?.degreeIndex;
  const currentDegrees = round.question?.scaleNotes.map((_, i) => i) ?? [];

  const submit = useCallback(() => {
    if (answer === null || truth === undefined || !round.question) return;
    const tag = degreeLabel(truth);
    round.recordResult(answer === truth ? 1 : 0, 1, {
      tags: [tag],
      answer: degreeLabel(answer),
      truth: tag,
    });
  }, [answer, truth, round]);

  const replayReveal = useCallback(async () => {
    if (!round.instrument || !round.question || round.isPlaying) return;
    try {
      const sampler = await loadInstrument(round.instrument);
      setPlayingIndex(null);
      if (playContext === "scale-target") {
        await playMelody(sampler, round.question.scaleNotes, {
          noteInterval: 0.42,
          noteDuration: 0.36,
          onNoteStart: (i) => setPlayingIndex(i),
        });
        setPlayingIndex(null);
        await wait(SLOW_TARGET_PAUSE_MS);
        setPlayingIndex(round.question.scaleNotes.length);
        await playSingleNote(sampler, round.question.targetMidi, 0.9);
      } else {
        await playMelody(sampler, round.question.sequence, {
          noteInterval: 0.9,
          noteDuration: 0.8,
          onNoteStart: (i) => setPlayingIndex(i),
        });
      }
      setPlayingIndex(null);
    } catch (e) {
      console.error(e);
    }
  }, [round.instrument, round.question, round.isPlaying, playContext]);

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
        else if (e.key === "Enter") { e.preventDefault(); if (answer !== null) submit(); }
        else if (/^[1-9]$/.test(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (currentDegrees.includes(idx)) setAnswer(idx);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, answer, submit, currentDegrees, replayReveal]);

  const isRevealed = round.phase === "revealed";
  const question = round.question;

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title="音级识别"
        description="听主音定位和目标音，判断它是音阶里的第几级"
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
          Icon={ScaleIcon}
          hint="先选择要练的音阶类型。开始后会给出调性感，再播放一个音，请判断它是第几级。"
          onStart={round.start}
          error={round.error}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <InstrumentBadge label={round.instrument?.name ?? "—"} loading={round.phase === "loading"} />
            {!isRevealed ? (
              <GhostButton onClick={round.replay} disabled={round.isPlaying || round.phase === "loading"}>
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

          <div className="rounded-3xl bg-zinc-950/42 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_46px_rgba(0,0,0,0.18)] backdrop-blur-xl p-5 min-h-[150px] flex flex-col items-center justify-center gap-3">
            {isRevealed && question && truth !== undefined ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className={`text-3xl font-bold ${answer === truth ? "text-emerald-400" : "text-rose-400"}`}>
                  {degreeLabel(truth)} {degreeSub(truth) && `(${degreeSub(truth)})`}
                </div>
                <div className="text-sm text-zinc-300/60 inline-flex items-center gap-1.5">
                  {answer === truth ? (
                    <>
                      <CheckIcon size={16} className="text-emerald-400" />
                      答对了
                    </>
                  ) : (
                    <>
                      <CrossIcon size={16} className="text-rose-400" />
                      你选了 {answer === null ? "—" : degreeLabel(answer)}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 mt-1 text-xs text-zinc-300/55">
                  <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5">
                    {midiToName(question.rootMidi)} {question.scale.zh}
                  </span>
                  {question.scaleNotes.map((m, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded-lg border border-white/10 ${
                        i === truth ? "bg-white/16 border-zinc-200/60 text-white" : ""
                      }`}
                    >
                      {degreeLabel(i)} · {midiToName(m)}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 text-[11px] text-zinc-400/60">
                  <span className="px-2 py-1">播放序列</span>
                  {question.sequence.map((m, i) => (
                    <span
                      key={`${m}-${i}`}
                      className={`px-2 py-1 rounded-lg border border-white/10 ${
                        playingIndex === i ? "bg-white/16 border-zinc-200/60 text-white" : ""
                      }`}
                    >
                      {midiToName(m)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-zinc-300/60 text-sm inline-flex items-center gap-2">
                {round.isPlaying ? (
                  <>
                    <MusicNoteIcon size={18} className="text-zinc-100 animate-pulse" />
                    仔细听目标音在音阶里的位置…
                  </>
                ) : (
                  "下方选择你听到的是第几级"
                )}
              </p>
            )}
          </div>

          <ChoiceGrid>
            {currentDegrees.map((degree) => (
              <ChoiceChip
                key={degree}
                label={degreeLabel(degree)}
                sub={degreeSub(degree)}
                hotkey={degree < 9 ? String(degree + 1) : undefined}
                state={
                  isRevealed
                    ? truth === degree
                      ? "correct"
                      : answer === degree
                        ? "wrong"
                        : "idle"
                    : answer === degree
                      ? "selected"
                      : "idle"
                }
                onClick={() => !isRevealed && setAnswer(degree)}
                disabled={isRevealed}
              />
            ))}
          </ChoiceGrid>

          <Hint>
            {isRevealed
              ? "回车 = 下一题 · 空格 = 慢速重听"
              : "数字键 1–9 直接选 · 空格 = 重听 · 回车 = 提交"}
          </Hint>

          <div className="flex justify-end">
            {!isRevealed ? (
              <SuccessButton onClick={submit} disabled={answer === null}>提交答案</SuccessButton>
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
          label="启用的音阶"
          hint={isFallback ? "未选任何项，已临时使用全部音阶" : undefined}
        >
          <ChipMulti
            options={SCALES.map((s) => ({ id: s.id, label: s.zh }))}
            value={enabled}
            onChange={(v) => {
              markCustomDifficulty();
              setEnabled(v);
            }}
          />
        </Field>
        <Field label="播放方式">
          <SegBar
            options={PLAY_CONTEXTS.map((c) => ({ id: c.id, label: c.label }))}
            value={playContext}
            onChange={(v) => {
              markCustomDifficulty();
              setPlayContext(v as PlayContext);
            }}
          />
        </Field>
        <Field label="主音">
          <SegBar
            options={ROOT_OPTIONS.map((r) => ({ id: r.id, label: r.label }))}
            value={rootMode}
            onChange={(v) => {
              markCustomDifficulty();
              setRootMode(v as RootMode);
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
        formatTag={(t) => t}
      />
    </div>
  );
}
