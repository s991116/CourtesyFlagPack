# Deploy Courtesy Flag Pack to courtesyflagpack.sailboatadventure.com

The live site is a static Vite build on Cloudflare Pages. `sailboatadventure.com` uses one.com nameservers (`ns01.one.com` / `ns02.one.com`). The site itself is not hosted at one.com.

## Cloudflare Pages

The Git project is **courtesyflagpack**, connected to **s991116/CourtesyFlagPack**, production branch **main**.

| Field | Value |
|-------|--------|
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node.js | 22 (see `.nvmrc`) |

Pages installs dependencies, runs the build, and publishes `dist`. There is no Wrangler deploy command in this setup. `public/_redirects` sends unknown paths to `index.html`.

After a green deploy, open the `https://courtesyflagpack.pages.dev` address and confirm the app loads.

## Custom domain

1. In the Pages project, open **Custom domains** → **Set up a custom domain**.
2. Enter `courtesyflagpack.sailboatadventure.com`.
3. Cloudflare shows a CNAME because `sailboatadventure.com` is not a zone in this account. In **one.com** DNS:
   - Remove any `courtesyflagpack` **A-record** that points at one.com web hosting.
   - Add the CNAME Cloudflare shows. If it does not specify another target:

   | Type | Host | Target |
   |------|------|--------|
   | CNAME | courtesyflagpack | courtesyflagpack.pages.dev |

4. Wait 5–15 minutes for SSL, then open https://courtesyflagpack.sailboatadventure.com

`CourtesyFlagPack.sailboatadventure.com` is the same address. DNS ignores letter case.

### Verify DNS

```bash
dig courtesyflagpack.sailboatadventure.com CNAME +short
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

## Troubleshooting

- **Blank page**: the output directory is `dist`. There is no custom `base` in `vite.config.ts`.
- **one.com default page**: the host must be a **CNAME** to `courtesyflagpack.pages.dev`, not an A-record to one.com.
- **SSL pending**: wait, then confirm the custom domain is **Active** on the Pages project.
- **Build fails on Cloudflare**: open the build log, keep Node 22, and run `npm run build` locally.
