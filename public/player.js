/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (v8 — The Ultimate Fix)
   ✅ Hide/Unhide Toggle Button Restored & Placed Right
   ✅ Ultra-Strict Auto-Play (Blocks exact & similar titles)
   ✅ Spotify Best Matches Sorted on Top
   ✅ Smart Background Prefetching & Universal Play
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ═══════════════════════ 1. DOM ═══════════════════════ */
  const panel          = document.getElementById('zxPanel');
  const handle         = document.getElementById('zxHandle');
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

  const musicTitle    = document.getElementById('musicTitle');
  const miniTitle     = document.getElementById('miniTitle');
  const mpPlays       = document.querySelectorAll('.mp-play');
  const mpPrevs       = [document.getElementById('miniPrev')];
  const mpNexts       = [document.getElementById('miniNext')];

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
  
  const autoPlayHistory = new Set(); 

  // Very strict normalization to catch any variant of the same song
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

  /* ═══════════════════════ 5. PANEL ENGINE & UI ═══════════════════════ */
  let startY = 0; let isPanelOpen = false;
  function openPanel() {
    if (isPanelOpen) return; isPanelOpen = true;
    panel.classList.add('zx-open'); document.body.style.overflow = 'hidden';
    if (panelToggleBtn) panelToggleBtn.classList.add('active');
    // Pause heavy chat bg animations while player is open (prevents lag)
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

  /* ── Toggle buttons: rectangular glow-outlined, CSS-driven ── */
  function setupToggleBtn(btn, area) {
    if (!btn || !area) return;
    // Initial state driven by CSS + class, not inline style
    btn.classList.toggle('results-open', !area.classList.contains('hidden'));
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

  setupToggleBtn(toggleListBtnUrl, episodesOverlayUrl);
  setupToggleBtn(toggleListBtnYt, episodesOverlayYt);
  setupToggleBtn(toggleListBtnYtm, ytmResultsArea);
  setupToggleBtn(toggleListBtnSp, spResultsArea);

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
    try {
      const res = await fetch(`https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true&bypassSpotify=true&quality=best`, { 
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } 
      });
      const d = await res.json(); 
      const url = Array.isArray(d) ? (d[0]?.url || d[0]?.link) : (d.url || d.link);
      if (url) return url;
    } catch { }

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

  /* ═══════════════════════ 10. SMART VIBE AUTO-PLAY (FIX 2) ═══════════════════════ */
  async function fetchVibeNextSongs(title, artist, count = 5) {
    const baseNorm = normalizeTitle(title); // The exact song we want to avoid repeating
    const artistQuery = artist ? artist.replace(/\(.*?\)|\[.*?\]/g,'').trim() : '';
    const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g,'').trim();

    // 5 rotating query templates as specified
    const allQueryTemplates = [
      `similar mood songs as ${cleanTitle}`,
      `more tracks like ${cleanTitle}`,
      `tracks to play after ${cleanTitle}`,
      `latest tracks by ${artistQuery}`,
      `trending tracks of ${artistQuery}`
    ];
    // Rotate: pick 3 different ones each call using a counter
    const qOffset = (autoPlayHistory.size) % 5;
    const queries = [
      allQueryTemplates[qOffset % 5],
      allQueryTemplates[(qOffset + 1) % 5],
      allQueryTemplates[(qOffset + 2) % 5]
    ];

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
          
          const norm2 = normalizeTitle(t2);
          
          // FIX 2: ULTRA-STRICT DUPLICATE PREVENTION
          // Block if the new song title CONTAINS the old title, or vice-versa
          // Example: blocks "Finding Her (Lyric)" if base is "Finding Her"
          if (norm2.includes(baseNorm) || baseNorm.includes(norm2)) continue; 
          
          // Block if already played in history or added in current batch
          if (autoPlayHistory.has(norm2) || collected.some(c => c.norm === norm2)) continue;
          
          const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
          collected.push({ ytId: item.videoId, title: t2, artist: a2, thumb, norm: norm2 });
          
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
      prefetchNextSong();
    }
    autoPlayFetching = false;
  }

  /* ═══════════════════════ 11. SPOTIFY SEARCH (FIX 3) ═══════════════════════ */
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
      const seenIds = new Set();

      function addSpItem(type, data) {
        if (!data) return;
        const id = data.id || data.uri?.split(':').pop();
        if (!id || seenIds.has(id)) return;
        seenIds.add(id);
        items.push({ iType: type, data });
      }

      // FIX 3: SORT - Put Best Matches (Top Results) at the very top
      if (!playlistsOnly && sd?.topResults?.itemsV2) {
        sd.topResults.itemsV2.forEach(i => {
          const d = i.item?.data;
          if (d) {
            const t = d.uri?.includes('playlist') ? 'playlist' : d.uri?.includes('album') ? 'album' : 'track';
            addSpItem(t, d);
          }
        });
      }

      // Then append remaining Tracks & Albums
      if (!playlistsOnly) {
        (sd?.tracksV2?.items || []).forEach(i => addSpItem('track', i.item?.data));
        (sd?.albums?.items || []).forEach(i => addSpItem('album', i.data));
      }

      // Finally append Playlists
      (sd?.playlists?.items || []).forEach(i => addSpItem('playlist', i.data));

      // Sort: exact matches on top, then contains, then rest
      const queryLower = query.toLowerCase().trim();
      items.sort((a, b) => {
        const na = (a.data.name || '').toLowerCase(), nb = (b.data.name || '').toLowerCase();
        const aExact = na === queryLower, bExact = nb === queryLower;
        const aContains = na.includes(queryLower), bContains = nb.includes(queryLower);
        // Tracks before playlists/albums for exact matches
        const aTrack = a.iType === 'track', bTrack = b.iType === 'track';
        if (aExact && aTrack && !(bExact && bTrack)) return -1;
        if (bExact && bTrack && !(aExact && aTrack)) return 1;
        if (aExact && !bExact) return -1; if (bExact && !aExact) return 1;
        if (aContains && !bContains) return -1; if (bContains && !aContains) return 1;
        return 0;
      });

      spResultsArea.innerHTML = '';
      if (!items.length) { spResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }

      items.forEach(obj => {
        const d = obj.data;
        const name = d.name || 'Unknown', isPlaylist = obj.iType === 'playlist', isAlbum = obj.iType === 'album';
        const artist = d.artists?.items?.[0]?.profile?.name || d.ownerV2?.data?.name || 'Spotify';
        const thumb = d.albumOfTrack?.coverArt?.sources?.[0]?.url || d.images?.items?.[0]?.sources?.[0]?.url || d.coverArt?.sources?.[0]?.url || 'https://i.imgur.com/8Q5FqWj.jpeg';
        const spId = d.id || d.uri?.split(':').pop();
        const isExact = name.toLowerCase() === queryLower;

        const div = document.createElement('div');
        div.className = 'yt-search-item sp-list-item' + (isPlaylist||isAlbum ? ' sp-folder-item' : '');
        // Tracks get ▶ play button; playlists/albums get 📂 folder icon (no play)
        const rightIcon = (isPlaylist||isAlbum)
          ? `<span class="sp-folder-btn" title="Open ${isAlbum?'album':'playlist'}">📂</span>`
          : `<span class="sp-play-btn">▶</span>`;
        const badge = isExact ? `<span class="sp-best-badge">★</span>` : '';
        const typeTag = isPlaylist ? `<span class="sp-playlist-badge">PLAYLIST</span>` : isAlbum ? `<span class="sp-playlist-badge" style="background:rgba(255,160,0,0.2);color:#ffaa00">ALBUM</span>` : '';
        div.innerHTML = `
          <img src="${thumb}" class="yt-search-thumb"/>
          <div class="yt-search-info">
            <div class="yt-search-title">${badge}${name}${typeTag}</div>
            <div class="yt-search-sub">${artist}</div>
          </div>
          ${rightIcon}
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
    
    if (autoPlayEnabled && i === queue.length - 1) triggerAutoPlayLoad();
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

  /* ═══════════════════════ 15. SYNC ENGINE (FIXED) ═══════════════════════ */
  function broadcastSync(data) {
    if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data });
  }

  // Full sync receiver — handles all sync actions from remote peers
  window._zxReceiveSync = function(data) {
    if (!synced) return;
    setRemoteAction();

    switch (data.action) {
      case 'request_sync': {
        // Peer joined — send them current state
        if (queue.length > 0) {
          const cur = queue[currentIdx];
          broadcastSync({ action: 'change_song', item: cur, queueSnapshot: queue });
          setTimeout(() => {
            const t = (activeType === 'youtube' && ytPlayer && isYtReady)
              ? ytPlayer.getCurrentTime() : nativeAudio.currentTime || 0;
            broadcastSync({ action: isPlaying ? 'play' : 'pause', time: t });
          }, 1200);
        }
        break;
      }
      case 'change_song': {
        // Restore full queue if sent
        if (data.queueSnapshot && data.queueSnapshot.length > 0) {
          queue = data.queueSnapshot;
        }
        // Find or add the item
        let idx = queue.findIndex(q => q.title === data.item?.title);
        if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
        currentIdx = idx;
        renderQueue();
        renderMedia(queue[currentIdx]);
        break;
      }
      case 'play': {
        if (activeType === 'youtube' && ytPlayer && isYtReady) {
          if (data.time != null && Math.abs(ytPlayer.getCurrentTime() - data.time) > 1.5) ytPlayer.seekTo(data.time, true);
          ytPlayer.playVideo();
        } else {
          if (data.time != null && Math.abs(nativeAudio.currentTime - data.time) > 1.5) nativeAudio.currentTime = data.time;
          nativeAudio.play().catch(() => {});
        }
        break;
      }
      case 'pause': {
        if (activeType === 'youtube' && ytPlayer && isYtReady) {
          ytPlayer.pauseVideo();
          if (data.time != null) ytPlayer.seekTo(data.time, true);
        } else {
          nativeAudio.pause();
          if (data.time != null) nativeAudio.currentTime = data.time;
        }
        break;
      }
      case 'seek': {
        if (activeType === 'youtube' && ytPlayer && isYtReady) ytPlayer.seekTo(data.time, true);
        else if (data.time != null) nativeAudio.currentTime = data.time;
        break;
      }
      case 'next': { playNext(); break; }
      case 'prev':  { playPrev(); break; }
    }
  };

  // Also broadcast seek when native audio is seeked
  nativeAudio.addEventListener('seeked', () => {
    if (synced && !isRemoteAction) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
  });
  function dbg(tag, msg, color) { console.log(`[ZX ${tag}] ${msg}`); } 

  dbg('INIT', 'ZeroX Hub v8 Loaded ✓', '#7ADB8A');
})();
