// SkillsPath — data bridge content script
// Injected into index.html. Relays chrome.storage reads to the page via postMessage.
// The page cannot access chrome.storage directly; this content script can.

window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data?.type === 'sp-get-data') {
    chrome.storage.local.get(['canvas', 'skillsbuild', 'lastUpdate'], (stored) => {
      window.postMessage({ type: 'sp-data', data: stored }, '*');
    });
  }

  if (event.data?.type === 'sp-get-health') {
    chrome.storage.local.get(['canvas', 'skillsbuild', 'lastUpdate'], (stored) => {
      window.postMessage({
        type: 'sp-health',
        data: {
          hasCanvas:      !!(stored.canvas?.courses?.length),
          hasSkillsBuild: !!(stored.skillsbuild?.completedCourses?.length || stored.skillsbuild?.credentials?.length),
          canvasCourses:  stored.canvas?.courses?.length                   || 0,
          sbCompleted:    stored.skillsbuild?.completedCourses?.length      || 0,
          sbCredentials:  stored.skillsbuild?.credentials?.length           || 0,
          lastUpdate:     stored.lastUpdate || null,
        },
      }, '*');
    });
  }
});
