/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — server.js
   Express + WebSocket + yt-dlp audio extraction endpoint
═══════════════════════════════════════════════════════════ */
'use strict';

const express  = require('express');
const http     = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 }      = require('uuid');
const path     = require('path');
const { execFile, exec }  = require('child_process');
const fs       = require('fs');
const os       = require('os');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });
const PORT   = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/* ══════════════════════════════════════════════════════════
   YT-DLP SETUP
   On Render/Railway (Linux) we download the yt-dlp binary
   on first use and cache it at /tmp/yt-dlp.
══════════════════════════════════════════════════════════ */
const YTDLP_PATH = path.join(os.tmpdir(), 'yt-dlp');
let ytdlpReady   = false;
let ytdlpInstalling = false;
const installCallbacks = [];

function ensureYtDlp(cb) {
  if (ytdlpReady) return cb(null);
  installCallbacks.push(cb);
  if (ytdlpInstalling) return;
  ytdlpInstalling = true;

  if (fs.existsSync(YTDLP_PATH)) {
    // Already downloaded — just make executable
    fs.chmodSync(YTDLP_PATH, 0o755);
    ytdlpReady = true;
    installCallbacks.forEach(fn => fn(null));
    installCallbacks.length = 0;
    return;
  }

  console.log('[yt-dlp] Downloading binary…');
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  exec(`curl -L "${url}" -o "${YTDLP_PATH}" && chmod +x "${YTDLP_PATH}"`, (err) => {
    if (err) {
      console.error('[yt-dlp] Download failed:', err.message);
      installCallbacks.forEach(fn => fn(err));
    } else {
      console.log('[yt-dlp] Ready');
      ytdlpReady = true;
      installCallbacks.forEach(fn => fn(null));
    }
    installCallbacks.length = 0;
  });
}

// Pre-download at startup so first request is fast
ensureYtDlp(err => {
  if (err) console.warn('[yt-dlp] Pre-install failed — will retry on first request');
});

/* ══════════════════════════════════════════════════════════
   AUDIO EXTRACTION CACHE
   Cache audio URLs for 45 minutes (they expire ~6h but
   we refresh early to avoid mid-song failures).
══════════════════════════════════════════════════════════ */
const audioCache = new Map(); // ytId → { url, expires }
const CACHE_TTL  = 45 * 60 * 1000; // 45 min

function getCached(ytId) {
  const entry = audioCache.get(ytId);
  if (!entry) return null;
  if (Date.now() > entry.expires) { audioCache.delete(ytId); return null; }
  return entry.url;
}
function setCache(ytId, url) {
  audioCache.set(ytId, { url, expires: Date.now() + CACHE_TTL });
}

/* ══════════════════════════════════════════════════════════
   GET /api/audio?id=YOUTUBE_VIDEO_ID
   Returns { url: "https://..." } — a direct audio stream
   the browser can play natively with background support.
══════════════════════════════════════════════════════════ */
app.get('/api/audio', (req, res) => {
  const ytId = (req.query.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!ytId || ytId.length !== 11) {
    return res.status(400).json({ error: 'Invalid YouTube ID' });
  }

  // Serve from cache if fresh
  const cached = getCached(ytId);
  if (cached) return res.json({ url: cached });

  ensureYtDlp(err => {
    if (err) return res.status(500).json({ error: 'yt-dlp unavailable' });

    const ytUrl = `https://www.youtube.com/watch?v=${ytId}`;

    // -f bestaudio: best audio-only format
    // -g: print URL only (no download)
    // --no-playlist: single video only
    // --no-check-certificate: avoid SSL issues on some hosts
    execFile(YTDLP_PATH, [
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '-g',
      '--no-playlist',
      '--no-check-certificate',
      '--extractor-retries', '3',
      '--socket-timeout', '15',
      ytUrl
    ], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[yt-dlp] Error:', stderr?.slice(0, 200));
        return res.status(500).json({ error: 'Extraction failed', detail: stderr?.slice(0,100) });
      }

      const url = stdout.trim().split('\n')[0]; // first URL (best audio)
      if (!url || !url.startsWith('http')) {
        return res.status(500).json({ error: 'No audio URL returned' });
      }

      setCache(ytId, url);
      console.log(`[yt-dlp] Extracted ${ytId} → ${url.slice(0, 60)}…`);
      res.json({ url });
    });
  });
});

/* ══════════════════════════════════════════════════════════
   GET /api/search?q=QUERY
   YouTube search via Data API — keeps search on server
   so the API key isn't exposed in client JS.
══════════════════════════════════════════════════════════ */
const YT_API_KEY = process.env.YT_API_KEY || 'AIzaSyA08-IfGc_Y2ssVCi_UarNxG-XizSkMMyY';

