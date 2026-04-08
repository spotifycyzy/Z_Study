/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js
   Top Z-Button Toggle + LIVE YouTube & Global Music APIs
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── DOM ELEMENTS ──────────────────────────────────────── */
  const panel       = document.getElementById('zxPanel');
  const handle      = document.getElementById('zxHandle');
  const closeHandle = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn'); 
  
  const nativeAudio = document.getElementById('nativeAudio');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  const spFrameWrap = document.getElementById('spFrameWrap');
  const spFrame     = document.getElementById('spFrame');
  
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
  const spInput     = document.getElementById('spInput');
  const spAddBtn    = document.getElementById('spAddBtn');
  const queueList   = document.getElementById('queueList');

  // Second Overlay Elements
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
  nativeAudio.removeAttribute('crossorigin');

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
  function setRemoteAction() { isRemoteAction = true; clearTimeout(remoteTimer); remoteTimer = setTimeout(() => { isRemoteAction = false; }, 800); }

  /* ── 📱 FLAWLESS OPEN/CLOSE ENGINE ─────────────────────── */
  let startY = 0;
  let isPanelOpen = false;
  
  function openPanel() {
    if(isPanelOpen) return;
    isPanelOpen = true;
    panel.classList.add('zx-open');
    document.body.style.overflow = 'hidden'; 
    if(panelToggleBtn) panelToggleBtn.classList.add('active');
  }
  
  function closePanel() {
    if(!isPanelOpen) return;
    isPanelOpen = false;
    panel.classList.remove('zx-open');
    document.body.style.overflow = ''; 
    if(panelToggleBtn) panelToggleBtn.classList.remove('active');
  }

  handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
  handle.addEventListener('touchmove', (e) => {
    if(!isPanelOpen && (e.touches[0].clientY - startY) > 15) openPanel();
  }, {passive: true});

  if(panelToggleBtn) {
    panelToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(isPanelOpen) closePanel(); else openPanel();
    });
  }

  handle.addEventListener('click', (e) => {
    if(e.target.closest('.mp-btn') || e.target.closest('.z-trigger-btn')) return; 
    if(!isPanelOpen) openPanel(); else closePanel();
  });

  if (closeHandle) {
    closeHandle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
    closeHandle.addEventListener('touchmove', (e) => {
      if(isPanelOpen && (startY - e.touches[0].clientY) > 15) closePanel();
    }, {passive: true});
    closeHandle.addEventListener('click', closePanel);
  }

  panel.addEventListener('touchmove', (e) => {
    if (isPanelOpen && !e.target.closest('.music-panel-inner')) { e.preventDefault(); }
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

  function showToast(msg) {
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  /* ── 💥 OVERLAYS TOGGLE BUTTONS 💥 ────────────────────── */
  if(toggleListBtnUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl.classList.toggle('hidden'));
  if(toggleListBtnYt) toggleListBtnYt.addEventListener('click', () => episodesOverlayYt.classList.toggle('hidden'));
  if(toggleListBtnSp) toggleListBtnSp.addEventListener('click', () => episodesOverlaySp.classList.toggle('hidden'));

  /* ── YOUTUBE ENGINE ────────────────────────────────────── */
  const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = function() {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      height: '220', width: '100%', playerVars: { 'autoplay': 1, 'controls': 1, 'playsinline': 1, 'rel': 0 },
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

  /* ── INPUT MANAGERS & LIVE APIs ─────────────────────── */
  
  // 1. URL / LIBRARIAN BOT
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    
    if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; }
    else if (isSpotifyUrl(val)) { addToQueue({ type: 'spotify', title: 'Spotify Track', url: val }); urlInput.value = ''; }
    else if (val.startsWith('http')) { addToQueue({ type: 'stream', title: 'Cloud Media', url: val }); urlInput.value = ''; }
    else {
        // LIBRARIAN MOCK (Will be set later)
        showToast(`🔍 Fetching episodes for: ${val}`);
        dynamicEpListUrl.innerHTML = ''; 
        let mockEpisodes = [ { title: `${val} - Ep 1`, url: "mock1" }, { title: `${val} - Ep 2`, url: "mock2" } ];
        mockEpisodes.forEach(ep => {
            const div = document.createElement('div');
            div.className = 'ep-item';
            div.innerHTML = `<span>${ep.title}</span> <span class="ep-play-icon">▶</span>`;
            div.onclick = () => { showToast(`Loaded ${ep.title}`); };
            dynamicEpListUrl.appendChild(div);
        });
        episodesOverlayUrl.classList.remove('hidden');
        urlInput.value = '';
    }
  });

  // 2. LIVE YOUTUBE SEARCH API (Piped)
  ytAddBtn.addEventListener('click', () => { 
    const val = ytInput.value.trim(); if (!val) return; 
    if (isYouTubeUrl(val)) { loadYouTube(val); ytInput.value = ''; return; }
    
    ytSearchResults.innerHTML = '<p class="mp-empty">Searching YouTube...</p>';
    episodesOverlayYt.classList.remove('hidden'); // Auto open
    
    fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(val)}&filter=videos`)
      .then(res => res.json())
      .then(data => {
        ytSearchResults.innerHTML = '';
        if(!data.items || data.items.length === 0) { ytSearchResults.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }
        
        data.items.slice(0, 15).forEach(vid => {
            const vidId = vid.url.split('v=')[1];
            const div = document.createElement('div');
            div.className = 'yt-search-item';
            div.innerHTML = `
              <img src="${vid.thumbnail}" class="yt-search-thumb"/>
              <div class="yt-search-info">
                <div class="yt-search-title">${vid.title}</div>
                <div class="yt-search-sub">${vid.uploaderName}</div>
              </div>
            `;
            div.onclick = () => { loadYouTube(`https://youtube.com/watch?v=${vidId}`); };
            ytSearchResults.appendChild(div);
        });
      })
      .catch(() => { ytSearchResults.innerHTML = '<p class="mp-empty">Error searching YouTube. API limit reached.</p>'; });
      
    ytInput.value = ''; 
  });

  // 3. LIVE GLOBAL MUSIC API (JioSaavn / saavn.dev)
  if(spAddBtn) spAddBtn.addEventListener('click', () => { 
    const val = spInput.value.trim(); if (!val) return; 
    if (isSpotifyUrl(val)) { addToQueue({ type: 'spotify', title: 'Spotify Track', url: val }); spInput.value = ''; return; }
    
    spSearchResults.innerHTML = '<p class="mp-empty">Searching global music...</p>';
    episodesOverlaySp.classList.remove('hidden'); // Auto open
    
    fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(val)}`)
      .then(res => res.json())
      .then(json => {
         spSearchResults.innerHTML = '';
         const data = json.data?.results || [];
         if(data.length === 0) { spSearchResults.innerHTML = '<p class="mp-empty">No songs found.</p>'; return; }
         
         data.slice(0, 15).forEach(song => {
             const title = song.name;
             const artist = song.primaryArtists || 'Unknown Artist';
             let audioUrl = song.downloadUrl.find(q => q.quality === '320kbps')?.url || song.downloadUrl[0]?.url;
             let imgUrl = song.image.find(i => i.quality === '150x150')?.url || song.image[0]?.url;
             
             const div = document.createElement('div');
             div.className = 'yt-search-item';
             div.innerHTML = `
               <img src="${imgUrl}" class="yt-search-thumb" style="border-radius:50%; width:45px;"/>
               <div class="yt-search-info">
                 <div class="yt-search-title">${title}</div>
                 <div class="yt-search-sub">${artist}</div>
               </div>
             `;
             div.onclick = () => { addToQueue({ type: 'stream', title: `${title} - ${artist}`, url: audioUrl }); };
             spSearchResults.appendChild(div);
         });
      })
      .catch(() => { spSearchResults.innerHTML = '<p class="mp-empty">Music search failed. Try again.</p>'; });
      
    spInput.value = ''; 
  });

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
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      let icon = '🎵'; if (item.type === 'youtube') icon = '▶ YT'; if (item.type === 'spotify') icon = '♫ SP'; if (item.type === 'stream') icon = '☁️';
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
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
  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

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
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
    if (activeType === 'stream') {
       if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{});
    } else if (activeType === 'youtube' && ytPlayer) {
       if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  }));

  function updatePlayBtn() { 
    mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶'); 
    if (isPlaying) vinylRecord.classList.add('playing'); else vinylRecord.classList.remove('playing');
  }
  
  function setTrackInfo(title, sub) { 
    musicTitle.textContent = title; musicArtist.textContent = sub; 
    miniTitle.textContent = `${title} • ${sub}`;
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
