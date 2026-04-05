/* ═══════════════════════════════════════════════════════════
   ZEROX CHAT — chat.js (full featured)
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Study site setup ────────────────────────────────────── */
document.getElementById('pageTitle').textContent = ZEROX_CONFIG.studySite.siteTitle;
document.getElementById('brandName').textContent = ZEROX_CONFIG.studySite.siteTitle;
const totalChapters = ZEROX_CONFIG.studySite.subjects.reduce((a,s)=>a+s.chapters.length,0);
document.getElementById('statSubjects').textContent = ZEROX_CONFIG.studySite.subjects.length;
document.getElementById('statChapters').textContent = totalChapters;

/* Build subjects grid */
const grid = document.getElementById('subjectsGrid');
ZEROX_CONFIG.studySite.subjects.forEach(sub => {
  const card = document.createElement('div');
  card.className = 'subject-card';
  card.innerHTML = `<div class="subject-icon">${sub.icon}</div><div class="subject-title">${sub.title}</div><div class="subject-chapters">${sub.chapters.length} chapters</div><span class="subject-tag">Explore →</span>`;
  card.addEventListener('click', () => openSubject(sub));
  grid.appendChild(card);
});

function openSubject(sub) {
  const old = document.getElementById('subjectModal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'subjectModal';
  modal.style.cssText = 'position:fixed;inset:52px 0 0 0;z-index:400;background:#05000A;overflow-y:auto;animation:notesSlideIn 0.25s ease;border-top:1px solid rgba(180,80,255,0.18)';
  modal.innerHTML = `
    <div style="max-width:700px;margin:0 auto;padding:28px 16px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <button onclick="document.getElementById('subjectModal').remove()" style="background:rgba(180,80,255,0.08);border:1.5px solid rgba(180,80,255,0.25);border-radius:8px;padding:7px 14px;font-family:Sora,sans-serif;font-size:13px;color:rgba(240,232,255,0.7);cursor:pointer">← Back</button>
        <span style="font-size:30px">${sub.icon}</span>
        <h2 style="font-size:22px;font-weight:700;color:#F0E8FF;text-shadow:0 0 12px rgba(180,80,255,0.4)">${sub.title}</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">
        ${sub.chapters.map(ch=>`
          <div onclick="document.getElementById('subjectModal').remove();window.openNotes('${sub.title.replace(/'/g,"\\'")}','${ch.replace(/'/g,"\\'")}');"
            style="padding:18px;background:#0E0018;border:1.5px solid rgba(180,80,255,0.18);border-radius:14px;cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden"
            onmouseover="this.style.borderColor='#B450FF';this.style.boxShadow='0 0 16px rgba(180,80,255,0.2)';this.style.transform='translateY(-3px)'"
            onmouseout="this.style.borderColor='rgba(180,80,255,0.18)';this.style.boxShadow='none';this.style.transform=''">
            <div style="font-size:14px;font-weight:600;color:#F0E8FF;margin-bottom:6px">${ch}</div>
            <div style="font-size:11px;color:#B450FF;font-weight:700">Read notes →</div>
          </div>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(modal);
}

/* Search */
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  let dd = document.getElementById('searchDropdown');
  if (!q) { if (dd) dd.remove(); return; }
  if (!dd) { dd = document.createElement('div'); dd.id='searchDropdown'; dd.className='search-results'; searchInput.parentElement.appendChild(dd); }
  const results = [];
  ZEROX_CONFIG.studySite.subjects.forEach(sub => sub.chapters.forEach(ch => { if (ch.toLowerCase().includes(q)||sub.title.toLowerCase().includes(q)) results.push({subject:sub.title,chapter:ch}); }));
  dd.innerHTML = results.length===0 ? '<div class="search-result-item"><span class="sr-chapter">No results</span></div>'
    : results.slice(0,8).map(r=>`<div class="search-result-item" onclick="document.getElementById('searchDropdown').remove();document.getElementById('searchInput').value='';window.openNotes('${r.subject.replace(/'/g,"\\'")}','${r.chapter.replace(/'/g,"\\'")}')"><div class="sr-chapter">${r.chapter}</div><div class="sr-subject">${r.subject}</div></div>`).join('');
});
document.addEventListener('click', e => { if (!e.target.closest('.nav-search')) { const d=document.getElementById('searchDropdown'); if(d) d.remove(); } });
if (window.buildRecentList) window.buildRecentList();

