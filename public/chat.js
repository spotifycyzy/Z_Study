/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — chat.js  (Render WebSockets + Firebase Ready)
═══════════════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWUD0ab5sCYhlGyWGED7csANweTxUTAJg",
  authDomain: "zstudy-86f23.firebaseapp.com",
  projectId: "zstudy-86f23",
  storageBucket: "zstudy-86f23.firebasestorage.app",
  messagingSenderId: "82037165092",
  appId: "1:82037165092:web:7ce9bc701309ed7fbd5cb1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

'use strict';

/* ════════════════════════════════════════════════════════
   STUDY SITE
════════════════════════════════════════════════════════ */
document.getElementById('pageTitle').textContent = ZEROX_CONFIG.studySite.siteTitle;
document.getElementById('brandName').textContent = ZEROX_CONFIG.studySite.siteTitle;
const _total = ZEROX_CONFIG.studySite.subjects.reduce((a,s)=>a+s.chapters.length,0);
document.getElementById('statSubjects').textContent = ZEROX_CONFIG.studySite.subjects.length;
document.getElementById('statChapters').textContent = _total;

const grid = document.getElementById('subjectsGrid');
ZEROX_CONFIG.studySite.subjects.forEach(sub => {
  const card = document.createElement('div');
  card.className = 'subject-card';
  card.innerHTML = `<div class="subject-icon">${sub.icon}</div><div class="subject-title">${sub.title}</div><div class="subject-chapters">${sub.chapters.length} chapters</div><span class="subject-tag">Explore →</span>`;
  card.addEventListener('click', () => openSubject(sub));
  grid.appendChild(card);
});

function openSubject(sub) {
  document.getElementById('subjectModal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'subjectModal';
  modal.style.cssText = 'position:fixed;inset:52px 0 0 0;z-index:400;background:#05000A;overflow-y:auto;border-top:1px solid rgba(180,80,255,0.2)';
  const chapHtml = sub.chapters.map(ch =>
    `<div class="ch-card" onclick="document.getElementById('subjectModal').remove();window.openNotes('${sub.title.replace(/'/g,"\\'")}','${ch.replace(/'/g,"\\'")}')">
      <div class="ch-title">${ch}</div>
      <div class="ch-cta">Read notes →</div>
    </div>`).join('');
  modal.innerHTML = `
    <style>
      .ch-card{padding:18px;background:#0E0018;border:1.5px solid rgba(180,80,255,0.18);border-radius:14px;cursor:pointer;transition:all 0.2s}
      .ch-card:hover{border-color:#B450FF;box-shadow:0 0 16px rgba(180,80,255,0.2);transform:translateY(-3px)}
      .ch-title{font-size:14px;font-weight:600;color:#F0E8FF;margin-bottom:6px}
      .ch-cta{font-size:11px;color:#B450FF;font-weight:700}
    </style>
    <div style="max-width:700px;margin:0 auto;padding:28px 16px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <button onclick="document.getElementById('subjectModal').remove()" style="background:rgba(180,80,255,0.08);border:1.5px solid rgba(180,80,255,0.3);border-radius:8px;padding:7px 14px;font-family:Sora,sans-serif;font-size:13px;color:rgba(240,232,255,0.8);cursor:pointer">← Back</button>
        <span style="font-size:30px">${sub.icon}</span>
        <h2 style="font-size:22px;font-weight:700;color:#F0E8FF;text-shadow:0 0 12px rgba(180,80,255,0.4)">${sub.title}</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">${chapHtml}</div>
    </div>`;
  document.body.appendChild(modal);
}

/* Search */
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  let dd = document.getElementById('searchDropdown');
  if (!q) { dd?.remove(); return; }
  if (!dd) { dd = document.createElement('div'); dd.id='searchDropdown'; dd.className='search-results'; searchInput.parentElement.appendChild(dd); }
  const results = [];
  ZEROX_CONFIG.studySite.subjects.forEach(sub => sub.chapters.forEach(ch => {
    if (ch.toLowerCase().includes(q) || sub.title.toLowerCase().includes(q)) results.push({subject:sub.title,chapter:ch});
  }));
  dd.innerHTML = results.length === 0
    ? '<div class="search-result-item"><span class="sr-chapter">No results</span></div>'
    : results.slice(0,8).map(r=>`<div class="search-result-item" onclick="document.getElementById('searchDropdown').remove();document.getElementById('searchInput').value='';window.openNotes('${r.subject.replace(/'/g,"\\'")}','${r.chapter.replace(/'/g,"\\'")}')"><div class="sr-chapter">${r.chapter}</div><div class="sr-subject">${r.subject}</div></div>`).join('');
});
document.addEventListener('click', e => { if (!e.target.closest('.nav-search')) document.getElementById('searchDropdown')?.remove(); });
if (window.buildRecentList) window.buildRecentList();

