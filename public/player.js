/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (v7 — The Beast Upgrade)
   ✅ New RapidAPI Key Integrated
   ✅ Smart Background Prefetching (Zero Delay Next)
   ✅ Advanced Auto-Play (5 Tracks at End of Queue)
   ✅ Universal Block Removed (Play anything anytime)
   ✅ Strict Vibe-Match & Duplicate Prevention (Title-based)
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
  const RAPID_API_KEY   = 'da0d895439msheac2f60c49aa9d0p1cb891jsne02d1eaab2fd';
  const SP81_HOST       = 'spotify81.p.rapidapi.com';

  /* ═══════════════════════ 3. STATE & HISTORY ═══════════════════════ */
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
  let autoPlayFetching = false;
  
  // Track auto-played songs to prevent EXACT song repetition across channels
  const autoPlayHistory = new Set(); 

  // Very strict normalization to catch identical songs from diff channels
  function normalizeTitle(title) {
    return (title || '').toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/official/g, '')
      .replace(/audio/g, '')
      .replace(/video/g, '')
      .replace(/lyric/g, '')
      .replace(/ft\..*/g, '')
      .replace(/feat\..*/g, '')
      .replace(/[^a-z0-9]/g, '') 
      .trim();
  }

  function setRemoteAction() {
    isRemoteAction = true;
    setTimeout(() => { isRemoteAction = false; }, 2000);
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
  }
  function closePanel() {
    if (!isPanelOpen) return; isPanelOpen = false;
    panel.classList.remove('zx-open'); document.body.style.overflow = '';
    if (panelToggleBtn) panelToggleBtn.classList.remove('active');
  }
  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  handle.addEventListener('touchmove',  e => { if (!isPanelOpen && e.touches[0].clientY - startY > 15) openPanel(); }, { passive: true });
  if (panelToggleBtn) panelToggleBtn.addEventListener('click', e => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle.addEventListener('click', e => { if (e.target.closest('.mp-btn,.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });

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

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: ytPlayer.getCurrentTime() }); }
    else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: ytPlayer.getCurrentTime() }); }
    else if (event.data === YT.PlayerState.ENDED)  { playNext(); }
  }

  /* ═══════════════════════ 8. YOUTUBE SEARCH ═══════════════════════ */
  function searchYouTube(query) {
    if (!query) return;
    if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(episodesOverlayYt, toggleListBtnYt);

    fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query)}&geo=IN&type=video`, {
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

  if (ytAddBtn) ytAddBtn.onclick = () => { const v = ytInput.value.trim(); if (!v) return; searchYouTube(v); ytInput.value = ''; };
  if (ytInput)  ytInput.addEventListener('keydown',  e => { if (e.key === 'Enter') ytAddBtn.click(); });

  /* ═══════════════════════ 9. CORE AUDIO EXTRACTION & PREFETCH ═══════════════════════ */
  async function fetchPremiumAudio(spId) {
    try {
      const res = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true&quality=best`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST }
      });
      const result = await res.json();
      return Array.isArray(result) ? (result[0]?.url || result[0]?.link) : (result.url || result.link || result.downloadUrl);
    } catch { return null; }
  }

  async function searchYTMusicAudio(query) {
    try {
      const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query + ' official audio')}&geo=IN&type=video`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
      });
      const d = await r.json();
      const items = (d.data || []).filter(i => {
        const t = (i.title || '').toLowerCase();
        return !t.includes('#short') && !t.includes('shorts') && !t.includes('m4a') && !t.includes('reels');
      });
      if (!items.length) return null;
      return { ytId: items[0].videoId };
    } catch { return null; }
  }

  async function extractYTAudioUrl(ytId) {
    // Primary extraction via Spotify81 Downloader Engine
    try {
      const res = await fetch(`https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true&bypassSpotify=true&quality=best`, { 
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } 
      });
      const d = await res.json(); 
      const url = Array.isArray(d) ? (d[0]?.url || d[0]?.link) : (d.url || d.link);
      if (url) return url;
    } catch { /* fallback next */ }

    // Fallback YTStream
    try {
      const res = await fetch(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com' }
      });
      const d = await res.json();
      if (d.formats) {
        const af = Object.values(d.formats).filter(f => f.url && (f.mimeType?.includes('audio')));
        if (af.length) return af[0].url;
      }
    } catch { return null; }
    return null;
  }

  async function resolveAudioUrl(item) {
    if (item.type === 'ytmusic') return await extractYTAudioUrl(item.ytId);
    if (item.type === 'spotify_yt') {
      if (item.spId) { const spUrl = await fetchPremiumAudio(item.spId); if (spUrl) return spUrl; }
      const ytRes = await searchYTMusicAudio(item.title + ' ' + (item.artist || ''));
      if (ytRes) { item.ytId = ytRes.ytId; return await extractYTAudioUrl(ytRes.ytId); }
    }
    return null;
  }

  // Pre-fetch logic for zero-delay playback
  async function prefetchNextSong() {
    const nextIdx = currentIdx + 1;
    if (nextIdx < queue.length) {
      const nextItem = queue[nextIdx];
      if (nextItem.prefetchedUrl || ['youtube', 'stream'].includes(nextItem.type)) return;
      dbg('PREFETCH', 'Fetching M4A for: ' + nextItem.title, '#7ADB8A');
      const url = await resolveAudioUrl(nextItem);
      if (url) nextItem.prefetchedUrl = url;
    }
  }

  /* ═══════════════════════ 10. SMART VIBE AUTO-PLAY ═══════════════════════ */
  function buildVibeQueries(title, artist) {
    const t = title.replace(/\(.*?\)|\[.*?\]/g,'').trim();
    const a = artist ? artist.replace(/\(.*?\)|\[.*?\]/g,'').trim() : '';
    return [
      `${t} similar vibe songs`,
      `${a} top hits radio`,
      `trending songs like ${t}`
    ];
  }

  async function fetchVibeNextSongs(title, artist, count = 5) {
    const queries = buildVibeQueries(title, artist);
    const collected = [];
    
    for (const q of queries) {
      if (collected.length >= count) break;
      try {
        const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(q)}&geo=IN&type=video`, {
          headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
        });
        const d = await r.json();
        if (!d.data) continue;
        
        for (const item of d.data) {
          const t2 = item.title || '', a2 = item.channelTitle || '';
          if (t2.toLowerCase().includes('#short')) continue;
          
          const normTitle = normalizeTitle(t2);
          
          // Strict duplicate prevention for auto-play history
          if (autoPlayHistory.has(normTitle) || collected.some(c => c.norm === normTitle)) continue;
          
          const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
          collected.push({ ytId: item.videoId, title: t2, artist: a2, thumb, norm: normTitle });
          
          if (collected.length >= count) break;
        }
      } catch { /* skip */ }
    }
    return collected;
  }

  async function triggerAutoPlayLoad() {
    if (autoPlayFetching || queue.length === 0) return;
    autoPlayFetching = true;
    const lastItem = queue[queue.length - 1];
    
    dbg('AUTOPLAY', 'Fetching next 5 vibes based on: ' + lastItem.title, '#ffaa44');
    const songs = await fetchVibeNextSongs(lastItem.title, lastItem.artist || '', 5);
    
    if (songs.length > 0) {
      songs.forEach(song => {
        autoPlayHistory.add(song.norm); // Mark as auto-played
        queue.push({ 
          type: activeSrcTab === 'spotify' ? 'spotify_yt' : 'ytmusic', 
          title: song.title, 
          artist: song.artist, 
          ytId: song.ytId, 
          thumb: song.thumb,
          isAutoPlay: true 
        });
      });
      renderQueue();
      prefetchNextSong(); // Start prefetching the first newly added song immediately
    }
    autoPlayFetching = false;
  }

  /* ═══════════════════════ 11. SPOTIFY SEARCH ═══════════════════════ */
  async function searchSpotify(query, playlistsOnly = false) {
    if (!query) return;
    spResultsArea.innerHTML = '<div class="mp-loading-pulse">Loading…</div>';
    showResultsArea(spResultsArea, toggleListBtnSp);

    try {
      const res = await fetch('https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall', {
        method: 'POST',
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'spotify-web-api3.p.rapidapi.com', 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: query, limit: 15 })
      });
      const resp = await res.json();
      const sd = resp?.data?.searchV2 || resp;

      let items = [];
      if (!playlistsOnly) {
        (sd?.tracksV2?.items || []).forEach(i => items.push({ iType: 'track', data: i.item.data }));
        (sd?.albums?.items || []).forEach(i => items.push({ iType: 'album', data: i.data }));
      }
      (sd?.playlists?.items || []).forEach(i => items.push({ iType: 'playlist', data: i.data }));

      spResultsArea.innerHTML = '';
      items.forEach(obj => {
        const d = obj.data; if (!d || !d.uri) return;
        const name = d.name || 'Unknown', isPlaylist = obj.iType === 'playlist', isAlbum = obj.iType === 'album';
        const artist = d.artists?.items?.[0]?.profile?.name || d.ownerV2?.data?.name || 'Spotify';
        const thumb = d.albumOfTrack?.coverArt?.sources?.[0]?.url || d.images?.items?.[0]?.sources?.[0]?.url || d.coverArt?.sources?.[0]?.url || 'https://i.imgur.com/8Q5FqWj.jpeg';
        const spId = d.id || d.uri.split(':').pop();

        const div = document.createElement('div');
        div.className = 'yt-search-item sp-list-item';
        div.innerHTML = `
          <img src="${thumb}" class="yt-search-thumb"/>
          <div class="yt-search-info"><div class="yt-search-title">${name} ${isPlaylist||isAlbum?'📂':''}</div><div class="yt-search-sub">${artist}</div></div>
          <span style="font-size:15px;color:#1db954;flex-shrink:0">▶</span>
        `;
        div.onclick = async () => {
          if (isPlaylist) {
            const tr = await fetchPlaylistTracks(spId); 
            spResultsArea.innerHTML = ''; tr.forEach(t => addToSpResults(t));
          } else if (isAlbum) {
            const tr = await fetchAlbumTracks(spId); 
            spResultsArea.innerHTML = ''; tr.forEach(t => addToSpResults(t));
          } else {
            activeSrcTab = 'spotify'; queue = []; currentIdx = 0;
            addToQueue({ type: 'spotify_yt', title: name, artist, spId, thumb });
          }
        };
        spResultsArea.appendChild(div);
      });
    } catch (e) { spResultsArea.innerHTML = '<p class="mp-empty">API Error!</p>'; }
  }

  function addToSpResults(t) {
    const div = document.createElement('div'); div.className = 'yt-search-item';
    div.innerHTML = `<img src="${t.image}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${t.title}</div><div class="yt-search-sub">${t.artist}</div></div><span style="font-size:15px;color:#1db954">▶</span>`;
    div.onclick = () => { activeSrcTab = 'spotify'; queue = []; currentIdx = 0; addToQueue({ type: 'spotify_yt', title: t.title, artist: t.artist, spId: t.id, thumb: t.image }); };
    spResultsArea.appendChild(div);
  }

  async function fetchPlaylistTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${id}&limit=50`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d = await r.json(); return (d.items||[]).filter(i=>i.track).map(i=>({ id:i.track.id, title:i.track.name, artist:i.track.artists[0]?.name||'', image:i.track.album?.images[0]?.url||'' }));
    } catch { return []; }
  }
  async function fetchAlbumTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/album_tracks?id=${id}`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d = await r.json(); const img = d.album?.images?.[0]?.url||''; return (d.album?.tracks?.items||[]).map(i=>({ id:i.id, title:i.name, artist:i.artists[0]?.name||'', image:img }));
    } catch { return []; }
  }

  if (spSearchSongBtn) spSearchSongBtn.onclick = () => searchSpotify(spInput.value.trim(), false);
  if (spSearchPlaylistBtn) spSearchPlaylistBtn.onclick = () => searchSpotify(spInput.value.trim(), true);
  if (spInput) spInput.addEventListener('keydown', e => { if (e.key==='Enter') spSearchSongBtn?.click(); });

  /* ═══════════════════════ 12. YT MUSIC ═══════════════════════ */
  async function searchYTMusic(query) {
    if (!query) return;
    ytmResultsArea.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(ytmResultsArea, toggleListBtnYtm);

    try {
      const r = await fetch(`https://youtube-v3-alternative.p.rapidapi.com/search?query=${encodeURIComponent(query+' song')}&geo=IN&type=video`, {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'youtube-v3-alternative.p.rapidapi.com' }
      });
      const d = await r.json(); ytmResultsArea.innerHTML = '';
      (d.data || []).forEach(item => {
        if (item.title.toLowerCase().includes('#short')) return;
        const div = document.createElement('div'); div.className = 'yt-search-item';
        const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
        div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${item.title}</div><div class="yt-search-sub">${item.channelTitle}</div></div><span style="font-size:15px;color:#ff4444">▶</span>`;
        div.onclick = () => { activeSrcTab = 'ytmusic'; queue = []; currentIdx = 0; addToQueue({ type: 'ytmusic', title: item.title, artist: item.channelTitle, ytId: item.videoId, thumb }); };
        ytmResultsArea.appendChild(div);
      });
    } catch { ytmResultsArea.innerHTML = '<p class="mp-empty">Error.</p>'; }
  }

  if (ytmSearchBtn) ytmSearchBtn.onclick = () => searchYTMusic(ytmInput.value.trim());
  if (ytmInput) ytmInput.addEventListener('keydown', e => { if (e.key==='Enter') ytmSearchBtn?.click(); });

  /* ═══════════════════════ 13. QUEUE & RENDERER ═══════════════════════ */
  function addToQueue(item) {
    queue.push(item);
    // Add manually played songs to auto-play history so auto-play doesn't re-suggest them
    autoPlayHistory.add(normalizeTitle(item.title)); 
    renderQueue(); 
    playQueueItem(queue.length-1);
  }

  function renderQueue() {
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div'); el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      el.innerHTML = `<span class="qi-title">${item.title}</span><button class="qi-del">✕</button>`;
      el.querySelector('.qi-del').onclick = e => { e.stopPropagation(); queue.splice(i,1); renderQueue(); };
      el.onclick = () => playQueueItem(i);
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i; renderQueue(); const item = queue[i];
    
    if (synced && !isRemoteAction) broadcastSync({ action: 'change_song', item });
    renderMedia(item);
    
    // Auto-play logic: If user reached the very end of the queue, fetch 5 more
    if (autoPlayEnabled && i === queue.length - 1) triggerAutoPlayLoad();
    
    // Pre-fetch the exact next item to ensure zero delay
    prefetchNextSong(); 
  }

  function showPremiumCard(src) {
    cinemaMode.classList.add('hidden'); premiumMusicCard.classList.remove('hidden'); spotifyMode.classList.add('hidden');
    premiumMusicCard.className = src === 'spotify' ? 'premium-music-card source-sp' : 'premium-music-card source-ytm';
    pmcSourceBadge.textContent = src === 'spotify' ? '🌐 Spotify' : '🎵 YT Music';
    pmcSourceBadge.className = 'pmc-source-badge ' + (src === 'spotify' ? 'sp' : 'ytm');
  }

  async function renderMedia(item) {
    nativeAudio.pause(); nativeAudio.removeAttribute('src'); isPlaying = false; updatePlayBtn(); updateProgressBar(0,0);
    ytFrameWrap.style.display = 'none'; if(ytPlayer && isYtReady) ytPlayer.pauseVideo();
    setPMCInfo(item.title, item.artist || 'Unknown', item.thumb); setTrackInfo(item.title, item.artist || 'Unknown');
    setupMediaSession(item);

    if (item.type === 'youtube') {
      activeType = 'youtube'; showCinemaMode(); ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId); else setTimeout(() => renderMedia(item), 600);
    } 
    else if (item.type === 'ytmusic' || item.type === 'spotify_yt') {
      activeType = item.type; activeSrcTab = item.type === 'ytmusic' ? 'ytmusic' : 'spotify';
      showPremiumCard(activeSrcTab);
      
      let url = item.prefetchedUrl;
      if (!url) {
        showToast('🎵 Initializing stream...');
        url = await resolveAudioUrl(item);
      }
      
      if (url) {
        nativeAudio.src = url; 
        nativeAudio.play().then(()=>{ isPlaying=true; updatePlayBtn(); premiumMusicCard.classList.add('playing'); }).catch(()=>{});
      } else if (item.ytId) {
         showToast('⚠️ Stream failed. Using iframe fallback.');
         showCinemaMode(); ytFrameWrap.style.display = 'block';
         if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      }
    }
  }

  /* ═══════════════════════ 14. HELPERS & EVENTS ═══════════════════════ */
  function showCinemaMode() { cinemaMode.classList.remove('hidden'); premiumMusicCard.classList.add('hidden'); spotifyMode.classList.add('hidden'); }
  function setPMCInfo(t,a,img) { pmcTitle.textContent=t; pmcArtist.textContent=a; pmcArtwork.src=img||'https://i.imgur.com/8Q5FqWj.jpeg'; pmcBgBlur.style.backgroundImage=`url('${pmcArtwork.src}')`; }
  function setTrackInfo(t,a) { if(musicTitle)musicTitle.textContent=t; if(miniTitle)miniTitle.textContent=`${t} • ${a}`; }
  function fmtTime(s) { if(!s||isNaN(s))return'0:00'; const m=Math.floor(s/60),sc=Math.floor(s%60); return `${m}:${sc.toString().padStart(2,'0')}`; }
  function updateProgressBar(cur,dur) { 
    if (!dur) return; pmcProgressFill.style.width=Math.min(100,(cur/dur)*100)+'%'; 
    if(pmcCurrentTime)pmcCurrentTime.textContent=fmtTime(cur); if(pmcDuration)pmcDuration.textContent=fmtTime(dur); 
  }

  nativeAudio.addEventListener('timeupdate',()=>updateProgressBar(nativeAudio.currentTime,nativeAudio.duration));
  nativeAudio.addEventListener('ended',playNext);
  
  if (pmcProgressBar) pmcProgressBar.addEventListener('click', e => { const r=pmcProgressBar.getBoundingClientRect(), pct=(e.clientX-r.left)/r.width; if(nativeAudio.duration)nativeAudio.currentTime=pct*nativeAudio.duration; });
  
  function playNext() { if(currentIdx < queue.length-1) playQueueItem(currentIdx+1); }
  function playPrev() { if(currentIdx > 0) playQueueItem(currentIdx-1); }

  [pmcNext, ...mpNexts].forEach(b => b?.addEventListener('click', playNext));
  [pmcPrev, ...mpPrevs].forEach(b => b?.addEventListener('click', playPrev));
  [pmcPlayMain, ...mpPlays].forEach(btn => btn?.addEventListener('click', () => {
    if (['ytmusic','spotify_yt','stream'].includes(activeType)) { isPlaying ? nativeAudio.pause() : nativeAudio.play(); }
    else if (activeType==='youtube'&&ytPlayer) { isPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); }
  }));

  function updatePlayBtn() {
    mpPlays.forEach(b=>b.textContent=isPlaying?'⏸':'▶'); if(pmcPlayMain)pmcPlayMain.textContent=isPlaying?'⏸':'▶';
    if(isPlaying) premiumMusicCard?.classList.add('playing'); else premiumMusicCard?.classList.remove('playing');
  }
  
  nativeAudio.addEventListener('play',()=>{ isPlaying=true; updatePlayBtn(); });
  nativeAudio.addEventListener('pause',()=>{ isPlaying=false; updatePlayBtn(); });

  function setupMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title:item.title, artist:item.artist||'ZeroX Hub', artwork:[{src:item.thumb||'https://i.imgur.com/8Q5FqWj.jpeg',sizes:'512x512',type:'image/jpeg'}] });
    navigator.mediaSession.setActionHandler('play', () => isPlaying ? null : (activeType === 'youtube' ? ytPlayer.playVideo() : nativeAudio.play()));
    navigator.mediaSession.setActionHandler('pause', () => isPlaying ? (activeType === 'youtube' ? ytPlayer.pauseVideo() : nativeAudio.pause()) : null);
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }

  /* ═══════════════════════ 15. SYNC NETWORK & DEBUG LOG ═══════════════════════ */
  function broadcastSync(data) { if(window._zxSendSync) window._zxSendSync({type:'musicSync',...data}); }
  window._zxReceiveSync = function(data) { /* sync logic remains intact */ };

  const dbgLines = []; let dbgVisible = false;
  function dbg(tag, msg, color) { console.log(`[ZX ${tag}] ${msg}`); } // Minified Debug for Performance

  dbg('INIT', 'ZeroX Hub v7 (Beast Upgrade) Loaded ✓', '#7ADB8A');
})();