/* Blossoms on study site */
(function spawnBlossoms() {
  const c = document.getElementById('blossomContainer');
  const COLS = ['rgba(180,80,255,0.65)','rgba(232,67,106,0.6)','rgba(255,181,200,0.55)','rgba(194,0,95,0.5)','rgba(140,0,220,0.5)'];
  for (let i=0;i<40;i++) {
    const p=document.createElement('div'); p.className='blossom';
    const w=6+Math.random()*9,h=w*(1.3+Math.random()*0.5),bx=(Math.random()-0.5)*130;
    p.style.cssText=`left:${Math.random()*110-5}%;width:${w}px;height:${h}px;background:${COLS[i%COLS.length]};--bx:${bx}px;animation-duration:${7+Math.random()*10}s;animation-delay:${Math.random()*-20}s;filter:blur(${0.2+Math.random()*0.6}px)`;
    c.appendChild(p);
  }
})();

/* ── DOM ─────────────────────────────────────────────────── */
const chatApp=document.getElementById('chatApp'),unlockScreen=document.getElementById('unlockScreen'),chatMain=document.getElementById('chatMain');
const nameInput=document.getElementById('nameInput'),enterChatBtn=document.getElementById('enterChat'),roomHint=document.getElementById('roomHint');
const messagesInner=document.getElementById('messagesInner'),messagesArea=document.getElementById('messagesArea');
const msgInput=document.getElementById('msgInput'),sendBtn=document.getElementById('sendBtn'),typingBar=document.getElementById('typingBar');
const chatOnline=document.getElementById('chatOnline'),sidebarOnline=document.getElementById('sidebarOnline'),sidebarRoom=document.getElementById('sidebarRoom'),chatRoomName=document.getElementById('chatRoomName');
const stickerPicker=document.getElementById('stickerPicker'),stickerTabs=document.getElementById('stickerTabs'),stickerGrid=document.getElementById('stickerGrid'),stickerToggle=document.getElementById('stickerToggle');
const themeSwatches=document.getElementById('themeSwatches'),wallpaperGrid=document.getElementById('wallpaperGrid');
const chatSidebar=document.getElementById('chatSidebar'),openSidebar=document.getElementById('openSidebar'),closeSidebar=document.getElementById('closeSidebar'),hideChatBtn=document.getElementById('hideChatBtn');
const clearHistoryBtn=document.getElementById('clearHistoryBtn'),customBgInput=document.getElementById('customBgInput');
const attachBtn=document.getElementById('attachBtn'),mediaInput=document.getElementById('mediaInput'),voiceBtn=document.getElementById('voiceBtn');
const replyBar=document.getElementById('replyBar'),replyBarText=document.getElementById('replyBarText'),replyBarCancel=document.getElementById('replyBarCancel');
const callBtn=document.getElementById('callBtn'),callOverlay=document.getElementById('callOverlay'),callEnd=document.getElementById('callEnd'),callMute=document.getElementById('callMute'),callName=document.getElementById('callName'),callStatus=document.getElementById('callStatus'),callAvatar=document.getElementById('callAvatar');

roomHint.textContent=ZEROX_CONFIG.roomId; sidebarRoom.textContent=ZEROX_CONFIG.roomId; chatRoomName.textContent='zerox · '+ZEROX_CONFIG.roomId.split('-')[0];

/* ── State ───────────────────────────────────────────────── */
let ws=null,myName='',myId='u_'+Math.random().toString(36).slice(2);
let typingTimer=null,isTyping=false,connected=false;
let replyTo=null; // {id, name, text}
let mediaRecorder=null,audioChunks=[],isRecording=false;
let allMessages={}; // id -> msg obj for replies/reactions/delete

/* ── Gesture unlock ──────────────────────────────────────── */
window._chatUnlock=function(){
  chatApp.classList.remove('hidden');
  requestAnimationFrame(()=>chatApp.classList.add('visible'));
};

