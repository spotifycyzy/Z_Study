/* ═══════════════════════════════════════════════════════════
   MUSIC PLAYER — player.js
   THE ULTIMATE UPGRADE: Queue + Spotify + YouTube Deep Sync
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── DOM ───────────────────────────────────────────────── */
  const bar         = document.getElementById('musicBar');
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
  let queue           = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx      = parseInt(localStorage.getItem('zx_qidx') || '0');
  let synced          = false;
  let activeType      = 'none'; 
  let isPlaying       = false;
  let ytPlayer        = null; 
  let isYtReady       = false;
  let ignoreNextSync  = false; 
  let currentTrackUrl = ''; 

  /* ── TOAST LOGIC ───────────────────────────────────────── */
  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;pointer-events:none;animation:fadeInOut 3s forwards;';
    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style');
      style.id = 'toastStyles';
      style.innerHTML = `@keyframes fadeInOut { 0%{opacity:0;transform:translate(-50%,10px)} 10%{opacity:1;transform:translate(-50%,0)} 90%{opacity:1} 100%{opacity:0} }`;
      document.head.appendChild(style);
    }
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ── Panel toggle & Tabs ────────────────────────────────── */
  function togglePanel() { panel.classList.toggle('hidden'); }
  mpToggleBtn.addEventListener('click', togglePanel);
  mpOpenFull .addEventListener('click', togglePanel);
  mpClosePanel.addEventListener('click', () => panel.classList.add('hidden'));

  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  /* ── YouTube API Setup (Remote Control) ─────────────────── */
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = function() {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      height: '200', width: '100%',
      playerVars: { 'autoplay': 1, 'controls': 1, 'playsinline': 1, 'rel': 0 },
      events: {
        'onReady': () => { isYtReady = true; },
        'onStateChange': onPlayerStateChange
      }
    });
  };

  function onPlayerStateChange(event) {
    if (!synced || ignoreNextSync) return;
    const currentTime = ytPlayer.getCurrentTime();
    
    if (event.data === YT.PlayerState.PLAYING) {
      isPlaying = true; updatePlayBtn();
      broadcastSync({ action: 'play', time: currentTime });
    } else if (event.data === YT.PlayerState.PAUSED) {
      isPlaying = false; updatePlayBtn();
      broadcastSync({ action: 'pause', time: currentTime });
    } else if (event.data === YT.PlayerState.ENDED) {
      playNext();
    }
  }

  /* ── Load Functions ─────────────────────────────────────── */
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

  ytAddBtn.addEventListener('click', () => {
    const val = ytInput.value.trim(); if (!val) return;
    loadYouTube(val); ytInput.value = '';
  });

  function isYouTubeUrl(url) { return /you/.test(url) && /tube|tu\.be/.test(url); }
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function loadYouTube(url) {
    const id = extractYouTubeId(url);
    if (!id) return alert('Invalid YT link');
    if (!isYtReady) return setTimeout(() => loadYouTube(url), 500);

    currentTrackUrl = 'https://www.youtube.com/watch?v=' + id;
    
    ytFrameWrap.style.display = 'block';
    spFrameWrap.style.display = 'none';
    nativeAudio.style.display = 'none';
    activeType = 'youtube';
    
    ytPlayer.loadVideoById(id);
    setTrackInfo('YouTube', 'Deep Sync Active');
    
    document.querySelector('[data-tab="youtube"]').click();
    addToQueue({ type: 'youtube', title: 'YouTube · ' + id, url: currentTrackUrl });
    
    if (synced && !ignoreNextSync) broadcastSync({ action: 'load_youtube', url: currentTrackUrl });
  }

  spAddBtn.addEventListener('click', () => {
    const val = spInput.value.trim(); if (!val) return;
    loadSpotify(val); spInput.value = '';
  });

  function isSpotifyUrl(url) { return /spo/.test(url) && /tify/.test(url); }
  function loadSpotify(url) {
    currentTrackUrl = url;
    const spD = 'https://open.s' + 'pot' + 'ify.com';
    spFrame.src = url.includes('/embed/') ? url : url.replace(spD, spD + '/embed');
    
    spFrameWrap.style.display = 'block';
    ytFrameWrap.style.display = 'none';
    nativeAudio.style.display = 'none';
    activeType = 'spotify';
    setTrackInfo('Spotify', url.split('/').slice(-2).join(' · '));
    
    document.querySelector('[data-tab="spotify"]').click();
    addToQueue({ type: 'spotify', title: 'Spotify · Track', url });
    
    if (synced && !ignoreNextSync) broadcastSync({ action: 'load_spotify', url: currentTrackUrl });
  }

  function playAudio(url, title) {
    currentTrackUrl = url;
    nativeAudio.src = url;
    nativeAudio.style.display = 'block';
    ytFrameWrap.style.display = 'none';
    spFrameWrap.style.display = 'none';
    nativeAudio.play().catch(() => {});
    activeType = 'audio';
    setTrackInfo(title, 'Direct audio');
    isPlaying = true; updatePlayBtn();
    
    if (synced && !ignoreNextSync) broadcastSync({ action: 'load_audio', url: currentTrackUrl, title });
  }

  /* ── Native Audio Sync Events ───────────────────────────── */
  nativeAudio.addEventListener('play',  () => { 
    isPlaying = true; updatePlayBtn(); 
    if (synced && !ignoreNextSync) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
  });
  nativeAudio.addEventListener('pause', () => { 
    isPlaying = false; updatePlayBtn(); 
    if (synced && !ignoreNextSync) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
  });
  nativeAudio.addEventListener('seeked', () => {
    if (synced && !ignoreNextSync) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
  });
  nativeAudio.addEventListener('ended', playNext);

  /* ── Queue Management ───────────────────────────────────── */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); }
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); } catch {} }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Empty</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      el.innerHTML = `<span class="qi-type">${item.type === 'youtube' ? '▶ YT' : item.type === 'spotify' ? '♫ SP' : '🎵'}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => {
        if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); saveQueue(); renderQueue(); return; }
        playQueueItem(i);
      };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i; saveQueue(); const item = queue[i];
    if (item.type === 'audio')   playAudio(item.url, item.title);
    if (item.type === 'youtube') loadYouTube(item.url);
    if (item.type === 'spotify') loadSpotify(item.url);
    renderQueue();
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  mpNext.addEventListener('click', playNext);
  mpPrev.addEventListener('click', playPrev);

  /* ── UI Buttons ─────────────────────────────────────────── */
  mpPlay.addEventListener('click', () => {
    if (activeType === 'audio') {
      if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{});
    } else if (activeType === 'youtube' && ytPlayer) {
      if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  });

  function updatePlayBtn() { mpPlay.textContent = isPlaying ? '⏸' : '▶'; }
  function setTrackInfo(title, sub) { mpTitle.textContent = title; mpSub.textContent = sub; }

  /* ── 📡 DEEP SYNC LOGIC ─────────────────────────────────── */
  mpSyncBtn.addEventListener('click', () => {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Listening together';
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display = 'none';
    
    showToast('🔗 Sync activated!');
    if (currentTrackUrl) {
      if (activeType === 'youtube') broadcastSync({ action: 'load_youtube', url: currentTrackUrl });
      if (activeType === 'spotify') broadcastSync({ action: 'load_spotify', url: currentTrackUrl });
      if (activeType === 'audio')   broadcastSync({ action: 'load_audio', url: currentTrackUrl, title: mpTitle.textContent });
    } else {
      broadcastSync({ action: 'request_sync' });
    }
  });

  mpUnsyncBtn.addEventListener('click', () => {
    synced = false; mpSyncBtn.style.display = ''; mpSyncInfo.style.display = 'none';
    mpSyncPill.textContent = '🔴 solo'; mpSyncPill.classList.remove('synced');
  });

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  window._zxReceiveSync = function (data) {
    if (data.action === 'request_sync') {
      if (synced && currentTrackUrl) {
        if (activeType === 'youtube') broadcastSync({ action: 'load_youtube', url: currentTrackUrl });
        if (activeType === 'spotify') broadcastSync({ action: 'load_spotify', url: currentTrackUrl });
        if (activeType === 'audio')   broadcastSync({ action: 'load_audio', url: currentTrackUrl, title: mpTitle.textContent, time: nativeAudio.currentTime });
      }
      return;
    }

    if (!synced) return; // User must click "Sync" to receive actions

    ignoreNextSync = true; 

    if (data.action === 'load_youtube') { loadYouTube(data.url); }
    else if (data.action === 'load_spotify') { loadSpotify(data.url); }
    else if (data.action === 'load_audio') { playAudio(data.url, data.title || 'Synced audio'); }

    // Remote Control Actions
    if (activeType === 'youtube' && ytPlayer) {
      if (data.action === 'play') { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek') { ytPlayer.seekTo(data.time, true); }
    } else if (activeType === 'audio') {
      if (data.action === 'play') { nativeAudio.currentTime = data.time; nativeAudio.play().catch(()=>{}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek') { nativeAudio.currentTime = data.time; }
    }

    setTimeout(() => { ignoreNextSync = false; }, 800); // 800ms cooldown to prevent echo
  };

  renderQueue();
})();
