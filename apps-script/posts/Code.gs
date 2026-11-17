/**
 * 아이엠매직 · 공연 소식 + 갤러리 서버
 * ────────────────────────────────────────────────────────────
 * 구글 앱스 스크립트로 도는 작은 서버입니다. 하는 일은 셋:
 *
 *   1. 관리자 화면이 보낸 사진(웹용 사본) → 홈페이지 저장소의 photos 가지
 *   2. 글 목록 → posts/posts.json 갱신 (공연 소식 페이지가 이걸 읽습니다)
 *   3. 갤러리 목록 → gallery/gallery.json 갱신 (첫 화면 「무대의 기록」이 이걸 읽습니다)
 *
 * 설치 방법은 같은 폴더의 README.md 를 보세요.
 * 비밀번호·토큰은 이 파일에 적지 말고 「스크립트 속성」에 넣습니다.
 *
 * ※ 구글 드라이브는 쓰지 않습니다. 저장소에는 긴 변 1600px 사본만 올라갑니다.
 *
 * ※ 중요 — 글과 사진은 main 이 아니라 photos 가지에 올라갑니다.
 *   홈페이지(main)는 건드리지 않으므로, 글을 올려도 사이트가 다시 배포되지 않습니다.
 */

/* ══ 스크립트 속성에서 설정을 읽어온다 ══
   UPLOAD_PW      글쓰기 비밀번호 (대표님만 아는 값)
   GITHUB_TOKEN   GitHub 토큰 (Contents 쓰기 권한)
   GITHUB_REPO    brizymedia/immagic                      */
function 설정(키) {
  const v = PropertiesService.getScriptProperties().getProperty(키);
  if (!v) throw new Error('스크립트 속성에 ' + 키 + ' 가 없습니다. README 2단계를 확인해 주세요.');
  return v;
}

const 가지     = 'photos';            // 글·사진이 사는 가지 (main 아님)
const 저장경로 = 'posts';             // 그 가지 안에서 쌓이는 폴더
const 글파일   = 저장경로 + '/posts.json';
const 최대글수 = 120;                 // 이보다 오래된 글은 목록에서 빠진다

const 갤러리경로 = 'gallery';          // 「무대의 기록」 사진이 쌓이는 폴더
const 갤러리파일 = 갤러리경로 + '/gallery.json';
const 최대칸수   = 40;                 // 갤러리에 둘 수 있는 사진 수

/* ══════════════════════════════════════════════════════════════
   0. 권한 받기

   "UrlFetchApp.fetch를 호출할 수 있는 권한이 없습니다" 가 뜰 때 씁니다.
   편집기 위쪽 함수 목록에서 이 함수(권한받기)를 고르고 「실행」 하세요.
   권한 요청 창이 뜨면 승인하시면 됩니다.
   그 뒤 「배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포」 를 해주세요.
══════════════════════════════════════════════════════════════ */
function 권한받기() {
  UrlFetchApp.fetch('https://api.github.com/rate_limit', { muteHttpExceptions: true });
  Logger.log('권한 확인 완료 — 이제 배포를 새 버전으로 다시 해주세요.');
}

