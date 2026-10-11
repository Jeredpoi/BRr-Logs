// ==UserScript==
// @name         VERDICT Логи — аналитика IP для logs.blackrussia.online
// @namespace    verdict.br.logs
// @version      0.1.0
// @description  Тема VERDICT на сайте логов, аналитика по IP и устройствам, кнопка «Проверить по логам» в профиле форума. Только для доверенных.
// @author       Максим Паль!?
// @match        https://logs.blackrussia.online/*
// @match        https://forum.blackrussia.online/members/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ipwho.is
// @connect      unsplash.com
// @connect      images.unsplash.com
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
'use strict';
// ядро
const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
if (W.__verdictLogsLoaded) return;
W.__verdictLogsLoaded = true;

const BRAND = Object.freeze({
    name: 'VERDICT',
    author: 'Максим Паль!?', // должен совпадать с @author в шапке скрипта
    tagline: 'Быстрые ответы · Black Russia',
    namespace: 'verdict.br.forum',
    version: '0.1.0', // подставляет build.sh из @version
    // откуда ставятся обновления (build.sh, UPDATE_BASE)
    update: '',
    build: 'VRD-7Q4K-2026',
    // mail: адрес почты разработчика (Google Apps Script из server/), telegram и vk для ссылок во вкладке «Связь»
    dev: {
        mail: 'https://script.google.com/macros/s/AKfycbx-yEBIw_o_NKjnie7loXBJbcawRA0nU-eCHAKe9DHcxWyRrMhhvJo_DShtxZFJPiHT2Q/exec',
        telegram: '',
        vk: ''
    },
    // фоны от разработчика во вкладке «Темы»: { name, url, accent, accent2, fx }
    gallery: []
});

// хранилище: GM_*, если нет, то localStorage
const Store = {
    // фото с картинками весят мегабайты, их разбираем один раз
    _big: {},
    get(key, def) {
        if (key === 'photos') return this._big.photos || (this._big.photos = this.read(key, def));
        return this.read(key, def);
    },
    read(key, def) {
        try {
            if (typeof GM_getValue === 'function') {
                const raw = GM_getValue('vd.' + key);
                if (raw === undefined || raw === null) return def;
                return typeof raw === 'string' ? JSON.parse(raw) : raw;
            }
        } catch {
            /* ignore */
        }
        try {
            const raw = localStorage.getItem('vd.' + key);
            return raw === null ? def : JSON.parse(raw);
        } catch {
            return def;
        }
    },
    set(key, value) {
        if (key === 'photos') this._big.photos = value;
        const raw = JSON.stringify(value);
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue('vd.' + key, raw);
                return;
            }
        } catch {
            /* ignore */
        }
        try {
            localStorage.setItem('vd.' + key, raw);
        } catch {
            // без GM всё лежит в localStorage форума: переполнилось — говорим, а не теряем молча после перезагрузки
            if (!this._full) {
                this._full = true;
                setTimeout(() => typeof toast === 'function' && toast('Не хватило места в браузере: последнее изменение не сохранится. Удали лишние фото фонов', 'err'), 0);
            }
        }
    }
};

const VERDICTS = {
    approve: { label: 'Одобрено', tail: 'Одобрено.', icon: 'check', color: '#2fbf71' },
    deny: { label: 'Отказано', tail: 'Отказано.', icon: 'x', color: '#e5484d' },
    review: {
        label: 'На рассмотрении',
        tail: 'На рассмотрении.',
        icon: 'clock',
        color: '#f5a524'
    },
    close: { label: 'Закрыто', tail: 'Закрыто.', icon: 'lock', color: '#8b8f9a' },
    tech: { label: 'Тех. специалисту', tail: 'Передано техническому специалисту.', icon: 'wrench', color: '#3aa0ff' },
    ga: { label: 'ГА', tail: 'Передано Главному администратору.', icon: 'crown', color: '#ff7a45' },
    kp: { label: 'КП', tail: 'Передано Команде проекта.', icon: 'users', color: '#a970ff' },
    watched: { label: 'Рассмотрено', tail: 'Рассмотрено.', icon: 'eye', color: '#22b8a8' },
    zga: { label: 'ЗГА', tail: 'Передано Заместителю Главного администратора.', icon: 'star', color: '#ff9f43' },
    cur: { label: 'Куратору', tail: 'Передано куратору.', icon: 'badge', color: '#f5c542' },
    spec: {
        label: 'Спец. администратору',
        tail: 'Передано Специальному администратору.',
        icon: 'shield',
        color: '#ef5da8'
    },
    none: { label: 'Без статуса', tail: '', icon: 'pen', color: '#c9ccd3' }
};
const VERDICT_ORDER = [
    'approve',
    'deny',
    'review',
    'close',
    'watched',
    'tech',
    'cur',
    'zga',
    'ga',
    'spec',
    'kp',
    'none'
];
// цвет итоговой строки для статусов, которых нет в палитрах ответа
// итоговая строка зависит от раздела: «жалоба одобрена», «заявка отклонена»…
const KIND_TAILS = {
    complaint: { approve: 'Жалоба одобрена.', deny: 'В жалобе отказано.' },
    appeal: { approve: 'Обжалование одобрено.', deny: 'В обжаловании отказано.' },
    app: { approve: 'Заявка одобрена.', deny: 'Заявка отклонена.' },
    bio: { approve: 'Биография одобрена.', deny: 'Биография отклонена.' }
};
// разделы, для которых итоговую строку можно задать отдельно
const TAIL_KINDS = { complaint: 'Жалобы', appeal: 'Обжалования', app: 'Заявки', bio: 'Биографии' };
// итоговая строка: своя для раздела → своя общая → стандартная для раздела → стандартная
const Tails = {
    std(kind, v) {
        return (KIND_TAILS[kind] && KIND_TAILS[kind][v]) || (VERDICTS[v] || VERDICTS.none).tail;
    },
    get(kind, v) {
        const own = Settings.get().answer.tails;
        const t = (kind && own[kind + '.' + v]) || own[v];
        if (!t) return this.std(kind, v);
        return t.trim() === '-' ? '' : t;
    }
};
// строгие формулировки передачи: старые и свои варианты («Передали ГА», «Передано Главному Администратору») приводятся к ним
const STRICT_TAILS = [
    [/^переда\S*\s+(тему\s+|жалобу\s+|обращение\s+)?(на\s+рассмотрение\s+)?(главному\s+администратору|га)\.?$/i, 'Передано Главному администратору.'],
    [/^переда\S*\s+(тему\s+|жалобу\s+|обращение\s+)?(на\s+рассмотрение\s+)?(заместителю\s+главного\s+администратора|зга)\.?$/i, 'Передано Заместителю Главного администратора.'],
    [/^переда\S*\s+(тему\s+|жалобу\s+|обращение\s+)?(на\s+рассмотрение\s+)?(тех\.?\s*|техническому\s+)специалисту\.?$/i, 'Передано техническому специалисту.'],
    [/^переда\S*\s+(тему\s+|жалобу\s+|обращение\s+)?(на\s+рассмотрение\s+)?(команде\s+проекта|кп)\.?$/i, 'Передано Команде проекта.'],
    [/^переда\S*\s+(тему\s+|жалобу\s+|обращение\s+)?(на\s+рассмотрение\s+)?(спец\.?\s*|специальному\s+)администратору\.?$/i, 'Передано Специальному администратору.']
];
const strictTail = t => {
    const s = String(t || '').trim();
    const hit = STRICT_TAILS.find(([re]) => re.test(s));
    return hit ? hit[1] : t;
};
const VERDICT_BASE = { watched: 'approve', zga: 'ga', cur: 'review', spec: 'ga' };

const DEFAULT_SETTINGS = {
    accent: '#e5484d',
    theme: {
        enabled: true,
        wall: { kind: 'gen', gen: 'nightroad', seed: 1907 },
        rotate: 'off', // off | visit | hour
        dim: 0.55,
        blur: 0, // размытие под блоками красиво, но на слабых ПК прокрутка падает в разы
        glass: 0.3, // плотность блоков форума (1 — непрозрачные)
        menuGlass: 0.82, // плотность меню и окон
        perf: 'auto', // auto | quality | fast — см. Perf
        grain: true,
        fx: { effect: 'none', intensity: 0.6, tod: 'auto', lightning: true },
        liveSpeed: 1
    },
    answer: {
        style: 'classic', // classic | card | strict | compact
        palette: 'classic',
        font: 'Verdana',
        size: '4',
        greet: true,
        mention: true,
        signature: '',
        banner: '',
        tails: {} // свои итоговые строки: 'approve' для всех разделов, 'complaint.approve' только для жалоб
    },
    status: {
        apply: true, // менять статус темы после отправки ответа
        confirmInstant: true,
        map: {
            approve: { prefix: 8, open: false, sticky: false },
            deny: { prefix: 4, open: false, sticky: false },
            review: { prefix: 2, open: false, sticky: true },
            close: { prefix: 7, open: false, sticky: false },
            tech: { prefix: 13, open: false, sticky: true },
            ga: { prefix: 12, open: false, sticky: true },
            kp: { prefix: 10, open: false, sticky: true },
            watched: { prefix: 9, open: false, sticky: false },
            zga: { prefix: 12, open: false, sticky: true },
            cur: { prefix: 2, open: false, sticky: true },
            spec: { prefix: 11, open: false, sticky: true }
        }
    },
    colors: { accent2: '', header: '', blocks: '', border: '', buttons: '', links: '', gradients: true },
    role: '', // уровень: ga | curator | deputy | senior | watcher | admin | jmod | custom
    roleDir: '', // направление: admin | orgs | ap | forum
    roleOrg: '', // фракция для направления «Организаций»
    packVis: {}, // ручные правки видимости разделов поверх должности
    verdictVis: {}, // ручные правки видимости вердиктов
    hiddenItems: [], // ответы, скрытые кнопкой «глаз»
    autograph: { style: 'classic', custom: '' },
    threadAge: true, // сколько прошло с создания темы
    nickCopy: true, // ники Имя_Фамилия в постах подсвечены и копируются по клику
    imgPreview: true, // ссылки на фото открываются в окне быстрого просмотра
    skipLeave: true, // без страницы «Пожалуйста, будьте осторожны» перед внешними ссылками
    qnav: { on: true, counts: true, place: 'top', items: [], groups: [] }, // быстрая навигация в шапке: { id, name, url, group }
    stats: true, // анонимная отметка «скрипт запущен» раз в день, видна разработчику как число пользователей
    permCheck: true, // прятать панель в разделах, где нет прав модератора
    openOn: 'hover', // hover — списки открываются при наведении, click — только по нажатию
    barStyle: 'docked', // docked — панель встроена в редактор, card — отдельной карточкой
    hints: true,
    // проверять, открываются ли ссылки-доказательства в жалобах
    proofs: true,
    // тема VERDICT и на сайте логов
    logsTheme: true,
    shortcodes: true,
    hotkeys: true,
    launcher: true
};

function deepMerge(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    // значение другого типа (битый или подделанный файл) не принимаем
    if (over !== undefined && over !== null && base !== null && typeof base !== 'object' && typeof over !== typeof base)
        return base;
    if (base && typeof base === 'object') {
        const out = {};
        for (const k of Object.keys(base)) out[k] = deepMerge(base[k], over ? over[k] : undefined);
        if (over && typeof over === 'object') for (const k of Object.keys(over)) if (!(k in base)) out[k] = over[k];
        return out;
    }
    return over === undefined ? base : over;
}

const Settings = {
    _v: null,
    get() {
        return (
            this._v ||
            (this._v = this.clean(deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), Store.get('settings', {}))))
        );
    },
    // цвета и префиксы попадают в HTML и CSS, поэтому из хранилища и импорта берём только корректные
    clean(s) {
        const hex = /^#[0-9a-f]{3,8}$/i;
        if (!hex.test(s.accent)) s.accent = DEFAULT_SETTINGS.accent;
        for (const k of Object.keys(s.colors))
            if (k !== 'gradients' && s.colors[k] && !hex.test(s.colors[k])) s.colors[k] = '';
        for (const v of Object.keys(s.status.map)) {
            const m = s.status.map[v];
            if (!VERDICTS[v] || !m || typeof m !== 'object') {
                delete s.status.map[v];
                continue;
            }
            m.prefix = Math.max(0, parseInt(m.prefix, 10) || 0);
            m.open = !!m.open;
            m.sticky = !!m.sticky;
        }
        const q = s.qnav;
        if (!q || typeof q !== 'object') s.qnav = { on: true, items: [], groups: [] };
        else {
            q.on = q.on !== false;
            q.counts = q.counts !== false;
            if (q.place === 'staff') q.place = 'top';
            if (!['top', 'nav', 'sub'].includes(q.place)) q.place = 'top';
            const str = v => (typeof v === 'string' ? v : '');
            q.items = (Array.isArray(q.items) ? q.items : [])
                .filter(i => i && typeof i === 'object')
                .map(i => ({
                    id: str(i.id) || 'q' + U.uid(),
                    name: str(i.name).slice(0, 40),
                    url: str(i.url),
                    group: str(i.group)
                }));
            q.groups = [
                ...new Set(
                    (Array.isArray(q.groups) ? q.groups : [])
                        .filter(g => typeof g === 'string' && g.trim())
                        .map(g => g.trim().slice(0, 24))
                )
            ];
        }
        const t = s.answer.tails;
        if (!t || typeof t !== 'object' || Array.isArray(t)) s.answer.tails = {};
        else
            for (const k of Object.keys(t)) {
                const v = k.split('.').pop();
                if (!VERDICTS[v] || typeof t[k] !== 'string') delete t[k];
                else t[k] = t[k].slice(0, 200);
            }
        const w = s.theme.wall;
        if (!w || typeof w !== 'object' || (w.kind === 'url' && !/^(https:|data:image\/)/.test(String(w.url))))
            s.theme.wall = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.theme.wall));
        return s;
    },
    save() {
        Store.set('settings', this._v);
        Bus.emit('settings');
    },
    patch(fn) {
        fn(this.get());
        this.save();
    }
};

// экономный режим: без blur, погода и живой фон в низком разрешении; auto включает сам при лагах
const Perf = {
    light() {
        const p = Settings.get().theme.perf;
        if (p === 'fast') return true;
        if (p === 'quality') return false;
        return Store.get('perfAuto', '') === 'fast';
    },
    // время кадров в покое и при первых прокрутках (blur тормозит на скролле)
    probe(onSlow) {
        if (Settings.get().theme.perf !== 'auto' || Store.get('perfAuto', '')) return;
        const weak = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
        if (weak) return this.decide(true, onSlow);
        const slow = times => {
            times.sort((a, b) => a - b);
            return times[Math.floor(times.length * 0.75)] > 24;
        };
        const sample = (count, done) => {
            const times = [];
            let last = 0;
            const tick = now => {
                // кадры при свёрнутой вкладке не считаем
                if (last && !document.hidden && now - last < 500) times.push(now - last);
                last = now;
                if (times.length < count) requestAnimationFrame(tick);
                else done(times);
            };
            requestAnimationFrame(tick);
        };
        setTimeout(
            () =>
                sample(120, idle => {
                    if (slow(idle)) return this.decide(true, onSlow);
                    // кадры считаем только пока идёт прокрутка; без прокрутки цикл не крутится
                    const moving = [];
                    let lastScroll = 0,
                        running = false;
                    const loop = prev => now => {
                        if (now - lastScroll > 150) {
                            running = false;
                            return;
                        }
                        if (prev && !document.hidden && now - prev < 500) moving.push(now - prev);
                        if (moving.length >= 90) {
                            removeEventListener('scroll', onScroll);
                            this.decide(slow(moving), onSlow);
                            return;
                        }
                        requestAnimationFrame(loop(now));
                    };
                    const onScroll = () => {
                        lastScroll = performance.now();
                        if (!running) {
                            running = true;
                            requestAnimationFrame(loop(0));
                        }
                    };
                    addEventListener('scroll', onScroll, { passive: true });
                }),
            2500
        );
    },
    decide(isSlow, onSlow) {
        if (Settings.get().theme.perf !== 'auto') return;
        Store.set('perfAuto', isSlow ? 'fast' : 'quality');
        if (isSlow) onSlow();
    },
    reset() {
        Store.set('perfAuto', '');
    }
};

