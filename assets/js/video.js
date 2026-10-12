/* "How It Works" video player, shared by the Lab page and case studies.
   Any button with data-video="path/to/clip.mp4" plays that clip in a
   lightbox. An empty data-video leaves the button greyed out. */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var box = null, lastBtn = null;

  function close() {
    if (!box) return;
    box.querySelector('video').pause();
    box.remove(); box = null;
    document.removeEventListener('keydown', onKey);
    if (lastBtn) lastBtn.focus();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function open(btn) {
    lastBtn = btn;
    box = document.createElement('div');
    box.className = 'video-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', (btn.getAttribute('data-title') || 'Video') + ': how it works');
    box.innerHTML = '<div class="video-frame paper">' +
      '<button class="video-close" type="button" aria-label="Close video">×</button>' +
      '<video src="' + esc(btn.getAttribute('data-video')) + '" controls autoplay muted playsinline></video></div>';
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('.video-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
    box.querySelector('.video-close').focus();
  }

  // Grey out buttons that don't have a video yet.
  function mark() {
    document.querySelectorAll('[data-video]').forEach(function (b) {
      if (!b.getAttribute('data-video')) { b.setAttribute('aria-disabled', 'true'); b.title = 'Video coming soon'; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-video]');
    if (!btn) return;
    e.preventDefault();
    if (btn.getAttribute('data-video')) open(btn);
  });
})();
