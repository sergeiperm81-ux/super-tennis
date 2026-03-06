/* ========================================
   SUPER.TENNIS — Main Application
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    i18n.init();
    initHeader();
    initLangSwitch();
    initNews();
    initCalendar();
});

/* ========== HEADER ========== */
function initHeader() {
    const header = document.getElementById('header');
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');

    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    });

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        nav.classList.toggle('open');
    });

    nav.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            nav.classList.remove('open');
        });
    });
}

/* ========== LANGUAGE SWITCH ========== */
function initLangSwitch() {
    const langSwitch = document.getElementById('langSwitch');
    const langDropdown = document.getElementById('langDropdown');
    const langCurrent = document.getElementById('langCurrent');

    langSwitch.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
    });

    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            i18n.setLang(lang);
            langCurrent.textContent = lang.toUpperCase();
            langDropdown.classList.remove('open');
            // Reload all dynamic content with new language
            initCalendar();
            fetchAllNews(); // Re-fetch news for the new language
        });
    });

    document.addEventListener('click', () => {
        langDropdown.classList.remove('open');
    });
}

/* ========== NEWS (RSS) ========== */
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

// English sources
const RSS_SOURCES_EN = {
    bbc: {
        name: 'BBC Sport',
        url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml',
    },
    espn: {
        name: 'ESPN',
        url: 'https://www.espn.com/espn/rss/tennis/news',
    }
};

// Russian sources
const RSS_SOURCES_RU = {
    sportsru: {
        name: 'Sports.ru',
        url: 'https://www.sports.ru/rss/rubric/tennis.xml',
    },
    championat: {
        name: 'Championat',
        url: 'https://www.championat.com/rss/tennis',
    }
};

let allNews = [];
let currentSource = 'all';

function getRssSources() {
    return i18n.currentLang === 'ru' ? RSS_SOURCES_RU : RSS_SOURCES_EN;
}

function initNews() {
    document.querySelectorAll('.news__tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.news__tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSource = tab.dataset.source;
            renderNews();
        });
    });

    document.getElementById('newsRetry').addEventListener('click', () => {
        document.getElementById('newsError').style.display = 'none';
        fetchAllNews();
    });

    fetchAllNews();
}

