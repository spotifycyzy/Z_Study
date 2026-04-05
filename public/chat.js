/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — chat.js  (FULL FIREBASE EDITION)
   All features (Stickers, Voice Calls, Replies, Media) intact
═══════════════════════════════════════════════════════════ */
'use strict';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

/* ── FIREBASE CONFIG ── */
const firebaseConfig = {
  apiKey: "AIzaSyAWUD0ab5sCYhlGyWGED7csANweTxUTAJg",
  authDomain: "zstudy-86f23.firebaseapp.com",
  projectId: "zstudy-86f23",
  storageBucket: "zstudy-86f23.firebasestorage.app",
  messagingSenderId: "82037165092",
  appId: "1:82037165092:web:7ce9bc701309ed7fbd5cb1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const roomDoc = doc(db, "rooms", ZEROX_CONFIG.roomId);
const messagesRef = collection(roomDoc, "messages");
const signalsRef = collection(roomDoc, "signals");

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
let myName      = '';
let myId        = 'u_' + Math.random().toString(36).slice(2);
let joinTime    = Date.now();
let typingTimer = null;
let isTyping    = false;
let replyTo     = null;
let allMessages = {};
let mediaRecorder = null;
let audioChunks   = [];
let isRecording   = false;
let callActive    = false;
let localStream   = null;

window._chatUnlock = function() {
  chatApp.classList.remove('hidden');
  requestAnimationFrame(() => chatApp.classList.add('visible'));
};

nameInput.value = localStorage.getItem('zerox_name') || '';

(function() {
  const custom = localStorage.getItem('zerox_custom_bg');
  const idx    = parseInt(localStorage.getItem('zerox_wallpaper') || '0');
  if (custom && idx === -1) { /* deferred to enterChat */ }
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
  connectFirebase();
  
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
}

/* ════════════════════════════════════════════════════════
   FIREBASE CONNECTION & SYNC
════════════════════════════════════════════════════════ */
function connectFirebase() {
  chatOnline.textContent = "● Connected";
  sidebarOnline.textContent = "● Connected";
  
  window._zxSendSync = data => sendRaw({ ...data, type: 'musicSync' });

  // 1. Messages
  onSnapshot(query(messagesRef, orderBy("ts", "asc"), limit(150)), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const msg = change.doc.data();
      msg.id = change.doc.id; 

      if (change.type === "added") {
        allMessages[msg.id] = msg;
        renderMessage(msg);
        scrollBottom();
      }
      if (change.type === "modified") {
        if (msg.deleted) {
          handleDeleteMsg(msg.id);
        } else {
          allMessages[msg.id] = msg;
          handleReaction(msg); 
        }
      }
    });
  });

  // 2. Signals
  onSnapshot(query(signalsRef, orderBy("ts", "asc"), limit(10)), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const sig = change.doc.data();
        if (sig.ts > joinTime && sig.userId !== myId) {
          if (sig.type === 'typing') typingBar.textContent = sig.active ? `${sig.name} is typing…` : '';
          if (sig.type === 'musicSync' && window._zxReceiveSync) window._zxReceiveSync(sig);
          if (sig.type === 'callRequest') handleIncomingCall(sig);
          if (sig.type === 'callAccept') startCallAudio();
          if (sig.type === 'callEnd') endCall(false);
          if (sig.type === 'wallpaperSync') applyWallpaperDirect(sig.data?.url || '');
          if (sig.type === 'setBg') applyDefaultBg(sig.url || '');
        }
      }
    });
  });
}

async function sendRaw(obj) {
  const payload = { ...obj, userId: myId, name: myName, ts: Date.now() };
  try {
    if (['message', 'sticker', 'media', 'voice'].includes(obj.type)) {
      await addDoc(messagesRef, payload);
    } else if (obj.type === 'reaction') {
      const msgDoc = doc(messagesRef, obj.msgId);
      await updateDoc(msgDoc, { [`reactions.${myId}`]: obj.emoji });
    } else if (obj.type === 'deleteMsg') {
      const msgDoc = doc(messagesRef, obj.msgId);
      await updateDoc(msgDoc, { deleted: true });
    } else {
      await addDoc(signalsRef, payload);
    }
  } catch (err) { console.error("Firebase send error:", err); }
}
function send(obj) { sendRaw(obj); }

