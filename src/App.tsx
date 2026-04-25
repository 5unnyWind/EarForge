import { useEffect, useMemo } from "react";
import { MODULES, type ModuleId } from "./exercises/registry";
import { usePersistedState } from "./hooks/usePersistedState";

const isValidModuleId = (id: unknown): id is ModuleId =>
  typeof id === "string" && MODULES.some((m) => m.id === id);

export default function App() {
  const [activeRaw, setActiveRaw] = usePersistedState<ModuleId>(
    "active-module",
    "contour",
  );
  const active: ModuleId = isValidModuleId(activeRaw) ? activeRaw : "contour";

  // 历史脏数据自愈：发现持久化的不是合法 module，写回默认值
  useEffect(() => {
    if (!isValidModuleId(activeRaw)) setActiveRaw("contour");
  }, [activeRaw, setActiveRaw]);

  const setActive = (id: ModuleId) => {
    if (isValidModuleId(id)) setActiveRaw(id);
  };

  const Current = useMemo(
    () => MODULES.find((m) => m.id === active)!.Component,
    [active],
  );

  return (
    <div className="relative min-h-screen flex flex-col items-center px-3 sm:px-4 py-5 sm:py-10 overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-2xl -translate-x-1/2 rounded-full bg-white/8 blur-3xl" />
      <div className="pointer-events-none absolute right-[8%] top-28 h-36 w-36 rounded-full bg-zinc-200/8 blur-2xl" />
      <div className="relative w-full max-w-4xl flex flex-col gap-4 sm:gap-6">
        <Header />
        <ModuleNav active={active} onChange={setActive} />
        <main className="rounded-4xl border border-white/10 bg-zinc-950/20 p-5 sm:p-6 shadow-[0_30px_90px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
          <Current />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-end justify-between gap-4 px-1 sm:px-2">
      <div>
        <div className="mb-2 inline-flex items-center rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-300/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          EarForge
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.04em] bg-linear-to-br from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_1px_22px_rgba(255,255,255,0.18)]">
          音感练习
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300/55 mt-1.5">
          精准、克制、可持续的视唱练耳训练
        </p>
      </div>
    </header>
  );
}

function ModuleNav({
  active,
  onChange,
}: {
  active: ModuleId;
  onChange: (id: ModuleId) => void;
}) {
  return (
    <nav
      className="flex gap-1.5 rounded-[1.35rem] bg-zinc-950/50 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),inset_0_-1px_0_rgba(0,0,0,0.35),0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl p-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory"
      aria-label="练习模块"
    >
      {MODULES.map((m) => {
        const isActive = active === m.id;
        const Icon = m.Icon;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            title={m.description}
            className={`shrink-0 snap-start px-3.5 py-2.5 min-h-[42px] rounded-2xl text-sm whitespace-nowrap transition flex items-center gap-1.5 active:scale-[0.97] ${
              isActive
                ? "bg-linear-to-br from-white via-zinc-200 to-zinc-500 text-zinc-950 shadow-[0_10px_30px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.75)]"
                : "text-zinc-300/72 hover:bg-white/9 hover:text-white"
            }`}
          >
            <Icon size={18} />
            <span>{m.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="text-center text-xs text-zinc-400/45 pt-4 pb-2">
      采样来自{" "}
      <a
        className="underline"
        href="https://github.com/nbrosowsky/tonejs-instruments"
        target="_blank"
        rel="noreferrer"
      >
        tonejs-instruments
      </a>
      ，首次使用某乐器时会从网络加载。
    </footer>
  );
}
