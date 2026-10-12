// ==UserScript==
// @name         VERDICT Логи
// @namespace    verdict.br.logs
// @version      1.2.0
// @description  Аналитика по игроку (IP, устройства, платформа, сессии, деньги, трейды), подсчёт админ-действий для кураторов, подсветка повторов, просмотр трейдов на logs.blackrussia.online. Работает вместе с VERDICT.
// @author       Максим Паль!?
// @match        https://logs.blackrussia.online/*
// @match        https://forum.blackrussia.online/*
// @updateURL    https://raw.githubusercontent.com/Jeredpoi/BRr-Logs/main/verdict-logs.meta.js
// @downloadURL  https://raw.githubusercontent.com/Jeredpoi/BRr-Logs/main/verdict-logs.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      ipwho.is
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
'use strict';
// ==UserScript==
// @name         VERDICT Логи
// @namespace    verdict.br.logs
// @version      1.2.0
// @description  Аналитика по игроку (IP, устройства, платформа, сессии, деньги, трейды), подсчёт админ-действий для кураторов, подсветка повторов, просмотр трейдов на logs.blackrussia.online. Работает вместе с VERDICT.
// @author       Максим Паль!?
// @match        https://logs.blackrussia.online/*
// @match        https://forum.blackrussia.online/*
// @updateURL    https://raw.githubusercontent.com/Jeredpoi/BRr-Logs/main/verdict-logs.meta.js
// @downloadURL  https://raw.githubusercontent.com/Jeredpoi/BRr-Logs/main/verdict-logs.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      ipwho.is
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @run-at       document-end
// @noframes
// ==/UserScript==

const VERSION = '1.2.0';
const MAIL = 'https://script.google.com/macros/s/AKfycbytX0c4kEDYpUj_6-gMYPcuMeTQr79idfeeR0RTe3jd0StcKkJ-DGAaPppysbUx7aLmUA/exec';
const BRAND = { version: VERSION, dev: { mail: MAIL } };

const Store = {
    get(k, d) {
        try {
            const v = GM_getValue('vl.' + k);
            return v === undefined ? d : JSON.parse(v);
        } catch {
            return d;
        }
    },
    set(k, v) {
        GM_setValue('vl.' + k, JSON.stringify(v));
    }
};

const U = {
    esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    h(html) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
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
    hexA(hex, a) {
        const m = String(hex).replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : hex;
    }
};

const ICONS = {
    shield: '<path d="M12 3l7 3v5.5c0 4.3-2.9 7.6-7 9.5-4.1-1.9-7-5.2-7-9.5V6z"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chat: '<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    bot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/><circle cx="12" cy="3.5" r="1"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'
};
const icon = (n, s = 16) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

const BASE_CSS = `
:host { all: initial; }
.v-root { --acc: #e5484d; --acc2: #3aa0ff; --tx: #eceef2; --tx-2: #b9bcc6; --tx-3: #8b8f9a; --line: rgba(255,255,255,.08); font: 13px/1.45 Inter, "Segoe UI", system-ui, sans-serif; color: var(--tx); }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
input, textarea { font: inherit; color: inherit; }
.scrim { position: fixed; inset: 0; z-index: 2147483001; display: grid; place-items: center; padding: 16px; background: rgba(4,5,9,.55); backdrop-filter: blur(5px); }
.modal { width: min(560px, 100%); max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 18px; overflow: hidden;
  background: rgba(16,17,23,.96); border: 1px solid var(--line); box-shadow: 0 30px 80px -24px #000; }
.m-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.m-title { font-weight: 750; font-size: 15px; }
.m-sub { font-size: 11.5px; color: var(--tx-3); }
.pane { overflow: auto; padding: 16px; }
.card { border-radius: 14px; border: 1px solid var(--line); background: rgba(255,255,255,.03); padding: 4px 12px; }
.sec h4 { margin: 14px 0 8px; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--tx-3); }
.muted { color: var(--tx-3); }
.vic { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; flex: none; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 13px; border-radius: 10px; font-weight: 650; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.06); white-space: nowrap; }
.btn:hover { background: rgba(255,255,255,.12); }
.btn:disabled { opacity: .5; cursor: default; }
.btn.pri { background: var(--acc); color: #fff; border-color: transparent; }
.btns { display: flex; align-items: center; gap: 8px; }
.icon-btn { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; color: var(--tx-2); }
.icon-btn:hover { background: rgba(255,255,255,.08); color: #fff; }
.inp { height: 36px; padding: 0 12px; border-radius: 10px; background: rgba(0,0,0,.32); border: 1px solid rgba(255,255,255,.1); outline: none; }
textarea.inp { height: auto; padding: 9px 12px; }
.inp:focus { border-color: var(--acc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 22%, transparent); }
.seg { display: inline-flex; gap: 3px; padding: 3px; border-radius: 10px; background: rgba(0,0,0,.28); border: 1px solid var(--line); }
.seg button { height: 28px; padding: 0 11px; border-radius: 7px; font-size: 12px; font-weight: 650; color: var(--tx-2); white-space: nowrap; }
.seg button.on { background: rgba(255,255,255,.1); color: #fff; }
.toasts { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 2147483002; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.toast { display: flex; align-items: center; gap: 10px; padding: 9px 14px 9px 9px; border-radius: 12px; background: rgba(16,17,23,.96); border: 1px solid var(--line); box-shadow: 0 14px 30px -12px #000; }
`;
const uiStyles = () => `<style>${BASE_CSS}</style>`;

const ON_LOGS = location.hostname === 'logs.blackrussia.online';
const CTX = { info: null, logsNick: '' };
const API_PAGE = 50;

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
        setTimeout(ping, 1200);
        setTimeout(ping, 3000);
        setTimeout(() => fin(null), wait);
    });
}

function gmReq(o) {
    return new Promise(res =>
        GM_xmlhttpRequest(
            Object.assign({ anonymous: true, timeout: 30000 }, o, {
                onload: r => res({ ok: true, r }),
                onerror: e => res({ ok: false, why: (e && e.error) || 'нет связи' }),
                ontimeout: () => res({ ok: false, why: 'сервер долго не отвечает' })
            })
        )
    );
}

const asJson = t => {
    try {
        return JSON.parse(t);
    } catch {
        return null;
    }
};

