import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generateMelody,
  midiToName,
  whiteKeysInRange,
  chromaticInRange,
} from "../../lib/music";
import {
  Field,
  GhostButton,
  Hint,
  InstrumentBadge,
  PrimaryButton,
  SegBar,
  SuccessButton,
  Toggle,
} from "../../components/ui";
import { useRound } from "../../hooks/useRound";
import { loadInstrument, playMelody, playSingleNote } from "../../audio/player";
import { ExerciseHeader, IdleCard, SettingsCard } from "../shared/Layout";
import { InstrumentPicker } from "../shared/InstrumentPicker";
import { Piano } from "../../components/Piano";
import {
  ArrowRightIcon,
  MelodyIcon,
  ReplayIcon,
  TurtleIcon,
} from "../../components/Icon";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useHistory } from "../../hooks/useHistory";
import { aggregate } from "../../lib/history";
import { HistoryPanel } from "../../components/HistoryPanel";

const MODULE_ID = "melody";

const LENGTH_OPTIONS = [3, 4, 5] as const;
const SPEED_OPTIONS = [
  { id: "slow", label: "慢", interval: 1.0 },
  { id: "normal", label: "中", interval: 0.7 },
  { id: "fast", label: "快", interval: 0.45 },
] as const;
const RANGE_OPTIONS = [
  { id: "narrow", label: "C4–C5 (1 八度)", low: 60, high: 72, kbLow: 60, kbHigh: 72 },
  { id: "normal", label: "G3–G5", low: 55, high: 79, kbLow: 48, kbHigh: 84 },
] as const;

type Question = number[]; // MIDI 序列

