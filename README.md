# 세연이의 옷장

3세 아이가 그림 버튼을 눌러 혼자 꾸밀 수 있는 한국어 옷입히기 게임입니다. 바닐라 HTML·CSS·JavaScript로 만들었고, 게임과 사진첩은 기기 안에만 저장됩니다.

## 실행

저장소에서 `python -m http.server 8765`를 실행하고 `http://127.0.0.1:8765/`를 엽니다. PWA 설치와 오프라인 캐시는 HTTPS 또는 localhost에서 동작합니다.

런타임 아트 재생성: `python scripts/convert-assets.py` (Pillow WebP 지원 필요; 기존 런타임 파일을 PNG 원본에서 다시 생성합니다).

검증: `node check-data.js`, `node audit-assets.js`, `node scripts/audit-story-mode.js`, `python scripts/verify-runtime-assets.py`. 이야기 모드 전체 custom-art 완성 여부는 `node scripts/audit-story-mode.js --strict`로 확인합니다.

## 자산 교체

투명 PNG 원본을 `assets/custom/` 아래에 넣고 `assets/assetRegistry.js`에서 데이터 ID에 경로를 연결하면 캐릭터나 의상을 교체할 수 있습니다. 마스터는 **1086×1448(3:4)** 전신 캔버스이며, 게임은 이를 360×480 viewBox에 그대로 맞춰 표시합니다. `python scripts/convert-assets.py`가 픽셀 손실 없는 WebP 런타임 사본을 `assets/runtime/`에 만듭니다. 원본 PNG는 변환 후에도 유지됩니다.

현재 커스텀 아트는 세연이 본체, 헤어 5종, 원피스 12종, 상의 3종, 치마 3종, 바지 1종, 신발 4종, 머리장식 3종, 가방 2종, 소품 2종, 배경 7종입니다. 다섯 이야기 테마는 실제 배경 미리보기와 선택형 추천 코디를 제공합니다. 사진첩은 이미지 파일 대신 코디 ID와 배경 ID를 저장하고 현재 자산으로 카드를 다시 그립니다.

착장 규칙: 원피스는 상의/치마/바지를 지우고, 상의는 원피스만 지웁니다. 치마와 바지는 서로 한 가지만 착용합니다. 기존 로컬 저장값에 충돌이 있으면 원피스, 또는 바지 순으로 정리합니다. 가로 레일은 손가락 스와이프와 이전/다음 화살표로 움직이며 아이템을 고른 뒤에도 위치를 기억합니다. 세부 사항은 [V5 착장·화면 안내](docs/V5_FIT_AND_SCROLL.md)를 참고하세요.

효과음과 배경음은 Web Audio로 만든 임시 소리입니다. 정식 음원은 `/assets/custom/audio/`에 추가한 뒤 같은 registry의 `audio` 경로에 등록하세요.

## 포함 기능

- 네 캐릭터, 104개 의상·소품, 열 가지 배경
- 자유 꾸미기와 짧은 이야기 테마, 마법 코디, 처음부터, 10단계 되돌리기
- 최근 코디 20개 로컬 사진첩, 마지막 코디와 음소거 상태 저장
- 광고·로그인·결제·분석·외부 링크 없이 오프라인 실행

일부 그래픽은 교체 가능한 임시 SVG입니다. 가족용 개인 게임이며 게임 저장을 위한 로컬 저장 외 네트워크 기능은 사용하지 않습니다.
