/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — chat.js
   Real-time chat: WebSocket, themes, wallpapers, stickers.
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Apply config to study site ─────────────────────────── */
document.getElementById('pageTitle').textContent    = ZEROX_CONFIG.studySite.siteTitle;
document.getElementById('brandName').textContent    = ZEROX_CONFIG.studySite.siteTitle;
document.getElementById('heroTitle').innerHTML      =
  ZEROX_CONFIG.studySite.siteTitle + '<br /><em>' + ZEROX_CONFIG.studySite.tagline + '</em>';

/* Build subjects grid */
const grid = document.getElementById('subjectsGrid');
ZEROX_CONFIG.studySite.subjects.forEach(sub => {
  const card = document.createElement('div');
  card.className = 'subject-card';
  card.innerHTML = `
    <div class="subject-icon">${sub.icon}</div>
    <div class="subject-title">${sub.title}</div>
    <div class="subject-chapters">${sub.chapters.length} chapters</div>
    <span class="subject-tag">Explore →</span>
  `;
  grid.appendChild(card);
});

/* Build recent list (fake) */
const recents = [
  { title: 'Thermodynamics — Laws & Applications', meta: '2 hours ago · Physics' },
  { title: 'Integration by Parts', meta: 'Yesterday · Mathematics' },
  { title: 'Organic Reaction Mechanisms', meta: '3 days ago · Chemistry' },
];
const recentList = document.getElementById('recentList');
recents.forEach(r => {
  const el = document.createElement('div');
  el.className = 'recent-item';
  el.innerHTML = `
    <div class="recent-dot"></div>
    <div class="recent-text">
      <div class="recent-title">${r.title}</div>
      <div class="recent-meta">${r.meta}</div>
    </div>
    <div class="recent-arrow">›</div>
  `;
  recentList.appendChild(el);
});

/* ── DOM refs ───────────────────────────────────────────── */
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
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

roomHint.textContent = ZEROX_CONFIG.roomId;
sidebarRoom.textContent = ZEROX_CONFIG.roomId;
chatRoomName.textContent = 'zerox · ' + ZEROX_CONFIG.roomId.split('-')[0];

/* ── State ──────────────────────────────────────────────── */
let ws          = null;
let myName      = '';
let myId        = 'u_' + Math.random().toString(36).slice(2);
let typingTimer = null;
let isTyping    = false;
let connected   = false;

/* ═══════════════════════════════════════════════════════════
   GESTURE UNLOCK BRIDGE
═══════════════════════════════════════════════════════════ */
window._chatUnlock = function () {
  chatApp.classList.remove('hidden');
  requestAnimationFrame(() => chatApp.classList.add('visible'));
};

/* ═══════════════════════════════════════════════════════════
   ENTER CHAT
═══════════════════════════════════════════════════════════ */
nameInput.value = localStorage.getItem('zerox_name') || '';

enterChatBtn.addEventListener('click', enterChat);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') enterChat(); });

function enterChat() {
  const name = nameInput.value.trim() || ZEROX_CONFIG.myName;
  myName = name;
  localStorage.setItem('zerox_name', name);

  unlockScreen.style.opacity = '0';
  unlockScreen.style.pointerEvents = 'none';
  setTimeout(() => { unlockScreen.style.display = 'none'; }, 400);

  chatMain.classList.remove('hidden');
  connectWS();
}

/* ═══════════════════════════════════════════════════════════
   WEBSOCKET
═══════════════════════════════════════════════════════════ */
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url   = `${proto}://${location.host}`;

  ws = new WebSocket(url);

  ws.addEventListener('open', () => {
    connected = true;
    ws.send(JSON.stringify({ type: 'join', room: ZEROX_CONFIG.roomId, name: myName }));
  });

  ws.addEventListener('message', e => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    handleIncoming(msg);
  });

  ws.addEventListener('close', () => {
    connected = false;
    setTimeout(connectWS, 3000); // auto-reconnect
  });

  ws.addEventListener('error', () => ws.close());
}

