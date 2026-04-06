/* ═══════════════════════════════════════════════════════════
   MUSIC PLAYER — player.js
   Supports: Background Audio, YouTube Search, Sync Play
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── DOM ───────────────────────────────────────────────── */
  const panel       = document.getElementById('musicPanel');
  const mpTitle     = document.getElementById('mpTitle');
  const mpSub       = document.getElementById('mpSub');
  const mpPlay      = document.getElementById('mpPlay');
  const mpPrev      = document.getElementById('mpPrev');
  const mpNext      = document.getElementById('mpNext');
  const mpToggleBtn = document.getElementById('mpToggleBtn');
  const mpOpenFull  = document.getElementById('mpOpenFull');
  const mpClosePanel= document.getElementById('mpClosePanel');
  const mpSyncPill  = document.getElementById('mpSyncPill');
  const mpSyncBadge = document.getElementById('mpSyncBadge');
  const mpSyncBtn   = document.getElementById('mpSyncBtn');
  const mpSyncInfo  = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn = document.getElementById('mpUnsyncBtn');
  const nativeAudio = document.getElementById('nativeAudio');
  const urlInput    = document.getElementById('urlInput');
  const urlAddBtn   = document.getElementById('urlAddBtn');
  const fileInput   = document.getElementById('fileInput');
  const ytInput     = document.getElementById('ytInput');
  const ytAddBtn    = document.getElementById('ytAddBtn');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  const spInput     = document.getElementById('spInput');
  const spAddBtn    = document.getElementById('spAddBtn');
  const spFrame     = document.getElementById('spFrame');
  const spFrameWrap = document.getElementById('spFrameWrap');
  const queueList   = document.getElementById('queueList');

  /* ── State ─────────────────────────────────────────────── */
  let queue        = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx   = parseInt(localStorage.getItem('zx_qidx') || '0');
  let synced       = false;
  let activeType   = 'none'; // 'audio' | 'youtube' | 'spotify'
  let isPlaying    = false;
  let ytPlayer     = null;
  let isYtReady    = false;
  let ignoreNextSync = false;

  /* ── Panel toggle ───────────────────────────────────────── */
  function togglePanel() { panel.classList.toggle('hidden'); }
  mpToggleBtn.addEventListener('click', togglePanel);
  mpOpenFull .addEventListener('click', togglePanel);
  mpClosePanel.addEventListener('click', () => panel.classList.add('hidden'));

  /* ── Tab switching ──────────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  /* ── Android/iOS Background Lock-Screen Audio ───────────── */
  function updateMediaSession(title, artist) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'StudyVault Player',
        artist: artist || 'Private Session',
        artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3048/3048122.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => playCurrent(false));
      navigator.mediaSession.setActionHandler('pause', () => pauseCurrent(false));
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
  }

  /* ── Play / Pause Routing ───────────────────────────────── */
  mpPlay.addEventListener('click', () => {
    if (isPlaying) pauseCurrent(); else playCurrent();
  });

  function playCurrent(fromSync = false) {
    if (activeType === 'audio') nativeAudio.play().catch(()=>{});
    if (activeType === 'youtube' && ytPlayer && typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
    isPlaying = true; updatePlayBtn();
    if (synced && !fromSync) broadcastSync({ action: 'play' });
  }

  function pauseCurrent(fromSync = false) {
    if (activeType === 'audio') nativeAudio.pause();
    if (activeType === 'youtube' && ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    isPlaying = false; updatePlayBtn();
    if (synced && !fromSync) broadcastSync({ action: 'pause' });
  }

  function updatePlayBtn() { mpPlay.textContent = isPlaying ? '⏸' : '▶'; }

  /* ── URL / local add ────────────────────────────────────── */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; return; }
    if (isSpotifyUrl(val)) { loadSpotify(val); urlInput.value = ''; return; }
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

  /* ── YouTube Integration (Standard API + Search) ──────────── */
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api"; // The official, stable YouTube API
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  window.onYouTubeIframeAPIReady = function() {
    ytFrameWrap.innerHTML = '<div id="ytPlayerDiv"></div>';
    
    ytPlayer = new YT.Player('ytPlayerDiv', {
      height: '200', width: '100%',
      // We brought back normal controls (controls: 1). Mobile users can interact normally.
      playerVars: { 'autoplay': 1, 'controls': 1, 'playsinline': 1, 'rel': 0 },
      events: {
        'onReady': () => { isYtReady = true; },
        'onStateChange': (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            isPlaying = true; updatePlayBtn();
            if (synced && !ignoreNextSync) broadcastSync({ action: 'play', time: ytPlayer.getCurrentTime() });
            ignoreNextSync = false;
          }
          if (e.data === YT.PlayerState.PAUSED) {
            isPlaying = false; updatePlayBtn();
            if (synced && !ignoreNextSync) broadcastSync({ action: 'pause', time: ytPlayer.getCurrentTime() });
            ignoreNextSync = false;
          }
          if (e.data === YT.PlayerState.ENDED) playNext();
        }
      }
    });
  };

  ytAddBtn.addEventListener('click', () => {
    const val = ytInput.value.trim(); if (!val) return;
    ytInput.value = 'Searching...';
    loadYouTube(val); 
  });
  ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });

  function isYouTubeUrl(url) { return /youtube\.com|youtu\.be/.test(url); }
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function loadYouTube(queryOrUrl) {
    if (!isYtReady) return setTimeout(() => loadYouTube(queryOrUrl), 500);
    
    activeType = 'youtube';
    spFrameWrap.style.display = 'none'; nativeAudio.style.display = 'none';
    ytFrameWrap.style.display = 'block';

    const id = extractYouTubeId(queryOrUrl);
    
    if (id) {
      // It's a standard link
      executeYtPlay(id, 'YouTube Link', queryOrUrl);
      ytInput.value = '';
    } else {
      // It's a search term! We bypass YouTube's internal block by using a free API to get the ID
      fetch(`https://vid.puffyan.us/api/v1/search?q=${encodeURIComponent(queryOrUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const vidId = data[0].videoId;
            const title = data[0].title;
            executeYtPlay(vidId, title, queryOrUrl);
            ytInput.value = '';
          } else {
            alert('No results found!');
            ytInput.value = '';
          }
        })
        .catch(err => {
          alert('Search failed. Try pasting a link instead.');
          ytInput.value = '';
        });
    }
  }

  function executeYtPlay(vidId, title, originalQuery) {
    // Mobile browsers might still require the user to tap "Play" on the video once
    ytPlayer.loadVideoById(vidId);
    setTrackInfo(title, 'YouTube');
    addToQueue({ type: 'youtube', title: title, url: originalQuery });
    updateMediaSession(title, 'StudyVault YouTube');
    document.querySelector('[data-tab="youtube"]').click();
    if (synced) broadcastSync({ action: 'load_youtube', url: originalQuery });
  }

  /* ── Spotify ────────────────────────────────────────────── */
  spAddBtn.addEventListener('click', () => {
    const val = spInput.value.trim(); if (!val) return;
    loadSpotify(val); spInput.value = '';
  });
  spInput.addEventListener('keydown', e => { if (e.key === 'Enter') spAddBtn.click(); });

  function isSpotifyUrl(url) { return /spotify\.com/.test(url); }
  function loadSpotify(url) {
    // Restored to your original googleusercontent replacement just in case it was a proxy you needed
    const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    spFrame.src = embedUrl;
    spFrameWrap.style.display = 'block';
    ytFrameWrap.style.display = 'none'; nativeAudio.style.display = 'none';
    activeType = 'spotify';
    setTrackInfo('Spotify', url.split('/').slice(-2).join(' · '));
    updateMediaSession('Spotify Session', 'StudyVault');
    document.querySelector('[data-tab="spotify"]').click();
    addToQueue({ type: 'spotify', title: 'Spotify · ' + url.split('/').pop(), url });
    if (synced) broadcastSync({ action: 'load_spotify', url });
  }

  /* ── Native audio ───────────────────────────────────────── */
  function playAudio(url, title) {
    nativeAudio.src = url;
    nativeAudio.style.display = 'block';
    ytFrameWrap.style.display = 'none'; spFrameWrap.style.display = 'none';
    nativeAudio.play().catch(() => {});
    activeType = 'audio';
    setTrackInfo(title, 'Direct audio');
    updateMediaSession(title, 'Local Audio');
    if (synced) broadcastSync({ action: 'load_audio', url, title });
  }

  nativeAudio.addEventListener('play',  () => { 
    isPlaying = true; updatePlayBtn(); 
    if(synced && !ignoreNextSync) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('pause', () => { 
    isPlaying = false; updatePlayBtn(); 
    if(synced && !ignoreNextSync) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('seeked', () => {
    if(synced && !ignoreNextSync) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('ended', playNext);

  /* ── Queue ──────────────────────────────────────────────── */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); }
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); } catch {} }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue is empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      el.innerHTML = `
        <span class="qi-type">${item.type === 'youtube' ? '▶ YT' : item.type === 'spotify' ? '♫ SP' : '🎵'}</span>
        <span class="qi-title">${item.title}</span>
        <button class="qi-del" data-i="${i}">✕</button>
      `;
      el.addEventListener('click', e => {
        if (e.target.classList.contains('qi-del')) { queue.splice(parseInt(e.target.dataset.i), 1); saveQueue(); renderQueue(); return; }
        playQueueItem(i);
      });
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    currentIdx = i; const item = queue[i]; if (!item) return;
    if (item.type === 'audio')   playAudio(item.url, item.title);
    if (item.type === 'youtube') loadYouTube(item.url);
    if (item.type === 'spotify') loadSpotify(item.url);
    renderQueue();
  }

  function playNext() { if (currentIdx < queue.length - 1) playQueueItem(currentIdx + 1); }
  function playPrev() { if (currentIdx > 0) playQueueItem(currentIdx - 1); }

  function setTrackInfo(title, sub) { mpTitle.textContent = title; mpSub.textContent = sub; }

  /* ── Listen Together Deep Sync ──────────────────────────── */
  mpSyncBtn.addEventListener('click', () => {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Synced — listening together'; mpSyncBadge.classList.add('synced');
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display = 'none';
    
    if (activeType === 'youtube') broadcastSync({ action: 'load_youtube', url: ytInput.value });
    if (activeType === 'spotify') broadcastSync({ action: 'load_spotify', url: spInput.value });
    if (activeType === 'audio')   broadcastSync({ action: 'load_audio', url: nativeAudio.src, title: mpTitle.textContent });
  });

  mpUnsyncBtn.addEventListener('click', () => {
    synced = false;
    mpSyncPill.textContent = '🔴 solo'; mpSyncPill.classList.remove('synced');
    mpSyncBadge.textContent = '🔴 Solo mode'; mpSyncBadge.classList.remove('synced');
    mpSyncInfo.style.display = 'none'; mpSyncBtn.style.display = '';
  });

  function broadcastSync(data) {
    if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data });
  }

  window._zxReceiveSync = function (data) {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display = 'none';

    ignoreNextSync = true; 

    switch (data.action) {
      case 'load_youtube': loadYouTube(data.url); break;
      case 'load_spotify': loadSpotify(data.url); break;
      case 'load_audio':   playAudio(data.url, data.title || 'Synced audio'); break;
      case 'play':
        if (activeType === 'audio') { nativeAudio.currentTime = data.time || nativeAudio.currentTime; playCurrent(true); }
        if (activeType === 'youtube' && ytPlayer) { ytPlayer.seekTo(data.time, true); playCurrent(true); }
        break;
      case 'pause':
        if (activeType === 'audio') { nativeAudio.currentTime = data.time || nativeAudio.currentTime; pauseCurrent(true); }
        if (activeType === 'youtube' && ytPlayer) { ytPlayer.seekTo(data.time, true); pauseCurrent(true); }
        break;
      case 'seek':
        if (activeType === 'audio') nativeAudio.currentTime = data.time;
        if (activeType === 'youtube' && ytPlayer) ytPlayer.seekTo(data.time, true);
        break;
    }
    
    setTimeout(() => { ignoreNextSync = false; }, 500);
  };

  renderQueue();
})();
