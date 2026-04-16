/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (PRO 3.1 FINAL BUILD + HYBRID VIBE UPGRADE)
   💥 FIXED: Main YouTube search restored (Google API) + Vibe Engine only upgraded
   🔥 UPGRADE: YouTube-to-Spotify Hybrid Vibe Engine (YT v3 alt + SP3 + SP81)
   ✅ Original working parts untouched (Cinema, Cloud Audio, Sync, Visualizer, Search)
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── 1. DOM ELEMENTS ────────────────────────────────────── */
  const panel = document.getElementById('zxPanel');
  const handle = document.getElementById('zxHandle');
  const closeHandle = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn');
  
  const nativeAudio = document.getElementById('nativeAudio');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  
  const cinemaMode = document.getElementById('cinemaMode');
  const spotifyMode = document.getElementById('spotifyMode');
  const vinylRecord = document.getElementById('vinylRecord');
  const musicTitle = document.getElementById('musicTitle');
  const musicArtist = document.getElementById('musicArtist');
  const miniTitle = document.getElementById('miniTitle');

  const mpPlays = document.querySelectorAll('.mp-play');
  const mpPrevs = [document.getElementById('miniPrev')];
  const mpNexts = [document.getElementById('miniNext')];
  
  const urlInput = document.getElementById('urlInput');
  const urlAddBtn = document.getElementById('urlAddBtn');
  const fileInput = document.getElementById('fileInput');
  
  const ytInput = document.getElementById('ytInput');
  const ytAddBtn = document.getElementById('ytAddBtn');
  
  const spInput = document.getElementById('spInput');
  const spSearchSongBtn = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const queueList = document.getElementById('queueList');

  const toggleListBtnUrl = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  
  const toggleListBtnYt = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt = document.getElementById('episodesOverlayYt');
  const ytSearchResults = document.getElementById('ytSearchResults');

  const toggleListBtnSp = document.getElementById('toggleListBtnSp');
  const episodesOverlaySp = document.getElementById('episodesOverlaySp');
  const spSearchResults = document.getElementById('spSearchResults');

  const mpSyncBadge = document.getElementById('mpSyncBadge');
  const mpSyncBtn = document.getElementById('mpSyncBtn');
  const mpSyncInfo = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn = document.getElementById('mpUnsyncBtn');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ── 2. 🔑 GLOBAL API CONFIG (SINGLE DECLARATION) ───────── */
  const RAPID_API_KEY = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST = 'spotify81.p.rapidapi.com';
  const SP3_HOST = 'spotify-web-api3.p.rapidapi.com';
  const YT_ALT_HOST = 'youtube-v3-alternative.p.rapidapi.com';
  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  /* ── 3. STATE VARIABLES ────────────────────────────────── */
  let queue = [];
  let currentIdx = 0;
  let synced = false;
  let activeType = 'none';
  let isPlaying = false;
  let ytPlayer = null;
  let isYtReady = false;
  let isRemoteAction = false;
  let autoPlayEnabled = true;
  let remoteTimer = null;

  function setRemoteAction() {
      isRemoteAction = true;
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ── 4. 📱 FLAWLESS UI & PANEL ENGINE ───────────────────── */
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

  if(toggleListBtnUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl.classList.toggle('hidden'));
  if(toggleListBtnYt) toggleListBtnYt.addEventListener('click', () => episodesOverlayYt.classList.toggle('hidden'));
  if(toggleListBtnSp) toggleListBtnSp.addEventListener('click', () => episodesOverlaySp.classList.toggle('hidden'));

  /* ── 5. 🎬 YOUTUBE ENGINE (IFRAME PLAYER) ───────────────── */
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
          if (event.data === YT.PlayerState.ENDED) { playNext(); }
          return;
      }
      const time = ytPlayer.getCurrentTime();
      if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); broadcastSync({ action: 'play', time }); }
      else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time }); }
      else if (event.data === YT.PlayerState.ENDED) { playNext(); }
  }

  /* ── 6. 🔍 YOUTUBE SEARCH & URL LOGIC (RESTORED ORIGINAL GOOGLE API) ───────────────────── */
  function searchYouTube(query, targetResultsDiv, mediaType) {
      if (!query) return;
      const resDiv = document.getElementById(targetResultsDiv);
      if(!resDiv) return;
      resDiv.innerHTML = '<p class="mp-empty">🔍 Searching YouTube Library...</p>';
      if(targetResultsDiv === 'ytSearchResults') episodesOverlayYt.classList.remove('hidden');

      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=\( {encodeURIComponent(query)}&type=video&key= \){YOUTUBE_API_KEY}`)
          .then(res => res.json())
          .then(data => {
              resDiv.innerHTML = '';
              if(!data.items || data.items.length === 0) { resDiv.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }
              data.items.forEach(vid => {
                  const div = document.createElement('div'); div.className = 'yt-search-item';
                  div.innerHTML = `<img src="\( {vid.snippet.thumbnails.medium.url}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title"> \){vid.snippet.title}</div><div class="yt-search-sub">${vid.snippet.channelTitle}</div></div><span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>`;
                  div.onclick = () => {
                      queue = []; currentIdx = 0;
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

  /* ── 7. 🎧 SPOTIFY API ENGINE (MULTI-RESULT + SMART SORT) ─ */
  async function searchSpotifyAlt(query, targetResultsDiv) {
      if (!query) return;
      const divId = targetResultsDiv || 'spSearchResults';
      const resDiv = document.getElementById(divId);
      if (!resDiv) return;

      resDiv.innerHTML = '<p class="mp-empty">⏳ Loading Exact Matches...</p>';
      if (typeof episodesOverlaySp !== 'undefined') episodesOverlaySp.classList.remove('hidden');

      try {
          const url = `https://${SP3_HOST}/v1/social/spotify/searchall`;
          const res = await fetch(url, {
              method: "POST",
              headers: {
                  "x-rapidapi-key": RAPID_API_KEY,
                  "x-rapidapi-host": SP3_HOST,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({ terms: query, limit: 15 }) 
          });
          
          const responseData = await res.json();
          const searchData = responseData?.data?.searchV2 || responseData;
          let rawItems = [];
          
          (searchData?.topResults?.items || searchData?.topResultsV2?.itemsV2 || []).forEach(item => rawItems.push({ ...item, isExactTopResult: true }));
          (searchData?.tracksV2?.items || searchData?.tracks?.items || []).forEach(item => rawItems.push(item));
          (searchData?.playlistsV2?.items || searchData?.playlists?.items || []).forEach(item => rawItems.push(item));
          (searchData?.albumsV2?.items || searchData?.albums?.items || []).forEach(item => rawItems.push(item));

          if (rawItems.length === 0) { resDiv.innerHTML = `<p class="mp-empty">❌ No official results found.</p>`; return; }

          const seenUris = new Set();
          let cleanItems = [];

          rawItems.forEach((wrapper) => {
              const item = wrapper?.item?.data || wrapper?.data || wrapper;
              if (!item || !item.uri || seenUris.has(item.uri)) return;
              seenUris.add(item.uri);

              const uriParts = item.uri.split(':');
              const itemType = uriParts[1]; 
              const itemId = item.id || uriParts[2];

              const titleName = item.name || item.profile?.name || 'Unknown';
              let artistName = 'Unknown';
              if (item.artists?.items?.[0]?.profile?.name) { artistName = item.artists.items[0].profile.name; } 
              else if (item.ownerV2?.data?.name) { artistName = item.ownerV2.data.name; } 
              else if (itemType === 'artist') { artistName = "Artist Profile"; }

              let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
              if (item.albumOfTrack?.coverArt?.sources?.[0]?.url) { thumb = item.albumOfTrack.coverArt.sources[0].url; } 
              else if (item.coverArt?.sources?.[0]?.url) { thumb = item.coverArt.sources[0].url; } 
              else if (item.images?.items?.[0]?.sources?.[0]?.url) { thumb = item.images.items[0].sources[0].url; } 
              else if (item.visuals?.avatarImage?.sources?.[0]?.url) { thumb = item.visuals.avatarImage.sources[0].url; }

              cleanItems.push({ titleName, artistName, itemType, itemId, thumb, isExactTopResult: wrapper.isExactTopResult });
          });

          const lowerQuery = query.toLowerCase();
          cleanItems.sort((a, b) => {
              const aTitle = a.titleName.toLowerCase(), bTitle = b.titleName.toLowerCase();
              if (aTitle === lowerQuery && bTitle !== lowerQuery) return -1;
              if (bTitle === lowerQuery && aTitle !== lowerQuery) return 1;
              const aContains = aTitle.includes(lowerQuery), bContains = bTitle.includes(lowerQuery);
              if (aContains && !bContains) return -1;
              if (bContains && !aContains) return 1;
              if (a.isExactTopResult && !b.isExactTopResult) return -1;
              if (b.isExactTopResult && !a.isExactTopResult) return 1;
              return 0;
          });

          renderSpotifyUI(cleanItems, resDiv, lowerQuery);
      } catch (e) { console.error("Spotify Search API Error:", e); resDiv.innerHTML = '<p class="mp-empty">🚨 API Connection Error!</p>'; }
  }

  function renderSpotifyUI(cleanItems, resDiv, lowerQuery = "") {
      resDiv.innerHTML = '';
      cleanItems.forEach((data, index) => {
          const typeLabel = data.itemType === 'track' ? "" : ` <span style="font-size:9px; background:#e8436a; color:#fff; padding:2px 4px; border-radius:3px; margin-left:5px;">${data.itemType.toUpperCase()}</span>`;
          const imgRadius = data.itemType === 'artist' ? '50%' : '4px';
          const isTopRender = index === 0 && lowerQuery && data.titleName.toLowerCase().includes(lowerQuery.split(' ')[0]);
          const topResultBadge = (data.isExactTopResult || isTopRender) ? `<div style="font-size:10px; color:#1db954; font-weight:bold; margin-bottom:3px; letter-spacing:0.5px;">🏆 BEST MATCH</div>` : "";

          const div = document.createElement('div');
          div.className = 'yt-search-item';
          div.innerHTML = `
              <img src="${data.thumb}" class="yt-search-thumb" style="border-radius: ${imgRadius};"/>
              <div class="yt-search-info">
                ${topResultBadge}
                <div class="yt-search-title">\( {data.titleName} \){typeLabel}</div>
                <div class="yt-search-sub">${data.artistName}</div>
              </div>
              <span style="font-size:18px;padding:0 4px;color:#1db954">${data.itemType === 'track' ? '▶' : '📂'}</span>
          `;

          div.onclick = async () => {
              if (data.itemType === 'playlist') {
                  showToast(`📂 Loading Playlist...`);
                  const tracks = await fetchPlaylistTracks(data.itemId);
                  renderSpotifyUI(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image })), resDiv, "");
              } else if (data.itemType === 'album') {
                  showToast(`📂 Loading Album...`);
                  const tracks = await fetchAlbumTracks(data.itemId);
                  renderSpotifyUI(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image })), resDiv, "");
              } else if (data.itemType === 'artist') {
                  showToast(`👤 Artist Profiles cannot be played directly.`);
              } else {
                  queue = []; currentIdx = 0; 
                  addToQueue({ type: 'youtube_audio', title: data.titleName, artist: data.artistName, spId: data.itemId, thumb: data.thumb, isZeroxify: true });
                  showToast('🎵 Playing Track!');
              }
          };
          resDiv.appendChild(div);
      });
  }

  /* ── Fetchers for Playlists/Albums/Audio (SP81) ── */
  async function fetchPlaylistTracks(playlistId) {
      try {
          const res = await fetch(`https://\( {SP81_HOST}/playlist_tracks?id= \){playlistId}&offset=0&limit=100`, { 
              headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } 
          });
          const data = await res.json();
          return (data.items || []).filter(i => i.track && !i.track.is_local).map(i => ({
              id: i.track.id, title: i.track.name, artist: i.track.artists?.[0]?.name || "Unknown", image: i.track.album?.images?.[0]?.url || ""
          }));
      } catch (e) { return []; }
  }

  async function fetchAlbumTracks(albumId) {
      try {
          const res = await fetch(`https://\( {SP81_HOST}/album_tracks?id= \){albumId}`, { 
              headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } 
          });
          const data = await res.json();
          let albumImg = (data.album && data.album.images) ? data.album.images[0].url : "";
          return (data.album?.tracks?.items || []).map(i => ({
              id: i.id, title: i.name, artist: i.artists?.[0]?.name || "Unknown", image: albumImg
          }));
      } catch (e) { return []; }
  }

  async function fetchPremiumAudio(spId) {
      try {
          const res = await fetch(`https://\( {SP81_HOST}/download_track?q= \){spId}&onlyLinks=true&bypassSpotify=false&downloadFullVideo=false&quality=best&extraUrls=false`, { 
              headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } 
          });
          const result = await res.json();
          return result.url || result[0]?.url || null;
      } catch (error) { return null; }
  }

  /* ── 8. 🎹 QUEUE & CORE RENDERER ENGINE ─────────────────── */
  function addToQueue(item) { queue.push(item); renderQueue(); playQueueItem(queue.length - 1); }

  function renderQueue() {
      if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
      queueList.innerHTML = '';
      queue.forEach((item, i) => {
          const el = document.createElement('div'); el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
          let icon = item.type === 'youtube_audio' ? '🎧' : (item.type === 'stream' ? '☁️' : '🎬'); 
          el.innerHTML = `<span class="qi-type">\( {icon}</span><span class="qi-title"> \){item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
          el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); renderQueue(); return; } playQueueItem(i); };
          queueList.appendChild(el);
      });
  }

  function playQueueItem(i) {
      if (i < 0 || i >= queue.length) return; currentIdx = i; renderQueue(); const item = queue[i];
      const isBlob = item.url && item.url.startsWith('blob:');
      if (synced && !isRemoteAction && !isBlob) { broadcastSync({ action: 'change_song', item: item }); }
      renderMedia(item);
  }

  function renderMedia(item) {
      nativeAudio.style.display = 'none'; ytFrameWrap.style.display = 'none';
      nativeAudio.pause(); nativeAudio.removeAttribute('src'); nativeAudio.srcObject = null;
      if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
      isPlaying = false; updatePlayBtn();
      
      if (item.type === 'youtube') {
          activeType = 'youtube'; spotifyMode.classList.add('hidden'); cinemaMode.classList.remove('hidden');
          ytFrameWrap.style.display = 'block';
          if (isYtReady) ytPlayer.loadVideoById(item.ytId); else setTimeout(() => renderMedia(item), 500);
          setTrackInfo(item.title, 'YouTube Cinema Mode');
          setupMediaSession(item);
      } 
      else if (item.type === 'youtube_audio') {
          activeType = 'youtube_audio'; cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
          ensureVisualizer(item); setTrackInfo(item.title, 'Fetching Fresh Audio...');
          fetchPremiumAudio(item.spId).then(audioLink => {
              if(audioLink) {
                  setTrackInfo(item.title, item.artist || 'ZeroX Audio API');
                  setupMediaSession(item); nativeAudio.src = audioLink;
                  nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast("Tap ▶ to play"));
              } else {
                  setTrackInfo(item.title, 'Audio Fetch Failed'); showToast('API Error: Could not extract Audio.'); setTimeout(playNext, 2000);
              }
          });
      }
      else if (item.type === 'stream') {
          activeType = 'stream'; cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
          ensureVisualizer(item); setupMediaSession(item);
          nativeAudio.src = item.url; 
          nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast("Tap ▶ to play"));
          setTrackInfo(item.title, '☁️ Cloud Audio');
      }

      if (autoPlayEnabled && item.spId) {
          preFetchNextVibe(item.spId);
      }
  }

  function ensureVisualizer(item) {
      if(!document.querySelector('.music-visualizer')) {
          const viz = document.createElement('div'); viz.className='music-visualizer'; viz.id='visualizer';
          viz.innerHTML='<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>';
          vinylRecord.parentNode.insertBefore(viz, vinylRecord.nextSibling);
      }
      vinylRecord.style.backgroundImage = `url('${item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg'}')`;
      vinylRecord.style.backgroundSize = 'cover'; vinylRecord.style.backgroundPosition = 'center';
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

  /* ══════════════════════════════════════════════════════════
     🚀 ZEROX VIBE ENGINE — YouTube-to-Spotify Hybrid (PRO 3.1)
  ══════════════════════════════════════════════════════════ */

  let isFetchingVibe = false;

  function isHindiTrack(track) {
    const title  = (track.title  || '').toLowerCase();
    const artist = (track.artist || '').toLowerCase();
    const devanagari = /[\u0900-\u097F]/.test(track.title || '');
    const hindiKeywords = ['hindi','bollywood','filmi','arijit','armaan','jubin','pritam','atif','neha','shreya','kumar sanu','udit','lata','kishore','sonu nigam','mohit','darshan','anuv','vishal','shekhar','shankar ehsaan loy','javed ali','rahat','rekha','a.r.rahman','amit trivedi','sachin jigar','tanishk','benny dayal','badshah','honey singh','yo yo','nucleya','diljit','guru','hardy','sidhu'];
    return devanagari || hindiKeywords.some(k => title.includes(k) || artist.includes(k));
  }

  async function fetchVibes(trackId) {
    const track    = queue[currentIdx] || { artist: 'Unknown' };
    const seenIds  = new Set([...queue.map(q => q.spId), trackId].filter(Boolean));
    let   results  = [];

    const searchQuery = `songs like ${track.title || 'hit song'} ${track.artist || ''}`.trim();

    try {
      // 1. YouTube v3 Alternative (only used in Vibe Engine)
      const ytRes = await fetch(`https://\( {YT_ALT_HOST}/search?query= \){encodeURIComponent(searchQuery)}&geo=IN&lang=hi&type=video&sort_by=relevance`, {
          headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': YT_ALT_HOST }
      });
      const ytData = await ytRes.json();
      const ytSongTitles = (ytData.data || [])
        .map(item => item.title || '')
        .filter(title => title && title.length > 15 && !title.toLowerCase().includes('live') && !title.toLowerCase().includes('cover') && !title.toLowerCase().includes('official video'));

      // 2. Bridge to SP3 for clean Spotify metadata
      for (const ytTitle of ytSongTitles) {
        if (results.length >= 5) break;
        try {
          const spRes = await fetch(`https://${SP3_HOST}/v1/social/spotify/searchall`, {
              method: "POST",
              headers: {
                  "x-rapidapi-key": RAPID_API_KEY,
                  "x-rapidapi-host": SP3_HOST,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({ terms: ytTitle, limit: 8 })
          });
          const spData = await spRes.json();
          const spTracks = (spData?.data?.searchV2?.tracks?.items || spData?.data?.searchV2?.tracksV2?.items || []).map(item => {
              const t = item?.item?.data || item?.data || item;
              return t ? {
                type: 'youtube_audio',
                title: t.name,
                artist: t.artists?.items?.[0]?.profile?.name || 'Artist',
                spId: t.id || t.uri?.split(':')[2],
                thumb: t.albumOfTrack?.coverArt?.sources?.[0]?.url || t.coverArt?.sources?.[0]?.url || 'https://i.imgur.com/8Q5FqWj.jpeg'
              } : null;
          }).filter(Boolean);

          for (const t of spTracks) {
            if (t.spId && !seenIds.has(t.spId)) {
              results.push(t);
              seenIds.add(t.spId);
            }
          }
        } catch (spErr) {}
      }
    } catch (e) {
      console.error("Hybrid Vibe Error:", e);
    }

    return results.slice(0, 5);
  }

  async function preFetchNextVibe(trackId) {
    if (currentIdx < queue.length - 1 || isFetchingVibe) return;
    isFetchingVibe = true;
    try {
      const vibes = await fetchVibes(trackId);
      if (vibes.length > 0 && currentIdx >= queue.length - 1) {
        queue = [...queue, vibes[0]];
        if (vibes.length > 1) window._pendingVibes = vibes.slice(1);
        renderQueue();
      }
    } catch { }
    finally { isFetchingVibe = false; }
  }

  async function playNext() {
    if (currentIdx < queue.length - 1) {
      playQueueItem(currentIdx + 1);
      return;
    }
    if (!autoPlayEnabled) { showToast('End of queue.'); return; }

    const last = queue[currentIdx];
    if (!last || !last.spId) { showToast('End of queue.'); return; }

    if (window._pendingVibes && window._pendingVibes.length > 0) {
      const next = window._pendingVibes.shift();
      queue = [...queue, next];
      renderQueue();
      playQueueItem(currentIdx + 1);
      preFetchNextVibe(next.spId);
      return;
    }

    showToast('✨ Finding next vibe...');
    const vibes = await fetchVibes(last.spId);
    if (vibes.length > 0) {
      vibes.forEach(v => { queue = [...queue, v]; });
      renderQueue();
      playQueueItem(currentIdx + 1);
    } else {
      showToast('No more vibes found.');
    }
  }

  function playPrev() {
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
    else showToast('This is the first song!');
  }

  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

  /* ── 9. 🎛️ CONTROLLER & SYNC NETWORK ─────────────────────── */
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
      if (activeType === 'stream' || activeType === 'youtube_audio') { if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{}); } 
      else if (activeType === 'youtube' && ytPlayer) { if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo(); }
  }));

  function updatePlayBtn() { 
      mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶'); 
      const vis = document.getElementById('visualizer') || document.querySelector('.music-visualizer');
      if (isPlaying && (activeType === 'stream' || activeType === 'youtube_audio')) { vinylRecord.classList.add('playing'); if(vis) vis.classList.add('playing'); } 
      else { vinylRecord.classList.remove('playing'); if(vis) vis.classList.remove('playing'); }
  }
  function setTrackInfo(title, sub) { musicTitle.textContent = title; musicArtist.textContent = sub; miniTitle.textContent = `${title} • ${sub}`; }

  nativeAudio.addEventListener('play',  () => { isPlaying = true; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('seeked', () => { if (synced && !isRemoteAction) broadcastSync({ action: 'seek', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('ended', playNext);

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
          const curItem = queue[currentIdx]; const isBlob = curItem && curItem.url && curItem.url.startsWith('blob:');
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
          if (idx === -1) { queue.push(data.item); idx = queue.length - 1; } else { queue[idx] = data.item; }
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

  /* ── 10. SPOTIFY EVENT LISTENERS ────────────────────────── */
  if(spInput) spInput.addEventListener('keydown', e => { if(e.key==='Enter' && spSearchSongBtn) spSearchSongBtn.click(); });
  if(spSearchSongBtn) spSearchSongBtn.onclick = () => { searchSpotifyAlt(spInput.value.trim(), 'spSearchResults'); spInput.value = ''; };
  if(spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = async () => { 
      const id = spInput.value.trim(); if(!id) return;
      showToast("📂 Fetching Playlist Details...");
      const tracks = await fetchPlaylistTracks(id);
      renderSpotifyUI(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image })), spSearchResults, "");
      spInput.value = ''; 
  };

  const autoPlayBtn = document.getElementById('autoPlayToggle');
  if (autoPlayBtn) {
      if (autoPlayEnabled) autoPlayBtn.classList.add('active');
      autoPlayBtn.onclick = () => {
          autoPlayEnabled = !autoPlayEnabled;
          autoPlayBtn.classList.toggle('active', autoPlayEnabled);
          showToast(autoPlayEnabled ? "Auto-play: ON ✨" : "Auto-play: OFF 🌑");
      };
  }

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
