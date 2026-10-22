import { flagKindLabel } from "../lib/catalog";
import { flagImageStyle } from "../lib/flagSize";
import type { Flag, FlagKind, Region } from "../types/flag";
import { flagKinds, regions } from "../types/flag";

type FlagPickerProps = {
  flags: readonly Flag[];
  selectedIds: readonly string[];
  query: string;
  region: Region | "all";
  kind: FlagKind | "all";
  sheetFull: boolean;
  onQuery: (value: string) => void;
  onRegion: (region: Region | "all") => void;
  onKind: (kind: FlagKind | "all") => void;
  onToggle: (id: string) => void;
};

export function FlagPicker({
  flags,
  selectedIds,
  query,
  region,
  kind,
  sheetFull,
  onQuery,
  onRegion,
  onKind,
  onToggle,
}: FlagPickerProps) {
  const order = new Map(selectedIds.map((id, index) => [id, index + 1]));

  return (
    <section className="picker" aria-label="Flag catalog">
      <div className="picker-tools">
        <label className="search">
          <span className="search-label">Search</span>
          <input
            type="search"
            value={query}
            placeholder="Country, code, or optional"
            onChange={(event) => onQuery(event.target.value)}
          />
        </label>
        <div className="regions" role="group" aria-label="Sailing area">
          <button
            type="button"
            className={region === "all" ? "chip is-on" : "chip"}
            aria-pressed={region === "all"}
            onClick={() => onRegion("all")}
          >
            All
          </button>
          {regions.map((item) => (
            <button
              key={item}
              type="button"
              className={region === item ? "chip is-on" : "chip"}
              aria-pressed={region === item}
              onClick={() => onRegion(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="regions" role="group" aria-label="Flag kind">
          <button
            type="button"
            className={kind === "all" ? "chip is-on" : "chip"}
            aria-pressed={kind === "all"}
            onClick={() => onKind("all")}
          >
            All kinds
          </button>
          {flagKinds.map((item) => (
            <button
              key={item}
              type="button"
              className={kind === item ? "chip is-on" : "chip"}
              aria-pressed={kind === item}
              onClick={() => onKind(item)}
            >
              {flagKindLabel(item)}
            </button>
          ))}
        </div>
      </div>

      <p className="result-count">
        {flags.length === 1 ? "1 flag" : `${flags.length} flags`}
      </p>

      {flags.length === 0 ? (
        <p className="empty-filter">No flags match the search.</p>
      ) : (
        <ul className="flag-grid">
          {flags.map((flag) => {
            const selected = order.has(flag.id);
            const position = order.get(flag.id);
            const locked = sheetFull && !selected;
            return (
              <li key={flag.id}>
                <button
                  type="button"
                  className={selected ? "flag-card is-selected" : "flag-card"}
                  aria-pressed={selected}
                  disabled={locked}
                  onClick={() => onToggle(flag.id)}
                >
                  <span className="flag-art">
                    <span className="flag-image" style={flagImageStyle(flag)}>
                      <img src={flag.asset.svg} alt="" />
                      {position ? (
                        <span className="order-badge">{position}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="flag-name" title={flag.hemLabel}>
                    {flag.hemLabel}
                  </span>
                  <span
                    className={
                      flag.kind === "regional" ? "flag-kind is-regional" : "flag-kind"
                    }
                  >
                    {flagKindLabel(flag.kind)}
                  </span>
                  <span className="flag-meta">
                    {flag.iso.toUpperCase()} · {flag.ratio.height}:
                    {flag.ratio.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
