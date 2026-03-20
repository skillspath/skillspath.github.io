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
});
