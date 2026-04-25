import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  ensureAudioReady,
  loadInstrument,
  type RhythmHit,
} from "../../audio/player";
import { ExerciseHeader, IdleCard, SettingsCard } from "../shared/Layout";
import { InstrumentPicker } from "../shared/InstrumentPicker";
import { pickCandidates, type RhythmPattern } from "./patterns";
import * as Tone from "tone";
import { midiToName } from "../../lib/music";
import {
  ArrowRightIcon,
  ReplayIcon,
  RhythmIcon,
  TurtleIcon,
} from "../../components/Icon";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useHistory } from "../../hooks/useHistory";
import { aggregate } from "../../lib/history";
import { HistoryPanel } from "../../components/HistoryPanel";

const MODULE_ID = "rhythm";

const TEMPO_OPTIONS = [
  { id: "60", label: "60 BPM" },
  { id: "80", label: "80 BPM" },
  { id: "100", label: "100 BPM" },
  { id: "120", label: "120 BPM" },
] as const;

const DIFFICULTY_OPTIONS = [
  { id: "1", label: "简单 (♩ ♩ 𝅗𝅥)" },
  { id: "2", label: "中等 (含 ♫)" },
  { id: "3", label: "较难 (含 ♬ 切分)" },
] as const;

type Question = {
  correct: RhythmPattern;
  choices: RhythmPattern[];
  bpm: number;
  precount: boolean;
  /** 击音用的音高 MIDI */
  hitMidi: number;
  /** 节拍器拍点用的音高 MIDI */
  clickMidi: number;
};

const RHYTHM_HIT_MIDI = 76; // E5 - 较亮
const CLICK_MIDI = 60; // C4

function patternToHits(pattern: RhythmPattern, bpm: number): RhythmHit[] {
  const sixteenthSec = 60 / bpm / 4;
  const hits: RhythmHit[] = [];
  for (let i = 0; i < pattern.onsets.length; i++) {
    if (pattern.onsets[i]) {
      // 持续到下一个 onset 或末尾
      let next = pattern.onsets.length;
      for (let j = i + 1; j < pattern.onsets.length; j++) {
        if (pattern.onsets[j]) {
          next = j;
          break;
        }
      }
      const dur = (next - i) * sixteenthSec * 0.95;
      hits.push({ time: i * sixteenthSec, duration: dur });
    }
  }
  return hits;
}

