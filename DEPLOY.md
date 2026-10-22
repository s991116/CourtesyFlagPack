# Deploy Courtesy Flag Pack to courtesyflagpack.sailboatadventure.com

Same hosting model as [harbour.sailboatadventure.dk](https://harbour.sailboatadventure.dk/): a static Vite build on Cloudflare Pages, with a CNAME at the domain host.

`sailboatadventure.com` uses one.com nameservers (`ns01.one.com` / `ns02.one.com`). The site itself is not hosted at one.com.

## Recommended — Cloudflare Dashboard

1. Log in at [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select **s991116/CourtesyFlagPack**, production branch **main**.
3. Build settings:

   | Field | Value |
   |-------|--------|
   | Framework preset | Vite (or None) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `/` |
   | Node.js version | **22** (the repo `.nvmrc`) |

4. Project name: **courtesyflagpack**. The first URL is `https://courtesyflagpack.pages.dev`.
5. Wait until that build succeeds and the pages.dev site loads.
6. **Custom domains** → **Set up a custom domain** → `courtesyflagpack.sailboatadventure.com`.
7. In **one.com** DNS for `sailboatadventure.com`:
   - Remove any `courtesyflagpack` **A-record** that points at one.com web hosting.
   - Add:

   | Type | Host | Target |
   |------|------|--------|
   | CNAME | courtesyflagpack | courtesyflagpack.pages.dev |

   Use the target Cloudflare shows, if it differs.

8. Wait 5–15 minutes for SSL, then open https://courtesyflagpack.sailboatadventure.com

`CourtesyFlagPack.sailboatadventure.com` is the same address. DNS does not care about letter case.

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

Dashboard Git integration already deploys every push to `main`. You do not need the command if that connection is in place.

## Troubleshooting

- **Blank page**: output directory is `dist`. There is no custom `base` in `vite.config.ts`.
- **one.com default page**: the host must be a **CNAME** to `courtesyflagpack.pages.dev`, not an A-record to one.com.
- **SSL pending**: wait, then confirm the custom domain is **Active** on the Pages project.
- **Build fails on Cloudflare**: open the build log, keep Node 22, and run `npm run build` locally.
