/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (100% FULL CODE - ULTIMATE UPGRADE)
   💥 MAJOR FIX: "API Quota Saver" & 100% Accurate Song Matching
   🔥 1 API Call for Unlimited Synced Users!
   🚀 NEW ENGINES: yt-v3-alternative (Search) & spotify81 (Stream)
═══════════════════════════════════════════════════════════ */
'use strict';

// ==========================================
// 🛠️ MOBILE DEBUGGER (Android Logging)
// ==========================================
function logToMobile(message) {
    let consoleBox = document.getElementById('mobile-console');
    if (!consoleBox) {
        consoleBox = document.createElement('div');
        consoleBox.id = 'mobile-console';
        consoleBox.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 100%; height: 120px; background: rgba(0,0,0,0.85); color: #00FF00; overflow-y: scroll; z-index: 999999; font-size: 11px; padding: 10px; font-family: monospace; border-top: 2px solid #00FF00; pointer-events: none;';
        document.body.appendChild(consoleBox);
    }
    consoleBox.innerHTML += `<div>> ${message}</div>`;
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

(function () {
  /* ── DOM ELEMENTS ──────────────────────────────────────── */
  const panel       = document.getElementById('zxPanel');
  const handle      = document.getElementById('zxHandle');
  const closeHandle = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn'); 
  
  const nativeAudio = document.getElementById('nativeAudio');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  
  const cinemaMode  = document.getElementById('cinemaMode');
  const spotifyMode = document.getElementById('spotifyMode');
  const vinylRecord = document.getElementById('vinylRecord');
  const musicTitle  = document.getElementById('musicTitle');
  const musicArtist = document.getElementById('musicArtist');
  const miniTitle   = document.getElementById('miniTitle');

  const mpPlays     = document.querySelectorAll('.mp-play');
  const mpPrevs     = [document.getElementById('miniPrev')]; 
  const mpNexts     = [document.getElementById('miniNext')];
  
  const urlInput    = document.getElementById('urlInput');
  const urlAddBtn   = document.getElementById('urlAddBtn');
  const fileInput   = document.getElementById('fileInput');
  
  const ytInput     = document.getElementById('ytInput');
  const ytAddBtn    = document.getElementById('ytAddBtn');
  
  const spInput             = document.getElementById('spInput');
  const spSearchSongBtn     = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const queueList           = document.getElementById('queueList');

  const toggleListBtnUrl   = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  const dynamicEpListUrl   = document.getElementById('dynamicEpListUrl');
  
  const toggleListBtnYt    = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt  = document.getElementById('episodesOverlayYt');
  const ytSearchResults    = document.getElementById('ytSearchResults');

  const toggleListBtnSp    = document.getElementById('toggleListBtnSp');
  const episodesOverlaySp  = document.getElementById('episodesOverlaySp');
  const spSearchResults    = document.getElementById('spSearchResults');

  const mpSyncBadge = document.getElementById('mpSyncBadge');
  const mpSyncBtn   = document.getElementById('mpSyncBtn');
  const mpSyncInfo  = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn = document.getElementById('mpUnsyncBtn');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ── STATE ─────────────────────────────────────────────── */
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
      isRemoteAction = true; 
      clearTimeout(remoteTimer); 
      remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000); 
  }

  /* ── 📱 FLAWLESS OPEN/CLOSE ENGINE ─────────────────────── */
  let startY = 0; let isPanelOpen = false;
  function openPanel() {
    if(isPanelOpen) return; isPanelOpen = true;
    panel.classList.add('zx-open'); document.body.style.overflow = 'hidden'; 
    if(panelToggleBtn) panelToggleBtn.classList.add('active');
  }
  function closePanel() {
    if(!isPanelOpen) return; isPanelOpen = false;
    panel.classList.remove('zx-open'); document.body.style.overflow = ''; 
    if(panelToggleBtn) panelToggleBtn.classList.remove('active');
  }

  handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
  handle.addEventListener('touchmove', (e) => { if(!isPanelOpen && (e.touches[0].clientY - startY) > 15) openPanel(); }, {passive: true});
  if(panelToggleBtn) panelToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle.addEventListener('click', (e) => { if(e.target.closest('.mp-btn') || e.target.closest('.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
    closeHandle.addEventListener('touchmove', (e) => { if(isPanelOpen && (startY - e.touches[0].clientY) > 15) closePanel(); }, {passive: true});
    closeHandle.addEventListener('click', closePanel);
  }
  panel.addEventListener('touchmove', (e) => { if (isPanelOpen && !e.target.closest('.music-panel-inner')) { e.preventDefault(); } }, { passive: false });

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

  /* ── OVERLAYS TOGGLE BUTTONS ────────────────────── */
  if(toggleListBtnUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl.classList.toggle('hidden'));
  if(toggleListBtnYt) toggleListBtnYt.addEventListener('click', () => episodesOverlayYt.classList.toggle('hidden'));
  if(toggleListBtnSp) toggleListBtnSp.addEventListener('click', () => episodesOverlaySp.classList.toggle('hidden'));

  /* ── YOUTUBE ENGINE (IFRAME PLAYER) ────────────────────── */
  const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = function() {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
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
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); broadcastSync({ action: 'play', time }); }
    else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time }); }
    else if (event.data === YT.PlayerState.ENDED) { playNext(); }
  }


  /* =========================================================
     🔥 NEW API ARCHITECTURE (RAPID API)
     ========================================================= */
  const RAPID_API_KEY = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  
  // 🎧 ENGINE: Spotify 81 API (Best Quality M4A)
  async function fetchPremiumAudio(ytId) {
      logToMobile(`⚙️ Engine: Fetching Stream for ID: ${ytId}`);
      
      // FIX 1: Provide EXACT YouTube Standard Link to avoid API confusion
      const fullYtLink = `https://www.youtube.com/watch?v=${ytId}`;
      const url = `https://spotify81.p.rapidapi.com/download_track?q=${encodeURIComponent(fullYtLink)}&onlyLinks=true`;
      
      try {
          const response = await fetch(url, {
              method: 'GET',
              headers: {
                  'x-rapidapi-key': RAPID_API_KEY,
                  'x-rapidapi-host': 'spotify81.p.rapidapi.com'
              }
          });
          const result = await response.json();
          if (result.url) {
              logToMobile(`✅ Success! Audio Ready`);
              return result.url;
          } else {
              logToMobile('❌ Engine Error: No URL returned.');
              return null;
          }
      } catch (error) { 
          logToMobile(`❌ Engine Crash: ${error.message}`);
          return null; 
      }
  }

  // 🔍 FINDER: YT V3 Alternative API
  function searchYouTube(query, targetResultsDiv, mediaType) {
      if (!query) return;
      const resDiv = document.getElementById(targetResultsDiv);
      if(!resDiv) return;
      
      resDiv.innerHTML = '<p class="mp-empty">🔍 Searching Alternative API...</p>';
      if(targetResultsDiv === 'ytSearchResults') episodesOverlayYt.classList.remove('hidden');
      if(targetResultsDiv === 'spSearchResults') episodesOverlaySp.classList.remove('hidden');
      logToMobile(`🔍 Finder: Searching for "${query}"`);

      const searchUrl = `https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query)}&geo=US&lang=en&type=video`;

      fetch(searchUrl, {
          method: 'GET',
          headers: {
              'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com',
              'x-rapidapi-key': RAPID_API_KEY
          }
      })
      .then(res => res.json())
      .then(data => {
          resDiv.innerHTML = '';
          if(!data.data || data.data.length === 0) { 
              resDiv.innerHTML = '<p class="mp-empty">No results found.</p>'; 
              logToMobile('⚠️ Finder: No results found.');
              return; 
          }

          logToMobile(`✅ Finder: Got ${data.data.length} results`);

          data.data.forEach(vid => {
              // Extract thumbnail safely
              let thumbUrl = 'https://i.imgur.com/8Q5FqWj.jpeg';
              if (vid.thumbnail && vid.thumbnail.length > 0) thumbUrl = vid.thumbnail[0].url;

              // FIX 2: Bulletproof ID Extraction
              const actualVideoId = vid.videoId || vid.id;

              const div = document.createElement('div'); div.className = 'yt-search-item';
              div.innerHTML = `
                <img src="${thumbUrl}" class="yt-search-thumb"/>
                <div class="yt-search-info">
                  <div class="yt-search-title">${vid.title}</div>
                  <div class="yt-search-sub">${vid.channelTitle || 'YouTube'}</div>
                </div>
                <span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>
              `;
              div.onclick = () => {
                  addToQueue({ type: mediaType, title: vid.title, ytId: actualVideoId, thumb: thumbUrl });
                  showToast('🎵 Added to queue!');
                  logToMobile(`➕ Queued: ${vid.title} (${actualVideoId})`);
              };
              resDiv.appendChild(div);
          });
      }).catch(err => {
          logToMobile(`❌ Finder Crash: ${err.message}`);
          resDiv.innerHTML = '<p class="mp-empty">Error searching.</p>';
      });
  }

  if(ytAddBtn) ytAddBtn.onclick = () => { 
      const val = ytInput.value.trim(); if(isYouTubeUrl(val)) { loadYouTube(val); ytInput.value = ''; return; }
      searchYouTube(val, 'ytSearchResults', 'youtube'); ytInput.value = ''; 
  };
  if(spSearchSongBtn) spSearchSongBtn.onclick = () => { searchYouTube(spInput.value.trim(), 'spSearchResults', 'youtube_audio'); spInput.value = ''; };
  if(spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = () => { searchYouTube(spInput.value.trim(), 'spSearchResults', 'youtube_audio'); spInput.value = ''; };

  if(ytInput) ytInput.addEventListener('keydown', e => { if(e.key==='Enter') ytAddBtn.click(); });
  if(spInput) spInput.addEventListener('keydown', e => { if(e.key==='Enter' && spSearchSongBtn) spSearchSongBtn.click(); });
  if(urlInput) urlInput.addEventListener('keydown', e => { if(e.key==='Enter') urlAddBtn.click(); });

  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; }
    else if (val.startsWith('http')) { addToQueue({ type: 'stream', title: 'Cloud Media', url: val }); urlInput.value = ''; }
  });

  if(fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function loadYouTube(url) {
    const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id });
  }

  /* ── QUEUE & AUTO-PLAY ─────────────────────────────────── */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); playQueueItem(queue.length - 1); }
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); } catch {} }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div'); el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      let icon = item.type === 'youtube_audio' ? '🎧' : (item.type === 'stream' ? '☁️' : '🎬'); 
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); saveQueue(); renderQueue(); return; } playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return; currentIdx = i; saveQueue(); renderQueue(); const item = queue[i];
    const isBlob = item.url && item.url.startsWith('blob:');
    
    // 🛑 API SAVER: Do NOT broadcast immediately if it's youtube_audio (wait for API fetch first)
    if (synced && !isRemoteAction && !isBlob) { 
        if (item.type !== 'youtube_audio' || item.cachedUrl) {
            broadcastSync({ action: 'change_song', item: item }); 
        }
    }
    renderMedia(item);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

  /* ── 🔥 CONTEXT-AWARE MEDIA RENDERER 🔥 ────────────────── */
  function renderMedia(item) {
    nativeAudio.style.display = 'none'; ytFrameWrap.style.display = 'none';
    nativeAudio.pause(); nativeAudio.removeAttribute('src'); nativeAudio.srcObject = null;
    if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    isPlaying = false; updatePlayBtn();
    
    // 🎬 MODE 1: CINEMA (IFRAME)
    if (item.type === 'youtube') {
      activeType = 'youtube';
      spotifyMode.classList.add('hidden'); cinemaMode.classList.remove('hidden');
      ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId); else setTimeout(() => renderMedia(item), 500);
      setTrackInfo(item.title, 'YouTube Cinema Mode');
      setupMediaSession(item);
    } 
    // 🎧 MODE 2: YOUTUBE MP3 AUDIO (NEW SPOTIFY 81 API)
    else if (item.type === 'youtube_audio') {
      activeType = 'youtube_audio';
      cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
      ensureVisualizer(item);
      
      // 🤑 API QUOTA SAVER LOGIC
      if (item.cachedUrl) {
          logToMobile(`🔗 Sync/Cache: Skipping API call for ${item.title}`);
          setTrackInfo(item.title, '🔗 Shared Sync Stream');
          setupMediaSession(item);
          nativeAudio.src = item.cachedUrl;
          nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast("Tap ▶ to play"));
      } else {
          setTrackInfo(item.title, 'Extracting Premium Audio...');
          showToast('Fetching Premium M4A...');

          // NEW API CALL
          fetchPremiumAudio(item.ytId).then(mp3Link => {
              if(mp3Link) {
                  item.cachedUrl = mp3Link; 
                  
                  // 🔥 Broadcast the direct link to ALL friends
                  if (synced && !isRemoteAction) {
                      broadcastSync({ action: 'change_song', item: item });
                  }

                  setTrackInfo(item.title, 'Spotify Stream API (294kbps)');
                  setupMediaSession(item);
                  nativeAudio.src = mp3Link;
                  nativeAudio.play().then(() => { 
                      isPlaying = true; 
                      updatePlayBtn(); 
                      logToMobile('🎶 Audio Started Playing!');
                  }).catch(() => showToast("Tap ▶ to play"));
              } else {
                  setTrackInfo(item.title, 'Audio Fetch Failed');
                  showToast('API Error: Could not extract M4A.');
              }
          });
      }
    }
    // ☁️ MODE 3: CLOUD STREAM
    else if (item.type === 'stream') {
      activeType = 'stream'; 
      cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
      ensureVisualizer(item);
      setupMediaSession(item);
      
      nativeAudio.src = item.url; 
      nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast("Tap ▶ to play"));
      setTrackInfo(item.title, '☁️ Cloud Audio');
    }
  }

  function ensureVisualizer(item) {
      if(!document.querySelector('.music-visualizer')) {
          const viz = document.createElement('div'); viz.className='music-visualizer'; viz.id='visualizer';
          viz.innerHTML='<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>';
          vinylRecord.parentNode.insertBefore(viz, vinylRecord.nextSibling);
      }
      vinylRecord.style.backgroundImage = `url('${item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg'}')`;
      vinylRecord.style.backgroundSize = 'cover';
      vinylRecord.style.backgroundPosition = 'center';
  }

  function setupMediaSession(item) {
      if('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
              title: item.title, artist: 'ZeroX Hub',
              artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes:'512x512', type:'image/jpeg' }]
          });
          navigator.mediaSession.setActionHandler('play',  () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.playVideo(); else nativeAudio.play(); });
          navigator.mediaSession.setActionHandler('pause', () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.pauseVideo(); else nativeAudio.pause(); });
          navigator.mediaSession.setActionHandler('previoustrack', playPrev);
          navigator.mediaSession.setActionHandler('nexttrack',     playNext);
      }
  }

  /* ── GLOBAL CONTROLLER ─────────────────────────────────── */
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
    if (activeType === 'stream' || activeType === 'youtube_audio') { 
        if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{}); 
    } else if (activeType === 'youtube' && ytPlayer) { 
        if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo(); 
    }
  }));

  function updatePlayBtn() { 
    mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶'); 
    const vis = document.getElementById('visualizer') || document.querySelector('.music-visualizer');
    if (isPlaying && (activeType === 'stream' || activeType === 'youtube_audio')) {
      vinylRecord.classList.add('playing'); if(vis) vis.classList.add('playing');
    } else {
      vinylRecord.classList.remove('playing'); if(vis) vis.classList.remove('playing');
    }
  }
  function setTrackInfo(title, sub) { musicTitle.textContent = title; musicArtist.textContent = sub; miniTitle.textContent = `${title} • ${sub}`; }

  nativeAudio.addEventListener('play',  () => { isPlaying = true; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('seeked', () => { if (synced && !isRemoteAction) broadcastSync({ action: 'seek', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('ended', playNext);

  /* ── DEEP SYNC NETWORK ────────────────────────── */
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
      const curItem = queue[currentIdx];
      const isBlob = curItem && curItem.url && curItem.url.startsWith('blob:');
      if (synced && curItem && !isBlob) {
           broadcastSync({ action: 'change_song', item: curItem });
           setTimeout(() => {
              let curTime = 0; 
              if (activeType === 'youtube' && ytPlayer && isYtReady) curTime = ytPlayer.getCurrentTime(); 
              else if (activeType === 'stream' || activeType === 'youtube_audio') curTime = nativeAudio.currentTime;
              broadcastSync({ action: isPlaying ? 'play' : 'pause', time: curTime });
           }, 1500); 
      } return;
    }

    if (!synced) return; setRemoteAction();

    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.title && q.title === data.item.title);
      if (idx === -1) { 
          queue.push(data.item); 
          idx = queue.length - 1; 
      } else {
          // 🛑 UPDATE EXISTING ITEM WITH NEW CACHED URL FROM HOST!
          queue[idx] = data.item; 
      }
      currentIdx = idx; saveQueue(); renderQueue(); renderMedia(queue[idx]); return;
    }

    if (activeType === 'youtube' && ytPlayer && isYtReady) {
      if (data.action === 'play') { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek') { ytPlayer.seekTo(data.time, true); }
    } else if (activeType === 'stream' || activeType === 'youtube_audio') {
      if (data.action === 'play') { if(Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time; nativeAudio.play().catch(()=>{}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek') { nativeAudio.currentTime = data.time; }
    }
  };

  /* ── 💥 FULLSCREEN LAG KILLER LOGIC 💥 ── */
  function toggleFullscreenState() {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
          document.body.classList.add('is-fullscreen');
      } else {
          document.body.classList.remove('is-fullscreen');
      }
  }
  document.addEventListener('fullscreenchange', toggleFullscreenState);
  document.addEventListener('webkitfullscreenchange', toggleFullscreenState);

  renderQueue();
})();
