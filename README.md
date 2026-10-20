# Courtesy Flag Pack

Udkast til en webapp, hvor man vælger gæsteflag til et printark.

Man søger og vælger lande, vælger et format (2×2, 3×4 eller 4×5) og ser, hvordan flagene fordeler sig på sider. Hvert flag er 30×40 cm som udgangspunkt. PDF i rigtigt trykmål er næste skridt.

## Kør lokalt

```bash
npm install
npm run dev
```

## Metadata

Kataloget ligger i `src/data/flags.ts` og følger typen `Flag` i `src/types/flag.ts`.

Hvert flag har:

- `id` og `iso`
- `labels` — de navne, motivet dækker (kan være flere)
- `hemLabel` — teksten, der skal printes langs kanten
- `ratio` — det officielle forhold, uafhængigt af SVG-filens viewBox
- `asset.svg` — filen i repoet
- `region` — bruges af filteret i vælgeren

Arkets format og stofmål ligger i `src/data/sheet.ts`. `src/lib/layout.ts` deler det valgte sæt op i sider.

## Flagfiler

Eksempelfilerne i `public/flags/` er 4×3-SVG’er fra [flag-icons](https://github.com/lipis/flag-icons) (MIT). Licensen ligger i `public/flags/LICENSE.txt`.
