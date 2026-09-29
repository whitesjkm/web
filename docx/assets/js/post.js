/* ==========================================================================
   半衰期 / halflife.log  —  文章页渲染
   --------------------------------------------------------------------------
   地址形如 post.html?p=rust-rss。内容全部来自 assets/js/posts.js。
   ========================================================================== */
(function () {
  'use strict';

  var D = window.HALFLIFE || { posts: [] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var CN = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function plain(s) { return String(s).replace(/[*`]/g, ''); }

  function ymd(d) { var p = d.split('-'); return { y: p[0], m: p[1], d: p[2] }; }

  function slugParam() {
    var m = location.search.match(/[?&]p=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function bySlug(slug) {
    for (var i = 0; i < D.posts.length; i++) if (D.posts[i].slug === slug) return D.posts[i];
    return null;
  }

  /* ---------------------------------------------------------- 正文渲染 */

  function renderBody(post) {
    var h2 = 0;
    var heads = [];
    var words = 0;

    var html = (post.body || []).map(function (b) {
      if (b.c) words += plain(b.c).length;
      if (b.items) words += b.items.join('').length;

      switch (b.t) {
        case 'h2':
          var id = 'sec-' + (++h2);
          heads.push({ id: id, text: plain(b.c) });
          return '<h2 id="' + id + '" data-no="' + (CN[h2 - 1] || h2) + '">' + inline(b.c) + '</h2>';
        case 'h3':
          return '<h3>' + inline(b.c) + '</h3>';
        case 'quote':
          return '<blockquote>' + inline(b.c) +
                 (b.by ? '<cite>' + inline(b.by) + '</cite>' : '') + '</blockquote>';
        case 'code':
          return '<figure class="code-block"><figcaption><span>' +
                 esc(b.lang || 'text') + '</span>' +
                 '<button class="copy-btn" type="button">复制</button></figcaption>' +
                 '<pre><code>' + esc(b.c) + '</code></pre></figure>';
        case 'list':
          return '<ul>' + (b.items || []).map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul>';
        case 'note':
          return '<div class="aside-note"><b>侧记</b>' + inline(b.c) + '</div>';
        case 'hr':
          return '<hr>';
        default:
          return '<p>' + inline(b.c) + '</p>';
      }
    }).join('');

    return { html: html, heads: heads, words: words };
  }

  /* ------------------------------------------------------------ 目录 */

  function buildToc(heads) {
    var box = $('[data-toc]');
    if (!box) return;
    if (!heads.length) { box.innerHTML = '<p class="muted" style="font-size:12px">（这篇没有小标题）</p>'; return; }

    box.innerHTML = '<h2>本页目录</h2><ol>' + heads.map(function (h) {
      return '<li><a href="#' + h.id + '">' + esc(h.text) + '</a></li>';
    }).join('') + '</ol>';

    var links = Array.prototype.slice.call(box.querySelectorAll('a'));
    var targets = heads.map(function (h) { return document.getElementById(h.id); });

    function sync() {
      var y = window.pageYOffset + 140;
      var idx = 0;
      targets.forEach(function (t, i) { if (t && t.offsetTop <= y) idx = i; });
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === idx); });
    }
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  /* ----------------------------------------------------- 上一篇 / 下一篇 */

  function buildNav(post) {
    var idx = D.posts.indexOf(post);
    var newer = D.posts[idx - 1];
    var older = D.posts[idx + 1];
    var box = $('[data-pn]');
    if (!box) return;

    var html = '';
    if (older) {
      html += '<a class="pn-card" href="post.html?p=' + older.slug + '"><small>← 更早一篇</small><strong>' +
              esc(older.title) + '</strong></a>';
    }
    if (newer) {
      html += '<a class="pn-card pn-card--next" href="post.html?p=' + newer.slug + '"><small>更新一篇 →</small><strong>' +
              esc(newer.title) + '</strong></a>';
    }
    box.innerHTML = html;

    var side = $('[data-more]');
    if (side) {
      var rest = D.posts.filter(function (p) { return p !== post; }).slice(0, 3);
      side.innerHTML = '<h2>顺手看看</h2>' + rest.map(function (p) {
        return '<a href="post.html?p=' + p.slug + '"><small>' + p.date + '</small>' + esc(p.title) + '</a>';
      }).join('');
    }
  }

  /* -------------------------------------------------------- 复制代码 */

  function initCopy() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.copy-btn');
      if (!b) return;
      var code = b.closest('.code-block').querySelector('code');
      var text = code.textContent;
      var done = function () {
        b.textContent = '已复制 ✓';
        setTimeout(function () { b.textContent = '复制'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta);
        done();
      }
    });
  }

  /* ------------------------------------------------------------ 进度条 */

  function initProgress() {
    var bar = $('.reading-bar');
    if (!bar) return;
    function sync() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      bar.style.width = (h > 0 ? Math.min(100, Math.max(0, (y / h) * 100)) : 0) + '%';
    }
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* -------------------------------------------------------------- 主流程 */

  function notFound(slug) {
    $('[data-article]').innerHTML =
      '<p class="kicker">404 / 没有这一篇</p>' +
      '<h1 style="margin-top:16px">这一页不存在，或者还没被写出来。</h1>' +
      '<p class="article-dek">你找的是 <code>' + esc(slug || '(空)') + '</code>。' +
      '也许它已经被我删掉了——这个站点的平均寿命比文章的寿命长得多。</p>' +
      '<p style="margin-top:32px"><a class="btn" href="archive.html">看全部文章</a></p>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var slug = slugParam();
    var post = bySlug(slug);
    var host = $('[data-article]');
    if (!host) return;

    if (!post) { notFound(slug); document.title = '没有这一篇 · 于松'; return; }

    var r = renderBody(post);
    var d = ymd(post.date);

    host.innerHTML =
      '<a class="back-link" href="archive.html">← 全部文章</a>' +
      '<h1>' + inline(post.title) + '</h1>' +
      '<p class="article-dek">' + inline(post.dek) + '</p>' +
      '<div class="article-meta">' +
        '<span>' + d.y + ' 年 ' + Number(d.m) + ' 月 ' + Number(d.d) + ' 日</span>' +
        '<span>' + post.tags.join(' / ') + '</span>' +
        '<span>约 ' + r.words + ' 字 · ' + Math.max(2, Math.round(r.words / 340)) + ' 分钟</span>' +
      '</div>';

    $('[data-prose]').innerHTML = r.html +
      '<div class="sign-off"><span>写于 ' + d.y + '.' + d.m + '.' + d.d +
      '，如果你读到了这里，谢谢你花掉的这几分钟。</span>' +
      '<span class="name">— ' + esc((D.site && D.site.author) || '') + '</span></div>';

    document.title = post.title + ' · 于松';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', plain(post.dek));

    buildToc(r.heads);
    buildNav(post);
    initCopy();
    initProgress();
  });
})();
