/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (Zero-Lag Optimized Overlay)
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const panel       = document.getElementById('zxPanel');
  const handle      = document.getElementById('zxHandle');
  const closeHandle = document.getElementById('closeHandle');
  
  const nativeAudio = document.getElementById('nativeAudio');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  const spFrameWrap = document.getElementById('spFrameWrap');
  
  const cinemaMode  = document.getElementById('cinemaMode');
  const spotifyMode = document.getElementById('spotifyMode');
  const vinylRecord = document.getElementById('vinylRecord');
  const musicTitle  = document.getElementById('musicTitle');
  const musicArtist = document.getElementById('musicArtist');
  const mpTitle     = document.getElementById('mpTitle');

  const mpPlay      = document.getElementById('mpPlay');
  const mpPrev      = document.getElementById('miniPrev'); 
  const mpNext      = document.getElementById('miniNext');
  
  const urlInput    = document.getElementById('urlInput');
  const urlAddBtn   = document.getElementById('urlAddBtn');
  const fileInput   = document.getElementById('fileInput');
  const ytInput     = document.getElementById('ytInput');
  const ytAddBtn    = document.getElementById('ytAddBtn');
  const spInput     = document.getElementById('spInput');
  const spAddBtn    = document.getElementById('spAddBtn');
  const queueList   = document.getElementById('queueList');

  const mpSyncBadge = document.getElementById('mpSyncBadge');
  const mpSyncBtn   = document.getElementById('mpSyncBtn');
  const mpSyncInfo  = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn = document.getElementById('mpUnsyncBtn');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  let queue           = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx      = parseInt(localStorage.getItem('zx_qidx') || '0');
  let synced          = false;
  let activeType      = 'none'; 
  let isPlaying       = false;
  let ytPlayer        = null; 
  let isYtReady       = false;
  let isRemoteAction  = false;
  let remoteTimer     = null;
  function setRemoteAction() { isRemoteAction = true; clearTimeout(remoteTimer); remoteTimer = setTimeout(() => { isRemoteAction = false; }, 800); }

  /* ── 📱 SWIPE GESTURE ENGINE (ZERO-LAG FIX) ────────────── */
  let startY = 0;
  let isPanelOpen = false;
  
  function openPanel() {
    if (isPanelOpen) return;
    isPanelOpen = true;
    panel.classList.add('zx-open');
    document.body.style.overflow = 'hidden'; // Locks background scroll cleanly without lag
  }
  
  function closePanel() {
    if (!isPanelOpen) return;
    isPanelOpen = false;
    panel.classList.remove('zx-open');
    document.body.style.overflow = ''; // Unlocks background scroll
  }

  // Pull Down
  handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
  handle.addEventListener('touchmove', (e) => {
    if (isPanelOpen) return; // Prevent lag loop
    let diff = e.touches[0].clientY - startY;
    if (diff > 35) openPanel();
  }, {passive: true});

  // Pull Up
  closeHandle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
  closeHandle.addEventListener('touchmove', (e) => {
    if (!isPanelOpen) return;
    let diff = startY - e.touches[0].clientY;
    if (diff > 35) closePanel();
  }, {passive: true});
  
  closeHandle.addEventListener('click', closePanel);

  /* ── TABS LOGIC ────────────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  function showToast(msg) {
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  /* ── YOUTUBE ENGINE ────────────────────────────────────── */
  const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('ytFrame', {
      events: { 'onReady': () => { isYtReady = true; }, 'onStateChange': onPlayerStateChange }
    });
  };

  function onPlayerStateChange(event) {
    if (!synced || isRemoteAction) {
      if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); }
      if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); }
      return;
    }
    const time = ytPlayer.getCurrentTime();
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); broadcastSync({ action: 'play', time }); }
    else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time }); }
    else if (event.data === YT.PlayerState.ENDED) { playNext(); }
  }

  /* ── INPUT MANAGERS ────────────────────────────────────── */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); }
    else if (isSpotifyUrl(val)) { addToQueue({ type: 'spotify', title: 'Spotify Track', url: val }); }
    else { addToQueue({ type: 'stream', title: val.split('/').pop() || 'Cloud Media', url: val }); }
    urlInput.value = '';
  });

  ytAddBtn.addEventListener('click', () => { const val = ytInput.value.trim(); if (!val) return; loadYouTube(val); ytInput.value = ''; });
  if(spAddBtn) spAddBtn.addEventListener('click', () => { const val = spInput.value.trim(); if (!val) return; addToQueue({ type: 'spotify', title: 'Spotify', url: val }); spInput.value = ''; });

  if(fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    addToQueue({ type: 'stream', title: file.name, url: url });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function isSpotifyUrl(url) { return /spo/.test(url) && /tify/.test(url); }

  function loadYouTube(url) {
    const id = extractYouTubeId(url);
    if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    const fakeUrl = 'https://www.youtube.com/watch?v=' + id;
    addToQueue({ type: 'youtube', title: 'YouTube Video', url: fakeUrl, ytId: id });
  }

  /* ── QUEUE & AUTO-PLAY ─────────────────────────────────── */
  function addToQueue(item) {
    if(queue.length > 0 && queue[queue.length-1].url === item.url) { playQueueItem(queue.length - 1); return; }
    queue.push(item); saveQueue(); renderQueue();
    playQueueItem(queue.length - 1);
  }
  
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); } catch {} }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty" style="color:#aaa;text-align:center;">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      let icon = '🎵'; if (item.type === 'youtube') icon = '▶'; if (item.type === 'stream') icon = '☁️';
      el.innerHTML = `<span style="font-size:12px">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); saveQueue(); renderQueue(); return; } playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return; currentIdx = i; saveQueue(); renderQueue(); const item = queue[i];
    if (synced && !isRemoteAction && !item.url.startsWith('blob:')) { broadcastSync({ action: 'change_song', item: item }); }
    renderMedia(item);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  if(mpNext) mpNext.addEventListener('click', playNext);
  if(mpPrev) mpPrev.addEventListener('click', playPrev);

  /* ── 🔥 CONTEXT-AWARE MEDIA RENDERER 🔥 ────────────────── */
  function renderMedia(item) {
    nativeAudio.style.display = 'none'; ytFrameWrap.style.display = 'none'; if(spFrameWrap) spFrameWrap.style.display = 'none';
    nativeAudio.pause(); nativeAudio.removeAttribute('src'); nativeAudio.srcObject = null;
    if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    
    const isAudioOnly = item.type === 'spotify' || item.title.toLowerCase().endsWith('.mp3') || item.title.toLowerCase().endsWith('.m4a');
    
    if (isAudioOnly) {
        cinemaMode.classList.add('hidden');
        spotifyMode.classList.remove('hidden');
    } else {
        spotifyMode.classList.add('hidden');
        cinemaMode.classList.remove('hidden');
    }

    if (item.type === 'youtube') {
      const id = item.ytId || extractYouTubeId(item.url); if (!id) return;
      activeType = 'youtube'; ytFrameWrap.style.display = 'block';
      if (isYtReady && typeof ytPlayer.loadVideoById === 'function') ytPlayer.loadVideoById(id); else setTimeout(() => renderMedia(item), 500);
      setTrackInfo(item.title, 'YouTube Live');
    } 
    else if (item.type === 'spotify') {
      activeType = 'spotify'; if(spFrameWrap) spFrameWrap.style.display = 'block';
      const embedUrl = item.url.includes('/embed/') ? item.url : item.url.replace('open.spotify.com', 'open.spotify.com/embed');
      if(spFrame) spFrame.src = embedUrl; setTrackInfo(item.title, 'Spotify Track');
    } 
    else if (item.type === 'stream') {
      activeType = 'stream'; 
      if (!isAudioOnly) nativeAudio.style.display = 'block'; 
      
      nativeAudio.src = item.url; 
      nativeAudio.play().then(() => {
          isPlaying = true; updatePlayBtn();
      }).catch(()=>{
          showToast("⚠️ Tap Play button to start");
          isPlaying = false; updatePlayBtn();
      });
      setTrackInfo(item.title, 'Cloud Stream');
    }
  }

  /* ── GLOBAL CONTROLLER ─────────────────────────────────── */
  if(mpPlay) mpPlay.addEventListener('click', () => {
    if (activeType === 'stream') {
       if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{});
    } else if (activeType === 'youtube' && ytPlayer) {
       if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  });

  function updatePlayBtn() { 
    if(mpPlay) mpPlay.textContent = isPlaying ? '⏸' : '▶'; 
    if (isPlaying) vinylRecord.classList.add('playing'); else vinylRecord.classList.remove('playing');
  }
  
  function setTrackInfo(title, sub) { 
    musicTitle.textContent = title; musicArtist.textContent = sub; 
    mpTitle.textContent = `${title} • ${sub}`;
  }

  /* ── PLAY/PAUSE SYNC LISTENERS ─────────────────────────── */
  nativeAudio.addEventListener('play',  () => { isPlaying = true; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('seeked', () => { if (synced && !isRemoteAction) broadcastSync({ action: 'seek', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('ended', playNext);

  /* ── DEEP SYNC NETWORK ────────────────────── */
  mpSyncBtn.addEventListener('click', () => {
    synced = true; mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncBtn.style.display = 'none'; mpSyncInfo.style.display = 'flex';
    broadcastSync({ action: 'request_sync' }); showToast('🔗 Sync Network Active');
  });

  mpUnsyncBtn.addEventListener('click', () => {
    synced = false; mpSyncBadge.textContent = '🔴 Solo'; mpSyncBadge.classList.remove('synced');
    mpSyncBtn.style.display = 'block'; mpSyncInfo.style.display = 'none';
  });

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  window._zxReceiveSync = function (data) {
    if (data.action === 'request_sync') {
      if (synced && queue.length > 0 && queue[currentIdx] && !queue[currentIdx].url.startsWith('blob:')) {
           broadcastSync({ action: 'change_song', item: queue[currentIdx] });
           setTimeout(() => {
              let curTime = 0; if (activeType === 'youtube' && ytPlayer) curTime = ytPlayer.getCurrentTime(); else if (activeType === 'stream') curTime = nativeAudio.currentTime;
              broadcastSync({ action: isPlaying ? 'play' : 'pause', time: curTime });
           }, 1000);
      } return;
    }

    if (!synced) return; 
    setRemoteAction();

    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.url && q.url === data.item.url);
      if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
      currentIdx = idx; saveQueue(); renderQueue(); renderMedia(data.item);
      return;
    }

    if (activeType === 'youtube' && ytPlayer && isYtReady) {
      if (data.action === 'play') { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek') { ytPlayer.seekTo(data.time, true); }
    } else if (activeType === 'stream') {
      if (data.action === 'play') { if(Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time; nativeAudio.play().catch(()=>{}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek') { nativeAudio.currentTime = data.time; }
    }
  };

  renderQueue();
})();
