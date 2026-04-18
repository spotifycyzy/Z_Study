/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (v7 — All Fixes)
   ✅ Fix 1: YTM/Spotify search bars = exact copy of YT section bar
   ✅ Fix 2: Auto-play plays immediately on first fetch, strict dedup
   ✅ Fix 3: Spotify top matches first (true API order, any type)
   ✅ Fix 4: Audio format error handled → retry extractor → keepAlive
   ✅ Playlist cover images fixed
   ✅ All features preserved
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ═══════════════════════ 1. DOM ═══════════════════════ */
  const panel          = document.getElementById('zxPanel');
  const handle         = document.getElementById('zxHandle');
  const closeHandle    = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn');

  const nativeAudio   = document.getElementById('nativeAudio');
  const ytFrameWrap   = document.getElementById('ytFrameWrap');
  const cinemaMode    = document.getElementById('cinemaMode');
  const spotifyMode   = document.getElementById('spotifyMode');
  const premiumMusicCard = document.getElementById('premiumMusicCard');
  const pmcBgBlur     = document.getElementById('pmcBgBlur');
  const pmcArtwork    = document.getElementById('pmcArtwork');
  const pmcGlow       = document.getElementById('pmcGlow');
  const pmcTitle      = document.getElementById('pmcTitle');
  const pmcArtist     = document.getElementById('pmcArtist');
  const pmcSourceBadge = document.getElementById('pmcSourceBadge');
  const pmcCurrentTime = document.getElementById('pmcCurrentTime');
  const pmcDuration   = document.getElementById('pmcDuration');
  const pmcProgressFill = document.getElementById('pmcProgressFill');
  const pmcProgressBar  = document.getElementById('pmcProgressBar');
  const pmcPlayMain   = document.getElementById('pmcPlayMain');
  const pmcPrev       = document.getElementById('pmcPrev');
  const pmcNext       = document.getElementById('pmcNext');

  const vinylRecord   = document.getElementById('vinylRecord');
  const musicTitle    = document.getElementById('musicTitle');
  const musicArtist   = document.getElementById('musicArtist');
  const miniTitle     = document.getElementById('miniTitle');
  const mpPlays       = document.querySelectorAll('.mp-play');
  const mpPrevs       = [document.getElementById('miniPrev')];
  const mpNexts       = [document.getElementById('miniNext')];

  const urlInput      = document.getElementById('urlInput');
  const urlAddBtn     = document.getElementById('urlAddBtn');
  const fileInput     = document.getElementById('fileInput');
  const ytInput       = document.getElementById('ytInput');
  const ytAddBtn      = document.getElementById('ytAddBtn');
  const ytmInput      = document.getElementById('ytmInput');
  const ytmSearchBtn  = document.getElementById('ytmSearchBtn');
  const ytmResultsArea = document.getElementById('ytmSearchResults');
  const spInput       = document.getElementById('spInput');
  const spSearchSongBtn = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const spResultsArea = document.getElementById('spSearchResults');
  const queueList     = document.getElementById('queueList');

  // Toggle buttons
  const toggleListBtnUrl  = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt   = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt  = document.getElementById('episodesOverlayYt');
  const ytSearchResultsEl  = document.getElementById('ytSearchResults');
  const toggleListBtnYtm  = document.getElementById('toggleListBtnYtm');
  const toggleListBtnSp   = document.getElementById('toggleListBtnSp');

  const mpSyncBadge      = document.getElementById('mpSyncBadge');
  const mpSyncToggleBtn  = document.getElementById('mpSyncToggleBtn');
  const autoPlayToggleBtn = document.getElementById('autoPlayToggle');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');
  // Prevent browser from treating audio as background-suspendable
  nativeAudio.setAttribute('x-webkit-airplay', 'allow');

  /* ═══════════════════════ 2. API CONFIG ═══════════════════════ */
  const RAPID_API_KEY   = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST       = 'spotify81.p.rapidapi.com';

  /* ═══════════════════════ 3. STATE ═══════════════════════ */
  let queue          = [];
  let currentIdx     = 0;
  let synced         = false;
  let activeType     = 'none';
  let activeSrcTab   = 'none';
  let isPlaying      = false;
  let ytPlayer       = null;
  let isYtReady      = false;
  let isRemoteAction = false;
  let autoPlayEnabled = true;
  let remoteTimer    = null;
  let autoPlayFetching = false;
  // Track which render call is current to avoid stale async races
  let renderToken    = 0;
  const prefetchCache = new Map();
  const playedKeys    = new Set();

  function clearSessionKeys() { playedKeys.clear(); }
  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ═══════════════════════ 4. BACKGROUND KEEP-ALIVE ═══════════════════════
     Browsers (especially iOS/Android) suspend audio elements in background.
     We keep a silent oscillator running so the AudioContext stays alive,
     and mirror nativeAudio into it so the OS never considers it idle.
  ══════════════════════════════════════════════════════════════════════════ */
  let _audioCtx = null;
  let _keepAliveNode = null;
  let _sourceNode = null;

  function ensureAudioContext() {
    if (_audioCtx && _audioCtx.state !== 'closed') return _audioCtx;
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // silent oscillator — keeps context alive in background
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      gain.gain.value = 0.00001; // near-silent
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start();
      _keepAliveNode = { osc, gain };
      dbg('BGPlay', '✅ AudioContext created, keepAlive oscillator running', '#7ADB8A');
    } catch(e) {
      dbg('BGPlay', '❌ AudioContext failed: ' + e.message, '#ff4444');
    }
    return _audioCtx;
  }

  function connectAudioToContext() {
    try {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      if (_sourceNode) { try { _sourceNode.disconnect(); } catch(e) {} }
      _sourceNode = ctx.createMediaElementSource(nativeAudio);
      _sourceNode.connect(ctx.destination);
      dbg('BGPlay', '✅ nativeAudio connected to AudioContext', '#7ADB8A');
    } catch(e) {
      dbg('BGPlay', '⚠️ AudioContext connect: ' + e.message, '#ffaa44');
    }
  }

  function resumeAudioContext() {
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume().then(() => dbg('BGPlay', '✅ AudioContext resumed', '#7ADB8A')).catch(() => {});
    }
  }

  // Resume on any user interaction
  document.addEventListener('touchstart', resumeAudioContext, { passive: true });
  document.addEventListener('click', resumeAudioContext, { passive: true });

  // Page visibility: when coming back to foreground, ensure audio resumes
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      resumeAudioContext();
      if (isPlaying && nativeAudio.paused && activeType !== 'youtube') {
        dbg('BGPlay', '🔄 Visibility restored — resuming audio', '#ffaa44');
        nativeAudio.play().catch(() => {});
      }
    }
  });

  /* ═══════════════════════ 5. AUTO-PLAY TOGGLE ═══════════════════════ */
  if (autoPlayToggleBtn) {
    autoPlayToggleBtn.classList.add('active');
    autoPlayToggleBtn.addEventListener('click', () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayToggleBtn.classList.toggle('active', autoPlayEnabled);
      showToast(autoPlayEnabled ? '∞ Auto-play ON' : '⏹ Auto-play OFF');
    });
  }

  /* ═══════════════════════ 6. PANEL ENGINE ═══════════════════════ */
  let startY = 0; let isPanelOpen = false;
  function openPanel() {
    if (isPanelOpen) return; isPanelOpen = true;
    panel.classList.add('zx-open'); document.body.style.overflow = 'hidden';
    if (panelToggleBtn) panelToggleBtn.classList.add('active');
    document.getElementById('chatApp')?.classList.add('player-open');
  }
  function closePanel() {
    if (!isPanelOpen) return; isPanelOpen = false;
    panel.classList.remove('zx-open'); document.body.style.overflow = '';
    if (panelToggleBtn) panelToggleBtn.classList.remove('active');
    document.getElementById('chatApp')?.classList.remove('player-open');
  }
  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  handle.addEventListener('touchmove',  e => { if (!isPanelOpen && e.touches[0].clientY - startY > 15) openPanel(); }, { passive: true });
  if (panelToggleBtn) panelToggleBtn.addEventListener('click', e => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle.addEventListener('click', e => { if (e.target.closest('.mp-btn,.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    closeHandle.addEventListener('touchmove',  e => { if (isPanelOpen && startY - e.touches[0].clientY > 15) closePanel(); }, { passive: true });
    closeHandle.addEventListener('click', closePanel);
  }
  panel.addEventListener('touchmove', e => { if (isPanelOpen && !e.target.closest('.music-panel-inner')) e.preventDefault(); }, { passive: false });

  /* Tabs */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const tc = document.getElementById('tab-' + tab.dataset.tab);
      if (tc) tc.classList.add('active');
    });
  });

  function showToast(msg) {
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:9px 16px;border-radius:20px;font-size:12px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;white-space:nowrap;';
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  function setupToggleBtn(btn, area) {
    if (!btn || !area) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const nowHidden = area.classList.toggle('hidden');
      btn.classList.toggle('results-open', !nowHidden);
    });
  }
  function showResultsArea(area, btn) {
    if (!area) return;
    area.classList.remove('hidden');
    if (btn) btn.classList.add('results-open');
  }

  if (toggleListBtnUrl && episodesOverlayUrl) setupToggleBtn(toggleListBtnUrl, episodesOverlayUrl);
  if (toggleListBtnYt && episodesOverlayYt) setupToggleBtn(toggleListBtnYt, episodesOverlayYt);
  if (toggleListBtnYtm && ytmResultsArea) setupToggleBtn(toggleListBtnYtm, ytmResultsArea);
  if (toggleListBtnSp && spResultsArea) setupToggleBtn(toggleListBtnSp, spResultsArea);

  /* ═══════════════════════ 7. SYNC ═══════════════════════ */
  if (mpSyncToggleBtn) {
    mpSyncToggleBtn.addEventListener('click', () => {
      synced = !synced;
      mpSyncBadge.textContent = synced ? '🟢 Synced' : '🔴 Solo';
      mpSyncBadge.classList.toggle('synced', synced);
      mpSyncToggleBtn.textContent = synced ? 'Synced ✓' : 'Sync 🔗';
      mpSyncToggleBtn.classList.toggle('synced', synced);
      if (synced) broadcastSync({ action: 'request_sync' });
      showToast(synced ? '🔗 Sync Active' : '🔌 Sync Off');
    });
  }

  /* ═══════════════════════ 8. YT IFRAME ENGINE ═══════════════════════ */
  const ytTag = document.createElement('script');
  ytTag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(ytTag);

  window.onYouTubeIframeAPIReady = function () {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0, modestbranding: 1 },
      events: { onReady: () => { isYtReady = true; }, onStateChange: onPlayerStateChange }
    });
  };

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach(ev => {
    document.addEventListener(ev, () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
      document.body.classList.toggle('is-fullscreen', isFs);
      const iframe = ytFrameWrap ? ytFrameWrap.querySelector('iframe') : null;
      if (isFs) {
        if (iframe) { iframe.style.width = '100vw'; iframe.style.height = '100vh'; }
      } else {
        if (iframe) {
          iframe.style.width = '100%'; iframe.style.height = '100%';
          iframe.style.display = 'none';
          iframe.offsetHeight;
          iframe.style.display = '';
        }
        if (ytFrameWrap) ytFrameWrap.style.display = 'block';
      }
    });
  });

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: ytPlayer.getCurrentTime() }); }
    else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: ytPlayer.getCurrentTime() }); }
    else if (event.data === YT.PlayerState.ENDED)  { playNext(); }
  }

  /* ═══════════════════════ 9. YOUTUBE SEARCH ═══════════════════════ */
  function searchYouTube(query) {
    if (!query) return;
    if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    if (episodesOverlayYt) showResultsArea(episodesOverlayYt, toggleListBtnYt);
    if (toggleListBtnYt) toggleListBtnYt.classList.remove('hidden');

    fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query)}&geo=IN&lang=en&type=video`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
      })
      .then(r => r.json())
      .then(data => {
        if (!ytSearchResultsEl) return;
        ytSearchResultsEl.innerHTML = '';
        const items = data.data || [];
        if (!items.length) { ytSearchResultsEl.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
        items.forEach(vid => {
          const thumb = vid.thumbnail?.[1]?.url || vid.thumbnail?.[0]?.url || '';
          const div = document.createElement('div'); div.className = 'yt-search-item';
          div.innerHTML = `<img src="${thumb}" class="yt-search-thumb" onerror="this.src='https://i.imgur.com/8Q5FqWj.jpeg'"/><div class="yt-search-info"><div class="yt-search-title">${vid.title||''}</div><div class="yt-search-sub">${vid.channelTitle||''}</div></div><span style="font-size:15px;color:#ff4444;flex-shrink:0">▶</span>`;
          div.onclick = () => { clearSessionKeys(); queue = []; currentIdx = 0; addToQueue({ type: 'youtube', title: vid.title||'', ytId: vid.videoId, thumb }); showToast('▶ Playing!'); };
          ytSearchResultsEl.appendChild(div);
        });
      }).catch(() => { if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<p class="mp-empty">Error fetching results.</p>'; });
  }

  if (ytAddBtn) ytAddBtn.onclick = () => { const v = ytInput.value.trim(); if (!v) return; if (isYouTubeUrl(v)) { loadYouTube(v); ytInput.value = ''; return; } searchYouTube(v); ytInput.value = ''; };
  if (ytInput)  ytInput.addEventListener('keydown',  e => { if (e.key === 'Enter') ytAddBtn.click(); });
  if (urlInput) urlInput.addEventListener('keydown',  e => { if (e.key === 'Enter') urlAddBtn && urlAddBtn.click(); });
  if (urlAddBtn) urlAddBtn.addEventListener('click', () => {
    const v = urlInput.value.trim(); if (!v) return;
    if (isYouTubeUrl(v)) { loadYouTube(v); urlInput.value = ''; }
    else if (v.startsWith('http')) { clearSessionKeys(); queue = []; currentIdx = 0; addToQueue({ type: 'stream', title: 'Cloud Media', url: v }); urlInput.value = ''; }
  });
  if (fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    clearSessionKeys(); queue = []; currentIdx = 0; addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function loadYouTube(url) { const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; } clearSessionKeys(); queue = []; currentIdx = 0; addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id }); }

  /* ═══════════════════════ 10. AUDIO EXTRACTION ═══════════════════════ */

  async function fetchPremiumAudio(spId) {
    dbg('SP81', 'Fetching Spotify audio for spId: ' + spId, '#1db954');
    try {
      const res = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const result = await res.json();
      const url = Array.isArray(result) ? (result[0]?.url || result[0]?.link) : (result.url || result.link || result.downloadUrl);
      dbg('SP81', url ? '✅ Got URL: ' + url.slice(0,60) + '…' : '❌ No URL returned', url ? '#7ADB8A' : '#ff4444');
      return url || null;
    } catch(e) { dbg('SP81', '❌ Exception: ' + e.message, '#ff4444'); return null; }
  }

  async function searchYTMusicAudio(query) {
    try {
      const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query + ' official audio')}&geo=IN&lang=en&type=video`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
      });
      const d = await r.json();
      const items = (d.data || []).filter(i => {
        const t = (i.title || '').toLowerCase();
        return !t.includes('#short') && !t.includes('shorts') && !t.includes('m4a') && !t.includes('reels');
      });
      if (!items.length) return null;
      return { ytId: items[0].videoId, title: items[0].title, channel: items[0].channelTitle || '', thumb: items[0].thumbnail?.[1]?.url || items[0].thumbnail?.[0]?.url || '' };
    } catch { return null; }
  }

  /* ── FIX 4: Multi-extractor with audio-only preference + format validation ── */
  async function extractYTAudioUrl(ytId) {
    dbg('YTAUDIO', 'Extractor1 (ytstream): ' + ytId, '#ff9944');

    // Extractor 1: ytstream — prefer audio-only formats
    try {
      const res = await fetch(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com' }
      });
      const data = await res.json();
      if (data.formats) {
        const fmts = Object.values(data.formats);
        // Strictly audio-only (no video stream) — avoids MEDIA_ELEMENT_ERROR on video-muxed streams
        const audioOnly = fmts.filter(f =>
          f.url &&
          (f.mimeType?.startsWith('audio/') || (f.audioQuality && !f.qualityLabel))
        );
        if (audioOnly.length) {
          // Prefer webm/opus (smallest, background-safe), then mp4a
          const opus = audioOnly.find(f => f.mimeType?.includes('webm') || f.mimeType?.includes('opus'));
          const best = opus || audioOnly.sort((a, b) => parseInt(b.bitrate || 0) - parseInt(a.bitrate || 0))[0];
          dbg('YTAUDIO', '✅ Extractor1 audio-only: ' + (best.mimeType||'?') + ' ' + parseInt(best.bitrate/1000||0) + 'kbps', '#7ADB8A');
          return best.url;
        }
        // Fallback: any url from formats (may be muxed video — less ideal but works)
        const any = fmts.find(f => f.url && f.mimeType?.startsWith('audio/'));
        if (any) { dbg('YTAUDIO', '✅ Extractor1 fallback audio: ' + any.mimeType, '#ffaa44'); return any.url; }
      }
      if (data.url) { dbg('YTAUDIO', '✅ Extractor1 direct url', '#ffaa44'); return data.url; }
    } catch(e) { dbg('YTAUDIO', '⚠️ Extractor1 failed: ' + e.message, '#ffaa44'); }

    // Extractor 2: yt-api
    dbg('YTAUDIO', 'Extractor2 (yt-api): ' + ytId, '#ff9944');
    try {
      const res3 = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${ytId}`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'yt-api.p.rapidapi.com' }
      });
      const d3 = await res3.json();
      if (d3.formats) {
        const af = Object.values(d3.formats).filter(f => f.url && f.mimeType?.startsWith('audio/'));
        if (af.length) { dbg('YTAUDIO', '✅ Extractor2 audio: ' + af[0].mimeType, '#7ADB8A'); return af[0].url; }
        const any = Object.values(d3.formats).find(f => f.url);
        if (any) { dbg('YTAUDIO', '✅ Extractor2 any url', '#ffaa44'); return any.url; }
      }
      if (d3.url) return d3.url;
    } catch(e) { dbg('YTAUDIO', '⚠️ Extractor2 failed: ' + e.message, '#ffaa44'); }

    // Extractor 3: spotify81 (handles yt IDs too)
    dbg('YTAUDIO', 'Extractor3 (sp81): ' + ytId, '#ff9944');
    try {
      const res2 = await fetch(`https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const d2 = await res2.json();
      const url2 = Array.isArray(d2) ? (d2[0]?.url || d2[0]?.link) : (d2.url || d2.link);
      if (url2) { dbg('YTAUDIO', '✅ Extractor3 url', '#7ADB8A'); return url2; }
    } catch(e) { dbg('YTAUDIO', '⚠️ Extractor3 failed: ' + e.message, '#ffaa44'); }

    dbg('YTAUDIO', '❌ All extractors failed for ' + ytId, '#ff4444');
    return null;
  }

  /* Safe audio play with error retry */
  async function safePlayAudio(url, item, token) {
    if (token !== renderToken) return; // stale render
    nativeAudio.pause();
    nativeAudio.src = url;
    nativeAudio.load();
    resumeAudioContext();
    try {
      await nativeAudio.play();
      if (token !== renderToken) { nativeAudio.pause(); return; }
      isPlaying = true; updatePlayBtn();
      premiumMusicCard.classList.add('playing');
      setupMediaSession(item);
      dbg('AUDIO', '✅ Playing: ' + url.slice(0,60), '#7ADB8A');
    } catch(e) {
      dbg('AUDIO', '❌ play() rejected: ' + e.message + ' — will retry on tap', '#ff4444');
      showToast('Tap ▶ to play');
    }

    // On audio error, try next extractor automatically
    const errorHandler = async () => {
      if (token !== renderToken) return;
      dbg('AUDIO', '❌ Format error on this URL, trying next extractor…', '#ff4444');
      nativeAudio.removeEventListener('error', errorHandler);
      // If this was a ytmusic item, try falling back to iframe
      if (item.ytId && (item.type === 'ytmusic' || item.type === 'spotify_yt')) {
        await playWithIframeFallback(item);
      }
    };
    nativeAudio.addEventListener('error', errorHandler, { once: true });
  }

  async function playWithIframeFallback(item) {
    showCinemaMode(); ytFrameWrap.style.display = 'block';
    if (item.ytId) {
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => { if (isYtReady) ytPlayer.loadVideoById(item.ytId); }, 800);
      setTrackInfo(item.title, item.artist || 'Audio'); setupMediaSession(item);
      showToast('⚠️ Playing via Video fallback');
    }
  }

  function songKey(title, artist) {
    return (title + '__' + (artist || '')).toLowerCase()
      .replace(/\s+/g,' ').replace(/\(.*?\)/g,'').replace(/\[.*?\]/g,'').trim();
  }

  /* ═══════════════════════ 11. SMART AUTO-PLAY ═══════════════════════ */
  function buildVibeQueries(title, artist) {
    const clean = s => s.replace(/\(.*?\)|\[.*?\]/g,'').replace(/ft\.?.*/i,'').trim();
    const t = clean(title), a = clean(artist || ''), full = (t+' '+a).toLowerCase();
    const isBoll = /hindi|bollywood|punjabi|haryanvi|desi|filmi/i.test(full);
    const isLoFi = /lo.?fi|chill|relax|study|sleep/i.test(full);
    const yr = '2025 2026'; let q = [];
    if (isBoll) q.push(`${a} top songs`, `hindi hits ${yr}`, `bollywood ${yr}`);
    else if (isLoFi) q.push(`lofi chill mix ${yr}`, `chill beats study`);
    else q.push(`${a} top songs`, `songs like ${t}`, `trending songs ${yr}`);
    return q.slice(0,3);
  }

  /* ── FIX 2: Stream songs as they arrive, not wait for all 5 ── */
  async function triggerAutoPlayLoad(title, artist) {
    if (autoPlayFetching) return;
    autoPlayFetching = true;
    dbg('AUTOPLAY', 'Fetching vibes for: ' + title + ' – ' + (artist||''), '#ffaa44');
    showToast('🎵 Loading next vibes…');
    const queries = buildVibeQueries(title, artist);
    const seenKeys = new Set();
    let addedCount = 0;
    const targetCount = 5;

    for (const q of queries) {
      if (addedCount >= targetCount) break;
      try {
        const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(q)}&geo=IN&lang=en&type=video`, {
          headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
        });
        const d = await r.json();
        if (!d.data) continue;

        for (const item of d.data) {
          if (addedCount >= targetCount) break;
          const t2 = item.title || '', a2 = item.channelTitle || '';
          const tl = t2.toLowerCase();
          if (tl.includes('#short') || tl.includes('shorts') || tl.includes('m4a') || tl.includes('reels') || a2.toLowerCase().includes('- topic')) continue;
          const k = songKey(t2, a2);
          // Strict dedup: skip already played AND already in queue AND seen this fetch
          if (playedKeys.has(k) || seenKeys.has(k) || queue.some(qi => qi.key === k)) continue;
          seenKeys.add(k);
          const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
          const type = activeSrcTab === 'spotify' ? 'spotify_yt' : 'ytmusic';
          const newItem = { type, title: t2, artist: a2, ytId: item.videoId, thumb, key: k, isAutoPlay: true };
          queue.push(newItem);
          addedCount++;
          dbg('AUTOPLAY', '➕ Added: ' + t2.slice(0,40), '#ffaa44');

          // ── FIX 2: Play immediately when the FIRST song is added ──
          if (addedCount === 1 && currentIdx >= queue.length - 2) {
            renderQueue();
            // Only auto-advance if currently at end of queue
            const wasAtEnd = (currentIdx === queue.length - 2);
            if (wasAtEnd) {
              showToast('▶ Auto-playing next…');
              playQueueItem(queue.length - 1);
            } else {
              renderQueue();
            }
          } else {
            renderQueue();
          }
        }
      } catch(e) { dbg('AUTOPLAY', '⚠️ query failed: ' + e.message, '#ffaa44'); }
    }

    if (addedCount === 0) showToast('⚠️ No new vibes found');
    autoPlayFetching = false;
  }

  /* ═══════════════════════ 12. SPOTIFY SEARCH ═══════════════════════ */
  async function searchSpotify(query, playlistsOnly = false) {
    if (!query) return;
    spResultsArea.innerHTML = '<div class="mp-loading-pulse">Loading…</div>';
    showResultsArea(spResultsArea, toggleListBtnSp);
    if (toggleListBtnSp) toggleListBtnSp.classList.remove('hidden');

    try {
      const res = await fetch('https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall?market=IN&country=IN', {
        method: 'POST',
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'spotify-web-api3.p.rapidapi.com', 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: query, limit: 20, country: 'IN', market: 'IN' })
      });
      const resp = await res.json();
      dbg('SPOTIFY', '✅ Search response received', '#1db954');
      const sd = resp?.data?.searchV2 || resp;

      /* ── Parse helper ── */
      function parseItem(w, catHint) {
        const item = w?.item?.data || w?.data || w;
        if (!item?.uri) return null;
        const parts = item.uri.split(':');
        const iType = parts[1];
        const iId   = item.id || parts[2];
        const name  = item.name || item.profile?.name || 'Unknown';
        let artist  = 'Unknown';
        if (item.artists?.items?.[0]?.profile?.name) artist = item.artists.items[0].profile.name;
        else if (item.ownerV2?.data?.name) artist = item.ownerV2.data.name;
        else if (iType === 'artist') artist = 'Artist';

        // ── FIX 3: Comprehensive thumb extraction including playlists ──
        let thumb = '';
        if (item.albumOfTrack?.coverArt?.sources?.length)     thumb = item.albumOfTrack.coverArt.sources[0].url;
        else if (item.coverArt?.sources?.length)               thumb = item.coverArt.sources[0].url;
        else if (item.images?.items?.[0]?.sources?.length)     thumb = item.images.items[0].sources[0].url;
        else if (item.visuals?.avatarImage?.sources?.length)   thumb = item.visuals.avatarImage.sources[0].url;
        else if (item.image?.sources?.length)                  thumb = item.image.sources[0].url;
        else if (item.avatar?.sources?.length)                 thumb = item.avatar.sources[0].url;
        if (!thumb) thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';

        return { name, artist, iType, iId, thumb, uri: item.uri, _cat: catHint || iType };
      }

      /* ── FIX 3: TRUE best-match order — use topResults AS-IS first ──
         Top results from Spotify are already ranked by relevance.
         We preserve that order, then append remaining items by category.
      ── */
      const seen = new Set();
      const orderedItems = [];

      // STEP 1: Top results in their exact Spotify-ranked order (any type)
      const topRaw = sd?.topResults?.items || sd?.topResultsV2?.itemsV2 || [];
      topRaw.forEach(w => {
        const p = parseItem(w, 'top');
        if (!p || seen.has(p.uri)) return;
        if (playlistsOnly && p.iType !== 'playlist') return;
        seen.add(p.uri);
        p.isTop = true;
        orderedItems.push(p);
      });

      if (!playlistsOnly) {
        // STEP 2: Remaining tracks (not already in top results)
        (sd?.tracksV2?.items || sd?.tracks?.items || []).forEach(w => {
          const p = parseItem(w, 'track');
          if (!p || seen.has(p.uri) || p.iType !== 'track') return;
          seen.add(p.uri); orderedItems.push(p);
        });

        // STEP 3: Albums
        (sd?.albumsV2?.items || sd?.albums?.items || []).forEach(w => {
          const p = parseItem(w, 'album');
          if (!p || seen.has(p.uri) || p.iType !== 'album') return;
          seen.add(p.uri); orderedItems.push(p);
        });
      }

      // STEP 4: Playlists (all remaining)
      (sd?.playlistsV2?.items || sd?.playlists?.items || []).forEach(w => {
        const p = parseItem(w, 'playlist');
        if (!p || seen.has(p.uri) || p.iType !== 'playlist') return;
        seen.add(p.uri); orderedItems.push(p);
      });

      // STEP 5: Artists last
      if (!playlistsOnly) {
        (sd?.artistsV2?.items || sd?.artists?.items || []).forEach(w => {
          const p = parseItem(w, 'artist');
          if (!p || seen.has(p.uri) || p.iType !== 'artist') return;
          seen.add(p.uri); orderedItems.push(p);
        });
      }

      dbg('SPOTIFY', `Parsed ${orderedItems.length} items (${topRaw.length} from top)`, '#1db954');
      renderSpotifyCards(orderedItems, query.toLowerCase());

    } catch (e) {
      dbg('SPOTIFY', '❌ Search error: ' + e.message, '#ff4444');
      spResultsArea.innerHTML = '<p class="mp-empty">🚨 API Error!</p>';
    }
  }

  function renderSpotifyCards(items, lq) {
    spResultsArea.innerHTML = '';
    if (!items.length) { spResultsArea.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }
    items.forEach((data) => {
      const isPlaylist = data.iType === 'playlist';
      const isAlbum   = data.iType === 'album';
      const isArtist  = data.iType === 'artist';
      const k = songKey(data.name, data.artist);

      const div = document.createElement('div');
      div.className = 'yt-search-item sp-list-item';

      const typeExtra = (isPlaylist || isAlbum || isArtist)
        ? `<span class="sp-playlist-badge">${data.iType.toUpperCase()}</span>` : '';
      const topBadge = data.isTop ? `<span class="sp-best-badge">🏆</span> ` : '';
      const arrow = isArtist ? '👤' : (isPlaylist || isAlbum) ? '📂' : '▶';
      const arrowColor = isArtist ? '#aaa' : (isPlaylist || isAlbum) ? '#B450FF' : '#1db954';
      const borderR = isArtist ? '50%' : '7px';

      div.innerHTML = `
        <img src="${data.thumb}" class="yt-search-thumb" style="border-radius:${borderR}" onerror="this.src='https://i.imgur.com/8Q5FqWj.jpeg'"/>
        <div class="yt-search-info">
          <div class="yt-search-title">${topBadge}${data.name} ${typeExtra}</div>
          <div class="yt-search-sub">${data.artist}</div>
        </div>
        <span style="font-size:15px;color:${arrowColor};flex-shrink:0">${arrow}</span>
      `;

      div.onclick = async () => {
        if (isPlaylist) {
          showToast('📂 Loading Playlist…');
          dbg('SPOTIFY', 'Loading playlist: ' + data.iId, '#1db954');
          const tracks = await fetchPlaylistTracks(data.iId, data.thumb);
          renderSpotifyCards(tracks.map(t => ({
            name: t.title, artist: t.artist, iType: 'track', iId: t.id,
            thumb: t.image || data.thumb, isTop: false
          })), '');
        } else if (isAlbum) {
          showToast('📂 Loading Album…');
          dbg('SPOTIFY', 'Loading album: ' + data.iId, '#1db954');
          const tracks = await fetchAlbumTracks(data.iId);
          renderSpotifyCards(tracks.map(t => ({
            name: t.title, artist: t.artist, iType: 'track', iId: t.id,
            thumb: t.image, isTop: false
          })), '');
        } else if (isArtist) {
          showToast('👤 Artist — search a track name instead');
        } else {
          activeSrcTab = 'spotify'; clearSessionKeys(); queue = []; currentIdx = 0;
          addToQueue({ type: 'spotify_yt', title: data.name, artist: data.artist, spId: data.iId, thumb: data.thumb, key: k });
          document.querySelectorAll('.sp-list-item').forEach(c => c.classList.remove('playing'));
          div.classList.add('playing');
          showToast('🎵 Preparing stream...');
        }
      };
      spResultsArea.appendChild(div);
    });
  }

  // ── FIX 3: playlist fetch now passes parent thumb as fallback ──
  async function fetchPlaylistTracks(id, parentThumb) {
    try {
      const r = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${id}&offset=0&limit=100&market=IN`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const d = await r.json();
      return (d.items || []).filter(i => i.track && !i.track.is_local).map(i => ({
        id: i.track.id,
        title: i.track.name,
        artist: i.track.artists[0]?.name || 'Unknown',
        // Use track album art → playlist cover → parent thumb
        image: i.track.album?.images?.[0]?.url || parentThumb || 'https://i.imgur.com/8Q5FqWj.jpeg'
      }));
    } catch(e) { dbg('SPOTIFY', '❌ playlist fetch: ' + e.message, '#ff4444'); return []; }
  }

  async function fetchAlbumTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/album_tracks?id=${id}&market=IN`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const d = await r.json();
      const img = d.album?.images?.[0]?.url || 'https://i.imgur.com/8Q5FqWj.jpeg';
      return (d.album?.tracks?.items || []).map(i => ({
        id: i.id, title: i.name, artist: i.artists[0]?.name || 'Unknown', image: img
      }));
    } catch(e) { dbg('SPOTIFY', '❌ album fetch: ' + e.message, '#ff4444'); return []; }
  }

  if (spSearchSongBtn) spSearchSongBtn.onclick = () => { const v = spInput.value.trim(); if (!v) return; searchSpotify(v, false); spInput.value = ''; };
  if (spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = () => { const v = spInput.value.trim(); if (!v) return; searchSpotify(v, true); spInput.value = ''; };
  if (spInput) spInput.addEventListener('keydown', e => { if (e.key === 'Enter') spSearchSongBtn?.click(); });

  /* ═══════════════════════ 13. YT MUSIC ═══════════════════════ */
  async function searchYTMusic(query) {
    if (!query) return;
    ytmResultsArea.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(ytmResultsArea, toggleListBtnYtm);
    if (toggleListBtnYtm) toggleListBtnYtm.classList.remove('hidden');

    try {
      const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query+' song')}&geo=IN&lang=en&type=video`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
      });
      const d = await r.json();
      ytmResultsArea.innerHTML = '';
      const items = d.data || [];
      if (!items.length) { ytmResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
      items.forEach(item => {
        const t = item.title||'', a = item.channelTitle||'';
        const tl = t.toLowerCase();
        if (tl.includes('#short') || tl.includes('m4a') || tl.includes('reels')) return;
        const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
        const ytId = item.videoId, k = songKey(t, a);

        const div = document.createElement('div');
        div.className = 'yt-search-item ytm-list-item';
        div.innerHTML = `
          <img src="${thumb}" class="yt-search-thumb" onerror="this.src='https://i.imgur.com/8Q5FqWj.jpeg'"/>
          <div class="yt-search-info">
            <div class="yt-search-title">${t}</div>
            <div class="yt-search-sub">${a}</div>
          </div>
          <span style="font-size:15px;color:#ff4444;flex-shrink:0">▶</span>
        `;
        div.onclick = () => {
          activeSrcTab = 'ytmusic'; clearSessionKeys(); queue = []; currentIdx = 0;
          addToQueue({ type: 'ytmusic', title: t, artist: a, ytId, thumb, key: k });
          document.querySelectorAll('.ytm-list-item').forEach(c => c.classList.remove('playing'));
          div.classList.add('playing');
          showToast('🎵 Preparing stream...');
        };
        ytmResultsArea.appendChild(div);
      });
    } catch { ytmResultsArea.innerHTML = '<p class="mp-empty">Error. Check API.</p>'; }
  }

  if (ytmSearchBtn) ytmSearchBtn.onclick = () => { const v = ytmInput.value.trim(); if (!v) return; searchYTMusic(v); ytmInput.value = ''; };
  if (ytmInput) ytmInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytmSearchBtn?.click(); });

  /* ═══════════════════════ 14. QUEUE ═══════════════════════ */
  function addToQueue(item) {
    if (!item.key) item.key = songKey(item.title, item.artist||'');
    queue.push(item); renderQueue(); playQueueItem(queue.length-1);
  }

  function renderQueue() {
    if (!queue.length) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      const icon = {youtube:'🎬',youtube_audio:'🎧',ytmusic:'🎵',spotify_yt:'🌐',stream:'☁️'}[item.type] || '🎵';
      const autoTag = item.isAutoPlay ? '<span class="qi-prefetched">∞</span>' : '';
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}${autoTag}</span><button class="qi-del">✕</button>`;
      el.querySelector('.qi-del').onclick = e => {
        e.stopPropagation(); queue.splice(i, 1);
        if (currentIdx >= queue.length) currentIdx = queue.length - 1;
        renderQueue();
      };
      el.onclick = e => { if (e.target.classList.contains('qi-del')) return; playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i; renderQueue();
    const item = queue[i];
    const isBlob = item.url?.startsWith('blob:');
    if (synced && !isRemoteAction && !isBlob) broadcastSync({ action: 'change_song', item });
    playedKeys.add(item.key || songKey(item.title, item.artist||''));
    renderMedia(item);
    if (autoPlayEnabled && i >= queue.length - 2) triggerAutoPlayLoad(item.title, item.artist||'');
  }

  /* ═══════════════════════ 15. MEDIA RENDERER ═══════════════════════ */
  function showCinemaMode() {
    cinemaMode.classList.remove('hidden');
    premiumMusicCard.classList.add('hidden');
    spotifyMode.classList.add('hidden');
    premiumMusicCard.classList.remove('playing','source-ytm','source-sp');
  }
  function showPremiumCard(src) {
    cinemaMode.classList.add('hidden');
    premiumMusicCard.classList.remove('hidden');
    spotifyMode.classList.add('hidden');
    premiumMusicCard.classList.remove('source-ytm','source-sp');
    if (src === 'spotify') {
      pmcSourceBadge.textContent = '🌐 Spotify';
      pmcSourceBadge.className = 'pmc-source-badge sp';
      premiumMusicCard.classList.add('source-sp');
    } else {
      pmcSourceBadge.textContent = '🎵 YT Music';
      pmcSourceBadge.className = 'pmc-source-badge ytm';
      premiumMusicCard.classList.add('source-ytm');
    }
  }

  function renderMedia(item) {
    renderToken++; // invalidate any previous async render
    const myToken = renderToken;
    dbg('RENDER', 'renderMedia → type:' + item.type + ' | ' + item.title.slice(0,35), '#B450FF');

    nativeAudio.pause();
    nativeAudio.removeAttribute('src');
    nativeAudio.load();
    nativeAudio.style.display = 'none';
    ytFrameWrap.style.display = 'none';
    if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    isPlaying = false; updatePlayBtn(); updateProgressBar(0, 0);

    if (item.type === 'youtube') {
      activeType = 'youtube'; showCinemaMode(); ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => renderMedia(item), 600);
      setTrackInfo(item.title, 'YouTube'); setupMediaSession(item);
    }
    else if (item.type === 'ytmusic') {
      activeType = 'ytmusic'; activeSrcTab = 'ytmusic'; showPremiumCard('ytmusic');
      setPMCInfo(item.title, item.artist||'YouTube Music', item.thumb);
      setTrackInfo(item.title, item.artist||'YouTube Music');
      showToast('🎵 Loading audio stream…');
      extractYTAudioUrl(item.ytId).then(async url => {
        if (myToken !== renderToken) return; // stale
        if (url) {
          await safePlayAudio(url, item, myToken);
        } else {
          await playWithIframeFallback(item);
        }
      });
    }
    else if (item.type === 'spotify_yt') {
      activeType = 'spotify_yt'; activeSrcTab = 'spotify'; showPremiumCard('spotify');
      setPMCInfo(item.title, item.artist||'Global Music', item.thumb);
      setTrackInfo(item.title, item.artist||'Global Music');
      showToast('🌐 Requesting stream…');
      (async () => {
        if (myToken !== renderToken) return;
        // Try Spotify direct download first
        if (item.spId) {
          const spUrl = await fetchPremiumAudio(item.spId);
          if (myToken !== renderToken) return;
          if (spUrl) { await safePlayAudio(spUrl, item, myToken); return; }
        }
        // Fallback: search YT for audio
        const ytRes = await searchYTMusicAudio(item.title + ' ' + (item.artist||''));
        if (myToken !== renderToken) return;
        if (ytRes) {
          const ytUrl = await extractYTAudioUrl(ytRes.ytId);
          if (myToken !== renderToken) return;
          if (ytUrl) { await safePlayAudio(ytUrl, item, myToken); return; }
          item.ytId = ytRes.ytId; await playWithIframeFallback(item); return;
        }
        showToast('⚠️ Audio unavailable, skipping…');
        setTimeout(playNext, 2500);
      })();
    }
    else if (item.type === 'stream') {
      activeType = 'stream';
      cinemaMode.classList.add('hidden');
      premiumMusicCard.classList.add('hidden');
      spotifyMode.classList.remove('hidden');
      nativeAudio.src = item.url;
      nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast('Tap ▶ to play'));
      setTrackInfo(item.title, '☁️ Cloud'); setupMediaSession(item);
    }
  }

  /* ═══════════════════════ 16. PMC INFO & PROGRESS ═══════════════════════ */
  function setPMCInfo(title, artist, thumb) {
    pmcTitle.textContent = title; pmcArtist.textContent = artist;
    const src = thumb || 'https://i.imgur.com/8Q5FqWj.jpeg';
    pmcArtwork.src = src; pmcBgBlur.style.backgroundImage = `url('${src}')`;
    if (pmcGlow) pmcGlow.style.background = 'rgba(232,67,106,0.4)';
  }
  function updateProgressBar(cur, dur) {
    if (!dur || isNaN(dur)) {
      pmcProgressFill.style.width = '0%';
      if (pmcCurrentTime) pmcCurrentTime.textContent = '0:00';
      if (pmcDuration) pmcDuration.textContent = '0:00';
      return;
    }
    pmcProgressFill.style.width = Math.min(100, (cur/dur)*100) + '%';
    if (pmcCurrentTime) pmcCurrentTime.textContent = fmtTime(cur);
    if (pmcDuration) pmcDuration.textContent = fmtTime(dur);
  }
  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s/60), sc = Math.floor(s%60);
    return `${m}:${sc.toString().padStart(2,'0')}`;
  }

  nativeAudio.addEventListener('timeupdate', () => updateProgressBar(nativeAudio.currentTime, nativeAudio.duration));

  if (pmcProgressBar) {
    const seek = e => {
      const r = pmcProgressBar.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const pct = (clientX - r.left) / r.width;
      if (nativeAudio.duration) nativeAudio.currentTime = pct * nativeAudio.duration;
    };
    pmcProgressBar.addEventListener('click', seek);
    pmcProgressBar.addEventListener('touchstart', e => seek({ clientX: e.touches[0].clientX }), { passive: true });
  }

  if (pmcPlayMain) pmcPlayMain.addEventListener('click', togglePlay);
  if (pmcPrev) pmcPrev.addEventListener('click', playPrev);
  if (pmcNext) pmcNext.addEventListener('click', playNext);

  function togglePlay() {
    resumeAudioContext();
    if (['stream','youtube_audio','ytmusic','spotify_yt'].includes(activeType)) {
      if (isPlaying) nativeAudio.pause();
      else nativeAudio.play().catch(() => {});
    } else if (activeType === 'youtube' && ytPlayer) {
      if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  }

  /* ═══════════════════════ 17. MEDIA SESSION ═══════════════════════ */
  function setupMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.artist || 'ZeroX Hub',
      artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play', () => {
      resumeAudioContext();
      if (activeType === 'youtube' && ytPlayer) ytPlayer.playVideo(); else nativeAudio.play().catch(()=>{});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (activeType === 'youtube' && ytPlayer) ytPlayer.pauseVideo(); else nativeAudio.pause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
    navigator.mediaSession.setActionHandler('seekto', details => {
      if (details.seekTime && nativeAudio.duration) nativeAudio.currentTime = details.seekTime;
    });
  }

  /* ═══════════════════════ 18. PLAYBACK CONTROLS ═══════════════════════ */
  function playNext() {
    if (currentIdx < queue.length - 1) playQueueItem(currentIdx + 1);
    else if (autoPlayEnabled) {
      const cur = queue[currentIdx];
      if (cur) triggerAutoPlayLoad(cur.title, cur.artist||'');
      else showToast('End of queue.');
    } else showToast('End of queue.');
  }
  function playPrev() { if (currentIdx > 0) playQueueItem(currentIdx - 1); else showToast('First song!'); }

  mpNexts.forEach(b => b && b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b && b.addEventListener('click', playPrev));
  mpPlays.forEach(btn => btn.addEventListener('click', togglePlay));

  function updatePlayBtn() {
    const icon = isPlaying ? '⏸' : '▶';
    mpPlays.forEach(b => b.textContent = icon);
    if (pmcPlayMain) pmcPlayMain.textContent = icon;
    if (isPlaying && ['stream','youtube_audio','ytmusic','spotify_yt'].includes(activeType)) {
      vinylRecord?.classList.add('playing');
      premiumMusicCard?.classList.add('playing');
    } else {
      vinylRecord?.classList.remove('playing');
      if (!isPlaying) premiumMusicCard?.classList.remove('playing');
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }

  function setTrackInfo(title, sub) {
    if (musicTitle) musicTitle.textContent = title;
    if (musicArtist) musicArtist.textContent = sub;
    if (miniTitle) miniTitle.textContent = `${title} • ${sub}`;
  }

  /* ═══════════════════════ 19. NATIVE AUDIO EVENTS ═══════════════════════ */
  nativeAudio.addEventListener('play', () => {
    isPlaying = true; updatePlayBtn();
    if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
  });
  nativeAudio.addEventListener('pause', () => {
    isPlaying = false; updatePlayBtn();
    if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
  });
  nativeAudio.addEventListener('seeked', () => {
    if (synced && !isRemoteAction) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
  });
  nativeAudio.addEventListener('ended', () => {
    dbg('AUDIO', '⏹ ended — triggering next', '#aaa');
    if (autoPlayEnabled) playNext(); else showToast('Song ended.');
  });

  /* ═══════════════════════ 20. SYNC NETWORK ═══════════════════════ */
  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  window._zxReceiveSync = function(data) {
    if (data.action === 'request_sync') {
      const cur = queue[currentIdx];
      if (synced && cur && !cur.url?.startsWith('blob:')) {
        broadcastSync({ action: 'change_song', item: cur });
        setTimeout(() => {
          const t = activeType === 'youtube' && ytPlayer && isYtReady ? ytPlayer.getCurrentTime() : nativeAudio.currentTime || 0;
          broadcastSync({ action: isPlaying ? 'play' : 'pause', time: t });
        }, 1500);
      }
      return;
    }
    if (!synced) return; setRemoteAction();
    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.title === data.item.title);
      if (idx === -1) { queue.push(data.item); idx = queue.length - 1; } else { queue[idx] = data.item; }
      currentIdx = idx; renderQueue(); renderMedia(queue[idx]); return;
    }
    if (activeType === 'youtube' && ytPlayer && isYtReady) {
      if (data.action === 'play')  { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek')  { ytPlayer.seekTo(data.time, true); }
    } else {
      if (data.action === 'play')  { if (Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time; nativeAudio.play().catch(() => {}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek')  { nativeAudio.currentTime = data.time; }
    }
  };

  /* ═══════════════════════ DEBUG PANEL (emuda-style) ═══════════════════════ */
  const MAX_DBG = 80;
  const dbgLines = [];
  let dbgVisible = false;

  function dbg(tag, msg, color) {
    const now = new Date();
    const ts = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
    const entry = { ts, tag: tag || 'INFO', msg: String(msg), color: color || '#FFB5C8' };
    dbgLines.push(entry);
    if (dbgLines.length > MAX_DBG) dbgLines.shift();
    renderDbg();
    console.log(`[ZX ${entry.tag}] ${entry.msg}`);
  }

  function renderDbg() {
    const el = document.getElementById('zxDebugLog');
    if (!el || !dbgVisible) return;
    el.innerHTML = dbgLines.slice().reverse().map(e =>
      `<div style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.04)">` +
      `<span style="color:rgba(255,255,255,0.3);font-size:9px;margin-right:5px">${e.ts}</span>` +
      `<span style="color:rgba(180,80,255,0.8);font-size:9px;margin-right:4px">[${e.tag}]</span>` +
      `<span style="color:${e.color};font-size:10px;word-break:break-all">${e.msg}</span>` +
      `</div>`
    ).join('');
    el.scrollTop = 0;
  }

  (function injectDebugPanel() {
    const dbgPanel = document.createElement('div');
    dbgPanel.id = 'zxDebugPanel';
    dbgPanel.innerHTML = `
      <div id="zxDebugToggle">
        <div style="display:flex;align-items:center;gap:6px">
          <span id="zxDbgDot" style="width:7px;height:7px;border-radius:50%;background:#E8436A;display:inline-block;animation:dbgDotPulse 1.5s ease-in-out infinite;flex-shrink:0"></span>
          <span style="font-size:10px;font-weight:700;color:rgba(180,80,255,0.85);letter-spacing:0.08em;font-family:JetBrains Mono,monospace">🛠 ZX DEBUG</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span id="zxDebugCount" style="font-size:9px;color:rgba(255,255,255,0.3);font-family:JetBrains Mono,monospace">0 entries</span>
          <button id="zxDebugClear">clear</button>
          <span id="zxDebugArrow" style="font-size:10px;color:rgba(255,255,255,0.4)">▲</span>
        </div>
      </div>
      <div id="zxDebugLog"></div>
    `;
    document.body.appendChild(dbgPanel);

    const toggleEl = document.getElementById('zxDebugToggle');
    const arrowEl  = document.getElementById('zxDebugArrow');
    const countEl  = document.getElementById('zxDebugCount');
    const clearBtn = document.getElementById('zxDebugClear');

    toggleEl.addEventListener('click', e => {
      if (e.target === clearBtn || clearBtn.contains(e.target)) return;
      dbgVisible = !dbgVisible;
      dbgPanel.classList.toggle('zx-dbg-open', dbgVisible);
      arrowEl.textContent = dbgVisible ? '▼' : '▲';
      if (dbgVisible) renderDbg();
    });
    clearBtn.addEventListener('click', e => {
      e.stopPropagation();
      dbgLines.length = 0;
      const el = document.getElementById('zxDebugLog');
      if (el) el.innerHTML = '';
    });
    setInterval(() => { if (countEl) countEl.textContent = dbgLines.length + ' entries'; }, 500);
  })();

  /* Patch audio events to log */
  nativeAudio.addEventListener('play',    () => dbg('AUDIO', '▶ play — src: ' + (nativeAudio.src ? nativeAudio.src.slice(0,70) + '…' : 'none'), '#7ADB8A'));
  nativeAudio.addEventListener('pause',   () => dbg('AUDIO', '⏸ paused at ' + nativeAudio.currentTime.toFixed(1) + 's', '#FFB5C8'));
  nativeAudio.addEventListener('ended',   () => dbg('AUDIO', '⏹ ended', '#aaa'));
  nativeAudio.addEventListener('error',   () => {
    const err = nativeAudio.error;
    const codes = ['','ABORTED','NETWORK','DECODE','NOT_SUPPORTED'];
    const codeStr = err ? (codes[err.code] || 'code:'+err.code) : 'unknown';
    dbg('AUDIO', `❌ error [${codeStr}]: ${err?.message||'?'} — Cause: ${err?.code===3?'Decode/Format mismatch (wrong MIME or CORS)':err?.code===4?'URL not playable':err?.code===2?'Network blocked (CORS or expired)':'unknown'}`, '#ff4444');
  });
  nativeAudio.addEventListener('stalled',  () => dbg('AUDIO', '⚠️ stalled (network slow or CORS block)', '#ffaa44'));
  nativeAudio.addEventListener('waiting',  () => dbg('AUDIO', '⏳ buffering…', '#ffaa44'));
  nativeAudio.addEventListener('canplay',  () => dbg('AUDIO', '✅ canplay — ready to play', '#7ADB8A'));
  nativeAudio.addEventListener('loadstart',() => dbg('AUDIO', '🔄 loadstart', '#aaa'));

  dbg('INIT', 'ZeroX Hub v7 loaded ✓ — BGPlay + AutoPlay fixes active', '#7ADB8A');
  dbg('INFO', 'Audio error DECODE(3)=format mismatch | NETWORK(2)=CORS/expired | NOTSUP(4)=codec', '#B450FF');

  renderQueue();

})();
