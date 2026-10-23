# Deploy Courtesy Flag Pack to flag.sailboatadventure.dk

The live site is a static Vite build on Cloudflare Pages. `sailboatadventure.dk` uses Cloudflare nameservers (`micah.ns.cloudflare.com` / `stella.ns.cloudflare.com`).

## Cloudflare Pages

The Git project is **courtesyflagpack**, connected to **s991116/CourtesyFlagPack**, production branch **main**.

| Field | Value |
|-------|--------|
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node.js | 22 (see `.nvmrc`) |

Pages installs dependencies, runs the build, and publishes `dist`. There is no Wrangler deploy command in this setup. `public/_redirects` sends unknown paths to `index.html`.

After a green deploy, open the `https://courtesyflagpack.pages.dev` address and confirm the app loads. The Pages project name stays `courtesyflagpack`. The public address is the custom domain below.

## Custom domain

The public address is `flag.sailboatadventure.dk`. `Flag.sailboatadventure.dk` is the same address. DNS ignores letter case.

1. In the Pages project, open **Custom domains** → **Set up a custom domain**.
2. Enter `flag.sailboatadventure.dk`.
3. In the Cloudflare DNS zone for `sailboatadventure.dk`, the host `flag` is a CNAME. Remove any `flag` **A-record**. The record is:

   | Type | Host | Target |
   |------|------|--------|
   | CNAME | flag | courtesyflagpack.pages.dev |

4. Wait until the custom domain is **Active**, then open https://flag.sailboatadventure.dk

### Verify DNS

```bash
dig flag.sailboatadventure.dk CNAME +short
# should show: courtesyflagpack.pages.dev.
```

## Local check

```bash
npm install
npm test
npm run build
npm run preview
```

## Optional — deploy from this machine

Requires a Cloudflare API token with **Cloudflare Pages → Edit**, and `npx wrangler login` once.

```bash
npm run deploy:pages
```

The Git connection already deploys every push to `main`. You do not need the command if that connection is in place.

## Visits and PDF downloads

Visits and successful PDF downloads are counted with [GoatCounter](https://www.goatcounter.com/). Cloudflare’s own visit counter cannot count the **Download PDF** button, so both numbers are collected there. The counter sets no cookies and does not send which flags are selected.

It is already wired in. A visit is counted when the page opens. `download-pdf` is counted when the PDF file has been created. Nothing is sent until a site code is set, and localhost is not counted.

1. Create a free site at [goatcounter.com](https://www.goatcounter.com/). The code is the part in front of `.goatcounter.com`, for example `courtesyflagpack`.
2. In the settings there, allow `flag.sailboatadventure.dk`.
3. In the Cloudflare Pages project **courtesyflagpack**, open **Settings** → **Environment variables**. Add this for **Production**:

   | Name | Value |
   |------|--------|
   | `VITE_GOATCOUNTER_CODE` | the site code, for example `courtesyflagpack` |

Vite reads the variable at build time, so Cloudflare must build the site again after it is saved.

The numbers are at `https://<site-code>.goatcounter.com`. Page views are the visits. The download is the event `download-pdf`.

## Troubleshooting

- **Blank page**: the output directory is `dist`. There is no custom `base` in `vite.config.ts`.
- **Wrong site at the flag address**: the host `flag` must be a **CNAME** to `courtesyflagpack.pages.dev`, not an A-record.
- **SSL pending**: wait, then confirm the custom domain is **Active** on the Pages project.
- **Build fails on Cloudflare**: open the build log, keep Node 22, and run `npm run build` locally.
