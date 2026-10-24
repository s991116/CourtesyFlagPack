import type { ReactNode } from "react";
import { catalogFlagStyle, flagImageStyle, type FlagFit } from "../lib/flagSize";
import type { FlagCloth } from "../data/sheet";
import type { Flag } from "../types/flag";

type FlagArtworkProps = {
  flag: Flag;
  cloth?: FlagCloth;
  printFit?: FlagFit;
  /** Catalog cards share Albania's height. The sheet keeps the print size. */
  fit?: "sheet" | "catalog";
  children?: ReactNode;
};

/** Official ratio box. The 4:3 file is stretched so the border sits on the cloth. */
export function FlagArtwork({
  flag,
  cloth,
  printFit = "stretched",
  fit = "sheet",
  children,
}: FlagArtworkProps) {
  const style =
    fit === "catalog" || !cloth
      ? catalogFlagStyle(flag)
      : flagImageStyle(flag, cloth, printFit);
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
