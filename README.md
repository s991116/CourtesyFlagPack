# Courtesy Flag Pack

Choose courtesy flags and download a print-size PDF.

Search and select flags, then choose how many flags sit in each row, from 2 to 6. Each flag keeps its official ratio, at most 40 cm long and 30 cm high. The sheet can instead print every flag at 40 × 30 cm.

The catalog covers Europe, the Caribbean, North America, South America, Oceania, the Indian Ocean, Asia, and Africa. A national flag is the courtesy flag for that place. A regional flag is optional, and is flown as well as the national flag. Search and the kind filter both show which is which. French and Dutch islands that have their own flag are regional: France and the Netherlands stay selectable as the national flag, and the island flag can be added beside it.

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

How many flags sit in a row, from 2 to 6, and the largest cloth live in `src/data/sheet.ts`. The sheet adds a row when the row above is full.

## Flag files

Most files in `public/flags/` are 4×3 SVGs from [flag-icons](https://github.com/lipis/flag-icons) (MIT). Local flags for French and Dutch islands that flag-icons draws as the French or Dutch flag come from Wikimedia Commons. The licenses are in `public/flags/LICENSE.txt`.
