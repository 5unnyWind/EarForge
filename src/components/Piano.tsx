import { midiToName } from "../lib/music";

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

function isWhite(midi: number) {
  return !BLACK_PCS.has(midi % 12);
}

/** 一个简易的钢琴键盘，支持点击 / 高亮 / 标记 */
export function Piano({
  lowMidi = 48, // C3
  highMidi = 84, // C6
  activeMidi,
  markedMidis = {},
  showLabels = "c-only",
  onPress,
  disabled,
}: {
  lowMidi?: number;
  highMidi?: number;
  /** 当前播放/触发的 MIDI 音 */
  activeMidi?: number | null;
  /** 标记某些音的颜色：{60: "correct", 62: "wrong", 65: "user"} */
  markedMidis?: Record<number, "correct" | "wrong" | "user" | "missed">;
  /** 哪些键显示音名：'all' / 'c-only' / 'none' */
  showLabels?: "all" | "c-only" | "none";
  onPress?: (midi: number) => void;
  disabled?: boolean;
}) {
  const whites: number[] = [];
  const blacks: number[] = [];
  for (let m = lowMidi; m <= highMidi; m++) {
    if (isWhite(m)) whites.push(m);
    else blacks.push(m);
  }

  const whiteCount = whites.length;
  const whiteWidthPct = 100 / whiteCount;

  function whiteIndexBefore(blackMidi: number): number {
    // 黑键左侧白键的索引
    const leftWhite = blackMidi - 1;
    return whites.indexOf(leftWhite);
  }

  // 移动端最小白键宽，让窄屏不至于按不准；超出则横向滚动
  const minWhiteKeyPx = 36;
  const minTotalWidth = whiteCount * minWhiteKeyPx;

  return (
    <div className="w-full overflow-x-auto no-scrollbar -mx-1 px-1">
      <div
        className={`relative select-none ${disabled ? "opacity-60" : ""}`}
        style={{
          minWidth: `${minTotalWidth}px`,
          aspectRatio: `${whiteCount * 0.18}`,
          touchAction: "manipulation",
        }}
      >
        {/* 白键层 */}
        <div className="absolute inset-0 flex">
          {whites.map((m) => {
            const mark = markedMidis[m];
            const active = activeMidi === m;
            const showName =
              showLabels === "all" ||
              (showLabels === "c-only" && m % 12 === 0);
            return (
              <button
                key={m}
                onClick={() => !disabled && onPress?.(m)}
                disabled={disabled}
                style={{ touchAction: "manipulation" }}
                className={`flex-1 border border-zinc-700 rounded-b-md flex items-end justify-center pb-1.5 text-[10px] font-semibold transition relative shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]
                  ${active ? "bg-zinc-200 text-zinc-950 ring-2 ring-white/70 z-10" : "bg-linear-to-b from-white to-zinc-300 text-zinc-700 hover:from-white hover:to-zinc-200 active:to-zinc-400"}
                  ${mark === "correct" ? "bg-emerald-200!" : ""}
                  ${mark === "wrong" ? "bg-rose-200!" : ""}
                  ${mark === "missed" ? "bg-zinc-200!" : ""}
                  ${mark === "user" ? "bg-slate-300!" : ""}
                `}
              >
                {showName ? midiToName(m) : ""}
              </button>
            );
          })}
        </div>

        {/* 黑键层 */}
        <div className="absolute inset-0 pointer-events-none">
          {blacks.map((m) => {
            const idx = whiteIndexBefore(m);
            if (idx < 0) return null;
            const centerPct = (idx + 1) * whiteWidthPct;
            const blackWidthPct = whiteWidthPct * 0.6;
            const leftPct = centerPct - blackWidthPct / 2;
            const mark = markedMidis[m];
            const active = activeMidi === m;
            return (
              <button
                key={m}
                onClick={() => !disabled && onPress?.(m)}
                disabled={disabled}
                className={`absolute top-0 h-[62%] rounded-b-sm border border-black z-10 pointer-events-auto transition shadow-[inset_0_-1px_0_rgba(255,255,255,0.14)]
                  ${active ? "bg-zinc-300 ring-2 ring-white/70" : "bg-linear-to-b from-zinc-700 to-zinc-950 hover:from-zinc-600 active:to-black"}
                  ${mark === "correct" ? "bg-emerald-500!" : ""}
                  ${mark === "wrong" ? "bg-rose-500!" : ""}
                  ${mark === "missed" ? "bg-zinc-500!" : ""}
                  ${mark === "user" ? "bg-slate-500!" : ""}
                `}
                style={{
                  left: `${leftPct}%`,
                  width: `${blackWidthPct}%`,
                  touchAction: "manipulation",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
