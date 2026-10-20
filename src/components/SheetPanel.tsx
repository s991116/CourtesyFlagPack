import { useState } from "react";
import { flagById } from "../data/flags";
import { paginateFlags } from "../lib/layout";
import type { FlagSize, SheetFormat } from "../types/flag";

type SheetPanelProps = {
  selectedIds: readonly string[];
  format: SheetFormat;
  formats: readonly SheetFormat[];
  size: FlagSize;
  onFormat: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function SheetPanel({
  selectedIds,
  format,
  formats,
  size,
  onFormat,
  onRemove,
  onClear,
}: SheetPanelProps) {
  const pages = paginateFlags(selectedIds, format.columns, format.rows);
  const [pageIndex, setPageIndex] = useState(0);
  const safePage = Math.min(pageIndex, Math.max(pages.length - 1, 0));
  const page = pages[safePage] ?? [];
  const slots = format.columns * format.rows;

  return (
    <aside className="sheet" aria-label="Valgt ark">
      <header className="sheet-head">
        <h2>Arket</h2>
        <p>
          {selectedIds.length === 0
            ? "Ingen flag valgt"
            : selectedIds.length === 1
              ? "1 flag valgt"
              : `${selectedIds.length} flag valgt`}
        </p>
      </header>

      <dl className="sheet-facts">
        <div>
          <dt>Flagmål</dt>
          <dd>{size.label}</dd>
        </div>
        <div>
          <dt>Pladser</dt>
          <dd>
            {format.columns} × {format.rows}
          </dd>
        </div>
      </dl>

      <div className="format-picker" role="group" aria-label="Format">
        {formats.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === format.id ? "format is-on" : "format"}
            aria-pressed={item.id === format.id}
            onClick={() => {
              setPageIndex(0);
              onFormat(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {selectedIds.length === 0 ? (
        <p className="sheet-empty">
          Klik flagene i den rækkefølge, de skal ligge på arket.
        </p>
      ) : (
        <>
          <div className="preview-bar">
            <span>
              Side {safePage + 1} af {pages.length}
            </span>
            {pages.length > 1 ? (
              <span className="preview-nav">
                <button
                  type="button"
                  onClick={() => setPageIndex(Math.max(safePage - 1, 0))}
                  disabled={safePage === 0}
                >
                  Forrige
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPageIndex(Math.min(safePage + 1, pages.length - 1))
                  }
                  disabled={safePage === pages.length - 1}
                >
                  Næste
                </button>
              </span>
            ) : null}
          </div>
          <ol
            className="preview"
            style={{ gridTemplateColumns: `repeat(${format.columns}, 1fr)` }}
          >
            {Array.from({ length: slots }, (_, index) => {
              const id = page[index];
              const flag = id ? flagById(id) : undefined;
              return (
                <li key={index} className={flag ? "slot" : "slot is-empty"}>
                  {flag ? (
                    <img src={flag.asset.svg} alt={flag.hemLabel} />
                  ) : (
                    <span className="slot-empty">Tom</span>
                  )}
                </li>
              );
            })}
          </ol>
          <ul className="picked">
            {selectedIds.map((id, index) => {
              const flag = flagById(id);
              if (!flag) return null;
              return (
                <li key={id}>
                  <span className="picked-index">{index + 1}</span>
                  <img src={flag.asset.svg} alt="" />
                  <span className="picked-name">{flag.hemLabel}</span>
                  <button type="button" onClick={() => onRemove(id)}>
                    Fjern
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="clear" onClick={onClear}>
            Ryd valg
          </button>
        </>
      )}

      <p className="sheet-note">
        PDF i rigtigt trykmål bygges oven på det samme valg. Langs kanten
        printes navnet fra metadata
        {selectedIds[0] ? (
          <>
            , fx <span className="hem-sample">{flagById(selectedIds[0])?.hemLabel}</span>
          </>
        ) : null}
        .
      </p>
    </aside>
  );
}
