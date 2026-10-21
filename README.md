# Courtesy Flag Pack

Choose courtesy flags and download a print-size PDF.

Search and select countries, pick a format (2×2, 3×4, or 4×5), and download the sheet. Each flag keeps its official ratio, at most 40 cm long and 30 cm high. The sheet can instead print every flag at 30 × 40 cm.

The sheet leaves room at the page edge and between the flags. Each flag has fold cloth on every side, and the motif outside the fold is mirrored across that fold. A dashed line marks where to cut around each piece, and another marks the fold along each flag edge. The country name is printed in the left fold. The measurements live in `src/config/print.ts`.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm test
```

## Metadata

The catalog lives in `src/data/flags.ts` and follows the `Flag` type in `src/types/flag.ts`.

Each flag has:

- `id` and `iso`
- `labels` — the names this artwork covers (one or more)
- `hemLabel` — the text printed along the edge
- `ratio.height` and `ratio.length` — official hoist and fly. The card stays one size; the flag inside is fitted to that proportion
- `asset.svg` — the file in the repo
- `region` — used by the picker filter

Sheet format and cloth size live in `src/data/sheet.ts`. `src/lib/layout.ts` splits the selection into pages.

## Flag files

The sample files in `public/flags/` are 4×3 SVGs from [flag-icons](https://github.com/lipis/flag-icons) (MIT). The license is in `public/flags/LICENSE.txt`.
