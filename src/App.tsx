import { useMemo, useState } from "react";
import { FlagPicker } from "./components/FlagPicker";
import { SheetPanel } from "./components/SheetPanel";
import { flagById, flags } from "./data/flags";
import {
  defaultFlagSize,
  defaultSheetFormat,
  sheetFormats,
} from "./data/sheet";
import type { Region } from "./types/flag";

export function App() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region | "alle">("alle");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formatId, setFormatId] = useState(defaultSheetFormat.id);

  const format =
    sheetFormats.find((item) => item.id === formatId) ?? defaultSheetFormat;

  const visibleFlags = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return flags.filter((flag) => {
      if (region !== "alle" && flag.region !== region) return false;
      if (!needle) return true;
      return (
        flag.hemLabel.toLowerCase().includes(needle) ||
        flag.iso.toLowerCase().includes(needle) ||
        flag.labels.some((label) => label.toLowerCase().includes(needle)) ||
        flag.region.toLowerCase().includes(needle)
      );
    });
  }, [query, region]);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function remove(id: string) {
    setSelectedIds((current) => current.filter((item) => item !== id));
  }

  return (
    <div className="page">
      <header className="mast">
        <p className="eyebrow">Gæsteflag til print</p>
        <h1>Courtesy Flag Pack</h1>
        <p className="lede">
          Vælg de lande, der skal med på arket. Hvert flag har fast metadata,
          så navn, mål og fil kan bruges, når PDF’en skal tegnes.
        </p>
      </header>

      <div className="workspace">
        <FlagPicker
          flags={visibleFlags}
          selectedIds={selectedIds}
          query={query}
          region={region}
          onQuery={setQuery}
          onRegion={setRegion}
          onToggle={toggle}
        />
        <SheetPanel
          selectedIds={selectedIds.filter((id) => flagById(id))}
          format={format}
          formats={sheetFormats}
          size={defaultFlagSize}
          onFormat={setFormatId}
          onRemove={remove}
          onClear={() => setSelectedIds([])}
        />
      </div>
    </div>
  );
}