/* Study site blossoms */
(function() {
  const c = document.getElementById('blossomContainer');
  const COLS = ['rgba(180,80,255,0.6)','rgba(232,67,106,0.55)','rgba(255,181,200,0.5)','rgba(194,0,95,0.45)','rgba(140,0,220,0.5)'];
  for (let i=0;i<40;i++) {
    const p=document.createElement('div'); p.className='blossom';
    const w=6+Math.random()*9, bx=(Math.random()-0.5)*130;
    p.style.cssText=`left:${Math.random()*110-5}%;width:${w}px;height:${w*(1.3+Math.random()*0.5)}px;background:${COLS[i%COLS.length]};--bx:${bx}px;animation-duration:${7+Math.random()*10}s;animation-delay:${Math.random()*-20}s;filter:blur(${0.2+Math.random()*0.6}px)`;
    c.appendChild(p);
  }
})();

/* ════════════════════════════════════════════════════════
   DOM REFS
════════════════════════════════════════════════════════ */
const chatApp       = document.getElementById('chatApp');
const unlockScreen  = document.getElementById('unlockScreen');
const chatMain      = document.getElementById('chatMain');
const nameInput     = document.getElementById('nameInput');
const enterChatBtn  = document.getElementById('enterChat');
const roomHint      = document.getElementById('roomHint');
const messagesInner = document.getElementById('messagesInner');
const messagesArea  = document.getElementById('messagesArea');
const msgInput      = document.getElementById('msgInput');
const sendBtn       = document.getElementById('sendBtn');
const typingBar     = document.getElementById('typingBar');
const chatOnline    = document.getElementById('chatOnline');
const sidebarOnline = document.getElementById('sidebarOnline');
const sidebarRoom   = document.getElementById('sidebarRoom');
const chatRoomName  = document.getElementById('chatRoomName');
const stickerPicker = document.getElementById('stickerPicker');
const stickerTabs   = document.getElementById('stickerTabs');
const stickerGrid   = document.getElementById('stickerGrid');
const stickerToggle = document.getElementById('stickerToggle');
const themeSwatches = document.getElementById('themeSwatches');
const wallpaperGrid = document.getElementById('wallpaperGrid');
const chatSidebar   = document.getElementById('chatSidebar');
const openSidebar   = document.getElementById('openSidebar');
const closeSidebar  = document.getElementById('closeSidebar');
const hideChatBtn   = document.getElementById('hideChatBtn');
const clearHistoryBtn=document.getElementById('clearHistoryBtn');
const customBgInput = document.getElementById('customBgInput');
const attachBtn     = document.getElementById('attachBtn');
const mediaInput    = document.getElementById('mediaInput');
const voiceBtn      = document.getElementById('voiceBtn');
const replyBar      = document.getElementById('replyBar');
const replyBarText  = document.getElementById('replyBarText');
const replyBarCancel= document.getElementById('replyBarCancel');
const callBtn       = document.getElementById('callBtn');
const callOverlay   = document.getElementById('callOverlay');
const callEnd       = document.getElementById('callEnd');
const callMute      = document.getElementById('callMute');
const callName      = document.getElementById('callName');
const callStatus    = document.getElementById('callStatus');
const callAvatar    = document.getElementById('callAvatar');

roomHint.textContent    = ZEROX_CONFIG.roomId;
sidebarRoom.textContent = ZEROX_CONFIG.roomId;
chatRoomName.textContent= 'zerox · ' + ZEROX_CONFIG.roomId.split('-')[0];

/* ════════════════════════════════════════════════════════
   STATE
════════════════════════════════════════════════════════ */
let ws          = null;
let myName      = '';
let myId        = 'u_' + Math.random().toString(36).slice(2);
let connected   = false;
let typingTimer = null;
let isTyping    = false;
let replyTo     = null;       // { id, name, text }
let allMessages = {};         // msgId → full message object
let mediaRecorder = null;
let audioChunks   = [];
let isRecording   = false;
let callActive    = false;
let localStream   = null;

/* ════════════════════════════════════════════════════════
   GESTURE UNLOCK
════════════════════════════════════════════════════════ */
window._chatUnlock = function() {
  chatApp.classList.remove('hidden');
  requestAnimationFrame(() => chatApp.classList.add('visible'));
};

/* ════════════════════════════════════════════════════════
   ENTER CHAT
════════════════════════════════════════════════════════ */
nameInput.value = localStorage.getItem('zerox_name') || '';

/* Restore custom background from localStorage on load */
(function() {
  const custom = localStorage.getItem('zerox_custom_bg');
  const idx    = parseInt(localStorage.getItem('zerox_wallpaper') || '0');
  if (custom && idx === -1) {
    /* Will be applied once chatWindow exists — deferred to enterChat */
  }
})();

enterChatBtn.addEventListener('click', enterChat);
nameInput.addEventListener('keydown', e => { if (e.key==='Enter') enterChat(); });

function enterChat() {
  const name = nameInput.value.trim() || ZEROX_CONFIG.myName;
  myName = name;
  localStorage.setItem('zerox_name', name);
  unlockScreen.style.opacity = '0';
  unlockScreen.style.pointerEvents = 'none';
  setTimeout(() => { unlockScreen.style.display='none'; }, 400);
  chatMain.classList.remove('hidden');
  spawnChatBlossoms();
  connectWS();
  listenToFirebase(); // <--- FIREBASE HISTORY START
  
  /* Restore custom bg after chatWindow is visible */
  const _customBg = localStorage.getItem('zerox_custom_bg');
  const _wpIdx    = parseInt(localStorage.getItem('zerox_wallpaper') || '0');
  if (_customBg && _wpIdx === -1) applyWallpaperDirect(_customBg);
}

