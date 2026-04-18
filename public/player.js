/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (v5 — UI Clean & Background Fix)
   ✅ Background Audio Alive (Media Session Playback State)
   ✅ Clean List Format for YT Music & Spotify Results
   ✅ No overlap issues, fully responsive
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ═══════════════════════ 1. DOM ═══════════════════════ */
  const panel          = document.getElementById('zxPanel');
  const handle         = document.getElementById('zxHandle');
  const closeHandle    = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn');

  const nativeAudio   = document.getElementById('nativeAudio');
  const ytFrameWrap   = document.getElementById('ytFrameWrap');
  const cinemaMode    = document.getElementById('cinemaMode');
  const spotifyMode   = document.getElementById('spotifyMode');
  const premiumMusicCard = document.getElementById('premiumMusicCard');
  const pmcBgBlur     = document.getElementById('pmcBgBlur');
  const pmcArtwork    = document.getElementById('pmcArtwork');
  const pmcGlow       = document.getElementById('pmcGlow');
  const pmcTitle      = document.getElementById('pmcTitle');
  const pmcArtist     = document.getElementById('pmcArtist');
  const pmcSourceBadge = document.getElementById('pmcSourceBadge');
  const pmcCurrentTime = document.getElementById('pmcCurrentTime');
  const pmcDuration   = document.getElementById('pmcDuration');
  const pmcProgressFill = document.getElementById('pmcProgressFill');
  const pmcProgressBar  = document.getElementById('pmcProgressBar');
  const pmcPlayMain   = document.getElementById('pmcPlayMain');
  const pmcPrev       = document.getElementById('pmcPrev');
  const pmcNext       = document.getElementById('pmcNext');

  const vinylRecord   = document.getElementById('vinylRecord');
  const musicTitle    = document.getElementById('musicTitle');
  const musicArtist   = document.getElementById('musicArtist');
  const miniTitle     = document.getElementById('miniTitle');
  const mpPlays       = document.querySelectorAll('.mp-play');
  const mpPrevs       = [document.getElementById('miniPrev')];
  const mpNexts       = [document.getElementById('miniNext')];

  const urlInput      = document.getElementById('urlInput');
  const urlAddBtn     = document.getElementById('urlAddBtn');
  const fileInput     = document.getElementById('fileInput');
  const ytInput       = document.getElementById('ytInput');
  const ytAddBtn      = document.getElementById('ytAddBtn');
  const ytmInput      = document.getElementById('ytmInput');
  const ytmSearchBtn  = document.getElementById('ytmSearchBtn');
  const ytmResultsArea = document.getElementById('ytmSearchResults');
  const spInput       = document.getElementById('spInput');
  const spSearchSongBtn = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const spResultsArea = document.getElementById('spSearchResults');
  const queueList     = document.getElementById('queueList');

  // Toggle buttons
  const toggleListBtnUrl  = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt   = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt  = document.getElementById('episodesOverlayYt');
  const ytSearchResultsEl  = document.getElementById('ytSearchResults');
  const toggleListBtnYtm  = document.getElementById('toggleListBtnYtm');
  const toggleListBtnSp   = document.getElementById('toggleListBtnSp');

  const mpSyncBadge      = document.getElementById('mpSyncBadge');
  const mpSyncToggleBtn  = document.getElementById('mpSyncToggleBtn');
  const autoPlayToggleBtn = document.getElementById('autoPlayToggle');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ═══════════════════════ 2. API CONFIG ═══════════════════════ */
  const RAPID_API_KEY   = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  const SP81_HOST       = 'spotify81.p.rapidapi.com';

  /* ═══════════════════════ 3. STATE ═══════════════════════ */
  let queue          = [];
  let currentIdx     = 0;
  let synced         = false;
  let activeType     = 'none';
  let activeSrcTab   = 'none';
  let isPlaying      = false;
  let ytPlayer       = null;
  let isYtReady      = false;
  let isRemoteAction = false;
  let autoPlayEnabled = true;
  let remoteTimer    = null;
  let autoPlayFetching = false;
  const prefetchCache = new Map();
  const playedKeys    = new Set();

  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ═══════════════════════ 4. AUTO-PLAY TOGGLE ═══════════════════════ */
  if (autoPlayToggleBtn) {
    autoPlayToggleBtn.classList.add('active');
    autoPlayToggleBtn.addEventListener('click', () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayToggleBtn.classList.toggle('active', autoPlayEnabled);
      showToast(autoPlayEnabled ? '∞ Auto-play ON' : '⏹ Auto-play OFF');
    });
  }

  /* ═══════════════════════ 5. PANEL ENGINE ═══════════════════════ */
  let startY = 0; let isPanelOpen = false;
  function openPanel() {
    if (isPanelOpen) return; isPanelOpen = true;
    panel.classList.add('zx-open'); document.body.style.overflow = 'hidden';
    if (panelToggleBtn) panelToggleBtn.classList.add('active');
    document.getElementById('chatApp')?.classList.add('player-open');
  }
  function closePanel() {
    if (!isPanelOpen) return; isPanelOpen = false;
    panel.classList.remove('zx-open'); document.body.style.overflow = '';
    if (panelToggleBtn) panelToggleBtn.classList.remove('active');
    document.getElementById('chatApp')?.classList.remove('player-open');
  }
  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  handle.addEventListener('touchmove',  e => { if (!isPanelOpen && e.touches[0].clientY - startY > 15) openPanel(); }, { passive: true });
  if (panelToggleBtn) panelToggleBtn.addEventListener('click', e => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle.addEventListener('click', e => { if (e.target.closest('.mp-btn,.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    closeHandle.addEventListener('touchmove',  e => { if (isPanelOpen && startY - e.touches[0].clientY > 15) closePanel(); }, { passive: true });
    closeHandle.addEventListener('click', closePanel);
  }
  panel.addEventListener('touchmove', e => { if (isPanelOpen && !e.target.closest('.music-panel-inner')) e.preventDefault(); }, { passive: false });

  /* Tabs */
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
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:9px 16px;border-radius:20px;font-size:12px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;white-space:nowrap;';
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  function setupToggleBtn(btn, area) {
    if (!btn || !area) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const nowHidden = area.classList.toggle('hidden');
      btn.classList.toggle('results-open', !nowHidden);
    });
  }
  function showResultsArea(area, btn) {
    if (!area) return;
    area.classList.remove('hidden');
    if (btn) btn.classList.add('results-open');
  }

  if (toggleListBtnUrl && episodesOverlayUrl) setupToggleBtn(toggleListBtnUrl, episodesOverlayUrl);
  if (toggleListBtnYt && episodesOverlayYt) setupToggleBtn(toggleListBtnYt, episodesOverlayYt);
  if (toggleListBtnYtm && ytmResultsArea) setupToggleBtn(toggleListBtnYtm, ytmResultsArea);
  if (toggleListBtnSp && spResultsArea) setupToggleBtn(toggleListBtnSp, spResultsArea);

  /* ═══════════════════════ 6. SYNC ═══════════════════════ */
  if (mpSyncToggleBtn) {
    mpSyncToggleBtn.addEventListener('click', () => {
      synced = !synced;
      mpSyncBadge.textContent = synced ? '🟢 Synced' : '🔴 Solo';
      mpSyncBadge.classList.toggle('synced', synced);
      mpSyncToggleBtn.textContent = synced ? 'Synced ✓' : 'Sync 🔗';
      mpSyncToggleBtn.classList.toggle('synced', synced);
      if (synced) broadcastSync({ action: 'request_sync' });
      showToast(synced ? '🔗 Sync Active' : '🔌 Sync Off');
    });
  }

  /* ═══════════════════════ 7. YT IFRAME ENGINE ═══════════════════════ */
  const ytTag = document.createElement('script');
  ytTag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(ytTag);

  window.onYouTubeIframeAPIReady = function () {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0, modestbranding: 1 },
      events: { onReady: () => { isYtReady = true; }, onStateChange: onPlayerStateChange }
    });
  };

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach(ev => {
    document.addEventListener(ev, () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
      document.body.classList.toggle('is-fullscreen', isFs);
      if (isFs && ytFrameWrap) {
        const iframe = ytFrameWrap.querySelector('iframe');
        if (iframe) { iframe.style.width = '100vw'; iframe.style.height = '100vh'; }
      }
    });
  });

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: ytPlayer.getCurrentTime() }); }
    else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: ytPlayer.getCurrentTime() }); }
    else if (event.data === YT.PlayerState.ENDED)  { playNext(); }
  }

  /* ═══════════════════════ 8. YOUTUBE SEARCH ═══════════════════════ */
  function searchYouTube(query) {
    if (!query) return;
    if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    if (episodesOverlayYt) showResultsArea(episodesOverlayYt, toggleListBtnYt);
    if (toggleListBtnYt) toggleListBtnYt.classList.remove('hidden');

    fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query)}&geo=IN&lang=en&type=video`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
      })
      .then(r => r.json())
      .then(data => {
        if (!ytSearchResultsEl) return;
        ytSearchResultsEl.innerHTML = '';
        const items = data.data || [];
        if (!items.length) { ytSearchResultsEl.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
        items.forEach(vid => {
          const thumb = vid.thumbnail?.[1]?.url || vid.thumbnail?.[0]?.url || '';
          const div = document.createElement('div'); div.className = 'yt-search-item';
          div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${vid.title||''}</div><div class="yt-search-sub">${vid.channelTitle||''}</div></div><span style="font-size:15px;color:#ff4444;flex-shrink:0">▶</span>`;
          div.onclick = () => { queue = []; currentIdx = 0; addToQueue({ type: 'youtube', title: vid.title||'', ytId: vid.videoId, thumb }); showToast('▶ Playing!'); };
          ytSearchResultsEl.appendChild(div);
        });
      }).catch(() => { if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<p class="mp-empty">Error fetching results.</p>'; });
  }

  if (ytAddBtn) ytAddBtn.onclick = () => { const v = ytInput.value.trim(); if (!v) return; if (isYouTubeUrl(v)) { loadYouTube(v); ytInput.value = ''; return; } searchYouTube(v); ytInput.value = ''; };
  if (ytInput)  ytInput.addEventListener('keydown',  e => { if (e.key === 'Enter') ytAddBtn.click(); });
  if (urlInput) urlInput.addEventListener('keydown',  e => { if (e.key === 'Enter') urlAddBtn && urlAddBtn.click(); });
  if (urlAddBtn) urlAddBtn.addEventListener('click', () => {
    const v = urlInput.value.trim(); if (!v) return;
    if (isYouTubeUrl(v)) { loadYouTube(v); urlInput.value = ''; }
    else if (v.startsWith('http')) { queue = []; currentIdx = 0; addToQueue({ type: 'stream', title: 'Cloud Media', url: v }); urlInput.value = ''; }
  });
  if (fileInput) fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    queue = []; currentIdx = 0; addToQueue({ type: 'stream', title: file.name, url: URL.createObjectURL(file) });
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function loadYouTube(url) { const id = extractYouTubeId(url); if (!id) { showToast('❌ Invalid YouTube link!'); return; } queue = []; currentIdx = 0; addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id }); }

  /* ═══════════════════════ 9. AUDIO EXTRACTION ═══════════════════════ */
  async function fetchPremiumAudio(spId) {
    try {
      const res = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const result = await res.json();
      return Array.isArray(result) ? (result[0]?.url || result[0]?.link) : (result.url || result.link || result.downloadUrl);
    } catch { return null; }
  }

  async function searchYTMusicAudio(query) {
    try {
      const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query + ' official audio')}&geo=IN&lang=en&type=video`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
      });
      const d = await r.json();
      const items = (d.data || []).filter(i => {
        const t = (i.title || '').toLowerCase();
        return !t.includes('#short') && !t.includes('shorts') && !t.includes('m4a') && !t.includes('reels');
      });
      if (!items.length) return null;
      return { ytId: items[0].videoId, title: items[0].title, channel: items[0].channelTitle || '', thumb: items[0].thumbnail?.[1]?.url || items[0].thumbnail?.[0]?.url || '' };
    } catch { return null; }
  }

  async function extractYTAudioUrl(ytId) {
    try {
      const res = await fetch(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com' }
      });
      const data = await res.json();
      if (data.formats) {
        const fmts = Object.values(data.formats);
        const audioOnly = fmts.filter(f => f.url && (f.mimeType?.includes('audio') || (f.audioQuality && !f.qualityLabel)));
        if (audioOnly.length) { audioOnly.sort((a, b) => parseInt(b.bitrate || 0) - parseInt(a.bitrate || 0)); return audioOnly[0].url; }
        const any = fmts.find(f => f.url); if (any) return any.url;
      }
      if (data.url) return data.url;
    } catch { /* skip */ }

    try {
      const res2 = await fetch(`https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d2 = await res2.json(); const url2 = Array.isArray(d2) ? (d2[0]?.url || d2[0]?.link) : (d2.url || d2.link);
      if (url2) return url2;
    } catch { /* skip */ }

    try {
      const res3 = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${ytId}`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'yt-api.p.rapidapi.com' } });
      const d3 = await res3.json();
      if (d3.formats) {
        const af = Object.values(d3.formats).filter(f => f.url && f.mimeType?.includes('audio'));
        if (af.length) return af[0].url;
        const any = Object.values(d3.formats).find(f => f.url); if (any) return any.url;
      }
      if (d3.url) return d3.url;
    } catch { /* skip */ }
    return null;
  }

  async function playWithIframeFallback(item) {
    showCinemaMode(); ytFrameWrap.style.display = 'block';
    if (item.ytId) {
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => { if (isYtReady) ytPlayer.loadVideoById(item.ytId); }, 800);
      setTrackInfo(item.title, item.artist || 'Audio'); setupMediaSession(item);
      showToast('⚠️ Playing via Video fallback (Background pause likely)');
    }
  }

  function songKey(title, artist) { return (title + '__' + (artist || '')).toLowerCase().replace(/\s+/g,' ').replace(/\(.*?\)/g,'').replace(/\[.*?\]/g,'').trim(); }

  /* ═══════════════════════ 10. SMART AUTO-PLAY ═══════════════════════ */
  function buildVibeQueries(title, artist) {
    const clean = s => s.replace(/\(.*?\)|\[.*?\]/g,'').replace(/ft\.?.*/i,'').trim();
    const t = clean(title), a = clean(artist || ''), full = (t+' '+a).toLowerCase();
    const isBoll = /hindi|bollywood|punjabi|haryanvi|desi|filmi/i.test(full);
    const isLoFi = /lo.?fi|chill|relax|study|sleep/i.test(full);
    const yr = '2025 2026'; let q = [];
    if (isBoll) q.push(`${a} top songs`, `hindi hits ${yr}`, `bollywood ${yr}`);
    else if (isLoFi) q.push(`lofi chill mix ${yr}`, `chill beats study`);
    else q.push(`${a} top songs`, `songs like ${t}`, `trending songs ${yr}`);
    return q.slice(0,3);
  }

  async function fetchVibeNextSongs(title, artist, count=5) {
    const queries = buildVibeQueries(title, artist);
    const collected = [], seenKeys = new Set();
    for (const q of queries) {
      if (collected.length >= count*2) break;
      try {
        const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(q)}&geo=IN&lang=en&type=video`, {
          headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
        });
        const d = await r.json();
        if (!d.data) continue;
        for (const item of d.data) {
          const t2 = item.title||'', a2 = item.channelTitle||'';
          const tl = t2.toLowerCase();
          if (tl.includes('#short')||tl.includes('shorts')||tl.includes('m4a')||tl.includes('reels')||a2.toLowerCase().includes('- topic')) continue;
          const k = songKey(t2, a2);
          if (playedKeys.has(k)||seenKeys.has(k)) continue;
          seenKeys.add(k);
          const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
          collected.push({ ytId: item.videoId, title: t2, artist: a2, thumb, key: k });
          if (collected.length >= count*2) break;
        }
      } catch { /* skip */ }
    }
    return collected.slice(0, count);
  }

  async function triggerAutoPlayLoad(title, artist) {
    if (autoPlayFetching) return;
    autoPlayFetching = true; showToast('🎵 Loading next vibes…');
    const songs = await fetchVibeNextSongs(title, artist, 5);
    if (!songs.length) { autoPlayFetching = false; return; }
    songs.forEach(song => {
      const type = activeSrcTab === 'spotify' ? 'spotify_yt' : 'ytmusic';
      queue.push({ type, title: song.title, artist: song.artist, ytId: song.ytId, thumb: song.thumb, key: song.key, isAutoPlay: true });
    });
    renderQueue(); autoPlayFetching = false;
  }

  /* ═══════════════════════ 11. SPOTIFY SEARCH ═══════════════════════ */
  async function searchSpotify(query, playlistsOnly = false) {
    if (!query) return;
    spResultsArea.innerHTML = '<div class="mp-loading-pulse">Loading…</div>';
    showResultsArea(spResultsArea, toggleListBtnSp);
    if (toggleListBtnSp) toggleListBtnSp.classList.remove('hidden');

    try {
      const res = await fetch('https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall?market=IN&country=IN', {
        method: 'POST',
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'spotify-web-api3.p.rapidapi.com', 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: query, limit: 20, country: 'IN', market: 'IN' })
      });
      const resp = await res.json();
      const sd = resp?.data?.searchV2 || resp; let raw = [];
      if (!playlistsOnly) {
        (sd?.topResults?.items || sd?.topResultsV2?.itemsV2 || []).forEach(i => raw.push({ ...i, isTop: true }));
        (sd?.tracksV2?.items || sd?.tracks?.items || []).forEach(i => raw.push(i));
        (sd?.albumsV2?.items || sd?.albums?.items || []).forEach(i => raw.push(i));
      }
      (sd?.playlistsV2?.items || sd?.playlists?.items || []).forEach(i => raw.push(i));

      const seen = new Set(); let items = [];
      raw.forEach(w => {
        const item = w?.item?.data || w?.data || w;
        if (!item?.uri || seen.has(item.uri)) return; seen.add(item.uri);
        const parts = item.uri.split(':'), iType = parts[1], iId = item.id || parts[2];
        if (playlistsOnly && iType !== 'playlist') return;
        const name = item.name || item.profile?.name || 'Unknown';
        let artist = 'Unknown';
        if (item.artists?.items?.[0]?.profile?.name) artist = item.artists.items[0].profile.name;
        else if (item.ownerV2?.data?.name) artist = item.ownerV2.data.name;
        else if (iType === 'artist') artist = 'Artist';
        let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
        if (item.albumOfTrack?.coverArt?.sources?.[0]?.url) thumb = item.albumOfTrack.coverArt.sources[0].url;
        else if (item.images?.items?.[0]?.sources?.[0]?.url) thumb = item.images.items[0].sources[0].url;
        items.push({ name, artist, iType, iId, thumb, isTop: w.isTop });
      });

      renderSpotifyCards(items, query.toLowerCase());
    } catch (e) { spResultsArea.innerHTML = '<p class="mp-empty">🚨 API Error!</p>'; }
  }

  function renderSpotifyCards(items, lq) {
    spResultsArea.innerHTML = '';
    if (!items.length) { spResultsArea.innerHTML = '<p class="mp-empty">No results found.</p>'; return; }
    items.forEach((data, idx) => {
      const isTop = data.isTop || (idx === 0 && lq && data.name.toLowerCase().includes(lq.split(' ')[0]));
      const isPlaylist = data.iType === 'playlist', isAlbum = data.iType === 'album', isArtist = data.iType === 'artist';
      const k = songKey(data.name, data.artist);
      
      const div = document.createElement('div');
      div.className = 'yt-search-item sp-list-item'; // Exact clean list layout
      const typeExtra = (isPlaylist||isAlbum||isArtist) ? `<span class="sp-playlist-badge">${data.iType.toUpperCase()}</span>` : '';
      const topBadge = isTop ? `<span class="sp-best-badge">🏆 BEST MATCH</span><br>` : '';
      
      div.innerHTML = `
        <img src="${data.thumb}" class="yt-search-thumb" style="border-radius:${isArtist?'50%':'7px'}" onerror="this.src='https://i.imgur.com/8Q5FqWj.jpeg'"/>
        <div class="yt-search-info">
          ${topBadge}<span class="yt-search-title">${data.name}</span> ${typeExtra}
          <div class="yt-search-sub">${data.artist}</div>
        </div>
        <span style="font-size:15px;color:#1db954;flex-shrink:0">${isArtist ? '👤' : isPlaylist||isAlbum ? '📂' : '▶'}</span>
      `;

      div.onclick = async () => {
        if (isPlaylist) {
          showToast('📂 Loading Playlist…');
          const tracks = await fetchPlaylistTracks(data.iId);
          renderSpotifyCards(tracks.map(t=>({name:t.title,artist:t.artist,iType:'track',iId:t.id,thumb:t.image,isTop:false})), '');
        } else if (isAlbum) {
          showToast('📂 Loading Album…');
          const tracks = await fetchAlbumTracks(data.iId);
          renderSpotifyCards(tracks.map(t=>({name:t.title,artist:t.artist,iType:'track',iId:t.id,thumb:t.image,isTop:false})), '');
        } else if (isArtist) {
          showToast('👤 Artist profile — search a track name instead');
        } else {
          activeSrcTab = 'spotify'; queue = []; currentIdx = 0;
          addToQueue({ type: 'spotify_yt', title: data.name, artist: data.artist, spId: data.iId, thumb: data.thumb, key: k });
          document.querySelectorAll('.sp-list-item').forEach(c => c.classList.remove('playing'));
          div.classList.add('playing'); showToast('🎵 Preparing stream...');
        }
      };
      spResultsArea.appendChild(div);
    });
  }

  async function fetchPlaylistTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${id}&offset=0&limit=100&market=IN`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d = await r.json(); return (d.items||[]).filter(i=>i.track&&!i.track.is_local).map(i=>({ id:i.track.id, title:i.track.name, artist:i.track.artists[0]?.name||'Unknown', image:i.track.album?.images[0]?.url||'' }));
    } catch { return []; }
  }
  async function fetchAlbumTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/album_tracks?id=${id}&market=IN`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d = await r.json(); const img = d.album?.images?.[0]?.url || ''; return (d.album?.tracks?.items||[]).map(i=>({ id:i.id, title:i.name, artist:i.artists[0]?.name||'Unknown', image:img }));
    } catch { return []; }
  }

  if (spSearchSongBtn) spSearchSongBtn.onclick = () => { const v = spInput.value.trim(); if (!v) return; searchSpotify(v, false); spInput.value = ''; };
  if (spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = () => { const v = spInput.value.trim(); if (!v) return; searchSpotify(v, true); spInput.value = ''; };
  if (spInput) spInput.addEventListener('keydown', e => { if (e.key==='Enter') spSearchSongBtn?.click(); });

  /* ═══════════════════════ 12. YT MUSIC ═══════════════════════ */
  async function searchYTMusic(query) {
    if (!query) return;
    ytmResultsArea.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(ytmResultsArea, toggleListBtnYtm);
    if (toggleListBtnYtm) toggleListBtnYtm.classList.remove('hidden');

    try {
      const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query+' song')}&geo=IN&lang=en&type=video`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
      });
      const d = await r.json();
      ytmResultsArea.innerHTML = '';
      const items = d.data || [];
      if (!items.length) { ytmResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
      items.forEach(item => {
        const t = item.title||'', a = item.channelTitle||'';
        const tl = t.toLowerCase(); if (tl.includes('#short')||tl.includes('m4a')||tl.includes('reels')) return;
        const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
        const ytId = item.videoId, k = songKey(t, a);
        
        // Exact clean list layout
        const div = document.createElement('div');
        div.className = 'yt-search-item ytm-list-item'; 
        div.innerHTML = `
          <img src="${thumb}" class="yt-search-thumb" onerror="this.src='https://i.imgur.com/8Q5FqWj.jpeg'"/>
          <div class="yt-search-info">
            <div class="yt-search-title">${t}</div>
            <div class="yt-search-sub">${a}</div>
          </div>
          <span style="font-size:15px;color:#ff4444;flex-shrink:0">▶</span>
        `;
        div.onclick = () => {
          activeSrcTab = 'ytmusic'; queue = []; currentIdx = 0;
          addToQueue({ type: 'ytmusic', title: t, artist: a, ytId, thumb, key: k });
          document.querySelectorAll('.ytm-list-item').forEach(c => c.classList.remove('playing'));
          div.classList.add('playing'); showToast('🎵 Preparing stream...');
        };
        ytmResultsArea.appendChild(div);
      });
    } catch { ytmResultsArea.innerHTML = '<p class="mp-empty">Error. Check API.</p>'; }
  }

  if (ytmSearchBtn) ytmSearchBtn.onclick = () => { const v = ytmInput.value.trim(); if (!v) return; searchYTMusic(v); ytmInput.value = ''; };
  if (ytmInput)  ytmInput.addEventListener('keydown', e => { if (e.key==='Enter') ytmSearchBtn?.click(); });

  /* ═══════════════════════ 13. QUEUE ═══════════════════════ */
  function addToQueue(item) {
    if (!item.key) item.key = songKey(item.title, item.artist||'');
    queue.push(item); renderQueue(); playQueueItem(queue.length-1);
  }

  function renderQueue() {
    if (!queue.length) { queueList.innerHTML = '<p class="mp-empty">Queue empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item,i) => {
      const el = document.createElement('div'); el.className = 'mp-queue-item'+(i===currentIdx?' playing':'');
      const icon = {youtube:'🎬',youtube_audio:'🎧',ytmusic:'🎵',spotify_yt:'🌐',stream:'☁️'}[item.type]||'🎵';
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del">✕</button>`;
      el.querySelector('.qi-del').onclick = e => { e.stopPropagation(); queue.splice(i,1); if (currentIdx>=queue.length) currentIdx=queue.length-1; renderQueue(); };
      el.onclick = e => { if (e.target.classList.contains('qi-del')) return; playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i<0||i>=queue.length) return;
    currentIdx = i; renderQueue(); const item = queue[i];
    const isBlob = item.url?.startsWith('blob:');
    if (synced && !isRemoteAction && !isBlob) broadcastSync({ action: 'change_song', item });
    playedKeys.add(item.key||songKey(item.title,item.artist||''));
    renderMedia(item);
    if (autoPlayEnabled && i>=queue.length-2) triggerAutoPlayLoad(item.title, item.artist||'');
  }

  /* ═══════════════════════ 14. MEDIA RENDERER ═══════════════════════ */
  function showCinemaMode() {
    cinemaMode.classList.remove('hidden'); premiumMusicCard.classList.add('hidden'); spotifyMode.classList.add('hidden');
    premiumMusicCard.classList.remove('playing','source-ytm','source-sp');
  }
  function showPremiumCard(src) {
    cinemaMode.classList.add('hidden'); premiumMusicCard.classList.remove('hidden'); spotifyMode.classList.add('hidden');
    premiumMusicCard.classList.remove('source-ytm','source-sp');
    if (src==='spotify') { pmcSourceBadge.textContent = '🌐 Spotify'; pmcSourceBadge.className = 'pmc-source-badge sp'; premiumMusicCard.classList.add('source-sp'); } 
    else { pmcSourceBadge.textContent = '🎵 YT Music'; pmcSourceBadge.className = 'pmc-source-badge ytm'; premiumMusicCard.classList.add('source-ytm'); }
  }

  function renderMedia(item) {
    nativeAudio.pause(); nativeAudio.removeAttribute('src'); nativeAudio.srcObject = null; nativeAudio.style.display='none';
    ytFrameWrap.style.display = 'none';
    if (ytPlayer&&isYtReady&&typeof ytPlayer.pauseVideo==='function') ytPlayer.pauseVideo();
    isPlaying = false; updatePlayBtn(); updateProgressBar(0,0);

    if (item.type==='youtube') {
      activeType = 'youtube'; showCinemaMode(); ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId); else setTimeout(()=>renderMedia(item), 600);
      setTrackInfo(item.title,'YouTube'); setupMediaSession(item);
    }
    else if (item.type==='ytmusic') {
      activeType='ytmusic'; activeSrcTab='ytmusic'; showPremiumCard('ytmusic');
      setPMCInfo(item.title, item.artist||'YouTube Music', item.thumb); setTrackInfo(item.title, item.artist||'YouTube Music');
      showToast('🎵 Loading audio stream…');
      extractYTAudioUrl(item.ytId).then(async url => {
        if (url) {
          nativeAudio.src = url;
          nativeAudio.play().then(()=>{ isPlaying=true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(()=>showToast('Tap ▶ to play'));
          setupMediaSession(item);
        } else {
          await playWithIframeFallback(item);
        }
      });
    }
    else if (item.type==='spotify_yt') {
      activeType='spotify_yt'; activeSrcTab='spotify'; showPremiumCard('spotify');
      setPMCInfo(item.title, item.artist||'Global Music', item.thumb); setTrackInfo(item.title, item.artist||'Global Music');
      showToast('🌐 Requesting stream…');
      (async () => {
        if (item.spId) {
          const spUrl = await fetchPremiumAudio(item.spId);
          if (spUrl) {
            nativeAudio.src=spUrl; nativeAudio.play().then(()=>{ isPlaying=true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(()=>{}); setupMediaSession(item); return;
          }
        }
        const ytRes = await searchYTMusicAudio(item.title+' '+(item.artist||''));
        if (ytRes) {
          const ytUrl = await extractYTAudioUrl(ytRes.ytId);
          if (ytUrl) {
            nativeAudio.src=ytUrl; nativeAudio.play().then(()=>{ isPlaying=true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(()=>{}); setupMediaSession(item); return;
          }
          item.ytId = ytRes.ytId; await playWithIframeFallback(item); return;
        }
        showToast('⚠️ Audio unavailable, skipping…'); setTimeout(playNext, 2500);
      })();
    }
    else if (item.type==='stream') {
      activeType='stream'; cinemaMode.classList.add('hidden'); premiumMusicCard.classList.add('hidden'); spotifyMode.classList.remove('hidden');
      nativeAudio.src=item.url; nativeAudio.play().then(()=>{ isPlaying=true; updatePlayBtn(); }).catch(()=>showToast('Tap ▶ to play'));
      setTrackInfo(item.title,'☁️ Cloud'); setupMediaSession(item);
    }
  }

  /* ═══════════════════════ 15. PMC INFO & PROGRESS ═══════════════════════ */
  function setPMCInfo(title,artist,thumb) {
    pmcTitle.textContent=title; pmcArtist.textContent=artist;
    const src=thumb||'https://i.imgur.com/8Q5FqWj.jpeg';
    pmcArtwork.src=src; pmcBgBlur.style.backgroundImage=`url('${src}')`;
    if (pmcGlow) pmcGlow.style.background='rgba(232,67,106,0.4)';
  }
  function updateProgressBar(cur,dur) {
    if (!dur||isNaN(dur)) { pmcProgressFill.style.width='0%'; if(pmcCurrentTime)pmcCurrentTime.textContent='0:00'; if(pmcDuration)pmcDuration.textContent='0:00'; return; }
    pmcProgressFill.style.width=Math.min(100,(cur/dur)*100)+'%';
    if(pmcCurrentTime)pmcCurrentTime.textContent=fmtTime(cur);
    if(pmcDuration)pmcDuration.textContent=fmtTime(dur);
  }
  function fmtTime(s) { if(!s||isNaN(s))return'0:00'; const m=Math.floor(s/60),sc=Math.floor(s%60); return `${m}:${sc.toString().padStart(2,'0')}`; }

  nativeAudio.addEventListener('timeupdate',()=>updateProgressBar(nativeAudio.currentTime,nativeAudio.duration));
  if (pmcProgressBar) {
    const seek = e => { const r=pmcProgressBar.getBoundingClientRect(),pct=(e.clientX||e.touches?.[0]?.clientX||0-r.left)/r.width; if(nativeAudio.duration)nativeAudio.currentTime=pct*nativeAudio.duration; };
    pmcProgressBar.addEventListener('click',seek);
    pmcProgressBar.addEventListener('touchstart',e=>seek({clientX:e.touches[0].clientX}),{passive:true});
  }
  if (pmcPlayMain) pmcPlayMain.addEventListener('click',()=>{ if(['stream','youtube_audio','ytmusic','spotify_yt'].includes(activeType)){ if(isPlaying)nativeAudio.pause(); else nativeAudio.play().catch(()=>{}); } else if(activeType==='youtube'&&ytPlayer){ if(isPlaying)ytPlayer.pauseVideo(); else ytPlayer.playVideo(); } });
  if (pmcPrev) pmcPrev.addEventListener('click',playPrev);
  if (pmcNext) pmcNext.addEventListener('click',playNext);

  /* ═══════════════════════ 16. MEDIA SESSION (BACKGROUND FIX) ═══════════════════════ */
  function setupMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title:item.title, artist:item.artist||'ZeroX Hub', artwork:[{src:item.thumb||'https://i.imgur.com/8Q5FqWj.jpeg',sizes:'512x512',type:'image/jpeg'}] });
    navigator.mediaSession.setActionHandler('play',()=>{ if(activeType==='youtube'&&ytPlayer)ytPlayer.playVideo(); else nativeAudio.play(); });
    navigator.mediaSession.setActionHandler('pause',()=>{ if(activeType==='youtube'&&ytPlayer)ytPlayer.pauseVideo(); else nativeAudio.pause(); });
    navigator.mediaSession.setActionHandler('previoustrack',playPrev);
    navigator.mediaSession.setActionHandler('nexttrack',playNext);
  }

  /* ═══════════════════════ 17. PLAYBACK CONTROLS ═══════════════════════ */
  function playNext() {
    if (currentIdx<queue.length-1) playQueueItem(currentIdx+1);
    else if (autoPlayEnabled) { const cur=queue[currentIdx]; if(cur)triggerAutoPlayLoad(cur.title,cur.artist||''); else showToast('End of queue.'); }
    else showToast('End of queue.');
  }
  function playPrev() { if(currentIdx>0)playQueueItem(currentIdx-1); else showToast('First song!'); }

  mpNexts.forEach(b=>b&&b.addEventListener('click',playNext));
  mpPrevs.forEach(b=>b&&b.addEventListener('click',playPrev));
  mpPlays.forEach(btn=>btn.addEventListener('click',()=>{ if(['stream','youtube_audio','ytmusic','spotify_yt'].includes(activeType)){ if(isPlaying)nativeAudio.pause(); else nativeAudio.play().catch(()=>{}); } else if(activeType==='youtube'&&ytPlayer){ if(isPlaying)ytPlayer.pauseVideo(); else ytPlayer.playVideo(); } }));

  function updatePlayBtn() {
    const icon=isPlaying?'⏸':'▶';
    mpPlays.forEach(b=>b.textContent=icon); if(pmcPlayMain)pmcPlayMain.textContent=icon;
    if (isPlaying&&['stream','youtube_audio','ytmusic','spotify_yt'].includes(activeType)) {
      vinylRecord?.classList.add('playing'); premiumMusicCard?.classList.add('playing');
    } else { vinylRecord?.classList.remove('playing'); if(!isPlaying)premiumMusicCard?.classList.remove('playing'); }
    
    // Background Play Fix: Update OS media state
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }
  function setTrackInfo(title,sub) { if(musicTitle)musicTitle.textContent=title; if(musicArtist)musicArtist.textContent=sub; if(miniTitle)miniTitle.textContent=`${title} • ${sub}`; }

  /* ═══════════════════════ 18. NATIVE AUDIO EVENTS ═══════════════════════ */
  nativeAudio.addEventListener('play',()=>{ isPlaying=true; updatePlayBtn(); if(synced&&!isRemoteAction)broadcastSync({action:'play',time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('pause',()=>{ isPlaying=false; updatePlayBtn(); if(synced&&!isRemoteAction)broadcastSync({action:'pause',time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('seeked',()=>{ if(synced&&!isRemoteAction)broadcastSync({action:'seek',time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('ended',()=>{ if(autoPlayEnabled)playNext(); else showToast('Song ended.'); });

  /* ═══════════════════════ 19. SYNC NETWORK ═══════════════════════ */
  function broadcastSync(data) { if(window._zxSendSync)window._zxSendSync({type:'musicSync',...data}); }

  window._zxReceiveSync = function(data) {
    if (data.action==='request_sync') {
      const cur=queue[currentIdx]; if(synced&&cur&&!cur.url?.startsWith('blob:')) {
        broadcastSync({action:'change_song',item:cur});
        setTimeout(()=>{ const t=activeType==='youtube'&&ytPlayer&&isYtReady?ytPlayer.getCurrentTime():nativeAudio.currentTime||0; broadcastSync({action:isPlaying?'play':'pause',time:t}); },1500);
      } return;
    }
    if (!synced) return; setRemoteAction();
    if (data.action==='change_song') {
      let idx=queue.findIndex(q=>q.title===data.item.title);
      if (idx===-1){queue.push(data.item);idx=queue.length-1;}else{queue[idx]=data.item;}
      currentIdx=idx; renderQueue(); renderMedia(queue[idx]); return;
    }
    if (activeType==='youtube'&&ytPlayer&&isYtReady) {
      if(data.action==='play'){ytPlayer.seekTo(data.time,true);ytPlayer.playVideo();}
      if(data.action==='pause'){ytPlayer.pauseVideo();ytPlayer.seekTo(data.time,true);}
      if(data.action==='seek'){ytPlayer.seekTo(data.time,true);}
    } else {
      if(data.action==='play'){if(Math.abs(nativeAudio.currentTime-data.time)>1)nativeAudio.currentTime=data.time;nativeAudio.play().catch(()=>{});}
      if(data.action==='pause'){nativeAudio.currentTime=data.time;nativeAudio.pause();}
      if(data.action==='seek'){nativeAudio.currentTime=data.time;}
    }
  };

  /* ═══════════════════════ INIT ═══════════════════════ */
  renderQueue();

})();
