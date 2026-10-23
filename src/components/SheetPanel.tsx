import { useState } from "react";
import { flagById } from "../data/flags";
import { trackDownloadPdf } from "../lib/analytics";
import { slotFlagStyle, type FlagProportion } from "../lib/flagSize";
import { FlagArtwork } from "./FlagArtwork";

type SheetPanelProps = {
  selectedIds: readonly string[];
  columns: number;
  perRowOptions: readonly number[];
  onColumns: (columns: number) => void;
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

export function SheetPanel({
  selectedIds,
  columns,
  perRowOptions,
  onColumns,
  proportion,
  onProportion,
  onRemove,
  onClear,
}: SheetPanelProps) {
  const flags = selectedIds.flatMap((id) => {
    const flag = flagById(id);
    return flag ? [flag] : [];
  });

  return (
    <aside className="sheet" aria-label="Selected sheet">
      <header className="sheet-head">
        <div className="sheet-title-row">
          <h2>Flags selected</h2>
          <div className="sheet-controls">
            <label className="sheet-select">
              Flags per row
              <select
                value={columns}
                onChange={(event) => onColumns(Number(event.target.value))}
              >
                {perRowOptions.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <label className="sheet-select">
              <select
                aria-label="Flag shape"
                value={proportion}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "original" || value === "fixed") {
                    onProportion(value);
                  }
                }}
              >
                <option value="original">Original ratio</option>
                <option value="fixed">40 × 30 cm</option>
              </select>
            </label>
          </div>
        </div>
      </header>

      {flags.length === 0 ? (
        <p className="sheet-empty">
          Click flags in the order they should appear on the sheet.
        </p>
      ) : (
        <>
          <ol
            className="preview"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {flags.map((flag) => (
              <li key={flag.id} className="slot">
                <span className="slot-flag" style={slotFlagStyle()}>
                  <FlagArtwork flag={flag} proportion={proportion} />
                </span>
                <span className="slot-foot">
                  <span className="slot-name" title={flag.hemLabel}>
                    {flag.hemLabel}
                  </span>
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
                </span>
              </li>
            ))}
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
      trackDownloadPdf();
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