function spawnChatBlossoms() {
  const c = document.getElementById('chatBlossoms');
  c.innerHTML = '';
  const COLS = ['rgba(232,67,106,0.42)','rgba(255,181,200,0.38)','rgba(194,0,95,0.32)','rgba(255,107,157,0.4)','rgba(110,0,48,0.35)'];
  for (let i=0;i<32;i++) {
    const p=document.createElement('div'); p.className='blossom';
    const w=5+Math.random()*9, bx=(Math.random()-0.5)*120;
    const rx1=50+Math.random()*20, rx2=10+Math.random()*15;
    p.style.cssText=`left:${Math.random()*110-5}%;width:${w}px;height:${w*(1.3+Math.random()*0.6)}px;background:${COLS[i%COLS.length]};--bx:${bx}px;animation-duration:${7+Math.random()*11}s;animation-delay:${Math.random()*-20}s;filter:blur(${0.15+Math.random()*0.5}px);border-radius:${rx1}% ${rx2}% ${rx1}% ${rx2}% / 50% 20% 50% 20%;position:absolute;opacity:0;animation-name:blossomFall;animation-timing-function:linear;animation-iteration-count:infinite`;
    c.appendChild(p);
  }
  /* Sparkles */
  let sp = document.getElementById('chatSparkles');
  if (!sp) { sp=document.createElement('div'); sp.id='chatSparkles'; document.getElementById('chatApp').appendChild(sp); }
  sp.innerHTML='';
  const SPARK=[{c:'#FFB5C8',s:'0 0 8px #FFB5C8,0 0 16px #E8436A77'},{c:'#E8436A',s:'0 0 8px #E8436A,0 0 18px #C2005F88'},{c:'#FFE8EF',s:'0 0 6px #FFE8EF,0 0 14px #FFB5C888'},{c:'#C2005F',s:'0 0 10px #C2005F,0 0 20px #6E003077'}];
  for(let i=0;i<18;i++){
    const s=document.createElement('div'); s.className='chat-sparkle';
    const pr=SPARK[i%SPARK.length], sz=2+Math.random()*5;
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${pr.c};box-shadow:${pr.s};animation-duration:${2+Math.random()*4}s;animation-delay:${Math.random()*-6}s;will-change:transform,opacity`;
    sp.appendChild(s);
  }
}

/* ════════════════════════════════════════════════════════
   WEBSOCKET (Connected exactly to Render)
════════════════════════════════════════════════════════ */
function connectWS() {
  ws = new WebSocket('wss://z-study.onrender.com');
  
  ws.addEventListener('open', () => {
    connected = true;
    console.log("✅ Connected to Render WebSocket");
    ws.send(JSON.stringify({ type:'join', room:ZEROX_CONFIG.roomId, name:myName }));
    window._zxSendSync = data => sendRaw(data);
  });
  
  ws.addEventListener('message', e => {
    let msg; try { msg=JSON.parse(e.data); } catch { return; }
    handleIncoming(msg);
  });
  
  ws.addEventListener('close', () => { 
    connected=false; 
    console.log("Disconnected. Retrying...");
    setTimeout(connectWS,3000); 
  });
  
  ws.addEventListener('error', (err) => {
    console.error("WebSocket Error:", err);
  });
}

function sendRaw(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}
function send(obj) {
  if (connected) sendRaw(obj);
}

/* ════════════════════════════════════════════════════════
   FIREBASE LISTENER (Replaces WS History)
════════════════════════════════════════════════════════ */
function listenToFirebase() {
  const q = query(collection(db, "rooms", ZEROX_CONFIG.roomId, "messages"), orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      data.id = change.doc.id; 
      if (!data.ts) data.ts = Date.now(); 

      if (change.type === "added") {
        allMessages[data.id] = data;
        renderMessage(data);
        scrollBottom();
      }
      if (change.type === "modified") {
        allMessages[data.id] = data;
        if (data.deleted) handleDeleteMsgUI(data.id);
        if (data.reactions) handleReactionUI(data.id, data.reactions);
      }
    });
  });
}

/* ════════════════════════════════════════════════════════
   INCOMING WS MESSAGES (Skipping messages as Firebase handles it)
════════════════════════════════════════════════════════ */
function handleIncoming(msg) {
  switch (msg.type) {
    case 'system':
      renderSystem(msg.text);
      scrollBottom();
      break;

    case 'typing':
      if (msg.name !== myName) typingBar.textContent = msg.active ? `${msg.name} is typing…` : '';
      break;

    case 'online':
      chatOnline.textContent  = `● ${msg.count} online`;
      sidebarOnline.textContent = `● ${msg.count} online`;
      break;

    case 'cleared':
      messagesInner.innerHTML = '';
      allMessages = {};
      renderSystem('History cleared');
      break;

    case 'defaultBg':
      applyDefaultBg(msg.url || '');
      break;

    case 'wallpaperSync':
      applyWallpaperDirect(msg.data?.url || '');
      break;

    case 'musicSync':
      // Forward all musicSync messages to the player
      if (typeof window._zxReceiveSync === 'function') window._zxReceiveSync(msg);
      break;

    case 'callRequest': handleIncomingCall(msg); break;
    case 'callAccept':  startCallAudio();         break;
    case 'callEnd':     endCall(false);           break;
  }
}

/* ════════════════════════════════════════════════════════
   RENDER MESSAGE
════════════════════════════════════════════════════════ */
const REACT_EMOJIS = ['❤️','😂','😮','😢','👍','🔥','💗','✨','😍','🥺','😭','🤣'];

function renderMessage(msg) {
  if (document.querySelector(`[data-id="${msg.id}"]`)) return; // Prevent duplicates

  const mine    = msg.name === myName;
  const row     = document.createElement('div');
  row.className = `msg-row ${mine ? 'mine' : 'theirs'}`;
  row.dataset.id = msg.id;

  const initial = (msg.name || '?')[0].toUpperCase();
  const timeStr = new Date(msg.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

  /* Reply preview */
  let replyHtml = '';
  if (msg.replyTo && allMessages[msg.replyTo]) {
    const ref = allMessages[msg.replyTo];
    replyHtml = `<div class="msg-reply-ref">↩ <strong>${escapeHtml(ref.name)}</strong>: ${escapeHtml((ref.text||'[media]').slice(0,60))}</div>`;
  } else if (msg.replyTo) {
    replyHtml = `<div class="msg-reply-ref">↩ Deleted message</div>`;
  }

  /* Bubble content */
  let bubble = '';
  if (msg.deleted) {
    bubble = `<div class="msg-bubble"><em style="opacity:0.35;font-size:12px">Message deleted</em></div>`;
  } else if (msg.type === 'sticker') {
    bubble = `<div class="msg-bubble msg-sticker">${msg.emoji || ''}</div>`;
  } else if (msg.type === 'media') {
    bubble = buildMediaBubble(msg, replyHtml);
  } else if (msg.type === 'voice') {
    bubble = buildVoiceBubble(msg, replyHtml);
  } else {
    bubble = `<div class="msg-bubble">${replyHtml}${linkify(escapeHtml(msg.text || ''))}</div>`;
  }

  /* Reactions */
  const reactHtml = buildReactionsHtml(msg.reactions || {});

  row.innerHTML = `
    <div class="msg-avatar">${initial}</div>
    <div class="msg-bubble-wrap">
      ${!mine ? `<div class="msg-name">${escapeHtml(msg.name)}</div>` : ''}
      ${bubble}
      <div class="msg-reactions-wrap">${reactHtml}</div>
      <div class="msg-time">${timeStr}</div>
    </div>`;

  /* Attach context menu */
  const bEl = row.querySelector('.msg-bubble, .msg-sticker, .msg-media, .msg-file, .msg-voice');
  if (bEl && !msg.deleted) attachCtxMenu(bEl, msg, mine);

  messagesInner.appendChild(row);
}

function buildReactionsHtml(reactions) {
  const counts = {};
  Object.values(reactions).forEach(e => { counts[e] = (counts[e]||0)+1; });
  if (!Object.keys(counts).length) return '';
  return Object.entries(counts)
    .map(([e,n]) => `<span class="reaction-pill">${e}<span class="r-count">${n}</span></span>`)
    .join('');
}

function buildMediaBubble(msg, replyHtml='') {
  if (msg.mediaType && msg.mediaType.startsWith('image/')) {
    return `<div class="msg-bubble" style="padding:4px">${replyHtml}<div class="msg-media"><img src="${msg.mediaUrl}" loading="lazy" style="max-width:220px;border-radius:10px;display:block;cursor:pointer" onclick="window.open(this.src)"/></div></div>`;
  } else if (msg.mediaType && msg.mediaType.startsWith('video/')) {
    return `<div class="msg-bubble" style="padding:4px">${replyHtml}<video src="${msg.mediaUrl}" controls style="max-width:220px;border-radius:10px;display:block"></video></div>`;
  } else {
    const icon = msg.mediaType?.includes('pdf') ? '📄' : msg.mediaType?.includes('audio') ? '🎵' : '📎';
    return `<div class="msg-bubble">${replyHtml}<div class="msg-file" onclick="window.open('${msg.mediaUrl}')"><span class="file-icon">${icon}</span><div class="file-info"><div class="file-name">${escapeHtml(msg.fileName||'File')}</div><div class="file-size">${msg.fileSize||''}</div></div></div></div>`;
  }
}

function buildVoiceBubble(msg, replyHtml='') {
  const vid = 'v_' + msg.id;
  return `<div class="msg-bubble">${replyHtml}<div class="msg-voice" id="${vid}">
    <button class="voice-play-btn" onclick="toggleVoice('${vid}','${msg.audioUrl}')">▶</button>
    <div class="voice-waveform">
      <span style="height:35%"></span><span style="height:70%"></span><span style="height:100%"></span>
      <span style="height:60%"></span><span style="height:40%"></span><span style="height:80%"></span>
    </div>
    <span class="voice-dur" id="${vid}_dur">${msg.duration||'0:00'}</span>
  </div></div>`;
}

const _voiceAudios = {};
window.toggleVoice = function(vid, url) {
  if (!_voiceAudios[vid]) _voiceAudios[vid] = new Audio(url);
  const audio = _voiceAudios[vid];
  const btn   = document.querySelector(`#${vid} .voice-play-btn`);
  const dur   = document.getElementById(`${vid}_dur`);
  if (audio.paused) {
    audio.play();
    if (btn) btn.textContent = '⏸';
    const iv = setInterval(() => {
      if (dur) dur.textContent = fmtDur(audio.currentTime);
      if (audio.ended) { clearInterval(iv); if (btn) btn.textContent='▶'; }
    }, 200);
  } else {
    audio.pause();
    if (btn) btn.textContent = '▶';
  }
};
function fmtDur(s) { const m=Math.floor(s/60); return `${m}:${String(Math.floor(s%60)).padStart(2,'0')}`; }

function renderSystem(text) {
  const el = document.createElement('div');
  el.className = 'msg-system';
  el.textContent = text;
  messagesInner.appendChild(el);
}
function scrollBottom() { requestAnimationFrame(() => { messagesArea.scrollTop = messagesArea.scrollHeight; }); }

/* ════════════════════════════════════════════════════════
   CONTEXT MENU & FIREBASE UPDATES
════════════════════════════════════════════════════════ */
function attachCtxMenu(el, msg, mine) {
  let pressTimer;
  el.addEventListener('contextmenu', e => { e.preventDefault(); showCtxMenu(e.clientX, e.clientY, msg, mine); });
  el.addEventListener('pointerdown', e => { pressTimer = setTimeout(() => showCtxMenu(e.clientX, e.clientY, msg, mine), 550); });
  el.addEventListener('pointerup',     () => clearTimeout(pressTimer));
  el.addEventListener('pointercancel', () => clearTimeout(pressTimer));
  el.addEventListener('pointermove',   () => clearTimeout(pressTimer));
}

function showCtxMenu(x, y, msg, mine) {
  document.querySelectorAll('.ctx-menu, .reaction-picker').forEach(el => el.remove());

  const rp = document.createElement('div');
  rp.className = 'reaction-picker';
  REACT_EMOJIS.forEach(em => {
    const s = document.createElement('span');
    s.className = 'react-emoji';
    s.textContent = em;
    s.addEventListener('click', async () => {
      closeMenus();
      try {
        const docRef = doc(db, "rooms", ZEROX_CONFIG.roomId, "messages", msg.id);
        const newReactions = { ...(msg.reactions || {}) }; newReactions[myId] = em;
        await updateDoc(docRef, { reactions: newReactions });
      } catch(e){}
    });
    rp.appendChild(s);
  });
  rp.style.cssText = `left:${Math.min(x, window.innerWidth - 240)}px;top:${Math.max(y - 90, 60)}px`;
  document.body.appendChild(rp);

  const ctx = document.createElement('div');
  ctx.className = 'ctx-menu';
  const items = [
    { icon:'↩', label:'Reply',  action: () => startReply(msg) },
    { icon:'📋', label:'Copy',  action: () => navigator.clipboard?.writeText(msg.text||'') },
    ...(mine ? [{ icon:'🗑', label:'Delete', danger:true, action: async () => {
      try {
        const docRef = doc(db, "rooms", ZEROX_CONFIG.roomId, "messages", msg.id);
        await updateDoc(docRef, { deleted: true });
      } catch(e){}
    } }] : []),
  ];
  items.forEach(item => {
    const d = document.createElement('div');
    d.className = 'ctx-item' + (item.danger ? ' danger' : '');
    d.innerHTML = `<span>${item.icon}</span> ${item.label}`;
    d.addEventListener('click', () => { item.action(); closeMenus(); });
    ctx.appendChild(d);
  });
  ctx.style.cssText = `left:${Math.min(x, window.innerWidth - 180)}px;top:${Math.min(y + 4, window.innerHeight - 160)}px`;
  document.body.appendChild(ctx);

  function closeMenus() { rp.remove(); ctx.remove(); }
  setTimeout(() => document.addEventListener('pointerdown', closeMenus, { once:true }), 80);
}

function handleReactionUI(msgId, reactions) {
  const row = messagesInner.querySelector(`[data-id="${msgId}"]`); if (!row) return;
  let wrap = row.querySelector('.msg-reactions-wrap');
  if (!wrap) {
    wrap = document.createElement('div'); wrap.className = 'msg-reactions-wrap';
    row.querySelector('.msg-bubble-wrap').insertBefore(wrap, row.querySelector('.msg-time'));
  }
  wrap.innerHTML = buildReactionsHtml(reactions);
}

function handleDeleteMsgUI(msgId) {
  const row = messagesInner.querySelector(`[data-id="${msgId}"]`);
  if (!row) return;
  const b = row.querySelector('.msg-bubble');
  if (b) {
    b.innerHTML = '<em style="opacity:0.35;font-size:12px">Message deleted</em>';
    // Remove context menu listener by cloning only the bubble (not whole row)
    const clone = b.cloneNode(true);
    b.parentNode.replaceChild(clone, b);
  }
}

/* ════════════════════════════════════════════════════════
   REPLY
════════════════════════════════════════════════════════ */
function startReply(msg) {
  replyTo = msg;
  replyBar.classList.add('active');
  replyBarText.textContent = `${msg.name}: ${(msg.text||'[media]').slice(0,80)}`;
  msgInput.focus();
}
replyBarCancel.addEventListener('click', () => { replyTo=null; replyBar.classList.remove('active'); });

/* ════════════════════════════════════════════════════════
   SEND MESSAGE (Firebase Engine)
════════════════════════════════════════════════════════ */
/* ── Telegram-style input bar: show send when typing, media when empty ── */
const inputBar = document.getElementById('inputBar');
const sendBtnEl = document.getElementById('sendBtn');
function updateInputBar() {
  const hasText = msgInput.value.trim().length > 0;
  inputBar.classList.toggle('has-text', hasText);
  sendBtnEl.style.display = hasText ? 'flex' : 'none';
}
// init
updateInputBar();

sendBtn.addEventListener('click', sendMsg);
msgInput.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
  handleTyping();
  updateInputBar();
});

