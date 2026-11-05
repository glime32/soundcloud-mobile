// ==UserScript==
// @name         SoundCloud – aléatoire automatique + plus
// @namespace    glime32
// @version      4.0.0
// @description  Aléatoire auto, bouton « Aléatoire » rouge à côté de View/Filter, écran allumé, son suivant auto, bulle de temps sur la barre, paroles CloudLyrics à la bonne taille
// @match        https://soundcloud.com/*
// @match        https://*.soundcloud.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/glime32/soundcloud-mobile/main/soundcloud-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/glime32/soundcloud-mobile/main/soundcloud-mobile.user.js
// ==/UserScript==

(() => {
  'use strict';

  const ROUGE = '#ff0000';
  const VIOLET = '#610089';
  const ITEMS = '.badgeList__item, .soundList__item, .trackList__item';
  const $ = s => document.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* « 1:23 » ou « 1:02:03 » -> secondes */
  const parseT = el => {
    const m = ((el && el.textContent) || '').match(/\d+(?::\d{2})+/g);
    return m ? m.pop().split(':').reduce((a, b) => a * 60 + Number(b), 0) : NaN;
  };
  const fmt = s => {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0');
    return h ? h + ':' + String(m).padStart(2, '0') + ':' + x : m + ':' + x;
  };
  const isPlaying = () => !!$('.playControls .playControl.playing');
  /* agrandissement appliqué par le style Stylus (1 si aucun) */
  const zoomZ = () => {
    const h = document.documentElement, r = h.getBoundingClientRect();
    const z = h.offsetWidth ? r.width / h.offsetWidth : 1;
    return z > 0.2 && z < 10 ? z : 1;
  };

  /* 1) Aléatoire activé dès que tu lances un son */
  function shuffleOn() {
    const b = $('.playControls .shuffleControl') || $('.shuffleControl');
    if (b && !b.classList.contains('m-shuffling')) b.click();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('.sc-button-play, .playButton');
    if (!b || b.closest('.playControls')) return;
    setTimeout(shuffleOn, 700);
    setTimeout(shuffleOn, 2000);
  }, true);

  /* 2) Bouton « Aléatoire » rouge : charge TOUS les titres puis en lance un au hasard */
  let busy = false;
  async function shuffleAll(btn) {
    if (busy) return;
    busy = true;
    const label = btn.querySelector('span');
    const y = scrollY;
    let n = 0, same = 0;
    while (same < 4) {
      scrollTo(0, document.body.scrollHeight);
      await wait(1200);
      const c = document.querySelectorAll(ITEMS).length;
      label.textContent = 'Chargement… ' + c;
      if (c === n) same++; else { same = 0; n = c; }
    }
    scrollTo(0, y);
    shuffleOn();
    await wait(300);
    const list = [...document.querySelectorAll(ITEMS)];
    const it = list[Math.floor(Math.random() * list.length)];
    const p = it && it.querySelector('.sc-button-play:not(.sc-button-pause), .playButton');
    if (p) p.click();
    label.textContent = n + ' titres';
    setTimeout(() => { label.textContent = 'Aléatoire'; }, 3000);
    busy = false;
  }
  const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" style="flex:none"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>';
  /* la ligne « View ▦ ≣ Filter » : le plus petit bloc qui contient le champ Filtre et des boutons */
  function filterRow() {
    const input = [...document.querySelectorAll('#content input')].find(i => !i.closest('.header'));
    if (!input) return null;
    for (let e = input.parentElement; e && e.id !== 'content'; e = e.parentElement) {
      if (e.querySelector(ITEMS)) return null;
      if (e.querySelectorAll('button, .sc-button').length >= 2) return e;
    }
    return null;
  }
  function makeButton() {
    const btn = document.createElement('button');
    btn.id = 'gl-shuffle';
    btn.innerHTML = ICON + '<span>Aléatoire</span>';
    btn.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:6px', 'flex:none',
      'height:36px', 'padding:0 14px', 'border:0', 'border-radius:10px', 'background:' + ROUGE,
      'color:#fff', 'font:700 14px system-ui,sans-serif', 'white-space:nowrap', 'cursor:pointer'
    ].join(';');
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); shuffleAll(btn); });
    return btn;
  }
  function addButton() {
    const ok = /\/(likes|sets|tracks|popular-tracks)(\/|$)/.test(location.pathname);
    let btn = document.getElementById('gl-shuffle');
    if (!ok) { if (btn) btn.remove(); return; }
    const row = filterRow();
    if (row) {
      /* sur la même ligne que View / Filter, collé à gauche */
      if (btn && btn.parentElement === row && row.firstElementChild === btn) return;
      if (!btn) btn = makeButton();
      row.style.setProperty('display', 'flex', 'important');
      row.style.setProperty('align-items', 'center', 'important');
      row.style.setProperty('gap', '8px', 'important');
      row.style.setProperty('width', '100%', 'important');
      btn.style.marginRight = 'auto';
      row.insertBefore(btn, row.firstChild);
      return;
    }
    /* pas de ligne Filtre (playlist…) : au-dessus de la liste */
    const list = document.querySelector('ul:has(> li[class*="adgeList__item"]), .soundList, .trackList');
    if (!list || (btn && btn.nextElementSibling === list)) return;
    if (!btn) btn = makeButton();
    btn.style.margin = '6px 0 14px';
    list.parentNode.insertBefore(btn, list);
  }

  /* 3) Écran qui reste allumé pendant la musique */
  let lock = null, asking = false;
  async function keepAwake() {
    if (!('wakeLock' in navigator)) return;
    if (isPlaying() && !lock && !asking && document.visibilityState === 'visible') {
      asking = true;
      try {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
      } catch (e) { /* refusé : on réessaiera */ }
      asking = false;
    } else if (!isPlaying() && lock) {
      lock.release().catch(() => {});
      lock = null;
    }
  }
  document.addEventListener('visibilitychange', keepAwake);

  /* 4) Passage auto au son suivant si SoundCloud reste bloqué à la fin */
  let stuck = 0, doneFor = '';
  function watchdog() {
    if (!$('.playControls .playControl')) return;
    const key = ($('.playbackSoundBadge__titleLink') || {}).href || '';
    if (isPlaying()) { stuck = 0; doneFor = ''; return; }
    const pos = parseT($('.playControls .playbackTimeline__timePassed'));
    const dur = parseT($('.playControls .playbackTimeline__duration'));
    const ended = dur > 0 && pos >= dur - 1;
    if (!ended || key === doneFor) { stuck = 0; return; }
    if (++stuck >= 3) {
      stuck = 0;
      doneFor = key;
      const next = $('.playControls .skipControl__next');
      if (next) next.click();
    }
  }

  /* 5) Barre de temps : bulle avec le temps exact pendant que tu glisses
     (le glisser lui-même est fait par SoundCloud ; le style Stylus corrige son calcul) */
  function setupSeek() {
    const row = $('.playControls .playbackTimeline');
    if (!row || row.dataset.glSeek) return;
    row.dataset.glSeek = '1';
    const getBar = () => row.querySelector('.playbackTimeline__progressWrapper');
    const tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;z-index:50;display:none;bottom:calc(100% + 6px);transform:translateX(-50%);padding:5px 12px;border-radius:999px;background:' + VIOLET + ';color:#fff;font:700 13px system-ui,sans-serif;pointer-events:none;white-space:nowrap';
    row.appendChild(tip);
    let on = false;
    const update = t => {
      const bar = getBar();
      if (!bar || !t) return;
      const br = bar.getBoundingClientRect(), rr = row.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (t.clientX - br.left) / br.width));
      tip.style.left = ((br.left - rr.left) + f * br.width) * (row.offsetWidth / (rr.width || 1)) + 'px';
      const dur = parseT($('.playControls .playbackTimeline__duration'));
      tip.textContent = isNaN(dur) ? Math.round(f * 100) + ' %' : fmt(f * dur) + ' / ' + fmt(dur);
    };
    row.addEventListener('touchstart', e => { on = true; update(e.touches[0]); tip.style.display = 'block'; }, { passive: true });
    row.addEventListener('touchmove', e => { if (on) update(e.touches[0]); }, { passive: true });
    const end = () => { on = false; tip.style.display = 'none'; };
    row.addEventListener('touchend', end, { passive: true });
    row.addEventListener('touchcancel', end, { passive: true });
  }

  /* 6) Paroles CloudLyrics : on annule l'agrandissement sur l'extension
     On la repère par ce qui est affiché au-dessus du lecteur ou au milieu de l'écran
     (peu importe comment elle s'appelle), puis on lui remet sa taille d'origine. */
  const SC = /(^|\s)(sc-|l-|g-)|__|playControls|playback|queue|header|soundBadge|Tile|badgeList|dropdown|dropbar|modal|lazyLoading|collection/;
  const isSC = e => e.id === 'app' || e.id === 'content' || SC.test(e.getAttribute('class') || '');
  const lyrics = new Set();
  function findLyrics() {
    const card = $('.playControls__inner');
    const cr = card && card.getBoundingClientRect();
    const top = cr && cr.height > 0 ? cr.top : innerHeight;
    const pts = [[innerWidth * 0.75, top - 30], [innerWidth * 0.85, top - 120], [innerWidth * 0.5, innerHeight * 0.4], [innerWidth * 0.3, innerHeight * 0.25]];
    for (const [x, y] of pts) {
      const hit = document.elementFromPoint(x, y);
      if (!hit) continue;
      let cand = null;
      for (let e = hit; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
        if (isSC(e)) break;
        cand = e;
      }
      if (!cand || lyrics.has(cand) || (cand.id || '').startsWith('gl-')) continue;
      if (cand.closest('#content, .header, .playControls__inner, .queue, .dropdownMenu, .dropbar, .modal')) continue;
      const topLevel = cand.parentElement === document.body || cand.parentElement === document.documentElement;
      const pos = getComputedStyle(cand).position;
      const r = cand.getBoundingClientRect();
      const big = r.width >= 150 && r.height >= 100;
      if (topLevel || ((pos === 'fixed' || pos === 'absolute') && big)) lyrics.add(cand);
    }
  }
  function fixLyrics() {
    findLyrics();
    const Z = zoomZ();
    for (const el of lyrics) {
      if (!el.isConnected) { lyrics.delete(el); continue; }
      const r = el.getBoundingClientRect();
      /* plein écran (ou conteneur invisible) : taille d'origine exacte ; petit panneau : 1,5× pour rester lisible */
      const full = r.height >= innerHeight * 0.6 || r.width * r.height === 0;
      const z = String((full ? 1 : 1.5) / Z);
      if (el.style.getPropertyValue('zoom') !== z) el.style.setProperty('zoom', z, 'important');
    }
  }

  setInterval(() => {
    addButton();
    setupSeek();
    keepAwake();
    watchdog();
    fixLyrics();
  }, 1000);
})();