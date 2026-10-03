// 직접 만든 투명 배경 파츠 파일 경로를 연결해 기본 SVG 그림을 교체합니다.
// 현재 원본 아트 마스터는 1086×1448(3:4) 투명 캔버스로 통일합니다. 모든 착용 파츠는 동일 좌표에 맞춥니다.
window.ASSETS = {
  characters: {
    girl01: 'assets/custom/characters/girl01.png',
    girl02: 'assets/custom/characters/girl02.png',
    bear01: 'assets/custom/characters/bear01.png',
    rabbit01: 'assets/custom/characters/rabbit01.png'
  },
  items: {
    hair_01: 'assets/custom/clothes/hair_01.png',
    hair_02: 'assets/custom/clothes/hair_02.png',
    hair_03: 'assets/custom/clothes/hair_03.png',
    hair_04: 'assets/custom/clothes/hair_04.png',
    hair_05: 'assets/custom/clothes/hair_05_v1.png',
    hair_06: 'assets/custom/clothes/hair_06_v3.png',
    hair_07: 'assets/custom/clothes/hair_07_v2.png',
    hair_08: 'assets/custom/clothes/hair_08_v1.png',
    hat_04: 'assets/custom/clothes/hat_04_v1.png',
    hat_01: 'assets/custom/clothes/hat_01_v1.png',
    hat_02: 'assets/custom/clothes/hat_02_v1.png',
    hat_03: 'assets/custom/clothes/hat_03_v1.png',
    hat_05: 'assets/custom/clothes/hat_05_v1.png',
    hat_06: 'assets/custom/clothes/hat_06_v1.png',
    hat_07: 'assets/custom/clothes/hat_07_v1.png',
    hat_08: 'assets/custom/clothes/hat_08_v1.png',
    hat_09: 'assets/custom/clothes/hat_09_v1.png',
    hat_10: 'assets/custom/clothes/hat_10_v1.png',
    top_01: 'assets/custom/clothes/top_01_v2.png',
    top_05: 'assets/custom/clothes/top_05_v1.png',
    top_04: 'assets/custom/clothes/top_04_v1.png',
    top_02: 'assets/custom/clothes/top_02_v1.png',
    top_03: 'assets/custom/clothes/top_03_v1.png',
    skirt_01: 'assets/custom/clothes/skirt_01.png',
    skirt_02: 'assets/custom/clothes/skirt_02.png',
    skirt_03: 'assets/custom/clothes/skirt_03.png',
    shoes_02: 'assets/custom/clothes/shoes_02.png',
    shoes_03: 'assets/custom/clothes/shoes_03.png',
    shoes_04: 'assets/custom/clothes/shoes_04.png',
    headAccessory_01: 'assets/custom/clothes/headAccessory_01.png',
    headAccessory_02: 'assets/custom/clothes/headAccessory_02.png',
    headAccessory_03: 'assets/custom/clothes/headAccessory_03.png',
    bag_01: 'assets/custom/clothes/bag_01.png',
    bag_02: 'assets/custom/clothes/bag_02.png',
    toy_01: 'assets/custom/clothes/toy_01.png',
    toy_02: 'assets/custom/clothes/toy_02.png',
    dress_01: 'assets/custom/clothes/dress_01.png',
    dress_02: 'assets/custom/clothes/dress_02.png',
    dress_03: 'assets/custom/clothes/dress_03.png',
    dress_04: 'assets/custom/clothes/dress_04.png',
    dress_05: 'assets/custom/clothes/dress_05_v3.png',
    dress_06: 'assets/custom/clothes/dress_06.png',
    dress_07: 'assets/custom/clothes/dress_07.png',
    dress_08: 'assets/custom/clothes/dress_08.png',
    dress_09: 'assets/custom/clothes/dress_09.png',
    dress_10: 'assets/custom/clothes/dress_10.png',
    dress_11: 'assets/custom/clothes/dress_11.png',
    dress_12: 'assets/custom/clothes/dress_12.png',
    shoes_01: 'assets/custom/clothes/shoes_01.png',
    pants_02: 'assets/custom/clothes/pants_02.png'
  },
  // V8: tops and hats use fitBounds + fit-engine.js with one uniform scale.
  // All registered wearable masters now use their own full-canvas placement.
  // Strong-alpha (>=32) visible bounds measured on each 1086×1448 source master.
  // fit-engine.js maps these bounds into semantic 360×480 slots without anisotropic stretching.
  fitBounds: {
    top_01: [193,525,898,1003],
    top_02: [127,482,959,1034],
    top_03: [89,381,997,1006],
    top_04: [188,531,898,1008],
    top_05: [51,517,1035,1025],
    dress_01: [256,479,831,1138],
    dress_02: [197,390,889,1159],
    dress_03: [182,391,905,1169],
    dress_04: [174,376,914,1170],
    dress_05: [168,468,919,1215],
    dress_06: [134,338,952,1196],
    dress_07: [128,337,959,1195],
    dress_08: [120,337,967,1206],
    dress_09: [115,337,971,1211],
    dress_10: [95,336,992,1206],
    dress_11: [124,320,989,1202],
    dress_12: [112,552,974,1359],
    hat_01: [179,414,907,831],
    hat_02: [31,230,1055,630],
    hat_03: [108,354,980,917],
    hat_04: [134,211,952,619],
    hat_05: [92,382,1026,907],
    hat_06: [141,348,945,851],
    hat_07: [72,385,1018,978],
    hat_08: [57,358,1029,987],
    hat_09: [54,269,1033,833],
    hat_10: [105,282,983,938]
  },
  // Neutral base art appears only while a body garment is selected.
  dressableCharacters: {
    girl01: 'assets/custom/characters/dressable/girl01.png',
    girl02: 'assets/custom/characters/dressable/girl02.png',
    bear01: 'assets/custom/characters/dressable/bear01.png',
    rabbit01: 'assets/custom/characters/dressable/rabbit01.png'
  },
  characterHairComposites: {
    rabbit01: {
      hair_01: 'assets/custom/characters/rabbit01_hair01.png',
      hair_03: 'assets/custom/characters/rabbit01_hair03.png',
      hair_07: 'assets/custom/characters/rabbit01_hair07.png'
    }
  },
  dressableCharacterHairComposites: {
    rabbit01: {
      hair_01: 'assets/custom/characters/rabbit01_hair01_dressable.png',
      hair_03: 'assets/custom/characters/rabbit01_hair03_dressable.png',
      hair_07: 'assets/custom/characters/rabbit01_hair07_dressable.png'
    }
  },
  backgrounds: {
    room: 'assets/custom/backgrounds/room.png',
    garden: 'assets/custom/backgrounds/garden.png',
    castle: 'assets/custom/backgrounds/castle.png',
    beach: 'assets/custom/backgrounds/beach.png',
    birthday: 'assets/custom/backgrounds/birthday.png',
    park: 'assets/custom/backgrounds/park.png',
    playground: 'assets/custom/backgrounds/playground.png'
  },
  audio: {
    bgm: 'assets/custom/audio/seyeon-closet.mp3',
    themes: {
      picnic: 'assets/custom/audio/picnic-day.mp3',
      princess: 'assets/custom/audio/castle-ballroom.mp3',
      rainy: 'assets/custom/audio/rainy-day.mp3',
      birthday: 'assets/custom/audio/birthday-party.mp3',
      beach: 'assets/custom/audio/seashell-parade.mp3'
    },
    tap: null,
    dress: null,
    sparkle: null,
    complete: null,
    photo: null,
    random: null
  }
};
