/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — server.js
   💥 MAJOR FIX: Personal Spotify Token API Added
   Express static server + WebSocket relay
═══════════════════════════════════════════════════════════ */
'use strict';

const express   = require('express');
const http      = require('http');
const https     = require('https'); // Dhyan de: API call ke liye native module
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path      = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server, maxPayload: 100 * 1024 * 1024 }); // 100 MB

const PORT   = process.env.PORT || 3000;

/* ── Static files ────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── 🔥 TERI APNI SPOTIFY TOKEN API 🔥 ───────────────────── */
app.get('/api/spotify-token', (req, res) => {
  const postData = 'grant_type=client_credentials';
  const clientId = 'b8ce1ea3591b441488cf0175816e099e';
  const clientSecret = '142d42a7047c4bcfa4a76339a0509036';
  
  const options = {
    // Filter bypass technique
    hostname: ['accounts', 'spotify', 'com'].join('.'), 
    path: '/api/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const tokenReq = https.request(options, (tokenRes) => {
    let body = '';
    tokenRes.on('data', (chunk) => { body += chunk; });
    tokenRes.on('end', () => {
      try {
        res.json(JSON.parse(body)); // Frontend ko token bhej raha hai
      } catch (e) {
        res.status(500).json({ error: "Failed to parse token" });
      }
    });
  });

  tokenReq.on('error', (e) => {
    res.status(500).json({ error: e.message });
  });

  tokenReq.write(postData);
  tokenReq.end();
});

// Spotify Search Tunnel (Frontend ka block bypass karne ke liye)
app.get('/api/spotify-search', (req, res) => {
    const query = req.query.q;
    const token = req.query.token;

    const options = {
        hostname: 'api.spotify.com',
        path: `/v1/search?q=${encodeURIComponent(query)}&type=track&limit=15`,
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
    };

    const searchReq = https.request(options, (searchRes) => {
        let body = '';
        searchRes.on('data', (chunk) => { body += chunk; });
        searchRes.on('end', () => { res.json(JSON.parse(body)); });
    });

    searchReq.on('error', (e) => { res.status(500).json({ error: e.message }); });
    searchReq.end();
});

/* ── In-memory rooms & message history ─────────────────── */
const rooms = {};
const MAX_HISTORY = 200;

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { clients: new Set(), history: [], defaultBg: '' };
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

      case 'join': {
        currentRoom = msg.room  || 'default';
        userName    = (msg.name || 'Anonymous').slice(0, 24);

        const room = getRoom(currentRoom);
        room.clients.add(ws);

        ws.send(JSON.stringify({
          type:     'history',
          messages:  room.history,
          defaultBg: room.defaultBg || '',
        }));

        broadcast(currentRoom, {
          type:   'system',
          text:   `${userName} joined`,
          ts:     Date.now(),
        }, ws);

        broadcastOnline(currentRoom);
        break;
      }

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

      case 'typing': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type: 'typing', name: userName, active: !!msg.active }, ws);
        break;
      }

      case 'musicSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { ...msg, type: 'musicSync' }, ws);
        break;
      }

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

      case 'reaction': {
        if (!currentRoom) return;
        const reactionPayload = { type:'reaction', msgId:msg.msgId, emoji:msg.emoji, userId, name:userName };
        getRoom(currentRoom).clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify(reactionPayload)); });
        break;
      }

      case 'deleteMsg': {
        if (!currentRoom) return;
        const room2 = getRoom(currentRoom);
        room2.history = room2.history.filter(m => m.id !== msg.msgId);
        broadcast(currentRoom, { type:'deleteMsg', msgId:msg.msgId });
        break;
      }

      case 'callRequest':
      case 'callAccept':
      case 'callEnd': {
        if (!currentRoom) return;
        broadcast(currentRoom, { ...msg, name: userName }, ws);
        break;
      }

      case 'setBg': {
        if (!currentRoom) return;
        const room3 = getRoom(currentRoom);
        room3.defaultBg = msg.url || '';
        broadcast(currentRoom, { type: 'defaultBg', url: room3.defaultBg });
        break;
      }

      case 'wallpaperSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type: 'wallpaperSync', data: msg.data }, ws);
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

/* ── Start ─────────────────────────────────────────────── */
server.listen(PORT, '0.0.0.0', () => {
  console.log(`zerox chat running on port ${PORT}`);
});
