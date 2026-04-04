/* ═══════════════════════════════════════════════════════════
   gesture.js — Draw-to-unlock (simplified & reliable)
   Just draw Z anywhere on screen — no hold needed.
   Also: tap the bottom-right corner 5 times as fallback.
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const canvas = document.getElementById('gestureCanvas');
  const ctx    = canvas.getContext('2d');

  let drawing  = false;
  let points   = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Always active — no hold needed
  canvas.style.pointerEvents = 'all';

  canvas.addEventListener('pointerdown', e => {
    drawing = true;
    points  = [];
    points.push(getPoint(e));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    e.preventDefault();
    const pt = getPoint(e);
    points.push(pt);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = 'rgba(232,67,106,0.7)';
      ctx.lineWidth   = 4;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.shadowColor = '#E8436A';
      ctx.shadowBlur  = 14;
      ctx.stroke();
    }
  }, { passive: false });

  canvas.addEventListener('pointerup',     endDraw);
  canvas.addEventListener('pointercancel', endDraw);

  function endDraw() {
    if (!drawing) return;
    drawing = false;
    const recognised = points.length >= 6 && recogniseZ(points);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (recognised) unlockChat();
    points = [];
  }

  function getPoint(e) {
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX, y: src.clientY };
  }

  function recogniseZ(pts) {
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const w  = Math.max(...xs) - Math.min(...xs);
    const h  = Math.max(...ys) - Math.min(...ys);
    if (w < 40 || h < 30) return false;

    const t1 = pts.slice(0, Math.floor(pts.length / 3));
    const t2 = pts.slice(Math.floor(pts.length / 3), Math.floor(2 * pts.length / 3));
    const t3 = pts.slice(Math.floor(2 * pts.length / 3));

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
    return { dx: pts[pts.length-1].x - pts[0].x, dy: pts[pts.length-1].y - pts[0].y };
  }

  /* ── Fallback: tap bottom-right corner 5 times ───────── */
  let cornerTaps  = 0;
  let cornerTimer = null;

  document.addEventListener('pointerdown', e => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (e.clientX > vw - 80 && e.clientY > vh - 80) {
      cornerTaps++;
      clearTimeout(cornerTimer);
      cornerTimer = setTimeout(() => { cornerTaps = 0; }, 1500);
      if (cornerTaps >= 5) { cornerTaps = 0; unlockChat(); }
    }
  });

  function unlockChat() {
    if (window._chatUnlock) window._chatUnlock();
  }

  window._gestureUnlock = unlockChat;
})();