export default function MelodyExercise() {
  const [length, setLength] = usePersistedState<number>(
    `settings/${MODULE_ID}/length`,
    3,
  );
  const [rangeId, setRangeId] = usePersistedState<string>(
    `settings/${MODULE_ID}/rangeId`,
    "narrow",
  );
  const [speedId, setSpeedId] = usePersistedState<string>(
    `settings/${MODULE_ID}/speedId`,
    "slow",
  );
  const [chromatic, setChromatic] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/chromatic`,
    false,
  );
  const [showAllLabels, setShowAllLabels] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/showAllLabels`,
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

  const historyEntries = useHistory(MODULE_ID);
  const allTime = useMemo(() => aggregate(historyEntries), [historyEntries]);

  const range = useMemo(
    () => RANGE_OPTIONS.find((r) => r.id === rangeId) ?? RANGE_OPTIONS[0],
    [rangeId],
  );
  const speed = useMemo(
    () => SPEED_OPTIONS.find((s) => s.id === speedId) ?? SPEED_OPTIONS[0],
    [speedId],
  );

  const [answer, setAnswer] = useState<(number | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [previewMidi, setPreviewMidi] = useState<number | null>(null);

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

  useEffect(() => {
    if (round.phase === "answering" && melody.length) {
      setAnswer(new Array(melody.length).fill(null));
      setFocusIdx(0);
      setPreviewMidi(null);
    }
  }, [round.phase, melody.length]);

  const allFilled = answer.length > 0 && answer.every((a) => a !== null);

  const submit = useCallback(() => {
    if (!allFilled) return;
    const correct = answer.reduce(
      (acc, a, i) => acc + (a === melody[i] ? 1 : 0),
      0,
    );
    round.recordResult(correct, melody.length, {
      tags: [`len-${melody.length}`, chromatic ? "chromatic" : "diatonic"],
    });
  }, [allFilled, answer, melody, round, chromatic]);

  // 用户按键盘上的钢琴键
  const onPianoPress = useCallback(
    async (midi: number) => {
      if (round.phase === "loading" || round.isPlaying) return;
      if (round.phase === "answering") {
        // 试听并填入当前 focus 槽位
        if (round.instrument) {
          try {
            const sampler = await loadInstrument(round.instrument);
            setPreviewMidi(midi);
            await playSingleNote(sampler, midi, 0.7);
            setPreviewMidi(null);
          } catch (e) {
            console.error(e);
          }
        }
        if (focusIdx < answer.length) {
          setAnswer((prev) => {
            const next = [...prev];
            next[focusIdx] = midi;
            return next;
          });
          setFocusIdx((i) => Math.min(answer.length - 1, i + 1));
        }
      } else if (round.phase === "revealed") {
        // 揭示阶段：单击试听该音
        if (!round.instrument) return;
        try {
          const sampler = await loadInstrument(round.instrument);
          setPreviewMidi(midi);
          await playSingleNote(sampler, midi, 0.7);
          setPreviewMidi(null);
        } catch (e) {
          console.error(e);
        }
      }
    },
    [round, answer.length, focusIdx],
  );

  const replayReveal = useCallback(async () => {
    if (!round.instrument || !melody.length || round.isPlaying) return;
    try {
      const sampler = await loadInstrument(round.instrument);
      setPlayingIndex(null);
      await playMelody(sampler, melody, {
        noteInterval: 1.0,
        noteDuration: 0.9,
        onNoteStart: (i) => setPlayingIndex(i),
      });
      setPlayingIndex(null);
    } catch (e) {
      console.error(e);
    }
  }, [melody, round.instrument, round.isPlaying]);

  // 键盘快捷键
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
        else if (e.key === "Enter") { e.preventDefault(); if (allFilled) submit(); }
        else if (e.key === "Backspace" || e.key === "ArrowLeft") {
          e.preventDefault();
          const prev = Math.max(0, focusIdx - 1);
          setAnswer((p) => {
            const n = [...p];
            n[prev] = null;
            return n;
          });
          setFocusIdx(prev);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setFocusIdx((i) => Math.min(answer.length - 1, i + 1));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, focusIdx, answer.length, allFilled, submit, replayReveal]);

  const isRevealed = round.phase === "revealed";

  // 揭示阶段每个音的标记色
  const markedMidis = useMemo<Record<number, "correct" | "wrong" | "user" | "missed">>(() => {
    if (!isRevealed) {
      // 答题阶段：高亮已选答案
      const m: Record<number, "user"> = {};
      answer.forEach((a) => {
        if (a !== null) m[a] = "user";
      });
      return m;
    }
    const m: Record<number, "correct" | "wrong" | "user" | "missed"> = {};
    melody.forEach((midi, i) => {
      if (answer[i] === midi) m[midi] = "correct";
      else m[midi] = "missed";
    });
    answer.forEach((a, i) => {
      if (a !== null && a !== melody[i] && !m[a]) m[a] = "wrong";
    });
    return m;
  }, [isRevealed, answer, melody]);

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title="旋律听写"
        description="听一段旋律，在钢琴上把听到的音按顺序点出来"
        stats={{ rounds: round.stats.rounds, correct: round.stats.itemCorrect, total: round.stats.itemTotal }}
        allTime={{
          rounds: allTime.rounds,
          itemTotal: allTime.itemTotal,
          accuracy: allTime.accuracy,
        }}
      />

      {round.phase === "idle" ? (
        <IdleCard
          Icon={MelodyIcon}
          hint="听完之后在钢琴上按顺序点出每个音，可以试听任意键。"
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
                    <TurtleIcon size={18} /> 慢速回放
                  </span>
                )}
              </GhostButton>
            )}
          </div>

          {/* 答案槽位 */}
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 sm:p-5 overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-3 min-w-max mx-auto">
              {Array.from({ length: melody.length }).map((_, i) => {
                const userMidi = answer[i];
                const truthMidi = melody[i];
                const dotState =
                  isRevealed
                    ? userMidi === truthMidi
                      ? "right"
                      : "wrong"
                    : focusIdx === i
                      ? "focus"
                      : "idle";
                return (
                  <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={() => !isRevealed && setFocusIdx(i)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition border-2 active:scale-95
                        ${
                          dotState === "right"
                            ? "bg-emerald-500/30 border-emerald-400 text-emerald-100"
                            : dotState === "wrong"
                              ? "bg-rose-500/30 border-rose-400 text-rose-100"
                              : dotState === "focus"
                                ? "border-amber-300 bg-amber-300/10 text-amber-200 ring-2 ring-amber-300/40"
                                : userMidi !== null
                                  ? "border-indigo-400 bg-indigo-500/20 text-white"
                                  : "border-white/20 text-white/40 bg-white/5"
                        }
                        ${playingIndex === i ? "scale-125 ring-4 ring-amber-300/80" : ""}
                      `}
                    >
                      {userMidi !== null ? midiToName(userMidi) : i + 1}
                    </button>
                    {isRevealed && (
                      <span className="text-[10px] text-white/50">
                        正确 {midiToName(truthMidi)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 钢琴 */}
          <div className="rounded-xl bg-black/30 border border-white/10 p-2 sm:p-3">
            <Piano
              lowMidi={range.kbLow}
              highMidi={range.kbHigh}
              activeMidi={previewMidi ?? (playingIndex !== null ? melody[playingIndex] : null)}
              markedMidis={markedMidis}
              showLabels={showAllLabels ? "all" : "c-only"}
              onPress={onPianoPress}
              disabled={round.isPlaying || round.phase === "loading"}
            />
          </div>

          <Hint>
            {isRevealed
              ? "颜色：绿=正确音，红=按错的音 · 钢琴键可单独试听 · 键盘：回车=下一题"
              : "点钢琴键=试听并填入当前槽 · 点上方圆圈选槽 · 键盘：←/Backspace=改上一槽 · 空格=重听 · 回车=提交"}
          </Hint>

          <div className="flex justify-end">
            {!isRevealed ? (
              <SuccessButton onClick={submit} disabled={!allFilled}>提交答案</SuccessButton>
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
        <Field label="音符数量">
          <SegBar
            options={LENGTH_OPTIONS.map((n) => ({ id: String(n), label: `${n} 个` }))}
            value={String(length)}
            onChange={(v) => setLength(Number(v))}
          />
        </Field>
        <Field label="速度">
          <SegBar
            options={SPEED_OPTIONS.map((s) => ({ id: s.id, label: s.label }))}
            value={speedId}
            onChange={setSpeedId}
          />
        </Field>
        <Field label="音域">
          <SegBar
            options={RANGE_OPTIONS.map((r) => ({ id: r.id, label: r.label }))}
            value={rangeId}
            onChange={setRangeId}
          />
        </Field>
        <Field label="包含黑键 (半音)">
          <Toggle checked={chromatic} onChange={setChromatic} />
        </Field>
        <Field label="钢琴所有白键标音名">
          <Toggle checked={showAllLabels} onChange={setShowAllLabels} />
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
