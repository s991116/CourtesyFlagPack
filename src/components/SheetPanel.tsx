import { useEffect, useState } from "react";
import { flagById } from "../data/flags";
import { flagImageStyle, slotFlagStyle, type FlagProportion } from "../lib/flagSize";
import { paginateFlags } from "../lib/layout";
import type { FlagSize, SheetFormat } from "../types/flag";

type SheetSetupProps = {
  format: SheetFormat;
  formats: readonly SheetFormat[];
  size: FlagSize;
  onFormat: (id: string) => void;
};

type SheetPanelProps = {
  selectedIds: readonly string[];
  format: SheetFormat;
  proportion: FlagProportion;
  onProportion: (proportion: FlagProportion) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

type SheetDownloadProps = {
  selectedIds: readonly string[];
  columns: number;
  rows: number;
  proportion: FlagProportion;
};

export function SheetSetup({ format, formats, size, onFormat }: SheetSetupProps) {
  return (
    <div className="sheet-setup">
      <dl className="sheet-facts">
        <dt>Flag size</dt>
        <dt>Slots</dt>
        <dd>{size.label}</dd>
        <dd>
          <div className="format-picker" role="group" aria-label="Format">
            {formats.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === format.id ? "format is-on" : "format"}
                aria-pressed={item.id === format.id}
                onClick={() => onFormat(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </dd>
      </dl>
    </div>
  );
}

export function SheetPanel({
  selectedIds,
  format,
  proportion,
  onProportion,
  onRemove,
  onClear,
}: SheetPanelProps) {
  const pages = paginateFlags(selectedIds, format.columns, format.rows);
  const [pageIndex, setPageIndex] = useState(0);
  const safePage = Math.min(pageIndex, Math.max(pages.length - 1, 0));
  const page = pages[safePage] ?? [];
  const slots = format.columns * format.rows;

  useEffect(() => {
    setPageIndex(0);
  }, [format.id]);
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
        <div className="sheet-count-row">
          <p>{countLabel}</p>
          <fieldset className="proportion">
            <legend>Flag shape</legend>
            <label>
              <input
                type="radio"
                name="flag-proportion"
                checked={proportion === "original"}
                onChange={() => onProportion("original")}
              />
              Original ratio
            </label>
            <label>
              <input
                type="radio"
                name="flag-proportion"
                checked={proportion === "fixed"}
                onChange={() => onProportion("fixed")}
              />
              30 × 40 cm
            </label>
          </fieldset>
        </div>
      </header>

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
                      <span className="flag-image" style={flagImageStyle(flag, proportion)}>
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
    </aside>
  );
}

export function SheetDownload({
  selectedIds,
  columns,
  rows,
  proportion,
}: SheetDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  async function download() {
    const selected = selectedIds.flatMap((id) => {
      const flag = flagById(id);
      return flag ? [flag] : [];
    });
    setDownloading(true);
    setDownloadError("");
    try {
      const { downloadSheetPdf } = await import("../lib/sheetPdf");
      await downloadSheetPdf(selected, columns, rows, proportion);
    } catch {
      setDownloadError("The PDF could not be created.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="sheet-footer">
      <button
        type="button"
        className="download"
        disabled={selectedIds.length === 0 || downloading}
        onClick={() => void download()}
      >
        {downloading ? "Preparing PDF…" : "Download PDF"}
      </button>
      {downloadError ? <p className="download-error">{downloadError}</p> : null}
      <p className="sheet-note">
        The PDF is at print size. The country name is printed in the hem
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
    </div>
  );
}
