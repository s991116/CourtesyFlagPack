import { useMemo, useState } from "react";
import { FlagPicker } from "./components/FlagPicker";
import { SheetDownload, SheetPanel, SheetSetup } from "./components/SheetPanel";
import { flagById, flags } from "./data/flags";
import {
  defaultFlagSize,
  defaultSheetFormat,
  sheetFormats,
} from "./data/sheet";
import { filterFlags } from "./lib/catalog";
import type { FlagProportion } from "./lib/flagSize";
import { sheetCapacity } from "./lib/layout";
import {
  isSheetFull,
  removeSelection,
  toggleSelection,
  trimSelection,
} from "./lib/selection";
import type { Region } from "./types/flag";

export function App() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region | "all">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formatId, setFormatId] = useState(defaultSheetFormat.id);
  const [proportion, setProportion] = useState<FlagProportion>("original");

  const format =
    sheetFormats.find((item) => item.id === formatId) ?? defaultSheetFormat;
  const capacity = sheetCapacity(format.columns, format.rows);
  const sheetFull = isSheetFull(selectedIds.length, capacity);

  const visibleFlags = useMemo(
    () => filterFlags(flags, query, region),
    [query, region],
  );

  function toggle(id: string) {
    setSelectedIds((current) =>
      toggleSelection(current, id, format.columns, format.rows),
    );
  }

  function chooseFormat(id: string) {
    const next = sheetFormats.find((item) => item.id === id) ?? format;
    setFormatId(next.id);
    setSelectedIds((current) =>
      trimSelection(current, next.columns, next.rows),
    );
  }

  function remove(id: string) {
    setSelectedIds((current) => removeSelection(current, id));
  }

  return (
    <div className="page">
      <header className="mast">
        <p className="eyebrow">Courtesy flags for print</p>
        <h1>Courtesy Flag Pack</h1>
        <p className="lede">
          Choose the countries for the sheet and download a PDF ready to be
          printed.
        </p>
      </header>

      <SheetSetup
        format={format}
        formats={sheetFormats}
        size={defaultFlagSize}
        onFormat={chooseFormat}
      />

      <div className="workspace">
        <FlagPicker
          flags={visibleFlags}
          selectedIds={selectedIds}
          query={query}
          region={region}
          sheetFull={sheetFull}
          onQuery={setQuery}
          onRegion={setRegion}
          onToggle={toggle}
        />
        <SheetPanel
          selectedIds={selectedIds.filter((id) => flagById(id))}
          format={format}
          proportion={proportion}
          onProportion={setProportion}
          onRemove={remove}
          onClear={() => setSelectedIds([])}
        />
      </div>

      <SheetDownload
        selectedIds={selectedIds.filter((id) => flagById(id))}
        columns={format.columns}
        rows={format.rows}
        proportion={proportion}
      />
    </div>
  );
}
