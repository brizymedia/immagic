"""공연 소식 — 유튜브 주소가 영상으로 재생되는지 검증.  (미리보기 8816 필요)"""
import json, sys
from playwright.sync_api import sync_playwright

B = "http://localhost:8816"
ok = fail = 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1; print(f"  OK   {name}")
    else:
        fail += 1; print(f"  FAIL {name} {extra}")


글 = {"updated": "", "posts": [
    {"id": "a", "d": "2026.11.24", "t": "영상 여러 종류", "p": [],
     "b": ("공연 영상입니다.\n"
           "https://www.youtube.com/watch?v=dQw4w9WgXcQ\n"
           "짧은 주소 https://youtu.be/9bZkp7q19f0?si=abc 도 됩니다.\n"
           "쇼츠: https://youtube.com/shorts/aqz-KE-bpKQ\n"
           "모바일 https://m.youtube.com/watch?feature=share&v=kJQP7kiw5Fk\n"
           "같은 영상 또 https://youtu.be/dQw4w9WgXcQ\n"
           "끝.")},
    {"id": "b", "d": "2026.11.23", "t": "영상 없는 글", "p": [], "b": "그냥 글입니다. https://blog.naver.com/imagicnation"},
    {"id": "c", "d": "2026.11.22", "t": "나쁜 주소", "p": [],
     "b": ('가짜 https://evil.com/watch?v=dQw4w9WgXcQ\n'
           'https://www.youtube.com/watch?v=abc"><script>alert(1)</script>\n'
           '<img src=x onerror=alert(2)>')},
]}

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    errs, 경고 = [], []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: (경고.append(d.message), d.dismiss()))
    pg.route("**/posts.json*", lambda r: r.fulfill(status=200, content_type="application/json",
                                                   body=json.dumps(글)))
    pg.route("**youtube-nocookie.com/**", lambda r: r.fulfill(status=200, body="<html></html>",
                                                              content_type="text/html"))
    pg.goto(B + "/news.html", wait_until="networkidle"); pg.wait_for_timeout(1500)

    print("\n[1] 여러 주소 형식")
    글1 = pg.locator("article.post").nth(0)
    srcs = 글1.locator("iframe").evaluate_all("els => els.map(e => e.src)")
    ids = [s.split("/embed/")[1].split("?")[0] for s in srcs]
    check("영상 4개 (중복 1개는 하나로)", len(ids) == 4, str(ids))
    check("watch?v= 주소", "dQw4w9WgXcQ" in ids)
    check("youtu.be 짧은 주소", "9bZkp7q19f0" in ids)
    check("쇼츠 주소", "aqz-KE-bpKQ" in ids)
    check("모바일·v= 가 뒤에 있는 주소", "kJQP7kiw5Fk" in ids)
    check("youtube-nocookie 로 재생", all("youtube-nocookie.com/embed/" in s for s in srcs))
    check("쇼츠만 세로 틀", 글1.locator(".post__yt.is-short").count() == 1)
    세로 = 글1.locator(".post__yt.is-short").evaluate("e => e.getBoundingClientRect().height > e.getBoundingClientRect().width")
    check("쇼츠 틀이 실제로 세로", 세로)
    가로 = 글1.locator(".post__yt:not(.is-short)").first.evaluate(
        "e => { const r = e.getBoundingClientRect(); return Math.abs(r.width / r.height - 16/9) < 0.05; }")
    check("일반 영상은 16:9", 가로)

    print("\n[2] 본문 글 정리")
    본문 = 글1.locator(".post__b").inner_text()
    check("본문에서 유튜브 주소는 빠짐", "youtu" not in 본문, 본문)
    check("나머지 글은 남음", "공연 영상입니다." in 본문 and "끝." in 본문, 본문)
    raw = 글1.locator(".post__b").evaluate("e => e.textContent")
    check("주소만 있던 줄은 빈 줄로 안 남음", "\n\n" not in raw, repr(raw))
    check("영상이 글에 나온 순서대로", ids[:3] == ["dQw4w9WgXcQ", "9bZkp7q19f0", "aqz-KE-bpKQ"], str(ids))

    print("\n[3] 영상 없는 글")
    글2 = pg.locator("article.post").nth(1)
    check("영상 틀 없음", 글2.locator(".post__vids").count() == 0)
    check("다른 주소는 글에 그대로", "blog.naver.com" in 글2.locator(".post__b").inner_text())

    print("\n[4] 안전")
    글3 = pg.locator("article.post").nth(2)
    check("가짜 도메인은 재생 안 됨", 글3.locator("iframe").count() == 0)
    check("스크립트 실행 안 됨", not 경고, str(경고))
    check("페이지 전체에 유튜브 외 iframe 없음",
          pg.evaluate("[...document.querySelectorAll('iframe')].every(f => f.src.startsWith('https://www.youtube-nocookie.com/embed/'))"))
    check("콘솔 에러 없음", not errs, str(errs[:2]))
    pg.close()

    print("\n[5] 모바일")
    pg = b.new_page(viewport={"width": 390, "height": 844}, color_scheme="dark")
    pg.route("**/posts.json*", lambda r: r.fulfill(status=200, content_type="application/json",
                                                   body=json.dumps(글)))
    pg.route("**youtube-nocookie.com/**", lambda r: r.fulfill(status=200, body="", content_type="text/html"))
    pg.goto(B + "/news.html", wait_until="networkidle"); pg.wait_for_timeout(1200)
    check("가로 넘침 없음", not pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"))
    pg.close()

    print("\n[6] 관리자 화면 — 찾은 영상 수 알려주기")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    pg.goto(B + "/news-admin.html", wait_until="networkidle"); pg.wait_for_timeout(600)
    pg.evaluate("document.getElementById('login').hidden=true;document.getElementById('panel').hidden=false;")
    pg.fill("#pb", "공연 https://youtu.be/9bZkp7q19f0 그리고 https://youtube.com/shorts/aqz-KE-bpKQ")
    pg.wait_for_timeout(300)
    check("2개 찾았다고 알려줌", "2개" in pg.inner_text("#pyt"), pg.inner_text("#pyt"))
    pg.fill("#pb", "영상 없음"); pg.wait_for_timeout(300)
    check("없으면 안내 문구로 돌아감", "붙여넣으면" in pg.inner_text("#pyt"))
    pg.close()
    b.close()

print(f"\n===== 통과 {ok} / 실패 {fail} =====")
sys.exit(1 if fail else 0)
