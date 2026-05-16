/* YTGet v1.2.0 popup logic */
const ext = typeof browser !== 'undefined' ? browser : chrome;
const API = 'https://youtube-mp3-downloader-production-c1e2.up.railway.app';
const DOWNLOAD_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const CHECK_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const ERROR_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

const $ = (id) => document.getElementById(id);
const urlInput      = $('urlInput');
const fetchBtn      = $('fetchBtn');
const errorBox      = $('errorBox');
const resultCard    = $('resultCard');
const resultTitle   = $('resultTitle');
const resultMeta    = $('resultMeta');
const resultThumb   = $('resultThumb');
const actionRow     = $('actionRow');
const tabMp3        = $('tabMp3');
const tabMp4        = $('tabMp4');
const progressWrap  = $('progressWrap');
const progressBar   = $('progressBar');
const progressLabel = $('progressLabel');
const settingsBtn   = $('settingsBtn');
const settingsDrawer = $('settingsDrawer');
const setInPage     = $('setInPage');
const setFilename   = $('setFilename');
const setFormat     = $('setFormat');
const setQuality    = $('setQuality');
const apiPing       = $('apiPing');
const apiPingLabel  = $('apiPingLabel');
const pasteBtn      = $('pasteBtn');
const toastHost     = $('toastHost');

let currentInfo = null;
let currentFmt  = 'mp3';
let settings    = { inPage: true, filename: '{uploader}_{title}', defaultFormat: 'mp3', defaultQuality: '320K' };

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

const show = (el) => { el.hidden = false; };
const hide = (el) => { el.hidden = true; };
const setError = (m) => { errorBox.textContent = m; show(errorBox); };
const clearError = () => { hide(errorBox); errorBox.textContent = ''; };
function setProgress(pct, label) {
  progressBar.style.width = `${pct}%`;
  progressLabel.textContent = label;
  show(progressWrap);
}
function hideProgress() { hide(progressWrap); progressBar.style.width = '0%'; }

function sanitize(name) {
  return (name || 'download')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'download';
}
function renderFilename(template, info) {
  return template
    .replace(/\{title\}/g, sanitize(info.title || 'youtube'))
    .replace(/\{uploader\}/g, sanitize(info.uploader || 'yt'))
    .replace(/\{id\}/g, sanitize(info.id || Date.now()));
}

function toast(message, kind = '') {
  const t = document.createElement('div');
  t.className = `toast${kind ? ' ' + kind : ''}`;
  const icon = kind === 'success' ? CHECK_ICON : kind === 'error' ? ERROR_ICON : DOWNLOAD_ICON;
  t.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  toastHost.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    setTimeout(() => t.remove(), 240);
  }, 2400);
}

function loadSettings() {
  return new Promise((resolve) => {
    if (ext.storage?.sync?.get) {
      ext.storage.sync.get(['yt_settings'], (data) => {
        if (data?.yt_settings) settings = { ...settings, ...data.yt_settings };
        resolve();
      });
    } else resolve();
  });
}
function saveSettings() {
  if (ext.storage?.sync?.set) ext.storage.sync.set({ yt_settings: settings });
}
function syncSettingsUI() {
  setInPage.checked  = settings.inPage;
  setFilename.value  = settings.filename;
  setFormat.value    = settings.defaultFormat;
  setQuality.value   = settings.defaultQuality;
}
function bindSettingsHandlers() {
  setInPage.addEventListener('change',   () => { settings.inPage         = setInPage.checked; saveSettings(); });
  setFilename.addEventListener('change', () => { settings.filename       = setFilename.value || '{uploader}_{title}'; saveSettings(); });
  setFormat.addEventListener('change',   () => {
    settings.defaultFormat = setFormat.value;
    currentFmt = setFormat.value;
    syncFormatTabs();
    if (currentInfo) renderActions();
    saveSettings();
  });
  setQuality.addEventListener('change',  () => { settings.defaultQuality = setQuality.value; saveSettings(); });
}
settingsBtn.addEventListener('click', () => {
  const open = settingsDrawer.hidden;
  if (open) show(settingsDrawer); else hide(settingsDrawer);
  settingsBtn.setAttribute('aria-expanded', String(open));
});

function syncFormatTabs() {
  const mp3Active = currentFmt === 'mp3';
  tabMp3.classList.toggle('active', mp3Active);
  tabMp4.classList.toggle('active', !mp3Active);
  tabMp3.setAttribute('aria-selected', String(mp3Active));
  tabMp4.setAttribute('aria-selected', String(!mp3Active));
}

async function checkApi() {
  const cached = await getSession('yt_api_status');
  if (cached && Date.now() - cached.ts < 60_000) {
    setApiState(cached.state, cached.label); return;
  }
  setApiState('checking', 'Checking…');
  const t0 = performance.now();
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4500);
    const r = await fetch(`${API}/`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(to);
    const dt = performance.now() - t0;
    if (!r.ok) throw new Error('bad status');
    const state = dt > 1800 ? 'slow' : 'online';
    const label = state === 'slow' ? `Slow · ${Math.round(dt)}ms` : `Online · ${Math.round(dt)}ms`;
    setApiState(state, label);
    setSession('yt_api_status', { state, label, ts: Date.now() });
  } catch {
    setApiState('offline', 'Offline');
    setSession('yt_api_status', { state: 'offline', label: 'Offline', ts: Date.now() });
  }
}
function setApiState(state, label) {
  apiPing.dataset.state = state;
  apiPingLabel.textContent = label;
}
function getSession(key) {
  return new Promise((resolve) => {
    const store = ext.storage?.session || ext.storage?.local;
    if (!store) return resolve(null);
    store.get([key], (data) => resolve(data?.[key] || null));
  });
}
function setSession(key, value) {
  const store = ext.storage?.session || ext.storage?.local;
  if (store) store.set({ [key]: value });
}