function send(obj) {
  if (ws && connected && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

/* ═══════════════════════════════════════════════════════════
   INCOMING MESSAGE HANDLER
═══════════════════════════════════════════════════════════ */
function handleIncoming(msg) {
  switch (msg.type) {

    case 'history':
      messagesInner.innerHTML = '';
      msg.messages.forEach(renderMessage);
      scrollBottom();
      break;

    case 'message':
    case 'sticker':
      renderMessage(msg);
      scrollBottom();
      break;

    case 'system':
      renderSystem(msg.text);
      scrollBottom();
      break;

    case 'typing':
      if (msg.name !== myName) {
        typingBar.textContent = msg.active ? `${msg.name} is typing…` : '';
      }
      break;

    case 'online':
      chatOnline.textContent  = `● ${msg.count} online`;
      sidebarOnline.textContent = `● ${msg.count} online`;
      break;

    case 'cleared':
      messagesInner.innerHTML = '';
      renderSystem('History cleared');
      break;
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDER MESSAGES
═══════════════════════════════════════════════════════════ */
function renderMessage(msg) {
  const mine = (msg.name === myName);
  const row  = document.createElement('div');
  row.className = `msg-row ${mine ? 'mine' : 'theirs'}`;
  row.dataset.id = msg.id;

  const initial = (msg.name || '?')[0].toUpperCase();
  const timeStr = new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let bubbleContent = '';
  if (msg.type === 'sticker') {
    bubbleContent = `<div class="msg-bubble msg-sticker">${msg.emoji || msg.stickerUrl}</div>`;
  } else {
    const escaped = escapeHtml(msg.text || '');
    bubbleContent = `<div class="msg-bubble">${linkify(escaped)}</div>`;
  }

  row.innerHTML = `
    <div class="msg-avatar">${initial}</div>
    <div class="msg-bubble-wrap">
      ${!mine ? `<div class="msg-name">${escapeHtml(msg.name)}</div>` : ''}
      ${bubbleContent}
      <div class="msg-time">${timeStr}</div>
    </div>
  `;
  messagesInner.appendChild(row);
}

function renderSystem(text) {
  const el = document.createElement('div');
  el.className = 'msg-system';
  el.textContent = text;
  messagesInner.appendChild(el);
}

function scrollBottom() {
  requestAnimationFrame(() => {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  });
}

/* ═══════════════════════════════════════════════════════════
   SEND MESSAGE
═══════════════════════════════════════════════════════════ */
sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !connected) return;
  send({ type: 'message', text });
  msgInput.value = '';
  msgInput.style.height = 'auto';
  stopTyping();
}

/* Auto-grow textarea */
msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
  handleTyping();
});

/* ── Typing indicators ─────────────────────────────────── */
function handleTyping() {
  if (!isTyping) { isTyping = true; send({ type: 'typing', active: true }); }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1800);
}
function stopTyping() {
  if (!isTyping) return;
  isTyping = false;
  send({ type: 'typing', active: false });
}

/* ═══════════════════════════════════════════════════════════
   STICKER PICKER
═══════════════════════════════════════════════════════════ */
let activePack = 0;

ZEROX_CONFIG.stickerPacks.forEach((pack, i) => {
  const tab = document.createElement('div');
  tab.className = `sticker-tab${i === 0 ? ' active' : ''}`;
  tab.textContent = pack.name;
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sticker-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activePack = i;
    renderStickers(i);
  });
  stickerTabs.appendChild(tab);
});

function renderStickers(packIndex) {
  stickerGrid.innerHTML = '';
  ZEROX_CONFIG.stickerPacks[packIndex].stickers.forEach(s => {
    const el = document.createElement('div');
    el.className = 'sticker-item';
    el.textContent = s;
    el.addEventListener('click', () => {
      send({ type: 'sticker', emoji: s });
      stickerPicker.classList.add('hidden');
    });
    stickerGrid.appendChild(el);
  });
}
renderStickers(0);

stickerToggle.addEventListener('click', () => {
  stickerPicker.classList.toggle('hidden');
});

/* ═══════════════════════════════════════════════════════════
   THEMES
═══════════════════════════════════════════════════════════ */
const THEMES = [
  { name: 'Rose',    bg:'#0D0008', surface:'#1A0010', surfaceHigh:'#2A0018', border:'rgba(232,67,106,0.22)', rose:'#E8436A', blush:'#FFB5C8', magenta:'#C2005F', text:'#FFE8EF', textMuted:'rgba(255,232,239,0.55)', myBubble:'linear-gradient(135deg,#E8436A,#C2005F)', herBubble:'#2A0018', swatchColor:'#E8436A' },
  { name: 'Midnight',bg:'#080812', surface:'#10102A', surfaceHigh:'#1A1A3A', border:'rgba(100,120,255,0.22)', rose:'#6478FF', blush:'#B8C4FF', magenta:'#4050DD', text:'#E8ECFF', textMuted:'rgba(232,236,255,0.5)', myBubble:'linear-gradient(135deg,#6478FF,#4050DD)', herBubble:'#1A1A3A', swatchColor:'#6478FF' },
  { name: 'Forest',  bg:'#060E08', surface:'#0E1A10', surfaceHigh:'#182218', border:'rgba(80,180,100,0.22)', rose:'#50B464', blush:'#A8E0B0', magenta:'#288A3C', text:'#E0F4E4', textMuted:'rgba(224,244,228,0.5)', myBubble:'linear-gradient(135deg,#50B464,#288A3C)', herBubble:'#182218', swatchColor:'#50B464' },
  { name: 'Amber',   bg:'#0E0800', surface:'#1A1000', surfaceHigh:'#2A1A00', border:'rgba(230,160,40,0.22)', rose:'#E6A028', blush:'#FFD890', magenta:'#C07800', text:'#FFF4DC', textMuted:'rgba(255,244,220,0.5)', myBubble:'linear-gradient(135deg,#E6A028,#C07800)', herBubble:'#2A1A00', swatchColor:'#E6A028' },
  { name: 'Ghost',   bg:'#0A0A0A', surface:'#141414', surfaceHigh:'#1E1E1E', border:'rgba(220,220,220,0.15)', rose:'#D0D0D0', blush:'#F0F0F0', magenta:'#A0A0A0', text:'#F0F0F0', textMuted:'rgba(240,240,240,0.45)', myBubble:'linear-gradient(135deg,#888,#555)', herBubble:'#1E1E1E', swatchColor:'#D0D0D0' },
];