/* ════════════════════════════════════════════════════════
   RENDER MESSAGE
════════════════════════════════════════════════════════ */
function renderMessage(msg) {
  const mine    = msg.userId === myId || msg.name === myName;
  const row     = document.createElement('div');
  row.className = `msg-row ${mine ? 'mine' : 'theirs'}`;
  row.dataset.id = msg.id;

  const initial = (msg.name || '?')[0].toUpperCase();
  const timeStr = new Date(msg.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

  let replyHtml = '';
  if (msg.replyTo && allMessages[msg.replyTo]) {
    const ref = allMessages[msg.replyTo];
    replyHtml = `<div class="msg-reply-ref">↩ <strong>${escapeHtml(ref.name)}</strong>: ${escapeHtml((ref.text||'[media]').slice(0,60))}</div>`;
  } else if (msg.replyTo) {
    replyHtml = `<div class="msg-reply-ref">↩ Deleted message</div>`;
  }

  let bubble = '';
  if (msg.type === 'sticker') {
    bubble = `<div class="msg-bubble msg-sticker">${msg.emoji || ''}</div>`;
  } else if (msg.type === 'media') {
    bubble = buildMediaBubble(msg, replyHtml);
  } else if (msg.type === 'voice') {
    bubble = buildVoiceBubble(msg, replyHtml);
  } else {
    bubble = `<div class="msg-bubble">${replyHtml}${linkify(escapeHtml(msg.text || ''))}</div>`;
  }

  const reactHtml = buildReactionsHtml(msg.reactions || {});

  row.innerHTML = `
    <div class="msg-avatar">${initial}</div>
    <div class="msg-bubble-wrap">
      ${!mine ? `<div class="msg-name">${escapeHtml(msg.name)}</div>` : ''}
      ${bubble}
      <div class="msg-reactions-wrap">${reactHtml}</div>
      <div class="msg-time">${timeStr}</div>
    </div>`;

  const bEl = row.querySelector('.msg-bubble, .msg-sticker, .msg-media, .msg-file, .msg-voice');
  if (bEl) attachCtxMenu(bEl, msg, mine);

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
  const el = document.createElement('div'); el.className = 'msg-system'; el.textContent = text;
  messagesInner.appendChild(el);
  scrollBottom();
}
function scrollBottom() { requestAnimationFrame(() => { messagesArea.scrollTop = messagesArea.scrollHeight; }); }

/* ════════════════════════════════════════════════════════
   CONTEXT MENU & REACTIONS
════════════════════════════════════════════════════════ */
function attachCtxMenu(el, msg, mine) {
  let pressTimer;
  el.addEventListener('contextmenu', e => { e.preventDefault(); showCtxMenu(e.clientX, e.clientY, msg, mine); });
  el.addEventListener('pointerdown', e => { pressTimer = setTimeout(() => showCtxMenu(e.clientX, e.clientY, msg, mine), 550); });
  el.addEventListener('pointerup', () => clearTimeout(pressTimer));
  el.addEventListener('pointercancel', () => clearTimeout(pressTimer));
  el.addEventListener('pointermove', () => clearTimeout(pressTimer));
}

function showCtxMenu(x, y, msg, mine) {
  document.querySelectorAll('.ctx-menu, .reaction-picker').forEach(el => el.remove());

  const rp = document.createElement('div');
  rp.className = 'reaction-picker';
  ['❤️','😂','😮','😢','👍','🔥','💗','✨','😍','🥺','😭','🤣'].forEach(em => {
    const s = document.createElement('span'); s.className = 'react-emoji'; s.textContent = em;
    s.addEventListener('click', () => { send({ type:'reaction', msgId:msg.id, emoji:em }); closeMenus(); });
    rp.appendChild(s);
  });
  const rpX = Math.min(x, window.innerWidth - 240);
  const rpY = Math.max(y - 90, 60);
  rp.style.cssText = `left:${rpX}px;top:${rpY}px`;
  document.body.appendChild(rp);

  const ctx = document.createElement('div');
  ctx.className = 'ctx-menu';
  const items = [
    { icon:'↩', label:'Reply',  action: () => startReply(msg) },
    { icon:'📋', label:'Copy',  action: () => navigator.clipboard?.writeText(msg.text||'') },
    ...(mine ? [{ icon:'🗑', label:'Delete', danger:true, action: () => send({type:'deleteMsg',msgId:msg.id}) }] : []),
  ];
  items.forEach(item => {
    const d = document.createElement('div');
    d.className = 'ctx-item' + (item.danger ? ' danger' : '');
    d.innerHTML = `<span>${item.icon}</span> ${item.label}`;
    d.addEventListener('click', () => { item.action(); closeMenus(); });
    ctx.appendChild(d);
  });
  const ctxX = Math.min(x, window.innerWidth - 180);
  const ctxY = Math.min(y + 4, window.innerHeight - 160);
  ctx.style.cssText = `left:${ctxX}px;top:${ctxY}px`;
  document.body.appendChild(ctx);

  function closeMenus() { rp.remove(); ctx.remove(); }
  setTimeout(() => document.addEventListener('pointerdown', closeMenus, { once:true }), 80);
}

function startReply(msg) {
  replyTo = msg;
  replyBar.classList.add('active');
  replyBarText.textContent = `${msg.name}: ${(msg.text||'[media]').slice(0,80)}`;
  msgInput.focus();
}
replyBarCancel.addEventListener('click', () => { replyTo=null; replyBar.classList.remove('active'); });

function handleReaction(msg) {
  const row = messagesInner.querySelector(`[data-id="${msg.id}"]`);
  if (!row) return;
  let wrap = row.querySelector('.msg-reactions-wrap');
  if (wrap) wrap.innerHTML = buildReactionsHtml(msg.reactions || {});
}

function handleDeleteMsg(msgId) {
  const row = messagesInner.querySelector(`[data-id="${msgId}"]`);
  if (row) {
    const b = row.querySelector('.msg-bubble');
    if (b) b.innerHTML = '<em style="opacity:0.35;font-size:12px">Message deleted</em>';
  }
}

/* ════════════════════════════════════════════════════════
   SEND MESSAGE
════════════════════════════════════════════════════════ */
sendBtn.addEventListener('click', sendMsg);
msgInput.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
  handleTyping();
});

