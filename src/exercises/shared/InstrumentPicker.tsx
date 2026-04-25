import { INSTRUMENTS } from "../../audio/instruments";
import { Field, Toggle } from "../../components/ui";

export function InstrumentPicker({
  random,
  setRandom,
  fixedId,
  setFixedId,
}: {
  random: boolean;
  setRandom: (v: boolean) => void;
  fixedId: string;
  setFixedId: (v: string) => void;
}) {
  return (
    <Field label="乐器">
      <div className="flex flex-col gap-2">
        <Toggle
          label={random ? "每轮随机" : "固定一种"}
          checked={random}
          onChange={setRandom}
        />
        {!random && (
          <select
            value={fixedId}
            onChange={(e) => setFixedId(e.target.value)}
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
  );
}
