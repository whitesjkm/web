/* ==========================================================================
   半衰期 / halflife.log  —  站点脚本
   --------------------------------------------------------------------------
   [01] 小工具      [02] 主题      [03] 页面骨架（页眉滚动 / 回到顶部）
   [04] 渲染卡片    [05] 首页      [06] 归档页
   [07] 终端彩蛋    [08] 启动
   ========================================================================== */
(function () {
  'use strict';

  var D = window.HALFLIFE || { site: {}, posts: [], now: [] };
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------- [01] 工具 */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 极简行内标记：**加粗**、`代码`、*强调* */
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function plain(s) {
    return String(s).replace(/[*`]/g, '');
  }

  function readingTime(p) {
    var n = (p.body || []).reduce(function (a, b) {
      return a + plain(b.c || '').length + (b.items ? b.items.join('').length : 0);
    }, 0);
    return Math.max(2, Math.round(n / 340));
  }

  function ymd(date) {
    var p = date.split('-');
    return { y: p[0], m: p[1], d: p[2] };
  }

  function dateText(date) {
    var p = ymd(date);
    return p.y + ' 年 ' + Number(p.m) + ' 月 ' + Number(p.d) + ' 日';
  }

  function bySlug(slug) {
    for (var i = 0; i < D.posts.length; i++) if (D.posts[i].slug === slug) return D.posts[i];
    return null;
  }

  function cover(p, cls) {
    return '<div class="cover ' + (cls || '') + '" data-pattern="' + p.cover.pattern +
           '" data-hue="' + p.cover.hue + '" aria-hidden="true">' +
           '<span class="cover-no">' + esc(p.slug) + '</span></div>';
  }

  function allTags() {
    var seen = {}, out = [];
    D.posts.forEach(function (p) {
      (p.tags || []).forEach(function (t) { if (!seen[t]) { seen[t] = 1; out.push(t); } });
    });
    return out;
  }

  /* ------------------------------------------------------------ [02] 主题 */

  function readTheme() {
    var q = location.search.match(/[?&]theme=(dark|light)/);
    if (q) return q[1];
    try {
      var t = localStorage.getItem('hl-theme');
      if (t) return t;
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('hl-theme', t); } catch (e) {}
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#141210' : '#F5F0E6');
    $$('.js-theme').forEach(function (b) {
      b.setAttribute('aria-label', t === 'dark' ? '切换到浅色' : '切换到深色');
    });
  }

  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  /* --------------------------------------------------- [03] 页面骨架 */

  function initChrome() {
    applyTheme(readTheme());

    var head = $('.site-head');
    var line = $('.scroll-line');
    var top  = $('.to-top');

    function onScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (head) head.classList.toggle('is-stuck', y > 12);
      if (top) top.classList.toggle('is-on', y > 700);
      if (line) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        line.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    if (top) top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* -------------------------------------------------------- [04] 渲染卡片 */

  function card(p, kind) {
    var meta = '<div class="card-meta"><span>' + ymd(p.date).y + '.' + ymd(p.date).m + '.' + ymd(p.date).d +
               '</span><span>·</span><span>' + readingTime(p) + ' 分钟</span>' +
               (kind === 'lead' ? '<span class="tag">' + esc(p.tags[0]) + '</span>' : '') + '</div>';

    return '<a class="post-card post-card--' + (kind || 'mini') + '" href="post.html?p=' + p.slug + '">' +
             cover(p) +
             '<div class="card-body">' + meta +
               '<h3 class="card-title">' + inline(p.title) + '</h3>' +
               '<p class="card-dek">' + inline(p.dek) + '</p>' +
               '<span class="card-foot">读这篇 <span class="arrow">→</span></span>' +
             '</div>' +
           '</a>';
  }

  /* ------------------------------------------------------------ [05] 首页 */

  function renderHome() {
    var leadEl = $('[data-featured]');
    if (!leadEl) return;

    var leads = D.posts.filter(function (p) { return p.pin === 'lead'; });
    var minis = D.posts.filter(function (p) { return p.pin === 'mini'; });
    var lead  = leads[0] || D.posts[0];

    leadEl.innerHTML =
      '<div>' + card(lead, 'lead') + '</div>' +
      '<div class="feature-side">' + minis.slice(0, 2).map(function (p) { return card(p, 'mini'); }).join('') + '</div>';

    /* 最近更新：取没有被精选的那几篇 */
    var recentEl = $('[data-recent]');
    if (recentEl) {
      var used = [lead.slug].concat(minis.slice(0, 2).map(function (p) { return p.slug; }));
      var rest = D.posts.filter(function (p) { return used.indexOf(p.slug) === -1; }).slice(0, 4);
      recentEl.innerHTML = rest.map(function (p) { return row(p); }).join('');
    }

    var countEl = $('[data-count]');
    if (countEl) countEl.textContent = D.posts.length;
  }

  function row(p) {
    var d = ymd(p.date);
    return '<li><a class="post-row" href="post.html?p=' + p.slug + '">' +
             '<time datetime="' + p.date + '">' + d.m + '/' + d.d + '</time>' +
             '<span><span class="row-title">' + inline(p.title) + '</span>' +
             '<span class="row-dek">' + inline(p.dek) + '</span></span>' +
             '<span class="row-tags">' + esc(p.tags.join(' · ')) + '</span>' +
           '</a></li>';
  }

  /* ---------------------------------------------------------- [06] 归档页 */

  function renderArchive() {
    var host = $('[data-archive]');
    if (!host) return;

    var chipBox = $('[data-chips]');
    var input   = $('[data-search]');
    var state   = { tag: '*', q: '' };

    var chips = [{ k: '*', label: '全部' }].concat(allTags().map(function (t) { return { k: t, label: t }; }));
    chipBox.innerHTML = chips.map(function (c, i) {
      return '<button class="chip' + (i === 0 ? ' is-on' : '') + '" data-tag="' + esc(c.k) + '" ' +
             'aria-pressed="' + (i === 0) + '">' + esc(c.label) + '</button>';
    }).join('');

    function matches(p) {
      var okTag = state.tag === '*' || (p.tags || []).indexOf(state.tag) > -1;
      var hay = (p.title + ' ' + p.dek + ' ' + (p.tags || []).join(' ')).toLowerCase();
      return okTag && hay.indexOf(state.q) > -1;
    }

    function draw() {
      var list = D.posts.filter(matches);
      if (!list.length) {
        host.innerHTML = '<p class="empty-state">没有找到符合条件的文章 —— 试着换个词，或者把它写出来。</p>';
        return;
      }
      var years = [];
      list.forEach(function (p) {
        var y = ymd(p.date).y;
        if (years.indexOf(y) === -1) years.push(y);
      });
      host.innerHTML = years.map(function (y) {
        var items = list.filter(function (p) { return ymd(p.date).y === y; });
        return '<section class="year-block">' +
                 '<h2 class="year-label">' + y + '<small>' + items.length + ' POSTS</small></h2>' +
                 '<ul class="post-list">' + items.map(row).join('') + '</ul>' +
               '</section>';
      }).join('');
    }

    chipBox.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      state.tag = b.getAttribute('data-tag');
      $$('.chip', chipBox).forEach(function (c) {
        var on = c === b;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      draw();
    });

    if (input) {
      input.addEventListener('input', function () {
        state.q = input.value.trim().toLowerCase();
        draw();
      });
      if (/[?&]q=/.test(location.search)) {
        var q = decodeURIComponent((location.search.match(/[?&]q=([^&]*)/) || [])[1] || '');
        input.value = q;
        state.q = q.toLowerCase();
      }
    }

    draw();
  }

  /* -------------------------------------------------------- [07] 终端彩蛋 */

  function initTerm() {
    var root = $('.term');
    if (!root) return;

    var body = $('.term-body', root);
    var input = $('.term-input-row input', root);
    var hist = [], hi = -1;

    function out(html) {
      var d = document.createElement('div');
      d.innerHTML = html;
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
    }

    function line(cmd, res) {
      out('<span class="dim">yusong@halflife</span> <span class="hot">~</span> $ ' + esc(cmd) +
          (res ? '<br>' + res : ''));
    }

    var MSG = {
      help:
        '可用命令：<br>' +
        '  <span class="ok">ls</span>              列出全部文章<br>' +
        '  <span class="ok">cat &lt;序号|slug&gt;</span>   看摘要<br>' +
        '  <span class="ok">open &lt;序号|slug&gt;</span>  打开文章<br>' +
        '  <span class="ok">whoami</span>          我是谁<br>' +
        '  <span class="ok">now</span>             此刻在做什么<br>' +
        '  <span class="ok">tags</span>            标签统计<br>' +
        '  <span class="ok">theme [dark|light]</span> 换主题<br>' +
        '  <span class="ok">date</span> / <span class="ok">clear</span> / <span class="ok">exit</span><br>' +
        '<span class="dim">小提示：按 ↑ ↓ 翻历史，Esc 关闭。</span>',
      whoami:
        '于松 — ' + D.site.tagline + '<br>' +
        '<span class="dim">南宁师范大学 · 软件工程本科在读（2027 届）<br>' +
        '求职方向：Java 后端开发　联系方式：17615124530@163.com<br>' +
        '这个站点是用 Vibe Coding 的方式，和 AI 结对写出来的。</span>',
      date: new Date().toString(),
      now: D.now.map(function (n) { return '  ' + n[0] + '  ' + n[1]; }).join('<br>')
    };

    function ls() {
      return D.posts.map(function (p, i) {
        var n = String(i + 1).padStart(2, '0');
        return '  <span class="dim">' + n + '</span>  ' + esc(p.date) + '  ' +
               '<span class="ok">' + esc(p.slug) + '</span>  ' + esc(p.title.slice(0, 22));
      }).join('<br>');
    }

    function resolve(key) {
      var n = parseInt(key, 10);
      if (!isNaN(n) && n >= 1 && n <= D.posts.length) return D.posts[n - 1];
      return bySlug(key);
    }

    function run(raw) {
      var cmd = raw.trim();
      if (!cmd) return;
      line(cmd);
      var parts = cmd.split(/\s+/);
      var c = parts[0].toLowerCase();
      var arg = parts[1];

      if (c === 'help' || c === '?') return out(MSG.help);
      if (c === 'ls' || c === 'posts') return out(ls());
      if (c === 'whoami') return out(MSG.whoami);
      if (c === 'now') return out(MSG.now);
      if (c === 'date') return out(MSG.date);
      if (c === 'clear') { body.innerHTML = ''; return; }
      if (c === 'exit' || c === 'q') return close();

      if (c === 'tags') {
        var count = {};
        D.posts.forEach(function (p) { (p.tags || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; }); });
        return out(Object.keys(count).sort(function (a, b) { return count[b] - count[a]; })
          .map(function (t) { return '  <span class="ok">' + esc(t) + '</span> × ' + count[t]; }).join('<br>'));
      }

      if (c === 'cat' || c === 'open') {
        var p = resolve(arg || '');
        if (!p) return out('<span class="hot">没有这篇文章。</span> 用 ls 看看有哪些。');
        if (c === 'cat') {
          return out('<span class="ok">' + esc(p.title) + '</span><br>' + esc(p.dek) +
                     '<br><span class="dim">' + p.date + ' · ' + readingTime(p) + ' 分钟 · ' + esc(p.tags.join('/')) + '</span>');
        }
        out('<span class="dim">正在打开 ' + esc(p.slug) + ' …</span>');
        return setTimeout(function () { location.href = 'post.html?p=' + p.slug; }, 420);
      }

      if (c === 'theme') {
        var t = (arg || '').toLowerCase();
        if (t !== 'dark' && t !== 'light') return out('用法：theme dark 或 theme light');
        applyTheme(t);
        return out('已切换到 <span class="ok">' + t + '</span> 模式。');
      }

      if (c === 'sudo') return out('<span class="dim">于松 不在 sudoers 文件中。此事将被记录，但没人在看。</span>');
      if (c === 'rm') return out('<span class="hot">rm: 拒绝执行 —— 这是个只读的容器，和大多数记忆一样。</span>');
      if (c === 'hello' || c === 'hi') return out('你好。要不要看 <span class="ok">ls</span>？');

      out('命令未找到：<span class="hot">' + esc(c) + '</span>，输入 <span class="ok">help</span> 看看有什么。');
    }

    function open() {
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      if (!body.childNodes.length) {
        out('<span class="dim">halflife.log — 一个只读的容器。输入 <span class="ok">help</span> 开始。</span>');
      }
      setTimeout(function () { input.focus(); }, 40);
    }

    function close() {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      input.blur();
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var v = input.value;
        input.value = '';
        if (v.trim()) { hist.push(v); hi = hist.length; }
        run(v);
      } else if (e.key === 'ArrowUp') {
        if (hi > 0) { hi--; input.value = hist[hi]; }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (hi < hist.length - 1) { hi++; input.value = hist[hi]; }
        else { hi = hist.length; input.value = ''; }
        e.preventDefault();
      } else if (e.key === 'Escape') {
        close();
      }
    });

    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    $$('[data-term]').forEach(function (b) { b.addEventListener('click', open); });

    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (e.key === 'Escape' && root.classList.contains('is-open')) return close();
      if (e.key === '`' && !typing) { e.preventDefault(); open(); }
      if (e.key === 't' && !typing && !root.classList.contains('is-open')) toggleTheme();
    });
  }

  /* ------------------------------------------------------------ [08] 启动 */

  document.addEventListener('DOMContentLoaded', function () {
    initChrome();
    renderHome();
    renderArchive();
    initTerm();
    $$('.js-theme').forEach(function (b) { b.addEventListener('click', toggleTheme); });
  });
})();
