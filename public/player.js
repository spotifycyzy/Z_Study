/* ═══════════════════════════════════════════════════════════════════
   ZEROX HUB — player.js  PRO 5.0  (Backend-Powered Edition)
   ✅ ALL PRO 4.9 FIXES PRESERVED (A–H)
   ✅ NEW: Custom Render Backend Integration
        /search    → replaces ytSearch for music search
        /get_track → replaces extractYTAudioUrl (direct M4A)
        /normal    → powers Normal Mode artist chaining
        /vibe      → powers Shuffle/Discovery mode
   ✅ NEW: JIT Batch Prefetch via /batch_streams
   ✅ NEW: Backend-first with ytSearch RapidAPI fallback
   ✅ NEW: Artist chain state persisted (normalArtistId field)
   ✅ NEW: Stream URL TTL tracking — auto re-fetch before expiry
   ═══════════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ═══════════════════════════════════════════════
     0. BACKEND CONFIG  ← SET YOUR RENDER URL HERE
  ═══════════════════════════════════════════════ */
  const BACKEND_BASE = (
    window.__ZEROX_BACKEND__ ||          // optional runtime override
    'https://zx-ytmusic.onrender.com' // ← REPLACE with your Render URL
  ).replace(/\/$/, '');

  /* Set to true to always use backend; false = backend first, RapidAPI fallback */
  const BACKEND_ONLY = false;

  /* ─── Backend API helper ─── */
  async function backendFetch(path, params = {}) {
    const url = new URL(BACKEND_BASE + path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`Backend ${path} → HTTP ${r.status}`);
    return r.json();
  }

  async function backendPost(path, body = {}) {
    const r = await fetch(BACKEND_BASE + path, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`Backend POST ${path} → HTTP ${r.status}`);
    return r.json();
  }

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

  if (nativeAudio) {
    nativeAudio.setAttribute('playsinline', '');
    nativeAudio.setAttribute('webkit-playsinline', '');
  }

  /* ═══════════════════════════════════════════════
     2. API KEYS & CONSTANTS
  ═══════════════════════════════════════════════ */
  const RAPID_API_KEY = '7ed79a66damsh741c9e46a516e82p1d0e5ejsn982a87fa3f59';
  const SP81_HOST     = 'spotify81.p.rapidapi.com';
  const LFM_KEY       = '64e3a55c11e6aa253b65f16ba5cf5047';
  const LFM_BASE      = 'https://ws.audioscrobbler.com/2.0/';
  const YT_ALT_HOST   = 'youtube-v3-alternative.p.rapidapi.com';

  const MUSIC_DUR_MIN = 135;   // 2:15
  const MUSIC_DUR_MAX = 390;   // 6:30

  const LFM_SIMILARITY_THRESHOLD = 0.08;

  /* Stream URL TTL tracking — re-fetch 5 min before expiry */
  const STREAM_TTL_MS       = 6 * 60 * 60 * 1000;   // 6 hours
  const STREAM_REFRESH_LEAD = 5 * 60 * 1000;         // 5 min early

  /* ─── Silent MP3 keep-alive ─── */
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
    try { await silentAudio.play(); } catch { /* blocked */ }
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
  let spDiscoveryMode      = 'repeat';

  const playedHistory       = new Set();
  const _titleOnlyHistory   = new Set();
  const _playedVideoIds     = new Set();   // NEW: backend video ID dedup

  /* ─── Backend normal-mode state ─── */
  const backendNormalState = {
    currentArtistName: '',
    currentArtistId:   null,
    currentVideoId:    '',
    artistHistory:     new Set(),
    trackHistory:      new Set(),
  };

  /* ─── Backend vibe-mode state ─── */
  const backendVibeState = {
    seedVideoId: '',
    trackHistory: new Set(),
  };

  const playerState = {
    mode:               'normal',
    shuffleSeed:        null,
    shuffleBatchPos:    0,
    shuffleBatchTotal:  10,
    normalArtist:       '',
    normalArtistId:     null,   // NEW: persists for /normal endpoint
    normalSimilarArtist:'',
    normalBatchPos:     0,
    normalBatchTotal:   5,
    usedArtists:        new Set(),
    batchItems:         [],
    batchLoaded:        false,
    genreAnchorArtist:  '',
  };

  function resetBatchState() {
    playerState.shuffleBatchPos     = 0;
    playerState.normalBatchPos      = 0;
    playerState.normalSimilarArtist = '';
    playerState.batchItems          = [];
    playerState.batchLoaded         = false;
    playerState.genreAnchorArtist   = '';
    backendNormalState.currentArtistName = '';
    backendNormalState.currentArtistId   = null;
    backendNormalState.artistHistory.clear();
  }

  /* ─── LRU Stream Cache (40 entries, with expiry tracking) ─── */
  const CACHE_MAX   = 40;
  const streamCache = new Map();   // key → { url, fetchedAt }

  function cacheSet(key, url) {
    if (streamCache.has(key)) streamCache.delete(key);
    streamCache.set(key, { url, fetchedAt: Date.now() });
    if (streamCache.size > CACHE_MAX)
      streamCache.delete(streamCache.keys().next().value);
  }

  function cacheGet(key) {
    const entry = streamCache.get(key);
    if (!entry) return null;
    /* Invalidate if within refresh lead window of TTL */
    if (Date.now() > entry.fetchedAt + STREAM_TTL_MS - STREAM_REFRESH_LEAD) {
      streamCache.delete(key);
      return null;
    }
    return entry.url;
  }

  const autoPlayHistory       = new Set();
  const shuffleLastTwoBatches = new Set();
  const jitUrlStore           = new Map();   // queue index → { url, fetchedAt }
  let   wakeLock              = null;

  /* ═══════════════════════════════════════════════
     4. PRE-EMPTIVE SANITIZATION (FIX A + B + H)
        masterSanitize runs BEFORE any API call or storage
  ═══════════════════════════════════════════════ */

  function splitYouTubeTitle(raw) {
    if (!raw) return { part1: '', part2: '' };
    let parts = raw.split(/\s*\|\s*/);
    if (parts.length >= 2) return { part1: parts[0].trim(), part2: parts[1].trim() };
    parts = raw.split(/\s*[-–—]\s*/);
    if (parts.length >= 2) return { part1: parts[0].trim(), part2: parts[1].trim() };
    return { part1: raw.trim(), part2: '' };
  }

  function masterSanitize(rawTitle, rawArtist, channelTitle) {
    const { part1, part2 } = splitYouTubeTitle(rawTitle || '');

    let rawTrack  = part1;
    let rawSuffix = part2;

    const JUNK_IND = /\b(official|audio|video|lyric|lyrics|music|4k|hd|hq|uhd|fhd|720p|1080p|2160p|vevo|records|entertainment|india)\b/i;
    if (part2 && JUNK_IND.test(part1) && !JUNK_IND.test(part2)) {
      rawTrack  = part2;
      rawSuffix = part1;
    }

    let ct = rawTrack;
    ct = ct.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ').replace(/\{.*?\}/g, ' ');
    ct = ct.replace(/\b(4k|8k|hdr|hd|hq|uhd|fhd|480p|720p|1080p|2160p|full\s*hd|ultra\s*hd)\b/gi, ' ');
    ct = ct.replace(/\b(official\s*(music\s*)?video|official\s*audio|official\s*lyric\s*video|lyric\s*video|lyrics?|visualizer|audio\s*song)\b/gi, ' ');
    ct = ct.replace(/\b(full\s*(song|version|album|audio|video)|title\s*track|title\s*song)\b/gi, ' ');
    ct = ct.replace(/\b(new\s*(song|video)|latest\s*(song|video)|trending\s*(song|video))\b/gi, ' ');
    ct = ct.replace(/\b(t[\s\-]?series|zee\s*music|sony\s*music|eros\s*now|warner|universal|atlantic|columbia|republic|interscope|def\s*jam|island|rca|epic\s*records|capitol|parlophone)\b/gi, ' ');
    ct = ct.replace(/\b(saregama|tips\s*music|speed\s*records|white\s*hill|desi\s*music|venus|lahari|anand|audio\s*visual|aditya\s*music)\b/gi, ' ');
    ct = ct.replace(/\b(slowed(\s*\+?\s*(reverb|down))?|reverb(ed)?|lofi|lo[\s\-]?fi|bass[\s\-]?boost(ed)?|sped[\s\-]?up|nightcore|8d[\s\-]?audio|432[\s\-]?hz|binaural)\b/gi, ' ');
    ct = ct.replace(/\b(remix|cover|mashup|medley|tribute|karaoke|instrumental(\s*version)?|acoustic(\s*version)?|piano[\s\-]?version|unplugged|radio[\s\-]?edit)\b/gi, ' ');
    ct = ct.replace(/\b(remaster(ed)?|deluxe(\s*edition)?|anniversary\s*edition|bonus\s*track|extended[\s\-]?(version|mix)?|director.?s\s*cut|uncut)\b/gi, ' ');
    ct = ct.replace(/\b(scene|deleted\s*scene|fight\s*scene|climax|movie\s*clip|film\s*clip|interview|talk|vlog|reaction|review|podcast|commentary|behind[\s\-]?the[\s\-]?scenes?|bts\s*video|making[\s\-]?of)\b/gi, ' ');
    ct = ct.replace(/\b(trailer|teaser|promo|motion\s*poster|sneak[\s\-]?peek|theatrical)\b/gi, ' ');
    ct = ct.replace(/\b(tutorial|lesson|how\s*to|learn|practice|fingerstyle|tab|chord|jam[\s\-]?session|backing[\s\-]?track|play[\s\-]?along)\b/gi, ' ');
    ct = ct.replace(/\b(ringtone|caller[\s\-]?tune|whatsapp[\s\-]?status|status\s*video|asmr)\b/gi, ' ');
    ct = ct.replace(/\b(shorts?|reels?|#\w+)\b/gi, ' ');
    ct = ct.replace(/\b(netflix|amazon\s*prime|disney|hotstar|zee5|jio\s*cinema|mx\s*player|sony\s*liv)\b/gi, ' ');
    ct = ct.replace(/\b(web\s*series|short\s*film|mini\s*series|episode\s*\d+|ep\s*\d+|season\s*\d+)\b/gi, ' ');
    ct = ct.replace(/\bfeat\.?\s.*/gi, ' ').replace(/\bft\.?\s.*/gi, ' ').replace(/\bprod\.?\s.*/gi, ' ');
    ct = ct.replace(/\bwith\s+\w.*/gi, ' ').replace(/\s+x\s+[A-Z].*/g, ' ').replace(/\s+&\s+.*/g, ' ');
    ct = ct.replace(/[-–—]\s*(official|audio|video|lyric|full|hd|hq|4k|slowed|reverb|bass|lofi|cover|karaoke|instrumental|remix|live|teaser|trailer|scene|promo|netflix|t[\s\-]?series|zee|sony|eros|saregama).*/gi, ' ');
    ct = ct.replace(/[-–—]/g, ' ').replace(/#\S+/g, ' ').replace(/\s{2,}/g, ' ').trim();

    if (ct.length < 2 && rawSuffix) ct = rawSuffix.replace(/[^\w\s]/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (ct.length < 2) ct = (rawTitle || '').replace(/[^\w\s]/g, ' ').trim();

    let ca = (rawArtist || channelTitle || '').trim();
    ca = ca.replace(/\s*[-–,]\s*Topic\s*$/gi, '').replace(/\bVEVO\s*$/gi, '').replace(/\bofficial\s*$/gi, '').replace(/\bmusic\s*$/gi, '');
    ca = ca.replace(/\s*[,&]\s*.*/, '').replace(/\s*feat\.?.*/gi, '').replace(/\s{2,}/g, ' ').trim();

    const topicMatch = (channelTitle || '').match(/^(.+?)\s*-\s*Topic\s*$/i);
    if (topicMatch) ca = topicMatch[1].trim();

    return {
      displayTitle:    ct,
      cleanSeedTitle:  ct,
      cleanSeedArtist: ca,
    };
  }

  function sanitizeMeta(rawTitle, rawArtist, channelTitle) {
    const { cleanSeedTitle, cleanSeedArtist } = masterSanitize(rawTitle, rawArtist, channelTitle);
    return { cleanTitle: cleanSeedTitle, cleanArtist: cleanSeedArtist };
  }

  /* ═══════════════════════════════════════════════
     5. DEDUPLICATION — DEEP FINGERPRINTING
  ═══════════════════════════════════════════════ */
  function deepFingerprint(title, artist) {
    let s = ((title || '') + ' ' + (artist || '')).toLowerCase();
    s = s.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ');
    s = s.replace(/\b(official|audio|video|lyric|lyrics|music|song|full|hd|hq|4k|uhd|fhd)\b/g, '');
    s = s.replace(/\b(feat|ft|prod|with|from|by)\b.*/g, '');
    s = s.replace(/\b(slowed|reverb|lofi|bass|boost|nightcore|8d|sped|up|down)\b/g, '');
    s = s.replace(/\b(remix|cover|karaoke|instrumental|acoustic|piano|unplugged)\b/g, '');
    s = s.replace(/\b(remaster|deluxe|edition|bonus|extended|cut|version|mix)\b/g, '');
    s = s.replace(/\b(scene|deleted|trailer|teaser|promo|netflix|advertisement|ad)\b/g, '');
    s = s.replace(/\b(topic|vevo|records|music|entertainment|india|official)\b/g, '');
    s = s.replace(/\b(t[\s]?series|zee|sony|eros|saregama|tips|speed)\b/g, '');
    s = s.replace(/[^a-z0-9]/g, '');
    return s.trim();
  }

  function titleOnlyFingerprint(title) {
    let s = (title || '').toLowerCase();
    s = s.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ');
    s = s.replace(/\b(official|audio|video|lyric|lyrics|music|song|full|hd|hq|4k|uhd|fhd)\b/g, '');
    s = s.replace(/\b(feat|ft|prod|with|from|by)\b.*/g, '');
    s = s.replace(/\b(slowed|reverb|lofi|bass|boost|nightcore|8d|sped|up|down)\b/g, '');
    s = s.replace(/\b(remix|cover|karaoke|instrumental|acoustic|piano|unplugged)\b/g, '');
    s = s.replace(/\b(topic|vevo|records|music|entertainment|india|official)\b/g, '');
    s = s.replace(/[^a-z0-9]/g, '');
    return s.trim();
  }

  function normTitle(t) {
    return (t || '').toLowerCase()
      .replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '')
      .replace(/\b(official|audio|video|lyric|feat\..*|ft\..*|slowed|reverb|bass|lofi|remix|cover)\b/g, '')
      .replace(/[^a-z0-9]/g, '').trim();
  }

  function isAlreadyPlayed(title, artist, videoId) {
    if (videoId && _playedVideoIds.has(videoId)) return true;
    const fp = deepFingerprint(title, artist);
    if (fp && fp.length >= 3 && playedHistory.has(fp)) return true;
    const tfp = titleOnlyFingerprint(title);
    if (tfp && tfp.length >= 3 && _titleOnlyHistory.has(tfp)) return true;
    return false;
  }

  function markPlayed(title, artist, videoId) {
    if (videoId) _playedVideoIds.add(videoId);
    const fp = deepFingerprint(title, artist);
    if (fp && fp.length >= 3) playedHistory.add(fp);
    const tfp = titleOnlyFingerprint(title);
    if (tfp && tfp.length >= 3) _titleOnlyHistory.add(tfp);
    autoPlayHistory.add(normTitle(title));
  }

  /* ═══════════════════════════════════════════════
     6. LAST.FM API (kept for genre guard & similarity)
  ═══════════════════════════════════════════════ */
  async function lfm(params) {
    const u = new URL(LFM_BASE);
    Object.entries({ ...params, api_key: LFM_KEY, format: 'json' })
      .forEach(([k, v]) => u.searchParams.set(k, v));
    try { const r = await fetch(u.toString()); return await r.json(); }
    catch { return {}; }
  }

  async function lfmArtistTags(artist) {
    const { cleanArtist: ca } = sanitizeMeta('', artist);
    if (!ca) return [];
    const d = await lfm({ method: 'artist.getTopTags', artist: ca, autocorrect: 1 });
    return (d?.toptags?.tag || []).map(t => (t.name || '').toLowerCase());
  }

  async function lfmSimilarTracks(title, artist, limit = 10) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(title, artist);
    if (!ct || !ca) return [];
    const d = await lfm({ method: 'track.getSimilar', track: ct, artist: ca, limit, autocorrect: 1 });
    const tracks = d?.similartracks?.track || [];
    return tracks.map(t => ({
      title: t.name, artist: t.artist.name,
      lfmTitle: t.name, lfmArtist: t.artist.name,
      match: parseFloat(t.match || '0'),
    }));
  }

  async function lfmArtistTopTracks(artist, limit = 8) {
    const { cleanArtist: ca } = sanitizeMeta('', artist);
    if (!ca) return [];
    const d = await lfm({ method: 'artist.getTopTracks', artist: ca, limit, autocorrect: 1 });
    return (d?.toptracks?.track || []).map(t => ({
      title: t.name, artist: t.artist?.name || artist,
      lfmTitle: t.name, lfmArtist: t.artist?.name || artist, match: 1.0,
    }));
  }

  /* ═══════════════════════════════════════════════
     7. FIX C: CHANNEL TRUST GATE
  ═══════════════════════════════════════════════ */
  const BLOCKED_CHANNEL_PATTERNS = new RegExp([
    'netflix', 'amazon\\s*prime\\s*video', 'disney\\+?', 'hotstar', 'zee5',
    'sony\\s*liv', 'jio\\s*cinema', 'mx\\s*player', 'voot', 'alt\\s*balaji',
    'movie\\s*clips?', 'film\\s*clips?', 'scene\\s*vault', 'movieclips',
    'news18', 'ndtv', 'aaj\\s*tak', 'zee\\s*news', 'india\\s*tv', 'republic\\s*tv',
    'comedy\\s*central', 'stand\\s*up', 'roast', 'tvf', 'scoop\\s*whoop',
    'advertisement', 'promoted', 'google\\s*ads',
    'podcast', 'interview', 'talk\\s*show', 'conversation',
  ].map(p => `(?:${p})`).join('|'), 'i');

  const TOPIC_SUFFIX     = /\s*-\s*topic\s*$/i;
  const VEVO_PATTERN     = /vevo/i;
  const MUSIC_CHAN_WORDS = /\b(music|songs?|audio|records?|official)\b/i;

  function channelMusicScore(channelTitle) {
    const ct = (channelTitle || '').toLowerCase();
    if (TOPIC_SUFFIX.test(channelTitle))         return 100;
    if (/official\s*artist\s*channel/i.test(ct)) return  95;
    if (VEVO_PATTERN.test(ct))                   return  90;
    if (MUSIC_CHAN_WORDS.test(ct))               return  65;
    if (BLOCKED_CHANNEL_PATTERNS.test(ct))       return -999;
    return 30;
  }

  function isVerifiedMusicChannel(channelTitle) {
    return channelMusicScore(channelTitle) >= 65;
  }

  /* ═══════════════════════════════════════════════
     8. FIX D: DEEP JUNK TITLE BLACKLIST
  ═══════════════════════════════════════════════ */
  const JUNK_TITLE_PATTERNS = new RegExp([
    'advertisement', 'sponsored', '\\bpromo\\b',
    'slowed', 'reverb(ed)?', 'lofi', 'lo[\\s\\-]?fi', 'bass[\\s\\-]?boost(ed)?',
    'sped[\\s\\-]?up', 'nightcore', '8d[\\s\\-]?audio',
    '\\bcover\\b', 'karaoke', 'instrumental[\\s\\-]?version', 'tribute', 'mashup',
    'reaction[\\s\\-]?video', '\\breaction\\b', '\\breview\\b',
    '\\binterview\\b', '\\bpodcast\\b', 'talk[\\s\\-]?show',
    'behind[\\s\\-]?the[\\s\\-]?scenes?', 'making[\\s\\-]?of',
    '\\bvlog\\b', '\\bvlogs\\b',
    '#short', '\\bshorts\\b', '\\breels\\b',
    '\\bscene\\b', 'deleted\\s*scene', 'fight\\s*scene', 'climax\\s*scene',
    'movie\\s*scene', 'film\\s*scene', 'movie\\s*clip', 'film\\s*clip',
    '\\btrailer\\b', 'official\\s*trailer', '\\bteaser\\b',
    '\\bnetflix\\b', '\\bamazon\\s*prime\\b', '\\bhotstar\\b',
    '\\btutorial\\b', '\\blesson\\b', 'fingerstyle', 'backing[\\s\\-]?track',
    '\\bringtone\\b', 'whatsapp[\\s\\-]?status', '\\basmr\\b',
    'whiteboard\\s+animation', 'meditation', '\\bstudy\\s+music\\b',
  ].map(p => `(?:${p})`).join('|'), 'i');

  /* ═══════════════════════════════════════════════
     9. BACKEND SEARCH — replaces/supplements ytSearch
  ═══════════════════════════════════════════════ */

  /**
   * Search via backend /search endpoint.
   * Returns normalized items compatible with the existing codebase.
   */
  async function backendSearch(query, limit = 10) {
    const trimQ = (query || '').trim();
    if (trimQ.length < 3) return [];
    try {
      const data = await backendFetch('/search', { q: trimQ, limit });
      const results = (data.results || []).filter(t =>
        t.videoId && !JUNK_TITLE_PATTERNS.test(t.title || '')
      );
      /* Normalize to same shape as ytSearch results */
      return results.map(t => ({
        videoId:      t.videoId,
        title:        t.title,
        channelTitle: t.artist,    // artist acts as channel in YTMusic context
        thumbnail:    [{ url: t.thumbnail }],
        lengthSeconds: t.durationSecs || 0,
        _musicScore:  90,          // YTMusic results are always music
        _artistId:    t.artistId,  // NEW: persist for /normal chaining
        _backendHit:  true,
      }));
    } catch (e) {
      console.log('[backendSearch] Failed, falling back to RapidAPI:', e.message);
      return [];
    }
  }

  /**
   * Hybrid search: backend first, RapidAPI fallback.
   */
  async function ytSearch(query, max = 8, strictMusicOnly = false) {
    const trimQ = (query || '').trim();
    if (trimQ.length < 3) return [];

    /* Try backend first */
    if (!BACKEND_ONLY || true) {
      const bResults = await backendSearch(trimQ, max);
      if (bResults.length >= 3) {
        console.log(`[ytSearch] ✅ Backend: ${bResults.length} results for "${trimQ}"`);
        return bResults.slice(0, max);
      }
    }

    /* Fallback: RapidAPI YouTube search */
    try {
      const r = await fetch(
        `https://${YT_ALT_HOST}/search?query=${encodeURIComponent(trimQ)}&geo=IN&type=video`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': YT_ALT_HOST } }
      );
      const d = await r.json();
      let items = (d.data || []).map(i => ({
        ...i,
        _musicScore: channelMusicScore(i.channelTitle || ''),
      }));

      items.sort((a, b) => b._musicScore - a._musicScore);
      items = items.filter(i => {
        if (i._musicScore <= -900) return false;
        if (JUNK_TITLE_PATTERNS.test(i.title || '')) return false;
        if (strictMusicOnly) {
          const s = parseInt(i.lengthSeconds) || 0;
          if (s > 0 && (s < MUSIC_DUR_MIN || s > MUSIC_DUR_MAX)) return false;
        }
        return true;
      });

      if (strictMusicOnly) {
        const verified = items.filter(i => isVerifiedMusicChannel(i.channelTitle));
        if (verified.length >= 3) return verified.slice(0, max);
      }

      return items.slice(0, max);
    } catch { return []; }
  }

  /* ═══════════════════════════════════════════════
     10. STREAM RESOLUTION — BACKEND /get_track FIRST
         M4A format 140 priority; RapidAPI fallback
  ═══════════════════════════════════════════════ */

  function passesDurationGuard(lengthSeconds, relaxed = false) {
    const s = parseInt(lengthSeconds) || 0;
    if (s === 0) return true;
    return s >= (relaxed ? 90 : MUSIC_DUR_MIN) && s <= (relaxed ? 480 : MUSIC_DUR_MAX);
  }

  function rankAudioFormats(formats) {
    const typeScore = (mime) => {
      if (!mime) return 0;
      const m = mime.toLowerCase();
      if (m.includes('m4a') || (m.includes('mp4') && m.includes('audio'))) return 40;
      if (m.includes('opus'))  return 30;
      if (m.includes('webm'))  return 20;
      if (m.includes('audio')) return 10;
      return 5;
    };
    return [...formats].sort((a, b) => {
      const tA = typeScore(a.mimeType), tB = typeScore(b.mimeType);
      if (tA !== tB) return tB - tA;
      return parseInt(b.bitrate || b.audioBitrate || 0) - parseInt(a.bitrate || a.audioBitrate || 0);
    });
  }

  /**
   * extractYTAudioUrl — Backend /get_track FIRST, then RapidAPI fallbacks.
   * Always returns direct M4A URL (format 140 when possible).
   */
  async function extractYTAudioUrl(ytId) {
    const k = 'yt_' + ytId;
    const cached = cacheGet(k);
    if (cached) {
      console.log(`[extractAudio] ⚡ Cache hit: ${ytId}`);
      return cached;
    }
    console.log(`[extractAudio] 🔍 Resolving audio for: ${ytId}`);

    /* ─── Attempt 1: Backend /get_track (direct M4A, format 140) ─── */
    try {
      const data = await backendFetch('/get_track', { id: ytId });
      if (data.streamUrl) {
        console.log(`[extractAudio] ✅ Backend M4A: ${ytId}`);
        cacheSet(k, data.streamUrl);
        return data.streamUrl;
      }
    } catch (e) {
      console.log(`[extractAudio] ⚠️ Backend /get_track failed: ${e.message}`);
    }

    /* ─── Attempt 2: ytstream RapidAPI (fallback) ─── */
    try {
      const r = await fetch(
        `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com' } }
      );
      const d = await r.json();
      if (d.formats) {
        const allAudio = Object.values(d.formats).filter(f =>
          f.url && (f.mimeType?.includes('audio') || (!f.qualityLabel && f.url))
        );
        const ranked = rankAudioFormats(allAudio);
        if (ranked.length) {
          console.log(`[extractAudio] ✅ RapidAPI ytstream: ${ytId} (${ranked[0].mimeType})`);
          cacheSet(k, ranked[0].url);
          return ranked[0].url;
        }
      }
      if (d.adaptiveFormats) {
        const audioOnly = d.adaptiveFormats.filter(f => f.url && f.mimeType?.includes('audio'));
        const ranked = rankAudioFormats(audioOnly);
        if (ranked.length) {
          cacheSet(k, ranked[0].url);
          return ranked[0].url;
        }
      }
    } catch (e) { console.log(`[extractAudio] ⚠️ RapidAPI ytstream failed: ${e.message}`); }

    /* ─── Attempt 3: SP81 fallback ─── */
    try {
      const r = await fetch(
        `https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true&bypassSpotify=true&quality=best`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } }
      );
      const d = await r.json();
      const u = Array.isArray(d) ? (d[0]?.url || d[0]?.link) : (d.url || d.link);
      if (u) { cacheSet(k, u); return u; }
    } catch (e) { console.log(`[extractAudio] ⚠️ SP81 failed: ${e.message}`); }

    console.log(`[extractAudio] ❌ All sources failed: ${ytId}`);
    return null;
  }

  /* ─── Batch prefetch via /batch_streams ─── */
  async function batchPrefetchStreams(videoIds) {
    if (!videoIds || !videoIds.length) return;
    /* Only batch IDs not already cached */
    const needed = videoIds.filter(id => !cacheGet('yt_' + id));
    if (!needed.length) return;
    try {
      const data = await backendPost('/batch_streams', { ids: needed.slice(0, 3) });
      (data.results || []).forEach(r => {
        if (r.streamUrl) cacheSet('yt_' + r.videoId, r.streamUrl);
      });
      console.log(`[batchPrefetch] ✅ Pre-fetched ${(data.results || []).filter(r => r.streamUrl).length} streams`);
    } catch (e) {
      console.log('[batchPrefetch] ⚠️ Failed:', e.message);
    }
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

  /* ═══════════════════════════════════════════════
     11. RESOLVE TO YT ID — Backend-Aware
  ═══════════════════════════════════════════════ */
  let _lastChannel = '';

  function buildNaturalQuery(cleanTitle, cleanArtist) {
    if (cleanArtist && cleanTitle) return `"${cleanTitle}" by "${cleanArtist}"`;
    if (cleanTitle)                return `"${cleanTitle}" official audio`;
    return cleanTitle || '';
  }

  function buildOfficialQuery(cleanTitle, cleanArtist) {
    if (cleanArtist && cleanTitle) return `"${cleanTitle}" "${cleanArtist}" official audio`;
    if (cleanTitle)                return `"${cleanTitle}" official audio`;
    return cleanTitle || '';
  }

  async function resolveToYtId(cleanTitle, cleanArtist) {
    if (!cleanTitle && !cleanArtist) return null;

    const q1 = buildNaturalQuery(cleanTitle, cleanArtist);
    let items = await ytSearch(q1, 8, true);

    if (!items.length) {
      const q2 = buildOfficialQuery(cleanTitle, cleanArtist);
      items = await ytSearch(q2, 8, true);
    }
    if (!items.length) return null;

    let pick = null;
    if (_lastChannel) {
      const lc = _lastChannel.toLowerCase();
      pick = items.find(i =>
        (i.channelTitle || '').toLowerCase() === lc &&
        isVerifiedMusicChannel(i.channelTitle) &&
        !isAlreadyPlayed(i.title, i.channelTitle, i.videoId)
      );
    }
    if (!pick) {
      pick = items.find(i =>
        isVerifiedMusicChannel(i.channelTitle) &&
        !isAlreadyPlayed(i.title, i.channelTitle, i.videoId)
      );
    }
    if (!pick) pick = items.find(i => !isAlreadyPlayed(i.title, i.channelTitle, i.videoId)) || items[0];

    _lastChannel = pick.channelTitle || '';

    const { displayTitle, cleanSeedArtist } = masterSanitize(
      pick.title, pick.channelTitle, pick.channelTitle
    );

    return {
      ytId:            pick.videoId,
      displayTitle:    displayTitle || cleanTitle,
      cleanSeedTitle:  cleanTitle,
      cleanSeedArtist: cleanArtist,
      title:           displayTitle || cleanTitle,
      artist:          cleanSeedArtist || cleanArtist,
      thumb:           pick.thumbnail?.[1]?.url || pick.thumbnail?.[0]?.url || '',
      durSecs:         parseInt(pick.lengthSeconds) || 0,
      musicScore:      pick._musicScore,
      channelTitle:    pick.channelTitle || '',
      _artistId:       pick._artistId || null,   // NEW: pass through for normal mode
    };
  }

  async function resolveAudioUrl(item, queueIndex) {
    if (queueIndex !== undefined && jitUrlStore.has(queueIndex)) {
      const stored = jitUrlStore.get(queueIndex);
      /* TTL check */
      if (stored && Date.now() - (stored.fetchedAt || 0) < STREAM_TTL_MS - STREAM_REFRESH_LEAD)
        return stored.url;
    }
    if (item.type === 'ytmusic') return await extractYTAudioUrl(item.ytId);
    if (item.type === 'spotify_yt') {
      if (item.spId) {
        const u = await fetchPremiumAudio(item.spId);
        if (u) return u;
      }
      const ct = item.cleanSeedTitle || item.lfmTitle || item.title;
      const ca = item.cleanSeedArtist || item.lfmArtist || item.artist || '';
      const items2 = await ytSearch(buildNaturalQuery(ct, ca), 5, true);
      if (items2[0]) {
        item.ytId = items2[0].videoId;
        return await extractYTAudioUrl(items2[0].videoId);
      }
    }
    return null;
  }

  let _jitInFlight = new Set();

  async function jitPrefetch(i) {
    if (i < 0 || i >= queue.length)          return;
    if (_jitInFlight.has(i))                 return;
    const item = queue[i];
    if (['youtube', 'stream'].includes(item.type)) return;
    /* Check TTL on existing JIT entry */
    const existing = jitUrlStore.get(i);
    if (existing && Date.now() - (existing.fetchedAt || 0) < STREAM_TTL_MS - STREAM_REFRESH_LEAD) return;

    _jitInFlight.add(i);
    try {
      const url = await resolveAudioUrl(item, undefined);
      if (url) jitUrlStore.set(i, { url, fetchedAt: Date.now() });
    } finally { _jitInFlight.delete(i); }
  }

  function jitEvict(currentI) {
    for (const k of jitUrlStore.keys()) {
      if (k < currentI - 1) jitUrlStore.delete(k);
    }
  }

  /* ═══════════════════════════════════════════════
     12. BACKEND NORMAL MODE — Artist Chain Engine
  ═══════════════════════════════════════════════ */

  /**
   * Fetch next batch via /normal endpoint.
   * Returns array of queue-ready items.
   */
  async function fetchNormalBatchFromBackend(artistName, artistId, currentVideoId) {
    try {
      const artHistStr = Array.from(backendNormalState.artistHistory).join(',');
      const trkHistStr = Array.from(backendNormalState.trackHistory).slice(-30).join(',');

      const data = await backendFetch('/normal', {
        artist_name:    artistName,
        artist_id:      artistId || '',
        id:             currentVideoId || '',
        history:        trkHistStr,
        artist_history: artHistStr,
      });

      const tracks     = data.tracks || [];
      const nextArtist = data.nextArtist || {};

      /* Update state */
      if (nextArtist.name) {
        backendNormalState.currentArtistName = nextArtist.name;
        backendNormalState.currentArtistId   = nextArtist.artistId || null;
        backendNormalState.currentVideoId    = nextArtist.videoId  || currentVideoId;
        backendNormalState.artistHistory.add(artistName);
      }

      /* Add to track history */
      tracks.forEach(t => { if (t.videoId) backendNormalState.trackHistory.add(t.videoId); });

      console.log(`[normalBackend] ✅ "${artistName}" → ${tracks.length} tracks | next: "${nextArtist.name}"`);
      return { tracks, nextArtist };
    } catch (e) {
      console.log('[normalBackend] ❌ Failed:', e.message);
      return { tracks: [], nextArtist: {} };
    }
  }

  /**
   * Fetch vibe batch via /vibe endpoint.
   * Returns array of queue-ready items.
   */
  async function fetchVibeBatchFromBackend(seedVideoId) {
    try {
      const histStr = Array.from(backendVibeState.trackHistory).slice(-30).join(',');
      const data    = await backendFetch('/vibe', {
        id:      seedVideoId,
        limit:   8,
        history: histStr,
      });

      const tracks = data.tracks || [];
      tracks.forEach(t => { if (t.videoId) backendVibeState.trackHistory.add(t.videoId); });
      backendVibeState.seedVideoId = tracks[tracks.length - 1]?.videoId || seedVideoId;

      console.log(`[vibeBackend] ✅ Seed ${seedVideoId} → ${tracks.length} vibe tracks`);
      return tracks;
    } catch (e) {
      console.log('[vibeBackend] ❌ Failed:', e.message);
      return [];
    }
  }

  /* Convert backend track → queue item */
  function backendTrackToQueueItem(t, type) {
    return {
      type,
      title:           t.title,
      artist:          t.artist,
      lfmTitle:        t.title,
      lfmArtist:       t.artist,
      cleanSeedTitle:  t.title,
      cleanSeedArtist: t.artist,
      ytId:            t.videoId,
      thumb:           t.thumbnail || 'https://i.imgur.com/8Q5FqWj.jpeg',
      isAutoPlay:      true,
      _artistId:       t.artistId || null,
    };
  }

  /* ═══════════════════════════════════════════════
     13. WAKE LOCK & BACKGROUND PERSISTENCE
  ═══════════════════════════════════════════════ */
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      if (wakeLock && !wakeLock.released) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch {}
  }

  async function releaseWakeLock() {
    if (wakeLock && !wakeLock.released) {
      try { await wakeLock.release(); } catch {}
      wakeLock = null;
    }
  }

  function updateMediaSessionState() {
    if (!('mediaSession' in navigator)) return;
    const MS = navigator.mediaSession;
    MS.playbackState = isPlaying ? 'playing' : 'paused';
    if (nativeAudio.duration && !isNaN(nativeAudio.duration) && nativeAudio.duration > 0) {
      try {
        MS.setPositionState({
          duration: nativeAudio.duration,
          playbackRate: nativeAudio.playbackRate || 1,
          position: Math.min(nativeAudio.currentTime, nativeAudio.duration),
        });
      } catch {}
    }
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await startSilentKeepAlive();
      if (isPlaying) {
        await acquireWakeLock();
        if (queue[currentIdx]) setupMediaSession(queue[currentIdx]);
        if (nativeAudio.paused && ['ytmusic', 'spotify_yt', 'stream'].includes(activeType)) {
          try { await nativeAudio.play(); } catch {}
        }
      }
    }
  });

  let _lastCheckedTime = -1;
  let _lastEndCheck    = 0;

  setInterval(() => {
    updateMediaSessionState();
    if (!isPlaying || !['ytmusic', 'spotify_yt', 'stream'].includes(activeType)) return;
    if (!nativeAudio.src) return;
    const now = nativeAudio.currentTime;
    const dur = nativeAudio.duration;
    if (now === _lastCheckedTime && !nativeAudio.paused) nativeAudio.play().catch(() => {});
    _lastCheckedTime = now;
    if (dur > 0 && now >= dur - 0.5 && Date.now() - _lastEndCheck > 2000) {
      _lastEndCheck = Date.now();
      playNext();
    }
  }, 2000);

  /* ═══════════════════════════════════════════════
     14. PLAYBACK MODE ENGINE
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

  function cyclePlaybackMode() {
    const modes = ['normal', 'shuffle', 'loop'];
    playerState.mode = modes[(modes.indexOf(playerState.mode) + 1) % 3];
    resetBatchState();
    autoPlayFetching = false;
    updateModeBtn();
    showToast(`${MODE_ICONS[playerState.mode]} ${MODE_LABELS[playerState.mode]} Mode`);
  }

  function showSpDiscBtn(show) {
    const btn = document.getElementById('pmcSpDiscBtn');
    if (!btn) return;
    const hasSpItems  = queue.some(i => i.type === 'spotify_yt');
    const hasYtItems  = queue.some(i => i.type === 'ytmusic');
    btn.classList.toggle('hidden', !(show && (hasSpItems || hasYtItems)));
  }

  /* ═══════════════════════════════════════════════
     15. AUTO-PLAY ENGINE — Backend /normal + /vibe
         with LFM fallback for similarity metadata
  ═══════════════════════════════════════════════ */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function passesSimGate(match) {
    return (parseFloat(match) || 0) >= LFM_SIMILARITY_THRESHOLD;
  }

  function isTrackUsed(title, artist, videoId) {
    return isAlreadyPlayed(title, artist, videoId) ||
           autoPlayHistory.has(normTitle(title));
  }

  /**
   * Shuffle mode — uses backend /vibe for discovery.
   * Falls back to LFM similar tracks + ytSearch if backend fails.
   */
  async function buildShuffleBatch() {
    const seed = playerState.shuffleSeed || { title: '', artist: '', videoId: '' };

    /* ─── Primary: Backend /vibe ─── */
    const seedVid = seed.videoId || backendVibeState.seedVideoId;
    if (seedVid) {
      const backendTracks = await fetchVibeBatchFromBackend(seedVid);
      const fresh = backendTracks.filter(t =>
        !isTrackUsed(t.title, t.artist, t.videoId)
      );
      if (fresh.length >= 3) {
        const items = fresh.map(t => ({
          title:     t.title,
          artist:    t.artist,
          lfmTitle:  t.title,
          lfmArtist: t.artist,
          match:     0.8,
          _yt:       { videoId: t.videoId, thumbnail: [{ url: t.thumbnail }], lengthSeconds: t.durationSecs },
        }));
        /* Update shuffle seed to last track for continuation */
        const last = fresh[fresh.length - 1];
        playerState.shuffleSeed = {
          title:   last.title,
          artist:  last.artist,
          videoId: last.videoId,
        };
        return items.slice(0, 10);
      }
    }

    /* ─── Fallback: LFM similar tracks ─── */
    const ct = seed.title;
    const ca = seed.artist;
    let pool = await lfmSimilarTracks(ct, ca, 20);
    pool = pool.filter(t => passesSimGate(t.match) && !isTrackUsed(t.title, t.artist, ''));
    shuffle(pool);
    const batch = pool.slice(0, 10);

    if (batch.length < 3) {
      const q = `${ca} similar songs official audio`;
      const ytItems = await ytSearch(q, 12, true);
      for (const y of ytItems) {
        if (batch.length >= 10) break;
        if (!isTrackUsed(y.title, y.channelTitle, y.videoId)) {
          const { cleanSeedTitle: cst, cleanSeedArtist: csa } = masterSanitize(y.title, y.channelTitle, y.channelTitle);
          batch.push({ title: cst, artist: csa, lfmTitle: cst, lfmArtist: csa, match: 0.1, _yt: y });
        }
      }
    }

    if (batch.length > 0) {
      const last = batch[batch.length - 1];
      playerState.shuffleSeed = {
        title:  last.lfmTitle  || last.title,
        artist: last.lfmArtist || last.artist,
        videoId: last._yt?.videoId || '',
      };
    }
    return batch;
  }

  /**
   * Normal mode — uses backend /normal for artist chaining.
   * Falls back to LFM top tracks + similar artist.
   */
  async function buildNormalBatch(cleanSeedTitle, cleanSeedArtist, seedVideoId = '') {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(cleanSeedTitle, cleanSeedArtist);
    playerState.normalBatchTotal = 5;

    /* ─── Primary: Backend /normal ─── */
    const artistName = backendNormalState.currentArtistName || ca;
    const artistId   = backendNormalState.currentArtistId   || playerState.normalArtistId || null;
    const videoId    = backendNormalState.currentVideoId    || seedVideoId || '';

    const { tracks: backendTracks, nextArtist } = await fetchNormalBatchFromBackend(
      artistName, artistId, videoId
    );

    if (backendTracks.length >= 2) {
      /* Update playerState for continuation */
      if (nextArtist.name) {
        playerState.normalArtist   = nextArtist.name;
        playerState.normalArtistId = nextArtist.artistId || null;
      }
      return backendTracks.filter(t => !isTrackUsed(t.title, t.artist, t.videoId));
    }

    /* ─── Fallback: LFM top tracks + similar artist ─── */
    console.log('[normalBatch] Backend returned <2 tracks, falling back to LFM');
    const artist = playerState.normalArtist || ca;
    if (!playerState.normalArtist) playerState.normalArtist = ca;

    let artistTracks = await lfmArtistTopTracks(artist, 15);
    artistTracks = artistTracks.filter(t => !isTrackUsed(t.title, t.artist, ''));
    const tracks13 = artistTracks.slice(0, 3);

    let vibePool = await lfmSimilarTracks(ct, artist, 15);
    vibePool = vibePool.filter(t =>
      passesSimGate(t.match) &&
      !isTrackUsed(t.title, t.artist, '') &&
      t.artist.toLowerCase() !== artist.toLowerCase()
    );

    if (vibePool.length < 2) {
      const q = `"${artist}" similar songs official audio`;
      const ytV = await ytSearch(q, 10, true);
      for (const y of ytV) {
        if (vibePool.length >= 5) break;
        if (!isTrackUsed(y.title, y.channelTitle, y.videoId)) {
          const { cleanSeedTitle: cst, cleanSeedArtist: csa } = masterSanitize(y.title, y.channelTitle, y.channelTitle);
          vibePool.push({ title: cst, artist: csa, lfmTitle: cst, lfmArtist: csa, match: 0.1, _yt: y });
        }
      }
    }

    shuffle(vibePool);
    const batch = [...tracks13, ...vibePool.slice(0, 2)];
    playerState.normalBatchPos = 0;
    return batch.slice(0, 5);
  }

  /* ─── triggerAutoPlayLoad ─── */
  async function triggerAutoPlayLoad() {
    if (autoPlayFetching)        return;
    if (playerState.batchLoaded) return;
    if (queue.length === 0)      return;
    if (playerState.mode === 'loop') return;

    autoPlayFetching        = true;
    playerState.batchLoaded = false;

    const seed = queue[queue.length - 1];
    const seedTitle   = seed.cleanSeedTitle  || seed.lfmTitle  || seed.title;
    const seedArtist  = seed.cleanSeedArtist || seed.lfmArtist || seed.artist || '';
    const seedVideoId = seed.ytId || '';

    /* Init backend states if not set */
    if (!backendNormalState.currentArtistName) {
      backendNormalState.currentArtistName = seedArtist;
      backendNormalState.currentArtistId   = seed._artistId || null;
      backendNormalState.currentVideoId    = seedVideoId;
    }
    if (!backendVibeState.seedVideoId) {
      backendVibeState.seedVideoId = seedVideoId;
    }

    if (activeSrcTab === 'spotify' && spotifyPlaylistEnded && spDiscoveryMode === 'discovery') {
      spotifyPlaylistEnded = false;
      playerState.shuffleSeed = { title: seedTitle, artist: seedArtist, videoId: seedVideoId };
    }

    let metas = [];
    if (playerState.mode === 'shuffle') {
      if (!playerState.shuffleSeed)
        playerState.shuffleSeed = { title: seedTitle, artist: seedArtist, videoId: seedVideoId };
      metas = await buildShuffleBatch();
    } else {
      metas = await buildNormalBatch(seedTitle, seedArtist, seedVideoId);
    }

    const fresh = metas.filter(m => !isAlreadyPlayed(m.title || m.lfmTitle, m.artist || m.lfmArtist, m.videoId || m._yt?.videoId));
    const type  = activeSrcTab === 'spotify' ? 'spotify_yt' : 'ytmusic';

    const newVideoIds = [];

    for (const meta of fresh) {
      const cleanTitle  = meta.lfmTitle  || meta.title;
      const cleanArtist = meta.lfmArtist || meta.artist || '';

      let qItem;

      if (meta._yt) {
        /* Direct YT/backend result */
        const y   = meta._yt;
        const dur = parseInt(y.lengthSeconds || y.durationSecs) || 0;
        if (dur > 0 && !passesDurationGuard(dur, false)) continue;

        const { displayTitle } = masterSanitize(y.title || cleanTitle, y.channelTitle || cleanArtist, y.channelTitle || '');

        qItem = {
          type,
          title:           displayTitle || cleanTitle,
          artist:          cleanArtist,
          lfmTitle:        cleanTitle,
          lfmArtist:       cleanArtist,
          cleanSeedTitle:  cleanTitle,
          cleanSeedArtist: cleanArtist,
          ytId:            y.videoId,
          thumb:           y.thumbnail?.[1]?.url || y.thumbnail?.[0]?.url || y.thumbnail || 'https://i.imgur.com/8Q5FqWj.jpeg',
          isAutoPlay:      true,
          _artistId:       meta._artistId || null,
        };
      } else if (meta.videoId) {
        /* Backend track with direct videoId */
        qItem = backendTrackToQueueItem(meta, type);
      } else {
        /* LFM-only track — need to resolve to YT ID */
        const res = await resolveToYtId(cleanTitle, cleanArtist);
        if (!res) continue;
        if (res.durSecs > 0 && !passesDurationGuard(res.durSecs, false)) continue;

        qItem = {
          type,
          title:           res.displayTitle || cleanTitle,
          artist:          cleanArtist,
          lfmTitle:        cleanTitle,
          lfmArtist:       cleanArtist,
          cleanSeedTitle:  cleanTitle,
          cleanSeedArtist: cleanArtist,
          ytId:            res.ytId,
          thumb:           res.thumb,
          isAutoPlay:      true,
          _artistId:       res._artistId || null,
        };
      }

      if (isAlreadyPlayed(qItem.title, qItem.artist, qItem.ytId)) continue;

      markPlayed(qItem.lfmTitle || qItem.title, qItem.lfmArtist || qItem.artist, qItem.ytId);
      queue.push(qItem);
      if (qItem.ytId) newVideoIds.push(qItem.ytId);
    }

    renderQueue();
    playerState.batchLoaded = true;
    autoPlayFetching        = false;

    /* JIT prefetch next item + batch stream pre-fetch */
    jitPrefetch(currentIdx + 1);
    if (newVideoIds.length > 1) batchPrefetchStreams(newVideoIds.slice(0, 3));
  }

  /* ═══════════════════════════════════════════════
     16. AUTO-PLAY TOGGLE
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
     17. PANEL ENGINE
  ═══════════════════════════════════════════════ */
  let startY = 0, isPanelOpen = false;

  function openPanel() {
    if (isPanelOpen) return;
    isPanelOpen = true;
    panel?.classList.add('zx-open');
    document.body.style.overflow = 'hidden';
    panelToggleBtn?.classList.add('active');
    document.getElementById('chatApp')?.classList.add('player-open');
  }
  function closePanel() {
    if (!isPanelOpen) return;
    isPanelOpen = false;
    panel?.classList.remove('zx-open');
    document.body.style.overflow = '';
    panelToggleBtn?.classList.remove('active');
    document.getElementById('chatApp')?.classList.remove('player-open');
  }

  handle?.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  handle?.addEventListener('touchmove',  e => { if (!isPanelOpen && e.touches[0].clientY - startY > 15) openPanel(); }, { passive: true });
  panelToggleBtn?.addEventListener('click', e => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  handle?.addEventListener('click', e => { if (e.target.closest('.mp-btn,.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });

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
      btn.classList.add('hidden');
      showSpDiscBtn(true);
      showToast('📋 Playlist exited — music continues');
    });
    strip.insertBefore(btn, strip.firstChild);
  }

  /* ═══════════════════════════════════════════════
     18. SYNC ENGINE
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

  nativeAudio?.addEventListener('seeked', () => {
    if (synced && !isRemoteAction)
      broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
  });

  /* ═══════════════════════════════════════════════
     19. YT IFRAME ENGINE
  ═══════════════════════════════════════════════ */
  const ytTag = document.createElement('script');
  ytTag.src   = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(ytTag);

  window.onYouTubeIframeAPIReady = function () {
    if (!ytFrameWrap) return;
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
     20. YT TAB SEARCH
  ═══════════════════════════════════════════════ */
  function isYouTubeUrl(s) { return /youtu\.?be|youtube\.com/.test(s); }
  function extractYouTubeId(s) {
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function searchYouTubeDisplay(query) {
    if (!query) return;
    if (isYouTubeUrl(query)) {
      const id = extractYouTubeId(query);
      if (id) { addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: id, thumb: '' }); showToast('▶ Loading…'); return; }
    }
    if (ytSearchResultsEl) ytSearchResultsEl.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(episodesOverlayYt, toggleListBtnYt);
    ytSearch(query, 15, false).then(items => {
      if (!ytSearchResultsEl) return;
      ytSearchResultsEl.innerHTML = '';
      if (!items.length) { ytSearchResultsEl.innerHTML = '<p class="mp-empty">No results.</p>'; return; }
      items.forEach(vid => {
        const thumb = vid.thumbnail?.[1]?.url || vid.thumbnail?.[0]?.url || '';
        const div   = document.createElement('div');
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
     21. SPOTIFY SEARCH
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
        const aT = a.iType === 'track', bT = b.iType === 'track';
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
        const spId   = d.id || d.uri?.split(':').pop();
        const isEx   = name.toLowerCase() === ql;
        const div    = document.createElement('div');
        div.className = 'yt-search-item sp-list-item' + (isPL || isAL ? ' sp-folder-item' : '');
        const rIcon  = (isPL || isAL)
          ? `<span class="sp-folder-btn" title="${isAL ? 'Album' : 'Playlist'}">📂</span>`
          : `<span class="sp-play-btn">▶</span>`;
        const badge  = isEx ? `<span class="sp-best-badge">★</span>` : '';
        const tTag   = isPL
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
            tr.forEach(t => queue.push({
              type: 'spotify_yt', title: t.title, artist: t.artist,
              lfmTitle: t.title, lfmArtist: t.artist,
              cleanSeedTitle: t.title, cleanSeedArtist: t.artist,
              spId: t.id, thumb: t.image,
            }));
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
            addToQueue({
              type: 'spotify_yt', title: name, artist,
              lfmTitle: name, lfmArtist: artist,
              cleanSeedTitle: name, cleanSeedArtist: artist,
              spId, thumb,
            });
            showSpDiscBtn(true);
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
      addToQueue({
        type: 'spotify_yt', title: t.title, artist: t.artist,
        lfmTitle: t.title, lfmArtist: t.artist,
        cleanSeedTitle: t.title, cleanSeedArtist: t.artist,
        spId: t.id, thumb: t.image,
      });
      showSpDiscBtn(true);
    };
    spResultsArea.appendChild(div);
  }

  async function fetchPlaylistTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/playlist_tracks?id=${id}&limit=50`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d = await r.json();
      return (d.items || []).filter(i => i.track).map(i => ({
        id: i.track.id, title: i.track.name,
        artist: i.track.artists[0]?.name || '',
        image: i.track.album?.images[0]?.url || '',
      }));
    } catch { return []; }
  }

  async function fetchAlbumTracks(id) {
    try {
      const r = await fetch(`https://${SP81_HOST}/album_tracks?id=${id}`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } });
      const d = await r.json();
      const img = d.album?.images?.[0]?.url || '';
      return (d.album?.tracks?.items || []).map(i => ({
        id: i.id, title: i.name,
        artist: i.artists[0]?.name || '', image: img,
      }));
    } catch { return []; }
  }

  spSearchSongBtn?.addEventListener('click',     () => searchSpotify(spInput.value.trim(), false));
  spSearchPlaylistBtn?.addEventListener('click', () => searchSpotify(spInput.value.trim(), true));
  spInput?.addEventListener('keydown', e => { if (e.key === 'Enter') spSearchSongBtn?.click(); });

  /* ═══════════════════════════════════════════════
     22. YT MUSIC SEARCH — Backend-powered
  ═══════════════════════════════════════════════ */
  async function searchYTMusic(query) {
    if (!query) return;
    ytmResultsArea.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(ytmResultsArea, toggleListBtnYtm);

    /* Use backend /search for clean YTMusic results */
    let items = await backendSearch(query, 15);

    /* Fallback to RapidAPI if backend unavailable */
    if (items.length < 3) {
      const naturalQ = query.includes(' by ') ? query : `${query} official audio`;
      items = await ytSearch(naturalQ, 15, true);
    }

    ytmResultsArea.innerHTML = '';
    if (!items.length) { ytmResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }

    items.forEach(item => {
      const dur = parseInt(item.lengthSeconds || item.durationSecs) || 0;
      const durStr = dur > 0 ? ` • ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '';
      const { displayTitle } = masterSanitize(item.title, item.channelTitle, item.channelTitle);
      const div   = document.createElement('div');
      div.className = 'yt-search-item';
      const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || item.thumbnail || '';
      const isTopicCh  = TOPIC_SUFFIX.test(item.channelTitle || '');
      const isVerified = isVerifiedMusicChannel(item.channelTitle) || item._backendHit;
      const chanLabel  = item._backendHit
        ? `<span style="color:#1db954;font-size:9px;margin-right:3px">✓ YTM</span>`
        : isTopicCh
        ? `<span style="color:#1db954;font-size:9px;margin-right:3px">✓ Topic</span>`
        : isVerified
        ? `<span style="color:#60a5fa;font-size:9px;margin-right:3px">✓</span>`
        : '';
      div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${displayTitle || item.title}</div><div class="yt-search-sub">${chanLabel}${item.channelTitle || ''}${durStr}</div></div><span style="font-size:15px;color:#ff4444">▶</span>`;
      div.onclick = () => {
        const { cleanSeedTitle, cleanSeedArtist } = masterSanitize(item.title, item.channelTitle, item.channelTitle);
        const topicArtist = (item.channelTitle || '').replace(/\s*-\s*Topic\s*$/i, '');
        const artistName  = topicArtist || cleanSeedArtist || item.channelTitle;

        activeSrcTab = 'ytmusic'; queue = []; currentIdx = 0;
        jitUrlStore.clear();
        resetBatchState();

        /* Initialize backend normal state with this artist */
        backendNormalState.currentArtistName = artistName;
        backendNormalState.currentArtistId   = item._artistId || null;
        backendNormalState.currentVideoId    = item.videoId;
        backendNormalState.artistHistory.clear();
        backendVibeState.seedVideoId         = item.videoId;
        backendVibeState.trackHistory.clear();

        addToQueue({
          type: 'ytmusic',
          title:           displayTitle || item.title,
          artist:          artistName,
          lfmTitle:        cleanSeedTitle || displayTitle || item.title,
          lfmArtist:       artistName,
          cleanSeedTitle:  cleanSeedTitle || displayTitle || item.title,
          cleanSeedArtist: artistName,
          ytId:            item.videoId,
          thumb,
          _artistId:       item._artistId || null,
        });
        showSpDiscBtn(true);
      };
      ytmResultsArea.appendChild(div);
    });
  }

  ytmSearchBtn?.addEventListener('click',   () => searchYTMusic(ytmInput.value.trim()));
  ytmInput?.addEventListener('keydown', e => { if (e.key === 'Enter') ytmSearchBtn?.click(); });

  /* ═══════════════════════════════════════════════
     23. QUEUE ENGINE
  ═══════════════════════════════════════════════ */
  function addToQueue(item) {
    queue.push(item);
    markPlayed(item.lfmTitle || item.title, item.lfmArtist || item.artist || '', item.ytId);
    renderQueue();
    playQueueItem(queue.length - 1);
  }

  function renderQueue() {
    if (!queueList) return;
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      const icon   = { youtube: '🎬', ytmusic: '🎵', spotify_yt: '🌐', stream: '☁️' }[item.type] || '🎵';
      const qTitle  = item.lfmTitle  || item.cleanSeedTitle  || item.title;
      const qArtist = item.lfmArtist || item.cleanSeedArtist || item.artist || '';
      el.innerHTML = `<span style="font-size:10px;opacity:.5;flex-shrink:0">${icon}</span><div style="flex:1;min-width:0"><div class="qi-title">${qTitle}</div>${qArtist ? `<div class="qi-artist" style="font-size:9px;opacity:.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${qArtist}</div>` : ''}</div><button class="qi-del">✕</button>`;
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

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    if (playerState.mode === 'loop' && i !== currentIdx) { renderMedia(queue[currentIdx]); return; }

    const isManual = !queue[i]?.isAutoPlay;
    if (isManual) {
      resetBatchState();
      autoPlayFetching = false;
    }

    currentIdx = i;
    jitEvict(i);
    renderQueue();
    const item = queue[i];
    if (synced && !isRemoteAction) broadcastSync({ action: 'change_song', item });
    renderMedia(item);
    showSpDiscBtn(activeSrcTab === 'spotify' || activeSrcTab === 'ytmusic');

    if (autoPlayEnabled && i >= queue.length - 2) triggerAutoPlayLoad();
    jitPrefetch(i + 1);

    /* Batch prefetch next 2 stream URLs */
    const nextIds = queue.slice(i + 1, i + 3)
      .map(qi => qi.ytId).filter(Boolean);
    if (nextIds.length > 0) batchPrefetchStreams(nextIds);
  }

  function showPremiumCard(src) {
    cinemaMode?.classList.add('hidden');
    premiumMusicCard?.classList.remove('hidden');
    spotifyMode?.classList.add('hidden');
    if (premiumMusicCard) {
      premiumMusicCard.className = src === 'spotify'
        ? 'premium-music-card source-sp'
        : 'premium-music-card source-ytm';
    }
    if (pmcSourceBadge) {
      pmcSourceBadge.textContent = src === 'spotify' ? '🌐 Spotify' : '🎵 YT Music';
      pmcSourceBadge.className   = 'pmc-source-badge ' + (src === 'spotify' ? 'sp' : 'ytm');
    }
    showSpDiscBtn(true);
  }

  async function renderMedia(item) {
    if (!nativeAudio) return;
    nativeAudio.pause();
    nativeAudio.removeAttribute('src');
    isPlaying = false;
    updatePlayBtn();
    updateProgressBar(0, 0);
    if (ytFrameWrap) ytFrameWrap.style.display = 'none';
    if (ytPlayer && isYtReady) ytPlayer.pauseVideo();

    const displayTitle  = item.lfmTitle  || item.cleanSeedTitle  || item.title;
    const displayArtist = item.lfmArtist || item.cleanSeedArtist || item.artist || 'Unknown';

    setPMCInfo(displayTitle, displayArtist, item.thumb);
    setTrackInfo(displayTitle, displayArtist);
    setupMediaSession({ ...item, title: displayTitle, artist: displayArtist });

    if (item.type === 'youtube') {
      activeType = 'youtube';
      showCinemaMode();
      if (ytFrameWrap) ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      else setTimeout(() => renderMedia(item), 600);

    } else if (item.type === 'ytmusic' || item.type === 'spotify_yt') {
      activeType   = item.type;
      activeSrcTab = item.type === 'ytmusic' ? 'ytmusic' : 'spotify';
      showPremiumCard(activeSrcTab);

      if (!item.isAutoPlay) {
        playerState.normalArtist        = '';
        playerState.normalSimilarArtist = '';
        playerState.normalArtistId      = item._artistId || null;
        playerState.shuffleSeed = {
          title:   item.cleanSeedTitle  || item.lfmTitle  || item.title,
          artist:  item.cleanSeedArtist || item.lfmArtist || item.artist || '',
          videoId: item.ytId || '',
        };
        playerState.usedArtists.clear();
        _genreAnchorTags              = [];
        playerState.genreAnchorArtist = '';
      }

      const qIdx = queue.indexOf(item);
      let storedJit = jitUrlStore.get(qIdx);
      /* TTL check on JIT entry */
      if (storedJit && Date.now() - (storedJit.fetchedAt || 0) >= STREAM_TTL_MS - STREAM_REFRESH_LEAD) {
        jitUrlStore.delete(qIdx);
        storedJit = null;
      }
      let url = storedJit?.url || null;
      if (!url) url = await resolveAudioUrl(item, undefined);
      if (url) jitUrlStore.set(qIdx, { url, fetchedAt: Date.now() });

      if (url) {
        nativeAudio.src = url;
        nativeAudio.play()
          .then(async () => {
            isPlaying = true;
            updatePlayBtn();
            premiumMusicCard?.classList.add('playing');
            await acquireWakeLock();
            await startSilentKeepAlive();
            jitPrefetch(qIdx + 1);
          })
          .catch(() => showToast('Tap ▶ to play'));
      } else if (item.ytId) {
        showToast('⚠️ Stream failed — iframe fallback');
        showCinemaMode();
        if (ytFrameWrap) ytFrameWrap.style.display = 'block';
        if (isYtReady) ytPlayer.loadVideoById(item.ytId);
      }
    }
  }

  /* ═══════════════════════════════════════════════
     24. HELPERS & EVENTS
  ═══════════════════════════════════════════════ */
  let _genreAnchorTags = [];

  function showCinemaMode() {
    cinemaMode?.classList.remove('hidden');
    premiumMusicCard?.classList.add('hidden');
    spotifyMode?.classList.add('hidden');
    showSpDiscBtn(false);
  }

  function setPMCInfo(t, a, img) {
    if (pmcTitle)  pmcTitle.textContent  = t;
    if (pmcArtist) pmcArtist.textContent = a;
    if (pmcArtwork) {
      pmcArtwork.src = img || 'https://i.imgur.com/8Q5FqWj.jpeg';
      if (pmcBgBlur) pmcBgBlur.style.backgroundImage = `url('${pmcArtwork.src}')`;
    }
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
    if (pmcProgressFill) pmcProgressFill.style.width = Math.min(100, (cur / dur) * 100) + '%';
    if (pmcCurrentTime)  pmcCurrentTime.textContent  = fmtTime(cur);
    if (pmcDuration)     pmcDuration.textContent     = fmtTime(dur);
  }

  nativeAudio?.addEventListener('timeupdate', () =>
    updateProgressBar(nativeAudio.currentTime, nativeAudio.duration));

  nativeAudio?.addEventListener('ended', () => {
    if (activeSrcTab === 'spotify' && inSpotifyPlaylist && currentIdx === queue.length - 1)
      spotifyPlaylistEnded = true;
    playNext();
  });

  pmcProgressBar?.addEventListener('click', e => {
    const r = pmcProgressBar.getBoundingClientRect();
    const p = (e.clientX - r.left) / r.width;
    if (nativeAudio.duration) nativeAudio.currentTime = p * nativeAudio.duration;
  });

  let _scrubbing = false;
  pmcProgressBar?.addEventListener('mousedown', () => { _scrubbing = true; });
  document.addEventListener('mousemove', e => {
    if (!_scrubbing || !pmcProgressBar || !nativeAudio?.duration) return;
    const r = pmcProgressBar.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    nativeAudio.currentTime = p * nativeAudio.duration;
  });
  document.addEventListener('mouseup', () => { _scrubbing = false; });

  function playNext() {
    if (playerState.mode === 'loop') { renderMedia(queue[currentIdx]); return; }
    playerState.batchLoaded = false;
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

  nativeAudio?.addEventListener('play', async () => {
    isPlaying = true;
    updatePlayBtn();
    updateMediaSessionState();
    if (synced && !isRemoteAction) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    await acquireWakeLock();
  });

  nativeAudio?.addEventListener('pause', async () => {
    isPlaying = false;
    updatePlayBtn();
    updateMediaSessionState();
    if (synced && !isRemoteAction) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
    await releaseWakeLock();
  });

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
    updateMediaSessionState();
  }

  /* ═══════════════════════════════════════════════
     25. INIT
  ═══════════════════════════════════════════════ */
  (function init() {
    injectModeSwitch();
    injectSpDiscoverySwitch();
    injectPlaylistExitBtn();
    updateModeBtn();
    renderQueue();

    /* Warm up backend on load */
    backendFetch('/health').then(d => {
      console.log(`%c[ZX PRO 5.0] Backend connected ✅ — ${d.engine || 'ZeroX Hub'}`, 'color:#1db954;font-weight:bold');
    }).catch(() => {
      console.log('%c[ZX PRO 5.0] ⚠️ Backend offline — RapidAPI fallback active', 'color:#f59e0b;font-weight:bold');
    });

    console.log(
      '%c[ZX PRO 5.0] Initialized ✅',
      'color:#e8436a;font-weight:bold;font-size:14px',
      '\n\n═══════════════════════════════════════════\n' +
      '  PRO 5.0 — BACKEND-POWERED ENGINE\n' +
      '═══════════════════════════════════════════\n' +
      '  🚀 NEW: Render Backend Integration\n' +
      '     /search    → Backend YTMusic search (clean M4A)\n' +
      '     /get_track → Direct M4A format 140 extraction\n' +
      '     /normal    → Artist chain engine (Python)\n' +
      '     /vibe      → Discovery shuffle (watch playlist)\n' +
      '     /batch_streams → JIT bulk prefetch\n' +
      '  🔄 Stream URL TTL tracking (6h auto re-fetch)\n' +
      '  🎯 Backend-first, RapidAPI fallback architecture\n' +
      '  🎵 Artist state: normalArtistId persisted\n' +
      '\n─── ALL PRO 4.9 FIXES PRESERVED ──────────\n' +
      '  ✅ FIX A: Two-Tier Naming System\n' +
      '  ✅ FIX B: Pre-Emptive masterSanitize\n' +
      '  ✅ FIX C: Channel Trust Gate\n' +
      '  ✅ FIX D: Deep Keyword Blacklist\n' +
      '  ✅ FIX E: LFM Metadata Lock\n' +
      '  ✅ FIX F: Similarity Threshold Gate\n' +
      '  ✅ FIX G: M4A Audio Priority (backend enforced)\n' +
      '  ✅ FIX H: Artist-Title Splitter\n' +
      '  ✅ Duration Guard, Fingerprint Dedup\n' +
      '  ✅ JIT Prefetch + LRU Cache (TTL-aware)\n' +
      '  ✅ Wake Lock + Silent Keep-Alive\n' +
      '  ✅ Normal / Shuffle / Loop modes\n' +
      '  ✅ Spotify playlist + album + song support\n' +
      '  ✅ Sync Network, Cinema Mode, Media Session\n' +
      `  🔒 Wake Lock: ${'wakeLock' in navigator ? 'supported' : 'not supported'}\n` +
      `  🌐 Backend: ${BACKEND_BASE}\n` +
      '═══════════════════════════════════════════\n'
    );
  })();

})();
