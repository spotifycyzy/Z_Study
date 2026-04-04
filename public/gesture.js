/* ═══════════════════════════════════════════════════════════
   gesture.js — Draw-to-unlock
   Detects the configured letter/shape drawn anywhere on screen.
   Currently supports: Z, S, L, U, heart
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const canvas  = document.getElementById('gestureCanvas');
  const ctx     = canvas.getContext('2d');
  const gesture = (ZEROX_CONFIG.unlockGesture || 'Z').toUpperCase();

  let drawing   = false;
  let points    = [];
  let trailDots = [];
  let lockTimer = null;

  /* ── Resize canvas to fill viewport ─────────────────── */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Enable gesture detection on long-press (600ms) ─── */
  let holdTimer = null;

  function onPointerDown(e) {
    holdTimer = setTimeout(() => {
      canvas.classList.add('active');
      startDraw(e);
    }, 600);
  }

  function onPointerUp() {
    clearTimeout(holdTimer);
    if (drawing) endDraw();
  }

  function startDraw(e) {
    drawing = true;
    points  = [];
    const pt = getPoint(e);
    points.push(pt);
    spawnTrail(pt);
  }

  function onPointerMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const pt = getPoint(e);
    points.push(pt);
    spawnTrail(pt);

    // Draw faint trail on canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = 'rgba(232,67,106,0.55)';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.shadowColor = '#E8436A';
      ctx.shadowBlur  = 10;
      ctx.stroke();
    }
  }

  function endDraw() {
    drawing = false;
    canvas.classList.remove('active');

    const recognised = recognise(points, gesture);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (recognised) {
      // Flash success
      ctx.fillStyle = 'rgba(232,67,106,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 400);
      unlockChat();
    }
    points = [];
  }

  /* ── Pointer helpers ─────────────────────────────────── */
  function getPoint(e) {
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX, y: src.clientY };
  }

  canvas.addEventListener('pointerdown',  onPointerDown);
  canvas.addEventListener('pointermove',  onPointerMove, { passive: false });
  canvas.addEventListener('pointerup',    onPointerUp);
  canvas.addEventListener('pointercancel',onPointerUp);

  /* ── Spawn glowing trail dots ────────────────────────── */
  function spawnTrail(pt) {
    const dot = document.createElement('div');
    dot.className = 'gesture-trail';
    const sz = 6 + Math.random() * 6;
    dot.style.cssText = `width:${sz}px;height:${sz}px;left:${pt.x}px;top:${pt.y}px;`;
    document.body.appendChild(dot);
    trailDots.push(dot);
    setTimeout(() => { dot.style.opacity = '0'; setTimeout(() => dot.remove(), 300); }, 200);
  }

  /* ══════════════════════════════════════════════════════
     GESTURE RECOGNISER
     Converts pointer path into direction vectors and matches
     against known letter shapes.
  ══════════════════════════════════════════════════════ */
  function recognise(pts, letter) {
    if (pts.length < 8) return false;

    // Resample to 16 evenly-spaced points
    const sampled = resample(pts, 16);
    const dirs    = directions(sampled); // array of 'R','L','U','D','UR','UL','DR','DL'

    switch (letter) {
      case 'Z': return matchZ(dirs);
      case 'S': return matchS(dirs);
      case 'L': return matchL(dirs);
      case 'U': return matchU(dirs);
      default:  return matchZ(dirs);
    }
  }

  /* Z: right → down-left → right */
  function matchZ(dirs) {
    const str = dirs.join('');
    return /^R{1,}[DL]{1,}R{1,}/.test(str) ||
           /R.*DR.*R/.test(str);
  }
  /* S: right-down curve, then right-up curve */
  function matchS(dirs) {
    const str = dirs.join('');
    return /R.*D.*L.*D.*R/.test(str);
  }
  /* L: down then right */
  function matchL(dirs) {
    const str = dirs.join('');
    return /^D+R+$/.test(str);
  }
  /* U: down, then up */
  function matchU(dirs) {
    const str = dirs.join('');
    return /^D+U+$/.test(str) || /D.*U/.test(str);
  }

  function resample(pts, n) {
    const total = pathLength(pts);
    const step  = total / (n - 1);
    const result = [pts[0]];
    let   accum  = 0;
    let   i      = 1;
    while (result.length < n && i < pts.length) {
      const d = dist(pts[i - 1], pts[i]);
      if (accum + d >= step) {
        const t = (step - accum) / d;
        const pt = {
          x: pts[i-1].x + t * (pts[i].x - pts[i-1].x),
          y: pts[i-1].y + t * (pts[i].y - pts[i-1].y),
        };
        result.push(pt);
        pts = [pt, ...pts.slice(i)];
        i = 1; accum = 0;
      } else {
        accum += d; i++;
      }
    }
    while (result.length < n) result.push(pts[pts.length - 1]);
    return result;
  }

  function directions(pts) {
    const dirs = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i-1].x;
      const dy = pts[i].y - pts[i-1].y;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      // Quantise to 8 directions
      if      (ang > -22.5  && ang <=  22.5)  dirs.push('R');
      else if (ang >  22.5  && ang <=  67.5)  dirs.push('DR');
      else if (ang >  67.5  && ang <= 112.5)  dirs.push('D');
      else if (ang > 112.5  && ang <= 157.5)  dirs.push('DL');
      else if (ang >  157.5 || ang <= -157.5) dirs.push('L');
      else if (ang > -157.5 && ang <= -112.5) dirs.push('UL');
      else if (ang > -112.5 && ang <=  -67.5) dirs.push('U');
      else if (ang >  -67.5 && ang <=  -22.5) dirs.push('UR');
    }
    // Collapse consecutive duplicates
    return dirs.filter((d, i) => i === 0 || d !== dirs[i-1]);
  }

  function pathLength(pts) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += dist(pts[i-1], pts[i]);
    return len;
  }
  function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

  /* ── Expose unlock trigger ───────────────────────────── */
  window._gestureUnlock = unlockChat;

  function unlockChat() {
    if (window._chatUnlock) window._chatUnlock();
  }

})();
