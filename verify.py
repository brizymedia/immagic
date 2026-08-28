"""아이엠매직 사이트 동작 검증."""
import sys, os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8816"
OUT = os.path.dirname(os.path.abspath(__file__))
PAGES = ["/index.html", "/about.html", "/programs.html", "/rental.html", "/contact.html"]

ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1; print(f"  OK   {name}")
    else:
        fail += 1; print(f"  FAIL {name} {extra}")

with sync_playwright() as p:
    b = p.chromium.launch()

    # ── 1) 각 페이지 로드 · 콘솔 에러 · 깨진 링크/이미지 ──────────────
    print("\n[1] 페이지 로드")
    for path in PAGES:
        pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
        errs, bad = [], []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("response", lambda r: bad.append(f"{r.status} {r.url}") if r.status >= 400 else None)
        pg.goto(BASE + path, wait_until="networkidle")
        pg.wait_for_timeout(1200)
        # lazy 이미지는 아직 안 받았을 뿐이므로, 실제로 실패한 것만 잡는다
        pg.evaluate("[...document.images].forEach(i=>i.loading='eager')")
        pg.wait_for_timeout(1800)
        broken = pg.evaluate("[...document.images].filter(i=>i.src&&i.complete&&i.naturalWidth===0).map(i=>i.src)")
        check(f"{path} 콘솔 에러 없음", not errs, str(errs[:2]))
        check(f"{path} 404 없음", not bad, str(bad[:3]))
        check(f"{path} 이미지 로드", not broken, str(broken[:3]))
        # 가로 스크롤 없음
        ow = pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        check(f"{path} 가로 스크롤 없음", not ow)
        pg.close()

    # ── 2) 내부 링크 유효성 ─────────────────────────────────────────
    print("\n[2] 내부 링크")
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    files = set(os.listdir(r"C:\클로드코드2\immagic"))
    for path in PAGES:
        pg.goto(BASE + path, wait_until="domcontentloaded")
        hrefs = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))")
        bad = []
        for h in set(hrefs):
            if h.startswith(("http", "tel:", "mailto:", "#")): continue
            f = h.split("#")[0]
            if f and f not in files: bad.append(h)
        check(f"{path} 내부 링크 대상 존재", not bad, str(bad))
    # 앵커 대상 존재 확인
    pg.goto(BASE + "/programs.html", wait_until="domcontentloaded")
    anchors = ["magic","nolja","dak","science","green","bubble","balloon","sand","fairy","sandfilm","laser"]
    missing = pg.evaluate("ids => ids.filter(i => !document.getElementById(i))", anchors)
    check("programs.html 앵커 전부 존재", not missing, str(missing))
    pg.goto(BASE + "/rental.html", wait_until="domcontentloaded")
    missing = pg.evaluate("ids => ids.filter(i => !document.getElementById(i))", ["av","bounce","play"])
    check("rental.html 앵커 전부 존재", not missing, str(missing))
    pg.close()

    # ── 3) 히어로 동작 ──────────────────────────────────────────────
    print("\n[3] 히어로")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    pg.goto(BASE + "/index.html", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    cv = pg.evaluate("()=>{const c=document.querySelector('.hero__dust');return {w:c.width,h:c.height}}")
    check("먼지 캔버스 크기 반영", cv["w"] > 1000 and cv["h"] > 500, str(cv))
    check("헤드라인 리빌 완료",
          pg.evaluate("getComputedStyle(document.querySelector('.rv > i')).opacity") == "1")
    check("첫 슬라이드 활성", pg.locator(".hero__slide.is-on").count() == 1)
    pg.locator(".hero__dots button").nth(2).click()
    pg.wait_for_timeout(600)
    check("슬라이드 수동 전환",
          pg.evaluate("[...document.querySelectorAll('.hero__slide')].findIndex(s=>s.classList.contains('is-on'))") == 2)
    check("스탯 카운트업 완료",
          pg.locator('.hero__stats [data-count]').first.inner_text().strip() == "4,000")
    pg.close()

    # ── 4) 라이트박스 ───────────────────────────────────────────────
    print("\n[4] 갤러리 라이트박스")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    pg.goto(BASE + "/index.html", wait_until="networkidle")
    pg.locator(".gal__it").first.scroll_into_view_if_needed()
    pg.wait_for_timeout(900)
    pg.locator(".gal__it").first.click()
    pg.wait_for_timeout(700)
    check("라이트박스 열림", pg.locator(".lbox.is-on").count() == 1)
    check("라이트박스 이미지 있음", pg.evaluate("!!document.querySelector('.lbox img').src"))
    src1 = pg.evaluate("document.querySelector('.lbox img').src")
    pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(500)
    check("다음 사진 이동", pg.evaluate("document.querySelector('.lbox img').src") != src1)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(600)
    check("ESC 로 닫힘", pg.locator(".lbox.is-on").count() == 0)
    check("스크롤 잠금 해제", not pg.evaluate("document.body.classList.contains('no-scroll')"))
    pg.close()

    # ── 5) 모바일 메뉴 ──────────────────────────────────────────────
    print("\n[5] 모바일 메뉴")
    pg = b.new_page(viewport={"width": 390, "height": 844}, color_scheme="dark")
    pg.goto(BASE + "/index.html", wait_until="networkidle")
    pg.wait_for_timeout(800)
    check("버거 보임", pg.locator(".burger").is_visible())
    pg.locator(".burger").click(); pg.wait_for_timeout(900)
    check("패널 열림", pg.locator(".mnav.is-open").count() == 1)
    check("aria-expanded=true", pg.get_attribute(".burger", "aria-expanded") == "true")
    check("본문 스크롤 잠금", pg.evaluate("document.body.classList.contains('no-scroll')"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(800)
    check("ESC 로 닫힘", pg.locator(".mnav.is-open").count() == 0)
    # 하단 독
    pg.evaluate("window.scrollTo(0, 1500)"); pg.wait_for_timeout(600)
    check("하단 고정 CTA 노출", pg.locator(".dock.is-up").count() == 1)
    pg.close()

    # ── 6) 문의 폼 ──────────────────────────────────────────────────
    print("\n[6] 문의 폼")
    pg = b.new_page(viewport={"width": 1440, "height": 900}, color_scheme="dark")
    pg.context.grant_permissions(["clipboard-read", "clipboard-write"])
    pg.goto(BASE + "/contact.html", wait_until="networkidle")
    pg.wait_for_timeout(900)
    pg.fill("#f-name", "홍길동")
    pg.fill("#f-phone", "010-1234-5678")
    pg.fill("#f-org", "춘천초등학교")
    pg.select_option("#f-program", label="놀자! 매직쇼 (코믹 마술)")
    pg.fill("#f-place", "본교 강당")
    pg.fill("#f-msg", "입학식 축하공연 문의드립니다.")
    pg.click("#formCopy"); pg.wait_for_timeout(700)
    txt = pg.evaluate("navigator.clipboard.readText()")
    check("복사 내용에 담당자", "홍길동" in txt, txt[:60])
    check("복사 내용에 프로그램", "놀자! 매직쇼" in txt)
    check("복사 내용에 요청사항", "입학식 축하공연" in txt)
    check("상태 메시지 표시", len(pg.inner_text("#formOut").strip()) > 0)
    # 필수값 검증
    pg.goto(BASE + "/contact.html", wait_until="networkidle")
    pg.wait_for_timeout(600)
    invalid = pg.evaluate("document.getElementById('inquiry').checkValidity()")
    check("빈 폼은 유효하지 않음", invalid is False)
    pg.close()

    b.close()

print(f"\n===== 통과 {ok} / 실패 {fail} =====")
sys.exit(1 if fail else 0)
