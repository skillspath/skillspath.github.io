// SkillsPath — Canvas content script
// Collects course history and profile, sends to background.

(function () {
  if (window._skillsPathCanvas) return;
  window._skillsPathCanvas = true;

  const BASE = '/api/v1';

  async function get(path) {
    const r = await fetch(BASE + path, { credentials: 'include' });
    if (!r.ok) throw new Error(`${r.status} ${path}`);
    return r.json();
  }

  async function getPaginated(path, max = 200) {
    const results = [];
    let url = BASE + path;
    for (let page = 0; url && results.length < max && page < 10; page++) {
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) break;
      const data = await r.json();
      if (Array.isArray(data)) results.push(...data);
      url = nextLink(r.headers.get('Link') || '');
    }
    return results.slice(0, max);
  }

  function nextLink(header) {
    for (const part of header.split(',')) {
      const [urlPart, relPart] = part.split(';');
      if (relPart?.trim() === 'rel="next"') return urlPart.trim().replace(/[<>]/g, '');
    }
    return null;
  }

  async function collect() {
    const [profile, active, completed] = await Promise.allSettled([
      get('/users/self/profile'),
      getPaginated('/courses?enrollment_state=active&include[]=total_scores&include[]=term&per_page=100'),
      getPaginated('/courses?enrollment_state=completed&include[]=total_scores&per_page=100'),
    ]);

    const courses = [];
    const grades = {};
    const seen = new Set();

    for (const raw of [
      ...(active.value || []),
      ...(completed.value || []),
    ]) {
      if (seen.has(raw.id)) continue;
      seen.add(raw.id);

      courses.push({
        id: String(raw.id),
        name: raw.name,
        course_code: raw.course_code,
        workflow_state: raw.workflow_state,
        term: raw.term?.name || null,
      });

      // Grade lives in the enrollments array when include[]=total_scores
      const enrollment = (raw.enrollments || []).find(e => e.type === 'student');
      if (enrollment) {
        grades[String(raw.id)] = {
          currentGrade: enrollment.computed_current_grade || null,
          currentScore: enrollment.computed_current_score || null,
          finalGrade:   enrollment.computed_final_grade   || null,
          finalScore:   enrollment.computed_final_score   || null,
        };
      }
    }

    const p = profile.value || {};
    return {
      userProfile: {
        name:          p.name          || '',
        short_name:    p.short_name    || '',
        primary_email: p.primary_email || '',
        bio:           p.bio           || '',
      },
      courses,
      grades,
    };
  }

  collect()
    .then(data => chrome.runtime.sendMessage({ type: 'canvas-data', data }))
    .catch(() => {}); // fail silently if not on a real Canvas instance
})();
