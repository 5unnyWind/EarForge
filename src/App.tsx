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
    <div className="min-h-screen flex flex-col items-center px-3 sm:px-4 py-4 sm:py-10">
      <div className="w-full max-w-3xl flex flex-col gap-4 sm:gap-6">
        <Header />
        <ModuleNav active={active} onChange={setActive} />
        <main>
          <Current />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          视唱练耳
        </h1>
        <p className="text-xs sm:text-sm text-white/50 mt-0.5">
          Sight Singing & Ear Training Playground
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
      className="flex gap-1.5 rounded-2xl bg-white/[0.04] border border-white/10 p-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory"
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
            className={`shrink-0 snap-start px-3 py-2 min-h-[40px] rounded-lg text-sm whitespace-nowrap transition flex items-center gap-1.5 active:scale-[0.97] ${
              isActive
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                : "text-white/70 hover:bg-white/10"
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
    <footer className="text-center text-xs text-white/30 pt-4 pb-2">
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
