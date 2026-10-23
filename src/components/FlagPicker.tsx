import { flagKindLabel } from "../lib/catalog";
import { catalogStageStyle } from "../lib/flagSize";
import type { Flag, FlagKind, Region } from "../types/flag";
import { flagKinds, regions } from "../types/flag";
import { FlagArtwork } from "./FlagArtwork";

type FlagPickerProps = {
  flags: readonly Flag[];
  selectedIds: readonly string[];
  query: string;
  region: Region | "all";
  kind: FlagKind | "all";
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

      {flags.length === 0 ? (
        <p className="empty-filter">No flags match the search.</p>
      ) : (
        <ul className="flag-grid">
          {flags.map((flag) => {
            const selected = order.has(flag.id);
            const position = order.get(flag.id);
            return (
              <li key={flag.id}>
                <button
                  type="button"
                  className={selected ? "flag-card is-selected" : "flag-card"}
                  aria-pressed={selected}
                  onClick={() => onToggle(flag.id)}
                >
                  <span className="flag-art" style={catalogStageStyle()}>
                    <FlagArtwork flag={flag} fit="catalog" />
                  </span>
                  <span className="flag-copy">
                    <span className="flag-name" title={flag.hemLabel}>
                      {flag.hemLabel}
                    </span>
                    <span
                      className={
                        flag.kind === "regional"
                          ? "flag-kind is-regional"
                          : "flag-kind"
                      }
                    >
                      {flag.kind === "regional" ? "Regional" : "National"} -{" "}
                      {flag.iso.toUpperCase()}
                    </span>
                  </span>
                  {position ? (
                    <span className="order-badge">{position}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
