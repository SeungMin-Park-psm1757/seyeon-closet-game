(() => {
  'use strict';
  const data = window.GAME_DATA;
  const rules = window.OUTFIT_RULES;
  if (!rules) throw new Error('OUTFIT_RULES must load before game.js');
  const ART_WIDTH = 360, ART_HEIGHT = 480;
  const $ = (selector, root = document) => root.querySelector(selector);
  const app = $('#app');
  const key = 'seyeon-closet-save';
  const read = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const saved = read();
  const itemById = Object.fromEntries(data.items.map(item => [item.id, item]));
  const charById = Object.fromEntries(data.characters.map(character => [character.id, character]));
  const backgroundById = Object.fromEntries(data.backgrounds.map(background => [background.id, background]));
  const savedCharacterId = saved.characterId || 'girl01';
  const initialOutfit = saved.outfit && typeof saved.outfit === 'object' && !Array.isArray(saved.outfit)
    ? rules.normalizeOutfit(saved.outfit, itemById, { characterId: savedCharacterId })
    : rules.normalizeOutfit({ hair: 'hair_01', shoes: 'shoes_02' }, itemById, { characterId: savedCharacterId });
  const state = {
    view: 'home', mode: saved.mode || 'free', themeId: saved.themeId || '', characterId: savedCharacterId,
    outfit: initialOutfit, backgroundId: saved.backgroundId || 'room', categoryId: 'hair',
    history: [], album: Array.isArray(saved.album) ? saved.album.slice(0, 20) : [],
    completed: Math.max(0, Number(saved.completed) || 0), muted: Boolean(saved.muted), sparkle: '',
    sound: null
  };
  const railScroll = { categories: 0, items: Object.create(null) };
  let renderedCategoryId = state.categoryId;
  let context = null, beat = 0, bgmTimer = 0, activeBgmFile = '', toastTimer = 0;
  const phrases = ['예쁘다!', '멋져요!', '정말 잘 골랐어요!', '짜잔!'];

  function persist() {
    try {
      state.outfit = rules.normalizeOutfit(state.outfit, itemById, { characterId: state.characterId });
      localStorage.setItem(key, JSON.stringify({ characterId: state.characterId, outfit: state.outfit, backgroundId: state.backgroundId, themeId: state.themeId, mode: state.mode, album: state.album.slice(0, 20), completed: state.completed, muted: state.muted }));
    } catch { /* 사진은 다시 찍을 수 있고, 저장 공간이 부족해도 꾸미기는 계속됩니다. */ }
  }
  function character() { return charById[state.characterId] || data.characters[0]; }
  function background() { return backgroundById[state.backgroundId] || data.backgrounds[0]; }
  function selectedItems() { return Object.values(rules.normalizeOutfit(state.outfit, itemById, { characterId: state.characterId })).map(id => itemById[id]).filter(Boolean); }
  function unlocked(item) { return !item.lockedAt || state.completed >= item.lockedAt; }
  function pushUndo() {
    state.history.push({ outfit: rules.normalizeOutfit(state.outfit, itemById, { characterId: state.characterId }), backgroundId: state.backgroundId });
    if (state.history.length > 10) state.history.shift();
  }
  function esc(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }
  function runtimeAsset(path) {
    return path.replace(/^assets\/custom\/(.+)\.png$/i, 'assets/runtime/$1.webp');
  }
  function categoryIcon(id) {
    const paths = {
      hair:'<path d="M6 20c-3-8 1-15 9-15s12 7 9 15m-18 0 4-3m14 3-4-3M9 12c2 2 8 2 10 0"/>',
      hat:'<path d="M5 17c1-7 4-11 7-11s6 4 7 11M3 18h18M7 20h10"/>',
      top:'<path d="m8 6 4-2 4 2 5 5-3 3-2-2v8H8v-8l-2 2-3-3z"/>',
      dress:'<path d="m8 5 4-2 4 2 3 4-3 2 4 9H4l4-9-3-2z"/>',
      skirt:'<path d="M7 7c3 2 7 2 10 0l4 12H3zM7 11l2 7m3-6v6m3-7 2 7"/>',
      pants:'<path d="M6 5h12l-1 15h-4l-1-8-1 8H7z"/>',
      shoes:'<path d="M4 14c3 0 5-3 6-6l3 6 6 2c2 1 2 4 0 4H5c-2 0-3-4-1-6z"/>',
      headAccessory:'<path d="M4 16c2-7 5-10 8-10s6 3 8 10M12 8 9 5l-4 1 1 5m6-3 3-3 4 1-1 5"/>',
      bag:'<path d="M6 9h12l1 12H5zm3 0c0-5 6-5 6 0"/>',
      accessory:'<path d="M5 6c2-3 5-1 7 2 2-3 5-5 7-2 4 5-7 13-7 13S1 11 5 6z"/>',
      toy:'<circle cx="12" cy="13" r="7"/><circle cx="7" cy="6" r="3"/><circle cx="17" cy="6" r="3"/><path d="M9 13h.1m5.8 0h.1m-5 3q2 2 4 0"/>',
      background:'<path d="M3 19 9 9l4 6 3-4 5 8z"/><circle cx="17" cy="6" r="2.5" fill="currentColor" stroke="none"/>'
    }[id] || '<circle cx="12" cy="12" r="8"/>';
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }
  function characterPortrait(person) {
    const custom = window.ASSETS.characters[person.id];
    return custom
      ? `<span class="character-portrait">${avatarSvg({ characterId: person.id, outfit: { hair: 'hair_03', dress: 'dress_01', shoes: 'shoes_02' } })}</span>`
      : `<span class="character-face">${person.emoji}</span>`;
  }

  function svgItem(item, part = '', person = null) {
    if (!item) return '';
    const characterAsset = window.ASSETS.characterItems?.[person?.id]?.[item.id];
    const custom = rules.isCompatible(item, person?.id) ? characterAsset || window.ASSETS.items[item.id] || item.asset : null;
    if (custom) {
      if (part === 'back') return '';
      const image = `<image href="${esc(runtimeAsset(custom))}" x="0" y="0" width="${ART_WIDTH}" height="${ART_HEIGHT}" preserveAspectRatio="xMidYMid meet"/>`;
      const fit = window.ASSETS.itemTransforms?.[item.id];
      return fit ? `<g transform="translate(${fit.tx} ${fit.ty}) scale(${fit.sx} ${fit.sy})">${image}</g>` : image;
    }
    const c = item.color, v = item.variant, detail = ['✿','♥','★','✦'][v % 4];
    switch (item.category) {
      case 'hair':
        if (person?.rigId === 'preschool-v1') return part === 'back'
          ? `<path d="M99 129Q83 15 180 15Q277 15 261 129L256 229L234 212L230 101Q180 138 130 101L126 212L104 229Z" fill="${c}" stroke="#65413c" stroke-width="5" stroke-linejoin="round"/>`
          : `<path d="M99 119Q93 15 180 15Q267 15 261 119Q238 100 219 104Q195 112 179 97Q152 117 127 103Z" fill="${c}" stroke="#65413c" stroke-width="5"/><path d="M105 111Q104 158 121 177M255 111Q256 155 239 172" fill="none" stroke="${c}" stroke-width="17" stroke-linecap="round"/>`;
        return part === 'back'
          ? `<path d="M91 139Q72 30 177 30Q287 25 270 151L263 239L236 213L232 105Q179 149 121 105L115 218L88 239Z" fill="${c}" stroke="#65413c" stroke-width="5" stroke-linejoin="round"/>`
          : `<path d="M101 119Q101 35 180 37Q259 34 260 120Q238 99 219 104Q195 112 179 97Q152 117 127 103Z" fill="${c}" stroke="#65413c" stroke-width="5"/><path d="M106 111Q105 159 121 177M254 111Q255 155 238 172" fill="none" stroke="${c}" stroke-width="17" stroke-linecap="round"/>`;
      case 'top': return person?.rigId === 'preschool-v1'
        ? `<path d="M135 177L158 168Q180 185 202 168L225 177L251 209L228 226L217 212L222 250Q180 258 138 250L143 212L132 226L109 209Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M146 177Q180 199 214 177" fill="none" stroke="#fff5e9" stroke-width="6"/><text x="180" y="229" text-anchor="middle" font-size="20" fill="#fff9e8">${detail}</text>`
        : `<path d="M135 212L157 202Q180 222 203 202L225 212L251 243L228 260L218 246L230 347Q180 361 130 347L142 246L132 260L109 243Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M146 216Q180 239 214 216" fill="none" stroke="#fff5e9" stroke-width="7"/><text x="180" y="300" text-anchor="middle" font-size="27" fill="#fff9e8">${detail}</text>`;
      case 'dress': return person?.rigId === 'preschool-v1'
        ? `<path d="M135 177L158 168Q180 185 202 168L225 177L251 209L228 226L217 212L255 372Q180 390 105 372L143 212L132 226L109 209Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M146 177Q180 199 214 177M120 352Q180 369 240 352" fill="none" stroke="#fff4e6" stroke-width="7"/><text x="180" y="300" text-anchor="middle" font-size="28" fill="#fff9e8">${detail}</text>`
        : `<path d="M143 211L160 204Q180 225 200 204L217 211L237 242L218 256L207 244L259 377Q180 399 101 377L153 244L142 256L123 242Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M146 216Q180 239 214 216M118 356Q180 372 242 356" fill="none" stroke="#fff4e6" stroke-width="7"/><text x="180" y="315" text-anchor="middle" font-size="34" fill="#fff9e8">${detail}</text>`;
      case 'skirt': return person?.rigId === 'preschool-v1'
        ? `<path d="M137 252Q180 266 223 252L253 372Q180 390 107 372Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M131 272Q180 287 229 272" fill="none" stroke="#fff5e9" stroke-width="7"/><text x="180" y="358" text-anchor="middle" font-size="25" fill="#fff9e8">${detail}</text>`
        : `<path d="M137 307Q180 321 223 307L253 385Q180 403 107 385Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M131 329Q180 342 229 329" fill="none" stroke="#fff5e9" stroke-width="7"/><text x="180" y="373" text-anchor="middle" font-size="28" fill="#fff9e8">${detail}</text>`;
      case 'pants': return person?.rigId === 'preschool-v1'
        ? `<path d="M130 250L230 250L221 432L187 432L178 337L166 432L132 432Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M135 266L225 266" stroke="#fff5e9" stroke-width="6"/>`
        : `<path d="M130 305L230 305L221 432L187 432L178 351L166 432L132 432Z" fill="${c}" stroke="#805366" stroke-width="4" stroke-linejoin="round"/><path d="M135 320L225 320" stroke="#fff5e9" stroke-width="6"/>`;
      case 'shoes': return `<path d="M119 423Q144 432 165 423L171 454Q169 474 136 475Q108 475 108 456Q108 439 119 423ZM194 423Q216 432 241 423L250 453Q253 472 219 475Q188 475 188 457Q187 439 194 423Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M113 456Q139 465 169 454M192 456Q224 465 249 454" stroke="#fff9ed" stroke-width="5" stroke-linecap="round"/>`;
      case 'hat': {
        const shape = item.hatFit || ['cap', 'sunhat', 'beanie', 'crown'][v % 4];
        const art = shape === 'crown'
          ? `<path d="M132 91L140 55L163 71L180 40L197 71L220 55L228 91Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M126 93Q180 79 234 93L229 109Q180 119 131 109Z" fill="#fff1c5" stroke="#805366" stroke-width="4"/>`
          : shape === 'sunhat'
            ? `<path d="M145 88Q145 49 180 48Q215 49 215 88Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M108 91Q180 75 252 91Q244 108 180 109Q116 108 108 91Z" fill="#fff1c5" stroke="#805366" stroke-width="4"/><path d="M124 91Q180 80 236 91" fill="none" stroke="#805366" stroke-width="3"/><text x="180" y="86" text-anchor="middle" font-size="19">${detail}</text>`
            : shape === 'beanie'
              ? `<path d="M132 92Q132 47 180 44Q228 47 228 92Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M128 88Q180 80 232 88L229 105Q180 115 131 105Z" fill="#fff1c5" stroke="#805366" stroke-width="4"/><text x="180" y="85" text-anchor="middle" font-size="19">${detail}</text>`
              : `<path d="M139 92Q139 48 180 47Q221 48 221 92Z" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M116 94Q180 78 244 94Q236 110 180 111Q124 110 116 94Z" fill="#fff1c5" stroke="#805366" stroke-width="4"/><text x="180" y="89" text-anchor="middle" font-size="19">${detail}</text>`;
        const fittedArt = person?.rigId === 'preschool-v1' ? `<g transform="translate(180 84) scale(${shape === 'sunhat' ? 1.08 : shape === 'crown' ? 1.12 : 1.15}) translate(-180 -84) translate(0 -30)">${art}</g>` : art;
        return fittedArt;
      }
      case 'headAccessory': return `<path d="M153 77Q139 50 166 53L180 69L194 53Q221 50 207 77L180 91Z" fill="${c}" stroke="#805366" stroke-width="4"/><circle cx="180" cy="76" r="7" fill="#ffe99a"/>`;
      case 'accessory': return v === 4 || v === 5 || v === 6
        ? person?.rigId === 'preschool-v1'
          ? `<g fill="none" stroke="${c}" stroke-width="6"><circle cx="144" cy="101" r="17"/><circle cx="216" cy="101" r="17"/><path d="M161 101Q180 93 199 101"/></g><circle cx="144" cy="101" r="3" fill="#513832"/><circle cx="216" cy="101" r="3" fill="#513832"/>`
          : `<g fill="none" stroke="${c}" stroke-width="7"><circle cx="145" cy="137" r="21"/><circle cx="215" cy="137" r="21"/><path d="M166 137Q180 126 194 137"/></g><circle cx="145" cy="137" r="3" fill="#513832"/><circle cx="215" cy="137" r="3" fill="#513832"/>`
        : person?.rigId === 'preschool-v1'
          ? `<path d="M151 173Q180 203 209 173" fill="none" stroke="${c}" stroke-width="6"/><path d="M180 187l6 7-6 7-6-7z" fill="#ffe477"/><text x="180" y="202" text-anchor="middle" font-size="15" fill="${c}">${detail}</text>`
          : `<path d="M145 217Q180 257 215 217" fill="none" stroke="${c}" stroke-width="7"/><path d="M180 235l7 8-7 8-7-8z" fill="#ffe477"/><text x="180" y="252" text-anchor="middle" font-size="17" fill="${c}">${detail}</text>`;
      case 'bag': return `<path d="M206 257Q249 240 252 295" fill="none" stroke="#805366" stroke-width="6"/><rect x="218" y="286" width="64" height="74" rx="19" fill="${c}" stroke="#805366" stroke-width="4"/><path d="M236 290Q238 268 251 268Q266 268 266 290" fill="none" stroke="#805366" stroke-width="5"/><text x="250" y="333" text-anchor="middle" font-size="27">${detail}</text>`;
      case 'toy': return `<g transform="translate(0 3)"><path d="M109 259Q97 250 94 270L106 292L119 280M138 268Q125 248 119 266L128 286" fill="${c}" stroke="#805366" stroke-width="4"/><circle cx="124" cy="299" r="24" fill="${c}" stroke="#805366" stroke-width="4"/><circle cx="116" cy="296" r="3" fill="#533c3a"/><circle cx="132" cy="296" r="3" fill="#533c3a"/><path d="M119 306Q124 312 130 306" fill="none" stroke="#533c3a" stroke-width="3" stroke-linecap="round"/></g>`;
      default: return '';
    }
  }

  function bodySvg(person, includeBaseHair = true, assetOverride = '') {
    const skin = person.skin, hair = person.hair;
    const custom = assetOverride || window.ASSETS.characters[person.id];
    if (custom) return `<image href="${esc(runtimeAsset(custom))}" x="0" y="0" width="${ART_WIDTH}" height="${ART_HEIGHT}" preserveAspectRatio="xMidYMid meet"/>`;
    const ears = person.kind === 'rabbit'
      ? `<path d="M145 89Q108 20 129 14Q157 13 168 88M190 88Q207 11 233 16Q252 25 214 103" fill="${skin}" stroke="#8c675c" stroke-width="5"/><path d="M139 73Q127 35 134 31M207 76Q223 32 232 32" stroke="#ec9aa8" stroke-width="9" stroke-linecap="round"/>`
      : person.kind === 'bear' ? `<circle cx="119" cy="76" r="31" fill="${skin}" stroke="#805747" stroke-width="5"/><circle cx="241" cy="76" r="31" fill="${skin}" stroke="#805747" stroke-width="5"/><circle cx="119" cy="76" r="15" fill="#d99b7e"/><circle cx="241" cy="76" r="15" fill="#d99b7e"/>` : '';
    const face = person.kind === 'human'
      ? `<circle cx="151" cy="137" r="5" fill="#503b38"/><circle cx="209" cy="137" r="5" fill="#503b38"/><path d="M166 170Q180 181 194 170" fill="none" stroke="#a9575d" stroke-width="4" stroke-linecap="round"/><ellipse cx="139" cy="158" rx="11" ry="6" fill="${person.blush}" opacity=".65"/><ellipse cx="221" cy="158" rx="11" ry="6" fill="${person.blush}" opacity=".65"/>`
      : `<ellipse cx="180" cy="154" rx="39" ry="30" fill="#f7e5d5"/><circle cx="162" cy="137" r="5" fill="#503b38"/><circle cx="198" cy="137" r="5" fill="#503b38"/><ellipse cx="180" cy="154" rx="7" ry="5" fill="#74514a"/><path d="M180 159Q174 169 166 163M180 159Q187 169 194 163" fill="none" stroke="#74514a" stroke-width="3" stroke-linecap="round"/><ellipse cx="139" cy="158" rx="10" ry="6" fill="${person.blush}" opacity=".65"/><ellipse cx="221" cy="158" rx="10" ry="6" fill="${person.blush}" opacity=".65"/>`;
    const baseHair = includeBaseHair ? `<path d="M111 145Q91 46 179 42Q270 42 250 157L237 224L218 205L221 101Q179 121 139 101L136 210L116 226Z" fill="${hair}" stroke="#543c38" stroke-width="5"/>` : '';
    return `${ears}${baseHair}<path d="M137 208L151 208L151 234L209 234L209 208L223 208L237 238L261 255L239 285L224 268L231 353L129 353L136 268L121 285L99 255L123 238Z" fill="${skin}" stroke="#9a6b5a" stroke-width="4" stroke-linejoin="round"/><path d="M151 208Q180 220 209 208L215 240L145 240Z" fill="${skin}"/><path d="M130 345L230 345L222 431L185 431L180 377L171 431L134 431Z" fill="${skin}" stroke="#9a6b5a" stroke-width="4"/><path d="M137 228L157 218Q180 234 203 218L223 228L239 251L222 266L213 252L221 346Q180 357 139 346L147 252L138 266L121 251Z" fill="#efb5c6" stroke="#c67f97" stroke-width="4" stroke-linejoin="round"/><path d="M139 348Q180 361 221 348L215 387Q180 396 145 387Z" fill="#9bbbe9" stroke="#718eae" stroke-width="4"/><path d="M119 447Q137 454 160 447L167 459Q153 474 112 464ZM200 447Q222 454 241 447L248 459Q235 474 195 464Z" fill="#fff7e9" stroke="#9a6b5a" stroke-width="4"/><path d="M123 458L160 458M200 458L238 458" stroke="#ed9eb3" stroke-width="4" stroke-linecap="round"/><ellipse cx="180" cy="137" rx="79" ry="91" fill="${skin}" stroke="#9a6b5a" stroke-width="4"/>${face}`;
  }

  function avatarSvg(snapshot = state) {
    const person = charById[snapshot.characterId] || character();
    const safeOutfit = rules.normalizeOutfit(snapshot.outfit || {}, itemById, { characterId: person.id });
    const selections = Object.values(safeOutfit).map(id => itemById[id]).filter(Boolean).sort((a, b) => (data.layers[a.category] || a.layer) - (data.layers[b.category] || b.layer));
    const hair = selections.find(item => item.category === 'hair');
    const hairComposite = hair && window.ASSETS.characterHairComposites?.[person.id]?.[hair.id];
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_WIDTH} ${ART_HEIGHT}" role="img" aria-label="${esc(person.nameKo)} 캐릭터">`;
    if (hair && !hairComposite) svg += `<g data-layer="hairBack">${svgItem(hair, 'back', person)}</g>`;
    svg += `<g data-layer="body">${bodySvg(person, !hair, hairComposite)}</g>`;
    for (const item of selections) {
      if (item.category === 'hair') {
        if (!hairComposite) svg += `<g data-layer="hair">${svgItem(item, '', person)}</g>`;
      }
      else if (item.category === 'accessory') svg += `<g data-layer="accessory">${svgItem(item, '', person)}</g>`;
      else svg += `<g data-layer="${esc(item.category)}">${svgItem(item, '', person)}</g>`;
    }
    return `${svg}</svg>`;
  }

  function photoSvg(photo) {
    const bg = backgroundById[photo.backgroundId] || data.backgrounds[0], custom = window.ASSETS.backgrounds[bg.id];
    const person = charById[photo.characterId] || data.characters[0];
    const avatar = avatarSvg(photo).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 360" role="img" aria-label="${esc(person.nameKo)}의 코디"><rect width="500" height="360" fill="${bg.color}"/>${custom ? `<image href="${esc(runtimeAsset(custom))}" width="500" height="360" preserveAspectRatio="xMidYMid slice"/>` : ''}<circle cx="74" cy="72" r="32" fill="#fff7"/><path d="M0 260Q125 230 250 258T500 250V360H0Z" fill="#ffffff4d"/><text x="42" y="84" font-size="35">${bg.icon}</text><g transform="translate(120 8) scale(.72)">${avatar}</g></svg>`;
  }
  function stageArt() {
    const bg = background(), custom = window.ASSETS.backgrounds[bg.id];
    const style = `--scene:${bg.color}${custom ? `;background-image:url('${esc(runtimeAsset(custom))}')` : ''}`;
    const scenes = { room:['🪟','🪴','🧸'], playground:['☁️','🌳','🛝'], garden:['🦋','🌼','🌷'], park:['☁️','🌳','🌿'], beach:['☀️','🐚','🌊'], castle:['✨','🏰','☁️'], birthday:['🎈','🎉','🎈'], snow:['❄️','🏠','❄️'], school:['☁️','🏫','🌳'], zoo:['🌴','🦒','🌿'] }[bg.scenery];
    return `<div class="stage-scene scene-${bg.scenery} ${custom ? 'has-art' : ''}" style="${style}"><span class="scene-deco deco-one">${scenes[0]}</span><span class="scene-deco deco-two">${scenes[1]}</span><span class="scene-deco deco-three">${scenes[2]}</span><div class="stage-floor"></div><div class="doll-wrap ${state.view === 'finish' ? 'celebrate' : ''}">${avatarSvg()}</div>${state.sparkle ? `<span class="sparkle-burst">${state.sparkle}</span>` : ''}</div>`;
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
    if (state.muted) return;
    const audio = window.ASSETS.audio;
    const file = state.mode === 'story' && audio.themes?.[state.themeId] || audio.bgm;
    if (bgmTimer && file === activeBgmFile) return;
    stopBgm();
    if (file) {
      state.sound = new Audio(file);
      state.sound.loop = true; state.sound.volume = .18;
      state.sound.play().catch(() => {}); activeBgmFile = file; bgmTimer = -1; return;
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
    activeBgmFile = ''; bgmTimer = 0;
  }
  function notice(message) {
    let toast = $('.toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; app.append(toast); }
    toast.textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.remove(), 1700);
  }
  function doSparkle() {
    const sparks = ['💖','⭐','✨','🌸','🌈'];
    state.sparkle = sparks[Math.floor(Math.random() * sparks.length)];
    setTimeout(() => { state.sparkle = ''; $('.sparkle-burst', app)?.remove(); }, 700);
  }
  function continueDressing() { state.view = 'editor'; state.sparkle = ''; render(); startBgm(); }
  function home() { state.view = 'home'; state.sparkle = ''; persist(); render(); }

  function renderHome() {
    const last = Object.keys(read().outfit || {}).length;
    return `<section class="home-page"><div class="home-title"><div class="logo-doll">${avatarSvg()}</div><h1>세연이의<br>옷장</h1><p>예쁜 옷을 골라 입혀 주세요!</p></div><div class="home-buttons"><button class="big-button pink" data-action="characters"><span class="home-icon">${homeIcon('dress')}</span><strong>옷 입히기</strong></button><button class="big-button yellow" data-action="stories"><span class="home-icon">${homeIcon('story')}</span><strong>이야기 꾸미기</strong></button><button class="big-button white" data-action="album"><span class="home-icon">${homeIcon('album')}</span><strong>나의 사진첩</strong><i>${state.album.length}</i></button></div><button class="sound-button home-sound" data-action="mute" aria-label="소리 ${state.muted ? '켜기' : '끄기'}">${state.muted ? '🔇' : '🔊'}</button>${last ? `<button class="continue-button" data-action="continue">계속 꾸미기</button>` : ''}</section>`;
  }

  function homeIcon(type) {
    const art = {
      dress:'<path d="M19 5 15 3l-3 3-3-3-4 2 2 5-3 11h16l-3-11z"/><path d="m9 7 3 2 3-2"/>',
      story:'<path d="M4 5c4-1 7 0 8 2v14c-1-2-4-3-8-2zm16 0c-4-1-7 0-8 2v14c1-2 4-3 8-2z"/><path d="M7 9h2m6 0h2"/>' ,
      album:'<rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m5 18 5-5 3 3 3-4 4 6"/>'
    }[type];
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${art}</svg>`;
  }

  function renderThemes() {
    return `<section class="selection-page"><header class="simple-header"><button class="round-button" data-action="home" aria-label="홈">⌂</button><h1>오늘은 어떤 날?</h1><span></span></header><p class="prompt-line">그림을 보고 골라요</p><div class="theme-list">${data.themes.map(theme => { const bg = backgroundById[theme.background], art = window.ASSETS.backgrounds[theme.background]; return `<button class="theme-card" data-theme="${theme.id}"><span class="theme-thumb ${art ? 'has-art' : ''}" style="--swatch:${bg.color}${art ? `;background-image:url('${esc(runtimeAsset(art))}')` : ''}" aria-hidden="true">${art ? '' : bg.icon}</span><strong>${esc(theme.title)}</strong><b aria-hidden="true">›</b></button>`; }).join('')}</div></section>`;
  }

  function renderCharacters() {
    return `<section class="selection-page"><header class="simple-header"><button class="round-button" data-action="back" aria-label="뒤로">↶</button><h1>친구를 골라요</h1><button class="round-button" data-action="home" aria-label="홈">⌂</button></header><div class="character-grid">${data.characters.map(person => `<button class="character-card" data-character="${person.id}">${characterPortrait(person)}<strong>${person.nameKo}</strong></button>`).join('')}</div><button class="bottom-back" data-action="back">뒤로 가기</button></section>`;
  }

  function header() {
    return `<header class="editor-header"><button class="round-button undo-button" data-action="undo" aria-label="되돌리기" ${state.history.length ? '' : 'disabled'}>↶</button><div class="editor-heading"><strong>${state.mode === 'story' ? esc(data.themes.find(theme => theme.id === state.themeId)?.title || '이야기 꾸미기') : '마음껏 꾸며요!'}</strong><span>${character().nameKo}와 함께</span></div><button class="sound-button editor-sound" data-action="mute" aria-label="소리 ${state.muted ? '켜기' : '끄기'}">${state.muted ? '🔇' : '🔊'}</button><button class="round-button" data-action="home" aria-label="홈">⌂</button></header>`;
  }

  function itemCard(item) {
    const locked = !unlocked(item), chosen = state.outfit[item.category] === item.id;
    const recommended = state.mode === 'story' && rules.isCompatible(item, state.characterId) && (data.themes.find(theme => theme.id === state.themeId)?.recommended || []).includes(item.id);
    return `<button class="item-card ${chosen ? 'chosen' : ''} ${recommended ? 'recommended' : ''} ${locked ? 'locked' : ''}" data-item="${item.id}" ${locked ? `aria-label="꾸미기 ${item.lockedAt}번 하면 열려요"` : ''}><span class="item-picture" style="--swatch:${item.color}">${itemPreview(item)}</span><strong>${locked ? '🔒' : esc(item.nameKo)}</strong>${chosen || recommended ? `<i>${chosen ? '✓' : '⭐'}</i>` : ''}${recommended ? '<small class="recommend-badge">추천</small>' : ''}</button>`;
  }
  function itemPreview(item) {
    const box = { hair:'55 0 250 250', hat:'100 0 160 145', top:'95 155 170 120', dress:'55 190 250 220', skirt:'95 235 170 120', pants:'100 280 160 190', shoes:'110 405 150 75', headAccessory:'90 0 180 120', accessory:'105 100 150 175', bag:'60 145 110 190', toy:'200 275 100 125' }[item.category];
    const person = charById.girl01;
    const back = item.category === 'hair' ? svgItem(item, 'back', person) : '';
    return `<svg viewBox="${box}" aria-hidden="true">${back}${svgItem(item, '', person)}</svg>`;
  }
  function renderEditor() {
    const currentCategory = data.categories.find(category => category.id === state.categoryId);
    const items = state.categoryId === 'background'
      ? data.backgrounds.map(bg => { const art = window.ASSETS.backgrounds[bg.id]; return `<button class="item-card ${state.backgroundId === bg.id ? 'chosen' : ''}" data-background="${bg.id}"><span class="item-picture scene-thumb ${art ? 'has-art' : ''}" style="--swatch:${bg.color}${art ? `;background-image:url('${esc(runtimeAsset(art))}')` : ''}">${art ? '' : bg.icon}</span><strong>${bg.nameKo}</strong>${state.backgroundId === bg.id ? '<i>✓</i>' : ''}</button>`; }).join('')
      : data.items.filter(item => item.category === state.categoryId && rules.isCompatible(item, state.characterId)).map(itemCard).join('');
    const theme = state.mode === 'story' ? data.themes.find(entry => entry.id === state.themeId) : null;
    const categoryButtons = `${data.categories.map(category => `<button class="category-button ${state.categoryId === category.id ? 'active' : ''}" data-category="${category.id}"><span>${categoryIcon(category.id)}</span><small>${category.name}</small></button>`).join('')}<button class="category-button ${state.categoryId === 'background' ? 'active' : ''}" data-category="background"><span>${categoryIcon('background')}</span><small>배경</small></button>`;
    return `<section class="editor-page">${header()}<main class="editor-stage">${stageArt()}<div class="stage-caption">${theme ? esc(theme.promptKo || theme.title) : `${character().emoji} ${character().nameKo}`}</div></main><div class="rail-shell category-shell"><button class="rail-arrow" data-scroll-rail="category" data-direction="-1" aria-label="이전 꾸미기 종류">‹</button><nav class="category-rail" aria-label="꾸미기 종류">${categoryButtons}</nav><button class="rail-arrow" data-scroll-rail="category" data-direction="1" aria-label="다음 꾸미기 종류">›</button></div><div class="rail-shell item-shell"><button class="rail-arrow" data-scroll-rail="item" data-direction="-1" aria-label="이전 선택지">‹</button><div class="item-rail" aria-label="${currentCategory?.name || '배경'} 선택">${items}</div><button class="rail-arrow" data-scroll-rail="item" data-direction="1" aria-label="다음 선택지">›</button></div><footer class="editor-actions"><button class="action-button magic" data-action="random"><span>🪄</span><strong>마법 코디</strong></button><button class="action-button reset" data-action="reset"><span>🫧</span><strong>처음부터</strong></button><button class="action-button finish-button" data-action="finish"><span>✨</span><strong>완성!</strong></button></footer></section>`;
  }

  function renderFinish() {
    const theme = state.mode === 'story' ? data.themes.find(entry => entry.id === state.themeId) : null;
    const liked = theme && (theme.recommended || []).some(id => Object.values(state.outfit).includes(id));
    const finishText = theme ? (liked ? `${theme.title.replace(/!$/, '')} 준비 완료!` : '멋진 코디를 완성했어요!') : `${character().nameKo}가 오늘 멋지게 꾸몄어요!`;
    return `<section class="finish-page"><header class="simple-header"><button class="round-button" data-action="home" aria-label="홈">⌂</button><h1>${phrases[state.completed % phrases.length]}</h1><button class="round-button" data-action="mute" aria-label="소리">${state.muted ? '🔇' : '🔊'}</button></header><main class="finish-stage">${stageArt()}<div class="finish-card"><strong>${esc(finishText)}</strong><span>${selectedItems().slice(0, 3).map(item => esc(item.nameKo)).join(' · ') || '새로운 모습'}</span></div></main><div class="finish-actions"><button class="big-button pink" data-action="photo"><span>📸</span><strong>사진첩에 저장</strong></button><button class="big-button yellow" data-action="again"><span>👗</span><strong>다시 꾸미기</strong></button><button class="big-button white" data-action="friends"><span>🐰</span><strong>다른 친구</strong></button></div></section>`;
  }

  function renderAlbum() {
    return `<section class="album-page"><header class="simple-header"><button class="round-button" data-action="home" aria-label="홈">⌂</button><h1>나의 사진첩</h1><span></span></header>${state.album.length ? `<div class="album-grid">${state.album.map(photo => `<article class="photo-card"><div class="photo-art">${photoSvg(photo)}</div><strong>${esc(photo.character)}의 코디</strong><small>${esc(photo.date)} · ${esc(photo.background)}</small><p>${esc(photo.items.slice(0, 3).join(' · ') || '새로운 코디')}</p></article>`).join('')}</div>` : `<div class="empty-album"><span>📸</span><strong>아직 사진이 없어요</strong><p>마음에 드는 코디를 사진으로 남겨요!</p><button class="big-button pink" data-action="characters"><span>👗</span><strong>옷 입히기</strong></button></div>`}<button class="bottom-back" data-action="home">홈으로</button></section>`;
  }

  function focusToken(button) {
    if (!button?.dataset) return null;
    for (const name of ['item', 'category', 'action', 'background']) {
      if (button.dataset[name]) return { name, value: button.dataset[name] };
    }
    return null;
  }
  function captureEditorUi() {
    if (document.body.dataset.view !== 'editor') return null;
    const categoryRail = $('.category-rail');
    const itemRail = $('.item-rail');
    if (categoryRail) railScroll.categories = categoryRail.scrollLeft;
    if (itemRail) railScroll.items[renderedCategoryId] = itemRail.scrollLeft;
    return { focus: focusToken(document.activeElement?.closest?.('button')) };
  }
  function clampScroll(rail, value) {
    return Math.max(0, Math.min(Number(value) || 0, Math.max(0, rail.scrollWidth - rail.clientWidth)));
  }
  function syncRailArrows(kind) {
    const rail = kind === 'category' ? $('.category-rail') : $('.item-rail');
    if (!rail) return;
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const buttons = app.querySelectorAll(`[data-scroll-rail="${kind}"]`);
    for (const button of buttons) {
      const direction = Number(button.dataset.direction);
      button.disabled = direction < 0 ? rail.scrollLeft <= 1 : rail.scrollLeft >= max - 1;
    }
  }
  function restoreEditorUi(snapshot) {
    const categoryRail = $('.category-rail');
    const itemRail = $('.item-rail');
    if (categoryRail) {
      const previousBehavior = categoryRail.style.scrollBehavior;
      categoryRail.style.scrollBehavior = 'auto';
      categoryRail.scrollLeft = clampScroll(categoryRail, railScroll.categories);
      categoryRail.style.scrollBehavior = previousBehavior;
      categoryRail.addEventListener('scroll', () => {
        railScroll.categories = categoryRail.scrollLeft;
        syncRailArrows('category');
      }, { passive: true });
    }
    if (itemRail) {
      const stored = Object.prototype.hasOwnProperty.call(railScroll.items, state.categoryId);
      const previousBehavior = itemRail.style.scrollBehavior;
      itemRail.style.scrollBehavior = 'auto';
      itemRail.scrollLeft = clampScroll(itemRail, stored ? railScroll.items[state.categoryId] : 0);
      itemRail.style.scrollBehavior = previousBehavior;
      itemRail.addEventListener('scroll', () => {
        railScroll.items[state.categoryId] = itemRail.scrollLeft;
        syncRailArrows('item');
      }, { passive: true });
      if (!stored) $('.category-button.active')?.scrollIntoView({ block:'nearest', inline:'nearest' });
    }
    syncRailArrows('category');
    syncRailArrows('item');
    if (snapshot?.focus) {
      requestAnimationFrame(() => {
        const target = app.querySelector(`[data-${snapshot.focus.name}="${snapshot.focus.value}"]`);
        target?.focus({ preventScroll: true });
      });
    }
    renderedCategoryId = state.categoryId;
  }
  function render() {
    const editorUi = captureEditorUi();
    document.body.dataset.view = state.view;
    app.innerHTML = state.view === 'home' ? renderHome()
      : state.view === 'themes' ? renderThemes()
      : state.view === 'characters' ? renderCharacters()
      : state.view === 'editor' ? renderEditor()
      : state.view === 'finish' ? renderFinish()
      : renderAlbum();
    if (state.view === 'editor') restoreEditorUi(editorUi);
  }

  function begin(mode, themeId = '') {
    state.mode = mode; state.themeId = themeId;
    if (themeId) state.backgroundId = data.themes.find(theme => theme.id === themeId)?.background || 'room';
    state.view = 'characters'; render(); play('tap');
  }
  function loadCharacter(id) {
    state.characterId = id;
    if (state.mode === 'story') state.backgroundId = data.themes.find(theme => theme.id === state.themeId)?.background || state.backgroundId;
    const theme = state.mode === 'story' ? data.themes.find(entry => entry.id === state.themeId) : null;
    state.view = 'editor'; state.history = []; state.categoryId = theme ? itemById[theme.outfit]?.category || 'dress' : 'hair'; persist(); render(); play('tap'); startBgm();
  }
  function finish() {
    state.completed += 1; state.view = 'finish'; state.sparkle = ''; persist(); render(); play('complete');
  }
  function savePhoto() {
    const photo = { characterId: state.characterId, outfit: rules.normalizeOutfit(state.outfit, itemById, { characterId: state.characterId }), backgroundId: state.backgroundId, character: character().nameKo, background: background().nameKo, items: selectedItems().map(item => item.nameKo), date: new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short' }).format(new Date()) };
    state.album.unshift(photo); state.album = state.album.slice(0, 20); persist(); play('photo'); state.view = 'album'; render();
  }
  function randomOutfit() {
    pushUndo();
    state.outfit = rules.buildRandomOutfit(data.items, itemById, Math.random, unlocked, { characterId: state.characterId });
    state.view = 'editor'; persist(); play('random'); state.sparkle = '✨'; render();
    setTimeout(() => { state.sparkle = ''; $('.sparkle-burst', app)?.remove(); }, 500);
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
        if (previous) { state.outfit = rules.normalizeOutfit(previous.outfit, itemById, { characterId: state.characterId }); state.backgroundId = previous.backgroundId; persist(); render(); play('dress'); }
      }
      else if (action === 'random') randomOutfit();
      else if (action === 'reset') { pushUndo(); state.outfit = rules.normalizeOutfit({ hair: 'hair_01', shoes: 'shoes_02' }, itemById, { characterId: state.characterId }); persist(); render(); }
      else if (action === 'finish') finish();
      else if (action === 'photo') savePhoto();
      else if (action === 'again') continueDressing();
      else if (action === 'friends') { state.view = 'characters'; begin('free'); }
      return;
    }
    if (button.dataset.scrollRail) {
      const kind = button.dataset.scrollRail;
      const rail = kind === 'category' ? $('.category-rail') : $('.item-rail');
      if (rail) {
        const direction = Number(button.dataset.direction) || 1;
        const distance = Math.max(160, rail.clientWidth * .78);
        rail.scrollBy({ left: direction * distance, behavior: 'smooth' });
        setTimeout(() => syncRailArrows(kind), 260);
      }
      return;
    }
    if (button.dataset.theme) { begin('story', button.dataset.theme); return; }
    if (button.dataset.character) { loadCharacter(button.dataset.character); return; }
    if (button.dataset.category) { state.categoryId = button.dataset.category; render(); play('tap'); return; }
    if (button.dataset.item) {
      const item = itemById[button.dataset.item];
      if (!item) return;
      if (!unlocked(item)) { notice(`꾸미기 ${item.lockedAt}번 하면 열려요!`); return; }
        if (state.mode === 'story' && rules.isCompatible(item, state.characterId) && (data.themes.find(theme => theme.id === state.themeId)?.recommended || []).includes(item.id)) notice('잘 어울려요!');
      pushUndo();
      state.outfit = rules.applyItemSelection(state.outfit, item.id, itemById, { characterId: state.characterId });
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
