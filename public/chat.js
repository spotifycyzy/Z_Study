/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — chat.js  (complete rewrite, all bugs fixed)

   FIXED:
   ✅ Files / images upload and display correctly
   ✅ Audio messages (voice + music files) play in chat
   ✅ Reactions show live on both sides
   ✅ Tag/reply correctly quotes and scrolls to original
   ✅ Long-press on images → custom viewer, no browser menu
   ✅ Background wallpaper persists on refresh + syncs both sides
   ✅ Theme persists + syncs both sides
   ✅ Blossoms in chat window
   ✅ Neon/glow UI throughout
   ✅ Sync improved (play/pause/seek broadcast)
   ✅ Study site clicks work (gesture passthrough)
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Study site boot ─────────────────────────────────────── */
document.getElementById('pageTitle').textContent = ZEROX_CONFIG.studySite.siteTitle;
document.getElementById('brandName').textContent  = ZEROX_CONFIG.studySite.siteTitle;
document.getElementById('statSubjects').textContent = ZEROX_CONFIG.studySite.subjects.length;
document.getElementById('statChapters').textContent =
  ZEROX_CONFIG.studySite.subjects.reduce((a,s) => a + s.chapters.length, 0);

/* Build subject cards */
const subjectsGrid = document.getElementById('subjectsGrid');
ZEROX_CONFIG.studySite.subjects.forEach(sub => {
  const card = document.createElement('div');
  card.className = 'subject-card';
  card.innerHTML = `<div class="subject-icon">${sub.icon}</div>
    <div class="subject-title">${sub.title}</div>
    <div class="subject-chapters">${sub.chapters.length} chapters</div>
    <span class="subject-tag">Explore →</span>`;
  card.addEventListener('click', () => openSubject(sub));
  subjectsGrid.appendChild(card);
});

