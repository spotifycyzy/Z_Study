/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — server.js  (fixed)
   • maxPayload 100 MB so images/audio/files go through
   • wallpaperSync + themeSync relayed to both clients
   • reactions stored in history
═══════════════════════════════════════════════════════════ */
'use strict';

const express   = require('express');
const http      = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path      = require('path');

const app    = express();
const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
  maxPayload: 100 * 1024 * 1024,   // 100 MB — lets base64 images/audio go through
});

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const MAX_HISTORY = 200;

function getRoom(roomId) {
  if (!rooms[roomId]) rooms[roomId] = { clients: new Set(), history: [] };
  return rooms[roomId];
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let userName    = 'Anonymous';
  let userId      = uuidv4();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'join': {
        currentRoom = msg.room || 'default';
        userName    = (msg.name || 'Anonymous').slice(0, 24);
        const room  = getRoom(currentRoom);
        room.clients.add(ws);
        ws.send(JSON.stringify({ type: 'history', messages: room.history }));
        broadcast(currentRoom, { type: 'system', text: `${userName} joined`, ts: Date.now() }, ws);
        broadcastOnline(currentRoom);
        break;
      }

      case 'message': {
        if (!currentRoom) return;
        const room = getRoom(currentRoom);
        const payload = {
          type: 'message', id: uuidv4(), userId, name: userName,
          text: (msg.text || '').slice(0, 4000),
          replyTo: msg.replyTo || null, ts: Date.now(),
        };
        room.history.push(payload);
        if (room.history.length > MAX_HISTORY) room.history.shift();
        broadcast(currentRoom, payload);
        break;
      }

      case 'sticker': {
        if (!currentRoom) return;
        const room = getRoom(currentRoom);
        const payload = {
          type: 'sticker', id: uuidv4(), userId, name: userName,
          emoji: msg.emoji || '', replyTo: msg.replyTo || null, ts: Date.now(),
        };
        room.history.push(payload);
        if (room.history.length > MAX_HISTORY) room.history.shift();
        broadcast(currentRoom, payload);
        break;
      }

      case 'typing': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type: 'typing', name: userName, active: !!msg.active }, ws);
        break;
      }

      case 'media':
      case 'voice': {
        if (!currentRoom) return;
        const room = getRoom(currentRoom);
        const payload = {
          ...msg, id: uuidv4(), userId, name: userName,
          replyTo: msg.replyTo || null, ts: Date.now(),
        };
        room.history.push(payload);
        if (room.history.length > MAX_HISTORY) room.history.shift();
        broadcast(currentRoom, payload);
        break;
      }

      case 'reaction': {
        if (!currentRoom) return;
        const room = getRoom(currentRoom);
        const m = room.history.find(h => h.id === msg.msgId);
        if (m) {
          if (!m.reactions) m.reactions = {};
          m.reactions[userId] = msg.emoji;
        }
        broadcast(currentRoom, { type: 'reaction', msgId: msg.msgId, emoji: msg.emoji, userId, name: userName });
        break;
      }

      case 'deleteMsg': {
        if (!currentRoom) return;
        const room2 = getRoom(currentRoom);
        room2.history = room2.history.filter(m => m.id !== msg.msgId);
        broadcast(currentRoom, { type: 'deleteMsg', msgId: msg.msgId });
        break;
      }

      case 'musicSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { ...msg, type: 'musicSync' }, ws);
        break;
      }

      case 'wallpaperSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type: 'wallpaperSync', data: msg.data }, ws);
        break;
      }

      case 'themeSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type: 'themeSync', themeName: msg.themeName }, ws);
        break;
      }

      case 'callRequest':
      case 'callAccept':
      case 'callEnd': {
        if (!currentRoom) return;
        broadcast(currentRoom, { ...msg, name: userName }, ws);
        break;
      }

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
    broadcast(currentRoom, { type: 'system', text: `${userName} left`, ts: Date.now() });
    broadcastOnline(currentRoom);
  });
});

function broadcast(roomId, payload, exclude = null) {
  const room = rooms[roomId];
  if (!room) return;
  const data = JSON.stringify(payload);
  room.clients.forEach(c => { if (c !== exclude && c.readyState === 1) c.send(data); });
}

function broadcastOnline(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const data = JSON.stringify({ type: 'online', count: room.clients.size });
  room.clients.forEach(c => { if (c.readyState === 1) c.send(data); });
}

server.listen(PORT, '0.0.0.0', () => console.log(`zerox running on port ${PORT}`));