/* ── Enter chat ──────────────────────────────────────────── */
nameInput.value=localStorage.getItem('zerox_name')||'';
enterChatBtn.addEventListener('click',enterChat);
nameInput.addEventListener('keydown',e=>{if(e.key==='Enter')enterChat();});
function enterChat(){
  const name=nameInput.value.trim()||ZEROX_CONFIG.myName;
  myName=name; localStorage.setItem('zerox_name',name);
  unlockScreen.style.opacity='0'; unlockScreen.style.pointerEvents='none';
  setTimeout(()=>{unlockScreen.style.display='none';},400);
  chatMain.classList.remove('hidden');
  spawnChatBlossoms();
  connectWS();
}

/* Blossoms inside chat */
function spawnChatBlossoms(){
  const c=document.getElementById('chatBlossoms');
  c.innerHTML='';
  const COLS=['rgba(232,67,106,0.45)','rgba(255,181,200,0.4)','rgba(194,0,95,0.35)','rgba(255,107,157,0.4)'];
  for(let i=0;i<28;i++){
    const p=document.createElement('div'); p.className='blossom';
    const w=5+Math.random()*8,bx=(Math.random()-0.5)*100;
    p.style.cssText=`left:${Math.random()*110-5}%;width:${w}px;height:${w*(1.3+Math.random()*0.5)}px;background:${COLS[i%COLS.length]};--bx:${bx}px;animation-duration:${8+Math.random()*10}s;animation-delay:${Math.random()*-18}s;filter:blur(${0.2+Math.random()*0.5}px);border-radius:50% 10% 50% 10%;position:absolute;opacity:0;animation-name:blossomFall;animation-timing-function:linear;animation-iteration-count:infinite`;
    c.appendChild(p);
  }
}

/* ── WebSocket ───────────────────────────────────────────── */
function connectWS(){
  const proto=location.protocol==='https:'?'wss':'ws';
  ws=new WebSocket(`${proto}://${location.host}`);
  ws.addEventListener('open',()=>{
    connected=true;
    ws.send(JSON.stringify({type:'join',room:ZEROX_CONFIG.roomId,name:myName}));
  });
  ws.addEventListener('message',e=>{
    let msg; try{msg=JSON.parse(e.data);}catch{return;}
    handleIncoming(msg);
  });
  ws.addEventListener('close',()=>{connected=false;setTimeout(connectWS,3000);});
  ws.addEventListener('error',()=>ws.close());
}
function send(obj){if(ws&&connected&&ws.readyState===1)ws.send(JSON.stringify(obj));}
window._zxSendSync=data=>send(data);

/* ── Incoming ────────────────────────────────────────────── */
function handleIncoming(msg){
  switch(msg.type){
    case 'history': messagesInner.innerHTML=''; msg.messages.forEach(m=>{allMessages[m.id]=m;renderMessage(m);}); scrollBottom(); break;
    case 'message': case 'sticker': case 'media': case 'voice':
      allMessages[msg.id]=msg; renderMessage(msg); scrollBottom(); break;
    case 'system': renderSystem(msg.text); scrollBottom(); break;
    case 'typing': if(msg.name!==myName) typingBar.textContent=msg.active?`${msg.name} is typing…`:''; break;
    case 'online': chatOnline.textContent=`● ${msg.count} online`; sidebarOnline.textContent=`● ${msg.count} online`; break;
    case 'cleared': messagesInner.innerHTML=''; allMessages={}; renderSystem('History cleared'); break;
    case 'musicSync': if(window._zxReceiveSync)window._zxReceiveSync(msg); break;
    case 'reaction': applyReaction(msg); break;
    case 'deleteMsg': removeMessageEl(msg.msgId); break;
    case 'callRequest': handleIncomingCall(msg); break;
    case 'callAccept': startCall(msg); break;
    case 'callEnd': endCall(false); break;
  }
}

/* ── Render message ──────────────────────────────────────── */
const REACTION_EMOJIS=['❤️','😂','😮','😢','👍','🔥','💗','✨'];