function sendMsg() {
  const text = msgInput.value.trim();
  if (!text) return;
  const payload = { type:'message', text };
  if (replyTo) payload.replyTo = replyTo.id;
  send(payload);
  msgInput.value = ''; msgInput.style.height = 'auto';
  replyTo = null; replyBar.classList.remove('active');
  stopTyping();
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
   MEDIA / FILE (FIREBASE STORAGE)
════════════════════════════════════════════════════════ */
attachBtn.addEventListener('click', () => mediaInput.click());
mediaInput.addEventListener('change', () => {
  const file = mediaInput.files[0]; if (!file) return;
  if (file.size > 25 * 1024 * 1024) { alert('File too large (max 25MB)'); return; }
  
  renderSystem(`Uploading file: ${file.name}...`);
  const storageRef = ref(storage, `rooms/${ZEROX_CONFIG.roomId}/${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on('state_changed', null, err => console.error(err), async () => {
    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    send({ type:'media', mediaUrl:downloadURL, mediaType:file.type, fileName:file.name, fileSize:fmtSize(file.size), replyTo: replyTo?.id || null });
    replyTo = null; replyBar.classList.remove('active');
  });
  mediaInput.value = '';
});
function fmtSize(b) { if (b<1024) return b+'B'; if (b<1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; }

/* ════════════════════════════════════════════════════════
   VOICE NOTES (FIREBASE STORAGE)
════════════════════════════════════════════════════════ */
voiceBtn.addEventListener('pointerdown', e => { e.preventDefault(); startRec(); });
voiceBtn.addEventListener('pointerup', stopRec);
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
  
  mediaRecorder.onstop = () => {
    const dur = fmtDur((Date.now()-startTs)/1000);
    const blob = new Blob(audioChunks, {type:'audio/webm'});
    renderSystem('Uploading voice note...');
    
    const storageRef = ref(storage, `rooms/${ZEROX_CONFIG.roomId}/voice_${Date.now()}.webm`);
    uploadBytesResumable(storageRef, blob).then(async (snapshot) => {
       const downloadURL = await getDownloadURL(snapshot.ref);
       send({ type:'voice', audioUrl:downloadURL, duration:dur, replyTo:replyTo?.id||null });
       replyTo=null; replyBar.classList.remove('active');
    });
    mediaRecorder.stream.getTracks().forEach(t=>t.stop());
  };
  mediaRecorder.stop();
}

/* ════════════════════════════════════════════════════════
   STICKERS
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
    el.addEventListener('click', () => { send({type:'sticker',emoji:s}); stickerPicker.classList.add('hidden'); });
    stickerGrid.appendChild(el);
  });
}
renderStickers(0);
stickerToggle.addEventListener('click', () => stickerPicker.classList.toggle('hidden'));

/* ════════════════════════════════════════════════════════
   THEMES & WALLPAPERS
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

const _savedWpIdx = parseInt(localStorage.getItem('zerox_wallpaper') || '0');
setWallpaper(ZEROX_CONFIG.wallpapers[_savedWpIdx] || '', _savedWpIdx);

function applyWallpaperDirect(url) {
  chatWindow.style.setProperty('--wallpaper-url', url ? `url('${url}')` : 'none');
  if (url) { localStorage.setItem('zerox_custom_bg', url); localStorage.setItem('zerox_wallpaper', '-1'); }
}
function applyDefaultBg(url) {
  applyWallpaperDirect(url);
  document.querySelectorAll('.wallpaper-thumb').forEach(t => t.classList.remove('active'));
}

customBgInput.addEventListener('change', () => {
  const file = customBgInput.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    applyWallpaperDirect(dataUrl);
    send({ type: 'wallpaperSync', data: { url: dataUrl } });
  };
  reader.readAsDataURL(file);
});

openSidebar.addEventListener('click',  () => chatSidebar.classList.add('open'));
closeSidebar.addEventListener('click', () => chatSidebar.classList.remove('open'));

(function() {
  const wpSection = wallpaperGrid.parentElement;
  const setDefaultBtn = document.createElement('button');
  setDefaultBtn.className = 'set-default-bg-btn';
  setDefaultBtn.innerHTML = '🌐 Set background for everyone';
  setDefaultBtn.addEventListener('click', () => {
    const raw = chatWindow.style.getPropertyValue('--wallpaper-url') || '';
    const match = raw.match(/url\(['"]?(.*?)['"]?\)/);
    const url = match ? match[1] : '';
    if (!url) { alert('No wallpaper selected.'); return; }
    send({ type: 'setBg', url });
    setDefaultBtn.textContent = '✓ Set for everyone!';
    setTimeout(() => { setDefaultBtn.innerHTML = '🌐 Set background for everyone'; }, 2500);
  });
  wpSection.appendChild(setDefaultBtn);
})();

hideChatBtn.addEventListener('click', () => {
  chatApp.classList.remove('visible');
  setTimeout(() => chatApp.classList.add('hidden'), 400);
});

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

function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function linkify(s) { return s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener" style="color:var(--c-blush)">$1</a>'); }

