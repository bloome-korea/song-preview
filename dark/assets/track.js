/* 블루메 송 (dark) — 방문자 퍼널 단계 기록 (tracking_v1)
   - 익명 방문자 번호(localStorage 무작위) · 세션 번호 · 페이지 · 유입(UTM/gad_campaignid/referrer 호스트) · 기기만 보냄
   - 입력한 글자·이름·전화번호·사연·주문번호·토큰은 절대 보내지 않음 (주소의 ?뒤 값도 보내지 않음, 허용된 UTM 값만)
   - 실패해도 사이트 동작에 영향 없음 (모든 처리를 try 로 감쌈, 응답을 기다리지 않음)
   - 끄기: 주소 끝에 ?notrack=1 로 한 번 열면 그 브라우저는 기록 안 함 (?notrack=0 으로 다시 켬)
   - Microsoft Clarity: 아래 CLARITY_ID 한 곳만 바꾸면 모든 dark 페이지에 붙음. 토큰·주문번호가 주소에 있는 화면에서는 Clarity 를 켜지 않음 */
(function () {
  'use strict';
  var CLARITY_ID = 'zftdruz7jm';   // Microsoft Clarity 프로젝트 ID (bloome.korea 계정, Bloome Song). 'CLARITY_ID' 로 바꾸면 Clarity 꺼짐
  var FALLBACK_URL = 'https://script.google.com/macros/s/AKfycbztrD0YkxCbYa3ZAjefPJWwygqLsSsChlpSJhYffi28dnUN_oXT2WecigZv8n1UHJYZ/exec';
  var STEP_NAMES = { 0: '영상방식', 1: '받는분', 2: '이름', 3: '계기', 4: '음악', 5: '그분은', 6: '기억', 7: '한마디', 8: '확인' };
  var SENSITIVE_Q = /[?&](t|s|o|order|token|id|pin|phone|email)=/i;   // 이런 값이 주소에 있으면 Clarity 안 켬
  var MASK_PAGES = /\/(create|status|checkout|thanks|done)\.html$/;  // 고객이 쓴 글·이름이 화면에 나오는 페이지 → Clarity 에서 본문 전체 가림

  var W = window, D = document, LS, SS;
  try { LS = W.localStorage; SS = W.sessionStorage; } catch (e) {}
  function lget(st, k) { try { return st ? st.getItem(k) || '' : ''; } catch (e) { return ''; } }
  function lset(st, k, v) { try { if (st) st.setItem(k, v); } catch (e) {} }
  function rnd() { var s = ''; try { var a = new Uint8Array(10); W.crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) s += (a[i] % 36).toString(36); } catch (e) { s = Math.random().toString(36).slice(2, 12); } return (s + Math.random().toString(36).slice(2)).slice(0, 12); }

  try {
    var qs = new URLSearchParams(location.search);
    if (qs.get('notrack') === '1') lset(LS, 'bl_notrack', '1');
    if (qs.get('notrack') === '0') { try { LS.removeItem('bl_notrack'); } catch (e) {} }
  } catch (e) { qs = null; }
  var OFF = lget(LS, 'bl_notrack') === '1' || /bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent || '');

  /* ---------- Microsoft Clarity ---------- */
  function clarityEv(name) { try { if (typeof W.clarity === 'function') W.clarity('event', name); } catch (e) {} }
  try {
    var path0 = location.pathname;
    var clarityOn = !OFF && CLARITY_ID && CLARITY_ID !== 'CLARITY_ID' && /^[a-z0-9]{4,20}$/i.test(CLARITY_ID) && !SENSITIVE_Q.test(location.search);
    if (clarityOn) {
      var maskNow = function () {
        try {
          if (MASK_PAGES.test(path0) && D.body) D.body.setAttribute('data-clarity-mask', 'True');
          var chat = D.getElementById('bc-panel'); if (chat) chat.setAttribute('data-clarity-mask', 'True');
        } catch (e) {}
      };
      maskNow(); D.addEventListener('DOMContentLoaded', maskNow); W.addEventListener('load', maskNow);
      (function (c, l, a, r, i, t, y) {   // Microsoft 공식 스니펫
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(W, D, 'clarity', 'script', CLARITY_ID);
    }
  } catch (e) {}

  /* ---------- 공통 값 ---------- */
  var C = W.BLOOME_CONFIG || {};
  var URL_ = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(C.APPS_SCRIPT_URL || '') ? C.APPS_SCRIPT_URL : FALLBACK_URL;
  var isNew = 0, vid = lget(LS, 'bl_vid');
  if (!/^[a-z0-9]{12}$/.test(vid)) { vid = rnd(); lset(LS, 'bl_vid', vid); isNew = 1; }
  var now = Date.now(), sid = lget(SS, 'bl_sid'), last = +lget(LS, 'bl_last') || 0;
  if (!/^[a-z0-9]{12}$/.test(sid) || now - last > 30 * 60 * 1000) { sid = rnd(); lset(SS, 'bl_sid', sid); lset(SS, 'bl_src', ''); }
  lset(LS, 'bl_last', String(now));
  var pv = rnd().slice(0, 8), seq = 0;

  function cut(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>"'`]/g, '').slice(0, n); }
  function pagePath() {   // 경로만 (쿼리·해시 없음)
    var p = location.pathname.replace(/\/index\.html$/, '/');
    return cut(p, 80) || '/';
  }
  // 세션 첫 유입값(허용 목록만). 같은 세션 안의 다음 페이지도 같은 유입으로 기록
  var src = null;
  try { src = JSON.parse(lget(SS, 'bl_src') || 'null'); } catch (e) {}
  if (!src) {
    src = {};
    try {
      if (qs) {
        [['us', 'utm_source'], ['um', 'utm_medium'], ['uc', 'utm_campaign'], ['ux', 'utm_content'], ['ut', 'utm_term'], ['gk', 'gad_campaignid'], ['gs', 'gad_source']].forEach(function (k) {
          var v = qs.get(k[1]); if (v) src[k[0]] = cut(v, 80);
        });
        if (qs.get('gclid') || qs.get('gbraid') || qs.get('wbraid')) src.gc = '1';
      }
      var ref = D.referrer ? new URL(D.referrer) : null;
      if (ref && ref.hostname !== location.hostname) src.ref = cut(ref.hostname, 80);   // 호스트만 (예: m.youtube.com)
    } catch (e) {}
    lset(SS, 'bl_src', JSON.stringify(src));
  }
  function device() {
    var ua = navigator.userAgent || '';
    if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
    return /Mobi|iPhone|iPod|Android/i.test(ua) ? 'mobile' : 'pc';
  }
  var DEV = device(), WIDTH = Math.round(W.innerWidth || 0);

  /* ---------- 보내기 (모아서, 응답 안 기다림) ---------- */
  var queue = [], timer = 0;
  function send(useBeacon) {
    if (OFF || !queue.length) return;
    clearTimeout(timer); timer = 0;
    var batch = queue.splice(0, 25);
    var body = JSON.stringify({ action: 'track', v: 1, vid: vid, sid: sid, pv: pv, nw: isNew, dev: DEV, w: WIDTH, page: pagePath(), src: src, e: batch });
    try {
      var ok = false;
      if (useBeacon && navigator.sendBeacon) ok = navigator.sendBeacon(URL_, new Blob([body], { type: 'text/plain;charset=utf-8' }));
      if (!ok && W.fetch) W.fetch(URL_, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }).catch(function () {});
    } catch (e) {}
    if (queue.length) send(useBeacon);
  }
  function ev(name, step, label, ms, now_) {
    try {
      if (OFF) return;
      queue.push([cut(name, 24), step == null ? '' : step, cut(label, 40), ms == null ? '' : Math.max(0, Math.round(ms)), ++seq]);
      clarityEv(name);
      if (now_) send(true); else if (!timer) timer = setTimeout(function () { send(false); }, 2500);
      lset(LS, 'bl_last', String(Date.now()));
    } catch (e) {}
  }
  W.BLOOME_TRACK = { ev: function (n, l) { if (/^[a-z0-9_]{2,24}$/.test(n)) ev(n, '', l); } };

  /* ---------- landing / status_open ---------- */
  var page = pagePath();
  ev('landing', '', isNew ? 'new' : 'return');
  if (/\/status\.html$/.test(page)) ev('status_open', '', (qs && qs.get('demo')) ? 'demo' : ((qs && qs.get('t')) ? 'link' : 'direct'));

  /* ---------- 스크롤 50% / 90% ---------- */
  var s50 = false, s90 = false;
  function onScroll() {
    try {
      var h = Math.max(D.documentElement.scrollHeight, D.body ? D.body.scrollHeight : 0), y = (W.scrollY || W.pageYOffset || 0) + W.innerHeight;
      if (h <= W.innerHeight * 1.2) return;   // 거의 스크롤 없는 화면은 제외
      var r = y / h;
      if (!s50 && r >= 0.5) { s50 = true; ev('scroll_50'); }
      if (!s90 && r >= 0.9) { s90 = true; ev('scroll_90'); W.removeEventListener('scroll', onScroll); }
    } catch (e) {}
  }
  W.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 만들기 버튼 (create.html 로 가는 링크) ---------- */
  D.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!/(^|\/)create\.html(\?|#|$)/.test(href) || /\/create\.html$/.test(page)) return;
      var where = 'body', box = a.closest('.sticky,header,nav,footer,section,[id]');
      if (box) where = /sticky/.test(box.className || '') ? 'sticky' : (/^(HEADER|NAV)$/.test(box.tagName) ? 'header' : (box.tagName === 'FOOTER' ? 'footer' : (box.id || String(box.className || '').split(' ')[0] || box.tagName.toLowerCase())));
      ev('cta_click', '', where, null, true);   // 곧 페이지가 바뀌므로 바로 보냄
    } catch (x) {}
  }, true);

  /* ---------- 신청 단계 (create.html: 0 영상방식 → 1~8) ---------- */
  function watchSteps() {
    var gate = D.getElementById('vt-gate'), form = D.getElementById('create');
    if (!form) return;
    var cur = null, t0 = Date.now();
    function now_step() {
      if (gate && !gate.hidden) return 0;
      var on = D.querySelector('#create .step.on');
      return on ? (+on.getAttribute('data-step') || null) : null;
    }
    function check() {
      try {
        var n = now_step();
        if (n == null || n === cur) return;
        var prev = cur, dt = Date.now() - t0; cur = n; t0 = Date.now();
        ev('form_step_' + n, n, STEP_NAMES[n] || ('step' + n), prev == null ? null : dt);
      } catch (e) {}
    }
    check();
    try {
      var mo = new MutationObserver(check);
      if (gate) mo.observe(gate, { attributes: true, attributeFilter: ['hidden'] });
      [].forEach.call(D.querySelectorAll('#create .step'), function (s) { mo.observe(s, { attributes: true, attributeFilter: ['class'] }); });
    } catch (e) {}
    if (gate) gate.addEventListener('click', function (e) {   // 영상 방식 고른 값(photo|image)만
      try { var c = e.target.closest('.vt-card'); if (c && /^(photo|image)$/.test(c.dataset.vt || '')) ev('video_pick', 0, c.dataset.vt); } catch (x) {}
    }, true);
  }

  /* ---------- 신청 완료 / 실패, 듣기 화면 반응: BLOOME.post 결과만 엿봄 (보낸 내용은 보지 않음) ---------- */
  function tapPost() {
    var B = W.BLOOME;
    if (!B || typeof B.post !== 'function' || B.post.__tr) return;
    var orig = B.post;
    var wrapped = function (body) {
      var res = orig.apply(this, arguments);
      try {
        var act = body && body.action, typ = body && body.type;
        if (act === 'apply' && res && res.then) {
          res.then(function (r) {
            try { if (r && r.ok) ev('form_submit', 8, '', null, true); else ev('form_error', 8, (r && /^[a-z_]{2,24}$/.test(r.error || '')) ? r.error : 'server', null, true); } catch (e) {}
          }, function () { try { ev('form_error', 8, 'network', null, true); } catch (e) {} });
        }
        if (act === 'free_event' && /^[a-z0-9_]{2,24}$/.test(typ || '')) ev('reaction', '', typ);
      } catch (e) {}
      return res;
    };
    wrapped.__tr = true;
    B.post = wrapped;
  }

  /* ---------- 재생 시작 / 끝까지 (audio 만, 무음 잠금해제 소리 제외) ---------- */
  function mediaLabel(a) {
    var s = a.currentSrc || a.src || '';
    if (/^blob:/.test(s)) return 'song';
    var m = /\/([\w.-]+\.(mp3|m4a|wav|ogg))(\?|$)/i.exec(s);
    return m ? cut(m[1], 40) : 'audio';
  }
  try {
    var P = W.HTMLMediaElement && W.HTMLMediaElement.prototype, origPlay = P && P.play;
    if (origPlay && !origPlay.__tr) {
      var hook = function (a) {
        if (a.__trHooked || !(a instanceof W.HTMLAudioElement)) return;
        a.__trHooked = true;
        var started = {}, ended = {};
        a.addEventListener('playing', function () {
          try { var s = a.currentSrc || a.src || ''; if (!s || /^data:/.test(s) || started[s]) return; started[s] = 1; ev('play_start', '', mediaLabel(a)); } catch (e) {}
        });
        a.addEventListener('ended', function () {
          try { var s = a.currentSrc || a.src || ''; if (!s || /^data:/.test(s) || ended[s]) return; ended[s] = 1; ev('play_end', '', mediaLabel(a), (a.duration || 0) * 1000); } catch (e) {}
        });
      };
      var np = function () { try { hook(this); } catch (e) {} return origPlay.apply(this, arguments); };
      np.__tr = true; P.play = np;
    }
  } catch (e) {}

  /* ---------- 이탈 시 체류시간 (화면이 보인 시간, 페이지뷰당 1번) ---------- */
  var visMs = 0, visFrom = D.visibilityState === 'hidden' ? 0 : Date.now(), exitSent = false;
  function exit() {
    try {
      if (visFrom) { visMs += Date.now() - visFrom; visFrom = 0; }
      if (!exitSent) { exitSent = true; ev('page_exit', '', '', visMs); }
      send(true);
    } catch (e) {}
  }
  D.addEventListener('visibilitychange', function () {
    if (D.visibilityState === 'hidden') exit(); else if (!visFrom) visFrom = Date.now();
  });
  W.addEventListener('pagehide', exit);

  function ready() { try { tapPost(); watchSteps(); onScroll(); } catch (e) {} }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', ready); else ready();
})();
