const ext = typeof browser !== 'undefined' ? browser : chrome;

const ACTIVE_RE = /^https?:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i;

function setTabState(tabId, isActive) {
  if (!ext.action?.setBadgeText) return;
  ext.action.setBadgeBackgroundColor({ color: isActive ? '#10B981' : '#3F3F46', tabId });
  ext.action.setBadgeText({ text: isActive ? '' : '○', tabId });
  ext.action.setTitle({
    title: isActive ? 'YTGet — ready on this page' : 'YTGet — open a YouTube video',
    tabId
  });
}

function refreshTab(tabId) {
  ext.tabs.get(tabId, (tab) => {
    if (ext.runtime.lastError || !tab) return;
    setTabState(tabId, ACTIVE_RE.test(tab.url || ''));
  });
}

ext.tabs.onActivated.addListener(({ tabId }) => refreshTab(tabId));
ext.tabs.onUpdated.addListener((tabId, info) => {
  if (info.url || info.status === 'complete') refreshTab(tabId);
});

ext.runtime.onInstalled.addListener(({ reason }) => {
  ext.contextMenus.create({
    id: 'yt-download',
    title: 'Download with YTGet',
    contexts: ['link'],
    targetUrlPatterns: [
      '*://www.youtube.com/watch?*',
      '*://youtube.com/watch?*',
      '*://m.youtube.com/watch?*',
      '*://music.youtube.com/watch?*',
      '*://youtu.be/*'
    ]
  });

  if (reason === 'install') {
    ext.tabs.create({ url: ext.runtime.getURL('src/welcome.html') });
  }
});

ext.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'yt-download') return;
  ext.tabs.sendMessage(tab.id, { type: 'YT_CONTEXT_DOWNLOAD', url: info.linkUrl });
});

function sanitize(name) {
  const s = String(name ?? '').trim();
  return (s || 'download')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'download';
}

ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'YT_DOWNLOAD') return false;

  const raw = String(msg.filename ?? '').replace(/^YTGet\//, '');
  const safeFile = sanitize(raw);
  const filename = `YTGet/${safeFile}`;

  ext.downloads.download(
    { url: msg.url, filename, saveAs: false, conflictAction: 'uniquify' },
    (downloadId) => {
      const err = ext.runtime.lastError;
      sendResponse(err ? { error: err.message } : { downloadId });
    }
  );

  return true;
});
