"""갤러리(무대의 기록) 읽어오기 + 관리자 편집 검증."""
import json, sys
from playwright.sync_api import sync_playwright

B = "http://localhost:8816"
# 관리자 화면에 박혀 있는 진짜 주소를 가로채 가짜 서버로 답한다
SRV = "https://script.google.com/macros/s/AKfycbxzA5w_RNbUXgf5CINGNfC1E13yMTcaBcC7Q-oC23PLtMkkI-tG-hBAXr67tgPvy4-ZwA/exec"
ok = fail = 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1; print(f"  OK   {name}")
    else:
        fail += 1; print(f"  FAIL {name} {extra}")


GAL = {"updated": "", "items": [
    {"f": "assets/img/magic-kids.jpg", "c": "새 설명 하나", "n": "새이름1"},
    {"f": "gallery/gabc-001.jpg", "c": "올린 사진", "n": "새이름2"},
    {"f": "assets/img/laser-hall.jpg", "c": "레이저", "n": "새이름3"},
]}

with sync_playwright() as p:
    b = p.chromium.launch()

    # ── 1) 첫 화면이 목록을 읽어 다시 그리나 ──────────────────
    print("\n[1] 첫 화면 갤러리 — 목록 읽어오기")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.route("**/gallery/gallery.json*", lambda r: r.fulfill(
        status=200, content_type="application/json", body=json.dumps(GAL)))
    pg.route("**/photos/gallery/*.jpg", lambda r: r.fulfill(
        status=302, headers={"Location": B + "/assets/img/card-bubble.jpg"}))
    pg.goto(B + "/index.html", wait_until="networkidle")
    pg.locator(".gal").scroll_into_view_if_needed(); pg.wait_for_timeout(2200)
    check("콘솔 에러 없음", not errs, str(errs[:2]))
    n = pg.locator(".gal__it").count()
    check("목록대로 3칸으로 바뀜", n == 3, f"{n}칸")
    check("이름 표시", pg.locator(".gal__it figcaption").first.inner_text().strip() == "새이름1")
    check("설명이 크게보기 설명으로", pg.get_attribute(".gal__it", "data-cap") == "새 설명 하나")
    check("덮개 걷힘(is-in)", pg.locator(".gal__it.is-in").count() == 3)
    # 라이트박스
    pg.locator(".gal__it").first.click(); pg.wait_for_timeout(700)
    check("라이트박스 열림", pg.locator(".lbox.is-on").count() == 1)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
    pg.close()

    # ── 2) 목록을 못 읽으면 박혀 있는 12칸이 남나 ────────────
    print("\n[2] 서버가 죽었을 때 (원래 12칸이 남아야 함)")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/gallery/gallery.json*", lambda r: r.abort())
    pg.goto(B + "/index.html", wait_until="networkidle")
    pg.locator(".gal").scroll_into_view_if_needed(); pg.wait_for_timeout(2000)
    check("페이지 에러 없음", not errs, str(errs[:2]))
    n = pg.locator(".gal__it").count()
    check("원래 12칸 그대로", n == 12, f"{n}칸")
    pg.close()

    # ── 3) 빈 목록이면 그대로 두나 ───────────────────────────
    print("\n[3] 목록이 비었을 때")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    pg.route("**/gallery/gallery.json*", lambda r: r.fulfill(
        status=200, content_type="application/json", body='{"items":[]}'))
    pg.goto(B + "/index.html", wait_until="networkidle")
    pg.locator(".gal").scroll_into_view_if_needed(); pg.wait_for_timeout(1800)
    check("원래 12칸 그대로", pg.locator(".gal__it").count() == 12)
    pg.close()

    # ── 4) 관리자 갤러리 탭 ──────────────────────────────────
    print("\n[4] 관리자 — 무대의 기록 탭")
    pg = b.new_page(viewport={"width": 1440, "height": 1000}, color_scheme="dark")
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

    보낸것 = []

    def 가짜서버(route):
        req = json.loads(route.request.post_data)
        보낸것.append(req)
        a = req.get("action")
        if a == "list":
            body = {"ok": True, "posts": []}
        elif a == "gal-list":
            body = {"ok": True, "items": GAL["items"]}
        elif a == "gal-photo":
            body = {"ok": True, "path": "gallery/gnew-001.jpg"}
        elif a == "gal-save":
            body = {"ok": True, "items": req["items"]}
        else:
            body = {"ok": False, "error": "모름"}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body))

    pg.route(SRV, 가짜서버)
    pg.route("**/photos/gallery/*.jpg", lambda r: r.fulfill(
        status=302, headers={"Location": B + "/assets/img/card-bubble.jpg"}))
    pg.goto(B + "/news-admin.html", wait_until="networkidle"); pg.wait_for_timeout(700)

    pg.fill("#pw", "테스트"); pg.click("#login button[type=submit]"); pg.wait_for_timeout(2000)
    check("로그인되어 관리 화면 열림", pg.locator("#panel").is_visible())
    check("탭 2개", pg.locator(".adm__tab").count() == 2)

    pg.click('.adm__tab[data-tab="gal"]'); pg.wait_for_timeout(1200)
    check("갤러리 탭 열림", pg.locator("#tab-gal").is_visible() and pg.locator("#tab-news").is_hidden())
    check("칸 3개 불러옴", pg.locator(".adm__gitem").count() == 3)
    check("1번째에 「크게 걸림」 표시", pg.locator(".adm__gitem").first.locator(".adm__big").count() == 1)
    check("첫 칸 ▲ 눌림 방지", pg.locator('[data-up="0"]').is_disabled())

    # 순서 바꾸기
    pg.click('[data-down="0"]'); pg.wait_for_timeout(400)
    첫이름 = pg.locator('input[data-n="0"]').input_value()
    check("▼ 로 순서 바뀜", 첫이름 == "새이름2", 첫이름)

    # 이름 고치기
    pg.fill('input[data-n="0"]', "바뀐이름"); pg.wait_for_timeout(300)

    # 사진 더하기
    pg.set_input_files("#gfile", r"C:\클로드코드2\immagic\assets\img\magic-kids.jpg")
    pg.wait_for_timeout(2500)
    check("사진 더해짐 (4칸)", pg.locator(".adm__gitem").count() == 4)
    올린것 = [x for x in 보낸것 if x.get("action") == "gal-photo"]
    check("사진을 서버로 보냄", len(올린것) == 1)
    check("보낸 사진이 base64", bool(올린것 and isinstance(올린것[0].get("image"), str)
                                  and len(올린것[0]["image"]) > 1000))

    # 빼기
    pg.on("dialog", lambda d: d.accept())
    pg.click('[data-rm="3"]'); pg.wait_for_timeout(500)
    check("빼기 동작 (3칸)", pg.locator(".adm__gitem").count() == 3)

    # 저장
    pg.click("#gsave"); pg.wait_for_timeout(1200)
    저장 = [x for x in 보낸것 if x.get("action") == "gal-save"]
    check("저장 요청 보냄", len(저장) == 1)
    보낸칸 = 저장[0]["items"] if 저장 else []
    check("바꾼 순서대로 보냄", bool(보낸칸) and 보낸칸[0]["f"] == "gallery/gabc-001.jpg", str(보낸칸[:1]))
    check("고친 이름이 담김", bool(보낸칸) and 보낸칸[0]["n"] == "바뀐이름")
    check("비밀번호가 함께 감", 저장[0].get("pw") == "테스트")
    check("저장 완료 알림", "저장했습니다" in pg.inner_text("#gmsg"))
    check("콘솔 에러 없음", not errs, str(errs[:2]))
    pg.close()

    # ── 5) 가로 넘침 ─────────────────────────────────────────
    print("\n[5] 가로 넘침 (관리자 갤러리 탭)")
    for w in [360, 390, 768, 1440]:
        pg = b.new_page(viewport={"width": w, "height": 900}, color_scheme="dark")
        pg.route(SRV, 가짜서버)
        pg.route("**/photos/gallery/*.jpg", lambda r: r.fulfill(
            status=302, headers={"Location": B + "/assets/img/card-bubble.jpg"}))
        pg.goto(B + "/news-admin.html", wait_until="networkidle"); pg.wait_for_timeout(600)
        pg.fill("#pw", "테스트"); pg.click("#login button[type=submit]"); pg.wait_for_timeout(2000)
        pg.click('.adm__tab[data-tab="gal"]'); pg.wait_for_timeout(1200)
        over = pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        check(f"{w}px 넘침 없음", not over)
        pg.close()

    b.close()

print(f"\n===== 통과 {ok} / 실패 {fail} =====")
sys.exit(1 if fail else 0)
