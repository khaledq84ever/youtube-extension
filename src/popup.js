const ext = typeof browser !== 'undefined' ? browser : chrome;
const API = 'https://youtube-mp3-downloader-production-c1e2.up.railway.app';
const DOWNLOAD_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

const urlInput    = document.getElementById('urlInput');
const fetchBtn    = document.getElementById('fetchBtn');
const errorBox    = document.getElementById('errorBox');
const resultCard  = document.getElementById('resultCard');
const resultTitle = document.getElementById('resultTitle');
const resultMeta  = document.getElementById('resultMeta');
const actionRow   = document.getElementById('actionRow');
const tabMp3      = document.getElementById('tabMp3');
const tabMp4      = document.getElementById('tabMp4');
const progressWrap  = document.getElementById('progressWrap');
const progressBar   = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');

let currentInfo = null;
let currentFmt  = 'mp3';

const showError  = (msg) => { errorBox.textContent = msg; errorBox.style.display = 'block'; };
const clearError = ()    => { errorBox.style.display = 'none'; };
const setProgress = (pct, label) => {
  progressBar.style.width = `${pct}%`;
  progressLabel.textContent = label;
  progressWrap.style.display = 'flex';
};
const hideProgress = () => { progressWrap.style.display = 'none'; };

function sanitize(name) {
  return (name || 'download')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'download';
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
    setProgress(10 + Math.min(i * 0.5, 80), `Processing… ${(i * 0.5).toFixed(0)}s`);
  }
  return null;
}

function downloadFile(jobId, filename, btn) {
  return new Promise((resolve, reject) => {
    const safeFile = `YTGet/${sanitize(filename)}`;
    const url = `${API}/download/${jobId}`;

    if (ext.downloads && ext.downloads.download) {
      ext.downloads.download(
        { url, filename: safeFile, saveAs: false, conflictAction: 'uniquify' },
        (downloadId) => {
          const err = ext.runtime.lastError;
          if (err) { reject(new Error(err.message)); return; }
          if (btn) { btn.classList.add('done'); btn.innerHTML = `${DOWNLOAD_ICON} Saved!`; }
          resolve(downloadId);
        }
      );
    } else {
      window.open(url, '_blank');
      if (btn) { btn.classList.add('done'); btn.innerHTML = `${DOWNLOAD_ICON} Saved!`; }
      resolve();
    }
  });
}

async function startDownload(format, quality, btn, label) {
  if (!currentInfo) return;
  btn.disabled = true;
  setProgress(5, 'Starting…');

  try {
    const body = {
      url: currentInfo.url,
      title: currentInfo.title || 'youtube',
      uploader: currentInfo.uploader || '',
      format,
      quality
    };
    const start = await apiPost('/start', body);
    if (start.error) throw new Error(start.error);

    setProgress(10, 'Processing…');
    const result = await pollStatus(start.job_id);
    if (!result) throw new Error('Processing failed');

    setProgress(90, 'Downloading…');
    await downloadFile(start.job_id, result.filename, btn);
    setProgress(100, 'Done!');
    setTimeout(hideProgress, 2000);
  } catch (err) {
    hideProgress();
    showError(err.message);
    btn.disabled = false;
    btn.classList.add('error');
    btn.textContent = '✕ Error';
  }
}

const MP3_QUALITIES = [
  { q: '320K', label: '320 kbps · Best' },
  { q: '256K', label: '256 kbps' },
  { q: '192K', label: '192 kbps' },
  { q: '128K', label: '128 kbps' }
];

const MP4_QUALITIES = [
  { q: '1080p', label: '1080p Full HD' },
  { q: '720p',  label: '720p HD' },
  { q: '480p',  label: '480p' },
  { q: '360p',  label: '360p' }
];

function renderActions() {
  actionRow.innerHTML = '';
  const list = currentFmt === 'mp3' ? MP3_QUALITIES : MP4_QUALITIES;
  list.forEach(({ q, label }) => {
    const btn = document.createElement('button');
    btn.className = 'dl-btn';
    btn.innerHTML = `${DOWNLOAD_ICON} ${label}`;
    btn.addEventListener('click', () => startDownload(currentFmt, q, btn, label));
    actionRow.appendChild(btn);
  });
}

tabMp3.addEventListener('click', () => {
  currentFmt = 'mp3';
  tabMp3.classList.add('active');
  tabMp4.classList.remove('active');
  renderActions();
});
tabMp4.addEventListener('click', () => {
  currentFmt = 'mp4';
  tabMp4.classList.add('active');
  tabMp3.classList.remove('active');
  renderActions();
});

function formatDuration(sec) {
  sec = parseInt(sec || 0);
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
           : `${m}:${String(s).padStart(2,'0')}`;
}

async function fetchInfo() {
  const url = urlInput.value.trim();
  if (!url) { showError('Paste a YouTube URL first.'); return; }

  clearError();
  resultCard.style.display = 'none';
  hideProgress();
  actionRow.innerHTML = '';
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<span class="spinner"></span> Fetching…';

  try {
    const data = await apiPost('/info', { url });
    if (data.error) throw new Error(data.error);

    currentInfo = { ...data, url };
    resultTitle.textContent = data.title || 'YouTube Video';

    resultMeta.innerHTML = '';
    if (data.uploader) resultMeta.innerHTML += `<span class="meta-chip">${data.uploader}</span>`;
    const dur = formatDuration(data.duration_sec);
    if (dur) resultMeta.innerHTML += `<span class="meta-chip">⏱ ${dur}</span>`;

    renderActions();
    resultCard.style.display = 'flex';
  } catch (err) {
    showError(err.message);
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Get Video';
  }
}

fetchBtn.addEventListener('click', fetchInfo);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchInfo(); });

ext.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url) return;
  if (/youtube\.com\/watch\?/.test(tab.url) || /youtu\.be\//.test(tab.url) || /youtube\.com\/shorts\//.test(tab.url)) {
    urlInput.value = tab.url.split('&')[0];
  }
});
