# YTGet — YouTube to MP3 / MP4

> Browser extension to download any YouTube video as MP3 (up to 320 kbps) or MP4 (up to 1080p). One click, no ads, no upload limits.

<p align="center">
  <img src="assets/icon-128.png" width="96" alt="YTGet icon" />
</p>

<p align="center">
  <a href="https://github.com/khaledq84ever/youtube-extension/releases/latest"><img src="https://img.shields.io/github/v/release/khaledq84ever/youtube-extension?label=version&color=FF0033" alt="Latest release"/></a>
  <img src="https://img.shields.io/badge/Manifest-V3-FF0033" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Firefox-supported-FF0033" alt="Supported browsers" />
  <img src="https://img.shields.io/badge/WCAG-AA-10B981" alt="WCAG AA verified" />
</p>

---

## 🌐 Website

No extension needed — use it straight from the browser:

**https://youtube-mp3-downloader-production-c1e2.up.railway.app**

Paste any YouTube link → download MP3 or MP4.

Get this extension (and its siblings for YouTube, Twitter, Instagram, TikTok) from the download hub: **https://getpack-production.up.railway.app**

## Features

- **MP3** — 128, 192, 256, or **320 kbps** (best)
- **MP4** — 360p, 480p, 720p HD, or **1080p Full HD**
- **Auto download buttons** on every watch page (and Shorts)
- **Right-click any link** → "Download with YTGet"
- **Settings drawer**: default format, default quality, filename template, in-page toggle
- **API status pill** shows backend health (online / slow / offline)
- **Light + dark mode** (auto-follows your OS)
- **Full keyboard navigation** + screen-reader labels
- **Zero build step** — pure vanilla JS + CSS

## Install (Developer Mode)

1. Download the latest release zip from [Releases](https://github.com/khaledq84ever/youtube-extension/releases/latest) **or** `git clone` this repo
2. Open `chrome://extensions` (Chrome / Edge / Brave) or `about:debugging` (Firefox)
3. Enable **Developer mode**
4. Click **Load unpacked** → pick the extension folder

Works on Chrome 109+, Edge 109+, Firefox 121+, Brave, Opera, and any other Chromium-based browser.

## Tech

| Layer | Used |
|---|---|
| Spec | Manifest V3 |
| UI | Vanilla HTML / CSS / ES modules (no build) |
| Fonts | Inter Variable + Space Grotesk (Google Fonts) |
| Backend | [`youtube-mp3-downloader-production-c1e2.up.railway.app`](https://youtube-mp3-downloader-production-c1e2.up.railway.app) — Flask + yt-dlp + ffmpeg |
| A11y | WCAG AA contrast verified, `prefers-reduced-motion` respected |

## Filename templates

In the settings drawer, customize how downloads are named:

```
{uploader}_{title}     →  RickAstley_Never_Gonna_Give_You_Up
{title}                →  Never_Gonna_Give_You_Up
{uploader}_{id}        →  RickAstley_dQw4w9WgXcQ
```

## Credits

Programmed by **[@KhaledQ84Ever](https://x.com/KhaledQ84Ever)** · made with ♥ in Kuwait
