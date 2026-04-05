/* ═══════════════════════════════════════════════════════════
   gesture.js — Draw Z to open hidden chat
   KEY FIX: canvas is pointer-events:none at all times.
   The canvas was previously pointer-events:all — an invisible
   layer that blocked every single tap on the study site.
   Gesture detection now runs on document listeners while
   explicitly skipping interactive elements.
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const canvas = document.getElementById('gestureCanvas');

  /* CANVAS IS ALWAYS PASSTHROUGH — never blocks touches */
  canvas.style.opacity       = '0';
  canvas.style.pointerEvents = 'none'; /* ← THE FIX */

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* Elements that must NEVER be intercepted by gesture detection */
  const PASSTHROUGH =
    'a, button, input, textarea, select, label, ' +
    '.subject-card, .ch-card, .recent-item, .nav-links, ' +
    '.nav-search, .sticker-item, .attach-btn, .send-btn, ' +
    '.voice-record-btn, .msg-bubble, .react-emoji, .ctx-item, ' +
    '.mp-btn, .mp-tab, .mp-add-btn, .unlock-btn, ' +
    '.wallpaper-thumb, .theme-swatch, .icon-btn, ' +
    '.subject-tag, .notes-back, .notes-bookmark';

  function isInteractive(el) {
    if (!el || !el.closest) return false;
    return !!el.closest(PASSTHROUGH);
  }

  let drawing = false, pts = [];

  /* Touch */
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    if (isInteractive(document.elementFromPoint(t.clientX, t.clientY))) return;
    drawing = true; pts = [{ x: t.clientX, y: t.clientY }];
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!drawing) return;
    const t = e.touches[0]; pts.push({ x: t.clientX, y: t.clientY });
  }, { passive: true });

  document.addEventListener('touchend',   finish, { passive: true });
  document.addEventListener('touchcancel',finish, { passive: true });

  /* Mouse (desktop) */
  document.addEventListener('mousedown', e => {
    if (isInteractive(e.target)) return;
    drawing = true; pts = [{ x: e.clientX, y: e.clientY }];
  });
  document.addEventListener('mousemove', e => {
    if (!drawing) return; pts.push({ x: e.clientX, y: e.clientY });
  });
  document.addEventListener('mouseup', finish);

  function finish() {
    if (!drawing) return;
    drawing = false;
    if (pts.length >= 8 && recogniseZ(pts)) unlockChat();
    pts = [];
  }

  function recogniseZ(pts) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    if (w < 40 || h < 30) return false;
    const n  = pts.length;
    const d1 = netDir(pts.slice(0, ~~(n/3)));
    const d2 = netDir(pts.slice(~~(n/3), ~~(2*n/3)));
    const d3 = netDir(pts.slice(~~(2*n/3)));
    return d1.dx > 0 && Math.abs(d1.dx) > Math.abs(d1.dy) * 0.4
        && d2.dy > 0 && d2.dx < d2.dy * 0.8
        && d3.dx > 0 && Math.abs(d3.dx) > Math.abs(d3.dy) * 0.4;
  }

  function netDir(pts) {
    if (pts.length < 2) return { dx: 0, dy: 0 };
    return { dx: pts[pts.length-1].x - pts[0].x, dy: pts[pts.length-1].y - pts[0].y };
  }

  /* Fallback: tap bottom-right corner 5x within 1.5s */
  let taps = 0, tapTimer = null;
  document.addEventListener('pointerdown', e => {
    if (e.clientX > window.innerWidth - 80 && e.clientY > window.innerHeight - 80) {
      taps++; clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { taps = 0; }, 1500);
      if (taps >= 5) { taps = 0; unlockChat(); }
    }
  });

  function unlockChat() { if (window._chatUnlock) window._chatUnlock(); }
  window._gestureUnlock = unlockChat;
})();
