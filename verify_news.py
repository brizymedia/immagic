"""공연 소식 + 관리자 화면 검증."""
import sys
from playwright.sync_api import sync_playwright

B = "http://localhost:8816"
ok = fail = 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1; print(f"  OK   {name}")
    else:
        fail += 1; print(f"  FAIL {name} {extra}")


FAKE = {
    "updated": "2026-11-17T00:00:00Z",
    "posts": [
        {"id": "p1", "d": "2026.11.17", "t": "춘천 ○○초등학교 찾아가는 매직쇼",
         "b": "첫째 줄\n둘째 줄", "p": ["posts/p1-001.jpg", "posts/p1-002.jpg"]},
        {"id": "p2", "d": "2026.11.10", "t": "사진 없는 글", "b": "", "p": []},
    ],
}

with sync_playwright() as p:
    b = p.chromium.launch()

    # ── 1) 메뉴·바닥글 연결 ───────────────────────────────────
    print("\n[1] 메뉴 · 바닥글 연결")
    for path in ["/index.html", "/about.html", "/programs.html", "/rental.html",
                 "/contact.html", "/news.html"]:
        pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
        pg.goto(B + path, wait_until="domcontentloaded"); pg.wait_for_timeout(500)
        nav = pg.evaluate("[...document.querySelectorAll('.nav__link')].map(a=>a.textContent.trim())")
        mn = pg.evaluate("[...document.querySelectorAll('.mnav__top')].map(a=>a.getAttribute('href'))")
        adm = pg.locator('.ftr__admin a[href="news-admin.html"]').count()
        check(f"{path} 메뉴에 공연 소식", any("공연 소식" in t for t in nav), str(nav))
        check(f"{path} 모바일 메뉴에 news.html", "news.html" in mn, str(mn))
        check(f"{path} 바닥글 관리자 링크", adm == 1)
        pg.close()

    # ── 2) 소식 페이지 — 글이 없을 때 ────────────────────────
    print("\n[2] 소식 페이지 (글 없음)")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.route("**/posts.json*", lambda r: r.fulfill(status=200, content_type="application/json",
                                                   body='{"updated":"","posts":[]}'))
    pg.goto(B + "/news.html", wait_until="networkidle"); pg.wait_for_timeout(1200)
    check("콘솔 에러 없음", not errs, str(errs[:2]))
    check("안내 문구 표시", pg.locator(".posts__empty").count() == 1)
    pg.close()

    # ── 3) 소식 페이지 — 글이 있을 때 ────────────────────────
    print("\n[3] 소식 페이지 (글 2개)")
    import json
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.route("**/posts.json*", lambda r: r.fulfill(status=200, content_type="application/json",
                                                   body=json.dumps(FAKE)))
    # 사진은 실제로 없으니 로컬 이미지로 바꿔 끼운다
    pg.route("**/brizymedia/immagic/photos/posts/*.jpg",
             lambda r: r.fulfill(status=302, headers={"Location": B + "/assets/img/magic-kids.jpg"}))
    pg.goto(B + "/news.html", wait_until="networkidle"); pg.wait_for_timeout(1500)
    check("콘솔 에러 없음", not errs, str(errs[:2]))
    check("글 2개 그려짐", pg.locator("article.post").count() == 2)
    check("제목 표시", "찾아가는 매직쇼" in pg.locator("article.post h2").first.inner_text())
    check("줄바꿈 유지(pre-wrap)",
          pg.evaluate("getComputedStyle(document.querySelector('.post__b')).whiteSpace") == "pre-wrap")
    check("사진 2장", pg.locator(".post__ph figure").count() == 2)
    check("사진 없는 글엔 사진칸 없음", pg.locator("article.post").nth(1).locator(".post__ph").count() == 0)
    # 라이트박스 (나중에 그려진 사진)
    pg.locator(".post__ph figure").first.click(); pg.wait_for_timeout(700)
    check("라이트박스 열림", pg.locator(".lbox.is-on").count() == 1)
    src1 = pg.evaluate("document.querySelector('.lbox img').src")
    pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(400)
    check("다음 사진 이동", pg.evaluate("document.querySelector('.lbox img').src") != src1)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    check("ESC 로 닫힘", pg.locator(".lbox.is-on").count() == 0)
    # 꺾쇠 주입 방어
    check("HTML 주입 막힘", pg.evaluate(
        "!document.querySelector('.posts script, .posts img[onerror]')"))
    pg.close()

    # ── 4) 갤러리 라이트박스 회귀 (index.html) ───────────────
    print("\n[4] 기존 갤러리 라이트박스 (회귀 확인)")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    pg.goto(B + "/index.html", wait_until="networkidle")
    pg.locator(".gal__it").first.scroll_into_view_if_needed(); pg.wait_for_timeout(900)
    pg.locator(".gal__it").first.click(); pg.wait_for_timeout(700)
    check("갤러리 라이트박스 열림", pg.locator(".lbox.is-on").count() == 1)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    check("닫힘 + 스크롤 잠금 해제",
          pg.locator(".lbox.is-on").count() == 0
          and not pg.evaluate("document.body.classList.contains('no-scroll')"))
    pg.close()

    # ── 5) 관리자 화면 ───────────────────────────────────────
    print("\n[5] 관리자 화면")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(B + "/news-admin.html", wait_until="networkidle"); pg.wait_for_timeout(900)
    check("콘솔 에러 없음", not errs, str(errs[:2]))
    check("검색엔진 차단(noindex)",
          "noindex" in (pg.get_attribute('meta[name=robots]', 'content') or ""))
    check("서버 주소가 이미 박혀 있음", pg.locator("#setup").is_hidden())
    check("비밀번호 화면이 바로 뜸", pg.locator("#login").is_visible())
    check("관리 화면은 아직 닫혀 있음", pg.locator("#panel").is_hidden())
    pg.on("dialog", lambda d: d.accept())

    # 로그인 뒤 화면을 직접 열어 둔다 (여기선 서버를 두드리지 않는다)
    pg.evaluate("document.getElementById('login').hidden = true;"
                "document.getElementById('panel').hidden = false;")
    pg.wait_for_timeout(300)
    check("글쓰기 화면 보임", pg.locator("#pf").is_visible())

    # 사진 줄이기 (긴 변 1600 으로)
    pg.set_input_files("#pfile", r"C:\클로드코드2\immagic\assets\img\hero-bubble.jpg")
    pg.wait_for_timeout(2500)
    thumbs = pg.locator(".adm__thumbs figure").count()
    check("사진 고르면 미리보기 생김", thumbs == 1, f"{thumbs}장")
    size = pg.evaluate("""() => {
      const im = document.querySelector('.adm__thumbs img');
      return im ? {w: im.naturalWidth, h: im.naturalHeight} : null;
    }""")
    check("긴 변 1600px 로 줄임", size and max(size["w"], size["h"]) == 1600, str(size))
    pg.locator(".adm__thumbs button").first.click(); pg.wait_for_timeout(300)
    check("사진 빼기 동작", pg.locator(".adm__thumbs figure").count() == 0)
    pg.close()

    # ── 6) 가로 넘침 ─────────────────────────────────────────
    print("\n[6] 가로 넘침")
    for w in [360, 390, 768, 1024, 1280, 1440, 1920]:
        pg = b.new_page(viewport={"width": w, "height": 900}, color_scheme="dark")
        bad = []
        for path in ["/news.html", "/news-admin.html", "/index.html"]:
            pg.goto(B + path, wait_until="domcontentloaded"); pg.wait_for_timeout(500)
            if pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"):
                bad.append(path)
        check(f"{w}px 넘침 없음", not bad, str(bad))
        pg.close()

    b.close()

print(f"\n===== 통과 {ok} / 실패 {fail} =====")
sys.exit(1 if fail else 0)
