# 아이엠매직 (I.M.MAGIC) 홈페이지

마술·버블·벌룬·샌드아트·레이저쇼 공연팀 **아이엠매직**의 정적 웹사이트입니다.
백엔드·빌드 도구·외부 라이브러리 없이 **HTML + CSS + JS 파일만으로** 동작합니다.

---

## 1. 바로 보기

```bash
python -m http.server 8816 --directory immagic
```

브라우저에서 <http://localhost:8816> 을 엽니다.
(`index.html` 을 더블클릭해도 열리지만, 일부 브라우저에서 폰트가 늦게 뜰 수 있어 서버 실행을 권합니다.)

## 2. 파일 구성

```
immagic/
  index.html        홈 — 히어로 · 4대 장르 · 청와대 스토리 · 대표 프로그램 · 갤러리 · FAQ
  about.html        ABOUT US — 회사소개 · 대표 프로필 · 연혁 · 공연이력 · 방송 · 수상
  programs.html     공연 프로그램 — 마술 / 버블·벌룬 / 샌드아트 / 레이저쇼 (10개 세부 프로그램)
  rental.html       이벤트 & 렌탈 — 음향·조명·특수효과·MC / 에어바운스·명랑운동회 / 체험·게임
  contact.html      행사 문의 — 문의 채널 · 문의 양식 · 오시는 길 · FAQ
  robots.txt        검색엔진 수집 허용
  sitemap.xml       검색엔진용 페이지 목록
  assets/
    css/style.css   전체 스타일 (디자인 토큰이 파일 맨 위에 모여 있습니다)
    js/app.js       전체 스크립트 (외부 라이브러리 없음)
    img/            공연 사진 · 로고
```

기존 immagic.kr 의 메뉴 구조를 그대로 옮기되, 페이지가 잘게 쪼개져 있던 부분은
**한 페이지 안의 섹션(앵커)** 으로 합쳤습니다. 예: `programs.html#bubble`

## 3. 자주 고칠 만한 곳

| 무엇을 | 어디를 |
|---|---|
| 전화번호 | 전 페이지에서 `010-6380-9901`, `tel:01063809901` 을 찾아 바꿉니다 |
| 이메일 | `imagicnation@naver.com` (양식 전송 주소는 `assets/js/app.js` 의 `mailto:` 부분) |
| 주소 · 사업자번호 | 각 페이지 하단 `ftr__bot` 과 `about.html` 의 회사 정보 표 |
| 브랜드 색 | `assets/css/style.css` 맨 위 `--flame: #ff693b` |
| 히어로 배경 사진 | `index.html` 의 `.hero__slide` 4줄 (`background-image` 경로) |
| 통계 숫자 | `index.html` 의 `.hero__stats`, `about.html` 의 카드 4개 |

사진을 추가할 때는 `assets/img/` 에 넣고 가로 1,100px 내외 JPG 로 저장하면
용량과 화질이 적당합니다.

## 4. 문의 양식 동작 방식

서버가 없으므로 폼은 다음 두 가지로 동작합니다.

1. **메일로 문의 보내기** — 작성한 내용을 정리해 메일 앱을 엽니다 (`mailto:`).
2. **문의 내용 복사** — 같은 내용을 클립보드에 복사합니다. 문자·카카오톡에 붙여넣으면 됩니다.

> 나중에 문의를 자동 수집하고 싶다면 Google Forms, Formspree, 네이버 폼 같은
> 외부 폼 서비스의 주소를 `<form>` 의 `action` 에 넣는 방식으로 바꾸면 됩니다.

## 5. 배포

정적 파일이라 어디에 올려도 됩니다.

- **GitHub Pages** — 저장소에 올리고 Settings → Pages → Branch 지정
- **Netlify / Vercel** — 폴더를 그대로 드래그 앤 드롭
- **기존 호스팅** — FTP 로 `immagic/` 안의 내용을 웹 루트에 업로드

도메인을 `immagic.kr` 로 연결한 뒤에는 `sitemap.xml` 의 주소가 이미 맞춰져 있으니
네이버 서치어드바이저와 구글 서치콘솔에 `https://immagic.kr/sitemap.xml` 을 제출하면 됩니다.

## 6. 알아두면 좋은 것

- **한글 줄바꿈** — `body { word-break: keep-all }` 이 걸려 있습니다. 빼면 낱자가 떨어집니다.
- **오프닝 커튼** — 홈 첫 방문 시 1.3초짜리 막이 오르는 연출이 나옵니다.
  CSS 만으로 열리므로 JS 가 막혀도 화면이 덮이지 않습니다.
  세션당 1회만 나오며, 다시 보려면 브라우저 탭을 새로 엽니다.
- **모션 최소화** — 사용자가 OS에서 "동작 줄이기"를 켜면 모든 애니메이션이 꺼집니다.
- **폰트** — Google Fonts (Bodoni Moda · Hahmlet · IBM Plex Sans KR)를 불러옵니다.
  인터넷이 없는 환경에서 쓰려면 폰트 파일을 내려받아 `assets/` 에 두고
  `@font-face` 로 바꿔야 합니다.
- **이미지 출처** — 아이엠매직 제안서 PDF 와 기존 홈페이지에서 가져온 실제 공연 사진입니다.

## 7. 사진 저작권

이 사이트의 공연 사진과 로고는 아이엠매직의 자산입니다. 외부 배포 시 확인이 필요합니다.