const Bus = {
    _h: {},
    on(ev, fn) {
        (this._h[ev] = this._h[ev] || []).push(fn);
    },
    off(ev, fn) {
        this._h[ev] = (this._h[ev] || []).filter(f => f !== fn);
    },
    emit(ev, data) {
        (this._h[ev] || []).forEach(fn => {
            try {
                fn(data);
            } catch (e) {
                console.error('[VERDICT]', e);
            }
        });
    }
};

const U = {
    esc(s) {
        return String(s == null ? '' : s).replace(
            /[&<>"']/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
        );
    },
    uid() {
        return Math.random().toString(36).slice(2, 9);
    },
    debounce(fn, ms) {
        let t;
        return (...a) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...a), ms);
        };
    },
    ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
        else fn();
    },
    h(html) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
    },
    norm(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/ё/g, 'е');
    },
    // нечёткий поиск: символы запроса по порядку, бонус за начало слова
    fuzzy(query, text) {
        const q = U.norm(query).replace(/\s+/g, ''),
            t = U.norm(text);
        if (!q) return 1;
        if (t.includes(U.norm(query).trim())) return 100 - t.indexOf(U.norm(query).trim());
        let ti = 0,
            score = 0;
        for (const ch of q) {
            const idx = t.indexOf(ch, ti);
            if (idx < 0) return 0;
            score += idx === 0 || t[idx - 1] === ' ' ? 3 : 1;
            ti = idx + 1;
        }
        return score;
    },
    hexA(hex, a) {
        const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
        if (!m) return `rgba(229,72,77,${a})`;
        const n = parseInt(m[1], 16);
        return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
    }
};

