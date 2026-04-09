/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (100% FULL CODE EXPANDED)
   💥 MAJOR FIX: Cobalt API Engine, Audio Sync UI & Zero Lag
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
  
  // NEW AUDIO VISUALIZER ELEMENTS
  const streamThumb = document.getElementById('streamThumb') || createVisualizerUI();
  const visualizer  = document.getElementById('visualizer');
  
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

  /* ── 💥 DYNAMICALLY CREATE VISUALIZER UI IF NOT IN HTML 💥 ── */
  function createVisualizerUI() {
      const spMode = document.getElementById('spotifyMode');
      spMode.innerHTML = `
          <img id="streamThumb" src="https://i.imgur.com/8Q5FqWj.jpeg" class="premium-thumb" />
          <div class="music-visualizer" id="visualizer">
              <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
          </div>
      `;
      return document.getElementById('streamThumb');
  }

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
          tab.classList.add('active'); document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
  });

  function showToast(msg) {
      const t = document.createElement('div'); t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
      document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

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

  /* ── TAB 0: URL / LIBRARIAN ─────────────────────── */
  urlAddBtn.addEventListener('click', () => {
      const val = urlInput.value.trim(); if (!val) return;
      if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; }
      else if (val.startsWith('http')) { addToQueue({ type: 'stream', title: 'Cloud Media', url: val }); urlInput.value = ''; }
  });

  if(fileInput) fileInput.addEventListener('change', () => {
      const file = fileInput.files[0]; if (!file) return;
      addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  /* ── TAB 1 & 2: OFFICIAL YOUTUBE SEARCH FOR COBALT ───────────────── */
  // Kyunki Cobalt API YouTube se direct chalti hai, hum Search dono tabs mein YouTube Data API se hi karenge 
  // taaki duniya ka koi gaana miss na ho.

  function searchYouTubeForCobalt(query, targetResultsDiv, type) {
      if (!query) return; 
      if (isYouTubeUrl(query)) { loadYouTube(query); return; }
      
      const resDiv = document.getElementById(targetResultsDiv);
      resDiv.innerHTML = '<p class="mp-empty">Searching Official Database...</p>'; 
      if(targetResultsDiv === 'ytSearchResults') episodesOverlayYt.classList.remove('hidden');
      if(targetResultsDiv === 'spSearchResults') episodesOverlaySp.classList.remove('hidden');
      
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`)
        .then(res => res.json())
        .then(data => {
            resDiv.innerHTML = '';
            if(!data.items || data.items.length === 0) { resDiv.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }
            
            data.items.forEach(vid => {
                const div = document.createElement('div'); div.className = 'yt-search-item';
                div.innerHTML = `
                  <img src="${vid.snippet.thumbnails.medium.url}" class="yt-search-thumb" style="${type === 'cobalt_audio' ? 'border-radius:50%;' : ''}"/>
                  <div class="yt-search-info">
                      <div class="yt-search-title">${vid.snippet.title}</div>
                      <div class="yt-search-sub">${vid.snippet.channelTitle}</div>
                  </div>
                `;
                div.onclick = () => {
                    addToQueue({ 
                        type: type, 
                        title: vid.snippet.title, 
                        ytId: vid.id.videoId,
                        thumb: vid.snippet.thumbnails.high ? vid.snippet.thumbnails.high.url : vid.snippet.thumbnails.medium.url
                    });
                };
                resDiv.appendChild(div);
            });
        }).catch(() => resDiv.innerHTML = '<p class="mp-empty">Error searching. Check connection.</p>');
  }

  // Bind Buttons
  ytAddBtn.addEventListener('click', () => { searchYouTubeForCobalt(ytInput.value.trim(), 'ytSearchResults', 'youtube'); ytInput.value = ''; });
  if(spSearchSongBtn) spSearchSongBtn.addEventListener('click', () => { searchYouTubeForCobalt(spInput.value.trim(), 'spSearchResults', 'cobalt_audio'); spInput.value = ''; });
  if(spSearchPlaylistBtn) spSearchPlaylistBtn.addEventListener('click', () => { searchYouTubeForCobalt(spInput.value.trim(), 'spSearchResults', 'cobalt_audio'); spInput.value = ''; });

  /* ── URL CHECKERS ─────────────────────────────────── */
  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function loadYouTube(url) { const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; } addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id }); }

  /* ── QUEUE & AUTO-PLAY ─────────────────────────────────── */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); playQueueItem(queue.length - 1); }
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); } catch {} }

  function renderQueue() {
      if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
      queueList.innerHTML = '';
      queue.forEach((item, i) => {
          const el = document.createElement('div'); el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
          let icon = (item.type === 'cobalt_audio') ? '🎧' : (item.type === 'stream' ? '☁️' : '▶'); 
          el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
          el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); saveQueue(); renderQueue(); return; } playQueueItem(i); };
          queueList.appendChild(el);
      });
  }

  function playQueueItem(i) {
      if (i < 0 || i >= queue.length) return; currentIdx = i; saveQueue(); renderQueue(); const item = queue[i];
      const isBlob = item.url && item.url.startsWith('blob:');
      if (synced && !isRemoteAction && !isBlob) { broadcastSync({ action: 'change_song', item: item }); }
      renderMedia(item);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

  /* ── 💥 THE COBALT API ENGINE (NEVER BLOCKED) 💥 ── */
  async function fetchCobaltAudio(ytId) {
      const COBALT_INSTANCES = [
          'https://api.cobalt.tools/api/json',
          'https://co.wuk.sh/api/json',
          'https://cobalt.qewertyy.dev/api/json'
      ];
      
      for(let url of COBALT_INSTANCES) {
          try {
              let res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${ytId}`, isAudioOnly: true })
              });
              let data = await res.json();
              if(data && data.url) return data.url;
          } catch(e) { console.log("Cobalt mirror failed, trying next..."); }
      }
      throw new Error("All extractors failed");
  }

  /* ── 🔥 CONTEXT-AWARE MEDIA RENDERER 🔥 ────────────────── */
  function renderMedia(item) {
      nativeAudio.style.display = 'none'; ytFrameWrap.style.display = 'none';
      nativeAudio.pause(); nativeAudio.removeAttribute('src'); nativeAudio.srcObject = null;
      if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
      
      // UI Reset
      const vis = document.getElementById('visualizer');
      const thumb = document.getElementById('streamThumb');
      if(vis) vis.classList.remove('playing');
      if(thumb) thumb.classList.remove('playing');
      isPlaying = false;
      updatePlayBtn();

      // Tab 1: Official YouTube Video
      if (item.type === 'youtube') {
          activeType = 'youtube';
          spotifyMode.classList.add('hidden'); cinemaMode.classList.remove('hidden');
          ytFrameWrap.style.display = 'block';
          if (isYtReady) ytPlayer.loadVideoById(item.ytId); else setTimeout(() => renderMedia(item), 500);
          setTrackInfo(item.title, 'YouTube Video');
      } 
      // Tab 2: Cobalt Global Audio Stream (Pure Audio)
      else if (item.type === 'cobalt_audio') {
          activeType = 'stream';
          cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
          
          if(thumb) thumb.src = item.thumb;
          setTrackInfo(item.title, 'Global Stream');
          showToast('Extracting HD Audio...');

          fetchCobaltAudio(item.ytId).then(audioUrl => {
              nativeAudio.src = audioUrl;
              nativeAudio.play().then(() => { 
                  isPlaying = true; 
                  updatePlayBtn(); 
              }).catch(() => showToast("Tap play to start"));
          }).catch(() => showToast('Extraction error. Try another song.'));
      }
      // Local / Direct Cloud Files
      else if (item.type === 'stream') {
          activeType = 'stream'; 
          cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
          
          if(thumb) thumb.src = item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg';
          nativeAudio.src = item.url; 
          nativeAudio.play().then(() => { 
              isPlaying = true; 
              updatePlayBtn(); 
          }).catch(() => showToast("Tap play to start"));
          setTrackInfo(item.title, 'Local/Cloud Media');
      }
  }

  /* ── GLOBAL CONTROLLER ─────────────────────────────────── */
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
      if (activeType === 'stream') { 
          if (isPlaying) nativeAudio.pause(); 
          else nativeAudio.play().catch(()=>{}); 
      } 
      else if (activeType === 'youtube' && ytPlayer) { 
          if (isPlaying) ytPlayer.pauseVideo(); 
          else ytPlayer.playVideo(); 
      }
  }));

  /* 💥 AUDIO SYNC VISUALIZER CONTROLLER 💥 */
  function updatePlayBtn() { 
      mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶'); 
      const vis = document.getElementById('visualizer');
      const thumb = document.getElementById('streamThumb');
      
      if (isPlaying && activeType === 'stream') {
          if(vis) vis.classList.add('playing');
          if(thumb) thumb.classList.add('playing');
      } else {
          if(vis) vis.classList.remove('playing');
          if(thumb) thumb.classList.remove('playing');
      }
  }

  function setTrackInfo(title, sub) { 
      musicTitle.textContent = title; 
      musicArtist.textContent = sub; 
      miniTitle.textContent = `${title} • ${sub}`; 
  }

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
                  else if (activeType === 'stream') curTime = nativeAudio.currentTime;
                  broadcastSync({ action: isPlaying ? 'play' : 'pause', time: curTime });
               }, 1500); 
          } return;
      }

      if (!synced) return; setRemoteAction();

      if (data.action === 'change_song') {
          let idx = queue.findIndex(q => q.title && q.title === data.item.title);
          if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
          currentIdx = idx; saveQueue(); renderQueue(); renderMedia(data.item); return;
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

  /* ── 💥 FULLSCREEN LAG KILLER SENSOR 💥 ── */
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
