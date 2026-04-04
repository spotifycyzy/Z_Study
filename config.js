/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — config.js
   All customisable settings live here.
   Edit freely — no rebuild needed.
═══════════════════════════════════════════════════════════ */
const ZEROX_CONFIG = {

  /* ── SECRET UNLOCK ─────────────────────────────────────
     Draw this letter/shape on screen to reveal chat.
     Supported: 'Z', 'S', 'L', 'U', 'heart'
  ──────────────────────────────────────────────────────── */
  unlockGesture: 'Z',

  /* ── ROOM ──────────────────────────────────────────────
     Anyone with the same roomId shares the same chat.
     Change this to anything secret.
  ──────────────────────────────────────────────────────── */
  roomId: 'zerox-private-001',

  /* ── YOUR NAME & HER NAME ───────────────────────────── */
  myName:  'zerox',
  herName: 'her',

  /* ── STUDY SITE CONTENT ────────────────────────────────
     Add/remove subjects. Each subject has:
       - title, icon, chapters[]
  ──────────────────────────────────────────────────────── */
  studySite: {
    siteTitle:  'StudyVault',
    tagline:    'Your personal knowledge library',
    subjects: [
      {
        title: 'Physics',
        icon:  '⚛️',
        chapters: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Modern Physics'],
      },
      {
        title: 'Mathematics',
        icon:  '∑',
        chapters: ['Calculus', 'Linear Algebra', 'Statistics', 'Discrete Math', 'Number Theory'],
      },
      {
        title: 'Chemistry',
        icon:  '⚗️',
        chapters: ['Organic', 'Inorganic', 'Physical Chemistry', 'Biochemistry'],
      },
      {
        title: 'Computer Science',
        icon:  '💻',
        chapters: ['Data Structures', 'Algorithms', 'Operating Systems', 'Networks', 'DBMS'],
      },
      {
        title: 'Literature',
        icon:  '📖',
        chapters: ['Poetry', 'Fiction', 'Drama', 'Essays', 'Literary Theory'],
      },
    ],
  },

  /* ── CHAT THEME ────────────────────────────────────────
     Swap these hex values to repaint the whole chat.
  ──────────────────────────────────────────────────────── */
  theme: {
    bg:          '#0D0008',
    surface:     '#1A0010',
    surfaceHigh: '#2A0018',
    border:      'rgba(232,67,106,0.22)',
    rose:        '#E8436A',
    blush:       '#FFB5C8',
    magenta:     '#C2005F',
    wine:        '#6E0030',
    champagne:   '#FFE8EF',
    myBubble:    'linear-gradient(135deg,#E8436A,#C2005F)',
    herBubble:   '#2A0018',
    text:        '#FFE8EF',
    textMuted:   'rgba(255,232,239,0.55)',
  },

  /* ── WALLPAPERS ────────────────────────────────────────
     URL or local path. First one is default.
  ──────────────────────────────────────────────────────── */
  wallpapers: [
    '',                                         // default dark (no image)
    'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=60',
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=60',
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=60',
  ],

  /* ── STICKER PACKS ─────────────────────────────────────
     Telegram sticker packs (WebP URLs) or emoji arrays.
     Add as many packs as you want.
  ──────────────────────────────────────────────────────── */
  stickerPacks: [
    {
      name: 'Love',
      stickers: ['❤️','💗','💕','💞','💓','💘','💝','🌹','🥰','😍','😘','💋','🫦','💌','🫶'],
    },
    {
      name: 'Cute',
      stickers: ['🐱','🐰','🐻','🐼','🐨','🦊','🐸','🐧','🦋','🌸','🌺','🌻','🍓','🍑','✨'],
    },
    {
      name: 'Vibes',
      stickers: ['🔥','💫','⭐','🌙','☀️','🌈','🎵','🎶','🪄','💎','🫧','🌊','❄️','🍃','🌿'],
    },
  ],
};
