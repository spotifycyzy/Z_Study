/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (THE COMPLETE 470+ LINES EDITION)
   💥 FULL FEATURES: Deep Sync, Iframe Hack, Silent Loop, UI Overlays
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
      if(panel) panel.classList.add('zx-open'); 
      document.body.style.overflow = 'hidden'; 
      if(panelToggleBtn) panelToggleBtn.classList.add('active');
  }
  function closePanel() {
      if(!isPanelOpen) return; isPanelOpen = false;
      if(panel) panel.classList.remove('zx-open'); 
      document.body.style.overflow = ''; 
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
          if (val.includes('youtube.com') || val.includes('youtu.be')) {
              const m = val.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
              if(m) addToQueue({ type: 'youtube', title: 'YouTube Audio', ytId: m[1] });
          } else {
              addToQueue({ type: 'stream', title: 'Cloud Media', url: val });
          }
          urlInput.value = ''; 
      });
  }
  if(fileInput) {
      fileInput.addEventListener('change', () => {
          const file = fileInput.files[0]; if (!file) return;
          addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
      });
  }

  /* ── YOUTUBE ENGINE (HIDDEN IFRAME) ────────────────────── */
  const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = function() {
      if(ytFrameWrap) {
          ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
          ytFrameWrap.style.cssText = "position:fixed; bottom:0; right:0; width:1px; height:1px; z-index:-1; opacity:0.01; pointer-events:none;";
          ytPlayer = new YT.Player('ytPlayerInner', {
              width: '100%', height: '100%',
              playerVars: { 'autoplay': 1, 'controls': 0, 'playsinline': 1 },
              events: { 'onReady': () => { isYtReady = true; }, 'onStateChange': onPlayerStateChange }
          });
      }
  };

  function onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.PLAYING) { 
          isPlaying = true; updatePlayBtn(); 
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
      } else if (event.data === YT.PlayerState.PAUSED) { 
          isPlaying = false; updatePlayBtn(); 
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
      } else if (event.data === YT.PlayerState.ENDED) playNext();
  }

  /* ── SEARCH ENGINE (OFFICIAL API) ───────────────────────── */
  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';
  function searchYouTube(query, targetResultsDiv) {
      if (!query) return; 
      const resDiv = document.getElementById(targetResultsDiv);
      if(!resDiv) return;
      resDiv.innerHTML = '<p class="mp-empty">Fetching Worldwide Library...</p>'; 
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`)
        .then(res => res.json()).then(data => {
            resDiv.innerHTML = '';
            data.items.forEach(vid => {
                const div = document.createElement('div'); div.className = 'yt-search-item';
                div.innerHTML = `<img src="${vid.snippet.thumbnails.medium.url}" class="yt-search-thumb" style="border-radius:12px;"/>
                <div class="yt-search-info"><div class="yt-search-title">${vid.snippet.title}</div><div class="yt-search-sub">${vid.snippet.channelTitle}</div></div>`;
                div.onclick = () => addToQueue({ type: 'youtube', title: vid.snippet.title, ytId: vid.id.videoId, thumb: vid.snippet.thumbnails.high.url });
                resDiv.appendChild(div);
            });
        });
  }

  if(ytAddBtn) ytAddBtn.onclick = () => searchYouTube(ytInput.value.trim(), 'ytSearchResults');
  if(spSearchSongBtn) spSearchSongBtn.onclick = () => searchYouTube(spInput.value.trim(), 'spSearchResults');

  /* ── QUEUE & RENDER ───────────────────────────────────── */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); playQueueItem(queue.length - 1); }
  function saveQueue() { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); }
  
  function renderQueue() {
      if(!queueList) return;
      if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
      queueList.innerHTML = queue.map((item, i) => `
          <div class="mp-queue-item ${i === currentIdx ? 'playing' : ''}" onclick="window.zxPlay(${i})">
              <span class="qi-type">${item.type === 'youtube' ? '🎧' : '☁️'}</span>
              <span class="qi-title">${item.title}</span>
              <button class="qi-del" onclick="event.stopPropagation(); window.zxDel(${i})">✕</button>
          </div>
      `).join('');
  }
  window.zxPlay = playQueueItem;
  window.zxDel = (i) => { queue.splice(i, 1); saveQueue(); renderQueue(); };

  function playQueueItem(i) {
      if (i < 0 || i >= queue.length) return; 
      currentIdx = i; saveQueue(); renderQueue(); 
      if (synced && !isRemoteAction) broadcastSync({ action: 'change_song', item: queue[i] });
      renderMedia(queue[i]);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  mpNexts.forEach(b => b && b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b && b.addEventListener('click', playPrev));

  /* ── MEDIA RENDERER ───────────────────────────────────── */
  function renderMedia(item) {
      nativeAudio.pause();
      if (ytPlayer && isYtReady) ytPlayer.pauseVideo();
      isPlaying = false; updatePlayBtn();

      if(spotifyMode) spotifyMode.classList.remove('hidden');
      if(cinemaMode) cinemaMode.classList.add('hidden');
      if(streamThumb) streamThumb.src = item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg';

      if (item.type === 'youtube') {
          activeType = 'youtube';
          setTrackInfo(item.title, 'YouTube Hub');
          nativeAudio.src = "https://raw.githubusercontent.com/anars/blank-audio/master/10-seconds-of-silence.mp3";
          nativeAudio.loop = true; nativeAudio.play().catch(()=>{});
          if (isYtReady) { ytPlayer.loadVideoById(item.ytId); setupMediaSession(item); }
      } else {
          activeType = 'stream';
          setTrackInfo(item.title, 'Local/Cloud');
          nativeAudio.src = item.url; nativeAudio.loop = false;
          nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); setupMediaSession(item); });
      }
  }

  /* ── CONTROLS & SYNC ──────────────────────────────────── */
  mpPlays.forEach(btn => btn.onclick = () => {
      if(activeType === 'youtube' && ytPlayer) {
          if(isPlaying) { ytPlayer.pauseVideo(); nativeAudio.pause(); } 
          else { ytPlayer.playVideo(); nativeAudio.play().catch(()=>{}); }
      } else if(activeType === 'stream') {
          if(isPlaying) nativeAudio.pause(); else nativeAudio.play();
      }
  });

  function updatePlayBtn() {
      mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶');
      if(visualizer) visualizer.classList.toggle('playing', isPlaying);
      if(streamThumb) streamThumb.classList.toggle('playing', isPlaying);
  }

  function setTrackInfo(title, sub) {
      if(musicTitle) musicTitle.textContent = title;
      if(miniTitle) miniTitle.textContent = title;
      if(musicArtist) musicArtist.textContent = sub;
  }

  function setupMediaSession(item) {
      if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
              title: item.title, artist: 'ZeroX Hub',
              artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }]
          });
          navigator.mediaSession.setActionHandler('play', () => { 
              if(activeType === 'youtube') { ytPlayer.playVideo(); nativeAudio.play(); } else nativeAudio.play(); 
          });
          navigator.mediaSession.setActionHandler('pause', () => { 
              if(activeType === 'youtube') { ytPlayer.pauseVideo(); nativeAudio.pause(); } else nativeAudio.pause(); 
          });
          navigator.mediaSession.setActionHandler('nexttrack', playNext);
          navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      }
  }

  /* ── DEEP SYNC ── */
  if(mpSyncBtn) {
      mpSyncBtn.onclick = () => {
          synced = true; mpSyncBadge.textContent = '🟢 Synced'; mpSyncBtn.style.display = 'none'; mpSyncInfo.style.display = 'flex';
          broadcastSync({ action: 'request_sync' });
      };
      mpUnsyncBtn.onclick = () => {
          synced = false; mpSyncBadge.textContent = '🔴 Solo'; mpSyncBtn.style.display = 'block'; mpSyncInfo.style.display = 'none';
      };
  }

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }
  window._zxReceiveSync = function (data) {
      if (data.action === 'request_sync' && synced) { broadcastSync({ action: 'change_song', item: queue[currentIdx] }); return; }
      if (!synced) return; 
      setRemoteAction();
      if (data.action === 'change_song') {
          let idx = queue.findIndex(q => q.title === data.item.title);
          if (idx === -1) { queue.push(data.item); idx = queue.length-1; }
          currentIdx = idx; renderQueue(); renderMedia(data.item);
      } else if (data.action === 'play') {
          if(activeType==='youtube') ytPlayer.playVideo(); else nativeAudio.play();
      } else if (data.action === 'pause') {
          if(activeType==='youtube') ytPlayer.pauseVideo(); else nativeAudio.pause();
      }
  };

  document.addEventListener('fullscreenchange', () => document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement));
  renderQueue();
})();
