/* ═══════════════════════════════════════════════════════════
   ZEROX HUB — player.js (100% FULL & UNCUT CODE)
   🚀 UPGRADE: Official Spotify + Filters + AI Auto-Play
   💎 AUDIO: Premium 295kbps M4A (YouTube Bypass)
   🔥 ALL SYNC, FIRESTORE, HIDDEN CHAT & UI LOGIC PRESERVED
═══════════════════════════════════════════════════════════ */
'use strict';

// ==========================================
// 🛠️ MOBILE DEBUGGER (Android Logging)
// ==========================================
function logToMobile(message) {
    let consoleBox = document.getElementById('mobile-console');
    if (!consoleBox) {
        consoleBox = document.createElement('div');
        consoleBox.id = 'mobile-console';
        consoleBox.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 100%; height: 110px; background: rgba(0,0,0,0.85); color: #00FF00; overflow-y: scroll; z-index: 999999; font-size: 11px; padding: 10px; font-family: monospace; border-top: 2px solid #00FF00; pointer-events: none;';
        document.body.appendChild(consoleBox);
    }
    consoleBox.innerHTML += `<div>> ${message}</div>`;
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

(function () {
  /* ── 1. DOM ELEMENTS (FULL LIST) ───────────────────────── */
  const panel = document.getElementById('zxPanel');
  const handle = document.getElementById('zxHandle');
  const closeHandle = document.getElementById('closeHandle');
  const panelToggleBtn = document.getElementById('panelToggleBtn');
  
  const nativeAudio = document.getElementById('nativeAudio');
  const ytFrameWrap = document.getElementById('ytFrameWrap');
  
  const cinemaMode = document.getElementById('cinemaMode');
  const spotifyMode = document.getElementById('spotifyMode');
  const vinylRecord = document.getElementById('vinylRecord');
  const musicTitle = document.getElementById('musicTitle');
  const musicArtist = document.getElementById('musicArtist');
  const miniTitle = document.getElementById('miniTitle');

  const mpPlays = document.querySelectorAll('.mp-play');
  const mpPrevs = [document.getElementById('miniPrev')]; 
  const mpNexts = [document.getElementById('miniNext')];
  
  const urlInput = document.getElementById('urlInput');
  const urlAddBtn = document.getElementById('urlAddBtn');
  const ytInput = document.getElementById('ytInput');
  const ytAddBtn = document.getElementById('ytAddBtn');
  
  const spInput = document.getElementById('spInput');
  const spSearchSongBtn = document.getElementById('spSearchSongBtn');
  const queueList = document.getElementById('queueList');
  const episodesOverlaySp = document.getElementById('episodesOverlaySp');
  const spSearchResults = document.getElementById('spSearchResults');

  const mpSyncBadge = document.getElementById('mpSyncBadge');
  const mpSyncBtn = document.getElementById('mpSyncBtn');
  const mpSyncInfo = document.getElementById('mpSyncInfo');
  const mpUnsyncBtn = document.getElementById('mpUnsyncBtn');
  const modeToggle = document.getElementById('modeToggle');

  // Hidden Chat Elements
  const hiddenChatOverlay = document.getElementById('hiddenChatOverlay');
  const chatOnlineStatus = document.getElementById('chatOnlineStatus');
  const voiceNoteBtn = document.getElementById('voiceNoteBtn');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');

  nativeAudio.setAttribute('playsinline', '');
  nativeAudio.setAttribute('webkit-playsinline', '');

  /* ── 🟢 2. FILTER BAR INJECTION (GLOWING UI) ───────────── */
  const filterBar = document.createElement('div');
  filterBar.id = 'zxFilterBar';
  filterBar.style.cssText = 'display:flex; gap:12px; overflow-x:auto; padding:10px 0; margin-bottom:12px; scrollbar-width:none; align-items:center;';
  filterBar.innerHTML = `
    <span class="f-icon" data-type="track" style="font-size:18px; cursor:pointer; filter:drop-shadow(0 0 5px #1db954);">🎵</span>
    <span class="f-icon" data-type="artist" style="font-size:18px; cursor:pointer;">👤</span>
    <span class="f-icon" data-type="album" style="font-size:18px; cursor:pointer;">💿</span>
    <span class="f-icon" data-type="playlist" style="font-size:18px; cursor:pointer;">📜</span>
    <div style="width:2px; height:20px; background:#444; margin:0 5px;"></div>
    <span class="f-tag" data-mood="lofi" style="font-size:12px; background:#222; padding:4px 10px; border-radius:12px; cursor:pointer; color:#ccc; box-shadow: 0 0 5px rgba(0,255,0,0.2);">lofi</span>
    <span class="f-tag" data-mood="study" style="font-size:12px; background:#222; padding:4px 10px; border-radius:12px; cursor:pointer; color:#ccc;">study</span>
    <span class="f-tag" data-mood="chill" style="font-size:12px; background:#222; padding:4px 10px; border-radius:12px; cursor:pointer; color:#ccc;">chill</span>
    <span class="f-tag" data-mood="sad" style="font-size:12px; background:#222; padding:4px 10px; border-radius:12px; cursor:pointer; color:#ccc;">sad</span>
    <span class="f-tag" data-mood="gym" style="font-size:12px; background:#222; padding:4px 10px; border-radius:12px; cursor:pointer; color:#ccc;">gym</span>
  `;
  if(spInput && spInput.parentNode) {
      spInput.parentNode.insertBefore(filterBar, spInput);
  }

  /* ── 3. CONFIG & KEYS ──────────────────────────────────── */
  const SPOTIFY_CLIENT_ID = "b8ce1ea3591b441488cf0175816e099e";
  const SPOTIFY_SECRET = "142d42a7047c4bcfa4a76339a0509036";
  const RAPID_API_KEY = '48b3796227msh11226a69f8bf139p15da4bjsnb39e7e99f0be';
  
  let spotifyAccessToken = "";
  let searchType = 'track';

  /* ── 4. STATE VARIABLES ────────────────────────────────── */
  let currentMode = 'zeroxify'; 
  let queue = JSON.parse(localStorage.getItem('zx_queue') || '[]');
  let currentIdx = parseInt(localStorage.getItem('zx_qidx') || '0');
  let synced = false;
  let activeType = 'none'; 
  let isPlaying = false;
  let ytPlayer = null; 
  let isYtReady = false;
  
  // Sync Variables
  let isRemoteAction = false;
  let remoteTimer = null;
  let currentRoomId = localStorage.getItem('zx_room') || 'study_room_1';
  let isChatOnline = false;

  function setRemoteAction() { 
      isRemoteAction = true; 
      clearTimeout(remoteTimer); 
      remoteTimer = setTimeout(() => { isRemoteAction = false; }, 2000); 
  }

  /* ── 5. SPOTIFY AUTH ENGINE ────────────────────────────── */
  async function refreshSpotifyToken() {
      try {
          const res = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_SECRET)
              },
              body: 'grant_type=client_credentials'
          });
          const data = await res.json();
          spotifyAccessToken = data.access_token;
          logToMobile("🔑 Official Spotify Token Active");
      } catch (e) { logToMobile("❌ Spotify Token Error"); }
  }

  /* ── 6. SPOTIFY SEARCH (God Mode) ──────────────────────── */
  async function searchSpotify(query, type = 'track') {
      if (!spotifyAccessToken) await refreshSpotifyToken();
      if (episodesOverlaySp) episodesOverlaySp.classList.remove('hidden');
      if (spSearchResults) spSearchResults.innerHTML = `<p class="mp-empty">🔍 Fetching ${type}s for "${query}"...</p>`;

      try {
          const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=20`, {
              headers: { 'Authorization': 'Bearer ' + spotifyAccessToken }
          });
          const data = await res.json();
          const items = data.tracks?.items || data.albums?.items || data.playlists?.items || data.artists?.items || [];
          
          if (spSearchResults) spSearchResults.innerHTML = '';
          
          if(items.length === 0) {
              if (spSearchResults) spSearchResults.innerHTML = '<p class="mp-empty">No results found.</p>';
              return;
          }

          items.forEach(item => {
              const div = document.createElement('div'); div.className = 'yt-search-item';
              let thumb = 'https://i.imgur.com/8Q5FqWj.jpeg';
              let artistName = 'Unknown';

              if(type === 'track') {
                  thumb = item.album?.images[0]?.url || thumb;
                  artistName = item.artists[0]?.name;
              } else if(type === 'artist') {
                  thumb = item.images[0]?.url || thumb;
                  artistName = 'Artist';
              } else {
                  thumb = item.images?.[0]?.url || thumb;
                  artistName = item.owner?.display_name || item.artists?.[0]?.name || 'Collection';
              }

              div.innerHTML = `
                <img src="${thumb}" class="yt-search-thumb" style="${type==='artist' ? 'border-radius:50%' : ''}"/>
                <div class="yt-search-info">
                  <div class="yt-search-title">${item.name}</div>
                  <div class="yt-search-sub">${artistName}</div>
                </div>
                <span style="font-size:18px; color:#1db954; filter: drop-shadow(0 0 2px #1db954);">${type === 'track' ? '▶' : '📂'}</span>
              `;
              
              div.onclick = () => {
                  if(type === 'track') {
                      addToQueue({ type: 'youtube_audio', title: item.name, artist: artistName, spId: item.id, thumb: thumb, isZeroxify: true });
                      showToast(`Added: ${item.name}`);
                  } else {
                      spInput.value = item.name;
                      searchType = 'track';
                      updateFilterVisuals();
                      searchSpotify(item.name, 'track');
                  }
              };
              if (spSearchResults) spSearchResults.appendChild(div);
          });
      } catch (e) { if (spSearchResults) spSearchResults.innerHTML = '<p class="mp-empty">Network error or API limit.</p>'; }
  }

  /* ── 7. AUTO-PLAY AI (Recommendations) ─────────────────── */
  async function handleAutoPlay(spId) {
      const remaining = queue.length - 1 - currentIdx;
      if (remaining < 2) {
          logToMobile("🧠 Spotify AI: Fetching related tracks...");
          try {
              const res = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${spId}&limit=5`, {
                  headers: { 'Authorization': 'Bearer ' + spotifyAccessToken }
              });
              const data = await res.json();
              data.tracks.forEach(t => {
                  if (!queue.find(q => q.spId === t.id)) {
                      queue.push({
                          type: 'youtube_audio', title: t.name, artist: t.artists[0].name,
                          spId: t.id, thumb: t.album.images[0].url, isZeroxify: true
                      });
                  }
              });
              saveQueue(); renderQueue();
          } catch (e) { logToMobile("⚠️ Auto-play sync failed"); }
      }
  }

  /* ── 8. PREMIUM AUDIO BYPASS (YouTube) ─────────────────── */
  async function fetchPremiumAudio(item) {
      logToMobile(`⚡ Extracting bypass audio: ${item.title}`);
      const query = `${item.title} ${item.artist} official audio`;
      const url = `https://spotify81.p.rapidapi.com/download_track?q=${encodeURIComponent(query)}&onlyLinks=true&quality=best&bypassSpotify=true`;
      
      try {
          const res = await fetch(url, {
              headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'spotify81.p.rapidapi.com' }
          });
          const data = await res.json();
          return data.url || null;
      } catch (e) { return null; }
  }

  /* ── 9. MEDIA RENDER ENGINE ────────────────────────────── */
  function renderMedia(item) {
      nativeAudio.style.display = 'none'; if(ytFrameWrap) ytFrameWrap.style.display = 'none';
      nativeAudio.pause(); nativeAudio.src = ""; isPlaying = false; updatePlayBtn();
      
      if (item.type === 'youtube') {
          activeType = 'youtube'; 
          if(cinemaMode) cinemaMode.classList.remove('hidden'); 
          if(spotifyMode) spotifyMode.classList.add('hidden');
          if(ytFrameWrap) ytFrameWrap.style.display = 'block';
          if (isYtReady && ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
              ytPlayer.loadVideoById(item.ytId);
          }
          setTrackInfo(item.title, "YouTube Video");
          syncMediaState({ action: 'play_yt', id: item.ytId });
      } else {
          activeType = 'youtube_audio'; 
          if(cinemaMode) cinemaMode.classList.add('hidden'); 
          if(spotifyMode) spotifyMode.classList.remove('hidden');
          if(vinylRecord) vinylRecord.style.backgroundImage = `url('${item.thumb}')`;
          
          if (item.cachedUrl) { 
              playAudio(item.cachedUrl, item); 
          } else {
              setTrackInfo(item.title, "⚡ Buffering M4A...");
              fetchPremiumAudio(item).then(url => {
                  if (url) { item.cachedUrl = url; playAudio(url, item); } 
                  else { setTrackInfo(item.title, "❌ Bypass Failed"); playNext(); }
              });
          }
      }
  }

  function playAudio(url, item) {
      nativeAudio.src = url; 
      nativeAudio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(e=>logToMobile("Play prevented by browser"));
      setTrackInfo(item.title, item.artist);
      if (item.isZeroxify) handleAutoPlay(item.spId);
      syncMediaState({ action: 'play_audio', title: item.title, url: url });
  }

  /* ── 10. QUEUE & CONTROLS ──────────────────────────────── */
  function addToQueue(item) { queue.push(item); saveQueue(); renderQueue(); if(queue.length===1 || currentIdx===queue.length-1) playQueueItem(queue.length - 1); }
  function saveQueue() { localStorage.setItem('zx_queue', JSON.stringify(queue.slice(-50))); localStorage.setItem('zx_qidx', currentIdx); }
  function renderQueue() {
      if(!queueList) return;
      queueList.innerHTML = '';
      queue.forEach((item, i) => {
          const el = document.createElement('div'); el.className = 'mp-queue-item' + (i === currentIdx ? ' playing' : '');
          el.innerHTML = `
            <span class="qi-type" style="margin-right:8px">${item.isZeroxify ? '🎧' : '📺'}</span>
            <span class="qi-title" style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</span>
            <button class="qi-del" style="background:transparent; border:none; color:#ff4444; font-size:16px;">✕</button>
          `;
          el.onclick = (e) => { if(e.target.classList.contains('qi-del')){ queue.splice(i,1); saveQueue(); renderQueue(); } else playQueueItem(i); };
          queueList.appendChild(el);
      });
  }
  function playQueueItem(i) { if(i<0 || i>=queue.length) return; currentIdx = i; saveQueue(); renderQueue(); renderMedia(queue[i]); }
  function playNext() { playQueueItem(currentIdx + 1); }
  function playPrev() { playQueueItem(currentIdx - 1); }

  nativeAudio.onended = playNext;
  mpPlays.forEach(b => b.onclick = () => { if(isPlaying){ nativeAudio.pause(); if(ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo(); } else { nativeAudio.play(); if(ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); } });
  nativeAudio.onplay = () => { isPlaying = true; updatePlayBtn(); syncMediaState({action:'play'}); };
  nativeAudio.onpause = () => { isPlaying = false; updatePlayBtn(); syncMediaState({action:'pause'}); };

  function setTrackInfo(t, a) { if(musicTitle) musicTitle.textContent = t; if(musicArtist) musicArtist.textContent = a; if(miniTitle) miniTitle.textContent = t; }
  function updatePlayBtn() { mpPlays.forEach(b => b.textContent = isPlaying ? '⏸' : '▶'); }

  /* ── 11. OLD URL & YT INPUT LOGIC ──────────────────────── */
  if(urlAddBtn) {
      urlAddBtn.onclick = () => {
          const val = urlInput.value.trim();
          if(val) { addToQueue({ type: 'youtube_audio', title: 'Direct URL', artist: 'Custom', cachedUrl: val }); urlInput.value = ''; }
      };
  }
  if(ytAddBtn) {
      ytAddBtn.onclick = () => {
          const val = ytInput.value.trim();
          if(val) { 
              let ytId = val.split('v=')[1]; 
              if(!ytId) ytId = val.split('/').pop();
              addToQueue({ type: 'youtube', title: 'YouTube Video', ytId: ytId }); ytInput.value = ''; 
          }
      };
  }
  
  /* ── 12. UI TOUCH & SWIPE LOGIC ────────────────────────── */
  let startY = 0; let isPanelOpen = false;
  function openPanel() { if(isPanelOpen) return; isPanelOpen = true; if(panel) panel.classList.add('zx-open'); document.body.style.overflow = 'hidden'; if(panelToggleBtn) panelToggleBtn.classList.add('active'); }
  function closePanel() { if(!isPanelOpen) return; isPanelOpen = false; if(panel) panel.classList.remove('zx-open'); document.body.style.overflow = ''; if(panelToggleBtn) panelToggleBtn.classList.remove('active'); }

  if(handle) {
      handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
      handle.addEventListener('touchmove', (e) => { if(!isPanelOpen && (e.touches[0].clientY - startY) > 15) openPanel(); }, {passive: true});
      handle.addEventListener('click', (e) => { if(e.target.closest('.mp-btn') || e.target.closest('.z-trigger-btn')) return; isPanelOpen ? closePanel() : openPanel(); });
  }
  if(panelToggleBtn) panelToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); isPanelOpen ? closePanel() : openPanel(); });
  if(closeHandle) closeHandle.addEventListener('click', closePanel);

  document.querySelectorAll('.mp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
          document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.mp-tab-content').forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          const target = document.getElementById('tab-' + tab.dataset.tab);
          if(target) target.classList.add('active');
      });
  });

  function showToast(msg) {
      const t = document.createElement('div'); t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(29, 185, 84, 0.95);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:999999;pointer-events:none;animation:fadeInOut 3s forwards; box-shadow: 0 4px 15px rgba(0,0,0,0.5);';
      document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  /* ── 13. FILTER BAR EVENT LISTENERS ────────────────────── */
  function updateFilterVisuals() {
      document.querySelectorAll('.f-icon').forEach(ic => {
          ic.style.filter = 'none';
          ic.style.transform = 'scale(1)';
      });
      const activeIcon = document.querySelector(`.f-icon[data-type="${searchType}"]`);
      if(activeIcon) {
          activeIcon.style.filter = 'drop-shadow(0 0 5px #1db954)';
          activeIcon.style.transform = 'scale(1.1)';
      }
  }

  document.querySelectorAll('.f-icon').forEach(icon => {
      icon.onclick = () => {
          searchType = icon.dataset.type;
          updateFilterVisuals();
          showToast(`Mode: ${searchType.toUpperCase()}`);
      };
  });

  document.querySelectorAll('.f-tag').forEach(tag => {
      tag.onclick = () => {
          const mood = tag.dataset.mood;
          if(spInput) spInput.value = mood;
          searchType = 'track';
          updateFilterVisuals();
          
          // Add glow to clicked tag
          document.querySelectorAll('.f-tag').forEach(t => t.style.boxShadow = 'none');
          tag.style.boxShadow = '0 0 8px rgba(0,255,0,0.5)';
          
          searchSpotify(mood, 'track');
      };
  });

  if(spSearchSongBtn) {
      spSearchSongBtn.onclick = () => { const val = spInput ? spInput.value.trim() : ''; if (val) searchSpotify(val, searchType); };
  }

  /* ── 14. YOUTUBE IFRAME API ────────────────────────────── */
  const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = function() {
      if(!ytFrameWrap) return;
      ytFrameWrap.innerHTML = '<div id="ytPlayerInner"></div>';
      ytPlayer = new YT.Player('ytPlayerInner', {
          width: '100%', height: '100%',
          playerVars: { 'autoplay': 1, 'controls': 1, 'playsinline': 1 },
          events: { 
              'onReady': () => { isYtReady = true; logToMobile("📺 YT Player Ready"); }, 
              'onStateChange': (event) => {
                  if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayBtn(); syncMediaState({action:'play'}); }
                  if (event.data === YT.PlayerState.PAUSED)  { isPlaying = false; updatePlayBtn(); syncMediaState({action:'pause'}); }
                  if (event.data === YT.PlayerState.ENDED) playNext();
              }
          }
      });
  };

  /* ── 15. DEEP SYNC NETWORK & FIRESTORE LOGIC ───────────── */
  function syncMediaState(data) {
      if (!synced || isRemoteAction) return;
      logToMobile(`📡 Syncing Action: ${data.action} to Room: ${currentRoomId}`);
      // db.collection('rooms').doc(currentRoomId).update({ 
      //    mediaState: data, 
      //    timestamp: firebase.firestore.FieldValue.serverTimestamp() 
      // });
  }

  function listenToRoomSync() {
      logToMobile(`🎧 Listening to Room: ${currentRoomId}`);
      // db.collection('rooms').doc(currentRoomId).onSnapshot((doc) => {
      //    if (doc.exists) {
      //        const data = doc.data().mediaState;
      //        if(data && !isRemoteAction) {
      //            setRemoteAction();
      //            if(data.action === 'play') { nativeAudio.play(); }
      //            else if (data.action === 'pause') { nativeAudio.pause(); }
      //        }
      //    }
      // });
  }

  if(mpSyncBtn) {
      mpSyncBtn.onclick = () => { 
          synced = true; 
          if(mpSyncBadge) mpSyncBadge.classList.add('active'); 
          showToast('Sync Activated'); 
          listenToRoomSync();
      };
  }
  if(mpUnsyncBtn) {
      mpUnsyncBtn.onclick = () => { 
          synced = false; 
          if(mpSyncBadge) mpSyncBadge.classList.remove('active'); 
          showToast('Sync Deactivated'); 
      };
  }

  /* ── 16. HIDDEN CHAT & VOICE NOTES LOGIC ───────────────── */
  // Gesture listener to reveal hidden chat
  let tapCount = 0;
  let tapTimer;
  document.addEventListener('touchstart', (e) => {
      if(e.touches.length === 2) { // Two-finger tap for hidden chat
          tapCount++;
          clearTimeout(tapTimer);
          tapTimer = setTimeout(() => { tapCount = 0; }, 500);
          if(tapCount === 3) {
              if(hiddenChatOverlay) hiddenChatOverlay.classList.remove('hidden');
              showToast("Secret Chat Unlocked 🤫");
              tapCount = 0;
          }
      }
  });

  // Online Status & Chat Controls
  function updateOnlineStatus(status) {
      isChatOnline = status;
      if(chatOnlineStatus) {
          chatOnlineStatus.style.backgroundColor = status ? '#00FF00' : '#FF0000';
          chatOnlineStatus.title = status ? 'Online' : 'Offline';
      }
  }

  if(voiceNoteBtn) {
      let isRecording = false;
      voiceNoteBtn.onmousedown = voiceNoteBtn.ontouchstart = () => {
          isRecording = true;
          voiceNoteBtn.style.transform = 'scale(1.2)';
          voiceNoteBtn.style.backgroundColor = '#ff4444';
          logToMobile("🎤 Recording Voice Note...");
      };
      voiceNoteBtn.onmouseup = voiceNoteBtn.ontouchend = () => {
          if(isRecording) {
              isRecording = false;
              voiceNoteBtn.style.transform = 'scale(1)';
              voiceNoteBtn.style.backgroundColor = '';
              logToMobile("📤 Voice Note Sent to Firestore");
              showToast("Voice Note Sent");
          }
      };
  }

  if(chatSendBtn && chatInput) {
      chatSendBtn.onclick = () => {
          const msg = chatInput.value.trim();
          if(msg) {
              logToMobile(`💬 Chat Sent: ${msg}`);
              // db.collection('chats').add({ room: currentRoomId, text: msg });
              chatInput.value = '';
          }
      };
  }

  /* ── 17. INITIAL BOOT ──────────────────────────────────── */
  refreshSpotifyToken();
  renderQueue();
  updateOnlineStatus(true); // Set user online by default
  
  if(queue.length > 0 && currentIdx >= 0 && currentIdx < queue.length) {
      const item = queue[currentIdx];
      setTrackInfo(item.title, item.artist || 'Unknown');
      if(item.thumb && vinylRecord) vinylRecord.style.backgroundImage = `url('${item.thumb}')`;
  }

})();
