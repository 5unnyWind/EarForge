import type { SVGProps } from "react";

/** 统一图标基础属性 */
type IconProps = Omit<SVGProps<SVGSVGElement>, "strokeWidth"> & {
  size?: number | string;
  strokeWidth?: number;
};

function Svg({
  size = "1em",
  className,
  children,
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---------------- 通用动作 ---------------- */

/** 重听 / 循环 (替代 🔁) */
export function ReplayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </Svg>
  );
}

/** 慢放 / 龟速 (替代 🐢)。用一个简化的乌龟轮廓 */
export function TurtleIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.6}>
      {/* 龟壳 */}
      <path d="M4 14a8 4 0 0 1 16 0" />
      <path d="M4 14a8 4 0 0 0 16 0" />
      {/* 头 */}
      <path d="M20 13c1.1 0 2-.9 2-2s-.9-2-2-2" />
      {/* 四肢 */}
      <path d="M6 17l-1.2 2" />
      <path d="M18 17l1.2 2" />
      <path d="M9 18l-.5 2" />
      <path d="M15 18l.5 2" />
      {/* 龟壳花纹 */}
      <path d="M9 12v2" />
      <path d="M12 11v3" />
      <path d="M15 12v2" />
    </Svg>
  );
}

/** 耳机 (替代 🎧) */
export function HeadphonesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 14a9 9 0 0 1 18 0" />
      <path d="M3 14v3a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H3z" />
      <path d="M21 14v3a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3z" />
    </Svg>
  );
}

/** 播放中的音符 (替代 🎵) */
export function MusicNoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18V5l12-2v13" />
      <ellipse cx="6" cy="18" rx="3" ry="2.5" fill="currentColor" stroke="none" />
      <ellipse cx="18" cy="16" rx="3" ry="2.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/* ---------------- 方向 / 状态 ---------------- */

export function ArrowUpIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.4}>
      <path d="M12 5v14" />
      <path d="M5 12l7-7 7 7" />
    </Svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.4}>
      <path d="M12 5v14" />
      <path d="M5 12l7 7 7-7" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.4}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.6}>
      <path d="M4 12l5 5L20 6" />
    </Svg>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.6}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Svg>
  );
}

/* ---------------- 模块图标 ---------------- */

/** 上下行：折线 */
export function ContourIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2}>
      <polyline points="3 18 8 8 13 14 18 5 21 11" />
    </Svg>
  );
}

/** 音程：两个相距的音符 */
export function IntervalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="9" y1="15" x2="15" y2="9" />
      <circle cx="6" cy="17" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="7" r="2.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** 和弦：三个堆叠的音符头 */
export function ChordIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="9" cy="6" rx="3" ry="2.2" fill="currentColor" stroke="none" />
      <ellipse cx="9" cy="12" rx="3" ry="2.2" fill="currentColor" stroke="none" />
      <ellipse cx="9" cy="18" rx="3" ry="2.2" fill="currentColor" stroke="none" />
      <line x1="12" y1="5" x2="12" y2="19" />
    </Svg>
  );
}

/** 音阶：阶梯式上升的点 */
export function ScaleIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2}>
      <path d="M3 19h4v-4h4v-4h4v-4h6" />
    </Svg>
  );
}

/** 节奏：四分音符 */
export function RhythmIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="14" y1="4" x2="14" y2="17" />
      <ellipse
        cx="10"
        cy="17"
        rx="4"
        ry="3"
        fill="currentColor"
        stroke="none"
        transform="rotate(-20 10 17)"
      />
    </Svg>
  );
}

/** 旋律：两个连音符 (♬) */
export function MelodyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="9" y1="6" x2="9" y2="18" />
      <line x1="19" y1="4" x2="19" y2="16" />
      <path d="M9 6 L19 4" />
      <path d="M9 9 L19 7" />
      <ellipse
        cx="6"
        cy="18"
        rx="3"
        ry="2.3"
        fill="currentColor"
        stroke="none"
        transform="rotate(-15 6 18)"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="3"
        ry="2.3"
        fill="currentColor"
        stroke="none"
        transform="rotate(-15 16 16)"
      />
    </Svg>
  );
}
