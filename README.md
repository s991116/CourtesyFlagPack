# Courtesy Flag Pack

Choose courtesy flags and download a print-size PDF.

Search and select flags, then choose how many flags sit in each row, from 2 to 6. A flag can be printed at 45 × 30 cm or 30 × 20 cm. Stretched fills the cloth, and Original keeps the official ratio on that cloth. 45 × 30 cm and Stretched are selected by default.

The catalog covers Europe, the Caribbean, North America, South America, Oceania, the Indian Ocean, Asia, and Africa. A national flag is the courtesy flag for that place. A regional flag is optional, and is flown as well as the national flag. Quarantine, diver-down, and distress flags are listed with them under Special, together with signal flags A to Z. A and B are swallowtails at 1:1.5. C to Z are square. Each keeps the same hem as the other flags. Search and the kind filter both show which is which. French and Dutch islands that have their own flag are regional: France and the Netherlands stay selectable as the national flag, and the island flag can be added beside it.

The sheet leaves room at the page edge and between the flags. Each flag has fold cloth on every side, and the motif outside the fold is mirrored across that fold. A dashed line marks where to cut around each piece, and another marks the fold along each flag edge. The country name is printed in black, with a thin white outline, in the left fold. The measurements live in `src/config/print.ts`.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm test
```

## Production

The live site is [flag.sailboatadventure.dk](https://flag.sailboatadventure.dk). Cloudflare Pages builds `main`. The steps for the first setup, and for counting visits and PDF downloads, are in [DEPLOY.md](DEPLOY.md).

## Metadata

The catalog lives in `src/data/flagEntries.ts` and follows the `Flag` type in `src/types/flag.ts`.

Each flag has:

- `id` and `iso`
- `labels` — the names this artwork covers (one or more)
- `hemLabel` — the text printed along the edge
- `ratio.height` and `ratio.length` — official hoist and fly. The card stays one size; the flag inside is fitted to that proportion
- `asset.svg` — the file in the repo
- `region` — sailing area used by the picker filter
- `kind` — `national`, or `regional` when the flag is optional

How many flags sit in a row, from 2 to 6, and the cloth sizes 45 × 30 cm and 30 × 20 cm live in `src/data/sheet.ts`. The sheet adds a row when the row above is full. The full printed page is shown as Print area, and the PDF is saved under that size, for example `courtesy-flags_print-area_50.6x35.6_cm.pdf`.

## Flag files

Most files in `public/flags/` are 4×3 SVGs from [flag-icons](https://github.com/lipis/flag-icons) (MIT). Local flags for French and Dutch islands that flag-icons draws as the French or Dutch flag come from Wikimedia Commons. The licenses are in `public/flags/LICENSE.txt`.