// Иконки 24×24, обводка 1.8
const ICONS = {
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>',
    wrench: '<path d="M14.5 5.5a4 4 0 00-5 5L4.5 15.5a2.1 2.1 0 003 3l5-5a4 4 0 005-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    crown: '<path d="M4 17.5h16M5 15l-1-8 5 4 3-6 3 6 5-4-1 8z"/>',
    users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M15.5 6.2a3 3 0 010 5.6M17.5 14.8c1.6.6 2.7 2 3 4.2"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14"/>',
    send: '<path d="M4 12l16-7.5L13.5 20l-2.5-6.5z"/><path d="M11 13.5l9-9"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    bulb: '<path d="M9 17.5h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0012 3z"/>',
    star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    shield: '<path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    chat: '<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    palette:
        '<path d="M12 3.5a8.5 8.5 0 100 17c1.2 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.2-2.2H17a3.5 3.5 0 003.5-3.5c0-5.2-3.8-9.5-8.5-9.5z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7.3" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7.3" r="1.2" fill="currentColor"/>',
    forward: '<path d="M14 5l6 6-6 6"/><path d="M20 11H9a5 5 0 00-5 5v3"/>',
    heart: '<path d="M12 19.5S4 15 4 9.5A4 4 0 0112 7a4 4 0 018 2.5C20 15 12 19.5 12 19.5z"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.6 9.6 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 01-3 3.7M6.6 6.7C4 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
    badge: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><circle cx="12" cy="10" r="2.6"/><path d="M8 16.5c.7-1.6 2.2-2.4 4-2.4s3.3.8 4 2.4"/>',
    cloud: '<path d="M7 18.5h10a4 4 0 00.6-8A6 6 0 006.2 9.7 4.4 4.4 0 007 18.5z"/>',
    storm: '<path d="M7 15.5a4.3 4.3 0 01-.8-8.5 6 6 0 0111.4 1.1 3.8 3.8 0 01-.1 7.4"/><path d="M12.5 12l-2.5 4h3.5l-2.5 4.5"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
    moon: '<path d="M19.5 14.5A7.5 7.5 0 019.5 4.5a7.5 7.5 0 1010 10z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    logo: '<path d="M4 5l8 14 8-14" stroke-width="2.4"/><path d="M8.6 5L12 11l3.4-6" stroke-width="1.6" opacity=".55"/>'
};
function icon(name, size = 16) {
    return `<svg class="vi" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

// <color>, чтобы переменные цветов анимировались
(function registerColorProps() {
    if (!window.CSS || !CSS.registerProperty) return;
    [
        '--acc',
        '--acc2',
        '--vd-acc',
        '--vd-acc2',
        '--vd-head',
        '--vd-block',
        '--vd-border',
        '--vd-btn',
        '--vd-link'
    ].forEach(name => {
        try {
            // начальные значения как у стандартной темы: при выключенной теме var(--vd-acc, …) иначе давал прозрачный цвет
            const init = {
                '--vd-block': '#16181f',
                '--vd-head': '#16181f',
                '--vd-border': '#2a2d36',
                '--vd-link': '#7cb7ff'
            };
            CSS.registerProperty({ name, syntax: '<color>', inherits: true, initialValue: init[name] || '#e5484d' });
        } catch {
            /* ignore */
        }
    });
})();
const hsl = {
    from(hex) {
        const n = parseInt(hex.slice(1), 16),
            r = (n >> 16) / 255,
            g = ((n >> 8) & 255) / 255,
            b = (n & 255) / 255;
        const mx = Math.max(r, g, b),
            mn = Math.min(r, g, b),
            l = (mx + mn) / 2,
            d = mx - mn;
        let h = 0,
            s = 0;
        if (d) {
            s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
            h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            h *= 60;
        }
        return [h, s, l];
    },
    to(h, s, l) {
        h = ((h % 360) + 360) % 360;
        const k = n => (n + h / 30) % 12,
            a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
        return (
            '#' +
            [f(0), f(8), f(4)]
                .map(x =>
                    Math.round(x * 255)
                        .toString(16)
                        .padStart(2, '0')
                )
                .join('')
        );
    },
    rotate(hex, deg, dl = 0) {
        const [h, s, l] = this.from(hex);
        return this.to(h + deg, s, Math.max(0.15, Math.min(0.85, l + dl)));
    }
};

// стили
// UI в Shadow DOM, стили форума не мешают
const UI_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
:host, .v-root {
  --acc: #e5484d; --acc2: #e5484d; --acc-a: rgba(229,72,77,.16);
  transition: --acc .8s ease, --acc2 .8s ease;
  --bg: color-mix(in srgb, var(--acc) 4%, rgba(11,12,16,.9));
  --bg-2: color-mix(in srgb, var(--acc) 3%, #111217);
  --bg-3: color-mix(in srgb, var(--acc) 4%, #181a21);
  --bg-4: #1f212a;
  --line: rgba(255,255,255,.07); --line-2: rgba(255,255,255,.12);
  --tx: #eef0f4; --tx-2: #a6abb8; --tx-3: #6b7080;
  --r: 14px; --r-s: 9px;
  --ease: cubic-bezier(.2,.8,.2,1);
  --sh: 0 24px 60px -18px rgba(0,0,0,.75), 0 0 0 1px var(--line);
  --edge: linear-gradient(135deg, color-mix(in srgb, var(--acc) 55%, transparent), rgba(255,255,255,.06) 35%, rgba(255,255,255,.03) 65%, color-mix(in srgb, var(--acc2) 45%, transparent));
  font: 500 13px/1.45 "Inter", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
  color: var(--tx); -webkit-font-smoothing: antialiased;
}
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
input, textarea, select { font: inherit; color: var(--tx); }
.vi { flex: none; display: block; }
.kbd { font: 600 10px/1 ui-monospace, Consolas, monospace; color: var(--tx-3); border: 1px solid var(--line-2); border-bottom-width: 2px; border-radius: 5px; padding: 3px 5px; }
.muted { color: var(--tx-3); }
.edge { position: relative; }
.edge::before { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px; background: var(--edge); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
.vic { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--c); flex: none; }
.vic.sm { width: 18px; height: 18px; border-radius: 6px; }

/* панель над редактором */
.bar { margin: 0 0 10px; padding: 12px; border-radius: var(--r); background:
  radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--acc) 14%, transparent), transparent 45%), var(--bg);
  /* без backdrop-filter: размытие под панелью пересчитывалось на каждом кадре прокрутки (с 60 до 12 к/с) */
  box-shadow: 0 10px 30px -14px rgba(0,0,0,.7); display: flex; flex-direction: column; gap: 10px; }
.bar-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 9px; margin-right: 4px; }
.brand-mark { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--acc) 25%, transparent); }
.brand-name { font-weight: 800; letter-spacing: .2em; font-size: 11px; }
.brand-name small { display: block; letter-spacing: .02em; font-weight: 600; color: var(--tx-3); font-size: 10.5px; margin-top: 1px; }
.pack-btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 999px; color: var(--tx-2); font-size: 11.5px; font-weight: 650; background: rgba(255,255,255,.04); border: 1px solid var(--line); }
.pack-btn:hover { color: var(--tx); border-color: var(--line-2); }
.spacer { flex: 1; }
.icon-btn { width: 30px; height: 30px; display: inline-grid; place-items: center; border-radius: var(--r-s); color: var(--tx-2); transition: background .15s, color .15s; }
.icon-btn:hover { background: rgba(255,255,255,.07); color: var(--tx); }
.icon-btn.acc:hover { color: var(--acc); background: var(--acc-a); }
.verdicts { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { position: relative; display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px 0 7px; border-radius: 11px; background: rgba(255,255,255,.035); border: 1px solid var(--line); font-weight: 650; font-size: 12.5px; transition: background .18s, border-color .18s, transform .18s var(--ease), box-shadow .18s; }
.chip:hover, .chip.open { background: color-mix(in srgb, var(--c) 13%, rgba(255,255,255,.02)); border-color: color-mix(in srgb, var(--c) 50%, transparent); box-shadow: 0 8px 20px -12px var(--c); transform: translateY(-1px); }
.chip .cnt { color: var(--tx-3); font-size: 10.5px; font-weight: 700; margin-left: -2px; }
.chip .down { color: var(--tx-3); margin-left: -3px; }
.chip.ghost { background: none; border-style: dashed; }
.hints { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.hint { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px 0 5px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); color: var(--tx); background: color-mix(in srgb, var(--c) 9%, transparent); font-size: 12px; font-weight: 650; transition: background .15s; }
.hint:hover { background: color-mix(in srgb, var(--c) 20%, transparent); }
.hint-lead { display: inline-flex; align-items: center; gap: 6px; color: var(--tx-2); font-size: 11.5px; font-weight: 650; padding-right: 2px; }
.hint-lead .vi { color: #ffd166; }
.facts { display: flex; gap: 6px; }
.fact { display: inline-flex; gap: 6px; align-items: center; height: 24px; padding: 0 9px; border-radius: 999px; background: rgba(255,255,255,.04); color: var(--tx-3); font-size: 11px; font-weight: 600; }
.fact b { color: var(--tx-2); font-weight: 700; }
.pending { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 6px 0 5px; border-radius: 999px; background: color-mix(in srgb, var(--c) 15%, transparent); color: var(--tx); font-size: 11.5px; font-weight: 650; }
.pending button { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; color: var(--tx-2); }
.pending button:hover { background: rgba(255,255,255,.1); }

/* встроенная панель: часть редактора форума */
.bar.docked { margin: 0; padding: 8px 10px; gap: 6px; border-radius: var(--host-r, 6px) var(--host-r, 6px) 0 0; background: var(--host-bg, var(--bg)); border: 1px solid var(--host-line, var(--line)); box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
.bar.docked .chip { height: 32px; padding: 0 10px 0 5px; border-radius: 8px; background: transparent; border-color: transparent; }
.bar.docked .chip:hover, .bar.docked .chip.open { background: color-mix(in srgb, var(--c) 12%, transparent); border-color: color-mix(in srgb, var(--c) 30%, transparent); box-shadow: none; transform: none; }
.bar.docked .chip.ghost { border-style: solid; }
.bar.docked .pack-btn { background: transparent; border-color: transparent; }
.bar.docked .pack-btn:hover { background: rgba(255,255,255,.05); }
.bar.docked .hints-row { padding-top: 7px; border-top: 1px solid var(--host-line, var(--line)); }
.bar.docked .hint, .bar.docked .pending { height: 26px; }
.tools { display: flex; align-items: center; gap: 2px; flex: none; margin-left: auto; padding-left: 8px; align-self: flex-start; }
.bar-row > .verdicts { flex: 1 1 0; min-width: 0; }
.chip, .hint, .pack-btn { white-space: nowrap; }
.v-root { container-type: inline-size; }
/* вердикты всегда в одну строку: на средней ширине прячем счётчики и сжимаем отступы,
   на узкой — строка прокручивается */
.bar-row > .verdicts { flex-wrap: nowrap; }
@container (max-width: 1100px) {
  .bar .facts { display: none; }
}
@container (max-width: 980px) {
  .bar-row > .verdicts { gap: 2px; }
  .bar-row > .verdicts .chip .cnt { display: none; }
  .bar.docked .chip { padding: 0 8px 0 4px; gap: 6px; }
}
@container (max-width: 860px) {
  .bar-row > .verdicts { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .bar-row > .verdicts::-webkit-scrollbar { display: none; }
  .bar-row > .verdicts { -webkit-mask-image: linear-gradient(90deg, #000 82%, transparent); mask-image: linear-gradient(90deg, #000 82%, transparent); padding-right: 28px; }
}
@container (max-width: 620px) {
  .bar .hint-lead { display: none; }
  .bar .who { flex-basis: 100%; }
  .bar .hints-row .spacer { display: none; }
}

/* выбор ответа: список + живой предпросмотр */
.picker { position: fixed; z-index: 2147483000; display: flex; width: 720px; height: min(480px, 72vh); border-radius: 16px; background: color-mix(in srgb, var(--bg-2) calc(var(--ui-alpha, .96) * 100%), transparent); backdrop-filter: blur(22px) saturate(1.3); -webkit-backdrop-filter: blur(22px) saturate(1.3); box-shadow: var(--sh); overflow: hidden; animation: pop .18s var(--ease); }
.picker.solo { width: 360px; }
@keyframes pop { from { opacity: 0; transform: translateY(-6px) scale(.985); } }
.pk-list { width: 340px; flex: none; display: flex; flex-direction: column; border-right: 1px solid var(--line); min-height: 0; }
.picker.solo .pk-list { width: 100%; border-right: 0; }
.pk-head { display: flex; align-items: center; gap: 9px; padding: 11px 12px; border-bottom: 1px solid var(--line); }
.pk-head .ttl { font-weight: 750; font-size: 12.5px; }
.pk-head .spacer { flex: 1; }
.pk-head .lnk { font-size: 11.5px; color: var(--tx-3); font-weight: 650; display: inline-flex; gap: 5px; align-items: center; padding: 5px 7px; border-radius: 7px; }
.pk-head .lnk:hover { color: var(--tx); background: rgba(255,255,255,.06); }
.pk-search { display: flex; align-items: center; gap: 8px; margin: 8px 8px 2px; padding: 0 10px; height: 34px; border-radius: 9px; background: rgba(255,255,255,.04); border: 1px solid var(--line); color: var(--tx-3); }
.pk-search:focus-within { border-color: color-mix(in srgb, var(--acc) 55%, transparent); }
.pk-search input { flex: 1; min-width: 0; background: none; border: 0; outline: none; font-size: 12.5px; }
.pk-items { flex: 1; overflow: auto; padding: 6px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
.group-title { position: sticky; top: -6px; z-index: 1; padding: 9px 8px 5px; font-size: 10px; font-weight: 750; color: var(--tx-3); text-transform: uppercase; letter-spacing: .12em; background: color-mix(in srgb, var(--bg-2) 92%, transparent); backdrop-filter: blur(10px); }
.item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 9px; border-radius: 10px; text-align: left; transition: background .12s; }
.item:hover, .item.sel { background: rgba(255,255,255,.055); }
.item.sel { box-shadow: inset 2px 0 0 var(--c); }
.item .t { flex: 1; min-width: 0; }
.item .t b { display: block; font-weight: 650; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item .t small { display: block; color: var(--tx-3); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.reply { margin: 2px 0 10px 34px; padding: 9px 12px; border-radius: 10px; font-size: 12.5px; background: rgba(255,255,255,.04); border-left: 2px solid var(--line-2); }
.reply.fresh { border-left-color: var(--acc); background: color-mix(in srgb, var(--acc) 8%, transparent); }
.reply div { margin-top: 4px; white-space: normal; }
.crop { position: relative; margin: 0 auto; user-select: none; touch-action: none; }
.crop canvas { display: block; border-radius: 8px; }
.crop-box { position: absolute; cursor: move; box-shadow: inset 0 0 0 2px #fff; border-radius: 6px; }
.crop-box.round { border-radius: 50%; }
.crop-box i { position: absolute; right: -7px; bottom: -7px; width: 14px; height: 14px; border-radius: 50%; background: #fff; cursor: nwse-resize; box-shadow: 0 2px 6px rgba(0,0,0,.5); }
.crop { overflow: hidden; }
.logo-prev { height: 56px; max-width: 240px; object-fit: contain; border-radius: 10px; background: rgba(255,255,255,.04); padding: 4px; }
.bbp-field { position: relative; }
.bbpop { position: absolute; z-index: 30; display: flex; align-items: center; gap: 3px; padding: 5px; border-radius: 11px; background: rgba(16,18,24,.97); border: 1px solid var(--line-2); box-shadow: 0 14px 34px -10px rgba(0,0,0,.8); white-space: nowrap; animation: bbp-in .12s ease-out; }
@keyframes bbp-in { from { opacity: 0; transform: translateY(4px); } }
.bbpop > button { min-width: 28px; height: 28px; padding: 0 6px; border-radius: 7px; background: transparent; border: 0; color: var(--tx, #e4e6eb); font-size: 12.5px; cursor: pointer; }
.bbpop > button:hover { background: rgba(255,255,255,.08); }
.bbp-sw { display: flex; gap: 3px; align-items: center; }
.bbp-sw button, .bbp-sw label { width: 18px; height: 18px; padding: 0; border-radius: 50%; border: 2px solid rgba(255,255,255,.15); background: var(--c); cursor: pointer; transition: transform .12s; }
.bbp-sw button:hover, .bbp-sw label:hover { transform: scale(1.2); }
.bbp-sw label { position: relative; overflow: hidden; background: conic-gradient(#e5484d, #f5c542, #2fbf71, #3aa0ff, #a970ff, #e5484d); }
.bbp-sw input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.bbp-sep { width: 1px; height: 18px; background: var(--line-2); margin: 0 3px; }
@media (max-width: 760px) { .bbpop { flex-wrap: wrap; white-space: normal; max-width: 100%; } }
.upd-card.on { border-color: color-mix(in srgb, var(--acc) 55%, transparent); background: color-mix(in srgb, var(--acc) 10%, transparent); }
.ms-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
.ms-kpi { padding: 14px; border-radius: var(--r); background: color-mix(in srgb, var(--acc) 7%, var(--bg-3, rgba(255,255,255,.03))); border: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; }
.ms-kpi span { font-size: 11px; color: var(--tx-3); text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
.ms-kpi b { font-size: 28px; line-height: 1.1; color: color-mix(in srgb, var(--acc) 55%, #fff); }
.ms-kpi small { font-size: 11px; color: var(--tx-3); min-height: 14px; }
.ms-chart { display: flex; align-items: flex-end; gap: 3px; height: 150px; padding: 12px 12px 6px; }
.ms-chart.ms-empty { align-items: center; justify-content: center; gap: 10px; color: var(--tx-3); font-size: 12.5px; text-align: center; }
.ms-chart.ms-empty svg { flex: none; color: var(--acc); opacity: .7; }
.ms-col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; min-width: 0; }
.ms-col i { width: 100%; min-height: 2px; border-radius: 4px 4px 1px 1px; background: linear-gradient(180deg, color-mix(in srgb, var(--acc) 80%, #fff), var(--acc)); opacity: .85; }
.ms-col:hover i { opacity: 1; }
.ms-col span { font-size: 9px; color: var(--tx-3); }
.ms-list { padding: 12px 14px; }
.ms-h { font-size: 11px; font-weight: 750; color: var(--tx-3); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 8px; }
.ms-bar { display: grid; grid-template-columns: minmax(90px, 40%) 1fr 34px; gap: 8px; align-items: center; padding: 4px 0; font-size: 12.5px; }
.ms-bar span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-bar div { height: 8px; border-radius: 4px; background: rgba(255,255,255,.06); overflow: hidden; }
.ms-bar i { display: block; height: 100%; border-radius: 4px; }
.ms-bar b { text-align: right; }
@media (max-width: 760px) { .ms-kpis { grid-template-columns: repeat(2, 1fr); } .ms-col span { display: none; } }
.tl-list { padding: 4px 14px; }
.tl-row { display: grid; grid-template-columns: 190px 1fr; gap: 10px; align-items: center; padding: 6px 0; }
.tl-v { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; font-size: 12.5px; color: var(--c); min-width: 0; }
.tl-more { margin-top: 10px; }
.tl-more summary { cursor: pointer; color: var(--mut, #9aa0ab); font-size: 12.5px; padding: 6px 0; }
@media (max-width: 760px) { .tl-row { grid-template-columns: 1fr; gap: 4px; } }
.qn-list { padding: 4px 14px; }
.qn-row { display: grid; grid-template-columns: minmax(150px, 1.2fr) 2fr 150px auto; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
.qn-row:last-child { border-bottom: 0; }
.qn-row select.inp { width: 100%; min-width: 0; }
.qn-row .inp.bad { border-color: #e5484d; box-shadow: 0 0 0 3px rgba(229,72,77,.18); }
.qn-act { display: flex; gap: 2px; }
@media (max-width: 760px) { .qn-row { grid-template-columns: 1fr; } }
.no-perm { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 8px; padding: 5px 6px 5px 11px; border-radius: 999px; font-size: 11.5px; color: var(--tx-3); background: rgba(255,255,255,.035); border: 1px solid var(--line); }
.no-perm button { padding: 3px 10px; border-radius: 999px; color: var(--tx-2); font-weight: 650; background: rgba(255,255,255,.06); }
.no-perm button:hover { color: var(--tx); background: rgba(255,255,255,.1); }
.item .fit-b { color: #ffd166; margin-right: 5px; text-shadow: 0 0 8px rgba(255,209,102,.6); }
.item.fit { background: color-mix(in srgb, var(--c) 6%, transparent); }
.item.fit .t small { color: color-mix(in srgb, var(--c) 45%, var(--tx-2)); }
.item.rec { box-shadow: inset 2px 0 0 #ffd166; }
.chip .fit-dot { position: absolute; top: 5px; right: 5px; width: 6px; height: 6px; border-radius: 50%; background: var(--tx-2); box-shadow: 0 0 0 2px var(--bg); }
.chip .fit-dot.rec { background: #ffd166; box-shadow: 0 0 0 2px var(--bg), 0 0 8px #ffd166; }
.hint.maybe { border-style: dashed; background: transparent; }
.hint.more { padding: 0 10px 0 12px; color: var(--tx-2); border-style: dashed; background: transparent; }
.item .bolt { opacity: 0; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: var(--tx-2); }
.item:hover .bolt, .item.sel .bolt { opacity: 1; }
/* на тач-экранах невидимые кнопки строки не должны ловить нажатия */
@media (hover: none) {
  .item .edit, .item .hide { display: none; }
  .item .bolt { opacity: 1; }
}
.item .bolt:hover { background: var(--acc-a); color: var(--acc); }
.pk-foot { padding: 8px 12px; border-top: 1px solid var(--line); color: var(--tx-3); font-size: 11px; display: flex; gap: 12px; flex-wrap: wrap; }
.pk-prev { flex: 1; min-width: 0; display: flex; flex-direction: column; background: radial-gradient(100% 80% at 100% 0%, color-mix(in srgb, var(--c, var(--acc)) 10%, transparent), transparent 60%); }
.pk-prev-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px 0; font-size: 10px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; color: var(--tx-3); }
.pk-prev-body { flex: 1; overflow: auto; padding: 10px 14px; scrollbar-width: thin; }
.pk-actions { display: flex; gap: 8px; padding: 10px 14px 14px; }
.pk-actions .btn { flex: 1; }

/* предпросмотр */
.xf-status { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; font-size: 12px; }
.xf-label { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; background: var(--c); }
.xf-title { font-weight: 650; color: var(--tx); }
.xf-body { padding: 14px 16px; border-radius: 10px; border: 1px solid var(--line); background: #17181d; font: 15px/1.55 "Segoe UI", Roboto, system-ui, sans-serif; color: #dfe2e8; word-wrap: break-word; }
.bb-link { color: #6cb4ff; }
.bb-quote { margin: 6px 0; padding: 8px 12px; border-left: 3px solid color-mix(in srgb, var(--acc) 60%, transparent); background: rgba(255,255,255,.035); border-radius: 0 6px 6px 0; text-align: left; }
.bb-quote-head { font-size: .85em; font-weight: 700; margin-bottom: 4px; color: var(--tx-2); }
.bb-spoiler { margin: 6px 0; text-align: left; }
.bb-spoiler-btn { display: inline-block; padding: 4px 10px; border-radius: 5px; font-size: 12px; font-weight: 650; background: rgba(255,255,255,.08); }
.bb-spoiler-body { margin-top: 6px; padding: 8px 10px; border: 1px dashed var(--line-2); border-radius: 6px; }
.bb-img { max-width: 100%; border-radius: 4px; }
.bb-cur { display: inline-block; width: 2px; height: 1.1em; vertical-align: -2px; background: var(--acc); animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0; } }

/* модальные окна */
.scrim { position: fixed; inset: 0; z-index: 2147482990; background: rgba(4,5,8,.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: grid; place-items: start center; padding: 7vh 16px 16px; animation: fade .15s; }
@keyframes fade { from { opacity: 0; } }
.modal { width: min(980px, 100%); height: min(680px, 86vh); display: flex; flex-direction: column; background: color-mix(in srgb, var(--bg-2) calc(var(--ui-alpha, .96) * 100%), transparent); backdrop-filter: blur(22px) saturate(1.3); -webkit-backdrop-filter: blur(22px) saturate(1.3); border-radius: 18px; box-shadow: var(--sh); overflow: hidden; animation: pop .2s var(--ease); }
.modal.sm { width: min(820px, 100%); height: auto; max-height: 88vh; }
.modal.pal { width: min(760px, 100%); height: auto; }
.m-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.m-title { font-weight: 800; font-size: 14px; }
.m-sub { color: var(--tx-3); font-size: 11.5px; }
.m-body { display: flex; min-height: 0; flex: 1; }
.side { width: 220px; flex: none; display: flex; flex-direction: column; border-right: 1px solid var(--line); background: radial-gradient(140% 60% at 0% 0%, color-mix(in srgb, var(--acc) 12%, transparent), transparent 60%); }
.side-brand { display: flex; align-items: center; gap: 10px; padding: 16px 16px 14px; }
.side-brand .brand-mark { width: 34px; height: 34px; border-radius: 11px; }
.tabs { padding: 6px 10px; display: flex; flex-direction: column; gap: 2px; flex: 1; }
.tab { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; color: var(--tx-2); font-weight: 650; text-align: left; transition: background .15s, color .15s; }
.tab:hover { background: rgba(255,255,255,.04); color: var(--tx); }
.tab.on { background: rgba(255,255,255,.07); color: var(--tx); box-shadow: inset 2px 0 0 var(--acc); }
.tab.on .vi { color: var(--acc); }
.side-foot { padding: 12px 16px 16px; color: var(--tx-3); font-size: 11px; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pane { flex: 1; min-width: 0; overflow: auto; padding: 20px 22px 26px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
.pane-title { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
.pane-sub { color: var(--tx-3); margin: 0 0 18px; font-size: 12.5px; }
.sec { margin-bottom: 22px; }
.sec h4 { margin: 0 0 10px; font-size: 10.5px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; color: var(--tx-3); display: flex; align-items: center; gap: 8px; }
.card { background: rgba(255,255,255,.025); border: 1px solid var(--line); border-radius: 12px; padding: 4px 14px; }
.row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line); }
.row:last-child { border-bottom: 0; }
.row .lbl { flex: 1; }
.row .lbl small { display: block; color: var(--tx-3); font-size: 11.5px; }
.inp, select.inp, textarea.inp { width: 100%; background: rgba(0,0,0,.25); border: 1px solid var(--line-2); border-radius: var(--r-s); padding: 9px 11px; outline: none; transition: border-color .15s, box-shadow .15s; }
.inp:focus { border-color: color-mix(in srgb, var(--acc) 60%, transparent); box-shadow: 0 0 0 3px var(--acc-a); }
textarea.inp { min-height: 150px; resize: vertical; line-height: 1.5; }
select.inp { width: auto; min-width: 180px; }
.sw { position: relative; width: 38px; height: 22px; flex: none; border-radius: 99px; background: rgba(255,255,255,.12); transition: background .2s; }
.sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .2s var(--ease); box-shadow: 0 2px 4px rgba(0,0,0,.3); }
.sw.on { background: var(--acc); }
.sw.on::after { transform: translateX(16px); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 34px; padding: 0 14px; border-radius: 10px; background: rgba(255,255,255,.06); border: 1px solid var(--line); font-weight: 700; font-size: 12px; transition: background .15s, filter .15s, transform .15s; white-space: nowrap; }
.btn:hover { background: rgba(255,255,255,.1); }
.btn:active { transform: translateY(1px); }
.btn.pri { background: linear-gradient(140deg, var(--acc), color-mix(in srgb, var(--acc2) 82%, #000)); border-color: transparent; color: #fff; box-shadow: 0 8px 20px -10px var(--acc); }
.btn.pri:hover { filter: brightness(1.12); }
.btn.ghost { background: none; }
.btn.danger:hover { background: rgba(229,72,77,.15); color: #ff8a8d; }
.btn:disabled { opacity: .45; pointer-events: none; }
.btns { display: flex; gap: 8px; flex-wrap: wrap; }
input[type=range] { accent-color: var(--acc); width: 170px; }
input[type=color] { width: 30px; height: 30px; padding: 0; border: 1px solid var(--line); border-radius: 8px; background: none; cursor: pointer; }
.swatches { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.swatch { width: 24px; height: 24px; border-radius: 8px; background: var(--c); box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); }
.swatch.on { box-shadow: 0 0 0 2px var(--bg-2), 0 0 0 4px var(--c); }
.seg { display: inline-flex; padding: 3px; border-radius: 10px; background: rgba(0,0,0,.25); border: 1px solid var(--line); }
.seg button { height: 28px; padding: 0 12px; border-radius: 7px; font-size: 12px; font-weight: 650; color: var(--tx-2); }
.seg button.on { background: rgba(255,255,255,.09); color: var(--tx); }

/* темы и фоны */
.walls { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.walls.big { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.wall { position: relative; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background: var(--bg-3) center/cover no-repeat; box-shadow: inset 0 0 0 1px var(--line); user-select: none; -webkit-user-drag: none; transition: transform .2s var(--ease), box-shadow .2s; }
.wall:hover { transform: translateY(-2px); }
.wall.loading::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.07) 50%, transparent 70%) 0 0/250% 100%; animation: shimmer 1.4s linear infinite; }
@keyframes shimmer { to { background-position: -150% 0; } }
.wall.on { box-shadow: 0 0 0 2px var(--acc), 0 12px 26px -12px var(--acc); }
.wall .nm { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 10px 8px; font-size: 11.5px; font-weight: 700; background: linear-gradient(transparent, rgba(0,0,0,.8)); display: flex; align-items: center; gap: 7px; }
.wall .nm .muted { margin-left: auto; font-weight: 600; flex: none; white-space: nowrap; }
.wall .nm > span:not(.muted):not(.dotc) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wall .nm .dotc { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.wall .tagc { position: absolute; top: 8px; left: 8px; font-size: 10px; font-weight: 750; letter-spacing: .06em; padding: 3px 7px; border-radius: 6px; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); }
.wall .act { position: absolute; top: 7px; right: 7px; display: flex; gap: 4px; opacity: 0; transition: opacity .15s; }
.wall:hover .act { opacity: 1; }
.wall .act button { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; background: rgba(0,0,0,.6); }
.wall .act button:hover { background: var(--acc); }
.wall.add { display: grid; place-items: center; color: var(--tx-3); border: 1px dashed var(--line-2); box-shadow: none; background: rgba(255,255,255,.02); }
.wall.add:hover { color: var(--tx); border-color: var(--acc); }

/* шаблоны */
.tpl-head { display: flex; gap: 8px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.tpl-head > select { flex: 1 1 200px; min-width: 0; width: auto; }
.tpl-head > .btn { flex: none; white-space: nowrap; }
.tpl-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; }
.tpl-row:hover { background: rgba(255,255,255,.035); }
.tpl-row .t { flex: 1; min-width: 0; }
.tpl-row .t b { font-weight: 650; }
.tpl-row .t small { display: block; color: var(--tx-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag { font: 600 10.5px/1 ui-monospace, Consolas, monospace; color: var(--tx-2); background: rgba(255,255,255,.06); padding: 4px 6px; border-radius: 5px; }
.vars { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.vars button { font: 600 11px/1 ui-monospace, Consolas, monospace; padding: 5px 7px; border-radius: 6px; background: rgba(255,255,255,.06); color: var(--tx-2); }
.vars button:hover { color: var(--tx); background: var(--acc-a); }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.field > span { font-size: 11.5px; color: var(--tx-2); font-weight: 650; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.bb { padding: 12px; background: rgba(0,0,0,.3); border-radius: 10px; font: 12px/1.55 ui-monospace, Consolas, monospace; color: var(--tx-2); white-space: pre-wrap; word-break: break-word; }
.badge-warn { display: inline-flex; gap: 6px; align-items: center; padding: 4px 8px; border-radius: 6px; background: rgba(245,165,36,.14); color: #ffc65c; font-size: 11.5px; font-weight: 650; }
.about { display: flex; flex-direction: column; gap: 12px; color: var(--tx-2); }
.about b { color: var(--tx); }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.pill { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px 0 8px; border-radius: 999px; border: 1px solid var(--line-2); font-weight: 650; font-size: 12px; color: var(--tx-2); }
.pill.on { border-color: color-mix(in srgb, var(--c, var(--acc)) 60%, transparent); background: color-mix(in srgb, var(--c, var(--acc)) 14%, transparent); color: var(--tx); }
.hero { display: flex; gap: 14px; align-items: center; padding: 16px; border-radius: 14px; margin-bottom: 18px; background: radial-gradient(120% 160% at 0% 0%, color-mix(in srgb, var(--acc) 22%, transparent), transparent 55%), rgba(255,255,255,.025); border: 1px solid var(--line); }
.hero .big { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: var(--acc-a); color: var(--acc); flex: none; }
.hero b { font-size: 14px; }
.hero p { margin: 2px 0 0; color: var(--tx-2); }
.hist { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); }
.hist:last-child { border-bottom: 0; }
.hist a { color: var(--acc); text-decoration: none; font-weight: 650; }

/* цвета */
.cprev { border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: #07080b; }
.cp-head { padding: 10px 14px; font-size: 11px; font-weight: 800; letter-spacing: .12em; color: #e6e8ee; transition: background .8s; }
.cp-block { margin: 12px; padding: 14px; border-radius: 10px; border: 1px solid; display: flex; justify-content: space-between; align-items: center; gap: 12px; color: #dfe2e8; transition: background .8s, border-color .8s; }
.cp-btn { padding: 7px 14px; border-radius: 8px; color: #fff; font-weight: 700; font-size: 12px; white-space: nowrap; transition: background .8s; }
.cp-strip { height: 6px; transition: background .8s; }

/* должность */
.roles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.role-card { display: flex; gap: 12px; align-items: flex-start; text-align: left; padding: 14px; border-radius: 14px; border: 1px solid var(--line); background: rgba(255,255,255,.025); transition: border-color .15s, background .15s, transform .15s var(--ease); }
.role-card:hover { border-color: var(--line-2); background: rgba(255,255,255,.05); transform: translateY(-1px); }
.role-card.on { border-color: color-mix(in srgb, var(--acc) 60%, transparent); background: var(--acc-a); }
.role-card .t b, .role-card > b { display: block; font-size: 13.5px; }
.role-card .t small { display: block; color: var(--tx-2); margin-top: 2px; }
.role-card .t em { display: block; font-style: normal; color: var(--tx-3); font-size: 11px; margin-top: 6px; }
.role-lnk { color: var(--acc); cursor: pointer; }
.role-lnk:hover { text-decoration: underline; }
.ag-prev { margin: 2px 0; max-height: 220px; overflow: auto; }
.who { font-size: 11.5px; font-weight: 600; color: var(--tx-3); margin-right: 4px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item .edit { opacity: 0; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: var(--tx-3); }
.item:hover .edit { opacity: 1; }
.item .edit:hover { background: rgba(255,255,255,.08); color: var(--tx); }
.item .hide { opacity: 0; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: var(--tx-3); }
.item:hover .hide { opacity: 1; }
.item .hide:hover { background: rgba(255,255,255,.08); color: var(--tx); }
.toast-act { margin-left: 6px; padding: 5px 10px; border-radius: 8px; background: rgba(255,255,255,.08); font-weight: 700; font-size: 12px; }
.toast-act:hover { background: var(--acc); color: #fff; }
.toast-later { padding: 5px 8px; border-radius: 8px; background: transparent; color: var(--mut, #9aa0ab); font-size: 12px; }
.toast-later:hover { color: inherit; background: rgba(255,255,255,.06); }
.toast-act:hover { background: var(--acc); color: #fff; }
.fxgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; }
.fxbtn { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,.025); font-weight: 650; text-align: left; }
.fxbtn:hover { border-color: var(--line-2); }
.fxbtn.on { border-color: color-mix(in srgb, var(--acc) 60%, transparent); background: var(--acc-a); }

/* уведомления, лаунчер */
.toasts { position: fixed; z-index: 2147483647; right: 18px; bottom: 18px; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.toast { display: flex; align-items: center; gap: 10px; padding: 11px 15px 11px 11px; border-radius: 12px; background: color-mix(in srgb, var(--bg-3) calc(var(--ui-alpha, .96) * 100%), transparent); backdrop-filter: blur(22px) saturate(1.3); -webkit-backdrop-filter: blur(22px) saturate(1.3); box-shadow: var(--sh); font-weight: 650; animation: pop .2s var(--ease); max-width: 400px; }
.launch { position: fixed; z-index: 2147482980; left: 18px; bottom: 18px; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; color: color-mix(in srgb, var(--acc) 75%, #fff); background: color-mix(in srgb, var(--acc) 8%, rgba(12,13,17,.88)); box-shadow: 0 0 0 1px rgba(255,255,255,.06); opacity: .6; transition: opacity .2s, transform .2s var(--ease); }
.launch:hover { opacity: 1; transform: translateY(-1px); }

@media (max-width: 760px) {
  .main { min-height: 0; }
  .row { flex-wrap: wrap; }
  /* переключатели и кнопки над ответами не переносятся по одной в строку */
  .seg { display: flex; flex-wrap: nowrap; max-width: 100%; overflow-x: auto; scrollbar-width: none; }
  .seg button { flex: 1 0 auto; white-space: nowrap; padding: 0 10px; }
  .tpl-head > select { flex-basis: 100%; }
  .tpl-head > .btn { flex: 1 1 auto; justify-content: center; }
  .row select.inp { max-width: 100%; }
  .picker { width: calc(100vw - 20px) !important; }
  .pk-prev { display: none; }
  .pk-list { width: 100%; border-right: 0; }
  .m-body { flex-direction: column; }
  .side { width: auto; border-right: 0; border-bottom: 1px solid var(--line); }
  .side-brand, .side-foot { display: none; }
  .tabs { flex-direction: row; overflow-x: auto; padding: 8px; }
  .tab span { white-space: nowrap; }
  .grid2, .split, .roles { grid-template-columns: 1fr; }
  .facts { display: none; }
  .modal { height: 92vh; }
  .scrim { padding-top: 3vh; }
  .launch { left: 12px; bottom: 14px; width: 40px; height: 40px; border-radius: 12px; }
  .toasts { top: 12px; bottom: auto; right: 12px; left: 12px; align-items: stretch; }
}
`;

/* Тема самого форума: фон, стекло, акцент. Подключается отдельным <style> в <head>. */
// цвета элементов форума, пустое = авто
const COLOR_PARTS = [
    ['accent2', 'Второй акцент', 'Цвет, в который перетекает акцент в градиентах'],
    ['header', 'Шапка форума', 'Верхняя панель и меню'],
    ['blocks', 'Блоки и посты', 'Цвет «стекла» сообщений и списков'],
    ['border', 'Рамки', 'Контуры блоков и постов'],
    ['buttons', 'Кнопки', 'Кнопка «Ответить» и основные кнопки'],
    ['links', 'Ссылки', 'Ссылки в сообщениях']
];
const Colors = {
    get(s, k) {
        const c = s.colors || {},
            a = s.accent;
        if (c[k]) return c[k];
        // без ручной настройки поверхности слегка окрашены в цвета темы
        const a2 = c.accent2 || a;
        return {
            accent2: a,
            header: this.mix('#0b0c11', a, 0.1),
            blocks: this.mix('#0c0d12', a2, 0.07),
            border: this.mix('#ffffff', a2, 0.45),
            buttons: a,
            links: '#6cb4ff'
        }[k];
    },
    // смешать два #rrggbb, t = доля второго
    mix(x, y, t) {
        const p = h => {
            const v = String(h).replace('#', '');
            const f = v.length === 3 ? v.replace(/./g, '$&$&') : v.slice(0, 6);
            const n = parseInt(f, 16);
            return Number.isNaN(n) ? [128, 128, 128] : [n >> 16, (n >> 8) & 255, n & 255];
        };
        const A = p(x),
            B = p(y);
        return (
            '#' +
            A.map((c, i) =>
                Math.round(c + (B[i] - c) * t)
                    .toString(16)
                    .padStart(2, '0')
            ).join('')
        );
    },
    auto(s, k) {
        return !(s.colors || {})[k];
    }
};
function forumCss(s) {
    const t = s.theme,
        a = s.accent,
        C = k => Colors.get(s, k),
        g = (s.colors || {}).gradients !== false;
    const glass = Math.round(t.glass * 100);
    const light = Perf.light();
    const blur =
        t.blur && !light
            ? `backdrop-filter: blur(${t.blur}px) saturate(1.2); -webkit-backdrop-filter: blur(${t.blur}px) saturate(1.2);`
            : '';
    // blur над анимацией пересчитывается каждый кадр, при живом фоне без него
    const w = t.wall || {},
        gen = w.kind === 'gen' && typeof GENERATORS !== 'undefined' && GENERATORS[w.gen];
    const scene =
        w.kind === 'photo' && t.rotate === 'off' && Store.get('photos', []).some(p => p.id === w.id && p.scene);
    const animated =
        (gen && gen.live && t.liveSpeed > 0 && t.rotate === 'off') || scene || (t.fx && t.fx.effect !== 'none');
    const blockBlur = animated ? '' : blur;
    return `
:root { --vd-acc: ${a}; --vd-acc2: ${C('accent2')}; --vd-head: ${C('header')}; --vd-block: ${C('blocks')}; --vd-border: ${C('border')}; --vd-btn: ${C('buttons')}; --vd-link: ${C('links')};
  --vd-glass: color-mix(in srgb, var(--vd-block) ${glass}%, transparent); --vd-line: color-mix(in srgb, var(--vd-border) ${Colors.auto(s, 'border') ? 9 : 40}%, transparent);
  --vd-edge: ${g ? 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--vd-acc) 70%, transparent) 30%, color-mix(in srgb, var(--vd-acc2) 70%, transparent) 70%, transparent)' : 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--vd-acc) 60%, transparent), transparent)'}; }
#vd-wall::after { content: ""; position: absolute; inset: 0; z-index: 2; background: linear-gradient(180deg, rgba(5,6,9,${Math.min(0.95, t.dim + 0.1)}), rgba(5,6,9,${t.dim}) 30%, rgba(5,6,9,${Math.min(0.95, t.dim + 0.15)})); }
${t.grain ? `#vd-wall::before { content: ""; position: absolute; inset: 0; z-index: 3; opacity: .07; background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }` : ''}
/* тёмная подложка под фоном: пока картинка проявляется, не мелькает белое полотно браузера */
html { background: #07080b !important; }
body, .p-pageWrapper, .p-body, .p-body-inner, .uix_pageWrapper--fixed, .p-body-main, .p-body-content, .p-body-pageContent { background: transparent !important; }
body { color: #e4e6eb !important; }
a { transition: color .2s; }
/* выделение текста: плотная заливка и белый текст — видно на любом фоне */
::selection { background: color-mix(in srgb, var(--vd-acc) 78%, #1a1b20) !important; color: #fff !important; -webkit-text-fill-color: #fff !important; text-shadow: none !important; }
::-moz-selection { background: color-mix(in srgb, var(--vd-acc) 78%, #1a1b20) !important; color: #fff !important; text-shadow: none !important; }
/* на html: свойства наследуются, а правило «*» пересчитывалось бы для каждого элемента страницы */
html { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--vd-acc) 55%, transparent) transparent; }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--vd-acc) 50%, transparent); border-radius: 9px; border: 2px solid transparent; background-clip: content-box; }

/* шапка и навигация */
/* меню форума, прилипшее при прокрутке: плотный фон, чтобы темы не просвечивали сквозь надписи */
.p-navSticky.is-sticky, .vd-stuck { background: color-mix(in srgb, var(--vd-head) 96%, #05060a) !important; box-shadow: 0 10px 24px -12px rgba(0,0,0,.85) !important; border-bottom: 1px solid color-mix(in srgb, var(--vd-acc) 30%, transparent) !important; }
.p-navSticky.is-sticky .p-nav, .p-navSticky.is-sticky .p-sectionLinks, .vd-stuck .p-nav, .vd-stuck .p-sectionLinks { background: transparent !important; }
/* верхняя панель модератора: стекло, линия цвета темы, ссылки-плашки */
.p-staffBar { background: color-mix(in srgb, var(--vd-head) 97%, #05060a) !important; border-bottom: 1px solid color-mix(in srgb, var(--vd-acc) 35%, transparent) !important; box-shadow: 0 8px 20px -14px rgba(0,0,0,.8); }
.p-staffBar-inner { min-height: 38px; }
.p-staffBar .p-staffBar-link, .p-staffBar a.p-navgroup-link { border-radius: 8px !important; padding: 5px 10px !important; color: #d6d8de !important; transition: background .15s, color .15s; }
.p-staffBar .p-staffBar-link:hover, .p-staffBar a.p-navgroup-link:hover { background: color-mix(in srgb, var(--vd-acc) 16%, transparent) !important; color: #fff !important; }
.p-staffBar .badge, .p-staffBar .badgeContainer::after { background: var(--vd-acc) !important; color: #fff !important; border-radius: 6px !important; }
.p-header, .p-nav, .p-sectionLinks, .uix_headerContainer {
  background: ${g ? `linear-gradient(90deg, color-mix(in srgb, var(--vd-head) ${glass}%, transparent), color-mix(in srgb, color-mix(in srgb, var(--vd-head) 80%, var(--vd-acc2)) ${glass}%, transparent))` : `color-mix(in srgb, var(--vd-head) ${glass}%, transparent)`} !important;
  ${blur}
}
.p-nav, .p-header { border-bottom: 1px solid var(--vd-line) !important; ${g ? 'border-image: linear-gradient(90deg, transparent, var(--vd-acc), var(--vd-acc2), transparent) 1 !important;' : ''} }
.p-navEl, .p-navEl-link { border-radius: 10px; transition: background .2s, color .2s; }
.p-navEl.is-selected, .p-navEl.is-selected .p-navEl-link, .tabs-tab.is-active {
  color: #fff !important; background: color-mix(in srgb, var(--vd-acc) 18%, transparent) !important; border-bottom-color: transparent !important;
  box-shadow: inset 0 -2px 0 var(--vd-acc) !important;
}
.p-navEl:hover, .p-navEl-link:hover { background: rgba(255,255,255,.06); }

/* заголовок страницы и хлебные крошки */
.p-title-value { color: #fff !important; text-shadow: 0 2px 18px rgba(0,0,0,.55); letter-spacing: .01em; }
.p-breadcrumbs > li > a, .p-breadcrumbs a {
  display: inline-block; padding: 3px 10px; border-radius: 999px; color: #c9ccd4 !important;
  background: rgba(10,11,15,.35); border: 1px solid var(--vd-line); transition: background .2s, color .2s;
}
.p-breadcrumbs a:hover { color: #fff !important; background: color-mix(in srgb, var(--vd-acc) 22%, transparent); }
.p-breadcrumbs > li:after, .p-breadcrumbs > li:before { opacity: .45; }

/* блоки-карточки */
.block-container, .message, .p-footer, .menu-content, .overlay-content, .memberTooltip, .p-body-sidebar .block-container, .blockMessage, .block-filterBar, .uix_extendedFooter {
  background-color: var(--vd-glass) !important;
  ${blockBlur}
}
/* подложки темы форума, иначе поверх стекла серые плашки */
.node-body, .node-main, .node-extra, .node-stats, .node-meta, .structItem-cell, .block-body, .block-row, .block-footer, .blockLink, .contentRow, .alert, .p-footer-inner, .p-footer-row, .p-footer-copyright, .uix_extendedFooter .pageContent, .uix_extendedFooterRow, .uix_extendedFooter .block-body { background-color: transparent !important; }
.blockLink { border-radius: 10px; transition: background .2s, color .2s; }
.blockLink:hover { background-color: color-mix(in srgb, var(--vd-acc) 10%, transparent) !important; }
.blockLink.is-selected { color: #fff !important; background-color: color-mix(in srgb, var(--vd-acc) 16%, transparent) !important; box-shadow: inset 3px 0 0 var(--vd-acc); }
.alert.is-unread, .block-row.is-unread { background-color: color-mix(in srgb, var(--vd-acc) 8%, transparent) !important; }
/* поиск в шапке */
.uix_searchBar input, .uix_searchBarInner, .uix_searchForm, .p-header-search input, input.input--search, input[type="search"] {
  background-color: rgba(8,9,13,.4) !important; border: 1px solid var(--vd-line) !important; border-radius: 12px !important; color: #eef0f4 !important;
}
.block-container, .message, .blockMessage {
  border: 1px solid var(--vd-line) !important; border-radius: 16px !important;
  background-image: var(--vd-edge), radial-gradient(120% 140px at 0 0, color-mix(in srgb, var(--vd-acc) 9%, transparent), transparent), linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0) 120px) !important;
  background-size: 100% 1px, auto, auto !important; background-repeat: no-repeat !important; background-position: top, 0 0, 0 0 !important;
  box-shadow: 0 24px 50px -28px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.05) !important;
}
.block-header, .block-minorHeader, .block-filterBar, .block-tabHeader {
  background: linear-gradient(90deg, color-mix(in srgb, var(--vd-acc) 13%, transparent), color-mix(in srgb, var(--vd-acc2) 4%, transparent) 55%, transparent) !important; border-bottom: 1px solid var(--vd-line) !important; color: #f1f2f5 !important;
  box-shadow: inset 3px 0 0 var(--vd-acc) !important;
}
.block-filterBar { font-size: 11.5px !important; }
/* подвал: у блоков свои значки слева — полоса и отступы не должны на них наезжать */
.uix_extendedFooter .block-minorHeader { box-shadow: none !important; padding-left: 16px !important; padding-right: 16px !important; }
.uix_extendedFooter .block-row, .uix_extendedFooter .blockLink { padding-left: 16px !important; padding-right: 16px !important; }

/* разделы и темы */
.node, .structItem { background: transparent !important; border-color: var(--vd-line) !important; transition: background .2s; }
.node:hover, .structItem:hover { background: color-mix(in srgb, var(--vd-acc) 7%, transparent) !important; }
.node-icon i {
  display: inline-grid !important; place-items: center; width: 42px; height: 42px; border-radius: 13px; font-size: 20px !important; line-height: 1 !important;
  color: color-mix(in srgb, var(--vd-acc) 55%, #fff) !important;
  background: linear-gradient(140deg, color-mix(in srgb, var(--vd-acc) 26%, transparent), color-mix(in srgb, var(--vd-acc2) 12%, transparent)) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--vd-acc) 38%, transparent), 0 8px 22px -10px var(--vd-acc) !important;
}
.node--read .node-icon i { color: #8a8e99 !important; background: rgba(255,255,255,.045) !important; box-shadow: inset 0 0 0 1px rgba(255,255,255,.07) !important; }
.node-title a, .structItem-title a { color: #f3f4f7 !important; font-weight: 700; }
.node-title a:hover, .structItem-title a:hover { color: color-mix(in srgb, var(--vd-acc) 70%, #fff) !important; }
.node-stats, .node-extra-date, .structItem-minor, .structItem-cell--meta, .structItem-cell--latest { color: #a3a7b2 !important; }
.structItem.is-sticky, .structItem--sticky { border-left: 0 !important; box-shadow: inset 3px 0 0 var(--vd-acc); background: color-mix(in srgb, var(--vd-acc) 5%, transparent) !important; }
.structItem.is-unread .structItem-title a, .node--unread .node-title a { text-shadow: 0 0 18px color-mix(in srgb, var(--vd-acc) 35%, transparent); }
.node:hover .node-icon i { transform: translateY(-1px) scale(1.04); transition: transform .25s; }

/* префиксы */
.label {
  --l: #8b8f9a; border-radius: 999px !important; padding: 2px 10px !important; font-weight: 700 !important; letter-spacing: .01em;
  background: color-mix(in srgb, var(--l) 24%, rgba(12,13,17,.55)) !important; color: color-mix(in srgb, var(--l) 35%, #fff) !important;
  border: 1px solid color-mix(in srgb, var(--l) 55%, transparent) !important; box-shadow: 0 0 14px -4px color-mix(in srgb, var(--l) 70%, transparent);
}
.label--red { --l: #ff4b4b; } .label--orange { --l: #ff9a1f; } .label--yellow { --l: #ffd23f; } .label--green, .label--lightGreen { --l: #35d07f; }
.label--olive { --l: #a3c43a; } .label--blue, .label--royalBlue { --l: #4f8dff; } .label--skyBlue { --l: #3fc6ff; } .label--purple { --l: #a970ff; }
.label--gray, .label--silver { --l: #9aa0ab; } .label--primary, .label--accent { --l: var(--vd-acc); }

/* аватары, ники, плашки */
.avatar { border-radius: 50% !important; box-shadow: 0 0 0 2px rgba(255,255,255,.08); }
.message-avatar .avatar, .memberHeader-avatar .avatar { box-shadow: 0 0 0 3px var(--vd-glass), 0 0 0 5px color-mix(in srgb, var(--vd-acc) 75%, transparent), 0 10px 30px -8px color-mix(in srgb, var(--vd-acc) 60%, transparent) !important; }
.userBanner { border-radius: 999px !important; padding: 2px 10px !important; letter-spacing: .04em; box-shadow: 0 6px 16px -8px rgba(0,0,0,.8); }
.userTitle { color: #a8acb7 !important; }

/* посты */
.message-cell--user, .message-userArrow { background: linear-gradient(180deg, color-mix(in srgb, var(--vd-acc) 11%, transparent), color-mix(in srgb, var(--vd-acc2) 4%, transparent) 55%, transparent) !important; border-right: 1px solid var(--vd-line) !important; }
.message-userArrow { display: none !important; }
.message-cell--main, .message-content, .message-inner { background: transparent !important; }
.message-attribution, .message-attribution a { color: #9da1ac !important; border-color: var(--vd-line) !important; }
.message-body, .bbWrapper { color: #e7e9ee; }
.bbWrapper a, .bbWrapper a:visited { color: ${Colors.auto(s, 'links') ? 'color-mix(in srgb, var(--vd-acc) 45%, #8cc4ff)' : 'var(--vd-link)'} !important; }
.bbCodeBlock {
  border-radius: 12px !important; border: 1px solid var(--vd-line) !important; border-left: 3px solid var(--vd-acc) !important;
  background: rgba(8,9,13,.35) !important; overflow: hidden;
}
.bbCodeBlock-title { background: color-mix(in srgb, var(--vd-acc) 10%, transparent) !important; color: #d6d8de !important; font-weight: 700; }
.bbCodeBlock-content { background: transparent !important; }
.message-footer, .message-actionBar, .actionBar-action { color: #9da1ac !important; }
.actionBar-action:hover, .message-footer a:hover { color: color-mix(in srgb, var(--vd-acc) 70%, #fff) !important; }

/* кнопки, пагинация, поля */
.button, a.button, .button.button--link, .pageNav-page, .pageNav-jump {
  border-radius: 10px !important; background: rgba(255,255,255,.06) !important; border: 1px solid var(--vd-line) !important; color: #eef0f4 !important;
  transition: background .2s, transform .2s, box-shadow .2s;
}
.button:hover, .pageNav-page:hover, .pageNav-jump:hover { background: rgba(255,255,255,.11) !important; transform: translateY(-1px); }
.button--primary, .button.button--cta, .pageNav-page--current, .pageNav-page.pageNav-page--current {
  background: ${g ? 'linear-gradient(135deg, var(--vd-btn), var(--vd-acc2))' : 'var(--vd-btn)'} !important; border-color: transparent !important; color: #fff !important;
  box-shadow: 0 10px 24px -10px var(--vd-btn) !important;
}
.input, .fr-box, .fr-toolbar, textarea.input, select.input, .inputGroup .input {
  background-color: rgba(8,9,13,.45) !important; border-color: var(--vd-line) !important; color: #eef0f4 !important;
}
.input, .fr-box { border-radius: 12px !important; }
/* склеенные поля: префикс темы + заголовок, поиск + кнопка */
.inputGroup-text, .inputGroup .inputGroup-text {
  background-color: rgba(8,9,13,.45) !important; border: 1px solid var(--vd-line) !important; color: #eef0f4 !important; border-radius: 12px !important;
}
.inputGroup.inputGroup--joined > * { border-radius: 0 !important; }
.inputGroup.inputGroup--joined > :first-child { border-top-left-radius: 12px !important; border-bottom-left-radius: 12px !important; }
.inputGroup.inputGroup--joined > :last-child { border-top-right-radius: 12px !important; border-bottom-right-radius: 12px !important; }
.inputGroup--joined > .inputGroup-text + .input, .inputGroup--joined > .input + .inputGroup-text { border-left-width: 0 !important; }
.inputGroup-text .label { margin: 0 !important; }
.structItem--quickCreate, .structItem--quickCreate .structItem-cell { background: transparent !important; }
/* без overflow:hidden: иначе выпадающие меню редактора (размер, цвет) обрезаются */
.fr-box .fr-toolbar { border-top-left-radius: 12px !important; border-top-right-radius: 12px !important; }
.block-container > :first-child, .message-inner > :first-child { border-top-left-radius: 16px; border-top-right-radius: 16px; }
.block-container > :last-child { border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; }
.message-cell--user { border-top-left-radius: 16px; border-bottom-left-radius: 16px; }
/* «Поделиться» и прочие блоки после постов не прилипают */
.blockMessage, .block-outer--after, .shareButtons { margin-top: 14px !important; }
/* меню на телефоне (выезжает слева): прозрачное стекло, пункты — кнопки в стиле тем */
.offCanvasMenu-content {
  background: linear-gradient(180deg, color-mix(in srgb, var(--vd-acc) 12%, transparent), transparent 260px), var(--vd-glass) !important;
  backdrop-filter: blur(22px) saturate(1.4) !important; -webkit-backdrop-filter: blur(22px) saturate(1.4) !important;
  border-right: 1px solid var(--vd-line) !important; box-shadow: 18px 0 50px -20px rgba(0,0,0,.8) !important; color: #eef0f4 !important;
}
.offCanvasMenu-header { background: transparent !important; border-bottom: 1px solid var(--vd-line) !important; color: #f1f2f5 !important; font-weight: 700 !important; }
.offCanvasMenu-list, .offCanvasMenu-subList, .offCanvasMenu-link, .offCanvasMenu-installBanner, .offCanvasMenu-row, .offCanvasMenu-separator { background: transparent !important; border-color: transparent !important; color: #e8eaef !important; }
.offCanvasMenu-list { padding: 8px 0 !important; }
.offCanvasMenu-linkHolder {
  margin: 6px 10px !important; border-radius: 12px !important; border: 1px solid var(--vd-line) !important;
  background: rgba(255,255,255,.045) !important; transition: background .2s, border-color .2s;
}
.offCanvasMenu-linkHolder:hover { background: color-mix(in srgb, var(--vd-acc) 12%, rgba(255,255,255,.04)) !important; }
.offCanvasMenu-linkHolder.is-selected { background: color-mix(in srgb, var(--vd-acc) 20%, transparent) !important; border-color: color-mix(in srgb, var(--vd-acc) 55%, transparent) !important; box-shadow: inset 3px 0 0 var(--vd-acc) !important; }
.offCanvasMenu-subList { margin: 0 10px 6px 26px !important; padding: 0 !important; }
.offCanvasMenu-subList .offCanvasMenu-link { margin: 4px 0 !important; padding: 9px 14px !important; border-radius: 10px !important; border: 1px solid var(--vd-line) !important; background: rgba(255,255,255,.03) !important; font-size: .95em; }
.offCanvasMenu-subList .offCanvasMenu-link:hover { background: color-mix(in srgb, var(--vd-acc) 12%, transparent) !important; }
.offCanvasMenu-link i, .offCanvasMenu-link .fa, .offCanvasMenu-link svg, .offCanvasMenu-splitToggle { color: color-mix(in srgb, var(--vd-acc) 60%, #fff) !important; }
.offCanvasMenu-installBanner, .offCanvasMenu-row:last-child { border-top: 1px solid var(--vd-line) !important; }
.offCanvasMenu .button, .offCanvasMenu-installBanner .button {
  background: color-mix(in srgb, var(--vd-acc) 85%, #000) !important; border: 0 !important; border-radius: 12px !important; color: #fff !important; font-weight: 700 !important;
  box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--vd-acc) 80%, transparent) !important;
}
.offCanvasMenu-backdrop { background: rgba(0,0,0,.35) !important; }
/* телефон: карточки ровно по краям, текст не прилипает к рамке, блоки боковой колонки не налезают друг на друга */
@media (max-width: 760px) {
  .block-container, .blockMessage, .shareButtons { margin-left: 0 !important; margin-right: 0 !important; }
  .p-body-sidebar .block, .p-body-sidebar .uix_sidebarInner > .block { margin: 0 0 12px !important; }
  .p-body-sidebar .block-container { overflow: hidden; }
  .block-minorHeader, .block-header { margin: 0 !important; padding-left: 16px !important; padding-right: 16px !important; }
  .p-body-sidebar .block-body { padding: 0 !important; }
  .p-body-sidebar .block-row, .p-body-sidebar .block-footer { padding-left: 16px !important; padding-right: 16px !important; }
  .p-body-sidebar .block-row { padding-top: 10px !important; padding-bottom: 12px !important; }
  .p-body-sidebar .blockLink { padding: 10px 16px !important; margin: 0 !important; border-radius: 0 !important; }
  .p-body-sidebar .block-body > .blockLink + .blockLink { border-top: 1px solid var(--vd-line) !important; }
  .shareButtons { padding: 12px 16px !important; border-radius: 16px !important; }
  .block-outer, .block-outer--after { padding-left: 0 !important; padding-right: 0 !important; }
  /* место внизу под кнопки «наверх» и VERDICT */
  .p-footer { padding-bottom: 70px !important; }
  body { padding-bottom: 72px !important; }
}
.fr-toolbar { background: rgba(255,255,255,.03) !important; }
.input:focus, .fr-box.fr-focus, .input.is-focused { border-color: color-mix(in srgb, var(--vd-acc) 70%, transparent) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--vd-acc) 22%, transparent) !important; }

/* меню и подсказки */
.menu-content, .overlay-content, .memberTooltip, .tooltip-content, .menu-content .menu-row, .menu-content .menu-header, .menu-content .menu-footer { background-color: color-mix(in srgb, var(--vd-block) ${Math.round(t.menuGlass * 100)}%, transparent) !important; }
.menu-content, .overlay-content, .memberTooltip, .tooltip-content { ${light || animated ? '' : 'backdrop-filter: blur(18px) saturate(1.3) !important; -webkit-backdrop-filter: blur(18px) saturate(1.3) !important;'} border-radius: 14px !important; border: 1px solid var(--vd-line) !important; box-shadow: 0 30px 60px -20px rgba(0,0,0,.85) !important; }
.menu-header { background: color-mix(in srgb, var(--vd-acc) 12%, transparent) !important; }
.menu-linkRow:hover, .menu-row:hover { background: color-mix(in srgb, var(--vd-acc) 12%, transparent) !important; }

${
    light
        ? `/* экономный режим: без больших теней */
.block-container, .message, .blockMessage { box-shadow: none !important; }
.node-icon i, .message-avatar .avatar, .memberHeader-avatar .avatar { box-shadow: none !important; }`
        : ''
}
/* подвал */
.p-footer { border-top: 1px solid var(--vd-line) !important; border-radius: 0 !important; background-image: var(--vd-edge) !important; background-size: 100% 1px !important; background-repeat: no-repeat !important; }
`;
}

// один разобранный лист стилей на все теневые корни (панели, окно настроек, автограф), а не копия в каждом
let uiSheet = null;
function uiStyles(root) {
    try {
        if (!uiSheet) {
            uiSheet = new CSSStyleSheet();
            uiSheet.replaceSync(UI_CSS);
        }
        root.adoptedStyleSheets = [uiSheet];
        return '';
    } catch {
        return `<style>${UI_CSS}</style>`;
    }
}

// «VERDICT Логи»: аналитика по IP и устройствам на logs.blackrussia.online и кнопка «Проверить по логам» в профиле форума.
// Работает только рядом с VERDICT и только у тех, кому разработчик поставил «да» в листе «Доступ к логам»
const ON_LOGS = location.hostname === 'logs.blackrussia.online';
// кто работает: ответ VERDICT (id доступа, ник на форуме, цвета) и ник на сайте логов
const CTX = { info: null, logsNick: '' };
const API_PAGE = 50;

// ── связь с VERDICT: без него скрипт не запускается
function findVerdict(wait = 5000) {
    return new Promise(resolve => {
        let done = false;
        const fin = v => {
            if (done) return;
            done = true;
            document.removeEventListener('verdict:pong', pong);
            document.removeEventListener('verdict:ready', ping);
            resolve(v);
        };
        const pong = e => {
            try {
                fin(JSON.parse(e.detail));
            } catch {
                /* чужое событие */
            }
        };
        const ping = () => document.dispatchEvent(new CustomEvent('verdict:ping'));
        document.addEventListener('verdict:pong', pong);
        document.addEventListener('verdict:ready', ping);
        ping();
        // VERDICT мог ещё не загрузиться: спрашиваем ещё пару раз
        setTimeout(ping, 1200);
        setTimeout(ping, 3000);
        setTimeout(() => fin(null), wait);
    });
}

// ── запрос к почте разработчика (та же таблица, лист «Доступ к логам»)
function mailCall(body) {
    return new Promise((res, rej) => {
        if (!BRAND.dev.mail || typeof GM_xmlhttpRequest !== 'function') return rej(new Error('нет связи с разработчиком'));
        GM_xmlhttpRequest({
            method: 'POST',
            url: BRAND.dev.mail,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            data: JSON.stringify(body),
            timeout: 30000,
            onload: r => {
                let j = null;
                try {
                    j = JSON.parse(r.responseText);
                } catch {
                    /* не JSON */
                }
                if (!j) return rej(new Error('сервер не ответил'));
                if (j.error) return rej(new Error(j.error));
                res(j);
            },
            onerror: () => rej(new Error('нет связи')),
            ontimeout: () => rej(new Error('сервер долго не отвечает'))
        });
    });
}

const Access = {
    // ответ сервера держим 5 минут; без связи — сутки, если доступ уже был
    async check(info, logsNick) {
        const c = Store.get('access', null);
        if (c && c.lid === info.lid && Date.now() - c.at < 5 * 60e3 && (!logsNick || c.logsNick === logsNick)) return c;
        try {
            const r = await mailCall({ action: 'logs', lid: info.lid, nick: info.nick || '', logsNick: logsNick || '', v: BRAND.version });
            const out = { lid: info.lid, allowed: !!r.allowed, state: r.state, code: r.code, at: Date.now(), logsNick: logsNick || (c && c.logsNick) || '' };
            Store.set('access', out);
            return out;
        } catch (e) {
            if (c && c.lid === info.lid && c.allowed && Date.now() - c.at < 864e5) return c;
            return { allowed: false, state: 'error', why: e.message, code: info.lid.slice(0, 8).toUpperCase() };
        }
    }
};

// ── слой интерфейса (те же стили, что у VERDICT)
const Layer = {
    _root: null,
    root() {
        if (this._root && this._root.host.isConnected) return this._root;
        const host = document.createElement('div');
        host.id = 'vdl-layer';
        document.documentElement.appendChild(host);
        this._root = host.attachShadow({ mode: 'open' });
        this._root.innerHTML = `${uiStyles(this._root)}<style>${LOGS_UI_CSS}</style><div class="v-root"><div class="toasts"></div></div>`;
        return this._root;
    },
    el() {
        return this.root().querySelector('.v-root');
    },
    add(node) {
        this.el().appendChild(node);
        return node;
    },
    accent(info) {
        const el = this.el();
        el.style.setProperty('--acc', info.accent || '#e5484d');
        el.style.setProperty('--acc-a', U.hexA(info.accent || '#e5484d', 0.16));
        el.style.setProperty('--acc2', info.accent2 || '#3aa0ff');
        el.style.setProperty('--ui-alpha', info.menuGlass ?? 0.4);
    }
};

function toast(text, kind = 'ok') {
    const map = { ok: ['check', '#2fbf71'], err: ['x', '#e5484d'], info: ['spark', 'var(--acc)'] };
    const [ic, c] = map[kind] || map.ok;
    const t = U.h(`<div class="toast"><span class="vic" style="--c:${c}">${icon(ic, 13)}</span><span>${U.esc(text)}</span></div>`);
    Layer.root().querySelector('.toasts').appendChild(t);
    setTimeout(() => {
        t.style.transition = 'opacity .3s';
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, kind === 'err' ? 5000 : 2600);
}

const LOGS_UI_CSS = `
.vdl-card { position: fixed; right: 18px; bottom: 18px; z-index: 2147483000; width: 340px; max-width: calc(100vw - 36px); }
.vdl-card .card { padding: 14px 16px; box-shadow: 0 18px 40px -16px rgba(0,0,0,.8); }
.vdl-card b { color: var(--tx); }
.vdl-code { font: 700 15px/1 ui-monospace, Consolas, monospace; letter-spacing: .08em; padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,.07); border: 1px solid var(--line); color: var(--tx); user-select: all; }
.vdl-fab { position: fixed; left: 18px; bottom: 18px; z-index: 2147483000; display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 999px;
  background: linear-gradient(135deg, var(--acc), color-mix(in srgb, var(--acc) 55%, var(--acc2))); color: #fff; font-weight: 750; font-size: 13px; box-shadow: 0 10px 26px -10px color-mix(in srgb, var(--acc) 80%, transparent); }
.vdl-fab:hover { filter: brightness(1.08); transform: translateY(-1px); }
.modal.vdl { width: min(860px, 100%); }
.vdl-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
.vdl-form .inp { flex: 1 1 220px; height: 36px; }
.vdl-prog { font-size: 12px; color: var(--tx-3); margin: 6px 0 10px; min-height: 16px; }
.vdl-sum { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.vdl-sum .k { padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,.03); }
.vdl-sum .k small { display: block; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--tx-3); }
.vdl-sum .k b { font-size: 20px; color: var(--acc); }
.vdl-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; padding: 9px 4px; border-bottom: 1px solid var(--line); }
.vdl-row:last-child { border-bottom: 0; }
.vdl-row .main { min-width: 0; }
.vdl-row .ttl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-weight: 700; color: var(--tx); }
.vdl-row .sub { font-size: 11.5px; color: var(--tx-3); margin-top: 3px; }
.vdl-mono { font-family: ui-monospace, Consolas, monospace; }
.vdl-tag { font-size: 10.5px; font-weight: 750; padding: 2px 7px; border-radius: 999px; background: color-mix(in srgb, var(--c, var(--acc)) 18%, transparent); color: color-mix(in srgb, var(--c, var(--acc)) 75%, #fff); border: 1px solid color-mix(in srgb, var(--c, var(--acc)) 35%, transparent); }
.vdl-more { margin: 6px 0 4px 14px; padding-left: 12px; border-left: 2px solid color-mix(in srgb, var(--acc) 45%, transparent); }
.vdl-more .vdl-row { padding: 6px 2px; }
.vdl-btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.vdl-btns .btn { height: 28px; font-size: 12px; padding: 0 10px; }
@media (max-width: 760px) { .vdl-sum { grid-template-columns: repeat(2, 1fr); } .vdl-row { grid-template-columns: 1fr; } .vdl-btns { justify-content: flex-start; } }
`;

// ── API сайта логов: те же запросы, что делает сама страница, с твоим входом
const Api = {
    last: 0,
    order: '-time',
    server() {
        const m = location.pathname.match(/\/gslogs\/(\d+)/);
        return m ? m[1] : Store.get('server', '');
    },
    async page(params, offset) {
        // сайт ограничивает частые запросы
        const wait = 1100 - (Date.now() - this.last);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        this.last = Date.now();
        const q = new URLSearchParams(params);
        q.set('order_by', this.order);
        q.set('offset', String(offset));
        q.set('auto', 'false');
        const r = await fetch(`/gslogs/${this.server()}/api/list-game-logs/?${q}`, { credentials: 'include' });
        if (r.status === 401 || r.status === 403) throw new Error('сайт логов не пускает — войди заново');
        if (!r.ok) {
            // сортировку «сначала новые» сайт может не принимать — тогда по возрастанию
            if (this.order === '-time') {
                this.order = 'time';
                return this.page(params, offset);
            }
            throw new Error('сайт логов ответил ' + r.status);
        }
        const d = await r.json();
        if (!Array.isArray(d)) throw new Error('сайт логов ответил не списком');
        return d;
    },
    async all(params, maxPages, onPage) {
        const out = [];
        for (let i = 0; i < maxPages; i++) {
            const d = await this.page(params, i * API_PAGE);
            out.push(...d);
            if (onPage) onPage(i + 1, out.length);
            if (d.length < API_PAGE) break;
        }
        return out;
    },
    range(days) {
        const end = new Date();
        return { time__gte: new Date(end - days * 864e5).toISOString(), time__lte: end.toISOString() };
    }
};

// ── сведения об IP: страна, город, провайдер (ipwho.is), кэш на неделю
const Geo = {
    MOBILE: /mts|mobile ?telesystems|megafon|beeline|vimpelcom|tele2|t2 mobile|yota|mobile|lte|motiv|win mobile|volna/i,
    HOST: /hosting|host|cloud|vpn|proxy|data ?cent|server|ovh|hetzner|digitalocean|amazon|aws|google|microsoft|azure|selectel|timeweb|aeza|vdsina|m247|datacamp|choopa|vultr|linode|akamai|contabo|leaseweb|g-core|gcore|cloudflare|oracle|alibaba|ihor|firstbyte|beget|reg\.ru|netcup|scaleway/i,
    _wait: new Map(),
    get(ip) {
        const all = Store.get('geo', {});
        const hit = all[ip];
        if (hit && Date.now() - hit.at < 7 * 864e5) return Promise.resolve(hit);
        if (this._wait.has(ip)) return this._wait.get(ip);
        const p = new Promise(res => {
            if (typeof GM_xmlhttpRequest !== 'function') return res(null);
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://ipwho.is/${encodeURIComponent(ip)}?lang=ru`,
                timeout: 12000,
                onload: r => {
                    let j = null;
                    try {
                        j = JSON.parse(r.responseText);
                    } catch {
                        /* пусто */
                    }
                    if (!j || j.success === false) return res(null);
                    const c = j.connection || {};
                    const isp = c.isp || c.org || '';
                    const g = {
                        at: Date.now(),
                        flag: (j.flag && j.flag.emoji) || '',
                        country: j.country || '',
                        city: j.city || j.region || '',
                        isp,
                        asn: c.asn ? 'AS' + c.asn : '',
                        mobile: this.MOBILE.test(isp + ' ' + (c.org || '')),
                        host: this.HOST.test(isp + ' ' + (c.org || '') + ' ' + (c.domain || ''))
                    };
                    const all2 = Store.get('geo', {});
                    all2[ip] = g;
                    const keys = Object.keys(all2).sort((a, b) => all2[b].at - all2[a].at);
                    keys.slice(400).forEach(k => delete all2[k]);
                    Store.set('geo', all2);
                    res(g);
                },
                onerror: () => res(null),
                ontimeout: () => res(null)
            });
        }).finally(() => this._wait.delete(ip));
        this._wait.set(ip, p);
        return p;
    },
    html(g) {
        if (!g) return '<span class="sub">сведения об IP недоступны</span>';
        const tags = [];
        if (g.host) tags.push('<span class="vdl-tag" style="--c:#e5484d">хостинг / VPN?</span>');
        else if (g.mobile) tags.push('<span class="vdl-tag" style="--c:#3aa0ff">мобильный</span>');
        return `${U.esc(g.flag)} ${U.esc([g.country, g.city].filter(Boolean).join(', '))} · ${U.esc(g.isp || 'провайдер неизвестен')}${g.asn ? ' · ' + U.esc(g.asn) : ''} ${tags.join(' ')}`;
    }
};

// ── разбор записей
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const DEV_RE = /APPMDID:\s*([A-Za-z0-9+/=_-]{6,})/i;
function fmtDate(t) {
    const d = new Date(t);
    return isNaN(d) ? '' : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function group(rows, keyOf) {
    const m = new Map();
    rows.forEach(r => {
        const k = keyOf(r);
        if (!k) return;
        const t = new Date(r.time).getTime() || 0;
        const g = m.get(k) || { k, n: 0, first: t, last: t, ids: new Set() };
        g.n++;
        g.first = Math.min(g.first, t);
        g.last = Math.max(g.last, t);
        if (r.player_id) g.ids.add(String(r.player_id));
        m.set(k, g);
    });
    return [...m.values()].sort((a, b) => b.n - a.n || b.last - a.last);
}
const devOf = r => {
    const m = String(r.transaction_desc || '').match(DEV_RE);
    return m ? m[1] : '';
};
const sameNick = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

// ── окно аналитики
const Panel = {
    open(mode = 'nick', value = '') {
        if (this.scrim) this.scrim.remove();
        this.days = this.days || Store.get('days', 30);
        const scrim = (this.scrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal vdl">
            <div class="m-head"><span class="vic" style="--c:var(--acc);width:34px;height:34px;border-radius:10px">${icon('shield', 16)}</span>
              <div><div class="m-title">Аналитика по IP</div><div class="m-sub">Сервер ${U.esc(Api.server() || '?')} · данные с сайта логов под твоим входом</div></div>
              <span style="flex:1"></span><button class="btn" data-a="mail" title="Идея, ошибка или вопрос разработчику">${icon('chat', 14)}Разработчику</button><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="vdl-form">
                <div class="seg" data-g="mode"><button data-v="nick">Игрок</button><button data-v="ip">IP</button><button data-v="dev">Устройство</button></div>
                <input class="inp" data-a="q" placeholder="">
                <div class="seg" data-g="days"><button data-v="7">7 дн.</button><button data-v="30">30 дн.</button><button data-v="90">90 дн.</button></div>
                <button class="btn pri" data-a="go">${icon('search', 14)}Проверить</button>
              </div>
              <div class="vdl-prog"></div>
              <div class="vdl-out"></div>
            </div></div></div>`)
        ));
        const close = () => {
            scrim.remove();
            this.scrim = null;
        };
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        const q = scrim.querySelector('[data-a="q"]');
        const setMode = m => {
            this.mode = m;
            scrim.querySelectorAll('[data-g="mode"] button').forEach(b => b.classList.toggle('on', b.dataset.v === m));
            q.placeholder = { nick: 'Ник: Ivan_Ivanov', ip: 'IP: 95.57.212.23', dev: 'APPMDID устройства' }[m];
        };
        const setDays = d => {
            this.days = d;
            Store.set('days', d);
            scrim.querySelectorAll('[data-g="days"] button').forEach(b => b.classList.toggle('on', +b.dataset.v === d));
        };
        scrim.querySelectorAll('[data-g="mode"] button').forEach(b => (b.onclick = () => setMode(b.dataset.v)));
        scrim.querySelectorAll('[data-g="days"] button').forEach(b => (b.onclick = () => setDays(+b.dataset.v)));
        setMode(mode);
        setDays(this.days);
        q.value = value;
        const go = () => {
            const v = q.value.trim();
            if (!v) return q.focus();
            if (this.mode === 'nick') this.byNick(v);
            else if (this.mode === 'ip') this.byIp(v);
            else this.byDev(v);
        };
        scrim.querySelector('[data-a="go"]').onclick = go;
        scrim.querySelector('[data-a="mail"]').onclick = () => Feedback.open();
        q.addEventListener('keydown', e => e.key === 'Enter' && go());
        if (value) go();
        else setTimeout(() => q.focus(), 50);
    },
    prog(t) {
        if (this.scrim) this.scrim.querySelector('.vdl-prog').textContent = t;
    },
    out(html) {
        const o = this.scrim && this.scrim.querySelector('.vdl-out');
        if (o) o.innerHTML = html;
        return o;
    },
    async run(fn) {
        if (this.busy) return toast('Подожди, предыдущая проверка ещё идёт', 'info');
        this.busy = true;
        try {
            await fn();
        } catch (e) {
            this.prog('');
            this.out(`<div class="card" style="padding:14px">${icon('x', 14)} Не получилось: ${U.esc(e.message)}</div>`);
        } finally {
            this.busy = false;
        }
    },

    // все подключения игрока: с каких IP и устройств он заходил
    byNick(nick) {
        return this.run(async () => {
            const base = Object.assign({ player_name__exact: nick }, Api.range(this.days));
            this.prog('Читаю подключения игрока…');
            let rows = await Api.all(Object.assign({ category_id__exact: 38 }, base), 10, (p, n) => this.prog(`Подключения: страница ${p}, записей ${n}…`));
            let note = '';
            // подключений не нашлось — IP есть у любой записи игрока
            if (!rows.length) {
                rows = await Api.all(base, 4, (p, n) => this.prog(`Все записи игрока: страница ${p}, записей ${n}…`));
                note = 'Подключений за период нет — IP взяты из остальных записей игрока.';
            }
            this.prog('');
            const ips = group(rows, r => r.player_ip),
                devs = group(rows, devOf);
            this.report = { kind: 'nick', nick, days: this.days, ips, devs, related: new Map() };
            const ids = [...new Set(rows.map(r => r.player_id).filter(Boolean))];
            const o = this.out(`
              <div class="vdl-sum">
                <div class="k"><small>Записей</small><b>${rows.length}</b></div>
                <div class="k"><small>IP-адресов</small><b>${ips.length}</b></div>
                <div class="k"><small>Устройств</small><b>${devs.length}</b></div>
                <div class="k"><small>ID игрока</small><b style="font-size:15px">${U.esc(ids.join(', ') || '—')}</b></div>
              </div>
              ${note ? `<div class="muted" style="font-size:12px;margin-bottom:10px">${U.esc(note)}</div>` : ''}
              <div class="sec"><h4>IP-адреса игрока</h4><div class="card" data-l="ips">${ips.length ? '' : '<div class="vdl-row"><div class="main sub">Нет записей за период</div></div>'}</div></div>
              <div class="sec"><h4>Устройства (APPMDID)</h4><div class="card" data-l="devs">${devs.length ? '' : '<div class="vdl-row"><div class="main sub">В подключениях нет APPMDID</div></div>'}</div></div>
              <div class="btns" style="margin-top:12px"><span style="flex:1"></span><button class="btn" data-a="copy">${icon('download', 14)}Скопировать отчёт</button></div>`);
            const li = o.querySelector('[data-l="ips"]');
            ips.slice(0, 30).forEach(g => li.appendChild(this.ipRow(g, nick)));
            const ld = o.querySelector('[data-l="devs"]');
            devs.slice(0, 15).forEach(g => ld.appendChild(this.devRow(g, nick)));
            o.querySelector('[data-a="copy"]').onclick = () => this.copy();
        });
    },

    // кто заходил с IP: возможные твинки
    byIp(ip, into, except) {
        return this.run(async () => {
            if (!IP_RE.test(ip)) throw new Error('это не IP-адрес');
            const rows = await this.ipRows(ip, (p, n) => this.prog(`IP ${ip}: страница ${p}, записей ${n}…`));
            this.prog('');
            const nicks = group(rows, r => r.player_name);
            if (into) return this.fillMore(into, nicks, except, 'IP', ip);
            this.report = { kind: 'ip', ip, days: this.days, nicks };
            const o = this.out(`
              <div class="card" style="padding:12px 14px;margin-bottom:12px"><div class="ttl"><span class="vdl-mono">${U.esc(ip)}</span></div><div class="sub" data-geo>определяю провайдера…</div></div>
              <div class="vdl-sum">
                <div class="k"><small>Записей</small><b>${rows.length}</b></div>
                <div class="k"><small>Аккаунтов</small><b>${nicks.length}</b></div>
                <div class="k"><small>Устройств</small><b>${group(rows, devOf).length}</b></div>
                <div class="k"><small>Период</small><b style="font-size:15px">${this.days} дн.</b></div>
              </div>
              <div class="sec"><h4>Аккаунты с этого IP</h4><div class="card" data-l="nicks"></div></div>
              <div class="btns" style="margin-top:12px"><span style="flex:1"></span><button class="btn" data-a="copy">${icon('download', 14)}Скопировать отчёт</button></div>`);
            Geo.get(ip).then(g => {
                const el = o.querySelector('[data-geo]');
                if (el) el.innerHTML = Geo.html(g);
                this.report.geo = g;
            });
            const l = o.querySelector('[data-l="nicks"]');
            if (!nicks.length) l.innerHTML = '<div class="vdl-row"><div class="main sub">С этого IP за период никто не заходил</div></div>';
            nicks.forEach(g => l.appendChild(this.nickRow(g)));
            o.querySelector('[data-a="copy"]').onclick = () => this.copy();
        });
    },

    // аккаунты с одного устройства — самый сильный признак твинка
    byDev(dev, into, except) {
        return this.run(async () => {
            const rows = await Api.all(
                Object.assign({ category_id__exact: 38, transaction_desc__ilike: `%${dev}%` }, Api.range(this.days)),
                6,
                (p, n) => this.prog(`Устройство: страница ${p}, записей ${n}…`)
            );
            this.prog('');
            const nicks = group(rows.filter(r => devOf(r) === dev), r => r.player_name);
            if (into) return this.fillMore(into, nicks, except, 'устройство', dev);
            this.report = { kind: 'dev', dev, days: this.days, nicks };
            const o = this.out(`
              <div class="vdl-sum"><div class="k"><small>Записей</small><b>${rows.length}</b></div><div class="k"><small>Аккаунтов</small><b>${nicks.length}</b></div></div>
              <div class="sec"><h4>Аккаунты с этого устройства</h4><div class="card" data-l="nicks"></div></div>`);
            const l = o.querySelector('[data-l="nicks"]');
            if (!nicks.length) l.innerHTML = '<div class="vdl-row"><div class="main sub">Ничего не нашлось</div></div>';
            nicks.forEach(g => l.appendChild(this.nickRow(g)));
        });
    },

    // поиск по IP: имя параметра у сайта не описано — пробуем точное, затем «содержит», и проверяем, что фильтр сработал
    async ipRows(ip, onPage) {
        for (const key of ['player_ip__exact', 'player_ip__ilike', 'player_ip']) {
            const params = Object.assign({ category_id__exact: 38, [key]: ip }, Api.range(this.days));
            const first = await Api.page(params, 0);
            if (first.length && first.some(r => r.player_ip && r.player_ip !== ip)) continue;
            if (first.length < API_PAGE) return first;
            const rest = await Api.all(params, 10, onPage);
            return rest;
        }
        throw new Error('сайт логов не дал искать по IP');
    },

    ipRow(g, nick) {
        const r = U.h(`<div><div class="vdl-row">
          <div class="main"><div class="ttl"><span class="vdl-mono">${U.esc(g.k)}</span><span class="vdl-tag">${g.n} ${plural(g.n, 'вход', 'входа', 'входов')}</span></div>
            <div class="sub">${fmtDate(g.first)} — ${fmtDate(g.last)} · <span data-geo>…</span></div></div>
          <div class="vdl-btns"><button class="btn" data-a="who">${icon('search', 13)}Кто ещё с этого IP</button></div>
        </div><div class="vdl-more" hidden></div></div>`);
        Geo.get(g.k).then(x => {
            g.geo = x;
            const el = r.querySelector('[data-geo]');
            if (el) el.innerHTML = Geo.html(x);
        });
        r.querySelector('[data-a="who"]').onclick = e => {
            e.currentTarget.disabled = true;
            this.byIp(g.k, r.querySelector('.vdl-more'), nick);
        };
        return r;
    },
    devRow(g, nick) {
        const r = U.h(`<div><div class="vdl-row">
          <div class="main"><div class="ttl"><span class="vdl-mono">${U.esc(g.k.length > 28 ? g.k.slice(0, 28) + '…' : g.k)}</span><span class="vdl-tag" style="--c:#a970ff">${g.n} ${plural(g.n, 'вход', 'входа', 'входов')}</span></div>
            <div class="sub">${fmtDate(g.first)} — ${fmtDate(g.last)}</div></div>
          <div class="vdl-btns"><button class="btn" data-a="who">${icon('search', 13)}Кто ещё с устройства</button></div>
        </div><div class="vdl-more" hidden></div></div>`);
        r.querySelector('[data-a="who"]').onclick = e => {
            e.currentTarget.disabled = true;
            this.byDev(g.k, r.querySelector('.vdl-more'), nick);
        };
        return r;
    },
    nickRow(g) {
        const r = U.h(`<div class="vdl-row">
          <div class="main"><div class="ttl">${U.esc(g.k)}<span class="vdl-tag">${g.n} ${plural(g.n, 'вход', 'входа', 'входов')}</span>${g.ids.size ? `<span class="sub">ID ${U.esc([...g.ids].join(', '))}</span>` : ''}</div>
            <div class="sub">${fmtDate(g.first)} — ${fmtDate(g.last)}</div></div>
          <div class="vdl-btns"><button class="btn" data-a="nick">${icon('eye', 13)}Разобрать игрока</button></div></div>`);
        r.querySelector('[data-a="nick"]').onclick = () => this.open('nick', g.k);
        return r;
    },
    fillMore(box, nicks, except, what, key) {
        box.hidden = false;
        const others = nicks.filter(x => !sameNick(x.k, except));
        if (this.report && this.report.related) this.report.related.set(what + ' ' + key, others.map(x => x.k));
        box.innerHTML = others.length
            ? `<div class="sub" style="margin:2px 0 4px"><span class="vdl-tag" style="--c:#f5a524">возможные твинки: ${others.length}</span></div>`
            : `<div class="sub" style="margin:4px 0">С этого ${what === 'IP' ? 'IP' : 'устройства'} за ${this.days} дн. заходил только ${U.esc(except)}</div>`;
        others.forEach(g => box.appendChild(this.nickRow(g)));
    },

    // отчёт текстом — вставить в жалобу, обсуждение или передать другому
    copy() {
        const r = this.report;
        if (!r) return;
        const L = [];
        if (r.kind === 'nick') {
            L.push(`Игрок ${r.nick} — подключения за ${r.days} дн. (сервер ${Api.server()})`);
            L.push(`IP-адресов: ${r.ips.length}, устройств: ${r.devs.length}`);
            r.ips.slice(0, 15).forEach(g =>
                L.push(`• ${g.k} — ${g.n} вх., ${fmtDate(g.first)}–${fmtDate(g.last)}${g.geo ? ` · ${[g.geo.country, g.geo.city].filter(Boolean).join(', ')} · ${g.geo.isp}${g.geo.host ? ' (хостинг/VPN?)' : ''}` : ''}`)
            );
            if (r.related.size) {
                L.push('Другие аккаунты:');
                r.related.forEach((list, k) => list.length && L.push(`• ${k}: ${list.join(', ')}`));
            }
        } else if (r.kind === 'ip') {
            L.push(`IP ${r.ip} — за ${r.days} дн. (сервер ${Api.server()})${r.geo ? ` · ${[r.geo.country, r.geo.city].filter(Boolean).join(', ')} · ${r.geo.isp}` : ''}`);
            r.nicks.forEach(g => L.push(`• ${g.k} — ${g.n} вх., ${fmtDate(g.first)}–${fmtDate(g.last)}`));
        }
        navigator.clipboard.writeText(L.join('\n')).then(
            () => toast('Отчёт скопирован'),
            () => toast('Не удалось скопировать', 'err')
        );
    }
};

function plural(n, one, few, many) {
    const a = Math.abs(n) % 100,
        b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
}

// ── обращение разработчику: приходит в ту же таблицу с пометкой «VERDICT Логи»
const Feedback = {
    async open() {
        const scrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal sm">
            <div class="m-head"><span class="vic" style="--c:var(--acc);width:34px;height:34px;border-radius:10px">${icon('chat', 16)}</span>
              <div><div class="m-title">Написать разработчику</div><div class="m-sub">VERDICT Логи · ответ появится здесь же</div></div>
              <span style="flex:1"></span><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="seg" data-g="kind" style="margin-bottom:10px"><button data-v="idea" class="on">Идея</button><button data-v="bug">Ошибка</button><button data-v="other">Другое</button></div>
              <input class="inp" data-a="t" placeholder="Коротко о чём" maxlength="100" style="width:100%;margin-bottom:8px">
              <textarea class="inp" data-a="b" rows="5" placeholder="Подробности. Ники и IP игроков сюда не пиши без нужды" style="width:100%;resize:vertical"></textarea>
              <div class="btns" style="margin-top:10px"><span style="flex:1"></span><button class="btn pri" data-a="send">${icon('chat', 14)}Отправить</button></div>
              <div class="sec" style="margin-top:14px"><h4>Мои обращения</h4><div class="card" data-l="mine"><div class="vdl-row"><div class="main sub">Загружаю…</div></div></div></div>
            </div></div></div>`)
        );
        const close = () => scrim.remove();
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        let kind = 'idea';
        scrim.querySelectorAll('[data-g="kind"] button').forEach(
            b =>
                (b.onclick = () => {
                    kind = b.dataset.v;
                    scrim.querySelectorAll('[data-g="kind"] button').forEach(x => x.classList.toggle('on', x === b));
                })
        );
        scrim.querySelector('[data-a="send"]').onclick = async e => {
            const title = scrim.querySelector('[data-a="t"]').value.trim(),
                text = scrim.querySelector('[data-a="b"]').value.trim();
            if (text.length < 3) return toast('Напиши, о чём обращение', 'err');
            e.currentTarget.disabled = true;
            try {
                await mailCall({
                    action: 'send',
                    src: 'logs',
                    uid: CTX.info.lid,
                    lid: CTX.info.lid,
                    nick: CTX.logsNick || CTX.info.nick || '',
                    logsNick: CTX.logsNick,
                    kind,
                    title: title || text.slice(0, 60),
                    text,
                    diag: `VERDICT Логи ${BRAND.version} · VERDICT ${CTX.info.v} · сервер ${Api.server() || '?'}`
                });
                toast('Отправлено разработчику');
                close();
            } catch (err) {
                toast(err.message, 'err');
                e.currentTarget.disabled = false;
            }
        };
        const box = scrim.querySelector('[data-l="mine"]');
        try {
            const r = await mailCall({ action: 'mine', uid: CTX.info.lid });
            const items = (r.items || []).slice().reverse();
            box.innerHTML = items.length ? '' : '<div class="vdl-row"><div class="main sub">Пока ничего не отправлял</div></div>';
            items.forEach(m => {
                const row = U.h(`<div class="vdl-row"><div class="main"><div class="ttl">${U.esc(m.title || 'Без темы')}</div>
                  <div class="sub">${U.esc(fmtDate(m.at))}${m.replies && m.replies.length ? '' : ' · ответа пока нет'}</div>
                  ${(m.replies || []).map(x => `<div class="card" style="padding:8px 10px;margin-top:6px;font-size:12.5px"><b>Разработчик:</b> ${U.esc(x.text)}</div>`).join('')}</div></div>`);
                box.appendChild(row);
            });
        } catch (err) {
            box.innerHTML = `<div class="vdl-row"><div class="main sub">Не загрузилось: ${U.esc(err.message)}</div></div>`;
        }
    }
};

// ── сайт логов: кнопки у IP и ников в таблице, плавающая кнопка, ссылка с форума (#vd-nick=…)
const LogsPage = {
    start(info) {
        const srv = Api.server();
        if (srv) Store.set('server', srv);
        Layer.accent(info);
        const fab = Layer.add(U.h(`<button class="vdl-fab" title="Аналитика по IP, нику и устройству">${icon('shield', 15)}Аналитика IP</button>`));
        fab.onclick = () => Panel.open();
        const st = document.createElement('style');
        st.textContent = `.vdl-mini { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 6px; vertical-align: middle; border-radius: 6px; border: 1px solid color-mix(in srgb, ${info.accent || '#e5484d'} 45%, transparent); background: color-mix(in srgb, ${info.accent || '#e5484d'} 16%, transparent); color: #fff; font-size: 11px; cursor: pointer; opacity: .75; }
.vdl-mini:hover { opacity: 1; background: ${info.accent || '#e5484d'}; }`;
        document.head.appendChild(st);
        const deco = U.debounce(() => this.decorate(), 200);
        new MutationObserver(deco).observe(document.body, { childList: true, subtree: true });
        this.decorate();
        this.fromHash();
        addEventListener('hashchange', () => this.fromHash());
    },
    fromHash() {
        const m = location.hash.match(/^#vd-(nick|ip|dev)=(.+)$/);
        if (!m) return;
        const v = decodeURIComponent(m[2]);
        history.replaceState(null, '', location.pathname + location.search);
        // ник с форума может не совпадать с игровым: подставляем, а запускаем сразу только ник вида Имя_Фамилия
        if (m[1] === 'nick' && !/^[A-Za-z]+_[A-Za-z]+$/.test(v)) Panel.open('nick', '') || (Panel.scrim.querySelector('[data-a="q"]').value = v);
        else Panel.open(m[1], v);
    },
    decorate() {
        document.querySelectorAll('td').forEach(td => {
            if (td.dataset.vdl) return;
            const t = td.textContent.trim();
            let mode = '';
            if (IP_RE.test(t)) mode = 'ip';
            else if (td.classList.contains('td-player-name') && /^[A-Za-z0-9]+_[A-Za-z0-9]+$/.test(t)) mode = 'nick';
            if (!mode) return;
            td.dataset.vdl = '1';
            const b = document.createElement('span');
            b.className = 'vdl-mini';
            b.title = mode === 'ip' ? 'Кто ещё заходил с этого IP' : 'IP и устройства игрока';
            b.textContent = '⌕';
            b.onclick = e => {
                e.preventDefault();
                e.stopPropagation();
                Panel.open(mode, t);
            };
            td.appendChild(b);
        });
    }
};

// ── профиль на форуме: кнопка «Проверить по логам»
const Profile = {
    start() {
        const wait = () => {
            const box = document.querySelector('.memberHeader-buttons');
            const name = document.querySelector('.memberHeader-name .username, .memberHeader h1 .username');
            if (!box || !name) return false;
            if (box.querySelector('.vdl-prof')) return true;
            const nick = name.textContent.trim();
            const a = document.createElement('a');
            a.className = 'button button--link vdl-prof';
            a.href = '#';
            a.title = 'Открыть сайт логов: IP-адреса, устройства и возможные твинки этого игрока';
            a.innerHTML = `<span class="button-text" style="display:inline-flex;align-items:center;gap:6px">${icon('shield', 14)}Проверить по логам</span>`;
            a.onclick = e => {
                e.preventDefault();
                let srv = Store.get('server', '');
                if (!srv || e.shiftKey) {
                    srv = (prompt('Номер сервера на сайте логов (например 49):', srv || '') || '').trim();
                    if (!/^\d{1,3}$/.test(srv)) return;
                    Store.set('server', srv);
                }
                window.open(`https://logs.blackrussia.online/gslogs/${srv}/#vd-nick=${encodeURIComponent(nick)}`, '_blank', 'noopener');
            };
            const srv = Store.get('server', '');
            a.title += srv ? ` · сервер ${srv} (Shift+клик — сменить)` : '';
            box.prepend(a);
            return true;
        };
        if (wait()) return;
        const mo = new MutationObserver(() => wait() && mo.disconnect());
        mo.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => mo.disconnect(), 15000);
    }
};

// ── окно «нет доступа» / «нужен VERDICT»
function notice(title, text, code) {
    const card = Layer.add(
        U.h(`<div class="vdl-card"><div class="card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span class="vic" style="--c:var(--acc)">${icon('lock', 13)}</span><b>${U.esc(title)}</b><span style="flex:1"></span><button class="icon-btn" data-a="x">${icon('x', 14)}</button></div>
        <div class="muted" style="font-size:12.5px;line-height:1.5">${text}</div>
        ${code ? `<div style="display:flex;align-items:center;gap:8px;margin-top:10px"><span class="vdl-code">${U.esc(code)}</span><button class="btn" data-a="cp">${icon('download', 13)}Копировать</button></div>` : ''}
      </div></div>`)
    );
    card.querySelector('[data-a="x"]').onclick = () => card.remove();
    const cp = card.querySelector('[data-a="cp"]');
    if (cp) cp.onclick = () => navigator.clipboard.writeText(code).then(() => toast('Код скопирован'));
}

async function main() {
    const info = await findVerdict();
    if (!info) {
        // на форуме молчим (VERDICT могли выключить), на логах — подсказываем
        if (ON_LOGS)
            notice('Нужен VERDICT', '«VERDICT Логи» работает только вместе с основным скриптом VERDICT. Установи или включи его в Tampermonkey и обнови страницу.');
        return;
    }
    Layer.accent(info);
    if (!info.lid) return ON_LOGS && notice('Нужен VERDICT', 'Обнови VERDICT до последней версии — эта не умеет работать с «VERDICT Логи».');
    const logsNick = ON_LOGS ? ((document.body.textContent.match(/Выйти\s*\[([^\]]{2,40})\]/) || [])[1] || '') : '';
    CTX.info = info;
    CTX.logsNick = logsNick;
    const acc = await Access.check(info, logsNick);
    if (!acc.allowed) {
        if (!ON_LOGS) return;
        if (acc.state === 'no') return notice('Доступ закрыт', 'Разработчик закрыл тебе «VERDICT Логи».');
        if (acc.state === 'error') return notice('Не проверить доступ', `Нет связи с разработчиком: ${U.esc(acc.why || '')}. Попробуй обновить страницу позже.`, acc.code);
        return notice('Доступ не выдан', 'Отправь этот код разработчику. Как только он откроет доступ, обнови страницу (до пары минут).', acc.code);
    }
    if (ON_LOGS) LogsPage.start(info);
    else Profile.start();
    // доступ закрыли, пока страница открыта — интерфейс убирается без перезагрузки
    setInterval(async () => {
        const a = await Access.check(info, logsNick);
        if (a.allowed) return;
        document.querySelectorAll('.vdl-mini, .vdl-prof').forEach(x => x.remove());
        const host = document.getElementById('vdl-layer');
        if (host) host.remove();
        Layer._root = null;
        if (ON_LOGS && a.state !== 'error') notice('Доступ закрыт', 'Разработчик закрыл тебе «VERDICT Логи».');
    }, 5 * 60e3 + 5000);
}

U.ready(() => main().catch(e => console.warn('VERDICT Логи:', e)));

})();
