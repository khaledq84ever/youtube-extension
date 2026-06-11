const ext = typeof browser !== 'undefined' ? browser : chrome;

const API = 'https://youtube-mp3-downloader-production-c1e2.up.railway.app';

const DOWNLOAD_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

function currentVideoUrl() {
  if (location.pathname === '/watch') {
    const id = new URLSearchParams(location.search).get('v');
    if (id) return `https://www.youtube.com/watch?v=${id}`;
  }
  // youtu.be short links and /shorts/<id>
  const sm = location.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/);
  if (sm) return `https://www.youtube.com/watch?v=${sm[1]}`;
  return null;
}

async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function pollStatus(jobId) {
  for (let i = 0; i < 240; i++) {
    await new Promise(r => setTimeout(r, 500));
    const r = await fetch(`${API}/status/${jobId}`);
    const d = await r.json();
    if (d.status === 'done') return d;
    if (d.status === 'error') return null;
  }
  return null;
}

function sanitize(name) {
  // Keep Unicode (Arabic etc); strip only Windows/Chrome-forbidden characters.
  let s = String(name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const i = s.lastIndexOf('.');
  const hasExt = i >= 0 && s.length - i <= 6;
  let stem = (hasExt ? s.slice(0, i) : s).replace(/^[. ]+|[. ]+$/g, '');
  const ext = hasExt ? s.slice(i) : '';
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem)) stem = '_' + stem;
  if (!stem) stem = 'download';
  return stem.slice(0, 150) + ext;
}

function triggerDownload(jobId, filename) {
  const url = `${API}/download/${jobId}`;
  const safeFile = `YTGet/${sanitize(filename)}`;

  return new Promise((resolve) => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };

    try {
      ext.runtime.sendMessage(
        { type: 'YT_DOWNLOAD', url, filename: safeFile },
        () => {
          if (ext.runtime.lastError) iframeFallback(url);
          done();
        }
      );
    } catch (_) {
      iframeFallback(url);
      done();
    }

    setTimeout(() => {
      if (!settled) { iframeFallback(url); done(); }
    }, 4000);
  });
}

function iframeFallback(url) {
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', '');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 2000);
}

async function handleDownload(videoUrl, format, quality, btn, label) {
  btn.disabled = true;
  btn.classList.add('yt-loading');
  btn.innerHTML = `<span class="yt-spinner"></span>${label}…`;

  try {
    const info = await apiPost('/info', { url: videoUrl });
    if (info.error) throw new Error(info.error);

    const startBody = {
      url: videoUrl,
      title: info.title || 'youtube',
      uploader: info.uploader || '',
      format,
      quality
    };
    const startData = await apiPost('/start', startBody);
    if (startData.error) throw new Error(startData.error);

    const result = await pollStatus(startData.job_id);
    if (!result) throw new Error('Processing failed');

    await triggerDownload(startData.job_id, result.filename);

    btn.classList.remove('yt-loading');
    btn.classList.add('yt-done');
    btn.innerHTML = `${DOWNLOAD_ICON} Saved!`;
    setTimeout(() => {
      btn.classList.remove('yt-done');
      btn.disabled = false;
      btn.innerHTML = `${DOWNLOAD_ICON} ${label}`;
    }, 3000);
  } catch (err) {
    btn.classList.remove('yt-loading');
    btn.classList.add('yt-error');
    btn.innerHTML = `✕ ${err.message.slice(0, 24)}`;
    btn.disabled = false;
    setTimeout(() => {
      btn.classList.remove('yt-error');
      btn.innerHTML = `${DOWNLOAD_ICON} ${label}`;
    }, 4000);
  }
}

function buildWrap(videoUrl) {
  const wrap = document.createElement('div');
  wrap.className = 'yt-wrap';

  const mp3 = document.createElement('button');
  mp3.className = 'yt-btn yt-btn-primary';
  mp3.innerHTML = `${DOWNLOAD_ICON} MP3 320K`;
  mp3.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDownload(videoUrl, 'mp3', '320K', mp3, 'MP3 320K');
  });
  wrap.appendChild(mp3);

  const mp4 = document.createElement('button');
  mp4.className = 'yt-btn';
  mp4.innerHTML = `${DOWNLOAD_ICON} MP4`;
  mp4.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDownload(videoUrl, 'mp4', '720p', mp4, 'MP4');
  });
  wrap.appendChild(mp4);

  return wrap;
}

function ensureWatchPageButtons() {
  const videoUrl = currentVideoUrl();
  if (!videoUrl) return;
  if (document.querySelector('.yt-wrap')) return;

  // YouTube Watch page: insert next to like/share row
  const actionsRow =
    document.querySelector('#actions #top-level-buttons-computed') ||
    document.querySelector('#menu-container #top-level-buttons-computed') ||
    document.querySelector('ytd-watch-metadata #actions') ||
    document.querySelector('#above-the-fold #top-row');

  const wrap = buildWrap(videoUrl);

  if (actionsRow) {
    actionsRow.appendChild(wrap);
  } else {
    // Fallback: floating FAB
    const fab = document.createElement('div');
    fab.className = 'yt-fab';
    fab.appendChild(wrap);
    document.body.appendChild(fab);
  }
}

ext.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'YT_CONTEXT_DOWNLOAD') {
    const tmp = document.createElement('button');
    tmp.style.position = 'fixed';
    tmp.style.top = '14px';
    tmp.style.right = '14px';
    tmp.style.zIndex = '999999';
    tmp.className = 'yt-btn yt-btn-primary';
    tmp.innerHTML = `${DOWNLOAD_ICON} Starting…`;
    document.body.appendChild(tmp);
    handleDownload(msg.url, 'mp3', '320K', tmp, 'Done');
    setTimeout(() => tmp.remove(), 6000);
  }
});

let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(ensureWatchPageButtons, 250);
});
observer.observe(document.body, { childList: true, subtree: true });

// YouTube is an SPA — watch for URL changes via popstate + interval
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    document.querySelectorAll('.yt-wrap, .yt-fab').forEach(el => el.remove());
    setTimeout(ensureWatchPageButtons, 500);
  } else {
    ensureWatchPageButtons();
  }
}, 1500);

ensureWatchPageButtons();
