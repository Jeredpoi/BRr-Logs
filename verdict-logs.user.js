// ==UserScript==
// @name         VERDICT Логи
// @namespace    verdict.br.logs
// @version      1.0.0
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
// @version      1.0.0
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

const VERSION = '1.0.0';
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
            if (c && c.lid === info.lid && c.allowed && Date.now() - c.at < 6 * 3600e3) return c;
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
    // ни одного «висящего» затемнения: перед открытием окна убираем прежние
    closeModals() {
        this.el().querySelectorAll('.scrim').forEach(x => x.remove());
        if (typeof Panel !== 'undefined') Panel.scrim = null;
        if (typeof TradeView !== 'undefined') TradeView.scrim = null;
        if (typeof AdminView !== 'undefined') AdminView.scrim = AdminView.cfgScrim = null;
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
function copyNick(el, nick) {
    el.style.cursor = 'copy';
    el.title = 'Нажми — скопировать ник';
    // сайт может переиспользовать ячейку под другую строку — ник берём свежий, обработчик один
    el._vdlNick = nick;
    if (el._vdlCopy) return;
    el._vdlCopy = true;
    el.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const nick = el._vdlNick;
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
.vdl-catex { display: flex; align-items: center; gap: 8px; margin: -2px 2px 8px; padding-left: 2px; font-size: 11.5px; color: var(--tx-3); }
.vdl-catex .ex { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vdl-catex .btn { height: 26px; padding: 0 9px; font-size: 11.5px; }
.vdl-date { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx-3); }
.vdl-date .inp { flex: none; width: 150px; color-scheme: dark; }
.vdl-presets { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: -4px 0 6px; }
.vdl-presets .btn { height: 28px; padding: 0 10px; font-size: 12px; }
.vdl-chk { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx-2); cursor: pointer; }
.vdl-chk input { width: 15px; height: 15px; }
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
    async _page(params, offset) {
        const wait = 1100 - (Date.now() - this.last);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        this.last = Date.now();
        const q = new URLSearchParams(params);
        q.set('order_by', this.order);
        q.set('offset', String(offset));
        q.set('auto', 'false');
        const url = new URL(`/gslogs/${this.server()}/api/list-game-logs/?${q}`, location.href).href;
        this.mine.add(url);
        const r = await fetch(url, { credentials: 'include' });
        if (r.status === 401 || r.status === 403) throw new Error('сайт логов не пускает — войди заново');
        if (!r.ok) {
            // сайт мог не понять сортировку «сначала новые» — пробуем обычную, но остаёмся на ней, только если она сработала
            if (this.order === '-time') {
                this.order = 'time';
                try {
                    return await this._page(params, offset);
                } catch (e) {
                    this.order = '-time';
                    throw e;
                }
            }
            throw new Error('сайт логов ответил ' + r.status);
        }
        const d = await r.json();
        if (!Array.isArray(d)) throw new Error('сайт логов ответил не списком');
        return d;
    },
    // размер страницы сайта узнаём по ходу (страница, за которой есть ещё, — полная) и запоминаем
    size: 0,
    pageSize() {
        if (!this.size) this.size = Store.get('pageSize', 0);
        return this.size;
    },
    // first — уже полученная первая страница (чтобы не качать её второй раз)
    async all(params, maxPages, onPage, first) {
        const out = [];
        out.capped = false;
        let off = 0,
            prev = 0;
        for (let i = 0; i < maxPages; i++) {
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

// деньги и категории из записи API (названия полей — как в фильтрах сайта)
const numOf = v => {
    if (v == null || v === '') return NaN;
    const n = Number(String(v).replace(/[\s ]/g, '').replace(',', '.'));
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
        document.querySelectorAll('select option').forEach(o => {
            if (/^\d+$/.test(o.value) && o.textContent.trim()) CATS[o.value] = o.textContent.trim();
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
                .filter(u => u.startsWith(location.origin) && /categor/i.test(u) && !Api.mine.has(u));
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
                const r = await fetch(url, { credentials: 'include' });
                return r.ok ? r.json() : [];
            });
            Api._q = p.catch(() => {});
            p.then(res, rej);
        });
        if (!Array.isArray(rows)) return;
        const tab = tds.map(td => ({ name: LogsPage.rawOf(td), nick: LogsPage.rawOf(td.closest('tr').querySelector('.td-player-name') || td) }));
        let n = 0;
        rows.forEach((r, i) => {
            const t = tab[i];
            if (!t || !t.name || r.category_id == null || !sameNick(r.player_name, t.nick)) return;
            if (map[r.category_id] !== t.name) {
                map[r.category_id] = t.name;
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
// сессии игрока из логов подключений: пары подключился/отключился
function sessionsOf(rows) {
    const ev = rows
        .map(r => ({ t: new Date(r.time).getTime(), on: /подключ/i.test(r.transaction_desc), off: /отключ/i.test(r.transaction_desc), ip: r.player_ip, plat: platOf(r) }))
        .filter(e => (e.on || e.off) && e.t)
        .sort((a, b) => a.t - b.t);
    const out = [];
    let open = null;
    ev.forEach(e => {
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
    open(mode = 'nick', value = '') {
        Layer.closeModals();
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
            q.placeholder = { nick: 'Ник: Ivan_Ivanov', id: 'ID игрока: 1016171', ip: 'IP: 95.57.212.23', dev: 'APPMDID устройства' }[m];
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
        if (this.busy) {
            toast('Подожди, предыдущая проверка ещё идёт', 'info');
            return false;
        }
        this.busy = true;
        this._runGen = this._gen;
        // новая проверка — прежний отчёт убираем сразу, чтобы по нему не кликали, пока грузится новый
        if (!box) this.out('');
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
            this.busy = false;
        }
    },

    byNick(nick) {
        return this.player({ player_name__exact: nick }, nick, null);
    },

    byId(id) {
        const v = String(id).trim();
        if (!/^\d+$/.test(v)) {
            this.out(`<div class="card" style="padding:14px">${icon('x', 14)} ID — это число, например 1016171</div>`);
            return;
        }
        return this.player({ player_id__exact: v }, null, v);
    },

    // общее ядро: собирает сводку по игроку, выбранному либо по нику, либо по ID
    player(sel, nick, id) {
        return this.run(async () => {
            const base = Object.assign({}, sel, Api.range(this.days));
            this.prog('Читаю подключения игрока…');
            let rows = await Api.all(Object.assign({ category_id__exact: 38 }, base), 10, (p, n) => this.prog(`Подключения: страница ${p}, записей ${n}…`));
            let note = '';
            if (!rows.length) {
                rows = await Api.all(base, 4, (p, n) => this.prog(`Все записи игрока: страница ${p}, записей ${n}…`));
                note = 'Подключений за период нет — IP взяты из остальных записей игрока.';
            }
            this.prog('');
            // если искали по ID — подставляем ник, который встречается чаще всего
            if (!nick) {
                const nk = group(rows, r => r.player_name);
                nick = (nk[0] && nk[0].k) || '';
                if (nk.length > 1) note = (note ? note + ' ' : '') + `На этом ID встречались ники: ${nk.slice(0, 6).map(g => g.k).join(', ')}.`;
            }
            const ips = group(rows, r => r.player_ip),
                devs = group(rows, devOf);
            this.report = { kind: 'nick', nick: nick || ('ID ' + id), id: id || null, days: this.days, ips, devs, related: new Map() };
            const ids = id ? [id] : [...new Set(rows.map(r => r.player_id).filter(Boolean))];
            const o = this.out(`
              <div class="vdl-sum">
                <div class="k"><small>Записей</small><b>${rows.length}</b></div>
                <div class="k"><small>IP-адресов</small><b>${ips.length}</b></div>
                <div class="k"><small>Устройств</small><b>${devs.length}</b></div>
                <div class="k"><small>ID игрока</small><b style="font-size:15px">${U.esc(ids.join(', ') || '—')}</b></div>
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
              <div data-tab="money" hidden><div class="sec"><h4>Деньги за ${this.days} дн.</h4><div class="card" data-l="money"></div></div></div>
              <div data-tab="act" hidden><div class="sec"><h4>Чем занимался за ${this.days} дн. (записей по категориям)</h4><div class="card" data-l="cats"></div></div></div>
              <div data-tab="tr" hidden><div class="sec"><h4>Трейды игрока за ${this.days} дн.</h4><div class="card" data-l="tr"></div></div></div>
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
                tr: box => this.loadTrades(sel, gen).then(list => gen === this._gen && this.renderTrades(box, list))
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
        const p = Api.all(base, LIM, (pg, n) => gen === this._gen && this.prog(`Все записи игрока: страница ${pg}, записей ${n}…`)).then(rows => {
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
        const bals = d.rows.map(r => ({ b: balOf(r), t: new Date(r.time).getTime() || 0 })).filter(x => Number.isFinite(x.b)).sort((a, b) => a.t - b.t);
        const b0 = bals[0], b1 = bals[bals.length - 1];
        const big = ops.slice().sort((a, b) => Math.abs(b.a) - Math.abs(a.a)).slice(0, 10);
        // доходы и расходы по категориям
        const byCat = sign => {
            const m = new Map();
            ops.filter(x => Math.sign(x.a) === sign).forEach(x => {
                const k = catName(x.r);
                const g = m.get(k) || { k, sum: 0, n: 0 };
                g.sum += x.a;
                g.n++;
                m.set(k, g);
            });
            return [...m.values()].sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum)).slice(0, 6);
        };
        const bars = (list, cls) => {
            const max = list.length ? Math.abs(list[0].sum) : 1;
            return list.map(g => `<div class="vdl-bar"><span class="nm" title="${U.esc(g.k)}">${U.esc(g.k)}</span><span class="tr"><b class="${cls}" style="width:${Math.max(3, Math.round((Math.abs(g.sum) / max) * 100))}%"></b></span><span class="n ${cls}">${fmtMoney(g.sum)}</span></div>`).join('');
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
          ${big.length ? `<div class="sub" style="padding:10px 2px 2px">Крупные операции</div>${big.map(x => `<div class="vdl-row"><div class="main"><div class="ttl"><span class="${cls(x.a)}">${fmtMoney(x.a)}</span><span class="vdl-tag">${U.esc(catName(x.r))}</span></div><div class="sub">${fmtDate(x.t)} · ${U.esc(String(x.r.transaction_desc || '').slice(0, 140))}</div></div></div>`).join('')}` : ''}
          ${this.capNote(d)}`;
    },
    renderCats(box, d) {
        if (!d.rows.length) return (box.innerHTML = '<div class="vdl-row"><div class="main sub">Записей за период нет</div></div>');
        const cats = group(d.rows, r => String(r.category_id ?? '')).slice(0, 14);
        const cmax = cats.length ? cats[0].n : 1;
        const nm = id => (id === '' ? 'Без категории' : catName({ category_id: id }));
        this.report.cats = cats.slice(0, 8).map(g => `${nm(g.k)} — ${g.n}`);
        const unknown = cats.filter(g => g.k !== '' && /^Категория #/.test(nm(g.k)));
        box.innerHTML =
            cats
                .map(g => {
                    const name = nm(g.k);
                    const unk = unknown.includes(g);
                    const ex = unk ? d.rows.find(r => String(r.category_id) === g.k) : null;
                    return `<div class="vdl-bar"><span class="nm" title="${U.esc(name)}">${U.esc(name)}</span><span class="tr"><b style="width:${Math.max(3, Math.round((g.n / cmax) * 100))}%"></b></span><span class="n">${g.n}</span></div>${
                        unk
                            ? `<div class="vdl-catex" data-id="${U.esc(g.k)}"><span class="ex">пример: ${U.esc(String((ex && ex.transaction_desc) || '—').slice(0, 120))}</span><button class="btn" data-a="name">✎ подписать</button></div>`
                            : ''
                    }`;
                })
                .join('') +
            (unknown.length ? '<div class="sub" style="padding:8px 2px 0">Сайт отдаёт только номер категории. Названия появятся сами, когда такие записи попадутся в таблице логов, — или подпиши номер сам, он запомнится.</div>' : '') +
            this.capNote(d);
        box.querySelectorAll('.vdl-catex [data-a="name"]').forEach(
            bt =>
                (bt.onclick = () => {
                    const row = bt.closest('.vdl-catex');
                    const id = row.dataset.id;
                    row.innerHTML = `<input class="inp" placeholder="Название для категории #${U.esc(id)}" maxlength="40" style="flex:1;height:30px"><button class="btn" data-a="ok">Сохранить</button>`;
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
    async loadTrades(sel, gen) {
        const tr = await Api.all({ ...sel, transaction_desc__ilike: '%TradeID%', ...Api.range(this.days) }, 6, (pp, nn) => gen === this._gen && this.prog(`Трейды: страница ${pp}, записей ${nn}…`));
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
            const rows = await this.ipRows(ip, (p, n) => this.prog(`IP ${ip}: страница ${p}, записей ${n}…`));
            this.prog('');
            const nicks = group(rows, r => r.player_name);
            if (into) return this.fillMore(into, nicks, except, 'IP', ip);
            const devN = group(rows, devOf).length;
            this.report = { kind: 'ip', ip, days: this.days, nicks };
            const o = this.out(`
              <div class="card" style="padding:12px 14px;margin-bottom:12px"><div class="ttl"><span class="vdl-mono">${U.esc(ip)}</span></div><div class="sub" data-geo>определяю провайдера…</div></div>
              <div class="vdl-sum">
                <div class="k"><small>Записей</small><b>${rows.length}</b></div>
                <div class="k"><small>Аккаунтов</small><b>${nicks.length}</b></div>
                <div class="k"><small>Устройств</small><b>${devN}</b></div>
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
        }, into);
    },

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
        }, into);
    },

    async ipRows(ip, onPage) {
        for (const key of ['player_ip__exact', 'player_ip__ilike', 'player_ip']) {
            const params = Object.assign({ category_id__exact: 38, [key]: ip }, Api.range(this.days));
            const first = await Api.page(params, 0);
            if (first.length && first.some(r => r.player_ip && r.player_ip !== ip)) continue;
            if (!first.length || (Api.pageSize() && first.length < Api.pageSize())) return first;
            return Api.all(params, 10, onPage, first);
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
        const others = nicks.filter(x => !sameNick(x.k, except));
        if (this.report && this.report.related) this.report.related.set(what + ' ' + key, others.map(x => x.k));
        box.innerHTML = others.length
            ? `<div class="sub" style="margin:2px 0 4px"><span class="vdl-tag" style="--c:#f5a524">возможные твинки: ${others.length}</span></div>`
            : `<div class="sub" style="margin:4px 0">С этого ${what === 'IP' ? 'IP' : 'устройства'} за ${this.days} дн. заходил только ${U.esc(except)}</div>`;
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
            if (r.ses && r.ses.n) L.push(`Сессий: ${r.ses.n}, в игре ${durHM(r.ses.total)}, в среднем ${durHM(r.ses.avg)}${r.peak >= 0 ? `, чаще всего в ${r.peak}:00 МСК` : ''}`);
            if (r.money) L.push(`Деньги: пришло ${fmtMoney(r.money.inc)}, ушло ${fmtMoney(r.money.exp)}${Number.isFinite(r.money.b0) ? `, баланс ${fmtNum(r.money.b0)} → ${fmtNum(r.money.b1)}` : ''}${r.money.capped ? ' (по последним 500 записям)' : ''}`);
            if (r.cats && r.cats.length) L.push('Категории: ' + r.cats.join('; '));
            if (r.trades != null) L.push(`Трейдов: ${r.trades}`);
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

// ---------- Админ-действия: подсчёт для куратора по нику администратора и периоду ----------
const AdminView = {
    DEF: { kw: 'админ, наказан', on: {}, extra: [], mention: false },
    cfg() {
        const c = Object.assign({}, this.DEF, Store.get('adminCfg', {}));
        c.on = Object.assign({}, c.on);
        c.extra = (c.extra || []).map(String);
        return c;
    },
    save(c) {
        Store.set('adminCfg', c);
    },
    kws(c) {
        return String(c.kw || '')
            .split(/[,;\n]/)
            .map(x => x.trim().toLowerCase())
            .filter(Boolean);
    },
    // категория считается админской: ручная галочка важнее ключевых слов
    isAdmin(id, c) {
        id = String(id);
        if (c.on[id] != null) return !!c.on[id];
        if (c.extra.includes(id)) return true;
        const name = catName({ category_id: id });
        if (/^Категория #/.test(name)) return false;
        const n = name.toLowerCase();
        return this.kws(c).some(k => n.includes(k));
    },
    known() {
        catName({ category_id: 0 });
        return Object.keys(CATS)
            .filter(k => /^\d+$/.test(k))
            .map(id => ({ id, name: CATS[id] }));
    },
    selected(c) {
        const ids = new Set(this.known().filter(x => this.isAdmin(x.id, c)).map(x => x.id));
        c.extra.forEach(id => c.on[id] !== false && ids.add(id));
        Object.keys(c.on).forEach(id => c.on[id] && ids.add(id));
        return [...ids];
    },

    // даты в календаре — московские сутки
    mskDay(t) {
        return new Date(t + 3 * 3600e3).toISOString().slice(0, 10);
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
        Layer.closeModals();
        this._gen = (this._gen || 0) + 1;
        const last = Store.get('adminLast', {});
        const P = this.presets();
        const scrim = (this.scrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal vdl">
            <div class="m-head"><span class="vic" style="--c:var(--acc);width:34px;height:34px;border-radius:10px">${icon('lock', 16)}</span>
              <div><div class="m-title">Админ-действия</div><div class="m-sub">Подсчёт по нику администратора за период · сервер ${U.esc(Api.server() || '?')}</div></div>
              <span style="flex:1"></span><button class="btn" data-a="cfg" title="Какие категории считать админ-действиями">${icon('spark', 14)}Что считать</button><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="vdl-form">
                <input class="inp" data-a="q" placeholder="Ник администратора: Ivan_Ivanov" value="${U.esc(nick || last.nick || '')}">
                <label class="vdl-date">с <input class="inp" type="date" data-a="from"></label>
                <label class="vdl-date">по <input class="inp" type="date" data-a="to"></label>
                <button class="btn pri" data-a="go">${icon('search', 14)}Посчитать</button>
              </div>
              <div class="vdl-presets">${P.map((x, i) => `<button class="btn" data-p="${i}">${x[0]}</button>`).join('')}
                <label class="vdl-chk"><input type="checkbox" data-a="mention"> и упоминания ника в описании</label></div>
              <div class="vdl-prog"></div>
              <div class="vdl-out"></div>
            </div></div></div>`)
        ));
        const $ = s => scrim.querySelector(s);
        const close = () => {
            scrim.remove();
            if (this.scrim === scrim) this.scrim = null;
        };
        $('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        $('[data-a="cfg"]').onclick = () => this.settings();
        const from = $('[data-a="from"]'),
            to = $('[data-a="to"]'),
            q = $('[data-a="q"]');
        from.value = last.from || P[4][1];
        to.value = last.to || P[4][2];
        from.max = to.max = P[0][1];
        $('[data-a="mention"]').checked = !!this.cfg().mention;
        $('[data-a="mention"]').onchange = e => {
            const c = this.cfg();
            c.mention = e.target.checked;
            this.save(c);
        };
        scrim.querySelectorAll('[data-p]').forEach(b => {
            b.onclick = () => {
                const p = P[+b.dataset.p];
                from.value = p[1];
                to.value = p[2];
                if (q.value.trim()) go();
            };
        });
        const go = () => {
            const nk = q.value.trim();
            if (!/^[A-Za-z0-9]+_[A-Za-z0-9]+$/.test(nk)) return this.msg('Впиши ник администратора в формате Имя_Фамилия');
            if (!from.value || !to.value) return this.msg('Выбери даты «с» и «по»');
            let a = from.value,
                b = to.value;
            if (a > b) [a, b] = [b, a];
            if ((this.dayStart(b) - this.dayStart(a)) / 864e5 > 92) return this.msg('Период не больше 3 месяцев — выбери короче');
            Store.set('adminLast', { nick: nk, from: a, to: b });
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
        if (this.busy) return toast('Подожди, подсчёт ещё идёт', 'info');
        this.busy = true;
        const gen = this._gen;
        const out = this.scrim.querySelector('.vdl-out');
        out.innerHTML = '';
        try {
            const c = this.cfg();
            const t0 = this.dayStart(a),
                t1 = this.dayStart(b) + 864e5 - 1;
            const range = { time__gte: new Date(t0).toISOString(), time__lte: new Date(t1).toISOString() };
            // 1) все записи ника за период: из них видно, какие категории у него есть
            const all = await Api.all({ player_name__exact: nick, ...range }, 25, (p, n) => this.prog(`Записи ${nick}: страница ${p}, записей ${n}…`, gen));
            if (gen !== this._gen) return;
            const ids = this.selected(c);
            let own;
            if (all.capped && ids.length) {
                // записей слишком много — админские категории считаем отдельными запросами, точно
                own = [];
                for (const id of ids) {
                    const r = await Api.all({ player_name__exact: nick, category_id__exact: id, ...range }, 25, (p, n) => this.prog(`${catName({ category_id: id })}: страница ${p}, записей ${n}…`, gen));
                    if (gen !== this._gen) return;
                    own.push(...r);
                }
            } else own = all.filter(r => ids.includes(String(r.category_id)));
            // 2) упоминания: ник в описании чужих записей админских категорий
            let ment = [];
            if (c.mention && ids.length) {
                for (const id of ids) {
                    const r = await Api.all({ transaction_desc__ilike: `%${nick}%`, category_id__exact: id, ...range }, 10, (p, n) => this.prog(`Упоминания в «${catName({ category_id: id })}»: страница ${p}, записей ${n}…`, gen));
                    if (gen !== this._gen) return;
                    ment.push(...r.filter(x => !sameNick(x.player_name, nick)));
                }
            }
            this.prog('', gen);
            this.render(out, { nick, a, b, t0, t1, all, own, ment, ids, c });
        } catch (e) {
            if (gen !== this._gen) return;
            this.prog('', gen);
            this.msg('Не получилось: ' + e.message);
        } finally {
            this.busy = false;
        }
    },

    render(out, d) {
        const { nick, a, b, all, own, ment, ids } = d;
        const days = [];
        for (let t = this.dayStart(a); t <= this.dayStart(b); t += 864e5) days.push(this.mskDay(t + 3600e3));
        const perDay = new Map(days.map(x => [x, 0]));
        own.forEach(r => {
            const k = this.mskDay(new Date(r.time).getTime());
            if (perDay.has(k)) perDay.set(k, perDay.get(k) + 1);
        });
        const active = [...perDay.values()].filter(Boolean).length;
        const cats = group(own, r => String(r.category_id ?? ''));
        const mcats = group(ment, r => String(r.category_id ?? ''));
        const dmax = Math.max(1, ...perDay.values());
        const cmax = Math.max(1, ...cats.map(g => g.n));
        const other = group(
            all.filter(r => !ids.includes(String(r.category_id))),
            r => String(r.category_id ?? '')
        );
        const sample = id => {
            const r = all.find(x => String(x.category_id) === id);
            return r ? String(r.transaction_desc || '').slice(0, 110) : '';
        };
        const fmtDay = s => s.split('-').reverse().slice(0, 2).join('.');
        const ru = s => s.split('-').reverse().join('.');
        this.last = d;
        out.innerHTML = `
          <div class="vdl-sum">
            <div class="k"><small>Админ-действий</small><b>${own.length}</b></div>
            <div class="k"><small>Дней с действиями</small><b>${active} / ${days.length}</b></div>
            <div class="k"><small>В среднем в день</small><b>${days.length ? (own.length / days.length).toFixed(1).replace('.0', '') : 0}</b></div>
            <div class="k"><small>${d.c.mention ? 'Упоминаний' : 'Категорий'}</small><b>${d.c.mention ? ment.length : cats.length}</b></div>
          </div>
          <div class="muted" style="font-size:12px;margin:-4px 0 10px">${U.esc(nick)} · ${ru(a)} — ${ru(b)} (МСК)${all.capped ? ' · у ника очень много записей — админские посчитаны отдельно' : ''}</div>
          ${ids.length ? '' : `<div class="card" style="padding:12px 14px;margin-bottom:10px">Не выбрано ни одной категории админ-действий. Отметь их ниже в «Остальные категории этого ника» или в «Что считать».</div>`}
          <div class="seg vdl-tabs" data-g="atab"><button data-v="cat" class="on">${icon('spark', 13)}По категориям</button><button data-v="day">${icon('download', 13)}По дням</button><button data-v="list">${icon('eye', 13)}Список действий</button></div>
          <div data-at="cat">
            <div class="sec"><h4>Админ-действия по категориям</h4><div class="card">${
                cats.length
                    ? cats
                          .map(g => {
                              const m = mcats.find(x => x.k === g.k);
                              return `<div class="vdl-bar"><span class="nm" title="${U.esc(catName({ category_id: g.k }))}">${U.esc(catName({ category_id: g.k }))}</span><span class="tr"><b style="width:${Math.max(3, Math.round((g.n / cmax) * 100))}%"></b></span><span class="n">${g.n}${m ? ` <span class="muted">+${m.n}</span>` : ''}</span></div>`;
                          })
                          .join('')
                    : '<div class="vdl-row"><div class="main sub">За период админ-действий не найдено</div></div>'
            }${mcats.filter(x => !cats.find(g => g.k === x.k)).map(m => `<div class="vdl-bar"><span class="nm">${U.esc(catName({ category_id: m.k }))}</span><span class="tr"></span><span class="n muted">+${m.n}</span></div>`).join('')}
            ${d.c.mention ? '<div class="sub" style="padding:6px 2px">«+N» — записи, где ник упомянут в описании (действия над игроками)</div>' : ''}</div></div>
            <div class="sec"><h4>Остальные категории этого ника — отметь, если это тоже админ-действия</h4><div class="card" data-l="other">${
                other.length
                    ? other
                          .map(
                              g => `<div class="vdl-row"><div class="main"><div class="ttl"><label class="vdl-chk"><input type="checkbox" data-cat="${U.esc(g.k)}"> ${U.esc(catName({ category_id: g.k }))}</label><span class="vdl-tag">${g.n} ${plural(g.n, 'запись', 'записи', 'записей')}</span></div><div class="sub">пример: ${U.esc(sample(g.k)) || '—'}</div></div></div>`
                          )
                          .join('')
                    : '<div class="vdl-row"><div class="main sub">Других категорий у ника за период нет</div></div>'
            }</div></div>
          </div>
          <div data-at="day" hidden><div class="sec"><h4>Админ-действия по дням (МСК)</h4><div class="card">${days
              .slice()
              .reverse()
              .map(k => `<div class="vdl-bar"><span class="nm">${fmtDay(k)} ${['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][new Date(k + 'T12:00:00Z').getUTCDay()]}</span><span class="tr"><b style="width:${perDay.get(k) ? Math.max(3, Math.round((perDay.get(k) / dmax) * 100)) : 0}%"></b></span><span class="n${perDay.get(k) ? '' : ' muted'}">${perDay.get(k)}</span></div>`)
              .join('')}</div></div></div>
          <div data-at="list" hidden><div class="sec"><h4>Действия (последние 300)</h4><div class="card" data-l="list">${
              own.length
                  ? own
                        .slice()
                        .sort((x, y) => new Date(y.time) - new Date(x.time))
                        .slice(0, 300)
                        .map(r => `<div class="vdl-row"><div class="main"><div class="ttl"><span class="vdl-tag">${U.esc(catName(r))}</span><span class="sub" style="margin:0">${fmtDate(r.time)}</span></div><div class="sub">${U.esc(String(r.transaction_desc || '').slice(0, 220))}</div></div></div>`)
                        .join('')
                  : '<div class="vdl-row"><div class="main sub">Пусто</div></div>'
          }</div></div></div>
          <div class="btns" style="margin-top:12px"><span style="flex:1"></span><button class="btn" data-a="copy">${icon('download', 14)}Скопировать отчёт</button></div>`;
        const tabs = out.querySelector('[data-g="atab"]');
        tabs.querySelectorAll('button').forEach(
            bt =>
                (bt.onclick = () => {
                    tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === bt));
                    out.querySelectorAll('[data-at]').forEach(x => (x.hidden = x.dataset.at !== bt.dataset.v));
                })
        );
        // отметил категорию — запомнили и пересчитали (без новых запросов, если записей немного)
        out.querySelectorAll('[data-cat]').forEach(
            ch =>
                (ch.onchange = () => {
                    const c = this.cfg();
                    c.on[ch.dataset.cat] = ch.checked;
                    this.save(c);
                    if (!all.capped) {
                        const ids2 = this.selected(c);
                        this.render(out, Object.assign({}, d, { c, ids: ids2, own: all.filter(r => ids2.includes(String(r.category_id))), ment: d.ment.filter(r => ids2.includes(String(r.category_id))) }));
                    } else toast('Отмечено — нажми «Посчитать» ещё раз', 'info');
                })
        );
        out.querySelector('[data-a="copy"]').onclick = () => {
            const L = [`Админ-действия ${nick} · ${ru(a)} — ${ru(b)} (МСК) · сервер ${Api.server()}`, `Всего: ${own.length}, дней с действиями: ${active} из ${days.length}`];
            cats.forEach(g => {
                const m = mcats.find(x => x.k === g.k);
                L.push(`• ${catName({ category_id: g.k })}: ${g.n}${m ? ` (+${m.n} упоминаний)` : ''}`);
            });
            L.push('По дням:');
            days.forEach(k => perDay.get(k) && L.push(`  ${fmtDay(k)} — ${perDay.get(k)}`));
            navigator.clipboard.writeText(L.join('\n')).then(
                () => toast('Отчёт скопирован'),
                () => toast('Не удалось скопировать', 'err')
            );
        };
    },

    // что считать админ-действиями
    settings() {
        const c = this.cfg();
        if (this.cfgScrim) this.cfgScrim.remove();
        const list = this.known().sort((x, y) => x.name.localeCompare(y.name, 'ru'));
        const scrim = (this.cfgScrim = Layer.add(
            U.h(`<div class="scrim"><div class="modal sm">
            <div class="m-head"><span class="vic" style="--c:var(--acc);width:34px;height:34px;border-radius:10px">${icon('spark', 16)}</span>
              <div><div class="m-title">Что считать админ-действиями</div><div class="m-sub">Категории логов, которые идут в подсчёт</div></div>
              <span style="flex:1"></span><button class="icon-btn" data-a="x">${icon('x')}</button></div>
            <div class="pane">
              <div class="sub" style="margin-bottom:6px">Считать категории, в названии которых есть (через запятую):</div>
              <input class="inp" data-a="kw" style="width:100%" value="${U.esc(c.kw)}">
              <div class="sec"><h4>Известные категории (${list.length})</h4><div class="card" data-l="cats">${
                  list.length
                      ? list.map(x => `<div class="vdl-mrow"><input type="checkbox" data-cat="${x.id}" ${this.isAdmin(x.id, c) ? 'checked' : ''} style="width:18px;height:18px"><span class="nm">${U.esc(x.name)}</span><span class="muted">#${x.id}</span></div>`).join('')
                      : '<div class="vdl-row"><div class="main sub">Названия категорий ещё не известны</div></div>'
              }</div></div>
              <div class="sub" style="margin:8px 0 6px">Добавить категорию по номеру (если название не известно):</div>
              <div class="btns"><input class="inp" data-a="id" placeholder="например 41" style="flex:1"><button class="btn" data-a="add">Добавить</button></div>
              <div class="muted" style="font-size:12px;margin-top:10px">Названия скрипт узнаёт со страницы логов: если какой-то категории нет в списке — открой в логах записи этой категории, она появится. Ещё проще — посчитай админа и отметь категории в блоке «Остальные категории этого ника».</div>
            </div></div></div>`)
        ));
        const close = () => {
            scrim.remove();
            this.cfgScrim = null;
        };
        scrim.querySelector('[data-a="x"]').onclick = close;
        scrim.addEventListener('mousedown', e => e.target === scrim && close());
        scrim.querySelector('[data-a="kw"]').onchange = e => {
            const n = this.cfg();
            n.kw = e.target.value;
            this.save(n);
            scrim.querySelectorAll('[data-cat]').forEach(ch => (ch.checked = this.isAdmin(ch.dataset.cat, n)));
        };
        scrim.querySelectorAll('[data-cat]').forEach(
            ch =>
                (ch.onchange = () => {
                    const n = this.cfg();
                    n.on[ch.dataset.cat] = ch.checked;
                    this.save(n);
                })
        );
        scrim.querySelector('[data-a="add"]').onclick = () => {
            const v = scrim.querySelector('[data-a="id"]').value.trim();
            if (!/^\d{1,4}$/.test(v)) return toast('Номер категории — число', 'err');
            const n = this.cfg();
            if (!n.extra.includes(v)) n.extra.push(v);
            n.on[v] = true;
            this.save(n);
            toast(`Категория #${v} добавлена`);
            this.settings();
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
        head.innerHTML = `<button type="button" class="vdl-hbtn" data-a="an" title="Аналитика по игроку, ID, IP и устройству">${icon('shield', 14)}Аналитика</button><button type="button" class="vdl-hbtn vdl-hadm" data-a="adm" title="Подсчёт админ-действий по нику администратора за период">${icon('lock', 14)}Админ-действия</button><button type="button" class="vdl-hbtn vdl-hcog" data-a="cog" title="Подсветка и оформление">${icon('spark', 14)}</button>`;
        head.querySelector('[data-a="an"]').onclick = () => Panel.open();
        head.querySelector('[data-a="adm"]').onclick = () => AdminView.open();
        head.querySelector('[data-a="cog"]').onclick = () => this.settings();
        this.placeHead();
        const st = document.createElement('style');
        st.textContent = `.vdl-head { display: inline-flex; flex: none; align-items: center; gap: 6px; margin: 0 auto 0 12px; vertical-align: middle; }
.vdl-head.float { position: fixed; left: 18px; bottom: 18px; z-index: 2147483000; margin: 0; }
.vdl-hbtn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 999px; border: 0; font: 700 12.5px/1 Inter, "Segoe UI", system-ui, sans-serif; color: #fff; cursor: pointer; white-space: nowrap;
  background: linear-gradient(135deg, ${acc}, color-mix(in srgb, ${acc} 55%, #3aa0ff)); box-shadow: 0 6px 16px -8px ${acc}; }
.vdl-hbtn:hover { filter: brightness(1.1); }
.vdl-hadm { background: linear-gradient(135deg, color-mix(in srgb, ${acc} 55%, #7a5cff), #7a5cff); box-shadow: 0 6px 16px -8px #7a5cff; }
.vdl-hcog { padding: 0 8px; background: rgba(255,255,255,.08); border: 1px solid color-mix(in srgb, ${acc} 40%, transparent); box-shadow: none; }
.vdl-hcog:hover { background: ${acc}; }
.vdl-mini { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 6px; vertical-align: middle; border-radius: 6px; border: 1px solid color-mix(in srgb, ${acc} 45%, transparent); background: color-mix(in srgb, ${acc} 16%, transparent); color: #fff; font-size: 11px; cursor: pointer; opacity: .75; }
.vdl-mini:hover { opacity: 1; background: ${acc}; }
.vdl-hl { border-radius: 6px; padding: 1px 6px; transition: box-shadow .12s, filter .12s; }
.vdl-hl.hot { filter: brightness(1.3); box-shadow: 0 0 0 2px #fff7; }
.vdl-cnt { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; margin-left: 6px; padding: 0 5px; vertical-align: middle; border-radius: 999px; font-size: 11px; font-weight: 800; color: #fff; cursor: pointer; }
.vdl-done { text-decoration: line-through; opacity: .45; }
.vdl-dates { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 10px; }
.vdl-dates button { height: 28px; padding: 0 11px; border-radius: 8px; font-weight: 650; font-size: 12px; line-height: 1; font-family: inherit; color: #fff; border: 1px solid color-mix(in srgb, ${acc} 40%, transparent); background: color-mix(in srgb, ${acc} 14%, transparent); cursor: pointer; }
.vdl-dates button:hover { background: ${acc}; }
.vdl-trade { display: inline-flex; align-items: center; margin-left: 10px; padding: 2px 10px; vertical-align: middle; border-radius: 7px; font-size: 12px; font-weight: 700; color: #fff; cursor: pointer; background: color-mix(in srgb, ${acc} 80%, #1b6cff); box-shadow: 0 2px 8px -3px ${acc}; }
.vdl-trade:hover { filter: brightness(1.12); }
/* Bootstrap 5.3 красит ячейки светлой заливкой через inset box-shadow поверх любого фона — убираем, ячейки тёмные */
html body table td, html body table th { box-shadow: none !important; --bs-table-bg-type: transparent; --bs-table-bg-state: transparent; --bs-table-accent-bg: transparent; --bs-table-striped-bg: transparent; --bs-table-hover-bg: transparent; }
html body :is(#log-table, table), html body :is(#log-table, table) tbody, html body :is(#log-table, table) tbody tr { background: transparent !important; --bs-table-bg: transparent; }
/* ячейки — стекло темы VERDICT (как блоки на форуме): полупрозрачные, фон просвечивает */
html body :is(#log-table, table) tbody :is(.first-row, tr) td { background: var(--vd-glass, rgba(18,20,27,.42)) !important; backdrop-filter: blur(10px) saturate(1.15); -webkit-backdrop-filter: blur(10px) saturate(1.15); color: #e4e6eb; }
html body :is(#log-table, table) tbody :is(.second-row, tr) td[colspan] { background: linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.2)), var(--vd-glass, rgba(18,20,27,.42)) !important; color: #cfd2d8; }
/* выпадающие списки фильтров (vue-select и любые listbox): тёмные вместо белых */
html body :is(.vs__dropdown-toggle, .vs__dropdown-menu, [role="listbox"], .multiselect__content-wrapper, .multiselect__tags) { background: #14161c !important; color: #e8eaee !important; border-color: rgba(255,255,255,.12) !important; }
html body :is(.vs__dropdown-option, [role="listbox"] [role="option"], [role="listbox"] li, .multiselect__option) { background: transparent !important; color: #e8eaee !important; }
html body :is(.vs__dropdown-option--highlight, .vs__dropdown-option--selected, [role="option"][aria-selected="true"], [role="listbox"] li:hover, .multiselect__option--highlight) { background: ${acc} !important; color: #fff !important; }
html body :is(.vs__search, .vs__selected) { color: #e8eaee !important; background: transparent !important; border: 0 !important; }
html body .vs__search::placeholder { color: rgba(232,234,238,.5) !important; }
html body :is(.vs__open-indicator, .vs__clear) { fill: #e8eaee !important; }
html body :is(#log-table, table) tbody :is(.first-row, tr):hover td { background: linear-gradient(color-mix(in srgb, ${acc} 16%, transparent), color-mix(in srgb, ${acc} 16%, transparent)), var(--vd-glass, rgba(18,20,27,.42)) !important; }`;
        document.head.appendChild(st);
        let queued = false;
        const run = () => {
            queued = false;
            mo.disconnect();
            try {
                this.placeHead();
                this.decorate();
                CatLearn.learn().catch(() => {});
            } finally {
                mo.observe(document.body, { childList: true, subtree: true, characterData: true });
            }
        };
        const mo = new MutationObserver(() => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(run);
        });
        run();
        this.quickDates();
        CatLearn.discover().catch(() => {});
        this.fromHash();
        addEventListener('hashchange', () => this.fromHash());
    },
    fromHash() {
        const m = location.hash.match(/^#vd-(nick|id|ip|dev)=(.+)$/);
        if (!m) return;
        const v = decodeURIComponent(m[2]);
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
        new MutationObserver(U.debounce(place, 300)).observe(document.body, { childList: true, subtree: true });
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
            else if (n.nodeType === 1 && !/\bvdl-(mini|trade|cnt)\b/.test(n.className)) s += n.textContent;
        });
        return s.replace(/\s+/g, ' ').trim();
    },
    // сайт (Vue) переиспользует ячейки под новые строки — снимаем всё наше и разбираем заново
    reset(td) {
        td.querySelectorAll(':scope > .vdl-mini, :scope > .vdl-trade, :scope > .vdl-cnt').forEach(x => x.remove());
        td.querySelectorAll(':scope > .vdl-hl').forEach(p => {
            while (p.firstChild) td.insertBefore(p.firstChild, p);
            p.remove();
        });
        ['vdl', 'hk', 'hv', 'trade', 'money', 'vdlSig'].forEach(k => delete td.dataset[k]);
        td.classList.remove('vdl-done');
        const tr = td.closest('tr');
        if (tr) tr.classList.remove('vdl-done');
    },

    decorate() {
        const c = this.cfg();
        document.querySelectorAll('td').forEach(td => {
            if (td.dataset.vdlSig !== undefined && td.dataset.vdlSig !== this.rawOf(td)) this.reset(td);
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
        this.recolor();
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
    SPREAD: [0, 24, -24, 46, -46, 12, -12, 34, -34, 60],
    recolor() {
        const c = this.cfg();
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
                    const txt = [...td.childNodes].find(x => x.nodeType === 3 && x.textContent.trim());
                    if (h != null && !pill && txt) {
                        pill = document.createElement('span');
                        pill.className = 'vdl-hl';
                        td.insertBefore(pill, txt);
                        pill.appendChild(txt);
                        pill.onmouseenter = () => this.hot(type, val, true);
                        pill.onmouseleave = () => this.hot(type, val, false);
                    }
                    if (pill) {
                        pill.style.background = h != null ? `hsla(${h},72%,55%,.3)` : '';
                        pill.style.boxShadow = h != null ? `inset 0 0 0 1px hsla(${h},80%,65%,.6)` : '';
                    }
                    let cnt = td.querySelector('.vdl-cnt');
                    if (h != null && !cnt) {
                        cnt = document.createElement('span');
                        cnt.className = 'vdl-cnt';
                        cnt.title = 'Сколько раз среди загруженных строк. Клик — отметить «разобрано»';
                        cnt.onclick = e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const d = Store.get(type + 'Done', {});
                            if (d[val]) delete d[val];
                            else d[val] = Date.now();
                            Store.set(type + 'Done', d);
                            this.recolor();
                        };
                        td.appendChild(cnt);
                    } else if (h == null && cnt) cnt.remove();
                    if (cnt) {
                        if (cnt.textContent !== '×' + n) cnt.textContent = '×' + n;
                        cnt.style.background = `hsl(${h},68%,45%)`;
                    }
                    if (h == null && pill) {
                        pill.style.background = '';
                        pill.style.boxShadow = '';
                    }
                    const mark = c[type].on && isDone;
                    td.classList.toggle('vdl-done', mark);
                    const tr = td.closest('tr');
                    if (tr) tr.classList.toggle('vdl-done', mark);
                });
            });
        });
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
                { transaction_desc__ilike: `%TradeID: ${id}%`, time__gte: new Date(Date.now() - 180 * 864e5).toISOString(), time__lte: new Date().toISOString() },
                6
            );
            rows.sort((a, b) => new Date(a.time) - new Date(b.time));
            if (this.scrim !== scrim) return;
            scrim.querySelector('.vdl-prog').textContent = rows.length ? `${rows.length} записей · участники: ${[...new Set(rows.map(r => r.player_name).filter(Boolean))].join(', ')}` : '';
            const box = scrim.querySelector('.vdl-tv');
            box.innerHTML = rows.length
                ? rows
                      .map(
                          r => `<div class="vdl-tv-row"><span class="who">${U.esc(r.player_name || '—')}</span><span class="tm">${U.esc(fmtDate(r.time))}</span><span class="ds">${U.esc(String(r.transaction_desc || '').replace(/^\[TradeID:\s*\d+\]\s*/, ''))}</span></div>`
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
    const logsNick = ON_LOGS ? ((document.body.textContent.match(/Выйти\s*\[([^\]]{2,40})\]/) || [])[1] || '') : '';
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

addEventListener(
    'keydown',
    e => {
        if (e.key === 'Escape' && Layer._root) {
            const top = [...Layer._root.querySelectorAll('.scrim')].pop();
            if (!top) return;
            top.remove();
            if (Panel.scrim === top) Panel.scrim = null;
            if (TradeView.scrim === top) TradeView.scrim = null;
            if (AdminView.scrim === top) AdminView.scrim = null;
            if (AdminView.cfgScrim === top) AdminView.cfgScrim = null;
        }
    },
    true
);

U.ready(() => main().catch(e => console.warn('VERDICT Логи:', e)));

})();
