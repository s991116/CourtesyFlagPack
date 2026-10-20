# Courtesy Flag Pack

A draft web app for choosing courtesy flags for a print sheet.

Search and select countries, pick a format (2×2, 3×4, or 4×5), and see how the flags fall across pages. Each flag keeps its official ratio inside a frame at most 40 cm long and 30 cm high. A print-size PDF is the next step.

## Run locally

```bash
npm install
npm run dev
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
