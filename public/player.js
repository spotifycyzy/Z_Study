/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js  FINAL CLEAN BUILD
   ✅ Auto-vibe engine via YouTube Related Videos API
   ✅ JioSaavn fallback for Global Music tab
   ✅ Zero duplicate declarations, zero crashes
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── 1. DOM ─────────────────────────────────────────────── */
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
  const mpPlays        = document.querySelectorAll('.mp-play');
  const mpPrevs        = [document.getElementById('miniPrev')];
  const mpNexts        = [document.getElementById('miniNext')];
  const urlInput       = document.getElementById('urlInput');
  const urlAddBtn      = document.getElementById('urlAddBtn');
  const fileInput      = document.getElementById('fileInput');
  const ytInput        = document.getElementById('ytInput');
  const ytAddBtn       = document.getElementById('ytAddBtn');
  const spInput        = document.getElementById('spInput');
  const spSearchSongBtn     = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const queueList      = document.getElementById('queueList');
  const toggleListBtnUrl    = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl  = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt     = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt   = document.getElementById('episodesOverlayYt');
  const ytSearchResults     = document.getElementById('ytSearchResults');
  const toggleListBtnSp     = document.getElementById('toggleListBtnSp');
  const episodesOverlaySp   = document.getElementById('episodesOverlaySp');
  const spSearchResults     = document.getElementById('spSearchResults');
  const mpSyncBadge    = document.getElementById('mpSyncBadge');
  const mpSyncBtn      = document.getElementById('mpSyncBtn');
  const mpSyncInfo     = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn    = document.getElementById('mpUnsyncBtn');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ── 2. CONFIG ──────────────────────────────────────────── */
  const YOUTUBE_API_KEY = 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

  /* ── 3. STATE ───────────────────────────────────────────── */
  let queue          = [];
  let currentIdx     = 0;
  let synced         = false;
  let activeType     = 'none';
  let isPlaying      = false;
  let ytPlayer       = null;
  let isYtReady      = false;
  let isRemoteAction = false;
  let remoteTimer    = null;
  let autoPlay       = true;
  let isFetching     = false;   // guard: prevent duplicate vibe fetches

  function setRemoteAction() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000);
  }

  /* ── 4. PANEL ENGINE ────────────────────────────────────── */
  let startY = 0, isPanelOpen = false;

  function openPanel() {
    if (isPanelOpen) return;
    isPanelOpen = true;
    panel.classList.add('zx-open');
    document.body.style.overflow = 'hidden';
    panelToggleBtn?.classList.add('active');
  }
  function closePanel() {
    if (!isPanelOpen) return;
    isPanelOpen = false;
    panel.classList.remove('zx-open');
    document.body.style.overflow = '';
    panelToggleBtn?.classList.remove('active');
  }

  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive:true});
  handle.addEventListener('touchmove',  e => { if (!isPanelOpen && e.touches[0].clientY - startY > 15) openPanel(); }, {passive:true});
  panelToggleBtn?.addEventListener('click', e => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle.addEventListener('click', e => { if (e.target.closest('.mp-btn,.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive:true});
    closeHandle.addEventListener('touchmove',  e => { if (isPanelOpen && startY - e.touches[0].clientY > 15) closePanel(); }, {passive:true});
    closeHandle.addEventListener('click', closePanel);
  }
  panel.addEventListener('touchmove', e => { if (isPanelOpen && !e.target.closest('.music-panel-inner')) e.preventDefault(); }, {passive:false});

  /* ── TABS ───────────────────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
    });
  });

  toggleListBtnUrl?.addEventListener('click', () => episodesOverlayUrl?.classList.toggle('hidden'));
  toggleListBtnYt?.addEventListener('click',  () => episodesOverlayYt?.classList.toggle('hidden'));
  toggleListBtnSp?.addEventListener('click',  () => episodesOverlaySp?.classList.toggle('hidden'));

  /* ── TOAST ──────────────────────────────────────────────── */
  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ── 5. YOUTUBE IFRAME ENGINE ───────────────────────────── */
  const ytScript = document.createElement('script');
  ytScript.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(ytScript);

  window.onYouTubeIframeAPIReady = function () {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay:1, controls:1, playsinline:1, rel:0 },
      events: {
        onReady: () => { isYtReady = true; },
        onStateChange: onYTState,
        onError: () => { showToast('Video unavailable'); setTimeout(playNext, 1500); }
      }
    });
  };

  function onYTState(event) {
    const S = YT.PlayerState;
    if (event.data === S.PLAYING) { isPlaying = true;  updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({action:'play',  time:ytPlayer.getCurrentTime()}); }
    if (event.data === S.PAUSED)  { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({action:'pause', time:ytPlayer.getCurrentTime()}); }
    if (event.data === S.ENDED)   { playNext(); }
  }

  /* ── 6. YOUTUBE SEARCH ──────────────────────────────────── */
  function searchYouTube(query, targetId, type) {
    if (!query) return;
    const resDiv = document.getElementById(targetId);
    if (!resDiv) return;
    resDiv.innerHTML = '<p class="mp-empty">🔍 Searching…</p>';
    if (targetId === 'ytSearchResults') episodesOverlayYt?.classList.remove('hidden');

    const q = type === 'youtube_audio' ? query + ' audio song' : query;
    const cat = type === 'youtube_audio' ? '&videoCategoryId=10' : '';

    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(q)}&type=video${cat}&key=${YOUTUBE_API_KEY}`)
      .then(r => r.json())
      .then(data => {
        resDiv.innerHTML = '';
        if (!data.items?.length) { resDiv.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
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
            addToQueue({ type, title: vid.snippet.title, ytId: vid.id.videoId, thumb: vid.snippet.thumbnails.high?.url || vid.snippet.thumbnails.medium.url });
          };
          resDiv.appendChild(div);
        });
      })
      .catch(() => { resDiv.innerHTML = '<p class="mp-empty">Search failed. Check connection.</p>'; });
  }

  /* ══════════════════════════════════════════════════════════
     7. VIBE ENGINE — YouTube Related Videos
     When a YT-based song ends, fetch related videos from the
     same video ID. Same energy, same genre, zero extra API.
     For JioSaavn streams: extract keywords from title+artist
     and search YouTube music for similar songs.
  ══════════════════════════════════════════════════════════ */
  async function fetchVibeRecommendations(item) {
    try {
      // Path A: item has a ytId → use YouTube relatedToVideoId
      if (item.ytId) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&type=video&relatedToVideoId=${item.ytId}&key=${YOUTUBE_API_KEY}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.items?.length) {
          return data.items
            .filter(v => v.id?.videoId && v.id.videoId !== item.ytId)
            .slice(0, 5)
            .map(v => ({
              type:  item.type === 'youtube' ? 'youtube' : 'youtube_audio',
              title: v.snippet.title,
              ytId:  v.id.videoId,
              thumb: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.medium?.url || '',
              vibeFrom: item.title   // traceability
            }));
        }
      }

      // Path B: stream/JioSaavn — build a smart query from title + artist
      // e.g. "Arijit Singh sad songs" or "Dua Lipa pop"
      const titleWords = (item.title || '').replace(/\(.*?\)/g,'').replace(/\[.*?\]/g,'').trim().split(' ').slice(0,4).join(' ');
      const artistPart = item.artist ? item.artist.split(',')[0].trim() : '';
      const vibeQuery  = artistPart ? `${artistPart} ${titleWords} similar` : `${titleWords} similar songs`;

      const url2 = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(vibeQuery)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
      const res2  = await fetch(url2);
      const data2 = await res2.json();

      if (data2.items?.length) {
        return data2.items.slice(0, 5).map(v => ({
          type:  'youtube_audio',
          title: v.snippet.title,
          ytId:  v.id.videoId,
          thumb: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.medium?.url || '',
          vibeFrom: item.title
        }));
      }
    } catch (e) {
      console.warn('[vibe]', e.message);
    }
    return [];
  }

  /* Background pre-fetch — runs silently after a song starts */
  async function preFetchVibes(item) {
    if (isFetching) return;
    // Don't fetch if queue already has songs ahead
    if (currentIdx < queue.length - 1) return;
    isFetching = true;
    try {
      const vibes = await fetchVibeRecommendations(item);
      if (vibes.length) {
        // Add to queue without repeating what's already there
        const existingIds = new Set(queue.map(q => q.ytId || q.url));
        vibes.filter(v => !existingIds.has(v.ytId)).forEach(v => queue.push(v));
        renderQueue();
        console.log(`[vibe] +${vibes.length} tracks pre-loaded from "${item.title}"`);
      }
    } finally {
      isFetching = false;
    }
  }

  /* ── 8. GLOBAL MUSIC TAB — JioSaavn ────────────────────── */
  async function searchJioSaavn(query) {
    if (!query) return;
    const resDiv = spSearchResults;
    if (!resDiv) return;
    resDiv.innerHTML = '<p class="mp-empty">🔍 Searching Global Music…</p>';
    episodesOverlaySp?.classList.remove('hidden');

    const APIS = [
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=20`,
      `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(query)}`,
      `https://saavn.me/search/songs?query=${encodeURIComponent(query)}`
    ];

    let rendered = false;
    for (const apiUrl of APIS) {
      try {
        const res  = await fetch(apiUrl, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) continue;
        const json = await res.json();
        const items = json?.data?.results || json?.data || json?.results || [];
        if (!items.length) continue;

        resDiv.innerHTML = '';
        let count = 0;
        items.forEach(song => {
          const thumb = song.image?.find?.(i => i.quality==='500x500')?.url || song.image?.slice?.(-1)[0]?.url || '';
          const audioUrl = song.downloadUrl?.find?.(d => d.quality==='320kbps')?.url || song.downloadUrl?.slice?.(-1)[0]?.url || '';
          if (!audioUrl) return;
          const artist = song.artists?.primary?.map(a=>a.name).join(', ') || song.primaryArtists || 'Unknown';
          count++;
          const div = document.createElement('div');
          div.className = 'yt-search-item';
          div.innerHTML = `
            <img src="${thumb||'https://i.imgur.com/8Q5FqWj.jpeg'}" class="yt-search-thumb" style="border-radius:50%;width:46px;height:46px;"/>
            <div class="yt-search-info">
              <div class="yt-search-title">${song.name||song.title||'Track'}</div>
              <div class="yt-search-sub">${artist}</div>
            </div>
            <span style="font-size:18px;padding:0 4px;color:#E8436A">▶</span>`;
          div.onclick = () => {
            addToQueue({ type:'stream', title:song.name||song.title||'Track', url:audioUrl, thumb, artist, isMzix:true });
            showToast('🎵 Added!');
          };
          resDiv.appendChild(div);
        });

        if (count === 0) { resDiv.innerHTML = '<p class="mp-empty">No playable tracks. Try another query.</p>'; }
        rendered = true;
        break;
      } catch (e) { console.warn('[saavn]', e.message); }
    }

    // Fallback to YouTube Music search if JioSaavn fails
    if (!rendered) {
      resDiv.innerHTML = '<p class="mp-empty">JioSaavn busy — searching YouTube Music…</p>';
      setTimeout(() => searchYouTube(query, 'spSearchResults', 'youtube_audio'), 300);
    }
    if (spInput) spInput.value = '';
  }

  spSearchSongBtn?.addEventListener('click', () => searchJioSaavn(spInput?.value.trim()));
  spSearchPlaylistBtn?.addEventListener('click', () => searchJioSaavn(spInput?.value.trim()));
  spInput?.addEventListener('keydown', e => { if (e.key==='Enter') spSearchSongBtn?.click(); });

  /* ── 9. URL / FILE / YT TAB ─────────────────────────────── */
  ytAddBtn?.addEventListener('click', () => {
    const val = ytInput?.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { addToQueue({type:'youtube', title:'YouTube Video', ytId:extractYTId(val)}); ytInput.value=''; return; }
    searchYouTube(val, 'ytSearchResults', 'youtube');
    ytInput.value = '';
  });
  ytInput?.addEventListener('keydown', e => { if (e.key==='Enter') ytAddBtn?.click(); });

  urlAddBtn?.addEventListener('click', () => {
    const val = urlInput?.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { addToQueue({type:'youtube', title:'YouTube Video', ytId:extractYTId(val)}); }
    else if (val.startsWith('http')) { addToQueue({type:'stream', title:val.split('/').pop().split('?')[0]||'Audio', url:val}); }
    urlInput.value = '';
  });
  urlInput?.addEventListener('keydown', e => { if (e.key==='Enter') urlAddBtn?.click(); });

  fileInput?.addEventListener('change', () => {
    const f = fileInput.files[0]; if (!f) return;
    addToQueue({type:'stream', title:f.name, url:URL.createObjectURL(f)});
    fileInput.value = '';
  });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYTId(url)  { const m=url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/); return m?m[1]:null; }

  /* ── 10. QUEUE ──────────────────────────────────────────── */
  function addToQueue(item) {
    queue.push(item);
    renderQueue();
    playQueueItem(queue.length - 1);
  }

  function renderQueue() {
    if (!queue.length) { queueList.innerHTML = '<p class="mp-empty">Queue empty. Search a song.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el  = document.createElement('div');
      el.className = 'mp-queue-item' + (i===currentIdx?' playing':'');
      const ico = item.type==='youtube' ? '🎬' : item.type==='youtube_audio' ? '🎵' : '☁️';
      const vibe= item.vibeFrom ? `<span style="font-size:9px;color:rgba(255,181,200,0.4);display:block">similar to: ${item.vibeFrom.slice(0,20)}</span>` : '';
      el.innerHTML = `<span class="qi-type">${ico}</span><span class="qi-title">${item.title}${vibe}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = e => {
        if (e.target.classList.contains('qi-del')) { queue.splice(parseInt(e.target.dataset.i),1); renderQueue(); return; }
        playQueueItem(i);
      };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i; renderQueue();
    const item = queue[i];
    if (synced && !isRemoteAction && !item.url?.startsWith('blob:')) broadcastSync({action:'change_song', item});
    renderMedia(item);
  }

  /* Single playNext — no duplicates */
  function playNext() {
    if (currentIdx < queue.length - 1) {
      playQueueItem(currentIdx + 1);
    } else if (autoPlay) {
      showToast('✨ Loading similar vibes…');
      const cur = queue[currentIdx];
      if (cur) {
        fetchVibeRecommendations(cur).then(vibes => {
          if (!vibes.length) { showToast('No more vibes found.'); return; }
          const existing = new Set(queue.map(q => q.ytId||q.url));
          vibes.filter(v => !existing.has(v.ytId)).forEach(v => queue.push(v));
          renderQueue();
          playQueueItem(currentIdx + 1);
        });
      }
    }
  }

  function playPrev() {
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
    else showToast('First song!');
  }

  mpNexts.forEach(b => b?.addEventListener('click', playNext));
  mpPrevs.forEach(b => b?.addEventListener('click', playPrev));

  /* ── 11. RENDER MEDIA ───────────────────────────────────── */
  function renderMedia(item) {
    // Stop everything
    nativeAudio.pause();
    nativeAudio.removeAttribute('src');
    nativeAudio.srcObject = null;
    ytFrameWrap.style.display = 'none';
    if (ytPlayer && isYtReady) try { ytPlayer.pauseVideo(); } catch {}
    isPlaying = false; updatePlayBtn();

    ensureVisualizer(item);

    if (item.type === 'youtube') {
      activeType = 'youtube';
      spotifyMode.classList.add('hidden');
      cinemaMode.classList.remove('hidden');
      ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => { if (isYtReady) ytPlayer.loadVideoById(item.ytId); }, 800);
      setTrackInfo(item.title, '▶ YouTube Video');
      setupMediaSession(item);
      // Pre-fetch vibes in background
      if (autoPlay) setTimeout(() => preFetchVibes(item), 3000);

    } else if (item.type === 'youtube_audio') {
      activeType = 'youtube_audio';
      cinemaMode.classList.add('hidden');
      spotifyMode.classList.remove('hidden');
      setTrackInfo(item.title, '⏳ Loading audio…');

      // Load YT audio via hidden iframe approach
      // ytId exists → use YT player hidden, map audio via iframe
      // But since we want BACKGROUND playback, we use the YT iframe
      // hidden at 1x1px so audio plays. This is the most reliable method.
      if (!document.getElementById('ytAudioWrap')) {
        const wrap = document.createElement('div');
        wrap.id = 'ytAudioWrap';
        wrap.style.cssText = 'position:fixed;bottom:-2px;left:-2px;width:1px;height:1px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1;';
        wrap.innerHTML = '<div id="ytAudioInner"></div>';
        document.body.appendChild(wrap);
        window._ytAudioPlayer = new YT.Player('ytAudioInner', {
          width:1, height:1,
          playerVars: {autoplay:1, controls:0, playsinline:1, rel:0},
          events: {
            onReady: () => { window._ytAudioReady = true; },
            onStateChange: e => {
              if (e.data === YT.PlayerState.PLAYING) { isPlaying=true; updatePlayBtn(); if(synced&&!isRemoteAction) broadcastSync({action:'play',time:e.target.getCurrentTime()}); }
              if (e.data === YT.PlayerState.PAUSED)  { isPlaying=false; updatePlayBtn(); if(synced&&!isRemoteAction) broadcastSync({action:'pause',time:e.target.getCurrentTime()}); }
              if (e.data === YT.PlayerState.ENDED)   { playNext(); }
            },
            onError: () => { showToast('Track unavailable, skipping…'); setTimeout(playNext,1000); }
          }
        });
      }

      const loadAudio = () => {
        if (window._ytAudioReady && window._ytAudioPlayer) {
          window._ytAudioPlayer.loadVideoById(item.ytId);
          setTrackInfo(item.title, item.artist||'🎵 Music');
          setupMediaSession(item);
          isPlaying = true; updatePlayBtn();
          if (autoPlay) setTimeout(() => preFetchVibes(item), 3000);
        } else {
          setTimeout(loadAudio, 400);
        }
      };
      loadAudio();

    } else if (item.type === 'stream') {
      activeType = 'stream';
      cinemaMode.classList.add('hidden');
      spotifyMode.classList.remove('hidden');
      nativeAudio.src = item.url;
      nativeAudio.play()
        .then(() => { isPlaying=true; updatePlayBtn(); })
        .catch(() => showToast('Tap ▶ to play'));
      setTrackInfo(item.title, item.isMzix ? '🎵 Global Stream' : '☁️ Audio');
      setupMediaSession(item);
      if (autoPlay) setTimeout(() => preFetchVibes(item), 5000);
    }
  }

  /* ── 12. HELPERS ────────────────────────────────────────── */
  function ensureVisualizer(item) {
    if (!document.querySelector('.music-visualizer')) {
      const viz = document.createElement('div');
      viz.className = 'music-visualizer'; viz.id = 'visualizer';
      viz.innerHTML = '<div class="bar"></div>'.repeat(5);
      vinylRecord?.parentNode?.insertBefore(viz, vinylRecord.nextSibling);
    }
    if (vinylRecord) {
      vinylRecord.style.backgroundImage    = `url('${item.thumb||'https://i.imgur.com/8Q5FqWj.jpeg'}')`;
      vinylRecord.style.backgroundSize     = 'cover';
      vinylRecord.style.backgroundPosition = 'center';
    }
  }

  function setupMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title, artist: item.artist||'ZeroX Hub',
      artwork: [{src: item.thumb||'https://i.imgur.com/8Q5FqWj.jpeg', sizes:'512x512', type:'image/jpeg'}]
    });
    navigator.mediaSession.setActionHandler('play',          () => { if (activeType==='youtube'&&ytPlayer) ytPlayer.playVideo(); else if(activeType==='youtube_audio'&&window._ytAudioPlayer) window._ytAudioPlayer.playVideo(); else nativeAudio.play(); });
    navigator.mediaSession.setActionHandler('pause',         () => { if (activeType==='youtube'&&ytPlayer) ytPlayer.pauseVideo(); else if(activeType==='youtube_audio'&&window._ytAudioPlayer) window._ytAudioPlayer.pauseVideo(); else nativeAudio.pause(); });
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack',     playNext);
  }

  function updatePlayBtn() {
    mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶');
    const vis = document.getElementById('visualizer') || document.querySelector('.music-visualizer');
    if (isPlaying && activeType !== 'youtube') {
      vinylRecord?.classList.add('playing');
      vis?.classList.add('playing');
    } else {
      vinylRecord?.classList.remove('playing');
      vis?.classList.remove('playing');
    }
  }

  function setTrackInfo(title, sub) {
    if (musicTitle)  musicTitle.textContent  = title;
    if (musicArtist) musicArtist.textContent = sub;
    if (miniTitle)   miniTitle.textContent   = `${title} • ${sub}`;
  }

  /* ── 13. NATIVE AUDIO EVENTS ────────────────────────────── */
  nativeAudio.addEventListener('play',  () => { isPlaying=true;  updatePlayBtn(); if(synced&&!isRemoteAction) broadcastSync({action:'play',  time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('pause', () => { isPlaying=false; updatePlayBtn(); if(synced&&!isRemoteAction) broadcastSync({action:'pause', time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('seeked',() => { if(synced&&!isRemoteAction) broadcastSync({action:'seek', time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('ended', playNext);
  nativeAudio.addEventListener('error', () => { if(activeType==='stream') { showToast('Audio error, skipping…'); setTimeout(playNext,1000); } });

  /* ── GLOBAL PLAY/PAUSE BUTTON ───────────────────────────── */
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
    if (activeType==='youtube'       && ytPlayer)              { isPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); }
    else if (activeType==='youtube_audio' && window._ytAudioPlayer) { isPlaying ? window._ytAudioPlayer.pauseVideo() : window._ytAudioPlayer.playVideo(); }
    else if (activeType==='stream')                            { isPlaying ? nativeAudio.pause() : nativeAudio.play().catch(()=>{}); }
  }));

  /* ── 14. SYNC NETWORK ───────────────────────────────────── */
  mpSyncBtn?.addEventListener('click', () => {
    synced=true; mpSyncBadge.textContent='🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncBtn.style.display='none'; mpSyncInfo.style.display='flex';
    broadcastSync({action:'request_sync'}); showToast('🔗 Sync Active');
  });
  mpUnsyncBtn?.addEventListener('click', () => {
    synced=false; mpSyncBadge.textContent='🔴 Solo'; mpSyncBadge.classList.remove('synced');
    mpSyncBtn.style.display='block'; mpSyncInfo.style.display='none';
  });

  function broadcastSync(data) { window._zxSendSync?.({ type:'musicSync', ...data }); }

  window._zxReceiveSync = function (data) {
    if (data.action === 'request_sync') {
      const cur = queue[currentIdx];
      if (synced && cur && !cur.url?.startsWith('blob:')) {
        broadcastSync({action:'change_song', item:cur});
        setTimeout(() => {
          const t = activeType==='youtube'&&ytPlayer&&isYtReady ? ytPlayer.getCurrentTime()
                  : activeType==='youtube_audio'&&window._ytAudioPlayer&&window._ytAudioReady ? window._ytAudioPlayer.getCurrentTime()
                  : nativeAudio.currentTime;
          broadcastSync({action: isPlaying?'play':'pause', time:t});
        }, 1600);
      }
      return;
    }

    // Auto-enable sync on receiver
    synced=true;
    if (mpSyncBadge) { mpSyncBadge.textContent='🟢 Synced'; mpSyncBadge.classList.add('synced'); }
    if (mpSyncBtn)  mpSyncBtn.style.display='none';
    if (mpSyncInfo) mpSyncInfo.style.display='flex';
    setRemoteAction();

    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.ytId===data.item.ytId || q.url===data.item.url);
      if (idx===-1) { queue.push(data.item); idx=queue.length-1; }
      currentIdx=idx; renderQueue(); renderMedia(queue[idx]); return;
    }

    const ytAP = window._ytAudioPlayer;
    if (activeType==='youtube'&&ytPlayer&&isYtReady) {
      if (data.action==='play')  { ytPlayer.seekTo(data.time,true); ytPlayer.playVideo(); }
      if (data.action==='pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time,true); }
      if (data.action==='seek')  { ytPlayer.seekTo(data.time,true); }
    } else if (activeType==='youtube_audio'&&ytAP&&window._ytAudioReady) {
      if (data.action==='play')  { ytAP.seekTo(data.time,true); ytAP.playVideo(); }
      if (data.action==='pause') { ytAP.pauseVideo(); ytAP.seekTo(data.time,true); }
      if (data.action==='seek')  { ytAP.seekTo(data.time,true); }
    } else if (activeType==='stream') {
      if (data.action==='play')  { if(Math.abs(nativeAudio.currentTime-data.time)>1.5) nativeAudio.currentTime=data.time; nativeAudio.play().catch(()=>{}); }
      if (data.action==='pause') { nativeAudio.currentTime=data.time; nativeAudio.pause(); }
      if (data.action==='seek')  { nativeAudio.currentTime=data.time; }
    }
  };

  /* ── 15. FULLSCREEN ─────────────────────────────────────── */
  function onFullscreen() {
    document.body.classList.toggle('is-fullscreen',
      !!(document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement));
  }
  document.addEventListener('fullscreenchange',       onFullscreen);
  document.addEventListener('webkitfullscreenchange', onFullscreen);

  /* ── INIT ───────────────────────────────────────────────── */
  renderQueue();
})();