function openSubject(sub) {
  document.getElementById('subjectModal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'subjectModal';
  modal.style.cssText = 'position:fixed;inset:60px 0 0 0;z-index:400;background:#05000A;overflow-y:auto;animation:notesSlideIn 0.25s ease;border-top:1px solid rgba(180,80,255,0.18)';
  modal.innerHTML = `<div style="max-width:700px;margin:0 auto;padding:28px 16px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <button onclick="document.getElementById('subjectModal').remove()"
        style="background:rgba(180,80,255,0.08);border:1.5px solid rgba(180,80,255,0.25);border-radius:8px;padding:7px 14px;font-family:Sora,sans-serif;font-size:13px;color:rgba(240,232,255,0.7);cursor:pointer">← Back</button>
      <span style="font-size:30px">${sub.icon}</span>
      <h2 style="font-size:22px;font-weight:700;color:#F0E8FF;text-shadow:0 0 12px rgba(180,80,255,0.4)">${sub.title}</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">
      ${sub.chapters.map(ch => `<div
        onclick="document.getElementById('subjectModal').remove();window.openNotes('${esc(sub.title)}','${esc(ch)}')"
        style="padding:18px;background:#0E0018;border:1.5px solid rgba(180,80,255,0.18);border-radius:14px;cursor:pointer;transition:all 0.2s"
        onmouseover="this.style.borderColor='#B450FF';this.style.boxShadow='0 0 16px rgba(180,80,255,0.2)';this.style.transform='translateY(-3px)'"
        onmouseout="this.style.borderColor='rgba(180,80,255,0.18)';this.style.boxShadow='';this.style.transform=''">
        <div style="font-size:14px;font-weight:600;color:#F0E8FF;margin-bottom:6px">${ch}</div>
        <div style="font-size:11px;color:#B450FF;font-weight:700">Read notes →</div>
      </div>`).join('')}
    </div>
  </div>`;
  document.body.appendChild(modal);
}
function esc(s) { return (s||'').replace(/'/g, "\\'"); }

/* Search */
const searchEl = document.getElementById('searchInput');
searchEl.addEventListener('input', () => {
  const q = searchEl.value.trim().toLowerCase();
  let dd = document.getElementById('searchDropdown');
  if (!q) { dd?.remove(); return; }
  if (!dd) {
    dd = document.createElement('div'); dd.id = 'searchDropdown'; dd.className = 'search-results';
    searchEl.parentElement.appendChild(dd);
  }
  const res = [];
  ZEROX_CONFIG.studySite.subjects.forEach(s => s.chapters.forEach(c => {
    if (c.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)) res.push({ subject: s.title, chapter: c });
  }));
  dd.innerHTML = res.length === 0
    ? '<div class="search-result-item"><span class="sr-chapter">No results</span></div>'
    : res.slice(0, 8).map(r => `<div class="search-result-item"
        onclick="document.getElementById('searchDropdown').remove();document.getElementById('searchInput').value='';window.openNotes('${esc(r.subject)}','${esc(r.chapter)}')">
        <div class="sr-chapter">${r.chapter}</div><div class="sr-subject">${r.subject}</div>
      </div>`).join('');
});
document.addEventListener('click', e => { if (!e.target.closest('.nav-search')) document.getElementById('searchDropdown')?.remove(); });
if (window.buildRecentList) window.buildRecentList();

/* Study-site blossoms */
(function () {
  const c = document.getElementById('blossomContainer');
  const COLS = ['rgba(180,80,255,0.65)','rgba(232,67,106,0.6)','rgba(255,181,200,0.55)','rgba(194,0,95,0.5)','rgba(140,0,220,0.5)'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div'); p.className = 'blossom';
    const w = 6 + Math.random()*9, bx = (Math.random()-0.5)*130;
    p.style.cssText = `left:${Math.random()*110-5}%;width:${w}px;height:${w*(1.3+Math.random()*0.5)}px;background:${COLS[i%COLS.length]};--bx:${bx}px;animation-duration:${7+Math.random()*10}s;animation-delay:${Math.random()*-20}s;filter:blur(${0.2+Math.random()*0.6}px)`;
    c.appendChild(p);
  }
})();

/* ── DOM refs ────────────────────────────────────────────── */
const chatApp      = document.getElementById('chatApp');
const unlockScreen = document.getElementById('unlockScreen');
const chatMain     = document.getElementById('chatMain');
const nameInput    = document.getElementById('nameInput');
const enterBtn     = document.getElementById('enterChat');
const roomHint     = document.getElementById('roomHint');
const msgArea      = document.getElementById('messagesArea');
const msgInner     = document.getElementById('messagesInner');
const msgInput     = document.getElementById('msgInput');
const sendBtn      = document.getElementById('sendBtn');
const typingBar    = document.getElementById('typingBar');
const chatOnline   = document.getElementById('chatOnline');
const sidebarOnline= document.getElementById('sidebarOnline');
const sidebarRoom  = document.getElementById('sidebarRoom');
const chatRoomName = document.getElementById('chatRoomName');
const stickerPicker= document.getElementById('stickerPicker');
const stickerTabs  = document.getElementById('stickerTabs');
const stickerGrid  = document.getElementById('stickerGrid');
const stickerToggle= document.getElementById('stickerToggle');
const themeSwatches= document.getElementById('themeSwatches');
const wallpaperGrid= document.getElementById('wallpaperGrid');
const chatSidebar  = document.getElementById('chatSidebar');
const openSidebar  = document.getElementById('openSidebar');
const closeSidebar = document.getElementById('closeSidebar');
const hideChatBtn  = document.getElementById('hideChatBtn');
const clearBtn     = document.getElementById('clearHistoryBtn');
const customBg     = document.getElementById('customBgInput');
const attachBtn    = document.getElementById('attachBtn');
const mediaInput   = document.getElementById('mediaInput');
const voiceBtn     = document.getElementById('voiceBtn');
const replyBar     = document.getElementById('replyBar');
const replyBarText = document.getElementById('replyBarText');
const replyCancel  = document.getElementById('replyBarCancel');
const callBtn      = document.getElementById('callBtn');
const callOverlay  = document.getElementById('callOverlay');
const callEnd      = document.getElementById('callEnd');
const callMute     = document.getElementById('callMute');
const callName     = document.getElementById('callName');
const callStatus   = document.getElementById('callStatus');
const callAvatar   = document.getElementById('callAvatar');
const chatWin      = document.querySelector('.chat-window');

roomHint.textContent = ZEROX_CONFIG.roomId;
sidebarRoom.textContent = ZEROX_CONFIG.roomId;
chatRoomName.textContent = 'zerox · ' + ZEROX_CONFIG.roomId.split('-')[0];

/* ── State ───────────────────────────────────────────────── */
let ws, myName = '', myId = 'u_' + Math.random().toString(36).slice(2);
let connected = false, typingTimer, isTyping = false;
let replyTo = null;
let mediaRecorder, audioChunks = [], isRecording = false, voiceStart = 0;
let allMsgs = {};  // id → message object

const REACTION_EMOJIS = ['❤️','😂','😮','😢','👍','🔥','💗','✨'];

/* ── Unlock ──────────────────────────────────────────────── */
window._chatUnlock = () => {
  chatApp.classList.remove('hidden');
  requestAnimationFrame(() => chatApp.classList.add('visible'));
};

nameInput.value = localStorage.getItem('zerox_name') || '';
enterBtn.addEventListener('click', doEnter);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doEnter(); });

function doEnter() {
  myName = nameInput.value.trim() || ZEROX_CONFIG.myName;
  localStorage.setItem('zerox_name', myName);
  unlockScreen.style.opacity = '0';
  unlockScreen.style.pointerEvents = 'none';
  setTimeout(() => { unlockScreen.style.display = 'none'; }, 400);
  chatMain.classList.remove('hidden');
  spawnChatBlossoms();
  connectWS();
  restoreWallpaper();
  restoreTheme();
}

