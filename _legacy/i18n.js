/* ========================================
   SUPER.TENNIS — Internationalization (i18n)
   ======================================== */

const translations = {
    en: {
        // Nav
        nav_news: "News",
        nav_calendar: "Calendar",
        nav_about: "About",

        // Hero
        hero_badge: "WORLD TENNIS HUB",
        hero_subtitle: "Latest news, tournament schedules, and everything about world tennis — all in one place",
        hero_btn_news: "Latest News",
        hero_btn_calendar: "Tournament Calendar",
        hero_stat_slams: "Grand Slams",
        hero_stat_atp: "Men's Tour",
        hero_stat_wta: "Women's Tour",
        hero_stat_live: "Live Updates",

        // News
        news_title: "Latest News",
        news_desc: "Real-time tennis news from the world's top sources",
        news_tab_all: "All",
        news_loading: "Loading news...",
        news_error: "Unable to load news. Please try again later.",
        news_retry: "Retry",
        news_read_more: "Read more",

        // Calendar
        calendar_title: "Tournament Calendar",
        calendar_desc: "Key upcoming tournaments in 2026",
        calendar_grand_slam: "Grand Slam",
        calendar_masters: "Masters 1000",
        calendar_atp500: "ATP Finals",

        // About
        about_title: "About the Project",
        about_text1: "SUPER.TENNIS is your one-stop destination for everything related to world tennis. We aggregate news from top sources and keep you updated on tournament schedules.",
        about_text2: "Our mission is to make tennis information accessible and enjoyable for fans around the globe.",
        about_f1_title: "Real-Time News",
        about_f1_desc: "Automatic updates from BBC Sport, ESPN, and more",
        about_f2_title: "Multilingual",
        about_f2_desc: "Available in English and Russian",
        about_f3_title: "Tournament Calendar",
        about_f3_desc: "All Grand Slams and Masters events in one place",

        // Footer
        footer_tagline: "Your World Tennis Hub",
        footer_sources: "News sources:",
        footer_rights: "All rights reserved.",
    },

    ru: {
        // Nav
        nav_news: "Новости",
        nav_calendar: "Календарь",
        nav_about: "О проекте",

        // Hero
        hero_badge: "МИР МИРОВОГО ТЕННИСА",
        hero_subtitle: "Последние новости, расписание турниров и всё о мировом теннисе — в одном месте",
        hero_btn_news: "Последние новости",
        hero_btn_calendar: "Календарь турниров",
        hero_stat_slams: "Большие шлемы",
        hero_stat_atp: "Мужской тур",
        hero_stat_wta: "Женский тур",
        hero_stat_live: "Обновления 24/7",

        // News
        news_title: "Последние новости",
        news_desc: "Новости тенниса в реальном времени из лучших мировых источников",
        news_tab_all: "Все",
        news_loading: "Загрузка новостей...",
        news_error: "Не удалось загрузить новости. Попробуйте позже.",
        news_retry: "Повторить",
        news_read_more: "Читать далее",

        // Calendar
        calendar_title: "Календарь турниров",
        calendar_desc: "Ключевые предстоящие турниры 2026",
        calendar_grand_slam: "Большой шлем",
        calendar_masters: "Мастерс 1000",
        calendar_atp500: "Итоговый турнир ATP",

        // About
        about_title: "О проекте",
        about_text1: "SUPER.TENNIS — ваш главный источник информации о мировом теннисе. Мы собираем новости из лучших источников и держим вас в курсе расписания турниров.",
        about_text2: "Наша миссия — сделать информацию о теннисе доступной и интересной для болельщиков по всему миру.",
        about_f1_title: "Новости в реальном времени",
        about_f1_desc: "Автоматические обновления от BBC Sport, ESPN и других",
        about_f2_title: "Мультиязычность",
        about_f2_desc: "Доступен на английском и русском языках",
        about_f3_title: "Календарь турниров",
        about_f3_desc: "Все турниры Большого шлема и Мастерс в одном месте",

        // Footer
        footer_tagline: "Мир мирового тенниса",
        footer_sources: "Источники новостей:",
        footer_rights: "Все права защищены.",
    }
};

// i18n Engine
class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('super_tennis_lang') || 'en';
        this.listeners = [];
    }

    t(key) {
        return translations[this.currentLang]?.[key] || translations.en[key] || key;
    }

    setLang(lang) {
        if (!translations[lang]) return;
        this.currentLang = lang;
        localStorage.setItem('super_tennis_lang', lang);
        document.documentElement.lang = lang;
        this.applyTranslations();
        this.listeners.forEach(fn => fn(lang));
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            if (text) el.textContent = text;
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const text = this.t(key);
            if (text) el.placeholder = text;
        });

        document.title = this.currentLang === 'ru'
            ? 'SUPER.TENNIS — Мир мирового тенниса'
            : 'SUPER.TENNIS — World Tennis Hub';
    }

    onChange(fn) {
        this.listeners.push(fn);
    }

    init() {
        document.documentElement.lang = this.currentLang;
        this.applyTranslations();

        const langCurrent = document.getElementById('langCurrent');
        if (langCurrent) {
            langCurrent.textContent = this.currentLang.toUpperCase();
        }
    }
}

const i18n = new I18n();