async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function pollStatus(jobId, btn) {
  for (let i = 0; i < 240; i++) {
    await new Promise(r => setTimeout(r, 500));
    const r = await fetch(`${API}/status/${jobId}`);
    const d = await r.json();
    if (d.status === 'done')  return d;
    if (d.status === 'error') return null;
    const pct = 10 + Math.min(i * 0.5, 80);
    setProgress(pct, `Processing… ${(i * 0.5).toFixed(0)}s`);
    if (btn) btn.style.setProperty('--p', `${pct}%`);
  }
  return null;
}

function downloadFile(jobId, filename, btn) {
  return new Promise((resolve, reject) => {
    const safeFile = `YTGet/${sanitize(filename)}`;
    const url = `${API}/download/${jobId}`;
    if (ext.downloads?.download) {
      ext.downloads.download(
        { url, filename: safeFile, saveAs: false, conflictAction: 'uniquify' },
        (downloadId) => {
          const err = ext.runtime.lastError;
          if (err) { reject(new Error(err.message)); return; }
          if (btn) { btn.classList.remove('loading'); btn.classList.add('done'); btn.innerHTML = `${CHECK_ICON} Saved`; }
          resolve(downloadId);
        }
      );
    } else {
      window.open(url, '_blank');
      if (btn) { btn.classList.remove('loading'); btn.classList.add('done'); btn.innerHTML = `${CHECK_ICON} Saved`; }
      resolve();
    }
  });
}

async function startDownload(format, quality, btn) {
  if (!currentInfo) return;
  btn.disabled = true;
  btn.classList.add('loading');
  btn.style.setProperty('--p', '5%');
  setProgress(5, 'Starting…');
  try {
    const filename = renderFilename(settings.filename, currentInfo);
    const body = {
      url: currentInfo.url,
      title: filename,
      uploader: currentInfo.uploader || '',
      format,
      quality
    };
    const start = await apiPost('/start', body);
    if (start.error) throw new Error(start.error);
    setProgress(10, 'Processing…');
    btn.style.setProperty('--p', '10%');
    const result = await pollStatus(start.job_id, btn);
    if (!result) throw new Error('Processing failed');
    setProgress(90, 'Downloading…');
    btn.style.setProperty('--p', '90%');
    await downloadFile(start.job_id, result.filename, btn);
    setProgress(100, 'Done');
    btn.style.setProperty('--p', '100%');
    toast('Saved to Downloads', 'success');
    setTimeout(hideProgress, 1500);
  } catch (err) {
    hideProgress();
    btn.classList.remove('loading');
    btn.classList.add('error');
    btn.innerHTML = `${ERROR_ICON} Error`;
    btn.disabled = false;
    setError(err.message || 'Download failed');
    toast('Download failed', 'error');
  }
}

let _activeBtn = null;

function renderActions() {
  actionRow.innerHTML = '';
  const list = currentFmt === 'mp3' ? MP3_QUALITIES : MP4_QUALITIES;
  list.forEach(({ q, label }) => {
    const btn = document.createElement('button');
    btn.className = 'dl-btn';
    btn.type = 'button';
    btn.innerHTML = `${DOWNLOAD_ICON} ${label}`;
    btn.addEventListener('click', () => { _activeBtn = btn; startDownload(currentFmt, q, btn); });
    actionRow.appendChild(btn);
  });
}

tabMp3.addEventListener('click', () => { currentFmt = 'mp3'; syncFormatTabs(); renderActions(); });
tabMp4.addEventListener('click', () => { currentFmt = 'mp4'; syncFormatTabs(); renderActions(); });

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
  if (!url) { setError('Paste a YouTube URL first.'); return; }
  clearError();
  hide(resultCard);
  hideProgress();
  actionRow.innerHTML = '';
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<span class="spinner"></span><span class="btn-label">Fetching…</span>';

  try {
    const data = await apiPost('/info', { url });
    if (data.error) throw new Error(data.error);

    currentInfo = { ...data, url };
    resultTitle.textContent = data.title || 'YouTube Video';

    resultMeta.innerHTML = '';
    if (data.uploader) resultMeta.innerHTML += `<span class="meta-chip">${data.uploader}</span>`;
    const dur = formatDuration(data.duration_sec);
    if (dur) resultMeta.innerHTML += `<span class="meta-chip">⏱ ${dur}</span>`;

    if (data.thumbnail) {
      resultThumb.style.backgroundImage = `url("${data.thumbnail}")`;
      resultThumb.classList.add('has-img');
    } else {
      resultThumb.style.backgroundImage = '';
      resultThumb.classList.remove('has-img');
    }

    currentFmt = settings.defaultFormat || 'mp3';
    syncFormatTabs();
    renderActions();
    show(resultCard);
  } catch (err) {
    setError(err.message || 'Could not fetch info');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span class="btn-label">Get Video</span>`;
  }
}

pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      urlInput.value = text.trim();
      urlInput.focus();
      if (/youtube\.com|youtu\.be/.test(urlInput.value)) fetchInfo();
    }
  } catch {
    toast('Clipboard blocked — paste manually', 'error');
  }
});

fetchBtn.addEventListener('click', fetchInfo);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchInfo(); });

(async () => {
  await loadSettings();
  syncSettingsUI();
  bindSettingsHandlers();
  checkApi();
  currentFmt = settings.defaultFormat || 'mp3';
  syncFormatTabs();
  ext.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.url) return;
    if (/youtube\.com\/watch\?/.test(tab.url) || /youtu\.be\//.test(tab.url) || /youtube\.com\/shorts\//.test(tab.url)) {
      urlInput.value = tab.url.split('&')[0];
    }
  });
})();