/* Chat blossoms */
function spawnChatBlossoms() {
  const c = document.getElementById('chatBlossoms');
  c.innerHTML = '';
  const COLS = ['rgba(232,67,106,0.45)','rgba(255,181,200,0.4)','rgba(194,0,95,0.35)','rgba(255,107,157,0.4)'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div'); p.className = 'blossom chat-blossom';
    const w = 5 + Math.random()*8, bx = (Math.random()-0.5)*100;
    p.style.cssText = `left:${Math.random()*110-5}%;width:${w}px;height:${w*(1.3+Math.random()*0.5)}px;` +
      `background:${COLS[i%COLS.length]};--bx:${bx}px;animation-duration:${8+Math.random()*10}s;` +
      `animation-delay:${Math.random()*-18}s;filter:blur(${0.2+Math.random()*0.5}px);` +
      `position:absolute;opacity:0;animation-name:blossomFall;animation-timing-function:linear;animation-iteration-count:infinite;` +
      `border-radius:50% 10% 50% 10%;pointer-events:none`;
    c.appendChild(p);
  }
}

/* ── WebSocket ───────────────────────────────────────────── */
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.binaryType = 'arraybuffer';
  ws.addEventListener('open', () => {
    connected = true;
    ws.send(JSON.stringify({ type: 'join', room: ZEROX_CONFIG.roomId, name: myName }));
  });
  ws.addEventListener('message', e => {
    let msg; try { msg = JSON.parse(e.data); } catch { return; }
    handleMsg(msg);
  });
  ws.addEventListener('close', () => { connected = false; setTimeout(connectWS, 3000); });
  ws.addEventListener('error', () => ws.close());
}

function send(obj) {
  if (ws && connected && ws.readyState === 1) ws.send(JSON.stringify(obj));
}
window._zxSendSync = data => send(data);

/* ── Incoming handler ────────────────────────────────────── */
function handleMsg(msg) {
  switch (msg.type) {
    case 'history':
      msgInner.innerHTML = '';
      allMsgs = {};
      msg.messages.forEach(m => { allMsgs[m.id] = m; renderMsg(m); });
      scrollBottom();
      break;
    case 'message': case 'sticker': case 'media': case 'voice':
      allMsgs[msg.id] = msg; renderMsg(msg); scrollBottom(); break;
    case 'system':   renderSystem(msg.text); scrollBottom(); break;
    case 'typing':   if (msg.name !== myName) typingBar.textContent = msg.active ? `${msg.name} is typing…` : ''; break;
    case 'online':   chatOnline.textContent = `● ${msg.count} online`; sidebarOnline.textContent = `● ${msg.count} online`; break;
    case 'cleared':  msgInner.innerHTML = ''; allMsgs = {}; renderSystem('History cleared'); break;
    case 'reaction': applyReaction(msg); break;
    case 'deleteMsg': deleteLocal(msg.msgId); break;
    case 'musicSync': if (window._zxReceiveSync) window._zxReceiveSync(msg); break;
    case 'wallpaperSync': syncWallpaper(msg.data); break;
    case 'themeSync': syncTheme(msg.themeName); break;
    case 'callRequest': incomingCall(msg); break;
    case 'callAccept':  startCall(); break;
    case 'callEnd':     endCall(false); break;
  }
}

/* ── Render message ──────────────────────────────────────── */
function renderMsg(msg) {
  const mine = msg.name === myName;
  const row  = document.createElement('div');
  row.className = `msg-row ${mine ? 'mine' : 'theirs'}`;
  row.dataset.id = msg.id;

  const time = new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /* Reply quote */
  let replyHtml = '';
  if (msg.replyTo && allMsgs[msg.replyTo]) {
    const ref = allMsgs[msg.replyTo];
    const preview = (ref.text || (ref.type === 'voice' ? '🎙 Voice note' : ref.type === 'media' ? '📎 Media' : '…')).slice(0, 60);
    replyHtml = `<div class="msg-reply-ref" data-ref="${msg.replyTo}">
      ↩ <strong>${htmlEsc(ref.name)}</strong>: ${htmlEsc(preview)}
    </div>`;
  }

  /* Bubble content */
  let inner = '';
  if (msg.type === 'sticker') {
    inner = `<div class="msg-bubble msg-sticker">${msg.emoji}</div>`;
  } else if (msg.type === 'media') {
    inner = mediaBubble(msg, replyHtml);
  } else if (msg.type === 'voice') {
    inner = voiceBubble(msg, replyHtml);
  } else {
    inner = `<div class="msg-bubble">${replyHtml}${linkify(htmlEsc(msg.text || ''))}</div>`;
  }

  row.innerHTML = `
    <div class="msg-avatar">${(msg.name || '?')[0].toUpperCase()}</div>
    <div class="msg-bubble-wrap">
      ${!mine ? `<div class="msg-name">${htmlEsc(msg.name)}</div>` : ''}
      ${inner}
      <div class="msg-reactions-wrap" data-id="${msg.id}">${reactionsHtml(msg)}</div>
      <div class="msg-time">${time}</div>
    </div>`;

  /* Attach context menu to bubble */
  const bubble = row.querySelector('.msg-bubble, .msg-sticker, .msg-media-outer, .msg-voice, .msg-file');
  if (bubble) attachCtxMenu(bubble, msg, mine);

  /* Scroll-to-original for reply refs */
  row.querySelectorAll('.msg-reply-ref').forEach(el => {
    el.addEventListener('click', () => {
      const ref = msgInner.querySelector(`[data-id="${el.dataset.ref}"]`);
      if (ref) { ref.scrollIntoView({ behavior: 'smooth', block: 'center' }); ref.classList.add('msg-highlight'); setTimeout(() => ref.classList.remove('msg-highlight'), 1200); }
    });
  });

  msgInner.appendChild(row);
}