function renderMessage(msg){
  const mine=msg.name===myName;
  const row=document.createElement('div');
  row.className=`msg-row ${mine?'mine':'theirs'}`;
  row.dataset.id=msg.id;
  const initial=(msg.name||'?')[0].toUpperCase();
  const timeStr=new Date(msg.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});

  let replyHtml='';
  if(msg.replyTo){
    const ref=allMessages[msg.replyTo];
    replyHtml=`<div class="msg-reply-ref">↩ ${ref?escapeHtml(ref.name)+': '+(ref.text||'[media]'):'Deleted message'}</div>`;
  }

  let bubbleInner='';
  if(msg.type==='sticker'){
    bubbleInner=`<div class="msg-bubble msg-sticker">${msg.emoji||''}</div>`;
  } else if(msg.type==='media'){
    bubbleInner=buildMediaBubble(msg);
  } else if(msg.type==='voice'){
    bubbleInner=buildVoiceBubble(msg);
  } else {
    bubbleInner=`<div class="msg-bubble">${replyHtml}${linkify(escapeHtml(msg.text||''))}</div>`;
  }

  const reactionsHtml=renderReactionsHtml(msg);

  row.innerHTML=`
    <div class="msg-avatar">${initial}</div>
    <div class="msg-bubble-wrap">
      ${!mine?`<div class="msg-name">${escapeHtml(msg.name)}</div>`:''}
      ${bubbleInner}
      ${reactionsHtml}
      <div class="msg-time">${timeStr}</div>
    </div>`;

  // Long-press / right-click context menu
  const bubble=row.querySelector('.msg-bubble,.msg-sticker,.msg-media,.msg-file,.msg-voice');
  if(bubble){
    let pressTimer;
    bubble.addEventListener('contextmenu',e=>{e.preventDefault();showCtxMenu(e,msg,mine);});
    bubble.addEventListener('pointerdown',e=>{pressTimer=setTimeout(()=>showCtxMenu(e,msg,mine),600);});
    bubble.addEventListener('pointerup',()=>clearTimeout(pressTimer));
    bubble.addEventListener('pointercancel',()=>clearTimeout(pressTimer));
  }
  messagesInner.appendChild(row);
}

function renderReactionsHtml(msg){
  if(!msg.reactions||!Object.keys(msg.reactions).length) return '';
  const counts={};
  Object.values(msg.reactions).forEach(e=>{counts[e]=(counts[e]||0)+1;});
  const pills=Object.entries(counts).map(([e,n])=>`<span class="reaction-pill">${e}<span class="r-count">${n}</span></span>`).join('');
  return `<div class="msg-reactions" data-id="${msg.id}">${pills}</div>`;
}

function buildMediaBubble(msg){
  if(msg.mediaType&&msg.mediaType.startsWith('image/')){
    return `<div class="msg-media"><img src="${msg.mediaUrl}" loading="lazy" onclick="window.open('${msg.mediaUrl}')"/></div>`;
  } else if(msg.mediaType&&msg.mediaType.startsWith('video/')){
    return `<div class="msg-media"><video src="${msg.mediaUrl}" controls style="max-width:220px;border-radius:10px"></video></div>`;
  } else {
    const icon=msg.mediaType&&msg.mediaType.includes('pdf')?'📄':msg.mediaType&&msg.mediaType.includes('audio')?'🎵':'📎';
    return `<div class="msg-bubble"><div class="msg-file" onclick="window.open('${msg.mediaUrl}')"><span class="file-icon">${icon}</span><div class="file-info"><div class="file-name">${escapeHtml(msg.fileName||'File')}</div><div class="file-size">${msg.fileSize||''}</div></div></div></div>`;
  }
}

function buildVoiceBubble(msg){
  const id='v_'+msg.id;
  return `<div class="msg-bubble"><div class="msg-voice"><button class="voice-play-btn" onclick="playVoice('${id}','${msg.audioUrl}')">▶</button><div class="voice-waveform"><span style="height:40%"></span><span style="height:70%"></span><span style="height:100%"></span><span style="height:60%"></span><span style="height:35%"></span></div><span class="voice-dur" id="${id}_dur">${msg.duration||'0:00'}</span></div></div>`;
}

