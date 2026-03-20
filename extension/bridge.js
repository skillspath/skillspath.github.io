// SkillsPath — data bridge content script
// Injected into skillspath.github.io. Relays chrome.storage to the page via postMessage.
// The page cannot access chrome.storage directly; this content script can.

function buildHealth(stored) {
  return {
    hasCanvas:      !!(stored.canvas?.courses?.length),
    hasSkillsBuild: !!(stored.skillsbuild?.completedCourses?.length || stored.skillsbuild?.credentials?.length),
    canvasCourses:  stored.canvas?.courses?.length                   || 0,
    sbCompleted:    stored.skillsbuild?.completedCourses?.length      || 0,
    sbCredentials:  stored.skillsbuild?.credentials?.length           || 0,
    lastUpdate:     stored.lastUpdate      || null,
    lastCanvasHost: stored.lastCanvasHost  || null,
  };
}

const STORAGE_KEYS = ['canvas', 'skillsbuild', 'lastUpdate', 'lastCanvasHost'];

// Push data immediately on injection — don't wait for a request.
// This sidesteps timing races between page JS and content script setup.
chrome.storage.local.get(STORAGE_KEYS, (stored) => {
  window.postMessage({ type: 'sp-health', data: buildHealth(stored) }, '*');
});

// Also respond to explicit requests (used by the agent data fetch).
window.addEventListener('message', (event) => {
  if (event.data?.type === 'sp-get-data') {
    chrome.storage.local.get(STORAGE_KEYS, (stored) => {
      window.postMessage({ type: 'sp-data', data: stored }, '*');
    });
  }

  if (event.data?.type === 'sp-get-health') {
    chrome.storage.local.get(STORAGE_KEYS, (stored) => {
      window.postMessage({ type: 'sp-health', data: buildHealth(stored) }, '*');
    });
  }

  // Relay fetch requests through the background service worker (bypasses PNA)
  if (event.data?.type === 'sp-proxy-fetch') {
    const { id } = event.data;
    console.log('[bridge] sp-proxy-fetch received, connecting port:', 'sp-proxy-' + id);
    try {
      const port = chrome.runtime.connect({ name: 'sp-proxy-' + id });
      console.log('[bridge] port connected');
      port.onDisconnect.addListener(() => {
        console.log('[bridge] port disconnected — runtime error:', chrome.runtime.lastError?.message);
      });
      port.postMessage(event.data);
      port.onMessage.addListener((msg) => {
        console.log('[bridge] port message:', msg.type);
        window.postMessage({ ...msg, id }, '*');
      });
    } catch (e) {
      console.error('[bridge] connect failed:', e.message);
      window.postMessage({ type: 'sp-proxy-error', id, error: e.message }, '*');
    }
  }
});
