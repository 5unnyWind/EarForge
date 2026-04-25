import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SCALES,
  buildScale,
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
import { loadInstrument, playMelody } from "../../audio/player";
import { ExerciseHeader, IdleCard, SettingsCard } from "../shared/Layout";
import { InstrumentPicker } from "../shared/InstrumentPicker";
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

const MODULE_ID = "scale";

const RANGE_OPTIONS = [
  { id: "low", label: "C3 起", root: 48 },
  { id: "mid", label: "C4 起", root: 60 },
  { id: "rand", label: "随机根音", root: -1 }, // -1 表示随机
] as const;

const DIRECTIONS = [
  { id: "up", label: "上行" },
  { id: "down", label: "下行" },
  { id: "up-down", label: "上+下" },
] as const;
type DirectionMode = (typeof DIRECTIONS)[number]["id"];

const DEFAULT_SCALES = ["major", "natural-min", "harmonic-min", "dorian"];

type Question = {
  rootMidi: number;
  def: ScaleDef;
  sequence: number[];
};

export default function ScaleExercise() {
  const [enabled, setEnabled] = usePersistedState<string[]>(
    `settings/${MODULE_ID}/enabled`,
    DEFAULT_SCALES,
  );
  const [rangeId, setRangeId] = usePersistedState<string>(
    `settings/${MODULE_ID}/rangeId`,
    "mid",
  );
  const [direction, setDirection] = usePersistedState<DirectionMode>(
    `settings/${MODULE_ID}/direction`,
    "up",
  );
  const [randomInstrument, setRandomInstrument] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/randomInstrument`,
    true,
  );
  const [fixedInstrumentId, setFixedInstrumentId] = usePersistedState<string>(
    `settings/${MODULE_ID}/fixedInstrumentId`,
    "piano",
  );

  const historyEntries = useHistory(MODULE_ID);
  const allTime = useMemo(() => aggregate(historyEntries), [historyEntries]);

  const enabledDefs = useMemo(
    () => SCALES.filter((s) => enabled.includes(s.id)),
    [enabled],
  );
  const effectiveDefs = enabledDefs.length ? enabledDefs : SCALES;
  const isFallback = enabledDefs.length === 0;

  const [answer, setAnswer] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const round = useRound<Question>({
    moduleId: MODULE_ID,
    randomInstrument,
    fixedInstrumentId,
    generate: () => {
      const def = randomChoice(effectiveDefs);
      const opt = RANGE_OPTIONS.find((r) => r.id === rangeId) ?? RANGE_OPTIONS[1];
      const root = opt.root === -1 ? randomInt(48, 60) : opt.root;
      const asc = buildScale(root, def);
      let seq: number[] = asc;
      if (direction === "down") seq = [...asc].reverse();
      else if (direction === "up-down") seq = [...asc, ...[...asc].reverse().slice(1)];
      return { rootMidi: root, def, sequence: seq };
    },
    play: async (q, sampler) => {
      setPlayingIndex(null);
      await playMelody(sampler, q.sequence, {
        noteInterval: 0.32,
        noteDuration: 0.3,
        onNoteStart: (i) => setPlayingIndex(i),
      });
      setPlayingIndex(null);
    },
  });

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
      setPlayingIndex(null);
      await playMelody(sampler, round.question.sequence, {
        noteInterval: 0.55,
        noteDuration: 0.5,
        onNoteStart: (i) => setPlayingIndex(i),
      });
      setPlayingIndex(null);
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
        title="音阶识别"
        description="听一个音阶判断它属于哪种调式"
        stats={{ rounds: round.stats.rounds, correct: round.stats.itemCorrect, total: round.stats.itemTotal }}
        allTime={{
          rounds: allTime.rounds,
          itemTotal: allTime.itemTotal,
          accuracy: allTime.accuracy,
        }}
      />

      {round.phase === "idle" ? (
        <IdleCard
          Icon={ScaleIcon}
          hint="先在下方设置中选好你想练的音阶类型，点开始就会随机考你。"
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

          <div className="rounded-xl bg-black/30 border border-white/10 p-5 min-h-[140px] flex flex-col items-center justify-center gap-3">
            {isRevealed && round.question && truth ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className={`text-2xl font-bold ${answer === truth.id ? "text-emerald-400" : "text-rose-400"}`}>
                  {midiToName(round.question.rootMidi)} {truth.zh}
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
                      你选了 {SCALES.find((s) => s.id === answer)?.zh ?? "—"}
                    </>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap justify-center mt-1 text-xs text-white/50">
                  {round.question.sequence.map((m, i) => (
                    <span
                      key={i}
                      className={`px-1.5 py-0.5 rounded border border-white/10 ${
                        playingIndex === i ? "bg-amber-300/20 border-amber-300/60 text-amber-200" : ""
                      }`}
                    >
                      {midiToName(m)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-white/60 text-sm inline-flex items-center gap-2">
                {round.isPlaying ? (
                  <>
                    <MusicNoteIcon size={18} className="text-amber-300 animate-pulse" />
                    仔细听…
                  </>
                ) : (
                  "下方选择你听到的音阶类型"
                )}
              </p>
            )}
          </div>

          <ChoiceGrid>
            {effectiveDefs.map((def, i) => (
              <ChoiceChip
                key={def.id}
                label={def.zh}
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
        <Field
          label="启用的音阶"
          hint={isFallback ? "未选任何项，已临时使用全部音阶" : undefined}
        >
          <ChipMulti
            options={SCALES.map((s) => ({ id: s.id, label: s.zh }))}
            value={enabled}
            onChange={setEnabled}
          />
        </Field>
        <Field label="播放方向">
          <SegBar
            options={DIRECTIONS.map((d) => ({ id: d.id, label: d.label }))}
            value={direction}
            onChange={(v) => setDirection(v as DirectionMode)}
          />
        </Field>
        <Field label="根音">
          <SegBar
            options={RANGE_OPTIONS.map((r) => ({ id: r.id, label: r.label }))}
            value={rangeId}
            onChange={setRangeId}
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
        formatTag={(t) => SCALES.find((s) => s.id === t)?.zh ?? t}
      />
    </div>
  );
}
