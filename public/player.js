/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (PRO 3.2 FINAL BUILD)
   🔥 NEW: YT Music Tab (instant audio, no list)
   🔥 NEW: Smart Vibe-Based Autoplay (prefetch + instant next)
   🔥 NEW: Auto-play toggle (playlist-aware + infinite loop)
   🔥 NEW: Duplicate-song deduplication across channels
   ✅ ALL ORIGINAL FEATURES INTACT
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ── 1. DOM ELEMENTS ────────────────────────────────────── */
  const panel              = document.getElementById('zxPanel');
  const handle             = document.getElementById('zxHandle');
  const closeHandle        = document.getElementById('closeHandle');
  const panelToggleBtn     = document.getElementById('panelToggleBtn');

  const nativeAudio        = document.getElementById('nativeAudio');
  const ytFrameWrap        = document.getElementById('ytFrameWrap');

  const cinemaMode         = document.getElementById('cinemaMode');
  const spotifyMode        = document.getElementById('spotifyMode');
  const vinylRecord        = document.getElementById('vinylRecord');      // mini
  const vinylRecord2       = document.getElementById('vinylRecord2');     // big panel
  const musicTitle         = document.getElementById('musicTitle');
  const musicArtist        = document.getElementById('musicArtist');
  const miniTitle          = document.getElementById('miniTitle');

  // All play buttons (mini + big panel)
  const mpPlays            = document.querySelectorAll('.mp-play');
  const mpPrevs            = document.querySelectorAll('.mp-prev, #miniPrev, .mp-prev-big');
  const mpNexts            = document.querySelectorAll('.mp-next, #miniNext, .mp-next-big');

  // Cloud/URL tab
  const urlInput           = document.getElementById('urlInput');
  const urlAddBtn          = document.getElementById('urlAddBtn');
  const fileInput          = document.getElementById('fileInput');
  const toggleListBtnUrl   = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');

  // YouTube tab
  const ytInput            = document.getElementById('ytInput');
  const ytAddBtn           = document.getElementById('ytAddBtn');
  const toggleListBtnYt    = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt  = document.getElementById('episodesOverlayYt');
  const ytSearchResults    = document.getElementById('ytSearchResults');

  // YT Music tab (NEW)
  const ytmInput           = document.getElementById('ytmInput');
  const ytmSearchBtn       = document.getElementById('ytmSearchBtn');
  const toggleListBtnYtm   = document.getElementById('toggleListBtnYtm');
  const episodesOverlayYtm = document.getElementById('episodesOverlayYtm');
  const ytmSearchResults   = document.getElementById('ytmSearchResults');

  // Spotify tab
  const spInput            = document.getElementById('spInput');
  const spSearchSongBtn    = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn= document.getElementById('spSearchPlaylistBtn');
  const queueList          = document.getElementById('queueList');
  const toggleListBtnSp    = document.getElementById('toggleListBtnSp');
  const episodesOverlaySp  = document.getElementById('episodesOverlaySp');
  const spSearchResults    = document.getElementById('spSearchResults');

  // Sync
  const mpSyncBadge        = document.getElementById('mpSyncBadge');
  const mpSyncBtn          = document.getElementById('mpSyncBtn');
  const mpSyncInfo         = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn        = document.getElementById('mpUnsyncBtn');

  if (nativeAudio) {
    nativeAudio.setAttribute('playsinline', '');
    nativeAudio.setAttribute('webkit-playsinline', '');
  }

  /* ── 2. API CONFIG ──────────────────────────────────────── */
  const RAPID_API_KEY  = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST      = 'spotify81.p.rapidapi.com';
  const YOUTUBE_API_KEY= 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  /* ── 3. STATE ───────────────────────────────────────────── */
  let queue             = [];
  let currentIdx        = 0;
  let synced            = false;
  let activeType        = 'none';   // 'youtube' | 'youtube_audio' | 'stream'
  let activeSource      = 'none';   // 'ytmusic' | 'youtube' | 'spotify' | 'cloud'
  let isPlaying         = false;
  let ytPlayer          = null;
  let isYtReady         = false;
  let isRemoteAction    = false;
  let autoPlayEnabled   = true;
  let remoteTimer       = null;

  // ── Prefetch Cache ───────────────────────────────────────
  // Map<ytVideoId, { url: string, status: 'pending'|'done'|'error' }>
  const prefetchCache   = new Map();
  // Titles seen (to avoid duplicates across channels)
  const seenTitles      = new Set();
  // Current vibe seed (for smart autoplay)
  let currentVibeQuery  = '';
  // Prefetch queue (array of ytVideoId)
  let prefetchQueue     = [];
  // Flag to prevent overlapping autoplay fetches
  let autoPlayFetching  = false;

  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ── 4. PANEL ENGINE ────────────────────────────────────── */
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

  if (handle) {
    handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    handle.addEventListener('touchmove', (e) => {
      if (!isPanelOpen && (e.touches[0].clientY - startY) > 15) openPanel();
    }, { passive: true });
    handle.addEventListener('click', (e) => {
      if (e.target.closest('.mp-btn') || e.target.closest('.z-trigger-btn')) return;
      isPanelOpen ? closePanel() : openPanel();
    });
  }
  if (panelToggleBtn) panelToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isPanelOpen ? closePanel() : openPanel();
  });
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    closeHandle.addEventListener('touchmove', (e) => {
      if (isPanelOpen && (startY - e.touches[0].clientY) > 15) closePanel();
    }, { passive: true });
    closeHandle.addEventListener('click', closePanel);
  }
  if (panel) panel.addEventListener('touchmove', (e) => {
    if (isPanelOpen && !e.target.closest('.music-panel-inner')) e.preventDefault();
  }, { passive: false });

  // Tabs
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById('tab-' + tab.dataset.tab);
      if (content) content.classList.add('active');
    });
  });

  // Overlay toggles
  if (toggleListBtnUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl && episodesOverlayUrl.classList.toggle('hidden'));
  if (toggleListBtnYt)  toggleListBtnYt.addEventListener('click',  () => episodesOverlayYt  && episodesOverlayYt.classList.toggle('hidden'));
  if (toggleListBtnSp)  toggleListBtnSp.addEventListener('click',  () => episodesOverlaySp  && episodesOverlaySp.classList.toggle('hidden'));
  if (toggleListBtnYtm) toggleListBtnYtm.addEventListener('click', () => episodesOverlayYtm && episodesOverlayYtm.classList.toggle('hidden'));

  /* ── 5. TOAST ───────────────────────────────────────────── */
  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ── 6. YOUTUBE IFRAME ENGINE ───────────────────────────── */
  const ytTag = document.createElement('script');
  ytTag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(ytTag);

  window.onYouTubeIframeAPIReady = function () {
    if (!ytFrameWrap) return;
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: () => { isYtReady = true; },
        onStateChange: onPlayerStateChange
      }
    });
  };

  function onPlayerStateChange(event) {
    if (!synced || isRemoteAction) {
      if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); }
      if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); }
      if (event.data === YT.PlayerState.ENDED)   { handleTrackEnd(); }
      return;
    }
    const time = ytPlayer.getCurrentTime();
    if (event.data === YT.PlayerState.PLAYING) {
      isPlaying = true; updatePlayBtn();
      broadcastSync({ action: 'play', time });
    } else if (event.data === YT.PlayerState.PAUSED) {
      isPlaying = false; updatePlayBtn();
      broadcastSync({ action: 'pause', time });
    } else if (event.data === YT.PlayerState.ENDED) {
      handleTrackEnd();
    }
  }

  /* ── 7. YOUTUBE SEARCH (for cinema tab) ─────────────────── */
  function searchYouTube(query, targetResultsDiv, mediaType) {
    if (!query) return;
    const resDiv = document.getElementById(targetResultsDiv);
    if (!resDiv) return;
    resDiv.innerHTML = '<p class="mp-empty">🔍 Searching YouTube...</p>';
    if (targetResultsDiv === 'ytSearchResults' && episodesOverlayYt) {
      episodesOverlayYt.classList.remove('hidden');
    }
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`)
      .then(r => r.json())
      .then(data => {
        resDiv.innerHTML = '';
        if (!data.items || data.items.length === 0) {
          resDiv.innerHTML = '<p class="mp-empty">No results found.</p>';
          return;
        }
        data.items.forEach(vid => {
          const div = document.createElement('div');
          div.className = 'yt-search-item';
          div.innerHTML = `
            <img src="${vid.snippet.thumbnails.medium.url}" class="yt-search-thumb"/>
            <div class="yt-search-info">
              <div class="yt-search-title">${vid.snippet.title}</div>
              <div class="yt-search-sub">${vid.snippet.channelTitle}</div>
            </div>
            <span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>`;
          div.onclick = () => {
            queue = []; currentIdx = 0; seenTitles.clear();
            addToQueue({
              type: mediaType, title: vid.snippet.title,
              ytId: vid.id.videoId,
              thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url
            });
            showToast('🎵 Playing Selection!');
          };
          resDiv.appendChild(div);
        });
      }).catch(() => resDiv.innerHTML = '<p class="mp-empty">Error. Check API quota.</p>');
  }

  if (ytAddBtn) ytAddBtn.onclick = () => {
    const val = ytInput.value.trim();
    if (isYouTubeUrl(val)) { loadYouTubeCinema(val); ytInput.value = ''; return; }
    searchYouTube(val, 'ytSearchResults', 'youtube');
    ytInput.value = '';
  };
  if (ytInput) ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });
  if (urlInput) urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlAddBtn.click(); });
  if (urlAddBtn) urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim();
    if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTubeCinema(val); urlInput.value = ''; }
    else if (val.startsWith('http')) {
      queue = []; currentIdx = 0; seenTitles.clear();
      addToQueue({ type: 'stream', title: 'Cloud Media', url: val });
      urlInput.value = '';
    }
  });
  if (fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    queue = []; currentIdx = 0; seenTitles.clear();
    addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function loadYouTubeCinema(url) {
    const id = extractYouTubeId(url);
    if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    queue = []; currentIdx = 0; seenTitles.clear();
    addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id });
  }

  /* ── 8. ══════════════════════════════════════════════════
         YT MUSIC TAB — Instant Audio Play (NEW)
     ══════════════════════════════════════════════════════ */

  /**
   * Search YT for a song query, take the top result,
   * extract audio via invidious/pipedapi, play it.
   * No list shown — instant play.
   */
  async function ytMusicPlay(query) {
    if (!query) return;
    showToast('🎵 Finding track...');
    setTrackInfo('Searching...', query);

    try {
      // Step 1: Search YouTube for best music video
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query + ' official audio')}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      );
      const searchData = await searchRes.json();
      if (!searchData.items || searchData.items.length === 0) {
        showToast('❌ No results found');
        return;
      }

      const topVideo = searchData.items[0];
      const ytId     = topVideo.id.videoId;
      const title    = topVideo.snippet.title;
      const artist   = topVideo.snippet.channelTitle;
      const thumb    = topVideo.snippet.thumbnails.high?.url || topVideo.snippet.thumbnails.medium.url;

      // Update vibe seed
      currentVibeQuery = query;
      seenTitles.clear();
      seenTitles.add(normTitle(title));
      prefetchCache.clear();
      prefetchQueue = [];

      // Build queue item
      const item = {
        type: 'youtube_audio',
        source: 'ytmusic',
        title,
        artist,
        ytId,
        thumb,
        isZeroxify: true
      };

      queue = []; currentIdx = 0;
      addToQueue(item);

      // Immediately kick off prefetch of next songs
      schedulePrefetch(query, title);

    } catch (e) {
      console.error('YT Music play error:', e);
      showToast('❌ Could not load track');
    }
  }

  // Show recent plays list for YT Music tab (last 10 queued)
  const ytmHistory = [];
  function renderYtmHistory() {
    if (!ytmSearchResults) return;
    if (ytmHistory.length === 0) {
      ytmSearchResults.innerHTML = '<p class="mp-empty">No recent plays yet.</p>';
      return;
    }
    ytmSearchResults.innerHTML = '';
    ytmHistory.slice().reverse().forEach(item => {
      const div = document.createElement('div');
      div.className = 'yt-search-item';
      div.innerHTML = `
        <img src="${item.thumb || ''}" class="yt-search-thumb"/>
        <div class="yt-search-info">
          <div class="yt-search-title">${item.title}</div>
          <div class="yt-search-sub">${item.artist || ''}</div>
        </div>
        <span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>`;
      div.onclick = () => {
        seenTitles.clear();
        queue = []; currentIdx = 0;
        currentVibeQuery = item.title;
        addToQueue({ ...item });
        schedulePrefetch(item.title, item.title);
      };
      ytmSearchResults.appendChild(div);
    });
  }

  if (ytmSearchBtn) ytmSearchBtn.onclick = () => {
    const val = ytmInput.value.trim();
    if (!val) return;
    ytmInput.value = '';
    ytMusicPlay(val);
  };
  if (ytmInput) ytmInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') ytmSearchBtn.click();
  });
  if (toggleListBtnYtm) toggleListBtnYtm.addEventListener('click', () => {
    if (episodesOverlayYtm) {
      episodesOverlayYtm.classList.toggle('hidden');
      renderYtmHistory();
    }
  });

  /* ── 9. SMART VIBE-BASED PREFETCH ENGINE (NEW) ──────────── */

  /**
   * Generate a vibe/mood-aware search query from current title.
   * We extract keywords and ask YT for similar songs.
   */
  function vibeQuery(seedTitle, seedQuery) {
    // Use original query as seed for vibe, not title (more accurate)
    const base = seedQuery || seedTitle;
    // Strip common suffixes
    const clean = base.replace(/\(.*?\)|\[.*?\]|official|audio|video|lyrics|ft\.?|feat\.?/gi, '').trim();
    return clean;
  }

  /**
   * Fetch N video IDs from YT search matching vibe, excluding already seen titles.
   */
  async function fetchVibeVideoIds(seedTitle, seedQuery, count = 8) {
    const q = vibeQuery(seedTitle, seedQuery);
    const searchQ = `${q} similar songs mood`;
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${count + 5}&q=${encodeURIComponent(searchQ)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    if (!data.items) return [];

    const results = [];
    for (const vid of data.items) {
      const nTitle = normTitle(vid.snippet.title);
      if (seenTitles.has(nTitle)) continue; // dedup
      seenTitles.add(nTitle);
      results.push({
        ytId: vid.id.videoId,
        title: vid.snippet.title,
        artist: vid.snippet.channelTitle,
        thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url
      });
      if (results.length >= count) break;
    }
    return results;
  }

  /**
   * Normalize title for deduplication:
   * Strips channel names, "(Official)", ft., etc., lowercases.
   */
  function normTitle(title) {
    return title
      .toLowerCase()
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/official|audio|video|lyrics|ft\.?|feat\.?|topic|\s-\s.*/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Extract audio URL from YouTube video ID via multiple fallback APIs.
   * Returns null on failure.
   */
  async function extractYtAudio(ytId) {
    // Try Invidious API (public instance)
    const invidiousInstances = [
      'https://invidious.io.lol',
      'https://inv.nadeko.net',
      'https://invidious.privacyredirect.com',
      'https://yt.cdaut.de'
    ];

    for (const base of invidiousInstances) {
      try {
        const res = await fetch(`${base}/api/v1/videos/${ytId}?fields=adaptiveFormats`, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) continue;
        const data = await res.json();
        // Find best audio-only format (m4a/webm)
        const formats = (data.adaptiveFormats || []).filter(f =>
          f.type && (f.type.includes('audio/mp4') || f.type.includes('audio/webm'))
        );
        // Sort by bitrate descending
        formats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        if (formats.length > 0 && formats[0].url) {
          return formats[0].url;
        }
      } catch (_) { continue; }
    }

    // Fallback: try cobalt.tools API
    try {
      const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${ytId}`,
          aFormat: 'm4a', isAudioOnly: true, disableMetadata: true
        }),
        signal: AbortSignal.timeout(5000)
      });
      if (cobaltRes.ok) {
        const cobaltData = await cobaltRes.json();
        if (cobaltData.url) return cobaltData.url;
      }
    } catch (_) {}

    return null;
  }

  /**
   * Schedule background prefetch for next 5 vibe-matched songs.
   */
  async function schedulePrefetch(seedQuery, seedTitle) {
    if (autoPlayFetching) return;
    autoPlayFetching = true;
    try {
      const vibeVideos = await fetchVibeVideoIds(seedTitle, seedQuery, 5);
      prefetchQueue = [];

      // Kick off audio extraction in background
      for (const vid of vibeVideos) {
        prefetchQueue.push(vid.ytId);
        // Pre-add to queue as placeholders
        queue.push({
          type: 'youtube_audio',
          source: 'ytmusic',
          title: vid.title,
          artist: vid.artist,
          ytId: vid.ytId,
          thumb: vid.thumb,
          isZeroxify: true,
          prefetched: false
        });

        // Background extract
        prefetchCache.set(vid.ytId, { url: null, status: 'pending' });
        extractYtAudio(vid.ytId).then(url => {
          if (url) {
            prefetchCache.set(vid.ytId, { url, status: 'done' });
            // Update queue item
            const qi = queue.find(q => q.ytId === vid.ytId);
            if (qi) { qi.prefetched = true; qi.prefetchedUrl = url; }
          } else {
            prefetchCache.set(vid.ytId, { url: null, status: 'error' });
          }
        });
      }
      renderQueue();
    } catch (e) {
      console.error('Prefetch error:', e);
    } finally {
      autoPlayFetching = false;
    }
  }

  /* ── 10. SPOTIFY API ENGINE ─────────────────────────────── */
  async function searchSpotifyAlt(query, targetResultsDiv) {
    if (!query) return;
    const divId  = targetResultsDiv || 'spSearchResults';
    const resDiv = document.getElementById(divId);
    if (!resDiv) return;

    resDiv.innerHTML = '<p class="mp-empty">⏳ Loading Exact Matches...</p>';
    if (episodesOverlaySp) episodesOverlaySp.classList.remove('hidden');

    try {
      const url = 'https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall?market=IN&country=IN';
      const res  = await fetch(url, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': 'spotify-web-api3.p.rapidapi.com',
          'Content-Type': 'application/json',
          'Accept-Language': 'en-IN,en;q=0.9'
        },
        body: JSON.stringify({ terms: query, limit: 15, country: 'IN', market: 'IN' })
      });

      const responseData = await res.json();
      const searchData   = responseData?.data?.searchV2 || responseData;
      let rawItems       = [];

      (searchData?.topResults?.items || searchData?.topResultsV2?.itemsV2 || []).forEach(item => rawItems.push({ ...item, isExactTopResult: true }));
      (searchData?.tracksV2?.items  || searchData?.tracks?.items    || []).forEach(item => rawItems.push(item));
      (searchData?.playlistsV2?.items||searchData?.playlists?.items || []).forEach(item => rawItems.push(item));
      (searchData?.albumsV2?.items  || searchData?.albums?.items    || []).forEach(item => rawItems.push(item));

      if (rawItems.length === 0) { resDiv.innerHTML = '<p class="mp-empty">❌ No results found.</p>'; return; }

      const seenUris = new Set();
      let cleanItems = [];

      rawItems.forEach(wrapper => {
        const item = wrapper?.item?.data || wrapper?.data || wrapper;
        if (!item || !item.uri || seenUris.has(item.uri)) return;
        seenUris.add(item.uri);

        const uriParts  = item.uri.split(':');
        const itemType  = uriParts[1];
        const itemId    = item.id || uriParts[2];
        const titleName = item.name || item.profile?.name || 'Unknown';
        let artistName  = 'Unknown';
        if (item.artists?.items?.[0]?.profile?.name)  artistName = item.artists.items[0].profile.name;
        else if (item.ownerV2?.data?.name)             artistName = item.ownerV2.data.name;
        else if (itemType === 'artist')                artistName = 'Artist Profile';

        let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
        if (item.albumOfTrack?.coverArt?.sources?.[0]?.url)     thumb = item.albumOfTrack.coverArt.sources[0].url;
        else if (item.coverArt?.sources?.[0]?.url)              thumb = item.coverArt.sources[0].url;
        else if (item.images?.items?.[0]?.sources?.[0]?.url)    thumb = item.images.items[0].sources[0].url;
        else if (item.visuals?.avatarImage?.sources?.[0]?.url)  thumb = item.visuals.avatarImage.sources[0].url;

        cleanItems.push({ titleName, artistName, itemType, itemId, thumb, isExactTopResult: wrapper.isExactTopResult });
      });

      const lowerQuery = query.toLowerCase();
      cleanItems.sort((a, b) => {
        const aT = a.titleName.toLowerCase(), bT = b.titleName.toLowerCase();
        if (aT === lowerQuery && bT !== lowerQuery) return -1;
        if (bT === lowerQuery && aT !== lowerQuery) return  1;
        const aC = aT.includes(lowerQuery), bC = bT.includes(lowerQuery);
        if (aC && !bC) return -1; if (bC && !aC) return 1;
        if (a.isExactTopResult && !b.isExactTopResult) return -1;
        if (b.isExactTopResult && !a.isExactTopResult) return  1;
        return 0;
      });

      renderSpotifyUI(cleanItems, resDiv, lowerQuery);
    } catch (e) {
      console.error('Spotify Search Error:', e);
      resDiv.innerHTML = '<p class="mp-empty">🚨 API Connection Error!</p>';
    }
  }

  function renderSpotifyUI(cleanItems, resDiv, lowerQuery = '') {
    resDiv.innerHTML = '';
    cleanItems.forEach((data, index) => {
      const typeLabel   = data.itemType === 'track' ? '' : ` <span style="font-size:9px;background:#e8436a;color:#fff;padding:2px 4px;border-radius:3px;margin-left:5px;">${data.itemType.toUpperCase()}</span>`;
      const imgRadius   = data.itemType === 'artist' ? '50%' : '4px';
      const isTopRender = index === 0 && lowerQuery && data.titleName.toLowerCase().includes(lowerQuery.split(' ')[0]);
      const topBadge    = (data.isExactTopResult || isTopRender)
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
        <span style="font-size:18px;padding:0 4px;color:#1db954">${data.itemType === 'track' ? '▶' : '📂'}</span>`;

      div.onclick = async () => {
        if (data.itemType === 'playlist') {
          showToast('📂 Loading Playlist...');
          const tracks = await fetchPlaylistTracks(data.itemId);
          renderSpotifyUI(tracks.map(t => ({
            titleName: t.title, artistName: t.artist,
            itemType: 'track', itemId: t.id, thumb: t.image
          })), resDiv, '');
        } else if (data.itemType === 'album') {
          showToast('📂 Loading Album...');
          const tracks = await fetchAlbumTracks(data.itemId);
          renderSpotifyUI(tracks.map(t => ({
            titleName: t.title, artistName: t.artist,
            itemType: 'track', itemId: t.id, thumb: t.image
          })), resDiv, '');
        } else if (data.itemType === 'artist') {
          showToast('👤 Artist Profiles cannot be played directly.');
        } else {
          queue = []; currentIdx = 0; seenTitles.clear();
          addToQueue({
            type: 'youtube_audio', source: 'spotify',
            title: data.titleName, artist: data.artistName,
            spId: data.itemId, thumb: data.thumb, isZeroxify: true
          });
          showToast('🎵 Playing Track!');
        }
      };
      resDiv.appendChild(div);
    });
  }

  async function fetchPlaylistTracks(playlistId) {
    try {
      const res  = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${playlistId}&offset=0&limit=100&market=IN`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const data = await res.json();
      return (data.items || []).filter(i => i.track && !i.track.is_local).map(i => ({
        id: i.track.id, title: i.track.name,
        artist: i.track.artists[0]?.name || 'Unknown',
        image: i.track.album?.images[0]?.url || ''
      }));
    } catch (e) { return []; }
  }

  async function fetchAlbumTracks(albumId) {
    try {
      const res  = await fetch(`https://${SP81_HOST}/album_tracks?id=${albumId}&market=IN`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const data = await res.json();
      const albumImg = data.album?.images?.[0]?.url || '';
      return (data.album?.tracks?.items || []).map(i => ({
        id: i.id, title: i.name,
        artist: i.artists[0]?.name || 'Unknown', image: albumImg
      }));
    } catch (e) { return []; }
  }

  async function fetchPremiumAudio(spId) {
    try {
      const res    = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const result = await res.json();
      return Array.isArray(result)
        ? (result[0]?.url || result[0]?.link)
        : (result.url || result.link || result.downloadUrl);
    } catch (_) { return null; }
  }

  /* ── 11. QUEUE & RENDERER ───────────────────────────────── */
  function addToQueue(item) {
    queue.push(item);
    renderQueue();
    playQueueItem(queue.length - 1);
  }

  function renderQueue() {
    if (!queueList) return;
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el        = document.createElement('div');
      const isActive  = i === currentIdx;
      const isPre     = item.prefetched ? ' ✅' : (prefetchCache.get(item.ytId)?.status === 'pending' ? ' ⏳' : '');
      el.className    = 'mp-queue-item' + (isActive ? ' playing' : '');
      let icon        = item.type === 'youtube_audio' ? '🎧' : (item.type === 'stream' ? '☁️' : '🎬');
      const upNext    = (!isActive && i === currentIdx + 1) ? '<span class="up-next-badge">UP NEXT</span>' : '';
      el.innerHTML    = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}${isPre}${upNext}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => {
        if (e.target.classList.contains('qi-del')) {
          queue.splice(i, 1);
          if (currentIdx >= queue.length) currentIdx = queue.length - 1;
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
    const isBlob = item.url && item.url.startsWith('blob:');
    if (synced && !isRemoteAction && !isBlob) broadcastSync({ action: 'change_song', item });
    renderMedia(item);
  }

  /* ── 12. RENDER MEDIA ───────────────────────────────────── */
  function renderMedia(item) {
    // Reset
    if (nativeAudio) {
      nativeAudio.style.display = 'none';
      nativeAudio.pause();
      nativeAudio.removeAttribute('src');
      nativeAudio.srcObject = null;
    }
    if (ytFrameWrap) ytFrameWrap.style.display = 'none';
    if (ytPlayer && isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    isPlaying = false; updatePlayBtn();

    if (item.type === 'youtube') {
      // ── Cinema mode ──
      activeType   = 'youtube';
      activeSource = 'youtube';
      if (spotifyMode) spotifyMode.classList.add('hidden');
      if (cinemaMode)  cinemaMode.classList.remove('hidden');
      if (ytFrameWrap) ytFrameWrap.style.display = 'block';
      if (isYtReady)   ytPlayer.loadVideoById(item.ytId);
      else             setTimeout(() => renderMedia(item), 500);
      setTrackInfo(item.title, 'YouTube Cinema Mode');
      setupMediaSession(item);

    } else if (item.type === 'youtube_audio') {
      // ── Audio mode (YT Music / Spotify source) ──
      activeType   = 'youtube_audio';
      activeSource = item.source || 'ytmusic';
      if (cinemaMode)  cinemaMode.classList.add('hidden');
      if (spotifyMode) spotifyMode.classList.remove('hidden');
      ensureVisualizer(item);
      setTrackInfo(item.title, '⏳ Fetching audio...');

      // Add to YTM history if from ytmusic
      if (item.source === 'ytmusic' || item.ytId) {
        const existing = ytmHistory.findIndex(h => h.ytId === item.ytId);
        if (existing === -1) ytmHistory.push(item);
        if (ytmHistory.length > 10) ytmHistory.shift();
      }

      playYtAudioItem(item);

    } else if (item.type === 'stream') {
      // ── Cloud / local stream ──
      activeType   = 'stream';
      activeSource = 'cloud';
      if (cinemaMode)  cinemaMode.classList.add('hidden');
      if (spotifyMode) spotifyMode.classList.remove('hidden');
      ensureVisualizer(item);
      setupMediaSession(item);
      nativeAudio.src = item.url;
      nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast('Tap ▶ to play'));
      setTrackInfo(item.title, '☁️ Cloud Audio');
    }
  }

  /**
   * Play a youtube_audio item:
   * - If prefetchedUrl available → instant play
   * - If ytId → extract via invidious
   * - If spId → use Spotify API
   */
  async function playYtAudioItem(item) {
    let audioUrl = null;

    // 1. Check prefetch cache (instant)
    if (item.ytId && prefetchCache.has(item.ytId)) {
      const cached = prefetchCache.get(item.ytId);
      if (cached.status === 'done' && cached.url) {
        audioUrl = cached.url;
      } else if (cached.status === 'pending') {
        // Wait for it (max 6s)
        setTrackInfo(item.title, '⚡ Loading prefetched audio...');
        audioUrl = await waitForPrefetch(item.ytId, 6000);
      }
    }

    // 2. Check item's own prefetchedUrl
    if (!audioUrl && item.prefetchedUrl) audioUrl = item.prefetchedUrl;

    // 3. Extract from ytId
    if (!audioUrl && item.ytId) {
      setTrackInfo(item.title, '🔍 Extracting audio...');
      audioUrl = await extractYtAudio(item.ytId);
    }

    // 4. Spotify API fallback
    if (!audioUrl && item.spId) {
      setTrackInfo(item.title, '🎧 Fetching Spotify audio...');
      audioUrl = await fetchPremiumAudio(item.spId);
    }

    if (audioUrl) {
      setTrackInfo(item.title, item.artist || 'ZeroX Audio');
      setupMediaSession(item);
      nativeAudio.src = audioUrl;
      nativeAudio.play()
        .then(() => { isPlaying = true; updatePlayBtn(); })
        .catch(() => showToast('Tap ▶ to play'));

      // Trigger prefetch for next songs if near end of queue
      if (autoPlayEnabled && item.source === 'ytmusic') {
        const remaining = queue.length - currentIdx - 1;
        if (remaining <= 2) {
          schedulePrefetch(currentVibeQuery || item.title, item.title);
        }
      }
    } else {
      setTrackInfo(item.title, '❌ Audio unavailable');
      showToast('⚠️ Could not load audio, skipping...');
      setTimeout(() => handleTrackEnd(), 2000);
    }
  }

  /**
   * Wait for a prefetch to complete (polls cache).
   */
  function waitForPrefetch(ytId, maxMs) {
    return new Promise(resolve => {
      const start    = Date.now();
      const interval = setInterval(() => {
        const cached = prefetchCache.get(ytId);
        if (!cached || cached.status !== 'pending' || Date.now() - start > maxMs) {
          clearInterval(interval);
          resolve(cached?.url || null);
        }
      }, 200);
    });
  }

  /* ── 13. VISUALIZER & MEDIA SESSION ────────────────────── */
  function ensureVisualizer(item) {
    if (!document.querySelector('.music-visualizer')) {
      const viz = document.createElement('div');
      viz.className = 'music-visualizer'; viz.id = 'visualizer';
      viz.innerHTML = '<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>';
      const vr = vinylRecord2 || vinylRecord;
      if (vr && vr.parentNode) vr.parentNode.insertBefore(viz, vr.nextSibling);
    }
    const thumb = item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg';
    const applyThumb = (el) => {
      if (!el) return;
      el.style.backgroundImage = `url('${thumb}')`;
      el.style.backgroundSize  = 'cover';
      el.style.backgroundPosition = 'center';
    };
    applyThumb(vinylRecord);
    applyThumb(vinylRecord2);
  }

  function setupMediaSession(item) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title, artist: item.artist || 'ZeroX Hub',
        artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', () => {
        if (activeType === 'youtube' && ytPlayer) ytPlayer.playVideo(); else nativeAudio.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (activeType === 'youtube' && ytPlayer) ytPlayer.pauseVideo(); else nativeAudio.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack',     playNext);
    }
  }

  /* ── 14. TRACK END & AUTO-PLAY LOGIC ───────────────────── */
  function handleTrackEnd() {
    if (!autoPlayEnabled) {
      isPlaying = false; updatePlayBtn();
      showToast('⏹ Auto-play is OFF');
      return;
    }

    // If there's a next song in queue → play it (instant if prefetched)
    if (currentIdx < queue.length - 1) {
      playQueueItem(currentIdx + 1);
      return;
    }

    // Queue exhausted
    // For ytmusic source: fetch more vibe songs
    if (activeSource === 'ytmusic' && currentVibeQuery) {
      showToast('🔁 Fetching more vibes...');
      fetchAndQueueMoreSongs();
    } else if (activeSource === 'spotify') {
      // For spotify: search YT for similar vibe
      const curItem = queue[currentIdx];
      if (curItem) {
        currentVibeQuery = curItem.title;
        showToast('🔁 Finding more tracks...');
        fetchAndQueueMoreSongs();
      }
    } else {
      showToast('✅ Queue ended');
    }
  }

  async function fetchAndQueueMoreSongs() {
    if (autoPlayFetching) return;
    autoPlayFetching = true;
    try {
      const vibeVideos = await fetchVibeVideoIds(currentVibeQuery, currentVibeQuery, 5);
      if (vibeVideos.length === 0) { showToast('No more tracks found'); autoPlayFetching = false; return; }

      for (const vid of vibeVideos) {
        const newItem = {
          type: 'youtube_audio', source: 'ytmusic',
          title: vid.title, artist: vid.artist,
          ytId: vid.ytId, thumb: vid.thumb,
          isZeroxify: true, prefetched: false
        };
        queue.push(newItem);
        // Background prefetch
        prefetchCache.set(vid.ytId, { url: null, status: 'pending' });
        extractYtAudio(vid.ytId).then(url => {
          if (url) {
            prefetchCache.set(vid.ytId, { url, status: 'done' });
            const qi = queue.find(q => q.ytId === vid.ytId);
            if (qi) { qi.prefetched = true; qi.prefetchedUrl = url; }
          } else {
            prefetchCache.set(vid.ytId, { url: null, status: 'error' });
          }
        });
      }
      renderQueue();
      // Play the first newly added song
      playQueueItem(currentIdx + 1);
    } catch (e) {
      console.error('fetchAndQueueMoreSongs error:', e);
      showToast('❌ Could not fetch more tracks');
    } finally {
      autoPlayFetching = false;
    }
  }

  /* ── 15. PLAYBACK CONTROLS ──────────────────────────────── */
  function playNext() {
    if (currentIdx < queue.length - 1) playQueueItem(currentIdx + 1);
    else if (autoPlayEnabled) handleTrackEnd();
    else showToast('End of queue.');
  }

  function playPrev() {
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
    else showToast('This is the first song!');
  }

  mpNexts.forEach(b => b && b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b && b.addEventListener('click', playPrev));

  mpPlays.forEach(btn => btn && btn.addEventListener('click', () => {
    if (activeType === 'stream' || activeType === 'youtube_audio') {
      if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(() => {});
    } else if (activeType === 'youtube' && ytPlayer) {
      if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  }));

  function updatePlayBtn() {
    mpPlays.forEach(btn => { if (btn) btn.textContent = isPlaying ? '⏸' : '▶'; });
    const vis = document.getElementById('visualizer') || document.querySelector('.music-visualizer');
    const vr2 = vinylRecord2;
    if (isPlaying && (activeType === 'stream' || activeType === 'youtube_audio')) {
      if (vinylRecord) vinylRecord.classList.add('playing');
      if (vr2)         vr2.classList.add('playing');
      if (vis)         vis.classList.add('playing');
    } else {
      if (vinylRecord) vinylRecord.classList.remove('playing');
      if (vr2)         vr2.classList.remove('playing');
      if (vis)         vis.classList.remove('playing');
    }
  }

  function setTrackInfo(title, sub) {
    if (musicTitle)  musicTitle.textContent  = title;
    if (musicArtist) musicArtist.textContent = sub;
    if (miniTitle)   miniTitle.textContent   = `${title} • ${sub}`;
  }

  /* ── 16. AUDIO EVENT LISTENERS ──────────────────────────── */
  if (nativeAudio) {
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
    nativeAudio.addEventListener('ended', handleTrackEnd);
  }

  /* ── 17. AUTO-PLAY TOGGLE ───────────────────────────────── */
  const autoPlayBtn = document.getElementById('autoPlayToggle');
  if (autoPlayBtn) {
    if (autoPlayEnabled) autoPlayBtn.classList.add('active');
    autoPlayBtn.onclick = () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayBtn.classList.toggle('active', autoPlayEnabled);
      showToast(autoPlayEnabled ? '🔁 Auto-play: ON ✨' : '⏹ Auto-play: OFF');
    };
  }

  /* ── 18. SYNC NETWORK ───────────────────────────────────── */
  if (mpSyncBtn) mpSyncBtn.addEventListener('click', () => {
    synced = true;
    if (mpSyncBadge) { mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced'); }
    mpSyncBtn.style.display = 'none';
    if (mpSyncInfo) mpSyncInfo.style.display = 'flex';
    broadcastSync({ action: 'request_sync' });
    showToast('🔗 Sync Network Active');
  });

  if (mpUnsyncBtn) mpUnsyncBtn.addEventListener('click', () => {
    synced = false;
    if (mpSyncBadge) { mpSyncBadge.textContent = '🔴 Solo'; mpSyncBadge.classList.remove('synced'); }
    if (mpSyncBtn) mpSyncBtn.style.display = 'block';
    if (mpSyncInfo) mpSyncInfo.style.display = 'none';
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
          if (activeType === 'youtube' && ytPlayer && isYtReady) curTime = ytPlayer.getCurrentTime();
          else if (nativeAudio) curTime = nativeAudio.currentTime;
          broadcastSync({ action: isPlaying ? 'play' : 'pause', time: curTime });
        }, 1500);
      } return;
    }
    if (!synced) return;
    setRemoteAction();
    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.title === data.item.title);
      if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
      else             queue[idx] = data.item;
      currentIdx = idx; renderQueue(); renderMedia(queue[idx]); return;
    }
    if (activeType === 'youtube' && ytPlayer && isYtReady) {
      if (data.action === 'play')  { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek')  { ytPlayer.seekTo(data.time, true); }
    } else if (nativeAudio) {
      if (data.action === 'play')  { if (Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time; nativeAudio.play().catch(() => {}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek')  { nativeAudio.currentTime = data.time; }
    }
  };

  /* ── 19. SPOTIFY EVENT LISTENERS ───────────────────────── */
  if (spInput) spInput.addEventListener('keydown', e => { if (e.key === 'Enter' && spSearchSongBtn) spSearchSongBtn.click(); });
  if (spSearchSongBtn) spSearchSongBtn.onclick = () => {
    searchSpotifyAlt(spInput.value.trim(), 'spSearchResults');
    spInput.value = '';
  };
  if (spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = async () => {
    const id = spInput.value.trim();
    if (!id) return;
    showToast('📂 Fetching Playlist...');
    const tracks = await fetchPlaylistTracks(id);
    renderSpotifyUI(tracks.map(t => ({
      titleName: t.title, artistName: t.artist,
      itemType: 'track', itemId: t.id, thumb: t.image
    })), spSearchResults, '');
    spInput.value = '';
  };

  /* ── 20. FULLSCREEN STATE ───────────────────────────────── */
  function toggleFullscreenState() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
  }
  document.addEventListener('fullscreenchange', toggleFullscreenState);
  document.addEventListener('webkitfullscreenchange', toggleFullscreenState);

  /* ── INIT ───────────────────────────────────────────────── */
  renderQueue();
  console.log('%c ZeroX Hub PRO 3.2 Loaded ✅', 'color:#E8436A;font-weight:bold;font-size:14px;');

})();
