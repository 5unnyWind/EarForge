import { useCallback, useMemo, useRef, useState } from "react";
import {
  generateMelody,
  melodyToDirections,
  midiToName,
  whiteKeysInRange,
  type Direction,
} from "./lib/music";
import {
  INSTRUMENTS,
  pickRandomInstrument,
  type InstrumentDef,
} from "./audio/instruments";
import {
  ensureAudioReady,
  loadInstrument,
  playMelody,
  playSingleNote,
} from "./audio/player";

type Phase = "idle" | "loading" | "answering" | "revealed";

type Stats = {
  rounds: number;
  noteCorrect: number; // 总判断对的箭头数
  noteTotal: number; // 总判断箭头数
  perfectRounds: number; // 全对的轮数
};

const LENGTH_OPTIONS = [3, 4, 5] as const;
const RANGE_OPTIONS: { id: string; label: string; low: number; high: number }[] = [
  { id: "narrow", label: "窄 (C4–C5)", low: 60, high: 72 },
  { id: "normal", label: "中 (G3–G5)", low: 55, high: 79 },
  { id: "wide", label: "宽 (C3–C6)", low: 48, high: 84 },
];
const SPEED_OPTIONS: { id: string; label: string; interval: number }[] = [
  { id: "slow", label: "慢", interval: 1.0 },
  { id: "normal", label: "中", interval: 0.7 },
  { id: "fast", label: "快", interval: 0.45 },
];

