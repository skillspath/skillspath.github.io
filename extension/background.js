// SkillsPath background service worker
// Receives data from content scripts and persists it to chrome.storage.
// index.html reads it via the bridge.js content script (postMessage).

// In-memory store (also persisted to chrome.storage.local)
let store = { canvas: null, skillsbuild: null, lastUpdate: null, lastCanvasHost: null };

// Restore persisted state on startup
chrome.storage.local.get(['canvas', 'skillsbuild', 'lastUpdate', 'lastCanvasHost'], (saved) => {
  if (saved.canvas)          store.canvas          = saved.canvas;
  if (saved.skillsbuild)     store.skillsbuild     = saved.skillsbuild;
  if (saved.lastUpdate)      store.lastUpdate      = saved.lastUpdate;
  if (saved.lastCanvasHost)  store.lastCanvasHost  = saved.lastCanvasHost;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'canvas-data') {
    store.canvas = msg.data;
    store.lastUpdate = new Date().toISOString();
    // Capture the Canvas host so the page can link users directly back to their school's Canvas
    if (sender?.tab?.url) {
      try { store.lastCanvasHost = new URL(_sender.tab.url).origin; } catch {}
    }
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
      lastCanvasHost:    store.lastCanvasHost || null,
    });
  }

  return true; // keep channel open for async
});

// ── Proxy relay ──────────────────────────────────────────────────────────────
// The page can't reach localhost from https:// (Chrome PNA). The background
// service worker can. Bridge connects a port; we fetch and stream chunks back.

chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith('sp-proxy')) return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'sp-proxy-fetch') return;
    try {
      const res = await fetch(msg.url, {
        method: msg.method || 'POST',
        headers: msg.headers || {},
        body: msg.body,
      });

      port.postMessage({ type: 'sp-proxy-status', status: res.status, ok: res.ok });

      if (!res.ok) {
        const text = await res.text();
        port.postMessage({ type: 'sp-proxy-error', error: text });
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        port.postMessage({ type: 'sp-proxy-chunk', chunk: dec.decode(value, { stream: true }) });
      }
      port.postMessage({ type: 'sp-proxy-done' });
    } catch (e) {
      port.postMessage({ type: 'sp-proxy-error', error: e.message });
    }
  });
});

function persist() {
  chrome.storage.local.set({
    canvas:         store.canvas,
    skillsbuild:    store.skillsbuild,
    lastUpdate:     store.lastUpdate,
    lastCanvasHost: store.lastCanvasHost,
  });
}
