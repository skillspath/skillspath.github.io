// SkillsPath — IBM SkillsBuild content script
// JWT lives in sessionStorage.YL_JWT_VALUE — use it as Bearer token.

(function () {
  if (window._skillsPathSB) return;
  window._skillsPathSB = true;

  const BASE = window.location.origin;

  function getJwt() {
    return sessionStorage.getItem('YL_JWT_VALUE');
  }

  async function get(path) {
    const jwt = getJwt();
    if (!jwt) return null;
    try {
      const r = await fetch(BASE + path, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${jwt}` },
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async function collect() {
    // Wait briefly for sessionStorage to be populated if page is still initializing
    if (!getJwt()) {
      await new Promise(r => setTimeout(r, 2000));
    }
    if (!getJwt()) return null;

    const [plans, transcripts, credentials] = await Promise.all([
      // All learning plans (shows what the user is enrolled in / completed)
      get('/api/v3/skills/userPlans?status=all&limit=200'),

      // Transcripts with completion status
      get('/api/v3/skills/transcriptsWithBestStatus?limit=200&detail=full'),

      // Earned credentials / badges
      get('/api/v3/skills/bestStatus?objectType=CREDENTIAL&detail=full&limit=999999'),
    ]);

    // Normalise completed courses from whichever endpoint responded
    const rawTranscripts = transcripts?.data?.transcriptRecords || transcripts?.rawTranscripts || transcripts?.items || (Array.isArray(transcripts) ? transcripts : []);
    const rawPlans = plans?.data?.transcriptRecords || plans?.items || (Array.isArray(plans) ? plans : []);

    const completedStatuses = new Set(['COMPLETED', 'PASSED', 'COMPLETE', 'SUCCESSFUL']);

    const completedCourses = [...(Array.isArray(rawTranscripts) ? rawTranscripts : []), ...(Array.isArray(rawPlans) ? rawPlans : [])]
      .filter(Boolean)
      .filter(item => completedStatuses.has(String(item.learnerTranscriptStatus || item.status || item.completionStatus || '').toUpperCase()))
      .map(item => ({
        id:          item.learningActivityID || item.ID || item.id || '',
        title:       item.learningActivityTitle || item.title || item.name || '',
        completedAt: item.learningCompletedDate || item.completedDate || item.completedTime || null,
      }))
      .filter(c => c.title)
      .filter((c, i, arr) => arr.findIndex(x => (x.id || x.title) === (c.id || c.title)) === i); // dedupe

    const rawCreds =
      credentials?.data?.transcriptRecords ||
      credentials?.rawTranscripts ||
      credentials?.items ||
      (Array.isArray(credentials?.data) ? credentials.data : []) ||
      (Array.isArray(credentials) ? credentials : []);

    const credentialsArr = rawCreds
      .filter(Boolean)
      .map(c => ({
        id:       c.credentialId    || c.id    || '',
        title:    c.credentialTitle || c.title || c.name || '',
        status:   c.status          || c.learnerTranscriptStatus || '',
        earnedAt: c.earnedDate      || c.earnedAt || c.completedDate || null,
      }))
      .filter(c => c.title);

    return {
      profile: { jwt: '✓' }, // don't send the actual JWT out of the tab
      completedCourses,
      credentials: credentialsArr,
    };
  }

  collect().then(data => {
    if (data) chrome.runtime.sendMessage({ type: 'skillsbuild-data', data });
  });
})();