/* 설치가 잘 됐는지 눈으로 보는 함수. 편집기에서 실행하면 로그에 결과가 찍힙니다. */
function 점검() {
  const 속성 = PropertiesService.getScriptProperties();
  ['UPLOAD_PW', 'GITHUB_TOKEN', 'GITHUB_REPO'].forEach(function (k) {
    Logger.log(k + ': ' + (속성.getProperty(k) ? '있음' : '── 없음 ──'));
  });
  try {
    Logger.log('photos 가지 연결 정상 — 글 ' + 글읽기().posts.length +
               '개, 갤러리 ' + 갤러리읽기().items.length + '칸');
  } catch (err) {
    Logger.log('photos 가지를 읽지 못했습니다: ' + err.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   1. 상태 확인 — 브라우저로 주소를 열면 이게 나옵니다.
══════════════════════════════════════════════════════════════ */
function doGet() {
  const 준비 = {};
  ['UPLOAD_PW', 'GITHUB_TOKEN', 'GITHUB_REPO'].forEach(function (k) {
    준비[k] = !!PropertiesService.getScriptProperties().getProperty(k);
  });
  return 응답({ ok: true, 이름: '아이엠매직 공연 소식 서버', 가지: 가지, 설정완료: 준비 });
}

/* ══════════════════════════════════════════════════════════════
   2. 요청 받기
══════════════════════════════════════════════════════════════ */
function doPost(e) {
  try {
    const 요청 = JSON.parse(e.postData.contents);

    if (요청.pw !== 설정('UPLOAD_PW')) {
      return 응답({ ok: false, error: '비밀번호가 다릅니다' });
    }

    if (요청.action === 'list')   return 응답({ ok: true, posts: 글읽기().posts });
    if (요청.action === 'photo')  return 응답(사진저장(요청));
    if (요청.action === 'save')   return 응답(잠그고(function () { return 글저장(요청); }));
    if (요청.action === 'delete') return 응답(잠그고(function () { return 글삭제(요청); }));

    if (요청.action === 'gal-list')  return 응답({ ok: true, items: 갤러리읽기().items });
    if (요청.action === 'gal-photo') return 응답(갤러리사진저장(요청));
    if (요청.action === 'gal-save')  return 응답(잠그고(function () { return 갤러리저장(요청); }));

    return 응답({ ok: false, error: '알 수 없는 요청입니다: ' + 요청.action });

  } catch (err) {
    // 실패를 조용히 삼키지 않는다 — 화면에 그대로 보여준다
    return 응답({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* posts.json 은 읽고-고치고-쓰기 때문에 동시에 두 번 돌면 서로를 덮어쓴다.
   한 번에 하나만 들어가도록 잠근다. */
function 잠그고(일) {
  const 자물쇠 = LockService.getScriptLock();
  if (!자물쇠.tryLock(30000)) {
    return { ok: false, error: '다른 저장이 처리 중입니다. 잠시 뒤 다시 눌러주세요.' };
  }
  try { return 일(); } finally { 자물쇠.releaseLock(); }
}

/* ══════════════════════════════════════════════════════════════
   3. 사진 한 장 저장 — 글을 저장하기 전에 사진부터 한 장씩 올린다
══════════════════════════════════════════════════════════════ */
function 사진저장(요청) {
  const id = 안전한파일이름(요청.postId);
  if (!id)         return { ok: false, error: '글 번호(postId)가 없습니다.' };
  if (!요청.image) return { ok: false, error: '사진이 비어 있습니다.' };

  const 번호   = ('00' + (Number(요청.index) + 1)).slice(-3);
  const 경로   = 저장경로 + '/' + id + '-' + 번호 + '.jpg';

  const 결과 = 깃허브에올리기(경로, 요청.image, '소식 사진: ' + 경로.split('/').pop());
  if (!결과.ok) return 결과;

  return { ok: true, path: 경로 };
}

/* 파일 이름으로 쓸 수 있는 글자만 남긴다 */
function 안전한파일이름(값) {
  return String(값 || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
}

/* 꺾쇠를 없애 화면에 그대로 찍히는 사고를 막는다 (공개 페이지도 한 번 더 막는다) */
function 글자(값, 최대) {
  return String(값 == null ? '' : 값).replace(/[<>]/g, '').trim().slice(0, 최대);
}

/* ══════════════════════════════════════════════════════════════
   4. 글 저장 · 삭제
══════════════════════════════════════════════════════════════ */
function 글저장(요청) {
  const 입력 = 요청.post || {};
  const 제목 = 글자(입력.t, 120);
  if (!제목) return { ok: false, error: '제목을 적어 주세요.' };

  const 목록 = 글읽기();

  const 사진 = (Array.isArray(입력.p) ? 입력.p : [])
    .map(function (x) { return 글자(x, 200); })
    .filter(function (x) { return x && x.indexOf(저장경로 + '/') === 0; })
    .slice(0, 20);

  const 글 = {
    id: 안전한파일이름(입력.id) || ('p' + Date.now().toString(36)),
    d:  글자(입력.d, 20) || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy.MM.dd'),
    t:  제목,
    b:  글자(입력.b, 4000),
    p:  사진,
  };

  const 자리 = 목록.posts.findIndex(function (x) { return x.id === 글.id; });
  if (자리 >= 0) 목록.posts[자리] = 글; else 목록.posts.unshift(글);

  const 결과 = 글쓰기(목록, '소식 ' + (자리 >= 0 ? '수정' : '추가') + ': ' + 제목.slice(0, 30));
  if (!결과.ok) return 결과;

  return { ok: true, posts: 목록.posts };
}

function 글삭제(요청) {
  const 목록 = 글읽기();
  const 대상 = 목록.posts.filter(function (x) { return x.id === 요청.id; })[0];
  if (!대상) return { ok: false, error: '없는 글입니다.' };

  목록.posts = 목록.posts.filter(function (x) { return x.id !== 요청.id; });

  const 결과 = 글쓰기(목록, '소식 삭제: ' + String(대상.t || '').slice(0, 30));
  if (!결과.ok) return 결과;

  // 글이 지워졌으면 그 글의 사진도 치운다. 한 장 실패해도 글 삭제는 이미 끝났으니 넘어간다.
  (대상.p || []).forEach(function (경로) {
    try { 깃허브에서지우기(경로); } catch (err) { /* 무시 */ }
  });

  return { ok: true, posts: 목록.posts };
}

/* ══════════════════════════════════════════════════════════════
   5. posts.json 읽기 · 쓰기
══════════════════════════════════════════════════════════════ */
function 글읽기() {
  const 응 = 깃허브(글파일, 'get');
  if (응.getResponseCode() === 404) return { updated: '', posts: [] };
  try {
    const 내용 = JSON.parse(응.getContentText());
    const 값 = JSON.parse(Utilities.newBlob(Utilities.base64Decode(내용.content)).getDataAsString());
    return { updated: 값.updated || '', posts: Array.isArray(값.posts) ? 값.posts : [] };
  } catch (err) {
    // 여기서 빈 목록을 돌려주면 기존 글이 전부 날아간다. 차라리 멈춘다.
    throw new Error('posts.json 을 읽지 못했습니다: ' + err.message);
  }
}

function 글쓰기(목록, 메모) {
  목록.updated = new Date().toISOString();
  목록.posts = 목록.posts.slice(0, 최대글수);
  const 본문 = Utilities.base64Encode(
    Utilities.newBlob(JSON.stringify(목록, null, 1)).getBytes()
  );
  return 깃허브에올리기(글파일, 본문, 메모);
}

/* ══════════════════════════════════════════════════════════════
   6. 깃허브 파일 읽기 · 쓰기 · 지우기  (전부 photos 가지)
══════════════════════════════════════════════════════════════ */
function 깃허브(경로, 방법, 본문) {
  // 읽기는 ?ref= 로, 쓰기·지우기는 본문의 branch 로 가지를 정한다
  const 주소 = 'https://api.github.com/repos/' + 설정('GITHUB_REPO') + '/contents/' + 경로 +
               (방법 === 'get' ? '?ref=' + 가지 + '&t=' + Date.now() : '');
  return UrlFetchApp.fetch(주소, {
    method: 방법,
    headers: {
      Authorization: 'Bearer ' + 설정('GITHUB_TOKEN'),
      Accept: 'application/vnd.github+json',
      'User-Agent': 'immagic-posts',
    },
    contentType: 'application/json',
    payload: 본문 ? JSON.stringify(본문) : undefined,
    muteHttpExceptions: true,
  });
}

function 깃허브에올리기(경로, base64, 메모) {
  const 본문 = { message: 메모, content: base64, branch: 가지 };

  // 이미 있는 파일이면 sha 를 같이 보내야 덮어쓸 수 있다
  const 기존 = 깃허브(경로, 'get');
  if (기존.getResponseCode() === 200) {
    try { 본문.sha = JSON.parse(기존.getContentText()).sha; } catch (err) { /* 무시 */ }
  }

  const 응   = 깃허브(경로, 'put', 본문);
  const 코드 = 응.getResponseCode();
  if (코드 === 200 || 코드 === 201) return { ok: true };

  return { ok: false, error: '깃허브 저장 실패 (' + 코드 + ') ' + 사유읽기(응) };
}

function 깃허브에서지우기(경로) {
  const 기존 = 깃허브(경로, 'get');
  if (기존.getResponseCode() === 404) return { ok: false, 없음: true };

  let sha = '';
  try { sha = JSON.parse(기존.getContentText()).sha; } catch (err) { /* 무시 */ }
  if (!sha) return { ok: false, error: '파일 정보를 읽지 못했습니다' };

  const 응 = 깃허브(경로, 'delete', {
    message: '소식 사진 삭제: ' + 경로.split('/').pop(),
    sha: sha,
    branch: 가지,
  });
  if (응.getResponseCode() === 200) return { ok: true };
  return { ok: false, error: 사유읽기(응) };
}

function 사유읽기(응) {
  let 사유 = 응.getContentText();
  try { 사유 = JSON.parse(사유).message || 사유; } catch (err) { /* 그대로 */ }
  return 사유;
}

/* ══ 공통 응답 ══ */
function 응답(값) {
  return ContentService
    .createTextOutput(JSON.stringify(값))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ══════════════════════════════════════════════════════════════
   7. 「무대의 기록」 갤러리

   photos 가지의 gallery/gallery.json 에 칸 목록을 둔다.
   칸 하나 = { f: 사진경로, c: 설명, n: 이름 }

   사진경로는 두 가지다.
     · 'assets/...'  → 홈페이지에 원래 들어 있는 사진 (손대지 않는다)
     · 'gallery/...' → 관리자 화면에서 올린 사진 (photos 가지에 있다)

   요청: {action:'gal-list'}
         {action:'gal-photo', index, image}
         {action:'gal-save', items:[...]}
══════════════════════════════════════════════════════════════ */
function 갤러리읽기() {
  const 응 = 깃허브(갤러리파일, 'get');
  if (응.getResponseCode() === 404) return { updated: '', items: [] };
  try {
    const 내용 = JSON.parse(응.getContentText());
    const 값 = JSON.parse(Utilities.newBlob(Utilities.base64Decode(내용.content)).getDataAsString());
    return { updated: 값.updated || '', items: Array.isArray(값.items) ? 값.items : [] };
  } catch (err) {
    // 빈 목록을 돌려주면 갤러리가 통째로 날아간다. 차라리 멈춘다.
    throw new Error('gallery.json 을 읽지 못했습니다: ' + err.message);
  }
}

function 갤러리쓰기(목록, 메모) {
  목록.updated = new Date().toISOString();
  목록.items = 목록.items.slice(0, 최대칸수);
  const 본문 = Utilities.base64Encode(
    Utilities.newBlob(JSON.stringify(목록, null, 1)).getBytes()
  );
  return 깃허브에올리기(갤러리파일, 본문, 메모);
}

function 갤러리사진저장(요청) {
  if (!요청.image) return { ok: false, error: '사진이 비어 있습니다.' };
  // 시각 + 번호로 이름을 지어 절대 겹치지 않게 한다
  const 이름 = 'g' + Date.now().toString(36) + '-' + ('00' + (Number(요청.index) + 1)).slice(-3);
  const 경로 = 갤러리경로 + '/' + 이름 + '.jpg';

  const 결과 = 깃허브에올리기(경로, 요청.image, '갤러리 사진: ' + 이름 + '.jpg');
  if (!결과.ok) return 결과;

  return { ok: true, path: 경로 };
}

function 갤러리저장(요청) {
  const 들어온것 = Array.isArray(요청.items) ? 요청.items : [];
  if (!들어온것.length) return { ok: false, error: '갤러리를 모두 비울 수는 없습니다. 한 칸은 남겨 주세요.' };

  const 새목록 = [];
  들어온것.slice(0, 최대칸수).forEach(function (x) {
    const f = 글자(x && x.f, 200);
    // 홈페이지에 원래 있는 사진이거나, 우리가 올린 갤러리 사진만 받는다
    if (!f) return;
    if (f.indexOf('assets/') !== 0 && f.indexOf(갤러리경로 + '/') !== 0) return;
    새목록.push({ f: f, c: 글자(x && x.c, 160), n: 글자(x && x.n, 40) });
  });
  if (!새목록.length) return { ok: false, error: '쓸 수 있는 사진이 없습니다.' };

  const 지금 = 갤러리읽기();
  const 남는것 = {};
  새목록.forEach(function (x) { 남는것[x.f] = true; });

  const 결과 = 갤러리쓰기({ items: 새목록 }, '갤러리 갱신 (' + 새목록.length + '칸)');
  if (!결과.ok) return 결과;

  // 목록에서 빠진 「우리가 올린」 사진은 파일도 치운다 (assets 는 건드리지 않는다)
  지금.items.forEach(function (x) {
    const f = x && x.f;
    if (!f || 남는것[f]) return;
    if (f.indexOf(갤러리경로 + '/') !== 0) return;
    try { 깃허브에서지우기(f); } catch (err) { /* 무시 */ }
  });

  return { ok: true, items: 새목록 };
}