async function sendMsg() {
  const text = msgInput.value.trim();
  if (!text) return;
  
  const payload = { type:'message', text, name: myName, ts: Date.now(), timestamp: serverTimestamp() };
  if (replyTo) payload.replyTo = replyTo.id;

  msgInput.value = ''; msgInput.style.height = 'auto';
  replyTo = null; replyBar.classList.remove('active');
  stopTyping(); updateInputBar();

  try { await addDoc(collection(db, "rooms", ZEROX_CONFIG.roomId, "messages"), payload); } catch(e) { console.error(e); }
}

function handleTyping() {
  if (!isTyping) { isTyping=true; send({type:'typing',active:true}); }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1800);
}
function stopTyping() {
  if (!isTyping) return; isTyping=false; send({type:'typing',active:false});
}

/* ════════════════════════════════════════════════════════
   MEDIA / FILE (Firebase Storage)
════════════════════════════════════════════════════════ */
attachBtn.addEventListener('click', () => mediaInput.click());
mediaInput.addEventListener('change', async () => {
  const file = mediaInput.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }

  const fileRef = ref(storage, `chat_media/${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(fileRef, file);

  uploadTask.on('state_changed', null, (err) => console.error(err), async () => {
    const url = await getDownloadURL(uploadTask.snapshot.ref);
    await addDoc(collection(db, "rooms", ZEROX_CONFIG.roomId, "messages"), {
      type:'media', mediaUrl:url, mediaType:file.type, fileName:file.name, fileSize:fmtSize(file.size), name:myName, ts:Date.now(), timestamp:serverTimestamp(), replyTo:replyTo?.id||null
    });
  });
  mediaInput.value = ''; replyTo = null; replyBar.classList.remove('active');
});
function fmtSize(b) { if (b<1024) return b+'B'; if (b<1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; }

/* ════════════════════════════════════════════════════════
   VOICE NOTES (Firebase Storage)
════════════════════════════════════════════════════════ */
voiceBtn.addEventListener('pointerdown', e => { e.preventDefault(); startRec(); });
voiceBtn.addEventListener('pointerup',     stopRec);
voiceBtn.addEventListener('pointercancel', stopRec);

function startRec() {
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
    audioChunks = []; isRecording = true;
    voiceBtn.classList.add('recording');
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.start();
  }).catch(() => alert('Microphone access denied'));
}
function stopRec() {
  if (!isRecording || !mediaRecorder) return;
  isRecording = false; voiceBtn.classList.remove('recording');
  const startTs = Date.now();
  mediaRecorder.onstop = async () => {
    const dur = fmtDur((Date.now()-startTs)/1000);
    const blob = new Blob(audioChunks, {type:'audio/webm'});

    const fileRef = ref(storage, `chat_voice/${Date.now()}.webm`);
    const uploadTask = uploadBytesResumable(fileRef, blob);

    uploadTask.on('state_changed', null, (err) => console.error(err), async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      await addDoc(collection(db, "rooms", ZEROX_CONFIG.roomId, "messages"), {
        type:'voice', audioUrl:url, duration:dur, name:myName, ts:Date.now(), timestamp:serverTimestamp(), replyTo:replyTo?.id||null
      });
    });

    mediaRecorder.stream.getTracks().forEach(t=>t.stop());
    replyTo=null; replyBar.classList.remove('active');
  };
  mediaRecorder.stop();
}

/* ════════════════════════════════════════════════════════
   STICKERS (Firebase Engine)
════════════════════════════════════════════════════════ */
const extraPack = { name:'More', stickers:['🫶','🤝','👀','💯','🎉','🥳','🤩','🥺','😭','🤣','🫠','🥹','🤯','😎','💪','🌟','🍀','🌸','🦄','🐉','🎵','🎶','🎸','🎤','🎬','🌈','⚡','💎','🫧','🌊'] };
const allPacks  = [...ZEROX_CONFIG.stickerPacks, extraPack];

stickerTabs.innerHTML = '';
allPacks.forEach((pack, i) => {
  const tab = document.createElement('div');
  tab.className = `sticker-tab${i===0?' active':''}`;
  tab.textContent = pack.name;
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sticker-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    renderStickers(i);
  });
  stickerTabs.appendChild(tab);
});
function renderStickers(idx) {
  stickerGrid.innerHTML = '';
  allPacks[idx].stickers.forEach(s => {
    const el = document.createElement('div');
    el.className = 'sticker-item'; el.textContent = s;
    el.addEventListener('click', async () => { 
      stickerPicker.classList.add('hidden'); 
      try { await addDoc(collection(db, "rooms", ZEROX_CONFIG.roomId, "messages"), { type:'sticker', emoji:s, name:myName, ts:Date.now(), timestamp:serverTimestamp(), replyTo:replyTo?.id||null }); } catch(e){}
    });
    stickerGrid.appendChild(el);
  });
}
renderStickers(0);
stickerToggle.addEventListener('click', () => stickerPicker.classList.toggle('hidden'));

/* ════════════════════════════════════════════════════════
   THEMES
════════════════════════════════════════════════════════ */
const THEMES = [
  {name:'Rose',    bg:'#0D0008',surface:'#1A0010',surfaceHigh:'#2A0018',border:'rgba(232,67,106,0.22)',rose:'#E8436A',blush:'#FFB5C8',magenta:'#C2005F',text:'#FFE8EF',textMuted:'rgba(255,232,239,0.55)',myBubble:'linear-gradient(135deg,#E8436A,#C2005F)',herBubble:'#2A0018',swatch:'#E8436A'},
  {name:'Midnight',bg:'#080812',surface:'#10102A',surfaceHigh:'#1A1A3A',border:'rgba(100,120,255,0.22)',rose:'#6478FF',blush:'#B8C4FF',magenta:'#4050DD',text:'#E8ECFF',textMuted:'rgba(232,236,255,0.5)',myBubble:'linear-gradient(135deg,#6478FF,#4050DD)',herBubble:'#1A1A3A',swatch:'#6478FF'},
  {name:'Forest',  bg:'#060E08',surface:'#0E1A10',surfaceHigh:'#182218',border:'rgba(80,180,100,0.22)',rose:'#50B464',blush:'#A8E0B0',magenta:'#288A3C',text:'#E0F4E4',textMuted:'rgba(224,244,228,0.5)',myBubble:'linear-gradient(135deg,#50B464,#288A3C)',herBubble:'#182218',swatch:'#50B464'},
  {name:'Amber',   bg:'#0E0800',surface:'#1A1000',surfaceHigh:'#2A1A00',border:'rgba(230,160,40,0.22)',rose:'#E6A028',blush:'#FFD890',magenta:'#C07800',text:'#FFF4DC',textMuted:'rgba(255,244,220,0.5)',myBubble:'linear-gradient(135deg,#E6A028,#C07800)',herBubble:'#2A1A00',swatch:'#E6A028'},
  {name:'Neon',    bg:'#000A0A',surface:'#001818',surfaceHigh:'#002020',border:'rgba(0,255,200,0.2)',rose:'#00FFC8',blush:'#80FFE0',magenta:'#00CCA0',text:'#E0FFF8',textMuted:'rgba(224,255,248,0.5)',myBubble:'linear-gradient(135deg,#00FFC8,#00A080)',herBubble:'#002020',swatch:'#00FFC8'},
];
function applyTheme(t) {
  const r = document.documentElement.style;
  r.setProperty('--c-bg',t.bg); r.setProperty('--c-surface',t.surface); r.setProperty('--c-surfaceHigh',t.surfaceHigh);
  r.setProperty('--c-border',t.border); r.setProperty('--c-rose',t.rose); r.setProperty('--c-blush',t.blush);
  r.setProperty('--c-magenta',t.magenta); r.setProperty('--c-text',t.text); r.setProperty('--c-textMuted',t.textMuted);
  r.setProperty('--c-myBubble',t.myBubble); r.setProperty('--c-herBubble',t.herBubble);
  localStorage.setItem('zerox_theme', t.name);
}
THEMES.forEach((t,i) => {
  const sw = document.createElement('div');
  sw.className = 'theme-swatch'; sw.style.background = t.swatch; sw.title = t.name;
  sw.addEventListener('click', () => { document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.remove('active')); sw.classList.add('active'); applyTheme(t); });
  themeSwatches.appendChild(sw);
  const saved = localStorage.getItem('zerox_theme');
  if ((!saved && i===0) || saved===t.name) { sw.classList.add('active'); applyTheme(t); }
});

/* ════════════════════════════════════════════════════════
   WALLPAPERS + CUSTOM BG
════════════════════════════════════════════════════════ */
const chatWindow = document.querySelector('.chat-window');
function setWallpaper(url, idx) {
  chatWindow.style.setProperty('--wallpaper-url', url ? `url('${url}')` : 'none');
  localStorage.setItem('zerox_wallpaper', idx);
  document.querySelectorAll('.wallpaper-thumb').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.wallpaper-thumb')[idx]?.classList.add('active');
}
ZEROX_CONFIG.wallpapers.forEach((url, i) => {
  const thumb = document.createElement('div'); thumb.className='wallpaper-thumb';
  if (!url) { thumb.classList.add('wp-none'); thumb.textContent='🚫'; }
  else thumb.style.backgroundImage = `url('${url}')`;
  thumb.addEventListener('click', () => setWallpaper(url, i));
  wallpaperGrid.appendChild(thumb);
});
/* Restore saved personal wallpaper */
const _savedWpIdx = parseInt(localStorage.getItem('zerox_wallpaper') || '0');
setWallpaper(ZEROX_CONFIG.wallpapers[_savedWpIdx] || '', _savedWpIdx);

/* Apply a wallpaper URL directly (used by defaultBg and wallpaperSync) */
function applyWallpaperDirect(url) {
  chatWindow.style.setProperty('--wallpaper-url', url ? `url('${url}')` : 'none');
  /* Persist locally */
  if (url) {
    localStorage.setItem('zerox_custom_bg', url);
    localStorage.setItem('zerox_wallpaper', '-1');
  }
}

/* Apply default background set by admin — overrides personal choice */
function applyDefaultBg(url) {
  applyWallpaperDirect(url);
  /* Update UI: deselect all preset thumbs since a custom one is active */
  document.querySelectorAll('.wallpaper-thumb').forEach(t => t.classList.remove('active'));
}

/* Custom background upload */
customBgInput.addEventListener('change', () => {
  const file = customBgInput.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    /* Apply locally */
    applyWallpaperDirect(dataUrl);
    /* Sync to other client immediately */
    send({ type: 'wallpaperSync', data: { url: dataUrl } });
  };
  reader.readAsDataURL(file);
});

/* ════════════════════════════════════════════════════════
   SIDEBAR / HIDE / CLEAR
════════════════════════════════════════════════════════ */
openSidebar.addEventListener('click',  () => chatSidebar.classList.add('open'));
closeSidebar.addEventListener('click', () => chatSidebar.classList.remove('open'));

(function() {
  const wpSection = wallpaperGrid.parentElement; 
  const setDefaultBtn = document.createElement('button');
  setDefaultBtn.className = 'set-default-bg-btn';
  setDefaultBtn.innerHTML = '🌐 Set background for everyone';
  setDefaultBtn.title = 'Broadcasts your current wallpaper to all users. New visitors will also see it.';
  setDefaultBtn.addEventListener('click', () => {
    const raw = chatWindow.style.getPropertyValue('--wallpaper-url') || '';
    const match = raw.match(/url\(['"]?(.*?)['"]?\)/);
    const url = match ? match[1] : '';
    if (!url) { alert('No wallpaper selected. Choose one first.'); return; }
    send({ type: 'setBg', url });
    setDefaultBtn.textContent = '✓ Set for everyone!';
    setTimeout(() => { setDefaultBtn.innerHTML = '🌐 Set background for everyone'; }, 2500);
  });
  wpSection.appendChild(setDefaultBtn);
})();
hideChatBtn.addEventListener('click', () => {
  chatApp.classList.remove('visible');
  setTimeout(() => chatApp.classList.add('hidden'), 400);
  if (ws) { ws.close(); connected=false; ws=null; }
});
clearHistoryBtn.addEventListener('click', () => { if (confirm('Clear all messages?')) send({type:'clear'}); });

/* ════════════════════════════════════════════════════════
   VOICE CALL 
════════════════════════════════════════════════════════ */
callBtn.addEventListener('click', () => {
  if (callActive) return;
  send({ type:'callRequest', name:myName });
  callName.textContent = 'Calling…';
  callStatus.textContent = 'ringing…';
  callAvatar.textContent = myName[0]?.toUpperCase() || '?';
  callOverlay.classList.remove('hidden');
  callActive = true;
});
function handleIncomingCall(msg) {
  if (callActive) return;
  callName.textContent   = msg.name;
  callStatus.textContent = '📞 Incoming — connecting…';
  callAvatar.textContent = (msg.name||'?')[0].toUpperCase();
  callOverlay.classList.remove('hidden');
  callActive = true;
  setTimeout(() => { send({type:'callAccept'}); startCallAudio(); }, 400);
}
function startCallAudio() {
  callStatus.textContent = '● Connected';
  navigator.mediaDevices.getUserMedia({audio:true}).then(s=>{ localStream=s; }).catch(()=>{});
}
function endCall(sendMsg=true) {
  callOverlay.classList.add('hidden'); callActive=false;
  localStream?.getTracks().forEach(t=>t.stop()); localStream=null;
  if (sendMsg) send({type:'callEnd'});
}
callEnd.addEventListener('click', () => endCall(true));
let muteOn = false;
callMute.addEventListener('click', () => {
  muteOn = !muteOn; callMute.textContent = muteOn ? '🔇' : '🎤';
  localStream?.getAudioTracks().forEach(t => { t.enabled = !muteOn; });
});

/* ════════════════════════════════════════════════════════
   MUSIC SYNC
════════════════════════════════════════════════════════ */
// _zxSendSync: always available — queues if WS not ready
window._zxSendSync = data => {
  if (connected) send(data);
  // If not connected, silently drop (sync will re-request on reconnect)
};

/* ════════════════════════════════════════════════════════
   UTILS
════════════════════════════════════════════════════════ */
function escapeHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function linkify(s) {
  return s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener" style="color:var(--c-blush)">$1</a>');
}
