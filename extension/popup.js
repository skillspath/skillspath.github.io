function set(id, cls, text) {
  document.getElementById('dot-' + id).className = 'dot ' + cls;
  document.getElementById('detail-' + id).textContent = text;
}

chrome.runtime.sendMessage({ type: 'get-status' }, (s) => {
  if (!s) return;
  set('canvas', s.canvas ? 'ok' : 'warn',
    s.canvas ? `${s.canvasCourses} courses loaded` : 'Open Canvas to sync');
  set('sb', s.skillsbuild ? 'ok' : 'warn',
    s.skillsbuild
      ? `${s.sbCompleted} courses · ${s.sbCredentials} credentials`
      : 'Open SkillsBuild to sync');

  if (s.canvas || s.skillsbuild) {
    const cta = document.getElementById('cta');
    cta.style.display = 'flex';
  }
});
