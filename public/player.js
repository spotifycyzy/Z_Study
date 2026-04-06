/* ═══════════════════════════════════════════════════════════
   MUSIC PLAYER — player.js
   THE NUCLEAR OPTION: Extracts raw YouTube audio for 100% Background Play
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── DOM ───────────────────────────────────────────────── */
  const panel       = document.getElementById('musicPanel');
  const mpTitle     = document.getElementById('mpTitle');
  const mpSub       = document.getElementById('mpSub');
  const mpPlay      = document.getElementById('mpPlay');
  const mpPrev      = document.getElementById('mpPrev');
  const mpNext      = document.getElementById('mpNext');
  const mpToggleBtn = document.getElementById('mpToggleBtn');
  const mpOpenFull  = document.getElementById('mpOpenFull');
  const mpClosePanel= document.getElementById('mpClosePanel');
  const mpSyncPill  = document.getElementById('mpSyncPill');
  const mpSyncBadge = document.getElementById('mpSyncBadge');
  const mpSyncBtn   = document.getElementById('mpSyncBtn');
  const mpSyncInfo  = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn = document.getElementById('mpUnsyncBtn');
  const nativeAudio = document.getElementById('nativeAudio');
  const urlInput    = document.getElementById('urlInput');
  const urlAddBtn   = document.getElementById('urlAddBtn');
  const fileInput   = document.getElementById('fileInput');
  const ytInput     = document.getElementById('ytInput');
  const ytAddBtn    = document.getElementById('ytAddBtn');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  const ytSearchResults = document.getElementById('ytSearchResults');
  const spInput     = document.getElementById('spInput');
  const spAddBtn    = document.getElementById('spAddBtn');
  const spFrame     = document.getElementById('spFrame');
  const spFrameWrap = document.getElementById('spFrameWrap');
  const queueList   = document.getElementById('queueList');

  /* ── State ─────────────────────────────────────────────── */
  let queue        = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx   = parseInt(localStorage.getItem('zx_qidx') || '0');
  let synced       = false;
  let activeType   = 'none'; 
  let isPlaying    = false;
  let ignoreNextSync = false;

  /* ── Panel toggle ───────────────────────────────────────── */
  function togglePanel() { panel.classList.toggle('hidden'); }
  mpToggleBtn.addEventListener('click', togglePanel);
  mpOpenFull .addEventListener('click', togglePanel);
  mpClosePanel.addEventListener('click', () => panel.classList.add('hidden'));

  /* ── Tab switching ──────────────────────────────────────── */
  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  /* ── Android/iOS Background Lock-Screen Audio ───────────── */
  function updateMediaSession(title, artist) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'StudyVault Player',
        artist: artist || 'Playing...',
        artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3048/3048122.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => { nativeAudio.play(); });
      navigator.mediaSession.setActionHandler('pause', () => { nativeAudio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
  }

  /* ── URL / local add ────────────────────────────────────── */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); urlInput.value = ''; return; }
    if (isSpotifyUrl(val)) { loadSpotify(val); urlInput.value = ''; return; }
    addToQueue({ type: 'audio', title: val.split('/').pop() || 'Audio', url: val });
    urlInput.value = '';
  });
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlAddBtn.click(); });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    addToQueue({ type: 'audio', title: file.name, url });
    playAudio(url, file.name);
  });

  /* ── YouTube API & Search ───────────────────────────────── */
  ytAddBtn.addEventListener('click', () => {
    const val = ytInput.value.trim(); if (!val) return;
    loadYouTube(val); 
  });
  ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytAddBtn.click(); });

  function isYouTubeUrl(url) { return /youtube\.com|youtu\.be/.test(url); }
  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // Fetch search results
  async function searchYouTubeApi(query) {
    const instances = ['vid.puffyan.us', 'inv.tux.pizza', 'pipedapi.kavin.rocks'];
    for (const instance of instances) {
      try {
        const isPiped = instance.includes('piped');
        const path = isPiped ? `/search?q=${encodeURIComponent(query)}&filter=videos` : `/api/v1/search?q=${encodeURIComponent(query)}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://${instance}${path}`)}`;
        
        const res = await fetch(proxyUrl);
        if (!res.ok) continue;
        const data = await res.json();
        
        if (isPiped && data.items) {
          return data.items.filter(i => i.url && i.url.includes('watch?v=')).map(i => ({ id: i.url.split('v=')[1].split('&')[0], title: i.title, channel: i.uploaderName }));
        } else if (!isPiped && Array.isArray(data)) {
          return data.filter(i => i.videoId).map(i => ({ id: i.videoId, title: i.title, channel: i.author }));
        }
      } catch (e) { continue; }
    }
    return null; 
  }

  function displaySearchResults(results) {
    ytSearchResults.innerHTML = ''; 
    ytSearchResults.classList.add('active');
    
    results.slice(0, 10).forEach(res => {
      const item = document.createElement('div');
      item.className = 'yt-result-item';
      item.innerHTML = `<span class="yt-result-title">${res.title}</span><span class="yt-result-author">▶ ${res.channel}</span>`;
      item.onclick = () => {
        ytSearchResults.classList.remove('active');
        ytInput.value = ''; 
        executeYtPlay(res.id, res.title);
      };
      ytSearchResults.appendChild(item);
    });
  }

  function loadYouTube(queryOrUrl) {
    const id = extractYouTubeId(queryOrUrl);
    if (id) {
      ytSearchResults.classList.remove('active');
      executeYtPlay(id, 'YouTube Link');
      ytInput.value = '';
    } else {
      ytInput.value = 'Searching...';
      searchYouTubeApi(queryOrUrl).then(results => {
        if (results && results.length > 0) {
          ytInput.value = queryOrUrl; 
          displaySearchResults(results);
        } else {
          alert('Search networks busy. Please paste a link.');
          ytInput.value = '';
        }
      });
    }
  }

  // 💣 THE NUCLEAR HACK: Extracting Raw Audio from YouTube
  async function executeYtPlay(vidId, title) {
    ytInput.value = 'Extracting audio stream...';
    try {
      // Ask the Piped API to give us the direct raw audio file of the YouTube video
      const res = await fetch(`https://pipedapi.kavin.rocks/streams/${vidId}`);
      const data = await res.json();

      if (data.audioStreams && data.audioStreams.length > 0) {
        // Grab the highest quality audio stream URL
        const audioUrl = data.audioStreams.sort((a,b) => b.bitrate - a.bitrate)[0].url;

        // Play it using the native phone audio player!
        ytFrameWrap.style.display = 'none'; // We don't even need the iframe anymore
        ytInput.value = '';

        playAudio(audioUrl, title, 'YouTube Audio');
        
        addToQueue({ type: 'audio', title: title, url: audioUrl });
        
      } else {
        alert('Could not extract audio for this video.');
        ytInput.value = '';
      }
    } catch(err) {
      alert('Failed to extract audio. Try another song.');
      ytInput.value = '';
    }
  }

  /* ── Spotify ────────────────────────────────────────────── */
  spAddBtn.addEventListener('click', () => {
    const val = spInput.value.trim(); if (!val) return;
    loadSpotify(val); spInput.value = '';
  });
  spInput.addEventListener('keydown', e => { if (e.key === 'Enter') spAddBtn.click(); });

  function isSpotifyUrl(url) { return /spotify\.com/.test(url); }
  function loadSpotify(url) {
    const embedUrl = url.includes('/embed/') ? url : url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    spFrame.src = embedUrl;
    spFrameWrap.style.display = 'block';
    ytFrameWrap.style.display = 'none';
    ytSearchResults.classList.remove('active');
    nativeAudio.style.display = 'none';
    activeType = 'spotify';
    setTrackInfo('Spotify', 'Playing link');
    
    document.querySelector('[data-tab="spotify"]').click();
    addToQueue({ type: 'spotify', title: 'Spotify · Track', url });
    if (synced) broadcastSync({ action: 'spotify', url });
  }

  /* ── Native audio (Now handles everything!) ─────────────── */
  function playAudio(url, title, subLabel = 'Direct audio') {
    nativeAudio.src = url;
    nativeAudio.style.display = 'block'; // Shows the standard HTML5 audio bar
    ytFrameWrap.style.display = 'none';
    ytSearchResults.classList.remove('active');
    spFrameWrap.style.display = 'none';
    
    nativeAudio.play().catch(() => {});
    activeType = 'audio';
    setTrackInfo(title, subLabel);
    updateMediaSession(title, 'StudyVault Player');
    isPlaying = true;
    updatePlayBtn();

    // Since we extracted the audio, we broadcast the RAW audio file to the other user!
    if (synced) broadcastSync({ action: 'audio', url, title });
  }

  nativeAudio.addEventListener('play',  () => { 
    isPlaying = true; updatePlayBtn(); 
    if(synced && !ignoreNextSync) broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('pause', () => { 
    isPlaying = false; updatePlayBtn(); 
    if(synced && !ignoreNextSync) broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('seeked', () => {
    if(synced && !ignoreNextSync) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
    ignoreNextSync = false;
  });
  nativeAudio.addEventListener('ended', playNext);

  /* ── Play / Pause Button ────────────────────────────────── */
  mpPlay.addEventListener('click', () => {
    if (activeType === 'audio') {
      if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(() => {});
    }
  });

  function updatePlayBtn() { mpPlay.textContent = isPlaying ? '⏸' : '▶'; }

  /* ── Queue ──────────────────────────────────────────────── */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); }
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); } catch {} }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Queue is empty.</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      el.innerHTML = `<span class="qi-type">${item.type === 'spotify' ? '♫ SP' : '🎵'}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.addEventListener('click', e => {
        if (e.target.classList.contains('qi-del')) { queue.splice(parseInt(e.target.dataset.i), 1); saveQueue(); renderQueue(); return; }
        playQueueItem(i);
      });
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    currentIdx = i; const item = queue[i]; if (!item) return;
    if (item.type === 'audio')   playAudio(item.url, item.title);
    if (item.type === 'spotify') loadSpotify(item.url);
    renderQueue();
  }

  function playNext() { if (currentIdx < queue.length - 1) playQueueItem(currentIdx + 1); }
  function playPrev() { if (currentIdx > 0) playQueueItem(currentIdx - 1); }
  mpNext.addEventListener('click', playNext);
  mpPrev.addEventListener('click', playPrev);

  function setTrackInfo(title, sub) { mpTitle.textContent = title; mpSub.textContent = sub; }

  /* ── Listen Together Sync ───────────────────────────────── */
  mpSyncBtn.addEventListener('click', () => {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Synced — listening together'; mpSyncBadge.classList.add('synced');
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display  = 'none';
    
    if (activeType === 'spotify') broadcastSync({ action: 'spotify', url: spInput.value });
    if (activeType === 'audio')   broadcastSync({ action: 'audio', url: nativeAudio.src, title: mpTitle.textContent });
  });

  mpUnsyncBtn.addEventListener('click', () => {
    synced = false;
    mpSyncPill.textContent = '🔴 solo'; mpSyncPill.classList.remove('synced');
    mpSyncBadge.textContent = '🔴 Solo mode'; mpSyncBadge.classList.remove('synced');
    mpSyncInfo.style.display = 'none'; mpSyncBtn.style.display  = '';
  });

  function broadcastSync(data) {
    if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data });
  }

  window._zxReceiveSync = function (data) {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Synced'; mpSyncBadge.classList.add('synced');
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display  = 'none';

    ignoreNextSync = true; 

    switch (data.action) {
      case 'spotify': loadSpotify(data.url); break;
      case 'audio':   playAudio(data.url, data.title || 'Synced audio'); break;
      case 'play':    if (activeType === 'audio') { nativeAudio.currentTime = data.time || nativeAudio.currentTime; nativeAudio.play(); } break;
      case 'pause':   if (activeType === 'audio') { nativeAudio.currentTime = data.time || nativeAudio.currentTime; nativeAudio.pause(); } break;
      case 'seek':    if (activeType === 'audio') { nativeAudio.currentTime = data.time; } break;
    }
    
    setTimeout(() => { ignoreNextSync = false; }, 500);
  };

  renderQueue();
})();
