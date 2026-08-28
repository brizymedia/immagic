/* ==========================================================================
   I.M.MAGIC — 공통 스크립트
   외부 라이브러리 없음. 모든 기능은 요소가 있을 때만 동작한다.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------- 오프닝 커튼 */
  (function opening() {
    var el = document.getElementById('reveal');
    if (!el) return;

    var seen = false;
    try { seen = sessionStorage.getItem('immagic.opened') === '1'; } catch (e) {}

    if (seen || reduce) {
      el.classList.add('is-skip');
      return;
    }
    try { sessionStorage.setItem('immagic.opened', '1'); } catch (e) {}

    // 애니메이션이 끝나면 DOM 에서 치운다 (합성 레이어를 남기지 않는다)
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1900);
  })();

  /* --------------------------------------------------- 헤더: 고정 / 숨김 */
  (function header() {
    var hdr = $('.hdr');
    if (!hdr) return;
    var last = 0;

    function onScroll() {
      var y = window.scrollY;
      hdr.classList.toggle('is-stuck', y > 40);
      // 아래로 빠르게 스크롤하면 감춘다 (모바일 패널 열림 중에는 유지)
      if (!document.body.classList.contains('no-scroll')) {
        hdr.classList.toggle('is-hidden', y > 420 && y > last + 4);
      }
      last = y;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  /* --------------------------------------------------- 모바일 내비 */
  (function mobileNav() {
    var btn  = $('.burger');
    var pane = $('.mnav');
    if (!btn || !pane) return;

    function set(open) {
      btn.classList.toggle('is-open', open);
      pane.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('no-scroll', open);
    }
    btn.addEventListener('click', function () { set(!pane.classList.contains('is-open')); });
    $$('a', pane).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pane.classList.contains('is-open')) set(false);
    });
  })();

  /* --------------------------------------------------- 스크롤 등장 */
  (function reveal() {
    var els = $$('.rise, .unveil');
    if (!els.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    els.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------------- 히어로 슬라이드 */
  (function heroSlides() {
    var stage = $('.hero__stage');
    if (!stage) return;

    var slides = $$('.hero__slide', stage);
    var dots   = $$('.hero__dots button');
    if (slides.length < 2) return;

    var i = 0, timer = null;
    var HOLD = 6400;

    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.remove('is-on');
        if (k === i) {
          // 애니메이션 재시작을 위해 리플로우 강제
          void s.offsetWidth;
          s.classList.add('is-on');
        }
      });
      dots.forEach(function (d, k) {
        d.classList.remove('is-on');
        if (k === i) { void d.offsetWidth; d.classList.add('is-on'); }
        d.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
    }

    function play() { stop(); if (!reduce) timer = setInterval(function () { go(i + 1); }, HOLD); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach(function (d, k) {
      d.addEventListener('click', function () { go(k); play(); });
    });

    // 탭이 가려지면 멈춘다
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : play();
    });

    go(0);
    play();
  })();

  /* --------------------------------------------------- 히어로 먼지·불티 */
  (function heroDust() {
    var cv = $('.hero__dust');
    if (!cv || reduce) return;

    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, motes = [], sparks = [], raf = null;
    var pointer = { x: -999, y: -999, on: false };

    function size() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width  = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var n = Math.max(26, Math.min(78, Math.round(W * H / 22000)));
      motes = [];
      for (var k = 0; k < n; k++) motes.push(mote(true));
    }

    function mote(anywhere) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 12,
        r: 0.5 + Math.random() * 1.9,
        vy: -(0.09 + Math.random() * 0.42),
        vx: (Math.random() - 0.5) * 0.22,
        a: 0.06 + Math.random() * 0.42,
        tw: Math.random() * Math.PI * 2,
        ts: 0.008 + Math.random() * 0.026,
        warm: Math.random() < 0.42
      };
    }

    function spark(x, y) {
      var ang = Math.random() * Math.PI * 2;
      var sp  = 0.4 + Math.random() * 2.1;
      return {
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 0.5,
        life: 1,
        decay: 0.015 + Math.random() * 0.03,
        r: 0.7 + Math.random() * 1.7
      };
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);

      // 떠다니는 먼지
      for (var k = 0; k < motes.length; k++) {
        var m = motes[k];
        m.tw += m.ts;
        m.x += m.vx + Math.sin(m.tw) * 0.16;
        m.y += m.vy;

        // 포인터 근처에서는 살짝 밀려난다
        if (pointer.on) {
          var dx = m.x - pointer.x, dy = m.y - pointer.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 16000 && d2 > 1) {
            var f = (1 - d2 / 16000) * 0.9;
            var d = Math.sqrt(d2);
            m.x += (dx / d) * f; m.y += (dy / d) * f;
          }
        }
        if (m.y < -14 || m.x < -14 || m.x > W + 14) motes[k] = mote(false);

        var al = m.a * (0.55 + 0.45 * Math.sin(m.tw));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, 6.2832);
        ctx.fillStyle = m.warm
          ? 'rgba(255,179,92,' + al.toFixed(3) + ')'
          : 'rgba(255,244,234,' + (al * 0.68).toFixed(3) + ')';
        ctx.fill();
      }

      // 커서를 따라가는 불티
      for (var j = sparks.length - 1; j >= 0; j--) {
        var s = sparks[j];
        s.x += s.vx; s.y += s.vy;
        s.vy += 0.028;        // 중력
        s.vx *= 0.985;
        s.life -= s.decay;
        if (s.life <= 0) { sparks.splice(j, 1); continue; }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.life, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,' + Math.round(105 + 110 * s.life) + ',59,' + (s.life * 0.92).toFixed(3) + ')';
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    var hero = cv.closest('.hero');
    if (hero) {
      hero.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.on = true;
        if (sparks.length < 130 && Math.random() < 0.72) {
          sparks.push(spark(pointer.x, pointer.y));
          sparks.push(spark(pointer.x, pointer.y));
        }
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { pointer.on = false; pointer.x = pointer.y = -999; });
    }

    // 화면 밖이면 렌더 중단
    var vis = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(frame); }
      else if (raf) { cancelAnimationFrame(raf); raf = null; }
    }, { threshold: 0.02 });
    vis.observe(cv);

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 180); });
    size();
  })();

  /* --------------------------------------------------- 갤러리 라이트박스 */
  (function lightbox() {
    var items = $$('[data-lb]');
    if (!items.length) return;

    var box = document.createElement('div');
    box.className = 'lbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '사진 크게 보기');
    box.innerHTML =
      '<button class="lbox__x" type="button" aria-label="닫기">&#10005;</button>' +
      '<button class="lbox__nav lbox__nav--p" type="button" aria-label="이전">&#10094;</button>' +
      '<button class="lbox__nav lbox__nav--n" type="button" aria-label="다음">&#10095;</button>' +
      '<img alt="">' +
      '<p class="lbox__cap"></p>';
    document.body.appendChild(box);

    var img = $('img', box), cap = $('.lbox__cap', box), at = 0, opener = null;

    function open(n) {
      at = (n + items.length) % items.length;
      var src = items[at].getAttribute('data-lb');
      var txt = items[at].getAttribute('data-cap') || '';
      img.src = src;
      img.alt = txt || '아이엠매직 공연 사진';
      cap.textContent = txt;
      box.classList.add('is-on');
      document.body.classList.add('no-scroll');
    }
    function close() {
      box.classList.remove('is-on');
      document.body.classList.remove('no-scroll');
      if (opener) opener.focus();
    }

    items.forEach(function (el, k) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.addEventListener('click', function () { opener = el; open(k); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opener = el; open(k); }
      });
    });

    $('.lbox__x', box).addEventListener('click', close);
    $('.lbox__nav--p', box).addEventListener('click', function (e) { e.stopPropagation(); open(at - 1); });
    $('.lbox__nav--n', box).addEventListener('click', function (e) { e.stopPropagation(); open(at + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-on')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft')  open(at - 1);
      if (e.key === 'ArrowRight') open(at + 1);
    });
  })();

  /* --------------------------------------------------- 카테고리 필터 */
  (function filter() {
    var bar = $('[data-filter-bar]');
    if (!bar) return;
    var btns  = $$('button', bar);
    var items = $$('[data-cat]');

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-key');
        btns.forEach(function (x) { x.classList.toggle('chip--on', x === b); });
        items.forEach(function (it) {
          var hit = key === 'all' || it.getAttribute('data-cat') === key;
          it.style.display = hit ? '' : 'none';
        });
      });
    });
  })();

  /* --------------------------------------------------- 숫자 카운트업 */
  (function counters() {
    var els = $$('[data-count]');
    if (!els.length || reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        var raw = el.getAttribute('data-count');
        var end = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
        var pre = raw.replace(/[0-9,]/g, '');
        var t0 = performance.now(), dur = 1500;

        (function step(t) {
          var p = Math.min((t - t0) / dur, 1);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * e).toLocaleString('ko-KR') + pre;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = raw;
        })(t0);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------------- 하단 독 / 맨 위로 */
  (function dockAndTop() {
    var dock = $('.dock');
    var top  = $('.top');
    if (!dock && !top) return;

    function onScroll() {
      var y = window.scrollY;
      if (dock) dock.classList.toggle('is-up', y > 560);
      if (top)  top.classList.toggle('is-on', y > 900);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    if (top) top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  })();

  /* --------------------------------------------------- 문의 폼 */
  (function inquiry() {
    var form = $('#inquiry');
    if (!form) return;

    var out = $('#formOut');

    function val(name) {
      var el = form.elements[name];
      return el ? String(el.value || '').trim() : '';
    }

    function compose() {
      var L = [];
      L.push('■ 아이엠매직 행사 문의');
      L.push('');
      L.push('· 담당자 : ' + val('name'));
      L.push('· 연락처 : ' + val('phone'));
      if (val('email')) L.push('· 이메일 : ' + val('email'));
      if (val('org'))   L.push('· 기관/단체 : ' + val('org'));
      L.push('');
      L.push('· 희망 프로그램 : ' + val('program'));
      L.push('· 행사일 : ' + (val('date') || '미정'));
      L.push('· 장소 : ' + (val('place') || '미정'));
      L.push('· 예상 관객 : ' + (val('size') || '미정'));
      L.push('· 예산 : ' + (val('budget') || '미정'));
      L.push('');
      L.push('· 요청사항');
      L.push(val('message') || '(없음)');
      return L.join('\n');
    }

    function say(msg, ok) {
      if (!out) return;
      out.textContent = msg;
      out.style.color = ok ? 'var(--ember)' : '#ff8a8a';
    }

    // 메일로 보내기 (기본 제출)
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var subject = '[행사문의] ' + (val('org') || val('name')) + ' — ' + val('program');
      var href = 'mailto:imagicnation@naver.com'
               + '?subject=' + encodeURIComponent(subject)
               + '&body='    + encodeURIComponent(compose());
      window.location.href = href;
      say('메일 앱이 열립니다. 열리지 않으면 아래 “문의 내용 복사”를 눌러 카카오톡이나 문자로 보내주세요.', true);
    });

    // 클립보드로 복사
    var copy = $('#formCopy');
    if (copy) copy.addEventListener('click', function () {
      var text = compose();
      function done() { say('문의 내용을 복사했습니다. 010-6380-9901 로 문자나 카카오톡에 붙여넣어 주세요.', true); }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }

      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); }
        catch (err) { say('복사에 실패했습니다. 010-6380-9901 로 직접 연락 주세요.', false); }
        document.body.removeChild(ta);
      }
    });
  })();

  /* --------------------------------------------------- 현재 메뉴 표시 */
  (function currentNav() {
    var here = location.pathname.split('/').pop() || 'index.html';
    $$('.nav__link, .mnav__top').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (href.split('#')[0] === here) a.classList.add('is-on');
    });
  })();

})();
