/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — server.js
   Express static server + WebSocket relay
   No login. No registration. Just a shared room key.
═══════════════════════════════════════════════════════════ */
'use strict';

const express   = require('express');
const http      = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path      = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

const PORT   = process.env.PORT || 3000;

/* ── Static files ────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── In-memory rooms & message history ─────────────────── */
// rooms[roomId] = { clients: Set<ws>, history: [] }
const rooms = {};

const MAX_HISTORY = 200; // keep last 200 messages per room

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { clients: new Set(), history: [] };
  }
  return rooms[roomId];
}

/* ── WebSocket handler ───────────────────────────────────── */
wss.on('connection', (ws) => {
  let currentRoom = null;
  let userName    = 'Anonymous';
  let userId      = uuidv4();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); }
    catch { return; }

    switch (msg.type) {

      /* ── JOIN room ─────────────────────────────────── */
      case 'join': {
        currentRoom = msg.room  || 'default';
        userName    = (msg.name || 'Anonymous').slice(0, 24);

        const room = getRoom(currentRoom);
        room.clients.add(ws);

        // Send history to the newcomer
        ws.send(JSON.stringify({
          type:    'history',
          messages: room.history,
        }));

        // Notify others
        broadcast(currentRoom, {
          type:   'system',
          text:   `${userName} joined`,
          ts:     Date.now(),
        }, ws);

        // Send online count to all
        broadcastOnline(currentRoom);
        break;
      }

      /* ── CHAT message ──────────────────────────────── */
      case 'message': {
        if (!currentRoom) return;
        const room = getRoom(currentRoom);

        const payload = {
          type:   'message',
          id:     uuidv4(),
          userId,
          name:   userName,
          text:   (msg.text || '').slice(0, 2000),
          ts:     Date.now(),
        };

        room.history.push(payload);
        if (room.history.length > MAX_HISTORY) room.history.shift();

        broadcast(currentRoom, payload);
        break;
      }

      /* ── STICKER ───────────────────────────────────── */
      case 'sticker': {
        if (!currentRoom) return;
        const room = getRoom(currentRoom);

        const payload = {
          type:     'sticker',
          id:       uuidv4(),
          userId,
          name:     userName,
          stickerUrl: (msg.stickerUrl || '').slice(0, 512),
          emoji:    msg.emoji || '',
          ts:       Date.now(),
        };

        room.history.push(payload);
        if (room.history.length > MAX_HISTORY) room.history.shift();

        broadcast(currentRoom, payload);
        break;
      }

      /* ── TYPING indicator ──────────────────────────── */
      case 'typing': {
        if (!currentRoom) return;
        broadcast(currentRoom, {
          type:   'typing',
          name:   userName,
          active: !!msg.active,
        }, ws);
        break;
      }

      /* ── MUSIC SYNC ─────────────────────────────────── */
      case 'musicSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { ...msg, type: 'musicSync' }, ws);
        break;
      }

      /* ── WALLPAPER SYNC — broadcast to other client ── */
      case 'wallpaperSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type: 'wallpaperSync', data: msg.data }, ws);
        break;
      }

      /* ── THEME SYNC — broadcast to other client ─────── */
      case 'themeSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type: 'themeSync', themeName: msg.themeName }, ws);
        break;
      }

      /* ── MEDIA (image/file/voice — relay dataURL) ────── */
      case 'media':
      case 'voice': {
        if (!currentRoom) return;
        const room = getRoom(currentRoom);
        const payload = { ...msg, id: uuidv4(), userId, name: userName, ts: Date.now() };
        room.history.push(payload);
        if (room.history.length > MAX_HISTORY) room.history.shift();
        broadcast(currentRoom, payload);
        break;
      }

      /* ── REACTION ────────────────────────────────────── */
      case 'reaction': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type:'reaction', msgId:msg.msgId, emoji:msg.emoji, userId, name:userName });
        break;
      }

      /* ── DELETE ──────────────────────────────────────── */
      case 'deleteMsg': {
        if (!currentRoom) return;
        // Remove from history
        const room2 = getRoom(currentRoom);
        room2.history = room2.history.filter(m => m.id !== msg.msgId);
        broadcast(currentRoom, { type:'deleteMsg', msgId:msg.msgId });
        break;
      }

      /* ── CALL SIGNALING ──────────────────────────────── */
      case 'callRequest':
      case 'callAccept':
      case 'callEnd': {
        if (!currentRoom) return;
        broadcast(currentRoom, { ...msg, name: userName }, ws);
        break;
      }

      /* ── CLEAR history ───────────────────────────────── */
      case 'clear': {
        if (!currentRoom) return;
        rooms[currentRoom].history = [];
        broadcast(currentRoom, { type: 'cleared' });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!currentRoom) return;
    const room = rooms[currentRoom];
    if (!room) return;
    room.clients.delete(ws);
    broadcast(currentRoom, {
      type: 'system',
      text: `${userName} left`,
      ts:   Date.now(),
    });
    broadcastOnline(currentRoom);
  });
});

/* ── Helpers ─────────────────────────────────────────────── */
function broadcast(roomId, payload, exclude = null) {
  const room = rooms[roomId];
  if (!room) return;
  const data = JSON.stringify(payload);
  room.clients.forEach(client => {
    if (client !== exclude && client.readyState === 1) {
      client.send(data);
    }
  });
}

function broadcastOnline(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const count = room.clients.size;
  const data  = JSON.stringify({ type: 'online', count });
  room.clients.forEach(c => { if (c.readyState === 1) c.send(data); });
}

/* ── Start — must bind 0.0.0.0 for Railway/Render ─────── */
server.listen(PORT, '0.0.0.0', () => {
  console.log(`zerox chat running on port ${PORT}`);
});