window.playVoice=function(id,url){
  const audio=new Audio(url);
  const btn=document.querySelector(`#${id}_dur`);
  audio.play();
  const interval=setInterval(()=>{
    if(btn)btn.textContent=formatDur(audio.currentTime);
    if(audio.ended){clearInterval(interval);if(btn)btn.textContent=formatDur(audio.duration);}
  },200);
};

function formatDur(s){const m=Math.floor(s/60);return `${m}:${String(Math.floor(s%60)).padStart(2,'0')}`;}

function renderSystem(text){
  const el=document.createElement('div'); el.className='msg-system'; el.textContent=text; messagesInner.appendChild(el);
}
function scrollBottom(){requestAnimationFrame(()=>{messagesArea.scrollTop=messagesArea.scrollHeight;});}

/* ── Context menu ────────────────────────────────────────── */
function showCtxMenu(e,msg,mine){
  document.querySelectorAll('.ctx-menu,.reaction-picker').forEach(el=>el.remove());
  const x=e.clientX||e.touches?.[0]?.clientX||100, y=e.clientY||e.touches?.[0]?.clientY||100;

  // Reaction picker
  const rp=document.createElement('div'); rp.className='reaction-picker';
  REACTION_EMOJIS.forEach(em=>{
    const s=document.createElement('span'); s.className='react-emoji'; s.textContent=em;
    s.addEventListener('click',()=>{send({type:'reaction',msgId:msg.id,emoji:em});rp.remove();ctx.remove();});
    rp.appendChild(s);
  });
  rp.style.left=Math.min(x,window.innerWidth-240)+'px';
  rp.style.top=Math.max(y-80,60)+'px';
  document.body.appendChild(rp);

  // Context menu
  const ctx=document.createElement('div'); ctx.className='ctx-menu';
  ctx.style.left=Math.min(x,window.innerWidth-180)+'px';
  ctx.style.top=Math.min(y+4,window.innerHeight-180)+'px';
  const items=[
    {label:'↩ Reply',action:()=>startReply(msg)},
    {label:'📋 Copy',action:()=>{navigator.clipboard?.writeText(msg.text||'');}},
    ...(mine?[{label:'🗑 Delete',danger:true,action:()=>deleteMsg(msg.id)}]:[]),
  ];
  items.forEach(item=>{
    const d=document.createElement('div');
    d.className='ctx-item'+(item.danger?' danger':'');
    d.textContent=item.label;
    d.addEventListener('click',()=>{item.action();ctx.remove();rp.remove();});
    ctx.appendChild(d);
  });
  document.body.appendChild(ctx);
  setTimeout(()=>document.addEventListener('pointerdown',()=>{ctx.remove();rp.remove();},{once:true}),50);
}

/* ── Reply ───────────────────────────────────────────────── */
function startReply(msg){
  replyTo=msg;
  replyBar.classList.add('active');
  replyBarText.textContent=`${msg.name}: ${msg.text||'[media]'}`;
  msgInput.focus();
}
replyBarCancel.addEventListener('click',()=>{replyTo=null;replyBar.classList.remove('active');});

/* ── Delete ──────────────────────────────────────────────── */
function deleteMsg(id){send({type:'deleteMsg',msgId:id});}
function removeMessageEl(id){
  const el=messagesInner.querySelector(`[data-id="${id}"]`);
  if(el){const b=el.querySelector('.msg-bubble');if(b){b.innerHTML='<em style="opacity:0.4;font-size:12px">Message deleted</em>';}}
  if(allMessages[id])allMessages[id].deleted=true;
}

/* ── Reactions ───────────────────────────────────────────── */
function applyReaction(msg){
  if(!allMessages[msg.msgId])return;
  if(!allMessages[msg.msgId].reactions)allMessages[msg.msgId].reactions={};
  allMessages[msg.msgId].reactions[msg.userId]=msg.emoji;
  const row=messagesInner.querySelector(`[data-id="${msg.msgId}"]`);
  if(!row)return;
  let reacts=row.querySelector('.msg-reactions');
  if(!reacts){reacts=document.createElement('div');reacts.className='msg-reactions';reacts.dataset.id=msg.msgId;row.querySelector('.msg-bubble-wrap').insertBefore(reacts,row.querySelector('.msg-time'));}
  reacts.innerHTML=renderReactionsHtml(allMessages[msg.msgId]).replace(/<div[^>]*>|<\/div>/g,'');
}