function applyTheme(t) {
  const r = document.documentElement.style;
  r.setProperty('--c-bg',          t.bg);
  r.setProperty('--c-surface',     t.surface);
  r.setProperty('--c-surfaceHigh', t.surfaceHigh);
  r.setProperty('--c-border',      t.border);
  r.setProperty('--c-rose',        t.rose);
  r.setProperty('--c-blush',       t.blush);
  r.setProperty('--c-magenta',     t.magenta);
  r.setProperty('--c-text',        t.text);
  r.setProperty('--c-textMuted',   t.textMuted);
  r.setProperty('--c-myBubble',    t.myBubble);
  r.setProperty('--c-herBubble',   t.herBubble);
  localStorage.setItem('zerox_theme', t.name);
}

THEMES.forEach((t, i) => {
  const sw = document.createElement('div');
  sw.className = 'theme-swatch';
  sw.style.background = t.swatchColor;
  sw.title = t.name;
  sw.addEventListener('click', () => {
    document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    applyTheme(t);
  });
  themeSwatches.appendChild(sw);
  // Restore saved theme
  const saved = localStorage.getItem('zerox_theme');
  if ((!saved && i === 0) || saved === t.name) { sw.classList.add('active'); applyTheme(t); }
});

/* ═══════════════════════════════════════════════════════════
   WALLPAPERS
═══════════════════════════════════════════════════════════ */
const chatWindow = document.querySelector('.chat-window');

function setWallpaper(url, index) {
  chatWindow.style.setProperty('--wallpaper-url', url ? `url('${url}')` : 'none');
  localStorage.setItem('zerox_wallpaper', index);
  document.querySelectorAll('.wallpaper-thumb').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.wallpaper-thumb')[index]?.classList.add('active');
}

ZEROX_CONFIG.wallpapers.forEach((url, i) => {
  const thumb = document.createElement('div');
  thumb.className = 'wallpaper-thumb';
  if (!url) {
    thumb.classList.add('wp-none');
    thumb.textContent = '🚫';
  } else {
    thumb.style.backgroundImage = `url('${url}')`;
  }
  thumb.addEventListener('click', () => setWallpaper(url, i));
  wallpaperGrid.appendChild(thumb);
});

// Restore saved wallpaper
const savedWp = parseInt(localStorage.getItem('zerox_wallpaper') || '0');
setWallpaper(ZEROX_CONFIG.wallpapers[savedWp] || '', savedWp);

/* ═══════════════════════════════════════════════════════════
   SIDEBAR TOGGLE
═══════════════════════════════════════════════════════════ */
openSidebar.addEventListener('click',  () => chatSidebar.classList.add('open'));
closeSidebar.addEventListener('click', () => chatSidebar.classList.remove('open'));

/* ═══════════════════════════════════════════════════════════
   HIDE CHAT → back to study site
═══════════════════════════════════════════════════════════ */
hideChatBtn.addEventListener('click', () => {
  chatApp.classList.remove('visible');
  setTimeout(() => chatApp.classList.add('hidden'), 400);
  if (ws) { ws.close(); connected = false; ws = null; }
});

/* ═══════════════════════════════════════════════════════════
   CLEAR HISTORY
═══════════════════════════════════════════════════════════ */
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Clear all messages for everyone?')) send({ type: 'clear' });
});

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function linkify(str) {
  return str.replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener" style="color:var(--c-blush)">$1</a>');
}
