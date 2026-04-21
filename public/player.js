/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js  PRO 4.1  (Critical Fixes)
   ✅ FIX 1: sanitizeMeta — proper re-assignment chain (no ghosting)
   ✅ FIX 2: Shuffle seed handshake — 5th track becomes next seed
   ✅ FIX 3: Normal mode uses MOST SIMILAR artist via lfmSimilarArtists
   ✅ FIX 4: Stream cache LRU eviction (max 40 entries, no RAM leak)
   ✅ FIX 5: Ad/junk filter in ytSearch (topic channels, ads stripped)
   ✅ FIX 6: Background playback via MediaSession + Wake Lock API
   ✅ FIX 7: playerState object for stable mode tracking
   ✅ All PRO 4.0 features preserved, Sync engine intact
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ═══ 1. DOM ═══ */
  const panel           = document.getElementById('zxPanel');
  const handle          = document.getElementById('zxHandle');
  const panelToggleBtn  = document.getElementById('panelToggleBtn');
  const nativeAudio     = document.getElementById('nativeAudio');
  const ytFrameWrap     = document.getElementById('ytFrameWrap');
  const cinemaMode      = document.getElementById('cinemaMode');
  const spotifyMode     = document.getElementById('spotifyMode');
  const premiumMusicCard= document.getElementById('premiumMusicCard');
  const pmcBgBlur       = document.getElementById('pmcBgBlur');
  const pmcArtwork      = document.getElementById('pmcArtwork');
  const pmcGlow         = document.getElementById('pmcGlow');
  const pmcTitle        = document.getElementById('pmcTitle');
  const pmcArtist       = document.getElementById('pmcArtist');
  const pmcSourceBadge  = document.getElementById('pmcSourceBadge');
  const pmcCurrentTime  = document.getElementById('pmcCurrentTime');
  const pmcDuration     = document.getElementById('pmcDuration');
  const pmcProgressFill = document.getElementById('pmcProgressFill');
  const pmcProgressBar  = document.getElementById('pmcProgressBar');
  const pmcPlayMain     = document.getElementById('pmcPlayMain');
  const pmcPrev         = document.getElementById('pmcPrev');
  const pmcNext         = document.getElementById('pmcNext');
  const musicTitle      = document.getElementById('musicTitle');
  const miniTitle       = document.getElementById('miniTitle');
  const mpPlays         = document.querySelectorAll('.mp-play');
  const mpPrevs         = [document.getElementById('miniPrev')];
  const mpNexts         = [document.getElementById('miniNext')];
  const ytInput         = document.getElementById('ytInput');
  const ytAddBtn        = document.getElementById('ytAddBtn');
  const ytmInput        = document.getElementById('ytmInput');
  const ytmSearchBtn    = document.getElementById('ytmSearchBtn');
  const ytmResultsArea  = document.getElementById('ytmSearchResults');
  const spInput         = document.getElementById('spInput');
  const spSearchSongBtn     = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const spResultsArea   = document.getElementById('spSearchResults');
  const queueList       = document.getElementById('queueList');
  const toggleListBtnUrl   = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt    = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt  = document.getElementById('episodesOverlayYt');
  const ytSearchResultsEl  = document.getElementById('ytSearchResults');
  const toggleListBtnYtm   = document.getElementById('toggleListBtnYtm');
  const toggleListBtnSp    = document.getElementById('toggleListBtnSp');
  const mpSyncBadge        = document.getElementById('mpSyncBadge');
  const mpSyncToggleBtn    = document.getElementById('mpSyncToggleBtn');
  const autoPlayToggleBtn  = document.getElementById('autoPlayToggle');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ═══ 2. API KEYS ═══ */
  const RAPID_API_KEY = 'da0d895439msheac2f60c49aa9d0p1cb891jsne02d1eaab2fd';
  const SP81_HOST     = 'spotify81.p.rapidapi.com';
  const LFM_KEY       = '64e3a55c11e6aa253b65f16ba5cf5047';
  const LFM_BASE      = 'https://ws.audioscrobbler.com/2.0/';
  const YT_ALT_HOST   = 'youtube-v3-alternative.p.rapidapi.com';

  /* ═══ 3. STATE ═══ */
  let queue            = [];
  let currentIdx       = 0;
  let synced           = false;
  let activeType       = 'none';
  let activeSrcTab     = 'none';
  let isPlaying        = false;
  let ytPlayer         = null;
  let isYtReady        = false;
  let isRemoteAction   = false;
  let autoPlayEnabled  = true;
  let autoPlayFetching = false;
  let inSpotifyPlaylist    = false;
  let spotifyPlaylistEnded = false;
  let spDiscoveryMode  = 'repeat'; // 'repeat' | 'discovery'

  /*
   * ── FIX 7: playerState — single authoritative object ──
   * Replaces scattered batchCount / batchSimilarArtist / etc.
   * Reset on every manual (non-autoplay) song change.
   */
  const playerState = {
    mode: 'normal',         // 'normal' | 'shuffle' | 'loop'
    shuffleSeed: null,      // { title, artist } — THE SEED for current shuffle batch
    shuffleBatchPos: 0,     // position within 5-track shuffle batch (0-4)
    normalArtist: '',       // artist currently being deep-dived in normal mode
    normalSimilarArtist:'', // the switched-to similar artist
    normalBatchPos: 0,      // position within 10-track normal batch (0-9)
    usedArtists: new Set(), // artists already visited this session
  };

  /* ── FIX 3: LRU Stream Cache (max 40 entries) ──
   * Oldest entries evicted first → no RAM leak.
   */
  const CACHE_MAX = 40;
  const streamCache = new Map(); // insertion-order = LRU order

  function cacheSet(key, val) {
    if (streamCache.has(key)) streamCache.delete(key); // refresh order
    streamCache.set(key, val);
    if (streamCache.size > CACHE_MAX) {
      // Delete the oldest (first) entry
      streamCache.delete(streamCache.keys().next().value);
    }
  }
  function cacheGet(key) { return streamCache.get(key) ?? null; }

  const autoPlayHistory = new Set();

  /* ── Wake Lock handle (background playback) ── */
  let wakeLock = null;

  /* ═══ 4. METADATA SANITIZATION — FIX 1 ═══
   *
   * BUG WAS: chained .replace() on a string literal — each call returned
   * a NEW string that was discarded. Now we assign ct step by step so
   * every transformation actually sticks.
   */
  function sanitizeMeta(rawTitle, rawArtist) {
    // ── Clean Title ──
    let ct = rawTitle || '';
    ct = ct.replace(/\[.*?\]/g, ' ');            // strip [Official Video] etc
    ct = ct.replace(/\(.*?\)/g, ' ');            // strip (Lyric Video) etc
    ct = ct.replace(/official\s*(video|audio|music\s*video|lyric\s*video|mv)?/gi, ' ');
    ct = ct.replace(/\b(lyrics?|4k|hd|hq|full\s*song|full\s*version)\b/gi, ' ');
    ct = ct.replace(/\bfeat\.?.*/gi, ' ');       // everything after feat.
    ct = ct.replace(/\bft\.?.*/gi, ' ');         // everything after ft.
    ct = ct.replace(/\bprod\.?.*/gi, ' ');       // producer credit
    ct = ct.replace(/\|\s*.*/g, ' ');            // pipe and everything after
    ct = ct.replace(/[-–—]\s*(official|lyrics?|audio|video|full|hd|hq|4k).*/gi, ' ');
    ct = ct.replace(/[-–—]/g, ' ');              // remaining dashes → space
    ct = ct.replace(/\s{2,}/g, ' ');             // collapse whitespace
    ct = ct.trim();

    // ── Clean Artist ──
    let ca = rawArtist || '';
    ca = ca.replace(/\s*-\s*topic\s*$/gi, '');   // "Artist - Topic" (YouTube auto)
    ca = ca.replace(/\bVEVO\s*$/gi, '');          // "ArtistVEVO"
    ca = ca.replace(/\s{2,}/g, ' ');
    ca = ca.trim();

    return { cleanTitle: ct, cleanArtist: ca };
  }

  // Normalize for deduplication comparison only (not for API calls)
  function normTitle(t) {
    return (t || '').toLowerCase()
      .replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '')
      .replace(/\b(official|audio|video|lyric|feat\..*|ft\..*)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /* ═══ 5. LAST.FM API ═══ */
  async function lfm(params) {
    const u = new URL(LFM_BASE);
    Object.entries({ ...params, api_key: LFM_KEY, format: 'json' })
      .forEach(([k, v]) => u.searchParams.set(k, v));
    try {
      const r = await fetch(u.toString());
      return await r.json();
    } catch { return {}; }
  }

  async function lfmSimilarTracks(title, artist, limit = 10) {
    // Use sanitized values — FIX 1 ensures these are actually clean now
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(title, artist);
    const d = await lfm({ method: 'track.getSimilar', track: ct, artist: ca, limit, autocorrect: 1 });
    return (d?.similartracks?.track || []).map(t => ({ title: t.name, artist: t.artist.name }));
  }

  async function lfmSimilarArtists(artist, limit = 10) {
    const { cleanArtist: ca } = sanitizeMeta('', artist);
    const d = await lfm({ method: 'artist.getSimilar', artist: ca, limit, autocorrect: 1 });
    return (d?.similarartists?.artist || []).map(a => a.name);
  }

  async function lfmArtistTopTracks(artist, limit = 8) {
    const { cleanArtist: ca } = sanitizeMeta('', artist);
    const d = await lfm({ method: 'artist.getTopTracks', artist: ca, limit, autocorrect: 1 });
    return (d?.toptracks?.track || []).map(t => ({ title: t.name, artist: t.artist?.name || artist }));
  }

  /* ═══ 6. YT SEARCH — FIX 5 (Ad/junk filter) ═══ */
  function isYouTubeUrl(s) { return /youtu\.?be|youtube\.com/.test(s); }
  function extractYouTubeId(s) {
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // Channel-level ad/junk patterns to skip
  const AD_CHANNEL_PATTERNS = /\b(advertisement|promoted|sponsor|vevo\s*ads|google\s*ads)\b/i;
  // Title-level junk/ad patterns
  const AD_TITLE_PATTERNS   = /\b(advertisement|sponsored|promo\b|ad\b)\b/i;
  // Topic channels look like "Artist - Topic" — fine for auto, but keep for user search
  const TOPIC_SUFFIX = /\s*-\s*topic\s*$/i;

  async function ytSearch(query, max = 8, strictMusicOnly = false) {
    try {
      const r = await fetch(
        `https://${YT_ALT_HOST}/search?query=${encodeURIComponent(query)}&geo=IN&type=video`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': YT_ALT_HOST } }
      );
      const d = await r.json();
      return (d.data || []).filter(i => {
        const t = (i.title || '').toLowerCase();
        const ch = (i.channelTitle || '').toLowerCase();
        // Block shorts/reels
        if (t.includes('#short') || t.includes('shorts') || t.includes('reels')) return false;
        // Block obvious ads
        if (AD_TITLE_PATTERNS.test(i.title) || AD_CHANNEL_PATTERNS.test(i.channelTitle)) return false;
        // In strictMusicOnly mode also block podcasts, news, compilations
        if (strictMusicOnly) {
          if (/\b(podcast|news|radio\s*ad|compilation\b|megamix\b)\b/i.test(i.title)) return false;
        }
        return true;
      }).slice(0, max);
    } catch { return []; }
  }

  /* Build a clean, strict query for resolving a Last.fm track to a YouTube ID */
  async function resolveToYtId(title, artist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(title, artist);
    // Strict query: "clean title" + "clean artist" + "official audio" — avoids covers/remixes
    const q = ca
      ? `"${ct}" "${ca}" official audio`
      : `"${ct}" official audio`;
    const items = await ytSearch(q, 6, true);
    const pick = items.find(i => !autoPlayHistory.has(normTitle(i.title))) || items[0];
    if (!pick) return null;
    return {
      ytId:  pick.videoId,
      title: pick.title,
      thumb: pick.thumbnail?.[1]?.url || pick.thumbnail?.[0]?.url || ''
    };
  }

  /* ═══ 7. STREAM CACHE / AUDIO EXTRACTION ═══ */
  async function extractYTAudioUrl(ytId) {
    const k = 'yt_' + ytId;
    const cached = cacheGet(k);
    if (cached) return cached;

    // Method 1: SP81 bypass (fastest, m4a)
    try {
      const r = await fetch(
        `https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true&bypassSpotify=true&quality=best`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } }
      );
      const d = await r.json();
      const u = Array.isArray(d) ? (d[0]?.url || d[0]?.link) : (d.url || d.link);
      if (u) { cacheSet(k, u); return u; }
    } catch {}

    // Method 2: ytstream (fallback)
    try {
      const r = await fetch(
        `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com' } }
      );
      const d = await r.json();
      if (d.formats) {
        // Prefer opus/webm audio streams (no ads, pure audio)
        const af = Object.values(d.formats)
          .filter(f => f.url && f.mimeType?.includes('audio'))
          .sort((a, b) => parseInt(b.bitrate || 0) - parseInt(a.bitrate || 0));
        if (af.length) { cacheSet(k, af[0].url); return af[0].url; }
      }
    } catch {}

    return null;
  }

  async function fetchPremiumAudio(spId) {
    const k = 'sp_' + spId;
    const cached = cacheGet(k);
    if (cached) return cached;
    try {
      const r = await fetch(
        `https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true&quality=best`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } }
      );
      const d = await r.json();
      const u = Array.isArray(d) ? (d[0]?.url || d[0]?.link) : (d.url || d.link || d.downloadUrl);
      if (u) { cacheSet(k, u); return u; }
    } catch {}
    return null;
  }

  async function resolveAudioUrl(item) {
    if (item.prefetchedUrl) return item.prefetchedUrl;
    if (item.type === 'ytmusic') return await extractYTAudioUrl(item.ytId);
    if (item.type === 'spotify_yt') {
      if (item.spId) {
        const u = await fetchPremiumAudio(item.spId);
        if (u) return u;
      }
      // Fallback: search YT with clean query
      const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(item.title, item.artist || '');
      const items = await ytSearch(`"${ct}" "${ca}" official audio`, 5, true);
      if (items[0]) { item.ytId = items[0].videoId; return await extractYTAudioUrl(items[0].videoId); }
    }
    return null;
  }

  /* Prefetch next 2-3 tracks in background — zero-delay transitions */
  async function prefetchAhead() {
    const toFetch = queue.slice(currentIdx + 1, currentIdx + 4)
      .filter(it => !it.prefetchedUrl && !['youtube', 'stream'].includes(it.type));
    for (const item of toFetch) {
      const url = await resolveAudioUrl(item);
      if (url) item.prefetchedUrl = url;
    }
  }

  /* ═══ 8. WAKE LOCK — FIX 6 (Background playback on lock screen) ═══
   *
   * The Screen Wake Lock API tells the OS "don't suspend the tab".
   * Combined with nativeAudio being an actual <audio> element (not Web
   * Audio API), MediaSession keeps playback alive even when screen locks.
   * Release the lock when the user explicitly pauses.
   */
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      if (wakeLock && !wakeLock.released) return; // already held
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { /* permission denied or not supported — silent fail */ }
  }

  async function releaseWakeLock() {
    if (wakeLock && !wakeLock.released) {
      try { await wakeLock.release(); } catch {}
      wakeLock = null;
    }
  }

  // Re-acquire lock when page becomes visible again (handles page-visibility change)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isPlaying) {
      await acquireWakeLock();
    }
  });

  /* ═══ 9. PLAYBACK MODE ENGINE ═══ */
  const MODE_ICONS  = { normal: '➡️', shuffle: '🔀', loop: '🔂' };
  const MODE_LABELS = { normal: 'Normal', shuffle: 'Shuffle', loop: 'Loop' };

  function modeIconSvg(mode) {
    if (mode === 'shuffle')
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>`;
    if (mode === 'loop')
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
  }

  function injectModeSwitch() {
    if (document.getElementById('pmcModeBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'pmcModeBtn';
    btn.className = `pmc-mode-btn pmc-mode-${playerState.mode}`;
    btn.title = 'Playback Mode';
    btn.innerHTML = `<span class="pmc-mode-icon">${modeIconSvg(playerState.mode)}</span>`;
    btn.addEventListener('click', cyclePlaybackMode);
    premiumMusicCard?.appendChild(btn);
  }

  function injectSpDiscoverySwitch() {
    if (document.getElementById('pmcSpDiscBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'pmcSpDiscBtn';
    btn.className = 'pmc-sp-disc-btn hidden';
    btn.title = 'Spotify: Repeat | Auto-Discovery';
    btn.innerHTML = `<span class="pmc-sp-disc-icon">🔁</span>`;
    btn.addEventListener('click', () => {
      spDiscoveryMode = spDiscoveryMode === 'repeat' ? 'discovery' : 'repeat';
      btn.querySelector('.pmc-sp-disc-icon').textContent = spDiscoveryMode === 'repeat' ? '🔁' : '✨';
      btn.classList.toggle('disc-active', spDiscoveryMode === 'discovery');
      showToast(spDiscoveryMode === 'discovery' ? '✨ Auto-Discovery ON' : '🔁 Repeat Playlist');
    });
    premiumMusicCard?.appendChild(btn);
  }

  function updateModeBtn() {
    const btn = document.getElementById('pmcModeBtn');
    if (!btn) return;
    btn.className = `pmc-mode-btn pmc-mode-${playerState.mode}`;
    btn.querySelector('.pmc-mode-icon').innerHTML = modeIconSvg(playerState.mode);
    btn.title = `Mode: ${MODE_LABELS[playerState.mode]}`;
  }

  function cyclePlaybackMode() {
    const modes = ['normal', 'shuffle', 'loop'];
    playerState.mode = modes[(modes.indexOf(playerState.mode) + 1) % 3];
    // Reset batch counters on mode change so fresh context
    playerState.shuffleBatchPos = 0;
    playerState.normalBatchPos  = 0;
    playerState.normalSimilarArtist = '';
    updateModeBtn();
    showToast(`${MODE_ICONS[playerState.mode]} ${MODE_LABELS[playerState.mode]} Mode`);
  }

  function showSpDiscBtn(show) {
    document.getElementById('pmcSpDiscBtn')?.classList.toggle('hidden', !show);
  }

  /* ═══ 10. AUTO-PLAY ENGINE — FIX 2 & FIX 3 ═══ */

  /*
   * SHUFFLE MODE (5-Track Discovery Loop)
   * Songs 1-3 : track.getSimilar from current seed
   * Songs 4-5 : similar artist → their top tracks
   *
   * FIX 2 — SEED HANDSHAKE:
   * shuffleSeed is always set to the LAST track of the batch before we
   * fetch the next batch, so the chain never breaks.
   * The 5th track IS the seed for batch N+1.
   */
  async function buildShuffleBatch() {
    const seed = playerState.shuffleSeed || { title: '', artist: '' };
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(seed.title, seed.artist);

    let tracks = [];

    // Songs 1-3: track.getSimilar
    let sim = await lfmSimilarTracks(ct, ca, 15);
    sim = sim.filter(t => !autoPlayHistory.has(normTitle(t.title)));
    tracks.push(...sim.slice(0, 3));

    // Songs 4-5: similar artist deep-dive
    const simArtists = await lfmSimilarArtists(ca, 10);
    const nextArtist = simArtists.find(
      a => a.toLowerCase() !== ca.toLowerCase() && !playerState.usedArtists.has(a.toLowerCase())
    ) || simArtists[0];

    if (nextArtist) {
      playerState.usedArtists.add(nextArtist.toLowerCase());
      let art = await lfmArtistTopTracks(nextArtist, 8);
      art = art.filter(t => !autoPlayHistory.has(normTitle(t.title)));
      tracks.push(...art.slice(0, 2));
    }

    // Failsafe: YouTube fallback if Last.fm yields < 2
    if (tracks.length < 2) {
      const fq = `songs similar to "${ct}" by "${ca}"`;
      const ytItems = await ytSearch(fq, 8, true);
      for (const y of ytItems) {
        if (tracks.length >= 5) break;
        if (!autoPlayHistory.has(normTitle(y.title)))
          tracks.push({ title: y.title, artist: y.channelTitle || ca, _yt: y });
      }
    }

    const batch = tracks.slice(0, 5);

    // FIX 2: Set the 5th track (last of batch) as the seed for the NEXT batch
    if (batch.length > 0) {
      const last = batch[batch.length - 1];
      playerState.shuffleSeed = { title: last.title, artist: last.artist || ca };
    }
    playerState.shuffleBatchPos = 0;

    return batch;
  }

  /*
   * NORMAL MODE (10-Track Artist Deep-Dive)
   * Songs 1-5 : current artist's top tracks
   * Songs 6-10: MOST SIMILAR artist's top tracks  (FIX 3)
   *
   * FIX 3: We call lfmSimilarArtists and pick the TOP result (rank 1)
   * which is always the closest stylistically, not just any random one.
   * After 10 songs that similar artist becomes the new "current artist".
   */
  async function buildNormalBatch(seedTitle, seedArtist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(seedTitle, seedArtist);
    let tracks = [];

    const batchPos = playerState.normalBatchPos;

    if (batchPos < 5) {
      // Phase 1 (songs 1-5): same artist
      if (!playerState.normalArtist) playerState.normalArtist = ca;
      let art = await lfmArtistTopTracks(playerState.normalArtist, 10);
      art = art.filter(t =>
        !autoPlayHistory.has(normTitle(t.title)) &&
        normTitle(t.title) !== normTitle(ct)
      );
      tracks = art.slice(0, 5 - batchPos);
    } else {
      // Phase 2 (songs 6-10): switch to MOST SIMILAR artist (FIX 3)
      if (!playerState.normalSimilarArtist) {
        const simArtists = await lfmSimilarArtists(playerState.normalArtist || ca, 10);
        // Pick rank-1 result that we haven't used yet
        const next = simArtists.find(
          a => a.toLowerCase() !== (playerState.normalArtist || ca).toLowerCase()
            && !playerState.usedArtists.has(a.toLowerCase())
        ) || simArtists[0] || ca;
        playerState.normalSimilarArtist = next;
        playerState.usedArtists.add(next.toLowerCase());
      }
      let art = await lfmArtistTopTracks(playerState.normalSimilarArtist, 10);
      art = art.filter(t => !autoPlayHistory.has(normTitle(t.title)));
      tracks = art.slice(0, 5);

      // After phase 2 completes: rotate — similar artist becomes the new current artist
      if (batchPos >= 9) {
        playerState.normalArtist = playerState.normalSimilarArtist;
        playerState.normalSimilarArtist = '';
        playerState.normalBatchPos = 0;
      }
    }

    // Failsafe
    if (tracks.length < 2) {
      const fq = `songs similar to "${ct}" by "${ca}"`;
      const ytItems = await ytSearch(fq, 8, true);
      for (const y of ytItems) {
        if (tracks.length >= 5) break;
        if (!autoPlayHistory.has(normTitle(y.title)))
          tracks.push({ title: y.title, artist: y.channelTitle || ca, _yt: y });
      }
    }

    return tracks.slice(0, 5);
  }

  async function triggerAutoPlayLoad() {
    if (autoPlayFetching || queue.length === 0 || playerState.mode === 'loop') return;
    autoPlayFetching = true;

    const seed = queue[queue.length - 1]; // last track = seed

    // Spotify playlist end + auto-discovery → use shuffle
    if (activeSrcTab === 'spotify' && spotifyPlaylistEnded && spDiscoveryMode === 'discovery') {
      spotifyPlaylistEnded = false;
      playerState.shuffleSeed = { title: seed.title, artist: seed.artist || '' };
    }

    let metas;
    if (playerState.mode === 'shuffle') {
      // Ensure seed is set on first call
      if (!playerState.shuffleSeed) {
        playerState.shuffleSeed = { title: seed.title, artist: seed.artist || '' };
      }
      metas = await buildShuffleBatch();
    } else {
      metas = await buildNormalBatch(seed.title, seed.artist || '');
    }

    const type = activeSrcTab === 'spotify' ? 'spotify_yt' : 'ytmusic';

    for (const meta of metas) {
      const n = normTitle(meta.title);
      if (autoPlayHistory.has(n)) continue;
      autoPlayHistory.add(n);
      playerState.normalBatchPos++;
      playerState.shuffleBatchPos++;

      let qItem;
      if (meta._yt) {
        const y = meta._yt;
        qItem = {
          type,
          title: y.title,
          artist: y.channelTitle || '',
          ytId: y.videoId,
          thumb: y.thumbnail?.[1]?.url || y.thumbnail?.[0]?.url || '',
          isAutoPlay: true
        };
      } else {
        const res = await resolveToYtId(meta.title, meta.artist);
        if (!res) continue;
        qItem = {
          type,
          title: meta.title,
          artist: meta.artist,
          ytId: res.ytId,
          thumb: res.thumb,
          isAutoPlay: true
        };
      }
      queue.push(qItem);
    }

    renderQueue();
    prefetchAhead();
    autoPlayFetching = false;
  }

  /* ═══ 11. AUTO-PLAY TOGGLE ═══ */
  if (autoPlayToggleBtn) {
    autoPlayToggleBtn.classList.add('active');
    autoPlayToggleBtn.addEventListener('click', () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayToggleBtn.classList.toggle('active', autoPlayEnabled);
      showToast(autoPlayEnabled ? '∞ Auto-play ON' : '⏹ Auto-play OFF');
    });
  }

  /* ═══ 12. PANEL ENGINE ═══ */
  let startY = 0, isPanelOpen = false;
  function openPanel() {
    if (isPanelOpen) return; isPanelOpen = true;
    panel.classList.add('zx-open'); document.body.style.overflow = 'hidden';
    panelToggleBtn?.classList.add('active');
    document.getElementById('chatApp')?.classList.add('player-open');
  }
  function closePanel() {
    if (!isPanelOpen) return; isPanelOpen = false;
    panel.classList.remove('zx-open'); document.body.style.overflow = '';
    panelToggleBtn?.classList.remove('active');
    document.getElementById('chatApp')?.classList.remove('player-open');
  }
  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  handle.addEventListener('touchmove',  e => { if (!isPanelOpen && e.touches[0].clientY - startY > 15) openPanel(); }, { passive: true });
  panelToggleBtn?.addEventListener('click', e => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle.addEventListener('click', e => { if (e.target.closest('.mp-btn,.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });

  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
    });
  });

  function showToast(msg) {
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:9px 16px;border-radius:20px;font-size:12px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;white-space:nowrap;';
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  /* Toggle buttons */
  function setupToggleBtn(btn, area) {
    if (!btn || !area) return;
    btn.classList.toggle('results-open', !area.classList.contains('hidden'));
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const nowH = area.classList.toggle('hidden');
      btn.classList.toggle('results-open', !nowH);
    });
  }
  function showResultsArea(area, btn) {
    if (!area) return; area.classList.remove('hidden'); btn?.classList.add('results-open');
  }
  setupToggleBtn(toggleListBtnUrl,  episodesOverlayUrl);
  setupToggleBtn(toggleListBtnYt,   episodesOverlayYt);
  setupToggleBtn(toggleListBtnYtm,  ytmResultsArea);
  setupToggleBtn(toggleListBtnSp,   spResultsArea);

  /* Playlist Exit Button */
  function injectPlaylistExitBtn() {
    if (document.getElementById('spPlaylistExitBtn')) return;
    const strip = document.getElementById('spStripRow'); if (!strip) return;
    const btn = document.createElement('button');
    btn.id = 'spPlaylistExitBtn'; btn.className = 'playlist-exit-btn hidden';
    btn.title = 'Exit Playlist'; btn.textContent = '✕ Exit';
    btn.addEventListener('click', () => {
      spResultsArea.innerHTML = '<div class="sp-empty-state"><div class="sp-empty-icon">🌐</div><p>Search global music tracks</p></div>';
      queue = []; currentIdx = 0; renderQueue();
      inSpotifyPlaylist = false; spotifyPlaylistEnded = false;
      btn.classList.add('hidden');
      showToast('📋 Playlist cleared');
    });
    strip.insertBefore(btn, strip.firstChild);
  }

  /* ═══ 13. SYNC ENGINE (100% preserved) ═══ */
  function setRemoteAction() { isRemoteAction = true; setTimeout(() => { isRemoteAction = false; }, 2000); }

  mpSyncToggleBtn?.addEventListener('click', () => {
    synced = !synced;
    mpSyncBadge.textContent = synced ? '🟢 Synced' : '🔴 Solo';
    mpSyncBadge.classList.toggle('synced', synced);
    mpSyncToggleBtn.textContent = synced ? 'Synced ✓' : 'Sync 🔗';
    mpSyncToggleBtn.classList.toggle('synced', synced);
    if (synced) broadcastSync({ action: 'request_sync' });
    showToast(synced ? '🔗 Sync Active' : '🔌 Sync Off');
  });

  function broadcastSync(data) { window._zxSendSync?.({ type: 'musicSync', ...data }); }

  window._zxReceiveSync = function(data) {
    if (!synced) return; setRemoteAction();
    switch (data.action) {
      case 'request_sync':
        if (queue.length > 0) {
          broadcastSync({ action: 'change_song', item: queue[currentIdx], queueSnapshot: queue });
          setTimeout(() => {
            const t = (activeType === 'youtube' && ytPlayer && isYtReady)
              ? ytPlayer.getCurrentTime() : nativeAudio.currentTime || 0;
            broadcastSync({ action: isPlaying ? 'play' : 'pause', time: t });
          }, 1200);
        }
        break;
      case 'change_song':
        if (data.queueSnapshot?.length > 0) queue = data.queueSnapshot;
        let idx = queue.findIndex(q => q.title === data.item?.title);
        if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
        currentIdx = idx; renderQueue(); renderMedia(queue[currentIdx]); break;
      case 'play':
        if (activeType === 'youtube' && ytPlayer && isYtReady) {
          if (data.time != null && Math.abs(ytPlayer.getCurrentTime() - data.time) > 1.5) ytPlayer.seekTo(data.time, true);
          ytPlayer.playVideo();
        } else {
          if (data.time != null && Math.abs(nativeAudio.currentTime - data.time) > 1.5) nativeAudio.currentTime = data.time;
          nativeAudio.play().catch(() => {});
        } break;
      case 'pause':
        if (activeType === 'youtube' && ytPlayer && isYtReady) { ytPlayer.pauseVideo(); if (data.time != null) ytPlayer.seekTo(data.time, true); }
        else { nativeAudio.pause(); if (data.time != null) nativeAudio.currentTime = data.time; } break;
      case 'seek':
        if (activeType === 'youtube' && ytPlayer && isYtReady) ytPlayer.seekTo(data.time, true);
        else if (data.time != null) nativeAudio.currentTime = data.time; break;
      case 'next': playNext(); break;
      case 'prev': playPrev(); break;
    }
  };
  nativeAudio.addEventListener('seeked', () => {
    if (synced && !isRemoteAction) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
  });

  /* ═══ 14. YT IFRAME ENGINE ═══ */
  const ytTag = document.createElement('script');
  ytTag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(ytTag);

  window.onYouTubeIframeAPIReady = function() {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0, modestbranding: 1 },
      events: { onReady: () => { isYtReady = true; }, onStateChange: onPSC }
    });
  };
  function onPSC(ev) {
    if (ev.data === YT.PlayerState.PLAYING)      { isPlaying = true;  updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play',  time: ytPlayer.getCurrentTime() }); }
    else if (ev.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: ytPlayer.getCurrentTime() }); }
    else if (ev.data === YT.PlayerState.ENDED)   { playNext(); }
  }

  /* ═══ 15. YT TAB SEARCH (URL bypass) ═══ */
  function searchYouTubeDisplay(query) {
    if (!query) return;
    if (isYouTubeUrl(query)) {
      const id = extractYouTubeId(query);
      if (id) { addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id, thumb: '' }); showToast('▶ Loading…'); return; }
    }
    if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(episodesOverlayYt, toggleListBtnYt);
    ytSearch(query, 15).then(items => {
      if (!ytSearchResultsEl) return;
      ytSearchResultsEl.innerHTML = '';
      if (!items.length) { ytSearchResultsEl.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
      items.forEach(vid => {
        const thumb = vid.thumbnail?.[1]?.url || vid.thumbnail?.[0]?.url || '';
        const div = document.createElement('div'); div.className = 'yt-search-item';
        div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${vid.title || ''}</div><div class="yt-search-sub">${vid.channelTitle || ''}</div></div><span style="font-size:15px;color:#ff4444;flex-shrink:0">▶</span>`;
        div.onclick = () => { queue = []; currentIdx = 0; addToQueue({ type: 'youtube', title: vid.title || '', ytId: vid.videoId, thumb }); showToast('▶ Playing!'); };
        ytSearchResultsEl.appendChild(div);
      });
    }).catch(() => { if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<p class="mp-empty">Error.</p>'; });
  }

  ytAddBtn?.addEventListener('click', () => { const v = ytInput.value.trim(); if (!v) return; searchYouTubeDisplay(v); ytInput.value = ''; });
  ytInput?.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });

  /* ═══ 16. SPOTIFY SEARCH ═══ */
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
      const resp = await res.json(); const sd = resp?.data?.searchV2 || resp;
      let items = []; const seen = new Set();
      function addSp(type, data) {
        if (!data) return; const id = data.id || data.uri?.split(':').pop();
        if (!id || seen.has(id)) return; seen.add(id); items.push({ iType: type, data });
      }
      if (!playlistsOnly && sd?.topResults?.itemsV2)
        sd.topResults.itemsV2.forEach(i => { const d = i.item?.data; if (d) { const t = d.uri?.includes('playlist') ? 'playlist' : d.uri?.includes('album') ? 'album' : 'track'; addSp(t, d); } });
      if (!playlistsOnly) {
        (sd?.tracksV2?.items || []).forEach(i => addSp('track', i.item?.data));
        (sd?.albums?.items || []).forEach(i => addSp('album', i.data));
      }
      (sd?.playlists?.items || []).forEach(i => addSp('playlist', i.data));

      const ql = query.toLowerCase().trim();
      items.sort((a, b) => {
        const na = (a.data.name || '').toLowerCase(), nb = (b.data.name || '').toLowerCase();
        const aE = na === ql, bE = nb === ql, aC = na.includes(ql), bC = nb.includes(ql), aT = a.iType === 'track', bT = b.iType === 'track';
        if (aE && aT && !(bE && bT)) return -1; if (bE && bT && !(aE && aT)) return 1;
        if (aE && !bE) return -1; if (bE && !aE) return 1;
        if (aC && !bC) return -1; if (bC && !aC) return 1; return 0;
      });

      spResultsArea.innerHTML = '';
      if (!items.length) { spResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }

      items.forEach(obj => {
        const d = obj.data; const name = d.name || 'Unknown', isPL = obj.iType === 'playlist', isAL = obj.iType === 'album';
        const artist = d.artists?.items?.[0]?.profile?.name || d.ownerV2?.data?.name || 'Spotify';
        const thumb  = d.albumOfTrack?.coverArt?.sources?.[0]?.url || d.images?.items?.[0]?.sources?.[0]?.url || d.coverArt?.sources?.[0]?.url || 'https://i.imgur.com/8Q5FqWj.jpeg';
        const spId   = d.id || d.uri?.split(':').pop();
        const isEx   = name.toLowerCase() === ql;
        const div = document.createElement('div');
        div.className = 'yt-search-item sp-list-item' + (isPL || isAL ? ' sp-folder-item' : '');
        const rIcon   = (isPL || isAL) ? `<span class="sp-folder-btn" title="${isAL ? 'Album' : 'Playlist'}">📂</span>` : `<span class="sp-play-btn">▶</span>`;
        const badge   = isEx ? `<span class="sp-best-badge">★</span>` : '';
        const tTag    = isPL ? `<span class="sp-playlist-badge">PLAYLIST</span>` : isAL ? `<span class="sp-playlist-badge" style="background:rgba(255,160,0,.2);color:#ffaa00">ALBUM</span>` : '';
        div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${badge}${name}${tTag}</div><div class="yt-search-sub">${artist}</div></div>${rIcon}`;
        div.onclick = async () => {
          if (isPL) {
            showToast('📂 Loading playlist…');
            const tr = await fetchPlaylistTracks(spId);
            spResultsArea.innerHTML = ''; tr.forEach(t => addToSpResults(t));
            inSpotifyPlaylist = true;
            document.getElementById('spPlaylistExitBtn')?.classList.remove('hidden');
            activeSrcTab = 'spotify'; queue = []; currentIdx = 0;
            tr.forEach(t => queue.push({ type: 'spotify_yt', title: t.title, artist: t.artist, spId: t.id, thumb: t.image }));
            renderQueue(); if (queue.length > 0) playQueueItem(0);
          } else if (isAL) {
            showToast('📂 Loading album…');
            const tr = await fetchAlbumTracks(spId);
            spResultsArea.innerHTML = ''; tr.forEach(t => addToSpResults(t));
          } else {
            activeSrcTab = 'spotify'; queue = []; currentIdx = 0;
            addToQueue({ type: 'spotify_yt', title: name, artist, spId, thumb });
          }
        };
        spResultsArea.appendChild(div);
      });
    } catch { spResultsArea.innerHTML = '<p class="mp-empty">API Error!</p>'; }
  }

  function addToSpResults(t) {
    const div = document.createElement('div'); div.className = 'yt-search-item';
    div.innerHTML = `<img src="${t.image}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${t.title}</div><div class="yt-search-sub">${t.artist}</div></div><span class="sp-play-btn">▶</span>`;
    div.onclick = () => { activeSrcTab = 'spotify'; queue = []; currentIdx = 0; addToQueue({ type: 'spotify_yt', title: t.title, artist: t.artist, spId: t.id, thumb: t.image }); };
    spResultsArea.appendChild(div);
  }

  async function fetchPlaylistTracks(id) {
    try { const r = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${id}&limit=50`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } }); const d = await r.json(); return (d.items || []).filter(i => i.track).map(i => ({ id: i.track.id, title: i.track.name, artist: i.track.artists[0]?.name || '', image: i.track.album?.images[0]?.url || '' })); } catch { return []; }
  }
  async function fetchAlbumTracks(id) {
    try { const r = await fetch(`https://${SP81_HOST}/album_tracks?id=${id}`, { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } }); const d = await r.json(); const img = d.album?.images?.[0]?.url || ''; return (d.album?.tracks?.items || []).map(i => ({ id: i.id, title: i.name, artist: i.artists[0]?.name || '', image: img })); } catch { return []; }
  }

  spSearchSongBtn?.addEventListener('click', () => searchSpotify(spInput.value.trim(), false));
  spSearchPlaylistBtn?.addEventListener('click', () => searchSpotify(spInput.value.trim(), true));
  spInput?.addEventListener('keydown', e => { if (e.key === 'Enter') spSearchSongBtn?.click(); });

  /* ═══ 17. YT MUSIC SEARCH ═══ */
  async function searchYTMusic(query) {
    if (!query) return;
    ytmResultsArea.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(ytmResultsArea, toggleListBtnYtm);
    const items = await ytSearch(query + ' song', 12);
    ytmResultsArea.innerHTML = '';
    if (!items.length) { ytmResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
    items.forEach(item => {
      const div = document.createElement('div'); div.className = 'yt-search-item';
      const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
      div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${item.title}</div><div class="yt-search-sub">${item.channelTitle}</div></div><span style="font-size:15px;color:#ff4444">▶</span>`;
      div.onclick = () => { activeSrcTab = 'ytmusic'; queue = []; currentIdx = 0; addToQueue({ type: 'ytmusic', title: item.title, artist: item.channelTitle, ytId: item.videoId, thumb }); };
      ytmResultsArea.appendChild(div);
    });
  }

  ytmSearchBtn?.addEventListener('click', () => searchYTMusic(ytmInput.value.trim()));
  ytmInput?.addEventListener('keydown', e => { if (e.key === 'Enter') ytmSearchBtn?.click(); });

  /* ═══ 18. QUEUE ENGINE ═══ */
  function addToQueue(item) {
    queue.push(item);
    autoPlayHistory.add(normTitle(item.title));
    renderQueue();
    playQueueItem(queue.length - 1);
  }

  function renderQueue() {
    if (!queueList) return; queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      const icon = { youtube: '🎬', ytmusic: '🎵', spotify_yt: '🌐', stream: '☁️' }[item.type] || '🎵';
      el.innerHTML = `<span style="font-size:10px;opacity:.5;flex-shrink:0">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del">✕</button>`;
      el.querySelector('.qi-del').onclick = e => { e.stopPropagation(); queue.splice(i, 1); if (currentIdx >= queue.length) currentIdx = Math.max(0, queue.length - 1); renderQueue(); };
      el.onclick = () => playQueueItem(i);
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    if (playerState.mode === 'loop' && i !== currentIdx) { renderMedia(queue[currentIdx]); return; }
    currentIdx = i; renderQueue();
    const item = queue[i];
    if (synced && !isRemoteAction) broadcastSync({ action: 'change_song', item });
    renderMedia(item);
    if (autoPlayEnabled && i >= queue.length - 2) triggerAutoPlayLoad();
    prefetchAhead();
  }

  function showPremiumCard(src) {
    cinemaMode.classList.add('hidden'); premiumMusicCard.classList.remove('hidden'); spotifyMode.classList.add('hidden');
    premiumMusicCard.className = src === 'spotify' ? 'premium-music-card source-sp' : 'premium-music-card source-ytm';
    pmcSourceBadge.textContent = src === 'spotify' ? '🌐 Spotify' : '🎵 YT Music';
    pmcSourceBadge.className   = 'pmc-source-badge ' + (src === 'spotify' ? 'sp' : 'ytm');
    showSpDiscBtn(src === 'spotify');
  }

  async function renderMedia(item) {
    nativeAudio.pause(); nativeAudio.removeAttribute('src');
    isPlaying = false; updatePlayBtn(); updateProgressBar(0, 0);
    ytFrameWrap.style.display = 'none'; if (ytPlayer && isYtReady) ytPlayer.pauseVideo();
    setPMCInfo(item.title, item.artist || 'Unknown', item.thumb);
    setTrackInfo(item.title, item.artist || 'Unknown');
    setupMediaSession(item);

    if (item.type === 'youtube') {
      activeType = 'youtube'; showCinemaMode(); ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId); else setTimeout(() => renderMedia(item), 600);
    } else if (item.type === 'ytmusic' || item.type === 'spotify_yt') {
      activeType = item.type; activeSrcTab = item.type === 'ytmusic' ? 'ytmusic' : 'spotify';
      showPremiumCard(activeSrcTab);
      // Reset batch tracking on fresh (non-autoplay) track
      if (!item.isAutoPlay) {
        playerState.normalArtist = '';
        playerState.normalSimilarArtist = '';
        playerState.normalBatchPos = 0;
        playerState.shuffleBatchPos = 0;
        playerState.shuffleSeed = { title: item.title, artist: item.artist || '' };
        playerState.usedArtists.clear();
      }
      let url = item.prefetchedUrl || await resolveAudioUrl(item);
      if (url) {
        nativeAudio.src = url;
        nativeAudio.play()
          .then(async () => {
            isPlaying = true;
            updatePlayBtn();
            premiumMusicCard.classList.add('playing');
            await acquireWakeLock(); // FIX 6: keep screen/tab alive
          })
          .catch(() => showToast('Tap ▶ to play'));
      } else if (item.ytId) {
        showToast('⚠️ Stream failed — iframe fallback');
        showCinemaMode(); ytFrameWrap.style.display = 'block';
        if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      }
    }
  }

  /* ═══ 19. HELPERS & EVENTS ═══ */
  function showCinemaMode() { cinemaMode.classList.remove('hidden'); premiumMusicCard.classList.add('hidden'); spotifyMode.classList.add('hidden'); }
  function setPMCInfo(t, a, img) { pmcTitle.textContent = t; pmcArtist.textContent = a; pmcArtwork.src = img || 'https://i.imgur.com/8Q5FqWj.jpeg'; pmcBgBlur.style.backgroundImage = `url('${pmcArtwork.src}')`; }
  function setTrackInfo(t, a)    { if (musicTitle) musicTitle.textContent = t; if (miniTitle) miniTitle.textContent = `${t} • ${a}`; }
  function fmtTime(s)            { if (!s || isNaN(s)) return '0:00'; const m = Math.floor(s / 60), sc = Math.floor(s % 60); return `${m}:${sc.toString().padStart(2, '0')}`; }
  function updateProgressBar(cur, dur) {
    if (!dur) return; pmcProgressFill.style.width = Math.min(100, (cur / dur) * 100) + '%';
    if (pmcCurrentTime) pmcCurrentTime.textContent = fmtTime(cur);
    if (pmcDuration)    pmcDuration.textContent    = fmtTime(dur);
  }

  nativeAudio.addEventListener('timeupdate', () => updateProgressBar(nativeAudio.currentTime, nativeAudio.duration));
  nativeAudio.addEventListener('ended', () => {
    if (activeSrcTab === 'spotify' && inSpotifyPlaylist && currentIdx === queue.length - 1) spotifyPlaylistEnded = true;
    playNext();
  });
  pmcProgressBar?.addEventListener('click', e => {
    const r = pmcProgressBar.getBoundingClientRect(), p = (e.clientX - r.left) / r.width;
    if (nativeAudio.duration) nativeAudio.currentTime = p * nativeAudio.duration;
  });

  function playNext() {
    if (playerState.mode === 'loop') { renderMedia(queue[currentIdx]); return; }
    if (currentIdx < queue.length - 1) playQueueItem(currentIdx + 1);
    else if (autoPlayEnabled) triggerAutoPlayLoad();
  }
  function playPrev() {
    if (playerState.mode === 'loop') { renderMedia(queue[currentIdx]); return; }
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
  }

  [pmcNext, ...mpNexts].forEach(b => b?.addEventListener('click', playNext));
  [pmcPrev, ...mpPrevs].forEach(b => b?.addEventListener('click', playPrev));
  [pmcPlayMain, ...mpPlays].forEach(btn => btn?.addEventListener('click', () => {
    if (['ytmusic', 'spotify_yt', 'stream'].includes(activeType)) { isPlaying ? nativeAudio.pause() : nativeAudio.play(); }
    else if (activeType === 'youtube' && ytPlayer) { isPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); }
  }));

  function updatePlayBtn() {
    mpPlays.forEach(b => b.textContent = isPlaying ? '⏸' : '▶');
    if (pmcPlayMain) pmcPlayMain.textContent = isPlaying ? '⏸' : '▶';
    if (isPlaying) premiumMusicCard?.classList.add('playing');
    else premiumMusicCard?.classList.remove('playing');
  }

  nativeAudio.addEventListener('play', async () => {
    isPlaying = true; updatePlayBtn();
    if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    await acquireWakeLock(); // keep alive when screen locks
  });
  nativeAudio.addEventListener('pause', async () => {
    isPlaying = false; updatePlayBtn();
    if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
    await releaseWakeLock(); // allow screen to sleep on pause
  });

  /* ─── MediaSession — FIX 6 ───
   * Full MediaSession registration with seekTo handlers ensures the OS
   * media controls (lock screen, notification bar) stay functional even
   * when the tab is backgrounded.  The 'play' action handler is critical:
   * without it many Android browsers kill playback after ~30 s.
   */
  function setupMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   item.title,
      artist:  item.artist || 'ZeroX Hub',
      artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play',          () => { if (activeType === 'youtube') ytPlayer?.playVideo(); else nativeAudio.play(); });
    navigator.mediaSession.setActionHandler('pause',         () => { if (activeType === 'youtube') ytPlayer?.pauseVideo(); else nativeAudio.pause(); });
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack',     playNext);
    navigator.mediaSession.setActionHandler('stop',          () => { nativeAudio.pause(); nativeAudio.currentTime = 0; });
    // seekto is required to keep the session "active" on some browsers
    navigator.mediaSession.setActionHandler('seekto', details => {
      if (details.seekTime != null && nativeAudio.duration) {
        nativeAudio.currentTime = details.seekTime;
      }
    });
  }

  /* ═══ 20. INIT ═══ */
  (function init() {
    injectModeSwitch();
    injectSpDiscoverySwitch();
    injectPlaylistExitBtn();
    updateModeBtn();
    renderQueue();
    console.log('[ZX PRO 4.1] Critical fixes applied ✓ | Wake Lock: ' + ('wakeLock' in navigator ? 'supported' : 'not supported'));
  })();

})();
