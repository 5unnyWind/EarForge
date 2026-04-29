import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CHORDS,
  buildChord,
  midiToName,
  randomChoice,
  randomInt,
  type ChordDef,
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
import { ChoiceChip, ChoiceGrid } from "../shared/SingleChoice";
import {
  ArrowRightIcon,
  CheckIcon,
  ChordIcon,
  CrossIcon,
  MusicNoteIcon,
  ReplayIcon,
  TurtleIcon,
} from "../../components/Icon";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useHistory } from "../../hooks/useHistory";
import { aggregate } from "../../lib/history";
import { HistoryPanel } from "../../components/HistoryPanel";

const MODULE_ID = "chord";

const RANGE_OPTIONS = [
  { id: "narrow", label: "C4–G4", low: 60, high: 67 },
  { id: "normal", label: "G3–G4", low: 55, high: 67 },
  { id: "wide", label: "C3–C5", low: 48, high: 72 },
] as const;

const PLAY_MODES = [
  { id: "block", label: "柱式 (同时)" },
  { id: "arpeggio-up", label: "琶音 (低→高)" },
  { id: "arpeggio-down", label: "琶音 (高→低)" },
  { id: "block-then-arp", label: "柱式 + 琶音" },
] as const;
type PlayMode = (typeof PLAY_MODES)[number]["id"];

const DEFAULT_CHORDS = ["M", "m", "dim", "aug"];

const DIFFICULTY_PRESETS = {
  easy: {
    enabled: ["M", "m"],
    rangeId: "narrow",
    mode: "block-then-arp",
  },
  medium: {
    enabled: DEFAULT_CHORDS,
    rangeId: "normal",
    mode: "block-then-arp",
  },
  hard: {
    enabled: CHORDS.map((c) => c.id),
    rangeId: "wide",
    mode: "block",
  },
} as const;

type Question = { rootMidi: number; def: ChordDef; notes: number[]; mode: PlayMode };

