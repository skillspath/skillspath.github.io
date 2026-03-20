// SkillsPath — IBM SkillsBuild content script
// Runs on skills.yourlearning.ibm.com
// Makes API calls within the authenticated browser session — no tokens needed.

(function () {
  if (window._skillsPathSB) return;
  window._skillsPathSB = true;

  const BASE = window.location.origin; // https://skills.yourlearning.ibm.com

  async function tryGet(path) {
    try {
      const r = await fetch(BASE + path, { credentials: 'include' });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  // Extract the _cache_ui_domain param from URLs the page has already used.
  // We intercept window.fetch to capture it once, then make our own call.
  function interceptCacheParam() {
    return new Promise((resolve) => {
      // Check if the page already triggered a skills API call we can piggyback on.
      // We hook fetch briefly, capture the param, then restore.
      const orig = window.fetch;
      let found = null;

      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input?.url || '';
        if (!found && url.includes('yourlearning.ibm.com')) {
          try {
            const u = new URL(url, window.location.href);
            const domain = u.searchParams.get('_cache_ui_domain');
            if (domain) found = domain;
          } catch {}
        }
        return orig.apply(this, arguments);
      };

      // Give the page 3s to make a call, then restore and resolve
      setTimeout(() => {
        window.fetch = orig;
        resolve(found);
      }, 3000);
    });
  }

  async function collect() {
    // Run endpoint probes in parallel; each is optional.
    const [
      profile,
      activities,
      activityAlt,
      credentials,
    ] = await Promise.all([
      // Profile / user info
      tryGet('/api/v1/me'),

      // Completed learning activities (common SkillsBuild endpoint pattern)
      tryGet('/api/v1/learningactivities?status=COMPLETED&limit=200&sort=-completedTime'),

      // Alternative endpoint name used in some IBM Learn deployments
      tryGet('/api/v1/learningitems?progressState=COMPLETED&limit=200'),

      // Credentials/badges — no credential filter → all
      tryGet('/api/v3/skills/bestStatus?objectType=CREDENTIAL&detail=full&limit=999999'),
    ]);

    // Normalise completed courses from whichever endpoint responded
    const rawActivities = activities?.results || activities?.data || activities
      || activityAlt?.results || activityAlt?.data || activityAlt || [];

    const completedCourses = (Array.isArray(rawActivities) ? rawActivities : []).map(a => ({
      id:          a.id          || a.assetId    || a.learningActivityId || '',
      title:       a.title       || a.name       || a.assetTitle        || '',
      type:        a.type        || a.assetType  || '',
      completedAt: a.completedTime || a.completedAt || a.completionDate || null,
      score:       a.score       || null,
      duration:    a.duration    || null,
    })).filter(c => c.title);

    // Normalise credentials/badges
    const rawCreds = credentials?.items || credentials?.data || credentials || [];
    const credentialsArr = (Array.isArray(rawCreds) ? rawCreds : []).map(c => ({
      id:       c.credentialId   || c.id    || '',
      title:    c.credentialTitle || c.name || c.title || '',
      status:   c.status         || '',
      earnedAt: c.earnedDate     || c.earnedAt || null,
    })).filter(c => c.title);

    const p = profile || {};
    return {
      profile: {
        name:  p.name  || p.displayName || p.fullName || '',
        email: p.email || p.primaryEmail || '',
        id:    p.id    || p.userId      || '',
      },
      completedCourses,
      credentials: credentialsArr,
    };
  }

  collect()
    .then(data => chrome.runtime.sendMessage({ type: 'skillsbuild-data', data }))
    .catch(() => {});
})();
