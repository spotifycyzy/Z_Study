/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js  PRO 4.0
   ✅ Last.fm Dynamic Engine (Shuffle / Normal / Loop modes)
   ✅ Metadata Sanitization
   ✅ Zero-Delay Stream Cache (2-3 track ahead prefetch)
   ✅ YT URL Direct Bypass
   ✅ Playlist Exit Button (symmetrical left side of strip)
   ✅ Single Mode Switch on PMC (bottom-left, neon SVG)
   ✅ Spotify Mode Switch on PMC (top-right, Spotify-only)
   ✅ Last.fm failsafe → YouTube search
   ✅ Sync Engine 100% preserved
   ✅ Cinema Mode, Cloud Audio, all features intact
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
  const spSearchSongBtn = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const spResultsArea   = document.getElementById('spSearchResults');
  const queueList       = document.getElementById('queueList');
  const toggleListBtnUrl  = document.getElementById('toggleListBtnUrl');
  const episodesOverlayUrl= document.getElementById('episodesOverlayUrl');
  const toggleListBtnYt   = document.getElementById('toggleListBtnYt');
  const episodesOverlayYt = document.getElementById('episodesOverlayYt');
  const ytSearchResultsEl = document.getElementById('ytSearchResults');
  const toggleListBtnYtm  = document.getElementById('toggleListBtnYtm');
  const toggleListBtnSp   = document.getElementById('toggleListBtnSp');
  const mpSyncBadge       = document.getElementById('mpSyncBadge');
  const mpSyncToggleBtn   = document.getElementById('mpSyncToggleBtn');
  const autoPlayToggleBtn = document.getElementById('autoPlayToggle');

  nativeAudio.setAttribute('playsinline','');
  nativeAudio.setAttribute('webkit-playsinline','');

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
  let playbackMode     = 'normal';   // 'normal' | 'shuffle' | 'loop'
  let spDiscoveryMode  = 'repeat';   // 'repeat' | 'discovery'
  let batchCount       = 0;
  let batchSimilarArtist = '';
  let inSpotifyPlaylist  = false;
  let spotifyPlaylistEnded = false;

  /* Zero-delay stream cache: key → url */
  const streamCache    = new Map();
  const autoPlayHistory= new Set();

  /* ═══ 4. METADATA SANITIZATION ═══ */
  function sanitizeMeta(rawTitle, rawArtist) {
    let ct = (rawTitle || '')
      .replace(/\[.*?\]/g,'').replace(/\(.*?\)/g,'')
      .replace(/official\s*(video|audio|music\s*video|lyric\s*video|mv)?/gi,' ')
      .replace(/\b(lyrics?|4k|hd|hq|full\s*song|full\s*version|feat\.?.*|ft\.?.*|prod\.?.*)\b/gi,' ')
      .replace(/\|\s*.*/g,'').replace(/[-–—]\s*(official|lyrics?|audio|video|full).*/gi,'')
      .replace(/\s{2,}/g,' ').replace(/[-–|]/g,' ').trim();
    let ca = (rawArtist || '')
      .replace(/\s*-\s*topic\s*$/gi,'').replace(/VEVO\s*$/gi,'').trim();
    return { cleanTitle: ct, cleanArtist: ca };
  }

  function normTitle(t) {
    return (t||'').toLowerCase()
      .replace(/\(.*?\)/g,'').replace(/\[.*?\]/g,'')
      .replace(/official|audio|video|lyric|feat\..*|ft\..*/g,'')
      .replace(/[^a-z0-9]/g,'').trim();
  }

  /* ═══ 5. LAST.FM API ═══ */
  async function lfm(params) {
    const u = new URL(LFM_BASE);
    Object.entries({...params, api_key: LFM_KEY, format:'json'})
      .forEach(([k,v]) => u.searchParams.set(k,v));
    try { const r = await fetch(u.toString()); return await r.json(); }
    catch { return {}; }
  }

  async function lfmSimilarTracks(title, artist, limit=10) {
    const {cleanTitle:ct, cleanArtist:ca} = sanitizeMeta(title, artist);
    const d = await lfm({method:'track.getSimilar', track:ct, artist:ca, limit, autocorrect:1});
    return (d?.similartracks?.track||[]).map(t=>({title:t.name, artist:t.artist.name}));
  }

  async function lfmSimilarArtists(artist, limit=5) {
    const {cleanArtist:ca} = sanitizeMeta('', artist);
    const d = await lfm({method:'artist.getSimilar', artist:ca, limit, autocorrect:1});
    return (d?.similarartists?.artist||[]).map(a=>a.name);
  }

  async function lfmArtistTopTracks(artist, limit=5) {
    const {cleanArtist:ca} = sanitizeMeta('', artist);
    const d = await lfm({method:'artist.getTopTracks', artist:ca, limit, autocorrect:1});
    return (d?.toptracks?.track||[]).map(t=>({title:t.name, artist:t.artist?.name||artist}));
  }

  /* ═══ 6. YT SEARCH UTILS ═══ */
  function isYouTubeUrl(s) { return /youtu\.?be|youtube\.com/.test(s); }
  function extractYouTubeId(s) {
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  async function ytSearch(query, max=8) {
    try {
      const r = await fetch(
        `https://${YT_ALT_HOST}/search?query=${encodeURIComponent(query)}&geo=IN&type=video`,
        {headers:{'x-rapidapi-key':RAPID_API_KEY,'x-rapidapi-host':YT_ALT_HOST}}
      );
      const d = await r.json();
      return (d.data||[]).filter(i=>{
        const t=(i.title||'').toLowerCase();
        return !t.includes('#short')&&!t.includes('shorts')&&!t.includes('reels');
      });
    } catch { return []; }
  }

  async function resolveToYtId(title, artist) {
    const {cleanTitle:ct, cleanArtist:ca} = sanitizeMeta(title, artist);
    const q = ca ? `${ct} ${ca} official audio` : `${ct} official audio`;
    const items = await ytSearch(q, 5);
    const pick = items.find(i=>!autoPlayHistory.has(normTitle(i.title))) || items[0];
    if (!pick) return null;
    return {ytId:pick.videoId, title:pick.title, thumb:pick.thumbnail?.[1]?.url||pick.thumbnail?.[0]?.url||''};
  }

  /* ═══ 7. STREAM CACHE / AUDIO EXTRACTION ═══ */
  async function extractYTAudioUrl(ytId) {
    const k = 'yt_'+ytId;
    if (streamCache.has(k)) return streamCache.get(k);
    try {
      const r = await fetch(`https://${SP81_HOST}/download_track?q=${ytId}&onlyLinks=true&bypassSpotify=true&quality=best`,
        {headers:{'x-rapidapi-key':RAPID_API_KEY,'x-rapidapi-host':SP81_HOST}});
      const d = await r.json();
      const u = Array.isArray(d)?(d[0]?.url||d[0]?.link):(d.url||d.link);
      if (u){streamCache.set(k,u);return u;}
    } catch {}
    try {
      const r = await fetch(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${ytId}`,
        {headers:{'x-rapidapi-key':RAPID_API_KEY,'x-rapidapi-host':'ytstream-download-youtube-videos.p.rapidapi.com'}});
      const d = await r.json();
      if (d.formats) {
        const af = Object.values(d.formats).filter(f=>f.url&&f.mimeType?.includes('audio'));
        if (af.length){streamCache.set(k,af[0].url);return af[0].url;}
      }
    } catch {}
    return null;
  }

  async function fetchPremiumAudio(spId) {
    const k = 'sp_'+spId;
    if (streamCache.has(k)) return streamCache.get(k);
    try {
      const r = await fetch(`https://${SP81_HOST}/download_track?q=${spId}&onlyLinks=true&quality=best`,
        {headers:{'x-rapidapi-key':RAPID_API_KEY,'x-rapidapi-host':SP81_HOST}});
      const d = await r.json();
      const u = Array.isArray(d)?(d[0]?.url||d[0]?.link):(d.url||d.link||d.downloadUrl);
      if (u){streamCache.set(k,u);return u;}
    } catch {}
    return null;
  }

  async function resolveAudioUrl(item) {
    if (item.prefetchedUrl) return item.prefetchedUrl;
    if (item.type==='ytmusic') return await extractYTAudioUrl(item.ytId);
    if (item.type==='spotify_yt') {
      if (item.spId){const u=await fetchPremiumAudio(item.spId);if(u)return u;}
      const items = await ytSearch(item.title+' '+(item.artist||'')+' official audio',5);
      if (items[0]){item.ytId=items[0].videoId;return await extractYTAudioUrl(items[0].videoId);}
    }
    return null;
  }

  /* Prefetch next 2-3 tracks while current plays */
  async function prefetchAhead() {
    const toFetch = queue.slice(currentIdx+1, currentIdx+4)
      .filter(it=>!it.prefetchedUrl&&!['youtube','stream'].includes(it.type));
    for (const item of toFetch) {
      const url = await resolveAudioUrl(item);
      if (url) item.prefetchedUrl = url;
    }
  }

  /* ═══ 8. PLAYBACK MODE ENGINE ═══ */
  const MODE_ICONS = {normal:'➡️', shuffle:'🔀', loop:'🔂'};
  const MODE_LABELS= {normal:'Normal', shuffle:'Shuffle', loop:'Loop'};

  /* SVG neon icons for mode button */
  function modeIconSvg(mode) {
    if (mode==='shuffle') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>`;
    if (mode==='loop')    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
    /* normal = right arrow */
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
  }

  function injectModeSwitch() {
    if (document.getElementById('pmcModeBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'pmcModeBtn';
    btn.className = 'pmc-mode-btn pmc-mode-normal';
    btn.title = 'Playback Mode (Normal → Shuffle → Loop)';
    btn.innerHTML = `<span class="pmc-mode-icon">${modeIconSvg('normal')}</span>`;
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
      spDiscoveryMode = spDiscoveryMode==='repeat'?'discovery':'repeat';
      btn.querySelector('.pmc-sp-disc-icon').textContent = spDiscoveryMode==='repeat'?'🔁':'✨';
      btn.classList.toggle('disc-active', spDiscoveryMode==='discovery');
      showToast(spDiscoveryMode==='discovery'?'✨ Auto-Discovery ON':'🔁 Repeat Playlist');
    });
    premiumMusicCard?.appendChild(btn);
  }

  function updateModeBtn() {
    const btn = document.getElementById('pmcModeBtn');
    if (!btn) return;
    btn.className = `pmc-mode-btn pmc-mode-${playbackMode}`;
    btn.querySelector('.pmc-mode-icon').innerHTML = modeIconSvg(playbackMode);
    btn.title = `Mode: ${MODE_LABELS[playbackMode]}`;
  }

  function cyclePlaybackMode() {
    const modes=['normal','shuffle','loop'];
    playbackMode = modes[(modes.indexOf(playbackMode)+1)%3];
    batchCount = 0;
    updateModeBtn();
    showToast(`${MODE_ICONS[playbackMode]} ${MODE_LABELS[playbackMode]} Mode`);
  }

  function showSpDiscBtn(show) {
    const btn = document.getElementById('pmcSpDiscBtn');
    if (btn) btn.classList.toggle('hidden', !show);
  }

  /* ═══ 9. LAST.FM AUTO-PLAY BATCHES ═══ */
  async function buildShuffleBatch(title, artist) {
    const {cleanTitle:ct, cleanArtist:ca} = sanitizeMeta(title, artist);
    let tracks = [];

    /* Songs 1-3: track.getSimilar */
    let sim = await lfmSimilarTracks(ct, ca, 10);
    sim = sim.filter(t=>!autoPlayHistory.has(normTitle(t.title)));
    tracks.push(...sim.slice(0,3));

    /* Songs 4-5: similar artist's top tracks */
    const simArtists = await lfmSimilarArtists(ca, 5);
    const nextArtist = simArtists.find(a=>a.toLowerCase()!==ca.toLowerCase());
    if (nextArtist) {
      batchSimilarArtist = nextArtist;
      let art = await lfmArtistTopTracks(nextArtist, 5);
      art = art.filter(t=>!autoPlayHistory.has(normTitle(t.title)));
      tracks.push(...art.slice(0,2));
    }

    /* Failsafe: fill from YouTube */
    if (tracks.length < 2) {
      const fq = `songs similar to ${ct} by ${ca} -${ct}`;
      const ytItems = await ytSearch(fq, 6);
      for (const y of ytItems) {
        if (tracks.length>=5) break;
        if (!autoPlayHistory.has(normTitle(y.title)))
          tracks.push({title:y.title, artist:y.channelTitle||ca, _yt:y});
      }
    }
    return tracks.slice(0,5);
  }

  async function buildNormalBatch(title, artist) {
    const {cleanTitle:ct, cleanArtist:ca} = sanitizeMeta(title, artist);
    let tracks = [];

    if (batchCount < 5) {
      /* Songs 1-5: same artist */
      let art = await lfmArtistTopTracks(ca, 8);
      art = art.filter(t=>!autoPlayHistory.has(normTitle(t.title))&&normTitle(t.title)!==normTitle(ct));
      tracks = art.slice(0, 5-batchCount);
    } else {
      /* Song 6+: switch to similar artist */
      const simA = await lfmSimilarArtists(ca, 5);
      const next = simA.find(a=>a!==batchSimilarArtist&&a.toLowerCase()!==ca.toLowerCase())||simA[0]||ca;
      batchSimilarArtist = next;
      let art = await lfmArtistTopTracks(next, 7);
      art = art.filter(t=>!autoPlayHistory.has(normTitle(t.title)));
      tracks = art.slice(0,5);
      batchCount = 0;
    }

    /* Failsafe */
    if (tracks.length < 2) {
      const fq = `songs similar to ${ct} by ${ca} -${ct}`;
      const ytItems = await ytSearch(fq, 5);
      for (const y of ytItems) {
        if (tracks.length>=5) break;
        if (!autoPlayHistory.has(normTitle(y.title)))
          tracks.push({title:y.title, artist:y.channelTitle||ca, _yt:y});
      }
    }
    return tracks.slice(0,5);
  }

  async function triggerAutoPlayLoad() {
    if (autoPlayFetching||queue.length===0||playbackMode==='loop') return;
    autoPlayFetching = true;

    const seed = queue[queue.length-1];
    /* Spotify auto-discovery: on playlist end + discovery mode */
    if (activeSrcTab==='spotify'&&spotifyPlaylistEnded&&spDiscoveryMode==='discovery') {
      spotifyPlaylistEnded = false; /* will use shuffle below */
    }

    let metas = playbackMode==='shuffle'
      ? await buildShuffleBatch(seed.title, seed.artist||'')
      : await buildNormalBatch(seed.title, seed.artist||'');

    const type = activeSrcTab==='spotify'?'spotify_yt':'ytmusic';

    for (const meta of metas) {
      const n = normTitle(meta.title);
      if (autoPlayHistory.has(n)) continue;
      autoPlayHistory.add(n);
      batchCount++;

      let qItem;
      if (meta._yt) {
        const y=meta._yt;
        qItem={type, title:y.title, artist:y.channelTitle||'', ytId:y.videoId,
          thumb:y.thumbnail?.[1]?.url||y.thumbnail?.[0]?.url||'', isAutoPlay:true};
      } else {
        const res = await resolveToYtId(meta.title, meta.artist);
        if (!res) continue;
        qItem={type, title:meta.title, artist:meta.artist, ytId:res.ytId, thumb:res.thumb, isAutoPlay:true};
      }
      queue.push(qItem);
    }
    renderQueue();
    prefetchAhead();
    autoPlayFetching=false;
  }

  /* ═══ 10. AUTO-PLAY TOGGLE ═══ */
  if (autoPlayToggleBtn) {
    autoPlayToggleBtn.classList.add('active');
    autoPlayToggleBtn.addEventListener('click',()=>{
      autoPlayEnabled=!autoPlayEnabled;
      autoPlayToggleBtn.classList.toggle('active',autoPlayEnabled);
      showToast(autoPlayEnabled?'∞ Auto-play ON':'⏹ Auto-play OFF');
    });
  }

  /* ═══ 11. PANEL ENGINE ═══ */
  let startY=0, isPanelOpen=false;
  function openPanel(){
    if(isPanelOpen)return; isPanelOpen=true;
    panel.classList.add('zx-open'); document.body.style.overflow='hidden';
    panelToggleBtn?.classList.add('active');
    document.getElementById('chatApp')?.classList.add('player-open');
  }
  function closePanel(){
    if(!isPanelOpen)return; isPanelOpen=false;
    panel.classList.remove('zx-open'); document.body.style.overflow='';
    panelToggleBtn?.classList.remove('active');
    document.getElementById('chatApp')?.classList.remove('player-open');
  }
  handle.addEventListener('touchstart',e=>{startY=e.touches[0].clientY;},{passive:true});
  handle.addEventListener('touchmove',e=>{if(!isPanelOpen&&e.touches[0].clientY-startY>15)openPanel();},{passive:true});
  panelToggleBtn?.addEventListener('click',e=>{e.stopPropagation();isPanelOpen?closePanel():openPanel();});
  handle.addEventListener('click',e=>{if(e.target.closest('.mp-btn,.z-trigger-btn'))return;isPanelOpen?closePanel():openPanel();});

  document.querySelectorAll('.mp-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.mp-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c=>c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-'+tab.dataset.tab)?.classList.add('active');
    });
  });

  function showToast(msg){
    const t=document.createElement('div'); t.textContent=msg;
    t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:9px 16px;border-radius:20px;font-size:12px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards;white-space:nowrap;';
    document.body.appendChild(t); setTimeout(()=>t.remove(),3000);
  }

  /* Toggle buttons */
  function setupToggleBtn(btn,area){
    if(!btn||!area)return;
    btn.classList.toggle('results-open',!area.classList.contains('hidden'));
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const nowH=area.classList.toggle('hidden');
      btn.classList.toggle('results-open',!nowH);
    });
  }
  function showResultsArea(area,btn){
    if(!area)return; area.classList.remove('hidden'); btn?.classList.add('results-open');
  }
  setupToggleBtn(toggleListBtnUrl, episodesOverlayUrl);
  setupToggleBtn(toggleListBtnYt,  episodesOverlayYt);
  setupToggleBtn(toggleListBtnYtm, ytmResultsArea);
  setupToggleBtn(toggleListBtnSp,  spResultsArea);

  /* Playlist Exit Button — inject into spStripRow (left of strip) */
  function injectPlaylistExitBtn(){
    if(document.getElementById('spPlaylistExitBtn'))return;
    const strip=document.getElementById('spStripRow'); if(!strip)return;
    const btn=document.createElement('button');
    btn.id='spPlaylistExitBtn'; btn.className='playlist-exit-btn hidden';
    btn.title='Exit Playlist'; btn.textContent='✕ Exit';
    btn.addEventListener('click',()=>{
      spResultsArea.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">🌐</div><p>Search global music tracks</p></div>';
      queue=[]; currentIdx=0; renderQueue();
      inSpotifyPlaylist=false; spotifyPlaylistEnded=false;
      btn.classList.add('hidden');
      showToast('📋 Playlist cleared');
    });
    strip.insertBefore(btn, strip.firstChild);
  }

  /* ═══ 12. SYNC ENGINE (FULLY PRESERVED) ═══ */
  function setRemoteAction(){ isRemoteAction=true; setTimeout(()=>{isRemoteAction=false;},2000); }

  mpSyncToggleBtn?.addEventListener('click',()=>{
    synced=!synced;
    mpSyncBadge.textContent=synced?'🟢 Synced':'🔴 Solo';
    mpSyncBadge.classList.toggle('synced',synced);
    mpSyncToggleBtn.textContent=synced?'Synced ✓':'Sync 🔗';
    mpSyncToggleBtn.classList.toggle('synced',synced);
    if(synced)broadcastSync({action:'request_sync'});
    showToast(synced?'🔗 Sync Active':'🔌 Sync Off');
  });

  function broadcastSync(data){ window._zxSendSync?.({type:'musicSync',...data}); }

  window._zxReceiveSync=function(data){
    if(!synced)return; setRemoteAction();
    switch(data.action){
      case 'request_sync':
        if(queue.length>0){
          broadcastSync({action:'change_song',item:queue[currentIdx],queueSnapshot:queue});
          setTimeout(()=>{
            const t=(activeType==='youtube'&&ytPlayer&&isYtReady)?ytPlayer.getCurrentTime():nativeAudio.currentTime||0;
            broadcastSync({action:isPlaying?'play':'pause',time:t});
          },1200);
        }
        break;
      case 'change_song':
        if(data.queueSnapshot?.length>0)queue=data.queueSnapshot;
        let idx=queue.findIndex(q=>q.title===data.item?.title);
        if(idx===-1){queue.push(data.item);idx=queue.length-1;}
        currentIdx=idx; renderQueue(); renderMedia(queue[currentIdx]); break;
      case 'play':
        if(activeType==='youtube'&&ytPlayer&&isYtReady){
          if(data.time!=null&&Math.abs(ytPlayer.getCurrentTime()-data.time)>1.5)ytPlayer.seekTo(data.time,true);
          ytPlayer.playVideo();
        } else {
          if(data.time!=null&&Math.abs(nativeAudio.currentTime-data.time)>1.5)nativeAudio.currentTime=data.time;
          nativeAudio.play().catch(()=>{});
        } break;
      case 'pause':
        if(activeType==='youtube'&&ytPlayer&&isYtReady){ytPlayer.pauseVideo();if(data.time!=null)ytPlayer.seekTo(data.time,true);}
        else{nativeAudio.pause();if(data.time!=null)nativeAudio.currentTime=data.time;} break;
      case 'seek':
        if(activeType==='youtube'&&ytPlayer&&isYtReady)ytPlayer.seekTo(data.time,true);
        else if(data.time!=null)nativeAudio.currentTime=data.time; break;
      case 'next': playNext(); break;
      case 'prev':  playPrev(); break;
    }
  };
  nativeAudio.addEventListener('seeked',()=>{if(synced&&!isRemoteAction)broadcastSync({action:'seek',time:nativeAudio.currentTime});});

  /* ═══ 13. YT IFRAME ENGINE ═══ */
  const ytTag=document.createElement('script'); ytTag.src='https://www.youtube.com/iframe_api'; document.head.appendChild(ytTag);

  window.onYouTubeIframeAPIReady=function(){
    ytFrameWrap.innerHTML='<div id="ytPlayerInner"></div>';
    ytPlayer=new YT.Player('ytPlayerInner',{
      width:'100%',height:'100%',
      playerVars:{autoplay:1,controls:1,playsinline:1,rel:0,modestbranding:1},
      events:{onReady:()=>{isYtReady=true;},onStateChange:onPSC}
    });
  };
  function onPSC(ev){
    if(ev.data===YT.PlayerState.PLAYING){isPlaying=true;updatePlayBtn();if(synced&&!isRemoteAction)broadcastSync({action:'play',time:ytPlayer.getCurrentTime()});}
    else if(ev.data===YT.PlayerState.PAUSED){isPlaying=false;updatePlayBtn();if(synced&&!isRemoteAction)broadcastSync({action:'pause',time:ytPlayer.getCurrentTime()});}
    else if(ev.data===YT.PlayerState.ENDED){playNext();}
  }

  /* ═══ 14. YT TAB SEARCH (with URL bypass) ═══ */
  function searchYouTubeDisplay(query){
    if(!query)return;
    /* YT URL Direct Bypass */
    if(isYouTubeUrl(query)){
      const id=extractYouTubeId(query);
      if(id){addToQueue({type:'youtube',title:'YouTube Video',ytId:id,thumb:''});showToast('▶ Loading…');return;}
    }
    if(ytSearchResultsEl)ytSearchResultsEl.innerHTML='<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(episodesOverlayYt,toggleListBtnYt);
    ytSearch(query,15).then(items=>{
      if(!ytSearchResultsEl)return;
      ytSearchResultsEl.innerHTML='';
      if(!items.length){ytSearchResultsEl.innerHTML='<p class="mp-empty">No results.</p>';return;}
      items.forEach(vid=>{
        const thumb=vid.thumbnail?.[1]?.url||vid.thumbnail?.[0]?.url||'';
        const div=document.createElement('div'); div.className='yt-search-item';
        div.innerHTML=`<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${vid.title||''}</div><div class="yt-search-sub">${vid.channelTitle||''}</div></div><span style="font-size:15px;color:#ff4444;flex-shrink:0">▶</span>`;
        div.onclick=()=>{queue=[];currentIdx=0;addToQueue({type:'youtube',title:vid.title||'',ytId:vid.videoId,thumb});showToast('▶ Playing!');};
        ytSearchResultsEl.appendChild(div);
      });
    }).catch(()=>{if(ytSearchResultsEl)ytSearchResultsEl.innerHTML='<p class="mp-empty">Error.</p>';});
  }

  ytAddBtn?.addEventListener('click',()=>{const v=ytInput.value.trim();if(!v)return;searchYouTubeDisplay(v);ytInput.value='';});
  ytInput?.addEventListener('keydown',e=>{if(e.key==='Enter')ytAddBtn.click();});

  /* ═══ 15. SPOTIFY SEARCH ═══ */
  async function searchSpotify(query,playlistsOnly=false){
    if(!query)return;
    spResultsArea.innerHTML='<div class="mp-loading-pulse">Loading…</div>';
    showResultsArea(spResultsArea,toggleListBtnSp);
    try{
      const res=await fetch('https://spotify-web-api3.p.rapidapi.com/v1/social/spotify/searchall',{
        method:'POST',
        headers:{'x-rapidapi-key':RAPID_API_KEY,'x-rapidapi-host':'spotify-web-api3.p.rapidapi.com','Content-Type':'application/json'},
        body:JSON.stringify({terms:query,limit:15})
      });
      const resp=await res.json(); const sd=resp?.data?.searchV2||resp;
      let items=[]; const seen=new Set();
      function addSp(type,data){
        if(!data)return; const id=data.id||data.uri?.split(':').pop();
        if(!id||seen.has(id))return; seen.add(id); items.push({iType:type,data});
      }
      if(!playlistsOnly&&sd?.topResults?.itemsV2)
        sd.topResults.itemsV2.forEach(i=>{const d=i.item?.data;if(d){const t=d.uri?.includes('playlist')?'playlist':d.uri?.includes('album')?'album':'track';addSp(t,d);}});
      if(!playlistsOnly){
        (sd?.tracksV2?.items||[]).forEach(i=>addSp('track',i.item?.data));
        (sd?.albums?.items||[]).forEach(i=>addSp('album',i.data));
      }
      (sd?.playlists?.items||[]).forEach(i=>addSp('playlist',i.data));

      const ql=query.toLowerCase().trim();
      items.sort((a,b)=>{
        const na=(a.data.name||'').toLowerCase(),nb=(b.data.name||'').toLowerCase();
        const aE=na===ql,bE=nb===ql,aC=na.includes(ql),bC=nb.includes(ql),aT=a.iType==='track',bT=b.iType==='track';
        if(aE&&aT&&!(bE&&bT))return -1; if(bE&&bT&&!(aE&&aT))return 1;
        if(aE&&!bE)return -1; if(bE&&!aE)return 1;
        if(aC&&!bC)return -1; if(bC&&!aC)return 1; return 0;
      });

      spResultsArea.innerHTML='';
      if(!items.length){spResultsArea.innerHTML='<p class="mp-empty">No results.</p>';return;}

      items.forEach(obj=>{
        const d=obj.data; const name=d.name||'Unknown', isPL=obj.iType==='playlist', isAL=obj.iType==='album';
        const artist=d.artists?.items?.[0]?.profile?.name||d.ownerV2?.data?.name||'Spotify';
        const thumb=d.albumOfTrack?.coverArt?.sources?.[0]?.url||d.images?.items?.[0]?.sources?.[0]?.url||d.coverArt?.sources?.[0]?.url||'https://i.imgur.com/8Q5FqWj.jpeg';
        const spId=d.id||d.uri?.split(':').pop();
        const isEx=name.toLowerCase()===ql;
        const div=document.createElement('div');
        div.className='yt-search-item sp-list-item'+(isPL||isAL?' sp-folder-item':'');
        const rIcon=(isPL||isAL)?`<span class="sp-folder-btn" title="${isAL?'Album':'Playlist'}">📂</span>`:`<span class="sp-play-btn">▶</span>`;
        const badge=isEx?`<span class="sp-best-badge">★</span>`:'';
        const tTag=isPL?`<span class="sp-playlist-badge">PLAYLIST</span>`:isAL?`<span class="sp-playlist-badge" style="background:rgba(255,160,0,.2);color:#ffaa00">ALBUM</span>`:'';
        div.innerHTML=`<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${badge}${name}${tTag}</div><div class="yt-search-sub">${artist}</div></div>${rIcon}`;
        div.onclick=async()=>{
          if(isPL){
            showToast('📂 Loading playlist…');
            const tr=await fetchPlaylistTracks(spId);
            spResultsArea.innerHTML=''; tr.forEach(t=>addToSpResults(t));
            inSpotifyPlaylist=true;
            document.getElementById('spPlaylistExitBtn')?.classList.remove('hidden');
            /* Load into queue */
            activeSrcTab='spotify'; queue=[]; currentIdx=0;
            tr.forEach(t=>queue.push({type:'spotify_yt',title:t.title,artist:t.artist,spId:t.id,thumb:t.image}));
            renderQueue(); if(queue.length>0)playQueueItem(0);
          } else if(isAL){
            showToast('📂 Loading album…');
            const tr=await fetchAlbumTracks(spId);
            spResultsArea.innerHTML=''; tr.forEach(t=>addToSpResults(t));
          } else {
            activeSrcTab='spotify'; queue=[]; currentIdx=0;
            addToQueue({type:'spotify_yt',title:name,artist,spId,thumb});
          }
        };
        spResultsArea.appendChild(div);
      });
    } catch{spResultsArea.innerHTML='<p class="mp-empty">API Error!</p>';}
  }

  function addToSpResults(t){
    const div=document.createElement('div'); div.className='yt-search-item';
    div.innerHTML=`<img src="${t.image}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${t.title}</div><div class="yt-search-sub">${t.artist}</div></div><span class="sp-play-btn">▶</span>`;
    div.onclick=()=>{activeSrcTab='spotify';queue=[];currentIdx=0;addToQueue({type:'spotify_yt',title:t.title,artist:t.artist,spId:t.id,thumb:t.image});};
    spResultsArea.appendChild(div);
  }

  async function fetchPlaylistTracks(id){
    try{const r=await fetch(`https://${SP81_HOST}/playlist_tracks?id=${id}&limit=50`,{headers:{'x-rapidapi-key':RAPID_API_KEY,'x-rapidapi-host':SP81_HOST}});const d=await r.json();return(d.items||[]).filter(i=>i.track).map(i=>({id:i.track.id,title:i.track.name,artist:i.track.artists[0]?.name||'',image:i.track.album?.images[0]?.url||''}));}catch{return[];}
  }
  async function fetchAlbumTracks(id){
    try{const r=await fetch(`https://${SP81_HOST}/album_tracks?id=${id}`,{headers:{'x-rapidapi-key':RAPID_API_KEY,'x-rapidapi-host':SP81_HOST}});const d=await r.json();const img=d.album?.images?.[0]?.url||'';return(d.album?.tracks?.items||[]).map(i=>({id:i.id,title:i.name,artist:i.artists[0]?.name||'',image:img}));}catch{return[];}
  }

  spSearchSongBtn?.addEventListener('click',()=>searchSpotify(spInput.value.trim(),false));
  spSearchPlaylistBtn?.addEventListener('click',()=>searchSpotify(spInput.value.trim(),true));
  spInput?.addEventListener('keydown',e=>{if(e.key==='Enter')spSearchSongBtn?.click();});

  /* ═══ 16. YT MUSIC SEARCH ═══ */
  async function searchYTMusic(query){
    if(!query)return;
    ytmResultsArea.innerHTML='<div class="mp-loading-pulse">Searching…</div>';
    showResultsArea(ytmResultsArea,toggleListBtnYtm);
    const items=await ytSearch(query+' song',12);
    ytmResultsArea.innerHTML='';
    if(!items.length){ytmResultsArea.innerHTML='<p class="mp-empty">No results.</p>';return;}
    items.forEach(item=>{
      const div=document.createElement('div'); div.className='yt-search-item';
      const thumb=item.thumbnail?.[1]?.url||item.thumbnail?.[0]?.url||'';
      div.innerHTML=`<img src="${thumb}" class="yt-search-thumb"/><div class="yt-search-info"><div class="yt-search-title">${item.title}</div><div class="yt-search-sub">${item.channelTitle}</div></div><span style="font-size:15px;color:#ff4444">▶</span>`;
      div.onclick=()=>{activeSrcTab='ytmusic';queue=[];currentIdx=0;addToQueue({type:'ytmusic',title:item.title,artist:item.channelTitle,ytId:item.videoId,thumb});};
      ytmResultsArea.appendChild(div);
    });
  }

  ytmSearchBtn?.addEventListener('click',()=>searchYTMusic(ytmInput.value.trim()));
  ytmInput?.addEventListener('keydown',e=>{if(e.key==='Enter')ytmSearchBtn?.click();});

  /* ═══ 17. QUEUE ENGINE ═══ */
  function addToQueue(item){
    queue.push(item); autoPlayHistory.add(normTitle(item.title)); renderQueue(); playQueueItem(queue.length-1);
  }

  function renderQueue(){
    if(!queueList)return; queueList.innerHTML='';
    queue.forEach((item,i)=>{
      const el=document.createElement('div');
      el.className='mp-queue-item'+(i===currentIdx?' playing':'');
      const icon={youtube:'🎬',ytmusic:'🎵',spotify_yt:'🌐',stream:'☁️'}[item.type]||'🎵';
      el.innerHTML=`<span style="font-size:10px;opacity:.5;flex-shrink:0">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del">✕</button>`;
      el.querySelector('.qi-del').onclick=e=>{e.stopPropagation();queue.splice(i,1);if(currentIdx>=queue.length)currentIdx=Math.max(0,queue.length-1);renderQueue();};
      el.onclick=()=>playQueueItem(i);
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i){
    if(i<0||i>=queue.length)return;
    if(playbackMode==='loop'&&i!==currentIdx){renderMedia(queue[currentIdx]);return;}
    currentIdx=i; renderQueue(); const item=queue[i];
    if(synced&&!isRemoteAction)broadcastSync({action:'change_song',item});
    renderMedia(item);
    if(autoPlayEnabled&&i>=queue.length-2)triggerAutoPlayLoad();
    prefetchAhead();
  }

  function showPremiumCard(src){
    cinemaMode.classList.add('hidden'); premiumMusicCard.classList.remove('hidden'); spotifyMode.classList.add('hidden');
    premiumMusicCard.className=src==='spotify'?'premium-music-card source-sp':'premium-music-card source-ytm';
    pmcSourceBadge.textContent=src==='spotify'?'🌐 Spotify':'🎵 YT Music';
    pmcSourceBadge.className='pmc-source-badge '+(src==='spotify'?'sp':'ytm');
    showSpDiscBtn(src==='spotify');
  }

  async function renderMedia(item){
    nativeAudio.pause(); nativeAudio.removeAttribute('src'); isPlaying=false; updatePlayBtn(); updateProgressBar(0,0);
    ytFrameWrap.style.display='none'; if(ytPlayer&&isYtReady)ytPlayer.pauseVideo();
    setPMCInfo(item.title,item.artist||'Unknown',item.thumb);
    setTrackInfo(item.title,item.artist||'Unknown');
    setupMediaSession(item);

    if(item.type==='youtube'){
      activeType='youtube'; showCinemaMode(); ytFrameWrap.style.display='block';
      if(isYtReady)ytPlayer.loadVideoById(item.ytId); else setTimeout(()=>renderMedia(item),600);
    } else if(item.type==='ytmusic'||item.type==='spotify_yt'){
      activeType=item.type; activeSrcTab=item.type==='ytmusic'?'ytmusic':'spotify';
      showPremiumCard(activeSrcTab);
      if(!item.isAutoPlay){batchSimilarArtist='';batchCount=0;}
      let url=item.prefetchedUrl||await resolveAudioUrl(item);
      if(url){
        nativeAudio.src=url;
        nativeAudio.play().then(()=>{isPlaying=true;updatePlayBtn();premiumMusicCard.classList.add('playing');}).catch(()=>showToast('Tap ▶ to play'));
      } else if(item.ytId){
        showToast('⚠️ Stream failed — iframe fallback');
        showCinemaMode(); ytFrameWrap.style.display='block';
        if(isYtReady)ytPlayer.loadVideoById(item.ytId);
      }
    }
  }

  /* ═══ 18. HELPERS ═══ */
  function showCinemaMode(){cinemaMode.classList.remove('hidden');premiumMusicCard.classList.add('hidden');spotifyMode.classList.add('hidden');}
  function setPMCInfo(t,a,img){pmcTitle.textContent=t;pmcArtist.textContent=a;pmcArtwork.src=img||'https://i.imgur.com/8Q5FqWj.jpeg';pmcBgBlur.style.backgroundImage=`url('${pmcArtwork.src}')`;}
  function setTrackInfo(t,a){if(musicTitle)musicTitle.textContent=t;if(miniTitle)miniTitle.textContent=`${t} • ${a}`;}
  function fmtTime(s){if(!s||isNaN(s))return'0:00';const m=Math.floor(s/60),sc=Math.floor(s%60);return`${m}:${sc.toString().padStart(2,'0')}`;}
  function updateProgressBar(cur,dur){
    if(!dur)return; pmcProgressFill.style.width=Math.min(100,(cur/dur)*100)+'%';
    if(pmcCurrentTime)pmcCurrentTime.textContent=fmtTime(cur); if(pmcDuration)pmcDuration.textContent=fmtTime(dur);
  }

  nativeAudio.addEventListener('timeupdate',()=>updateProgressBar(nativeAudio.currentTime,nativeAudio.duration));
  nativeAudio.addEventListener('ended',()=>{
    if(activeSrcTab==='spotify'&&inSpotifyPlaylist&&currentIdx===queue.length-1)spotifyPlaylistEnded=true;
    playNext();
  });
  pmcProgressBar?.addEventListener('click',e=>{const r=pmcProgressBar.getBoundingClientRect(),p=(e.clientX-r.left)/r.width;if(nativeAudio.duration)nativeAudio.currentTime=p*nativeAudio.duration;});

  function playNext(){
    if(playbackMode==='loop'){renderMedia(queue[currentIdx]);return;}
    if(currentIdx<queue.length-1)playQueueItem(currentIdx+1); else if(autoPlayEnabled)triggerAutoPlayLoad();
  }
  function playPrev(){
    if(playbackMode==='loop'){renderMedia(queue[currentIdx]);return;}
    if(currentIdx>0)playQueueItem(currentIdx-1);
  }

  [pmcNext,...mpNexts].forEach(b=>b?.addEventListener('click',playNext));
  [pmcPrev,...mpPrevs].forEach(b=>b?.addEventListener('click',playPrev));
  [pmcPlayMain,...mpPlays].forEach(btn=>btn?.addEventListener('click',()=>{
    if(['ytmusic','spotify_yt','stream'].includes(activeType)){isPlaying?nativeAudio.pause():nativeAudio.play();}
    else if(activeType==='youtube'&&ytPlayer){isPlaying?ytPlayer.pauseVideo():ytPlayer.playVideo();}
  }));

  function updatePlayBtn(){
    mpPlays.forEach(b=>b.textContent=isPlaying?'⏸':'▶'); if(pmcPlayMain)pmcPlayMain.textContent=isPlaying?'⏸':'▶';
    if(isPlaying)premiumMusicCard?.classList.add('playing'); else premiumMusicCard?.classList.remove('playing');
  }
  nativeAudio.addEventListener('play',()=>{isPlaying=true;updatePlayBtn();if(synced&&!isRemoteAction)broadcastSync({action:'play',time:nativeAudio.currentTime});});
  nativeAudio.addEventListener('pause',()=>{isPlaying=false;updatePlayBtn();if(synced&&!isRemoteAction)broadcastSync({action:'pause',time:nativeAudio.currentTime});});

  function setupMediaSession(item){
    if(!('mediaSession' in navigator))return;
    navigator.mediaSession.metadata=new MediaMetadata({title:item.title,artist:item.artist||'ZeroX Hub',artwork:[{src:item.thumb||'https://i.imgur.com/8Q5FqWj.jpeg',sizes:'512x512',type:'image/jpeg'}]});
    navigator.mediaSession.setActionHandler('play',()=>activeType==='youtube'?ytPlayer?.playVideo():nativeAudio.play());
    navigator.mediaSession.setActionHandler('pause',()=>activeType==='youtube'?ytPlayer?.pauseVideo():nativeAudio.pause());
    navigator.mediaSession.setActionHandler('previoustrack',playPrev);
    navigator.mediaSession.setActionHandler('nexttrack',playNext);
  }

  /* ═══ 19. INIT ═══ */
  (function init(){
    injectModeSwitch();
    injectSpDiscoverySwitch();
    injectPlaylistExitBtn();
    updateModeBtn();
    renderQueue();
    console.log('[ZX PRO 4.0] Last.fm Engine Active ✓');
  })();

})();
