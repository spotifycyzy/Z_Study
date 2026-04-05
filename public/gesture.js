/* ═══════════════════════════════════════════════════════════
   gesture.js — Invisible draw-to-unlock
   No visible trail. No glow. Completely hidden.
   Draw Z anywhere or tap bottom-right corner 5 times.
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const canvas = document.getElementById('gestureCanvas');
  // Canvas is fully invisible — no drawing, no trail
  canvas.style.opacity       = '0';
  canvas.style.pointerEvents = 'all';

  let drawing = false;
  let points  = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('pointerdown', e => {
    drawing = true;
    points  = [getPoint(e)];
  });

  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    e.preventDefault();
    points.push(getPoint(e));
  }, { passive: false });

  canvas.addEventListener('pointerup',     endDraw);
  canvas.addEventListener('pointercancel', endDraw);

  function endDraw() {
    if (!drawing) return;
    drawing = false;
    if (points.length >= 6 && recogniseZ(points)) unlockChat();
    points = [];
  }

  function getPoint(e) {
    return { x: e.clientX, y: e.clientY };
  }

  function recogniseZ(pts) {
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const w  = Math.max(...xs) - Math.min(...xs);
    const h  = Math.max(...ys) - Math.min(...ys);
    if (w < 40 || h < 30) return false;

    const n  = pts.length;
    const t1 = pts.slice(0, Math.floor(n / 3));
    const t2 = pts.slice(Math.floor(n / 3), Math.floor(2 * n / 3));
    const t3 = pts.slice(Math.floor(2 * n / 3));

    const d1 = netDir(t1);
    const d2 = netDir(t2);
    const d3 = netDir(t3);

    const firstRight = d1.dx > 0 && Math.abs(d1.dx) > Math.abs(d1.dy) * 0.4;
    const midDiag    = d2.dy > 0 && d2.dx < d2.dy * 0.8;
    const lastRight  = d3.dx > 0 && Math.abs(d3.dx) > Math.abs(d3.dy) * 0.4;

    return firstRight && midDiag && lastRight;
  }

  function netDir(pts) {
    if (pts.length < 2) return { dx: 0, dy: 0 };
    return {
      dx: pts[pts.length - 1].x - pts[0].x,
      dy: pts[pts.length - 1].y - pts[0].y,
    };
  }

  /* ── Fallback: tap bottom-right corner 5x fast ───────── */
  let taps = 0, tapTimer = null;
  document.addEventListener('pointerdown', e => {
    if (e.clientX > window.innerWidth - 80 && e.clientY > window.innerHeight - 80) {
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { taps = 0; }, 1500);
      if (taps >= 5) { taps = 0; unlockChat(); }
    }
  });

  function unlockChat() {
    if (window._chatUnlock) window._chatUnlock();
  }
  window._gestureUnlock = unlockChat;
})();