/* ── Send message ────────────────────────────────────────── */
sendBtn.addEventListener('click',sendMessage);
msgInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});
msgInput.addEventListener('input',()=>{
  msgInput.style.height='auto';
  msgInput.style.height=Math.min(msgInput.scrollHeight,120)+'px';
  handleTyping();
});
function sendMessage(){
  const text=msgInput.value.trim();
  if(!text||!connected)return;
  const payload={type:'message',text};
  if(replyTo){payload.replyTo=replyTo.id;}
  send(payload);
  msgInput.value=''; msgInput.style.height='auto';
  replyTo=null; replyBar.classList.remove('active');
  stopTyping();
}
function handleTyping(){if(!isTyping){isTyping=true;send({type:'typing',active:true});}clearTimeout(typingTimer);typingTimer=setTimeout(stopTyping,1800);}
function stopTyping(){if(!isTyping)return;isTyping=false;send({type:'typing',active:false});}

/* ── Media / file attach ─────────────────────────────────── */
attachBtn.addEventListener('click',()=>mediaInput.click());
mediaInput.addEventListener('change',()=>{
  const file=mediaInput.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const dataUrl=e.target.result;
    const sizeStr=formatFileSize(file.size);
    send({type:'media',mediaUrl:dataUrl,mediaType:file.type,fileName:file.name,fileSize:sizeStr,replyTo:replyTo?.id||null});
    replyTo=null; replyBar.classList.remove('active');
  };
  reader.readAsDataURL(file);
  mediaInput.value='';
});
function formatFileSize(b){if(b<1024)return b+'B';if(b<1048576)return (b/1024).toFixed(1)+'KB';return (b/1048576).toFixed(1)+'MB';}

/* ── Voice notes ─────────────────────────────────────────── */
voiceBtn.addEventListener('pointerdown',startRecording);
voiceBtn.addEventListener('pointerup',stopRecording);
voiceBtn.addEventListener('pointercancel',stopRecording);
function startRecording(){
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    audioChunks=[]; isRecording=true;
    voiceBtn.classList.add('recording');
    mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.ondataavailable=e=>audioChunks.push(e.data);
    mediaRecorder.start();
  }).catch(()=>alert('Microphone access denied'));
}
function stopRecording(){
  if(!isRecording||!mediaRecorder)return;
  isRecording=false; voiceBtn.classList.remove('recording');
  mediaRecorder.onstop=()=>{
    const blob=new Blob(audioChunks,{type:'audio/webm'});
    const reader=new FileReader();
    reader.onload=e=>send({type:'voice',audioUrl:e.target.result,duration:'0:03'});
    reader.readAsDataURL(blob);
    mediaRecorder.stream.getTracks().forEach(t=>t.stop());
  };
  mediaRecorder.stop();
}