export default function ChordExercise() {
  const [enabled, setEnabled] = usePersistedState<string[]>(
    `settings/${MODULE_ID}/enabled`,
    DEFAULT_CHORDS,
  );
  const [rangeId, setRangeId] = usePersistedState<string>(
    `settings/${MODULE_ID}/rangeId`,
    "normal",
  );
  const [mode, setMode] = usePersistedState<PlayMode>(
    `settings/${MODULE_ID}/mode`,
    "block-then-arp",
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
    () => CHORDS.filter((c) => enabled.includes(c.id)),
    [enabled],
  );
  const effectiveDefs = enabledDefs.length ? enabledDefs : CHORDS;
  const isFallback = enabledDefs.length === 0;

  const [answer, setAnswer] = useState<string | null>(null);

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
      const span = Math.max(...def.intervals);
      const root = randomInt(range.low, Math.max(range.low, range.high - span));
      const notes = buildChord(root, def);
      return { rootMidi: root, def, notes, mode };
    },
    play: async (q, sampler) => {
      await playOne(sampler, q);
    },
  });

  // 新一题清空答案
  useEffect(() => {
    if (round.phase === "answering") setAnswer(null);
  }, [round.phase, round.question]);

  const truth = round.question?.def;

  const submit = useCallback(() => {
    if (!answer || !truth) return;
    round.recordResult(answer === truth.id ? 1 : 0, 1, {
      tags: [truth.id],
      answer,
      truth: truth.id,
    });
  }, [answer, truth, round]);

  const replayReveal = useCallback(async () => {
    if (!round.instrument || !round.question || round.isPlaying) return;
    try {
      const sampler = await loadInstrument(round.instrument);
      await playOne(sampler, { ...round.question, mode: "block-then-arp" });
    } catch (e) {
      console.error(e);
    }
  }, [round.instrument, round.question, round.isPlaying]);

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
          if (idx < effectiveDefs.length) setAnswer(effectiveDefs[idx].id);
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
        title="和弦识别"
        description="听一个和弦判断它的性质"
        stats={{ rounds: round.stats.rounds, correct: round.stats.itemCorrect, total: round.stats.itemTotal }}
        allTime={{
          rounds: allTime.rounds,
          itemTotal: allTime.itemTotal,
          accuracy: allTime.accuracy,
        }}
      />

      {round.phase === "idle" ? (
        <IdleCard
          Icon={ChordIcon}
          hint="先在下方设置中选好你想练的和弦类型，点开始就会随机考你。"
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
                    <TurtleIcon size={18} /> 柱式 + 琶音再听
                  </span>
                )}
              </GhostButton>
            )}
          </div>

          <div className="rounded-3xl bg-zinc-950/42 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_46px_rgba(0,0,0,0.18)] backdrop-blur-xl p-5 min-h-[140px] flex items-center justify-center">
            {isRevealed && round.question && truth ? (
              <div className="flex flex-col items-center gap-3">
                <div className={`text-3xl font-bold ${answer === truth.id ? "text-emerald-400" : "text-rose-400"}`}>
                  {truth.zh}
                </div>
                <div className="text-sm text-white/60 inline-flex items-center gap-1.5">
                  {answer === truth.id ? (
                    <>
                      <CheckIcon size={16} className="text-emerald-400" />
                      答对了
                    </>
                  ) : (
                    <>
                      <CrossIcon size={16} className="text-rose-400" />
                      你选了 {CHORDS.find((c) => c.id === answer)?.zh ?? "—"}
                    </>
                  )}
                </div>
                <div className="flex gap-2 mt-1 text-xs text-white/50">
                  根音 {midiToName(round.question.rootMidi)} · 音符
                  {round.question.notes.map((m, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                      {midiToName(m)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-white/60 text-sm inline-flex items-center gap-2">
                {round.isPlaying ? (
                  <>
                    <MusicNoteIcon size={18} className="text-zinc-100 animate-pulse" />
                    仔细听…
                  </>
                ) : (
                  "下方选择你听到的和弦类型"
                )}
              </p>
            )}
          </div>

          <ChoiceGrid>
            {effectiveDefs.map((def, i) => (
              <ChoiceChip
                key={def.id}
                label={def.zh}
                sub={def.short}
                hotkey={i < 9 ? String(i + 1) : undefined}
                state={
                  isRevealed
                    ? truth?.id === def.id
                      ? "correct"
                      : answer === def.id
                        ? "wrong"
                        : "idle"
                    : answer === def.id
                      ? "selected"
                      : "idle"
                }
                onClick={() => !isRevealed && setAnswer(def.id)}
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
              <SuccessButton onClick={submit} disabled={!answer}>提交答案</SuccessButton>
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
          label="启用的和弦"
          hint={isFallback ? "未选任何项，已临时使用全部和弦" : undefined}
        >
          <ChipMulti
            options={CHORDS.map((c) => ({ id: c.id, label: `${c.zh} ${c.short}` }))}
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
          const def = CHORDS.find((c) => c.id === t);
          return def ? `${def.zh} ${def.short}` : t;
        }}
      />
    </div>
  );
}

async function playOne(sampler: import("tone").Sampler, q: Question) {
  const notes = q.notes;
  if (q.mode === "block") {
    await playChord(sampler, notes, 1.8);
  } else if (q.mode === "arpeggio-up") {
    await playMelody(sampler, notes, { noteInterval: 0.5, noteDuration: 0.5 });
  } else if (q.mode === "arpeggio-down") {
    await playMelody(sampler, [...notes].reverse(), { noteInterval: 0.5, noteDuration: 0.5 });
  } else {
    await playChord(sampler, notes, 1.4);
    await new Promise((r) => setTimeout(r, 250));
    await playMelody(sampler, notes, { noteInterval: 0.45, noteDuration: 0.45 });
  }
}
