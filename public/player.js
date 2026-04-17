/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (UPGRADED PRO BUILD)
   ✅ Smart Prefetch + Instant Next Play
   ✅ Infinite Auto-Play with Mood/Vibe Matching
   ✅ YT Music Tab + Spotify Tab — separate UIs, same audio engine
   ✅ All original features 100% preserved
   ✅ Single Sync Toggle Button
   ✅ No duplicate variables, bracket-safe
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

  const cinemaMode        = document.getElementById('cinemaMode');
  const spotifyMode       = document.getElementById('spotifyMode');
  const premiumMusicCard  = document.getElementById('premiumMusicCard');
  const pmcBgBlur         = document.getElementById('pmcBgBlur');
  const pmcArtwork        = document.getElementById('pmcArtwork');
  const pmcGlow           = document.getElementById('pmcGlow');
  const pmcTitle          = document.getElementById('pmcTitle');
  const pmcArtist         = document.getElementById('pmcArtist');
  const pmcSourceBadge    = document.getElementById('pmcSourceBadge');
  const pmcCurrentTime    = document.getElementById('pmcCurrentTime');
  const pmcDuration       = document.getElementById('pmcDuration');
  const pmcProgressFill   = document.getElementById('pmcProgressFill');
  const pmcProgressBar    = document.getElementById('pmcProgressBar');
  const pmcPlayMain       = document.getElementById('pmcPlayMain');
  const pmcPrev           = document.getElementById('pmcPrev');
  const pmcNext           = document.getElementById('pmcNext');

  const vinylRecord    = document.getElementById('vinylRecord');
  const musicTitle     = document.getElementById('musicTitle');
  const musicArtist    = document.getElementById('musicArtist');
  const miniTitle      = document.getElementById('miniTitle');

  const mpPlays  = document.querySelectorAll('.mp-play');
  const mpPrevs  = [document.getElementById('miniPrev')];
  const mpNexts  = [document.getElementById('miniNext')];

  const urlInput      = document.getElementById('urlInput');
  const urlAddBtn     = document.getElementById('urlAddBtn');
  const fileInput     = document.getElementById('fileInput');

  const ytInput       = document.getElementById('ytInput');
  const ytAddBtn      = document.getElementById('ytAddBtn');

  const ytmInput      = document.getElementById('ytmInput');
  const ytmSearchBtn  = document.getElementById('ytmSearchBtn');
  const ytmResultsArea = document.getElementById('ytmSearchResults');

  const spInput            = document.getElementById('spInput');
  const spSearchSongBtn    = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn= document.getElementById('spSearchPlaylistBtn');
  const spResultsArea      = document.getElementById('spSearchResults');

  const queueList          = document.getElementById('queueList');

  const toggleListBtnUrl   = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt    = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt  = document.getElementById('episodesOverlayYt');
  const ytSearchResults    = document.getElementById('ytSearchResults');

  const mpSyncBadge       = document.getElementById('mpSyncBadge');
  const mpSyncToggleBtn   = document.getElementById('mpSyncToggleBtn');
  const autoPlayToggleBtn = document.getElementById('autoPlayToggle');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ══════════════════════════════════════════
     2. API CONFIG
  ══════════════════════════════════════════ */
  const RAPID_API_KEY = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST     = 'spotify81.p.rapidapi.com';
  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  /* ══════════════════════════════════════════
     3. STATE
  ══════════════════════════════════════════ */
  let queue         = [];
  let currentIdx    = 0;
  let synced        = false;
  let activeType    = 'none';   // 'youtube' | 'youtube_audio' | 'stream' | 'ytmusic'
  let activeSrcTab  = 'none';   // 'ytmusic' | 'spotify' — which tab launched the song
  let isPlaying     = false;
  let ytPlayer      = null;
  let isYtReady     = false;
  let isRemoteAction = false;
  let autoPlayEnabled = true;
  let remoteTimer   = null;

  // Prefetch cache: Map<songKey, { url, title, artist, thumb, ytId }>
  const prefetchCache = new Map();
  // Played song keys to avoid repeats
  const playedKeys = new Set();
  // Current seed for auto-play (title + artist of what's playing)
  let autoPlaySeed = null;
  let autoPlayFetching = false;

  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ══════════════════════════════════════════
     4. AUTO-PLAY TOGGLE
  ══════════════════════════════════════════ */
  if (autoPlayToggleBtn) {
    autoPlayToggleBtn.classList.add('active');
    autoPlayToggleBtn.addEventListener('click', () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayToggleBtn.classList.toggle('active', autoPlayEnabled);
      showToast(autoPlayEnabled ? '∞ Auto-play ON' : '⏹ Auto-play OFF');
    });
  }

  /* ══════════════════════════════════════════
     5. PANEL UI ENGINE
  ══════════════════════════════════════════ */
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

  /* Tabs */
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

  /* Episode list toggles */
  if (toggleListBtnUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl.classList.toggle('hidden'));
  if (toggleListBtnYt)  toggleListBtnYt.addEventListener('click',  () => episodesOverlayYt.classList.toggle('hidden'));

  /* ══════════════════════════════════════════
     6. SYNC — Single Toggle Button
  ══════════════════════════════════════════ */
  if (mpSyncToggleBtn) {
    mpSyncToggleBtn.addEventListener('click', () => {
      if (!synced) {
        synced = true;
        mpSyncBadge.textContent = '🟢 Synced';
        mpSyncBadge.classList.add('synced');
        mpSyncToggleBtn.textContent = 'Synced ✓';
        mpSyncToggleBtn.classList.add('synced');
        broadcastSync({ action: 'request_sync' });
        showToast('🔗 Sync Network Active');
      } else {
        synced = false;
        mpSyncBadge.textContent = '🔴 Solo';
        mpSyncBadge.classList.remove('synced');
        mpSyncToggleBtn.textContent = 'Sync 🔗';
        mpSyncToggleBtn.classList.remove('synced');
        showToast('🔌 Sync Disconnected');
      }
    });
  }

  /* ══════════════════════════════════════════
     7. YOUTUBE IFRAME ENGINE
  ══════════════════════════════════════════ */
  const ytTag = document.createElement('script');
  ytTag.src = 'https://www.youtube.com/iframe_api';
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
    if (!synced || isRemoteAction) {
      if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); }
      if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); }
      return;
    }
    const time = ytPlayer.getCurrentTime();
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); broadcastSync({ action: 'play', time }); }
    else if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time }); }
    else if (event.data === YT.PlayerState.ENDED)   { playNext(); }
  }

  /* ══════════════════════════════════════════
     8. YOUTUBE SEARCH (for YT Tab)
  ══════════════════════════════════════════ */
  function searchYouTube(query, targetResultsDiv, mediaType) {
    if (!query) return;
    const resDiv = document.getElementById(targetResultsDiv);
    if (!resDiv) return;
    resDiv.innerHTML = '<div class="mp-loading-pulse">Searching YouTube…</div>';
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
            addToQueue({ type: mediaType, title: vid.snippet.title, ytId: vid.id.videoId, thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url });
            showToast('🎵 Playing!');
          };
          resDiv.appendChild(div);
        });
      }).catch(() => resDiv.innerHTML = '<p class="mp-empty">Error. Check API quota.</p>');
  }

  if (ytAddBtn) ytAddBtn.onclick = () => {
    const val = ytInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); ytInput.value = ''; return; }
    searchYouTube(val, 'ytSearchResults', 'youtube'); ytInput.value = '';
  };
  if (ytInput) ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });

  if (urlInput) urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlAddBtn.click(); });
  if (urlAddBtn) urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; }
    else if (val.startsWith('http')) { queue = []; currentIdx = 0; addToQueue({ type: 'stream', title: 'Cloud Media', url: val }); urlInput.value = ''; }
  });

  if (fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    queue = []; currentIdx = 0; addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function loadYouTube(url) {
    const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    queue = []; currentIdx = 0; addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id });
  }

  /* ══════════════════════════════════════════
     9. AUDIO EXTRACTION ENGINE
  ══════════════════════════════════════════ */

  /* Fetch m4a/audio URL from Spotify track ID via SP81 */
  async function fetchPremiumAudio(spId) {
    try {
      const res = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const result = await res.json();
      return Array.isArray(result)
        ? (result[0]?.url || result[0]?.link)
        : (result.url || result.link || result.downloadUrl);
    } catch (e) { return null; }
  }

  /* Search YouTube for music query, return best match videoId */
  async function searchYTMusicAudio(query) {
    try {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query + ' official audio')}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      );
      const d = await r.json();
      if (!d.items || d.items.length === 0) return null;
      const item = d.items[0];
      return {
        ytId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumb: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium.url
      };
    } catch (e) { return null; }
  }

  /* Extract direct audio stream from YouTube videoId */
  async function extractYTAudioUrl(ytId) {
    // Try multiple public no-cors proxy methods
    const proxies = [
      `https://api.cobalt.tools/api/json`,
    ];
    // Primary: use yt-dlp style RapidAPI
    try {
      const res = await fetch(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`, {
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com'
        }
      });
      const data = await res.json();
      // Look for audio formats
      if (data.formats) {
        const audioFormats = Object.values(data.formats).filter(f => f.url && (f.mimeType?.includes('audio') || f.audioQuality));
        audioFormats.sort((a, b) => parseInt(b.bitrate || 0) - parseInt(a.bitrate || 0));
        if (audioFormats.length > 0) return audioFormats[0].url;
        // fallback to any format
        const anyFormat = Object.values(data.formats).find(f => f.url);
        if (anyFormat) return anyFormat.url;
      }
      if (data.url) return data.url;
    } catch (e) { /* continue */ }

    // Fallback: yt-download via rapid
    try {
      const res2 = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${ytId}`, {
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com'
        }
      });
      const d2 = await res2.json();
      if (d2.link) return d2.link;
    } catch (e) { /* continue */ }

    return null;
  }

  /* Song key for dedup — normalize title */
  function songKey(title, artist) {
    return (title + '__' + (artist || '')).toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();
  }

  /* ══════════════════════════════════════════
     10. SMART VIBE/MOOD AUTO-PLAY ENGINE
  ══════════════════════════════════════════ */

  // Generate mood-specific search queries from a song seed
  function buildVibeQueries(title, artist) {
    const clean = (s) => s.replace(/\(.*?\)|\[.*?\]/g, '').replace(/ft\.?.*/i, '').trim();
    const t = clean(title);
    const a = clean(artist || '');

    // Extract genre hints from title/artist
    const isBollywood = /hindi|bollywood|filmi/i.test(t + a);
    const isLo = /lo.?fi|chill|relax|study/i.test(t + a);
    const isSad = /sad|broken|alone|pain|cry|tears|dard|tanha|judai/i.test(t + a);
    const isParty = /party|dance|night|club|festival|beat/i.test(t + a);
    const isRomantic = /love|pyaar|romance|mohabbat|dil|heart|tere|tera/i.test(t + a);
    const isEnergy = /energy|hype|power|fire|beast|rage|rap|rap/i.test(t + a);

    let moodTerms = [];
    if (isBollywood) moodTerms.push(`${a} best songs`, `bollywood ${isSad ? 'sad' : isRomantic ? 'romantic' : 'hit'} songs`, `${t.split(' ')[0]} hindi songs`);
    else if (isLo) moodTerms.push(`lofi chill mix`, `chill beats study music`, `relaxing lofi songs`);
    else if (isSad) moodTerms.push(`${a} sad songs`, `emotional songs like ${t}`, `sad heartbreak songs mix`);
    else if (isParty) moodTerms.push(`${a} party hits`, `dance party mix songs`, `top party songs`);
    else if (isRomantic) moodTerms.push(`${a} romantic songs`, `love songs playlist`, `romantic hits like ${t}`);
    else if (isEnergy) moodTerms.push(`${a} hype songs`, `high energy music mix`, `rap hits playlist`);
    else moodTerms.push(`${a} top songs`, `songs like ${t} ${a}`, `${t.split(' ')[0]} vibes music`);

    // Always add a genre-agnostic related query
    moodTerms.push(`best songs like ${t}`);
    return moodTerms.slice(0, 3);
  }

  // Fetch 5 related YouTube music videos for auto-play
  async function fetchVibeNextSongs(title, artist, count = 5) {
    const queries = buildVibeQueries(title, artist);
    const collected = [];
    const seenKeys = new Set();

    for (const q of queries) {
      if (collected.length >= count * 2) break;
      try {
        const r = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(q)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
        );
        const d = await r.json();
        if (!d.items) continue;
        for (const item of d.items) {
          const t2 = item.snippet.title;
          const a2 = item.snippet.channelTitle;
          const k = songKey(t2, a2);
          // Skip if already played or seen
          if (playedKeys.has(k) || seenKeys.has(k)) continue;
          // Skip if same title as current (avoid repeat across channels)
          const currentClean = title.toLowerCase().replace(/\s+/g, ' ').replace(/\(.*?\)/g, '').trim();
          const t2Clean = t2.toLowerCase().replace(/\s+/g, ' ').replace(/\(.*?\)/g, '').trim();
          if (t2Clean.includes(currentClean.split(' ')[0]) && currentClean.includes(t2Clean.split(' ')[0])) continue;
          seenKeys.add(k);
          collected.push({
            ytId: item.id.videoId,
            title: t2,
            artist: a2,
            thumb: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium.url,
            key: k
          });
          if (collected.length >= count * 2) break;
        }
      } catch (e) { /* skip */ }
    }
    return collected.slice(0, count);
  }

  // Prefetch m4a/audio for a list of songs in background
  async function prefetchSongs(songs) {
    for (const song of songs) {
      if (prefetchCache.has(song.key)) continue;
      try {
        const audioUrl = await extractYTAudioUrl(song.ytId);
        if (audioUrl) {
          prefetchCache.set(song.key, { ...song, audioUrl });
          // Mark queue item as prefetched if present
          markQueuePrefetched(song.key);
        }
      } catch (e) { /* skip */ }
    }
  }

  function markQueuePrefetched(key) {
    const qItems = queueList.querySelectorAll('.mp-queue-item');
    queue.forEach((item, i) => {
      const k = songKey(item.title, item.artist || '');
      if (k === key && qItems[i]) {
        let dot = qItems[i].querySelector('.qi-prefetched');
        if (!dot) { dot = document.createElement('span'); dot.className = 'qi-prefetched'; dot.textContent = '●'; qItems[i].appendChild(dot); }
      }
    });
    // Also mark in ytmusic / spotify card lists
    document.querySelectorAll('.ytm-card, .sp-card').forEach(card => {
      if (card.dataset.key === key) card.classList.add('prefetched');
    });
  }

  /* Trigger auto-play loading — fetch next vibe songs, prefetch their audio, add to queue */
  async function triggerAutoPlayLoad(title, artist) {
    if (autoPlayFetching) return;
    autoPlayFetching = true;
    showToast('🎵 Loading next vibes…');
    const songs = await fetchVibeNextSongs(title, artist, 5);
    if (songs.length === 0) { autoPlayFetching = false; return; }

    // Add to queue
    songs.forEach(song => {
      const type = activeSrcTab === 'ytmusic' ? 'ytmusic' : (activeSrcTab === 'spotify' ? 'spotify_yt' : 'ytmusic');
      queue.push({
        type,
        title: song.title,
        artist: song.artist,
        ytId: song.ytId,
        thumb: song.thumb,
        key: song.key,
        isAutoPlay: true
      });
    });
    renderQueue();

    // Background prefetch
    prefetchSongs(songs).then(() => { autoPlayFetching = false; });
  }

  /* ══════════════════════════════════════════
     11. SPOTIFY SEARCH ENGINE
  ══════════════════════════════════════════ */
  async function searchSpotifyAlt(query) {
    if (!query) return;
    spResultsArea.innerHTML = '<div class="mp-loading-pulse">Loading…</div>';

    try {
      const url = 'https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall?market=IN&country=IN';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': 'spotify-web-api3.p.rapidapi.com',
          'Content-Type': 'application/json',
          'Accept-Language': 'en-IN,en;q=0.9,hi-IN;q=0.8'
        },
        body: JSON.stringify({ terms: query, limit: 15, country: 'IN', market: 'IN' })
      });
      const responseData = await res.json();
      const searchData = responseData?.data?.searchV2 || responseData;
      let rawItems = [];

      (searchData?.topResults?.items || searchData?.topResultsV2?.itemsV2 || []).forEach(item => rawItems.push({ ...item, isExactTopResult: true }));
      (searchData?.tracksV2?.items || searchData?.tracks?.items || []).forEach(item => rawItems.push(item));
      (searchData?.playlistsV2?.items || searchData?.playlists?.items || []).forEach(item => rawItems.push(item));
      (searchData?.albumsV2?.items || searchData?.albums?.items || []).forEach(item => rawItems.push(item));

      if (rawItems.length === 0) { spResultsArea.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }

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
        let artistName = 'Unknown';
        if (item.artists?.items?.[0]?.profile?.name) artistName = item.artists.items[0].profile.name;
        else if (item.ownerV2?.data?.name) artistName = item.ownerV2.data.name;
        else if (itemType === 'artist') artistName = 'Artist Profile';
        let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
        if (item.albumOfTrack?.coverArt?.sources?.[0]?.url) thumb = item.albumOfTrack.coverArt.sources[0].url;
        else if (item.coverArt?.sources?.[0]?.url) thumb = item.coverArt.sources[0].url;
        else if (item.images?.items?.[0]?.sources?.[0]?.url) thumb = item.images.items[0].sources[0].url;
        else if (item.visuals?.avatarImage?.sources?.[0]?.url) thumb = item.visuals.avatarImage.sources[0].url;
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

      renderSpotifyCards(cleanItems, lq);
    } catch (e) {
      console.error(e);
      spResultsArea.innerHTML = '<p class="mp-empty">🚨 API Error!</p>';
    }
  }

  function renderSpotifyCards(items, lq) {
    spResultsArea.innerHTML = '';
    items.forEach((data, idx) => {
      const isTop = (data.isExactTopResult || (idx === 0 && lq && data.titleName.toLowerCase().includes(lq.split(' ')[0])));
      const typeLabel = data.itemType !== 'track' ? `<span style="font-size:9px;background:#e8436a;color:#fff;padding:2px 4px;border-radius:3px;margin-left:4px;">${data.itemType.toUpperCase()}</span>` : '';
      const imgR = data.itemType === 'artist' ? '50%' : '10px';
      const k = songKey(data.titleName, data.artistName);

      const card = document.createElement('div');
      card.className = 'sp-card';
      card.dataset.key = k;
      card.innerHTML = `
        <img src="${data.thumb}" class="sp-card-thumb" style="border-radius:${imgR}" onerror="this.src='https://i.imgur.com/8Q5FqWj.jpeg'"/>
        <div class="sp-card-info">
          ${isTop ? '<div class="sp-best-badge">🏆 Best Match</div>' : ''}
          <div class="sp-card-title">${data.titleName}${typeLabel}</div>
          <div class="sp-card-sub">${data.artistName}</div>
          ${data.itemType !== 'track' ? `<span class="sp-card-type-badge">${data.itemType.toUpperCase()}</span>` : ''}
        </div>
        <div class="sp-card-mini-viz">
          <div class="sp-mini-bar"></div><div class="sp-mini-bar"></div><div class="sp-mini-bar"></div>
        </div>
        <div class="sp-card-prefetch-dot"></div>
        <button class="sp-card-play-btn">${data.itemType === 'track' ? '▶' : '📂'}</button>
      `;

      if (prefetchCache.has(k)) card.classList.add('prefetched');

      card.onclick = async () => {
        if (data.itemType === 'playlist') {
          showToast('📂 Loading Playlist…');
          const tracks = await fetchPlaylistTracks(data.itemId);
          renderSpotifyCards(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image, isExactTopResult: false })), '');
        } else if (data.itemType === 'album') {
          showToast('📂 Loading Album…');
          const tracks = await fetchAlbumTracks(data.itemId);
          renderSpotifyCards(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image, isExactTopResult: false })), '');
        } else if (data.itemType === 'artist') {
          showToast('👤 Artist Profiles cannot be played directly.');
        } else {
          // Play track — on Spotify UI, using youtube audio extraction
          activeSrcTab = 'spotify';
          queue = []; currentIdx = 0;
          const qItem = {
            type: 'spotify_yt',
            title: data.titleName,
            artist: data.artistName,
            spId: data.itemId,
            thumb: data.thumb,
            key: k
          };
          addToQueue(qItem);
          // Update all cards playing state
          document.querySelectorAll('.sp-card').forEach(c => c.classList.remove('playing'));
          card.classList.add('playing');
          showToast('🎵 Playing on Spotify!');
        }
      };
      spResultsArea.appendChild(card);
    });
  }

  async function fetchPlaylistTracks(playlistId) {
    try {
      const res = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${playlistId}&offset=0&limit=100&market=IN`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const data = await res.json();
      return (data.items || []).filter(i => i.track && !i.track.is_local).map(i => ({
        id: i.track.id, title: i.track.name, artist: i.track.artists[0]?.name || 'Unknown', image: i.track.album?.images[0]?.url || ''
      }));
    } catch (e) { return []; }
  }

  async function fetchAlbumTracks(albumId) {
    try {
      const res = await fetch(`https://${SP81_HOST}/album_tracks?id=${albumId}&market=IN`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const data = await res.json();
      const albumImg = (data.album && data.album.images) ? data.album.images[0].url : '';
      return (data.album?.tracks?.items || []).map(i => ({
        id: i.id, title: i.name, artist: i.artists[0]?.name || 'Unknown', image: albumImg
      }));
    } catch (e) { return []; }
  }

  /* ══════════════════════════════════════════
     12. YT MUSIC TAB ENGINE
  ══════════════════════════════════════════ */
  async function searchYTMusic(query) {
    if (!query) return;
    ytmResultsArea.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';

    try {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query + ' song')}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      );
      const d = await r.json();
      if (!d.items || d.items.length === 0) { ytmResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }

      ytmResultsArea.innerHTML = '';
      d.items.forEach((item, idx) => {
        const t = item.snippet.title;
        const a = item.snippet.channelTitle;
        const thumb = item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium.url;
        const ytId = item.id.videoId;
        const k = songKey(t, a);

        const card = document.createElement('div');
        card.className = 'ytm-card';
        card.dataset.key = k;
        card.innerHTML = `
          <img src="${thumb}" class="ytm-card-thumb" onerror="this.src='https://i.imgur.com/8Q5FqWj.jpeg'"/>
          <div class="ytm-card-info">
            <div class="ytm-card-title">${t}</div>
            <div class="ytm-card-sub">${a}</div>
          </div>
          <div class="ytm-card-mini-viz">
            <div class="ytm-mini-bar"></div><div class="ytm-mini-bar"></div><div class="ytm-mini-bar"></div>
          </div>
          <div class="ytm-card-prefetch-dot"></div>
          <button class="ytm-card-play-btn">▶</button>
        `;

        if (prefetchCache.has(k)) card.classList.add('prefetched');

        card.onclick = () => {
          activeSrcTab = 'ytmusic';
          queue = []; currentIdx = 0;
          addToQueue({ type: 'ytmusic', title: t, artist: a, ytId, thumb, key: k });
          document.querySelectorAll('.ytm-card').forEach(c => c.classList.remove('playing'));
          card.classList.add('playing');
          showToast('🎵 Playing!');
        };
        ytmResultsArea.appendChild(card);
      });
    } catch (e) {
      ytmResultsArea.innerHTML = '<p class="mp-empty">Error. Check API.</p>';
    }
  }

  if (ytmSearchBtn) ytmSearchBtn.onclick = () => {
    const val = ytmInput.value.trim(); if (!val) return;
    searchYTMusic(val); ytmInput.value = '';
  };
  if (ytmInput) ytmInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytmSearchBtn.click(); });

  if (spSearchSongBtn) spSearchSongBtn.onclick = () => {
    const val = spInput.value.trim(); if (!val) return;
    searchSpotifyAlt(val); spInput.value = '';
  };
  if (spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = async () => {
    const id = spInput.value.trim(); if (!id) return;
    showToast('📂 Fetching Playlist…');
    const tracks = await fetchPlaylistTracks(id);
    renderSpotifyCards(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image, isExactTopResult: false })), '');
    spInput.value = '';
  };
  if (spInput) spInput.addEventListener('keydown', e => { if (e.key === 'Enter') spSearchSongBtn.click(); });

  /* ══════════════════════════════════════════
     13. QUEUE ENGINE
  ══════════════════════════════════════════ */
  function addToQueue(item) {
    if (!item.key) item.key = songKey(item.title, item.artist || '');
    queue.push(item);
    renderQueue();
    playQueueItem(queue.length - 1);
  }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      const icon = { youtube: '🎬', youtube_audio: '🎧', ytmusic: '🎵', spotify_yt: '🌐', stream: '☁️' }[item.type] || '🎵';
      const isPre = item.key && prefetchCache.has(item.key);
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}${isPre ? ' <span class="qi-prefetched">●</span>' : ''}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => {
        if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); if (currentIdx >= queue.length) currentIdx = queue.length - 1; renderQueue(); return; }
        playQueueItem(i);
      };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i; renderQueue();
    const item = queue[i];
    const isBlob = item.url && item.url.startsWith('blob:');
    if (synced && !isRemoteAction && !isBlob) broadcastSync({ action: 'change_song', item });
    playedKeys.add(item.key || songKey(item.title, item.artist || ''));
    renderMedia(item);

    // If near end of queue with autoplay, fetch more
    if (autoPlayEnabled && (i >= queue.length - 2)) {
      triggerAutoPlayLoad(item.title, item.artist || '');
    }
  }

  /* ══════════════════════════════════════════
     14. MEDIA RENDERER
  ══════════════════════════════════════════ */
  function showCinemaMode() {
    cinemaMode.classList.remove('hidden');
    premiumMusicCard.classList.add('hidden');
    spotifyMode.classList.add('hidden');
    premiumMusicCard.classList.remove('playing');
  }
  function showPremiumCard(srcTab) {
    cinemaMode.classList.add('hidden');
    premiumMusicCard.classList.remove('hidden');
    spotifyMode.classList.add('hidden');
    // Badge
    if (srcTab === 'spotify') {
      pmcSourceBadge.textContent = '🌐 Spotify';
      pmcSourceBadge.className = 'pmc-source-badge sp';
    } else {
      pmcSourceBadge.textContent = '🎵 YT Music';
      pmcSourceBadge.className = 'pmc-source-badge ytm';
    }
  }

  function renderMedia(item) {
    // Stop everything
    nativeAudio.pause();
    nativeAudio.removeAttribute('src');
    nativeAudio.srcObject = null;
    nativeAudio.style.display = 'none';
    ytFrameWrap.style.display = 'none';
    if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    isPlaying = false;
    updatePlayBtn();
    updateProgressBar(0, 0);

    if (item.type === 'youtube') {
      // Full YouTube video — cinema mode
      activeType = 'youtube';
      showCinemaMode();
      ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => renderMedia(item), 500);
      setTrackInfo(item.title, 'YouTube Cinema Mode');
      setupMediaSession(item);
    }
    else if (item.type === 'ytmusic') {
      // YT Music — premium card, audio only
      activeType = 'ytmusic';
      activeSrcTab = 'ytmusic';
      showPremiumCard('ytmusic');
      setPMCInfo(item.title, item.artist || 'YouTube Music', item.thumb);
      setTrackInfo(item.title, item.artist || 'YouTube Music');
      showToast('🎵 Loading audio…');

      const k = item.key || songKey(item.title, item.artist || '');
      const cached = prefetchCache.get(k);
      if (cached && cached.audioUrl) {
        nativeAudio.src = cached.audioUrl;
        nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(() => showToast('Tap ▶ to play'));
        setupMediaSession(item);
      } else {
        extractYTAudioUrl(item.ytId).then(url => {
          if (url) {
            prefetchCache.set(k, { ...item, audioUrl: url });
            nativeAudio.src = url;
            nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(() => showToast('Tap ▶ to play'));
            setupMediaSession(item);
          } else {
            // Fallback: load ytId directly in nativeAudio won't work, show toast and skip
            showToast('⚠️ Audio fetch failed, skipping…');
            setTimeout(playNext, 2000);
          }
        });
      }
    }
    else if (item.type === 'spotify_yt') {
      // Spotify track — premium card (Spotify UI), audio extracted from YT or SP
      activeType = 'spotify_yt';
      activeSrcTab = 'spotify';
      showPremiumCard('spotify');
      setPMCInfo(item.title, item.artist || 'Global Music', item.thumb);
      setTrackInfo(item.title, item.artist || 'Global Music');
      showToast('🌐 Loading Spotify track…');

      const k = item.key || songKey(item.title, item.artist || '');

      async function playSpotifyTrack() {
        const cached = prefetchCache.get(k);
        if (cached && cached.audioUrl) {
          nativeAudio.src = cached.audioUrl;
          nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(() => showToast('Tap ▶ to play'));
          setupMediaSession(item);
          return;
        }

        // Try SP81 direct
        if (item.spId) {
          const spUrl = await fetchPremiumAudio(item.spId);
          if (spUrl) {
            prefetchCache.set(k, { ...item, audioUrl: spUrl });
            nativeAudio.src = spUrl;
            nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(() => showToast('Tap ▶ to play'));
            setupMediaSession(item);
            return;
          }
        }
        // Fallback: search YouTube for audio
        const ytResult = await searchYTMusicAudio(item.title + ' ' + (item.artist || ''));
        if (ytResult) {
          const ytUrl = await extractYTAudioUrl(ytResult.ytId);
          if (ytUrl) {
            prefetchCache.set(k, { ...item, audioUrl: ytUrl });
            nativeAudio.src = ytUrl;
            nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(() => showToast('Tap ▶ to play'));
            setupMediaSession(item);
            return;
          }
        }
        showToast('⚠️ Could not load audio, skipping…');
        setTimeout(playNext, 2000);
      }
      playSpotifyTrack();
    }
    else if (item.type === 'youtube_audio') {
      // Legacy type — kept for backward compat
      activeType = 'youtube_audio';
      showPremiumCard(activeSrcTab);
      setPMCInfo(item.title, item.artist || 'ZeroX', item.thumb);
      setTrackInfo(item.title, 'Fetching Audio…');
      fetchPremiumAudio(item.spId).then(url => {
        if (url) {
          nativeAudio.src = url;
          nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(() => showToast('Tap ▶ to play'));
          setupMediaSession(item);
        } else {
          showToast('API Error: Could not extract Audio.');
          setTimeout(playNext, 2000);
        }
      });
    }
    else if (item.type === 'stream') {
      activeType = 'stream';
      cinemaMode.classList.add('hidden');
      premiumMusicCard.classList.add('hidden');
      spotifyMode.classList.remove('hidden');
      nativeAudio.src = item.url;
      nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast('Tap ▶ to play'));
      setTrackInfo(item.title, '☁️ Cloud Audio');
      setupMediaSession(item);
    }
  }

  /* ══════════════════════════════════════════
     15. PREMIUM CARD INFO & PROGRESS
  ══════════════════════════════════════════ */
  function setPMCInfo(title, artist, thumb) {
    pmcTitle.textContent = title;
    pmcArtist.textContent = artist;
    const src = thumb || 'https://i.imgur.com/8Q5FqWj.jpeg';
    pmcArtwork.src = src;
    pmcBgBlur.style.backgroundImage = `url('${src}')`;
    pmcGlow.style.background = `rgba(232,67,106,0.5)`;
  }

  function updateProgressBar(current, duration) {
    if (!duration || isNaN(duration)) { pmcProgressFill.style.width = '0%'; pmcCurrentTime.textContent = '0:00'; pmcDuration.textContent = '0:00'; return; }
    const pct = Math.min(100, (current / duration) * 100);
    pmcProgressFill.style.width = pct + '%';
    pmcCurrentTime.textContent = fmtTime(current);
    pmcDuration.textContent = fmtTime(duration);
  }

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  nativeAudio.addEventListener('timeupdate', () => {
    updateProgressBar(nativeAudio.currentTime, nativeAudio.duration);
  });

  // Progress bar seek
  if (pmcProgressBar) {
    pmcProgressBar.addEventListener('click', (e) => {
      const rect = pmcProgressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (nativeAudio.duration) nativeAudio.currentTime = pct * nativeAudio.duration;
    });
    pmcProgressBar.addEventListener('touchstart', (e) => {
      const rect = pmcProgressBar.getBoundingClientRect();
      const pct = (e.touches[0].clientX - rect.left) / rect.width;
      if (nativeAudio.duration) nativeAudio.currentTime = pct * nativeAudio.duration;
    }, { passive: true });
  }

  // PMC controls
  if (pmcPlayMain) pmcPlayMain.addEventListener('click', () => {
    if (activeType === 'stream' || activeType === 'youtube_audio' || activeType === 'ytmusic' || activeType === 'spotify_yt') {
      if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(() => {});
    } else if (activeType === 'youtube' && ytPlayer) {
      if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  });
  if (pmcPrev) pmcPrev.addEventListener('click', playPrev);
  if (pmcNext) pmcNext.addEventListener('click', playNext);

  /* ══════════════════════════════════════════
     16. MEDIA SESSION
  ══════════════════════════════════════════ */
  function setupMediaSession(item) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title, artist: item.artist || 'ZeroX Hub',
        artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play',          () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.playVideo(); else nativeAudio.play(); });
      navigator.mediaSession.setActionHandler('pause',         () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.pauseVideo(); else nativeAudio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack',     playNext);
    }
  }

  /* ══════════════════════════════════════════
     17. PLAYBACK CONTROLS
  ══════════════════════════════════════════ */
  function playNext() {
    if (currentIdx < queue.length - 1) playQueueItem(currentIdx + 1);
    else if (autoPlayEnabled) {
      const cur = queue[currentIdx];
      if (cur) triggerAutoPlayLoad(cur.title, cur.artist || '');
      else showToast('End of queue.');
    } else showToast('End of queue.');
  }

  function playPrev() {
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
    else showToast('First song!');
  }

  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

  mpPlays.forEach(btn => btn.addEventListener('click', () => {
    if (activeType === 'stream' || activeType === 'youtube_audio' || activeType === 'ytmusic' || activeType === 'spotify_yt') {
      if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(() => {});
    } else if (activeType === 'youtube' && ytPlayer) {
      if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  }));

  function updatePlayBtn() {
    const icon = isPlaying ? '⏸' : '▶';
    mpPlays.forEach(btn => btn.textContent = icon);
    if (pmcPlayMain) pmcPlayMain.textContent = icon;

    if (isPlaying && (activeType === 'stream' || activeType === 'youtube_audio' || activeType === 'ytmusic' || activeType === 'spotify_yt')) {
      vinylRecord.classList.add('playing');
      premiumMusicCard.classList.add('playing');
    } else {
      vinylRecord.classList.remove('playing');
      if (!isPlaying) premiumMusicCard.classList.remove('playing');
    }
  }

  function setTrackInfo(title, sub) {
    musicTitle.textContent = title;
    musicArtist.textContent = sub;
    miniTitle.textContent = `${title} • ${sub}`;
  }

  /* ══════════════════════════════════════════
     18. NATIVE AUDIO EVENTS
  ══════════════════════════════════════════ */
  nativeAudio.addEventListener('play', () => {
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
  nativeAudio.addEventListener('ended', () => {
    if (autoPlayEnabled) playNext();
    else showToast('Song ended. Auto-play is off.');
  });

  /* ══════════════════════════════════════════
     19. SYNC NETWORK
  ══════════════════════════════════════════ */
  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  window._zxReceiveSync = function (data) {
    if (data.action === 'request_sync') {
      const curItem = queue[currentIdx]; const isBlob = curItem && curItem.url && curItem.url.startsWith('blob:');
      if (synced && curItem && !isBlob) {
        broadcastSync({ action: 'change_song', item: curItem });
        setTimeout(() => {
          let curTime = 0;
          if (activeType === 'youtube' && ytPlayer && isYtReady) curTime = ytPlayer.getCurrentTime();
          else if (nativeAudio.currentTime) curTime = nativeAudio.currentTime;
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
    } else {
      if (data.action === 'play')  { if (Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time; nativeAudio.play().catch(() => {}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek')  { nativeAudio.currentTime = data.time; }
    }
  };

  /* ══════════════════════════════════════════
     20. FULLSCREEN STATE
  ══════════════════════════════════════════ */
  function toggleFullscreenState() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
  }
  document.addEventListener('fullscreenchange', toggleFullscreenState);
  document.addEventListener('webkitfullscreenchange', toggleFullscreenState);

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  renderQueue();

})();
