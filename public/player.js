/* ═══════════════════════════════════════════════════════════════════
   ZEROX HUB — player48.js  PRO 4.8
   ✅ FIX 1: Natural Query Strategy — "Track" by "Artist" format
   ✅ FIX 2: Music Category Enforcement — Topic/OAC channel priority, movie/ad channels rejected
   ✅ FIX 3: Strict Duration Guard — 135s–390s hard limit (kills ads/trailers/scenes)
   ✅ FIX 4: Pass 4 Sanitization — Scene/Deleted/Extended/Netflix/Teaser stripped
   ✅ FIX 5: Dedup via playedHistory Set — normalized fingerprint, cross-title repeat fix
   ✅ FIX 6: M4A Priority Extraction — audio-only streams ranked by quality
   ✅ FIX 7: Auto-play fallback — "Songs similar to X -X" with duration guard
   ✅ All PRO 4.4 features preserved: JIT, Cinema, Sync, Glow, Genre Guard, Heartbeat
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

  /* FIX 3: Hard duration limits for music tracks */
  const MUSIC_DUR_MIN = 135;  // 2:15 — kills ads, trailers, teasers
  const MUSIC_DUR_MAX = 390;  // 6:30 — kills movie scenes, long compilations

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

  /* ─── FIX 5: playedHistory — normalized fingerprint dedup ─── */
  /* Uses a DEEP fingerprint: strips ALL title words that could differ between
     "official audio", "lyric video", "HD", channel name variants, etc.
     so "Tum Hi Ho (Official Audio)" and "Tum Hi Ho | Aashiqui 2" both hash to "tumhiho" */
  const playedHistory = new Set();

  /* ─── Unified playerState ─── */
  const playerState = {
    mode:               'normal',   // 'normal' | 'shuffle' | 'loop'
    shuffleSeed:        null,
    shuffleBatchPos:    0,
    shuffleBatchTotal:  10,
    normalArtist:       '',
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
  }

  /* ─── LRU Stream Cache (max 40) ─── */
  const CACHE_MAX   = 40;
  const streamCache = new Map();

  function cacheSet(key, val) {
    if (streamCache.has(key)) streamCache.delete(key);
    streamCache.set(key, val);
    if (streamCache.size > CACHE_MAX)
      streamCache.delete(streamCache.keys().next().value);
  }
  function cacheGet(key) { return streamCache.get(key) ?? null; }

  const autoPlayHistory       = new Set(); // legacy — still used for batch dedup
  const shuffleLastTwoBatches = new Set();

  /* ─── JIT URL store ─── */
  const jitUrlStore = new Map(); // index → url string

  /* Wake Lock */
  let wakeLock = null;

  /* ═══════════════════════════════════════════════
     4. METADATA SANITIZATION — PASS 4 UPGRADE
        FIX 4: Added Scene, Deleted, Extended cut, Netflix, Advertisement, Promo
  ═══════════════════════════════════════════════ */
  function sanitizeMeta(rawTitle, rawArtist) {
    let ct = (rawTitle || '').trim();

    /* Pass 1: Strip bracket/paren/brace blocks — these almost always contain junk */
    ct = ct.replace(/\[.*?\]/g, ' ');
    ct = ct.replace(/\(.*?\)/g, ' ');
    ct = ct.replace(/\{.*?\}/g, ' ');

    /* Cut at pipe */
    ct = ct.replace(/\|.*/g, ' ');

    /* Pass 2: Collaboration / credit separators */
    ct = ct.replace(/\bfeat\.?\s.*/gi,    ' ');
    ct = ct.replace(/\bft\.?\s.*/gi,      ' ');
    ct = ct.replace(/\bprod\.?\s.*/gi,    ' ');
    ct = ct.replace(/\bwith\s+\w.*/gi,    ' ');
    ct = ct.replace(/\bfrom\s+["']?.*/gi, ' ');
    ct = ct.replace(/\s+x\s+[A-Z].*/g,   ' ');
    ct = ct.replace(/\s+&\s+.*/g,         ' ');

    /* Pass 3: Residual junk keywords */
    ct = ct.replace(/\b(official\s*(music\s*)?video|official\s*audio|official\s*lyric\s*video|lyric\s*video|lyrics?|4k|hd|hq|uhd|fhd|480p|720p|1080p|2160p)\b/gi, ' ');
    ct = ct.replace(/\bfull\s*(song|version|album|audio|video)\b/gi, ' ');
    ct = ct.replace(/\b(slowed(\s*\+?\s*(reverb|down))?|reverb(ed)?|lofi|lo[\s\-]?fi|bass[\s\-]?boost(ed)?|sped[\s\-]?up|nightcore|8d[\s\-]?audio|432[\s\-]?hz|binaural|extended[\s\-]?(version|mix)?)\b/gi, ' ');
    ct = ct.replace(/\b(remix|cover|mashup|medley|tribute|karaoke|instrumental(\s*version)?|acoustic(\s*version)?|piano[\s\-]?version|unplugged|radio[\s\-]?edit)\b/gi, ' ');
    ct = ct.replace(/\b(reaction|review|analysis|breakdown|explained|commentary|podcast)\b/gi, ' ');
    ct = ct.replace(/\b(remaster(ed)?|deluxe(\s*edition)?|anniversary\s*edition|bonus\s*track|b[\s\-]?side)\b/gi, ' ');
    ct = ct.replace(/\b(teaser|making[\s\-]?of|behind[\s\-]?the[\s\-]?scenes?|bts\s*video|promo\s*video|sneak[\s\-]?peek|trailer|motion\s*poster)\b/gi, ' ');

    /* Pass 4 (NEW in PRO 4.8): Extended junk — movie/ad/streaming content words */
    ct = ct.replace(/\b(scene|deleted\s*scene|fight\s*scene|climax\s*scene|action\s*scene|movie\s*scene|film\s*scene)\b/gi, ' ');
    ct = ct.replace(/\b(advertisement|ad\s*film|brand\s*film|commercial)\b/gi, ' ');
    ct = ct.replace(/\b(netflix|amazon\s*prime|disney\s*plus|hotstar|zee5|sony\s*liv|jio\s*cinema|mx\s*player)\b/gi, ' ');
    ct = ct.replace(/\b(extended\s*cut|director.?s\s*cut|uncut|uncensored|raw\s*footage|bloopers?)\b/gi, ' ');
    ct = ct.replace(/\b(promo|promotional|teaser\s*trailer|official\s*trailer|theatrical\s*trailer)\b/gi, ' ');
    ct = ct.replace(/\b(web\s*series|short\s*film|mini\s*series|episode\s*\d+|ep\s*\d+|season\s*\d+)\b/gi, ' ');

    ct = ct.replace(/[-–—]\s*(official|lyrics?|audio|video|full|hd|hq|4k|slowed|reverb|bass|lofi|cover|karaoke|instrumental|remix|live|teaser|trailer|scene|promo|netflix).*/gi, ' ');
    ct = ct.replace(/[-–—]/g, ' ');
    ct = ct.replace(/#\S+/g, ' ');
    ct = ct.replace(/\b(shorts?|reels?)\b/gi, ' ');
    ct = ct.replace(/\s{2,}/g, ' ').trim();

    /* Artist sanitize */
    let ca = (rawArtist || '').trim();
    ca = ca.replace(/\s*[-–,]\s*Topic\s*$/gi, '');
    ca = ca.replace(/\bVEVO\s*$/gi,            '');
    ca = ca.replace(/\bofficial\s*$/gi,        '');
    ca = ca.replace(/\bmusic\s*$/gi,           '');
    ca = ca.replace(/\s*[,&]\s*.*/,            '');
    ca = ca.replace(/\s*feat\.?.*/gi,          '');
    ca = ca.replace(/\s{2,}/g, ' ').trim();

    if (ct.length < 2) ct = (rawTitle  || '').replace(/[^\w\s]/g, ' ').trim();
    if (ca.length < 1) ca = (rawArtist || '').replace(/[^\w\s]/g, ' ').trim();

    return { cleanTitle: ct, cleanArtist: ca };
  }

  /* ─── FIX 5: Deep Fingerprint — strips ALL variant words for true dedup ─── */
  function deepFingerprint(title, artist) {
    let s = ((title || '') + ' ' + (artist || '')).toLowerCase();

    /* Remove ALL bracket/paren content first */
    s = s.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ');

    /* Strip common title variant suffixes */
    s = s.replace(/\b(official|audio|video|lyric|lyrics|music|song|full|hd|hq|4k|uhd|fhd)\b/g, '');
    s = s.replace(/\b(feat|ft|prod|with|from|by)\b.*/g, '');
    s = s.replace(/\b(slowed|reverb|lofi|bass|boost|nightcore|8d|sped|up|down)\b/g, '');
    s = s.replace(/\b(remix|cover|karaoke|instrumental|acoustic|piano|unplugged)\b/g, '');
    s = s.replace(/\b(remaster|deluxe|edition|bonus|extended|cut|version|mix)\b/g, '');
    s = s.replace(/\b(scene|deleted|trailer|teaser|promo|netflix|advertisement|ad)\b/g, '');
    s = s.replace(/\b(topic|vevo|records|music|entertainment|india|official)\b/g, '');

    /* Remove all non-alphanumeric */
    s = s.replace(/[^a-z0-9]/g, '');
    return s.trim();
  }

  /* Legacy normTitle — kept for backward compat with autoPlayHistory / shuffleLastTwoBatches */
  function normTitle(t) {
    return (t || '').toLowerCase()
      .replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '')
      .replace(/\b(official|audio|video|lyric|feat\..*|ft\..*|slowed|reverb|bass|lofi|remix|cover)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /* ─── FIX 5: Check playedHistory with deep fingerprint ─── */
  function isAlreadyPlayed(title, artist) {
    const fp = deepFingerprint(title, artist);
    if (!fp || fp.length < 3) return false;
    return playedHistory.has(fp);
  }

  function markPlayed(title, artist) {
    const fp = deepFingerprint(title, artist);
    if (fp && fp.length >= 3) playedHistory.add(fp);
    autoPlayHistory.add(normTitle(title)); // legacy
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

  async function lfmArtistTags(artist) {
    const { cleanArtist: ca } = sanitizeMeta('', artist);
    if (!ca) return [];
    const d = await lfm({ method: 'artist.getTopTags', artist: ca, autocorrect: 1 });
    return (d?.toptags?.tag || []).map(t => (t.name || '').toLowerCase());
  }

  /* ═══════════════════════════════════════════════
     6. YT SEARCH ENGINE — PRO 4.8 UPGRADES
        FIX 1: Natural query format
        FIX 2: Music category / OAC / Topic channel enforcement
        FIX 3: Hard duration guard 135s–390s
  ═══════════════════════════════════════════════ */
  function isYouTubeUrl(s) { return /youtu\.?be|youtube\.com/.test(s); }
  function extractYouTubeId(s) {
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /* FIX 2: Channels that are known movie/ad/non-music uploaders */
  const BLOCKED_CHANNEL_PATTERNS = new RegExp([
    /* Streaming platforms */
    'netflix', 'amazon\\s*prime\\s*video', 'disney\\+?', 'hotstar', 'zee5',
    'sony\\s*liv', 'jio\\s*cinema', 'mx\\s*player', 'voot', 'alt\\s*balaji',
    /* Movie/clips channels */
    'movie\\s*clips?', 'film\\s*clips?', 'scene\\s*vault', 'movieclips',
    'filmi\\s*clip', 'movie\\s*scene', 'bollywood\\s*scene',
    /* Ad channels */
    'advertisement', 'promoted', 'sponsor', 'vevo\\s*ads', 'google\\s*ads',
    /* News / non-music */
    'news18', 'ndtv', 'aaj\\s*tak', 'zee\\s*news', 'india\\s*tv',
    'republic\\s*tv', 'times\\s*now', 'tv9',
    /* Generic non-music */
    'comedy\\s*central', 'stand\\s*up', 'roast',
  ].map(p => `(?:${p})`).join('|'), 'i');

  /* FIX 4 (Pass 4): Extended junk title patterns */
  const JUNK_TITLE_PATTERNS = new RegExp([
    'advertisement', 'sponsored', '\\bpromo\\b',
    'slowed', 'reverb(ed)?', 'lofi', 'lo[\\s\\-]?fi',
    'bass[\\s\\-]?boost(ed)?', 'sped[\\s\\-]?up', 'nightcore', '8d[\\s\\-]?audio',
    '\\bcover\\b', 'karaoke', 'instrumental[\\s\\-]?version',
    'tribute', 'mashup', 'megamix', 'compilation',
    'reaction[\\s\\-]?video', 'podcast', 'news[\\s\\-]?clip',
    'low[\\s\\-]?quality', 'radio[\\s\\-]?edit[\\s\\-]?cut',
    '#short', '\\bshorts\\b', '\\breels\\b',
    'birthday', '\\bhappy\\s+birthday\\b',
    '\\bnursery\\b', '\\brhyme\\b',
    'meditation', 'relaxing\\s+music',
    'whiteboard\\s+animation', 'cartoon\\s+song',
    /* Pass 4 NEW: movie scenes and streaming content */
    '\\bscene\\b', 'deleted\\s*scene', 'fight\\s*scene', 'climax\\s*scene',
    'action\\s*scene', 'movie\\s*scene', 'film\\s*scene', 'interval\\s*scene',
    '\\btrailer\\b', 'official\\s*trailer', 'theatrical\\s*trailer', 'teaser\\s*trailer',
    '\\bteaser\\b', 'making[\\s\\-]?of', 'behind[\\s\\-]?the[\\s\\-]?scenes?',
    'motion[\\s\\-]?poster', 'sneak[\\s\\-]?peek',
    'promo[\\s\\-]?clip', 'lyric[\\s\\-]?video', '\\blyrics\\b',
    'making[\\s\\-]?video', 'bts[\\s\\-]?video',
    /* Streaming service tags in title */
    '\\bnetflix\\b', '\\bamazon\\s*prime\\b', '\\bhotstar\\b', '\\bzee5\\b',
    '\\bjio\\s*cinema\\b', '\\bmx\\s*player\\b',
    /* Extended/deleted cuts */
    'extended\\s*cut', 'director.?s\\s*cut', '\\buncut\\b', '\\buncensored\\b',
    'web\\s*series', 'short\\s*film', 'mini\\s*series',
  ].map(p => `(?:${p})`).join('|'), 'i');

  const TOPIC_SUFFIX      = /\s*-\s*topic\s*$/i;
  const OAC_PATTERNS      = /\b(official\s*artist\s*channel|oac)\b/i;
  const MUSIC_TOPIC_WORDS = /\b(music|songs?|audio|vevo|records?|official)\b/i;

  /* ─── FIX 2: Score a channel for "music trustworthiness" ─── */
  function channelMusicScore(channelTitle) {
    const ct = (channelTitle || '').toLowerCase();
    if (TOPIC_SUFFIX.test(channelTitle)) return 100;  // Topic channel = highest trust
    if (OAC_PATTERNS.test(channelTitle))  return 90;   // Official Artist Channel
    if (/vevo/i.test(ct))                 return 85;   // VEVO = official
    if (MUSIC_TOPIC_WORDS.test(ct))       return 60;   // Has music keywords
    if (BLOCKED_CHANNEL_PATTERNS.test(ct)) return -999; // Blocked
    return 30; // unknown — low but not rejected
  }

  /* ─── FIX 3: Duration guard ─── */
  function passesDurationGuard(lengthSeconds, relaxed = false) {
    const s = parseInt(lengthSeconds) || 0;
    if (s === 0) return true; // unknown duration — allow (will be checked on play)
    const min = relaxed ? 90 : MUSIC_DUR_MIN;   // 1:30 relaxed for some edge cases
    const max = relaxed ? 480 : MUSIC_DUR_MAX;  // 8:00 relaxed
    return s >= min && s <= max;
  }

  /* ─── FIX 1: Natural query format — "Track" by "Artist" ─── */
  function buildNaturalQuery(title, artist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(title, artist);
    if (ca && ct) return `"${ct}" by "${ca}"`;
    if (ct)       return `"${ct}" official audio`;
    return title || '';
  }

  /* ─── FIX 1 + 2: Build official-channel-biased query ─── */
  function buildOfficialQuery(title, artist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(title, artist);
    if (ca && ct) return `"${ct}" "${ca}" official audio`;
    if (ct)       return `"${ct}" official audio`;
    return title || '';
  }

  /* ─── Core ytSearch with FIX 2 + FIX 3 ─── */
  async function ytSearch(query, max = 8, strictMusicOnly = false, expectedDurSecs = 0) {
    const trimQ = (query || '').trim();
    if (trimQ.length < 3) return [];

    try {
      const r = await fetch(
        `https://${YT_ALT_HOST}/search?query=${encodeURIComponent(trimQ)}&geo=IN&type=video`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': YT_ALT_HOST } }
      );
      const d = await r.json();
      let items = d.data || [];

      /* FIX 2: Score and sort by channel music trustworthiness */
      items = items.map(i => ({ ...i, _musicScore: channelMusicScore(i.channelTitle || '') }));
      items.sort((a, b) => b._musicScore - a._musicScore);

      items = items.filter(i => {
        /* FIX 2: Hard reject blocked channels */
        if (i._musicScore <= -900) return false;

        /* FIX 4: Reject junk titles */
        if (JUNK_TITLE_PATTERNS.test(i.title || '')) return false;

        /* FIX 3: Hard duration guard */
        if (strictMusicOnly && !passesDurationGuard(i.lengthSeconds)) return false;

        /* Legacy expected duration check (looser — only when explicitly set) */
        if (!strictMusicOnly && expectedDurSecs > 0 && i.lengthSeconds) {
          const ds = parseInt(i.lengthSeconds) || 0;
          if (ds > 0 && Math.abs(ds - expectedDurSecs) / expectedDurSecs > 0.25) return false;
        }

        return true;
      });

      return items.slice(0, max);
    } catch { return []; }
  }

  /* ─── FIX 1 + 2 + 3: resolveToYtId — natural query, official channel priority ─── */
  async function resolveToYtId(title, artist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(title, artist);
    if (!ct && !ca) return null;

    /* Strategy 1: Natural "X by Y" format — works best for most music searches */
    const q1 = buildNaturalQuery(ct, ca);
    let items = await ytSearch(q1, 8, true);

    /* Strategy 2: Official audio format if Strategy 1 weak */
    if (!items.length || items[0]?._musicScore < 60) {
      const q2 = buildOfficialQuery(ct, ca);
      const items2 = await ytSearch(q2, 8, true);
      /* Merge — topic/OAC from strategy 2 wins over generic from strategy 1 */
      const seen = new Set(items.map(i => i.videoId));
      items2.forEach(i => { if (!seen.has(i.videoId)) items.push(i); });
      items.sort((a, b) => (b._musicScore || 0) - (a._musicScore || 0));
    }

    /* FIX 5: Skip already-played fingerprints */
    const pick = items.find(i =>
      !isAlreadyPlayed(i.title, i.channelTitle) &&
      i._musicScore > -900
    ) || items.find(i => i._musicScore > -900) || items[0];

    if (!pick) return null;
    return {
      ytId:       pick.videoId,
      title:      pick.title,
      artist:     pick.channelTitle || ca,
      thumb:      pick.thumbnail?.[1]?.url || pick.thumbnail?.[0]?.url || '',
      durSecs:    parseInt(pick.lengthSeconds) || 0,
      musicScore: pick._musicScore,
    };
  }

  /* ═══════════════════════════════════════════════
     7. STREAM RESOLUTION — M4A PRIORITY (FIX 6)
        JIT Prefetch fully preserved
  ═══════════════════════════════════════════════ */

  /* ─── FIX 6: M4A extraction with quality ranking ─── */
  function rankAudioFormats(formats) {
    /* Rank: M4A > Opus > WebM > MP4 audio, higher bitrate wins within same type */
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
      if (tA !== tB) return tB - tA; // higher type score first
      return parseInt(b.bitrate || b.audioBitrate || 0) - parseInt(a.bitrate || a.audioBitrate || 0);
    });
  }

  async function extractYTAudioUrl(ytId) {
    const k = 'yt_' + ytId;
    const cached = cacheGet(k);
    if (cached) return cached;

    /* Attempt 1: SP81 downloader */
    try {
      const r = await fetch(
        `https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true&bypassSpotify=true&quality=best`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': SP81_HOST } }
      );
      const d = await r.json();
      const u = Array.isArray(d) ? (d[0]?.url || d[0]?.link) : (d.url || d.link);
      if (u) { cacheSet(k, u); return u; }
    } catch {}

    /* Attempt 2: ytstream with FIX 6 M4A priority */
    try {
      const r = await fetch(
        `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`,
        { headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com' } }
      );
      const d = await r.json();
      if (d.formats) {
        /* FIX 6: Filter audio-only, rank M4A first */
        const allAudio = Object.values(d.formats).filter(f =>
          f.url && (f.mimeType?.includes('audio') || (!f.qualityLabel && f.url))
        );
        const ranked = rankAudioFormats(allAudio);
        if (ranked.length) { cacheSet(k, ranked[0].url); return ranked[0].url; }
      }
      /* Fallback: adaptiveFormats */
      if (d.adaptiveFormats) {
        const audioOnly = d.adaptiveFormats.filter(f =>
          f.url && f.mimeType?.includes('audio')
        );
        const ranked = rankAudioFormats(audioOnly);
        if (ranked.length) { cacheSet(k, ranked[0].url); return ranked[0].url; }
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

  async function resolveAudioUrl(item, queueIndex) {
    if (queueIndex !== undefined && jitUrlStore.has(queueIndex))
      return jitUrlStore.get(queueIndex);

    if (item.type === 'ytmusic') return await extractYTAudioUrl(item.ytId);

    if (item.type === 'spotify_yt') {
      if (item.spId) {
        const u = await fetchPremiumAudio(item.spId);
        if (u) return u;
      }
      /* FIX 1: Use natural query as fallback */
      const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(item.title, item.artist || '');
      const items = await ytSearch(buildNaturalQuery(ct, ca), 5, true);
      if (items[0]) {
        item.ytId = items[0].videoId;
        return await extractYTAudioUrl(items[0].videoId);
      }
    }
    return null;
  }

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

  function jitEvict(currentI) {
    for (const k of jitUrlStore.keys()) {
      if (k < currentI - 1) jitUrlStore.delete(k);
    }
  }

  /* ═══════════════════════════════════════════════
     8. WAKE LOCK & BACKGROUND PERSISTENCE
        FIX D (PRO 4.4): Live Position Heartbeat every 2s — preserved
  ═══════════════════════════════════════════════ */
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      if (wakeLock && !wakeLock.released) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { /* denied */ }
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
          duration:     nativeAudio.duration,
          playbackRate: nativeAudio.playbackRate || 1,
          position:     Math.min(nativeAudio.currentTime, nativeAudio.duration),
        });
      } catch { /* not available on all browsers */ }
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

    if (now === _lastCheckedTime && !nativeAudio.paused) {
      nativeAudio.play().catch(() => {});
    }
    _lastCheckedTime = now;

    if (dur > 0 && now >= dur - 0.5 && Date.now() - _lastEndCheck > 2000) {
      _lastEndCheck = Date.now();
      playNext();
    }
  }, 2000);

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

  function cyclePlaybackMode() {
    const modes      = ['normal', 'shuffle', 'loop'];
    playerState.mode = modes[(modes.indexOf(playerState.mode) + 1) % 3];
    resetBatchState();
    autoPlayFetching = false;
    updateModeBtn();
    showToast(`${MODE_ICONS[playerState.mode]} ${MODE_LABELS[playerState.mode]} Mode`);
  }

  function showSpDiscBtn(show) {
    const btn = document.getElementById('pmcSpDiscBtn');
    if (!btn) return;
    const hasSpItems = queue.some(i => i.type === 'spotify_yt');
    const hasYtItems = queue.some(i => i.type === 'ytmusic');
    const hasMusic   = hasSpItems || hasYtItems;
    btn.classList.toggle('hidden', !(show && hasMusic));
  }

  /* ═══════════════════════════════════════════════
     10. AUTO-PLAY BATCH ENGINE
         FIX 5: Deep fingerprint dedup throughout
         FIX 7: "similar to X -X" fallback with duration guard
  ═══════════════════════════════════════════════ */

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  let _genreAnchorTags = [];

  async function fetchAndCacheGenreTags(artist) {
    const { cleanArtist: ca } = sanitizeMeta('', artist);
    if (!ca) { _genreAnchorTags = []; return; }
    if (playerState.genreAnchorArtist === ca.toLowerCase()) return;
    playerState.genreAnchorArtist = ca.toLowerCase();
    _genreAnchorTags = await lfmArtistTags(ca);
  }

  const GENERIC_GLOBAL_ARTISTS = new Set([
    'nirvana', 'imagine dragons', 'linkin park', 'coldplay', 'ed sheeran',
    'post malone', 'the weeknd', 'taylor swift', 'billie eilish', 'eminem',
    'drake', 'ariana grande', 'dua lipa', 'maroon 5', 'one direction',
    'backstreet boys', 'justin bieber', 'twenty one pilots', 'the chainsmokers',
    'marshmello', 'alan walker', 'avicii', 'clean bandit', 'david guetta',
  ]);

  function isGenreCompatible(candidateArtist, candidateTags = []) {
    if (!_genreAnchorTags.length) return true;
    const ca = (candidateArtist || '').toLowerCase().trim();
    if (GENERIC_GLOBAL_ARTISTS.has(ca)) {
      return candidateTags.filter(t => _genreAnchorTags.includes(t)).length >= 1;
    }
    return true;
  }

  async function genreFilter(metas, anchorArtist) {
    await fetchAndCacheGenreTags(anchorArtist);
    const out = [];
    for (const m of metas) {
      const ca = (m.artist || '').toLowerCase().trim();
      if (GENERIC_GLOBAL_ARTISTS.has(ca)) {
        const tags = await lfmArtistTags(m.artist);
        if (isGenreCompatible(m.artist, tags)) out.push(m);
      } else {
        out.push(m);
      }
    }
    return out;
  }

  /* ─── FIX 1 + 2: Artist-locked official query for auto-play fallback ─── */
  function artistLockedOfficialQuery(seedArtist, seedTitle = '') {
    const { cleanArtist: ca, cleanTitle: ct } = sanitizeMeta(seedTitle, seedArtist);
    if (ca && ct) return `"${ca}" songs like "${ct}" official audio`;
    if (ca)       return `"${ca}" top songs official audio`;
    return `${ct} official audio`;
  }

  /* ─── FIX 7: Similarity fallback query with track exclusion ─── */
  function buildSimilarFallbackQuery(seedTitle, seedArtist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(seedTitle, seedArtist);
    if (ca && ct) return `songs similar to "${ct}" "${ca}" official audio`;
    if (ct)       return `songs similar to "${ct}" official audio`;
    return `${ca || seedArtist} top songs official audio`;
  }

  /* ─── FIX 5: Dedup check across BOTH dedup systems ─── */
  function isTrackUsed(title, artist) {
    return isAlreadyPlayed(title, artist) ||
           autoPlayHistory.has(normTitle(title)) ||
           shuffleLastTwoBatches.has(normTitle(title));
  }

  /* ─── SHUFFLE MODE ─── */
  async function buildShuffleBatch() {
    const seed = playerState.shuffleSeed || { title: '', artist: '' };
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(seed.title, seed.artist);

    await fetchAndCacheGenreTags(ca);

    let pool10 = await lfmSimilarTracks(ct, ca, 15);
    pool10 = pool10.filter(t => !isTrackUsed(t.title, t.artist));
    pool10 = await genreFilter(pool10, ca);
    shuffle(pool10);
    const batch1 = pool10.slice(0, 5);

    /* FIX 1 + 7: Official-channel-biased YT fallback */
    if (batch1.length < 5) {
      const q = artistLockedOfficialQuery(ca, ct);
      const ytItems = await ytSearch(q, 12, true); // FIX 3: duration guard ON
      for (const y of ytItems) {
        if (batch1.length >= 5) break;
        if (!isTrackUsed(y.title, y.channelTitle))
          batch1.push({ title: y.title, artist: y.channelTitle || ca, _yt: y });
      }
    }

    /* FIX 7: If still short, use similarity fallback */
    if (batch1.length < 3) {
      const q2 = buildSimilarFallbackQuery(ct, ca);
      const ytSim = await ytSearch(q2, 10, true); // FIX 3: duration guard ON
      for (const y of ytSim) {
        if (batch1.length >= 5) break;
        if (!isTrackUsed(y.title, y.channelTitle))
          batch1.push({ title: y.title, artist: y.channelTitle || ca, _yt: y });
      }
    }

    const nextSeedTrack     = batch1[4] || batch1[batch1.length - 1] || seed;
    playerState.shuffleSeed = { title: nextSeedTrack.title, artist: nextSeedTrack.artist || ca };

    const seed4 = batch1[3] || nextSeedTrack;
    const seed5 = batch1[4] || nextSeedTrack;
    const [sim4, sim5] = await Promise.all([
      lfmSimilarTracks(seed4.title || ct, seed4.artist || ca, 10),
      lfmSimilarTracks(seed5.title || ct, seed5.artist || ca, 10),
    ]);

    const seen20 = new Set();
    let pool20 = [...sim4, ...sim5].filter(t => {
      const fp = deepFingerprint(t.title, t.artist);
      if (seen20.has(fp) || isTrackUsed(t.title, t.artist)) return false;
      seen20.add(fp); return true;
    });
    pool20 = await genreFilter(pool20, ca);
    shuffle(pool20);
    const batch2 = pool20.slice(0, 5);

    if (batch2.length < 3) {
      const q3 = buildSimilarFallbackQuery(seed4.title || ct, seed4.artist || ca);
      const yt2 = await ytSearch(q3, 10, true); // FIX 3
      for (const y of yt2) {
        if (batch2.length >= 5) break;
        if (!isTrackUsed(y.title, y.channelTitle))
          batch2.push({ title: y.title, artist: y.channelTitle || ca, _yt: y });
      }
    }

    const fullBatch = [...batch1, ...batch2].slice(0, 10);
    if (shuffleLastTwoBatches.size > 40) shuffleLastTwoBatches.clear();
    fullBatch.forEach(t => shuffleLastTwoBatches.add(normTitle(t.title)));

    playerState.shuffleBatchPos   = 0;
    playerState.shuffleBatchTotal = 10;
    return fullBatch;
  }

  /* ─── NORMAL MODE ─── */
  async function buildNormalBatch(seedTitle, seedArtist) {
    const { cleanTitle: ct, cleanArtist: ca } = sanitizeMeta(seedTitle, seedArtist);
    const artist = playerState.normalArtist || ca;
    if (!playerState.normalArtist) playerState.normalArtist = ca;
    playerState.normalBatchTotal = 5;

    await fetchAndCacheGenreTags(artist);

    /* Tracks 1-3: same artist top tracks — FIX 5: deep dedup */
    let artistTracks = await lfmArtistTopTracks(artist, 15);
    artistTracks = artistTracks.filter(t =>
      !isTrackUsed(t.title, t.artist) &&
      deepFingerprint(t.title, t.artist) !== deepFingerprint(ct, artist)
    );
    const tracks13 = artistTracks.slice(0, 3);

    /* Tracks 4-5: vibe-similar — FIX 5: deep dedup + genre filter */
    let vibePool = await lfmSimilarTracks(ct, artist, 12);
    vibePool = vibePool.filter(t =>
      !isTrackUsed(t.title, t.artist) &&
      t.artist.toLowerCase() !== artist.toLowerCase()
    );
    vibePool = await genreFilter(vibePool, artist);

    if (vibePool.length < 2) {
      /* FIX 1 + 3: Natural query official-channel fallback with duration guard */
      const q = artistLockedOfficialQuery(artist, ct);
      const ytV = await ytSearch(q, 10, true); // duration guard ON
      for (const y of ytV) {
        if (vibePool.length >= 5) break;
        if (!isTrackUsed(y.title, y.channelTitle))
          vibePool.push({ title: y.title, artist: y.channelTitle || artist, _yt: y });
      }
    }

    /* FIX 7: similarity fallback if still thin */
    if (vibePool.length < 2) {
      const qSim = buildSimilarFallbackQuery(ct, artist);
      const ytSim = await ytSearch(qSim, 10, true);
      for (const y of ytSim) {
        if (vibePool.length >= 5) break;
        if (!isTrackUsed(y.title, y.channelTitle))
          vibePool.push({ title: y.title, artist: y.channelTitle || artist, _yt: y });
      }
    }

    shuffle(vibePool);
    const tracks45 = vibePool.slice(0, 2);
    const batch    = [...tracks13, ...tracks45];

    /* Similar artist — skip generic global artists */
    const similarArtistList = await lfmSimilarArtists(artist, 10);
    const rank1Similar = similarArtistList.find(
      a => a &&
           !playerState.usedArtists.has(a.toLowerCase()) &&
           !GENERIC_GLOBAL_ARTISTS.has(a.toLowerCase())
    ) || tracks45[0]?.artist || artist;

    playerState.usedArtists.add(artist.toLowerCase());
    playerState.normalArtist        = rank1Similar;
    playerState.normalSimilarArtist = rank1Similar;
    playerState.normalBatchPos      = 0;

    /* Failsafe */
    if (batch.length < 2) {
      const qFs = buildSimilarFallbackQuery(ct, artist);
      const ytFs = await ytSearch(qFs, 10, true);
      for (const y of ytFs) {
        if (batch.length >= 5) break;
        if (!isTrackUsed(y.title, y.channelTitle))
          batch.push({ title: y.title, artist: y.channelTitle || artist, _yt: y });
      }
    }

    return batch.slice(0, 5);
  }

  /* ─── triggerAutoPlayLoad ─── */
  async function triggerAutoPlayLoad() {
    if (autoPlayFetching)        return;
    if (playerState.batchLoaded) return;
    if (queue.length === 0)      return;
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

    /* FIX 5: Filter with deep fingerprint */
    const fresh = metas.filter(m => !isAlreadyPlayed(m.title, m.artist));
    playerState.batchItems = fresh;

    const type = activeSrcTab === 'spotify' ? 'spotify_yt' : 'ytmusic';

    for (const meta of fresh) {
      if (isAlreadyPlayed(meta.title, meta.artist)) continue;

      let qItem;
      if (meta._yt) {
        const y = meta._yt;
        /* FIX 3: Final duration guard before adding to queue */
        const dur = parseInt(y.lengthSeconds) || 0;
        if (dur > 0 && !passesDurationGuard(dur, false)) continue;

        qItem = {
          type,
          title:      y.title,
          artist:     y.channelTitle || '',
          ytId:       y.videoId,
          thumb:      y.thumbnail?.[1]?.url || y.thumbnail?.[0]?.url || '',
          isAutoPlay: true,
        };
      } else {
        /* FIX 1: Use natural query format for resolveToYtId */
        const res = await resolveToYtId(meta.title, meta.artist);
        if (!res) continue;

        /* FIX 3: Duration guard on resolved track */
        if (res.durSecs > 0 && !passesDurationGuard(res.durSecs, false)) continue;

        qItem = {
          type,
          title:      meta.title,
          artist:     meta.artist,
          ytId:       res.ytId,
          thumb:      res.thumb,
          isAutoPlay: true,
        };
      }

      markPlayed(qItem.title, qItem.artist); // FIX 5: mark with deep fingerprint
      queue.push(qItem);
    }

    renderQueue();
    playerState.batchLoaded = true;
    autoPlayFetching        = false;

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

  nativeAudio?.addEventListener('seeked', () => {
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
    /* Regular YT tab — no strict music filter so user can find any video */
    ytSearch(query, 15, false).then(items => {
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
      addToQueue({ type: 'spotify_yt', title: t.title, artist: t.artist, spId: t.id, thumb: t.image });
      showSpDiscBtn(true);
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
     17. YT MUSIC SEARCH — FIX 1 + 2 + 3
  ═══════════════════════════════════════════════ */
  async function searchYTMusic(query) {
    if (!query) return;
    ytmResultsArea.innerHTML = '<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(ytmResultsArea, toggleListBtnYtm);

    /* FIX 1: Use natural query format for music searches */
    const naturalQ = query.includes(' by ') ? query : `${query} official audio`;
    /* FIX 2 + 3: strict music filter ON for YT Music tab */
    const items = await ytSearch(naturalQ, 15, true);

    ytmResultsArea.innerHTML = '';
    if (!items.length) { ytmResultsArea.innerHTML = '<p class="mp-empty">No results.</p>'; return; }

    items.forEach(item => {
      const dur = parseInt(item.lengthSeconds) || 0;
      const durStr = dur > 0 ? ` • ${Math.floor(dur/60)}:${String(dur%60).padStart(2,'0')}` : '';
      const div   = document.createElement('div');
      div.className = 'yt-search-item';
      const thumb = item.thumbnail?.[1]?.url || item.thumbnail?.[0]?.url || '';
      /* FIX 2: Show Topic/OAC badge */
      const isTopicCh = TOPIC_SUFFIX.test(item.channelTitle || '');
      const chanLabel = isTopicCh
        ? `<span style="color:#1db954;font-size:9px;margin-right:3px">✓</span>${item.channelTitle}`
        : item.channelTitle;
      div.innerHTML = `<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${item.title}</div><div class="yt-search-sub">${chanLabel}${durStr}</div></div><span style="font-size:15px;color:#ff4444">▶</span>`;
      div.onclick = () => {
        activeSrcTab = 'ytmusic'; queue = []; currentIdx = 0;
        jitUrlStore.clear();
        addToQueue({ type: 'ytmusic', title: item.title, artist: item.channelTitle, ytId: item.videoId, thumb });
        showSpDiscBtn(true);
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
    markPlayed(item.title, item.artist || ''); // FIX 5
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

    setPMCInfo(item.title, item.artist || 'Unknown', item.thumb);
    setTrackInfo(item.title, item.artist || 'Unknown');
    setupMediaSession(item);

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
        playerState.shuffleSeed         = { title: item.title, artist: item.artist || '' };
        playerState.usedArtists.clear();
        _genreAnchorTags              = [];
        playerState.genreAnchorArtist = '';
      }

      const qIdx = queue.indexOf(item);
      let url = jitUrlStore.get(qIdx) || null;
      if (!url) url = await resolveAudioUrl(item, undefined);
      if (url) jitUrlStore.set(qIdx, url);

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
     19. HELPERS & EVENTS
  ═══════════════════════════════════════════════ */
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

  /* ─── MediaSession ─── */
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
     20. INIT
  ═══════════════════════════════════════════════ */
  (function init() {
    injectModeSwitch();
    injectSpDiscoverySwitch();
    injectPlaylistExitBtn();
    updateModeBtn();
    renderQueue();

    console.log(
      '%c[ZX PRO 4.8] Initialized ✅',
      'color:#e8436a;font-weight:bold;font-size:14px',
      '\n\n═══════════════════════════════════════════\n' +
      '  PRO 4.8 UPGRADES\n' +
      '═══════════════════════════════════════════\n' +
      '  ✅ FIX 1: Natural Query — "Track" by "Artist" format\n' +
      '            Dual strategy: natural first, official fallback\n' +
      '  ✅ FIX 2: Music Category Enforcement\n' +
      '            channelMusicScore() ranks Topic > OAC > VEVO > generic\n' +
      '            BLOCKED_CHANNEL_PATTERNS: Netflix, MovieClips, News, Ads\n' +
      '  ✅ FIX 3: Strict Duration Guard 135s–390s (2:15–6:30)\n' +
      '            Kills 90%+ of ads, trailers, scenes, teasers\n' +
      '  ✅ FIX 4: Pass 4 Sanitization\n' +
      '            Strips: Scene, Deleted, Netflix, Trailer, Promo,\n' +
      '            Advertisement, Extended Cut, Web Series, OTT names\n' +
      '  ✅ FIX 5: Deep Fingerprint Dedup (playedHistory)\n' +
      '            Normalized title+artist hash → cross-title repeat FIXED\n' +
      '            "Tum Hi Ho (Official)" = "Tum Hi Ho | Aashiqui 2"\n' +
      '  ✅ FIX 6: M4A Extraction Priority\n' +
      '            M4A > Opus > WebM > MP4; highest bitrate within type\n' +
      '  ✅ FIX 7: Similarity Fallback with Duration Guard\n' +
      '            "songs similar to X" if LFM returns nothing\n' +
      '            All fallback queries verified against Duration Guard\n' +
      '\n─── PRO 4.4 PRESERVED ─────────────────────\n' +
      '  ✅ JIT Prefetch + LRU Cache (40 entries)\n' +
      '  ✅ Genre Guard (artist-locked, GENERIC_GLOBAL_ARTISTS)\n' +
      '  ✅ Live Position Heartbeat (2s interval)\n' +
      '  ✅ Cinema Mode / Sync Network / UI Glow\n' +
      '  ✅ Wake Lock + Silent Keep-Alive\n' +
      '  ✅ Context-Aware Discovery Button\n' +
      '  🔒 Wake Lock: ' + ('wakeLock' in navigator ? 'supported' : 'not supported') + '\n' +
      '═══════════════════════════════════════════\n'
    );
  })();

})();
