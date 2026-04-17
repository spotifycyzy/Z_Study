/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (PRO 4.0 — SMART AUTOPLAY UPGRADE)
   ✅ Smart Mood-Based Autoplay | Instant Pre-fetched Audio
   ✅ YT Music Tab | Spotify Premium UI | Infinite Queue Loop
   ✅ Seek Bar + Controls on All Audio Players
   ✅ No song repeat | Vibe-aware next track intelligence
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── 1. DOM ELEMENTS ─────────────────────────────────── */
  const panel            = document.getElementById('zxPanel');
  const handle           = document.getElementById('zxHandle');
  const closeHandle      = document.getElementById('closeHandle');
  const panelToggleBtn   = document.getElementById('panelToggleBtn');

  const nativeAudio      = document.getElementById('nativeAudio');
  const ytFrameWrap      = document.getElementById('ytFrameWrap');
  const cinemaMode       = document.getElementById('cinemaMode');
  const spotifyMode      = document.getElementById('spotifyMode');
  const vinylRecord      = document.getElementById('vinylRecord');
  const musicTitle       = document.getElementById('musicTitle');
  const musicArtist      = document.getElementById('musicArtist');
  const miniTitle        = document.getElementById('miniTitle');

  const mpPlays          = document.querySelectorAll('.mp-play');
  const mpPrevs          = [document.getElementById('miniPrev')];
  const mpNexts          = [document.getElementById('miniNext')];

  const urlInput         = document.getElementById('urlInput');
  const urlAddBtn        = document.getElementById('urlAddBtn');
  const fileInput        = document.getElementById('fileInput');

  const ytInput          = document.getElementById('ytInput');
  const ytAddBtn         = document.getElementById('ytAddBtn');

  const spInput          = document.getElementById('spInput');
  const spSearchSongBtn  = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const queueList        = document.getElementById('queueList');

  const toggleListBtnUrl = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt  = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt = document.getElementById('episodesOverlayYt');
  const ytSearchResults  = document.getElementById('ytSearchResults');
  const toggleListBtnSp  = document.getElementById('toggleListBtnSp');
  const episodesOverlaySp = document.getElementById('episodesOverlaySp');
  const spSearchResults  = document.getElementById('spSearchResults');

  const mpSyncBadge      = document.getElementById('mpSyncBadge');
  const mpSyncBtn        = document.getElementById('mpSyncBtn');
  const mpSyncInfo       = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn      = document.getElementById('mpUnsyncBtn');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');
  nativeAudio.style.display = 'none';

  /* ── 2. API CONFIG ──────────────────────────────────── */
  const RAPID_API_KEY  = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST      = 'spotify81.p.rapidapi.com';
  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  /* ── 3. STATE ────────────────────────────────────────── */
  let queue              = [];
  let currentIdx         = 0;
  let synced             = false;
  let activeType         = 'none';     // 'youtube' | 'youtube_audio' | 'ytmusic' | 'stream'
  let activeSection      = 'none';     // 'ytmusic' | 'spotify' | 'url' | 'youtube'
  let isPlaying          = false;
  let ytPlayer           = null;
  let isYtReady          = false;
  let isRemoteAction     = false;
  let autoPlayEnabled    = true;
  let remoteTimer        = null;

  // Smart autoplay prefetch cache
  // key: trackTitle => { url, title, artist, thumb, ytId }
  const prefetchCache    = new Map();
  // Played song titles (dedup guard)
  const playedTitles     = new Set();
  // Current vibe context
  let currentVibeQuery   = '';
  let vibeQueue          = [];   // pre-built smart next songs list
  let vibeQueueIndex     = 0;
  let isFetchingVibe     = false;
  // Current playlist context (for playlist autoplay)
  let currentPlaylistItems = []; // array of {title, artist, id, thumb}
  let currentPlaylistIdx   = -1;
  let inPlaylistMode       = false;

  // Progress bar update interval
  let progressInterval   = null;

  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ── 4. PANEL ENGINE ────────────────────────────────── */
  let startY = 0; let isPanelOpen = false;
  function openPanel() {
    if (isPanelOpen) return; isPanelOpen = true;
    panel.classList.add('zx-open'); document.body.style.overflow = 'hidden';
    if (panelToggleBtn) panelToggleBtn.classList.add('active');
  }
  function closePanel() {
    if (!isPanelOpen) return; isPanelOpen = false;
    panel.classList.remove('zx-open'); document.body.style.overflow = '';
    if (panelToggleBtn) panelToggleBtn.classList.remove('active');
  }

  handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
  handle.addEventListener('touchmove',  (e) => { if (!isPanelOpen && (e.touches[0].clientY - startY) > 15) openPanel(); }, { passive: true });
  if (panelToggleBtn) panelToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle.addEventListener('click', (e) => { if (e.target.closest('.mp-btn') || e.target.closest('.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    closeHandle.addEventListener('touchmove',  (e) => { if (isPanelOpen && (startY - e.touches[0].clientY) > 15) closePanel(); }, { passive: true });
    closeHandle.addEventListener('click', closePanel);
  }
  panel.addEventListener('touchmove', (e) => { if (isPanelOpen && !e.target.closest('.music-panel-inner')) e.preventDefault(); }, { passive: false });

  /* ── 5. TABS ──────────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  /* ── 6. TOAST ─────────────────────────────────────── */
  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ── 7. YOUTUBE IFRAME ENGINE ─────────────────────── */
  const ytTag = document.createElement('script');
  ytTag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(ytTag);

  window.onYouTubeIframeAPIReady = function () {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0 },
      events: { onReady: () => { isYtReady = true; }, onStateChange: onPlayerStateChange }
    });
  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: ytPlayer.getCurrentTime() }); }
    else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: ytPlayer.getCurrentTime() }); }
    else if (event.data === YT.PlayerState.ENDED) { handleTrackEnd(); }
  }

  /* ── 8. YOUTUBE SEARCH ──────────────────────────── */
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
        if (!data.items || data.items.length === 0) { resDiv.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }
        data.items.forEach(vid => {
          const div = document.createElement('div'); div.className = 'yt-search-item';
          div.innerHTML = `<img src="${vid.snippet.thumbnails.medium.url}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${vid.snippet.title}</div><div class="yt-search-sub">${vid.snippet.channelTitle}</div></div><span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>`;
          div.onclick = () => {
            queue = []; currentIdx = 0;
            inPlaylistMode = false; currentPlaylistItems = [];
            activeSection = 'youtube';
            addToQueue({ type: mediaType, title: vid.snippet.title, ytId: vid.id.videoId, thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url });
            showToast('🎵 Playing!');
          };
          resDiv.appendChild(div);
        });
      }).catch(() => resDiv.innerHTML = '<p class="mp-empty">Error searching.</p>');
  }

  /* ── Fetch YT Video ID by song name (for audio) ── */
  async function fetchYTVideoId(query) {
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query + ' official audio')}&type=video&key=${YOUTUBE_API_KEY}`);
      const data = await r.json();
      if (data.items && data.items.length > 0) {
        return { id: data.items[0].id.videoId, thumb: data.items[0].snippet.thumbnails.high?.url || data.items[0].snippet.thumbnails.medium.url, title: data.items[0].snippet.title };
      }
    } catch (e) {}
    return null;
  }

  /* ── Extract M4A/Audio from YT video ── */
  async function extractM4AFromYT(ytId) {
    try {
      // Use spotify81 download via yt id approach
      const r = await fetch(`https://${SP81_HOST}/download_track?q=${encodeURIComponent('https://www.youtube.com/watch?v=' + ytId)}&onlyLinks=true`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const result = await r.json();
      return Array.isArray(result) ? (result[0]?.url || result[0]?.link) : (result.url || result.link || result.downloadUrl || null);
    } catch (e) { return null; }
  }

  /* ── Extract audio from spotify track id ── */
  async function fetchPremiumAudio(spId) {
    try {
      const r = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const result = await r.json();
      return Array.isArray(result) ? (result[0]?.url || result[0]?.link) : (result.url || result.link || result.downloadUrl || null);
    } catch (e) { return null; }
  }

  /* ── 9. SMART VIBE AUTOPLAY ENGINE ───────────────── */
  // Generate mood/vibe-aware search queries from a track title+artist
  function buildVibeQueries(title, artist) {
    const lower = (title + ' ' + artist).toLowerCase();
    let tags = [];

    // Genre/mood detection
    if (/lo-?fi|lofi|chill|relax|sleep|rain|study/.test(lower)) tags = ['lofi chill beats', 'relax chill music', 'study lo-fi'];
    else if (/sad|break|heart|alone|cry|tears|missing|lost/.test(lower)) tags = ['sad songs hindi', 'heartbreak songs', 'emotional hindi music'];
    else if (/party|dance|club|edm|bass|drop|rave/.test(lower)) tags = ['party songs hit', 'dance music hits', 'edm party bangers'];
    else if (/love|romance|romantic|ishq|pyaar|mohabbat/.test(lower)) tags = ['romantic hindi songs', 'love songs bollywood', 'romantic music hits'];
    else if (/rap|hip.?hop|trap|drill|bars|cypher/.test(lower)) tags = ['hindi rap songs', 'hip hop hits', 'trap music'];
    else if (/bgm|instrumental|theme|ost|score/.test(lower)) tags = ['best bgm instrumental', 'movie ost music', 'epic background music'];
    else if (/devotional|bhajan|mantra|aarti|shiv|ram|krishna/.test(lower)) tags = ['devotional songs hindi', 'bhajans', 'mantra music'];
    else {
      // Generic: use artist + similar vibes
      if (artist && artist !== 'Unknown') tags = [`songs like ${artist}`, `${artist} hits`, `best of ${artist} type`];
      else tags = [`${title} type songs`, 'top hindi songs 2024', 'best music hits'];
    }
    return tags;
  }

  // Fetch 5 vibe-similar songs via YT search, skip already played
  async function buildVibeQueue(title, artist) {
    if (isFetchingVibe) return;
    isFetchingVibe = true;
    setNextLoadingBadge(true);

    const queries = buildVibeQueries(title, artist);
    const collected = [];
    const seenTitles = new Set(playedTitles);

    for (let qi = 0; qi < queries.length && collected.length < 5; qi++) {
      try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(queries[qi])}&type=video&key=${YOUTUBE_API_KEY}`);
        const data = await r.json();
        if (!data.items) continue;
        for (const vid of data.items) {
          const t = vid.snippet.title;
          const normalized = normalizeTitle(t);
          if (seenTitles.has(normalized)) continue;
          seenTitles.add(normalized);
          collected.push({
            ytId: vid.id.videoId,
            title: t,
            artist: vid.snippet.channelTitle,
            thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url,
            audioUrl: null // will be prefetched
          });
          if (collected.length >= 5) break;
        }
      } catch (e) {}
    }

    vibeQueue = collected;
    vibeQueueIndex = 0;
    isFetchingVibe = false;
    setNextLoadingBadge(false);

    // Start prefetching audio for all 5
    prefetchVibeQueue();
  }

  function normalizeTitle(title) {
    return title.toLowerCase()
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/official|audio|video|lyrics|hd|4k|ft\.|feat\.|\|/gi, '')
      .replace(/\s+/g, ' ').trim();
  }

  async function prefetchVibeQueue() {
    for (let i = 0; i < vibeQueue.length; i++) {
      const song = vibeQueue[i];
      if (song.audioUrl) continue;
      try {
        // Try extracting audio via SP81 from YT link
        const url = await extractM4AFromYT(song.ytId);
        if (url) {
          song.audioUrl = url;
          prefetchCache.set(song.ytId, url);
        }
      } catch (e) {}
    }
  }

  function setNextLoadingBadge(visible) {
    const badge = document.getElementById('nextLoadingBadge');
    if (!badge) return;
    badge.classList.toggle('visible', visible);
  }

  // Get next song from vibe queue (auto skips dupes)
  async function getNextVibeSong() {
    while (vibeQueueIndex < vibeQueue.length) {
      const song = vibeQueue[vibeQueueIndex++];
      const normalized = normalizeTitle(song.title);
      if (playedTitles.has(normalized)) continue;
      playedTitles.add(normalized);
      return song;
    }
    return null;
  }

  /* ── 10. PLAYLIST CONTEXT HELPERS ────────────────── */
  function setPlaylistContext(items, startIdx) {
    currentPlaylistItems = items;
    currentPlaylistIdx = startIdx;
    inPlaylistMode = true;
  }

  async function playNextPlaylistTrack() {
    currentPlaylistIdx++;
    if (currentPlaylistIdx < currentPlaylistItems.length) {
      const track = currentPlaylistItems[currentPlaylistIdx];
      // Play as spotify/ytmusic audio
      await playSongByMeta(track, activeSection);
      return true;
    }
    // Playlist ended — fall through to vibe queue
    inPlaylistMode = false;
    return false;
  }

  /* ── 11. HANDLE TRACK END (SMART AUTOPLAY) ───────── */
  async function handleTrackEnd() {
    if (!autoPlayEnabled) { isPlaying = false; updatePlayBtn(); return; }

    // 1. If in a queue, try next queue item
    if (currentIdx < queue.length - 1) { playQueueItem(currentIdx + 1); return; }

    // 2. If in playlist mode, try next playlist track
    if (inPlaylistMode && currentPlaylistItems.length > 0) {
      const played = await playNextPlaylistTrack();
      if (played) return;
    }

    // 3. Use vibe queue (pre-fetched smart songs)
    const nextSong = await getNextVibeSong();
    if (nextSong) {
      showToast(`🎵 Vibe: ${nextSong.title.substring(0, 30)}...`);
      playedTitles.add(normalizeTitle(nextSong.title));
      const item = {
        type: activeSection === 'spotify' ? 'youtube_audio' : 'ytmusic',
        title: nextSong.title,
        artist: nextSong.artist,
        thumb: nextSong.thumb,
        ytId: nextSong.ytId,
        audioUrl: nextSong.audioUrl || null,
        isVibePick: true
      };
      queue.push(item); currentIdx = queue.length - 1; renderQueue();
      renderMedia(item);

      // Refetch vibe queue if running low
      if (vibeQueueIndex >= vibeQueue.length - 2) {
        buildVibeQueue(item.title, item.artist);
      }
      return;
    }

    // 4. Rebuild vibe queue and try again
    if (queue[currentIdx]) {
      await buildVibeQueue(queue[currentIdx].title, queue[currentIdx].artist || '');
      const song = await getNextVibeSong();
      if (song) {
        const item = { type: activeSection === 'spotify' ? 'youtube_audio' : 'ytmusic', title: song.title, artist: song.artist, thumb: song.thumb, ytId: song.ytId, audioUrl: song.audioUrl || null };
        queue.push(item); currentIdx = queue.length - 1; renderQueue();
        renderMedia(item);
      }
    }
  }

  /* ── 12. YT MUSIC TAB ENGINE ────────────────────── */
  const ytmInput  = document.getElementById('ytmInput');
  const ytmPlayBtn = document.getElementById('ytmPlayBtn');

  if (ytmPlayBtn) {
    ytmPlayBtn.onclick = async () => {
      const q = ytmInput ? ytmInput.value.trim() : '';
      if (!q) return;
      ytmInput.value = '';
      showToast('🎵 Finding track...');
      activeSection = 'ytmusic';
      inPlaylistMode = false; currentPlaylistItems = [];
      const info = await fetchYTVideoId(q);
      if (!info) { showToast('❌ Not found'); return; }

      const item = { type: 'ytmusic', title: info.title, artist: 'YouTube Music', thumb: info.thumb, ytId: info.id, audioUrl: null };
      queue = []; currentIdx = 0;
      playedTitles.clear();
      playedTitles.add(normalizeTitle(info.title));
      queue.push(item); renderQueue();
      renderMedia(item);
      buildVibeQueue(info.title, '');
    };
  }
  if (ytmInput) ytmInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytmPlayBtn && ytmPlayBtn.click(); });

  /* ── 13. URL / LOCAL FILE / STANDARD YT ─────────── */
  if (ytAddBtn) ytAddBtn.onclick = () => {
    const val = ytInput.value.trim();
    if (isYouTubeUrl(val)) { loadYouTube(val); ytInput.value = ''; return; }
    searchYouTube(val, 'ytSearchResults', 'youtube'); ytInput.value = '';
  };
  if (ytInput) ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });

  if (urlInput) urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlAddBtn.click(); });
  if (urlAddBtn) urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; }
    else if (val.startsWith('http')) {
      queue = []; currentIdx = 0; activeSection = 'url';
      inPlaylistMode = false;
      addToQueue({ type: 'stream', title: 'Cloud Media', url: val });
      urlInput.value = '';
    }
  });

  if (fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    queue = []; currentIdx = 0; activeSection = 'url';
    inPlaylistMode = false;
    addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function loadYouTube(url) {
    const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    queue = []; currentIdx = 0; activeSection = 'youtube';
    addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id });
  }

  /* ── 14. SPOTIFY ENGINE ─────────────────────────── */
  async function searchSpotifyAlt(query, targetResultsDiv) {
    if (!query) return;
    const divId = targetResultsDiv || 'spSearchResults';
    const resDiv = document.getElementById(divId);
    if (!resDiv) return;

    resDiv.innerHTML = '<p class="mp-empty">⏳ Loading results...</p>';
    if (episodesOverlaySp) episodesOverlaySp.classList.remove('hidden');

    try {
      const url = "https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall?market=IN&country=IN";
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "x-rapidapi-key": RAPID_API_KEY,
          "x-rapidapi-host": "spotify-web-api3.p.rapidapi.com",
          "Content-Type": "application/json",
          "Accept-Language": "en-IN,en;q=0.9,hi-IN;q=0.8,hi;q=0.7"
        },
        body: JSON.stringify({ terms: query, limit: 15, country: "IN", market: "IN" })
      });
      const responseData = await r.json();
      const searchData = responseData?.data?.searchV2 || responseData;
      let rawItems = [];
      (searchData?.topResults?.items || searchData?.topResultsV2?.itemsV2 || []).forEach(item => rawItems.push({ ...item, isExactTopResult: true }));
      (searchData?.tracksV2?.items || searchData?.tracks?.items || []).forEach(item => rawItems.push(item));
      (searchData?.playlistsV2?.items || searchData?.playlists?.items || []).forEach(item => rawItems.push(item));
      (searchData?.albumsV2?.items || searchData?.albums?.items || []).forEach(item => rawItems.push(item));

      if (rawItems.length === 0) { resDiv.innerHTML = '<p class="mp-empty">❌ No results.</p>'; return; }

      const seenUris = new Set(); let cleanItems = [];
      rawItems.forEach((wrapper) => {
        const item = wrapper?.item?.data || wrapper?.data || wrapper;
        if (!item || !item.uri || seenUris.has(item.uri)) return;
        seenUris.add(item.uri);
        const uriParts = item.uri.split(':');
        const itemType = uriParts[1]; const itemId = item.id || uriParts[2];
        const titleName = item.name || item.profile?.name || 'Unknown';
        let artistName = 'Unknown';
        if (item.artists?.items?.[0]?.profile?.name) artistName = item.artists.items[0].profile.name;
        else if (item.ownerV2?.data?.name) artistName = item.ownerV2.data.name;
        else if (itemType === 'artist') artistName = "Artist Profile";
        let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
        if (item.albumOfTrack?.coverArt?.sources?.[0]?.url) thumb = item.albumOfTrack.coverArt.sources[0].url;
        else if (item.coverArt?.sources?.[0]?.url) thumb = item.coverArt.sources[0].url;
        else if (item.images?.items?.[0]?.sources?.[0]?.url) thumb = item.images.items[0].sources[0].url;
        else if (item.visuals?.avatarImage?.sources?.[0]?.url) thumb = item.visuals.avatarImage.sources[0].url;
        cleanItems.push({ titleName, artistName, itemType, itemId, thumb, isExactTopResult: wrapper.isExactTopResult });
      });

      const lowerQuery = query.toLowerCase();
      cleanItems.sort((a, b) => {
        const aTitle = a.titleName.toLowerCase(), bTitle = b.titleName.toLowerCase();
        if (aTitle === lowerQuery && bTitle !== lowerQuery) return -1;
        if (bTitle === lowerQuery && aTitle !== lowerQuery) return 1;
        const aContains = aTitle.includes(lowerQuery), bContains = bTitle.includes(lowerQuery);
        if (aContains && !bContains) return -1; if (bContains && !aContains) return 1;
        if (a.isExactTopResult && !b.isExactTopResult) return -1;
        if (b.isExactTopResult && !a.isExactTopResult) return 1;
        return 0;
      });

      renderSpotifyUI(cleanItems, resDiv, lowerQuery);
    } catch (e) { console.error(e); resDiv.innerHTML = '<p class="mp-empty">🚨 API Error!</p>'; }
  }

  function renderSpotifyUI(cleanItems, resDiv, lowerQuery = "") {
    resDiv.innerHTML = '';
    cleanItems.forEach((data, index) => {
      const typeLabel = data.itemType === 'track' ? "" : `<span class="type-pill">${data.itemType.toUpperCase()}</span>`;
      const imgRadius = data.itemType === 'artist' ? '50%' : '4px';
      const isTopRender = index === 0 && lowerQuery && data.titleName.toLowerCase().includes(lowerQuery.split(' ')[0]);
      const topBadge = (data.isExactTopResult || isTopRender) ? `<div class="best-match-badge">🏆 BEST MATCH</div>` : "";

      const div = document.createElement('div'); div.className = 'yt-search-item';
      div.innerHTML = `
        <img src="${data.thumb}" class="yt-search-thumb" style="border-radius:${imgRadius};"/>
        <div class="yt-search-info">
          ${topBadge}
          <div class="yt-search-title">${data.titleName}${typeLabel}</div>
          <div class="yt-search-sub">${data.artistName}</div>
        </div>
        <span style="font-size:18px;padding:0 4px;color:#1db954">${data.itemType === 'track' ? '▶' : '📂'}</span>`;

      div.onclick = async () => {
        if (data.itemType === 'playlist') {
          showToast('📂 Loading Playlist...');
          const tracks = await fetchPlaylistTracks(data.itemId);
          if (tracks.length === 0) { showToast('⚠️ Empty playlist'); return; }
          // Play first track, set rest as playlist context
          const firstTrack = tracks[0];
          activeSection = 'spotify';
          inPlaylistMode = false; currentPlaylistItems = [];
          queue = []; currentIdx = 0; playedTitles.clear();
          playedTitles.add(normalizeTitle(firstTrack.title));
          setPlaylistContext(tracks, 0);
          const item = { type: 'youtube_audio', title: firstTrack.title, artist: firstTrack.artist, thumb: firstTrack.image || 'https://i.imgur.com/8Q5FqWj.jpeg', spId: firstTrack.id };
          queue.push(item); renderQueue(); renderMedia(item);
          // Prefetch next from playlist
          prefetchPlaylistAhead(tracks, 1);
          buildVibeQueue(firstTrack.title, firstTrack.artist);
        } else if (data.itemType === 'album') {
          showToast('📂 Loading Album...');
          const tracks = await fetchAlbumTracks(data.itemId);
          if (tracks.length === 0) { showToast('⚠️ Empty album'); return; }
          const firstTrack = tracks[0];
          activeSection = 'spotify';
          inPlaylistMode = false; currentPlaylistItems = [];
          queue = []; currentIdx = 0; playedTitles.clear();
          playedTitles.add(normalizeTitle(firstTrack.title));
          setPlaylistContext(tracks, 0);
          const item = { type: 'youtube_audio', title: firstTrack.title, artist: firstTrack.artist, thumb: firstTrack.image || 'https://i.imgur.com/8Q5FqWj.jpeg', spId: firstTrack.id };
          queue.push(item); renderQueue(); renderMedia(item);
          prefetchPlaylistAhead(tracks, 1);
          buildVibeQueue(firstTrack.title, firstTrack.artist);
        } else if (data.itemType === 'artist') {
          showToast('👤 Artist profiles cannot be played directly.');
        } else {
          // Single track
          activeSection = 'spotify';
          inPlaylistMode = false; currentPlaylistItems = [];
          queue = []; currentIdx = 0; playedTitles.clear();
          playedTitles.add(normalizeTitle(data.titleName));
          const item = { type: 'youtube_audio', title: data.titleName, artist: data.artistName, spId: data.itemId, thumb: data.thumb };
          queue.push(item); renderQueue(); renderMedia(item);
          buildVibeQueue(data.titleName, data.artistName);
          showToast('🎵 Playing!');
        }
      };
      resDiv.appendChild(div);
    });
  }

  // Prefetch audio for upcoming playlist tracks in background
  async function prefetchPlaylistAhead(tracks, startIdx) {
    for (let i = startIdx; i < Math.min(startIdx + 3, tracks.length); i++) {
      const track = tracks[i];
      if (prefetchCache.has(track.id)) continue;
      try {
        const url = await fetchPremiumAudio(track.id);
        if (url) prefetchCache.set(track.id, url);
      } catch (e) {}
    }
  }

  async function fetchPlaylistTracks(playlistId) {
    try {
      const r = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${playlistId}&offset=0&limit=100&market=IN`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const data = await r.json();
      return (data.items || []).filter(i => i.track && !i.track.is_local).map(i => ({
        id: i.track.id, title: i.track.name, artist: i.track.artists[0]?.name || 'Unknown', image: i.track.album?.images[0]?.url || ''
      }));
    } catch (e) { return []; }
  }

  async function fetchAlbumTracks(albumId) {
    try {
      const r = await fetch(`https://${SP81_HOST}/album_tracks?id=${albumId}&market=IN`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const data = await r.json();
      const albumImg = (data.album?.images) ? data.album.images[0].url : '';
      return (data.album?.tracks?.items || []).map(i => ({
        id: i.id, title: i.name, artist: i.artists[0]?.name || 'Unknown', image: albumImg
      }));
    } catch (e) { return []; }
  }

  /* ── Play song by metadata object ── */
  async function playSongByMeta(track, section) {
    const item = {
      type: section === 'spotify' ? 'youtube_audio' : 'ytmusic',
      title: track.title, artist: track.artist,
      thumb: track.image || track.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg',
      spId: track.id || null, ytId: track.ytId || null, audioUrl: null
    };
    queue.push(item); currentIdx = queue.length - 1; renderQueue();
    renderMedia(item);
  }

  /* ── 15. QUEUE & CORE RENDERER ENGINE ───────────── */
  function addToQueue(item) { queue.push(item); renderQueue(); playQueueItem(queue.length - 1); }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; updateQueueTabBadge(0); return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      const icon = item.type === 'youtube_audio' ? '🎧' : item.type === 'ytmusic' ? '🎵' : item.type === 'stream' ? '☁️' : '🎬';
      const isVibe = item.isVibePick ? ' <span style="font-size:9px;background:rgba(232,67,106,0.3);border-radius:4px;padding:1px 4px;">vibe</span>' : '';
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}${isVibe}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); if (currentIdx >= i && currentIdx > 0) currentIdx--; renderQueue(); return; } playQueueItem(i); };
      queueList.appendChild(el);
    });
    updateQueueTabBadge(queue.length);
  }

  function updateQueueTabBadge(n) {
    const badge = document.getElementById('queueTabBadge');
    if (badge) { badge.textContent = n > 0 ? n : ''; badge.style.display = n > 0 ? 'inline-flex' : 'none'; }
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i; renderQueue();
    const item = queue[i];
    const isBlob = item.url && item.url.startsWith('blob:');
    if (synced && !isRemoteAction && !isBlob) broadcastSync({ action: 'change_song', item });
    renderMedia(item);
  }

  /* ── 16. CORE RENDER MEDIA ──────────────────────── */
  function renderMedia(item) {
    // Reset audio
    nativeAudio.style.display = 'none';
    ytFrameWrap.style.display = 'none';
    nativeAudio.pause();
    nativeAudio.removeAttribute('src');
    nativeAudio.srcObject = null;
    if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    isPlaying = false; updatePlayBtn();
    clearProgressInterval();

    if (item.type === 'youtube') {
      // Cinema mode
      activeType = 'youtube';
      showCinemaMode();
      ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => renderMedia(item), 500);
      setTrackInfo(item.title, 'YouTube Cinema');
      setupMediaSession(item);
      updatePremiumPlayerUI(item);

    } else if (item.type === 'youtube_audio') {
      // Spotify section — YT audio but shown on Spotify UI
      activeType = 'youtube_audio';
      showAudioMode('spotify', item);
      setTrackInfo(item.title, 'Fetching audio...');

      // Check prefetch cache first (for playlist prefetch)
      if (item.spId && prefetchCache.has(item.spId)) {
        const cachedUrl = prefetchCache.get(item.spId);
        playAudioUrl(cachedUrl, item);
      } else {
        fetchPremiumAudio(item.spId).then(audioLink => {
          if (audioLink) {
            if (item.spId) prefetchCache.set(item.spId, audioLink);
            playAudioUrl(audioLink, item);
          } else {
            // Fallback: search YT audio
            fetchYTVideoId(item.title + ' ' + (item.artist || '')).then(info => {
              if (info) {
                extractM4AFromYT(info.id).then(ytUrl => {
                  if (ytUrl) { prefetchCache.set(info.id, ytUrl); playAudioUrl(ytUrl, item); }
                  else { setTrackInfo(item.title, 'Audio unavailable'); showToast('❌ Audio fetch failed'); setTimeout(handleTrackEnd, 2000); }
                });
              } else { setTrackInfo(item.title, 'Audio unavailable'); setTimeout(handleTrackEnd, 2000); }
            });
          }
        });
      }
      buildVibeQueue(item.title, item.artist || '');

    } else if (item.type === 'ytmusic') {
      // YT Music section audio
      activeType = 'ytmusic';
      showAudioMode('ytmusic', item);
      setTrackInfo(item.title, 'Loading...');

      // Check cache
      if (item.ytId && prefetchCache.has(item.ytId)) {
        playAudioUrl(prefetchCache.get(item.ytId), item);
      } else if (item.audioUrl) {
        playAudioUrl(item.audioUrl, item);
      } else if (item.ytId) {
        extractM4AFromYT(item.ytId).then(url => {
          if (url) { prefetchCache.set(item.ytId, url); playAudioUrl(url, item); }
          else {
            // Fallback: fetch fresh YT search
            fetchYTVideoId(item.title).then(info => {
              if (info) {
                extractM4AFromYT(info.id).then(u2 => {
                  if (u2) { prefetchCache.set(info.id, u2); playAudioUrl(u2, item); }
                  else { setTrackInfo(item.title, 'Audio unavailable'); setTimeout(handleTrackEnd, 2000); }
                });
              }
            });
          }
        });
      }
      buildVibeQueue(item.title, item.artist || '');

    } else if (item.type === 'stream') {
      activeType = 'stream';
      showAudioMode('url', item);
      setupMediaSession(item);
      nativeAudio.src = item.url;
      nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); startProgressInterval(); }).catch(() => showToast("Tap ▶ to play"));
      setTrackInfo(item.title, '☁️ Cloud Audio');
      updatePremiumPlayerUI(item);
    }

    // Switch to the correct tab
    if (item.type === 'youtube_audio') switchToTabSilently('spotify');
    else if (item.type === 'ytmusic') switchToTabSilently('ytmusic');
  }

  function switchToTabSilently(tabKey) {
    const tab = document.querySelector(`.mp-tab[data-tab="${tabKey}"]`);
    const content = document.getElementById(`tab-${tabKey}`);
    if (!tab || !content) return;
    document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    content.classList.add('active');
  }

  function playAudioUrl(url, item) {
    nativeAudio.src = url;
    nativeAudio.play()
      .then(() => { isPlaying = true; updatePlayBtn(); startProgressInterval(); setTrackInfo(item.title, item.artist || 'ZeroX Audio'); })
      .catch(() => showToast("Tap ▶ to play"));
    setupMediaSession(item);
    updatePremiumPlayerUI(item);
  }

  function showCinemaMode() {
    cinemaMode.classList.remove('hidden'); spotifyMode.classList.add('hidden');
  }

  function showAudioMode(section, item) {
    cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
    updatePremiumPlayerUI(item);
  }

  function updatePremiumPlayerUI(item) {
    // Update artwork in all premium player sections
    const thumbs = document.querySelectorAll('.premium-thumb');
    thumbs.forEach(img => { img.src = item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg'; });

    // Update vinyl record fallback
    if (vinylRecord) {
      vinylRecord.style.backgroundImage = `url('${item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg'}')`;
      vinylRecord.style.backgroundSize = 'cover';
      vinylRecord.style.backgroundPosition = 'center';
    }

    // Update song name/artist in premium UI
    document.querySelectorAll('.player-song-title').forEach(el => { el.textContent = item.title || 'Unknown'; });
    document.querySelectorAll('.player-song-artist').forEach(el => { el.textContent = item.artist || 'ZeroX Hub'; });

    // Source badge
    const srcLabel = item.type === 'youtube_audio' ? '🎵 via ZeroX Audio' : item.type === 'ytmusic' ? '▶ YT Music' : item.type === 'stream' ? '☁️ Cloud' : '🎬 YouTube';
    document.querySelectorAll('.player-source-badge').forEach(el => { el.innerHTML = srcLabel; });
  }

  function setupMediaSession(item) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title, artist: item.artist || 'ZeroX Hub',
        artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play',  () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.playVideo(); else nativeAudio.play(); });
      navigator.mediaSession.setActionHandler('pause', () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.pauseVideo(); else nativeAudio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
  }

  /* ── 17. PROGRESS BAR ENGINE ─────────────────────── */
  function startProgressInterval() {
    clearProgressInterval();
    progressInterval = setInterval(updateProgressBars, 500);
  }
  function clearProgressInterval() {
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  }
  function updateProgressBars() {
    const current = nativeAudio.currentTime || 0;
    const duration = nativeAudio.duration || 0;
    const pct = duration > 0 ? (current / duration) * 100 : 0;

    document.querySelectorAll('.player-progress-fill').forEach(fill => {
      fill.style.width = pct + '%';
    });
    document.querySelectorAll('.player-progress-range').forEach(range => {
      range.value = pct;
    });
    document.querySelectorAll('.player-time-current').forEach(el => { el.textContent = formatTime(current); });
    document.querySelectorAll('.player-time-total').forEach(el => { el.textContent = formatTime(duration); });
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // Seek handler
  document.querySelectorAll('.player-progress-range').forEach(range => {
    range.addEventListener('input', () => {
      const pct = parseFloat(range.value) / 100;
      if (nativeAudio.duration) {
        nativeAudio.currentTime = pct * nativeAudio.duration;
      }
    });
  });

  /* ── 18. CONTROLS ───────────────────────────────── */
  function playNext() {
    if (currentIdx < queue.length - 1) { playQueueItem(currentIdx + 1); return; }
    handleTrackEnd();
  }
  function playPrev() {
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
    else if (nativeAudio.currentTime > 3) { nativeAudio.currentTime = 0; }
    else showToast('First song!');
  }

  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

  mpPlays.forEach(btn => btn.addEventListener('click', () => {
    if (activeType === 'stream' || activeType === 'youtube_audio' || activeType === 'ytmusic') {
      if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(() => {});
    } else if (activeType === 'youtube' && ytPlayer) {
      if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  }));

  // Premium player control buttons (in spotifyMode sections)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.ctrl-btn-play')) {
      if (activeType === 'stream' || activeType === 'youtube_audio' || activeType === 'ytmusic') {
        if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(() => {});
      } else if (activeType === 'youtube' && ytPlayer) {
        if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
      }
    }
    if (e.target.closest('.ctrl-btn-next')) playNext();
    if (e.target.closest('.ctrl-btn-prev')) playPrev();
  });

  function updatePlayBtn() {
    mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶');
    
    // Update premium play buttons
    document.querySelectorAll('.ctrl-btn-main').forEach(btn => {
      btn.textContent = isPlaying ? '⏸' : '▶';
      btn.classList.toggle('playing', isPlaying);
    });

    // Ambient glow
    document.querySelectorAll('.player-ambient').forEach(el => el.classList.toggle('playing', isPlaying));

    // Artwork pulse
    document.querySelectorAll('.premium-thumb').forEach(img => img.classList.toggle('playing', isPlaying));
    document.querySelectorAll('.artwork-ring').forEach(ring => ring.classList.toggle('playing', isPlaying));

    // Visualizer
    document.querySelectorAll('.music-visualizer').forEach(viz => viz.classList.toggle('playing', isPlaying));

    // Legacy vinyl
    if (isPlaying && (activeType === 'stream' || activeType === 'youtube_audio' || activeType === 'ytmusic')) {
      if (vinylRecord) vinylRecord.classList.add('playing');
    } else { if (vinylRecord) vinylRecord.classList.remove('playing'); }
  }

  function setTrackInfo(title, sub) {
    if (musicTitle) musicTitle.textContent = title;
    if (musicArtist) musicArtist.textContent = sub;
    miniTitle.textContent = `${title} • ${sub}`;
  }

  /* ── 19. NATIVE AUDIO EVENTS ─────────────────────── */
  nativeAudio.addEventListener('play',  () => { isPlaying = true; updatePlayBtn(); startProgressInterval(); if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('seeked',() => { if (synced && !isRemoteAction) broadcastSync({ action: 'seek', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('ended', handleTrackEnd);
  nativeAudio.addEventListener('loadedmetadata', updateProgressBars);
  nativeAudio.addEventListener('error', () => { showToast('⚠️ Audio error, skipping...'); setTimeout(handleTrackEnd, 1500); });

  /* ── 20. AUTOPLAY TOGGLE ─────────────────────────── */
  // Wire up ALL autoplay toggle buttons (one per section)
  function syncAutoplayBtns() {
    document.querySelectorAll('.autoplay-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', autoPlayEnabled);
      btn.querySelector('.ap-label').textContent = autoPlayEnabled ? 'Autoplay ON' : 'Autoplay OFF';
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.autoplay-toggle-btn')) {
      autoPlayEnabled = !autoPlayEnabled;
      syncAutoplayBtns();
      showToast(autoPlayEnabled ? '✨ Autoplay: ON' : '🌑 Autoplay: OFF');
    }
  });

  // Legacy autoplay btn
  const autoPlayBtn = document.getElementById('autoPlayToggle');
  if (autoPlayBtn) {
    if (autoPlayEnabled) autoPlayBtn.classList.add('active');
    autoPlayBtn.onclick = () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayBtn.classList.toggle('active', autoPlayEnabled);
      syncAutoplayBtns();
      showToast(autoPlayEnabled ? '✨ Autoplay: ON' : '🌑 Autoplay: OFF');
    };
  }

  /* ── 21. SYNC NETWORK ──────────────────────────── */
  if (mpSyncBtn) mpSyncBtn.addEventListener('click', () => {
    synced = true;
    mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncBtn.style.display = 'none'; mpSyncInfo.style.display = 'flex';
    broadcastSync({ action: 'request_sync' }); showToast('🔗 Sync Active');
  });
  if (mpUnsyncBtn) mpUnsyncBtn.addEventListener('click', () => {
    synced = false;
    mpSyncBadge.textContent = '🔴 Solo'; mpSyncBadge.classList.remove('synced');
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
          else if (['stream', 'youtube_audio', 'ytmusic'].includes(activeType)) curTime = nativeAudio.currentTime;
          broadcastSync({ action: isPlaying ? 'play' : 'pause', time: curTime });
        }, 1500);
      } return;
    }
    if (!synced) return; setRemoteAction();
    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.title === data.item.title);
      if (idx === -1) { queue.push(data.item); idx = queue.length - 1; } else { queue[idx] = data.item; }
      currentIdx = idx; renderQueue(); renderMedia(queue[idx]); return;
    }
    if (activeType === 'youtube' && ytPlayer && isYtReady) {
      if (data.action === 'play')  { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek')  { ytPlayer.seekTo(data.time, true); }
    } else if (['stream', 'youtube_audio', 'ytmusic'].includes(activeType)) {
      if (data.action === 'play')  { if (Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time; nativeAudio.play().catch(() => {}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek')  { nativeAudio.currentTime = data.time; }
    }
  };

  /* ── 22. SPOTIFY EVENT LISTENERS ──────────────── */
  if (toggleListBtnUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl.classList.toggle('hidden'));
  if (toggleListBtnYt)  toggleListBtnYt.addEventListener('click',  () => episodesOverlayYt.classList.toggle('hidden'));
  if (toggleListBtnSp)  toggleListBtnSp.addEventListener('click',  () => episodesOverlaySp.classList.toggle('hidden'));

  if (spInput) spInput.addEventListener('keydown', e => { if (e.key === 'Enter' && spSearchSongBtn) spSearchSongBtn.click(); });
  if (spSearchSongBtn) spSearchSongBtn.onclick = () => { searchSpotifyAlt(spInput.value.trim(), 'spSearchResults'); spInput.value = ''; };
  if (spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = async () => {
    const id = spInput.value.trim(); if (!id) return;
    showToast('📂 Fetching Playlist...');
    const tracks = await fetchPlaylistTracks(id);
    renderSpotifyUI(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image })), spSearchResults, "");
    spInput.value = '';
  };

  /* ── 23. FULLSCREEN ──────────────────────────── */
  function toggleFullscreenState() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
      document.body.classList.add('is-fullscreen');
    } else { document.body.classList.remove('is-fullscreen'); }
  }
  document.addEventListener('fullscreenchange', toggleFullscreenState);
  document.addEventListener('webkitfullscreenchange', toggleFullscreenState);

  /* ── INIT ──────────────────────────────────────── */
  renderQueue();
  syncAutoplayBtns();

})();
