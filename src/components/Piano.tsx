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
                className={`flex-1 border border-neutral-700 rounded-b-md flex items-end justify-center pb-1.5 text-[10px] font-semibold transition relative
                  ${active ? "bg-amber-300 text-amber-900" : "bg-white text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200"}
                  ${mark === "correct" ? "!bg-emerald-300" : ""}
                  ${mark === "wrong" ? "!bg-rose-300" : ""}
                  ${mark === "missed" ? "!bg-amber-200" : ""}
                  ${mark === "user" ? "!bg-indigo-200" : ""}
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
                className={`absolute top-0 h-[62%] rounded-b-sm border border-neutral-900 z-10 pointer-events-auto transition
                  ${active ? "bg-amber-400" : "bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900"}
                  ${mark === "correct" ? "!bg-emerald-500" : ""}
                  ${mark === "wrong" ? "!bg-rose-500" : ""}
                  ${mark === "missed" ? "!bg-amber-500" : ""}
                  ${mark === "user" ? "!bg-indigo-500" : ""}
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
