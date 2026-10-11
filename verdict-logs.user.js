// ==UserScript==
// @name         VERDICT Логи
// @namespace    verdict.br.logs
// @version      0.2.1
// @description  Аналитика по IP и устройствам на logs.blackrussia.online. Работает вместе с VERDICT.
// @author       Максим Паль!?
// @match        https://logs.blackrussia.online/*
// @match        https://forum.blackrussia.online/members/*
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
// @version      0.2.1
// @description  Аналитика по IP и устройствам на logs.blackrussia.online. Работает вместе с VERDICT.
// @author       Максим Паль!?
// @match        https://logs.blackrussia.online/*
// @match        https://forum.blackrussia.online/members/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      ipwho.is
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @run-at       document-end
// @noframes
// ==/UserScript==

const VERSION = '0.2.1';
const MAIL = 'https://script.google.com/macros/s/AKfycbx-yEBIw_o_NKjnie7loXBJbcawRA0nU-eCHAKe9DHcxWyRrMhhvJo_DShtxZFJPiHT2Q/exec';
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

const Api = {
    last: 0,
    order: '-time',
    server() {
        const m = location.pathname.match(/\/gslogs\/(\d+)/);
        return m ? m[1] : Store.get('server', '');
    },
    async page(params, offset) {
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

    byNick(nick) {
        return this.run(async () => {
            const base = Object.assign({ player_name__exact: nick }, Api.range(this.days));
            this.prog('Читаю подключения игрока…');
            let rows = await Api.all(Object.assign({ category_id__exact: 38 }, base), 10, (p, n) => this.prog(`Подключения: страница ${p}, записей ${n}…`));
            let note = '';
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
    Layer.accent(info);
    if (!info.lid) return ON_LOGS && notice('Нужен VERDICT', 'Обнови VERDICT до последней версии — эта не умеет работать с «VERDICT Логи».');
    const logsNick = ON_LOGS ? ((document.body.textContent.match(/Выйти\s*\[([^\]]{2,40})\]/) || [])[1] || '') : '';
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

U.ready(() => main().catch(e => console.warn('VERDICT Логи:', e)));

})();
