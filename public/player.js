/* ═══════════════════════════════════════════════════════════
   ZEROX MUSIC PLAYER — player.js
   KOSMI ENGINE v4.0: FORCED HD QUALITY (No Degradation)
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
  const nativeAudio = document.getElementById('nativeAudio'); // Video Tag
  const urlInput    = document.getElementById('urlInput');
  const urlAddBtn   = document.getElementById('urlAddBtn');
  const fileInput   = document.getElementById('fileInput');
  const ytInput     = document.getElementById('ytInput');
  const ytAddBtn    = document.getElementById('ytAddBtn');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  const spInput     = document.getElementById('spInput');
  const spAddBtn    = document.getElementById('spAddBtn');
  const spFrame     = document.getElementById('spFrame');
  const spFrameWrap = document.getElementById('spFrameWrap');
  const queueList   = document.getElementById('queueList');

  // CRITICAL: Mobile HTML5 Video Policies
  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');
  nativeAudio.setAttribute('crossorigin', 'anonymous');

  /* 🔥 DYNAMIC TIMELINE SLIDER (For Remote Seek) 🔥 */
  const sliderWrap = document.createElement('div');
  sliderWrap.style.cssText = 'width:100%; padding: 0 15px; margin-top: 15px; display:none; align-items:center; gap:10px;';
  
  const timeDisplay = document.createElement('span');
  timeDisplay.style.cssText = 'font-size:12px; color:#fff; min-width:35px; font-weight:500;';
  timeDisplay.textContent = '0:00';
  
  const seekSlider = document.createElement('input');
  seekSlider.type = 'range';
  seekSlider.min = 0; seekSlider.max = 100; seekSlider.value = 0;
  seekSlider.style.cssText = 'flex:1; cursor:pointer; accent-color: #E8436A; height:4px;';
  
  const durDisplay = document.createElement('span');
  durDisplay.style.cssText = 'font-size:12px; color:#fff; min-width:35px; font-weight:500; text-align:right;';
  durDisplay.textContent = '0:00';

  sliderWrap.appendChild(timeDisplay);
  sliderWrap.appendChild(seekSlider);
  sliderWrap.appendChild(durDisplay);
  document.querySelector('.mp-controls').insertAdjacentElement('afterend', sliderWrap);

  /* ── State ─────────────────────────────────────────────── */
  let queue           = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx      = parseInt(localStorage.getItem('zx_qidx') || '0');
  let synced          = false;
  let activeType      = 'none'; 
  let isPlaying       = false;
  let ytPlayer        = null; 
  let isYtReady       = false;
  let streamStarted   = false; 
  
  let isRemoteAction  = false;
  let remoteTimer     = null;
  function setRemoteAction() {
    isRemoteAction = true; clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { isRemoteAction = false; }, 1500); 
  }

  /* 🔥 METERED TURN SERVERS 🔥 */
  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "turn:global.relay.metered.ca:80", username: "784d0b4711841be60f71d595", credential: "dCfrs0wXJdovYcyu" },
      { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "784d0b4711841be60f71d595", credential: "dCfrs0wXJdovYcyu" },
      { urls: "turn:global.relay.metered.ca:443", username: "784d0b4711841be60f71d595", credential: "dCfrs0wXJdovYcyu" },
      { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "784d0b4711841be60f71d595", credential: "dCfrs0wXJdovYcyu" }
    ]
  };
  let rtcPeer = null;
  let iceQueue = []; 

  /* ── TOAST LOGIC ───────────────────────────────────────── */
  function showToast(msg) {
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(232,67,106,0.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;pointer-events:none;animation:fadeInOut 3s forwards;';
    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style'); style.id = 'toastStyles';
      style.innerHTML = `@keyframes fadeInOut { 0%{opacity:0;transform:translate(-50%,10px)} 10%{opacity:1;transform:translate(-50%,0)} 90%{opacity:1} 100%{opacity:0} }`;
      document.head.appendChild(style);
    }
    document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
  }

  function formatTime(sec) {
    if(isNaN(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /* ── UI Toggles ─────────────────────────────────────────── */
  function togglePanel() { panel.classList.toggle('hidden'); }
  mpToggleBtn.addEventListener('click', togglePanel);
  mpOpenFull .addEventListener('click', togglePanel);
  mpClosePanel.addEventListener('click', () => panel.classList.add('hidden'));

  document.querySelectorAll('.mp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  /* ── YouTube API Setup ──────────────────────────────────── */
  const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = function() {
    ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
    ytPlayer = new YT.Player('ytPlayerInner', {
      height: '250', width: '100%', playerVars: { 'autoplay': 1, 'controls': 1, 'playsinline': 1, 'rel': 0 },
      events: { 'onReady': () => { isYtReady = true; }, 'onStateChange': onPlayerStateChange }
    });
  };

  function onPlayerStateChange(event) {
    if (!synced || isRemoteAction) {
      if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); }
      if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); }
      return;
    }
    const time = ytPlayer.getCurrentTime();
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); broadcastSync({ action: 'play', time }); }
    else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayBtn(); broadcastSync({ action: 'pause', time }); }
    else if (event.data === YT.PlayerState.ENDED) { playNext(); }
  }

  /* ── Inputs ─────────────────────────────────────────────── */
  urlAddBtn.addEventListener('click', () => {
    const val = urlInput.value.trim(); if (!val) return;
    if (isYouTubeUrl(val)) { loadYouTube(val); }
    else if (isSpotifyUrl(val)) { addToQueue({ type: 'spotify', title: 'Spotify Track', url: val }); }
    else { addToQueue({ type: 'audio', title: val.split('/').pop() || 'Audio', url: val }); }
    urlInput.value = '';
  });

  ytAddBtn.addEventListener('click', () => { const val = ytInput.value.trim(); if (!val) return; loadYouTube(val); ytInput.value = ''; });
  spAddBtn.addEventListener('click', () => { const val = spInput.value.trim(); if (!val) return; addToQueue({ type: 'spotify', title: 'Spotify', url: val }); spInput.value = ''; });

  function isYouTubeUrl(url) { return /youtu\.?be|youtube\.com/.test(url); }
  function extractYouTubeId(url) { const m = url.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; }
  function isSpotifyUrl(url) { return /spo/.test(url) && /tify/.test(url); }

  function loadYouTube(url) {
    const id = extractYouTubeId(url);
    if (!id) { showToast('❌ Invalid YouTube link!'); return; }
    const fakeUrl = 'https://www.youtube.com/watch?v=' + id;
    addToQueue({ type: 'youtube', title: 'YouTube Video', url: fakeUrl, ytId: id });
  }

  /* 🔥 INSTANT KOSMI STREAM (FORCED HD QUALITY) 🔥 */
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    streamStarted = false; 
    
    if (synced) {
      showToast("🚀 HD Engine: Locking Quality to 100%...");
      nativeAudio.srcObject = null;
      nativeAudio.src = url;
      nativeAudio.style.display = 'block'; ytFrameWrap.style.display = 'none'; spFrameWrap.style.display = 'none';
      sliderWrap.style.display = 'flex'; 
      
      activeType = 'p2p_sender';
      setTrackInfo(file.name, '📡 Broadcasting...');
      
      nativeAudio.play().then(() => {
          isPlaying = true; updatePlayBtn();
      }).catch(e => {
          showToast("⚠️ Tap play to allow video processing!");
      });

      nativeAudio.onplaying = () => {
         if(!streamStarted && activeType === 'p2p_sender') {
            streamStarted = true;
            setTrackInfo(file.name, '📡 HD Broadcast Active');
            startKosmiStream(file.name);
         }
      };

    } else {
      addToQueue({ type: 'audio', title: file.name, url: url });
    }
  });

  function startKosmiStream(title) {
    if(rtcPeer) { rtcPeer.close(); rtcPeer = null; }
    rtcPeer = new RTCPeerConnection(ICE_SERVERS);
    iceQueue = []; 
    
    let stream;
    if (nativeAudio.captureStream) stream = nativeAudio.captureStream();
    else if (nativeAudio.mozCaptureStream) stream = nativeAudio.mozCaptureStream();
    
    if(!stream || stream.getTracks().length === 0) {
        return showToast("❌ Browser blocked video capture. Please refresh.");
    }

    stream.getTracks().forEach(track => {
      const sender = rtcPeer.addTrack(track, stream);
      
      /* 🔥 THE ULTIMATE ANTI-COMPRESSION HACK 🔥 */
      if (track.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          
          params.encodings[0].maxBitrate = 8000000; // Force High Bitrate (8Mbps)
          params.degradationPreference = 'maintain-resolution'; // DO NOT DROP QUALITY!
          
          sender.setParameters(params).catch(()=>{});
      }
    });

    rtcPeer.onicecandidate = e => { if(e.candidate) broadcastSync({ action: 'webrtc_ice', candidate: e.candidate }); };
    
    rtcPeer.oniceconnectionstatechange = () => {
        if(rtcPeer.iceConnectionState === 'failed') showToast('❌ HD Stream Blocked by ISP');
        if(rtcPeer.iceConnectionState === 'connected') showToast('✅ Receiver Connected!');
    };

    rtcPeer.createOffer()
      .then(offer => rtcPeer.setLocalDescription(offer))
      .then(() => { broadcastSync({ action: 'webrtc_offer', offer: rtcPeer.localDescription, title: title }); });
  }

  /* ── Queue Management & Rendering ───────────────────────── */
  function addToQueue(item) {
    if(queue.length > 0 && queue[queue.length-1].url === item.url && queue[queue.length-1].title === item.title) return;
    queue.push(item); saveQueue(); renderQueue();
    if (queue.length === 1 || activeType === 'none') playQueueItem(queue.length - 1);
  }
  function saveQueue() { try { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); } catch {} }

  function renderQueue() {
    if (queue.length === 0) { queueList.innerHTML = '<p class="mp-empty">Empty</p>'; return; }
    queueList.innerHTML = '';
    queue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
      let icon = '🎵'; if (item.type === 'youtube') icon = '▶ YT'; if (item.type === 'spotify') icon = '♫ SP';
      el.innerHTML = `<span class="qi-type">${icon}</span><span class="qi-title">${item.title}</span><button class="qi-del" data-i="${i}">✕</button>`;
      el.onclick = (e) => { if (e.target.classList.contains('qi-del')) { queue.splice(i, 1); saveQueue(); renderQueue(); return; } playQueueItem(i); };
      queueList.appendChild(el);
    });
  }

  function playQueueItem(i) {
    if (i < 0 || i >= queue.length) return; currentIdx = i; saveQueue(); renderQueue(); const item = queue[i];
    if (synced && !isRemoteAction && !item.url.startsWith('blob:')) {
      broadcastSync({ action: 'change_song', item: item });
    }
    renderMedia(item);
  }

  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }

  function renderMedia(item) {
    nativeAudio.style.display = 'none'; ytFrameWrap.style.display = 'none'; spFrameWrap.style.display = 'none';
    sliderWrap.style.display = 'none'; 
    nativeAudio.pause(); nativeAudio.removeAttribute('src'); nativeAudio.srcObject = null;
    if (ytPlayer && isYtReady) ytPlayer.pauseVideo();
    
    if (item.type === 'youtube') {
      const id = item.ytId || extractYouTubeId(item.url); if (!id) return;
      activeType = 'youtube'; ytFrameWrap.style.display = 'block';
      if (isYtReady) ytPlayer.loadVideoById(id); else setTimeout(() => renderMedia(item), 500);
      setTrackInfo('YouTube', 'Live Sync Active');
    } 
    else if (item.type === 'spotify') {
      activeType = 'spotify'; spFrameWrap.style.display = 'block';
      const embedUrl = item.url.includes('/embed/') ? item.url : item.url.replace('open.spotify.com', 'open.spotify.com/embed');
      spFrame.src = embedUrl; setTrackInfo('Spotify', item.title);
    } 
    else if (item.type === 'audio') {
      activeType = 'audio'; nativeAudio.style.display = 'block'; sliderWrap.style.display = 'flex';
      nativeAudio.src = item.url; nativeAudio.play().catch(()=>{});
      setTrackInfo(item.title, 'Direct Media');
      isPlaying = true; updatePlayBtn();
    }
  }

  /* 🔥 CUSTOM SEEK BAR & TIMESTAMP SYNC 🔥 */
  nativeAudio.addEventListener('timeupdate', () => {
      if (activeType === 'audio' || activeType === 'p2p_sender') {
          const cur = nativeAudio.currentTime;
          const dur = nativeAudio.duration;
          if (dur) {
              seekSlider.value = (cur / dur) * 100;
              timeDisplay.textContent = formatTime(cur);
              durDisplay.textContent = formatTime(dur);
          }
      }
  });

  setInterval(() => {
      if (synced && activeType === 'p2p_sender' && !nativeAudio.paused) {
          broadcastSync({ action: 'sync_timeline', cur: nativeAudio.currentTime, dur: nativeAudio.duration });
      }
  }, 1000);

  seekSlider.addEventListener('input', (e) => {
      const percent = e.target.value;
      if (activeType === 'audio' || activeType === 'p2p_sender') {
          if(nativeAudio.duration) nativeAudio.currentTime = (percent / 100) * nativeAudio.duration;
      } else if (activeType === 'p2p_receiver') {
          broadcastSync({ action: 'remote_seek_percent', percent: percent });
      }
  });

  /* ── PLAY/PAUSE SYNC ── */
  nativeAudio.addEventListener('play',  () => { 
    isPlaying = true; updatePlayBtn(); 
    if (synced && !isRemoteAction) {
        if (activeType === 'p2p_receiver') broadcastSync({ action: 'remote_cmd', cmd: 'play' });
        else broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    }
  });
  nativeAudio.addEventListener('pause', () => { 
    isPlaying = false; updatePlayBtn(); 
    if (synced && !isRemoteAction) {
        if (activeType === 'p2p_receiver') broadcastSync({ action: 'remote_cmd', cmd: 'pause' });
        else broadcastSync({ action: 'pause', time: nativeAudio.currentTime });
    }
  });
  nativeAudio.addEventListener('seeked', () => {
    if (synced && !isRemoteAction && activeType !== 'p2p_receiver') {
        broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
    }
  });
  nativeAudio.addEventListener('ended', playNext);

  /* ── UNIVERSAL CONTROLLER ──────────────────── */
  mpPlay.addEventListener('click', () => {
    if (activeType === 'p2p_receiver') {
       broadcastSync({ action: 'remote_cmd', cmd: isPlaying ? 'pause' : 'play' });
       isPlaying = !isPlaying; updatePlayBtn();
    } else if (activeType === 'audio' || activeType === 'p2p_sender') {
       if (isPlaying) nativeAudio.pause(); else nativeAudio.play().catch(()=>{});
    } else if (activeType === 'youtube' && ytPlayer) {
       if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
    }
  });

  function updatePlayBtn() { mpPlay.textContent = isPlaying ? '⏸' : '▶'; }
  function setTrackInfo(title, sub) { mpTitle.textContent = title; mpSub.textContent = sub; }

  /* ── 📡 DEEP SYNC NETWORK ───────────────────────────────── */
  mpSyncBtn.addEventListener('click', () => {
    synced = true;
    mpSyncPill.textContent = '🟢 synced'; mpSyncPill.classList.add('synced');
    mpSyncBadge.textContent = '🟢 Listening together';
    mpSyncInfo.style.display = 'flex'; mpSyncBtn.style.display = 'none';
    showToast('🔗 Sync activated!');
    broadcastSync({ action: 'request_sync' });
  });

  mpUnsyncBtn.addEventListener('click', () => {
    synced = false; mpSyncBtn.style.display = ''; mpSyncInfo.style.display = 'none';
    mpSyncPill.textContent = '🔴 solo'; mpSyncPill.classList.remove('synced');
  });

  function broadcastSync(data) { if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data }); }

  // 📥 RECEIVER ENGINE
  window._zxReceiveSync = function (data) {
    
    if (data.action === 'request_sync') {
      if (synced) {
        if (activeType === 'p2p_sender') startKosmiStream(mpTitle.textContent);
        else if (queue.length > 0 && queue[currentIdx] && !queue[currentIdx].url.startsWith('blob:')) {
           broadcastSync({ action: 'change_song', item: queue[currentIdx] });
           setTimeout(() => {
              let curTime = 0;
              if (activeType === 'youtube' && ytPlayer) curTime = ytPlayer.getCurrentTime();
              else if (activeType === 'audio') curTime = nativeAudio.currentTime;
              broadcastSync({ action: isPlaying ? 'play' : 'pause', time: curTime });
           }, 1000);
        }
      }
      return;
    }

    if (!synced) return; 
    setRemoteAction();

    /* 🔥 BUG-FREE HD RECEIVER PIPELINE 🔥 */
    if (data.action === 'webrtc_offer') {
      showToast("📡 HD Stream Incoming...");
      activeType = 'p2p_receiver';
      if(rtcPeer) rtcPeer.close();
      
      iceQueue = []; 
      rtcPeer = new RTCPeerConnection(ICE_SERVERS);
      
      nativeAudio.style.display = 'block'; ytFrameWrap.style.display = 'none'; spFrameWrap.style.display = 'none';
      sliderWrap.style.display = 'flex'; 
      
      nativeAudio.src = ""; nativeAudio.srcObject = null;
      setTrackInfo(data.title || "Live Stream", "Fetching High Quality Frames...");

      rtcPeer.ontrack = e => {
        nativeAudio.srcObject = e.streams[0];
        nativeAudio.onloadedmetadata = () => {
            nativeAudio.play().then(() => {
                isPlaying = true; updatePlayBtn();
                setTrackInfo(data.title || "Live Stream", "▶ HD Stream Locked 🔒");
            }).catch(()=>{
                nativeAudio.muted = true;
                nativeAudio.play();
                showToast("⚠️ Browser Blocked Audio: Tap video to unmute!");
                nativeAudio.onclick = () => { nativeAudio.muted = false; showToast("🔊 Audio Unmuted"); };
                isPlaying = true; updatePlayBtn();
                setTrackInfo(data.title || "Live Stream", "▶ Stream (Muted)");
            });
        };
      };

      rtcPeer.onicecandidate = e => { if(e.candidate) broadcastSync({ action: 'webrtc_ice', candidate: e.candidate }); };
      
      rtcPeer.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => rtcPeer.createAnswer())
        .then(answer => { return rtcPeer.setLocalDescription(answer).then(() => answer); })
        .then(answer => {
          broadcastSync({ action: 'webrtc_answer', answer: answer });
          iceQueue.forEach(c => rtcPeer.addIceCandidate(c).catch(e => console.error(e)));
          iceQueue = [];
        });
      return;
    }
    
    if (data.action === 'webrtc_answer') { 
        if (rtcPeer) rtcPeer.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(e => console.error(e)); 
        return; 
    }
    
    if (data.action === 'webrtc_ice') { 
        if (rtcPeer) {
            const candidate = new RTCIceCandidate(data.candidate);
            if (rtcPeer.remoteDescription && rtcPeer.remoteDescription.type) {
                rtcPeer.addIceCandidate(candidate).catch(e => console.error(e));
            } else {
                iceQueue.push(candidate);
            }
        }
        return; 
    }

    if (data.action === 'sync_timeline' && activeType === 'p2p_receiver') {
        seekSlider.value = (data.cur / data.dur) * 100;
        timeDisplay.textContent = formatTime(data.cur);
        durDisplay.textContent = formatTime(data.dur);
        return;
    }

    if (data.action === 'remote_seek_percent' && activeType === 'p2p_sender') {
        if(nativeAudio.duration) {
            nativeAudio.currentTime = (data.percent / 100) * nativeAudio.duration;
            showToast("⏳ Partner seeked video!");
        }
        return;
    }

    if (data.action === 'remote_cmd' && activeType === 'p2p_sender') {
        if (data.cmd === 'play') { nativeAudio.play().catch(()=>{}); isPlaying = true; updatePlayBtn(); }
        if (data.cmd === 'pause') { nativeAudio.pause(); isPlaying = false; updatePlayBtn(); }
        return;
    }

    if (data.action === 'change_song') {
      let idx = queue.findIndex(q => q.url && q.url === data.item.url);
      if (idx === -1) { queue.push(data.item); idx = queue.length - 1; }
      currentIdx = idx; saveQueue(); renderQueue(); renderMedia(data.item);
      return;
    }

    if (activeType === 'youtube' && ytPlayer && isYtReady) {
      if (data.action === 'play') { ytPlayer.seekTo(data.time, true); ytPlayer.playVideo(); }
      if (data.action === 'pause') { ytPlayer.pauseVideo(); ytPlayer.seekTo(data.time, true); }
      if (data.action === 'seek') { ytPlayer.seekTo(data.time, true); }
    } else if (activeType === 'audio') {
      if (data.action === 'play') { nativeAudio.currentTime = data.time; nativeAudio.play().catch(()=>{}); }
      if (data.action === 'pause') { nativeAudio.currentTime = data.time; nativeAudio.pause(); }
      if (data.action === 'seek') { nativeAudio.currentTime = data.time; }
    }
  };

  renderQueue();
})();