async function mailCall(body, withCookies) {
    if (!BRAND.dev.mail || typeof GM_xmlhttpRequest !== 'function') throw new Error('нет связи с разработчиком');
    const a = await gmReq({
        method: 'POST',
        url: BRAND.dev.mail,
        anonymous: !withCookies,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        data: JSON.stringify(body)
    });
    if (!a.ok) throw new Error(a.why);
    let j = asJson(a.r.responseText);
    if (!j) {
        const t = String(a.r.responseText || '');
        const hop = (t.match(/https:\/\/script\.googleusercontent\.com\/[^"'\s<>]+/) || [])[0];
        if (hop) {
            const b = await gmReq({ method: 'GET', url: hop.replace(/&amp;/g, '&'), anonymous: !withCookies });
            if (b.ok) j = asJson(b.r.responseText);
        }
        // доступ к почте может быть «все с аккаунтом Google» — тогда без cookies не пустит
        if (!j && !withCookies) return mailCall(body, true);
        if (!j) {
            const what = /accounts\.google\.com|ServiceLogin/i.test(t + a.r.finalUrl)
                ? 'Google просит войти'
                : /<html|<!doctype/i.test(t)
                  ? 'пришла страница вместо ответа'
                  : 'пустой ответ';
            const id = (BRAND.dev.mail.match(/\/s\/(.{6})/) || [])[1] || '?';
            throw new Error(`сервер не ответил (${a.r.status}, ${what}; v${VERSION}, адрес ${id}…)`);
        }
    }
    if (j.error) throw new Error(j.error);
    return j;
}

const Access = {
    async check(info, logsNick, fresh) {
        const c = Store.get('access', null);
        if (!fresh && c && c.lid === info.lid && Date.now() - c.at < 5 * 60e3 && (!logsNick || c.logsNick === logsNick)) return c;
        try {
            const r = await mailCall({ action: 'logs', fresh: !!fresh, lid: info.lid, nick: info.nick || '', logsNick: logsNick || '', v: BRAND.version });
            const out = { lid: info.lid, allowed: !!r.allowed, state: r.state, code: r.code, at: Date.now(), logsNick: logsNick || (c && c.logsNick) || '' };
            Store.set('access', out);
            return out;
        } catch (e) {
            if (c && c.lid === info.lid && c.allowed && Date.now() - c.at < 6 * 3600e3 && (!logsNick || c.logsNick === logsNick)) return c;
            return { allowed: false, state: 'error', why: e.message, code: info.lid.slice(0, 8).toUpperCase() };
        }
    }
};

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
    // главные окна (Аналитика, Админ-действия, Боты) при закрытии прячутся: открыл снова — всё на месте
    mains() {
        return [typeof Panel !== 'undefined' && Panel.scrim, typeof AdminView !== 'undefined' && AdminView.scrim, typeof BotView !== 'undefined' && BotView.scrim].filter(Boolean);
    },
    hide(scrim) {
        if (scrim) scrim.hidden = true;
    },
    // показать спрятанное окно поверх остальных
    show(scrim) {
        this.closeModals();
        scrim.hidden = false;
        this.el().appendChild(scrim);
    },
    // ни одного «висящего» затемнения: перед открытием окна убираем прежние (главные — прячем).
    // hard — убрать совсем (доступ закрыли)
    closeModals(hard) {
        const keep = hard ? [] : this.mains();
        this.el()
            .querySelectorAll('.scrim')
            .forEach(x => (keep.includes(x) ? (x.hidden = true) : x.remove()));
        if (!hard) {
            if (typeof TradeView !== 'undefined') TradeView.scrim = null;
            if (typeof AdminView !== 'undefined') AdminView.cfgScrim = null;
            if (typeof BotView !== 'undefined') BotView.cfgScrim = null;
            return;
        }
        if (typeof Panel !== 'undefined') {
            Panel.scrim = null;
            Panel._gen = (Panel._gen || 0) + 1;
        }
        if (typeof TradeView !== 'undefined') TradeView.scrim = null;
        if (typeof AdminView !== 'undefined') {
            AdminView.scrim = AdminView.cfgScrim = null;
            AdminView._gen = (AdminView._gen || 0) + 1;
        }
        if (typeof BotView !== 'undefined') {
            BotView.scrim = BotView.cfgScrim = null;
            BotView._gen = (BotView._gen || 0) + 1;
        }
    },
    accent(info) {
        const el = this.el();
        el.style.setProperty('--acc', info.accent || '#e5484d');
        el.style.setProperty('--acc-a', U.hexA(info.accent || '#e5484d', 0.16));
        el.style.setProperty('--acc2', info.accent2 || '#3aa0ff');
        el.style.setProperty('--ui-alpha', info.menuGlass ?? 0.4);
    }
};

// клик по нику копирует его
// клик по элементу копирует текст (берётся свежий на момент клика — сайт переиспользует ячейки)
function copyText(el, get, what) {
    el.style.cursor = 'copy';
    el.title = `Нажми — скопировать ${what}`;
    el._vdlGet = get;
    if (el._vdlCopyT) return;
    el._vdlCopyT = true;
    el.addEventListener('click', e => {
        if (typeof LogsPage !== 'undefined' && LogsPage.off) return;
        const v = String(el._vdlGet() || '').trim();
        if (!v || v === '–' || v === '-') return;
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(v).then(
            () => toast(`Скопировано: ${v}`),
            () => toast('Не удалось скопировать', 'err')
        );
    });
}
// суммы в тексте записи: «добавил 110000 рублей» → «110 000 рублей» (номера трейдов, ID и прочее не трогаем)
function moneyText(s) {
    const sp = n => n.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return String(s ?? '')
        .replace(/(^|[^\d.#№\w])(-?\d{4,})(?=\s*(?:руб|р\.|р(?![а-яё])|\$|долл|вирт))/gi, (m, a, n) => a + sp(n))
        .replace(/(\$\s?)(\d{4,})(?!\d)/g, (m, a, n) => a + sp(n));
}
// что админ сделал игроку: вид наказания, срок и причина — из текста записи
// \b в JS не видит русские буквы — границы слова для кириллицы задаём сами
const RW = w => new RegExp(`(^|[^а-яёa-z0-9])(${w})($|[^а-яёa-z0-9])`, 'i');
const ACTIONS = [
    [/снял (наказание|бан|мут|деморган|варн|блокировк|предупрежд|джайл|jail)|снятие наказ/i, 'снятие наказания'],
    [/\bunwarn/i, 'снятие предупреждения'],
    [/unfreeze|разморозил/i, 'разморозка'],
    [/разбан|\bunban/i, 'разбан'],
    [/размут|\bunmute/i, 'размут'],
    [/unjail|выпустил|освободил/i, 'выпуск из деморгана'],
    [/разблокир|\bunblock/i, 'разблокировка'],
    [/заблокир|блокировк/i, 'блокировка'],
    [/\bs?ban\b|забан|banned/i, 'бан'],
    [RW('бан|бана|баном'), 'бан'],
    [/\bmute\b|замут|заглуш/i, 'мут'],
    [RW('мут|мута|мутом'), 'мут'],
    [/jail|деморган|тюрьм/i, 'деморган'],
    [RW('кпз'), 'деморган'],
    [/\bwarn\b|варн|предупрежд/i, 'предупреждение'],
    [/\bkick\b|кикнул/i, 'кик'],
    [RW('кик'), 'кик'],
    [/freeze|заморозил/i, 'заморозка'],
    [/телепорт|\/tp\b|\bgoto\b|gethere/i, 'телепорт'],
    [/\bspec\b|слежк|наблюд/i, 'слежка'],
    [/\bslap\b/i, 'slap'],
    [/выдал|\/give\b|\/set(hp|arm)/i, 'выдача']
];
function actionOf(desc, admin) {
    const t = String(desc || '');
    const hit = ACTIONS.find(([re]) => re.test(t));
    const dur = t.match(/(\d+)\s*(минут[аы]?|мин\.?|min|час(?:ов|а)?|ч\.?|д(?:ень|ня|ней)|дн\.?|д\.|days?|сут(?:ок|ки)?)(?![а-яёa-z])/i);
    const why = t.match(/(?:причин[аеуы]?|reason)\s*[:-]?\s*([^,;)\]]{2,40}?)\s*\.?\s*(?:$|[,;)\]])|\s[—–-]\s*([^,;)\]]{2,40}?)\s*\.?\s*$/i);
    if (!hit) return moneyText(t.replace(new RegExp(String(admin || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/\s+/g, ' ').trim()).slice(0, 90);
    // причина без повтора вида наказания и срока
    let reason = why ? (why[1] || why[2]).trim() : '';
    if (reason && dur && reason.replace(/\s+/g, '') === dur[0].replace(/\s+/g, '')) reason = '';
    return [hit[1], dur ? `${dur[1]} ${dur[2].replace(/\.$/, '')}` : '', reason].filter(Boolean).join(' · ');
}
// название категории, которой нет в списке: по самым частым словам её записей («Продал машину»)
function guessCat(id, rows) {
    const cnt = new Map();
    rows.forEach(r => {
        if (String(r.category_id) !== String(id)) return;
        const w = String(r.transaction_desc || '')
            .replace(/\[[^\]]*\]/g, ' ')
            .replace(NICK_RE, ' ')
            .replace(/[\d.,:;()"«»#№+$%/\\-]+/g, ' ')
            .split(/\s+/)
            .filter(x => x.length > 2 && !/^(руб\S*|рубл\S*|долл\S*|вирт\S*|игрок[ауе]?|для|при|без)$/i.test(x))
            .slice(0, 3)
            .join(' ');
        if (w) cnt.set(w, (cnt.get(w) || 0) + 1);
    });
    let best = '',
        n = 0;
    cnt.forEach((v, k) => v > n && ((n = v), (best = k)));
    return best ? best[0].toUpperCase() + best.slice(1) : '';
}
// подпись категории в списках: название или «≈ угаданное (#id)»
function catLabel(id, rows) {
    if (id === 'none' || id === '' || id == null) return { name: 'Без категории', known: true };
    const n = catName({ category_id: id });
    if (!/^Категория #/.test(n)) return { name: n, known: true };
    const g = guessCat(id, rows);
    return { name: g ? `≈ ${g} (#${id})` : n, known: false };
}

// безымянная категория админ-действий: по тому, что в ней делают («Бан, мут · #36»), иначе по частым словам
function catTitle(id, rows) {
    const n = catName({ category_id: id });
    if (!/^Категория #/.test(n)) return n;
    const own = (rows || []).filter(r => String(r.category_id) === String(id));
    const kinds = new Map();
    own.forEach(r => {
        const h = ACTIONS.find(([re]) => re.test(String(r.transaction_desc || '')));
        if (h) kinds.set(h[1], (kinds.get(h[1]) || 0) + 1);
    });
    const top = [...kinds]
        .sort((x, y) => y[1] - x[1])
        .filter(([, c]) => c >= own.length * 0.2)
        .slice(0, 2)
        .map(([k]) => k);
    if (top.length) {
        const t = top.join(', ');
        return `${t[0].toUpperCase()}${t.slice(1)} · #${id}`;
    }
    const g = guessCat(id, own);
    return g ? `${g} · #${id}` : n;
}

function copyNick(el, nick) {
    el.style.cursor = 'copy';
    el.title = 'Нажми — скопировать ник';
    // сайт может переиспользовать ячейку под другую строку — ник берём свежий, обработчик один
    el._vdlNick = nick;
    if (el._vdlCopy) return;
    el._vdlCopy = true;
    el.addEventListener('click', e => {
        // ячейку отдали под другой текст (не ник) или доступ закрыли — ссылка работает как обычно
        const nick = el._vdlNick;
        if (!nick || (typeof LogsPage !== 'undefined' && LogsPage.off)) return;
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(nick).then(
            () => toast('Ник скопирован: ' + nick),
            () => toast('Не удалось скопировать', 'err')
        );
    });
}

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
.vdl-tv-row { display: grid; grid-template-columns: 160px auto 1fr; gap: 14px; align-items: center; padding: 10px 2px; border-bottom: 1px solid var(--line); }
.vdl-tv-row:last-child { border-bottom: 0; }
.vdl-tv-row .who { font-weight: 700; color: color-mix(in srgb, var(--acc) 70%, #fff); overflow: hidden; text-overflow: ellipsis; }
.vdl-tv-row .tm { font-family: ui-monospace, Consolas, monospace; font-size: 11.5px; color: #ffb454; background: color-mix(in srgb, #ffb454 12%, transparent); border: 1px solid color-mix(in srgb, #ffb454 30%, transparent); border-radius: 6px; padding: 3px 8px; white-space: nowrap; justify-self: start; }
.vdl-tv-row .ds { font-size: 12.5px; color: var(--tx); }
.vdl-mrow { display: flex; align-items: center; gap: 12px; padding: 10px 2px; border-bottom: 1px solid var(--line); }
.vdl-mrow:last-child { border-bottom: 0; }
.vdl-mrow input[type=color] { width: 34px; height: 28px; padding: 0; border: 1px solid var(--line); border-radius: 7px; background: none; cursor: pointer; }
.vdl-mrow .nm { flex: 1; font-weight: 650; }
@media (max-width: 700px) { .vdl-tv-row { grid-template-columns: 1fr; gap: 4px; } }
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
.vdl-hours { display: grid; grid-template-columns: repeat(24, 1fr); gap: 3px; align-items: end; height: 70px; padding: 10px 2px 4px; }
.vdl-hours i { display: block; border-radius: 3px 3px 1px 1px; background: color-mix(in srgb, var(--acc) 70%, transparent); min-height: 3px; }
.vdl-hours i.z { background: rgba(255,255,255,.07); }
.vdl-hours-l { display: grid; grid-template-columns: repeat(4, 1fr) auto; font-size: 10.5px; color: var(--tx-3); padding: 0 2px 8px; }
.vdl-bar { display: grid; grid-template-columns: minmax(120px, 220px) 1fr minmax(54px, auto); gap: 10px; align-items: center; padding: 6px 2px; font-size: 12.5px; }
.vdl-bar .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--tx-2); }
.vdl-bar .tr { height: 8px; border-radius: 99px; background: rgba(255,255,255,.06); overflow: hidden; }
.vdl-bar .tr b { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--acc), color-mix(in srgb, var(--acc) 50%, var(--acc2))); }
.vdl-bar .n { text-align: right; font-weight: 700; color: var(--tx); }
.vdl-money { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
.vdl-money .k { padding: 9px 11px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,.03); }
.vdl-money .k small { display: block; font-size: 10.5px; color: var(--tx-3); }
.vdl-money .k b { display: block; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vdl-money .k b + small { margin-top: 2px; }
.vdl-pos { color: #3ecf8e; } .vdl-neg { color: #ff6b6b; }
.vdl-tabs { display: flex; width: 100%; margin: 4px 0 2px; }
.vdl-presets .btn.on { background: color-mix(in srgb, var(--acc) 30%, transparent); border-color: color-mix(in srgb, var(--acc) 50%, transparent); color: #fff; }
.vdl-filter { width: 100%; margin-bottom: 8px; }
.vdl-desc { white-space: normal; overflow-wrap: anywhere; line-height: 1.45; }
.vdl-desc mark { background: color-mix(in srgb, #f5a524 40%, transparent); color: #fff; border-radius: 3px; padding: 0 2px; }
.vdl-nick { cursor: copy; }
.vdl-botrow.is-bot { box-shadow: inset 3px 0 0 #e5484d; padding-left: 10px; }
.vdl-more-btn { margin-top: 3px; padding: 0; font-size: 11.5px; color: var(--acc2); background: none; cursor: pointer; }
.vdl-more-btn:hover { text-decoration: underline; }
.vdl-bar .nm.guess { display: flex; align-items: center; gap: 4px; font-style: italic; color: var(--tx-3); }
.vdl-bar .nm .t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vdl-ren { flex: none; }
.vdl-ren { margin-left: 4px; padding: 0 5px; border-radius: 6px; font-size: 11px; color: var(--tx-2); background: rgba(255,255,255,.07); cursor: pointer; }
.vdl-ren:hover { background: var(--acc); color: #fff; }
.vdl-catex { display: flex; align-items: center; gap: 8px; margin: -2px 2px 8px; padding-left: 2px; font-size: 11.5px; color: var(--tx-3); }
.vdl-catex .ex { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vdl-catex .btn { height: 26px; padding: 0 9px; font-size: 11.5px; }
.vdl-date { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx-3); }
.vdl-date .inp { flex: none; width: 150px; color-scheme: dark; }
.vdl-presets { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: -4px 0 6px; }
.vdl-presets .btn { height: 28px; padding: 0 10px; font-size: 12px; }
.vdl-chk { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx-2); cursor: pointer; }
.vdl-chk input { width: 15px; height: 15px; }
.scrim[hidden] { display: none !important; }
/* галочки — в цвет темы, а не белые квадраты браузера */
input[type="checkbox"] { appearance: none; -webkit-appearance: none; flex: none; margin: 0; width: 18px; height: 18px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,.22); background: rgba(0,0,0,.28); display: inline-grid; place-content: center; cursor: pointer; transition: background .15s, border-color .15s, box-shadow .15s; }
input[type="checkbox"]:hover { border-color: color-mix(in srgb, var(--acc) 70%, transparent); }
input[type="checkbox"]:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 30%, transparent); }
input[type="checkbox"]:checked { background: var(--acc); border-color: var(--acc); }
input[type="checkbox"]::after { content: ""; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg) scale(0); margin-top: -2px; transition: transform .12s; }
input[type="checkbox"]:checked::after { transform: rotate(45deg) scale(1); }
.vdl-presets .vdl-chk { margin-left: auto; }
.vdl-tabs button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; font-size: 12.5px; }
.vdl-bar .tr b.vdl-pos { background: linear-gradient(90deg, #2fbf71, #3ecf8e); }
.vdl-bar .tr b.vdl-neg { background: linear-gradient(90deg, #e5484d, #ff6b6b); }
.vdl-bar .n.vdl-pos, .vdl-bar .n.vdl-neg { white-space: nowrap; }
@media (max-width: 700px) { .vdl-sum, .vdl-money { grid-template-columns: repeat(2, 1fr); } .vdl-bar { grid-template-columns: 1fr 1fr 44px; } }
.vdl-btns .btn { height: 28px; font-size: 12px; padding: 0 10px; }
@media (max-width: 760px) { .vdl-sum { grid-template-columns: repeat(2, 1fr); } .vdl-row { grid-template-columns: 1fr; } .vdl-btns { justify-content: flex-start; } }
`;

const Api = {
    last: 0,
    mine: new Set(),
    order: '-time',
    server() {
        const m = location.pathname.match(/\/gslogs\/(\d+)/);
        return m ? m[1] : Store.get('server', '');
    },
    page(params, offset) {
        const p = (this._q || Promise.resolve()).then(() => this._page(params, offset));
        this._q = p.catch(() => {});
        return p;
    },
    async _page(params, offset, retried) {
        const wait = 1100 - (Date.now() - this.last);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        this.last = Date.now();
        const q = new URLSearchParams(params);
        q.set('order_by', this.order);
        q.set('offset', String(offset));
        q.set('auto', 'false');
        const url = new URL(`/gslogs/${this.server()}/api/list-game-logs/?${q}`, location.href).href;
        this.mine.add(url);
        // запрос не висит вечно: иначе встанет вся очередь
        const ctl = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = ctl && setTimeout(() => ctl.abort(), 30000);
        let r;
        try {
            r = await fetch(url, { credentials: 'include', signal: ctl ? ctl.signal : undefined });
        } catch (e) {
            clearTimeout(timer);
            throw new Error(e && e.name === 'AbortError' ? 'сайт логов долго не отвечает' : 'нет связи с сайтом логов');
        }
        if (!r.ok) clearTimeout(timer);
        if (r.status === 401 || r.status === 403) throw new Error('сайт логов не пускает — войди заново');
        if (!r.ok) {
            // сбой сайта — одна повторная попытка с той же сортировкой
            if ((r.status >= 500 || r.status === 429) && !retried) {
                await new Promise(res => setTimeout(res, 1500));
                return this._page(params, offset, true);
            }
            // сайт не понял сортировку «сначала новые» — меняем только на первой странице, чтобы не смешать порядок посреди листания
            if (r.status >= 400 && r.status < 500 && this.order === '-time' && !offset) {
                this.order = 'time';
                try {
                    return await this._page(params, offset, true);
                } catch (e) {
                    this.order = '-time';
                    throw e;
                }
            }
            throw new Error('сайт логов ответил ' + r.status);
        }
        let d;
        try {
            d = await r.json();
        } catch (e) {
            if (e && e.name === 'AbortError') throw new Error('сайт логов долго не отвечает');
            // вместо данных пришла страница (вход истёк)
            throw new Error('сайт логов не пускает — войди заново');
        } finally {
            clearTimeout(timer);
        }
        if (!Array.isArray(d)) throw new Error('сайт логов ответил не списком');
        return d;
    },
    // размер страницы сайта узнаём по ходу (страница, за которой есть ещё, — полная) и запоминаем
    size: 0,
    pageSize() {
        if (!this.size) this.size = Store.get('pageSize', 0);
        return this.size;
    },
    // first — уже полученная первая страница (чтобы не качать её второй раз);
    // alive() — окно ещё открыто: иначе листание прекращается и не занимает очередь
    async all(params, maxPages, onPage, first, alive) {
        const out = [];
        out.capped = false;
        let off = 0,
            prev = 0;
        for (let i = 0; i < maxPages; i++) {
            if (alive && !alive()) break;
            const d = i === 0 && first ? first : await this.page(params, off);
            if (i > 0 && d.length && prev > this.pageSize()) {
                this.size = prev;
                Store.set('pageSize', prev);
            }
            out.push(...d);
            if (onPage) onPage(i + 1, out.length);
            if (!d.length) break;
            off += d.length;
            prev = d.length;
            const size = this.pageSize();
            if (size && d.length < size) break;
            if (i === maxPages - 1) out.capped = true;
        }
        return out;
    },
    range(days) {
        const end = new Date();
        return { time__gte: new Date(end - days * 864e5).toISOString(), time__lte: end.toISOString() };
    }
};

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

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const DEV_RE = /APPMDID:\s*([A-Za-z0-9+/=_-]{6,})/i;
function fmtDate(t) {
    const d = new Date(t);
    return isNaN(d) ? '' : d.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function group(rows, keyOf) {
    const m = new Map();
    rows.forEach(r => {
        const k = keyOf(r);
        if (!k) return;
        const t = new Date(r.time).getTime() || 0;
        const g = m.get(k) || { k, n: 0, first: t || Infinity, last: t, ids: new Set() };
        g.n++;
        if (t) {
            g.first = Math.min(g.first, t);
            g.last = Math.max(g.last, t);
        }
        if (r.player_id) g.ids.add(String(r.player_id));
        m.set(k, g);
    });
    m.forEach(g => g.first === Infinity && (g.first = 0));
    return [...m.values()].sort((a, b) => b.n - a.n || b.last - a.last);
}
const devOf = r => {
    const m = String(r.transaction_desc || '').match(DEV_RE);
    return m ? m[1] : '';
};
const sameNick = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

// деньги и категории из записи API (названия полей — как в фильтрах сайта)
const numOf = v => {
    if (v == null) return NaN;
    let t = String(v).replace(/[\s ]/g, '').replace(/−/g, '-');
    if (!t) return NaN;
    // «1,000,000» — разделители тысяч, «1,5» — дробь
    t = (t.match(/,/g) || []).length > 1 ? t.replace(/,/g, '') : t.replace(',', '.');
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
};
const amtOf = r => numOf(r.transaction_amount ?? r.amount);
const balOf = r => numOf(r.balance_after ?? r.player_balance_after);
const fmtMoney = n => (n < 0 ? '−' : n > 0 ? '+' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmtNum = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
let CATS = null;
function catName(r) {
    // названия: выученные по таблице сайта + обычный <select>, если он есть
    if (!CATS || CatLearn.dirty) {
        CatLearn.dirty = false;
        CATS = Object.assign({ 38: 'Подключения / Отключения' }, Store.get('cats', {}));
        document.querySelectorAll('select').forEach(sel => {
            const box = sel.closest('.mb-3, .form-group, .col, div');
            const isCat = /categ/i.test(`${sel.name} ${sel.id} ${sel.className}`) || (box && /категори/i.test((box.querySelector('label, .form-label') || {}).textContent || ''));
            if (!isCat) return;
            sel.querySelectorAll('option').forEach(o => {
                if (/^\d+$/.test(o.value) && o.textContent.trim()) CATS[o.value] = o.textContent.trim();
            });
        });
    }
    const c = r.category;
    return r.category_name || (c && typeof c === 'object' && (c.name || c.title)) || (typeof c === 'string' && c) || CATS[r.category_id] || (r.category_id != null ? 'Категория #' + r.category_id : 'Без категории');
}
// номер категории → название: повторяем запрос, которым сайт построил свою таблицу,
// и сопоставляем строки по порядку (с проверкой ника). Выученное хранится
const CatLearn = {
    dirty: false,
    // подпись номера категории вручную (название с сайта потом её заменит, если найдётся)
    name(id, v) {
        const map = Store.get('cats', {});
        map[String(id)] = v;
        Store.set('cats', map);
        this.dirty = true;
    },
    tried: new Set(),
    // номера → названия со страницы: список «Категория» в фильтрах, данные в скриптах, ответы API про категории
    async discover() {
        if (this._disc) return this._disc;
        this._disc = (async () => {
            const map = Store.get('cats', {});
            let n = 0;
            const add = (id, name) => {
                id = String(id);
                name = String(name || '').replace(/\s+/g, ' ').trim();
                if (!/^\d{1,4}$/.test(id) || !name || name.length > 60 || /^[–—-]*\s*любая/i.test(name)) return;
                if (map[id] !== name) {
                    map[id] = name;
                    n++;
                }
            };
            // 1) элементы списка категорий (у кастомных списков — data-value / value)
            const label = [...document.querySelectorAll('label, .form-label, h5, h6')].find(l => /^категори/i.test(l.textContent.trim()));
            const box = label && (label.closest('.mb-3, .form-group, .col, div') || label.parentElement);
            if (box) box.querySelectorAll('[data-value], [value], option').forEach(el => add(el.dataset.value ?? el.getAttribute('value'), el.textContent));
            // 1б) ссылки категорий в таблице: …?category_id=70 → «Админ действия»
            document.querySelectorAll('td.td-category a[href]').forEach(a => {
                const m = a.getAttribute('href').match(/categor[a-z_]*(?:__exact)?[=/](\d{1,4})/i);
                if (m) add(m[1], a.textContent);
            });
            // 1в) список категорий в коде сайта (подключённые скрипты): {id:70,name:"Админ действия"} или 70:"Админ действия"
            const soft = (id, name) => map[String(id)] || add(id, name);
            const scripts = [...document.querySelectorAll('script[src]')].map(x => x.src).filter(u => u.startsWith(location.origin)).slice(0, 8);
            for (const u of scripts) {
                if (this._seen && this._seen.has(u)) continue;
                (this._seen = this._seen || new Set()).add(u);
                try {
                    let t = await (await fetch(u, { credentials: 'include' })).text();
                    if (t.length > 8e6 || !/категори|админ|\\u04/i.test(t)) continue;
                    t = t.replace(/\\u([0-9a-f]{4})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)));
                    const Q = `["'\`]`;
                    for (const m of t.matchAll(new RegExp(`(?:id|value|pk|category_id)${Q}?\\s*:\\s*(\\d{1,4})\\s*,\\s*${Q}?(?:name|title|label|text)${Q}?\\s*:\\s*${Q}([^"'\`]{2,60})${Q}`, 'g'))) soft(m[1], m[2]);
                    for (const m of t.matchAll(new RegExp(`(?:name|title|label|text)${Q}?\\s*:\\s*${Q}([^"'\`]{2,60})${Q}\\s*,\\s*${Q}?(?:id|value|pk|category_id)${Q}?\\s*:\\s*(\\d{1,4})`, 'g'))) soft(m[2], m[1]);
                    // словарь «номер: название» — только если таких пар много (иначе это не список категорий)
                    const pairs = [...t.matchAll(new RegExp(`[{,]\\s*${Q}?(\\d{1,4})${Q}?\\s*:\\s*${Q}([А-ЯЁ][^"'\`]{1,59})${Q}`, 'g'))];
                    if (pairs.length >= 8) pairs.forEach(m => soft(m[1], m[2]));
                } catch {
                    /* скрипт не прочитать */
                }
            }
            // 2) данные в скриптах страницы рядом со словом «categor»
            const pick = arr => Array.isArray(arr) && arr.forEach(o => o && typeof o === 'object' && add(o.id ?? o.pk ?? o.value ?? o.category_id, o.name ?? o.title ?? o.label ?? o.text ?? o.category_name));
            document.querySelectorAll('script:not([src])').forEach(sc => {
                const t = sc.textContent || '';
                if (t.length > 3e6) return;
                for (const m of t.matchAll(/categor[a-z_]*["']?\s*[:=]\s*(\[[\s\S]*?\])\s*[,;}\n]/gi)) {
                    try {
                        pick(JSON.parse(m[1]));
                    } catch {
                        /* не JSON */
                    }
                }
            });
            // 3) ответы сайта, в адресе которых есть «categor»
            const urls = performance
                .getEntriesByType('resource')
                .map(e => e.name)
                .filter(u => u.startsWith(location.origin) && /categor/i.test(u) && !u.includes('/list-game-logs/') && !Api.mine.has(u));
            for (const u of [...new Set(urls)].slice(0, 3)) {
                try {
                    const r = await fetch(u, { credentials: 'include' });
                    const j = await r.json();
                    pick(Array.isArray(j) ? j : j && (j.results || j.categories || j.items || j.data));
                } catch {
                    /* не JSON */
                }
            }
            if (n) {
                Store.set('cats', map);
                this.dirty = true;
            }
            // ничего не нашли (страница ещё не дорисовалась) — следующий вызов поищет снова
            if (!n) setTimeout(() => (this._disc = null), 0);
            return n;
        })();
        return this._disc;
    },
    async learn() {
        const tds = [...document.querySelectorAll('td.td-category')];
        if (!tds.length) return;
        const map = Store.get('cats', {});
        const names = new Set(Object.values(map));
        if (tds.every(td => names.has(LogsPage.rawOf(td)))) return;
        const url = performance
            .getEntriesByType('resource')
            .map(e => e.name)
            .filter(u => u.includes('/api/list-game-logs/') && !Api.mine.has(u) && !this.tried.has(u))
            .pop();
        if (!url) return;
        this.tried.add(url);
        const rows = await new Promise((res, rej) => {
            const p = (Api._q || Promise.resolve()).then(async () => {
                Api.mine.add(url);
                const wait = 1100 - (Date.now() - Api.last);
                if (wait > 0) await new Promise(res2 => setTimeout(res2, wait));
                Api.last = Date.now();
                const ctl = typeof AbortController === 'function' ? new AbortController() : null;
                const timer = ctl && setTimeout(() => ctl.abort(), 20000);
                try {
                    const r = await fetch(url, { credentials: 'include', signal: ctl ? ctl.signal : undefined });
                    return r.ok ? await r.json() : [];
                } finally {
                    clearTimeout(timer);
                }
            });
            Api._q = p.catch(() => {});
            p.then(res, rej);
        });
        if (!Array.isArray(rows)) return;
        // ключ строки — ник и текст описания (без пробелов: суммы в таблице с разделителями)
        const key = (nick, desc) => `${String(nick || '').toLowerCase()}|${String(desc || '').replace(/\s+/g, '')}`;
        const tab = new Map();
        tds.forEach(td => {
            const tr = td.closest('tr');
            const next = tr && tr.nextElementSibling;
            const dtd = next && next.classList.contains('second-row') ? next.querySelector('td') : null;
            if (!dtd) return;
            const k = key(LogsPage.rawOf(tr.querySelector('.td-player-name') || td), LogsPage.rawOf(dtd));
            // одинаковые ключи с разными категориями — не учим
            tab.set(k, tab.has(k) && tab.get(k) !== LogsPage.rawOf(td) ? null : LogsPage.rawOf(td));
        });
        let n = 0;
        rows.forEach(r => {
            const name = tab.get(key(r.player_name, moneyText(r.transaction_desc)));
            if (!name || r.category_id == null) return;
            if (map[r.category_id] !== name) {
                map[r.category_id] = name;
                n++;
            }
        });
        if (n) {
            Store.set('cats', map);
            this.dirty = true;
        }
    }
};

// платформа входа: из описания подключения («Платформа: …» или Android / iOS / ПК)
function normPlat(v) {
    const t = String(v || '').trim();
    if (/android/i.test(t)) return 'Android';
    if (/ios|iphone|ipad|apple/i.test(t)) return 'iOS';
    if (/лаунчер|launcher/i.test(t)) return 'ПК (лаунчер)';
    if (/windows|\bwin(32|64)?\b|\bpc\b|пк|компьютер/i.test(t)) return 'ПК';
    if (/mac/i.test(t)) return 'macOS';
    if (/harmony|huawei/i.test(t)) return 'HarmonyOS';
    return t.length > 24 ? t.slice(0, 24) + '…' : t;
}
function platOf(r) {
    const d = String(r.transaction_desc || '');
    const kv = d.match(/(?:платформа|platform|клиент|client|система|\bos\b)\s*[:=]\s*([^,;)\]\n]+)/i);
    if (kv && kv[1].trim()) return normPlat(kv[1]);
    const m = d.match(/android|\bios\b|iphone|ipad|windows|\bpc\b|лаунчер|launcher|harmony\s?os|mac\s?os/i);
    return m ? normPlat(m[0]) : '';
}

// час по Москве
const mskHour = t => new Date(t + 3 * 3600e3).getUTCHours();
function hoursHtml(times) {
    const hrs = Array(24).fill(0);
    times.forEach(t => t && hrs[mskHour(t)]++);
    const max = Math.max(...hrs);
    const peak = max ? hrs.indexOf(max) : -1;
    return {
        peak,
        html: `<div class="vdl-hours">${hrs.map((n, h) => `<i class="${n ? '' : 'z'}" style="height:${max ? Math.max(6, Math.round((n / max) * 100)) : 6}%" title="${h}:00–${h}:59 МСК — ${n}"></i>`).join('')}</div>
               <div class="vdl-hours-l"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>`
    };
}

// длительность между временами
function durHM(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600),
        m = Math.floor((s % 3600) / 60);
    return h ? `${h} ч ${m} мин` : `${m} мин`;
}
// записи о входе; если их нет — все записи
const conn = rows => {
    const c = rows.filter(r => /подключ/i.test(r.transaction_desc || ''));
    return c.length ? c : rows;
};
// сессии игрока из логов подключений: пары подключился/отключился
function sessionsOf(rows) {
    const ev = rows
        .map(r => ({ t: new Date(r.time).getTime(), on: /подключ/i.test(r.transaction_desc), off: /отключ/i.test(r.transaction_desc), ip: r.player_ip, plat: platOf(r) }))
        .filter(e => (e.on || e.off) && e.t)
        .sort((a, b) => a.t - b.t);
    const out = [];
    let open = null;
    // события одной секунды: если сессия открыта — сначала выход, потом новый вход (переподключение);
    // если нет — сначала вход, потом выход (зашёл и сразу вылетел)
    const ordered = [];
    let isOpen = false;
    for (let i = 0; i < ev.length; ) {
        let j = i;
        while (j < ev.length && ev[j].t === ev[i].t) j++;
        const grp = ev.slice(i, j);
        const offs = grp.filter(e => e.off && !e.on),
            ons = grp.filter(e => !(e.off && !e.on));
        const part = isOpen ? offs.concat(ons) : ons.concat(offs);
        ordered.push(...part);
        part.forEach(e => (isOpen = e.on ? true : e.off ? false : isOpen));
        i = j;
    }
    ordered.forEach(e => {
        if (e.on) {
            if (open) out.push({ start: open.t, end: null, ip: open.ip, plat: open.plat, lost: true });
            open = e;
        } else if (e.off && open) {
            out.push({ start: open.t, end: e.t, ip: open.ip, plat: open.plat });
            open = null;
        } else if (e.off) out.push({ start: null, end: e.t, ip: e.ip });
    });
    if (open) out.push({ start: open.t, end: null, ip: open.ip, plat: open.plat });
    return out.reverse();
}

const Panel = {
    // stack — поверх текущего окна (Админ-действия, Боты): закрыл — вернулся к нему
    open(mode = 'nick', value = '', opts = {}) {
        // без новой проверки — возвращаем прежнее окно с отчётом
        if (!value && this.scrim) {
            if (opts.stack) {
                this.scrim.hidden = false;
                Layer.el().appendChild(this.scrim);
            } else Layer.show(this.scrim);
            return;
        }
        if (opts.stack) {
            if (this.scrim) this.scrim.remove();
        } else Layer.closeModals();
        // поколение окна: результаты проверки из закрытого окна в новое не попадают
        this._gen = (this._gen || 0) + 1;
        this.days = this.days || Store.get('days', 30);
        const scrim = (this.scrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal vdl">
            <div class="m-head"><span class="vic" style="--c:var(--acc);width:34px;height:34px;border-radius:10px">${icon('shield', 16)}</span>
              <div><div class="m-title">Аналитика</div><div class="m-sub">Сервер ${U.esc(Api.server() || '?')} · данные с сайта логов под твоим входом</div></div>
              <span style="flex:1"></span><button class="btn" data-a="mail" title="Идея, ошибка или вопрос разработчику">${icon('chat', 14)}Разработчику</button><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="vdl-form">
                <div class="seg" data-g="mode"><button data-v="nick">Игрок</button><button data-v="id">ID</button><button data-v="ip">IP</button><button data-v="dev">Устройство</button></div>
                <input class="inp" data-a="q" placeholder="">
                <div class="seg" data-g="days"><button data-v="7">7 дн.</button><button data-v="30">30 дн.</button><button data-v="90">90 дн.</button></div>
                <button class="btn pri" data-a="go">${icon('search', 14)}Проверить</button>
              </div>
              <div class="vdl-prog"></div>
              <div class="vdl-out"></div>
            </div></div></div>`)
        ));
        // закрыл — окно прячется вместе с отчётом, начатая проверка доходит до конца
        const close = () => Layer.hide(scrim);
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        const q = scrim.querySelector('[data-a="q"]');
        const setMode = m => {
            this.mode = m;
            scrim.querySelectorAll('[data-g="mode"] button').forEach(b => b.classList.toggle('on', b.dataset.v === m));
            q.placeholder = { nick: 'Ник: Ivan_Ivanov', id: 'ID игрока: 1016171', ip: 'IP: 95.57.212.23', dev: 'APPMDID устройства' }[m];
        };
        const setDays = d => {
            this.days = d;
            Store.set('days', d);
            scrim.querySelectorAll('[data-g="days"] button').forEach(b => b.classList.toggle('on', +b.dataset.v === d));
        };
        scrim.querySelectorAll('[data-g="mode"] button').forEach(b => (b.onclick = () => setMode(b.dataset.v)));
        // сменил период при открытом отчёте — пересчитываем, чтобы отчёт и вкладки были за один период
        scrim.querySelectorAll('[data-g="days"] button').forEach(
            b =>
                (b.onclick = () => {
                    const was = this.days;
                    setDays(+b.dataset.v);
                    if (was !== this.days && q.value.trim() && scrim.querySelector('.vdl-out').children.length) go();
                })
        );
        setMode(mode);
        setDays(this.days);
        q.value = value;
        const go = () => {
            const v = q.value.trim();
            if (!v) return q.focus();
            if (this.mode === 'nick') this.byNick(v);
            else if (this.mode === 'id') this.byId(v);
            else if (this.mode === 'ip') this.byIp(v);
            else this.byDev(v);
        };
        scrim.querySelector('[data-a="go"]').onclick = go;
        scrim.querySelector('[data-a="mail"]').onclick = () => Feedback.open();
        q.addEventListener('keydown', e => e.key === 'Enter' && go());
        if (value) go();
        else setTimeout(() => q.focus(), 50);
    },
    stale() {
        return this.busy && this._runGen !== this._gen;
    },
    prog(t) {
        if (this.scrim && !this.stale()) this.scrim.querySelector('.vdl-prog').textContent = t;
    },
    out(html) {
        if (this.stale()) throw new Error('окно закрыто');
        const o = this.scrim && this.scrim.querySelector('.vdl-out');
        if (o) o.innerHTML = html;
        return o;
    },
    // box — блок вложенной проверки («Кто ещё с этого IP»): ошибка пишется в него, а не поверх отчёта
    async run(fn, box) {
        const want = this._gen;
        while (this.busy) {
            if (box || !this.stale()) {
                toast('Подожди, предыдущая проверка ещё идёт', 'info');
                return false;
            }
            // проверка из закрытого окна сама прекращает листание — ждём её
            await this._running;
        }
        // пока ждали, окно сменили или запустили другую проверку — эта уже не нужна
        if (!box && this._gen !== want) return false;
        // каждый отчёт — своё поколение: догружающиеся вкладки прошлого отчёта в новый не пишут
        if (!box) this._gen = (this._gen || 0) + 1;
        this.busy = true;
        this._runGen = this._gen;
        // новая проверка — прежний отчёт убираем сразу, чтобы по нему не кликали, пока грузится новый
        if (!box) this.out('');
        const p = (async () => {
            try {
                await fn();
                return true;
            } catch (e) {
                if (this.stale()) return false;
                this.prog('');
                const msg = `${icon('x', 14)} Не получилось: ${U.esc(e.message)}`;
                if (box) {
                    box.hidden = false;
                    box.innerHTML = `<div class="sub" style="margin:4px 0">${msg}</div>`;
                } else this.out(`<div class="card" style="padding:14px">${msg}</div>`);
                return false;
            } finally {
                if (this._running === p) this.busy = false;
            }
        })();
        this._running = p;
        return p;
    },
    // проверка ещё нужна (окно не закрыто и не заменено)
    alive() {
        return () => !this.stale();
    },

    byNick(nick) {
        return this.player({ player_name__exact: nick }, nick, null);
    },

    byId(id) {
        const v = String(id).trim();
        if (!/^\d+$/.test(v)) {
            if (this.busy) return toast('ID — это число, например 1016171', 'err');
            this.out(`<div class="card" style="padding:14px">${icon('x', 14)} ID — это число, например 1016171</div>`);
            return;
        }
        return this.player({ player_id__exact: v }, null, v);
    },

    // общее ядро: собирает сводку по игроку, выбранному либо по нику, либо по ID
    player(sel, nick, id) {
        return this.run(async () => {
            const days = this.days;
            const base = Object.assign({}, sel, Api.range(days));
            this.prog('Читаю подключения игрока…');
            let rows = await Api.all(Object.assign({ category_id__exact: 38 }, base), 10, (p, n) => this.prog(`Подключения: страница ${p}, записей ${n}…`), null, this.alive());
            let note = '';
            if (!rows.length) {
                rows = await Api.all(base, 4, (p, n) => this.prog(`Все записи игрока: страница ${p}, записей ${n}…`), null, this.alive());
                note = 'Подключений за период нет — IP взяты из остальных записей игрока.';
            }
            this.prog('');
            // если искали по ID — подставляем ник, который встречается чаще всего
            if (!nick) {
                const nk = group(rows, r => r.player_name);
                nick = (nk[0] && nk[0].k) || '';
                if (nk.length > 1) note = (note ? note + ' ' : '') + `На этом ID встречались ники: ${nk.slice(0, 6).map(g => g.k).join(', ')}.`;
            }
            // «входов» — только записи о входе (иначе выходы удваивают счёт)
            const con = conn(rows);
            const ips = group(con, r => r.player_ip),
                devs = group(con, devOf);
            const ids = id ? [id] : [...new Set(rows.map(r => r.player_id).filter(Boolean))];
            this.report = { kind: 'nick', nick: nick || ('ID ' + id), id: id || null, days, ips, devs, related: new Map(), idSet: new Set(rows.map(r => String(r.player_id || '')).concat(ids.map(String)).filter(Boolean)) };
            const o = this.out(`
              <div class="vdl-sum">
                <div class="k"><small>Записей</small><b>${rows.length}</b></div>
                <div class="k"><small>IP-адресов</small><b>${ips.length}</b></div>
                <div class="k"><small>Устройств</small><b>${devs.length}</b></div>
                <div class="k"><small>ID игрока</small><b style="font-size:15px" class="vdl-copyid" data-v="${U.esc(ids.join(', '))}">${U.esc(ids.join(', ') || '—')}</b></div>
              </div>
              ${note ? `<div class="muted" style="font-size:12px;margin-bottom:10px">${U.esc(note)}</div>` : ''}
              <div class="seg vdl-tabs" data-g="tab"><button data-v="in">${icon('shield', 13)}Заходы</button><button data-v="money">${icon('download', 13)}Доходы</button><button data-v="act">${icon('spark', 13)}Активность</button><button data-v="tr">${icon('eye', 13)}Трейды</button></div>
              <div data-tab="in">
                <div class="sec"><h4>С чего заходил (платформа)</h4><div class="card" data-l="plat"></div></div>
                <div class="sec"><h4>IP-адреса игрока</h4><div class="card" data-l="ips">${ips.length ? '' : '<div class="vdl-row"><div class="main sub">Нет записей за период</div></div>'}</div></div>
                <div class="sec"><h4>Устройства (APPMDID)</h4><div class="card" data-l="devs">${devs.length ? '' : '<div class="vdl-row"><div class="main sub">В подключениях нет APPMDID</div></div>'}</div></div>
                <div class="sec"><h4>Сессии (вход / выход)</h4><div class="card" data-l="ses"></div></div>
                <div class="sec"><h4>Когда играет (по входам, МСК)</h4><div class="card" data-l="hrs"></div></div>
              </div>
              <div data-tab="money" hidden><div class="sec"><h4>Деньги за ${days} дн.</h4><div class="card" data-l="money"></div></div></div>
              <div data-tab="act" hidden><div class="sec"><h4>Чем занимался за ${days} дн. (записей по категориям)</h4><div class="card" data-l="cats"></div></div></div>
              <div data-tab="tr" hidden><div class="sec"><h4>Трейды игрока за ${days} дн.</h4><div class="card" data-l="tr"></div></div></div>
              <div class="btns" style="margin-top:12px"><span style="flex:1"></span><button class="btn" data-a="copy">${icon('download', 14)}Скопировать отчёт</button></div>`);
            // платформы входа
            const conRows = rows.filter(r => /подключ/i.test(r.transaction_desc || ''));
            const plats = group(conRows, platOf);
            this.report.plats = plats.map(g => `${g.k} — ${g.n}`);
            const pb = o.querySelector('[data-l="plat"]');
            if (plats.length) {
                pb.innerHTML = plats
                    .map(g => `<div class="vdl-row"><div class="main"><div class="ttl">${U.esc(g.k)}<span class="vdl-tag" style="--c:#2fbf71">${g.n} ${plural(g.n, 'вход', 'входа', 'входов')}</span></div><div class="sub">${fmtDate(g.first)} — ${fmtDate(g.last)}</div></div></div>`)
                    .join('');
            } else {
                const ex = conRows.slice().sort((a, b) => new Date(b.time) - new Date(a.time))[0];
                pb.innerHTML = `<div class="vdl-row"><div class="main sub">${conRows.length ? 'В записях входа платформа не указана' : 'Входов за период нет'}${ex ? `<br>Пример записи входа: <span class="vdl-mono">${U.esc(String(ex.transaction_desc || '').slice(0, 200))}</span>` : ''}</div></div>`;
            }
            o.querySelectorAll('.vdl-copyid').forEach(el => el.dataset.v && copyText(el, () => el.dataset.v, 'ID'));
            const li = o.querySelector('[data-l="ips"]');
            ips.slice(0, 30).forEach(g => li.appendChild(this.ipRow(g, nick)));
            const ld = o.querySelector('[data-l="devs"]');
            devs.forEach(g => (g.plat = [...new Set(rows.filter(r => devOf(r) === g.k).map(platOf).filter(Boolean))].join(', ')));
            devs.slice(0, 15).forEach(g => ld.appendChild(this.devRow(g, nick)));
            // сессии
            const ses = sessionsOf(rows);
            const full = ses.filter(x => x.start && x.end);
            const total = full.reduce((a, x) => a + (x.end - x.start), 0);
            const longest = full.reduce((a, x) => Math.max(a, x.end - x.start), 0);
            this.report.ses = { n: ses.length, total, avg: full.length ? total / full.length : 0, longest };
            const sb = o.querySelector('[data-l="ses"]');
            sb.innerHTML = ses.length
                ? `<div class="vdl-row"><div class="main"><div class="ttl">${ses.length} ${plural(ses.length, 'сессия', 'сессии', 'сессий')} · в игре ${durHM(total)}</div>
                     <div class="sub">в среднем ${full.length ? durHM(total / full.length) : '—'} · самая долгая ${longest ? durHM(longest) : '—'}${full.length < ses.length ? ` · без пары вход/выход: ${ses.length - full.length}` : ''}</div></div></div>` +
                  ses
                      .slice(0, 12)
                      .map(
                          x =>
                              `<div class="vdl-row"><div class="main"><div class="ttl">${x.start ? fmtDate(x.start) : '?'} — ${x.end ? fmtDate(x.end) : x.lost ? '?' : 'ещё в игре'}</div><div class="sub">${x.start && x.end ? durHM(x.end - x.start) : x.lost ? 'выход не записан' : x.start ? 'выхода пока нет' : 'вход раньше периода'}${x.ip ? ' · ' + U.esc(x.ip) : ''}${x.plat ? ' · ' + U.esc(x.plat) : ''}</div></div></div>`
                      )
                      .join('')
                : '<div class="vdl-row"><div class="main sub">Нет подключений за период</div></div>';
            // часы активности по входам (если входов нет — по всем записям)
            const starts = rows.filter(r => /подключ/i.test(r.transaction_desc || '')).map(r => new Date(r.time).getTime());
            const H = hoursHtml(starts.length ? starts : rows.map(r => new Date(r.time).getTime()));
            this.report.peak = H.peak;
            o.querySelector('[data-l="hrs"]').innerHTML = rows.length
                ? `${H.html}<div class="sub" style="padding:0 2px 8px">${H.peak >= 0 ? `Чаще всего заходит в ${String(H.peak).padStart(2, '0')}:00–${String(H.peak).padStart(2, '0')}:59 МСК` : ''}${starts.length ? '' : ' · по всем записям, входов нет'}</div>`
                : '<div class="vdl-row"><div class="main sub">Нет записей за период</div></div>';
            // вкладки: «Доходы», «Активность» и «Трейды» грузятся при первом открытии
            const gen = this._gen;
            const tabs = o.querySelector('[data-g="tab"]');
            const loaders = {
                money: box => this.loadAll(base, gen).then(d => gen === this._gen && this.renderMoney(box, d)),
                act: box => this.loadAll(base, gen).then(d => gen === this._gen && this.renderCats(box, d)),
                tr: box => this.loadTrades(sel, gen, base).then(list => gen === this._gen && this.renderTrades(box, list))
            };
            const started = {};
            const show = t => {
                this.tab = t;
                tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === t));
                o.querySelectorAll('[data-tab]').forEach(x => (x.hidden = x.dataset.tab !== t));
                if (!loaders[t] || started[t]) return;
                started[t] = true;
                const box = o.querySelector(`[data-tab="${t}"] .card`);
                box.innerHTML = '<div class="vdl-row"><div class="main sub">Загружаю…</div></div>';
                loaders[t](box).catch(err => {
                    if (gen !== this._gen) return;
                    started[t] = false;
                    this.prog('');
                    box.innerHTML = `<div class="vdl-row"><div class="main sub">Не загрузилось: ${U.esc(err.message)}</div><div class="vdl-btns"><button class="btn" data-a="retry">Повторить</button></div></div>`;
                    box.querySelector('[data-a="retry"]').onclick = () => show(t);
                });
            };
            tabs.querySelectorAll('button').forEach(b => (b.onclick = () => show(b.dataset.v)));
            show(loaders[this.tab] || this.tab === 'in' ? this.tab : 'in');
            o.querySelector('[data-a="copy"]').onclick = () => this.copy();
        });
    },

    // все записи игрока за период (до 500) — одни на «Доходы» и «Активность»
    loadAll(base, gen) {
        const key = gen + '|' + JSON.stringify(base);
        if (this._all && this._all.key === key) return this._all.p;
        const LIM = 10;
        const p = Api.all(base, LIM, (pg, n) => gen === this._gen && this.prog(`Все записи игрока: страница ${pg}, записей ${n}…`), null, () => gen === this._gen).then(rows => {
            if (gen === this._gen) this.prog('');
            return { rows, capped: rows.capped };
        });
        this._all = { key, p };
        p.catch(() => this._all && this._all.p === p && (this._all = null));
        return p;
    },
    capNote(d) {
        return `<div class="sub" style="padding:8px 2px">${d.rows.length} ${plural(d.rows.length, 'запись', 'записи', 'записей')} игрока${d.capped ? ' — посчитаны последние, за весь период их больше (возьми период короче)' : ''}</div>`;
    },
    renderMoney(box, d) {
        if (!d.rows.length) return (box.innerHTML = '<div class="vdl-row"><div class="main sub">Записей за период нет</div></div>');
        const ops = d.rows.map(r => ({ r, a: amtOf(r), t: new Date(r.time).getTime() || 0 })).filter(x => Number.isFinite(x.a) && x.a !== 0);
        const inc = ops.filter(x => x.a > 0).reduce((s, x) => s + x.a, 0);
        const exp = ops.filter(x => x.a < 0).reduce((s, x) => s + x.a, 0);
        const newestFirst = Api.order === '-time';
        const bals = d.rows
            .map((r, i) => ({ b: balOf(r), t: new Date(r.time).getTime() || 0, i }))
            .filter(x => Number.isFinite(x.b))
            .sort((a, b) => a.t - b.t || (newestFirst ? b.i - a.i : a.i - b.i));
        const b0 = bals[0], b1 = bals[bals.length - 1];
        const big = ops.slice().sort((a, b) => Math.abs(b.a) - Math.abs(a.a)).slice(0, 10);
        // доходы и расходы по категориям
        const byCat = sign => {
            const m = new Map();
            ops.filter(x => Math.sign(x.a) === sign).forEach(x => {
                const k = String(x.r.category_id ?? 'none');
                const g = m.get(k) || { k, sum: 0, n: 0 };
                g.sum += x.a;
                g.n++;
                m.set(k, g);
            });
            return [...m.values()].sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum)).slice(0, 6);
        };
        const bars = (list, cls) => {
            const max = list.length ? Math.abs(list[0].sum) : 1;
            return list
                .map(g => {
                    const L = catLabel(g.k, d.rows);
                    return `<div class="vdl-bar"><span class="nm ${L.known ? '' : 'guess'}" title="${U.esc(L.name)}"><span class="t">${U.esc(L.name)}</span>${L.known ? '' : `<button class="vdl-ren" data-cid="${U.esc(g.k)}" title="Подписать категорию">✎</button>`}</span><span class="tr"><b class="${cls}" style="width:${Math.max(3, Math.round((Math.abs(g.sum) / max) * 100))}%"></b></span><span class="n ${cls}">${fmtMoney(g.sum)}</span></div>`;
                })
                .join('');
        };
        const cIn = byCat(1), cOut = byCat(-1);
        this.report.money = { inc, exp, b0: b0 && b0.b, b1: b1 && b1.b, n: d.rows.length, capped: d.capped };
        const cls = n => (n > 0 ? 'vdl-pos' : n < 0 ? 'vdl-neg' : '');
        box.innerHTML = `
          <div class="vdl-money">
            <div class="k"><small>Пришло</small><b class="vdl-pos">${ops.length ? fmtMoney(inc) : '—'}</b></div>
            <div class="k"><small>Ушло</small><b class="vdl-neg">${ops.length ? fmtMoney(exp) : '—'}</b></div>
            <div class="k"><small>Итог по операциям</small><b class="${cls(inc + exp)}">${ops.length ? fmtMoney(inc + exp) : '—'}</b></div>
            <div class="k"><small>Баланс сейчас</small><b>${b1 ? fmtNum(b1.b) : '—'}</b>${b0 && b0 !== b1 ? `<small>в начале периода ${fmtNum(b0.b)}</small>` : ''}</div>
          </div>
          ${ops.length ? '' : '<div class="sub" style="padding:0 2px 8px">Денежных операций за период нет (или сайт не отдаёт сумму)</div>'}
          ${cIn.length ? `<div class="sub" style="padding:8px 2px 2px">Откуда приходили деньги</div>${bars(cIn, 'vdl-pos')}` : ''}
          ${cOut.length ? `<div class="sub" style="padding:8px 2px 2px">На что уходили</div>${bars(cOut, 'vdl-neg')}` : ''}
          ${big.length ? `<div class="sub" style="padding:10px 2px 2px">Крупные операции</div>${big.map(x => `<div class="vdl-row"><div class="main"><div class="ttl"><span class="${cls(x.a)}">${fmtMoney(x.a)}</span><span class="vdl-tag">${U.esc(catLabel(x.r.category_id, d.rows).name)}</span></div><div class="sub">${fmtDate(x.t)} · ${U.esc(moneyText(String(x.r.transaction_desc || '').slice(0, 160)))}</div></div></div>`).join('')}` : ''}
          ${this.capNote(d)}`;
        this.renameButtons(box, () => this.renderMoney(box, d), d.rows);
    },
    // ✎ у категории без названия: подписать прямо в списке
    renameButtons(box, redraw, rows) {
        box.querySelectorAll('.vdl-ren').forEach(
            bt =>
                (bt.onclick = e => {
                    e.stopPropagation();
                    const id = bt.dataset.cid;
                    const nm = bt.closest('.nm');
                    nm.innerHTML = `<input class="inp" data-ren-inp maxlength="40" placeholder="Название #${U.esc(id)}" style="height:26px;width:100%">`;
                    const inp = nm.querySelector('input');
                    inp.value = guessCat(id, rows || []) || '';
                    let done = false;
                    const ok = () => {
                        if (done) return;
                        done = true;
                        const v = inp.value.trim();
                        if (v) CatLearn.name(id, v);
                        setTimeout(redraw, 0);
                    };
                    inp.addEventListener('keydown', ev => ev.key === 'Enter' && ok());
                    inp.addEventListener('blur', ok);
                    inp.focus();
                })
        );
    },
    renderCats(box, d) {
        if (!d.rows.length) return (box.innerHTML = '<div class="vdl-row"><div class="main sub">Записей за период нет</div></div>');
        const cats = group(d.rows, r => String(r.category_id ?? 'none')).slice(0, 14);
        const cmax = cats.length ? cats[0].n : 1;
        const nm = id => catLabel(id, d.rows).name;
        this.report.cats = cats.slice(0, 8).map(g => `${nm(g.k)} — ${g.n}`);
        const unknown = cats.filter(g => !catLabel(g.k, d.rows).known);
        box.innerHTML =
            cats
                .map(g => {
                    const name = nm(g.k);
                    const unk = unknown.includes(g);
                    const ex = unk ? d.rows.find(r => String(r.category_id) === g.k) : null;
                    return `<div class="vdl-bar"><span class="nm" title="${U.esc(name)}">${U.esc(name)}</span><span class="tr"><b style="width:${Math.max(3, Math.round((g.n / cmax) * 100))}%"></b></span><span class="n">${g.n}</span></div>${
                        unk
                            ? `<div class="vdl-catex" data-id="${U.esc(g.k)}"><span class="ex">пример: ${U.esc(moneyText(String((ex && ex.transaction_desc) || '—').slice(0, 120)))}</span><button class="btn" data-a="name">✎ подписать</button></div>`
                            : ''
                    }`;
                })
                .join('') +
            this.capNote(d);
        box.querySelectorAll('.vdl-catex [data-a="name"]').forEach(
            bt =>
                (bt.onclick = () => {
                    const row = bt.closest('.vdl-catex');
                    const id = row.dataset.id;
                    row.innerHTML = `<input class="inp" data-ren-inp placeholder="Название для категории #${U.esc(id)}" maxlength="40" style="flex:1;height:30px"><button class="btn" data-a="ok">Сохранить</button>`;
                    const inp = row.querySelector('input');
                    const ok = () => {
                        const v = inp.value.trim();
                        if (!v) return inp.focus();
                        CatLearn.name(id, v);
                        this.renderCats(box, d);
                    };
                    row.querySelector('[data-a="ok"]').onclick = ok;
                    inp.addEventListener('keydown', e => e.key === 'Enter' && ok());
                    inp.focus();
                })
        );
    },
    // период — тот же, что у отчёта (base), а не текущие 7/30/90 дней
    async loadTrades(sel, gen, base) {
        const range = base ? { time__gte: base.time__gte, time__lte: base.time__lte } : Api.range(this.days);
        const tr = await Api.all({ ...sel, transaction_desc__ilike: '%TradeID%', ...range }, 6, (pp, nn) => gen === this._gen && this.prog(`Трейды: страница ${pp}, записей ${nn}…`), null, () => gen === this._gen);
        if (gen === this._gen) this.prog('');
        const byT = new Map();
        tr.forEach(r => {
            const m = String(r.transaction_desc || '').match(/TradeID:\s*(\d+)/);
            if (!m) return;
            const g = byT.get(m[1]) || { id: m[1], n: 0, last: 0 };
            g.n++;
            g.last = Math.max(g.last, new Date(r.time).getTime() || 0);
            byT.set(m[1], g);
        });
        return [...byT.values()].sort((a, b) => b.last - a.last);
    },
    renderTrades(box, list) {
        this.report.trades = list.length;
        box.innerHTML = list.length
            ? list
                  .map(g => `<div class="vdl-row"><div class="main"><div class="ttl">Трейд #${g.id}<span class="vdl-tag">${g.n} зап.</span></div><div class="sub">${fmtDate(g.last)}</div></div><div class="vdl-btns"><button class="btn" data-tid="${g.id}">${icon('eye', 13)}Открыть</button></div></div>`)
                  .join('')
            : '<div class="vdl-row"><div class="main sub">Трейдов за период нет</div></div>';
        box.querySelectorAll('[data-tid]').forEach(b => (b.onclick = () => TradeView.open(b.dataset.tid)));
    },

    byIp(ip, into, except) {
        return this.run(async () => {
            if (!IP_RE.test(ip)) throw new Error('это не IP-адрес');
            // вложенная проверка — за период отчёта, своя — за выбранный сейчас
            const days = into && this.report ? this.report.days : this.days;
            const rows = await this.ipRows(ip, (p, n) => this.prog(`IP ${ip}: страница ${p}, записей ${n}…`), days);
            this.prog('');
            const nicks = group(conn(rows), r => r.player_name);
            if (into) return this.fillMore(into, nicks, except, 'IP', ip);
            const devN = group(rows, devOf).length;
            this.report = { kind: 'ip', ip, days, nicks };
            const rep = this.report;
            const o = this.out(`
              <div class="card" style="padding:12px 14px;margin-bottom:12px"><div class="ttl"><span class="vdl-mono">${U.esc(ip)}</span></div><div class="sub" data-geo>определяю провайдера…</div></div>
              <div class="vdl-sum">
                <div class="k"><small>Записей</small><b>${rows.length}</b></div>
                <div class="k"><small>Аккаунтов</small><b>${nicks.length}</b></div>
                <div class="k"><small>Устройств</small><b>${devN}</b></div>
                <div class="k"><small>Период</small><b style="font-size:15px">${days} дн.</b></div>
              </div>
              <div class="sec"><h4>Аккаунты с этого IP</h4><div class="card" data-l="nicks"></div></div>
              <div class="btns" style="margin-top:12px"><span style="flex:1"></span><button class="btn" data-a="copy">${icon('download', 14)}Скопировать отчёт</button></div>`);
            Geo.get(ip).then(g => {
                const el = o && o.querySelector('[data-geo]');
                if (el) el.innerHTML = Geo.html(g);
                rep.geo = g;
            });
            const l = o.querySelector('[data-l="nicks"]');
            if (!nicks.length) l.innerHTML = '<div class="vdl-row"><div class="main sub">С этого IP за период никто не заходил</div></div>';
            nicks.forEach(g => l.appendChild(this.nickRow(g)));
            o.querySelector('[data-a="copy"]').onclick = () => this.copy();
        }, into);
    },

    byDev(dev, into, except) {
        return this.run(async () => {
            const days = into && this.report ? this.report.days : this.days;
            const rows = await Api.all(
                Object.assign({ category_id__exact: 38, transaction_desc__ilike: `%${dev}%` }, Api.range(days)),
                6,
                (p, n) => this.prog(`Устройство: страница ${p}, записей ${n}…`),
                null,
                this.alive()
            );
            this.prog('');
            const nicks = group(rows.filter(r => devOf(r) === dev), r => r.player_name);
            if (into) return this.fillMore(into, nicks, except, 'устройство', dev);
            this.report = { kind: 'dev', dev, days, nicks };
            const o = this.out(`
              <div class="vdl-sum"><div class="k"><small>Записей</small><b>${rows.length}</b></div><div class="k"><small>Аккаунтов</small><b>${nicks.length}</b></div></div>
              <div class="sec"><h4>Аккаунты с этого устройства</h4><div class="card" data-l="nicks"></div></div>`);
            const l = o.querySelector('[data-l="nicks"]');
            if (!nicks.length) l.innerHTML = '<div class="vdl-row"><div class="main sub">Ничего не нашлось</div></div>';
            nicks.forEach(g => l.appendChild(this.nickRow(g)));
        }, into);
    },

    async ipRows(ip, onPage, days) {
        for (const key of ['player_ip__exact', 'player_ip__ilike', 'player_ip']) {
            const params = Object.assign({ category_id__exact: 38, [key]: ip }, Api.range(days || this.days));
            const first = await Api.page(params, 0);
            if (first.length && first.some(r => r.player_ip && r.player_ip !== ip)) continue;
            if (!first.length || (Api.pageSize() && first.length < Api.pageSize())) return first;
            return Api.all(params, 10, onPage, first, this.alive());
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
        r.querySelector('[data-a="who"]').onclick = async e => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.disabled = await this.byIp(g.k, r.querySelector('.vdl-more'), nick);
        };
        return r;
    },
    devRow(g, nick) {
        const r = U.h(`<div><div class="vdl-row">
          <div class="main"><div class="ttl"><span class="vdl-mono">${U.esc(g.k.length > 28 ? g.k.slice(0, 28) + '…' : g.k)}</span><span class="vdl-tag" style="--c:#a970ff">${g.n} ${plural(g.n, 'вход', 'входа', 'входов')}</span></div>
            <div class="sub">${fmtDate(g.first)} — ${fmtDate(g.last)}${g.plat ? ' · ' + U.esc(g.plat) : ''}</div></div>
          <div class="vdl-btns"><button class="btn" data-a="who">${icon('search', 13)}Кто ещё с устройства</button></div>
        </div><div class="vdl-more" hidden></div></div>`);
        r.querySelector('[data-a="who"]').onclick = async e => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.disabled = await this.byDev(g.k, r.querySelector('.vdl-more'), nick);
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
        const own = (this.report && this.report.idSet) || new Set();
        const others = nicks.filter(x => !sameNick(x.k, except) && ![...x.ids].some(i => own.has(i)));
        if (this.report && this.report.related) this.report.related.set(what + ' ' + key, others.map(x => x.k));
        box.innerHTML = others.length
            ? `<div class="sub" style="margin:2px 0 4px"><span class="vdl-tag" style="--c:#f5a524">возможные твинки: ${others.length}</span></div>`
            : `<div class="sub" style="margin:4px 0">С этого ${what === 'IP' ? 'IP' : 'устройства'} за ${(this.report && this.report.days) || this.days} дн. заходил только ${U.esc(except)}</div>`;
        others.forEach(g => box.appendChild(this.nickRow(g)));
    },

    copy() {
        const r = this.report;
        if (!r) return;
        const L = [];
        if (r.kind === 'nick') {
            L.push(`Игрок ${r.nick}${r.id ? ` (ID ${r.id})` : ''} — за ${r.days} дн. (сервер ${Api.server()})`);
            L.push(`IP-адресов: ${r.ips.length}, устройств: ${r.devs.length}`);
            if (r.plats && r.plats.length) L.push('Платформы: ' + r.plats.join('; '));
            if (r.ses && r.ses.n) L.push(`Сессий: ${r.ses.n}, в игре ${durHM(r.ses.total)}, в среднем ${durHM(r.ses.avg)}${r.peak >= 0 ? `, чаще всего в ${String(r.peak).padStart(2, '0')}:00 МСК` : ''}`);
            if (r.money) L.push(`Деньги: пришло ${fmtMoney(r.money.inc)}, ушло ${fmtMoney(r.money.exp)}${Number.isFinite(r.money.b0) ? `, баланс ${fmtNum(r.money.b0)} → ${fmtNum(r.money.b1)}` : ''}${r.money.capped ? ' (по последним 500 записям)' : ''}`);
            if (r.cats && r.cats.length) L.push('Категории: ' + r.cats.join('; '));
            if (r.trades != null) L.push(`Трейдов: ${r.trades}`);
            r.ips.slice(0, 15).forEach(g =>
                L.push(`• ${g.k} — ${g.n} вх., ${fmtDate(g.first)}–${fmtDate(g.last)}${g.geo ? ` · ${[g.geo.country, g.geo.city, g.geo.isp].filter(Boolean).join(', ')}${g.geo.host ? ' (хостинг/VPN?)' : ''}` : ''}`)
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

const Feedback = {
    async open() {
        Layer.closeModals();
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
            const btn = e.currentTarget;
            const title = scrim.querySelector('[data-a="t"]').value.trim(),
                text = scrim.querySelector('[data-a="b"]').value.trim();
            if (text.length < 3) return toast('Напиши, о чём обращение', 'err');
            btn.disabled = true;
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
                btn.disabled = false;
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

// ---------- Админ-действия: подсчёт для куратора по нику администратора и периоду ----------
const NICK_RE = /\b[A-Z][A-Za-z0-9]{1,20}_[A-Z][A-Za-z0-9]{1,20}\b/g;
// что считается админ-действиями: ровно эти категории сайта
// desc — в описании таких записей админ может стоять не в поле «игрок», ищем его и по тексту
const ADMIN_CATS = [
    { k: 'act', name: 'Админ действия', re: /^админ\S*\s*действ/i, desc: true },
    { k: 'gchat', name: 'Админ общий чат', re: /^админ\S*\s*общ\S*\s*чат/i },
    { k: 'chat', name: 'Админ чат', re: /^админ\S*\s*чат/i },
    { k: 'block', name: 'Админ блокировки', re: /^админ\S*\s*блок/i, desc: true },
    { k: 'super', name: 'Супер наказания', re: /супер\s*-?\s*наказ/i, desc: true }
];
const AdminView = {
    // номера категорий, вписанные вручную: { act: '70', … }
    ids() {
        return Object.assign({}, Store.get('adminIds', {}));
    },
    // категории с номерами: вписанный вручную важнее найденного по названию
    resolve() {
        catName({ category_id: 0 });
        const man = this.ids();
        const taken = new Set();
        return ADMIN_CATS.map(c => {
            let id = man[c.k] ? String(man[c.k]) : '';
            let auto = false;
            if (!id) {
                const hit = Object.keys(CATS).find(k => /^\d+$/.test(k) && !taken.has(k) && c.re.test(String(CATS[k]).trim()));
                if (hit) (id = hit), (auto = true);
            }
            if (id) taken.add(id);
            return Object.assign({}, c, { id, auto });
        });
    },
    // все известные категории сайта (для ботов: какие из них чаты)
    known() {
        catName({ category_id: 0 });
        return Object.keys(CATS)
            .filter(k => /^\d+$/.test(k))
            .map(id => ({ id, name: CATS[id] }));
    },

    // даты в календаре — московские сутки
    mskDay(t) {
        return Number.isFinite(t) ? new Date(t + 3 * 3600e3).toISOString().slice(0, 10) : '';
    },
    dayStart(s) {
        const [y, m, d] = s.split('-').map(Number);
        return Date.UTC(y, m - 1, d) - 3 * 3600e3;
    },
    presets() {
        const today = this.mskDay(Date.now());
        const [y, m] = today.split('-').map(Number);
        const iso = (yy, mm, dd) => new Date(Date.UTC(yy, mm - 1, dd)).toISOString().slice(0, 10);
        const ago = n => this.mskDay(Date.now() - n * 864e5);
        return [
            ['Сегодня', today, today],
            ['Вчера', ago(1), ago(1)],
            ['7 дней', ago(6), today],
            ['30 дней', ago(29), today],
            ['Этот месяц', iso(y, m, 1), today],
            ['Прошлый месяц', iso(y, m - 1, 1), iso(y, m, 0)]
        ];
    },

    open(nick = '') {
        // без нового ника — прежнее окно с подсчётом
        if (this.scrim && (!nick || nick === this._nick)) return Layer.show(this.scrim);
        if (this.scrim) this.scrim.remove();
        this.scrim = null;
        Layer.closeModals();
        this._gen = (this._gen || 0) + 1;
        const last = Store.get('adminLast', {});
        const P = this.presets();
        const scrim = (this.scrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal vdl">
            <div class="m-head"><span class="vic" style="--c:#7a5cff;width:34px;height:34px;border-radius:10px">${icon('lock', 16)}</span>
              <div><div class="m-title">Админ-действия</div><div class="m-sub">Сервер ${U.esc(Api.server() || '?')} · время МСК</div></div>
              <span style="flex:1"></span><button class="btn" data-a="cfg">${icon('spark', 14)}Что считать</button><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="vdl-form">
                <input class="inp" data-a="q" placeholder="Ник администратора" value="${U.esc(nick || last.nick || '')}">
                <label class="vdl-date">с <input class="inp" type="date" data-a="from"></label>
                <label class="vdl-date">по <input class="inp" type="date" data-a="to"></label>
                <button class="btn pri" data-a="go">${icon('search', 14)}Посчитать</button>
              </div>
              <div class="vdl-presets">${P.map((x, i) => `<button class="btn" data-p="${i}">${x[0]}</button>`).join('')}</div>
              <div class="vdl-prog"></div>
              <div class="vdl-out"></div>
            </div></div></div>`)
        ));
        const $ = s => scrim.querySelector(s);
        const close = () => Layer.hide(scrim);
        $('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        $('[data-a="cfg"]').onclick = () => this.settings();
        const from = $('[data-a="from"]'),
            to = $('[data-a="to"]'),
            q = $('[data-a="q"]');
        // по умолчанию — сегодня
        from.value = P[0][1];
        to.value = P[0][2];
        from.max = to.max = P[0][1];
        const mark = () => scrim.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', P[+b.dataset.p][1] === from.value && P[+b.dataset.p][2] === to.value));
        from.onchange = to.onchange = mark;
        mark();
        scrim.querySelectorAll('[data-p]').forEach(b => {
            b.onclick = () => {
                const p = P[+b.dataset.p];
                from.value = p[1];
                to.value = p[2];
                mark();
                if (q.value.trim()) go();
            };
        });
        const go = () => {
            const nk = q.value.trim();
            if (!/^[A-Za-z0-9]+_[A-Za-z0-9]+$/.test(nk)) return this.msg('Впиши ник администратора: Имя_Фамилия');
            if (!from.value || !to.value) return this.msg('Выбери даты');
            let a = from.value,
                b = to.value;
            if (a > b) [a, b] = [b, a];
            if ((this.dayStart(b) - this.dayStart(a)) / 864e5 > 92) return this.msg('Период — не больше 3 месяцев');
            Store.set('adminLast', { nick: nk });
            this._nick = nk;
            this.count(nk, a, b);
        };
        $('[data-a="go"]').onclick = go;
        q.addEventListener('keydown', e => e.key === 'Enter' && go());
        CatLearn.discover().catch(() => {});
        if (nick) go();
        else setTimeout(() => q.focus(), 50);
    },
    msg(t) {
        const o = this.scrim && this.scrim.querySelector('.vdl-out');
        if (o) o.innerHTML = `<div class="card" style="padding:14px">${icon('x', 14)} ${U.esc(t)}</div>`;
    },
    prog(t, gen) {
        if (this.scrim && gen === this._gen) this.scrim.querySelector('.vdl-prog').textContent = t;
    },

    async count(nick, a, b) {
        // подсчёт из закрытого окна не мешает: он уже остановлен поколением
        if (this.busy && this._busyGen === this._gen) return toast('Подожди, подсчёт ещё идёт', 'info');
        this.busy = true;
        const gen = (this._busyGen = this._gen);
        const alive = () => gen === this._gen;
        const out = this.scrim.querySelector('.vdl-out');
        out.innerHTML = '';
        try {
            // номера категорий ещё не известны — сначала ищем их на сайте
            if (this.resolve().some(c => !c.id)) await CatLearn.discover().catch(() => {});
            if (!alive()) return;
            const cats = this.resolve();
            const ready = cats.filter(c => c.id);
            if (!ready.length) throw new Error('не найдены номера категорий — впиши их в «Что считать»');
            // конец периода — не позже «сейчас»: новые записи во время листания не сдвигают страницы
            const t0 = this.dayStart(a),
                t1 = Math.min(this.dayStart(b) + 864e5 - 1, Date.now());
            const range = { time__gte: new Date(t0).toISOString(), time__lte: new Date(t1).toISOString() };
            const own = [],
                seen = new Set();
            let capped = false;
            const key = r => `${r.time}|${r.category_id}|${r.player_id}|${r.transaction_desc}`;
            const addRows = (rows, cat) =>
                rows.forEach(r => {
                    // только запрошенная категория, даже если сайт вернул лишнее
                    if (r.category_id != null && String(r.category_id) !== String(cat.id)) return;
                    const k = key(r);
                    if (seen.has(k)) return;
                    seen.add(k);
                    // запись сайта могла прийти без номера категории — проставляем тот, по которому искали
                    own.push(r.category_id == null ? Object.assign({}, r, { category_id: cat.id }) : r);
                });
            for (const [i, cat] of ready.entries()) {
                const step = `${cat.name} (${i + 1}/${ready.length})`;
                // 1) записи, где админ — сам «игрок» записи
                const r = await Api.all({ player_name__exact: nick, category_id__exact: cat.id, ...range }, 60, (p, n) => this.prog(`${step}: страница ${p}, записей ${n}…`, gen), null, alive);
                if (!alive()) return;
                capped = capped || r.capped;
                addRows(r, cat);
                // 2) наказания, где игрок записи — нарушитель, а админ назван в тексте первым
                if (cat.desc) {
                    const r2 = await Api.all({ transaction_desc__ilike: `%${nick}%`, category_id__exact: cat.id, ...range }, 60, (p, n) => this.prog(`${step}, по тексту: страница ${p}, записей ${n}…`, gen), null, alive);
                    if (!alive()) return;
                    capped = capped || r2.capped;
                    addRows(
                        r2.filter(x => {
                            if (sameNick(x.player_name, nick)) return true;
                            const first = (String(x.transaction_desc || '').match(NICK_RE) || []).find(n => !sameNick(n, x.player_name)) || '';
                            return sameNick(first, nick);
                        }),
                        cat
                    );
                }
            }
            this.prog('', gen);
            this.render(out, { nick, a, b, all: own, own, cats, capped, tab: 'cat' });
        } catch (e) {
            if (!alive()) return;
            this.prog('', gen);
            this.msg('Не получилось: ' + e.message);
        } finally {
            if (this._busyGen === gen) this.busy = false;
        }
    },

    render(out, d) {
        const { nick, a, b, all, own } = d;
        const list = d.cats || [];
        const missing = list.filter(c => !c.id);
        const days = [];
        for (let t = this.dayStart(a); t <= this.dayStart(b); t += 864e5) days.push(this.mskDay(t + 3600e3));
        const perDay = new Map(days.map(x => [x, 0]));
        own.forEach(r => {
            const k = this.mskDay(new Date(r.time).getTime());
            if (perDay.has(k)) perDay.set(k, perDay.get(k) + 1);
        });
        const active = [...perDay.values()].filter(Boolean).length;
        const cnt = new Map();
        own.forEach(r => cnt.set(String(r.category_id), (cnt.get(String(r.category_id)) || 0) + 1));
        const cats = list.filter(c => c.id).map(c => ({ k: c.id, name: c.name, n: cnt.get(String(c.id)) || 0 }));
        const catNm = new Map(cats.map(c => [String(c.k), c.name]));
        const dmax = Math.max(1, ...perDay.values());
        const cmax = Math.max(1, ...cats.map(g => g.n));
        // над кем работал: ники из описаний действий (кроме самого админа)
        const tg = new Map();
        own.forEach(r => {
            const seen = new Set();
            (String(r.transaction_desc || '').match(NICK_RE) || []).forEach(n => {
                if (sameNick(n, nick) || seen.has(n)) return;
                seen.add(n);
                const g = tg.get(n) || { k: n, n: 0, acts: [], kinds: new Map(), last: 0 };
                g.n++;
                const t = new Date(r.time).getTime() || 0;
                const act = actionOf(r.transaction_desc, nick);
                const hitA = ACTIONS.find(([re]) => re.test(String(r.transaction_desc || '')));
                const kind = hitA ? hitA[1] : 'действие';
                g.kinds.set(kind, (g.kinds.get(kind) || 0) + 1);
                g.acts.push({ t, act, desc: r.transaction_desc });
                g.last = Math.max(g.last, t);
                tg.set(n, g);
            });
        });
        const targets = [...tg.values()].sort((x, y) => y.n - x.n || y.last - x.last);
        const H = hoursHtml(own.map(r => new Date(r.time).getTime()));
        const fmtDay = s => s.split('-').reverse().slice(0, 2).join('.');
        const ru = s => s.split('-').reverse().join('.');
        const wd = k => ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][new Date(k + 'T12:00:00Z').getUTCDay()];
        const nm = id => catNm.get(String(id)) || catTitle(id, all);
        this.last = d;
        this._rows = all;
        out.innerHTML = `
          <div class="vdl-sum">
            <div class="k"><small>Админ-действий</small><b>${own.length}</b></div>
            <div class="k"><small>Дней с действиями</small><b>${active} / ${days.length}</b></div>
            <div class="k"><small>В среднем в день</small><b>${days.length ? String(+(own.length / days.length).toFixed(1)) : 0}</b></div>
            <div class="k"><small>Игроков</small><b>${targets.length}</b></div>
          </div>
          <div class="muted" style="font-size:12px;margin:-4px 0 10px">${U.esc(nick)} · ${a === b ? ru(a) : `${ru(a)} — ${ru(b)}`}${d.capped ? ' · записей очень много — посчитаны не все, возьми период короче' : ''}</div>
          ${missing.length ? `<div class="card" style="padding:12px 14px;margin-bottom:10px;border-color:#f5a52466">${icon('x', 13)} Не найден номер: ${missing.map(c => `«${U.esc(c.name)}»`).join(', ')} — эти категории не посчитаны. <button class="btn" data-a="cfg2" style="height:26px;margin-left:6px">Указать</button></div>` : ''}
          <div class="seg vdl-tabs" data-g="atab"><button data-v="cat">${icon('spark', 13)}Категории</button><button data-v="day">${icon('download', 13)}По дням</button><button data-v="who">${icon('shield', 13)}Игроки</button><button data-v="list">${icon('eye', 13)}Список</button></div>
          <div data-at="cat">
            <div class="sec"><h4>По категориям</h4><div class="card">${
                cats.length
                    ? cats.map(g => `<div class="vdl-bar${g.n ? '' : ' muted'}"><span class="nm" title="${U.esc(nm(g.k))}">${U.esc(nm(g.k))}</span><span class="tr"><b style="width:${g.n ? Math.max(3, Math.round((g.n / cmax) * 100)) : 0}%"></b></span><span class="n">${g.n}</span></div>`).join('')
                    : '<div class="vdl-row"><div class="main sub">Админ-действий за период нет</div></div>'
            }</div></div>
          </div>
          <div data-at="day" hidden>
            ${own.length ? `<div class="sec"><h4>Часы активности</h4><div class="card">${H.html}<div class="sub" style="padding:0 2px 8px">Чаще всего — ${String(H.peak).padStart(2, '0')}:00–${String(H.peak).padStart(2, '0')}:59</div></div></div>` : ''}
            <div class="sec"><h4>По дням</h4><div class="card">${days
                .slice()
                .reverse()
                .map(k => `<div class="vdl-bar"><span class="nm">${fmtDay(k)} ${wd(k)}</span><span class="tr"><b style="width:${perDay.get(k) ? Math.max(3, Math.round((perDay.get(k) / dmax) * 100)) : 0}%"></b></span><span class="n${perDay.get(k) ? '' : ' muted'}">${perDay.get(k)}</span></div>`)
                .join('')}</div></div>
          </div>
          <div data-at="who" hidden><div class="sec"><h4>Над кем работал</h4><div class="card" data-l="who">${
              targets.length
                  ? targets
                        .slice(0, 50)
                        .map(
                            g => `<div class="vdl-row"><div class="main"><div class="ttl"><span class="vdl-nick" data-nick="${U.esc(g.k)}">${U.esc(g.k)}</span>${[...g.kinds].sort((x, y) => y[1] - x[1]).map(([k, n]) => `<span class="vdl-tag" style="--c:${/^раз|снят|выпуск/.test(k) ? '#2fbf71' : /бан|блок|деморган/.test(k) ? '#e5484d' : /мут|предупр|кик/.test(k) ? '#f5a524' : '#3aa0ff'}">${U.esc(k)}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div>${g.acts
                                .sort((x, y) => y.t - x.t)
                                .map((x, i) => `<div class="sub" ${i > 2 ? 'hidden' : ''} title="${U.esc(x.desc)}">${fmtDate(x.t)} — ${U.esc(x.act)}</div>`)
                                .join('')}${g.acts.length > 3 ? `<button class="vdl-more-btn" data-more>и ещё ${g.acts.length - 3} — показать</button>` : ''}</div><div class="vdl-btns"><button class="btn" data-an="${U.esc(g.k)}">${icon('search', 13)}Разобрать</button></div></div>`
                        )
                        .join('')
                  : '<div class="vdl-row"><div class="main sub">В действиях нет ников игроков</div></div>'
          }</div></div></div>
          <div data-at="list" hidden><div class="sec"><h4>Действия</h4>
            <input class="inp vdl-filter" data-a="flt" placeholder="Найти: ник, слово…">
            <div class="card" data-l="list"></div></div></div>
          <div class="btns" style="margin-top:12px"><span style="flex:1"></span><button class="btn" data-a="copy">${icon('download', 14)}Скопировать отчёт</button></div>`;
        // список действий с поиском
        const sorted = own.slice().sort((x, y) => new Date(y.time) - new Date(x.time));
        const listBox = out.querySelector('[data-l="list"]');
        const drawList = () => {
            const f = out.querySelector('[data-a="flt"]').value.trim().toLowerCase();
            const rows = f ? sorted.filter(r => `${r.transaction_desc || ''} ${nm(r.category_id)}`.toLowerCase().includes(f)) : sorted;
            listBox.innerHTML = rows.length
                ? rows
                      .slice(0, 300)
                      .map(r => `<div class="vdl-row"><div class="main"><div class="ttl"><span class="vdl-tag">${U.esc(nm(r.category_id))}</span><span class="sub" style="margin:0">${fmtDate(r.time)}</span></div><div class="sub vdl-desc">${U.esc(moneyText(r.transaction_desc))}</div></div></div>`)
                      .join('') + (rows.length > 300 ? `<div class="sub" style="padding:8px 2px">Показаны 300 из ${rows.length}</div>` : '')
                : '<div class="vdl-row"><div class="main sub">Ничего не нашлось</div></div>';
        };
        out.querySelector('[data-a="flt"]').oninput = U.debounce(drawList, 150);
        drawList();
        const tabs = out.querySelector('[data-g="atab"]');
        const show = t => {
            d.tab = t;
            tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === t));
            out.querySelectorAll('[data-at]').forEach(x => (x.hidden = x.dataset.at !== t));
        };
        tabs.querySelectorAll('button').forEach(bt => (bt.onclick = () => show(bt.dataset.v)));
        show(d.tab || 'cat');
        out.querySelectorAll('.vdl-nick').forEach(el => copyNick(el, el.dataset.nick));
        out.querySelectorAll('[data-an]').forEach(bt => (bt.onclick = () => Panel.open('nick', bt.dataset.an, { stack: true })));
        out.querySelectorAll('[data-more]').forEach(
            bt =>
                (bt.onclick = () => {
                    bt.parentElement.querySelectorAll('.sub[hidden]').forEach(x => (x.hidden = false));
                    bt.remove();
                })
        );
        const c2 = out.querySelector('[data-a="cfg2"]');
        if (c2) c2.onclick = () => this.settings();
        out.querySelector('[data-a="copy"]').onclick = () => {
            const L = [`Админ-действия ${nick} · ${a === b ? ru(a) : `${ru(a)} — ${ru(b)}`} (МСК) · сервер ${Api.server()}`, `Всего: ${own.length}, дней с действиями: ${active} из ${days.length}`];
            cats.forEach(g => L.push(`• ${nm(g.k)}: ${g.n}`));
            if (days.length > 1) {
                L.push('По дням:');
                days.forEach(k => perDay.get(k) && L.push(`  ${fmtDay(k)} — ${perDay.get(k)}`));
            }
            if (targets.length) {
                L.push('Игроки:');
                targets.slice(0, 15).forEach(g => L.push(`  ${g.k}: ${[...g.kinds].map(([k, n]) => k + (n > 1 ? ' ×' + n : '')).join(', ')}`));
            }
            navigator.clipboard.writeText(L.join('\n')).then(
                () => toast('Отчёт скопирован'),
                () => toast('Не удалось скопировать', 'err')
            );
        };
    },

    // что считать админ-действиями
    settings() {
        if (this.cfgScrim) this.cfgScrim.remove();
        const cats = this.resolve();
        const scrim = (this.cfgScrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal sm">
            <div class="m-head"><span class="vic" style="--c:#7a5cff;width:34px;height:34px;border-radius:10px">${icon('spark', 16)}</span>
              <div><div class="m-title">Что считать админ-действиями</div></div>
              <span style="flex:1"></span><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="card">${cats
                  .map(
                      c => `<div class="vdl-mrow"><span class="vic" style="--c:${c.id ? '#2fbf71' : '#f5a524'};width:22px;height:22px;border-radius:7px">${icon(c.id ? 'check' : 'x', 12)}</span><span class="nm">${U.esc(c.name)}</span><input class="inp" data-k="${c.k}" inputmode="numeric" maxlength="4" placeholder="№" value="${U.esc(c.id)}" title="Номер категории на сайте логов" style="width:74px;height:30px;text-align:center"></div>`
                  )
                  .join('')}</div>
              <div class="btns" style="margin-top:10px"><button class="btn" data-a="find">${icon('search', 14)}Найти номера</button><span style="flex:1"></span><button class="btn pri" data-a="save">Сохранить</button></div>
            </div></div></div>`)
        ));
        const close = () => {
            scrim.remove();
            if (this.cfgScrim === scrim) this.cfgScrim = null;
        };
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        scrim.querySelector('[data-a="find"]').onclick = async e => {
            const bt = e.currentTarget;
            bt.disabled = true;
            CatLearn._disc = null;
            const n = await CatLearn.discover().catch(() => 0);
            if (!scrim.isConnected) return;
            const left = this.resolve().filter(c => !c.id).length;
            toast(left ? `Не нашлось: ${left} — впиши номера вручную` : 'Номера найдены', left ? 'info' : 'ok');
            if (n || !left) this.settings();
            else bt.disabled = false;
        };
        scrim.querySelector('[data-a="save"]').onclick = () => {
            const man = {};
            const auto = new Map(cats.filter(c => c.auto).map(c => [c.k, c.id]));
            let bad = false;
            scrim.querySelectorAll('[data-k]').forEach(inp => {
                const v = inp.value.trim();
                if (v && !/^\d{1,4}$/.test(v)) bad = true;
                // найденный сам — не закрепляем, чтобы сайт мог его уточнить
                else if (v && auto.get(inp.dataset.k) !== v) man[inp.dataset.k] = v;
            });
            if (bad) return toast('Номер категории — число, например 70', 'err');
            Store.set('adminIds', man);
            toast('Сохранено');
            close();
        };
    }
};

// ---------- Боты: реклама в чатах, много аккаунтов с одного IP, низкий уровень ----------
const BOT_PHRASES = ['телеграм', 'телеграмм', 'телега', 'тг канал', 'тгк', 't.me', 'шок', 'подпишись', 'подписывайся', 'переходи по ссылке', 'переходи в', 'халява', 'раздача', 'бесплатно'];
// латиница и цифры, похожие на русские буквы, — к русским; без пробелов и знаков
const BOT_LOOK = { a: 'а', b: 'в', c: 'с', e: 'е', g: 'г', h: 'н', k: 'к', m: 'м', n: 'п', o: 'о', p: 'р', r: 'г', t: 'т', u: 'и', x: 'х', y: 'у', 0: 'о', 3: 'з', 6: 'б', ё: 'е' };
function botNorm(s, keepLatin) {
    const t = String(s || '').toLowerCase();
    let out = '';
    for (const ch of t) {
        if (/[а-яё]/.test(ch)) out += BOT_LOOK[ch] || ch;
        else if (/[a-z0-9]/.test(ch)) out += keepLatin ? ch : BOT_LOOK[ch] || ch;
    }
    return out;
}
const Bots = {
    DEF: { phrases: BOT_PHRASES.join('\n'), level: 2, minAcc: 3, fuzzy: false, levels: true, marks: true, chats: null },
    cfg() {
        return Object.assign({}, this.DEF, Store.get('botCfg', {}));
    },
    // все известные категории чатов
    allChats() {
        return AdminView.known().filter(x => /чат|chat/i.test(x.name) && !/админ|admin/i.test(x.name));
    },
    // по умолчанию боты пишут в игровые чаты: RP и NonRP
    isGameChat(name) {
        return /(^|[^a-zа-яё])(non\s*-?\s*)?(rp|рп)(?![a-zа-яё])|nonrp|нонрп/i.test(name);
    },
    // где искать: выбранные вручную или игровые чаты; пусто — категории ещё неизвестны, ищем везде
    chats(c = this.cfg()) {
        const all = this.allChats();
        if (Array.isArray(c.chats)) return all.filter(x => c.chats.includes(String(x.id)));
        return all.filter(x => this.isGameChat(x.name));
    },
    phrases(c = this.cfg()) {
        return String(c.phrases || '')
            .split(/\n|,/)
            .map(x => x.trim())
            .filter(x => x.length >= 2 && botNorm(x, true).length >= 2);
    },
    // какие фразы есть в тексте: точное совпадение и «похожее» (тeлеграм латиницей, т е л е г р а м)
    match(text, list) {
        const low = String(text || '').toLowerCase();
        const norm = botNorm(text);
        const latin = botNorm(text, true);
        const hit = [];
        (list || this._list || (this._list = this.phrases())).forEach(p => {
            const pl = p.toLowerCase();
            const bn = botNorm(p);
            // короткие фразы («шок», «тгк») — только целым словом, иначе «шоколад» тоже реклама
            if (bn.length <= 4) {
                const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wb = '[^а-яёa-z0-9]';
                const word = new RegExp(`(^|${wb})${esc(pl)}($|${wb})`, 'i');
                // и по словам с латиницей-двойниками: «тгк», «tgк»
                const words = low.split(/\s+/).map(w => botNorm(w)).join(' ');
                if (word.test(low) || new RegExp(`(^|${wb})${esc(bn)}($|${wb})`).test(words)) hit.push(p);
                return;
            }
            if (low.includes(pl) || (bn && norm.includes(bn)) || (/[a-z]/.test(pl) && botNorm(p, true) && latin.includes(botNorm(p, true)))) hit.push(p);
        });
        return hit;
    },
    reset() {
        this._list = null;
    }
};

const BotView = {
    RANGES: [
        ['1 час', () => [Date.now() - 3600e3, Date.now()]],
        ['3 часа', () => [Date.now() - 3 * 3600e3, Date.now()]],
        ['6 часов', () => [Date.now() - 6 * 3600e3, Date.now()]],
        ['Сегодня', () => [AdminView.dayStart(AdminView.mskDay(Date.now())), Date.now()]],
        ['Вчера', () => {
            const s = AdminView.dayStart(AdminView.mskDay(Date.now()));
            return [s - 864e5, s - 1];
        }],
        ['24 часа', () => [Date.now() - 864e5, Date.now()]]
    ],
    open() {
        if (this.scrim) return Layer.show(this.scrim);
        Layer.closeModals();
        this._gen = (this._gen || 0) + 1;
        const sel = Store.get('botRange', 3);
        const scrim = (this.scrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal vdl">
            <div class="m-head"><span class="vic" style="--c:#f5a524;width:34px;height:34px;border-radius:10px">${icon('bot', 16)}</span>
              <div><div class="m-title">Поиск ботов</div><div class="m-sub">Реклама в чатах · аккаунты с одного IP · низкий уровень</div></div>
              <span style="flex:1"></span><button class="btn" data-a="cfg">${icon('spark', 14)}Что ловить</button><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="vdl-form">
                <div class="seg" data-g="rng">${this.RANGES.map((r, i) => `<button data-v="${i}" class="${i === sel ? 'on' : ''}">${r[0]}</button>`).join('')}</div>
                <span style="flex:1"></span>
                <button class="btn pri" data-a="go">${icon('search', 14)}Искать</button>
              </div>
              <div class="vdl-prog"></div>
              <div class="vdl-out"></div>
            </div></div></div>`)
        ));
        const close = () => Layer.hide(scrim);
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        scrim.querySelector('[data-a="cfg"]').onclick = () => this.settings();
        let r = sel;
        scrim.querySelectorAll('[data-g="rng"] button').forEach(
            b =>
                (b.onclick = () => {
                    r = +b.dataset.v;
                    Store.set('botRange', r);
                    scrim.querySelectorAll('[data-g="rng"] button').forEach(x => x.classList.toggle('on', x === b));
                })
        );
        scrim.querySelector('[data-a="go"]').onclick = () => this.search(this.RANGES[r]);
        CatLearn.discover().catch(() => {});
    },
    prog(t, gen) {
        if (this.scrim && gen === this._gen) this.scrim.querySelector('.vdl-prog').textContent = t;
    },
    async search([label, get]) {
        if (this.busy && this._busyGen === this._gen) return toast('Подожди, поиск ещё идёт', 'info');
        this.busy = true;
        const gen = (this._busyGen = this._gen);
        const alive = () => gen === this._gen;
        let capped = false;
        const out = this.scrim.querySelector('.vdl-out');
        out.innerHTML = '';
        const c = Bots.cfg();
        Bots.reset();
        const list = Bots.phrases(c);
        try {
            if (!list.length) throw new Error('список фраз пуст — добавь их в «Что ловить»');
            const [t0, t1] = get();
            const range = { time__gte: new Date(t0).toISOString(), time__lte: new Date(t1).toISOString() };
            const seen = new Set(),
                rows = [];
            const chats = Bots.chats(c);
            const chatIds = new Set(chats.map(x => String(x.id)));
            if (!chats.length && Array.isArray(c.chats) && Bots.allChats().length) throw new Error('не выбран ни один чат — отметь их в «Что ловить»');
            if (!chats.length) toast('Категории чатов ещё не известны — ищу во всех записях', 'info');
            const take = arr =>
                arr.forEach(x => {
                    if (chatIds.size && !chatIds.has(String(x.category_id))) return;
                    const k = `${x.time}|${x.player_name}|${x.transaction_desc}`;
                    if (seen.has(k)) return;
                    seen.add(k);
                    const hit = Bots.match(x.transaction_desc, list);
                    if (hit.length) rows.push(Object.assign({ _hit: hit }, x));
                });
            // 1) точные фразы — поиском сайта
            for (const [i, p] of list.entries()) {
                const r = await Api.all({ transaction_desc__ilike: `%${p}%`, ...range }, 5, (pg, n) => this.prog(`«${p}» (${i + 1}/${list.length}): страница ${pg}, записей ${n}…`, gen), null, alive);
                if (!alive()) return;
                capped = capped || r.capped;
                take(r);
            }
            // 2) похожие написания — читаем чаты целиком
            if (c.fuzzy) {
                for (const ch of chats) {
                    const r = await Api.all({ category_id__exact: ch.id, ...range }, 10, (pg, n) => this.prog(`${ch.name}: страница ${pg}, записей ${n}…`, gen), null, alive);
                    if (!alive()) return;
                    capped = capped || r.capped;
                    take(r);
                }
            }
            // подозреваемые: по нику
            const sus = new Map();
            const nickKey = new Map();
            rows.forEach(x => {
                const n = String(x.player_name || '').trim();
                if (!n) return;
                const low = n.toLowerCase();
                const k = (x.player_id != null && x.player_id !== '' && 'id' + x.player_id) || nickKey.get(low) || 'n' + low;
                nickKey.set(low, k);
                const g = sus.get(k) || { nick: n, id: x.player_id, n: 0, hits: new Set(), ips: new Set(), sample: '', last: 0, cats: new Set() };
                g.n++;
                x._hit.forEach(h => g.hits.add(h));
                if (x.player_ip) g.ips.add(x.player_ip);
                g.cats.add(catName(x));
                const t = new Date(x.time).getTime() || 0;
                if (t >= g.last) {
                    g.last = t;
                    g.sample = String(x.transaction_desc || '');
                }
                sus.set(k, g);
            });
            // сколько подозреваемых на каждом IP
            const byIp = new Map();
            sus.forEach(g => g.ips.forEach(ip => byIp.set(ip, (byIp.get(ip) || new Set()).add(g.nick))));
            sus.forEach(g => (g.acc = Math.max(1, ...[...g.ips].map(ip => byIp.get(ip).size))));
            const arr = [...sus.values()].sort((x, y) => y.acc - x.acc || y.n - x.n);
            // уровни: последний вход/выход с «Уровень: N»
            if (c.levels) {
                const top = arr.slice(0, 40);
                for (const [i, g] of top.entries()) {
                    if (!alive()) return;
                    this.prog(`Уровни: ${i + 1} из ${top.length}…`, gen);
                    try {
                        const r = await Api.page({ player_name__exact: g.nick, category_id__exact: 38, transaction_desc__ilike: '%ровень%' }, 0);
                        if (gen !== this._gen) return;
                        const m = r
                            .slice()
                            .sort((x, y) => new Date(y.time) - new Date(x.time))
                            .map(x => String(x.transaction_desc || '').match(/ровень\D{0,3}(\d+)/i))
                            .find(Boolean);
                        g.level = m ? +m[1] : null;
                    } catch {
                        g.level = null;
                    }
                }
            }
            this.prog('', gen);
            arr.forEach(g => {
                g.why = [];
                if (g.level != null && g.level <= c.level) g.why.push(`уровень ${g.level}`);
                if (g.acc >= c.minAcc) g.why.push(`${g.acc} акк. с одного IP`);
                if (g.n >= 3) g.why.push(`${g.n} сообщ.`);
                g.bot = g.why.some(w => /уровень|акк/.test(w));
            });
            arr.sort((x, y) => y.bot - x.bot || y.why.length - x.why.length || y.n - x.n);
            this.render(out, { label, arr, rows, c, ips: byIp, capped });
        } catch (e) {
            if (gen !== this._gen) return;
            this.prog('', gen);
            out.innerHTML = `<div class="card" style="padding:14px">${icon('x', 14)} Не получилось: ${U.esc(e.message)}</div>`;
        } finally {
            if (this._busyGen === gen) this.busy = false;
        }
    },
    render(out, d) {
        const { arr, rows, c, ips } = d;
        const bots = arr.filter(g => g.bot);
        const groups = [...ips.values()].filter(s => s.size >= c.minAcc).length;
        // IP, с которых писало больше всего подозреваемых аккаунтов
        const msgs = new Map();
        rows.forEach(x => x.player_ip && msgs.set(x.player_ip, (msgs.get(x.player_ip) || 0) + 1));
        const shown = new Set();
        const topIps = [];
        [...ips]
            .sort((x, y) => y[1].size - x[1].size || (msgs.get(y[0]) || 0) - (msgs.get(x[0]) || 0))
            .forEach(([ip, set]) => {
                if (topIps.length >= 5) return;
                const fresh = [...set].filter(n => !shown.has(n));
                if (fresh.length < 2) return;
                fresh.forEach(n => shown.add(n));
                topIps.push([ip, new Set(fresh)]);
            });
        const hl = (text, hits) => {
            const raw = String(text).slice(0, 180);
            const pats = hits.filter(h => raw.toLowerCase().includes(h.toLowerCase())).map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            if (!pats.length) return U.esc(raw);
            return raw
                .split(new RegExp(`(${pats.join('|')})`, 'gi'))
                .map((part, i) => (i % 2 ? `<mark>${U.esc(part)}</mark>` : U.esc(part)))
                .join('');
        };
        out.innerHTML = `
          ${
              topIps.length
                  ? `<div class="sec" style="margin:0 0 14px"><h4>Самые частые IP</h4><div class="card">${topIps
                        .map(
                            ([ip, set]) => `<div class="vdl-row"><div class="main"><div class="ttl"><span class="vdl-tag" style="--c:${set.size >= c.minAcc ? '#f5a524' : '#3aa0ff'}">${U.esc(ip)}</span><b>${set.size} акк.</b><span class="sub" style="margin:0">${msgs.get(ip) || 0} сообщ.</span></div><div class="sub">${[...set]
                                .slice(0, 8)
                                .map(n => `<span class="vdl-nick" data-nick="${U.esc(n)}">${U.esc(n)}</span>`)
                                .join(', ')}${set.size > 8 ? ` и ещё ${set.size - 8}` : ''}</div></div><div class="vdl-btns"><button class="btn" data-ip="${U.esc(ip)}">IP</button></div></div>`
                        )
                        .join('')}</div></div>`
                  : ''
          }
          <div class="vdl-sum">
            <div class="k"><small>Похожи на ботов</small><b>${bots.length}</b></div>
            <div class="k"><small>Писали рекламу</small><b>${arr.length}</b></div>
            <div class="k"><small>Сообщений</small><b>${rows.length}</b></div>
            <div class="k"><small>IP с ${c.minAcc}+ акк.</small><b>${groups}</b></div>
          </div>
          <div class="muted" style="font-size:12px;margin:-4px 0 10px">${U.esc(d.label)}${d.capped ? ' · сообщений очень много — проверены не все, возьми период короче' : ''}</div>
          <div class="card" data-l="list">${
              arr.length
                  ? arr
                        .map(
                            g => `<div class="vdl-row vdl-botrow ${g.bot ? 'is-bot' : ''}"><div class="main">
                      <div class="ttl"><span class="vdl-nick" data-nick="${U.esc(g.nick)}">${U.esc(g.nick)}</span>
                        ${g.bot ? '<span class="vdl-tag" style="--c:#e5484d">похож на бота</span>' : ''}
                        ${g.level != null ? `<span class="vdl-tag" style="--c:${g.level <= c.level ? '#e5484d' : '#8b8f9a'}">ур. ${g.level}</span>` : ''}
                        ${[...g.ips].slice(0, 2).map(ip => `<span class="vdl-tag" style="--c:${ips.get(ip).size >= c.minAcc ? '#f5a524' : '#3aa0ff'}">${U.esc(ip)}${ips.get(ip).size > 1 ? ` · ${ips.get(ip).size} акк.` : ''}</span>`).join('')}
                        <span class="vdl-tag" style="--c:#8b8f9a">${g.n} сообщ.</span></div>
                      <div class="sub vdl-desc">${hl(g.sample, [...g.hits])}</div>
                      <div class="sub">${fmtDate(g.last)} · ${U.esc([...g.cats].join(', '))}${g.why.length ? ' · ' + U.esc(g.why.join(', ')) : ''}</div></div>
                    <div class="vdl-btns"><button class="btn" data-an="${U.esc(g.nick)}">${icon('search', 13)}Игрок</button>${g.ips.size ? `<button class="btn" data-ip="${U.esc([...g.ips][0])}">IP</button>` : ''}</div></div>`
                        )
                        .join('')
                  : '<div class="vdl-row"><div class="main sub">За этот период рекламных сообщений не найдено</div></div>'
          }</div>
          ${arr.length ? `<div class="btns" style="margin-top:12px"><span style="flex:1"></span><button class="btn" data-a="copyb">${icon('download', 14)}Ники ботов</button><button class="btn" data-a="copy">${icon('download', 14)}Весь список</button></div>` : ''}`;
        out.querySelectorAll('.vdl-nick').forEach(el => copyNick(el, el.dataset.nick));
        out.querySelectorAll('[data-an]').forEach(b => (b.onclick = () => Panel.open('nick', b.dataset.an, { stack: true })));
        out.querySelectorAll('[data-ip]').forEach(b => (b.onclick = () => Panel.open('ip', b.dataset.ip, { stack: true })));
        const copy = (list, what) =>
            navigator.clipboard.writeText(list.map(g => `${g.nick}${g.level != null ? ` (ур. ${g.level})` : ''} — ${[...g.ips].join(', ')}${g.why.length ? ' — ' + g.why.join(', ') : ''} — «${g.sample.slice(0, 80)}»`).join('\n')).then(
                () => toast(`Скопировано: ${what}`),
                () => toast('Не удалось скопировать', 'err')
            );
        const cb = out.querySelector('[data-a="copyb"]');
        if (cb) cb.onclick = () => (bots.length ? copy(bots, `${bots.length} ботов`) : toast('Похожих на ботов нет', 'info'));
        const ca = out.querySelector('[data-a="copy"]');
        if (ca) ca.onclick = () => copy(arr, `${arr.length} ников`);
    },
    settings() {
        const c = Bots.cfg();
        if (this.cfgScrim) this.cfgScrim.remove();
        const scrim = (this.cfgScrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal sm">
            <div class="m-head"><span class="vic" style="--c:#f5a524;width:34px;height:34px;border-radius:10px">${icon('spark', 16)}</span>
              <div><div class="m-title">Что ловить</div></div>
              <span style="flex:1"></span><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="sub" style="margin-bottom:6px">Фразы ботов — по одной в строке</div>
              <textarea class="inp" data-k="phrases" rows="8" style="width:100%;resize:vertical">${U.esc(c.phrases)}</textarea>
              <div class="sec"><h4>Признаки бота</h4><div class="card">
                <div class="vdl-mrow"><span class="nm">Уровень не выше</span><input class="inp" type="number" min="0" max="99" data-k="level" value="${c.level}" style="width:70px"></div>
                <div class="vdl-mrow"><span class="nm">Аккаунтов с одного IP от</span><input class="inp" type="number" min="2" max="50" data-k="minAcc" value="${c.minAcc}" style="width:70px"></div>
                <div class="vdl-mrow"><input type="checkbox" data-k="levels" ${c.levels ? 'checked' : ''} style="width:18px;height:18px"><span class="nm">Проверять уровень</span></div>
                <div class="vdl-mrow"><input type="checkbox" data-k="fuzzy" ${c.fuzzy ? 'checked' : ''} style="width:18px;height:18px"><span class="nm">Похожие написания <span class="muted">(тeлеграм латиницей, т е л е г р а м — дольше)</span></span></div>
                <div class="vdl-mrow"><input type="checkbox" data-k="marks" ${c.marks ? 'checked' : ''} style="width:18px;height:18px"><span class="nm">Пометки в таблице логов</span></div>
              </div></div>
              <div class="sec"><h4>Где искать</h4><div class="card">${
                  Bots.allChats().length
                      ? Bots.allChats()
                            .map(x => `<div class="vdl-mrow"><input type="checkbox" data-chat="${U.esc(x.id)}" ${Bots.chats(c).some(y => y.id === x.id) ? 'checked' : ''}><span class="nm">${U.esc(x.name)}</span><span class="muted">#${U.esc(x.id)}</span></div>`)
                            .join('')
                      : '<div class="vdl-mrow"><span class="nm muted">Категории чатов появятся, когда откроешь их в логах</span></div>'
              }</div></div>
              <div class="btns" style="margin-top:10px"><button class="btn" data-a="def">Сбросить фразы</button><span style="flex:1"></span><button class="btn pri" data-a="save">Сохранить</button></div>
            </div></div></div>`)
        ));
        const close = () => {
            scrim.remove();
            this.cfgScrim = null;
        };
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        scrim.querySelector('[data-a="def"]').onclick = () => (scrim.querySelector('[data-k="phrases"]').value = Bots.DEF.phrases);
        scrim.querySelector('[data-a="save"]').onclick = () => {
            const v = k => scrim.querySelector(`[data-k="${k}"]`);
            Store.set('botCfg', {
                phrases: v('phrases').value,
                level: Math.max(0, parseInt(v('level').value, 10) || 0),
                minAcc: Math.max(2, parseInt(v('minAcc').value, 10) || 3),
                levels: v('levels').checked,
                fuzzy: v('fuzzy').checked,
                marks: v('marks').checked,
                chats: Bots.allChats().length ? [...scrim.querySelectorAll('[data-chat]')].filter(x => x.checked).map(x => x.dataset.chat) : c.chats
            });
            Bots.reset();
            toast('Сохранено');
            close();
            LogsPage.refreshMarks();
        };
    }
};

const LogsPage = {
    // настройки подсветки: тип → вкл и базовый цвет. По умолчанию только IP
    DEF: { ip: { on: true, col: '#3aa0ff' }, nick: { on: false, col: '#2fbf71' }, dev: { on: false, col: '#a970ff' }, money: true },
    cfg() {
        const c = Store.get('mark', {});
        return {
            ip: Object.assign({}, this.DEF.ip, c.ip),
            nick: Object.assign({}, this.DEF.nick, c.nick),
            dev: Object.assign({}, this.DEF.dev, c.dev),
            money: c.money !== false
        };
    },
    start(info) {
        const srv = Api.server();
        if (srv) Store.set('server', srv);
        Layer.accent(info);
        const acc = info.accent || '#e5484d';
        // кнопки — в шапке сайта рядом с «Black Log · сервер»; без шапки — внизу слева
        const head = (this.head = document.createElement('span'));
        head.className = 'vdl-head';
        head.innerHTML = `<button type="button" class="vdl-hbtn" data-a="an" title="Аналитика по игроку, ID, IP и устройству">${icon('shield', 14)}<span class="lbl">Аналитика</span></button><button type="button" class="vdl-hbtn vdl-hadm" data-a="adm" title="Подсчёт админ-действий по нику администратора за период">${icon('lock', 14)}<span class="lbl">Админ-действия</span></button><button type="button" class="vdl-hbtn vdl-hbot" data-a="bot" title="Поиск ботов: реклама, аккаунты с одного IP, низкий уровень">${icon('bot', 14)}<span class="lbl">Боты</span></button><button type="button" class="vdl-hbtn vdl-hcog" data-a="cog" title="Подсветка и оформление">${icon('spark', 14)}</button>`;
        head.querySelector('[data-a="an"]').onclick = () => Panel.open();
        head.querySelector('[data-a="adm"]').onclick = () => AdminView.open();
        head.querySelector('[data-a="bot"]').onclick = () => BotView.open();
        head.querySelector('[data-a="cog"]').onclick = () => this.settings();
        this.placeHead();
        const st = document.createElement('style');
        st.textContent = `.vdl-head { display: inline-flex; flex: none; align-items: center; gap: 6px; margin: 0 auto 0 12px; vertical-align: middle; }
.vdl-head.float { position: fixed; left: 18px; bottom: 18px; z-index: 2147483000; margin: 0; }
.vdl-hbtn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 999px; border: 0; font: 700 12.5px/1 Inter, "Segoe UI", system-ui, sans-serif; color: #fff; cursor: pointer; white-space: nowrap;
  background: linear-gradient(135deg, ${acc}, color-mix(in srgb, ${acc} 55%, #3aa0ff)); box-shadow: 0 6px 16px -8px ${acc}; }
.vdl-hbtn:hover { filter: brightness(1.1); }
/* узкое окно: в шапке только иконки, чтобы не сжимать «Black Log» и «Выйти» */
@media (max-width: 1200px) { .vdl-hbtn .lbl { display: none; } .vdl-hbtn { padding: 0 9px; } .vdl-head { margin: 0 auto 0 8px; } }
.vdl-hadm { background: linear-gradient(135deg, color-mix(in srgb, ${acc} 55%, #7a5cff), #7a5cff); box-shadow: 0 6px 16px -8px #7a5cff; }
.vdl-hbot { background: linear-gradient(135deg, #f5a524, #e5484d); box-shadow: 0 6px 16px -8px #f5a524; }
.vdl-bot { display: inline-flex; align-items: center; margin-left: 8px; padding: 1px 8px; vertical-align: middle; border-radius: 7px; font-size: 11.5px; font-weight: 750; color: #fff; background: color-mix(in srgb, #e5484d 75%, #f5a524); cursor: help; }
.vdl-multi { display: inline-flex; align-items: center; margin-left: 6px; padding: 0 6px; height: 18px; vertical-align: middle; border-radius: 999px; font-size: 11px; font-weight: 800; color: #1a1205; background: #f5a524; cursor: help; }
.vdl-hcog { padding: 0 8px; background: rgba(255,255,255,.08); border: 1px solid color-mix(in srgb, ${acc} 40%, transparent); box-shadow: none; }
.vdl-hcog:hover { background: ${acc}; }
.vdl-mini { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 6px; vertical-align: middle; border-radius: 6px; border: 1px solid color-mix(in srgb, ${acc} 45%, transparent); background: color-mix(in srgb, ${acc} 16%, transparent); color: #fff; font-size: 11px; cursor: pointer; opacity: .75; }
.vdl-mini:hover { opacity: 1; background: ${acc}; }
.vdl-hl { border-radius: 6px; padding: 1px 6px; transition: box-shadow .12s, filter .12s; }
.vdl-hl.hot { filter: brightness(1.3); box-shadow: 0 0 0 2px #fff7; }
.vdl-cnt { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; margin-left: 6px; padding: 0 5px; vertical-align: middle; border-radius: 999px; font-size: 11px; font-weight: 800; color: #fff; cursor: pointer; }
.vdl-done { text-decoration: line-through; }
tr.vdl-done { opacity: .45; }
.vdl-dates { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 10px; }
.vdl-dates button { height: 28px; padding: 0 11px; border-radius: 8px; font-weight: 650; font-size: 12px; line-height: 1; font-family: inherit; color: #fff; border: 1px solid color-mix(in srgb, ${acc} 40%, transparent); background: color-mix(in srgb, ${acc} 14%, transparent); cursor: pointer; }
.vdl-dates button:hover { background: ${acc}; }
.vdl-trade { display: inline-flex; align-items: center; margin-left: 10px; padding: 2px 10px; vertical-align: middle; border-radius: 7px; font-size: 12px; font-weight: 700; color: #fff; cursor: pointer; background: color-mix(in srgb, ${acc} 80%, #1b6cff); box-shadow: 0 2px 8px -3px ${acc}; }
.vdl-trade:hover { filter: brightness(1.12); }
/* Bootstrap 5.3 красит ячейки светлой заливкой через inset box-shadow поверх любого фона — убираем, ячейки тёмные */
html body :is(#log-table, table:has(tr.first-row)) td, html body :is(#log-table, table:has(tr.first-row)) th { box-shadow: none !important; --bs-table-bg-type: transparent; --bs-table-bg-state: transparent; --bs-table-accent-bg: transparent; --bs-table-striped-bg: transparent; --bs-table-hover-bg: transparent; }
html body :is(#log-table, table:has(tr.first-row)), html body :is(#log-table, table:has(tr.first-row)) > tbody, html body :is(#log-table, table:has(tr.first-row)) > tbody > tr { background: transparent !important; --bs-table-bg: transparent; }
/* ячейки — стекло темы VERDICT (как блоки на форуме); размытие — общее под таблицей, а не на каждой ячейке */
html body :is(#log-table, table:has(tr.first-row)) { backdrop-filter: blur(10px) saturate(1.15); -webkit-backdrop-filter: blur(10px) saturate(1.15); }
html body :is(#log-table, table:has(tr.first-row)) > tbody > tr > td { background: var(--vd-glass, rgba(18,20,27,.42)) !important; color: #e4e6eb; }
html body :is(#log-table, table:has(tr.first-row)) > tbody > tr > td[colspan] { background: linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.2)), var(--vd-glass, rgba(18,20,27,.42)) !important; color: #cfd2d8; }
html body :is(#log-table, table:has(tr.first-row)) > tbody > tr.first-row:hover > td { background: linear-gradient(color-mix(in srgb, ${acc} 16%, transparent), color-mix(in srgb, ${acc} 16%, transparent)), var(--vd-glass, rgba(18,20,27,.42)) !important; }
/* выпадающие списки в фильтрах (vue-select и listbox): тёмные вместо белых */
html body :is(#log-filter-form, #log-filter, #log-filter-section) :is(.vs__dropdown-toggle, .vs__dropdown-menu, [role="listbox"], .multiselect__content-wrapper, .multiselect__tags) { background: #14161c !important; color: #e8eaee !important; border-color: rgba(255,255,255,.12) !important; }
html body :is(#log-filter-form, #log-filter, #log-filter-section) :is(.vs__dropdown-option, [role="listbox"] [role="option"], .multiselect__option) { background: transparent !important; color: #e8eaee !important; }
html body :is(#log-filter-form, #log-filter, #log-filter-section) :is(.vs__dropdown-option--highlight, .vs__dropdown-option--selected, [role="option"][aria-selected="true"], .multiselect__option--highlight) { background: ${acc} !important; color: #fff !important; }
html body :is(#log-filter-form, #log-filter, #log-filter-section) .vs__search { color: #e8eaee !important; background: transparent !important; border: 0 !important; }
html body :is(#log-filter-form, #log-filter, #log-filter-section) .vs__selected { color: #e8eaee !important; }
html body > .vs__dropdown-menu { background: #14161c !important; color: #e8eaee !important; border-color: rgba(255,255,255,.12) !important; }
html body > .vs__dropdown-menu .vs__dropdown-option { color: #e8eaee !important; }
html body > .vs__dropdown-menu .vs__dropdown-option--highlight { background: ${acc} !important; color: #fff !important; }
html body :is(#log-filter-form, #log-filter, #log-filter-section) .vs__search::placeholder { color: rgba(232,234,238,.5) !important; }
html body :is(#log-filter-form, #log-filter, #log-filter-section) :is(.vs__open-indicator, .vs__clear) { fill: #e8eaee !important; }`;
        document.head.appendChild(st);
        this.st = st;
        try {
            performance.setResourceTimingBufferSize(3000);
        } catch {
            /* старый браузер */
        }
        let queued = false;
        const run = () => {
            queued = false;
            if (this.off) return;
            mo.disconnect();
            try {
                this.placeHead();
                this.decorate();
                CatLearn.learn().catch(() => {});
            } finally {
                if (!this.off) mo.observe(document.body, { childList: true, subtree: true, characterData: true });
            }
        };
        const mo = (this.mo = new MutationObserver(() => {
            if (queued || this.off) return;
            queued = true;
            requestAnimationFrame(run);
        }));
        run();
        this.quickDates();
        CatLearn.discover().catch(() => {});
        this.fromHash();
        this._onHash = () => this.fromHash();
        addEventListener('hashchange', this._onHash);
    },
    // доступ закрыли — убираем всё своё со страницы и больше ничего не размечаем
    teardown() {
        this.off = true;
        if (this.mo) this.mo.disconnect();
        if (this.qmo) this.qmo.disconnect();
        if (this._onHash) removeEventListener('hashchange', this._onHash);
        // открытые окна и их загрузки
        Layer.closeModals(true);
        if (this.head) this.head.remove();
        if (this.st) this.st.remove();
        document.querySelectorAll('.vdl-dates, .vdl-mini, .vdl-trade, .vdl-cnt, .vdl-bot, .vdl-multi').forEach(x => x.remove());
        document.querySelectorAll('td').forEach(td => td.dataset.vdl !== undefined && this.reset(td));
    },
    fromHash() {
        if (this.off) return;
        const m = location.hash.match(/^#vd-(nick|id|ip|dev)=(.+)$/);
        if (!m) return;
        let v;
        try {
            v = decodeURIComponent(m[2]);
        } catch {
            return history.replaceState(null, '', location.pathname + location.search);
        }
        history.replaceState(null, '', location.pathname + location.search);
        if (m[1] === 'nick' && !/^[A-Za-z0-9]+_[A-Za-z0-9]+$/.test(v)) Panel.open('nick', '') || (Panel.scrim.querySelector('[data-a="q"]').value = v);
        else Panel.open(m[1], v);
    },

    // быстрые даты: кнопки заполняют период через tstart/tend в адресе (как сам сайт)
    quickDates() {
        const place = () => {
            const form = document.querySelector('#log-filter-form, #log-filter');
            if (!form || form.querySelector('.vdl-dates')) return;
            const bar = document.createElement('div');
            bar.className = 'vdl-dates';
            const mskMid = back => {
                const d = new Date(Date.now() + 3 * 3600e3);
                d.setUTCHours(0, 0, 0, 0);
                return d.getTime() - 3 * 3600e3 - back * 864e5;
            };
            const ranges = [
                ['Сегодня', () => [mskMid(0), Date.now()]],
                ['Вчера', () => [mskMid(1), mskMid(0)]],
                ['7 дней', () => [Date.now() - 7 * 864e5, Date.now()]],
                ['30 дней', () => [Date.now() - 30 * 864e5, Date.now()]]
            ];
            ranges.forEach(([lbl, get]) => {
                const bt = document.createElement('button');
                bt.type = 'button';
                bt.textContent = lbl;
                bt.onclick = () => {
                    const [a, b] = get();
                    const u = new URL(location.href);
                    u.searchParams.set('tstart', Math.round(a));
                    u.searchParams.set('tend', Math.round(b));
                    location.href = u.href;
                };
                bar.appendChild(bt);
            });
            form.insertBefore(bar, form.firstChild);
        };
        place();
        this.qmo = new MutationObserver(U.debounce(() => !this.off && place(), 300));
        this.qmo.observe(document.body, { childList: true, subtree: true });
    },

    // окно настроек подсветки
    settings() {
        Layer.closeModals();
        const c = this.cfg();
        const row = (k, name) =>
            `<div class="vdl-mrow"><input type="checkbox" data-k="${k}" ${c[k].on ? 'checked' : ''} style="width:18px;height:18px">
              <span class="nm">${name}</span><input type="color" data-col="${k}" value="${c[k].col}"></div>`;
        const scrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal sm">
            <div class="m-head"><span class="vic" style="--c:var(--acc);width:34px;height:34px;border-radius:10px">${icon('spark', 16)}</span>
              <div><div class="m-title">Подсветка и оформление</div><div class="m-sub">Одинаковые значения в загруженных строках — одним цветом</div></div>
              <span style="flex:1"></span><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              ${row('ip', 'Повтор IP-адресов')}
              ${row('nick', 'Повтор ников')}
              ${row('dev', 'Повтор устройств (APPMDID)')}
              <div class="vdl-mrow"><input type="checkbox" data-money ${c.money ? 'checked' : ''} style="width:18px;height:18px"><span class="nm">Деньги с разделителями (1 000 000)</span></div>
              <div class="muted" style="font-size:12px;margin-top:10px">Разные значения внутри одного вида — оттенками выбранного цвета. Считается только то, что уже прогружено на странице.</div>
            </div></div></div>`)
        );
        const save = () => {
            const n = {};
            ['ip', 'nick', 'dev'].forEach(k => {
                n[k] = { on: scrim.querySelector(`[data-k="${k}"]`).checked, col: scrim.querySelector(`[data-col="${k}"]`).value };
            });
            n.money = scrim.querySelector('[data-money]').checked;
            Store.set('mark', n);
            this.decorate();
        };
        scrim.querySelectorAll('input').forEach(i => i.addEventListener('change', save));
        const close = () => scrim.remove();
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
    },

    placeHead() {
        const head = this.head;
        if (!head) return;
        const brand = document.querySelector('nav .navbar-brand, .navbar-brand');
        if (brand) {
            const next = brand.nextElementSibling;
            const anchor = next && /\bbadge\b/.test(next.className) ? next : brand;
            if (head.previousElementSibling !== anchor || head.classList.contains('float')) {
                head.classList.remove('float');
                anchor.after(head);
            }
        } else if (!head.isConnected) {
            head.classList.add('float');
            document.body.appendChild(head);
        }
    },

    // текст ячейки без наших добавок (⌕, «Трейд #…», ×N); подсвеченный текст — свой
    rawOf(td) {
        let s = '';
        td.childNodes.forEach(n => {
            if (n.nodeType === 3) s += n.nodeValue;
            else if (n.nodeType === 1 && !/\bvdl-(mini|trade|cnt|bot|multi)\b/.test(n.className)) s += n.textContent;
        });
        return s.replace(/\s+/g, ' ').trim();
    },
    // сайт (Vue) переиспользует ячейки под новые строки — снимаем всё наше и разбираем заново
    reset(td) {
        td.querySelectorAll(':scope > .vdl-mini, :scope > .vdl-trade, :scope > .vdl-cnt, :scope > .vdl-bot, :scope > .vdl-multi').forEach(x => x.remove());
        this.unpill(td);
        // ник-ссылка сайта: ник для копирования и подсказку — убрать
        const a = td.querySelector(':scope > a');
        if (a && a._vdlNick !== undefined) {
            a._vdlNick = '';
            a.title = '';
            a.style.cursor = '';
        }
        if (td._vdlCopyT) {
            td.title = '';
            td.style.cursor = '';
        }
        ['vdl', 'hk', 'hv', 'trade', 'money', 'vdlSig', 'bot', 'vdlMoneyText'].forEach(k => delete td.dataset[k]);
        td.classList.remove('vdl-done');
        const tr = td.closest('tr');
        if (tr) tr.classList.remove('vdl-done');
    },

    // своя обёртка подсветки — снимаем; ссылка сайта — только класс, цвет и обработчики
    unpill(td) {
        td.querySelectorAll(':scope > .vdl-hl').forEach(p => {
            if (p.dataset.vdlOwn) {
                while (p.firstChild) td.insertBefore(p.firstChild, p);
                p.remove();
            } else {
                p.classList.remove('vdl-hl', 'hot');
                if (!p.className) p.removeAttribute('class');
                p.style.background = p.style.boxShadow = '';
                p.onmouseenter = p.onmouseleave = null;
                delete p.dataset.vdlH;
            }
        });
    },
    // столбцы «ID игрока» и «ID аккаунта» — по заголовкам таблицы (заголовок могут дорисовать позже)
    idCols(table) {
        const key = table.tHead ? table.tHead.textContent : '';
        if (table._vdlIdCols && table._vdlIdKey === key) return table._vdlIdCols;
        const cols = new Set();
        [...((table.tHead && table.tHead.rows[table.tHead.rows.length - 1]) || { cells: [] }).cells].forEach((th, i) => /\bID\b/i.test(th.textContent) && cols.add(i));
        table._vdlIdKey = key;
        return (table._vdlIdCols = cols);
    },
    decorate() {
        const c = this.cfg();
        document.querySelectorAll('td').forEach(td => {
            // сайт подменил текст в ячейке — сначала снимаем своё, потом размечаем заново
            if (td.dataset.vdlSig !== undefined && td.dataset.vdlSig !== this.rawOf(td)) this.reset(td);
            // ID игрока / аккаунта — кликом в буфер
            const tb = td.closest('table');
            if (tb && td.colSpan < 2 && (this.idCols(tb).has(td.cellIndex) || /\b(player|account)-?_?id\b/i.test(td.className))) copyText(td, () => this.rawOf(td), 'ID');
            // суммы в описании записи — с разделителями
            if (c.money && !td.dataset.vdlMoneyText && (td.colSpan > 1 || (td.closest('tr') && td.closest('tr').classList.contains('second-row')))) {
                td.dataset.vdlMoneyText = '1';
                td.childNodes.forEach(n => {
                    if (n.nodeType !== 3) return;
                    const v = moneyText(n.nodeValue);
                    if (v !== n.nodeValue) n.nodeValue = v;
                });
            }
            if (!td.dataset.vdl) {
                const t = td.textContent.trim();
                let mode = '',
                    val = '';
                if (IP_RE.test(t)) (mode = 'ip'), (val = t);
                else if (td.classList.contains('td-player-name') && /^[A-Za-z0-9]+_[A-Za-z0-9]+$/.test(t)) (mode = 'nick'), (val = t);
                else {
                    const m = t.match(DEV_RE);
                    if (m) (mode = 'dev'), (val = m[1]);
                }
                td.dataset.vdl = '1';
                if (mode) {
                    td.dataset.hk = mode;
                    td.dataset.hv = val;
                    if (mode === 'nick') copyNick(td.querySelector('a') || td, val);
                    const b = document.createElement('span');
                    b.className = 'vdl-mini';
                    b.title = { ip: 'Кто ещё заходил с этого IP', nick: 'IP и устройства игрока', dev: 'Кто ещё с этого устройства' }[mode];
                    b.textContent = '⌕';
                    b.onclick = e => {
                        e.preventDefault();
                        e.stopPropagation();
                        Panel.open(mode, val);
                    };
                    td.appendChild(b);
                }
            }
            // кнопка «Трейд #…» на строках трейдов
            if (!td.dataset.trade) {
                const tm = td.textContent.match(/TradeID:\s*(\d+)/);
                if (tm && !td.querySelector('.vdl-trade')) {
                    td.dataset.trade = tm[1];
                    const bt = document.createElement('span');
                    bt.className = 'vdl-trade';
                    bt.textContent = 'Трейд #' + tm[1];
                    bt.title = 'Показать все записи этого трейда';
                    bt.onclick = e => {
                        e.preventDefault();
                        e.stopPropagation();
                        TradeView.open(tm[1]);
                    };
                    td.appendChild(bt);
                }
            }
            // деньги с разделителями
            if (c.money && !td.dataset.money && /(amount|balance)/.test(td.className)) {
                td.dataset.money = '1';
                const node = [...td.childNodes].find(x => x.nodeType === 3 && /\d/.test(x.textContent));
                if (node) {
                    const raw = node.textContent.trim().replace(/\s/g, '');
                    if (/^-?\d{4,}$/.test(raw)) node.textContent = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                }
            }
            td.dataset.vdlSig = this.rawOf(td);
        });
        this.botMarks();
        this.recolor();
    },

    // пометки ботов прямо в таблице: реклама в описании и много разных аккаунтов с одного IP
    refreshMarks() {
        document.querySelectorAll('.vdl-bot, .vdl-multi').forEach(x => x.remove());
        document.querySelectorAll('td[data-bot]').forEach(td => delete td.dataset.bot);
        this.botMarks();
    },
    botMarks() {
        const c = Bots.cfg();
        if (!c.marks) return;
        const names = new Set(Bots.chats(c).map(x => x.name));
        document.querySelectorAll('td').forEach(td => {
            if (td.dataset.bot || (td.colSpan < 2 && !(td.closest('tr') && td.closest('tr').classList.contains('second-row')))) return;
            td.dataset.bot = '1';
            // категория записи — в строке над описанием
            if (names.size) {
                const tr = td.closest('tr');
                const prev = tr && tr.classList.contains('second-row') ? tr.previousElementSibling : tr;
                const cat = prev && prev.querySelector('td.td-category');
                if (cat && !names.has(this.rawOf(cat))) return;
            }
            const hit = Bots.match(this.rawOf(td));
            if (!hit.length) return;
            const b = document.createElement('span');
            b.className = 'vdl-bot';
            b.textContent = 'бот?';
            b.title = `Похоже на рекламу ботов: «${hit.join('», «')}»`;
            td.appendChild(b);
        });
        const per = new Map();
        document.querySelectorAll('td[data-hk="ip"]').forEach(td => {
            const tr = td.closest('tr');
            const nk = tr && tr.querySelector('.td-player-name');
            const g = per.get(td.dataset.hv) || per.set(td.dataset.hv, { tds: [], nicks: new Set() }).get(td.dataset.hv);
            g.tds.push(td);
            if (nk && this.rawOf(nk)) g.nicks.add(this.rawOf(nk).toLowerCase());
        });
        per.forEach(g => {
            const n = g.nicks.size;
            g.tds.forEach(td => {
                let m = td.querySelector(':scope > .vdl-multi');
                if (n >= c.minAcc) {
                    if (!m) {
                        m = document.createElement('span');
                        m.className = 'vdl-multi';
                        td.appendChild(m);
                    }
                    const t = '👥 ' + n;
                    if (m.textContent !== t) m.textContent = t;
                    m.title = `С этого IP на странице заходят ${n} разных ${plural(n, 'аккаунт', 'аккаунта', 'аккаунтов')} — возможно, твинки или боты`;
                } else if (m) m.remove();
            });
        });
    },

    hueOf(hex) {
        const m = hex.replace('#', '').match(/^(..)(..)(..)$/);
        if (!m) return 210;
        const [r, g, b] = m.slice(1).map(x => parseInt(x, 16) / 255);
        const mx = Math.max(r, g, b),
            mn = Math.min(r, g, b),
            d = mx - mn;
        if (!d) return 210;
        let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return Math.round(h * 60);
    },
    SPREAD: [0, 24, -24, 46, -46, 12, -12, 34, -34, 60, -60, 80, -80, 100, -100, 130, -130, 160],
    recolor() {
        const c = this.cfg();
        const rowsDone = new Map();
        ['ip', 'nick', 'dev'].forEach(type => {
            const base = this.hueOf(c[type].col);
            const done = Store.get(type + 'Done', {});
            const cells = [...document.querySelectorAll(`td[data-hk="${type}"]`)];
            const by = new Map();
            cells.forEach(td => (by.get(td.dataset.hv) || by.set(td.dataset.hv, []).get(td.dataset.hv)).push(td));
            let idx = 0;
            const hue = new Map();
            if (c[type].on) [...by.keys()].filter(v => by.get(v).length > 1).forEach(v => hue.set(v, base + this.SPREAD[idx++ % this.SPREAD.length]));
            by.forEach((tds, val) => {
                const n = tds.length;
                const h = hue.get(val);
                const isDone = !!done[val];
                tds.forEach(td => {
                    let pill = td.querySelector('.vdl-hl');
                    if (h != null && !pill) {
                        const txt = [...td.childNodes].find(x => x.nodeType === 3 && x.textContent.trim());
                        const link = !txt && td.querySelector(':scope > a');
                        if (txt) {
                            pill = document.createElement('span');
                            pill.className = 'vdl-hl';
                            pill.dataset.vdlOwn = '1';
                            td.insertBefore(pill, txt);
                            pill.appendChild(txt);
                        } else if (link) {
                            // ник — ссылка сайта: не оборачиваем, только красим её саму
                            pill = link;
                            pill.classList.add('vdl-hl');
                        }
                        if (pill) {
                            pill.onmouseenter = () => this.hot(type, val, true);
                            pill.onmouseleave = () => this.hot(type, val, false);
                        }
                    }
                    // значение больше не повторяется — подсветку снимаем совсем
                    if (h == null && pill) {
                        this.unpill(td);
                        pill = null;
                    }
                    if (pill && pill.dataset.vdlH !== String(h)) {
                        pill.dataset.vdlH = String(h);
                        pill.style.background = h != null ? `hsla(${h},72%,55%,.3)` : '';
                        pill.style.boxShadow = h != null ? `inset 0 0 0 1px hsla(${h},80%,65%,.6)` : '';
                    }
                    let cnt = td.querySelector('.vdl-cnt');
                    if (h != null && !cnt) {
                        cnt = document.createElement('span');
                        cnt.className = 'vdl-cnt';

                        cnt.onclick = e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const d = Store.get(type + 'Done', {});
                            if (d[val]) delete d[val];
                            else d[val] = Date.now();
                            const keys = Object.keys(d).sort((x, y) => d[y] - d[x]);
                            keys.slice(500).forEach(k => delete d[k]);
                            Store.set(type + 'Done', d);
                            this.recolor();
                        };
                        td.appendChild(cnt);
                    } else if (h == null && cnt) cnt.remove();
                    if (cnt) {
                        if (cnt.textContent !== '×' + n) cnt.textContent = '×' + n;
                        const what = { ip: 'Этот IP-адрес', nick: 'Этот ник', dev: 'Это устройство (APPMDID)' }[type];
                        const t = `${what} встречается в ${n} ${plural(n, 'строке', 'строках', 'строках')} на этой странице — одинаковые подсвечены одним цветом.\n${isDone ? 'Отмечено как проверенное. Нажми, чтобы снять отметку.' : 'Нажми, чтобы отметить как проверенное (строки зачеркнутся).'}`;
                        if (cnt.title !== t) cnt.title = t;
                        if (cnt.dataset.vdlH !== String(h)) {
                            cnt.dataset.vdlH = String(h);
                            cnt.style.background = `hsl(${h},68%,45%)`;
                        }
                    }
                    // зачёркиваем, только пока есть ×N — им же отметку и снимают
                    const mark = c[type].on && isDone && h != null;
                    td.classList.toggle('vdl-done', mark);
                    const tr = td.closest('tr');
                    // строку зачёркиваем, если её отметил хоть один вид (иначе выключенные ники снимали отметку IP)
                    if (tr) rowsDone.set(tr, rowsDone.get(tr) || mark);
                });
            });
        });
        rowsDone.forEach((on, tr) => tr.classList.toggle('vdl-done', on));
    },
    hot(type, val, on) {
        document.querySelectorAll(`td[data-hk="${type}"][data-hv="${CSS.escape(val)}"] .vdl-hl`).forEach(p => p.classList.toggle('hot', on));
    }
};

const TradeView = {
    async open(id) {
        // открывается поверх отчёта (закрыл — вернулся к нему); прежнее окно трейда убираем
        if (this.scrim) this.scrim.remove();
        let rows = [];
        const scrim = (this.scrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal">
            <div class="m-head"><span class="vic" style="--c:var(--acc);width:34px;height:34px;border-radius:10px">${icon('shield', 16)}</span>
              <div><div class="m-title">Трейд #${U.esc(id)}</div><div class="m-sub">все записи этого трейда</div></div>
              <span style="flex:1"></span><button class="btn" data-a="copy">${icon('download', 14)}Скопировать</button><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane"><div class="vdl-prog" style="font-size:12px;color:var(--tx-3)">Загружаю…</div><div class="vdl-tv"></div></div></div></div>`)
        ));
        const close = () => {
            scrim.remove();
            if (this.scrim === scrim) this.scrim = null;
        };
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        scrim.querySelector('[data-a="copy"]').onclick = () => {
            const L = rows.map(r => `${fmtDate(r.time)} · ${r.player_name || '—'} · ${String(r.transaction_desc || '').replace(/^\[TradeID:\s*\d+\]\s*/, '')}`);
            navigator.clipboard.writeText(`Трейд #${id}\n` + L.join('\n')).then(
                () => toast('Скопировано'),
                () => toast('Не удалось', 'err')
            );
        };
        try {
            // один трейд по его номеру; широкий период, чтобы захватить весь обмен
            rows = await Api.all(
                { transaction_desc__ilike: `%TradeID:%${id}%`, time__gte: new Date(Date.now() - 180 * 864e5).toISOString(), time__lte: new Date().toISOString() },
                6,
                null,
                null,
                () => this.scrim === scrim
            );
            // поиск сайта — по началу текста: «TradeID: 12» находит и 123, 1234 — оставляем точный номер
            const exact = new RegExp(`TradeID:\\s*${id}(?!\\d)`);
            rows = rows.filter(r => exact.test(String(r.transaction_desc || '')));
            rows.sort((a, b) => new Date(a.time) - new Date(b.time));
            if (this.scrim !== scrim) return;
            scrim.querySelector('.vdl-prog').textContent = rows.length ? `${rows.length} записей · участники: ${[...new Set(rows.map(r => r.player_name).filter(Boolean))].join(', ')}` : '';
            const box = scrim.querySelector('.vdl-tv');
            box.innerHTML = rows.length
                ? rows
                      .map(
                          r => `<div class="vdl-tv-row"><span class="who">${U.esc(r.player_name || '—')}</span><span class="tm">${U.esc(fmtDate(r.time))}</span><span class="ds">${U.esc(moneyText(String(r.transaction_desc || '').replace(/^\[TradeID:\s*\d+\]\s*/, '')))}</span></div>`
                      )
                      .join('')
                : '<div class="vdl-tv-row"><span class="ds">По этому номеру трейда записей не нашлось (мог быть давно).</span></div>';
            box.querySelectorAll('.who').forEach(w => copyNick(w, w.textContent.trim()));
        } catch (e) {
            if (this.scrim === scrim) scrim.querySelector('.vdl-prog').textContent = 'Не загрузилось: ' + e.message;
        }
    }
};

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
        if (ON_LOGS)
            notice('Нужен VERDICT', '«VERDICT Логи» работает только вместе с основным скриптом VERDICT. Установи или включи его в Tampermonkey и обнови страницу.');
        return;
    }
    document.dispatchEvent(new CustomEvent('verdict:logs', { detail: JSON.stringify({ v: VERSION }) }));
    if (!ON_LOGS && !/^\/members\//.test(location.pathname)) return;
    Layer.accent(info);
    if (!info.lid) return ON_LOGS && notice('Нужен VERDICT', 'Обнови VERDICT до последней версии — эта не умеет работать с «VERDICT Логи».');
    // шапку сайт может дорисовать позже — ждём ник до 8 секунд
    const nickNow = () => (document.body.textContent.match(/Выйти\s*\[([^\]]{2,40})\]/) || [])[1] || '';
    let logsNick = ON_LOGS ? nickNow() : '';
    for (let i = 0; ON_LOGS && !logsNick && i < 20; i++) {
        await new Promise(r => setTimeout(r, 400));
        logsNick = nickNow();
    }
    if (ON_LOGS && !logsNick) return;
    CTX.info = info;
    CTX.logsNick = logsNick;
    const acc = await Access.check(info, logsNick, true);
    if (!acc.allowed) {
        if (!ON_LOGS) return;
        if (acc.state === 'no') return notice('Доступ закрыт', 'Разработчик закрыл тебе «VERDICT Логи».');
        if (acc.state === 'error') {
            if (/ключ|Неизвестное/i.test(acc.why || '')) return notice('Сервер не обновлён', 'На сервере разработчика старая версия почты — проверка доступа к логам там ещё не появилась. Напиши разработчику.', acc.code);
            return notice('Не проверить доступ', `Нет связи с разработчиком: ${U.esc(acc.why || '')}. Попробуй обновить страницу позже.`, acc.code);
        }
        return notice('Доступ не выдан', 'Отправь этот код разработчику. Как только он откроет доступ, обнови страницу (до пары минут).', acc.code);
    }
    if (ON_LOGS) LogsPage.start(info);
    else Profile.start();
    const timer = setInterval(async () => {
        const a = await Access.check(info, logsNick);
        if (a.allowed) return;
        // доступ закрыли (или долго нет связи с разработчиком) — убираем всё и больше не проверяем
        clearInterval(timer);
        if (ON_LOGS) LogsPage.teardown();
        document.querySelectorAll('.vdl-mini, .vdl-prof').forEach(x => x.remove());
        const host = document.getElementById('vdl-layer');
        if (host) host.remove();
        Layer._root = null;
        if (ON_LOGS && a.state !== 'error') notice('Доступ закрыт', 'Разработчик закрыл тебе «VERDICT Логи».');
    }, 5 * 60e3 + 5000);
}

addEventListener(
    'keydown',
    e => {
        if (e.key === 'Escape' && Layer._root) {
            // Esc в поле переименования — отмена правки, а не закрытие окна
            const a = Layer._root.activeElement;
            if (a && a.matches('[data-ren-inp]')) {
                a.value = '';
                a.blur();
                return;
            }
            const top = [...Layer._root.querySelectorAll('.scrim:not([hidden])')].pop();
            if (!top) return;
            // главные окна прячутся вместе с результатами
            if (Layer.mains().includes(top)) return Layer.hide(top);
            top.remove();
            if (TradeView.scrim === top) TradeView.scrim = null;
            if (AdminView.cfgScrim === top) AdminView.cfgScrim = null;
            if (BotView.cfgScrim === top) BotView.cfgScrim = null;
        }
    },
    true
);

U.ready(() => main().catch(e => console.warn('VERDICT Логи:', e)));

})();
