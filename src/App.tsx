import { useMemo, useState } from "react";
import { FlagPicker } from "./components/FlagPicker";
import { SheetDownload, SheetPanel } from "./components/SheetPanel";
import { flagById, flags } from "./data/flags";
import { defaultFlagsPerRow, flagsPerRowOptions } from "./data/sheet";
import { filterFlags } from "./lib/catalog";
import type { FlagProportion } from "./lib/flagSize";
import { removeSelection, toggleSelection } from "./lib/selection";
import type { FlagKind, Region } from "./types/flag";

export function App() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region | "all">("all");
  const [kind, setKind] = useState<FlagKind | "all">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [columns, setColumns] = useState(defaultFlagsPerRow);
  const [proportion, setProportion] = useState<FlagProportion>("original");

  const visibleFlags = useMemo(
    () => filterFlags(flags, query, region, kind),
    [query, region, kind],
  );
  const sheetRows = Math.max(1, Math.ceil(selectedIds.length / columns));

  function toggle(id: string) {
    setSelectedIds((current) =>
      toggleSelection(
        current,
        id,
        columns,
        Math.ceil((current.length + 1) / columns),
      ),
    );
  }

  function remove(id: string) {
    setSelectedIds((current) => removeSelection(current, id));
  }

  return (
    <div className="page">
      <header className="mast">
        <h1>Courtesy flags for print</h1>
        <p className="lede">
          Choose the countries for the sheet and download a PDF ready to be
          printed.
        </p>
      </header>

      <div className="workspace">
        <FlagPicker
          flags={visibleFlags}
          selectedIds={selectedIds}
          query={query}
          region={region}
          kind={kind}
          onQuery={setQuery}
          onRegion={setRegion}
          onKind={setKind}
          onToggle={toggle}
        />
        <SheetPanel
          selectedIds={selectedIds.filter((id) => flagById(id))}
          columns={columns}
          perRowOptions={flagsPerRowOptions}
          onColumns={setColumns}
          proportion={proportion}
          onProportion={setProportion}
          onRemove={remove}
          onClear={() => setSelectedIds([])}
        />
      </div>

      <SheetDownload
        selectedIds={selectedIds.filter((id) => flagById(id))}
        columns={columns}
        rows={sheetRows}
        proportion={proportion}
      />
    </div>
  );
}
