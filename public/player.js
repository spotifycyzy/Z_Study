/* ═══════════════════════════════════════════════════════════
   ZEROX MUSIC PLAYER — player.js
   CLOUD SYNC ENGINE (For Telegram/Drive Direct Links & YT)
   FIXED: Universal Video Top + Flawless Swipe Engine
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── DOM ───────────────────────────────────────────────── */
  const panel       = document.getElementById('musicPanel');
  const musicBar    = document.getElementById('musicBar');
  const closeHandle = document.getElementById('closeHandle');
  const mpTitle     = document.getElementById('mpTitle');
  const mpSub       = document.getElementById('mpSub');
  const mpPlay      = document.getElementById('mpPlay');
  const mpPrev      = document.getElementById('mpPrev');
  const mpNext      = document.getElementById('mpNext');
  
  const mpClosePanel= document.getElementById('mpClosePanel');
  const mpSyncPill  = document.getElementById('mpSyncPill');
  const mpSyncBadge = document.getElementById('mpSyncBadge');
  const mpSyncBtn   = document.getElementById('mpSyncBtn');
  const mpSyncInfo  = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn = document.getElementById('mpUnsyncBtn');
  
  // Players now explicitly selected from the new Top Wrapper
  const nativeAudio = document.getElementById('nativeAudio'); 
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  const spFrameWrap = document.getElementById('spFrameWrap');
  const spFrame     = document.getElementById('spFrame');
  
  const urlInput    = document.getElementById('urlInput');
  const urlAddBtn   = document.getElementById('urlAddBtn');
  const fileInput   = document.getElementById('fileInput');
  const ytInput     = document.getElementById('ytInput');
  const ytAddBtn    = document.getElementById('ytAddBtn');
  const spInput     = document.getElementById('spInput');
  const spAddBtn    = document.getElementById('spAddBtn');
  const queueList   = document.getElementById('queueList');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');
  nativeAudio.removeAttribute('crossorigin'); 

  /* ── State ─────────────────────────────────────────────── */
  let queue           = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx      = parseInt(localStorage.getItem('zx_qidx') || '0');
  let synced          = false;
  let activeType      = 'none'; 
  let isPlaying       = false;
  let ytPlayer        = null; 
  let isYtReady       = false;
  
  let isRemoteAction  = false;
  let remoteTimer     = null;
  function setRemoteAction() {
    isRemoteAction = true; clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 800); 
  }

  /* ── TOAST LOGIC ───────────────────────────────────────── */
  function showToast(msg) {
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style'); style.id = 'toastStyles';
      style.innerHTML = `@keyframes fadeInOut { 0%{opacity:0;transform:translate(-50%,10px)} 10%{opacity:1;transform:translate(-50%,0)} 90%{opacity:1} 100%{opacity:0} }`;
      document.head.appendChild(style);
    }
    document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
  }

  /* ── 📱 FLAWLESS OVERLAY GESTURE ENGINE ────────────────── */
  let startY = 0;
  let isPanelOpen = false;

  function openPanel() {
    if (isPanelOpen) return;
    isPanelOpen = true;
    panel.classList.add('zx-open');
    document.body.style.overflow = 'hidden'; 
  }
  
  function closePanel() {
    if (!isPanelOpen) return;
    isPanelOpen = false;
    panel.classList.remove('zx-open');
    document.body.style.overflow = ''; 
  }

  // Swipe down from MusicBar
  musicBar.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
  musicBar.addEventListener('touchmove', (e) => {
    if (isPanelOpen) return;
    if (e.touches[0].clientY - startY > 15) openPanel();
  }, {passive: true});

  // Tap to open
  musicBar.addEventListener('click', (e) => {
    if(e.target.closest('.mp-btn')) return; // Ignore if user clicks play/pause button
    openPanel();
  });

  // Swipe up to close (using the close handle inside panel)
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
    closeHandle.addEventListener('touchmove', (e) => {
      if (!isPanelOpen) return;
      if (startY - e.touches[0].clientY > 15) closePanel();
    }, {passive: true});
    closeHandle.addEventListener('click', closePanel);
  }

  if (mpClosePanel) mpClosePanel.addEventListener('click', closePanel);

  // Prevent background scrolling behind the overlay
  document.addEventListener('touchmove', (e) => {
    if (isPanelOpen && !e.target.closest('.music-panel-inner')) {
      e.preventDefault();
    }
  }, { passive: false });


  /* ── TABS LOGIC ────────────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  /* ── ERROR HANDLER FOR DEAD LINKS ───────────────────────── */
  nativeAudio.addEventListener('error', () => {
    if (activeType === 'stream' || activeType === 'audio') {
        showToast("❌ Link expired ya unsupported format hai!");
        setTrackInfo("Error", "Broken Link");
    }
  });

  /* ── YouTube API Setup ──────────────────────────────────── */
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

  /* ── Inputs & URLs ─────────────────────────────────────── */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); }
    else if (isSpotifyUrl(val)) { addToQueue({ type: 'spotify', title: 'Spotify Track', url: val }); }
    else { addToQueue({ type: 'stream', title: 'Cloud Media Stream', url: val }); }
    urlInput.value = '';
  });

  ytAddBtn.addEventListener('click', () => { const val = ytInput.value.trim(); if (!val) return; loadYouTube(val); ytInput.value = ''; });
  spAddBtn.addEventListener('click', () => { const val = spInput.value.trim(); if (!val) return; addToQueue({ type: 'spotify', title: 'Spotify', url: val }); spInput.value = ''; });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function isSpotifyUrl(url) { return /spo/.test(url) && /tify/.test(url); }

  function loadYouTube(url) {
    const id = extractYouTubeId(url);
    if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    const fakeUrl = 'https://www.youtube.com/watch?v=' + id;
    addToQueue({ type: 'youtube', title: 'YouTube Video', url: fakeUrl, ytId: id });
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    if (synced) {
        showToast("💡 Pro Tip: Is file ko Telegram pe bhej kar uska direct link URL box me daalo (HD Sync ke liye)!");
    } else {
        const url = URL.createObjectURL(file);
        addToQueue({ type: 'stream', title: file.name, url: url });
    }
  });

  /* ── Queue Management (FIXED AUTO-PLAY) ─────────────────── */
  function addToQueue(item) {
    if(queue.length > 0 && queue[queue.length-1].url === item.url) {
        playQueueItem(queue.length - 1); return;
    }
    queue.push(item); saveQueue(); renderQueue();
    playQueueItem(queue.length - 1);
  }
  
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); } catch {} }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      let icon = '🎵'; if (item.type === 'youtube') icon = '▶ YT'; if (item.type === 'spotify') icon = '♫ SP'; if (item.type === 'stream') icon = '☁️ CLOUD';
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); saveQueue(); renderQueue(); return; } playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return; currentIdx = i; saveQueue(); renderQueue(); const item = queue[i];
    
    if (synced && !isRemoteAction && !item.url.startsWith('blob:')) {
      broadcastSync({ action: 'change_song', item: item });
    }
    renderMedia(item);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  if (mpNext) mpNext.addEventListener('click', playNext);
  if (mpPrev) mpPrev.addEventListener('click', playPrev);

  /* 🔥 MEDIA RENDERER 🔥 */
  function renderMedia(item) {
    nativeAudio.style.display = 'none'; ytFrameWrap.style.display = 'none'; spFrameWrap.style.display = 'none';
    nativeAudio.pause(); nativeAudio.removeAttribute('src'); nativeAudio.srcObject = null;
    if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    
    if (item.type === 'youtube') {
      const id = item.ytId || extractYouTubeId(item.url); if (!id) return;
      activeType = 'youtube'; ytFrameWrap.style.display = 'block';
      if (isYtReady && typeof ytPlayer.loadVideoById === 'function') ytPlayer.loadVideoById(id); else setTimeout(() => renderMedia(item), 500);
      setTrackInfo('YouTube', 'Live Sync Active');
    } 
    else if (item.type === 'spotify') {
      activeType = 'spotify'; spFrameWrap.style.display = 'block';
      const embedUrl = item.url.includes('/embed/') ? item.url : item.url.replace('open.spotify.com', 'open.spotify.com/embed');
      spFrame.src = embedUrl; setTrackInfo('Spotify', item.title);
    } 
    else if (item.type === 'stream') {
      activeType = 'stream'; nativeAudio.style.display = 'block';
      nativeAudio.src = item.url; 
      
      nativeAudio.play().then(() => {
          showToast("▶ Media Playing!");
          isPlaying = true; updatePlayBtn();
      }).catch((err)=>{
          console.warn("Autoplay blocked:", err);
          showToast("⚠️ Tap Play button to start");
          isPlaying = false; updatePlayBtn();
      });
      
      setTrackInfo(item.title, '☁️ Streaming (Direct)');
    }
  }

  /* ── PLAY/PAUSE/SEEK SYNC ── */
  nativeAudio.addEventListener('play',  () => { 
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
  nativeAudio.addEventListener('ended', playNext);

  /* ── UNIVERSAL CONTROLLER ──────────────────── */
  if (mpPlay) {
    mpPlay.addEventListener('click', () => {
      if (activeType === 'stream') {
         if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{});
      } else if (activeType === 'youtube' && ytPlayer) {
         if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
      }
    });
  }

  function updatePlayBtn() { if(mpPlay) mpPlay.textContent = isPlaying ? '⏸' : '▶'; }
  function setTrackInfo(title, sub) { if(mpTitle) mpTitle.textContent = title; if(mpSub) mpSub.textContent = sub; }

  /* ── 📡 DEEP SYNC NETWORK ───────────────────────────────── */
  mpSyncBtn.addEventListener('click', () => {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Listening together';
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display = 'none';
    showToast('🔗 Sync activated!');
    broadcastSync({ action: 'request_sync' });
  });

  mpUnsyncBtn.addEventListener('click', () => {
    synced = false; mpSyncBtn.style.display = ''; mpSyncInfo.style.display = 'none';
    mpSyncPill.textContent = '🔴 solo'; mpSyncPill.classList.remove('synced');
  });

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  // 📥 RECEIVER ENGINE
  window._zxReceiveSync = function (data) {
    if (data.action === 'request_sync') {
      if (synced && queue.length > 0 && queue[currentIdx] && !queue[currentIdx].url.startsWith('blob:')) {
           broadcastSync({ action: 'change_song', item: queue[currentIdx] });
           setTimeout(() => {
              let curTime = 0;
              if (activeType === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') curTime = ytPlayer.getCurrentTime();
              else if (activeType === 'stream') curTime = nativeAudio.currentTime;
              broadcastSync({ action: isPlaying ? 'play' : 'pause', time: curTime });
           }, 1000);
      }
      return;
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
      if (data.action === 'play') { 
          if(Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time;
          nativeAudio.play().catch(()=>{}); 
      }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek') { nativeAudio.currentTime = data.time; }
    }
  };

  renderQueue();
})();