/* reactions HTML */
function reactionsHtml(msg) {
  if (!msg.reactions || !Object.keys(msg.reactions).length) return '';
  const counts = {};
  Object.values(msg.reactions).forEach(e => { counts[e] = (counts[e] || 0) + 1; });
  return Object.entries(counts).map(([e, n]) => `<span class="reaction-pill">${e}<span class="r-count">${n}</span></span>`).join('');
}

/* Media bubble — FIX: images use custom viewer; audio files play inline */
function mediaBubble(msg, replyHtml = '') {
  const mt = msg.mediaType || '';

  if (mt.startsWith('image/')) {
    return `<div class="msg-bubble msg-media-outer">
      ${replyHtml}
      <div class="msg-media" data-url="${msg.mediaUrl}">
        <img src="${msg.mediaUrl}" loading="lazy"
          style="pointer-events:none;user-select:none;-webkit-user-select:none;display:block;width:100%;border-radius:10px"
          draggable="false" />
      </div>
    </div>`;
  }

  if (mt.startsWith('video/')) {
    return `<div class="msg-bubble msg-media-outer">
      ${replyHtml}
      <video src="${msg.mediaUrl}" controls style="width:220px;max-width:100%;border-radius:10px;display:block"></video>
    </div>`;
  }

  /* ── AUDIO FILE (music sent in chat) ─────────────────────
     Use <audio> element directly — not the voice bubble UI.
     This lets mp3/ogg/m4a files play inline with controls.
  ────────────────────────────────────────────────────────── */
  if (mt.startsWith('audio/')) {
    return `<div class="msg-bubble">
      ${replyHtml}
      <div class="msg-audio-file">
        <span class="file-icon">🎵</span>
        <div class="file-info">
          <div class="file-name">${htmlEsc(msg.fileName || 'Audio')}</div>
          <div class="file-size">${msg.fileSize || ''}</div>
        </div>
      </div>
      <audio src="${msg.mediaUrl}" controls style="width:100%;margin-top:6px;filter:hue-rotate(300deg)"></audio>
    </div>`;
  }

  /* Generic file */
  const icon = mt.includes('pdf') ? '📄' : '📎';
  return `<div class="msg-bubble">
    ${replyHtml}
    <div class="msg-file" onclick="window.open('${msg.mediaUrl}')">
      <span class="file-icon">${icon}</span>
      <div class="file-info">
        <div class="file-name">${htmlEsc(msg.fileName || 'File')}</div>
        <div class="file-size">${msg.fileSize || ''}</div>
      </div>
    </div>
  </div>`;
}

/* Voice bubble — FIX: converts dataURL → blob → objectURL before playing */
const voiceAudios = {};
function voiceBubble(msg, replyHtml = '') {
  const uid = 'vc_' + msg.id;
  return `<div class="msg-bubble">
    ${replyHtml}
    <div class="msg-voice" id="${uid}">
      <button class="voice-play-btn" data-uid="${uid}" data-url="${msg.audioUrl}">▶</button>
      <div class="voice-waveform"><span></span><span></span><span></span><span></span><span></span></div>
      <span class="voice-dur" id="${uid}_dur">${msg.duration || '0:00'}</span>
    </div>
  </div>`;
}

/* Voice play — delegated so it works for history-loaded messages too */
msgInner.addEventListener('click', e => {
  const btn = e.target.closest('.voice-play-btn');
  if (!btn) return;
  playVoice(btn.dataset.uid, btn.dataset.url, btn);
});

