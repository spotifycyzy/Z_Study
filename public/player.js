/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (BASE 14 - ULTIMATE SPOTIFY MIX)
   💥 MAJOR FIX: Full Replaceable Code (No Syntax Errors)
   🔥 UPGRADE: Exact Spotify UI with "🏆 TOP RESULT" Badge
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

  /* ── 🔑 API KEYS & GLOBAL VARIABLES ────────────────────── */
  const RAPID_API_KEY = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';

  /* ── STATE ─────────────────────────────────────────────── */
  let queue           = [];
  let currentIdx      = 0;
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

  /* ── 🎧 SP81 SPOTIFY AUDIO BYPASS (M4A) ────────────────── */
  async function fetchPremiumAudio(spId) {
      const url = `https://spotify81.p.rapidapi.com/download_track?q=${spId}&onlyLinks=true`;
      try {
          const response = await fetch(url, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'spotify81.p.rapidapi.com' } });
          const result = await response.json();
          return Array.isArray(result) ? (result[0]?.url || result[0]?.link) : (result.url || result.link || result.downloadUrl);
      } catch (error) { return null; }
  }

  /* ── YOUTUBE SEARCH (Original Base 9 Logic) ────────────── */
  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY'; 
  function searchYouTube(query, targetResultsDiv, mediaType) {
      if (!query) return;
      const resDiv = document.getElementById(targetResultsDiv);
      if(!resDiv) return;
      resDiv.innerHTML = '<p class="mp-empty">🔍 Searching YouTube Library...</p>';
      if(targetResultsDiv === 'ytSearchResults') episodesOverlayYt.classList.remove('hidden');

      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`)
        .then(res => res.json())
        .then(data => {
            resDiv.innerHTML = '';
            if(!data.items || data.items.length === 0) { resDiv.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }
            data.items.forEach(vid => {
                const div = document.createElement('div'); div.className = 'yt-search-item';
                div.innerHTML = `
                  <img src="${vid.snippet.thumbnails.medium.url}" class="yt-search-thumb"/>
                  <div class="yt-search-info">
                    <div class="yt-search-title">${vid.snippet.title}</div>
                    <div class="yt-search-sub">${vid.snippet.channelTitle}</div>
                  </div>
                  <span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>
                `;
                div.onclick = () => {
                    queue = []; currentIdx = 0; // Fresh queue on click
                    addToQueue({ type: mediaType, title: vid.snippet.title, ytId: vid.id.videoId, thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url });
                    showToast('🎵 Playing Selection!');
                };
                resDiv.appendChild(div);
            });
        }).catch(() => resDiv.innerHTML = '<p class="mp-empty">Error searching. Check API quota.</p>');
  }

  if(ytAddBtn) ytAddBtn.onclick = () => { 
      const val = ytInput.value.trim(); if(isYouTubeUrl(val)) { loadYouTube(val); ytInput.value = ''; return; }
      searchYouTube(val, 'ytSearchResults', 'youtube'); ytInput.value = ''; 
  };
  if(ytInput) ytInput.addEventListener('keydown', e => { if(e.key==='Enter') ytAddBtn.click(); });
  
  if(urlInput) urlInput.addEventListener('keydown', e => { if(e.key==='Enter') urlAddBtn.click(); });
  if(urlAddBtn) urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; }
    else if (val.startsWith('http')) { queue=[]; currentIdx=0; addToQueue({ type: 'stream', title: 'Cloud Media', url: val }); urlInput.value = ''; }
  });

  if(fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    queue=[]; currentIdx=0; addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function loadYouTube(url) {
    const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    queue=[]; currentIdx=0; addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id });
  }

  /* ── QUEUE LOGIC (CLEANED) ─────────────────────────────── */
  function addToQueue(item) { queue.push(item); renderQueue(); playQueueItem(queue.length - 1); }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div'); el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      let icon = item.type === 'youtube_audio' ? '🎧' : (item.type === 'stream' ? '☁️' : '🎬'); 
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); renderQueue(); return; } playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return; currentIdx = i; renderQueue(); const item = queue[i];
    
    // Broadcast immediately to network (no cache checks)
    const isBlob = item.url && item.url.startsWith('blob:');
    if (synced && !isRemoteAction && !isBlob) { 
        broadcastSync({ action: 'change_song', item: item }); 
    }
    renderMedia(item);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

  /* ── 🔥 CONTEXT-AWARE MEDIA RENDERER (NO CACHE) 🔥 ─────── */
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
    // 🎧 MODE 2: FRESH AUDIO FETCH (NO CACHE)
    else if (item.type === 'youtube_audio') {
      activeType = 'youtube_audio';
      cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
      ensureVisualizer(item);
      
      setTrackInfo(item.title, 'Fetching Fresh Audio...');
      fetchPremiumAudio(item.spId).then(audioLink => {
          if(audioLink) {
              setTrackInfo(item.title, item.artist || 'ZeroX Audio API');
              setupMediaSession(item);
              nativeAudio.src = audioLink;
              nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast("Tap ▶ to play"));
          } else {
              setTrackInfo(item.title, 'Audio Fetch Failed');
              showToast('API Error: Could not extract Audio.');
              setTimeout(playNext, 2000);
          }
      });
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
              title: item.title, artist: item.artist || 'ZeroX Hub',
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
  if(mpSyncBtn) mpSyncBtn.addEventListener('click', () => {
    synced = true; mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncBtn.style.display = 'none'; mpSyncInfo.style.display = 'flex';
    broadcastSync({ action: 'request_sync' }); showToast('🔗 Sync Network Active');
  });

  if(mpUnsyncBtn) mpUnsyncBtn.addEventListener('click', () => {
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
      if (idx === -1) { queue.push(data.item); idx = queue.length - 1; } 
      else { queue[idx] = data.item; }
      currentIdx = idx; renderQueue(); renderMedia(queue[idx]); return;
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

  function toggleFullscreenState() {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) { document.body.classList.add('is-fullscreen'); } 
      else { document.body.classList.remove('is-fullscreen'); }
  }
  document.addEventListener('fullscreenchange', toggleFullscreenState);
  document.addEventListener('webkitfullscreenchange', toggleFullscreenState);

  renderQueue();

  /* ═══════════════════════════════════════════════════════════
     👇 EDIT ZONE: SPOTIFY SEARCH (API v3 - TOP RESULTS MIX) 👇
  ═══════════════════════════════════════════════════════════ */

  async function searchSpotifyAlt(query, targetResultsDiv) {
      if (!query) return;
      const divId = targetResultsDiv || 'spSearchResults';
      const resDiv = document.getElementById(divId);
      if (!resDiv) return;

      resDiv.innerHTML = '<p class="mp-empty">⏳ Loading Exact Spotify Results...</p>';
      if (typeof episodesOverlaySp !== 'undefined') episodesOverlaySp.classList.remove('hidden');

      try {
          const RAPID_KEY = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
          const url = "https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall";

          const res = await fetch(url, {
              method: "POST",
              headers: {
                  "x-rapidapi-key": RAPID_KEY,
                  "x-rapidapi-host": "spotify-web-api3.p.rapidapi.com",
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({ terms: query, limit: 15 }) 
          });
          
          const responseData = await res.json();
          const searchData = responseData?.data?.searchV2 || responseData;
          
          let allItems = [];
          
          // 🏆 1. EXACT "TOP RESULTS" (Jo bhi ho: Album, Artist, ya Track)
          const topResultsArray = searchData?.topResults?.items || searchData?.topResultsV2?.itemsV2 || [];
          topResultsArray.forEach(item => {
              allItems.push({ ...item, isExactTopResult: true }); 
          });

          // 🎵 2. Uske niche baaki ke Tracks
          const tracksArray = searchData?.tracksV2?.items || searchData?.tracks?.items || [];
          tracksArray.forEach(item => allItems.push(item));

          // 📂 3. Albums
          const albumsArray = searchData?.albumsV2?.items || searchData?.albums?.items || [];
          albumsArray.forEach(item => allItems.push(item));

          // 🎧 4. Playlists
          const playlistsArray = searchData?.playlistsV2?.items || searchData?.playlists?.items || [];
          playlistsArray.forEach(item => allItems.push(item));

          resDiv.innerHTML = '';

          if (allItems.length === 0) {
              resDiv.innerHTML = `<p class="mp-empty">❌ No official results found.</p>`;
              return;
          }

          const seenUris = new Set();

          allItems.forEach((wrapper) => {
              const item = wrapper?.item?.data || wrapper?.data || wrapper;
              if (!item || !item.uri) return;

              if (seenUris.has(item.uri)) return;
              seenUris.add(item.uri);

              const uriParts = item.uri.split(':');
              const itemType = uriParts[1]; 
              const itemId = item.id || uriParts[2];

              const titleName = item.name || item.profile?.name || 'Unknown';
              
              let artistName = 'Unknown';
              if (item.artists?.items?.[0]?.profile?.name) {
                  artistName = item.artists.items[0].profile.name;
              } else if (item.ownerV2?.data?.name) {
                  artistName = item.ownerV2.data.name; 
              } else if (itemType === 'artist') {
                  artistName = "Artist Profile"; 
              }

              let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
              if (item.albumOfTrack?.coverArt?.sources?.[0]?.url) {
                  thumb = item.albumOfTrack.coverArt.sources[0].url; 
              } else if (item.coverArt?.sources?.[0]?.url) {
                  thumb = item.coverArt.sources[0].url; 
              } else if (item.images?.items?.[0]?.sources?.[0]?.url) {
                  thumb = item.images.items[0].sources[0].url; 
              } else if (item.visuals?.avatarImage?.sources?.[0]?.url) {
                  thumb = item.visuals.avatarImage.sources[0].url; 
              }

              const typeLabel = itemType === 'track' ? "" : ` <span style="font-size:9px; background:#e8436a; color:#fff; padding:2px 4px; border-radius:3px; margin-left:5px;">${itemType.toUpperCase()}</span>`;
              const imgRadius = itemType === 'artist' ? '50%' : '4px';
              
              // 🔥 YE RAHI TERI SPOTIFY FEELING (Top Result Badge) 🔥
              const topResultBadge = wrapper.isExactTopResult 
                  ? `<div style="font-size:10px; color:#1db954; font-weight:bold; margin-bottom:3px; letter-spacing:0.5px;">🏆 TOP RESULT</div>` 
                  : "";

              const div = document.createElement('div');
              div.className = 'yt-search-item';
              div.innerHTML = `
                  <img src="${thumb}" class="yt-search-thumb" style="border-radius: ${imgRadius};"/>
                  <div class="yt-search-info">
                    ${topResultBadge}
                    <div class="yt-search-title">${titleName}${typeLabel}</div>
                    <div class="yt-search-sub">${artistName}</div>
                  </div>
                  <span style="font-size:18px;padding:0 4px;color:#1db954">${itemType === 'track' ? '▶' : '📂'}</span>
              `;

              div.onclick = () => {
                  if (itemType !== 'track') {
                      if (typeof showToast === 'function') showToast(`⚠️ You clicked an ${itemType.toUpperCase()}! Only Tracks can be played directly right now.`);
                      return;
                  }

                  if (typeof addToQueue === 'function') {
                      queue = []; 
                      currentIdx = 0; 
                      addToQueue({ type: 'youtube_audio', title: titleName, artist: artistName, spId: itemId, thumb: thumb, isZeroxify: true });
                      if (typeof showToast === 'function') showToast('🎵 Playing Track!');
                  }
              };
              resDiv.appendChild(div);
          });

      } catch (e) {
          console.error("Spotify Search API Error:", e);
          resDiv.innerHTML = '<p class="mp-empty">🚨 API Connection Error!</p>';
      }
  }

  // Event Listeners
  if(spInput) spInput.addEventListener('keydown', e => { if(e.key==='Enter' && spSearchSongBtn) spSearchSongBtn.click(); });
  if(spSearchSongBtn) spSearchSongBtn.onclick = () => { searchSpotifyAlt(spInput.value.trim(), 'spSearchResults'); spInput.value = ''; };
  if(spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = () => { searchSpotifyAlt(spInput.value.trim(), 'spSearchResults'); spInput.value = ''; };

})();
