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
    const rawPlans = plans?.items || plans?.data || (Array.isArray(plans) ? plans : []);
    const rawTranscripts = transcripts?.items || transcripts?.data || (Array.isArray(transcripts) ? transcripts : []);

    const completedCourses = [...rawPlans, ...rawTranscripts]
      .filter(item => {
        const s = (item.status || item.completionStatus || '').toUpperCase();
        return s === 'COMPLETED' || s === 'PASSED';
      })
      .map(item => ({
        id:          item.lmsId        || item.id          || '',
        title:       item.title        || item.name        || item.assetTitle || '',
        completedAt: item.completedTime || item.completedAt || item.completionDate || null,
      }))
      .filter((c, i, arr) => c.title && arr.findIndex(x => x.id === c.id) === i); // dedupe

    const rawCreds = credentials?.items || credentials?.data || (Array.isArray(credentials) ? credentials : []);
    const credentialsArr = rawCreds
      .map(c => ({
        id:       c.credentialId    || c.id    || '',
        title:    c.credentialTitle || c.title || c.name || '',
        status:   c.status          || '',
        earnedAt: c.earnedDate      || c.earnedAt || null,
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