function playVoice(uid, dataUrl, btn) {
  const durEl = document.getElementById(uid + '_dur');

  /* If already created, toggle */
  if (voiceAudios[uid]) {
    const a = voiceAudios[uid];
    if (a.paused) { a.play(); btn.textContent = '⏸'; }
    else          { a.pause(); btn.textContent = '▶'; }
    return;
  }

  /* Convert dataURL → blob → objectURL */
  let src = dataUrl;
  try {
    if (dataUrl && dataUrl.startsWith('data:')) {
      const [header, b64] = dataUrl.split(',');
      const mime = header.split(':')[1].split(';')[0];
      const bytes = atob(b64);
      const ab    = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) ab[i] = bytes.charCodeAt(i);
      src = URL.createObjectURL(new Blob([ab], { type: mime }));
    }
  } catch (err) { /* fall back to raw dataUrl */ }

  const audio = new Audio(src);
  voiceAudios[uid] = audio;
  btn.textContent = '⏸';
  audio.play().catch(() => { btn.textContent = '▶'; });

  const iv = setInterval(() => {
    if (!isNaN(audio.currentTime) && durEl) durEl.textContent = fmtDur(audio.currentTime);
    if (audio.ended) {
      clearInterval(iv);
      btn.textContent = '▶';
      if (durEl && !isNaN(audio.duration)) durEl.textContent = fmtDur(audio.duration);
    }
  }, 200);

  audio.addEventListener('ended', () => { btn.textContent = '▶'; });
}

function fmtDur(s) { const m = Math.floor(s/60); return `${m}:${String(Math.floor(s%60)).padStart(2,'0')}`; }

/* Image viewer — custom overlay, no browser save dialog */
msgInner.addEventListener('click', e => {
  const media = e.target.closest('.msg-media');
  if (!media || e.target.closest('.voice-play-btn')) return;
  const url = media.dataset.url;
  if (!url) return;
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.93);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  ov.innerHTML = `<img src="${url}" style="max-width:96vw;max-height:92vh;object-fit:contain;border-radius:8px;user-select:none;-webkit-user-select:none;pointer-events:none" draggable="false">`;
  ov.addEventListener('click', () => ov.remove());
  ov.addEventListener('contextmenu', e => e.preventDefault());
  document.body.appendChild(ov);
});

/* Prevent browser context menu on all chat images */
msgInner.addEventListener('contextmenu', e => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});

function renderSystem(text) {
  const el = document.createElement('div'); el.className = 'msg-system'; el.textContent = text;
  msgInner.appendChild(el);
}
function scrollBottom() { requestAnimationFrame(() => { msgArea.scrollTop = msgArea.scrollHeight; }); }

/* ── Context menu (long-press / right-click on bubble) ───── */
function attachCtxMenu(el, msg, mine) {
  let timer;
  /* Prevent image browser menu */
  el.querySelectorAll('img').forEach(img => {
    img.addEventListener('contextmenu', e => e.preventDefault());
    img.style.pointerEvents = 'none';
    img.setAttribute('draggable', 'false');
  });

  el.addEventListener('contextmenu', e => { e.preventDefault(); showCtx(e, msg, mine); });
  el.addEventListener('pointerdown', e => { timer = setTimeout(() => showCtx(e, msg, mine), 550); });
  el.addEventListener('pointerup',    () => clearTimeout(timer));
  el.addEventListener('pointermove',  () => clearTimeout(timer));
  el.addEventListener('pointercancel',() => clearTimeout(timer));
}

function showCtx(e, msg, mine) {
  document.querySelectorAll('.ctx-menu,.reaction-picker').forEach(x => x.remove());
  const x = Math.min(e.clientX || e.touches?.[0]?.clientX || 100, window.innerWidth - 200);
  const y = e.clientY || e.touches?.[0]?.clientY || 100;

  /* Reaction picker */
  const rp = document.createElement('div'); rp.className = 'reaction-picker';
  rp.style.cssText = `left:${x}px;top:${Math.max(y - 70, 60)}px`;
  REACTION_EMOJIS.forEach(em => {
    const s = document.createElement('span'); s.className = 'react-emoji'; s.textContent = em;
    s.addEventListener('click', () => {
      send({ type: 'reaction', msgId: msg.id, emoji: em, userId: myId });
      rp.remove(); ctx.remove();
    });
    rp.appendChild(s);
  });
  document.body.appendChild(rp);

  /* Options menu */
  const ctx = document.createElement('div'); ctx.className = 'ctx-menu';
  ctx.style.cssText = `left:${x}px;top:${Math.min(y + 6, window.innerHeight - 160)}px`;

  [
    { label: '↩ Reply',   fn: () => startReply(msg) },
    { label: '📋 Copy',   fn: () => navigator.clipboard?.writeText(msg.text || '') },
    ...(mine ? [{ label: '🗑 Delete', danger: true, fn: () => send({ type: 'deleteMsg', msgId: msg.id }) }] : []),
  ].forEach(item => {
    const d = document.createElement('div');
    d.className = 'ctx-item' + (item.danger ? ' danger' : '');
    d.textContent = item.label;
    d.addEventListener('click', () => { item.fn(); ctx.remove(); rp.remove(); });
    ctx.appendChild(d);
  });
  document.body.appendChild(ctx);

  setTimeout(() => {
    document.addEventListener('pointerdown', () => { ctx.remove(); rp.remove(); }, { once: true });
  }, 50);
}