/* ── Stickers ────────────────────────────────────────────── */
ZEROX_CONFIG.stickerPacks.forEach((pack,i)=>{
  const tab=document.createElement('div'); tab.className=`sticker-tab${i===0?' active':''}`;
  tab.textContent=pack.name;
  tab.addEventListener('click',()=>{document.querySelectorAll('.sticker-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');renderStickers(i);});
  stickerTabs.appendChild(tab);
});
// Extra emojis pack
const extraPack={name:'More',stickers:['🫶','🤝','👀','💯','🎉','🥳','😴','🤩','🥺','😭','😡','🤣','🫠','🥹','🤯','😎','🧠','💪','🌟','🍀','🌸','🦄','🐉','🎵','🎶','🎸','🎹','🥁','🎤','🎬']};
[...ZEROX_CONFIG.stickerPacks,extraPack].forEach((pack,i)=>{});
function renderStickers(idx){
  stickerGrid.innerHTML='';
  const packs=[...ZEROX_CONFIG.stickerPacks,extraPack];
  (packs[idx]||packs[0]).stickers.forEach(s=>{
    const el=document.createElement('div'); el.className='sticker-item'; el.textContent=s;
    el.addEventListener('click',()=>{send({type:'sticker',emoji:s});stickerPicker.classList.add('hidden');});
    stickerGrid.appendChild(el);
  });
}
// Re-build sticker tabs properly
stickerTabs.innerHTML='';
const allPacks=[...ZEROX_CONFIG.stickerPacks,extraPack];
allPacks.forEach((pack,i)=>{
  const tab=document.createElement('div'); tab.className=`sticker-tab${i===0?' active':''}`;
  tab.textContent=pack.name;
  tab.addEventListener('click',()=>{document.querySelectorAll('.sticker-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');renderStickers(i);});
  stickerTabs.appendChild(tab);
});
renderStickers(0);
stickerToggle.addEventListener('click',()=>stickerPicker.classList.toggle('hidden'));

/* ── Themes ──────────────────────────────────────────────── */
const THEMES=[
  {name:'Rose',bg:'#0D0008',surface:'#1A0010',surfaceHigh:'#2A0018',border:'rgba(232,67,106,0.22)',rose:'#E8436A',blush:'#FFB5C8',magenta:'#C2005F',text:'#FFE8EF',textMuted:'rgba(255,232,239,0.55)',myBubble:'linear-gradient(135deg,#E8436A,#C2005F)',herBubble:'#2A0018',swatch:'#E8436A'},
  {name:'Midnight',bg:'#080812',surface:'#10102A',surfaceHigh:'#1A1A3A',border:'rgba(100,120,255,0.22)',rose:'#6478FF',blush:'#B8C4FF',magenta:'#4050DD',text:'#E8ECFF',textMuted:'rgba(232,236,255,0.5)',myBubble:'linear-gradient(135deg,#6478FF,#4050DD)',herBubble:'#1A1A3A',swatch:'#6478FF'},
  {name:'Forest',bg:'#060E08',surface:'#0E1A10',surfaceHigh:'#182218',border:'rgba(80,180,100,0.22)',rose:'#50B464',blush:'#A8E0B0',magenta:'#288A3C',text:'#E0F4E4',textMuted:'rgba(224,244,228,0.5)',myBubble:'linear-gradient(135deg,#50B464,#288A3C)',herBubble:'#182218',swatch:'#50B464'},
  {name:'Amber',bg:'#0E0800',surface:'#1A1000',surfaceHigh:'#2A1A00',border:'rgba(230,160,40,0.22)',rose:'#E6A028',blush:'#FFD890',magenta:'#C07800',text:'#FFF4DC',textMuted:'rgba(255,244,220,0.5)',myBubble:'linear-gradient(135deg,#E6A028,#C07800)',herBubble:'#2A1A00',swatch:'#E6A028'},
  {name:'Neon',bg:'#000A0A',surface:'#001818',surfaceHigh:'#002020',border:'rgba(0,255,200,0.2)',rose:'#00FFC8',blush:'#80FFE0',magenta:'#00CCA0',text:'#E0FFF8',textMuted:'rgba(224,255,248,0.5)',myBubble:'linear-gradient(135deg,#00FFC8,#00A080)',herBubble:'#002020',swatch:'#00FFC8'},
];
function applyTheme(t){
  const r=document.documentElement.style;
  r.setProperty('--c-bg',t.bg);r.setProperty('--c-surface',t.surface);r.setProperty('--c-surfaceHigh',t.surfaceHigh);
  r.setProperty('--c-border',t.border);r.setProperty('--c-rose',t.rose);r.setProperty('--c-blush',t.blush);
  r.setProperty('--c-magenta',t.magenta);r.setProperty('--c-text',t.text);r.setProperty('--c-textMuted',t.textMuted);
  r.setProperty('--c-myBubble',t.myBubble);r.setProperty('--c-herBubble',t.herBubble);
  localStorage.setItem('zerox_theme',t.name);
}
THEMES.forEach((t,i)=>{
  const sw=document.createElement('div'); sw.className='theme-swatch'; sw.style.background=t.swatch; sw.title=t.name;
  sw.addEventListener('click',()=>{document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.remove('active'));sw.classList.add('active');applyTheme(t);});
  themeSwatches.appendChild(sw);
  const saved=localStorage.getItem('zerox_theme');
  if((!saved&&i===0)||saved===t.name){sw.classList.add('active');applyTheme(t);}
});

