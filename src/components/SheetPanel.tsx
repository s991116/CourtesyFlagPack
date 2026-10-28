import { useRef, useState } from "react";
import { printLayout } from "../config/print";
import { flagById } from "../data/flags";
import {
  flagClothById,
  flagCloths,
  type FlagClothId,
} from "../data/sheet";
import { trackDownloadPdf } from "../lib/analytics";
import {
  formatFlagSelection,
  parseFlagSelection,
  selectionFileName,
  type FlagSelectionFile,
} from "../lib/flagSelectionFile";
import { printAreaLabel } from "../lib/printArea";
import { previewGridStyle, slotFlagStyle, type FlagFit } from "../lib/flagSize";
import { buildSheetGeometry } from "../lib/sheetGeometry";
import { FlagArtwork } from "./FlagArtwork";

type SheetPanelProps = {
  selectedIds: readonly string[];
  columns: number;
  perRowOptions: readonly number[];
  onColumns: (columns: number) => void;
  clothId: FlagClothId;
  onCloth: (clothId: FlagClothId) => void;
  fit: FlagFit;
  onFit: (fit: FlagFit) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

type SheetDownloadProps = {
  selectedIds: readonly string[];
  columns: number;
  rows: number;
  clothId: FlagClothId;
  fit: FlagFit;
  onLoad: (selection: FlagSelectionFile) => void;
};

export function SheetPanel({
  selectedIds,
  columns,
  perRowOptions,
  onColumns,
  clothId,
  onCloth,
  fit,
  onFit,
  onRemove,
  onClear,
}: SheetPanelProps) {
  const flags = selectedIds.flatMap((id) => {
    const flag = flagById(id);
    return flag ? [flag] : [];
  });
  const cloth = flagClothById(clothId);
  const rows = Math.max(1, Math.ceil(flags.length / columns));
  const sheet = buildSheetGeometry(flags, columns, rows, printLayout, cloth, fit);
  const printArea = printAreaLabel(sheet.pageWidthMm, sheet.pageHeightMm);

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
                aria-label="Print size"
                value={clothId}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "45x30" || value === "30x20") onCloth(value);
                }}
              >
                {flagCloths.map((cloth) => (
                  <option key={cloth.id} value={cloth.id}>
                    {cloth.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sheet-select">
              <select
                aria-label="Flag shape"
                value={fit}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "stretched" || value === "max") onFit(value);
                }}
              >
                <option value="stretched">Stretched</option>
                <option value="max">Original</option>
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
            style={previewGridStyle(flags, columns, cloth, fit)}
          >
            {flags.map((flag) => (
              <li key={flag.id} className="slot">
                <span className="slot-flag" style={slotFlagStyle(flag, cloth, fit)}>
                  <FlagArtwork flag={flag} cloth={cloth} printFit={fit} />
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
          <div className="sheet-actions">
            <button type="button" className="clear" onClick={onClear}>
              Clear selection
            </button>
            <p className="print-area">{printArea}</p>
          </div>
        </>
      )}
    </aside>
  );
}

export function SheetDownload({
  selectedIds,
  columns,
  rows,
  clothId,
  fit,
  onLoad,
}: SheetDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function download() {
    const selected = selectedIds.flatMap((id) => {
      const flag = flagById(id);
      return flag ? [flag] : [];
    });
    setDownloading(true);
    setDownloadError("");
    try {
      const { downloadSheetPdf } = await import("../lib/sheetPdf");
      await downloadSheetPdf(selected, columns, rows, flagClothById(clothId), fit);
      trackDownloadPdf();
    } catch {
      setDownloadError("The PDF could not be created.");
    } finally {
      setDownloading(false);
    }
  }

  function exportSelection() {
    const text = formatFlagSelection({ clothId, fit, columns, flagIds: selectedIds });
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = selectionFileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importSelection(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    try {
      const parsed = parseFlagSelection(await file.text());
      const unknown = parsed.unknown.join(", ");
      if (parsed.flagIds.length === 0 && parsed.unknown.length > 0) {
        setDownloadError(`Unknown flags: ${unknown}.`);
        return;
      }
      onLoad(parsed);
      setDownloadError(unknown ? `Unknown flags: ${unknown}.` : "");
    } catch {
      setDownloadError("The file could not be read.");
    }
  }

  return (
    <div className="sheet-footer">
      <div className="sheet-downloads">
        <button
          type="button"
          className="download"
          disabled={selectedIds.length === 0 || downloading}
          onClick={() => void download()}
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
        <button type="button" className="sheet-file" onClick={() => fileInput.current?.click()}>
          Import selection
        </button>
        <button
          type="button"
          className="sheet-file"
          disabled={selectedIds.length === 0}
          onClick={exportSelection}
        >
          Export selection
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,text/plain"
          hidden
          aria-label="Import selection"
          onChange={(event) => void importSelection(event.target.files?.[0])}
        />
      </div>
      {downloadError ? <p className="download-error">{downloadError}</p> : null}
      <p className="sheet-note">
        The PDF is at print size. The country name is printed in the hem.
      </p>
    </div>
  );
}
