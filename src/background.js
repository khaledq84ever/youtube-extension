const ext = typeof browser !== 'undefined' ? browser : chrome;

ext.runtime.onInstalled.addListener(() => {
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
});

ext.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'yt-download') return;
  ext.tabs.sendMessage(tab.id, { type: 'YT_CONTEXT_DOWNLOAD', url: info.linkUrl });
});

function sanitize(name) {
  return (name || 'download')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'download';
}

ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'YT_DOWNLOAD') return false;

  const safeFile = sanitize(msg.filename.replace('YTGet/', ''));
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
