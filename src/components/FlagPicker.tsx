import type { Flag, Region } from "../types/flag";
import { regions } from "../types/flag";

type FlagPickerProps = {
  flags: readonly Flag[];
  selectedIds: readonly string[];
  query: string;
  region: Region | "alle";
  onQuery: (value: string) => void;
  onRegion: (region: Region | "alle") => void;
  onToggle: (id: string) => void;
};

export function FlagPicker({
  flags,
  selectedIds,
  query,
  region,
  onQuery,
  onRegion,
  onToggle,
}: FlagPickerProps) {
  const order = new Map(selectedIds.map((id, index) => [id, index + 1]));

  return (
    <section className="picker" aria-label="Flagkatalog">
      <div className="picker-tools">
        <label className="search">
          <span className="search-label">Søg</span>
          <input
            type="search"
            value={query}
            placeholder="Land eller kode"
            onChange={(event) => onQuery(event.target.value)}
          />
        </label>
        <div className="regions" role="group" aria-label="Område">
          <button
            type="button"
            className={region === "alle" ? "chip is-on" : "chip"}
            aria-pressed={region === "alle"}
            onClick={() => onRegion("alle")}
          >
            Alle
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
      </div>

      <p className="result-count">
        {flags.length === 1 ? "1 flag" : `${flags.length} flag`}
      </p>

      {flags.length === 0 ? (
        <p className="empty-filter">Ingen flag matcher søgningen.</p>
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
                  <span className="flag-art">
                    <img src={flag.asset.svg} alt="" />
                    {position ? (
                      <span className="order-badge">{position}</span>
                    ) : null}
                  </span>
                  <span className="flag-name">{flag.hemLabel}</span>
                  <span className="flag-meta">
                    {flag.iso.toUpperCase()} · {flag.ratio.width}:
                    {flag.ratio.height}
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
