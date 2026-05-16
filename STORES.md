# Store Deployment Guide

Everything that **can be automated** already is. This document covers the
one-time manual steps that require *your* account / payment.

Once you've done them once for each extension, every future release is automatic:
just push a `v*` tag and GitHub Actions builds + publishes everywhere.

---

## ✅ Already done for you

- [x] Brand icons (16/48/128 PNG)
- [x] README.md with badges, install steps, tech stack
- [x] Cross-browser packages built: Chrome / Edge `.zip`, Firefox `.xpi`
- [x] GitHub Actions workflow (`.github/workflows/release.yml`)
- [x] Manifest validated, WCAG AA verified
- [x] Releases published on GitHub

## 🔑 What you need to do, ONCE per store

### 1. Chrome Web Store ($5 one-time)

1. Go to [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole/)
2. Sign in with your Google account → pay **$5 one-time developer fee**
   (covers unlimited extensions on your account)
3. Click **New item** → upload `dist/youtube-extension-chrome-v1.2.0.zip`
4. Fill out the listing (title, description, screenshots, category)
5. Submit → review takes 1–3 days
6. Once approved, copy the **Extension ID** from the URL
   (e.g. `chrome.google.com/webstore/detail/abcdef.../...` — the `abcdef...` part)

**To enable auto-publish on every tag push**, generate an OAuth refresh
token (one-time, ~3 min):

```bash
# Run this on your machine, follow the prompts
npx -y chrome-webstore-upload-keys
```

Then add these as repo secrets at
`https://github.com/khaledq84ever/youtube-extension/settings/secrets/actions`:

| Secret name           | Where to get it                                 |
|-----------------------|-------------------------------------------------|
| `CWS_EXTENSION_ID`    | from your store URL (step 6 above)              |
| `CWS_CLIENT_ID`       | from `chrome-webstore-upload-keys` output       |
| `CWS_CLIENT_SECRET`   | from `chrome-webstore-upload-keys` output       |
| `CWS_REFRESH_TOKEN`   | from `chrome-webstore-upload-keys` output       |

### 2. Firefox Add-ons (free)

1. Go to [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
2. Sign in (free, Mozilla account)
3. Click **Submit a New Add-on** → upload `dist/youtube-extension-firefox-v1.2.0.xpi`
4. Choose **"On this site"** (listed)
5. Submit → review takes 1–7 days

**For auto-publish**, get your API credentials at
[addons.mozilla.org/developers/addon/api/key/](https://addons.mozilla.org/developers/addon/api/key/)
and add as repo secrets:

| Secret name        | Value                          |
|--------------------|--------------------------------|
| `AMO_JWT_ISSUER`   | from the API key page (issuer) |
| `AMO_JWT_SECRET`   | from the API key page (secret) |

### 3. Edge Add-ons (free)

1. Register at [partner.microsoft.com/dashboard/microsoftedge](https://partner.microsoft.com/dashboard/microsoftedge/)
   (free, Microsoft account)
2. Create a new extension submission → upload `dist/youtube-extension-edge-v1.2.0.zip`
3. Fill out the listing → submit → review takes 1–5 days
4. Copy the **Product ID** from the dashboard URL

**For auto-publish**, request API access (Partner Center → API Access → request key):

| Secret name        | Where to get it                |
|--------------------|--------------------------------|
| `EDGE_PRODUCT_ID`  | from your dashboard URL        |
| `EDGE_CLIENT_ID`   | from API Access page           |
| `EDGE_API_KEY`     | from API Access page           |

---

## 🚀 After all secrets are set

Every future release is:

```bash
# 1. bump version in manifest.json (e.g. 1.2.0 → 1.3.0)
# 2. commit + push to main
# 3. tag and push
git tag -a v1.3.0 -m "your changelog"
git push origin v1.3.0
```

GitHub Actions will then:
1. Build Chrome / Edge / Firefox packages
2. Create the GitHub Release with all 3 attached
3. Auto-publish to whichever stores have secrets configured
4. Skip any store without secrets (no errors)

---

## 📸 Screenshots needed for store listings

Each store wants 1–5 screenshots, **1280 × 800 px** recommended. Easiest workflow:

1. Load the unpacked extension in Chrome
2. Open the popup → screenshot at native size, then upscale 2× with:
   ```bash
   convert popup-shot.png -resize 1280x800 -gravity center -extent 1280x800 \
           -background "#0A0A0A" screenshot-1.png
   ```
3. Repeat for: settings drawer open, result card with thumbnail, in-page download buttons.
