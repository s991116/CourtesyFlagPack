# Deploy Courtesy Flag Pack to courtesyflagpack.sailboatadventure.com

Same hosting model as [harbour.sailboatadventure.dk](https://harbour.sailboatadventure.dk/): a static Vite build on Cloudflare Pages, with a CNAME at the domain host.

`sailboatadventure.com` uses one.com nameservers (`ns01.one.com` / `ns02.one.com`). The site itself is not hosted at one.com.

## Recommended — the Create page you see now

Cloudflare no longer shows **Workers & Pages** in every account. The screen named **Create** → **Connect to GitHub** is the right one. It has no branch picker because it uses the repository’s default branch, which is `main`.

1. Log in at [Cloudflare Dashboard](https://dash.cloudflare.com/) and open **Create** → **Connect to GitHub**.
2. Choose **s991116/CourtesyFlagPack**.
3. Set the fields like this:

   | Field | Value |
   |-------|--------|
   | Name | `courtesyflagpack` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Preview command | `npx wrangler preview` |
   | Root directory | `/` |

   If there is only a deploy command, replace it with `npm run build && npx wrangler deploy`. The site is built into `dist/` before Wrangler uploads it. The preview command runs for branches other than `main` and does not replace the live site.

4. Save. The first deploy uses `main`.
5. Save and wait for the first deploy. Open the `pages.dev` or `workers.dev` address Cloudflare shows, and confirm the app loads.
6. Add the custom domain `courtesyflagpack.sailboatadventure.com` on that project.
7. In **one.com** DNS for `sailboatadventure.com`:
   - Remove any `courtesyflagpack` **A-record** that points at one.com web hosting.
   - Add the CNAME Cloudflare shows. If it does not specify another target:

   | Type | Host | Target |
   |------|------|--------|
   | CNAME | courtesyflagpack | courtesyflagpack.pages.dev |

8. Wait 5–15 minutes for SSL, then open https://courtesyflagpack.sailboatadventure.com

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

Dashboard Git integration already deploys every push to `main`. You do not need the command if that connection is in place.

## Troubleshooting

- **Blank page**: output directory is `dist`. There is no custom `base` in `vite.config.ts`.
- **one.com default page**: the host must be a **CNAME** to `courtesyflagpack.pages.dev`, not an A-record to one.com.
- **SSL pending**: wait, then confirm the custom domain is **Active** on the Pages project.
- **Build fails on Cloudflare**: open the build log, keep Node 22, and run `npm run build` locally.
- **Invalid `_redirects` / infinite loop**: do not add a `/* /index.html 200` rule. `wrangler.toml` already serves `index.html` for unknown paths.
