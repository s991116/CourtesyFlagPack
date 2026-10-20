import { useState } from "react";
import { flagById } from "../data/flags";
import { flagImageStyle, slotFlagStyle } from "../lib/flagSize";
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
  const countLabel =
    selectedIds.length === 0
      ? "No flags selected"
      : selectedIds.length === 1
        ? "1 flag selected"
        : `${selectedIds.length} flags selected`;

  return (
    <aside className="sheet" aria-label="Selected sheet">
      <header className="sheet-head">
        <h2>Sheet</h2>
        <p>{countLabel}</p>
      </header>

      <dl className="sheet-facts">
        <div>
          <dt>Flag size</dt>
          <dd>{size.label}</dd>
        </div>
        <div>
          <dt>Slots</dt>
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
          Click flags in the order they should appear on the sheet.
        </p>
      ) : (
        <>
          <div className="preview-bar">
            <span>
              Page {safePage + 1} of {pages.length}
            </span>
            {pages.length > 1 ? (
              <span className="preview-nav">
                <button
                  type="button"
                  onClick={() => setPageIndex(Math.max(safePage - 1, 0))}
                  disabled={safePage === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPageIndex(Math.min(safePage + 1, pages.length - 1))
                  }
                  disabled={safePage === pages.length - 1}
                >
                  Next
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
                  <span className="slot-name" title={flag?.hemLabel}>
                    {flag?.hemLabel}
                  </span>
                  <span className="slot-flag" style={slotFlagStyle()}>
                    {flag ? (
                      <span className="flag-image" style={flagImageStyle(flag)}>
                        <img src={flag.asset.svg} alt="" />
                      </span>
                    ) : (
                      <span className="slot-empty">Empty</span>
                    )}
                  </span>
                  {flag ? (
                    <button
                      type="button"
                      className="slot-remove"
                      aria-label={`Remove ${flag.hemLabel}`}
                      onClick={() => onRemove(flag.id)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 7h16M9.5 7V4.5h5V7M7.5 7l.8 12.5h7.4L16.5 7M10 11v5M14 11v5"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="slot-remove-spacer" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" className="clear" onClick={onClear}>
            Clear selection
          </button>
        </>
      )}

      <p className="sheet-note">
        A print-size PDF will be built from this selection. The name from the
        metadata is printed along the edge
        {selectedIds[0] ? (
          <>
            , for example{" "}
            <span className="hem-sample">
              {flagById(selectedIds[0])?.hemLabel}
            </span>
          </>
        ) : null}
        .
      </p>
    </aside>
  );
}