async function fetchAllNews() {
    const newsGrid = document.getElementById('newsGrid');
    const error = document.getElementById('newsError');
    const sources = getRssSources();
    allNews = [];
    error.style.display = 'none';

    // Show loading spinner inside the grid
    newsGrid.innerHTML = `
        <div class="news__loading">
            <div class="spinner"></div>
            <p>${i18n.t('news_loading')}</p>
        </div>
    `;

    // Reset tabs to match current language sources
    updateNewsTabs(sources);

    try {
        const promises = Object.entries(sources).map(async ([key, source]) => {
            try {
                const url = `${RSS2JSON_API}?rss_url=${encodeURIComponent(source.url)}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'ok' && data.items) {
                    return data.items.slice(0, 6).map(item => ({
                        source: key,
                        sourceName: source.name,
                        title: item.title,
                        description: stripHtml(item.description || '').substring(0, 150) + '...',
                        link: item.link,
                        pubDate: item.pubDate,
                        thumbnail: item.thumbnail || item.enclosure?.link || null
                    }));
                }
                return [];
            } catch {
                return [];
            }
        });

        const results = await Promise.all(promises);
        allNews = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        if (allNews.length === 0) {
            allNews = getFallbackNews();
        }

        currentSource = 'all';
        renderNews();
    } catch {
        newsGrid.innerHTML = '';
        error.style.display = 'block';
    }
}

function updateNewsTabs(sources) {
    const tabsContainer = document.querySelector('.news__tabs');
    const sourceEntries = Object.entries(sources);

    tabsContainer.innerHTML = `
        <button class="news__tab active" data-source="all">${i18n.t('news_tab_all')}</button>
        ${sourceEntries.map(([key, src]) =>
            `<button class="news__tab" data-source="${key}">${escapeHtml(src.name)}</button>`
        ).join('')}
    `;

    // Re-attach tab click handlers
    tabsContainer.querySelectorAll('.news__tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tabsContainer.querySelectorAll('.news__tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSource = tab.dataset.source;
            renderNews();
        });
    });
}

function renderNews() {
    const newsGrid = document.getElementById('newsGrid');
    const filtered = currentSource === 'all' ? allNews : allNews.filter(n => n.source === currentSource);
    const items = filtered.slice(0, 9);

    if (items.length === 0) {
        newsGrid.innerHTML = `<div class="news__loading"><p>${i18n.t('news_loading')}</p></div>`;
        return;
    }

    newsGrid.innerHTML = items.map(item => `
        <article class="news__card">
            <div class="news__card-body">
                <div class="news__card-header">
                    <span class="news__card-source">${escapeHtml(item.sourceName)}</span>
                    <span class="news__card-date">${formatDate(item.pubDate)}</span>
                </div>
                <h3 class="news__card-title">${escapeHtml(item.title)}</h3>
                <p class="news__card-excerpt">${escapeHtml(item.description)}</p>
                <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="news__card-link">${i18n.t('news_read_more')} &rarr;</a>
            </div>
        </article>
    `).join('');
}

function getFallbackNews() {
    const lang = i18n.currentLang;
    if (lang === 'ru') {
        return [
            { source: 'sportsru', sourceName: 'Sports.ru', title: 'Теннис: последние новости мирового тура', description: 'Следите за обновлениями на super.tennis. RSS-ленты загрузятся автоматически при подключении к интернету.', link: '#', pubDate: new Date().toISOString() },
            { source: 'championat', sourceName: 'Championat', title: 'ATP Tour: обзор текущего сезона', description: 'Все результаты, рейтинги и аналитика доступны в нашем разделе новостей.', link: '#', pubDate: new Date().toISOString() },
            { source: 'sportsru', sourceName: 'Sports.ru', title: 'WTA: расписание ближайших турниров', description: 'Календарь женского тенниса обновляется ежедневно.', link: '#', pubDate: new Date().toISOString() },
        ];
    }
    return [
        { source: 'bbc', sourceName: 'BBC Sport', title: 'Tennis: World Tour Latest Updates', description: 'Stay tuned on super.tennis. RSS feeds will load automatically when connected to the internet.', link: '#', pubDate: new Date().toISOString() },
        { source: 'espn', sourceName: 'ESPN', title: 'ATP Tour: Current Season Review', description: 'All results, rankings and analysis available in our news section.', link: '#', pubDate: new Date().toISOString() },
        { source: 'bbc', sourceName: 'BBC Sport', title: 'WTA: Upcoming Tournament Schedule', description: 'Women\'s tennis calendar updated daily.', link: '#', pubDate: new Date().toISOString() },
    ];
}

/* ========== CALENDAR ========== */
const tournamentsData = {
    en: [
        { name: "Australian Open", location: "Melbourne, Australia", date: "Jan 12 – Jan 26, 2026", surface: "Hard", type: "grand-slam" },
        { name: "Indian Wells Masters", location: "Indian Wells, USA", date: "Mar 5 – Mar 16, 2026", surface: "Hard", type: "masters" },
        { name: "Miami Open", location: "Miami, USA", date: "Mar 19 – Mar 30, 2026", surface: "Hard", type: "masters" },
        { name: "Monte-Carlo Masters", location: "Monte Carlo, Monaco", date: "Apr 6 – Apr 13, 2026", surface: "Clay", type: "masters" },
        { name: "Madrid Open", location: "Madrid, Spain", date: "Apr 27 – May 10, 2026", surface: "Clay", type: "masters" },
        { name: "Roland Garros", location: "Paris, France", date: "May 24 – Jun 7, 2026", surface: "Clay", type: "grand-slam" },
        { name: "Wimbledon", location: "London, England", date: "Jun 29 – Jul 12, 2026", surface: "Grass", type: "grand-slam" },
        { name: "US Open", location: "New York, USA", date: "Aug 31 – Sep 13, 2026", surface: "Hard", type: "grand-slam" },
        { name: "Shanghai Masters", location: "Shanghai, China", date: "Oct 5 – Oct 12, 2026", surface: "Hard", type: "masters" },
        { name: "ATP Finals", location: "Turin, Italy", date: "Nov 15 – Nov 22, 2026", surface: "Hard (indoor)", type: "atp500" },
    ],
    ru: [
        { name: "Открытый чемпионат Австралии", location: "Мельбурн, Австралия", date: "12 янв – 26 янв 2026", surface: "Хард", type: "grand-slam" },
        { name: "Мастерс Индиан-Уэллс", location: "Индиан-Уэллс, США", date: "5 мар – 16 мар 2026", surface: "Хард", type: "masters" },
        { name: "Открытый чемпионат Майами", location: "Майами, США", date: "19 мар – 30 мар 2026", surface: "Хард", type: "masters" },
        { name: "Мастерс Монте-Карло", location: "Монте-Карло, Монако", date: "6 апр – 13 апр 2026", surface: "Грунт", type: "masters" },
        { name: "Открытый чемпионат Мадрида", location: "Мадрид, Испания", date: "27 апр – 10 мая 2026", surface: "Грунт", type: "masters" },
        { name: "Ролан Гаррос", location: "Париж, Франция", date: "24 мая – 7 июн 2026", surface: "Грунт", type: "grand-slam" },
        { name: "Уимблдон", location: "Лондон, Англия", date: "29 июн – 12 июл 2026", surface: "Трава", type: "grand-slam" },
        { name: "Открытый чемпионат США", location: "Нью-Йорк, США", date: "31 авг – 13 сен 2026", surface: "Хард", type: "grand-slam" },
        { name: "Мастерс Шанхай", location: "Шанхай, Китай", date: "5 окт – 12 окт 2026", surface: "Хард", type: "masters" },
        { name: "Итоговый турнир ATP", location: "Турин, Италия", date: "15 ноя – 22 ноя 2026", surface: "Хард (закр.)", type: "atp500" },
    ]
};

function initCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const tournaments = tournamentsData[i18n.currentLang] || tournamentsData.en;

    const typeLabels = {
        'grand-slam': i18n.t('calendar_grand_slam'),
        'masters': i18n.t('calendar_masters'),
        'atp500': i18n.t('calendar_atp500'),
    };

    grid.innerHTML = tournaments.map(t => `
        <div class="calendar__card calendar__card--${t.type}">
            <span class="calendar__badge calendar__badge--${t.type}">${typeLabels[t.type]}</span>
            <h3 class="calendar__name">${escapeHtml(t.name)}</h3>
            <div class="calendar__info">
                <span>&#128205; ${escapeHtml(t.location)}</span>
                <span>&#128197; ${escapeHtml(t.date)}</span>
                <span>&#127934; ${escapeHtml(t.surface)}</span>
            </div>
        </div>
    `).join('');
}

/* ========== UTILITIES ========== */
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        const options = i18n.currentLang === 'ru'
            ? { day: 'numeric', month: 'short', year: 'numeric' }
            : { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString(i18n.currentLang === 'ru' ? 'ru-RU' : 'en-US', options);
    } catch {
        return dateStr;
    }
}