export default function RhythmExercise() {
  const [bpmId, setBpmId] = usePersistedState<string>(
    `settings/${MODULE_ID}/bpmId`,
    "80",
  );
  const [diffId, setDiffId] = usePersistedState<string>(
    `settings/${MODULE_ID}/diffId`,
    "2",
  );
  const [precount, setPrecount] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/precount`,
    true,
  );
  const [randomInstrument, setRandomInstrument] = usePersistedState<boolean>(
    `settings/${MODULE_ID}/randomInstrument`,
    false,
  );
  const [fixedInstrumentId, setFixedInstrumentId] = usePersistedState<string>(
    `settings/${MODULE_ID}/fixedInstrumentId`,
    "xylophone",
  );

  const historyEntries = useHistory(MODULE_ID);
  const allTime = useMemo(() => aggregate(historyEntries), [historyEntries]);

  const bpm = parseInt(bpmId, 10);
  const difficulty = parseInt(diffId, 10) as 1 | 2 | 3;

  const [answer, setAnswer] = useState<string | null>(null);
  const [playingHitIdx, setPlayingHitIdx] = useState<number | null>(null);

  const round = useRound<Question>({
    moduleId: MODULE_ID,
    randomInstrument,
    fixedInstrumentId,
    generate: () => {
      const { correct, choices } = pickCandidates(difficulty, 4);
      return {
        correct,
        choices,
        bpm,
        precount,
        hitMidi: RHYTHM_HIT_MIDI,
        clickMidi: CLICK_MIDI,
      };
    },
    play: async (q, sampler) => {
      await playOne(sampler, q, (i) => setPlayingHitIdx(i));
      setPlayingHitIdx(null);
    },
  });

  useEffect(() => {
    if (round.phase === "answering") {
      setAnswer(null);
      setPlayingHitIdx(null);
    }
  }, [round.phase, round.question]);

  const truth = round.question?.correct;

  const submit = useCallback(() => {
    if (!answer || !truth) return;
    round.recordResult(answer === truth.id ? 1 : 0, 1, {
      tags: [`难度 ${difficulty}`],
      answer,
      truth: truth.id,
    });
  }, [answer, truth, round, difficulty]);

  const replayReveal = useCallback(async () => {
    if (!round.instrument || !round.question || round.isPlaying) return;
    try {
      const sampler = await loadInstrument(round.instrument);
      // 揭示阶段慢一点
      await playOne(
        sampler,
        { ...round.question, bpm: Math.max(50, round.question.bpm - 30) },
        (i) => setPlayingHitIdx(i),
      );
      setPlayingHitIdx(null);
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
      } else if (round.phase === "answering" && round.question) {
        if (e.key === " ") { e.preventDefault(); round.replay(); }
        else if (e.key === "Enter") { e.preventDefault(); if (answer) submit(); }
        else if (/^[1-9]$/.test(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < round.question.choices.length) {
            setAnswer(round.question.choices[idx].id);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, answer, submit, replayReveal]);

  const isRevealed = round.phase === "revealed";

  const hint = useMemo(() => {
    if (isRevealed) return "回车 = 下一题 · 空格 = 慢速重听";
    return "数字键 1–4 直接选 · 空格 = 重听 · 回车 = 提交";
  }, [isRevealed]);

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader
        title="节奏听写"
        description="听一段节奏，从候选项中选出对的那一个"
        stats={{ rounds: round.stats.rounds, correct: round.stats.itemCorrect, total: round.stats.itemTotal }}
        allTime={{
          rounds: allTime.rounds,
          itemTotal: allTime.itemTotal,
          accuracy: allTime.accuracy,
        }}
      />

      {round.phase === "idle" ? (
        <IdleCard
          Icon={RhythmIcon}
          hint="设置中调好难度和速度，点开始；先听 4 拍预备拍，再听 1 小节节奏。"
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

          {round.question && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {round.question.choices.map((p, i) => {
                const state =
                  isRevealed
                    ? truth?.id === p.id
                      ? "correct"
                      : answer === p.id
                        ? "wrong"
                        : "idle"
                    : answer === p.id
                      ? "selected"
                      : "idle";
                return (
                  <PatternCard
                    key={p.id}
                    pattern={p}
                    state={state}
                    hotkey={String(i + 1)}
                    activeIdx={
                      isRevealed && truth?.id === p.id ? playingHitIdx : null
                    }
                    onClick={() => !isRevealed && setAnswer(p.id)}
                    disabled={isRevealed}
                  />
                );
              })}
            </div>
          )}

          <Hint>{hint}</Hint>

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
        <Field label="速度">
          <SegBar
            options={TEMPO_OPTIONS.map((t) => ({ id: t.id, label: t.label }))}
            value={bpmId}
            onChange={setBpmId}
          />
        </Field>
        <Field label="难度">
          <SegBar
            options={DIFFICULTY_OPTIONS.map((d) => ({ id: d.id, label: d.label }))}
            value={diffId}
            onChange={setDiffId}
          />
        </Field>
        <Field label="先放 4 拍预备拍">
          <Toggle checked={precount} onChange={setPrecount} />
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
      />
    </div>
  );
}

/** 播放：可选预备 4 拍 + 节奏型本身 */
async function playOne(
  sampler: Tone.Sampler,
  q: Question,
  onHit: (i: number) => void,
) {
  await ensureAudioReady();
  const beat = 60 / q.bpm;
  const start = Tone.now() + 0.15;

  // 预备拍：4 个 click
  if (q.precount) {
    const clickName = midiToName(q.clickMidi);
    for (let b = 0; b < 4; b++) {
      sampler.triggerAttackRelease(clickName, beat * 0.2, start + b * beat);
    }
  }

  // 节奏型
  const offset = q.precount ? 4 * beat : 0;
  const hits = patternToHits(q.correct, q.bpm);
  const hitName = midiToName(q.hitMidi);
  hits.forEach((h, i) => {
    const t = start + offset + h.time;
    sampler.triggerAttackRelease(hitName, h.duration, t);
    Tone.getDraw().schedule(() => onHit(i), t);
  });

  // 等待结束
  const totalSec =
    (q.precount ? 4 * beat : 0) +
    (hits.length
      ? hits[hits.length - 1].time + hits[hits.length - 1].duration
      : 0) +
    0.4;
  await new Promise<void>((r) => setTimeout(r, totalSec * 1000 + 200));
}

/* ---------- 节奏型卡片 ---------- */

function PatternCard({
  pattern,
  state,
  hotkey,
  activeIdx,
  onClick,
  disabled,
}: {
  pattern: RhythmPattern;
  state: "idle" | "selected" | "correct" | "wrong";
  hotkey: string;
  activeIdx: number | null;
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls =
    state === "correct"
      ? "bg-emerald-500/15 border-emerald-400/60 ring-2 ring-emerald-400/40"
      : state === "wrong"
        ? "bg-rose-500/15 border-rose-400/60 ring-2 ring-rose-400/40"
        : state === "selected"
          ? "bg-white/12 border-zinc-200/60 ring-2 ring-white/25"
          : "bg-white/3 border-white/10 hover:bg-white/5";

  // 把 16 个 1/16 分成 4 组（每拍）
  const beats: number[][] = [];
  for (let b = 0; b < 4; b++) {
    beats.push(pattern.onsets.slice(b * 4, b * 4 + 4));
  }

  // 每个 onset 计算该 onset 在 hits 数组中的下标（用于高亮）
  let hitCounter = -1;
  const onsetIndexAt: (number | null)[] = pattern.onsets.map((v) => {
    if (v) {
      hitCounter++;
      return hitCounter;
    }
    return null;
  });

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left p-3 sm:p-4 rounded-[1.35rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition active:scale-[0.98] min-h-[88px] ${cls}`}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-xs text-white/40 uppercase tracking-wider">
          选项 {hotkey}
        </span>
        <span className="text-[10px] text-zinc-200/60 bg-zinc-950/70 border border-white/10 rounded px-1.5 py-0.5 hidden sm:inline">
          按 {hotkey}
        </span>
      </div>
      <div className="flex gap-2 justify-between">
        {beats.map((bg, bi) => (
          <div key={bi} className="flex gap-0.5 flex-1">
            {bg.map((on, i) => {
              const globalIdx = bi * 4 + i;
              const onsetNo = onsetIndexAt[globalIdx];
              const isActive = onsetNo !== null && activeIdx === onsetNo;
              return (
                <div
                  key={i}
                  className={`flex-1 h-8 sm:h-7 rounded-sm border ${
                    on
                      ? isActive
                        ? "bg-white/90 border-white"
                        : "bg-white/70 border-white/80"
                      : "bg-white/5 border-white/10"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-between mt-1.5 text-[10px] text-white/30 tabular-nums">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
      </div>
    </button>
  );
}
