/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js
   Server-side yt-dlp extraction → native <audio> element
   Full background playback. No iframe. No CORS issues.
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── DOM ──────────────────────────────────────────────── */
  const panel          = document.getElementById('zxPanel');
  const handle         = document.getElementById('zxHandle');
  const closeHandle    = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn');
  const spotifyMode    = document.getElementById('spotifyMode');
  const cinemaMode     = document.getElementById('cinemaMode');
  const ytFrameWrap    = document.getElementById('ytFrameWrap');
  const nativeAudio    = document.getElementById('nativeAudio');
  const musicTitle     = document.getElementById('musicTitle');
  const musicArtist    = document.getElementById('musicArtist');
  const miniTitle      = document.getElementById('miniTitle');
  const mpPlays        = document.querySelectorAll('.mp-play');
  const mpPrevEl       = document.getElementById('miniPrev');
  const mpNextEl       = document.getElementById('miniNext');
  const urlInput       = document.getElementById('urlInput');
  const urlAddBtn      = document.getElementById('urlAddBtn');
  const fileInput      = document.getElementById('fileInput');
  const ytInput        = document.getElementById('ytInput');
  const ytAddBtn       = document.getElementById('ytAddBtn');
  const spInput        = document.getElementById('spInput');
  const spSearchSongBtn     = document.getElementById('spSearchSongBtn');
  const spSearchPlaylistBtn = document.getElementById('spSearchPlaylistBtn');
  const queueList      = document.getElementById('queueList');
  const ytSearchResults= document.getElementById('ytSearchResults');
  const spSearchResults= document.getElementById('spSearchResults');
  const episodesOverlayYt = document.getElementById('episodesOverlayYt');
  const episodesOverlaySp = document.getElementById('episodesOverlaySp');
  const toggleListBtnYt= document.getElementById('toggleListBtnYt');
  const toggleListBtnSp= document.getElementById('toggleListBtnSp');
  const mpSyncBadge    = document.getElementById('mpSyncBadge');
  const mpSyncBtn      = document.getElementById('mpSyncBtn');
  const mpSyncInfo     = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn    = document.getElementById('mpUnsyncBtn');

  /* Make sure native audio works in background */
  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');
  nativeAudio.preload = 'auto';

  /* Hide cinema/YT iframe — we never use it */
  if (cinemaMode)  cinemaMode.style.display  = 'none';
  if (ytFrameWrap) ytFrameWrap.style.display = 'none';

  /* Ensure visualizer exists */
  if (!document.getElementById('streamThumb')) {
    spotifyMode.innerHTML = `
      <img id="streamThumb" src="https://i.imgur.com/8Q5FqWj.jpeg" class="premium-thumb"/>
      <div class="music-visualizer" id="visualizer">
        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
        <div class="bar"></div><div class="bar"></div>
      </div>`;
  }
  spotifyMode.classList.remove('hidden');

  /* Progress bar — insert after visualizer */
  if (!document.getElementById('zxProgress')) {
    const prog = document.createElement('div');
    prog.innerHTML = `
      <div id="zxProgressWrap" style="width:100%;padding:10px 0 4px;cursor:pointer">
        <div style="width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">
          <div id="zxProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#E8436A,#C2005F);border-radius:4px;transition:width 0.5s linear"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px">
          <span id="zxTimeNow" style="font-size:10px;color:rgba(255,181,200,0.6)">0:00</span>
          <span id="zxTimeTot" style="font-size:10px;color:rgba(255,181,200,0.4)">0:00</span>
        </div>
      </div>`;
    spotifyMode.appendChild(prog);
    document.getElementById('zxProgressWrap').addEventListener('click', e => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct  = (e.clientX - rect.left) / rect.width;
      if (nativeAudio.duration) nativeAudio.currentTime = pct * nativeAudio.duration;
    });
  }

  /* ── STATE ────────────────────────────────────────────── */
  let queue          = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx     = parseInt(localStorage.getItem('zx_qidx')   || '0');
  let synced         = false;
  let isPlaying      = false;
  let isRemoteAction = false;
  let remoteTimer    = null;
  let extracting     = false;

  function setRemote() {
    isRemoteAction = true;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2500);
  }

  /* ── PANEL OPEN/CLOSE ─────────────────────────────────── */
  let startY = 0, isPanelOpen = false;
  function openPanel()  { if (isPanelOpen) return;  isPanelOpen=true;  panel.classList.add('zx-open');    document.body.style.overflow='hidden'; panelToggleBtn?.classList.add('active'); }
  function closePanel() { if (!isPanelOpen) return; isPanelOpen=false; panel.classList.remove('zx-open'); document.body.style.overflow='';       panelToggleBtn?.classList.remove('active'); }

  handle.addEventListener('touchstart', e => { startY=e.touches[0].clientY; }, {passive:true});
  handle.addEventListener('touchmove',  e => { if (!isPanelOpen && e.touches[0].clientY-startY>15) openPanel(); }, {passive:true});
  handle.addEventListener('click', e => { if (e.target.closest('.mp-btn,.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });
  panelToggleBtn?.addEventListener('click', e => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  if (closeHandle) {
    closeHandle.addEventListener('touchstart', e => { startY=e.touches[0].clientY; }, {passive:true});
    closeHandle.addEventListener('touchmove',  e => { if (isPanelOpen && startY-e.touches[0].clientY>15) closePanel(); }, {passive:true});
    closeHandle.addEventListener('click', closePanel);
  }

  /* ── TABS ─────────────────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
    });
  });

  toggleListBtnYt?.addEventListener('click', () => episodesOverlayYt?.classList.toggle('hidden'));
  toggleListBtnSp?.addEventListener('click', () => episodesOverlaySp?.classList.toggle('hidden'));

  /* ── TOAST ────────────────────────────────────────────── */
  function toast(msg, dur=2800) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;opacity:0;transition:opacity 0.25s;max-width:80vw;text-align:center;';
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity='1');
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(), 300); }, dur);
  }

  /* ══════════════════════════════════════════════════════
     CORE: EXTRACT AUDIO VIA SERVER
     Calls GET /api/audio?id=YTID
     Server runs yt-dlp and returns a direct audio URL.
     Native <audio> plays it — background playback works.
  ══════════════════════════════════════════════════════ */
  async function extractAndPlay(item) {
    if (extracting) return;
    extracting = true;

    setInfo(item.title, '⏳ Extracting audio…');
    toast('⏳ Fetching audio stream…', 4000);
    updateThumb(item.thumb);

    try {
      const res  = await fetch(`/api/audio?id=${item.ytId}`);
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'No URL returned');
      }

      // Set the direct audio URL — native <audio> plays it
      nativeAudio.src = data.url;
      nativeAudio.load();

      const playPromise = nativeAudio.play();
      if (playPromise) {
        await playPromise;
      }

      setInfo(item.title, '🎵 Playing');
      if (synced && !isRemoteAction) {
        broadcastSync({ action:'change_song', item });
      }

    } catch (err) {
      console.error('[player] Extract error:', err);
      toast('❌ ' + (err.message || 'Extraction failed'));
      setInfo(item.title, '❌ Failed — try next');
    } finally {
      extracting = false;
    }
  }

  /* ── URL / FILE TAB ───────────────────────────────────── */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    urlInput.value = '';
    if (isYTUrl(val)) {
      const ytId = extractYTId(val);
      if (ytId) addToQueue({ type:'yt', title:'YouTube Audio', ytId, thumb:'' });
      else toast('❌ Could not parse YouTube URL');
    } else if (val.startsWith('http')) {
      addToQueue({ type:'direct', title: val.split('/').pop().split('?')[0] || 'Audio', url:val, thumb:'' });
    } else {
      toast('Please enter a valid URL');
    }
  });
  urlInput.addEventListener('keydown', e => { if (e.key==='Enter') urlAddBtn.click(); });

  fileInput?.addEventListener('change', () => {
    const f = fileInput.files[0]; if (!f) return;
    addToQueue({ type:'direct', title:f.name, url:URL.createObjectURL(f), thumb:'' });
    fileInput.value = '';
  });

  /* ── SEARCH TABS ──────────────────────────────────────── */
  ytAddBtn?.addEventListener('click', () => { doSearch(ytInput.value.trim(), 'ytSearchResults', 'video'); ytInput.value=''; });
  ytInput?.addEventListener('keydown', e => { if (e.key==='Enter') ytAddBtn?.click(); });

  spSearchSongBtn?.addEventListener('click', () => { doSearch(spInput.value.trim(), 'spSearchResults', 'music'); spInput.value=''; });
  spSearchPlaylistBtn?.addEventListener('click', () => { doSearch(spInput.value.trim(), 'spSearchResults', 'music'); spInput.value=''; });
  spInput?.addEventListener('keydown', e => { if (e.key==='Enter') spSearchSongBtn?.click(); });

  async function doSearch(query, targetId, type) {
    if (!query) return;

    /* Direct YT URL? Just add it */
    if (isYTUrl(query)) {
      const ytId = extractYTId(query);
      if (ytId) { addToQueue({type:'yt', title:'YouTube', ytId, thumb:''}); return; }
    }

    const resDiv = document.getElementById(targetId);
    if (!resDiv) return;
    resDiv.innerHTML = '<p class="mp-empty">🔍 Searching…</p>';
    if (targetId==='ytSearchResults') episodesOverlayYt?.classList.remove('hidden');
    if (targetId==='spSearchResults') episodesOverlaySp?.classList.remove('hidden');

    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`);
      const data = await res.json();

      if (!data.items?.length) {
        resDiv.innerHTML = '<p class="mp-empty">No results found.</p>';
        return;
      }

      resDiv.innerHTML = '';
      data.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'yt-search-item';
        el.innerHTML = `
          <img src="${item.thumb}" class="yt-search-thumb" loading="lazy"/>
          <div class="yt-search-info">
            <div class="yt-search-title">${escHtml(item.title)}</div>
            <div class="yt-search-sub">${escHtml(item.channel)}</div>
          </div>
          <button class="yt-add-btn" title="Add & play">▶</button>`;
        el.addEventListener('click', () => {
          addToQueue({ type:'yt', title:item.title, ytId:item.ytId, thumb:item.thumbHq||item.thumb });
          toast(`▶ ${item.title.slice(0,35)}…`);
        });
        resDiv.appendChild(el);
      });
    } catch (e) {
      resDiv.innerHTML = `<p class="mp-empty">Search error: ${e.message}</p>`;
    }
  }

  /* ── QUEUE ────────────────────────────────────────────── */
  function addToQueue(item) {
    queue.push(item);
    saveQueue();
    renderQueue();
    playQueueItem(queue.length - 1);
  }

  function saveQueue() {
    try {
      // Don't persist blob URLs (they die on reload)
      const safe = queue.map(i => i.url?.startsWith('blob:') ? {...i, url:''} : i);
      localStorage.setItem('zx_queue',  JSON.stringify(safe.slice(-60)));
      localStorage.setItem('zx_qidx',  String(currentIdx));
    } catch {}
  }

  function renderQueue() {
    if (!queue.length) {
      queueList.innerHTML = '<p class="mp-empty">Queue empty. Search a song above.</p>';
      return;
    }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i===currentIdx ? ' playing' : '');
      const icon = item.type==='yt' ? '🎵' : item.type==='direct' ? '☁️' : '🎵';
      el.innerHTML = `
        <span class="qi-type">${icon}</span>
        <span class="qi-title">${escHtml(item.title)}</span>
        <button class="qi-del" data-i="${i}">✕</button>`;
      el.addEventListener('click', e => {
        if (e.target.classList.contains('qi-del')) {
          queue.splice(parseInt(e.target.dataset.i), 1);
          saveQueue(); renderQueue(); return;
        }
        playQueueItem(i);
      });
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    currentIdx = i; saveQueue(); renderQueue();
    const item = queue[i];
    if (item.type === 'yt') {
      extractAndPlay(item);
    } else if (item.type === 'direct') {
      playDirect(item);
    }
  }

  function playDirect(item) {
    nativeAudio.src = item.url;
    nativeAudio.load();
    nativeAudio.play().then(() => {
      setInfo(item.title, '☁️ Playing');
      updateThumb(item.thumb);
    }).catch(() => toast('Tap ▶ to play'));
    if (synced && !isRemoteAction && !item.url?.startsWith('blob:')) {
      broadcastSync({ action:'change_song', item });
    }
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }
  mpNextEl?.addEventListener('click', playNext);
  mpPrevEl?.addEventListener('click', playPrev);

  /* ── NATIVE AUDIO CONTROLS ────────────────────────────── */
  mpPlays.forEach(btn => btn.addEventListener('click', () => {
    if (isPlaying) nativeAudio.pause();
    else           nativeAudio.play().catch(()=>{});
  }));

  nativeAudio.addEventListener('play',  () => { isPlaying=true;  updateUI(); if (synced&&!isRemoteAction) broadcastSync({action:'play',  time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('pause', () => { isPlaying=false; updateUI(); if (synced&&!isRemoteAction) broadcastSync({action:'pause', time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('seeked',() => { if (synced&&!isRemoteAction) broadcastSync({action:'seek', time:nativeAudio.currentTime}); });
  nativeAudio.addEventListener('ended', () => { playNext(); });
  nativeAudio.addEventListener('error', () => { toast('Audio error — skipping'); setTimeout(playNext, 1000); });

  /* Progress bar update */
  nativeAudio.addEventListener('timeupdate', () => {
    const bar = document.getElementById('zxProgressBar');
    const now = document.getElementById('zxTimeNow');
    const tot = document.getElementById('zxTimeTot');
    if (!bar || !nativeAudio.duration) return;
    const pct = (nativeAudio.currentTime / nativeAudio.duration) * 100;
    bar.style.width = pct + '%';
    if (now) now.textContent = fmtTime(nativeAudio.currentTime);
    if (tot) tot.textContent = fmtTime(nativeAudio.duration);
  });

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s/60);
    return `${m}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  }

  /* ── UI HELPERS ───────────────────────────────────────── */
  function updateUI() {
    mpPlays.forEach(btn => btn.textContent = isPlaying ? '⏸' : '▶');
    const vis   = document.getElementById('visualizer');
    const thumb = document.getElementById('streamThumb');
    if (isPlaying) { vis?.classList.add('playing'); thumb?.classList.add('playing'); }
    else           { vis?.classList.remove('playing'); thumb?.classList.remove('playing'); }
  }

  function setInfo(title, sub) {
    if (musicTitle)  musicTitle.textContent  = title;
    if (musicArtist) musicArtist.textContent = sub;
    if (miniTitle)   miniTitle.textContent   = `${title} • ${sub}`;
  }

  function updateThumb(url) {
    const t = document.getElementById('streamThumb');
    if (t && url) t.src = url;
  }

  /* ── URL UTILS ────────────────────────────────────────── */
  function isYTUrl(url)    { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYTId(url){ const m=url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/); return m?m[1]:null; }
  function escHtml(s)      { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ══════════════════════════════════════════════════════
     SYNC ENGINE
  ══════════════════════════════════════════════════════ */
  mpSyncBtn?.addEventListener('click', () => {
    synced = true;
    if (mpSyncBadge) { mpSyncBadge.textContent='🟢 Synced'; mpSyncBadge.classList.add('synced'); }
    if (mpSyncBtn)  mpSyncBtn.style.display  = 'none';
    if (mpSyncInfo) mpSyncInfo.style.display = 'flex';
    broadcastSync({ action:'request_sync' });
    toast('🔗 Sync Active — listening together');
  });

  mpUnsyncBtn?.addEventListener('click', () => {
    synced = false;
    if (mpSyncBadge) { mpSyncBadge.textContent='🔴 Solo'; mpSyncBadge.classList.remove('synced'); }
    if (mpSyncBtn)  mpSyncBtn.style.display  = '';
    if (mpSyncInfo) mpSyncInfo.style.display = 'none';
  });

  function broadcastSync(data) {
    if (window._zxSendSync) window._zxSendSync({ type:'musicSync', ...data });
  }

  window._zxReceiveSync = function(data) {
    if (data.action === 'request_sync') {
      const cur = queue[currentIdx];
      if (synced && cur && !cur.url?.startsWith('blob:')) {
        broadcastSync({ action:'change_song', item:cur });
        setTimeout(() => broadcastSync({ action: isPlaying?'play':'pause', time:nativeAudio.currentTime }), 1800);
      }
      return;
    }

    /* Auto-enable sync on receiver side */
    synced = true;
    if (mpSyncBadge) { mpSyncBadge.textContent='🟢 Synced'; mpSyncBadge.classList.add('synced'); }
    if (mpSyncBtn)  mpSyncBtn.style.display  = 'none';
    if (mpSyncInfo) mpSyncInfo.style.display = 'flex';
    setRemote();

    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.ytId===data.item.ytId || q.url===data.item.url);
      if (idx === -1) { queue.push(data.item); idx=queue.length-1; }
      currentIdx=idx; saveQueue(); renderQueue();
      playQueueItem(idx);
      return;
    }

    if (data.action === 'play') {
      if (Math.abs(nativeAudio.currentTime - data.time) > 1.5) nativeAudio.currentTime = data.time;
      nativeAudio.play().catch(()=>{});
    }
    if (data.action === 'pause') {
      nativeAudio.currentTime = data.time;
      nativeAudio.pause();
    }
    if (data.action === 'seek') {
      nativeAudio.currentTime = data.time;
    }
  };

  /* ── FULLSCREEN ────────────────────────────────────────── */
  document.addEventListener('fullscreenchange',       () => document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement));
  document.addEventListener('webkitfullscreenchange', () => document.body.classList.toggle('is-fullscreen', !!document.webkitFullscreenElement));

  /* ── INIT ─────────────────────────────────────────────── */
  renderQueue();
})();
