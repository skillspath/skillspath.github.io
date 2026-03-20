// SkillsPath background service worker
// Receives data from content scripts and persists it to chrome.storage.
// index.html reads it via the bridge.js content script (postMessage).

// In-memory store (also persisted to chrome.storage.local)
let store = { canvas: null, skillsbuild: null, lastUpdate: null };

// Restore persisted state on startup
chrome.storage.local.get(['canvas', 'skillsbuild', 'lastUpdate'], (saved) => {
  if (saved.canvas)      store.canvas      = saved.canvas;
  if (saved.skillsbuild) store.skillsbuild = saved.skillsbuild;
  if (saved.lastUpdate)  store.lastUpdate  = saved.lastUpdate;
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'canvas-data') {
    store.canvas = msg.data;
    store.lastUpdate = new Date().toISOString();
    persist();
    sendResponse({ ok: true });
  }

  if (msg.type === 'skillsbuild-data') {
    store.skillsbuild = msg.data;
    store.lastUpdate = new Date().toISOString();
    persist();
    sendResponse({ ok: true });
  }

  if (msg.type === 'get-status') {
    sendResponse({
      canvas:      !!store.canvas?.courses?.length,
      skillsbuild: !!(store.skillsbuild?.completedCourses?.length || store.skillsbuild?.credentials?.length),
      lastUpdate:  store.lastUpdate,
      canvasCourses:     store.canvas?.courses?.length || 0,
      sbCompleted:       store.skillsbuild?.completedCourses?.length || 0,
      sbCredentials:     store.skillsbuild?.credentials?.length || 0,
    });
  }

  return true; // keep channel open for async
});

function persist() {
  chrome.storage.local.set({
    canvas:      store.canvas,
    skillsbuild: store.skillsbuild,
    lastUpdate:  store.lastUpdate,
  });
}