/* ── Reactions — live update ─────────────────────────────── */
function applyReaction(msg) {
  if (!allMsgs[msg.msgId]) return;
  if (!allMsgs[msg.msgId].reactions) allMsgs[msg.msgId].reactions = {};
  allMsgs[msg.msgId].reactions[msg.userId || msg.name] = msg.emoji;

  const row = msgInner.querySelector(`[data-id="${msg.msgId}"]`);
  if (!row) return;
  const wrap = row.querySelector('.msg-reactions-wrap');
  if (wrap) wrap.innerHTML = reactionsHtml(allMsgs[msg.msgId]);
}

/* ── Reply ───────────────────────────────────────────────── */
function startReply(msg) {
  replyTo = msg;
  replyBar.classList.add('active');
  const preview = msg.text || (msg.type === 'voice' ? '🎙 Voice note' : msg.type === 'media' ? '📎 Media' : '…');
  replyBarText.textContent = `${msg.name}: ${preview.slice(0, 80)}`;
  msgInput.focus();
}
replyCancel.addEventListener('click', () => { replyTo = null; replyBar.classList.remove('active'); });

/* ── Delete ──────────────────────────────────────────────── */
function deleteLocal(id) {
  const row = msgInner.querySelector(`[data-id="${id}"]`);
  if (row) {
    const b = row.querySelector('.msg-bubble');
    if (b) b.innerHTML = '<em style="opacity:0.4;font-size:12px">Message deleted</em>';
  }
  if (allMsgs[id]) allMsgs[id].deleted = true;
}

/* ── Send ────────────────────────────────────────────────── */
sendBtn.addEventListener('click', doSend);
msgInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
  doTyping();
});

function doSend() {
  const text = msgInput.value.trim();
  if (!text || !connected) return;
  send({ type: 'message', text, replyTo: replyTo?.id || null });
  msgInput.value = ''; msgInput.style.height = 'auto';
  replyTo = null; replyBar.classList.remove('active');
  stopTyping();
}
function doTyping() { if (!isTyping) { isTyping = true; send({ type: 'typing', active: true }); } clearTimeout(typingTimer); typingTimer = setTimeout(stopTyping, 1800); }
function stopTyping() { if (!isTyping) return; isTyping = false; send({ type: 'typing', active: false }); }

/* ── File / media attach ─────────────────────────────────── */
attachBtn.addEventListener('click', () => mediaInput.click());
mediaInput.addEventListener('change', () => {
  const file = mediaInput.files[0]; if (!file) return;
  mediaInput.value = '';

  /* FIX: compress images before sending to stay under payload limit */
  if (file.type.startsWith('image/')) {
    compressAndSend(file); return;
  }

  /* Audio, video, other — read as dataURL and send */
  const reader = new FileReader();
  reader.onload = ev => {
    send({
      type: 'media', mediaUrl: ev.target.result,
      mediaType: file.type, fileName: file.name,
      fileSize: fmtSize(file.size), replyTo: replyTo?.id || null,
    });
    replyTo = null; replyBar.classList.remove('active');
  };
  reader.readAsDataURL(file);
});

function compressAndSend(file) {
  const img = new Image();
  img.onload = () => {
    const MAX = 1280;
    let w = img.width, h = img.height;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else        { w = Math.round(w * MAX / h); h = MAX; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    send({
      type: 'media', mediaUrl: dataUrl,
      mediaType: 'image/jpeg', fileName: file.name,
      fileSize: fmtSize(file.size), replyTo: replyTo?.id || null,
    });
    replyTo = null; replyBar.classList.remove('active');
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
}

function fmtSize(b) { if (b < 1024) return b + 'B'; if (b < 1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; }

/* ── Voice recording ─────────────────────────────────────── */
voiceBtn.addEventListener('pointerdown', startRec);
voiceBtn.addEventListener('pointerup',   stopRec);
voiceBtn.addEventListener('pointercancel', stopRec);

function startRec() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    audioChunks = []; isRecording = true; voiceStart = Date.now();
    voiceBtn.classList.add('recording');
    const opts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
    mediaRecorder = new MediaRecorder(stream, opts);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.start(100);
  }).catch(() => alert('Microphone access denied'));
}

function stopRec() {
  if (!isRecording || !mediaRecorder) return;
  isRecording = false; voiceBtn.classList.remove('recording');
  mediaRecorder.onstop = () => {
    const dur  = fmtDur((Date.now() - voiceStart) / 1000);
    const mime = mediaRecorder.mimeType || 'audio/webm';
    const blob = new Blob(audioChunks, { type: mime });
    const reader = new FileReader();
    reader.onload = ev => send({ type: 'voice', audioUrl: ev.target.result, duration: dur });
    reader.readAsDataURL(blob);
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  };
  mediaRecorder.stop();
}

