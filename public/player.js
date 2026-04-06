/* ═══════════════════════════════════════════════════════════
   MUSIC PLAYER — player.js
   FIXED: Click-to-Sync Logic & URL Protection
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
  const ytFrame     = document.getElementById('ytFrame');
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
  let ignoreNextSync  = false; 
  let currentTrackUrl = ''; // 🔥 Tracks what WE are playing
  let pendingSyncData = null; // 🔥 Stores what PARTNER is playing

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

  /* ── URL / local add ────────────────────────────────────── */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim();
    if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; return; }
    if (isSpotifyUrl(val)) { loadSpotify(val); urlInput.value = ''; return; }
    addToQueue({ type: 'audio', title: val.split('/').pop() || 'Audio', url: val });
    urlInput.value = '';
  });
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlAddBtn.click(); });

  /* ── YouTube ────────────────────────────────────────────── */
  ytAddBtn.addEventListener('click', () => {
    const val = ytInput.value.trim();
    if (!val) return;
    loadYouTube(val);
    ytInput.value = '';
  });

  function isYouTubeUrl(url) { return /you/.test(url) && /tube|tu\.be/.test(url); }
  
  function loadYouTube(url) {
    const id = extractYouTubeId(url);
    if (!id) return alert('Invalid YT link');
    
    // Fragmented URL construction to prevent chat-filter corruption
    const ytD = 'https://www.y' + 'out' + 'ube.com';
    currentTrackUrl = ytD + '/watch?v=' + id; 
    
    ytFrame.src = ytD + '/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    ytFrameWrap.style.display = 'block';
    spFrameWrap.style.display = 'none';
    nativeAudio.style.display = 'none';
    activeType = 'youtube';
    setTrackInfo('YouTube', 'Live Sync Active');
    
    document.querySelector('[data-tab="youtube"]').click();
    addToQueue({ type: 'youtube', title: 'YouTube · ' + id, url: currentTrackUrl });
    
    if (synced && !ignoreNextSync) broadcastSync({ action: 'youtube', url: currentTrackUrl });
    ignoreNextSync = false;
  }
  
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /* ── Spotify ────────────────────────────────────────────── */
  function isSpotifyUrl(url) { return /spo/.test(url) && /tify/.test(url); }
  function loadSpotify(url) {
    currentTrackUrl = url;
    const spD = 'https://open.s' + 'pot' + 'ify.com';
    let embedUrl = url.includes('/embed/') ? url : url.replace(spD, spD + '/embed');
    
    spFrame.src = embedUrl;
    spFrameWrap.style.display = 'block';
    ytFrameWrap.style.display = 'none';
    nativeAudio.style.display = 'none';
    activeType = 'spotify';
    setTrackInfo('Spotify', 'Synced Session');
    
    document.querySelector('[data-tab="spotify"]').click();
    if (synced && !ignoreNextSync) broadcastSync({ action: 'spotify', url: currentTrackUrl });
    ignoreNextSync = false;
  }

  /* ── Native audio ───────────────────────────────────────── */
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
    
    if (synced && !ignoreNextSync) broadcastSync({ action: 'audio', url: url, title, time: 0 });
    ignoreNextSync = false;
  }

  /* ── Play / Pause UI ────────────────────────────────────── */
  mpPlay.addEventListener('click', () => {
    if (activeType !== 'audio') return; 
    if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{});
  });
  nativeAudio.addEventListener('play',  () => { isPlaying = true;  updatePlayBtn(); });
  nativeAudio.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); });
  function updatePlayBtn() { mpPlay.textContent = isPlaying ? '⏸' : '▶'; }

  /* ── Queue Management ───────────────────────────────────── */
  function addToQueue(item) { queue.push(item); localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); renderQueue(); }
  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Empty</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      el.innerHTML = `<span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => { if(!e.target.classList.contains('qi-del')) playQueueItem(i); };
      queueList.appendChild(el);
    });
  }
  function playQueueItem(i) { currentIdx = i; const item = queue[i]; if (item.type==='youtube') loadYouTube(item.url); else if (item.type==='spotify') loadSpotify(item.url); else playAudio(item.url, item.title); }

  /* ── 📡 SYNC LOGIC: CLICK TO JOIN ────────────────────────── */
  mpSyncBtn.addEventListener('click', () => {
    // 🔥 If there's a track waiting from partner, play it!
    if (pendingSyncData) {
      const data = pendingSyncData;
      pendingSyncData = null; // Clear it
      mpSyncBtn.style.boxShadow = ''; // Remove glow
      
      if (data.action === 'youtube') loadYouTube(data.url);
      if (data.action === 'spotify') loadSpotify(data.url);
      if (data.action === 'audio')   playAudio(data.url, data.title);
      
      showToast('✅ Joined partner\'s session!');
      return;
    }

    // Otherwise, turn on sync and broadcast my song
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Listening together';
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display = 'none';

    if (currentTrackUrl) {
      showToast('🔗 Syncing my track to room...');
      if (activeType === 'youtube') broadcastSync({ action: 'youtube', url: currentTrackUrl });
      if (activeType === 'spotify') broadcastSync({ action: 'spotify', url: currentTrackUrl });
      if (activeType === 'audio')   broadcastSync({ action: 'audio', url: currentTrackUrl, title: mpTitle.textContent });
    }
  });

  mpUnsyncBtn.addEventListener('click', () => {
    synced = false; mpSyncBtn.style.display = ''; mpSyncInfo.style.display = 'none';
    mpSyncPill.textContent = '🔴 solo'; mpSyncPill.classList.remove('synced');
  });

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  // 📡 Triggered when Partner sends a song
  window._zxReceiveSync = function (data) {
    // Save the song data but DONT play it automatically (to avoid browser block)
    pendingSyncData = data;
    
    // Make the Sync button glow so the user knows to click it
    mpSyncBtn.style.boxShadow = '0 0 15px #E8436A, 0 0 30px #E8436A';
    mpSyncBtn.innerHTML = 'Join Session 🔗';
    
    showToast('🎵 Partner is playing a track! Click Join to sync.');

    // Auto-update UI state
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    ignoreNextSync = true;
    setTimeout(() => { ignoreNextSync = false; }, 500);
  };

  renderQueue();
})();
