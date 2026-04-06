/* ═══════════════════════════════════════════════════════════
   MUSIC PLAYER — player.js
   RESTORED: Original Code + Perfected Listen Together Sync
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
  let queue        = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx   = parseInt(localStorage.getItem('zx_qidx') || '0');
  let synced       = false;
  let activeType   = 'none'; // 'audio' | 'youtube' | 'spotify'
  let isPlaying    = false;
  let ignoreNextSync = false; // Yeh loop banne se rokega

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
    if (isSpotifyUrl(val))  { loadSpotify(val);  urlInput.value = ''; return; }
    addToQueue({ type: 'audio', title: val.split('/').pop() || 'Audio', url: val });
    urlInput.value = '';
  });
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlAddBtn.click(); });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    addToQueue({ type: 'audio', title: file.name, url });
    playAudio(url, file.name);
  });

  /* ── YouTube ────────────────────────────────────────────── */
  ytAddBtn.addEventListener('click', () => {
    const val = ytInput.value.trim();
    if (!val) return;
    loadYouTube(val);
    ytInput.value = '';
  });
  ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });

  function isYouTubeUrl(url) {
    return /youtube\.com|youtu\.be/.test(url);
  }
  function loadYouTube(url) {
    const id = extractYouTubeId(url);
    if (!id) return alert('Could not extract YouTube ID');
    
    // Original YouTube Iframe Embed
    const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    ytFrame.src = embedUrl;
    
    ytFrameWrap.style.display = 'block';
    spFrameWrap.style.display = 'none';
    nativeAudio.style.display = 'none';
    activeType = 'youtube';
    setTrackInfo('YouTube', 'Playing link');
    
    document.querySelector('[data-tab="youtube"]').click();
    addToQueue({ type: 'youtube', title: 'YouTube · ' + id, url, id });
    
    // Broadcast the YouTube URL to partner
    if (synced && !ignoreNextSync) broadcastSync({ action: 'youtube', url });
    ignoreNextSync = false;
  }
  
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /* ── Spotify ────────────────────────────────────────────── */
  spAddBtn.addEventListener('click', () => {
    const val = spInput.value.trim();
    if (!val) return;
    loadSpotify(val);
    spInput.value = '';
  });
  spInput.addEventListener('keydown', e => { if (e.key === 'Enter') spAddBtn.click(); });

  function isSpotifyUrl(url) { return /spotify\.com/.test(url); }
  function loadSpotify(url) {
    const embedUrl = url.includes('/embed/') ? url : url.replace('https://open.spotify.com/', 'https://open.spotify.com/embed/');
    spFrame.src = embedUrl;
    spFrameWrap.style.display = 'block';
    ytFrameWrap.style.display = 'none';
    nativeAudio.style.display = 'none';
    activeType = 'spotify';
    setTrackInfo('Spotify', url.split('/').slice(-2).join(' · '));
    document.querySelector('[data-tab="spotify"]').click();
    addToQueue({ type: 'spotify', title: 'Spotify · ' + url.split('/').pop(), url });
    
    // Broadcast the Spotify URL to partner
    if (synced && !ignoreNextSync) broadcastSync({ action: 'spotify', url });
    ignoreNextSync = false;
  }

  /* ── Native audio ───────────────────────────────────────── */
  function playAudio(url, title) {
    nativeAudio.src = url;
    nativeAudio.style.display = 'block';
    ytFrameWrap.style.display = 'none';
    spFrameWrap.style.display = 'none';
    nativeAudio.play().catch(() => {});
    activeType = 'audio';
    setTrackInfo(title, 'Direct audio');
    isPlaying = true;
    updatePlayBtn();
    
    // Broadcast audio load
    if (synced && !ignoreNextSync) broadcastSync({ action: 'audio', url, title, time: 0 });
    ignoreNextSync = false;
  }

  /* ── Audio Sync Events ──────────────────────────────────── */
  nativeAudio.addEventListener('play',  () => { 
    isPlaying = true;  updatePlayBtn(); 
    if (synced && !ignoreNextSync) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('pause', () => { 
    isPlaying = false; updatePlayBtn(); 
    if (synced && !ignoreNextSync) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('seeked', () => {
    if (synced && !ignoreNextSync) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('ended', playNext);

  /* ── Play / Pause Button ────────────────────────────────── */
  mpPlay.addEventListener('click', () => {
    if (activeType !== 'audio') return;
    if (isPlaying) { nativeAudio.pause(); } else { nativeAudio.play().catch(() => {}); }
  });

  function updatePlayBtn() { mpPlay.textContent = isPlaying ? '⏸' : '▶'; }

  /* ── Queue ──────────────────────────────────────────────── */
  function addToQueue(item) {
    queue.push(item); saveQueue(); renderQueue();
  }

  function saveQueue() {
    try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); } catch {}
  }

  function renderQueue() {
    if (queue.length === 0) {
      queueList.innerHTML = '<p class="mp-empty">Queue is empty. Add songs from other tabs.</p>';
      return;
    }
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
        if (e.target.classList.contains('qi-del')) {
          queue.splice(parseInt(e.target.dataset.i), 1);
          saveQueue(); renderQueue(); return;
        }
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

  function playNext() {
    if (currentIdx < queue.length - 1) playQueueItem(currentIdx + 1);
  }
  function playPrev() {
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
  }
  mpNext.addEventListener('click', playNext);
  mpPrev.addEventListener('click', playPrev);

  function setTrackInfo(title, sub) {
    mpTitle.textContent = title;
    mpSub.textContent   = sub;
  }

  /* ── Listen Together Sync Logic ─────────────────────────── */
  mpSyncBtn.addEventListener('click', () => {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Synced — listening together'; mpSyncBadge.classList.add('synced');
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display  = 'none';
    
    // Send current state to partner immediately
    if (activeType === 'youtube') {
      const ytUrl = ytInput.value || (queue[currentIdx] && queue[currentIdx].url);
      if(ytUrl) broadcastSync({ action: 'youtube', url: ytUrl });
    }
    if (activeType === 'spotify') {
      const spUrl = spInput.value || (queue[currentIdx] && queue[currentIdx].url);
      if(spUrl) broadcastSync({ action: 'spotify', url: spUrl });
    }
    if (activeType === 'audio') {
      broadcastSync({ action: 'audio', url: nativeAudio.src, title: mpTitle.textContent, time: nativeAudio.currentTime });
    }
  });

  mpUnsyncBtn.addEventListener('click', () => {
    synced = false;
    mpSyncPill.textContent = '🔴 solo'; mpSyncPill.classList.remove('synced');
    mpSyncBadge.textContent = '🔴 Solo mode'; mpSyncBadge.classList.remove('synced');
    mpSyncInfo.style.display = 'none'; mpSyncBtn.style.display  = '';
  });

  function broadcastSync(data) {
    if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data });
  }

  // 📡 RECEIVER: When partner clicks play/pause or changes song
  window._zxReceiveSync = function (data) {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display  = 'none';

    ignoreNextSync = true; // Isko true kiya taaki infinity loop na bane

    if (data.action === 'youtube') { loadYouTube(data.url); }
    if (data.action === 'spotify') { loadSpotify(data.url); }
    if (data.action === 'audio')   { 
      playAudio(data.url, data.title || 'Synced audio'); 
      if(data.time) nativeAudio.currentTime = data.time;
    }
    
    // Deep Sync for local audio files (Play, Pause, Seek)
    if (activeType === 'audio') {
      if (data.action === 'play') {
        if(data.time !== undefined) nativeAudio.currentTime = data.time;
        nativeAudio.play().catch(()=>{});
      }
      if (data.action === 'pause') {
        if(data.time !== undefined) nativeAudio.currentTime = data.time;
        nativeAudio.pause();
      }
      if (data.action === 'seek') {
        nativeAudio.currentTime = data.time;
      }
    }

    // Har sync event ke 500ms baad flag wapas false kardo
    setTimeout(() => { ignoreNextSync = false; }, 500);
  };

  // Init queue render
  renderQueue();
})();
