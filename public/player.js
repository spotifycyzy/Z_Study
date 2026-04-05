/* ═══════════════════════════════════════════════════════════
   MUSIC PLAYER — player.js (Smooth Sync Edition)
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const nativeAudio = document.getElementById('nativeAudio');
  const mpPlay = document.getElementById('mpPlay');
  let synced = false;
  let isPlaying = false;

  function broadcastSync(data) {
    if (window._zxSendSync) window._zxSendSync({ type: 'musicSync', ...data });
  }

  window._zxReceiveSync = function (data) {
    if (data.action === 'audio') {
        nativeAudio.src = data.url;
        nativeAudio.play();
    }
    
    // Sync Logic: drift check to prevent stuttering
    if (data.action === 'seek' || data.action === 'play') {
      const diff = Math.abs(nativeAudio.currentTime - data.time);
      if (diff > 1.5) { 
        nativeAudio.currentTime = data.time || 0;
      }
      if (data.action === 'play') nativeAudio.play().catch(()=>{});
    }
    if (data.action === 'pause') nativeAudio.pause();
  };

  mpPlay.addEventListener('click', () => {
    if (nativeAudio.paused) {
      nativeAudio.play();
      broadcastSync({ action: 'play', time: nativeAudio.currentTime });
    } else {
      nativeAudio.pause();
      broadcastSync({ action: 'pause' });
    }
  });

  // Periodically update others on position without being aggressive
  nativeAudio.addEventListener('play', () => {
    setInterval(() => {
        if(!nativeAudio.paused) broadcastSync({ action: 'seek', time: nativeAudio.currentTime });
    }, 5000);
  });
})();
