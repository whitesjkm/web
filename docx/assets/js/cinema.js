/* ==========================================================================
   CINEMA LAYER — 电影级交互与动效引擎
   --------------------------------------------------------------------------
   纯手写，无框架、无 CDN、无外部依赖（与本站的建站原则一致）。
   [J1] 开关与存档    [J2] 胶片图层    [J3] 开场片头
   [J4] 入场揭示      [J5] 粒子衰变场  [J6] 光斑 / 卡片立体 / 光标
   [J7] 场记板        [J8] 转场幕布    [J9] Tweaks 面板    [J10] 启动
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse  = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var STORE   = 'cine-tweaks';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pow = function () { return S.intensity / 100; };

  /* --------------------------------------------------------- [J1] 开关存档 */

  var DEFAULTS = {
    intensity: 100,   // 动效强度
    grain: 5,         // 胶片颗粒
    vignette: 24,     // 暗角
    letterbox: false, // 电影黑边
    field: true,      // 粒子衰变场
    spot: true,       // 鼠标光斑
    cursor: false,    // 自定义光标
    slate: true,      // 场记板（时间码）
    wipe: true,       // 转场幕布
    darkroom: false   // 暗房模式
  };

  var S = {};
  try {
    S = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORE) || '{}'));
  } catch (e) { S = Object.assign({}, DEFAULTS); }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {}
  }

  /* --------------------------------------------------------- [J2] 胶片图层 */

  function buildLayers() {
    var frag = document.createDocumentFragment();

    var vig = document.createElement('div');
    vig.className = 'cine-vignette';
    vig.setAttribute('aria-hidden', 'true');

    var veil = document.createElement('div');
    veil.className = 'cine-veil';
    veil.setAttribute('aria-hidden', 'true');

    var grain = document.createElement('div');
    grain.className = 'cine-grain';
    grain.setAttribute('aria-hidden', 'true');

    var spot = document.createElement('div');
    spot.className = 'cine-spot';
    spot.setAttribute('aria-hidden', 'true');

    var bt = document.createElement('div');
    bt.className = 'cine-bar cine-bar--t';
    bt.setAttribute('aria-hidden', 'true');

    var bb = document.createElement('div');
    bb.className = 'cine-bar cine-bar--b';
    bb.setAttribute('aria-hidden', 'true');

    frag.appendChild(veil);
    frag.appendChild(vig);
    frag.appendChild(grain);
    frag.appendChild(spot);
    frag.appendChild(bt);
    frag.appendChild(bb);
    document.body.appendChild(frag);
  }

  function applyVars() {
    root.style.setProperty('--cine-power', (S.intensity / 100).toFixed(2));
    root.style.setProperty('--cine-grain', (S.grain / 1000).toFixed(3));
    root.style.setProperty('--cine-vig', (S.vignette / 100).toFixed(2));
    root.style.setProperty('--cine-bar', S.letterbox ? '22px' : '0px');
    body.classList.toggle('cine-spot-on', S.spot && !coarse);
    body.classList.toggle('cine-cursor-on', S.cursor && !coarse);
    body.classList.toggle('cine-slate-on', S.slate && !coarse);
    body.classList.toggle('cine-lb', !!S.letterbox);
    body.classList.toggle('cine-darkroom', S.darkroom);
  }

  /* --------------------------------------------------------- [J3] 开场片头 */

  var opened = false;

  function intro(done) {
    var played = false;
    try { played = sessionStorage.getItem('cine-played') === '1'; } catch (e) {}
    if (played || reduced || opened) { done(); return; }
    opened = true;

    var D = window.HALFLIFE || {};
    var site = D.site || {};
    var title = site.name || '半衰期';
    var latin = site.latin || 'halflife.log';
    var credit = '于松 · Java 后端开发 · 南宁师范大学　/　' + (site.since || 2025) + ' – 2026';

    var wrap = document.createElement('div');
    wrap.className = 'cine-open';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<div class="cine-gate cine-gate--t"></div>' +
      '<div class="cine-gate cine-gate--b"></div>' +
      '<div class="cine-open-inner">' +
        '<span class="cine-seal" aria-hidden="true">松</span>' +
        '<h2 class="cine-title">' +
          String(title).split('').map(function (c, i) {
            return '<span style="animation-delay:' + (0.42 + i * 0.14).toFixed(2) + 's">' + c + '</span>';
          }).join('') +
        '</h2>' +
        '<p class="cine-sub"></p>' +
        '<p class="cine-credit">' + credit + '</p>' +
      '</div>' +
      '<button class="cine-skip" type="button">跳过 skip →</button>' +
      '<div class="cine-progress"><i></i></div>';

    document.body.appendChild(wrap);
    root.style.overflow = 'hidden';

    var sub = $('.cine-sub', wrap);
    var bar = $('.cine-progress i', wrap);
    var timers = [];
    var finished = false;

    var TOTAL = 2900;

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
      try { sessionStorage.setItem('cine-played', '1'); } catch (e) {}
      wrap.classList.add('is-out', 'is-done');
      root.style.overflow = '';
      setTimeout(function () {
        wrap.remove();
        done();
      }, 780);
    }

    // 印章落下的同一时刻开始打字机
    timers.push(setTimeout(function () { wrap.classList.add('is-play'); }, 30));

    var text = latin;
    var i = 0;
    var typer = setInterval(function () {
      i++;
      sub.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(typer);
    }, 78);
    timers.push(typer);

    // 进度条：把片头的时长画出来，让人知道它不是卡住
    var t0 = Date.now();
    var tick = setInterval(function () {
      var p = Math.min(100, ((Date.now() - t0) / TOTAL) * 100);
      bar.style.width = p.toFixed(1) + '%';
      if (p >= 100) clearInterval(tick);
    }, 60);
    timers.push(tick);

    timers.push(setTimeout(finish, TOTAL));

    $('.cine-skip', wrap).addEventListener('click', finish);
    wrap.addEventListener('click', finish);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        finish();
        document.removeEventListener('keydown', esc);
      }
    });
  }

  /* --------------------------------------------------------- [J4] 入场揭示 */

  function markReveal() {
    var groups = [
      '.hero-main > *',
      '.now-card',
      '.sec-head',
      '.feature-grid > *',
      '.post-row',
      '.about-body > *',
      '.cv-entry',
      '.ai-panel',
      '.vibe-note',
      '.stamp-card',
      '.card-lite',
      '.rail-nav',
      '.fact-row',
      '.toolbar',
      '.year-block',
      '.article-head .wrap',
      '.prose > *',
      '.pn-card'
    ];

    groups.forEach(function (sel) {
      $$ (sel).forEach(function (el) {
        if (el.classList.contains('cine-r') || el.classList.contains('cine-focus')) return;
        var soft = /\.prose|\.post-row|\.about-body/.test(sel);
        el.classList.add('cine-r');
        if (soft) el.classList.add('cine-r--soft');
        var i = 0, p = el.previousElementSibling;
        while (p && i < 7) { i++; p = p.previousElementSibling; }
        el.style.setProperty('--i', String(Math.min(i, 7)));
      });
    });

    $$('.sec-title, .page-head h1, .article-head h1').forEach(function (el) {
      el.classList.add('cine-focus');
    });

    // 数字滚动
    $$('[data-count]').forEach(countUp);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        if (en.target.hasAttribute('data-count')) countUp(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

    $$('.cine-r, .cine-focus').forEach(function (el) { io.observe(el); });
  }

  function countUp(el) {
    if (el.dataset.cineCounted) return;
    el.dataset.cineCounted = '1';
    var to = parseInt(el.textContent, 10);
    if (isNaN(to) || reduced) return;
    var t0 = null, dur = 900;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ----------------------------------------------------- [J5] 粒子衰变场 */

  var field = null;

  function initField() {
    var hero = $('.hero');
    if (!hero || reduced || coarse) return;

    var cvs = document.createElement('canvas');
    cvs.className = 'cine-field';
    cvs.setAttribute('aria-hidden', 'true');
    hero.insertBefore(cvs, hero.firstChild);

    var ctx = cvs.getContext('2d');
    var w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var ps = [], raf = 0, last = 0, mouse = { x: -999, y: -999, on: false };

    function colors() {
      var cs = getComputedStyle(root);
      return {
        seal: (cs.getPropertyValue('--seal') || '#C0432A').trim(),
        ink:  (cs.getPropertyValue('--ink')  || '#1B1815').trim()
      };
    }
    var C = colors();

    function resize() {
      var r = hero.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      cvs.style.width = w + 'px';
      cvs.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var n = Math.max(28, Math.min(88, Math.round(w / 15)));
      ps = [];
      for (var i = 0; i < n; i++) ps.push(spawn(true));
    }

    function spawn(anywhere) {
      var half = 1800 + Math.random() * 2600;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 12,
        vx: (Math.random() - .5) * .16,
        vy: -.06 - Math.random() * .22,
        r: .8 + Math.random() * 2.2,
        age: anywhere ? Math.random() * half * 2 : 0,
        half: half,
        hot: Math.random() < .22
      };
    }

    function rgba(hex, a) {
      var m = hex.replace('#', '');
      if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
      var n = parseInt(m, 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!last) last = ts;
      var dt = Math.min(48, ts - last);
      last = ts;
      ctx.clearRect(0, 0, w, h);

      var power = pow();
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.age += dt;
        if (p.age > p.half * 4 || p.y < -30) { ps[i] = spawn(false); continue; }

        // 鼠标是一阵风：靠近的粒子被轻轻推开
        if (mouse.on) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 16000 && d2 > 1) {
            var f = (1 - d2 / 16000) * 0.55 * power;
            var d = Math.sqrt(d2);
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
        p.vy -= 0.00012 * dt;            // 极缓慢的上浮
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;

        // 半衰期：亮度按指数衰减，衰到看不见就重来一次
        var a = Math.pow(0.5, p.age / p.half) * (p.hot ? .5 : .22);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = rgba(p.hot ? C.seal : C.ink, Math.max(0, a));
        ctx.fill();
      }

      // 近邻之间拉一条几乎看不见的线，像胶片上的划痕网格
      ctx.lineWidth = 1;
      for (var a1 = 0; a1 < ps.length; a1++) {
        for (var b1 = a1 + 1; b1 < ps.length; b1++) {
          var q = ps[a1], s = ps[b1];
          var ddx = q.x - s.x, ddy = q.y - s.y;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist > 96) continue;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(s.x, s.y);
          ctx.strokeStyle = rgba(C.ink, .05 * (1 - dist / 96) * power);
          ctx.stroke();
        }
      }
    }

    function start() {
      if (raf || !S.field) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    }

    window.addEventListener('resize', resize);
    hero.addEventListener('mousemove', function (e) {
      var r = cvs.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.on = true;
    });
    hero.addEventListener('mouseleave', function () { mouse.on = false; });
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    resize();
    setTimeout(function () { cvs.classList.add('is-live'); }, 120);

    field = {
      start: start, stop: stop,
      resync: function () { C = colors(); }
    };
    if (S.field) start();
  }

  /* -------------------------------- [J6] 光斑 / 卡片立体 / 光标 */

  function initPointer() {
    var spot = $('.cine-spot');

    document.addEventListener('mousemove', function (e) {
      if (spot) {
        spot.style.setProperty('--cx', e.clientX + 'px');
        spot.style.setProperty('--cy', e.clientY + 'px');
      }
      if (cursorDot) {
        tx = e.clientX; ty = e.clientY;
      }
    }, { passive: true });

    /* 卡片立体 + 釉光 */
    var tiltSel = '.post-card, .pn-card, .card-lite, .now-card, .stamp-card';
    function bindTilt() {
      $$(tiltSel).forEach(function (el) {
        if (el.dataset.cineTilt) return;
        el.dataset.cineTilt = '1';
        el.classList.add('cine-tilt', 'cine-sheen');
        el.addEventListener('mousemove', function (e) {
          if (coarse || !S.intensity) return;
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          var k = pow();
          el.style.setProperty('--ry', ((px - .5) * 9 * k).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((.5 - py) * 6.5 * k).toFixed(2) + 'deg');
          el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          el.classList.add('is-live');
        });
        el.addEventListener('mouseleave', function () {
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
          el.classList.remove('is-live');
        });
      });
    }
    bindTilt();
    // 归档页切换标签、文章页翻页都会重绘列表，重绘后重新绑定
    var mo = new MutationObserver(bindTilt);
    $$('[data-archive], [data-featured], [data-recent], [data-pn]').forEach(function (n) {
      mo.observe(n, { childList: true });
    });

    /* 自定义光标 */
    var ring = document.createElement('div');
    ring.className = 'cine-cursor';
    var dot = document.createElement('div');
    dot.className = 'cine-cursor-dot';
    ring.setAttribute('aria-hidden', 'true');
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    var cursorDot = dot;

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var tx = mx, ty = my;
    (function loop() {
      requestAnimationFrame(loop);
      if (!S.cursor) return;
      mx += (tx - mx) * .18;
      my += (ty - my) * .18;
      ring.style.transform = 'translate3d(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px,0)';
      dot.style.transform  = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
    })();

    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest && e.target.closest('a, button, input, .chip, [data-term]');
      ring.classList.toggle('is-hot', !!hot);
    });
  }

  /* ----------------------------------------------------------- [J7] 场记板 */

  function initSlate() {
    var slate = document.createElement('div');
    slate.className = 'cine-slate';
    slate.setAttribute('aria-hidden', 'true');
    slate.innerHTML = '<span class="tc">00:00:00:00</span><span class="sc">SCENE 01 · 开场</span>';
    document.body.appendChild(slate);

    var tc = $('.tc', slate);
    var sc = $('.sc', slate);

    function pad(n, w) { return String(Math.floor(n)).padStart(w || 2, '0'); }

    function markers() {
      return $$('h1, .sec-title, .year-label').filter(function (el) {
        return el.offsetParent !== null;
      });
    }

    var raf = 0;
    function update() {
      raf = 0;
      var y = window.pageYOffset || root.scrollTop;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      var prog = Math.min(1, y / max);

      // 把整页阅读映射成一段 12 分钟、24fps 的胶片
      var frames = prog * 12 * 60 * 24;
      var ff = frames % 24;
      var totalSec = Math.floor(frames / 24);
      tc.textContent = pad(totalSec / 3600) + ':' + pad((totalSec % 3600) / 60) + ':' + pad(totalSec % 60) + ':' + pad(ff);

      var ms = markers();
      var cur = null, ci = 0;
      ms.forEach(function (el, i) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.45) { cur = el; ci = i; }
      });
      if (cur) {
        // 主标题只取第一行，别把副标题也拖进来
        var raw = cur.tagName === 'H1' && cur.firstChild
          ? cur.firstChild.textContent
          : cur.textContent;
        var label = String(raw || '')
          .replace(/\s*\/?\s*(featured|recent|about|say hi)\s*$/i, '')
          .replace(/[\s,，。.、；;:：·]+$/, '')
          .trim();
        sc.textContent = 'SCENE ' + pad(Math.max(1, ci + 1)) + ' · ' + (label || '正文').slice(0, 16);
      }
    }

    function onScroll() { if (!raf) raf = requestAnimationFrame(update); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* --------------------------------------------------------- [J8] 转场幕布 */

  function initWipe() {
    var wipe = document.createElement('div');
    wipe.className = 'cine-wipe';
    wipe.setAttribute('aria-hidden', 'true');
    wipe.innerHTML = '<span>halflife.log</span>';
    document.body.appendChild(wipe);

    var running = false;

    document.addEventListener('click', function (e) {
      if (!S.wipe || reduced) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;

      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return;
      if (/^(mailto:|tel:)/i.test(href)) return;                     // 交给系统
      if (/^https?:\/\//i.test(href) && href.indexOf(location.host) === -1) return;  // 外链交给浏览器
      if (!/\.html?($|\?)/i.test(href)) return;                      // 附件之类不拦截

      e.preventDefault();
      if (running) return;
      running = true;

      wipe.classList.remove('is-end');
      wipe.classList.add('is-run');
      var url = a.href;

      setTimeout(function () { location.href = url; }, 520);
      // 兜底：万一动画没跑完，也不要把人留在原地
      setTimeout(function () { if (running) location.href = url; }, 1100);
    });

    window.addEventListener('pageshow', function (e) {
      running = false;
      wipe.classList.remove('is-run');
      if (e.persisted) {
        wipe.classList.add('is-end');
        setTimeout(function () { wipe.classList.remove('is-end'); }, 600);
      }
    });
  }

  /* -------------------------------------------------------- [J9] Tweaks 面板 */

  function initTweaks() {
    var btn = document.createElement('button');
    btn.className = 'cine-tweak-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', '打开画面调节面板');
    btn.title = '画面调节 / Tweaks';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" stroke-linecap="round"/>' +
      '<circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>';

    var panel = document.createElement('div');
    panel.className = 'cine-panel';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', '画面调节');
    panel.innerHTML =
      '<h5>Tweaks</h5>' +
      '<p class="hint">这一页的画面参数，可调到你喜欢的那一档。</p>' +

      '<div class="cine-row"><label>动效强度 <b data-v="intensity"></b></label>' +
      '<input type="range" min="0" max="140" step="5" data-k="intensity"></div>' +

      '<div class="cine-row"><label>胶片颗粒 <b data-v="grain"></b></label>' +
      '<input type="range" min="0" max="60" step="1" data-k="grain"></div>' +

      '<div class="cine-row"><label>暗角 <b data-v="vignette"></b></label>' +
      '<input type="range" min="0" max="80" step="2" data-k="vignette"></div>' +

      '<div class="cine-switches">' +
        sw('letterbox', '电影黑边') + sw('field', '衰变粒子') +
        sw('spot', '鼠标光斑') + sw('cursor', '自定义光标') +
        sw('slate', '场记板') + sw('wipe', '转场幕布') +
        sw('darkroom', '暗房模式') +
      '</div>' +

      '<div class="cine-acts">' +
        '<button class="act" type="button" data-act="replay">重播片头</button>' +
        '<button class="act" type="button" data-act="reset">恢复默认</button>' +
      '</div>';

    function sw(k, label) {
      return '<button class="cine-sw' + (S[k] ? ' is-on' : '') + '" type="button" data-sw="' + k + '" ' +
             'aria-pressed="' + !!S[k] + '">' + label + '</button>';
    }

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function sync() {
      $$('input[data-k]', panel).forEach(function (inp) {
        var k = inp.getAttribute('data-k');
        inp.value = S[k];
        var out = $('[data-v="' + k + '"]', panel);
        if (out) out.textContent = k === 'intensity' ? S[k] + '%' : S[k];
      });
      $$('[data-sw]', panel).forEach(function (b) {
        var k = b.getAttribute('data-sw');
        b.classList.toggle('is-on', !!S[k]);
        b.setAttribute('aria-pressed', String(!!S[k]));
      });
      applyVars();
    }

    panel.addEventListener('input', function (e) {
      var inp = e.target.closest('input[data-k]');
      if (!inp) return;
      S[inp.getAttribute('data-k')] = parseInt(inp.value, 10);
      save();
      sync();
    });

    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sw]');
      if (b) {
        var k = b.getAttribute('data-sw');
        S[k] = !S[k];
        save();
        sync();
        if (k === 'field' && field) { S[k] ? field.start() : field.stop(); }
        if (k === 'field' && !field && S[k]) { initField(); }
        return;
      }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.getAttribute('data-act') === 'reset') {
        S = Object.assign({}, DEFAULTS);
        save(); sync();
      }
      if (act.getAttribute('data-act') === 'replay') {
        try { sessionStorage.removeItem('cine-played'); } catch (err) {}
        opened = false;
        intro(function () {});
      }
    });

    btn.addEventListener('click', function () {
      panel.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(panel.classList.contains('is-open')));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        panel.classList.remove('is-open');
      }
    });

    document.addEventListener('click', function (e) {
      if (!panel.classList.contains('is-open')) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      panel.classList.remove('is-open');
    });

    sync();
  }

  /* ----------------------------------- 主题切换时的一次「曝光」反馈 */

  function themeFlash() {
    $$('.js-theme').forEach(function (b) {
      b.addEventListener('click', function () {
        if (reduced || !window.Element.prototype.animate) return;
        var f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;z-index:189;pointer-events:none;background:' +
          (root.getAttribute('data-theme') === 'dark' ? '#F5F0E6' : '#0B0A09') + ';opacity:0';
        document.body.appendChild(f);
        f.animate([{ opacity: 0 }, { opacity: .3, offset: .35 }, { opacity: 0 }],
          { duration: 460, easing: 'cubic-bezier(.4,0,.2,1)' });
        setTimeout(function () { f.remove(); }, 520);
        if (field) setTimeout(field.resync, 60);
      });
    });
  }

  /* ------------------------------------------------------------ [J10] 启动 */

  function boot() {
    body.classList.add('cine-on');
    buildLayers();
    applyVars();

    if (!reduced) {
      initWipe();
    }
    initPointer();
    initSlate();
    initTweaks();
    themeFlash();
    initField();
    markReveal();
  }

  document.addEventListener('DOMContentLoaded', function () {
    // 等 site.js / post.js 把列表渲染完，再给内容排入场顺序
    setTimeout(function () {
      if (reduced) { boot(); return; }
      intro(boot);
    }, 40);
  });
})();
