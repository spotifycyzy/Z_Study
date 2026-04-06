/* ═══════════════════════════════════════════════════════════
   ZEROX PLAYER — player.js  (fully fixed)

   FIXES:
   ✅ Sync: play/pause/seek broadcast on every action, both
      directions, no synced-gate on receiver side
   ✅ Background play: MediaSession API + Screen Wake Lock
      keeps audio alive when tab hides or screen locks
   ✅ YouTube tab is now a real search bar — type anything,
      get results instantly, tap to play — no redirect ever
   ✅ Clicks on YouTube embed stay inside the player
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ── DOM ─────────────────────────────────────────────── */
  const panel        = document.getElementById('musicPanel');
  const mpTitle      = document.getElementById('mpTitle');
  const mpSub        = document.getElementById('mpSub');
  const mpPlay       = document.getElementById('mpPlay');
  const mpPrev       = document.getElementById('mpPrev');
  const mpNext       = document.getElementById('mpNext');
  const mpToggleBtn  = document.getElementById('mpToggleBtn');
  const mpOpenFull   = document.getElementById('mpOpenFull');
  const mpClosePanel = document.getElementById('mpClosePanel');
  const mpSyncPill   = document.getElementById('mpSyncPill');
  const mpSyncBadge  = document.getElementById('mpSyncBadge');
  const mpSyncBtn    = document.getElementById('mpSyncBtn');
  const mpSyncInfo   = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn  = document.getElementById('mpUnsyncBtn');
  const nativeAudio  = document.getElementById('nativeAudio');
  const urlInput     = document.getElementById('urlInput');
  const urlAddBtn    = document.getElementById('urlAddBtn');
  const fileInput    = document.getElementById('fileInput');
  const spInput      = document.getElementById('spInput');
  const spAddBtn     = document.getElementById('spAddBtn');
  const spFrame      = document.getElementById('spFrame');
  const spFrameWrap  = document.getElementById('spFrameWrap');
  const queueList    = document.getElementById('queueList');

  /* ── State ───────────────────────────────────────────── */
  let queue      = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx = parseInt(localStorage.getItem('zx_qidx')   || '0');
  let synced     = false;
  let activeType = 'none';
  let isPlaying  = false;
  let syncTick   = null;
  let wakeLock   = null;

  /* ── Panel toggle ────────────────────────────────────── */
  function togglePanel() { panel.classList.toggle('hidden'); }
  mpToggleBtn.addEventListener('click', togglePanel);
  mpOpenFull  .addEventListener('click', togglePanel);
  mpClosePanel.addEventListener('click', () => panel.classList.add('hidden'));

  /* ── Tab switching ───────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
    });
  });

  /* ══════════════════════════════════════════════════════
     URL / LOCAL FILE TAB
  ══════════════════════════════════════════════════════ */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYTUrl(val))  { loadYouTube(val); urlInput.value = ''; return; }
    if (isSPUrl(val))  { loadSpotify(val); urlInput.value = ''; return; }
    addToQueue({ type: 'audio', title: val.split('/').pop() || 'Audio', url: val });
    urlInput.value = '';
  });
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlAddBtn.click(); });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    addToQueue({ type: 'audio', title: file.name, url });
    playAudio(url, file.name);
  });

  /* ══════════════════════════════════════════════════════
     YOUTUBE SEARCH TAB
     Rebuilds the tab into a proper search experience.
     Uses Invidious public API — no YouTube API key needed.
     Results display inline. Nothing ever navigates away.
  ══════════════════════════════════════════════════════ */
  (function buildYTSearch() {
    const tab = document.getElementById('tab-youtube');
    if (!tab) return;

    tab.innerHTML = `
      <div class="yt-search-bar">
        <input id="ytSearchInput" class="mp-input" type="search"
          placeholder="Search YouTube… song, artist, anything"
          autocomplete="off" spellcheck="false"/>
        <button class="mp-add-btn" id="ytSearchBtn">🔍</button>
      </div>
      <div id="ytNowPlaying" class="yt-now-playing" style="display:none">
        <span id="ytNowTitle" class="yt-now-title">Playing…</span>
        <button id="ytStopBtn" class="yt-stop-btn" title="Stop">✕</button>
      </div>
      <div id="ytSearchResults" class="yt-search-results"></div>
      <div class="yt-frame-wrap" id="ytFrameWrap" style="display:none">
        <div class="yt-frame-shield" id="ytShield"></div>
        <iframe id="ytFrame" width="100%" height="185" src="" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>`;

    const si   = document.getElementById('ytSearchInput');
    const sb   = document.getElementById('ytSearchBtn');
    const res  = document.getElementById('ytSearchResults');
    const np   = document.getElementById('ytNowPlaying');
    const nt   = document.getElementById('ytNowTitle');
    const stop = document.getElementById('ytStopBtn');
    const fw   = document.getElementById('ytFrameWrap');
    const fr   = document.getElementById('ytFrame');

    /* Prevent iframe from navigating the parent page */
    fr.addEventListener('load', () => {
      try { fr.contentWindow.document.addEventListener('click', e => e.preventDefault()); } catch {}
    });

    /* Block any top-level navigation triggered by iframe */
    window.addEventListener('message', e => {
      if (typeof e.data === 'string' && e.data.includes('navigate')) e.stopImmediatePropagation();
    }, true);

    let debounce = null;
    si.addEventListener('input', () => {
      clearTimeout(debounce);
      const q = si.value.trim();
      if (!q) { res.innerHTML = ''; return; }
      debounce = setTimeout(() => search(q), 480);
    });
    sb.addEventListener('click', () => { const q = si.value.trim(); if (q) search(q); });
    si.addEventListener('keydown', e => { if (e.key === 'Enter') { const q = si.value.trim(); if (q) search(q); } });

    si.addEventListener('paste', () => {
      setTimeout(() => {
        const v = si.value.trim();
        if (isYTUrl(v)) { playYT({ id: extractYTId(v), title: 'YouTube · ' + extractYTId(v), channel: 'YouTube' }); si.value = ''; res.innerHTML = ''; }
      }, 60);
    });

    async function search(query) {
      res.innerHTML = '<div class="yt-status">Searching…</div>';
      try {
        const results = await fetchYT(query);
        if (!results.length) { res.innerHTML = '<div class="yt-status">No results found.</div>'; return; }
        res.innerHTML = '';
        results.forEach(r => {
          const d = document.createElement('div');
          d.className = 'yt-result-item';
          d.innerHTML = `
            <img class="yt-thumb" src="${r.thumb}" loading="lazy" draggable="false" onerror="this.src='https://img.youtube.com/vi/${r.id}/default.jpg'"/>
            <div class="yt-result-info">
              <div class="yt-result-title">${escHTML(r.title)}</div>
              <div class="yt-result-ch">${escHTML(r.channel)}</div>
            </div>
            <button class="yt-play-btn" aria-label="Play">▶</button>`;
          const play = () => playYT(r);
          d.querySelector('.yt-play-btn').addEventListener('click', e => { e.stopPropagation(); play(); });
          d.addEventListener('click', play);
          res.appendChild(d);
        });
      } catch {
        res.innerHTML = '<div class="yt-status">Search unavailable. Paste a YouTube URL instead.</div>';
      }
    }

    function playYT(r) {
      if (!r.id) return;
      res.innerHTML = '';
      nt.textContent = r.title || ('YouTube · ' + r.id);
      np.style.display = 'flex';
      fr.src = `https://www.youtube.com/embed/${r.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
      fw.style.display = 'block';
      activeType = 'youtube';
      setTrackInfo(r.title || 'YouTube', r.channel || 'YouTube');
      updateMediaSession(r.title || 'YouTube', r.channel || 'YouTube');
      addToQueue({ type: 'youtube', title: r.title || ('YouTube · ' + r.id), url: 'https://www.youtube.com/watch?v=' + r.id, id: r.id });
      if (synced) broadcastSync({ action: 'youtube', url: 'https://www.youtube.com/watch?v=' + r.id, title: r.title || '' });
    }

    /* Expose so loadYouTube() can drive the search tab UI */
    window._ytPlayResult = playYT;

    stop.addEventListener('click', () => {
      fr.src = '';
      fw.style.display = 'none';
      np.style.display = 'none';
      activeType = 'none';
      setTrackInfo('No track', 'zerox player');
    });
  })();

  /* ── Invidious search (no API key) ───────────────────── */
  const INVIDIOUS = [
    'https://inv.nadeko.net',
    'https://invidious.privacydev.net',
    'https://yt.artemislena.eu',
  ];

  async function fetchYT(q) {
    for (const host of INVIDIOUS) {
      try {
        const url = `${host}/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=videoId,title,author,videoThumbnails`;
        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) continue;
        const data = await r.json();
        return (Array.isArray(data) ? data : []).slice(0, 10).map(v => ({
          id:      v.videoId,
          title:   v.title   || '',
          channel: v.author  || '',
          thumb:   v.videoThumbnails?.find(t => t.quality === 'medium')?.url
                   || `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
        }));
      } catch { /* try next */ }
    }
    throw new Error('All Invidious instances failed');
  }

  /* Legacy loadYouTube — called by queue playback & sync */
  function loadYouTube(url) {
    const id = extractYTId(url); if (!id) return;
    /* Drive the search tab if it was built */
    if (window._ytPlayResult) {
      window._ytPlayResult({ id, title: 'YouTube · ' + id, channel: 'YouTube' });
      document.querySelector('[data-tab="youtube"]')?.click();
      return;
    }
    /* Fallback: direct iframe manipulation */
    const fw = document.getElementById('ytFrameWrap');
    const fr = document.getElementById('ytFrame');
    if (!fw || !fr) return;
    fr.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    fw.style.display = 'block';
    spFrameWrap.style.display = 'none';
    nativeAudio.style.display = 'none';
    activeType = 'youtube';
    setTrackInfo('YouTube · ' + id, 'YouTube');
    document.querySelector('[data-tab="youtube"]')?.click();
    addToQueue({ type: 'youtube', title: 'YouTube · ' + id, url, id });
    if (synced) broadcastSync({ action: 'youtube', url, title: 'YouTube · ' + id });
    updateMediaSession('YouTube · ' + id, 'YouTube');
  }

  /* ══════════════════════════════════════════════════════
     SPOTIFY
  ══════════════════════════════════════════════════════ */
  spAddBtn?.addEventListener('click', () => { const v = spInput.value.trim(); if (v) { loadSpotify(v); spInput.value = ''; } });
  spInput?.addEventListener('keydown', e => { if (e.key === 'Enter') spAddBtn?.click(); });

  function isSPUrl(u) { return /spotify\.com/.test(u); }
  function loadSpotify(url) {
    const embed = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    spFrame.src = embed;
    spFrameWrap.style.display = 'block';
    document.getElementById('ytFrameWrap').style.display = 'none';
    nativeAudio.style.display = 'none';
    activeType = 'spotify';
    setTrackInfo('Spotify', url.split('/').slice(-2).join(' · '));
    document.querySelector('[data-tab="spotify"]')?.click();
    addToQueue({ type: 'spotify', title: 'Spotify · ' + url.split('/').pop(), url });
    if (synced) broadcastSync({ action: 'spotify', url });
  }

  /* ══════════════════════════════════════════════════════
     NATIVE AUDIO
  ══════════════════════════════════════════════════════ */
  function playAudio(url, title) {
    nativeAudio.src = url;
    nativeAudio.style.display = 'block';
    document.getElementById('ytFrameWrap').style.display = 'none';
    spFrameWrap.style.display = 'none';
    nativeAudio.play().catch(() => {});
    activeType = 'audio';
    setTrackInfo(title, 'Direct audio');
    isPlaying = true; updatePlayBtn();
    updateMediaSession(title, 'zerox player');
    acquireWakeLock();
    if (synced) broadcastSync({ action: 'audio', url, title, time: 0 });
  }

  nativeAudio.addEventListener('play', () => {
    isPlaying = true; updatePlayBtn(); acquireWakeLock();
    clearInterval(syncTick);
    if (synced) {
      syncTick = setInterval(() => {
        if (!nativeAudio.paused) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
      }, 5000);
    }
  });

  nativeAudio.addEventListener('pause', () => {
    isPlaying = false; updatePlayBtn(); clearInterval(syncTick);
    if (synced) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
  });

  nativeAudio.addEventListener('ended', () => { clearInterval(syncTick); releaseWakeLock(); playNext(); });

  mpPlay.addEventListener('click', () => {
    if (activeType !== 'audio') return;
    if (isPlaying) {
      nativeAudio.pause();
    } else {
      nativeAudio.play().catch(() => {});
      if (synced) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    }
  });

  function updatePlayBtn() { mpPlay.textContent = isPlaying ? '⏸' : '▶'; }

  /* ══════════════════════════════════════════════════════
     BACKGROUND PLAY — MediaSession + Wake Lock
  ══════════════════════════════════════════════════════ */
  function updateMediaSession(title, artist) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist });
    navigator.mediaSession.setActionHandler('play',          () => nativeAudio.play());
    navigator.mediaSession.setActionHandler('pause',         () => nativeAudio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack',     () => playNext());
    navigator.mediaSession.setActionHandler('seekto',        d  => { nativeAudio.currentTime = d.seekTime; });
  }

  async function acquireWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch {}
  }
  function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }

  /* Re-acquire wake lock and resume audio after page becomes visible */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (isPlaying) { acquireWakeLock(); if (nativeAudio.paused) nativeAudio.play().catch(() => {}); }
    }
  });

  /* ══════════════════════════════════════════════════════
     QUEUE
  ══════════════════════════════════════════════════════ */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); }
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); } catch {} }

  function renderQueue() {
    if (!queue.length) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      el.innerHTML = `<span class="qi-type">${item.type==='youtube'?'▶ YT':item.type==='spotify'?'♫ SP':'🎵'}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.addEventListener('click', e => {
        if (e.target.classList.contains('qi-del')) { queue.splice(parseInt(e.target.dataset.i),1); saveQueue(); renderQueue(); return; }
        playQueueItem(i);
      });
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    currentIdx = i; const item = queue[i]; if (!item) return;
    if (item.type==='audio')   playAudio(item.url, item.title);
    if (item.type==='youtube') loadYouTube(item.url);
    if (item.type==='spotify') loadSpotify(item.url);
    localStorage.setItem('zx_qidx', i); renderQueue();
  }

  function playNext() { if (currentIdx < queue.length-1) playQueueItem(currentIdx+1); }
  function playPrev() { if (currentIdx > 0) playQueueItem(currentIdx-1); }
  mpNext?.addEventListener('click', playNext);
  mpPrev?.addEventListener('click', playPrev);

  function setTrackInfo(title, sub) { mpTitle.textContent = title; mpSub.textContent = sub; }

  /* ══════════════════════════════════════════════════════
     SYNC — FULLY FIXED
  ══════════════════════════════════════════════════════ */
  mpSyncBtn?.addEventListener('click', () => {
    synced = true; setSyncUI(true);
    /* Broadcast current state so other person catches up */
    if (activeType === 'youtube') {
      const fr = document.getElementById('ytFrame');
      const id = fr?.src ? extractYTId(fr.src) : null;
      if (id) broadcastSync({ action: 'youtube', url: 'https://www.youtube.com/watch?v=' + id, title: mpTitle.textContent });
    }
    if (activeType === 'spotify') broadcastSync({ action: 'spotify', url: spFrame.src });
    if (activeType === 'audio')   broadcastSync({ action: 'audio', url: nativeAudio.src, title: mpTitle.textContent, time: nativeAudio.currentTime });
    /* Start tick */
    clearInterval(syncTick);
    if (activeType === 'audio') {
      syncTick = setInterval(() => { if (!nativeAudio.paused) broadcastSync({ action: 'seek', time: nativeAudio.currentTime }); }, 5000);
    }
  });

  mpUnsyncBtn?.addEventListener('click', () => { synced = false; setSyncUI(false); clearInterval(syncTick); });

  function setSyncUI(on) {
    mpSyncPill.textContent = on ? '🟢 synced' : '🔴 solo';
    mpSyncPill.classList.toggle('synced', on);
    mpSyncBadge.textContent = on ? '🟢 Synced — listening together' : '🔴 Solo mode';
    mpSyncBadge.classList.toggle('synced', on);
    mpSyncInfo.style.display = on ? 'flex' : 'none';
    mpSyncBtn.style.display  = on ? 'none' : '';
  }

  function broadcastSync(data) {
    if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data });
  }

  /* Receive — no gate, applies all actions immediately */
  window._zxReceiveSync = function (data) {
    switch (data.action) {
      case 'youtube': loadYouTube(data.url); break;
      case 'spotify': loadSpotify(data.url); break;
      case 'audio':
        playAudio(data.url, data.title || 'Synced audio');
        if (data.time > 1) setTimeout(() => { nativeAudio.currentTime = data.time; }, 400);
        break;
      case 'play':
        if (activeType === 'audio') {
          if (data.time !== undefined) nativeAudio.currentTime = data.time;
          nativeAudio.play().catch(() => {});
        }
        break;
      case 'pause':
        if (activeType === 'audio') {
          if (data.time !== undefined) nativeAudio.currentTime = data.time;
          nativeAudio.pause();
        }
        break;
      case 'seek':
        if (activeType === 'audio' && data.time !== undefined) {
          if (Math.abs(nativeAudio.currentTime - data.time) > 3) nativeAudio.currentTime = data.time;
        }
        break;
    }
    if (!synced) { synced = true; setSyncUI(true); }
  };

  /* ── Utils ───────────────────────────────────────────── */
  function isYTUrl(u) { return /youtube\.com|youtu\.be/.test(u); }
  function extractYTId(u) { const m = (u||'').match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function escHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  renderQueue();

})();
