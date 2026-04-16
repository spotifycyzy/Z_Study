/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js  UPGRADED
   ✅ All original features preserved
   🎵 NEW: YT Music Tab — search → extract → play (no iframe)
   ⚡ NEW: Pre-fetch engine — zero-gap autoplay
   🔁 NEW: Auto-play toggle (id=autoPlayToggle)
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ── 1. DOM ELEMENTS ─────────────────────────────────── */
  const panel          = document.getElementById('zxPanel');
  const handle         = document.getElementById('zxHandle');
  const closeHandle    = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn');

  const nativeAudio  = document.getElementById('nativeAudio');
  const ytFrameWrap  = document.getElementById('ytFrameWrap');

  const cinemaMode   = document.getElementById('cinemaMode');
  const spotifyMode  = document.getElementById('spotifyMode');
  const vinylRecord  = document.getElementById('vinylRecord');
  const musicTitle   = document.getElementById('musicTitle');
  const musicArtist  = document.getElementById('musicArtist');
  const miniTitle    = document.getElementById('miniTitle');

  const mpPlays      = document.querySelectorAll('.mp-play');
  const mpPrevs      = [document.getElementById('miniPrev')];
  const mpNexts      = [document.getElementById('miniNext')];

  const urlInput     = document.getElementById('urlInput');
  const urlAddBtn    = document.getElementById('urlAddBtn');
  const fileInput    = document.getElementById('fileInput');

  const ytInput      = document.getElementById('ytInput');
  const ytAddBtn     = document.getElementById('ytAddBtn');

  const spInput      = document.getElementById('spInput');
  const spSearchSongBtn      = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn  = document.getElementById('spSearchPlaylistBtn');
  const queueList    = document.getElementById('queueList');

  const toggleListBtnUrl  = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt   = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt  = document.getElementById('episodesOverlayYt');
  const ytSearchResults    = document.getElementById('ytSearchResults');
  const toggleListBtnSp   = document.getElementById('toggleListBtnSp');
  const episodesOverlaySp  = document.getElementById('episodesOverlaySp');
  const spSearchResults    = document.getElementById('spSearchResults');

  const mpSyncBadge  = document.getElementById('mpSyncBadge');
  const mpSyncBtn    = document.getElementById('mpSyncBtn');
  const mpSyncInfo   = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn  = document.getElementById('mpUnsyncBtn');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ── 2. API CONFIG ───────────────────────────────────── */
  const RAPID_API_KEY  = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST      = 'spotify81.p.rapidapi.com';
  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  /* ── 3. STATE ─────────────────────────────────────────── */
  let queue           = [];
  let currentIdx      = 0;
  let synced          = false;
  let activeType      = 'none';
  let isPlaying       = false;
  let ytPlayer        = null;
  let isYtReady       = false;
  let isRemoteAction  = false;
  let autoPlayEnabled = true;
  let remoteTimer     = null;

  // Pre-fetch state
  let prefetchedTracks  = [];   // [{item, audioUrl, status}]
  let prefetchInProgress = false;
  const prefetchCache   = new Map(); // ytId/spId → audioUrl
  const playedTitles    = [];

  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ── 4. PANEL UI ENGINE ──────────────────────────────── */
  let startY = 0, isPanelOpen = false;
  function openPanel()  { if (isPanelOpen) return; isPanelOpen = true;  panel.classList.add('zx-open');    document.body.style.overflow = 'hidden'; if (panelToggleBtn) panelToggleBtn.classList.add('active'); }
  function closePanel() { if (!isPanelOpen) return; isPanelOpen = false; panel.classList.remove('zx-open'); document.body.style.overflow = '';       if (panelToggleBtn) panelToggleBtn.classList.remove('active'); }

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

  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const tc = document.getElementById('tab-' + tab.dataset.tab);
      if (tc) tc.classList.add('active');
    });
  });

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  if (toggleListBtnUrl) toggleListBtnUrl.addEventListener('click', () => episodesOverlayUrl.classList.toggle('hidden'));
  if (toggleListBtnYt)  toggleListBtnYt.addEventListener('click',  () => episodesOverlayYt.classList.toggle('hidden'));
  if (toggleListBtnSp)  toggleListBtnSp.addEventListener('click',  () => episodesOverlaySp.classList.toggle('hidden'));

  /* ── 5. YOUTUBE IFRAME ENGINE (Cinema Mode) ──────────── */
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = function () {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: () => { isYtReady = true; },
        onStateChange: onPlayerStateChange,
      },
    });
  };

  function onPlayerStateChange(event) {
    if (!synced || isRemoteAction) {
      if (event.data === YT.PlayerState.PLAYING) { isPlaying = true;  updatePlayBtn(); }
      if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); }
      return;
    }
    const time = ytPlayer.getCurrentTime();
    if      (event.data === YT.PlayerState.PLAYING) { isPlaying = true;  updatePlayBtn(); broadcastSync({ action: 'play',  time }); }
    else if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time }); }
    else if (event.data === YT.PlayerState.ENDED)   { playNext(); }
  }

  /* ── 6. YOUTUBE SEARCH (Cinema / normal YT tab) ──────── */
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
        if (!data.items || !data.items.length) { resDiv.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
        data.items.forEach(vid => {
          const div = document.createElement('div');
          div.className = 'yt-search-item';
          div.innerHTML = `<img src="${vid.snippet.thumbnails.medium.url}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${vid.snippet.title}</div><div class="yt-search-sub">${vid.snippet.channelTitle}</div></div><span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>`;
          div.onclick = () => {
            queue = []; currentIdx = 0;
            addToQueue({ type: mediaType, title: vid.snippet.title, ytId: vid.id.videoId, thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url });
            showToast('🎵 Playing!');
          };
          resDiv.appendChild(div);
        });
      })
      .catch(() => { resDiv.innerHTML = '<p class="mp-empty">Search error.</p>'; });
  }

  if (ytAddBtn) ytAddBtn.onclick = () => {
    const val = ytInput.value.trim();
    if (isYouTubeUrl(val)) { loadYouTube(val); ytInput.value = ''; return; }
    searchYouTube(val, 'ytSearchResults', 'youtube');
    ytInput.value = '';
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
    queue = []; currentIdx = 0;
    addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function loadYouTube(url) {
    const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    queue = []; currentIdx = 0;
    addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id });
  }

  /* ── 7. SPOTIFY ENGINE ───────────────────────────────── */
  async function searchSpotifyAlt(query, targetResultsDiv) {
    if (!query) return;
    const resDiv = document.getElementById(targetResultsDiv || 'spSearchResults');
    if (!resDiv) return;
    resDiv.innerHTML = '<p class="mp-empty">⏳ Loading...</p>';
    if (episodesOverlaySp) episodesOverlaySp.classList.remove('hidden');

    try {
      const res = await fetch('https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall?market=IN&country=IN', {
        method: 'POST',
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'spotify-web-api3.p.rapidapi.com', 'Content-Type': 'application/json', 'Accept-Language': 'en-IN,en;q=0.9,hi-IN;q=0.8,hi;q=0.7' },
        body: JSON.stringify({ terms: query, limit: 15, country: 'IN', market: 'IN' }),
      });
      const responseData = await res.json();
      const searchData = responseData?.data?.searchV2 || responseData;
      let rawItems = [];

      (searchData?.topResults?.items || searchData?.topResultsV2?.itemsV2 || []).forEach(i => rawItems.push({ ...i, isExactTopResult: true }));
      (searchData?.tracksV2?.items || searchData?.tracks?.items || []).forEach(i => rawItems.push(i));
      (searchData?.playlistsV2?.items || searchData?.playlists?.items || []).forEach(i => rawItems.push(i));
      (searchData?.albumsV2?.items || searchData?.albums?.items || []).forEach(i => rawItems.push(i));

      if (!rawItems.length) { resDiv.innerHTML = '<p class="mp-empty">❌ No results.</p>'; return; }

      const seenUris = new Set();
      const cleanItems = [];

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

      renderSpotifyUI(cleanItems, resDiv, lq);
    } catch (e) {
      resDiv.innerHTML = '<p class="mp-empty">🚨 API Error.</p>';
    }
  }

  function renderSpotifyUI(cleanItems, resDiv, lq) {
    resDiv.innerHTML = '';
    cleanItems.forEach((data, idx) => {
      const typeLabel = data.itemType === 'track' ? '' : ` <span style="font-size:9px;background:#e8436a;color:#fff;padding:2px 4px;border-radius:3px;margin-left:5px">${data.itemType.toUpperCase()}</span>`;
      const imgRadius = data.itemType === 'artist' ? '50%' : '4px';
      const isTop = (data.isExactTopResult || (idx === 0 && lq && data.titleName.toLowerCase().includes(lq.split(' ')[0])));
      const badge = isTop ? '<div style="font-size:10px;color:#1db954;font-weight:bold;margin-bottom:3px">🏆 BEST MATCH</div>' : '';
      const div = document.createElement('div');
      div.className = 'yt-search-item';
      div.innerHTML = `<img src="${data.thumb}" class="yt-search-thumb" style="border-radius:${imgRadius}"/><div class="yt-search-info">${badge}<div class="yt-search-title">${data.titleName}${typeLabel}</div><div class="yt-search-sub">${data.artistName}</div></div><span style="font-size:18px;padding:0 4px;color:#1db954">${data.itemType === 'track' ? '▶' : '📂'}</span>`;
      div.onclick = async () => {
        if (data.itemType === 'playlist') {
          showToast('📂 Loading Playlist...');
          const tracks = await fetchPlaylistTracks(data.itemId);
          renderSpotifyUI(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image })), resDiv, '');
        } else if (data.itemType === 'album') {
          showToast('📂 Loading Album...');
          const tracks = await fetchAlbumTracks(data.itemId);
          renderSpotifyUI(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image })), resDiv, '');
        } else if (data.itemType === 'artist') {
          showToast('👤 Artist cannot be played directly.');
        } else {
          queue = []; currentIdx = 0;
          addToQueue({ type: 'youtube_audio', title: data.titleName, artist: data.artistName, spId: data.itemId, thumb: data.thumb });
          showToast('🎵 Playing!');
        }
      };
      resDiv.appendChild(div);
    });
  }

  async function fetchPlaylistTracks(id) {
    try {
      const res  = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${id}&offset=0&limit=100&market=IN`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const data = await res.json();
      return (data.items || []).filter(i => i.track && !i.track.is_local).map(i => ({ id: i.track.id, title: i.track.name, artist: i.track.artists[0]?.name || 'Unknown', image: i.track.album?.images[0]?.url || '' }));
    } catch { return []; }
  }

  async function fetchAlbumTracks(id) {
    try {
      const res  = await fetch(`https://${SP81_HOST}/album_tracks?id=${id}&market=IN`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const data = await res.json();
      const img  = data.album?.images?.[0]?.url || '';
      return (data.album?.tracks?.items || []).map(i => ({ id: i.id, title: i.name, artist: i.artists[0]?.name || 'Unknown', image: img }));
    } catch { return []; }
  }

  async function fetchPremiumAudio(spId) {
    try {
      const res    = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const result = await res.json();
      return Array.isArray(result) ? (result[0]?.url || result[0]?.link || null) : (result.url || result.link || result.downloadUrl || null);
    } catch { return null; }
  }

  /* ── 8. YT MUSIC AUDIO EXTRACTORS ────────────────────── */
  async function fetchYouTubeAudio(ytId) {
    // Extractor 1: ytstream
    try {
      const res  = await fetch(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com' },
      });
      const data = await res.json();
      if (data?.formats) {
        const audioFmts = Object.values(data.formats)
          .filter(f => f.mimeType && (f.mimeType.includes('audio') || f.mimeType.includes('m4a')))
          .sort((a, b) => (parseInt(b.audioBitrate) || 0) - (parseInt(a.audioBitrate) || 0));
        if (audioFmts[0]?.url) return audioFmts[0].url;
        const any = Object.values(data.formats)[0];
        if (any?.url) return any.url;
      }
      if (data?.url) return data.url;
    } catch { /* fall through */ }

    // Extractor 2: youtube-mp36
    try {
      const res  = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${ytId}`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com' },
      });
      const data = await res.json();
      if (data?.link || data?.url) return data.link || data.url;
    } catch { /* failed */ }

    return null;
  }

  /* ── 9. YT MUSIC SECTION (NEW — plays audio, not iframe) ─ */
  (function initYTMusicSection() {
    const section = document.getElementById('tab-ytmusic');
    if (!section) return;

    // State
    let ytmSearching = false;
    let ytmCurrentItem = null;

    // DOM refs inside section
    const ytmInput       = document.getElementById('ytmInput');
    const ytmSearchBtn   = document.getElementById('ytmSearchBtn');
    const ytmNowPlaying  = document.getElementById('ytmNowPlaying');
    const ytmAlbumArt    = document.getElementById('ytmAlbumArt');
    const ytmTrackTitle  = document.getElementById('ytmTrackTitle');
    const ytmTrackArtist = document.getElementById('ytmTrackArtist');
    const ytmViz         = document.getElementById('ytmViz');
    const ytmPrefetchStatus = document.getElementById('ytmPrefetchStatus');
    const ytmUpNextList  = document.getElementById('ytmUpNextList');
    const ytmEmptyState  = document.getElementById('ytmEmptyState');

    if (!ytmInput || !ytmSearchBtn) return;

    async function ytmSearch() {
      const q = ytmInput.value.trim(); if (!q || ytmSearching) return;
      ytmSearching = true;
      ytmInput.value = '';
      ytmSearchBtn.textContent = '⏳';
      if (ytmEmptyState) ytmEmptyState.innerHTML = '<span class="ytm-spinner"></span> Finding audio…';

      try {
        // Search YT for "q official audio"
        const res  = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(q + ' official audio')}&type=video&key=${YOUTUBE_API_KEY}`);
        const data = await res.json();
        const items = data.items || [];
        if (!items.length) { showToast('No results found.'); ytmSearching = false; ytmSearchBtn.textContent = '▶ Play'; return; }

        // Try top result first, fall back to second
        let audioUrl = null;
        let picked   = null;
        for (const vid of items.slice(0, 2)) {
          const id = vid.id.videoId;
          audioUrl = prefetchCache.get(id) || await fetchYouTubeAudio(id);
          if (audioUrl) {
            prefetchCache.set(id, audioUrl);
            picked = { type: 'youtube_audio', title: vid.snippet.title, artist: vid.snippet.channelTitle, ytId: id, thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url, sourceType: 'ytmusic', vibe: q };
            break;
          }
        }

        if (!audioUrl || !picked) { showToast('Could not extract audio. Try another song.'); ytmSearching = false; ytmSearchBtn.textContent = '▶ Play'; return; }

        // Add to main queue and play
        queue = []; currentIdx = 0;
        addToQueue(picked);
        ytmCurrentItem = picked;
        renderYTMNowPlaying(picked);
        if (ytmEmptyState) ytmEmptyState.style.display = 'none';
        showToast('🎵 Playing!');
      } catch (e) {
        showToast('Search failed. Check connection.');
      }
      ytmSearching = false;
      ytmSearchBtn.textContent = '▶ Play';
    }

    ytmSearchBtn.addEventListener('click', ytmSearch);
    ytmInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytmSearch(); });

    function renderYTMNowPlaying(item) {
      if (!ytmNowPlaying) return;
      ytmNowPlaying.style.display = 'flex';
      if (ytmAlbumArt)    { ytmAlbumArt.src = item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg'; ytmAlbumArt.onerror = () => { ytmAlbumArt.src = 'https://i.imgur.com/8Q5FqWj.jpeg'; }; }
      if (ytmTrackTitle)  ytmTrackTitle.textContent  = item.title;
      if (ytmTrackArtist) ytmTrackArtist.textContent = item.artist || '';
    }

    // Expose so renderMedia can update YTM now-playing card
    window._updateYTMCard = function(item) {
      if (item && item.sourceType === 'ytmusic') {
        ytmCurrentItem = item;
        renderYTMNowPlaying(item);
      }
    };

    // Expose status updater for prefetch
    window._setYTMStatus = function(msg) {
      if (ytmPrefetchStatus) {
        ytmPrefetchStatus.textContent = msg;
        ytmPrefetchStatus.style.display = msg ? 'block' : 'none';
      }
    };

    // Expose up-next renderer
    window._renderYTMUpNext = function(tracks) {
      if (!ytmUpNextList) return;
      ytmUpNextList.innerHTML = '';
      if (!tracks || !tracks.length) { ytmUpNextList.style.display = 'none'; return; }
      ytmUpNextList.style.display = 'block';
      tracks.forEach((t, i) => {
        const div = document.createElement('div');
        div.className = 'ytm-next-item' + (t.status === 'ready' ? ' prefetched' : t.status === 'loading' ? ' loading-prefetch' : '');
        div.innerHTML = `<img src="${t.item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg'}" onerror="this.src='https://i.imgur.com/8Q5FqWj.jpeg'"/><div class="next-info"><div class="next-title">${t.item.title}</div><div class="next-artist">${t.item.artist || ''}</div></div>`;
        div.addEventListener('click', () => playPrefetchedTrack(t));
        ytmUpNextList.appendChild(div);
      });
    };
  })();

  /* ── 10. PRE-FETCH VIBE ENGINE ───────────────────────── */
  async function searchVibeYoutube(title, artist, played, count) {
    const cleanTitle  = title.replace(/\(.*?\)/g,'').replace(/\[.*?\]/g,'').replace(/official|lyrics|audio|video/gi,'').trim();
    const cleanArtist = artist.replace(/\(.*?\)/g,'').trim();
    const queries = [
      cleanArtist + ' ' + cleanTitle + ' similar songs',
      'songs like ' + cleanTitle + ' mix playlist',
      cleanArtist + ' songs playlist hits',
    ];
    const seen    = new Set(played.map(t => t.toLowerCase().slice(0,30)));
    const results = [];
    for (const q of queries) {
      if (results.length >= count) break;
      try {
        const res  = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(q)}&type=video&key=${YOUTUBE_API_KEY}`);
        const data = await res.json();
        for (const vid of (data.items || [])) {
          if (results.length >= count) break;
          const key = vid.snippet.title.toLowerCase().slice(0,30);
          if (seen.has(key)) continue;
          const isDup = played.some(pt => isSameSong(pt, vid.snippet.title));
          if (isDup) continue;
          seen.add(key);
          results.push({ id: vid.id.videoId, title: vid.snippet.title, channelTitle: vid.snippet.channelTitle, thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium?.url || '' });
        }
      } catch { /* continue */ }
    }
    return results.slice(0, count);
  }

  function isSameSong(t1, t2) {
    const n = s => s.toLowerCase().replace(/\(.*?\)/g,'').replace(/\[.*?\]/g,'').replace(/official|lyrics|audio|video|hd|hq/gi,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
    const a = n(t1), b = n(t2);
    if (a === b) return true;
    if (a.length > 5 && b.length > 5) { const sh = a.length < b.length ? a : b, lo = a.length < b.length ? b : a; if (lo.includes(sh)) return true; }
    return false;
  }

  async function triggerPrefetch(item) {
    if (!autoPlayEnabled) return;
    if (prefetchInProgress) return;
    prefetchInProgress = true;
    prefetchedTracks = [];
    if (window._renderYTMUpNext) window._renderYTMUpNext([]);
    if (window._setYTMStatus)    window._setYTMStatus('⏳ Prefetching next songs…');

    try {
      const vibes = await searchVibeYoutube(item.title, item.artist || '', playedTitles, 6);
      if (!vibes.length) { if (window._setYTMStatus) window._setYTMStatus(''); prefetchInProgress = false; return; }

      const pfItems = vibes.map(r => ({
        item: { type: 'youtube_audio', title: r.title, artist: r.channelTitle, ytId: r.id, thumb: r.thumb, sourceType: item.sourceType || 'ytmusic', vibe: item.title + ' ' + (item.artist || '') },
        audioUrl: null,
        status: 'loading',
      }));

      prefetchedTracks = pfItems;
      if (window._renderYTMUpNext) window._renderYTMUpNext([...pfItems]);

      // Fetch audio URLs in background
      for (let i = 0; i < pfItems.length; i++) {
        const pf = pfItems[i];
        try {
          const url = prefetchCache.get(pf.item.ytId) || await fetchYouTubeAudio(pf.item.ytId);
          if (url) {
            prefetchCache.set(pf.item.ytId, url);
            pf.audioUrl = url;
            pf.status   = 'ready';
          } else {
            pf.status = 'failed';
          }
        } catch { pf.status = 'failed'; }
        if (window._renderYTMUpNext) window._renderYTMUpNext([...prefetchedTracks]);
        await new Promise(r => setTimeout(r, 500));
      }

      const ready = prefetchedTracks.filter(p => p.status === 'ready').length;
      if (window._setYTMStatus) window._setYTMStatus(ready > 0 ? '✅ ' + ready + ' songs ready' : '');
      setTimeout(() => { if (window._setYTMStatus) window._setYTMStatus(''); }, 5000);
    } catch { if (window._setYTMStatus) window._setYTMStatus(''); }
    prefetchInProgress = false;
  }

  function playPrefetchedTrack(pf) {
    prefetchedTracks = prefetchedTracks.filter(p => p.item.ytId !== pf.item.ytId);
    if (window._renderYTMUpNext) window._renderYTMUpNext([...prefetchedTracks]);
    const item = pf.item;
    queue.push(item);
    const newIdx = queue.length - 1;
    currentIdx = newIdx;
    renderQueue();
    if (pf.status === 'ready' && pf.audioUrl) {
      renderMediaDirect(item, pf.audioUrl);
    } else {
      renderMedia(item);
    }
    triggerPrefetch(item);
  }

  /* ── 11. QUEUE & RENDERER ─────────────────────────────── */
  function addToQueue(item) { queue.push(item); renderQueue(); playQueueItem(queue.length - 1); }

  function renderQueue() {
    if (!queue.length) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el   = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      const icon = item.type === 'youtube_audio' ? (item.sourceType === 'ytmusic' ? '🎵' : '🎧') : item.type === 'stream' ? '☁️' : '🎬';
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = e => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); renderQueue(); return; } playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i; renderQueue();
    const item   = queue[i];
    const isBlob = item.url && item.url.startsWith('blob:');
    if (synced && !isRemoteAction && !isBlob) broadcastSync({ action: 'change_song', item });
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
      if (autoPlayEnabled) triggerPrefetch(item);
    }
    else if (item.type === 'youtube_audio') {
      activeType = 'youtube_audio'; cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
      ensureVisualizer(item);
      setTrackInfo(item.title, 'Loading audio…');
      if (!playedTitles.includes(item.title)) playedTitles.push(item.title);
      if (window._updateYTMCard) window._updateYTMCard(item);

      // Check cache first
      const cacheKey = item.ytId || item.spId || item.title;
      if (prefetchCache.has(cacheKey)) {
        const url = prefetchCache.get(cacheKey);
        renderMediaDirect(item, url);
        if (autoPlayEnabled) triggerPrefetch(item);
        return;
      }

      // Fetch audio
      const fetchAudio = item.spId ? fetchPremiumAudio(item.spId) : (item.ytId ? fetchYouTubeAudio(item.ytId) : Promise.resolve(null));
      fetchAudio.then(audioLink => {
        if (audioLink) {
          prefetchCache.set(cacheKey, audioLink);
          renderMediaDirect(item, audioLink);
        } else {
          setTrackInfo(item.title, 'Audio Fetch Failed');
          showToast('Could not fetch audio.');
          setTimeout(playNext, 2000);
        }
        if (autoPlayEnabled) triggerPrefetch(item);
      });
    }
    else if (item.type === 'stream') {
      activeType = 'stream'; cinemaMode.classList.add('hidden'); spotifyMode.classList.remove('hidden');
      ensureVisualizer(item); setupMediaSession(item);
      nativeAudio.src = item.url;
      nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast('Tap ▶ to play'));
      setTrackInfo(item.title, '☁️ Cloud Audio');
      if (autoPlayEnabled) triggerPrefetch(item);
    }
  }

  function renderMediaDirect(item, audioUrl) {
    nativeAudio.src = audioUrl;
    nativeAudio.style.display = 'none'; // hidden — audio only
    nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => showToast('Tap ▶ to play'));
    setTrackInfo(item.title, item.artist || 'ZeroX Audio');
    setupMediaSession(item);
    ensureVisualizer(item);
  }

  function ensureVisualizer(item) {
    if (!document.querySelector('.music-visualizer')) {
      const viz = document.createElement('div');
      viz.className = 'music-visualizer'; viz.id = 'visualizer';
      viz.innerHTML = '<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>';
      vinylRecord.parentNode.insertBefore(viz, vinylRecord.nextSibling);
    }
    vinylRecord.style.backgroundImage    = `url('${item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg'}')`;
    vinylRecord.style.backgroundSize     = 'cover';
    vinylRecord.style.backgroundPosition = 'center';
  }

  function setupMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   item.title,
      artist:  item.artist || 'ZeroX Hub',
      artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }],
    });
    navigator.mediaSession.setActionHandler('play',           () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.playVideo(); else nativeAudio.play(); });
    navigator.mediaSession.setActionHandler('pause',          () => { if (activeType === 'youtube' && ytPlayer) ytPlayer.pauseVideo(); else nativeAudio.pause(); });
    navigator.mediaSession.setActionHandler('previoustrack',  playPrev);
    navigator.mediaSession.setActionHandler('nexttrack',      playNext);
  }

  /* ── 12. PLAYBACK CONTROLS ────────────────────────────── */
  function playNext() {
    if (currentIdx < queue.length - 1) { playQueueItem(currentIdx + 1); return; }
    // Use prefetched tracks
    if (autoPlayEnabled && prefetchedTracks.length > 0) {
      const best = prefetchedTracks.find(p => p.status === 'ready') || prefetchedTracks[0];
      if (best) { playPrefetchedTrack(best); return; }
    }
    showToast('End of queue.');
  }

  function playPrev() {
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
    else showToast('This is the first song!');
  }

  mpNexts.forEach(b => b.addEventListener('click', playNext));
  mpPrevs.forEach(b => b.addEventListener('click', playPrev));

  /* ── 13. CONTROLLER & SYNC ────────────────────────────── */
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
    if (activeType === 'stream' || activeType === 'youtube_audio') { if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(() => {}); }
    else if (activeType === 'youtube' && ytPlayer)               { if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo(); }
  }));

  function updatePlayBtn() {
    mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶');
    const vis = document.getElementById('visualizer') || document.querySelector('.music-visualizer');
    if (isPlaying && (activeType === 'stream' || activeType === 'youtube_audio')) { vinylRecord.classList.add('playing'); if (vis) vis.classList.add('playing'); }
    else { vinylRecord.classList.remove('playing'); if (vis) vis.classList.remove('playing'); }
    // Update YTM card visualizer
    const ytmv = document.getElementById('ytmViz');
    if (ytmv) { isPlaying ? ytmv.classList.add('playing') : ytmv.classList.remove('playing'); }
  }

  function setTrackInfo(title, sub) {
    musicTitle.textContent = title;
    musicArtist.textContent = sub;
    miniTitle.textContent = title + ' • ' + sub;
  }

  nativeAudio.addEventListener('play',   () => { isPlaying = true;  updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play',  time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('pause',  () => { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('seeked', () => { if (synced && !isRemoteAction) broadcastSync({ action: 'seek', time: nativeAudio.currentTime }); });
  nativeAudio.addEventListener('ended',  playNext);

  if (mpSyncBtn) mpSyncBtn.addEventListener('click', () => {
    synced = true; mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncBtn.style.display = 'none'; mpSyncInfo.style.display = 'flex';
    broadcastSync({ action: 'request_sync' }); showToast('🔗 Sync Active');
  });
  if (mpUnsyncBtn) mpUnsyncBtn.addEventListener('click', () => {
    synced = false; mpSyncBadge.textContent = '🔴 Solo'; mpSyncBadge.classList.remove('synced');
    mpSyncBtn.style.display = 'block'; mpSyncInfo.style.display = 'none';
  });

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  window._zxReceiveSync = function (data) {
    if (data.action === 'request_sync') {
      const cur = queue[currentIdx]; const isBlob = cur && cur.url && cur.url.startsWith('blob:');
      if (synced && cur && !isBlob) {
        broadcastSync({ action: 'change_song', item: cur });
        setTimeout(() => {
          let t = 0;
          if (activeType === 'youtube' && ytPlayer && isYtReady) t = ytPlayer.getCurrentTime();
          else if (activeType === 'stream' || activeType === 'youtube_audio') t = nativeAudio.currentTime;
          broadcastSync({ action: isPlaying ? 'play' : 'pause', time: t });
        }, 1500);
      }
      return;
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
    } else if (activeType === 'stream' || activeType === 'youtube_audio') {
      if (data.action === 'play')  { if (Math.abs(nativeAudio.currentTime - data.time) > 1) nativeAudio.currentTime = data.time; nativeAudio.play().catch(() => {}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek')  { nativeAudio.currentTime = data.time; }
    }
  };

  /* ── 14. SPOTIFY LISTENERS ────────────────────────────── */
  if (spInput) spInput.addEventListener('keydown', e => { if (e.key === 'Enter' && spSearchSongBtn) spSearchSongBtn.click(); });
  if (spSearchSongBtn) spSearchSongBtn.onclick = () => { searchSpotifyAlt(spInput.value.trim(), 'spSearchResults'); spInput.value = ''; };
  if (spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = async () => {
    const id = spInput.value.trim(); if (!id) return;
    showToast('📂 Loading Playlist…');
    const tracks = await fetchPlaylistTracks(id);
    renderSpotifyUI(tracks.map(t => ({ titleName: t.title, artistName: t.artist, itemType: 'track', itemId: t.id, thumb: t.image })), spSearchResults, '');
    spInput.value = '';
  };

  /* ── 15. AUTO-PLAY TOGGLE ─────────────────────────────── */
  const autoPlayBtn = document.getElementById('autoPlayToggle');
  if (autoPlayBtn) {
    if (autoPlayEnabled) autoPlayBtn.classList.add('active');
    autoPlayBtn.onclick = () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayBtn.classList.toggle('active', autoPlayEnabled);
      showToast(autoPlayEnabled ? 'Auto-play: ON ✨' : 'Auto-play: OFF 🌑');
      if (!autoPlayEnabled) { prefetchedTracks = []; if (window._renderYTMUpNext) window._renderYTMUpNext([]); if (window._setYTMStatus) window._setYTMStatus(''); }
    };
  }

  /* ── 16. FULLSCREEN ───────────────────────────────────── */
  function toggleFullscreenState() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) document.body.classList.add('is-fullscreen');
    else document.body.classList.remove('is-fullscreen');
  }
  document.addEventListener('fullscreenchange', toggleFullscreenState);
  document.addEventListener('webkitfullscreenchange', toggleFullscreenState);

  renderQueue();

})();
