/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (100% FULL UNCUT EDITION)
   💥 GOD MODE: Official YouTube Iframe + Lock Screen + Deep Sync
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── DOM ELEMENTS ──────────────────────────────────────── */
  const panel       = document.getElementById('zxPanel');
  const handle      = document.getElementById('zxHandle');
  const closeHandle = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn'); 
  
  const nativeAudio = document.getElementById('nativeAudio') || document.createElement('audio');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  
  const cinemaMode  = document.getElementById('cinemaMode');
  const spotifyMode = document.getElementById('spotifyMode');
  
  // VISUALIZER
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

  // SYNC NETWORK ELEMENTS
  const mpSyncBadge = document.getElementById('mpSyncBadge');
  const mpSyncBtn   = document.getElementById('mpSyncBtn');
  const mpSyncInfo  = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn = document.getElementById('mpUnsyncBtn');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  function createVisualizerUI() {
      const spMode = document.getElementById('spotifyMode');
      if(spMode) {
          spMode.innerHTML = `
              <img id="streamThumb" src="https://i.imgur.com/8Q5FqWj.jpeg" class="premium-thumb" />
              <div class="music-visualizer" id="visualizer">
                  <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
              </div>
          `;
      }
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

  /* ── 📱 PANEL ENGINE ─────────────────────── */
  let startY = 0; let isPanelOpen = false;
  function openPanel() {
      if(isPanelOpen) return; isPanelOpen = true;
      if(panel) panel.classList.add('zx-open'); document.body.style.overflow = 'hidden'; 
      if(panelToggleBtn) panelToggleBtn.classList.add('active');
  }
  function closePanel() {
      if(!isPanelOpen) return; isPanelOpen = false;
      if(panel) panel.classList.remove('zx-open'); document.body.style.overflow = ''; 
      if(panelToggleBtn) panelToggleBtn.classList.remove('active');
  }

  if(handle) {
      handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
      handle.addEventListener('touchmove', (e) => { if(!isPanelOpen && (e.touches[0].clientY - startY) > 15) openPanel(); }, {passive: true});
      handle.addEventListener('click', (e) => { if(e.target.closest('.mp-btn') || e.target.closest('.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });
  }
  if(panelToggleBtn) panelToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  
  if (closeHandle) {
      closeHandle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
      closeHandle.addEventListener('touchmove', (e) => { if(isPanelOpen && (startY - e.touches[0].clientY) > 15) closePanel(); }, {passive: true});
      closeHandle.addEventListener('click', closePanel);
  }

  /* ── TABS LOGIC ────────────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
          document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
          tab.classList.add('active'); 
          const targetTab = document.getElementById('tab-' + tab.dataset.tab);
          if(targetTab) targetTab.classList.add('active');
      });
  });

  function showToast(msg) {
      const t = document.createElement('div'); t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
      document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  if(toggleListBtnUrl && episodesOverlayUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl.classList.toggle('hidden'));
  if(toggleListBtnYt && episodesOverlayYt) toggleListBtnYt.addEventListener('click', () => episodesOverlayYt.classList.toggle('hidden'));
  if(toggleListBtnSp && episodesOverlaySp) toggleListBtnSp.addEventListener('click', () => episodesOverlaySp.classList.toggle('hidden'));

  /* ── TAB 0: URL / LIBRARIAN ─────────────────────── */
  if(urlAddBtn) {
      urlAddBtn.addEventListener('click', () => {
          const val = urlInput.value.trim(); if (!val) return;
          if (isYouTubeUrl(val)) { 
              addToQueue({ type: 'youtube', title: 'YouTube Audio', ytId: extractYouTubeId(val) }); 
          } else {
              addToQueue({ type: 'stream', title: 'Cloud Media', url: val }); 
          }
          urlInput.value = ''; 
      });
  }

  if(fileInput) {
      fileInput.addEventListener('change', () => {
          const file = fileInput.files[0]; 
          if (!file) return;
          addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
      });
  }

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }

  /* ── YOUTUBE ENGINE (HIDDEN IFRAME) ────────────────────── */
  const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = function() {
      if(ytFrameWrap) {
          ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
          
          // Iframe Hidden for Audio focus, par DOM mein zinda hai
          ytFrameWrap.style.position = 'absolute';
          ytFrameWrap.style.width = '1px';
          ytFrameWrap.style.height = '1px';
          ytFrameWrap.style.opacity = '0';
          ytFrameWrap.style.pointerEvents = 'none';

          ytPlayer = new YT.Player('ytPlayerInner', {
              width: '100%', height: '100%',
              playerVars: { 'autoplay': 1, 'controls': 0, 'playsinline': 1 },
              events: { 
                  'onReady': () => { isYtReady = true; }, 
                  'onStateChange': onPlayerStateChange 
              }
          });
      }
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
      }
      else if (event.data === YT.PlayerState.PAUSED) { 
          isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time }); 
      }
      else if (event.data === YT.PlayerState.ENDED) { playNext(); }
  }

  /* ── OFFICIAL YOUTUBE SEARCH API ────────────────────────── */
  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  function searchYouTube(query, targetResultsDiv) {
      if (!query) return; 
      const resDiv = document.getElementById(targetResultsDiv);
      if(!resDiv) return;

      resDiv.innerHTML = '<p class="mp-empty">Fetching Worldwide Library...</p>'; 
      if(targetResultsDiv === 'ytSearchResults' && episodesOverlayYt) episodesOverlayYt.classList.remove('hidden');
      if(targetResultsDiv === 'spSearchResults' && episodesOverlaySp) episodesOverlaySp.classList.remove('hidden');
      
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`)
        .then(res => res.json())
        .then(data => {
            resDiv.innerHTML = '';
            if(!data.items || data.items.length === 0) { resDiv.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }
            
            data.items.forEach(vid => {
                const div = document.createElement('div'); div.className = 'yt-search-item';
                div.innerHTML = `
                  <img src="${vid.snippet.thumbnails.medium.url}" class="yt-search-thumb" style="border-radius:12px;"/>
                  <div class="yt-search-info">
                      <div class="yt-search-title">${vid.snippet.title}</div>
                      <div class="yt-search-sub">${vid.snippet.channelTitle}</div>
                  </div>
                `;
                div.onclick = () => {
                    addToQueue({ 
                        type: 'youtube', // Ab direct Iframe mein chalega
                        title: vid.snippet.title, 
                        ytId: vid.id.videoId,
                        thumb: vid.snippet.thumbnails.high ? vid.snippet.thumbnails.high.url : vid.snippet.thumbnails.medium.url
                    });
                };
                resDiv.appendChild(div);
            });
        }).catch(() => resDiv.innerHTML = '<p class="mp-empty">Error searching. Check connection.</p>');
  }

  if(ytAddBtn && ytInput) ytAddBtn.addEventListener('click', () => { searchYouTube(ytInput.value.trim(), 'ytSearchResults'); ytInput.value = ''; });
  if(spSearchSongBtn && spInput) spSearchSongBtn.addEventListener('click', () => { searchYouTube(spInput.value.trim(), 'spSearchResults'); spInput.value = ''; });

  /* ── QUEUE & AUTO-PLAY ─────────────────────────────────── */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); playQueueItem(queue.length - 1); }
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); } catch(e) {} }
  
  function renderQueue() {
      if(!queueList) return;
      if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
      queueList.innerHTML = '';
      queue.forEach((item, i) => {
          const el = document.createElement('div'); 
          el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
          let icon = (item.type === 'youtube') ? '🎧' : '☁️'; 
          el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
          el.onclick = (e) => { 
              if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); saveQueue(); renderQueue(); return; } 
              playQueueItem(i); 
          };
          queueList.appendChild(el);
      });
  }

  function playQueueItem(i) {
      if (i < 0 || i >= queue.length) return; 
      currentIdx = i; saveQueue(); renderQueue(); 
      const item = queue[i];

      const isBlob = item.url && item.url.startsWith('blob:');
      if (synced && !isRemoteAction && !isBlob) { 
          broadcastSync({ action: 'change_song', item: item }); 
      }
      renderMedia(item);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  mpNexts.forEach(b => { if(b) b.addEventListener('click', playNext); });
  mpPrevs.forEach(b => { if(b) b.addEventListener('click', playPrev); });

  /* ── 🔥 CONTEXT-AWARE MEDIA RENDERER 🔥 ────────────────── */
  function renderMedia(item) {
      nativeAudio.pause(); 
      if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();

      const vis = document.getElementById('visualizer');
      const thumb = document.getElementById('streamThumb');
      if(vis) vis.classList.remove('playing');
      if(thumb) thumb.classList.remove('playing');
      isPlaying = false;
      updatePlayBtn();

      if(cinemaMode) cinemaMode.classList.add('hidden'); 
      if(spotifyMode) spotifyMode.classList.remove('hidden');
      if(thumb) thumb.src = item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg';

      // YouTube Playback via Hidden Iframe
      if (item.type === 'youtube') {
          activeType = 'youtube';
          setTrackInfo(item.title, 'YouTube Audio Hub');
          showToast('Extracting Original Source...');
          if (isYtReady && ytPlayer) {
              ytPlayer.loadVideoById(item.ytId);
              setupMediaSession(item);
          } else {
              setTimeout(() => renderMedia(item), 500);
          }
      } 
      // Local/Cloud File Playback via Native Audio
      else if (item.type === 'stream') {
          activeType = 'stream';
          setTrackInfo(item.title, 'Local/Cloud Media');
          nativeAudio.src = item.url; 
          nativeAudio.play().then(() => { 
              isPlaying = true; updatePlayBtn(); setupMediaSession(item);
          }).catch(() => showToast("Tap play to start"));
      }
  }

  /* ── GLOBAL CONTROLLER ─────────────────────────────────── */
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
      if (activeType === 'stream') { 
          if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{}); 
      } 
      else if (activeType === 'youtube' && ytPlayer) { 
          if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo(); 
      }
  }));

  function updatePlayBtn() { 
      mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶'); 
      const vis = document.getElementById('visualizer');
      const thumb = document.getElementById('streamThumb');
      
      if (isPlaying) {
          if(vis) vis.classList.add('playing');
          if(thumb) thumb.classList.add('playing');
      } else {
          if(vis) vis.classList.remove('playing');
          if(thumb) thumb.classList.remove('playing');
      }
  }

  function setTrackInfo(title, sub) { 
      if(musicTitle) musicTitle.textContent = title; 
      if(musicArtist) musicArtist.textContent = sub; 
      if(miniTitle) miniTitle.textContent = `${title} • ${sub}`; 
  }

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

  /* ── 💥 MEDIA SESSION API (THE LOCK SCREEN HACK) 💥 ── */
  function setupMediaSession(item) {
      if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
              title: item.title,
              artist: 'ZeroX Hub',
              album: 'Worldwide Library',
              artwork: [ { src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' } ]
          });

          navigator.mediaSession.setActionHandler('play', () => { 
              if (activeType === 'youtube' && ytPlayer) ytPlayer.playVideo(); 
              else if (activeType === 'stream') nativeAudio.play();
          });
          
          navigator.mediaSession.setActionHandler('pause', () => { 
              if (activeType === 'youtube' && ytPlayer) ytPlayer.pauseVideo(); 
              else if (activeType === 'stream') nativeAudio.pause();
          });
          
          navigator.mediaSession.setActionHandler('previoustrack', () => { playPrev(); });
          navigator.mediaSession.setActionHandler('nexttrack', () => { playNext(); });
      }
  }

  /* ── 🔗 DEEP SYNC NETWORK (LISTEN TOGETHER) ────────────────────────── */
  if (mpSyncBtn && mpUnsyncBtn && mpSyncBadge && mpSyncInfo) {
      mpSyncBtn.addEventListener('click', () => {
          synced = true; mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
          mpSyncBtn.style.display = 'none'; mpSyncInfo.style.display = 'flex';
          broadcastSync({ action: 'request_sync' }); showToast('🔗 Sync Network Active');
      });

      mpUnsyncBtn.addEventListener('click', () => {
          synced = false; mpSyncBadge.textContent = '🔴 Solo'; mpSyncBadge.classList.remove('synced');
          mpSyncBtn.style.display = 'block'; mpSyncInfo.style.display = 'none';
      });
  }

  function broadcastSync(data) { 
      if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); 
  }

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
          } 
          return;
      }

      if (!synced) return; 
      setRemoteAction();

      if (data.action === 'change_song') {
          let idx = queue.findIndex(q => q.title && q.title === data.item.title);
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

  /* ── 💥 FULLSCREEN SENSOR 💥 ── */
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