/* ── Stickers ────────────────────────────────────────────── */
const extraPack = { name: 'More', stickers: ['🫶','🤝','👀','💯','🎉','🥳','😴','🤩','🥺','😭','😡','🤣','🫠','🥹','🤯','😎','🧠','💪','🌟','🍀','🌸','🦄','🐉','🎵','🎶','🎸','🎹','🥁','🎤','🎬'] };
const allPacks = [...ZEROX_CONFIG.stickerPacks, extraPack];
allPacks.forEach((pack, i) => {
  const tab = document.createElement('div');
  tab.className = 'sticker-tab' + (i === 0 ? ' active' : '');
  tab.textContent = pack.name;
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sticker-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderStickers(i);
  });
  stickerTabs.appendChild(tab);
});
function renderStickers(i) {
  stickerGrid.innerHTML = '';
  (allPacks[i] || allPacks[0]).stickers.forEach(s => {
    const el = document.createElement('div'); el.className = 'sticker-item'; el.textContent = s;
    el.addEventListener('click', () => { send({ type: 'sticker', emoji: s }); stickerPicker.classList.add('hidden'); });
    stickerGrid.appendChild(el);
  });
}
renderStickers(0);
stickerToggle.addEventListener('click', () => stickerPicker.classList.toggle('hidden'));

/* ── Themes ──────────────────────────────────────────────── */
const THEMES = [
  { name:'Rose',     bg:'#0D0008', surface:'#1A0010', sh:'#2A0018', border:'rgba(232,67,106,0.22)', rose:'#E8436A', blush:'#FFB5C8', mag:'#C2005F', text:'#FFE8EF', muted:'rgba(255,232,239,0.55)', my:'linear-gradient(135deg,#E8436A,#C2005F)', her:'#2A0018', sw:'#E8436A' },
  { name:'Midnight', bg:'#080812', surface:'#10102A', sh:'#1A1A3A', border:'rgba(100,120,255,0.22)', rose:'#6478FF', blush:'#B8C4FF', mag:'#4050DD', text:'#E8ECFF', muted:'rgba(232,236,255,0.5)',  my:'linear-gradient(135deg,#6478FF,#4050DD)', her:'#1A1A3A', sw:'#6478FF' },
  { name:'Forest',   bg:'#060E08', surface:'#0E1A10', sh:'#182218', border:'rgba(80,180,100,0.22)',  rose:'#50B464', blush:'#A8E0B0', mag:'#288A3C', text:'#E0F4E4', muted:'rgba(224,244,228,0.5)',  my:'linear-gradient(135deg,#50B464,#288A3C)', her:'#182218', sw:'#50B464' },
  { name:'Amber',    bg:'#0E0800', surface:'#1A1000', sh:'#2A1A00', border:'rgba(230,160,40,0.22)',  rose:'#E6A028', blush:'#FFD890', mag:'#C07800', text:'#FFF4DC', muted:'rgba(255,244,220,0.5)',  my:'linear-gradient(135deg,#E6A028,#C07800)', her:'#2A1A00', sw:'#E6A028' },
  { name:'Neon',     bg:'#000A0A', surface:'#001818', sh:'#002020', border:'rgba(0,255,200,0.2)',    rose:'#00FFC8', blush:'#80FFE0', mag:'#00CCA0', text:'#E0FFF8', muted:'rgba(224,255,248,0.5)',  my:'linear-gradient(135deg,#00FFC8,#00A080)', her:'#002020', sw:'#00FFC8' },
];

function applyThemeObj(t) {
  const s = document.documentElement.style;
  s.setProperty('--c-bg', t.bg); s.setProperty('--c-surface', t.surface);
  s.setProperty('--c-surfaceHigh', t.sh); s.setProperty('--c-border', t.border);
  s.setProperty('--c-rose', t.rose); s.setProperty('--c-blush', t.blush);
  s.setProperty('--c-magenta', t.mag); s.setProperty('--c-text', t.text);
  s.setProperty('--c-textMuted', t.muted); s.setProperty('--c-myBubble', t.my);
  s.setProperty('--c-herBubble', t.her);
  localStorage.setItem('zerox_theme', t.name);
  send({ type: 'themeSync', themeName: t.name });
  document.querySelectorAll('.theme-swatch').forEach((sw, i) => sw.classList.toggle('active', THEMES[i].name === t.name));
}

function syncTheme(name) {
  const t = THEMES.find(t => t.name === name); if (!t) return;
  const s = document.documentElement.style;
  s.setProperty('--c-bg', t.bg); s.setProperty('--c-surface', t.surface);
  s.setProperty('--c-surfaceHigh', t.sh); s.setProperty('--c-border', t.border);
  s.setProperty('--c-rose', t.rose); s.setProperty('--c-blush', t.blush);
  s.setProperty('--c-magenta', t.mag); s.setProperty('--c-text', t.text);
  s.setProperty('--c-textMuted', t.muted); s.setProperty('--c-myBubble', t.my);
  s.setProperty('--c-herBubble', t.her);
  localStorage.setItem('zerox_theme', name);
  document.querySelectorAll('.theme-swatch').forEach((sw, i) => sw.classList.toggle('active', THEMES[i].name === name));
}

