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
    hair_06: 'assets/custom/clothes/hair_06_v2.png',
    hair_07: 'assets/custom/clothes/hair_07_v1.png',
    hat_04: 'assets/custom/clothes/hat_04_v1.png',
    hat_01: 'assets/custom/clothes/hat_01_v1.png',
    hat_02: 'assets/custom/clothes/hat_02_v1.png',
    hat_03: 'assets/custom/clothes/hat_03_v1.png',
    hat_05: 'assets/custom/clothes/hat_05_v1.png',
    hat_06: 'assets/custom/clothes/hat_06_v1.png',
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
  // ImageGen bounding box is fitted to the shared 360×480 character rig.
  itemTransforms: {
    top_01: { tx: 77.4, ty: 14.6, sx: 0.57, sy: 0.87 },
    top_04: { tx: 77.4, ty: 14.6, sx: 0.57, sy: 0.87 },
    top_03: { tx: 77.4, ty: 95, sx: 0.57, sy: 0.7 },
    top_02: { tx: 77.4, ty: 95, sx: 0.57, sy: 0.7 },
    top_05: { tx: 77.4, ty: 34.6, sx: 0.57, sy: 0.87 },
    hair_06: { tx: 63, ty: -25.5, sx: 0.57, sy: 0.5 },
    hair_07: { tx: 81, ty: -30, sx: 0.5, sy: 0.58 },
    hat_04: { tx: 104, ty: 0, sx: 0.42, sy: 0.32 },
    hat_01: { tx: 63, ty: -20, sx: 0.65, sy: 0.32 },
    hat_02: { tx: 90, ty: -22, sx: 0.5, sy: 0.5 },
    hat_03: { tx: 93.6, ty: -25, sx: 0.48, sy: 0.32 },
    hat_05: { tx: 90, ty: -25, sx: 0.5, sy: 0.32 },
    hat_06: { tx: 79, ty: -26, sx: 0.56, sy: 0.36 }
  },
  characterHairComposites: {
    rabbit01: {
      hair_01: 'assets/custom/characters/rabbit01_hair01.png',
      hair_03: 'assets/custom/characters/rabbit01_hair03.png',
      hair_07: 'assets/custom/characters/rabbit01_hair07.png'
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
