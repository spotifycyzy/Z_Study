/* ═══════════════════════════════════════════════════════════
   NOTES — notes.js
   AI-generated notes viewer using Anthropic API
═══════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const viewer      = document.getElementById('notesViewer');
  const notesBack   = document.getElementById('notesBack');
  const notesSubject= document.getElementById('notesSubject');
  const notesTitleEl= document.getElementById('notesTitle');
  const notesLoading= document.getElementById('notesLoading');
  const notesContent= document.getElementById('notesContent');
  const notesBookmark=document.getElementById('notesBookmark');

  let bookmarks = JSON.parse(localStorage.getItem('zx_bookmarks') || '[]');
  let noteCache = JSON.parse(localStorage.getItem('zx_noteCache') || '{}');

  /* ── Open notes for a chapter ───────────────────────────── */
  window.openNotes = function (subject, chapter) {
    viewer.classList.remove('hidden');
    notesSubject.textContent = subject;
    notesTitleEl.textContent = chapter;
    notesLoading.style.display = 'block';
    notesContent.style.display = 'none';
    notesContent.innerHTML = '';

    // Update bookmark button
    const key = subject + '::' + chapter;
    notesBookmark.textContent = bookmarks.includes(key) ? '🔖' : '🔲';
    notesBookmark.onclick = () => toggleBookmark(subject, chapter);

    // Track recently viewed
    trackRecent(subject, chapter);

    // Check cache first
    if (noteCache[key]) {
      showNotes(noteCache[key]);
      return;
    }

    // Generate with Claude API
    generateNotes(subject, chapter, key);
  };

  function generateNotes(subject, chapter, key) {
    const prompt = `You are an expert tutor. Generate comprehensive, well-structured study notes for:
Subject: ${subject}
Chapter: ${chapter}

Format the notes in clean HTML using only these tags: h1, h2, h3, p, ul, ol, li, strong, em, code, blockquote, div.
For key takeaways use: <div class="key-point"><strong>Key Point:</strong> ...</div>
Make notes detailed, educational, with examples. Include:
- Overview / introduction
- Core concepts (with subheadings)  
- Key formulas or rules (if applicable)
- Real-world examples
- Quick revision summary
Keep it thorough but scannable. Return ONLY the HTML content, no backticks or markdown.`;

    const apiKey = ZEROX_CONFIG.anthropicApiKey || '';
    if (!apiKey) { showNotes('<p style="color:#E8436A">⚠️ Please add your Anthropic API key in <code>config.js</code> to enable AI notes.</p>'); return; }
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    .then(r => r.json())
    .then(data => {
      const html = data.content?.[0]?.text || '<p>Could not generate notes. Please try again.</p>';
      noteCache[key] = html;
      try { localStorage.setItem('zx_noteCache', JSON.stringify(noteCache)); } catch {}
      showNotes(html);
    })
    .catch(() => {
      showNotes('<p>Network error. Please check your connection and try again.</p>');
    });
  }

  function showNotes(html) {
    notesLoading.style.display = 'none';
    notesContent.style.display = 'block';
    notesContent.innerHTML = html;
  }

  /* ── Back button ────────────────────────────────────────── */
  notesBack.addEventListener('click', () => {
    viewer.classList.add('hidden');
  });

  /* ── Bookmarks ──────────────────────────────────────────── */
  function toggleBookmark(subject, chapter) {
    const key = subject + '::' + chapter;
    const idx = bookmarks.indexOf(key);
    if (idx === -1) { bookmarks.push(key); notesBookmark.textContent = '🔖'; }
    else            { bookmarks.splice(idx, 1); notesBookmark.textContent = '🔲'; }
    localStorage.setItem('zx_bookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
  }

  function renderBookmarks() {
    // Bookmarks shown in study site saved section (if present)
    const saved = document.getElementById('bookmarksList');
    if (!saved) return;
    saved.innerHTML = '';
    if (bookmarks.length === 0) {
      saved.innerHTML = '<p style="color:#7A756C;font-size:13px">No saved notes yet.</p>';
      return;
    }
    bookmarks.forEach(key => {
      const [subject, chapter] = key.split('::');
      const el = document.createElement('div');
      el.className = 'recent-item';
      el.innerHTML = `
        <div class="recent-dot" style="background:#E8436A"></div>
        <div class="recent-text">
          <div class="recent-title">${chapter}</div>
          <div class="recent-meta">${subject} · Saved</div>
        </div>
        <div class="recent-arrow">›</div>
      `;
      el.addEventListener('click', () => window.openNotes(subject, chapter));
      saved.appendChild(el);
    });
  }

  /* ── Recent ─────────────────────────────────────────────── */
  function trackRecent(subject, chapter) {
    let recent = JSON.parse(localStorage.getItem('zx_recent') || '[]');
    const entry = { subject, chapter, ts: Date.now() };
    recent = recent.filter(r => !(r.subject === subject && r.chapter === chapter));
    recent.unshift(entry);
    recent = recent.slice(0, 10);
    localStorage.setItem('zx_recent', JSON.stringify(recent));
    buildRecentList();
  }

  window.buildRecentList = function () {
    const list = document.getElementById('recentList');
    if (!list) return;
    const recent = JSON.parse(localStorage.getItem('zx_recent') || '[]');
    list.innerHTML = '';
    if (recent.length === 0) {
      list.innerHTML = '<p style="color:#7A756C;font-size:13px;padding:10px 0">No recent activity yet. Click a chapter to start.</p>';
      return;
    }
    recent.slice(0, 5).forEach(r => {
      const el = document.createElement('div');
      el.className = 'recent-item';
      const ago = timeAgo(r.ts);
      el.innerHTML = `
        <div class="recent-dot"></div>
        <div class="recent-text">
          <div class="recent-title">${r.chapter}</div>
          <div class="recent-meta">${ago} · ${r.subject}</div>
        </div>
        <div class="recent-arrow">›</div>
      `;
      el.addEventListener('click', () => window.openNotes(r.subject, r.chapter));
      list.appendChild(el);
    });
  };

  function timeAgo(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60)   return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400)return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
  }

  // Init
  renderBookmarks();
  window.buildRecentList();
})();
