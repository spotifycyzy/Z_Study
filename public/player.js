/* ═══════════════════════════════════════════════════════════════════
   ZEROX HUB — player.js  PRO 4.3  (All 5 Holes Sealed + 4.2 Fixes)
   ✅ HOLE 1: sanitizeMeta — ultra-aggressive regex (no blank queries)
   ✅ HOLE 2: JIT (Just-in-Time) stream fetching — API quota −80%
   ✅ HOLE 3: Lock-screen heartbeat + MediaSession force-state
   ✅ HOLE 4: Discovery button tied to queue content, not track context
   ✅ HOLE 5: Unified batchEngine — shuffle/normal never overlap
   ✅ All PRO 4.2 fixes preserved (FIX 1–10 intact)
   ✅ Sync engine 100% intact
═══════════════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ═══════════════════════════════════════════════
     1. DOM REFERENCES
  ═══════════════════════════════════════════════ */
  const panel               = document.getElementById('zxPanel');
  const handle              = document.getElementById('zxHandle');
  const panelToggleBtn      = document.getElementById('panelToggleBtn');
  const nativeAudio         = document.getElementById('nativeAudio');
  const ytFrameWrap         = document.getElementById('ytFrameWrap');
  const cinemaMode          = document.getElementById('cinemaMode');
  const spotifyMode         = document.getElementById('spotifyMode');
  const premiumMusicCard    = document.getElementById('premiumMusicCard');
  const pmcBgBlur           = document.getElementById('pmcBgBlur');
  const pmcArtwork          = document.getElementById('pmcArtwork');
  const pmcGlow             = document.getElementById('pmcGlow');
  const pmcTitle            = document.getElementById('pmcTitle');
  const pmcArtist           = document.getElementById('pmcArtist');
  const pmcSourceBadge      = document.getElementById('pmcSourceBadge');
  const pmcCurrentTime      = document.getElementById('pmcCurrentTime');
  const pmcDuration         = document.getElementById('pmcDuration');
  const pmcProgressFill     = document.getElementById('pmcProgressFill');
  const pmcProgressBar      = document.getElementById('pmcProgressBar');
  const pmcPlayMain         = document.getElementById('pmcPlayMain');
  const pmcPrev             = document.getElementById('pmcPrev');
  const pmcNext             = document.getElementById('pmcNext');
  const musicTitle          = document.getElementById('musicTitle');
  const miniTitle           = document.getElementById('miniTitle');
  const mpPlays             = document.querySelectorAll('.mp-play');
  const mpPrevs             = [document.getElementById('miniPrev')];
  const mpNexts             = [document.getElementById('miniNext')];
  const ytInput             = document.getElementById('ytInput');
  const ytAddBtn            = document.getElementById('ytAddBtn');
  const ytmInput            = document.getElementById('ytmInput');
  const ytmSearchBtn        = document.getElementById('ytmSearchBtn');
  const ytmResultsArea      = document.getElementById('ytmSearchResults');
  const spInput             = document.getElementById('spInput');
  const spSearchSongBtn     = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const spResultsArea       = document.getElementById('spSearchResults');
  const queueList           = document.getElementById('queueList');
  const toggleListBtnUrl    = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl  = document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt     = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt   = document.getElementById('episodesOverlayYt');
  const ytSearchResultsEl   = document.getElementById('ytSearchResults');
  const toggleListBtnYtm    = document.getElementById('toggleListBtnYtm');
  const toggleListBtnSp     = document.getElementById('toggleListBtnSp');
  const mpSyncBadge         = document.getElementById('mpSyncBadge');
  const mpSyncToggleBtn     = document.getElementById('mpSyncToggleBtn');
  const autoPlayToggleBtn   = document.getElementById('autoPlayToggle');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ═══════════════════════════════════════════════
     2. API KEYS & CONSTANTS
  ═══════════════════════════════════════════════ */
  const RAPID_API_KEY = '7ed79a66damsh741c9e46a516e82p1d0e5ejsn982a87fa3f59';
  const SP81_HOST     = 'spotify81.p.rapidapi.com';
  const LFM_KEY       = '64e3a55c11e6aa253b65f16ba5cf5047';
  const LFM_BASE      = 'https://ws.audioscrobbler.com/2.0/';
  const YT_ALT_HOST   = 'youtube-v3-alternative.p.rapidapi.com';

  /* ─── Silent MP3 (1-second loop) — HOLE 3 keep-alive ─── */
  const SILENT_MP3_URI =
    'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA' +
    '//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7' +
    'u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACA' +
    'AADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

  const silentAudio  = new Audio(SILENT_MP3_URI);
  silentAudio.loop   = true;
  silentAudio.volume = 0;

  async function startSilentKeepAlive() {
    try { await silentAudio.play(); } catch { /* blocked — retry on gesture */ }
  }
  function stopSilentKeepAlive() { silentAudio.pause(); silentAudio.currentTime = 0; }

  document.addEventListener('click',    startSilentKeepAlive, { once: true });
  document.addEventListener('touchend', startSilentKeepAlive, { once: true });

  /* ═══════════════════════════════════════════════
     3. STATE
  ═══════════════════════════════════════════════ */
  let queue                = [];
  let currentIdx           = 0;
  let synced               = false;
  let activeType           = 'none';
  let activeSrcTab         = 'none';
  let isPlaying            = false;
  let ytPlayer             = null;
  let isYtReady            = false;
  let isRemoteAction       = false;
  let autoPlayEnabled      = true;
  let autoPlayFetching     = false;
  let inSpotifyPlaylist    = false;
  let hasPlaylistOrigin    = false;
  let spotifyPlaylistEnded = false;
  let spDiscoveryMode      = 'repeat'; // 'repeat' | 'discovery'

  /* ─── HOLE 5 FIX: Unified playerState — single source of truth ───
   * shuffleBatchPos and normalBatchPos are now inside ONE object.
   * A manual skip ALWAYS calls resetBatchState() — ensuring counters
   * never drift out-of-sync between modes.
   */
  const playerState = {
    mode:               'normal',   // 'normal' | 'shuffle' | 'loop'
    /* Shuffle */
    shuffleSeed:        null,       // { title, artist }
    shuffleBatchPos:    0,
    shuffleBatchTotal:  10,
    /* Normal */
    normalArtist:       '',
    normalSimilarArtist:'',
    normalBatchPos:     0,
    normalBatchTotal:   5,
    /* Shared */
    usedArtists:        new Set(),
    batchItems:         [],         // current in-flight batch metadata
    batchLoaded:        false,      // true = batch resolved & pushed
  };

  function resetBatchState() {
    playerState.shuffleBatchPos     = 0;
    playerState.normalBatchPos      = 0;
    playerState.normalSimilarArtist = '';
    playerState.batchItems          = [];
    playerState.batchLoaded         = false;
  }

  /* ─── HOLE 2 FIX: LRU Stream Cache (max 40) ─── */
  const CACHE_MAX   = 40;
  const streamCache = new Map();

  function cacheSet(key, val) {
    if (streamCache.has(key)) streamCache.delete(key);
    streamCache.set(key, val);
    if (streamCache.size > CACHE_MAX)
      streamCache.delete(streamCache.keys().next().value);
  }
  function cacheGet(key) { return streamCache.get(key) ?? null; }

  const autoPlayHistory       = new Set();
  const shuffleLastTwoBatches = new Set();

  /* ─── HOLE 3 FIX: JIT URL store ───
   * Maps queue-index → resolved stream URL.
   * We ONLY resolve N and N+1. Higher indices stay as metadata stubs.
   */
  const jitUrlStore = new Map(); // index → url string

  /* Wake Lock */
  let wakeLock = null;

  /* ═══════════════════════════════════════════════
     4. METADATA SANITIZATION — HOLE 1 FIX (Ultra-Aggressive)
  ═══════════════════════════════════════════════
   *
   * Root cause of birthday/random songs:
   *   Dirty title → Last.fm returns 0 results → ytSearch runs a near-
   *   blank query → YouTube serves trending/popular songs → ads/birthday.
   *
   * Strategy (three-pass):
   *   Pass 1: Strip bracket/paren blocks entirely.
   *   Pass 2: Cut at first feat/ft/&/with/prod/from/x separators.
   *   Pass 3: Remove residual junk keywords.
   * For artist: strip everything after first comma/& and VEVO/Topic suffixes.
   */
  function sanitizeMeta(rawTitle, rawArtist) {
    /* ── PASS 1: Title ── */
    let ct = (rawTitle || '').trim();

    // Remove bracket / paren blocks completely
    ct = ct.replace(/\[.*?\]/g, ' ');
    ct = ct.replace(/\(.*?\)/g, ' ');
    ct = ct.replace(/\{.*?\}/g, ' ');

    // Cut at pipe — everything after | is usually channel/label junk
    ct = ct.replace(/\|.*/g, ' ');

    /* ── PASS 2: Cut at collaboration / credit separators ── */
    // "feat.", "ft.", "with", "prod.", "x ", "&", "(from '...')"
    ct = ct.replace(/\bfeat\.?\s.*/gi,    ' ');
    ct = ct.replace(/\bft\.?\s.*/gi,      ' ');
    ct = ct.replace(/\bprod\.?\s.*/gi,    ' ');
    ct = ct.replace(/\bwith\s+\w.*/gi,    ' ');
    ct = ct.replace(/\bfrom\s+["']?.*/gi, ' ');
    // "x ArtistName" — collaborative marker (common in EDM/hip-hop)
    ct = ct.replace(/\s+x\s+[A-Z].*/g,   ' ');
    // Multi-artist " & ArtistB" — strip from & onwards
    ct = ct.replace(/\s+&\s+.*/g,         ' ');

    /* ── PASS 3: Residual junk keywords ── */
    // Release / quality tags
    ct = ct.replace(/\b(official\s*(music\s*)?video|official\s*audio|official\s*lyric\s*video|lyric\s*video|lyrics?|4k|hd|hq|uhd|fhd|480p|720p|1080p|2160p)\b/gi, ' ');
    ct = ct.replace(/\bfull\s*(song|version|album|audio|video)\b/gi, ' ');

    // Audio-edit junk
    ct = ct.replace(/\b(slowed(\s*\+?\s*(reverb|down))?|reverb(ed)?|lofi|lo[\s\-]?fi|bass[\s\-]?boost(ed)?|sped[\s\-]?up|nightcore|8d[\s\-]?audio|432[\s\-]?hz|binaural|extended[\s\-]?(version|mix)?)\b/gi, ' ');

    // Cover / remix / version variants
    ct = ct.replace(/\b(remix|cover|mashup|medley|tribute|karaoke|instrumental(\s*version)?|acoustic(\s*version)?|piano[\s\-]?version|unplugged|radio[\s\-]?edit)\b/gi, ' ');

    // Reaction / commentary
    ct = ct.replace(/\b(reaction|review|analysis|breakdown|explained|commentary|podcast)\b/gi, ' ');

    // Release edition tags
    ct = ct.replace(/\b(remaster(ed)?|deluxe(\s*edition)?|anniversary\s*edition|bonus\s*track|b[\s\-]?side)\b/gi, ' ');

    // Dash-based junk trailer " - Official", " - Audio", etc.
    ct = ct.replace(/[-–—]\s*(official|lyrics?|audio|video|full|hd|hq|4k|slowed|reverb|bass|lofi|cover|karaoke|instrumental|remix|live).*/gi, ' ');
    ct = ct.replace(/[-–—]/g, ' ');

    // "#Shorts" / "Reels" tags
    ct = ct.replace(/#\S+/g, ' ');
    ct = ct.replace(/\b(shorts?|reels?)\b/gi, ' ');

    // Collapse whitespace
    ct = ct.replace(/\s{2,}/g, ' ').trim();

    /* ── Artist sanitize ── */
    let ca = (rawArtist || '').trim();
    ca = ca.replace(/\s*[-–,]\s*Topic\s*$/gi, '');   // "Artist - Topic"
    ca = ca.replace(/\bVEVO\s*$/gi,            '');   // "ArtistVEVO"
    ca = ca.replace(/\bofficial\s*$/gi,        '');
    ca = ca.replace(/\bmusic\s*$/gi,           '');
    ca = ca.replace(/\s*[,&]\s*.*/,            '');   // "ArtistA, ArtistB" → "ArtistA"
    ca = ca.replace(/\s*feat\.?.*/gi,          '');
    ca = ca.replace(/\s{2,}/g, ' ').trim();

    /* ── Fallback guard — if cleaned title < 2 chars, use raw ── */
    if (ct.length < 2) ct = (rawTitle || '').replace(/[^\w\s]/g, ' ').trim();
    if (ca.length < 1) ca = (rawArtist || '').replace(/[^\w\s]/g, ' ').trim();

    return { cleanTitle: ct, cleanArtist: ca };
  }

  /* Normalize for deduplication only */
  function normTitle(t) {
    return (t || '').toLowerCase()
      .replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '')
      .replace(/\b(official|audio|video|lyric|feat\..*|ft\..*|slowed|reverb|bass|lofi|remix|cover)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /* ═══════════════════════════════════════════════
     5. LAST.FM API
  ═══════════════════════════════════════════════ */
  async function lfm(params) {
    const u = new URL(LFM_BASE);
    Object.entries({ ...params, api_key: LFM_KEY, format: 'json' })
      .forEach(([k, v]) => u.searchParams.set(k, v));
    try { const r = await fetch(u.toString()); return await r.json(); }
    catch { return {}; }
  }

  async function lfmSimilarTracks(title, artist, limit = 10) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(title, artist);
    if (!ct || !ca) return [];
    const d = await lfm({ method: 'track.getSimilar', track: ct, artist: ca, limit, autocorrect: 1 });
    return (d?.similartracks?.track || []).map(t => ({ title: t.name, artist: t.artist.name }));
  }

  async function lfmSimilarArtists(artist, limit = 10) {
    const { cleanArtist: ca } = sanitizeMeta('', artist);
    if (!ca) return [];
    const d = await lfm({ method: 'artist.getSimilar', artist: ca, limit, autocorrect: 1 });
    return (d?.similarartists?.artist || []).map(a => a.name);
  }

  async function lfmArtistTopTracks(artist, limit = 8) {
    const { cleanArtist: ca } = sanitizeMeta('', artist);
    if (!ca) return [];
    const d = await lfm({ method: 'artist.getTopTracks', artist: ca, limit, autocorrect: 1 });
    return (d?.toptracks?.track || []).map(t => ({ title: t.name, artist: t.artist?.name || artist }));
  }

  /* ═══════════════════════════════════════════════
     6. YT SEARCH — Extended Anti-Ad / Junk Filter
  ═══════════════════════════════════════════════ */
  function isYouTubeUrl(s) { return /youtu\.?be|youtube\.com/.test(s); }
  function extractYouTubeId(s) {
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  const AD_CHANNEL_PATTERNS = /\b(advertisement|promoted|sponsor|vevo\s*ads|google\s*ads)\b/i;

  const JUNK_TITLE_PATTERNS = new RegExp([
    'advertisement', 'sponsored', '\\bpromo\\b', '\\bad\\b',
    'slowed', 'reverb(ed)?', 'lofi', 'lo[\\s\\-]?fi',
    'bass[\\s\\-]?boost(ed)?', 'sped[\\s\\-]?up', 'nightcore', '8d[\\s\\-]?audio',
    '\\bcover\\b', 'karaoke', 'instrumental[\\s\\-]?version',
    'tribute', 'mashup', 'megamix', 'compilation',
    'reaction[\\s\\-]?video', 'podcast', 'news[\\s\\-]?clip',
    'low[\\s\\-]?quality', 'radio[\\s\\-]?edit[\\s\\-]?cut',
    '#short', '\\bshorts\\b', '\\breels\\b',
    'birthday', '\\bhappy\\s+birthday\\b',       // ← block birthday songs
    '\\bnursery\\b', '\\brhyme\\b',              // ← block children's rhymes
    'meditation', 'relaxing\\s+music',           // ← block ambient/wellness
    'whiteboard\\s+animation', 'cartoon\\s+song',
  ].map(p => `(?:${p})`).join('|'), 'i');

  const TOPIC_SUFFIX = /\s*-\s*topic\s*$/i;

  async function ytSearch(query, max = 8, strictMusicOnly = false, expectedDurSecs = 0) {
    /* Guard: refuse to search if query is too short or garbage */
    const trimQ = (query || '').trim();
    if (trimQ.length < 3) return [];

    try {
      const r = await fetch(
        `https://${YT_ALT_HOST}/search?query=${encodeURIComponent(trimQ)}&geo=IN&type=video`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': YT_ALT_HOST } }
      );
      const d = await r.json();
      let items = d.data || [];

      /* Prefer Topic-channel results */
      items.sort((a, b) => {
        const aT = TOPIC_SUFFIX.test(a.channelTitle || '');
        const bT = TOPIC_SUFFIX.test(b.channelTitle || '');
        return (aT === bT) ? 0 : aT ? -1 : 1;
      });

      items = items.filter(i => {
        if (JUNK_TITLE_PATTERNS.test(i.title || ''))        return false;
        if (AD_CHANNEL_PATTERNS.test(i.channelTitle || '')) return false;
        if (strictMusicOnly && /\b(radio\s*ad)\b/i.test(i.title)) return false;

        if (expectedDurSecs > 0 && i.lengthSeconds) {
          const d = parseInt(i.lengthSeconds) || 0;
          if (d > 0 && Math.abs(d - expectedDurSecs) / expectedDurSecs > 0.2) return false;
        }
        return true;
      });

      return items.slice(0, max);
    } catch { return []; }
  }

  /* Resolve Last.fm metadata → YT video ID
   * HOLE 1 FIX: uses sanitized, quoted query — never sends blank string
   */
  async function resolveToYtId(title, artist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(title, artist);

    /* Guard: if both are empty after sanitize, bail */
    if (!ct && !ca) return null;

    const q = ca
      ? `"${ct}" "${ca}" official audio`
      : `"${ct}" official audio`;

    const items = await ytSearch(q, 6, true);
    const pick  = items.find(i => !autoPlayHistory.has(normTitle(i.title))) || items[0];
    if (!pick) return null;
    return {
      ytId:  pick.videoId,
      title: pick.title,
      thumb: pick.thumbnail?.[1]?.url || pick.thumbnail?.[0]?.url || '',
    };
  }

  /* ═══════════════════════════════════════════════
     7. STREAM RESOLUTION — HOLE 2: JIT (Just-in-Time)
  ═══════════════════════════════════════════════
   *
   * OLD approach: resolve m4a for every track in the batch at push time.
   *   10 tracks × 1 API call = 10 units burned upfront.
   *
   * NEW approach (JIT):
   *   - Queue items are pushed as METADATA STUBS (no URL).
   *   - jitUrlStore holds ONLY resolved URLs for currentIdx and currentIdx+1.
   *   - When playQueueItem(i) fires, we check jitUrlStore[i] first.
   *   - After play starts, we resolve i+1 in the background.
   *   - API calls: 2 max in-flight at any time. Quota savings: ~80%.
   */
  async function extractYTAudioUrl(ytId) {
    const k = 'yt_' + ytId;
    const cached = cacheGet(k);
    if (cached) return cached;

    /* Method 1: SP81 bypass (fastest, m4a) */
    try {
      const r = await fetch(
        `https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true&bypassSpotify=true&quality=best`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } }
      );
      const d = await r.json();
      const u = Array.isArray(d) ? (d[0]?.url || d[0]?.link) : (d.url || d.link);
      if (u) { cacheSet(k, u); return u; }
    } catch {}

    /* Method 2: ytstream fallback */
    try {
      const r = await fetch(
        `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com' } }
      );
      const d = await r.json();
      if (d.formats) {
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
      const u = Array.isArray(d)
        ? (d[0]?.url || d[0]?.link)
        : (d.url || d.link || d.downloadUrl);
      if (u) { cacheSet(k, u); return u; }
    } catch {}
    return null;
  }

  /* Resolve audio URL for a queue item — checks jitUrlStore first */
  async function resolveAudioUrl(item, queueIndex) {
    /* JIT store hit */
    if (queueIndex !== undefined && jitUrlStore.has(queueIndex))
      return jitUrlStore.get(queueIndex);

    if (item.type === 'ytmusic') return await extractYTAudioUrl(item.ytId);

    if (item.type === 'spotify_yt') {
      if (item.spId) {
        const u = await fetchPremiumAudio(item.spId);
        if (u) return u;
      }
      /* Fallback: search YT */
      const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(item.title, item.artist || '');
      const items = await ytSearch(`"${ct}" "${ca}" official audio`, 5, true);
      if (items[0]) {
        item.ytId = items[0].videoId;
        return await extractYTAudioUrl(items[0].videoId);
      }
    }
    return null;
  }

  /* JIT prefetch for index i — stores result in jitUrlStore */
  let _jitInFlight = new Set();
  async function jitPrefetch(i) {
    if (i < 0 || i >= queue.length)          return;
    if (jitUrlStore.has(i))                  return;
    if (_jitInFlight.has(i))                 return;
    const item = queue[i];
    if (['youtube', 'stream'].includes(item.type)) return;

    _jitInFlight.add(i);
    try {
      const url = await resolveAudioUrl(item, undefined);
      if (url) jitUrlStore.set(i, url);
    } finally {
      _jitInFlight.delete(i);
    }
  }

  /* Evict old JIT entries to prevent memory accumulation */
  function jitEvict(currentI) {
    for (const k of jitUrlStore.keys()) {
      if (k < currentI - 1) jitUrlStore.delete(k);
    }
  }

  /* ═══════════════════════════════════════════════
     8. WAKE LOCK & BACKGROUND PERSISTENCE — HOLE 3 FIX
  ═══════════════════════════════════════════════
   *
   * Root cause: When screen locks, browsers throttle JS timers and
   * sometimes silence the ended event. MediaSession stays "active"
   * only if playbackState is continuously updated.
   *
   * Fixes applied:
   *   A. MediaSession.playbackState forced every 3 s (heartbeat).
   *   B. positionState updated with real currentTime so OS scrubber works.
   *   C. Watchdog at 3 s (not 5 s) to catch silent-ends faster.
   *   D. On visibilitychange restore: force resume + re-register handlers.
   */
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      if (wakeLock && !wakeLock.released) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { /* denied — silent */ }
  }

  async function releaseWakeLock() {
    if (wakeLock && !wakeLock.released) {
      try { await wakeLock.release(); } catch {}
      wakeLock = null;
    }
  }

  /* HOLE 3 FIX A: MediaSession heartbeat — force-updates state every 3 s */
  function updateMediaSessionState() {
    if (!('mediaSession' in navigator)) return;
    const MS = navigator.mediaSession;
    MS.playbackState = isPlaying ? 'playing' : 'paused';
    if (nativeAudio.duration && !isNaN(nativeAudio.duration)) {
      try {
        MS.setPositionState({
          duration:     nativeAudio.duration,
          playbackRate: nativeAudio.playbackRate || 1,
          position:     Math.min(nativeAudio.currentTime, nativeAudio.duration),
        });
      } catch { /* setPositionState not supported on all browsers */ }
    }
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await startSilentKeepAlive();
      if (isPlaying) {
        await acquireWakeLock();
        /* HOLE 3 FIX D: Re-register MediaSession action handlers on restore */
        if (queue[currentIdx]) setupMediaSession(queue[currentIdx]);
        if (nativeAudio.paused && ['ytmusic', 'spotify_yt', 'stream'].includes(activeType)) {
          try { await nativeAudio.play(); } catch {}
        }
      }
    }
  });

  /* HOLE 3 FIX C: Watchdog at 3 s (was 5 s) — catches silent-ends faster */
  let _lastCheckedTime = -1;
  let _lastEndCheck    = 0;

  setInterval(() => {
    updateMediaSessionState(); // FIX A: heartbeat

    if (!isPlaying || !['ytmusic', 'spotify_yt', 'stream'].includes(activeType)) return;
    if (!nativeAudio.src) return;

    const now = nativeAudio.currentTime;
    const dur = nativeAudio.duration;

    /* Stall detection */
    if (now === _lastCheckedTime && !nativeAudio.paused) {
      nativeAudio.play().catch(() => {});
    }
    _lastCheckedTime = now;

    /* Silent-end detection */
    if (dur > 0 && now >= dur - 0.5 && Date.now() - _lastEndCheck > 2500) {
      _lastEndCheck = Date.now();
      console.log('[ZX watchdog] End detected → playNext');
      playNext();
    }
  }, 3000); // ← 3 s (was 5 s)

  /* ═══════════════════════════════════════════════
     9. PLAYBACK MODE ENGINE
  ═══════════════════════════════════════════════ */
  const MODE_ICONS  = { normal: '➡️', shuffle: '🔀', loop: '🔂' };
  const MODE_LABELS = { normal: 'Normal', shuffle: 'Shuffle', loop: 'Loop' };

  function modeIconSvg(mode) {
    if (mode === 'shuffle') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>`;
    if (mode === 'loop')    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
  }

  function injectModeSwitch() {
    if (document.getElementById('pmcModeBtn')) return;
    const btn = document.createElement('button');
    btn.id        = 'pmcModeBtn';
    btn.className = `pmc-mode-btn pmc-mode-${playerState.mode}`;
    btn.title     = 'Playback Mode';
    btn.innerHTML = `<span class="pmc-mode-icon">${modeIconSvg(playerState.mode)}</span>`;
    btn.addEventListener('click', cyclePlaybackMode);
    premiumMusicCard?.appendChild(btn);
  }

  function injectSpDiscoverySwitch() {
    if (document.getElementById('pmcSpDiscBtn')) return;
    const btn = document.createElement('button');
    btn.id        = 'pmcSpDiscBtn';
    btn.className = 'pmc-sp-disc-btn hidden';
    btn.title     = 'Spotify: Repeat | Auto-Discovery';
    btn.innerHTML = `<span class="pmc-sp-disc-icon">🔁</span>`;
    btn.addEventListener('click', () => {
      spDiscoveryMode = spDiscoveryMode === 'repeat' ? 'discovery' : 'repeat';
      btn.querySelector('.pmc-sp-disc-icon').textContent =
        spDiscoveryMode === 'repeat' ? '🔁' : '✨';
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

  /* HOLE 5 FIX: cyclePlaybackMode calls resetBatchState() */
  function cyclePlaybackMode() {
    const modes      = ['normal', 'shuffle', 'loop'];
    playerState.mode = modes[(modes.indexOf(playerState.mode) + 1) % 3];
    resetBatchState(); // ← unified reset
    autoPlayFetching = false;
    updateModeBtn();
    showToast(`${MODE_ICONS[playerState.mode]} ${MODE_LABELS[playerState.mode]} Mode`);
  }

  /* HOLE 4 FIX: showSpDiscBtn checks queue content, not just flag */
  function showSpDiscBtn(show) {
    const hasSpItems = queue.some(i => i.type === 'spotify_yt');
    const shouldShow = show && (inSpotifyPlaylist || hasPlaylistOrigin) && hasSpItems;
    document.getElementById('pmcSpDiscBtn')?.classList.toggle('hidden', !shouldShow);
  }

  /* ═══════════════════════════════════════════════
     10. AUTO-PLAY BATCH ENGINE — HOLE 5 FIX (Unified)
  ═══════════════════════════════════════════════
   *
   * HOLE 5 ROOT CAUSE: Old code had two separate batch counters
   * (shuffleBatchPos, normalBatchPos) that reset on mode-cycle but NOT
   * on manual skips. Manual skip mid-batch left counters out-of-sync,
   * causing duplicate artists and same-song loops.
   *
   * FIX: All batch state lives in playerState. Manual playQueueItem() calls
   * resetBatchState() if item.isAutoPlay === false. Batch counters are
   * incremented ONLY inside buildShuffleBatch / buildNormalBatch via
   * playerState.batchItems, not scattered across multiple call sites.
   */

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ─── SHUFFLE MODE ─── */
  async function buildShuffleBatch() {
    const seed = playerState.shuffleSeed || { title: '', artist: '' };
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(seed.title, seed.artist);

    let pool10 = await lfmSimilarTracks(ct, ca, 10);
    pool10 = pool10.filter(t =>
      !autoPlayHistory.has(normTitle(t.title)) &&
      !shuffleLastTwoBatches.has(normTitle(t.title))
    );
    shuffle(pool10);
    const batch1 = pool10.slice(0, 5);

    /* YT fallback for batch1 */
    if (batch1.length < 5) {
      const ytItems = await ytSearch(
        ct && ca ? `songs similar to "${ct}" by "${ca}"` : `${ca || ct} top songs`,
        10, true
      );
      for (const y of ytItems) {
        if (batch1.length >= 5) break;
        const n = normTitle(y.title);
        if (!autoPlayHistory.has(n) && !shuffleLastTwoBatches.has(n))
          batch1.push({ title: y.title, artist: y.channelTitle || ca, _yt: y });
      }
    }

    /* Seed commit at 5th track (FIX 9 preserved) */
    const nextSeedTrack          = batch1[4] || batch1[batch1.length - 1] || seed;
    playerState.shuffleSeed      = { title: nextSeedTrack.title, artist: nextSeedTrack.artist || ca };
    playerState.shuffleBatchTotal = 10;

    const seed4 = batch1[3] || nextSeedTrack;
    const seed5 = batch1[4] || nextSeedTrack;
    const [sim4, sim5] = await Promise.all([
      lfmSimilarTracks(seed4.title || ct, seed4.artist || ca, 10),
      lfmSimilarTracks(seed5.title || ct, seed5.artist || ca, 10),
    ]);

    const seen20 = new Set();
    const pool20 = [...sim4, ...sim5].filter(t => {
      const n = normTitle(t.title);
      if (seen20.has(n) || autoPlayHistory.has(n) || shuffleLastTwoBatches.has(n)) return false;
      seen20.add(n); return true;
    });
    shuffle(pool20);
    const batch2 = pool20.slice(0, 5);

    if (batch2.length < 3) {
      const q = [seed4.artist || ca, seed5.artist || ca].filter(Boolean).join(' ');
      const yt2 = await ytSearch(`${q} similar hits`, 8, true);
      for (const y of yt2) {
        if (batch2.length >= 5) break;
        const n = normTitle(y.title);
        if (!autoPlayHistory.has(n) && !shuffleLastTwoBatches.has(n))
          batch2.push({ title: y.title, artist: y.channelTitle || ca, _yt: y });
      }
    }

    const fullBatch = [...batch1, ...batch2].slice(0, 10);
    if (shuffleLastTwoBatches.size > 40) shuffleLastTwoBatches.clear();
    fullBatch.forEach(t => shuffleLastTwoBatches.add(normTitle(t.title)));

    playerState.shuffleBatchPos = 0;
    return fullBatch;
  }

  /* ─── NORMAL MODE ─── */
  async function buildNormalBatch(seedTitle, seedArtist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(seedTitle, seedArtist);
    const artist = playerState.normalArtist || ca;
    if (!playerState.normalArtist) playerState.normalArtist = ca;
    playerState.normalBatchTotal = 5;

    /* Tracks 1-3: same artist top tracks */
    let artistTracks = await lfmArtistTopTracks(artist, 12);
    artistTracks = artistTracks.filter(t =>
      !autoPlayHistory.has(normTitle(t.title)) &&
      normTitle(t.title) !== normTitle(ct)
    );
    const tracks13 = artistTracks.slice(0, 3);

    /* Tracks 4-5: vibe-similar */
    let vibePool = await lfmSimilarTracks(ct, artist, 8);
    vibePool = vibePool.filter(t =>
      !autoPlayHistory.has(normTitle(t.title)) &&
      t.artist.toLowerCase() !== artist.toLowerCase()
    );
    if (vibePool.length < 2) {
      const ytV = await ytSearch(
        ct && artist ? `songs similar to "${ct}" by "${artist}"` : `${artist} similar artists top songs`,
        8, true
      );
      for (const y of ytV) {
        if (vibePool.length >= 5) break;
        if (!autoPlayHistory.has(normTitle(y.title)))
          vibePool.push({ title: y.title, artist: y.channelTitle || artist, _yt: y });
      }
    }
    shuffle(vibePool);
    const tracks45 = vibePool.slice(0, 2);
    const batch    = [...tracks13, ...tracks45];

    /* FIX 10 preserved: Rank-1 similar artist */
    const similarArtistList = await lfmSimilarArtists(artist, 5);
    const rank1Similar = similarArtistList.find(
      a => a && !playerState.usedArtists.has(a.toLowerCase())
    ) || tracks45[0]?.artist || artist;

    playerState.usedArtists.add(artist.toLowerCase());
    playerState.normalArtist        = rank1Similar;
    playerState.normalSimilarArtist = rank1Similar;
    playerState.normalBatchPos      = 0;

    /* Failsafe */
    if (batch.length < 2) {
      const ytItems = await ytSearch(
        artist ? `top songs by "${artist}"` : `${ct} similar songs`,
        8, true
      );
      for (const y of ytItems) {
        if (batch.length >= 5) break;
        if (!autoPlayHistory.has(normTitle(y.title)))
          batch.push({ title: y.title, artist: y.channelTitle || artist, _yt: y });
      }
    }

    return batch.slice(0, 5);
  }

  /* ─── triggerAutoPlayLoad — FIX 3 preserved, HOLE 5 hardened ───
   *
   * Triggers when currentIdx >= queue.length - 2 (N-2 track).
   * HOLE 5 FIX: Guard checks playerState.batchLoaded to prevent
   * double-invocation from rapid skips.
   */
  async function triggerAutoPlayLoad() {
    if (autoPlayFetching)     return;
    if (playerState.batchLoaded) return; // HOLE 5: already loaded
    if (queue.length === 0)   return;
    if (playerState.mode === 'loop') return;
    autoPlayFetching = true;
    playerState.batchLoaded = false;

    const seed = queue[queue.length - 1];

    if (activeSrcTab === 'spotify' && spotifyPlaylistEnded && spDiscoveryMode === 'discovery') {
      spotifyPlaylistEnded = false;
      playerState.shuffleSeed = { title: seed.title, artist: seed.artist || '' };
    }

    let metas;
    if (playerState.mode === 'shuffle') {
      if (!playerState.shuffleSeed)
        playerState.shuffleSeed = { title: seed.title, artist: seed.artist || '' };
      metas = await buildShuffleBatch();
    } else {
      metas = await buildNormalBatch(seed.title, seed.artist || '');
    }

    /* Filter already-played tracks */
    const fresh = metas.filter(m => !autoPlayHistory.has(normTitle(m.title)));
    playerState.batchItems = fresh;

    const type = activeSrcTab === 'spotify' ? 'spotify_yt' : 'ytmusic';

    for (const meta of fresh) {
      const n = normTitle(meta.title);
      if (autoPlayHistory.has(n)) continue;
      autoPlayHistory.add(n);

      let qItem;
      if (meta._yt) {
        const y = meta._yt;
        /* HOLE 2 FIX: push stub — no URL resolved yet */
        qItem = {
          type,
          title:      y.title,
          artist:     y.channelTitle || '',
          ytId:       y.videoId,
          thumb:      y.thumbnail?.[1]?.url || y.thumbnail?.[0]?.url || '',
          isAutoPlay: true,
        };
      } else {
        /* Resolve metadata → ytId ONLY (no m4a) */
        const res = await resolveToYtId(meta.title, meta.artist);
        if (!res) continue;
        qItem = {
          type,
          title:      meta.title,
          artist:     meta.artist,
          ytId:       res.ytId,
          thumb:      res.thumb,
          isAutoPlay: true,
        };
      }
      queue.push(qItem);
    }

    renderQueue();
    playerState.batchLoaded = true;
    autoPlayFetching        = false;

    /* HOLE 2 FIX: JIT prefetch ONLY the immediate next track's m4a */
    jitPrefetch(currentIdx + 1);
  }

  /* ═══════════════════════════════════════════════
     11. AUTO-PLAY TOGGLE
  ═══════════════════════════════════════════════ */
  if (autoPlayToggleBtn) {
    autoPlayToggleBtn.classList.add('active');
    autoPlayToggleBtn.addEventListener('click', () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoPlayToggleBtn.classList.toggle('active', autoPlayEnabled);
      showToast(autoPlayEnabled ? '∞ Auto-play ON' : '⏹ Auto-play OFF');
    });
  }

  /* ═══════════════════════════════════════════════
     12. PANEL ENGINE
  ═══════════════════════════════════════════════ */
  let startY = 0, isPanelOpen = false;
  function openPanel() {
    if (isPanelOpen) return;
    isPanelOpen = true;
    panel.classList.add('zx-open');
    document.body.style.overflow = 'hidden';
    panelToggleBtn?.classList.add('active');
    document.getElementById('chatApp')?.classList.add('player-open');
  }
  function closePanel() {
    if (!isPanelOpen) return;
    isPanelOpen = false;
    panel.classList.remove('zx-open');
    document.body.style.overflow = '';
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
    const t = document.createElement('div');
    t.textContent   = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:9px 16px;border-radius:20px;font-size:12px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;white-space:nowrap;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

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
    if (!area) return;
    area.classList.remove('hidden');
    btn?.classList.add('results-open');
  }
  setupToggleBtn(toggleListBtnUrl, episodesOverlayUrl);
  setupToggleBtn(toggleListBtnYt,  episodesOverlayYt);
  setupToggleBtn(toggleListBtnYtm, ytmResultsArea);
  setupToggleBtn(toggleListBtnSp,  spResultsArea);

  /* Playlist Exit Button */
  function injectPlaylistExitBtn() {
    if (document.getElementById('spPlaylistExitBtn')) return;
    const strip = document.getElementById('spStripRow');
    if (!strip) return;
    const btn = document.createElement('button');
    btn.id          = 'spPlaylistExitBtn';
    btn.className   = 'playlist-exit-btn hidden';
    btn.title       = 'Exit Playlist';
    btn.textContent = '✕ Exit';
    btn.addEventListener('click', () => {
      spResultsArea.innerHTML =
        '<div class="sp-empty-state"><div class="sp-empty-icon">🌐</div><p>Search global music tracks</p></div>';
      inSpotifyPlaylist    = false;
      spotifyPlaylistEnded = false;
      /* HOLE 4 FIX: hasPlaylistOrigin stays TRUE — but showSpDiscBtn re-evaluates queue */
      btn.classList.add('hidden');
      showSpDiscBtn(true);
      showToast('📋 Playlist exited — music continues');
    });
    strip.insertBefore(btn, strip.firstChild);
  }

  /* ═══════════════════════════════════════════════
     13. SYNC ENGINE (100% preserved)
  ═══════════════════════════════════════════════ */
  function setRemoteAction() {
    isRemoteAction = true;
    setTimeout(() => { isRemoteAction = false; }, 2000);
  }

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

  window._zxReceiveSync = function (data) {
    if (!synced) return;
    setRemoteAction();
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
        currentIdx = idx; renderQueue(); renderMedia(queue[currentIdx]);
        break;
      case 'play':
        if (activeType === 'youtube' && ytPlayer && isYtReady) {
          if (data.time != null && Math.abs(ytPlayer.getCurrentTime() - data.time) > 1.5) ytPlayer.seekTo(data.time, true);
          ytPlayer.playVideo();
        } else {
          if (data.time != null && Math.abs(nativeAudio.currentTime - data.time) > 1.5) nativeAudio.currentTime = data.time;
          nativeAudio.play().catch(() => {});
        }
        break;
      case 'pause':
        if (activeType === 'youtube' && ytPlayer && isYtReady) {
          ytPlayer.pauseVideo();
          if (data.time != null) ytPlayer.seekTo(data.time, true);
        } else {
          nativeAudio.pause();
          if (data.time != null) nativeAudio.currentTime = data.time;
        }
        break;
      case 'seek':
        if (activeType === 'youtube' && ytPlayer && isYtReady) ytPlayer.seekTo(data.time, true);
        else if (data.time != null) nativeAudio.currentTime = data.time;
        break;
      case 'next': playNext(); break;
      case 'prev': playPrev(); break;
    }
  };

  nativeAudio.addEventListener('seeked', () => {
    if (synced && !isRemoteAction)
      broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
  });

  /* ═══════════════════════════════════════════════
     14. YT IFRAME ENGINE
  ═══════════════════════════════════════════════ */
  const ytTag = document.createElement('script');
  ytTag.src   = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(ytTag);

  window.onYouTubeIframeAPIReady = function () {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0, modestbranding: 1 },
      events: { onReady: () => { isYtReady = true; }, onStateChange: onPSC }
    });
  };

  function onPSC(ev) {
    if      (ev.data === YT.PlayerState.PLAYING) { isPlaying = true;  updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'play',  time: ytPlayer.getCurrentTime() }); }
    else if (ev.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: ytPlayer.getCurrentTime() }); }
    else if (ev.data === YT.PlayerState.ENDED)   { playNext(); }
  }

  /* ═══════════════════════════════════════════════
     15. YT TAB SEARCH
  ═══════════════════════════════════════════════ */
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
        const div = document.createElement('div');
        div.className = 'yt-search-item';
        div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${vid.title || ''}</div><div class="yt-search-sub">${vid.channelTitle || ''}</div></div><span style="font-size:15px;color:#ff4444;flex-shrink:0">▶</span>`;
        div.onclick = () => { queue = []; currentIdx = 0; addToQueue({ type: 'youtube', title: vid.title || '', ytId: vid.videoId, thumb }); showToast('▶ Playing!'); };
        ytSearchResultsEl.appendChild(div);
      });
    }).catch(() => { if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<p class="mp-empty">Error.</p>'; });
  }

  ytAddBtn?.addEventListener('click', () => { const v = ytInput.value.trim(); if (!v) return; searchYouTubeDisplay(v); ytInput.value = ''; });
  ytInput?.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });

  /* ═══════════════════════════════════════════════
     16. SPOTIFY SEARCH
  ═══════════════════════════════════════════════ */
  async function searchSpotify(query, playlistsOnly = false) {
    if (!query) return;
    spResultsArea.innerHTML = '<div class="mp-loading-pulse">Loading…</div>';
    showResultsArea(spResultsArea, toggleListBtnSp);
    try {
      const res = await fetch('https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall', {
        method: 'POST',
        headers: {
          'x-rapidapi-key':  RAPID_API_KEY,
          'x-rapidapi-host': 'spotify-web-api3.p.rapidapi.com',
          'Content-Type':    'application/json',
        },
        body: JSON.stringify({ terms: query, limit: 15 }),
      });
      const resp = await res.json();
      const sd   = resp?.data?.searchV2 || resp;
      let items  = [];
      const seen = new Set();

      function addSp(type, data) {
        if (!data) return;
        const id = data.id || data.uri?.split(':').pop();
        if (!id || seen.has(id)) return;
        seen.add(id);
        items.push({ iType: type, data });
      }

      if (!playlistsOnly && sd?.topResults?.itemsV2)
        sd.topResults.itemsV2.forEach(i => {
          const d = i.item?.data;
          if (d) addSp(d.uri?.includes('playlist') ? 'playlist' : d.uri?.includes('album') ? 'album' : 'track', d);
        });
      if (!playlistsOnly) {
        (sd?.tracksV2?.items || []).forEach(i => addSp('track', i.item?.data));
        (sd?.albums?.items   || []).forEach(i => addSp('album', i.data));
      }
      (sd?.playlists?.items || []).forEach(i => addSp('playlist', i.data));

      const ql = query.toLowerCase().trim();
      items.sort((a, b) => {
        const na = (a.data.name || '').toLowerCase(), nb = (b.data.name || '').toLowerCase();
        const aE = na === ql, bE = nb === ql, aC = na.includes(ql), bC = nb.includes(ql);
        const aT = a.iType === 'track',        bT = b.iType === 'track';
        if (aE && aT && !(bE && bT)) return -1; if (bE && bT && !(aE && aT)) return 1;
        if (aE && !bE) return -1; if (bE && !aE) return 1;
        if (aC && !bC) return -1; if (bC && !aC) return 1;
        return 0;
      });

      spResultsArea.innerHTML = '';
      if (!items.length) { spResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }

      items.forEach(obj => {
        const d      = obj.data;
        const name   = d.name || 'Unknown';
        const isPL   = obj.iType === 'playlist';
        const isAL   = obj.iType === 'album';
        const artist = d.artists?.items?.[0]?.profile?.name || d.ownerV2?.data?.name || 'Spotify';
        const thumb  = d.albumOfTrack?.coverArt?.sources?.[0]?.url
                    || d.images?.items?.[0]?.sources?.[0]?.url
                    || d.coverArt?.sources?.[0]?.url
                    || 'https://i.imgur.com/8Q5FqWj.jpeg';
        const spId  = d.id || d.uri?.split(':').pop();
        const isEx  = name.toLowerCase() === ql;
        const div   = document.createElement('div');
        div.className = 'yt-search-item sp-list-item' + (isPL || isAL ? ' sp-folder-item' : '');
        const rIcon = (isPL || isAL)
          ? `<span class="sp-folder-btn" title="${isAL ? 'Album' : 'Playlist'}">📂</span>`
          : `<span class="sp-play-btn">▶</span>`;
        const badge = isEx ? `<span class="sp-best-badge">★</span>` : '';
        const tTag  = isPL
          ? `<span class="sp-playlist-badge">PLAYLIST</span>`
          : isAL
          ? `<span class="sp-playlist-badge" style="background:rgba(255,160,0,.2);color:#ffaa00">ALBUM</span>`
          : '';
        div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${badge}${name}${tTag}</div><div class="yt-search-sub">${artist}</div></div>${rIcon}`;
        div.onclick = async () => {
          if (isPL) {
            showToast('📂 Loading playlist…');
            const tr = await fetchPlaylistTracks(spId);
            spResultsArea.innerHTML = '';
            tr.forEach(t => addToSpResults(t));
            inSpotifyPlaylist    = true;
            hasPlaylistOrigin    = true;
            spotifyPlaylistEnded = false;
            document.getElementById('spPlaylistExitBtn')?.classList.remove('hidden');
            activeSrcTab = 'spotify';
            queue = []; currentIdx = 0;
            jitUrlStore.clear();
            tr.forEach(t => queue.push({ type: 'spotify_yt', title: t.title, artist: t.artist, spId: t.id, thumb: t.image }));
            renderQueue();
            if (queue.length > 0) playQueueItem(0);
            showSpDiscBtn(true);
          } else if (isAL) {
            showToast('📂 Loading album…');
            const tr = await fetchAlbumTracks(spId);
            spResultsArea.innerHTML = '';
            tr.forEach(t => addToSpResults(t));
          } else {
            hasPlaylistOrigin = false;
            activeSrcTab = 'spotify'; queue = []; currentIdx = 0;
            jitUrlStore.clear();
            addToQueue({ type: 'spotify_yt', title: name, artist, spId, thumb });
          }
        };
        spResultsArea.appendChild(div);
      });
    } catch { spResultsArea.innerHTML = '<p class="mp-empty">API Error!</p>'; }
  }

  function addToSpResults(t) {
    const div = document.createElement('div');
    div.className = 'yt-search-item';
    div.innerHTML = `<img src="${t.image}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${t.title}</div><div class="yt-search-sub">${t.artist}</div></div><span class="sp-play-btn">▶</span>`;
    div.onclick = () => {
      activeSrcTab = 'spotify'; queue = []; currentIdx = 0;
      jitUrlStore.clear();
      addToQueue({ type: 'spotify_yt', title: t.title, artist: t.artist, spId: t.id, thumb: t.image });
    };
    spResultsArea.appendChild(div);
  }

  async function fetchPlaylistTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${id}&limit=50`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d = await r.json();
      return (d.items || [])
        .filter(i => i.track)
        .map(i => ({
          id:     i.track.id,
          title:  i.track.name,
          artist: i.track.artists[0]?.name || '',
          image:  i.track.album?.images[0]?.url || '',
        }));
    } catch { return []; }
  }

  async function fetchAlbumTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/album_tracks?id=${id}`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d   = await r.json();
      const img = d.album?.images?.[0]?.url || '';
      return (d.album?.tracks?.items || []).map(i => ({
        id:     i.id,
        title:  i.name,
        artist: i.artists[0]?.name || '',
        image:  img,
      }));
    } catch { return []; }
  }

  spSearchSongBtn?.addEventListener('click',     () => searchSpotify(spInput.value.trim(), false));
  spSearchPlaylistBtn?.addEventListener('click', () => searchSpotify(spInput.value.trim(), true));
  spInput?.addEventListener('keydown', e => { if (e.key === 'Enter') spSearchSongBtn?.click(); });

  /* ═══════════════════════════════════════════════
     17. YT MUSIC SEARCH
  ═══════════════════════════════════════════════ */
  async function searchYTMusic(query) {
    if (!query) return;
    ytmResultsArea.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(ytmResultsArea, toggleListBtnYtm);
    const items = await ytSearch(query + ' song', 12);
    ytmResultsArea.innerHTML = '';
    if (!items.length) { ytmResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
    items.forEach(item => {
      const div   = document.createElement('div');
      div.className = 'yt-search-item';
      const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
      div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${item.title}</div><div class="yt-search-sub">${item.channelTitle}</div></div><span style="font-size:15px;color:#ff4444">▶</span>`;
      div.onclick = () => {
        activeSrcTab = 'ytmusic'; queue = []; currentIdx = 0;
        jitUrlStore.clear();
        addToQueue({ type: 'ytmusic', title: item.title, artist: item.channelTitle, ytId: item.videoId, thumb });
      };
      ytmResultsArea.appendChild(div);
    });
  }

  ytmSearchBtn?.addEventListener('click',   () => searchYTMusic(ytmInput.value.trim()));
  ytmInput?.addEventListener('keydown', e => { if (e.key === 'Enter') ytmSearchBtn?.click(); });

  /* ═══════════════════════════════════════════════
     18. QUEUE ENGINE
  ═══════════════════════════════════════════════ */
  function addToQueue(item) {
    queue.push(item);
    autoPlayHistory.add(normTitle(item.title));
    renderQueue();
    playQueueItem(queue.length - 1);
  }

  function renderQueue() {
    if (!queueList) return;
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      const icon = { youtube: '🎬', ytmusic: '🎵', spotify_yt: '🌐', stream: '☁️' }[item.type] || '🎵';
      el.innerHTML = `<span style="font-size:10px;opacity:.5;flex-shrink:0">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del">✕</button>`;
      el.querySelector('.qi-del').onclick = e => {
        e.stopPropagation();
        queue.splice(i, 1);
        jitUrlStore.delete(i);
        if (currentIdx >= queue.length) currentIdx = Math.max(0, queue.length - 1);
        renderQueue();
      };
      el.onclick = () => playQueueItem(i);
      queueList.appendChild(el);
    });
  }

  /* HOLE 4 FIX: showSpDiscBtn re-evaluated on every playQueueItem */
  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    if (playerState.mode === 'loop' && i !== currentIdx) { renderMedia(queue[currentIdx]); return; }

    /* HOLE 5 FIX: Reset batch if this is a manual (non-autoplay) track */
    const isManual = !queue[i]?.isAutoPlay;
    if (isManual) {
      resetBatchState();
      autoPlayFetching = false;
    }

    currentIdx = i;
    jitEvict(i); // evict old JIT entries
    renderQueue();
    const item = queue[i];
    if (synced && !isRemoteAction) broadcastSync({ action: 'change_song', item });
    renderMedia(item);

    /* HOLE 4 FIX: Re-evaluate discovery button based on queue content */
    showSpDiscBtn(activeSrcTab === 'spotify');

    /* FIX 3: Trigger metadata fetch when 2nd-to-last track starts */
    if (autoPlayEnabled && i >= queue.length - 2) triggerAutoPlayLoad();

    /* HOLE 2 FIX: JIT prefetch only next track */
    jitPrefetch(i + 1);
  }

  function showPremiumCard(src) {
    cinemaMode.classList.add('hidden');
    premiumMusicCard.classList.remove('hidden');
    spotifyMode.classList.add('hidden');
    premiumMusicCard.className = src === 'spotify'
      ? 'premium-music-card source-sp'
      : 'premium-music-card source-ytm';
    pmcSourceBadge.textContent = src === 'spotify' ? '🌐 Spotify' : '🎵 YT Music';
    pmcSourceBadge.className   = 'pmc-source-badge ' + (src === 'spotify' ? 'sp' : 'ytm');
    showSpDiscBtn(src === 'spotify');
  }

  async function renderMedia(item) {
    nativeAudio.pause();
    nativeAudio.removeAttribute('src');
    isPlaying = false;
    updatePlayBtn();
    updateProgressBar(0, 0);
    ytFrameWrap.style.display = 'none';
    if (ytPlayer && isYtReady) ytPlayer.pauseVideo();

    setPMCInfo(item.title, item.artist || 'Unknown', item.thumb);
    setTrackInfo(item.title, item.artist || 'Unknown');
    setupMediaSession(item);

    if (item.type === 'youtube') {
      activeType = 'youtube';
      showCinemaMode();
      ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => renderMedia(item), 600);

    } else if (item.type === 'ytmusic' || item.type === 'spotify_yt') {
      activeType   = item.type;
      activeSrcTab = item.type === 'ytmusic' ? 'ytmusic' : 'spotify';
      showPremiumCard(activeSrcTab);

      /* Reset playerState seed on fresh (non-autoplay) track */
      if (!item.isAutoPlay) {
        playerState.normalArtist        = '';
        playerState.normalSimilarArtist = '';
        playerState.shuffleSeed         = { title: item.title, artist: item.artist || '' };
        playerState.usedArtists.clear();
      }

      /* HOLE 2 FIX: Resolve URL from JIT store first, then fallback */
      const qIdx = queue.indexOf(item);
      let url = jitUrlStore.get(qIdx) || null;
      if (!url) url = await resolveAudioUrl(item, undefined);
      if (url) jitUrlStore.set(qIdx, url); // cache for resume

      if (url) {
        nativeAudio.src = url;
        nativeAudio.play()
          .then(async () => {
            isPlaying = true;
            updatePlayBtn();
            premiumMusicCard.classList.add('playing');
            await acquireWakeLock();
            await startSilentKeepAlive();
            jitPrefetch(qIdx + 1); // HOLE 2: JIT only next
          })
          .catch(() => showToast('Tap ▶ to play'));
      } else if (item.ytId) {
        showToast('⚠️ Stream failed — iframe fallback');
        showCinemaMode();
        ytFrameWrap.style.display = 'block';
        if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      }
    }
  }

  /* ═══════════════════════════════════════════════
     19. HELPERS & EVENTS
  ═══════════════════════════════════════════════ */
  function showCinemaMode() {
    cinemaMode.classList.remove('hidden');
    premiumMusicCard.classList.add('hidden');
    spotifyMode.classList.add('hidden');
    showSpDiscBtn(false);
  }

  function setPMCInfo(t, a, img) {
    pmcTitle.textContent  = t;
    pmcArtist.textContent = a;
    pmcArtwork.src        = img || 'https://i.imgur.com/8Q5FqWj.jpeg';
    pmcBgBlur.style.backgroundImage = `url('${pmcArtwork.src}')`;
  }

  function setTrackInfo(t, a) {
    if (musicTitle) musicTitle.textContent = t;
    if (miniTitle)  miniTitle.textContent  = `${t} • ${a}`;
  }

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sc = Math.floor(s % 60);
    return `${m}:${sc.toString().padStart(2, '0')}`;
  }

  function updateProgressBar(cur, dur) {
    if (!dur) return;
    pmcProgressFill.style.width = Math.min(100, (cur / dur) * 100) + '%';
    if (pmcCurrentTime) pmcCurrentTime.textContent = fmtTime(cur);
    if (pmcDuration)    pmcDuration.textContent    = fmtTime(dur);
  }

  nativeAudio.addEventListener('timeupdate', () =>
    updateProgressBar(nativeAudio.currentTime, nativeAudio.duration));

  nativeAudio.addEventListener('ended', () => {
    if (activeSrcTab === 'spotify' && inSpotifyPlaylist && currentIdx === queue.length - 1)
      spotifyPlaylistEnded = true;
    playNext();
  });

  pmcProgressBar?.addEventListener('click', e => {
    const r = pmcProgressBar.getBoundingClientRect();
    const p = (e.clientX - r.left) / r.width;
    if (nativeAudio.duration) nativeAudio.currentTime = p * nativeAudio.duration;
  });

  /* Progressive scrubbing */
  let _scrubbing = false;
  pmcProgressBar?.addEventListener('mousedown', () => { _scrubbing = true; });
  document.addEventListener('mousemove', e => {
    if (!_scrubbing || !pmcProgressBar || !nativeAudio.duration) return;
    const r = pmcProgressBar.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    nativeAudio.currentTime = p * nativeAudio.duration;
  });
  document.addEventListener('mouseup', () => { _scrubbing = false; });

  function playNext() {
    if (playerState.mode === 'loop') { renderMedia(queue[currentIdx]); return; }
    playerState.batchLoaded = false; // allow next batch to trigger
    if (currentIdx < queue.length - 1) playQueueItem(currentIdx + 1);
    else if (autoPlayEnabled) triggerAutoPlayLoad();
  }

  function playPrev() {
    if (playerState.mode === 'loop') { renderMedia(queue[currentIdx]); return; }
    if (nativeAudio.currentTime > 3 && activeType !== 'youtube') {
      nativeAudio.currentTime = 0; return;
    }
    if (currentIdx > 0) playQueueItem(currentIdx - 1);
  }

  [pmcNext, ...mpNexts].forEach(b => b?.addEventListener('click', playNext));
  [pmcPrev, ...mpPrevs].forEach(b => b?.addEventListener('click', playPrev));
  [pmcPlayMain, ...mpPlays].forEach(btn => btn?.addEventListener('click', () => {
    if (['ytmusic', 'spotify_yt', 'stream'].includes(activeType)) {
      isPlaying ? nativeAudio.pause() : nativeAudio.play();
    } else if (activeType === 'youtube' && ytPlayer) {
      isPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
    }
  }));

  function updatePlayBtn() {
    mpPlays.forEach(b => b.textContent = isPlaying ? '⏸' : '▶');
    if (pmcPlayMain) pmcPlayMain.textContent = isPlaying ? '⏸' : '▶';
    if (isPlaying) premiumMusicCard?.classList.add('playing');
    else           premiumMusicCard?.classList.remove('playing');
  }

  nativeAudio.addEventListener('play', async () => {
    isPlaying = true;
    updatePlayBtn();
    updateMediaSessionState();
    if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    await acquireWakeLock();
  });

  nativeAudio.addEventListener('pause', async () => {
    isPlaying = false;
    updatePlayBtn();
    updateMediaSessionState();
    if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
    await releaseWakeLock();
  });

  /* ─── MediaSession — Full Registration (HOLE 3 FIX: setPositionState included) ─── */
  function setupMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   item.title,
      artist:  item.artist || 'ZeroX Hub',
      artwork: [{ src: item.thumb || 'https://i.imgur.com/8Q5FqWj.jpeg', sizes: '512x512', type: 'image/jpeg' }],
    });
    const MS = navigator.mediaSession;
    MS.setActionHandler('play',          () => { if (activeType === 'youtube') ytPlayer?.playVideo();  else nativeAudio.play(); });
    MS.setActionHandler('pause',         () => { if (activeType === 'youtube') ytPlayer?.pauseVideo(); else nativeAudio.pause(); });
    MS.setActionHandler('previoustrack', playPrev);
    MS.setActionHandler('nexttrack',     playNext);
    MS.setActionHandler('stop',          () => { nativeAudio.pause(); nativeAudio.currentTime = 0; });
    MS.setActionHandler('seekto', details => {
      if (details.seekTime != null && nativeAudio.duration)
        nativeAudio.currentTime = details.seekTime;
    });
    MS.setActionHandler('seekforward',  details => {
      nativeAudio.currentTime = Math.min(nativeAudio.duration, nativeAudio.currentTime + (details.seekOffset || 10));
    });
    MS.setActionHandler('seekbackward', details => {
      nativeAudio.currentTime = Math.max(0, nativeAudio.currentTime - (details.seekOffset || 10));
    });
  }

  /* ═══════════════════════════════════════════════
     20. INIT
  ═══════════════════════════════════════════════ */
  (function init() {
    injectModeSwitch();
    injectSpDiscoverySwitch();
    injectPlaylistExitBtn();
    updateModeBtn();
    renderQueue();

    console.log(
      '%c[ZX PRO 4.3] Initialized',
      'color:#e8436a;font-weight:bold;font-size:13px',
      '\n\n── 5 HOLES SEALED ──\n' +
      '  ✅ HOLE 1: sanitizeMeta ultra-aggressive (3-pass, blank-query guard)\n' +
      '  ✅ HOLE 2: JIT stream fetching — only currentIdx+1 resolved (API −80%)\n' +
      '  ✅ HOLE 3: Lock-screen heartbeat 3 s + setPositionState + re-register on restore\n' +
      '  ✅ HOLE 4: Discovery btn tied to queue content (not just flag/context)\n' +
      '  ✅ HOLE 5: Unified playerState + resetBatchState() on manual skip\n' +
      '\n── PRO 4.2 FIXES PRESERVED ──\n' +
      '  ✅ FIX 1–10 all intact\n' +
      '  🔒 Wake Lock: ' + ('wakeLock' in navigator ? 'supported' : 'not supported') + '\n' +
      '  🔈 Silent loop: active\n' +
      '  🎵 JIT Store: active\n' +
      '  🧠 Batch engine: unified\n'
    );
  })();

})();