export default function App() {
  // 设置
  const [length, setLength] = useState<number>(4);
  const [rangeId, setRangeId] = useState<string>("narrow");
  const [speedId, setSpeedId] = useState<string>("normal");
  const [chromatic, setChromatic] = useState(false); // 是否包含黑键
  const [randomInstrument, setRandomInstrument] = useState(true);
  const [fixedInstrumentId, setFixedInstrumentId] = useState<string>("piano");
  const [debugMode, setDebugMode] = useState(false); // 显示当前播放音名（练习时也显示）

  // 题目状态
  const [phase, setPhase] = useState<Phase>("idle");
  const [instrument, setInstrument] = useState<InstrumentDef | null>(null);
  const [melody, setMelody] = useState<number[]>([]);
  const [answer, setAnswer] = useState<(Direction | null)[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    rounds: 0,
    noteCorrect: 0,
    noteTotal: 0,
    perfectRounds: 0,
  });

  const lastInstrumentIdRef = useRef<string | undefined>(undefined);

  const range = useMemo(
    () => RANGE_OPTIONS.find((r) => r.id === rangeId)!,
    [rangeId],
  );
  const speed = useMemo(
    () => SPEED_OPTIONS.find((s) => s.id === speedId)!,
    [speedId],
  );
  const truth = useMemo(() => melodyToDirections(melody), [melody]);

  const startRound = useCallback(async () => {
    setError(null);
    try {
      await ensureAudioReady();

      const inst = randomInstrument
        ? pickRandomInstrument(lastInstrumentIdRef.current)
        : INSTRUMENTS.find((i) => i.id === fixedInstrumentId) ?? INSTRUMENTS[0];
      lastInstrumentIdRef.current = inst.id;
      setInstrument(inst);
      setPhase("loading");

      const sampler = await loadInstrument(inst);

      // 生成音池
      let pool = whiteKeysInRange(range.low, range.high);
      if (chromatic) {
        pool = [];
        for (let m = range.low; m <= range.high; m++) pool.push(m);
      }
      const notes = generateMelody(pool, length);
      setMelody(notes);
      setAnswer(new Array(length - 1).fill(null));
      setPhase("answering");

      setIsPlaying(true);
      setPlayingIndex(null);
      await playMelody(sampler, notes, {
        noteInterval: speed.interval,
        noteDuration: Math.min(speed.interval * 0.85, 0.7),
        onNoteStart: (i) => setPlayingIndex(i),
      });
      setPlayingIndex(null);
      setIsPlaying(false);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }, [chromatic, fixedInstrumentId, length, randomInstrument, range, speed.interval]);

  const replay = useCallback(async () => {
    if (!instrument || isPlaying) return;
    try {
      const sampler = await loadInstrument(instrument);
      setIsPlaying(true);
      setPlayingIndex(null);
      await playMelody(sampler, melody, {
        noteInterval: speed.interval,
        noteDuration: Math.min(speed.interval * 0.85, 0.7),
        onNoteStart: (i) => setPlayingIndex(i),
      });
      setPlayingIndex(null);
      setIsPlaying(false);
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  }, [instrument, isPlaying, melody, speed.interval]);

  const replayReveal = useCallback(async () => {
    if (!instrument || isPlaying) return;
    const sampler = await loadInstrument(instrument);
    setIsPlaying(true);
    setPlayingIndex(null);
    await playMelody(sampler, melody, {
      noteInterval: Math.max(speed.interval, 0.9),
      noteDuration: 0.8,
      onNoteStart: (i) => setPlayingIndex(i),
    });
    setPlayingIndex(null);
    setIsPlaying(false);
  }, [instrument, isPlaying, melody, speed.interval]);

  const playOne = useCallback(
    async (i: number) => {
      if (!instrument || isPlaying) return;
      try {
        const sampler = await loadInstrument(instrument);
        setIsPlaying(true);
        setPlayingIndex(i);
        await playSingleNote(sampler, melody[i], 1.0);
        setPlayingIndex(null);
        setIsPlaying(false);
      } catch (e) {
        console.error(e);
        setIsPlaying(false);
      }
    },
    [instrument, isPlaying, melody],
  );

  const setAnswerAt = (idx: number, dir: Direction) => {
    if (phase !== "answering") return;
    setAnswer((prev) => {
      const next = [...prev];
      next[idx] = dir;
      return next;
    });
  };

  const allFilled = answer.every((a) => a !== null);

  const submit = () => {
    if (!allFilled) return;
    const correctCount = answer.reduce(
      (acc, a, i) => acc + (a === truth[i] ? 1 : 0),
      0,
    );
    setStats((s) => ({
      rounds: s.rounds + 1,
      noteCorrect: s.noteCorrect + correctCount,
      noteTotal: s.noteTotal + truth.length,
      perfectRounds: s.perfectRounds + (correctCount === truth.length ? 1 : 0),
    }));
    setPhase("revealed");
  };

  const accuracy = stats.noteTotal === 0 ? 0 : (stats.noteCorrect / stats.noteTotal) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      <header className="w-full max-w-2xl flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">视唱练耳 · 上下行</h1>
          <p className="text-sm text-white/60 mt-1">
            听一段旋律，判断每相邻两音是上行还是下行
          </p>
        </div>
        <StatBadge stats={stats} accuracy={accuracy} />
      </header>

      <main className="w-full max-w-2xl rounded-2xl bg-white/[0.04] backdrop-blur border border-white/10 shadow-2xl p-6 sm:p-8">
        {phase === "idle" && (
          <IdleView onStart={startRound} error={error} />
        )}

        {phase !== "idle" && (
          <ActiveView
            phase={phase}
            instrument={instrument}
            isPlaying={isPlaying}
            length={length}
            answer={answer}
            truth={truth}
            melody={melody}
            playingIndex={playingIndex}
            debugMode={debugMode}
            onReplay={replay}
            onReplayReveal={replayReveal}
            onPlayOne={playOne}
            onChooseDirection={setAnswerAt}
            allFilled={allFilled}
            onSubmit={submit}
            onNext={startRound}
          />
        )}
      </main>

      <section className="w-full max-w-2xl mt-6 rounded-2xl bg-white/[0.03] border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white/70 mb-4">设置</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
          <Field label="调试模式 (显示音名)">
            <Toggle checked={debugMode} onChange={setDebugMode} />
          </Field>
          <Field label="乐器">
            <div className="flex flex-col gap-2">
              <Toggle
                label={randomInstrument ? "每轮随机" : "固定一种"}
                checked={randomInstrument}
                onChange={setRandomInstrument}
              />
              {!randomInstrument && (
                <select
                  value={fixedInstrumentId}
                  onChange={(e) => setFixedInstrumentId(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                >
                  {INSTRUMENTS.map((i) => (
                    <option key={i.id} value={i.id} className="bg-neutral-900">
                      {i.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Field>
        </div>
        <p className="text-xs text-white/40 mt-4 leading-relaxed">
          提示：首次播放某个乐器时会从网络加载真实采样，大约 1–3 秒。所有采样来自
          <a
            className="underline ml-1"
            href="https://github.com/nbrosowsky/tonejs-instruments"
            target="_blank"
            rel="noreferrer"
          >
            tonejs-instruments
          </a>
          。
        </p>
      </section>
    </div>
  );
}

/* -------------------- 子组件 -------------------- */

function IdleView({ onStart, error }: { onStart: () => void; error: string | null }) {
  return (
    <div className="text-center py-8">
      <div className="text-5xl mb-4">🎧</div>
      <h2 className="text-xl font-semibold mb-2">准备好了吗？</h2>
      <p className="text-white/60 text-sm mb-6">
        点击开始，会随机抽一种乐器，播放几个音；你来判断每两个相邻音的方向。
      </p>
      <button
        onClick={onStart}
        className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 transition text-white font-semibold shadow-lg shadow-indigo-500/30"
      >
        开始练习
      </button>
      {error && (
        <p className="mt-4 text-sm text-red-400">出错了：{error}</p>
      )}
    </div>
  );
}

function ActiveView(props: {
  phase: Phase;
  instrument: InstrumentDef | null;
  isPlaying: boolean;
  length: number;
  answer: (Direction | null)[];
  truth: Direction[];
  melody: number[];
  playingIndex: number | null;
  debugMode: boolean;
  onReplay: () => void;
  onReplayReveal: () => void;
  onPlayOne: (i: number) => void;
  onChooseDirection: (idx: number, dir: Direction) => void;
  allFilled: boolean;
  onSubmit: () => void;
  onNext: () => void;
}) {
  const {
    phase,
    instrument,
    isPlaying,
    length,
    answer,
    truth,
    melody,
    playingIndex,
    debugMode,
    onReplay,
    onReplayReveal,
    onPlayOne,
    onChooseDirection,
    allFilled,
    onSubmit,
    onNext,
  } = props;

  const isRevealed = phase === "revealed";

  return (
    <div className="flex flex-col gap-6">
      {/* 乐器 + 播放控制 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-white/40">乐器</span>
          <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 font-medium">
            {phase === "loading" ? "加载中…" : instrument?.name ?? "—"}
          </span>
        </div>

        {!isRevealed ? (
          <button
            onClick={onReplay}
            disabled={isPlaying || phase === "loading"}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {isPlaying ? "播放中…" : "🔁 重听"}
          </button>
        ) : (
          <button
            onClick={onReplayReveal}
            disabled={isPlaying}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-sm font-medium"
          >
            {isPlaying ? "播放中…" : "🐢 慢速回放"}
          </button>
        )}
      </div>

      {/* 答题区 / 揭示区 */}
      <div className="rounded-xl bg-black/30 border border-white/10 p-5">
        {!isRevealed ? (
          <AnswerGrid
            length={length}
            answer={answer}
            playingIndex={playingIndex}
            melody={debugMode ? melody : null}
            onChooseDirection={onChooseDirection}
          />
        ) : (
          <RevealGrid
            melody={melody}
            truth={truth}
            answer={answer}
            playingIndex={playingIndex}
            onPlayOne={onPlayOne}
          />
        )}
      </div>

      {isRevealed && (
        <p className="text-xs text-white/40 text-center -mt-2">
          点击任意一个音圈可以单独试听这个音
        </p>
      )}

      {/* 提交 / 下一题 */}
      <div className="flex justify-end gap-3">
        {!isRevealed ? (
          <button
            onClick={onSubmit}
            disabled={!allFilled}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed font-semibold text-white"
          >
            提交答案
          </button>
        ) : (
          <button
            onClick={onNext}
            className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 font-semibold text-white shadow-lg shadow-indigo-500/30"
          >
            下一题 →
          </button>
        )}
      </div>
    </div>
  );
}

function AnswerGrid({
  length,
  answer,
  playingIndex,
  melody,
  onChooseDirection,
}: {
  length: number;
  answer: (Direction | null)[];
  playingIndex: number | null;
  /** 调试模式下传入 melody，则各音圈下方显示音名 */
  melody: number[] | null;
  onChooseDirection: (idx: number, dir: Direction) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <NoteDot
            index={i}
            label={melody ? midiToName(melody[i]) : undefined}
            active={playingIndex === i}
          />
          {i < length - 1 && (
            <DirectionPicker
              value={answer[i]}
              onChoose={(d) => onChooseDirection(i, d)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function RevealGrid({
  melody,
  truth,
  answer,
  playingIndex,
  onPlayOne,
}: {
  melody: number[];
  truth: Direction[];
  answer: (Direction | null)[];
  playingIndex: number | null;
  onPlayOne: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {melody.map((m, i) => (
        <div key={i} className="flex items-center gap-2">
          <NoteDot
            index={i}
            label={midiToName(m)}
            active={playingIndex === i}
            onClick={() => onPlayOne(i)}
          />
          {i < melody.length - 1 && (
            <DirectionResult
              correct={truth[i]}
              chosen={answer[i]}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function NoteDot({
  index,
  label,
  active,
  onClick,
}: {
  index: number;
  label?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <div className="flex flex-col items-center">
      <Tag
        onClick={onClick}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all ${
          active ? "scale-125 ring-4 ring-amber-300/80 shadow-amber-400/50" : ""
        } ${onClick ? "cursor-pointer hover:brightness-110 active:scale-95" : ""}`}
      >
        {index + 1}
      </Tag>
      {label && (
        <span
          className={`text-xs mt-1 tabular-nums ${
            active ? "text-amber-300 font-semibold" : "text-white/60"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function DirectionPicker({
  value,
  onChoose,
}: {
  value: Direction | null;
  onChoose: (d: Direction) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
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
  const symbol = dir === "up" ? "↑" : "↓";
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-md text-lg font-bold transition border ${
        active
          ? "bg-indigo-500/40 border-indigo-300 text-white shadow-md shadow-indigo-500/30"
          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
      }`}
    >
      {symbol}
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
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`text-2xl font-bold ${
          isRight ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {correct === "up" ? "↑" : "↓"}
      </span>
      <span className="text-[10px] text-white/40">
        {isRight ? "✓" : `你选 ${chosen === "up" ? "↑" : "↓"}`}
      </span>
    </div>
  );
}

function StatBadge({ stats, accuracy }: { stats: Stats; accuracy: number }) {
  return (
    <div className="text-right">
      <div className="text-xs text-white/50">第 {stats.rounds} 轮</div>
      <div className="text-lg font-semibold tabular-nums">
        {accuracy.toFixed(0)}%{" "}
        <span className="text-xs font-normal text-white/50">
          ({stats.noteCorrect}/{stats.noteTotal})
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-white/60 text-xs uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

function SegBar<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex bg-black/30 rounded-lg p-1 border border-white/10">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 rounded-md text-sm transition ${
            value === opt.id
              ? "bg-white/15 text-white shadow-sm"
              : "text-white/60 hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 self-start"
    >
      <span
        className={`w-10 h-6 rounded-full transition relative ${
          checked ? "bg-indigo-500" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      {label && <span className="text-sm text-white/80">{label}</span>}
    </button>
  );
}
