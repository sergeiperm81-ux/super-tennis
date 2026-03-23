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
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
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
        '<div class="np-source"><span>Source</span><a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(item.source_name || 'Source') + ' &nearr;</a><span>' + date + '</span></div>' +
      '</article></div>' : '') +
    '</details>';
  }

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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hydrate(); populateTrending(); });
  } else {
    hydrate();
    populateTrending();
  }
})();
