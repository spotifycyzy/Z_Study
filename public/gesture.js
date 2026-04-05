/* ═══════════════════════════════════════════════════════════
   gesture.js — Draw Z anywhere to open hidden chat
   Canvas is NEVER in the touch path — study site fully works.
   Gesture detected by listening on document, skipping
   all interactive elements.
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* Canvas is purely visual (unused) — keep pointer-events OFF */
  const canvas = document.getElementById('gestureCanvas');
  canvas.style.opacity       = '0';
  canvas.style.pointerEvents = 'none';
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  /* ── Interactive elements we must NOT intercept ─────── */
  const SKIP = 'button,a,input,textarea,select,' +
    '.subject-card,.chapter-item,.nav-links,.sticker-item,' +
    '.attach-btn,.send-btn,.voice-record-btn,.msg-bubble,' +
    '.react-emoji,.ctx-item,.mp-btn,.mp-tab,.unlock-btn,' +
    '.wallpaper-thumb,.theme-swatch,.icon-btn,.mp-add-btn';

  let pts = [], drawing = false;

  function isInteractive(el) {
    return el && el.closest && !!el.closest(SKIP);
  }

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

  document.addEventListener('touchend', finish, { passive: true });

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
    if (pts.length >= 8 && isZ(pts)) unlockChat();
    pts = [];
  }

  function isZ(pts) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    if (w < 40 || h < 30) return false;
    const n  = pts.length;
    const d1 = dir(pts.slice(0, ~~(n/3)));
    const d2 = dir(pts.slice(~~(n/3), ~~(2*n/3)));
    const d3 = dir(pts.slice(~~(2*n/3)));
    return d1.dx > 0 && Math.abs(d1.dx) > Math.abs(d1.dy) * 0.4
        && d2.dy > 0 && d2.dx < d2.dy * 0.8
        && d3.dx > 0 && Math.abs(d3.dx) > Math.abs(d3.dy) * 0.4;
  }

  function dir(pts) {
    if (pts.length < 2) return { dx: 0, dy: 0 };
    return { dx: pts[pts.length-1].x - pts[0].x, dy: pts[pts.length-1].y - pts[0].y };
  }

  /* Fallback: tap bottom-right corner 5× within 1.5s */
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