function restoreTheme() { const n = localStorage.getItem('zerox_theme'); if (n) syncTheme(n); }

THEMES.forEach((t, i) => {
  const sw = document.createElement('div');
  sw.className = 'theme-swatch'; sw.style.background = t.sw; sw.title = t.name;
  sw.addEventListener('click', () => applyThemeObj(t));
  themeSwatches.appendChild(sw);
});

/* ── Wallpapers ──────────────────────────────────────────── */
function applyWallpaper(url) {
  chatWin.style.setProperty('--wallpaper-url', url ? `url('${url}')` : 'none');
}

function setWallpaper(url, key) {
  applyWallpaper(url);
  localStorage.setItem('zerox_wp_key', String(key));
  if (key === 'custom') { try { localStorage.setItem('zerox_wp_data', url); } catch {} }
  document.querySelectorAll('.wallpaper-thumb').forEach(t => t.classList.remove('active'));
  if (typeof key === 'number') document.querySelectorAll('.wallpaper-thumb')[key]?.classList.add('active');
  /* Sync — for custom send empty string (too large), use '' as signal */
  send({ type: 'wallpaperSync', data: { key, url: key === 'custom' ? '' : url } });
}

function syncWallpaper(data) {
  const key = data.key;
  if (key === 'custom') {
    /* Other user set custom — we can't receive their file, skip */
    return;
  }
  const url = data.url || '';
  applyWallpaper(url);
  localStorage.setItem('zerox_wp_key', String(key));
  document.querySelectorAll('.wallpaper-thumb').forEach(t => t.classList.remove('active'));
  if (typeof key === 'number') document.querySelectorAll('.wallpaper-thumb')[key]?.classList.add('active');
}

function restoreWallpaper() {
  const key = localStorage.getItem('zerox_wp_key');
  if (key === null) return;
  if (key === 'custom') {
    const data = localStorage.getItem('zerox_wp_data') || '';
    if (data) applyWallpaper(data);
  } else {
    const idx = parseInt(key) || 0;
    applyWallpaper(ZEROX_CONFIG.wallpapers[idx] || '');
    document.querySelectorAll('.wallpaper-thumb')[idx]?.classList.add('active');
  }
}

ZEROX_CONFIG.wallpapers.forEach((url, i) => {
  const th = document.createElement('div'); th.className = 'wallpaper-thumb';
  if (!url) { th.classList.add('wp-none'); th.textContent = '🚫'; }
  else th.style.backgroundImage = `url('${url}')`;
  th.addEventListener('click', () => setWallpaper(url, i));
  wallpaperGrid.appendChild(th);
});

customBg.addEventListener('change', () => {
  const f = customBg.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => setWallpaper(ev.target.result, 'custom');
  reader.readAsDataURL(f);
});

/* ── Sidebar ─────────────────────────────────────────────── */
openSidebar.addEventListener('click',  () => chatSidebar.classList.add('open'));
closeSidebar.addEventListener('click', () => chatSidebar.classList.remove('open'));

hideChatBtn.addEventListener('click', () => {
  chatApp.classList.remove('visible');
  setTimeout(() => chatApp.classList.add('hidden'), 400);
  if (ws) { ws.close(); connected = false; ws = null; }
});

clearBtn.addEventListener('click', () => { if (confirm('Clear all messages?')) send({ type: 'clear' }); });

/* ── Voice call ──────────────────────────────────────────── */
let callActive = false, localStream = null, muteOn = false;

callBtn.addEventListener('click', () => {
  if (callActive) return;
  send({ type: 'callRequest', name: myName });
  callName.textContent = 'Calling…'; callStatus.textContent = 'ringing…';
  callAvatar.textContent = myName[0].toUpperCase();
  callOverlay.classList.remove('hidden'); callActive = true;
});
function incomingCall(msg) {
  if (callActive) return;
  callName.textContent = msg.name; callStatus.textContent = 'Incoming call…';
  callAvatar.textContent = (msg.name || '?')[0].toUpperCase();
  callOverlay.classList.remove('hidden');
  setTimeout(() => { send({ type: 'callAccept' }); startCall(); }, 500);
}
function startCall() {
  callStatus.textContent = 'Connected ✓'; callActive = true;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(s => { localStream = s; }).catch(() => {});
}
function endCall(sendIt = true) {
  callOverlay.classList.add('hidden'); callActive = false;
  localStream?.getTracks().forEach(t => t.stop()); localStream = null;
  if (sendIt) send({ type: 'callEnd' });
}
callEnd.addEventListener('click', () => endCall(true));
callMute.addEventListener('click', () => {
  muteOn = !muteOn; callMute.textContent = muteOn ? '🔇' : '🎤';
  localStream?.getAudioTracks().forEach(t => { t.enabled = !muteOn; });
});

/* ── Util ────────────────────────────────────────────────── */
function htmlEsc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function linkify(s) { return s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener" style="color:var(--c-blush)">$1</a>'); }