app.get('/api/search', async (req, res) => {
  const q    = (req.query.q || '').slice(0, 200);
  const type = req.query.type || 'music'; // 'music' | 'video'
  if (!q) return res.status(400).json({ error: 'No query' });

  const query = type === 'music' ? q + ' audio' : q;
  const catId = type === 'music' ? '&videoCategoryId=10' : '';

  try {
    const fetch = (await import('node-fetch')).default;
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video${catId}&key=${YT_API_KEY}`;
    const r    = await fetch(apiUrl);
    const data = await r.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const items = (data.items || []).map(v => ({
      ytId:    v.id.videoId,
      title:   v.snippet.title,
      channel: v.snippet.channelTitle,
      thumb:   v.snippet.thumbnails.medium?.url || '',
      thumbHq: v.snippet.thumbnails.high?.url   || '',
    }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ══════════════════════════════════════════════════════════
   WEBSOCKET  (unchanged)
══════════════════════════════════════════════════════════ */
const rooms      = {};
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
        ws.send(JSON.stringify({ type:'history', messages:room.history }));
        broadcast(currentRoom, { type:'system', text:`${userName} joined`, ts:Date.now() }, ws);
        broadcastOnline(currentRoom);
        break;
      }
      case 'message': {
        if (!currentRoom) return;
        const room    = getRoom(currentRoom);
        const payload = { type:'message', id:uuidv4(), userId, name:userName, text:(msg.text||'').slice(0,2000), ts:Date.now(), replyTo:msg.replyTo||null };
        room.history.push(payload);
        if (room.history.length > MAX_HISTORY) room.history.shift();
        broadcast(currentRoom, payload);
        break;
      }
      case 'sticker': {
        if (!currentRoom) return;
        const room    = getRoom(currentRoom);
        const payload = { type:'sticker', id:uuidv4(), userId, name:userName, emoji:msg.emoji||'', ts:Date.now() };
        room.history.push(payload); if (room.history.length>MAX_HISTORY) room.history.shift();
        broadcast(currentRoom, payload); break;
      }
      case 'typing': {
        if (!currentRoom) return;
        broadcast(currentRoom, { type:'typing', name:userName, active:!!msg.active }, ws); break;
      }
      case 'musicSync': {
        if (!currentRoom) return;
        broadcast(currentRoom, { ...msg, type:'musicSync' }, ws); break;
      }
      case 'media':
      case 'voice': {
        if (!currentRoom) return;
        const room    = getRoom(currentRoom);
        const payload = { ...msg, id:uuidv4(), userId, name:userName, ts:Date.now() };
        room.history.push(payload); if (room.history.length>MAX_HISTORY) room.history.shift();
        broadcast(currentRoom, payload); break;
      }
      case 'reaction': {
        if (!currentRoom) return;
        const p = { type:'reaction', msgId:msg.msgId, emoji:msg.emoji, userId, name:userName };
        getRoom(currentRoom).clients.forEach(c => { if (c.readyState===1) c.send(JSON.stringify(p)); });
        break;
      }
      case 'deleteMsg': {
        if (!currentRoom) return;
        const r2 = getRoom(currentRoom);
        r2.history = r2.history.filter(m => m.id !== msg.msgId);
        broadcast(currentRoom, { type:'deleteMsg', msgId:msg.msgId }); break;
      }
      case 'callRequest':
      case 'callAccept':
      case 'callEnd': {
        if (!currentRoom) return;
        broadcast(currentRoom, { ...msg, name:userName }, ws); break;
      }
      case 'clear': {
        if (!currentRoom) return;
        rooms[currentRoom].history = [];
        broadcast(currentRoom, { type:'cleared' }); break;
      }
    }
  });

  ws.on('close', () => {
    if (!currentRoom) return;
    const room = rooms[currentRoom]; if (!room) return;
    room.clients.delete(ws);
    broadcast(currentRoom, { type:'system', text:`${userName} left`, ts:Date.now() });
    broadcastOnline(currentRoom);
  });
});

function broadcast(roomId, payload, exclude=null) {
  const room = rooms[roomId]; if (!room) return;
  const data = JSON.stringify(payload);
  room.clients.forEach(c => { if (c!==exclude && c.readyState===1) c.send(data); });
}
function broadcastOnline(roomId) {
  const room = rooms[roomId]; if (!room) return;
  const data = JSON.stringify({ type:'online', count:room.clients.size });
  room.clients.forEach(c => { if (c.readyState===1) c.send(data); });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`zerox chat running on port ${PORT}`);
});
