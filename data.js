(() => {
  const categories = [
    ['hair', '머리', '💇', 10, ['단발 머리','긴 웨이브','양 갈래','높은 포니테일','똑단발','포니테일','복슬 머리','동글 머리']],
    ['hat', '모자', '🧢', 60, ['딸기 모자','햇살 밀짚모자','구름 비니','분홍 왕관','곰돌이 모자','꽃 모자','바다 모자','눈꽃 모자','별 모자','리본 모자']],
    ['top', '상의', '👚', 32, ['분홍 티셔츠','하늘색 블라우스','노란 스웨터','꽃무늬 셔츠','구름 맨투맨','체크 셔츠','토끼 티셔츠','별빛 상의','줄무늬 옷','포근 조끼','무지개 상의','딸기 셔츠']],
    ['dress', '원피스', '👗', 31, ['분홍 꽃 원피스','노란 해님 원피스','하늘 구름 원피스','딸기 원피스','무지개 원피스','보라 공주 원피스','꽃밭 원피스','바다 원피스','체크 원피스','리본 원피스','달빛 원피스','생일 파티 원피스']],
    ['skirt', '치마', '👗', 30, ['분홍 치마','하늘 별 치마','보라 튤 치마','보라 치마','무지개 치마','체크 치마','별 치마','딸기 치마']],
    ['pants', '바지', '👖', 30, ['분홍 멜빵바지','편한 청바지','노란 바지','하늘 반바지','꽃무늬 바지','구름 바지','줄무늬 바지','포근 바지']],
    ['shoes', '신발', '👟', 40, ['분홍 운동화','노란 장화','하늘 구두','꽃 샌들','토끼 신발','반짝 구두','빨간 장화','무지개 신발','곰돌이 신발','별 운동화']],
    ['headAccessory', '머리장식', '🎀', 70, ['꽃 화관','나비 핀','분홍 리본','별 머리띠','딸기 핀','진주 머리띠','무지개 핀','하트 머리띠','체리 핀','구름 핀']],
    ['bag', '가방', '🎒', 100, ['딸기 미니백','구름 가방','노란 가방','분홍 가방','꽃 가방','무지개 가방','곰돌이 가방','별 가방']],
    ['accessory', '목걸이·안경', '💖', 80, ['하트 목걸이','진주 목걸이','꽃 목걸이','별 목걸이','동그란 안경','분홍 안경','하트 안경','반짝 목걸이','무지개 목걸이','나비 목걸이']],
    ['toy', '소품', '🧸', 110, ['곰돌이 인형','무지개 바람개비','작은 꽃다발','마법 지팡이','알록달록 풍선','별 쿠션','무지개 우산','작은 선물 상자']]
  ].map(([id, name, icon, layer, names]) => ({ id, name, icon, layer, names }));

  const colors = ['#f6a7c4','#ffd56a','#91d7e8','#bba7ef','#ff937f','#a8d989','#fbab75','#9dbbfa','#f4c4e5','#7dd5bb','#f486a1','#c8a6f3'];
  const hatFits = {
    hat_01:'cap', hat_02:'sunhat', hat_03:'beanie', hat_04:'crown', hat_05:'beanie',
    hat_06:'sunhat', hat_07:'cap', hat_08:'beanie', hat_09:'cap', hat_10:'ribbon'
  };
  const rabbitHairComposites = new Set(['hair_01', 'hair_03', 'hair_07']);
  const items = categories.flatMap(category => category.names.map((nameKo, i) => {
    const id = `${category.id}_${String(i + 1).padStart(2, '0')}`;
    const asset = window.ASSETS.items[id] || null;
    const compatibleCharacters = category.id === 'hair' && !rabbitHairComposites.has(id)
      ? ['girl01', 'girl02', 'bear01']
      : undefined;
    return {
      id,
      category: category.id,
      nameKo,
      asset,
      ...(compatibleCharacters ? { compatibleCharacters } : {}),
      ...(category.id === 'hat' ? { hatFit: hatFits[id] } : {}),
      tags: ['cute', `color-${i % colors.length}`],
      color: colors[i % colors.length],
      variant: i,
      layer: category.layer
    };
  }));

  const characters = [
    { id: 'girl01', nameKo: '세연이', emoji: '👧🏻', skin: '#f5c79f', hair: '#49332f', kind: 'human', blush: '#f39bb1', rigId: 'preschool-v1' },
    { id: 'girl02', nameKo: '하늘이', emoji: '👧🏽', skin: '#d99d72', hair: '#332823', kind: 'human', blush: '#e58183', rigId: 'preschool-v1' },
    { id: 'bear01', nameKo: '곰돌이', emoji: '🐻', skin: '#b97952', hair: '#754b39', kind: 'bear', blush: '#ed9b9a', rigId: 'preschool-v1' },
    { id: 'rabbit01', nameKo: '토끼', emoji: '🐰', skin: '#fff0dc', hair: '#e7b7a7', kind: 'rabbit', blush: '#f09aa8', rigId: 'preschool-v1' }
  ];

  window.GAME_DATA = {
    categories,
    items,
    characters,
    layers: { background: 0, hairBack: 10, body: 20, pants: 30, skirt: 30, dress: 31, top: 32, shoes: 40, hair: 50, hat: 60, headAccessory: 70, accessory: 80, glasses: 90, bag: 100, toy: 110, effect: 120 },
    backgrounds: [
      { id:'room', nameKo:'아이 방', icon:'🧸', color:'#ffe8cb', scenery:'room' },
      { id:'playground', nameKo:'놀이터', icon:'🛝', color:'#d9eff0', scenery:'playground' },
      { id:'garden', nameKo:'꽃밭', icon:'🌷', color:'#f8e3ed', scenery:'garden' },
      { id:'park', nameKo:'공원', icon:'🌳', color:'#dcebd8', scenery:'park' },
      { id:'beach', nameKo:'바닷가', icon:'🏖️', color:'#d7edf4', scenery:'beach' },
      { id:'castle', nameKo:'공주 성', icon:'🏰', color:'#e8def4', scenery:'castle' },
      { id:'birthday', nameKo:'생일 파티', icon:'🎂', color:'#f7e2eb', scenery:'birthday' },
      { id:'snow', nameKo:'눈 오는 마을', icon:'❄️', color:'#e0edf6', scenery:'snow' },
      { id:'school', nameKo:'학교', icon:'🏫', color:'#e9e6d5', scenery:'school' },
      { id:'zoo', nameKo:'동물원', icon:'🦒', color:'#e5edd6', scenery:'zoo' }
    ],
    themes: [
      { id:'picnic', title:'소풍 가는 날!', promptKo:'소풍 갈 옷을 골라볼까?', icon:'🧺', background:'park', outfit:'dress_05', recommended:['dress_05','shoes_02','bag_01','toy_01'] },
      { id:'princess', title:'공주님 파티!', promptKo:'공주님처럼 꾸며볼까?', icon:'👑', background:'castle', outfit:'dress_06', recommended:['dress_06','shoes_03','headAccessory_03'] },
      { id:'rainy', title:'비 오는 날!', promptKo:'비 오는 날 옷을 골라볼까?', icon:'🌧️', background:'playground', outfit:'pants_02', recommended:['pants_02','top_02','shoes_02'] },
      { id:'birthday', title:'생일 파티!', promptKo:'생일 파티 옷을 골라볼까?', icon:'🎂', background:'birthday', outfit:'dress_12', recommended:['dress_12','shoes_03','headAccessory_01','bag_01'] },
      { id:'beach', title:'바닷가로 가요!', promptKo:'바닷가 옷을 골라볼까?', icon:'🐚', background:'beach', outfit:'dress_08', recommended:['dress_08','shoes_04','bag_02','toy_02'] }
    ]
  };
})();
