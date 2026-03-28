/**
 * SUPER.TENNIS — Dynamic Content Loader
 *
 * Fetches news and videos from Worker API (no site rebuild needed).
 * Detects containers by [data-dynamic] attributes and renders content.
 */
(function () {
  'use strict';

  const API = 'https://supertennis-cron.sfedoroff.workers.dev';

  // ── Cache for API responses ──
  let _newsCache = null;
  let _videosCache = null;

  async function fetchNews() {
    if (_newsCache) return _newsCache;
    try {
      const res = await fetch(API + '/api/news');
      if (!res.ok) throw new Error(res.status);
      _newsCache = await res.json();
      return _newsCache;
    } catch (e) {
      console.warn('dynamic-content: news fetch failed', e);
      return [];
    }
  }

  async function fetchVideos() {
    if (_videosCache) return _videosCache;
    try {
      const res = await fetch(API + '/api/videos');
      if (!res.ok) throw new Error(res.status);
      _videosCache = await res.json();
      return _videosCache;
    } catch (e) {
      console.warn('dynamic-content: videos fetch failed', e);
      return [];
    }
  }

  // ── Time Ago ──
  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Escape HTML ──
  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Category config ──
  var catColors = { buzz: '#16a34a', scandal: '#dc2626', love: '#e11d7e', money: '#d4a017', fashion: '#9333ea', viral: '#f97316', business: '#d4a017', funny: '#f97316', wellness: '#0891b2' };
  var catLabels = { buzz: 'Buzz', scandal: 'Scandal', love: 'Love', money: 'Money', fashion: 'Fashion', viral: 'Viral', business: 'Money', funny: 'Viral', wellness: 'Wellness' };

  // ── Render: buzz card (homepage) ──
  function renderBuzzCard(item) {
    var href = item.body ? '/news/#' + item.slug : (item.source_url || '#');
    var target = item.body ? '' : ' target="_blank" rel="noopener"';
    var color = catColors[item.category] || '#16a34a';
    var label = catLabels[item.category] || 'Buzz';
    var img = item.image_url || '/images/news/court-01.jpg';

    return '<a href="' + esc(href) + '"' + target + ' class="buzz-card">' +
      '<div class="buzz-card__image">' +
        '<img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.src=\'/images/news/court-01.jpg\'" />' +
        '<span class="buzz-badge" style="background:' + color + '">' + label + '</span>' +
      '</div>' +
      '<div class="buzz-card__body">' +
        '<h3 class="buzz-card__title">' + esc(item.title) + '</h3>' +
        '<p class="buzz-card__summary">' + esc(item.summary) + '</p>' +
        '<div class="buzz-card__footer">' +
          '<span class="buzz-card__source">Read more &rarr;</span>' +
          '<span class="buzz-card__time">' + timeAgo(item.published_at) + '</span>' +
        '</div>' +
      '</div>' +
    '</a>';
  }

  // ── Render: video thumb ──
  var playSvg = '<svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7c-.8-2.9-2.5-5.4-5.4-6.2C55.8.1 34 0 34 0S12.2.1 6.9 1.6c-2.9.7-4.6 3.2-5.4 6.1C.1 13 0 24 0 24s.1 11 1.5 16.3c.8 2.9 2.5 5.4 5.4 6.2C12.2 47.9 34 48 34 48s21.8-.1 27.1-1.6c2.9-.7 4.6-3.2 5.4-6.1C67.9 35 68 24 68 24s-.1-11-1.5-16.3z" fill="#f00"/><path d="M45 24 27 14v20" fill="#fff"/></svg>';

  function renderVideoThumb(v) {
    return '<div class="video-thumb">' +
      '<div class="lite-yt" data-video-id="' + esc(v.video_id) + '">' +
        '<img src="https://i.ytimg.com/vi/' + esc(v.video_id) + '/hqdefault.jpg" alt="' + esc(v.title) + '" loading="lazy" onerror="this.src=\'/images/news/court-01.jpg\'" />' +
        '<button class="lite-yt__play" aria-label="Play: ' + esc(v.title) + '">' + playSvg + '</button>' +
        '<span class="lite-yt__title">' + esc(v.title) + '</span>' +
      '</div>' +
      '<div class="video-thumb__meta">' +
        '<span class="video-thumb__cat" style="color:' + (v.accentColor || '#2563eb') + '">' + esc(v.label || v.category) + '</span>' +
        '<span class="video-thumb__channel">' + esc(v.channel_name) + '</span>' +
      '</div>' +
    '</div>';
  }

  // ── Render: news page full item (details/accordion) ──
  function renderNewsFullItem(item) {
    var href = item.source_url || '#';
    var img = item.image_url || '/images/news/court-01.jpg';
    var color = catColors[item.category] || '#16a34a';
    var label = catLabels[item.category] || 'Buzz';
    var date = item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

    var bodyHtml = '';
    if (item.body) {
      // Strip any HTML tags from AI-generated body first (XSS prevention)
      var cleanBody = item.body.replace(/<[^>]*>/g, '');
      // Simple markdown-ish rendering: ## headers, **bold**, paragraphs
      bodyHtml = cleanBody
        .replace(/^### (.+)$/gm, '<h3>' + '$1' + '</h3>')
        .replace(/^## (.+)$/gm, '<h2>' + '$1' + '</h2>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, text, url) {
          if (!/^https?:\/\//i.test(url.trim())) return esc(text);
          return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(text) + '</a>';
        })
        .split(/\n\n+/)
        .map(function (p) {
          p = p.trim();
          if (!p || p.startsWith('<h')) return p;
          return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
        })
        .join('\n');
    }

    return '<details class="np-item" data-cat="' + esc(item.category) + '" id="' + esc(item.slug) + '">' +
      '<summary class="np-item__header">' +
        '<a href="' + esc(href) + '" target="_blank" rel="noopener" class="np-item__thumb" onclick="event.stopPropagation()">' +
          '<img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.src=\'/images/news/court-01.jpg\'" />' +
          '<span class="np-item__thumb-source">' + esc(item.source_name || 'Source') + '</span>' +
        '</a>' +
        '<div class="np-item__info">' +
          '<div class="np-item__meta">' +
            '<span class="np-cat-badge" style="background:' + color + '">' + label + '</span>' +
            '<span class="np-item__time">' + timeAgo(item.published_at) + '</span>' +
          '</div>' +
          '<h2 class="np-item__title">' + esc(item.title) + '</h2>' +
          '<p class="np-item__summary">' + esc(item.summary) + '</p>' +
        '</div>' +
        '<span class="np-item__chevron">&darr;</span>' +
      '</summary>' +
      (item.body ? '<div class="np-item__body"><article class="np-article"><div class="np-article__content">' + bodyHtml + '</div>' +
        '<div class="np-source">' +
          '<div class="np-source__info"><span>Source</span><a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(item.source_name || 'Source') + ' &nearr;</a><span>' + date + '</span></div>' +
          '<div class="np-source__share">' +
            '<a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(item.title) + '&url=' + encodeURIComponent('https://super.tennis/news/#' + item.slug) + '" target="_blank" rel="noopener" class="np-share-btn np-share-btn--x" title="Share on X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>' +
            '<a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://super.tennis/news/#' + item.slug) + '" target="_blank" rel="noopener" class="np-share-btn np-share-btn--fb" title="Share on Facebook"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>' +
            '<a href="https://wa.me/?text=' + encodeURIComponent(item.title + ' https://super.tennis/news/#' + item.slug) + '" target="_blank" rel="noopener" class="np-share-btn np-share-btn--wa" title="Share on WhatsApp"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>' +
            '<button class="np-share-btn np-share-btn--copy" title="Copy link" onclick="event.stopPropagation();navigator.clipboard.writeText(\'https://super.tennis/news/#' + item.slug + '\');this.innerHTML=\'&#10003;\';var b=this;setTimeout(function(){b.innerHTML=\'&#128279;\'},1500)">&#128279;</button>' +
          '</div>' +
        '</div>' +
      '</article></div>' : '') +
    '</details>';
  }
  // Expose for Load More button
  window.__renderNewsFullItem = renderNewsFullItem;

  // ── Render: sidebar news card ──
  function renderSidebarNews(item) {
    var href = item.body ? '/news/#' + item.slug : (item.source_url || '#');
    var target = item.body ? '' : ' target="_blank" rel="noopener"';
    var color = catColors[item.category] || '#16a34a';
    var label = catLabels[item.category] || 'Buzz';

    return '<a href="' + esc(href) + '"' + target + ' class="sb-news-item">' +
      '<span class="sb-news-badge" style="background:' + color + '">' + label + '</span>' +
      '<span class="sb-news-title">' + esc(item.title) + '</span>' +
      '<span class="sb-news-time">' + timeAgo(item.published_at) + '</span>' +
    '</a>';
  }

  // ── Render: sidebar video ──
  function renderSidebarVideo(v) {
    return '<div class="sb-video">' +
      '<div class="lite-yt" data-video-id="' + esc(v.video_id) + '">' +
        '<img src="https://i.ytimg.com/vi/' + esc(v.video_id) + '/hqdefault.jpg" alt="' + esc(v.title) + '" loading="lazy" onerror="this.src=\'/images/news/court-01.jpg\'" />' +
        '<button class="lite-yt__play" aria-label="Play: ' + esc(v.title) + '">' + playSvg + '</button>' +
        '<span class="lite-yt__title">' + esc(v.title) + '</span>' +
      '</div>' +
      '<div class="sb-video__meta">' +
        '<span class="sb-video__cat" style="color:' + (v.accentColor || '#2563eb') + '">' + esc(v.label || v.category) + '</span>' +
        '<span class="sb-video__ch">' + esc(v.channel_name) + '</span>' +
      '</div>' +
    '</div>';
  }

  // ── Load Earlier News button ──
  function initLoadEarlier(listEl) {
    var loadDate = new Date();
    loadDate.setDate(loadDate.getDate() - 1);
    var earliest = new Date(); earliest.setDate(earliest.getDate() - 60);

    function fd(d) { return d.toISOString().split('T')[0]; }
    function fl(d) {
      var t = new Date();
      var y = new Date(t); y.setDate(y.getDate() - 1);
      if (fd(d) === fd(t)) return 'Today';
      if (fd(d) === fd(y)) return 'Yesterday';
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    var wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:center;padding:28px 0';
    wrap.innerHTML = '<button id="news-load-btn" style="background:#1a7a2e;color:white;border:none;padding:14px 40px;border-radius:8px;font-size:0.95rem;font-weight:700;cursor:pointer">Load Earlier News</button>';
    listEl.parentElement.insertBefore(wrap, listEl.nextSibling);

    var btn = document.getElementById('news-load-btn');
    btn.addEventListener('click', function () {
      if (loadDate < earliest) return;
      btn.textContent = 'Loading...';
      btn.disabled = true;
      btn.style.opacity = '0.6';

      fetch(API + '/api/news?date=' + fd(loadDate) + '&limit=100')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.length > 0) {
            // Date divider
            var divider = document.createElement('div');
            divider.style.cssText = 'text-align:center;margin:32px 0 16px;position:relative';
            divider.innerHTML = '<div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#ddd"></div><span style="position:relative;background:white;padding:0 16px;font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888">' + fl(loadDate) + '</span>';
            listEl.appendChild(divider);

            // Render with same function used for today's news
            var html = data.map(renderNewsFullItem).join('');
            var temp = document.createElement('div');
            temp.innerHTML = html;
            while (temp.firstChild) listEl.appendChild(temp.firstChild);
          }

          loadDate.setDate(loadDate.getDate() - 1);
          if (loadDate < earliest) {
            btn.textContent = 'No more news';
            btn.disabled = true;
            btn.style.opacity = '0.4';
          } else {
            btn.textContent = 'Load Earlier News';
            btn.disabled = false;
            btn.style.opacity = '1';
          }
        })
        .catch(function () {
          btn.textContent = 'Failed — try again';
          btn.disabled = false;
          btn.style.opacity = '1';
        });
    });
  }

  // ── Main: find containers and hydrate ──
  async function hydrate() {
    var containers = document.querySelectorAll('[data-dynamic]');
    if (containers.length === 0) return;

    // Determine what we need to fetch
    var needNews = false;
    var needVideos = false;
    containers.forEach(function (el) {
      var type = el.getAttribute('data-dynamic');
      if (type === 'news' || type === 'news-full' || type === 'sidebar-news') needNews = true;
      if (type === 'videos' || type === 'sidebar-videos') needVideos = true;
    });

    // Fetch in parallel
    var promises = [];
    if (needNews) promises.push(fetchNews());
    else promises.push(Promise.resolve([]));
    if (needVideos) promises.push(fetchVideos());
    else promises.push(Promise.resolve([]));

    var results = await Promise.all(promises);
    var news = results[0] || [];
    var videos = results[1] || [];

    // Render into each container
    containers.forEach(function (el) {
      var type = el.getAttribute('data-dynamic');
      var limit = parseInt(el.getAttribute('data-limit') || '20');

      if (type === 'news') {
        var items = news.slice(0, limit);
        if (items.length > 0) {
          el.innerHTML = items.map(renderBuzzCard).join('');
        } else {
          el.innerHTML = '<p style="color:var(--gray-500);text-align:center;padding:2rem">Tennis news loading soon...</p>';
        }
      }

      else if (type === 'news-full') {
        var items = news.filter(function (n) { return n.body && n.body.length > 50; }).slice(0, limit);
        if (items.length > 0) {
          el.innerHTML = items.map(renderNewsFullItem).join('');
          // Handle hash navigation (open specific article)
          if (window.location.hash) {
            var slug = window.location.hash.slice(1);
            var target = document.getElementById(slug);
            if (target && target.tagName === 'DETAILS') {
              target.setAttribute('open', '');
              setTimeout(function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            }
          }
          // Add "Load Earlier News" button
          initLoadEarlier(el);
        } else {
          el.innerHTML = '<p style="color:var(--gray-500);text-align:center;padding:2rem">No news articles yet. Check back soon!</p>';
        }
      }

      else if (type === 'sidebar-news') {
        var items = news.slice(0, limit);
        if (items.length > 0) {
          var hasParentHeader = el.closest('.sb-trending') || el.closest('.sb-block');
          var header = hasParentHeader ? '' : '<div class="sb-block__header"><span class="sb-block__label">What\'s Hot</span><a href="/news/" class="sb-link">All news &rarr;</a></div>';
          el.innerHTML = header +
            '<div class="sb-news-list">' + items.map(renderSidebarNews).join('') + '</div>';
        }
      }

      else if (type === 'videos') {
        var slots = (el.getAttribute('data-slots') || '').split(',').map(Number);
        var selected = slots.map(function (i) { return videos[i]; }).filter(Boolean);
        if (selected.length > 0) {
          if (selected.length === 1) el.classList.add('video-pair--single');
          el.innerHTML = selected.map(renderVideoThumb).join('');
        }
      }

      else if (type === 'sidebar-videos') {
        var slots = (el.getAttribute('data-slots') || '0,1').split(',').map(Number);
        var selected = slots.map(function (i) { return videos[i]; }).filter(Boolean);
        if (selected.length > 0) {
          el.innerHTML = '<div class="sb-block__header"><span class="sb-block__label">Watch Tennis</span><a href="/video/" class="sb-link">All channels &rarr;</a></div>' +
            '<div class="sb-videos">' + selected.map(renderSidebarVideo).join('') + '</div>';
        }
      }
    });
  }

  // ── Trending Bar ──
  async function populateTrending() {
    var scroll = document.getElementById('trending-scroll');
    if (!scroll) return;
    var news = await fetchNews();
    if (!news || news.length === 0) {
      var bar = document.getElementById('trending-bar');
      if (bar) bar.style.display = 'none';
      return;
    }
    var items = news.slice(0, 10);
    var html = items.map(function (n) {
      var color = catColors[n.category] || '#16a34a';
      var href = n.body ? '/news/#' + esc(n.slug) : (n.source_url || '#');
      var target = n.body ? '' : ' target="_blank" rel="noopener"';
      return '<a class="trending-item" href="' + href + '"' + target + '>' +
        '<span class="trending-dot" style="background:' + color + '"></span>' +
        esc(n.title) + '</a>';
    }).join('');
    // Duplicate for seamless loop
    scroll.innerHTML = html + html;
  }

  // Run on DOM ready
  // ── Lite YouTube click-to-play (for dynamically rendered videos) ──
  document.addEventListener('click', function (e) {
    var el = e.target.closest('.lite-yt');
    if (!el || el.querySelector('iframe')) return;
    var videoId = el.getAttribute('data-video-id');
    if (!videoId) return;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;z-index:2';
    el.style.position = 'relative';
    el.appendChild(iframe);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hydrate(); populateTrending(); });
  } else {
    hydrate();
    populateTrending();
  }
})();
