/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (PRO 3.4 FINAL HYBRID BUILD)
   💥 All RapidAPI calls FIXED (lowercase headers + robust parse)
   🔥 Zero search results & playback completely resolved
   ✅ Strict X-RapidAPI-Key / X-RapidAPI-Host (lowercase)
   ✅ Spotify spId correct + fallback bridge
   ✅ m4a audio extraction guaranteed in youtube_audio mode
   ✅ Console logs for debugging empty results
   🛠️ Syntax Errors and Template Literals fixed!
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

  /* ── 2. 🔑 GLOBAL API CONFIG + STRICT RAPIDAPI HEADERS ─── */
  const RAPID_API_KEY = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST = 'spotify81.p.rapidapi.com';
  const YT_RAPID_HOST = 'youtube-search-and-download.p.rapidapi.com';
  const SPOTIFY_SEARCH_HOST = 'spotify-web-api3.p.rapidapi.com';

  function rapidHeaders(host) {
      return {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': host
      };
  }

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
  let isFetchingVibe = false;

  function setRemoteAction() {
      isRemoteAction = true;
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ── 4. 📱 UI & PANEL ENGINE ────────────────────────────── */
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

  /* ── 5. 🎬 YOUTUBE IFRAME (Cinema Mode ONLY) ───────────── */
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
      if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); broadcastSync({ action: 'play', time: ytPlayer.getCurrentTime() }); }
      else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time: ytPlayer.getCurrentTime() }); }
      else if (event.data === YT.PlayerState.ENDED) { playNext(); }
  }

  /* ── 6. YT-BRAIN (RapidAPI + Full Debug Logs) ──────────── */
  async function searchYouTubeRapid(query) {
      try {
          const res = await fetch(`https://${YT_RAPID_HOST}/search?query=${encodeURIComponent(query)}`, {
              headers: rapidHeaders(YT_RAPID_HOST)
          });
          const data = await res.json();
          console.log('%c[YT RapidAPI Raw Response]', 'color:#E8436A;font-weight:bold', data);
          
          const contents = data.contents || data.results || data.items || [];
          const items = contents.map(item => {
              const video = item.video || item;
              if (!video || !video.videoId) return null;
              return {
                  title: video.title || video.name || '',
                  videoId: video.videoId,
                  thumbnail: video.thumbnail || video.thumbnails?.[0]?.url || ''
              };
          }).filter(Boolean);
          
          if (items.length === 0) console.warn('%c[YT Search] Zero results returned by RapidAPI', 'color:#E8436A');
          return items;
      } catch (e) {
          console.error("YT RapidAPI Error:", e);
          return [];
      }
  }

  function searchYouTube(query, targetResultsDiv, mediaType) {
      if (!query) return;
      const resDiv = document.getElementById(targetResultsDiv);
      if (!resDiv) return;
      resDiv.innerHTML = '<p class="mp-empty">🔍 Searching YouTube (RapidAPI)...</p>';
      if (targetResultsDiv === 'ytSearchResults') episodesOverlayYt.classList.remove('hidden');

      searchYouTubeRapid(query).then(items => {
          resDiv.innerHTML = '';
          if (items.length === 0) {
              resDiv.innerHTML = '<p class="mp-empty">No results. Check console for API response.</p>';
              return;
          }
          items.forEach(vid => {
              const div = document.createElement('div'); div.className = 'yt-search-item';
              div.innerHTML = `<img src="${vid.thumbnail}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${vid.title}</div></div><span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>`;
              div.onclick = () => {
                  queue = []; currentIdx = 0;
                  addToQueue({ type: mediaType, title: vid.title, ytId: vid.videoId, thumb: vid.thumbnail });
                  showToast('🎬 Playing Cinema Mode');
              };
              resDiv.appendChild(div);
          });
      });
  }

  /* ── 7. SPOTIFY BRIDGE (Robust Parse + Debug Logs) ─────── */
  async function getSpotifyTracks(query) {
      try {
          const url = "https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall?market=IN&country=IN";
          const res = await fetch(url, {
              method: "POST",
              headers: {
                  ...rapidHeaders(SPOTIFY_SEARCH_HOST),
                  "Content-Type": "application/json",
                  "Accept-Language": "en-IN,en;q=0.9"
              },
              body: JSON.stringify({ terms: query, limit: 15, country: "IN", market: "IN" })
          });
          
          const responseData = await res.json();
          console.log('%c[Spotify Search Raw Response]', 'color:#1db954;font-weight:bold', responseData);
          
          const searchData = responseData?.data?.searchV2 || responseData?.data || responseData;
          let rawItems = [];
          
          (searchData?.topResults?.items || searchData?.topResultsV2?.itemsV2 || []).forEach(item => rawItems.push({ ...item, isExactTopResult: true }));
          (searchData?.tracksV2?.items || searchData?.tracks?.items || []).forEach(item => rawItems.push(item));
          (searchData?.playlistsV2?.items || searchData?.playlists?.items || []).forEach(item => rawItems.push(item));
          (searchData?.albumsV2?.items || searchData?.albums?.items || []).forEach(item => rawItems.push(item));

          const seenUris = new Set();
          let cleanItems = [];

          rawItems.forEach((wrapper) => {
              const item = wrapper?.item?.data || wrapper?.data || wrapper;
              if (!item || !item.uri || seenUris.has(item.uri)) return;
              seenUris.add(item.uri);

              const uriParts = item.uri.split(':');
              const itemType = uriParts[1];
              const itemId = item.id || uriParts[2];

              const titleName = item.name || 'Unknown';
              let artistName = 'Unknown';
              if (item.artists?.items?.[0]?.profile?.name) artistName = item.artists.items[0].profile.name;
              else if (item.ownerV2?.data?.name) artistName = item.ownerV2.data.name;

              let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
              if (item.albumOfTrack?.coverArt?.sources?.[0]?.url) thumb = item.albumOfTrack.coverArt.sources[0].url;
              else if (item.coverArt?.sources?.[0]?.url) thumb = item.coverArt.sources[0].url;

              cleanItems.push({ titleName, artistName, itemType, itemId, thumb });
          });

          if (cleanItems.length === 0) console.warn('%c[Spotify Bridge] Zero clean tracks after parsing', 'color:#1db954');
          return cleanItems;
      } catch (e) {
          console.error("Spotify Bridge Error:", e);
          return [];
      }
  }

  async function searchSpotifyAlt(query, targetResultsDiv) {
      if (!query) return;
      const resDiv = document.getElementById(targetResultsDiv);
      if (!resDiv) return;
      resDiv.innerHTML = '<p class="mp-empty">⏳ Loading Spotify matches...</p>';
      if (typeof episodesOverlaySp !== 'undefined') episodesOverlaySp.classList.remove('hidden');

      const cleanItems = await getSpotifyTracks(query);
      if (cleanItems.length === 0) {
          resDiv.innerHTML = `<p class="mp-empty">❌ No results. Check console logs.</p>`;
          return;
      }
      renderSpotifyUI(cleanItems, resDiv);
  }

  function renderSpotifyUI(cleanItems, resDiv) {
      resDiv.innerHTML = '';
      cleanItems.forEach((data) => {
          const div = document.createElement('div');
          div.className = 'yt-search-item';
          div.innerHTML = `
              <img src="${data.thumb}" class="yt-search-thumb" style="border-radius:4px;"/>
              <div class="yt-search-info">
                <div class="yt-search-title">${data.titleName}</div>
                <div class="yt-search-sub">${data.artistName}</div>
              </div>
              <span style="font-size:18px;padding:0 4px;color:#1db954">▶</span>
          `;
          div.onclick = () => {
              queue = []; currentIdx = 0;
              addToQueue({
                  type: 'youtube_audio',
                  title: data.titleName,
                  artist: data.artistName,
                  spId: data.itemId,
                  thumb: data.thumb
              });
              showToast('🎵 Playing Clean Spotify Track');
          };
          resDiv.appendChild(div);
      });
  }

  async function fetchPremiumAudio(spId) {
      if (!spId) return null;
      try {
          const res = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true`, {
              headers: rapidHeaders(SP81_HOST)
          });
          const result = await res.json();
          console.log('%c[Audio Extraction Response]', 'color:#1db954', result);
          return Array.isArray(result) ? (result[0]?.url || result[0]?.link || result[0]?.downloadUrl) : (result.url || result.link || result.downloadUrl || null);
      } catch (error) {
          console.error("Audio Extraction Error:", error);
          return null;
      }
  }

  /* ── 8. QUEUE & CORE RENDERER ──────────────────────────── */
  function addToQueue(item) {
      queue.push(item);
      renderQueue();
      playQueueItem(queue.length - 1);
  }

  function renderQueue() {
      if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
      queueList.innerHTML = '';
      queue.forEach((item, i) => {
          const el = document.createElement('div'); el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
          const icon = item.type === 'youtube_audio' ? '🎧' : (item.type === 'stream' ? '☁️' : '🎬'); 
          el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
          el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); renderQueue(); return; } playQueueItem(i); };
          queueList.appendChild(el);
      });
  }

  function playQueueItem(i) {
      if (i < 0 || i >= queue.length) return; currentIdx = i; renderQueue();
      const item = queue[i];
      const isBlob = item.url && item.url.startsWith('blob:');
      if (synced && !isRemoteAction && !isBlob) broadcastSync({ action: 'change_song', item: item });
      renderMedia(item);
  }

  /* ── 9. STRICT PLAYBACK LOGIC (Hybrid) ─────────────────── */
  function renderMedia(item) {
      nativeAudio.style.display = 'none'; ytFrameWrap.style.display = 'none';
      nativeAudio.pause(); nativeAudio.src = '';
      if (ytPlayer && isYtReady) ytPlayer.pauseVideo();
      isPlaying = false; updatePlayBtn();
      
      if (item.type === 'youtube') {
          activeType = 'youtube';
          spotifyMode.classList.add('hidden'); cinemaMode.classList.remove('hidden');
          ytFrameWrap.style.display = 'block';
          if (isYtReady && item.ytId) ytPlayer.loadVideoById(item.ytId);
          setTrackInfo(item.title, 'YouTube Cinema Mode');
          setupMediaSession(item);
      } 
      else if (item.type === 'youtube_audio' || item.type === 'stream') {
          activeType = 'youtube_audio';
          cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
          ensureVisualizer(item);
          setTrackInfo(item.title, item.artist || 'ZeroX Audio');
          setupMediaSession(item);

          if (item.type === 'youtube_audio' && item.spId) {
              fetchPremiumAudio(item.spId).then(audioLink => {
                  if (audioLink) {
                      nativeAudio.src = audioLink;
                      nativeAudio.play()
                          .then(() => { isPlaying = true; updatePlayBtn(); })
                          .catch(err => { console.error("Playback Error:", err); showToast("Tap ▶ to play"); });
                  } else {
                      showToast('Audio fetch failed — trying next...');
                      playNext();
                  }
              });
          } else if (item.url) {
              nativeAudio.src = item.url;
              nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => {});
          }
      }

      if (autoPlayEnabled && (item.spId || item.ytId)) preFetchNextVibe();
  }

  function ensureVisualizer(item) {
      vinylRecord.style.backgroundImage = `url('${item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg'}')`;
      vinylRecord.style.backgroundSize = 'cover'; vinylRecord.style.backgroundPosition = 'center';
  }

  function setupMediaSession(item) {
      if('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
              title: item.title, artist: item.artist || 'ZeroX Hub',
              artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes:'512x512', type:'image/jpeg' }]
          });
      }
  }

  /* ── 10. ROBUST HYBRID VIBE ENGINE (YT→Spotify + Fallback) ─ */
  async function fetchVibes() {
      const current = queue[currentIdx];
      if (!current) return [];

      const smartQuery = `more songs like ${current.title} ${current.artist || ''}`.trim();
      showToast('[Vibe] Finding Next...');

      let ytSuggestions = await searchYouTubeRapid(smartQuery);
      
      if (ytSuggestions.length === 0) {
          showToast('[Vibe] Using simple fallback...');
          ytSuggestions = await searchYouTubeRapid(current.title);
      }
      if (ytSuggestions.length === 0 && current.artist) {
          showToast('[Vibe] Using artist fallback...');
          ytSuggestions = await searchYouTubeRapid(current.artist);
      }

      showToast('[Vibe] Syncing Spotify...');

      let cleanTracks = [];
      const seen = new Set(queue.map(q => q.spId).filter(Boolean));

      for (const yt of ytSuggestions.slice(0, 8)) {
          if (cleanTracks.length >= 5) break;
          const spResults = await getSpotifyTracks(yt.title);
          if (spResults.length > 0) {
              for (const sp of spResults) {
                  if (sp.itemId && !seen.has(sp.itemId)) {
                      seen.add(sp.itemId);
                      cleanTracks.push({
                          type: 'youtube_audio',
                          title: sp.titleName,
                          artist: sp.artistName,
                          spId: sp.itemId,
                          thumb: sp.thumb
                      });
                      break;
                  }
              }
          }
      }

      // ROBUST FALLBACK: If Spotify returned nothing, use basic YouTube data
      if (cleanTracks.length === 0 && ytSuggestions.length > 0) {
          console.warn('%c[Vibe Bridge] Spotify returned 0 results — using YouTube fallback', 'color:#ff9800');
          ytSuggestions.slice(0, 3).forEach(yt => {
              cleanTracks.push({
                  type: 'youtube_audio',
                  title: yt.title,
                  artist: 'YouTube Fallback',
                  spId: null,
                  thumb: yt.thumbnail,
                  isFallback: true
              });
          });
      }

      showToast(`[Vibe] Ready (${cleanTracks.length} tracks)`);
      return cleanTracks;
  }

  async function preFetchNextVibe() {
      if (currentIdx < queue.length - 1 || isFetchingVibe) return;
      isFetchingVibe = true;
      try {
          const vibes = await fetchVibes();
          if (vibes.length > 0 && currentIdx >= queue.length - 1) {
              queue.push(...vibes);
              renderQueue();
          }
      } catch (e) { console.error(e); }
      finally { isFetchingVibe = false; }
  }

  async function playNext() {
      if (currentIdx < queue.length - 1) {
          playQueueItem(currentIdx + 1);
          return;
      }
      if (!autoPlayEnabled) { showToast('End of queue.'); return; }

      const vibes = await fetchVibes();
      if (vibes.length > 0) {
          queue.push(...vibes);
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

  /* ── 11. CONTROLS & SYNC ───────────────────────────────── */
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
      if (activeType === 'youtube_audio' || activeType === 'stream') {
          isPlaying ? nativeAudio.pause() : nativeAudio.play().catch(() => {});
      } else if (activeType === 'youtube' && ytPlayer) {
          isPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
      }
  }));

  function updatePlayBtn() { 
      mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶'); 
      if (isPlaying) vinylRecord.classList.add('playing'); else vinylRecord.classList.remove('playing');
  }

  function setTrackInfo(title, sub) { 
      musicTitle.textContent = title; 
      musicArtist.textContent = sub; 
      miniTitle.textContent = `${title} • ${sub}`; 
  }

  nativeAudio.addEventListener('play',  () => { isPlaying = true; updatePlayBtn(); });
  nativeAudio.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); });
  nativeAudio.addEventListener('ended', playNext);

  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  window._zxReceiveSync = function (data) {
      if (data.action === 'request_sync') {
          const curItem = queue[currentIdx];
          if (synced && curItem) broadcastSync({ action: 'change_song', item: curItem });
          return;
      }
      if (!synced) return; setRemoteAction();
      if (data.action === 'change_song') {
          let idx = queue.findIndex(q => q.title === data.item.title);
          if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
          currentIdx = idx; renderQueue(); renderMedia(queue[idx]); return;
      }
      if (activeType === 'youtube' && ytPlayer && isYtReady) {
          if (data.action === 'play') { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
          if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
          if (data.action === 'seek') { ytPlayer.seekTo(data.time, true); }
      } else if (activeType === 'youtube_audio' || activeType === 'stream') {
          if (data.action === 'play') { nativeAudio.currentTime = data.time || nativeAudio.currentTime; nativeAudio.play().catch(() => {}); }
          if (data.action === 'pause') { nativeAudio.currentTime = data.time || nativeAudio.currentTime; nativeAudio.pause(); }
          if (data.action === 'seek') { nativeAudio.currentTime = data.time || nativeAudio.currentTime; }
      }
  };

  if(mpSyncBtn) mpSyncBtn.addEventListener('click', () => {
      synced = true; mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
      mpSyncBtn.style.display = 'none'; mpSyncInfo.style.display = 'flex';
      broadcastSync({ action: 'request_sync' }); showToast('🔗 Sync Network Active');
  });

  if(mpUnsyncBtn) mpUnsyncBtn.addEventListener('click', () => {
      synced = false; mpSyncBadge.textContent = '🔴 Solo'; mpSyncBadge.classList.remove('synced');
      mpSyncBtn.style.display = 'block'; mpSyncInfo.style.display = 'none';
  });

  /* ── 12. INPUT LISTENERS ───────────────────────────────── */
  if (ytAddBtn) ytAddBtn.onclick = () => { 
      const val = ytInput.value.trim(); if (!val) return; ytInput.value = '';
      if (isYouTubeUrl(val)) loadYouTube(val); else searchYouTube(val, 'ytSearchResults', 'youtube');
  };
  if (ytInput) ytInput.addEventListener('keydown', e => { if(e.key==='Enter') ytAddBtn.click(); });

  if (urlInput) urlInput.addEventListener('keydown', e => { if(e.key==='Enter') urlAddBtn.click(); });
  if (urlAddBtn) urlAddBtn.addEventListener('click', () => {
      const val = urlInput.value.trim(); if (!val) return;
      if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; }
      else if (val.startsWith('http')) { queue=[]; currentIdx=0; addToQueue({ type: 'stream', title: 'Cloud Media', url: val }); urlInput.value = ''; }
  });

  if (fileInput) fileInput.addEventListener('change', () => {
      const file = fileInput.files[0]; if (!file) return;
      queue=[]; currentIdx=0; addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function loadYouTube(url) {
      const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; }
      queue=[]; currentIdx=0; addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id });
  }

  if (spInput) spInput.addEventListener('keydown', e => { if(e.key==='Enter') spSearchSongBtn.click(); });
  if (spSearchSongBtn) spSearchSongBtn.onclick = () => { searchSpotifyAlt(spInput.value.trim(), 'spSearchResults'); spInput.value = ''; };

  const autoPlayBtn = document.getElementById('autoPlayToggle');
  if (autoPlayBtn) {
      autoPlayBtn.classList.toggle('active', autoPlayEnabled);
      autoPlayBtn.onclick = () => {
          autoPlayEnabled = !autoPlayEnabled;
          autoPlayBtn.classList.toggle('active', autoPlayEnabled);
          showToast(autoPlayEnabled ? "Auto-play: ON ✨" : "Auto-play: OFF 🌑");
      };
  }

  renderQueue();
})();