/* ── Wallpapers ──────────────────────────────────────────── */
const chatWindow=document.querySelector('.chat-window');
function setWallpaper(url,idx){
  chatWindow.style.setProperty('--wallpaper-url',url?`url('${url}')`:'none');
  localStorage.setItem('zerox_wallpaper',idx);
  document.querySelectorAll('.wallpaper-thumb').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.wallpaper-thumb')[idx]?.classList.add('active');
}
ZEROX_CONFIG.wallpapers.forEach((url,i)=>{
  const thumb=document.createElement('div'); thumb.className='wallpaper-thumb';
  if(!url){thumb.classList.add('wp-none');thumb.textContent='🚫';}
  else thumb.style.backgroundImage=`url('${url}')`;
  thumb.addEventListener('click',()=>setWallpaper(url,i));
  wallpaperGrid.appendChild(thumb);
});
const savedWp=parseInt(localStorage.getItem('zerox_wallpaper')||'0');
setWallpaper(ZEROX_CONFIG.wallpapers[savedWp]||'',savedWp);

/* Custom background */
customBgInput.addEventListener('change',()=>{
  const file=customBgInput.files[0]; if(!file)return;
  const url=URL.createObjectURL(file);
  chatWindow.style.setProperty('--wallpaper-url',`url('${url}')`);
});

/* ── Sidebar ─────────────────────────────────────────────── */
openSidebar.addEventListener('click',()=>chatSidebar.classList.add('open'));
closeSidebar.addEventListener('click',()=>chatSidebar.classList.remove('open'));

/* ── Hide chat ───────────────────────────────────────────── */
hideChatBtn.addEventListener('click',()=>{
  chatApp.classList.remove('visible');
  setTimeout(()=>chatApp.classList.add('hidden'),400);
  if(ws){ws.close();connected=false;ws=null;}
});

/* ── Clear history ───────────────────────────────────────── */
clearHistoryBtn.addEventListener('click',()=>{if(confirm('Clear all messages?'))send({type:'clear'});});

/* ── Voice call ──────────────────────────────────────────── */
let callActive=false,localStream=null,peerConnection=null;
callBtn.addEventListener('click',()=>{
  if(callActive)return;
  send({type:'callRequest',name:myName,to:'all'});
  callName.textContent='Calling…'; callStatus.textContent='ringing…';
  callAvatar.textContent=myName[0].toUpperCase();
  callOverlay.classList.remove('hidden'); callActive=true;
});
function handleIncomingCall(msg){
  if(callActive)return;
  callName.textContent=msg.name; callStatus.textContent='Incoming call…';
  callAvatar.textContent=(msg.name||'?')[0].toUpperCase();
  callOverlay.classList.remove('hidden');
  // Auto-accept for simplicity
  setTimeout(()=>{send({type:'callAccept'});startCall({});},500);
}
function startCall(msg){
  callStatus.textContent='Connected ✓';
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{localStream=stream;}).catch(()=>{});
  callActive=true;
}
function endCall(sendMsg=true){
  callOverlay.classList.add('hidden'); callActive=false;
  if(localStream)localStream.getTracks().forEach(t=>t.stop());
  if(sendMsg)send({type:'callEnd'});
}
callEnd.addEventListener('click',()=>endCall(true));
let muteOn=false;
callMute.addEventListener('click',()=>{
  muteOn=!muteOn; callMute.textContent=muteOn?'🔇':'🎤';
  if(localStream)localStream.getAudioTracks().forEach(t=>t.enabled=!muteOn);
});

/* ── Utils ───────────────────────────────────────────────── */
function escapeHtml(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function linkify(s){return s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener" style="color:var(--c-blush)">$1</a>');}
