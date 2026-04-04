# zerox-chat 💗

A secret real-time chat disguised as a study portal.  
Unlock it by drawing **Z** on the screen (hold for 0.6s, then draw).

---

## Features

- 💬 Real-time messaging via WebSocket
- 😊 Emoji sticker packs (customisable)
- 🎨 5 built-in themes (Rose, Midnight, Forest, Amber, Ghost)
- 🖼 Wallpaper picker
- ⌨️ Typing indicators
- 📚 Study site disguise (looks 100% legitimate)
- 🔐 No login / no registration — just a shared room ID
- 📱 Mobile-first responsive design
- 🕵️ Secret unlock gesture (draw Z anywhere on screen)

---

## Quick Start (local)

```bash
git clone https://github.com/YOUR_USERNAME/zerox-chat
cd zerox-chat
npm install
npm start
# open http://localhost:3000
```

---

## Deploy to Railway (free, recommended)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo → Railway auto-detects Node.js
4. Set **Start Command**: `node server.js`
5. Railway gives you a public URL — share it with her 💗

---

## Deploy to Render (free alternative)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect GitHub
3. Build command: `npm install`
4. Start command: `node server.js`
5. Choose **Free** plan → Deploy

---

## Customise Everything

Edit **`public/config.js`** — no rebuild needed, just refresh:

```js
ZEROX_CONFIG = {
  unlockGesture: 'Z',        // Change to S, L, U etc.
  roomId: 'zerox-private-001', // Change to anything secret
  myName:  'zerox',           // Your display name
  herName: 'her',             // Her display name

  studySite: {
    siteTitle: 'StudyVault',  // Site name shown publicly
    subjects: [ ... ],        // Add/remove subjects
  },

  theme: { ... },             // Default colour palette
  wallpapers: [ ... ],        // Add wallpaper URLs
  stickerPacks: [ ... ],      // Add emoji packs
}
```

---

## How the Secret Unlock Works

1. **Hold** anywhere on the study page for **0.6 seconds**
2. **Draw Z** with your finger/mouse without lifting
3. Chat slides in ✨

To switch the letter, change `unlockGesture: 'Z'` in config.js.  
Supported shapes: `Z`, `S`, `L`, `U`

---

## File Structure

```
zerox-chat/
├── server.js          # Node.js WebSocket + Express server
├── package.json
└── public/
    ├── index.html     # Study site + chat shell
    ├── config.js      # All settings (edit this!)
    ├── study.css      # Study site styles
    ├── chat.css       # Chat UI styles
    ├── gesture.js     # Draw-to-unlock detector
    └── chat.js        # Chat logic, themes, stickers
```

---

## Share the Link

Send her the deployed URL. Both of you use the same `roomId` in config.js.  
Messages are shared in real time. History is kept in memory (resets on server restart).

---

made with 💗
