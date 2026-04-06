/* ═══════════════════════════════════════════════════════════
   ZEROX MUSIC PLAYER — player.js
   TRUE TWO-WAY SYNC ENGINE + P2P WEBTORRENT (SAFE TRACKERS)
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
  const nativeAudio = document.getElementById('nativeAudio'); // Video tag
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
  
  // Anti-Loop Logic 
  let isRemoteAction  = false;
  let remoteTimer     = null;
  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 1500); 
  }

  // P2P WebTorrent Client
  let wtClient = null;

  /* 🔥 SAFE P2P TRACKERS (Bypasses browser warnings) 🔥 */
  const SAFE_TRACKERS = {
    announce: [
      'wss://tracker.webtorrent.dev',
      'wss://tracker.files.fm:7073/announce',
      'wss://tracker.openwebtorrent.com'
    ]
  };

  /* ── TOAST LOGIC ───────────────────────────────────────── */
  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;pointer-events:none;animation:fadeInOut 3s forwards;';
    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style'); style.id = 'toastStyles';
      style.innerHTML = `@keyframes fadeInOut { 0%{opacity:0;transform:translate(-50%,10px)} 10%{opacity:1;transform:translate(-50%,0)} 90%{opacity:1} 100%{opacity:0} }`;
      document.head.appendChild(style);
    }
    document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
  }

  /* ── WebTorrent Setup ───────────────────────────────────── */
  function getWT() {
    if (!wtClient && window.WebTorrent) { wtClient = new window.WebTorrent(); }
    return wtClient;
  }

  /* ── UI Toggles ─────────────────────────────────────────── */
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

  /* ── YouTube API Setup ──────────────────────────────────── */
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = function() {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      height: '250', width: '100%',
      playerVars: { 'autoplay': 1, 'controls': 1, 'playsinline': 1, 'rel': 0 },
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
    if (event.data === YT.PlayerState.PLAYING) {
      isPlaying = true; updatePlayBtn(); broadcastSync({ action: 'play', time });
    } else if (event.data === YT.PlayerState.PAUSED) {
      isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time });
    } else if (event.data === YT.PlayerState.ENDED) {
      playNext();
    }
  }

  /* ── Inputs & Files ─────────────────────────────────────── */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { addToQueue({ type: 'youtube', title: 'YouTube Audio', url: val }); urlInput.value = ''; return; }
    if (isSpotifyUrl(val)) { addToQueue({ type: 'spotify', title: 'Spotify Track', url: val }); urlInput.value = ''; return; }
    addToQueue({ type: 'audio', title: val.split('/').pop() || 'Audio', url: val }); urlInput.value = '';
  });

  ytAddBtn.addEventListener('click', () => {
    const val = ytInput.value.trim(); if (!val) return;
    addToQueue({ type: 'youtube', title: 'YouTube Audio', url: val }); ytInput.value = '';
  });

  spAddBtn.addEventListener('click', () => {
    const val = spInput.value.trim(); if (!val) return;
    addToQueue({ type: 'spotify', title: 'Spotify Track', url: val }); spInput.value = '';
  });

  /* 🔥 SECURE P2P FILE UPLOAD LOGIC 🔥 */
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    
    if (synced) {
      const wt = getWT();
      if (!wt) return showToast("⚠️ WebTorrent is loading, try again in 2 seconds!");
      
      showToast("🌐 Creating Secure P2P Network (Do not close tab!)");
      
      // Using SAFE_TRACKERS to prevent browser block
      wt.seed(file, SAFE_TRACKERS, (torrent) => {
        showToast("✅ File ready for partner! Playing now...");
        addToQueue({ type: 'torrent', title: file.name, magnet: torrent.magnetURI });
      });
    } else {
      const url = URL.createObjectURL(file);
      addToQueue({ type: 'audio', title: file.name, url: url });
    }
  });

  function isYouTubeUrl(url) { return /you/.test(url) && /tube|tu\.be/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function isSpotifyUrl(url) { return /spo/.test(url) && /tify/.test(url); }

  /* ── Queue Management & Rendering ───────────────────────── */
  function addToQueue(item) {
    if(queue.length > 0 && queue[queue.length-1].url === item.url && queue[queue.length-1].title === item.title) return;
    queue.push(item); saveQueue(); renderQueue();
    if (queue.length === 1 || activeType === 'none') playQueueItem(queue.length - 1);
  }
  
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); } catch {} }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Empty</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      let icon = '🎵'; if (item.type === 'youtube') icon = '▶ YT'; if (item.type === 'spotify') icon = '♫ SP'; if (item.type === 'torrent') icon = '🌐 P2P';
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); saveQueue(); renderQueue(); return; } playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return; 
    currentIdx = i; saveQueue(); renderQueue();
    const item = queue[i];

    if (synced && !isRemoteAction) {
      broadcastSync({ action: 'change_song', item: item });
    }

    renderMedia(item);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  mpNext.addEventListener('click', () => { if(queue.length > 0) playNext(); });
  mpPrev.addEventListener('click', () => { if(queue.length > 0) playPrev(); });

  function renderMedia(item) {
    nativeAudio.style.display = 'none'; ytFrameWrap.style.display = 'none'; spFrameWrap.style.display = 'none';
    nativeAudio.pause(); if (ytPlayer && isYtReady) ytPlayer.pauseVideo();
    
    if (item.type === 'youtube') {
      const id = extractYouTubeId(item.url); if (!id) return;
      activeType = 'youtube'; ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(id); else setTimeout(() => renderMedia(item), 500);
      setTrackInfo('YouTube', 'Deep Sync Active');
    } 
    else if (item.type === 'spotify') {
      activeType = 'spotify'; spFrameWrap.style.display = 'block';
      const embedUrl = item.url.includes('/embed/') ? item.url : item.url.replace('open.spotify.com', 'open.spotify.com/embed');
      spFrame.src = embedUrl;
      setTrackInfo('Spotify', item.title);
    } 
    else if (item.type === 'audio') {
      activeType = 'audio'; nativeAudio.style.display = 'block';
      nativeAudio.src = item.url; nativeAudio.play().catch(()=>{});
      setTrackInfo(item.title, 'Direct Media');
      isPlaying = true; updatePlayBtn();
    }
    else if (item.type === 'torrent') {
      activeType = 'torrent'; nativeAudio.style.display = 'block';
      setTrackInfo(item.title, '📡 Connecting to P2P...');
      const wt = getWT();
      if (wt) {
        const existing = wt.get(item.magnet);
        if (existing) {
          playTorrentMedia(existing);
        } else {
          // Using SAFE_TRACKERS when receiving as well
          wt.add(item.magnet, SAFE_TRACKERS, (torrent) => { playTorrentMedia(torrent); });
        }
      }
    }
  }

  function playTorrentMedia(torrent) {
    const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mp3') || f.name.endsWith('.webm') || f.name.endsWith('.mkv')) || torrent.files[0];
    file.renderTo(nativeAudio);
    setTrackInfo(torrent.name, '▶ P2P Stream Active');
    nativeAudio.play().catch(()=>{});
    isPlaying = true; updatePlayBtn();
  }

  /* ── TRUE TWO-WAY SYNC FOR NATIVE MEDIA ── */
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

  /* ── UNIVERSAL CONTROLLER (Play/Pause) ──────────────────── */
  mpPlay.addEventListener('click', () => {
    if (activeType === 'audio' || activeType === 'torrent') {
      if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{});
    } else if (activeType === 'youtube' && ytPlayer) {
      if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    } else if (activeType === 'spotify') {
      showToast("🔒 Tap Play inside the Spotify box!");
    }
  });

  function updatePlayBtn() { mpPlay.textContent = isPlaying ? '⏸' : '▶'; }
  function setTrackInfo(title, sub) { mpTitle.textContent = title; mpSub.textContent = sub; }

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
      if (synced && queue.length > 0) {
        broadcastSync({ action: 'change_song', item: queue[currentIdx] });
      }
      return;
    }

    if (!synced) return; 

    setRemoteAction();

    if (data.action === 'change_song') {
      showToast('🎵 Partner changed the track');
      let idx = queue.findIndex(q => (q.url && q.url === data.item.url) || (q.magnet && q.magnet === data.item.magnet));
      if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
      currentIdx = idx; saveQueue(); renderQueue(); renderMedia(data.item);
      return;
    }

    if (activeType === 'youtube' && ytPlayer && isYtReady) {
      if (data.action === 'play') { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek') { ytPlayer.seekTo(data.time, true); }
    } else if (activeType === 'audio' || activeType === 'torrent') {
      if (data.action === 'play') { nativeAudio.currentTime = data.time; nativeAudio.play().catch(()=>{}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek') { nativeAudio.currentTime = data.time; }
    }
  };

  renderQueue();
})();
