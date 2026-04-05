/* ═══════════════════════════════════════════════════════════
   gesture.js — Draw Z to unlock chat
   FIX: gestureCanvas was stealing ALL touches from study site.
   Now it only intercepts gestures when overlapping the study
   site — regular taps/scrolls pass through normally.
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const canvas = document.getElementById('gestureCanvas');

  let drawing  = false;
  let points   = [];
  let gestureStarted = false;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Canvas is INVISIBLE and PASSTHROUGH by default ────
     pointer-events:none means study site gets all touches.
     We listen on the document for multi-point gesture detection
     instead — so study site still works normally.
  ────────────────────────────────────────────────────────── */
  canvas.style.pointerEvents = 'none';
  canvas.style.opacity       = '0';

  /* ── Detect Z gesture on the document level ─────────── */
  let docPoints = [];
  let docDrawing = false;
  let gestureTimer = null;

  document.addEventListener('touchstart', onTStart, { passive: true });
  document.addEventListener('touchmove',  onTMove,  { passive: true });
  document.addEventListener('touchend',   onTEnd,   { passive: true });

  // Also support mouse for desktop
  document.addEventListener('mousedown', e => {
    // Only start gesture detection if not clicking a button/input/link
    const tag = e.target.tagName;
    if (['INPUT','BUTTON','TEXTAREA','A','SELECT'].includes(tag)) return;
    if (e.target.closest('button,a,input,textarea,.subject-card,.chapter-item,.nav-links,.nav-search,.sticker-item,.sticker-toggle,.attach-btn,.send-btn,.voice-record-btn,.msg-bubble,.react-emoji,.ctx-item')) return;
    docDrawing = true;
    docPoints  = [{ x: e.clientX, y: e.clientY }];
  });
  document.addEventListener('mousemove', e => {
    if (!docDrawing) return;
    docPoints.push({ x: e.clientX, y: e.clientY });
  });
  document.addEventListener('mouseup', endDocDraw);

  function onTStart(e) {
    const t = e.touches[0];
    // Don't intercept touches on interactive elements
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (!el) return;
    if (el.closest('button,a,input,textarea,.subject-card,.sticker-item,.attach-btn,.send-btn,.voice-record-btn,.msg-bubble,.react-emoji,.ctx-item,.mp-btn,.mp-tab,.unlock-btn')) return;
    docDrawing = true;
    docPoints  = [{ x: t.clientX, y: t.clientY }];
  }

  function onTMove(e) {
    if (!docDrawing) return;
    const t = e.touches[0];
    docPoints.push({ x: t.clientX, y: t.clientY });
  }

  function onTEnd() {
    endDocDraw();
  }

  function endDocDraw() {
    if (!docDrawing) return;
    docDrawing = false;
    if (docPoints.length >= 6 && recogniseZ(docPoints)) {
      unlockChat();
    }
    docPoints = [];
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

  /* ── Fallback: tap bottom-right corner 5x ───────────── */
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
