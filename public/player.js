/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (UPGRADED v4.0 FINAL)
   ✅ YT Music Tab: Search → instant m4a play, no result list popup
   ✅ Smart Queue: +5 batch, fetch next 5 at 5th song
   ✅ Pre-fetch: background m4a extraction for instant next
   ✅ Auto-play: toggle in handle, infinite loop like Spotify
   ✅ Dupe Filter: same song diff channel treated as same
   ✅ Premium Now Playing Card UI
   ✅ All existing features preserved
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ══════════════════════════════════════════
     1. DOM ELEMENTS
  ══════════════════════════════════════════ */
  const panel          = document.getElementById('zxPanel');
  const handle         = document.getElementById('zxHandle');
  const closeHandle    = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn');

  const nativeAudio    = document.getElementById('nativeAudio');
  const ytFrameWrap    = document.getElementById('ytFrameWrap');
  const cinemaMode     = document.getElementById('cinemaMode');
  const spotifyMode    = document.getElementById('spotifyMode');
  const vinylRecord    = document.getElementById('vinylRecord');
  const musicTitle     = document.getElementById('musicTitle');
  const musicArtist    = document.getElementById('musicArtist');
  const miniTitle      = document.getElementById('miniTitle');
  const miniArtist     = document.getElementById('miniArtist');
  const miniThumb      = document.getElementById('miniThumb');
  const miniThumbPlaceholder = document.getElementById('miniThumbPlaceholder');

  // Premium Now Playing Card elements
  const pnpThumb       = document.getElementById('pnpThumb');
  const pnpTitle       = document.getElementById('pnpTitle');
  const pnpArtist      = document.getElementById('pnpArtist');
  const pnpPlay        = document.getElementById('pnpPlay');
  const pnpPrev        = document.getElementById('pnpPrev');
  const pnpNext        = document.getElementById('pnpNext');
  const pnpBgBlur      = document.getElementById('pnpBgBlur');

  const mpPlays        = document.querySelectorAll('.mp-play');
  const urlInput       = document.getElementById('urlInput');
  const urlAddBtn      = document.getElementById('urlAddBtn');
  const fileInput      = document.getElementById('fileInput');
  const ytInput        = document.getElementById('ytInput');
  const ytAddBtn       = document.getElementById('ytAddBtn');
  const spInput        = document.getElementById('spInput');
  const spSearchSongBtn    = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn= document.getElementById('spSearchPlaylistBtn');
  const queueList      = document.getElementById('queueList');

  const toggleListBtnUrl   = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt    = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt  = document.getElementById('episodesOverlayYt');
  const ytSearchResults    = document.getElementById('ytSearchResults');
  const toggleListBtnSp    = document.getElementById('toggleListBtnSp');
  const episodesOverlaySp  = document.getElementById('episodesOverlaySp');
  const spSearchResults    = document.getElementById('spSearchResults');

  const mpSyncBadge    = document.getElementById('mpSyncBadge');
  const mpSyncBtn      = document.getElementById('mpSyncBtn');
  const mpSyncInfo     = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn    = document.getElementById('mpUnsyncBtn');

  // YT Music Tab elements
  const ytmInput       = document.getElementById('ytmInput');
  const ytmPlayBtn     = document.getElementById('ytmPlayBtn');
  const ytmResultsBox  = document.getElementById('ytmResultsBox');
  const ytmResultsList = document.getElementById('ytmResultsList');

  // Auto Play Toggle
  const autoPlayToggle = document.getElementById('autoPlayToggle');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ══════════════════════════════════════════
     2. API CONFIG
  ══════════════════════════════════════════ */
  const RAPID_API_KEY  = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST      = 'spotify81.p.rapidapi.com';
  const YOUTUBE_API_KEY= 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  /* ══════════════════════════════════════════
     3. STATE
  ══════════════════════════════════════════ */
  let queue            = [];
  let currentIdx       = 0;
  let synced           = false;
  let activeType       = 'none';
  let isPlaying        = false;
  let ytPlayer         = null;
  let isYtReady        = false;
  let isRemoteAction   = false;
  let autoPlayEnabled  = true;
  let remoteTimer      = null;

  // Pre-fetch cache: ytId → blobUrl or audioUrl
  const prefetchCache  = new Map();
  // Played song fingerprints to prevent duplicates
  const playedFingerprints = new Set();

  // YT Music: current search context for related songs
  let ytmCurrentQuery  = '';
  let ytmCurrentArtist = '';
  // YT Music batch: array of {ytId, title, channel, thumb} yet to be queued
  let ytmPendingBatch  = [];
  // Whether we're in YT Music auto mode
  let ytmAutoMode      = false;

  // Playlist mode tracking
  let playlistSource   = null; // {type: 'ytm'|'spotify_playlist', items:[...], currentIndex:0}

  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ══════════════════════════════════════════
     4. PANEL UI ENGINE
  ══════════════════════════════════════════ */
  let startY = 0;
  let isPanelOpen = false;

  function openPanel() {
    if (isPanelOpen) return;
    isPanelOpen = true;
    panel.classList.add('zx-open');
    document.body.style.overflow = 'hidden';
    if (panelToggleBtn) panelToggleBtn.classList.add('active');
  }
  function closePanel() {
    if (!isPanelOpen) return;
    isPanelOpen = false;
    panel.classList.remove('zx-open');
    document.body.style.overflow = '';
    if (panelToggleBtn) panelToggleBtn.classList.remove('active');
  }

  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive: true});
  handle.addEventListener('touchmove',  e => { if (!isPanelOpen && (e.touches[0].clientY - startY) > 15) openPanel(); }, {passive: true});
  if (panelToggleBtn) panelToggleBtn.addEventListener('click', e => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle.addEventListener('click', e => {
    if (e.target.closest('.mp-btn') || e.target.closest('.z-trigger-btn') || e.target.closest('.auto-play-btn')) return;
    isPanelOpen ? closePanel() : openPanel();
  });
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive: true});
    closeHandle.addEventListener('touchmove',  e => { if (isPanelOpen && (startY - e.touches[0].clientY) > 15) closePanel(); }, {passive: true});
    closeHandle.addEventListener('click', closePanel);
  }
  panel.addEventListener('touchmove', e => {
    if (isPanelOpen && !e.target.closest('.music-panel-inner')) e.preventDefault();
  }, {passive: false});

  // Tabs
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // PNP Card controls
  if (pnpPlay) pnpPlay.addEventListener('click', () => togglePlayPause());
  if (pnpPrev) pnpPrev.addEventListener('click', () => playPrev());
  if (pnpNext) pnpNext.addEventListener('click', () => playNext());

  /* ══════════════════════════════════════════
     5. AUTO-PLAY TOGGLE
  ══════════════════════════════════════════ */
  if (autoPlayToggle) {
    autoPlayToggle.classList.toggle('active', autoPlayEnabled);
    autoPlayToggle.addEventListener('click', e => {
      e.stopPropagation();
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayToggle.classList.toggle('active', autoPlayEnabled);
      showToast(autoPlayEnabled ? '🔁 Auto-play: ON' : '⏹ Auto-play: OFF');
    });
  }

  /* ══════════════════════════════════════════
     6. TOAST
  ══════════════════════════════════════════ */
  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ══════════════════════════════════════════
     7. YOUTUBE IFRAME ENGINE (Cinema)
  ══════════════════════════════════════════ */
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = function () {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0 },
      events: { onReady: () => { isYtReady = true; }, onStateChange: onPlayerStateChange }
    });
  };

  function onPlayerStateChange(event) {
    if (!synced || isRemoteAction) {
      if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); }
      if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); }
      if (event.data === YT.PlayerState.ENDED)    { handleSongEnd(); }
      return;
    }
    const time = ytPlayer.getCurrentTime();
    if (event.data === YT.PlayerState.PLAYING)  { isPlaying = true;  updatePlayBtn(); broadcastSync({ action: 'play', time }); }
    else if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time }); }
    else if (event.data === YT.PlayerState.ENDED)   { handleSongEnd(); }
  }

  /* ══════════════════════════════════════════
     8. SONG END HANDLER (Auto-play logic)
  ══════════════════════════════════════════ */
  function handleSongEnd() {
    if (!autoPlayEnabled) return;

    // If playlist source active and next item in playlist
    if (playlistSource && playlistSource.currentIndex + 1 < playlistSource.items.length) {
      playlistSource.currentIndex++;
      const nextItem = playlistSource.items[playlistSource.currentIndex];
      queue = []; currentIdx = 0;
      addToQueue(nextItem);
      return;
    }

    // If more items in queue
    if (currentIdx < queue.length - 1) {
      playQueueItem(currentIdx + 1);
      return;
    }

    // If YT Music auto mode: fetch next batch
    if (ytmAutoMode && ytmCurrentQuery) {
      showToast('⏳ Fetching more songs...');
      fetchYtmRelatedBatch(ytmCurrentQuery, ytmCurrentArtist).then(batch => {
        if (batch.length > 0) {
          ytmPendingBatch = batch;
          enqueueYtmBatch();
        }
      });
      return;
    }

    showToast('🎵 End of queue.');
  }

  /* ══════════════════════════════════════════
     9. SONG FINGERPRINT (dedup logic)
  ══════════════════════════════════════════ */
  function getSongFingerprint(title, channel) {
    // Normalize: lowercase, remove featured artists, remove (official|lyric|video|audio|hd|4k|ft.|feat.) etc.
    const clean = str => str
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/ft\.?|feat\.?|official|lyric|video|audio|hd|4k|vevo|music|lyrics|full\s?song/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return clean(title);
  }

  function isAlreadyPlayed(title, channel) {
    const fp = getSongFingerprint(title, channel);
    return playedFingerprints.has(fp);
  }

  function markAsPlayed(title, channel) {
    const fp = getSongFingerprint(title, channel);
    playedFingerprints.add(fp);
  }

  /* ══════════════════════════════════════════
     10. M4A / AUDIO EXTRACTION ENGINE
  ══════════════════════════════════════════ */
  // Extract best audio URL for a YT video ID using multiple CORS-friendly methods
  async function extractYtAudio(ytId) {
    // Try RapidAPI cobalt or similar if available, else use noembed/yt-dlp proxy
    // Method 1: spotify81 download_track style using ytId as search
    try {
      const res = await fetch(
        `https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } }
      );
      if (res.ok) {
        const data = await res.json();
        const url = Array.isArray(data) ? (data[0]?.url || data[0]?.link) : (data.url || data.link || data.downloadUrl);
        if (url) return url;
      }
    } catch (_) {}
    return null;
  }

  // Pre-fetch for a batch of items in background
  async function prefetchItems(items) {
    for (const item of items) {
      if (item.ytId && !prefetchCache.has(item.ytId)) {
        const url = await extractYtAudio(item.ytId);
        if (url) {
          prefetchCache.set(item.ytId, url);
          // Update queue item
          const qi = queue.find(q => q.ytId === item.ytId);
          if (qi) qi._cachedUrl = url;
          updateQueueItemPrefetchDot(item.ytId, true);
        }
      }
    }
  }

  function updateQueueItemPrefetchDot(ytId, ready) {
    const dot = document.querySelector(`.qi-prefetch[data-ytid="${ytId}"]`);
    if (dot) {
      dot.textContent = ready ? '●' : '○';
      dot.style.color = ready ? '#7ADB8A' : 'rgba(255,181,200,0.3)';
    }
    // Also update ytm result dot
    const rdot = document.querySelector(`.ytm-prefetch-dot[data-ytid="${ytId}"]`);
    if (rdot) rdot.classList.toggle('ready', ready);
  }

  /* ══════════════════════════════════════════
     11. YT MUSIC TAB ENGINE
  ══════════════════════════════════════════ */

  // Search YT for audio-style results (music first)
  async function searchYtMusic(query) {
    if (!query) return [];
    const musicQuery = query + ' official audio OR lyrics OR full song';
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(musicQuery)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      if (!data.items) return [];

      // Dedup by fingerprint
      const seen = new Set();
      const results = [];
      for (const vid of data.items) {
        const fp = getSongFingerprint(vid.snippet.title, vid.snippet.channelTitle);
        if (!seen.has(fp)) {
          seen.add(fp);
          results.push({
            ytId:    vid.id.videoId,
            title:   vid.snippet.title,
            channel: vid.snippet.channelTitle,
            thumb:   vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium?.url
          });
        }
      }
      return results;
    } catch (_) { return []; }
  }

  // Fetch 5 related songs based on current song vibe
  async function fetchYtmRelatedBatch(seedTitle, seedArtist) {
    // Build a vibe-aware query
    const vibeQuery = buildVibeQuery(seedTitle, seedArtist);
    const candidates = await searchYtMusic(vibeQuery);

    // Filter already played
    const fresh = candidates.filter(c => !isAlreadyPlayed(c.title, c.channel));
    return fresh.slice(0, 5);
  }

  function buildVibeQuery(title, artist) {
    // Extract mood/genre keywords from title
    const lowerTitle = title.toLowerCase();
    let moodTag = '';

    if (/sad|dard|dil|broken|crying|tere bina|judai|bichhad|aansu|rone/.test(lowerTitle)) {
      moodTag = 'sad romantic hindi';
    } else if (/party|dance|dhoom|bang|beat|groove|club/.test(lowerTitle)) {
      moodTag = 'dance party hindi';
    } else if (/love|pyar|ishq|mohabbat|dil|romance|romantic|tere|tera/.test(lowerTitle)) {
      moodTag = 'romantic hindi love';
    } else if (/devotional|bhajan|mantra|god|temple|aarti/.test(lowerTitle)) {
      moodTag = 'devotional bhajan hindi';
    } else if (/lofi|chill|peaceful|calm|soft|slow/.test(lowerTitle)) {
      moodTag = 'lofi chill hindi';
    } else if (/rap|hip.?hop|trap|drill/.test(lowerTitle)) {
      moodTag = 'hindi rap hip hop';
    } else if (/punjabi|bhangra|jatt/.test(lowerTitle)) {
      moodTag = 'punjabi hit song';
    } else {
      moodTag = 'hindi hit song';
    }

    // Use artist if known
    if (artist && artist !== 'YouTube' && artist !== 'Unknown') {
      return `${artist} ${moodTag}`;
    }
    return moodTag;
  }

  // Enqueue a batch of 5 from ytmPendingBatch
  function enqueueYtmBatch() {
    if (ytmPendingBatch.length === 0) return;
    const batch = ytmPendingBatch.splice(0, 5);
    const startQueueLen = queue.length;

    batch.forEach(item => {
      if (!isAlreadyPlayed(item.title, item.channel)) {
        queue.push({
          type:    'youtube_audio',
          title:   item.title,
          artist:  item.channel,
          ytId:    item.ytId,
          thumb:   item.thumb,
          isYtm:   true
        });
        markAsPlayed(item.title, item.channel);
      }
    });

    renderQueue();

    // Pre-fetch audio for all newly added items
    const newItems = queue.slice(startQueueLen);
    prefetchItems(newItems);
  }

  // YT Music: Play first result directly (no list shown)
  async function ytmPlaySong(query) {
    if (!query.trim()) return;
    showToast('🔍 Finding song...');
    ytmCurrentQuery = query;
    ytmCurrentArtist = '';
    ytmAutoMode = true;
    playedFingerprints.clear();
    ytmPendingBatch = [];
    playlistSource = null;

    const results = await searchYtMusic(query);
    if (results.length === 0) { showToast('❌ No results found!'); return; }

    // Display results in the box
    renderYtmResults(results, query);

    // Play the first one immediately
    const first = results[0];
    ytmCurrentQuery  = query;
    ytmCurrentArtist = first.channel;
    markAsPlayed(first.title, first.channel);

    // Add first to queue
    queue = []; currentIdx = 0;
    queue.push({
      type:   'youtube_audio',
      title:  first.title,
      artist: first.channel,
      ytId:   first.ytId,
      thumb:  first.thumb,
      isYtm:  true
    });

    // Pre-queue next 4 from results (after dedup)
    const nextBatch = results.slice(1).filter(c => !isAlreadyPlayed(c.title, c.channel)).slice(0, 4);
    nextBatch.forEach(item => {
      queue.push({
        type:   'youtube_audio',
        title:  item.title,
        artist: item.channel,
        ytId:   item.ytId,
        thumb:  item.thumb,
        isYtm:  true
      });
      markAsPlayed(item.title, item.channel);
    });

    renderQueue();
    playQueueItem(0);

    // Pre-fetch audio for queued songs (index 1+)
    prefetchItems(queue.slice(1));

    // When on 4th/5th song, fetch next batch (triggered in playQueueItem)
  }

  function renderYtmResults(results, query) {
    ytmResultsBox.classList.remove('hidden');
    ytmResultsList.innerHTML = '';
    results.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'ytm-result-item';
      div.dataset.ytid = item.ytId;
      div.innerHTML = `
        <img src="${item.thumb}" class="ytm-result-thumb" alt=""/>
        <div class="ytm-result-info">
          <div class="ytm-result-title">${item.title}</div>
          <div class="ytm-result-channel">${item.channel}</div>
        </div>
        <div class="ytm-prefetch-dot" data-ytid="${item.ytId}" title="Audio ready"></div>
        <span class="ytm-result-action">▶</span>
      `;
      div.onclick = () => {
        ytmCurrentQuery  = query;
        ytmCurrentArtist = item.channel;
        ytmAutoMode = true;
        playedFingerprints.clear();

        // If already in queue, jump to it
        const existingIdx = queue.findIndex(q => q.ytId === item.ytId);
        if (existingIdx !== -1) { playQueueItem(existingIdx); return; }

        // Otherwise rebuild queue from this item
        markAsPlayed(item.title, item.channel);
        queue = [{ type: 'youtube_audio', title: item.title, artist: item.channel, ytId: item.ytId, thumb: item.thumb, isYtm: true }];
        currentIdx = 0;
        const rest = results.slice(idx + 1).filter(c => !isAlreadyPlayed(c.title, c.channel)).slice(0, 4);
        rest.forEach(r => {
          queue.push({ type: 'youtube_audio', title: r.title, artist: r.channel, ytId: r.ytId, thumb: r.thumb, isYtm: true });
          markAsPlayed(r.title, r.channel);
        });
        renderQueue(); playQueueItem(0);
        prefetchItems(queue.slice(1));
      };
      ytmResultsList.appendChild(div);
    });
  }

  // Highlight currently playing in YT Music results
  function highlightYtmResult(ytId) {
    document.querySelectorAll('.ytm-result-item').forEach(el => {
      el.classList.toggle('playing', el.dataset.ytid === ytId);
    });
  }

  // Event listeners for YT Music tab
  if (ytmPlayBtn) ytmPlayBtn.addEventListener('click', () => {
    ytmPlaySong(ytmInput.value.trim());
  });
  if (ytmInput) ytmInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') ytmPlayBtn.click();
  });

  /* ══════════════════════════════════════════
     12. CINEMA (YouTube) ENGINE
  ══════════════════════════════════════════ */
  function searchYouTube(query, targetResultsDiv, mediaType) {
    if (!query) return;
    const resDiv = document.getElementById(targetResultsDiv);
    if (!resDiv) return;
    resDiv.innerHTML = '<p class="mp-empty">🔍 Searching YouTube...</p>';
    if (targetResultsDiv === 'ytSearchResults') episodesOverlayYt.classList.remove('hidden');

    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`)
      .then(r => r.json())
      .then(data => {
        resDiv.innerHTML = '';
        if (!data.items?.length) { resDiv.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
        data.items.forEach(vid => {
          const div = document.createElement('div'); div.className = 'yt-search-item';
          div.innerHTML = `<img src="${vid.snippet.thumbnails.medium.url}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${vid.snippet.title}</div><div class="yt-search-sub">${vid.snippet.channelTitle}</div></div><span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>`;
          div.onclick = () => {
            queue = []; currentIdx = 0; playlistSource = null;
            addToQueue({ type: mediaType, title: vid.snippet.title, ytId: vid.id.videoId, thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url });
          };
          resDiv.appendChild(div);
        });
      }).catch(() => resDiv.innerHTML = '<p class="mp-empty">Error. Check API quota.</p>');
  }

  if (ytAddBtn) ytAddBtn.onclick = () => {
    const val = ytInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTubeCinema(val); ytInput.value = ''; return; }
    searchYouTube(val, 'ytSearchResults', 'youtube'); ytInput.value = '';
  };
  if (ytInput) ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });

  if (urlInput) urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlAddBtn.click(); });
  if (urlAddBtn) urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTubeCinema(val); urlInput.value = ''; }
    else if (val.startsWith('http')) { queue = []; currentIdx = 0; playlistSource = null; addToQueue({ type: 'stream', title: 'Cloud Media', url: val }); urlInput.value = ''; }
  });

  if (fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    queue = []; currentIdx = 0; playlistSource = null;
    addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function loadYouTubeCinema(url) {
    const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    queue = []; currentIdx = 0; playlistSource = null;
    addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id });
  }

  if (toggleListBtnUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl.classList.toggle('hidden'));
  if (toggleListBtnYt)  toggleListBtnYt.addEventListener('click',  () => episodesOverlayYt.classList.toggle('hidden'));
  if (toggleListBtnSp)  toggleListBtnSp.addEventListener('click',  () => episodesOverlaySp.classList.toggle('hidden'));

  /* ══════════════════════════════════════════
     13. SPOTIFY API ENGINE
  ══════════════════════════════════════════ */
  async function searchSpotifyAlt(query, targetResultsDiv) {
    if (!query) return;
    const resDiv = document.getElementById(targetResultsDiv || 'spSearchResults');
    if (!resDiv) return;
    resDiv.innerHTML = '<p class="mp-empty">⏳ Loading...</p>';
    if (episodesOverlaySp) episodesOverlaySp.classList.remove('hidden');

    try {
      const url = 'https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall?market=IN&country=IN';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-rapidapi-key':    RAPID_API_KEY,
          'x-rapidapi-host':   'spotify-web-api3.p.rapidapi.com',
          'Content-Type':      'application/json',
          'Accept-Language':   'en-IN,en;q=0.9,hi-IN;q=0.8,hi;q=0.7'
        },
        body: JSON.stringify({ terms: query, limit: 15, country: 'IN', market: 'IN' })
      });
      const responseData = await res.json();
      const searchData   = responseData?.data?.searchV2 || responseData;
      let rawItems = [];
      (searchData?.topResults?.items || searchData?.topResultsV2?.itemsV2 || []).forEach(i => rawItems.push({ ...i, isExactTopResult: true }));
      (searchData?.tracksV2?.items   || searchData?.tracks?.items          || []).forEach(i => rawItems.push(i));
      (searchData?.playlistsV2?.items|| searchData?.playlists?.items        || []).forEach(i => rawItems.push(i));
      (searchData?.albumsV2?.items   || searchData?.albums?.items           || []).forEach(i => rawItems.push(i));

      if (!rawItems.length) { resDiv.innerHTML = '<p class="mp-empty">❌ No results.</p>'; return; }

      const seenUris = new Set();
      let cleanItems = [];
      rawItems.forEach(wrapper => {
        const item = wrapper?.item?.data || wrapper?.data || wrapper;
        if (!item || !item.uri || seenUris.has(item.uri)) return;
        seenUris.add(item.uri);
        const uriParts = item.uri.split(':');
        const itemType = uriParts[1];
        const itemId   = item.id || uriParts[2];
        const titleName = item.name || item.profile?.name || 'Unknown';
        let artistName  = 'Unknown';
        if (item.artists?.items?.[0]?.profile?.name) artistName = item.artists.items[0].profile.name;
        else if (item.ownerV2?.data?.name) artistName = item.ownerV2.data.name;
        else if (itemType === 'artist') artistName = 'Artist Profile';
        let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
        if      (item.albumOfTrack?.coverArt?.sources?.[0]?.url)      thumb = item.albumOfTrack.coverArt.sources[0].url;
        else if (item.coverArt?.sources?.[0]?.url)                     thumb = item.coverArt.sources[0].url;
        else if (item.images?.items?.[0]?.sources?.[0]?.url)          thumb = item.images.items[0].sources[0].url;
        else if (item.visuals?.avatarImage?.sources?.[0]?.url)        thumb = item.visuals.avatarImage.sources[0].url;
        cleanItems.push({ titleName, artistName, itemType, itemId, thumb, isExactTopResult: wrapper.isExactTopResult });
      });

      const lq = query.toLowerCase();
      cleanItems.sort((a, b) => {
        const at = a.titleName.toLowerCase(), bt = b.titleName.toLowerCase();
        if (at === lq && bt !== lq) return -1;
        if (bt === lq && at !== lq) return 1;
        if (at.includes(lq) && !bt.includes(lq)) return -1;
        if (bt.includes(lq) && !at.includes(lq)) return 1;
        if (a.isExactTopResult && !b.isExactTopResult) return -1;
        if (b.isExactTopResult && !a.isExactTopResult) return 1;
        return 0;
      });
      renderSpotifyUI(cleanItems, resDiv, lq);
    } catch (e) { console.error(e); resDiv.innerHTML = '<p class="mp-empty">🚨 API Error!</p>'; }
  }

  function renderSpotifyUI(cleanItems, resDiv, lowerQuery = '') {
    resDiv.innerHTML = '';
    cleanItems.forEach((data, index) => {
      const typeLabel  = data.itemType !== 'track'
        ? ` <span style="font-size:9px;background:#e8436a;color:#fff;padding:2px 4px;border-radius:3px;margin-left:5px;">${data.itemType.toUpperCase()}</span>`
        : '';
      const imgRadius  = data.itemType === 'artist' ? '50%' : '4px';
      const isTopRender = index === 0 && lowerQuery && data.titleName.toLowerCase().includes(lowerQuery.split(' ')[0]);
      const topBadge   = (data.isExactTopResult || isTopRender)
        ? `<div style="font-size:10px;color:#1db954;font-weight:bold;margin-bottom:3px;">🏆 BEST MATCH</div>` : '';
      const div = document.createElement('div');
      div.className = 'yt-search-item';
      div.innerHTML = `
        <img src="${data.thumb}" class="yt-search-thumb" style="border-radius:${imgRadius};"/>
        <div class="yt-search-info">
          ${topBadge}
          <div class="yt-search-title">${data.titleName}${typeLabel}</div>
          <div class="yt-search-sub">${data.artistName}</div>
        </div>
        <span style="font-size:18px;padding:0 4px;color:#1db954">${data.itemType === 'track' ? '▶' : '📂'}</span>
      `;
      div.onclick = async () => {
        if (data.itemType === 'playlist') {
          showToast('📂 Loading Playlist...');
          const tracks = await fetchPlaylistTracks(data.itemId);
          const spItems = tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image }));
          renderSpotifyUI(spItems, resDiv, '');
        } else if (data.itemType === 'album') {
          showToast('📂 Loading Album...');
          const tracks = await fetchAlbumTracks(data.itemId);
          const spItems = tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image }));
          renderSpotifyUI(spItems, resDiv, '');
        } else if (data.itemType === 'artist') {
          showToast('👤 Artist profiles cannot be played directly.');
        } else {
          ytmAutoMode = false; playlistSource = null;
          queue = []; currentIdx = 0;
          addToQueue({ type: 'youtube_audio', title: data.titleName, artist: data.artistName, spId: data.itemId, thumb: data.thumb, isZeroxify: true });
          showToast('🎵 Playing Track!');
        }
      };
      resDiv.appendChild(div);
    });
  }

  async function fetchPlaylistTracks(playlistId) {
    try {
      const res  = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${playlistId}&offset=0&limit=100&market=IN`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const data = await res.json();
      return (data.items || []).filter(i => i.track && !i.track.is_local).map(i => ({
        id: i.track.id, title: i.track.name, artist: i.track.artists[0]?.name || 'Unknown', image: i.track.album?.images[0]?.url || ''
      }));
    } catch (_) { return []; }
  }

  async function fetchAlbumTracks(albumId) {
    try {
      const res  = await fetch(`https://${SP81_HOST}/album_tracks?id=${albumId}&market=IN`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const data = await res.json();
      const albumImg = data.album?.images?.[0]?.url || '';
      return (data.album?.tracks?.items || []).map(i => ({
        id: i.id, title: i.name, artist: i.artists[0]?.name || 'Unknown', image: albumImg
      }));
    } catch (_) { return []; }
  }

  async function fetchPremiumAudio(spId) {
    try {
      const res    = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const result = await res.json();
      return Array.isArray(result) ? (result[0]?.url || result[0]?.link) : (result.url || result.link || result.downloadUrl);
    } catch (_) { return null; }
  }

  if (spInput)            spInput.addEventListener('keydown', e => { if (e.key === 'Enter' && spSearchSongBtn) spSearchSongBtn.click(); });
  if (spSearchSongBtn)    spSearchSongBtn.onclick    = () => { searchSpotifyAlt(spInput.value.trim(), 'spSearchResults'); spInput.value = ''; };
  if (spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = async () => {
    const id = spInput.value.trim(); if (!id) return;
    showToast('📂 Fetching Playlist...');
    const tracks = await fetchPlaylistTracks(id);
    renderSpotifyUI(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image })), spSearchResults, '');
    spInput.value = '';
  };

  /* ══════════════════════════════════════════
     14. QUEUE & CORE RENDERER
  ══════════════════════════════════════════ */
  function addToQueue(item) {
    queue.push(item);
    renderQueue();
    playQueueItem(queue.length - 1);
  }

  function renderQueue() {
    if (!queue.length) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el   = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      const icon = item.isYtm ? '🎵' : (item.type === 'youtube_audio' ? '🎧' : item.type === 'youtube' ? '🎬' : '☁️');
      const hasCached = item._cachedUrl || prefetchCache.has(item.ytId);
      el.innerHTML = `
        <span class="qi-type">${icon}</span>
        <span class="qi-title">${item.title}</span>
        ${item.ytId ? `<span class="qi-prefetch" data-ytid="${item.ytId}" style="font-size:10px;color:${hasCached ? '#7ADB8A' : 'rgba(255,181,200,0.3)'}">●</span>` : ''}
        <button class="qi-del" data-i="${i}">✕</button>
      `;
      el.onclick = e => {
        if (e.target.classList.contains('qi-del')) {
          queue.splice(parseInt(e.target.dataset.i), 1);
          if (currentIdx >= queue.length) currentIdx = Math.max(0, queue.length - 1);
          renderQueue(); return;
        }
        playQueueItem(i);
      };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i;
    renderQueue();
    const item = queue[i];

    // If approaching end of batch and in ytm auto mode → prefetch next batch
    if (ytmAutoMode && autoPlayEnabled && i >= queue.length - 2 && ytmCurrentQuery) {
      fetchYtmRelatedBatch(ytmCurrentQuery, ytmCurrentArtist).then(batch => {
        if (batch.length > 0) {
          ytmPendingBatch = batch;
          // Silently enqueue them
          const startLen = queue.length;
          batch.forEach(item2 => {
            if (!isAlreadyPlayed(item2.title, item2.channel)) {
              queue.push({ type: 'youtube_audio', title: item2.title, artist: item2.channel, ytId: item2.ytId, thumb: item2.thumb, isYtm: true });
              markAsPlayed(item2.title, item2.channel);
            }
          });
          renderQueue();
          prefetchItems(queue.slice(startLen));
        }
      });
    }

    const isBlob = item.url && item.url.startsWith('blob:');
    if (synced && !isRemoteAction && !isBlob) broadcastSync({ action: 'change_song', item });
    renderMedia(item);
  }

  /* ══════════════════════════════════════════
     15. RENDER MEDIA
  ══════════════════════════════════════════ */
  function renderMedia(item) {
    nativeAudio.style.display = 'none';
    ytFrameWrap.style.display = 'none';
    nativeAudio.pause();
    nativeAudio.removeAttribute('src');
    nativeAudio.srcObject = null;
    if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    isPlaying = false;
    updatePlayBtn();

    if (item.type === 'youtube') {
      // Cinema Mode
      activeType = 'youtube';
      spotifyMode.classList.add('hidden');
      cinemaMode.classList.remove('hidden');
      ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => renderMedia(item), 500);
      setTrackInfo(item.title, 'YouTube Cinema', item.thumb || '');
      setupMediaSession(item);

    } else if (item.type === 'youtube_audio') {
      // Audio mode (YT Music or Spotify search → YT audio)
      activeType = 'youtube_audio';
      cinemaMode.classList.add('hidden');
      spotifyMode.classList.remove('hidden');
      setupVisualizer();
      setTrackInfo(item.title, item.artist || 'ZeroX Audio', item.thumb || '');
      setupMediaSession(item);

      // Highlight in YT Music results
      if (item.ytId) highlightYtmResult(item.ytId);

      // Check cache first for instant play
      if (item.ytId && (prefetchCache.has(item.ytId) || item._cachedUrl)) {
        const cachedUrl = item._cachedUrl || prefetchCache.get(item.ytId);
        playAudioUrl(cachedUrl, item);
        return;
      }

      // If from Spotify search (spId), use fetchPremiumAudio
      if (item.spId) {
        setTrackInfo(item.title, '⏳ Fetching Audio...', item.thumb || '');
        fetchPremiumAudio(item.spId).then(audioLink => {
          if (audioLink) {
            setTrackInfo(item.title, item.artist || 'ZeroX Audio', item.thumb || '');
            playAudioUrl(audioLink, item);
            // Cache it
            if (item.ytId) prefetchCache.set(item.ytId, audioLink);
          } else {
            setTrackInfo(item.title, '❌ Audio Failed', item.thumb || '');
            showToast('❌ Could not load audio. Skipping...');
            setTimeout(() => { if (autoPlayEnabled) handleSongEnd(); }, 2000);
          }
        });
        return;
      }

      // YT Music: extract from ytId
      if (item.ytId) {
        setTrackInfo(item.title, '⏳ Extracting Audio...', item.thumb || '');
        extractYtAudio(item.ytId).then(audioUrl => {
          if (audioUrl) {
            prefetchCache.set(item.ytId, audioUrl);
            item._cachedUrl = audioUrl;
            setTrackInfo(item.title, item.artist || 'ZeroX Audio', item.thumb || '');
            playAudioUrl(audioUrl, item);
            // Update dot
            updateQueueItemPrefetchDot(item.ytId, true);
          } else {
            // Fallback: Use YouTube iframe in audio-only mode (hidden video)
            setTrackInfo(item.title, item.artist || 'YouTube Audio', item.thumb || '');
            playYtIframeAudio(item);
          }
        });
      }
    } else if (item.type === 'stream') {
      activeType = 'stream';
      cinemaMode.classList.add('hidden');
      spotifyMode.classList.remove('hidden');
      setupVisualizer();
      setupMediaSession(item);
      nativeAudio.src = item.url;
      nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast('Tap ▶ to play'));
      setTrackInfo(item.title, '☁️ Cloud Audio', item.thumb || '');
    }
  }

  // Play via hidden YT iframe (fallback when audio extraction fails)
  function playYtIframeAudio(item) {
    activeType = 'youtube';
    cinemaMode.classList.remove('hidden');
    // Make video visible but small
    ytFrameWrap.style.display = 'block';
    if (isYtReady) {
      ytPlayer.loadVideoById(item.ytId);
      // Mute video display, we'll still get audio
    } else {
      setTimeout(() => playYtIframeAudio(item), 500);
    }
    showToast('🎵 Playing via YT Stream');
  }

  function playAudioUrl(url, item) {
    nativeAudio.style.display = 'none'; // keep hidden, we use our custom UI
    nativeAudio.src = url;
    nativeAudio.play()
      .then(() => { isPlaying = true; updatePlayBtn(); })
      .catch(() => showToast('Tap ▶ to play'));
  }

  /* ══════════════════════════════════════════
     16. VISUALIZER SETUP
  ══════════════════════════════════════════ */
  function setupVisualizer() {
    // Visualizer is already in HTML inside premiumCard
    const viz = document.getElementById('visualizer');
    if (viz) return; // already there
  }

  /* ══════════════════════════════════════════
     17. MEDIA SESSION & TRACK INFO
  ══════════════════════════════════════════ */
  function setTrackInfo(title, sub, thumbUrl) {
    // Update premium now playing card
    if (pnpTitle)  pnpTitle.textContent  = title;
    if (pnpArtist) pnpArtist.textContent = sub;
    if (pnpThumb && thumbUrl) {
      pnpThumb.src = thumbUrl;
      pnpThumb.style.display = 'block';
    }
    if (pnpBgBlur && thumbUrl) {
      pnpBgBlur.style.backgroundImage = `url('${thumbUrl}')`;
    }

    // Update legacy elements (for compatibility)
    if (musicTitle)  musicTitle.textContent  = title;
    if (musicArtist) musicArtist.textContent = sub;

    // Mini handle update
    miniTitle.textContent = title;
    if (miniArtist) miniArtist.textContent = sub;

    // Mini thumb
    if (thumbUrl && miniThumb && miniThumbPlaceholder) {
      miniThumb.src = thumbUrl;
      miniThumb.onload = () => {
        miniThumb.classList.add('visible');
        miniThumbPlaceholder.style.display = 'none';
      };
      miniThumb.onerror = () => {
        miniThumb.classList.remove('visible');
        miniThumbPlaceholder.style.display = 'flex';
      };
    }
  }

  function setupMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   item.title,
      artist:  item.artist || 'ZeroX Hub',
      artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play',           () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.playVideo(); else nativeAudio.play(); });
    navigator.mediaSession.setActionHandler('pause',          () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.pauseVideo(); else nativeAudio.pause(); });
    navigator.mediaSession.setActionHandler('previoustrack',  playPrev);
    navigator.mediaSession.setActionHandler('nexttrack',      playNext);
  }

  /* ══════════════════════════════════════════
     18. PLAYBACK CONTROLS
  ══════════════════════════════════════════ */
  function togglePlayPause() {
    if (activeType === 'stream' || activeType === 'youtube_audio') {
      if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(() => {});
    } else if (activeType === 'youtube' && ytPlayer) {
      if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  }

  function playNext() {
    if (currentIdx < queue.length - 1) {
      playQueueItem(currentIdx + 1);
    } else if (autoPlayEnabled && ytmAutoMode && ytmCurrentQuery) {
      showToast('⏳ Fetching next songs...');
      fetchYtmRelatedBatch(ytmCurrentQuery, ytmCurrentArtist).then(batch => {
        if (batch.length) {
          ytmPendingBatch = batch;
          enqueueYtmBatch();
          setTimeout(() => playQueueItem(currentIdx + 1), 300);
        }
      });
    } else {
      showToast('🎵 End of queue.');
    }
  }

  function playPrev() {
    if (nativeAudio.currentTime > 3) {
      nativeAudio.currentTime = 0; return;
    }
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
    else showToast('First song!');
  }

  mpPlays.forEach(btn => btn.addEventListener('click', togglePlayPause));
  document.getElementById('miniPrev')?.addEventListener('click', playPrev);
  document.getElementById('miniNext')?.addEventListener('click', playNext);

  /* ══════════════════════════════════════════
     19. UPDATE PLAY BUTTON STATE
  ══════════════════════════════════════════ */
  function updatePlayBtn() {
    const icon = isPlaying ? '⏸' : '▶';
    mpPlays.forEach(btn => btn.textContent = icon);
    if (pnpPlay) pnpPlay.textContent = icon;

    const viz = document.getElementById('visualizer');
    const pnpThumbEl = document.getElementById('pnpThumb');
    if (activeType === 'stream' || activeType === 'youtube_audio') {
      if (viz) viz.classList.toggle('playing', isPlaying);
      if (pnpThumbEl) pnpThumbEl.classList.toggle('playing', isPlaying);
    } else {
      if (viz) viz.classList.remove('playing');
      if (pnpThumbEl) pnpThumbEl.classList.remove('playing');
    }
  }

  /* ══════════════════════════════════════════
     20. NATIVE AUDIO EVENTS
  ══════════════════════════════════════════ */
  nativeAudio.addEventListener('play',  () => { isPlaying = true;  updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play',  time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('seeked',() => { if (synced && !isRemoteAction) broadcastSync({ action: 'seek',  time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('ended', handleSongEnd);

  /* ══════════════════════════════════════════
     21. SYNC NETWORK
  ══════════════════════════════════════════ */
  if (mpSyncBtn) mpSyncBtn.addEventListener('click', () => {
    synced = true;
    mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncBtn.style.display = 'none'; mpSyncInfo.style.display = 'flex';
    broadcastSync({ action: 'request_sync' }); showToast('🔗 Sync Network Active');
  });
  if (mpUnsyncBtn) mpUnsyncBtn.addEventListener('click', () => {
    synced = false;
    mpSyncBadge.textContent = '🔴 Solo'; mpSyncBadge.classList.remove('synced');
    mpSyncBtn.style.display = 'block'; mpSyncInfo.style.display = 'none';
  });

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  window._zxReceiveSync = function (data) {
    if (data.action === 'request_sync') {
      const curItem = queue[currentIdx];
      const isBlob  = curItem && curItem.url && curItem.url.startsWith('blob:');
      if (synced && curItem && !isBlob) {
        broadcastSync({ action: 'change_song', item: curItem });
        setTimeout(() => {
          let curTime = 0;
          if      (activeType === 'youtube' && ytPlayer && isYtReady) curTime = ytPlayer.getCurrentTime();
          else if (activeType === 'stream' || activeType === 'youtube_audio') curTime = nativeAudio.currentTime;
          broadcastSync({ action: isPlaying ? 'play' : 'pause', time: curTime });
        }, 1500);
      } return;
    }
    if (!synced) return;
    setRemoteAction();
    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.title === data.item.title);
      if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
      else queue[idx] = data.item;
      currentIdx = idx; renderQueue(); renderMedia(queue[idx]); return;
    }
    if (activeType === 'youtube' && ytPlayer && isYtReady) {
      if (data.action === 'play')  { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek')  { ytPlayer.seekTo(data.time, true); }
    } else if (activeType === 'stream' || activeType === 'youtube_audio') {
      if (data.action === 'play')  { if (Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time; nativeAudio.play().catch(() => {}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek')  { nativeAudio.currentTime = data.time; }
    }
  };

  /* ══════════════════════════════════════════
     22. FULLSCREEN STATE
  ══════════════════════════════════════════ */
  function toggleFullscreenState() {
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    document.body.classList.toggle('is-fullscreen', isFull);
  }
  document.addEventListener('fullscreenchange',       toggleFullscreenState);
  document.addEventListener('webkitfullscreenchange', toggleFullscreenState);

  /* ══════════════════════════════════════════
     23. INIT
  ══════════════════════════════════════════ */
  renderQueue();
  setTrackInfo('ZeroX Hub', 'Your Music, Your Vibe', '');

})();
