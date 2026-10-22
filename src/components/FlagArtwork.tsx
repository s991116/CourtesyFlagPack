import type { ReactNode } from "react";
import { catalogFlagStyle, flagImageStyle, type FlagProportion } from "../lib/flagSize";
import type { Flag } from "../types/flag";

type FlagArtworkProps = {
  flag: Flag;
  proportion?: FlagProportion;
  /** Catalog cards share Albania's height. The sheet keeps the print size. */
  fit?: "sheet" | "catalog";
  children?: ReactNode;
};

/** Official ratio box. The 4:3 file is stretched so the border sits on the cloth. */
export function FlagArtwork({
  flag,
  proportion = "original",
  fit = "sheet",
  children,
}: FlagArtworkProps) {
  const style =
    fit === "catalog" ? catalogFlagStyle(flag) : flagImageStyle(flag, proportion);
  return (
    <span className="flag-image" style={style}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <image
          href={flag.asset.svg}
          width="100"
          height="100"
          preserveAspectRatio="none"
        />
      </svg>
      {children}
    </span>
  );
}
