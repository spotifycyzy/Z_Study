/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — chat.js (Updated with Tags & Live Reactions)
═══════════════════════════════════════════════════════════ */
'use strict';

// ... (Keep your Study site boot logic from lines 1-70) ...

/* ── DOM refs ── */
const chatApp = document.getElementById('chatApp');
const unlockScreen = document.getElementById('unlockScreen');
const chatMain = document.getElementById('chatMain');
const nameInput = document.getElementById('nameInput');
const msgInner = document.getElementById('messagesInner');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

let ws, myName = '', myId = 'u_' + Math.random().toString(36).slice(2);
let allMsgs = {}; 

window._chatUnlock = () => {
  chatApp.classList.remove('hidden');
  requestAnimationFrame(() => chatApp.classList.add('visible'));
};

document.getElementById('enterChat').addEventListener('click', () => {
  myName = nameInput.value.trim() || "User";
  // Apply Glow Theme on Enter
  if(typeof applyThemeObj === 'function') applyThemeObj(THEMES[0]);
  unlockScreen.style.display = 'none';
  chatMain.classList.remove('hidden');
  connectWS();
});

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'join', room: ZEROX_CONFIG.roomId, name: myName }));
  ws.onmessage = e => handleMsg(JSON.parse(e.data));
}

function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

function handleMsg(msg) {
  switch (msg.type) {
    case 'history': msg.messages.forEach(m => { allMsgs[m.id] = m; renderMsg(m); }); break;
    case 'message': allMsgs[msg.id] = msg; renderMsg(msg); break;
    case 'reaction': applyReaction(msg); break;
    case 'musicSync': if (window._zxReceiveSync) window._zxReceiveSync(msg); break;
  }
}

function renderMsg(msg) {
  const mine = msg.name === myName;
  const row = document.createElement('div');
  row.className = `msg-row ${mine ? 'mine' : 'theirs'}`;
  row.dataset.id = msg.id;
  
  row.innerHTML = `
    <div class="msg-bubble-wrap">
      <div class="msg-bubble">${linkify(msg.text || '')}</div>
      <div class="msg-reactions-wrap" data-id="${msg.id}">${reactionsHtml(msg)}</div>
    </div>`;
  msgInner.appendChild(row);
  msgInner.scrollTop = msgInner.scrollHeight;
}

function applyReaction(msg) {
  if (!allMsgs[msg.msgId]) return;
  if (!allMsgs[msg.msgId].reactions) allMsgs[msg.msgId].reactions = {};
  allMsgs[msg.msgId].reactions[msg.userId || msg.name] = msg.emoji;

  const row = msgInner.querySelector(`[data-id="${msg.msgId}"]`);
  if (row) {
    const wrap = row.querySelector('.msg-reactions-wrap');
    if (wrap) wrap.innerHTML = reactionsHtml(allMsgs[msg.msgId]);
  }
}

function reactionsHtml(msg) {
  if (!msg.reactions) return '';
  const counts = {};
  Object.values(msg.reactions).forEach(e => counts[e] = (counts[e] || 0) + 1);
  return Object.entries(counts).map(([e, n]) => `<span class="reaction-pill">${e} ${n}</span>`).join('');
}

function linkify(s) {
  return s
    .replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" class="neon-link">$1</a>')
    .replace(/@(\w+)/g, '<span class="user-tag">@$1</span>');
}

// Global Reaction Click Listener
msgInner.addEventListener('click', e => {
  const pill = e.target.closest('.reaction-pill');
  if (pill) {
    const msgId = pill.closest('.msg-reactions-wrap').dataset.id;
    const emoji = pill.textContent.split(' ')[0];
    send({ type: 'reaction', msgId, emoji, userId: myId });
  }
});
