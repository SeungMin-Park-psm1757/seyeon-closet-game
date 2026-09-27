(() => {
  'use strict';
  const data = window.GAME_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const app = $('#app');
  const key = 'seyeon-closet-save';
  const read = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const saved = read();
  const state = {
    view: 'home', mode: saved.mode || 'free', themeId: saved.themeId || '', characterId: saved.characterId || 'girl01',
    outfit: { hair: 'hair_01', ...(saved.outfit || {}) }, backgroundId: saved.backgroundId || 'room', categoryId: 'hair',
    history: [], album: Array.isArray(saved.album) ? saved.album.slice(0, 20) : [],
    completed: Math.max(0, Number(saved.completed) || 0), muted: Boolean(saved.muted), sparkle: '',
    sound: null
  };
  const itemById = Object.fromEntries(data.items.map(item => [item.id, item]));
  const charById = Object.fromEntries(data.characters.map(character => [character.id, character]));
  const backgroundById = Object.fromEntries(data.backgrounds.map(background => [background.id, background]));
  let context = null, beat = 0, bgmTimer = 0, toastTimer = 0;
  const phrases = ['예쁘다!', '멋져요!', '정말 잘 골랐어요!', '짜잔!'];

  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify({ characterId: state.characterId, outfit: state.outfit, backgroundId: state.backgroundId, themeId: state.themeId, mode: state.mode, album: state.album.slice(0, 20), completed: state.completed, muted: state.muted }));
    } catch { /* 사진은 다시 찍을 수 있고, 저장 공간이 부족해도 꾸미기는 계속됩니다. */ }
  }
  function character() { return charById[state.characterId] || data.characters[0]; }
  function background() { return backgroundById[state.backgroundId] || data.backgrounds[0]; }
  function selectedItems() { return Object.values(state.outfit).map(id => itemById[id]).filter(Boolean); }
  function unlocked(item) { return !item.lockedAt || state.completed >= item.lockedAt; }
  function pushUndo() {
    state.history.push({ outfit: { ...state.outfit }, backgroundId: state.backgroundId });
    if (state.history.length > 10) state.history.shift();
  }
  function esc(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }

  function svgItem(item, part = '') {
    if (!item) return '';
    const custom = window.ASSETS.items[item.id] || item.asset;
    if (custom) return part === 'back' ? '' : `<image href="${esc(custom)}" x="0" y="0" width="360" height="500" preserveAspectRatio="none"/>`;
    const c = item.color, v = item.variant, detail = ['✿','♥','★','✦'][v % 4];
    switch (item.category) {
      case 'hair':
        return part === 'back'
          ? `<path d="M91 139Q72 30 177 30Q287 25 270 151L263 239L236 213L232 105Q179 149 121 105L115 218L88 239Z" fill="${c}" stroke="#65413c" stroke-width="5" stroke-linejoin="round"/>`
          : `<path d="M101 119Q101 35 180 37Q259 34 260 120Q238 99 219 104Q195 112 179 97Q152 117 127 103Z" fill="${c}" stroke="#65413c" stroke-width="5"/><path d="M106 111Q105 159 121 177M254 111Q255 155 238 172" fill="none" stroke="${c}" stroke-width="17" stroke-linecap="round"/>`;
      case 'top': return `<path d="M135 212L157 202Q180 222 203 202L225 212L251 243L228 260L218 246L230 347Q180 361 130 347L142 246L132 260L109 243Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M146 216Q180 239 214 216" fill="none" stroke="#fff5e9" stroke-width="7"/><text x="180" y="300" text-anchor="middle" font-size="27" fill="#fff9e8">${detail}</text>`;
      case 'dress': return `<path d="M143 211L160 204Q180 225 200 204L217 211L237 242L218 256L207 244L259 377Q180 399 101 377L153 244L142 256L123 242Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M146 216Q180 239 214 216M118 356Q180 372 242 356" fill="none" stroke="#fff4e6" stroke-width="7"/><text x="180" y="315" text-anchor="middle" font-size="34" fill="#fff9e8">${detail}</text>`;
      case 'skirt': return `<path d="M137 307Q180 321 223 307L253 385Q180 403 107 385Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M131 329Q180 342 229 329" fill="none" stroke="#fff5e9" stroke-width="7"/><text x="180" y="373" text-anchor="middle" font-size="28" fill="#fff9e8">${detail}</text>`;
      case 'pants': return `<path d="M130 305L230 305L221 432L187 432L178 351L166 432L132 432Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M135 320L225 320" stroke="#fff5e9" stroke-width="6"/>`;
      case 'shoes': return `<path d="M119 430Q144 439 165 430L170 453Q158 469 111 460Q101 450 119 430ZM194 430Q216 439 241 430L251 451Q251 468 203 461Q186 456 194 430Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M114 453Q140 462 166 452M197 453Q225 462 248 452" stroke="#fff9ed" stroke-width="5" stroke-linecap="round"/>`;
      case 'hat': return v % 4 === 3
        ? `<path d="M136 90L145 57L166 72L180 43L196 72L218 57L225 92Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M127 94Q180 78 233 94L226 109Q180 119 134 108Z" fill="#fff1c5" stroke="#805366" stroke-width="4"/>`
        : `<path d="M143 97Q143 57 180 56Q217 57 217 97Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M123 99Q180 83 237 99Q230 114 180 113Q130 114 123 99Z" fill="#fff1c5" stroke="#805366" stroke-width="4"/><text x="180" y="96" text-anchor="middle" font-size="19">${detail}</text>`;
      case 'headAccessory': return `<path d="M153 77Q139 50 166 53L180 69L194 53Q221 50 207 77L180 91Z" fill="${c}" stroke="#805366" stroke-width="4"/><circle cx="180" cy="76" r="7" fill="#ffe99a"/>`;
      case 'accessory': return v === 4 || v === 5 || v === 6
        ? `<g fill="none" stroke="${c}" stroke-width="7"><circle cx="145" cy="137" r="21"/><circle cx="215" cy="137" r="21"/><path d="M166 137Q180 126 194 137"/></g><circle cx="145" cy="137" r="3" fill="#513832"/><circle cx="215" cy="137" r="3" fill="#513832"/>`
        : `<path d="M145 217Q180 257 215 217" fill="none" stroke="${c}" stroke-width="7"/><path d="M180 235l7 8-7 8-7-8z" fill="#ffe477"/><text x="180" y="252" text-anchor="middle" font-size="17" fill="${c}">${detail}</text>`;
      case 'bag': return `<path d="M206 257Q249 240 252 295" fill="none" stroke="#805366" stroke-width="6"/><rect x="218" y="286" width="64" height="74" rx="19" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M236 290Q238 268 251 268Q266 268 266 290" fill="none" stroke="#805366" stroke-width="5"/><text x="250" y="333" text-anchor="middle" font-size="27">${detail}</text>`;
      case 'toy': return `<g transform="translate(0 3)"><path d="M109 259Q97 250 94 270L106 292L119 280M138 268Q125 248 119 266L128 286" fill="${c}" stroke="#805366" stroke-width="4"/><circle cx="124" cy="299" r="24" fill="${c}" stroke="#805366" stroke-width="4"/><circle cx="116" cy="296" r="3" fill="#533c3a"/><circle cx="132" cy="296" r="3" fill="#533c3a"/><path d="M119 306Q124 312 130 306" fill="none" stroke="#533c3a" stroke-width="3" stroke-linecap="round"/></g>`;
      default: return '';
    }
  }

  function bodySvg(person) {
    const skin = person.skin, hair = person.hair;
    const custom = window.ASSETS.characters[person.id];
    if (custom) return `<image href="${esc(custom)}" x="0" y="0" width="360" height="500" preserveAspectRatio="none"/>`;
    const ears = person.kind === 'rabbit'
      ? `<path d="M145 89Q108 20 129 14Q157 13 168 88M190 88Q207 11 233 16Q252 25 214 103" fill="${skin}" stroke="#8c675c" stroke-width="5"/><path d="M139 73Q127 35 134 31M207 76Q223 32 232 32" stroke="#ec9aa8" stroke-width="9" stroke-linecap="round"/>`
      : person.kind === 'bear' ? `<circle cx="119" cy="76" r="31" fill="${skin}" stroke="#805747" stroke-width="5"/><circle cx="241" cy="76" r="31" fill="${skin}" stroke="#805747" stroke-width="5"/><circle cx="119" cy="76" r="15" fill="#d99b7e"/><circle cx="241" cy="76" r="15" fill="#d99b7e"/>` : '';
    const face = person.kind === 'human'
      ? `<circle cx="151" cy="137" r="5" fill="#503b38"/><circle cx="209" cy="137" r="5" fill="#503b38"/><path d="M166 170Q180 181 194 170" fill="none" stroke="#a9575d" stroke-width="4" stroke-linecap="round"/><ellipse cx="139" cy="158" rx="11" ry="6" fill="${person.blush}" opacity=".65"/><ellipse cx="221" cy="158" rx="11" ry="6" fill="${person.blush}" opacity=".65"/>`
      : `<ellipse cx="180" cy="154" rx="39" ry="30" fill="#f7e5d5"/><circle cx="162" cy="137" r="5" fill="#503b38"/><circle cx="198" cy="137" r="5" fill="#503b38"/><ellipse cx="180" cy="154" rx="7" ry="5" fill="#74514a"/><path d="M180 159Q174 169 166 163M180 159Q187 169 194 163" fill="none" stroke="#74514a" stroke-width="3" stroke-linecap="round"/><ellipse cx="139" cy="158" rx="10" ry="6" fill="${person.blush}" opacity=".65"/><ellipse cx="221" cy="158" rx="10" ry="6" fill="${person.blush}" opacity=".65"/>`;
    return `${ears}<path d="M111 145Q91 46 179 42Q270 42 250 157L237 224L218 205L221 101Q179 121 139 101L136 210L116 226Z" fill="${hair}" stroke="#543c38" stroke-width="5"/><path d="M137 208L151 208L151 234L209 234L209 208L223 208L237 238L261 255L239 285L224 268L231 353L129 353L136 268L121 285L99 255L123 238Z" fill="${skin}" stroke="#9a6b5a" stroke-width="4" stroke-linejoin="round"/><path d="M151 208Q180 220 209 208L215 240L145 240Z" fill="${skin}"/><path d="M130 345L230 345L222 431L185 431L180 377L171 431L134 431Z" fill="${skin}" stroke="#9a6b5a" stroke-width="4"/><path d="M137 228L157 218Q180 234 203 218L223 228L239 251L222 266L213 252L221 346Q180 357 139 346L147 252L138 266L121 251Z" fill="#efb5c6" stroke="#c67f97" stroke-width="4" stroke-linejoin="round"/><path d="M139 348Q180 361 221 348L215 387Q180 396 145 387Z" fill="#9bbbe9" stroke="#718eae" stroke-width="4"/><path d="M119 447Q137 454 160 447L167 459Q153 474 112 464ZM200 447Q222 454 241 447L248 459Q235 474 195 464Z" fill="#fff7e9" stroke="#9a6b5a" stroke-width="4"/><path d="M123 458L160 458M200 458L238 458" stroke="#ed9eb3" stroke-width="4" stroke-linecap="round"/><ellipse cx="180" cy="137" rx="79" ry="91" fill="${skin}" stroke="#9a6b5a" stroke-width="4"/>${face}`;
  }

  function avatarSvg() {
    const person = character();
    const selections = selectedItems().slice().sort((a, b) => (data.layers[a.category] || a.layer) - (data.layers[b.category] || b.layer));
    const hair = selections.find(item => item.category === 'hair');
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 500" role="img" aria-label="${esc(person.nameKo)} 캐릭터">`;
    if (hair) svg += `<g data-layer="hairBack">${svgItem(hair, 'back')}</g>`;
    svg += `<g data-layer="body">${bodySvg(person)}</g>`;
    for (const item of selections) {
      if (item.category === 'hair') svg += `<g data-layer="hair">${svgItem(item)}</g>`;
      else if (item.category === 'accessory') svg += `<g data-layer="accessory">${svgItem(item)}</g>`;
      else svg += `<g data-layer="${esc(item.category)}">${svgItem(item)}</g>`;
    }
    return `${svg}</svg>`;
  }

  function photoSource() {
    const bg = background(), custom = window.ASSETS.backgrounds[bg.id];
    const avatar = avatarSvg().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 360"><rect width="500" height="360" fill="${bg.color}"/>${custom ? `<image href="${esc(custom)}" width="500" height="360" preserveAspectRatio="xMidYMid slice"/>` : ''}<circle cx="74" cy="72" r="32" fill="#fff7"/><path d="M0 260Q125 230 250 258T500 250V360H0Z" fill="#ffffff4d"/><text x="42" y="84" font-size="35">${bg.icon}</text><g transform="translate(120 8) scale(.72)">${avatar}</g></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(art)}`;
  }
  function stageArt() {
    const bg = background(), custom = window.ASSETS.backgrounds[bg.id];
    const style = `--scene:${bg.color}${custom ? `;background-image:url('${esc(custom)}')` : ''}`;
    const scenes = { room:['🪟','🪴','🧸'], playground:['☁️','🌳','🛝'], garden:['🦋','🌼','🌷'], park:['☁️','🌳','🌿'], beach:['☀️','🐚','🌊'], castle:['✨','🏰','☁️'], birthday:['🎈','🎉','🎈'], snow:['❄️','🏠','❄️'], school:['☁️','🏫','🌳'], zoo:['🌴','🦒','🌿'] }[bg.scenery];
    return `<div class="stage-scene scene-${bg.scenery}" style="${style}"><span class="scene-deco deco-one">${scenes[0]}</span><span class="scene-deco deco-two">${scenes[1]}</span><span class="scene-deco deco-three">${scenes[2]}</span><div class="stage-floor"></div><div class="doll-wrap ${state.view === 'finish' ? 'celebrate' : ''}">${avatarSvg()}</div>${state.sparkle ? `<span class="sparkle-burst">${state.sparkle}</span>` : ''}</div>`;
  }

  function play(type) {
    if (state.muted) return;
    const file = window.ASSETS.audio[type];
    if (file) { const audio = new Audio(file); audio.volume = type === 'bgm' ? .12 : .45; audio.play().catch(() => {}); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!context) context = new AudioContext();
    if (context.state === 'suspended') context.resume();
    const now = context.currentTime, osc = context.createOscillator(), gain = context.createGain();
    const notes = { tap: 580, dress: 720, sparkle: 880, complete: 523, photo: 960, random: 660 };
    osc.type = 'sine'; osc.frequency.setValueAtTime(notes[type] || 600, now); osc.frequency.exponentialRampToValueAtTime((notes[type] || 600) * 1.35, now + .1);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(type === 'complete' ? .045 : .025, now + .015); gain.gain.exponentialRampToValueAtTime(.0001, now + .17);
    osc.connect(gain); gain.connect(context.destination); osc.start(now); osc.stop(now + .18);
  }
  function startBgm() {
    if (state.muted || bgmTimer) return;
    if (window.ASSETS.audio.bgm) {
      state.sound = new Audio(window.ASSETS.audio.bgm);
      state.sound.loop = true; state.sound.volume = .18;
      state.sound.play().catch(() => {}); bgmTimer = -1; return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!context) context = new AudioContext();
    if (context.state === 'suspended') context.resume();
    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 698.46];
    bgmTimer = window.setInterval(() => {
      if (state.muted || !context) return;
      const now = context.currentTime, osc = context.createOscillator(), gain = context.createGain();
      osc.type = 'sine'; osc.frequency.value = notes[beat++ % notes.length];
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.009, now + .08); gain.gain.exponentialRampToValueAtTime(.0001, now + .55);
      osc.connect(gain); gain.connect(context.destination); osc.start(now); osc.stop(now + .58);
    }, 630);
  }
  function stopBgm() {
    if (bgmTimer > 0) clearInterval(bgmTimer);
    if (state.sound) { state.sound.pause(); state.sound.currentTime = 0; state.sound = null; }
    bgmTimer = 0;
  }
  function notice(message) {
    let toast = $('.toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; app.append(toast); }
    toast.textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.remove(), 1700);
  }
  function doSparkle() {
    const sparks = ['💖','⭐','✨','🌸','🌈'];
    state.sparkle = sparks[Math.floor(Math.random() * sparks.length)];
    setTimeout(() => { state.sparkle = ''; if (state.view === 'editor') render(); }, 700);
  }
  function continueDressing() { state.view = 'editor'; state.sparkle = ''; render(); }
  function home() { state.view = 'home'; state.sparkle = ''; persist(); render(); }

  function renderHome() {
    const last = Object.keys(read().outfit || {}).length;
    return `<section class="home-page"><div class="home-sun">☀️</div><div class="home-doodle">🌼　🦋　🌼</div><div class="home-title"><div class="logo-doll">${avatarSvg()}</div><h1>세연이의<br>옷장</h1><p>예쁜 옷을 골라 입혀 주세요!</p></div><div class="home-buttons"><button class="big-button pink" data-action="characters"><span>👗</span><strong>옷 입히기</strong></button><button class="big-button yellow" data-action="stories"><span>📖</span><strong>이야기 꾸미기</strong></button><button class="big-button white" data-action="album"><span>📸</span><strong>나의 사진첩</strong><i>${state.album.length}</i></button></div><div class="home-bottom"><span>🧸</span><span>🌷</span><span>🐰</span></div><button class="sound-button home-sound" data-action="mute" aria-label="소리 ${state.muted ? '켜기' : '끄기'}">${state.muted ? '🔇' : '🔊'}</button>${last ? `<button class="continue-button" data-action="continue">계속 꾸미기</button>` : ''}</section>`;
  }

  function renderThemes() {
    return `<section class="selection-page"><header class="simple-header"><button class="round-button" data-action="home" aria-label="홈">⌂</button><h1>오늘은 어떤 날?</h1><span></span></header><p class="prompt-line">이야기를 골라 주세요</p><div class="theme-list">${data.themes.map(theme => `<button class="theme-card" data-theme="${theme.id}"><span>${theme.icon}</span><strong>${theme.title}</strong><b>›</b></button>`).join('')}</div></section>`;
  }

  function renderCharacters() {
    return `<section class="selection-page"><header class="simple-header"><button class="round-button" data-action="back" aria-label="뒤로">↶</button><h1>친구를 골라요</h1><button class="round-button" data-action="home" aria-label="홈">⌂</button></header><div class="character-grid">${data.characters.map(person => `<button class="character-card" data-character="${person.id}"><span class="character-face">${person.emoji}</span><strong>${person.nameKo}</strong></button>`).join('')}</div><button class="bottom-back" data-action="back">뒤로 가기</button></section>`;
  }

  function header() {
    return `<header class="editor-header"><button class="round-button undo-button" data-action="undo" aria-label="되돌리기" ${state.history.length ? '' : 'disabled'}>↶</button><div class="editor-heading"><strong>${state.mode === 'story' ? esc(data.themes.find(theme => theme.id === state.themeId)?.title || '이야기 꾸미기') : '마음껏 꾸며요!'}</strong><span>${character().nameKo}와 함께</span></div><button class="sound-button editor-sound" data-action="mute" aria-label="소리 ${state.muted ? '켜기' : '끄기'}">${state.muted ? '🔇' : '🔊'}</button><button class="round-button" data-action="home" aria-label="홈">⌂</button></header>`;
  }

  function itemCard(item) {
    const locked = !unlocked(item), chosen = state.outfit[item.category] === item.id;
    const recommended = state.mode === 'story' && data.themes.find(theme => theme.id === state.themeId)?.outfit === item.id;
    return `<button class="item-card ${chosen ? 'chosen' : ''} ${recommended ? 'recommended' : ''} ${locked ? 'locked' : ''}" data-item="${item.id}" ${locked ? `aria-label="꾸미기 ${item.lockedAt}번 하면 열려요"` : ''}><span class="item-picture" style="--swatch:${item.color}">${itemPreview(item)}</span><strong>${locked ? '🔒' : esc(item.nameKo)}</strong>${chosen || recommended ? `<i>${chosen ? '✓' : '⭐'}</i>` : ''}</button>`;
  }
  function itemPreview(item) {
    const box = { hair:'80 25 200 190', hat:'110 40 140 90', top:'100 195 160 165', dress:'90 190 180 210', skirt:'95 295 170 115', pants:'115 290 130 155', shoes:'100 420 165 60', headAccessory:'135 42 90 65', bag:'202 250 90 125', accessory:'115 110 130 150', toy:'82 240 100 100' }[item.category];
    const back = item.category === 'hair' ? svgItem(item, 'back') : '';
    return `<svg viewBox="${box}" aria-hidden="true">${back}${svgItem(item)}</svg>`;
  }
  function renderEditor() {
    const currentCategory = data.categories.find(category => category.id === state.categoryId);
    const items = state.categoryId === 'background'
      ? data.backgrounds.map(bg => `<button class="item-card ${state.backgroundId === bg.id ? 'chosen' : ''}" data-background="${bg.id}"><span class="item-picture scene-thumb" style="--swatch:${bg.color}">${bg.icon}</span><strong>${bg.nameKo}</strong>${state.backgroundId === bg.id ? '<i>✓</i>' : ''}</button>`).join('')
      : data.items.filter(item => item.category === state.categoryId).map(itemCard).join('');
    return `<section class="editor-page">${header()}<main class="editor-stage">${stageArt()}<div class="stage-caption">${state.mode === 'story' ? esc(data.themes.find(theme => theme.id === state.themeId)?.title || '') : `${character().emoji} ${character().nameKo}`}</div></main><nav class="category-rail" aria-label="꾸미기 종류">${data.categories.map(category => `<button class="category-button ${state.categoryId === category.id ? 'active' : ''}" data-category="${category.id}"><span>${category.icon}</span><small>${category.name}</small></button>`).join('')}<button class="category-button ${state.categoryId === 'background' ? 'active' : ''}" data-category="background"><span>🏞️</span><small>배경</small></button></nav><div class="item-rail" aria-label="${currentCategory?.name || '배경'} 선택">${items}</div><footer class="editor-actions"><button class="action-button magic" data-action="random"><span>🪄</span><strong>마법 코디</strong></button><button class="action-button reset" data-action="reset"><span>🫧</span><strong>처음부터</strong></button><button class="action-button finish-button" data-action="finish"><span>✨</span><strong>완성!</strong></button></footer></section>`;
  }

  function renderFinish() {
    return `<section class="finish-page"><header class="simple-header"><button class="round-button" data-action="home" aria-label="홈">⌂</button><h1>${phrases[state.completed % phrases.length]}</h1><button class="round-button" data-action="mute" aria-label="소리">${state.muted ? '🔇' : '🔊'}</button></header><main class="finish-stage">${stageArt()}<div class="finish-card"><strong>${character().nameKo}가 오늘 멋지게 꾸몄어요!</strong><span>${selectedItems().slice(0, 3).map(item => esc(item.nameKo)).join(' · ') || '새로운 모습'}</span></div></main><div class="finish-actions"><button class="big-button pink" data-action="photo"><span>📸</span><strong>사진첩에 저장</strong></button><button class="big-button yellow" data-action="again"><span>👗</span><strong>다시 꾸미기</strong></button><button class="big-button white" data-action="friends"><span>🐰</span><strong>다른 친구</strong></button></div></section>`;
  }

  function renderAlbum() {
    return `<section class="album-page"><header class="simple-header"><button class="round-button" data-action="home" aria-label="홈">⌂</button><h1>나의 사진첩</h1><span></span></header>${state.album.length ? `<div class="album-grid">${state.album.map(photo => `<article class="photo-card"><img src="${photo.image}" alt="${esc(photo.character)}의 코디"><strong>${esc(photo.character)}의 코디</strong><small>${esc(photo.date)} · ${esc(photo.background)}</small><p>${esc(photo.items.slice(0, 3).join(' · ') || '새로운 코디')}</p></article>`).join('')}</div>` : `<div class="empty-album"><span>📸</span><strong>아직 사진이 없어요</strong><p>마음에 드는 코디를 사진으로 남겨요!</p><button class="big-button pink" data-action="characters"><span>👗</span><strong>옷 입히기</strong></button></div>`}<button class="bottom-back" data-action="home">홈으로</button></section>`;
  }

  function render() {
    document.body.dataset.view = state.view;
    app.innerHTML = state.view === 'home' ? renderHome()
      : state.view === 'themes' ? renderThemes()
      : state.view === 'characters' ? renderCharacters()
      : state.view === 'editor' ? renderEditor()
      : state.view === 'finish' ? renderFinish()
      : renderAlbum();
  }

  function begin(mode, themeId = '') {
    state.mode = mode; state.themeId = themeId;
    if (themeId) state.backgroundId = data.themes.find(theme => theme.id === themeId)?.background || 'room';
    state.view = 'characters'; render(); play('tap');
  }
  function loadCharacter(id) {
    state.characterId = id;
    if (state.mode === 'story') state.backgroundId = data.themes.find(theme => theme.id === state.themeId)?.background || state.backgroundId;
    state.view = 'editor'; state.history = []; state.categoryId = 'hair'; persist(); render(); play('tap'); startBgm();
  }
  function finish() {
    state.completed += 1; state.view = 'finish'; state.sparkle = ''; persist(); render(); play('complete');
  }
  function savePhoto() {
    const photo = { image: photoSource(), character: character().nameKo, background: background().nameKo, items: selectedItems().map(item => item.nameKo), date: new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short' }).format(new Date()) };
    state.album.unshift(photo); state.album = state.album.slice(0, 20); persist(); play('photo'); state.view = 'album'; render();
  }
  function randomOutfit() {
    pushUndo();
    const choose = list => list[Math.floor(Math.random() * list.length)];
    const categories = ['hair', Math.random() < .55 ? 'dress' : 'top', 'shoes', 'accessory', 'headAccessory'];
    if (categories.includes('top')) categories.push(Math.random() < .55 ? 'pants' : 'skirt');
    for (const id of categories) {
      const available = data.items.filter(item => item.category === id && unlocked(item));
      const item = choose(available);
      if (item) state.outfit[id] = item.id;
    }
    state.view = 'editor'; persist(); play('random'); state.sparkle = '✨'; render();
    setTimeout(() => { state.sparkle = ''; if (state.view === 'editor') render(); }, 500);
  }
  function categoryName(id) { return id === 'background' ? '배경' : data.categories.find(category => category.id === id)?.name || ''; }

  app.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.action) {
      const action = button.dataset.action;
      play('tap'); startBgm();
      if (action === 'mute') { state.muted = !state.muted; if (state.muted) stopBgm(); else startBgm(); persist(); render(); }
      else if (action === 'home') home();
      else if (action === 'back') { state.view = state.view === 'characters' && state.mode === 'story' ? 'themes' : 'home'; render(); }
      else if (action === 'characters') begin('free');
      else if (action === 'stories') { state.view = 'themes'; render(); }
      else if (action === 'album') { state.view = 'album'; render(); }
      else if (action === 'continue') continueDressing();
      else if (action === 'undo') {
        const previous = state.history.pop();
        if (previous) { state.outfit = previous.outfit; state.backgroundId = previous.backgroundId; persist(); render(); play('dress'); }
      }
      else if (action === 'random') randomOutfit();
      else if (action === 'reset') { pushUndo(); state.outfit = { hair: 'hair_01' }; persist(); render(); }
      else if (action === 'finish') finish();
      else if (action === 'photo') savePhoto();
      else if (action === 'again') continueDressing();
      else if (action === 'friends') { state.view = 'characters'; begin('free'); }
      return;
    }
    if (button.dataset.theme) { begin('story', button.dataset.theme); return; }
    if (button.dataset.character) { loadCharacter(button.dataset.character); return; }
    if (button.dataset.category) { state.categoryId = button.dataset.category; render(); play('tap'); return; }
    if (button.dataset.item) {
      const item = itemById[button.dataset.item];
      if (!item) return;
      if (!unlocked(item)) { notice(`꾸미기 ${item.lockedAt}번 하면 열려요!`); return; }
      if (state.mode === 'story' && data.themes.find(theme => theme.id === state.themeId)?.outfit === item.id) notice('잘 어울려요!');
      pushUndo();
      if (state.outfit[item.category] === item.id && item.category !== 'hair') delete state.outfit[item.category];
      else state.outfit[item.category] = item.id;
      state.view = 'editor'; persist(); doSparkle(); render(); play('dress'); return;
    }
    if (button.dataset.background) { pushUndo(); state.backgroundId = button.dataset.background; persist(); render(); play('dress'); }
  });

  app.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.view !== 'home') home();
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
  render();
})();
