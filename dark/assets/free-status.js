/* 블루메 송 (dark) — 무료 제작 + 후원 '내 노래 찾기' (status.html).
   1분 미리듣기·결제 없음: 완성된 노래는 전체곡 재생(다운로드 버튼 없음) → 좋아요(커피 후원) / 아쉬워요(다시 만들기).
   서버 액션(Apps Script, gas_free/FreeFlow.gs): orders(기존), listen(신규: 전체곡 재생용), free_event(신규: 반응 기록), remake(신규).
   ?demo=free 이면 서버에 아무 요청도 보내지 않고 샘플 데이터로만 보여 줌.
   stage3 (2026-11-17): 페이지가 열리면 곡을 미리 받아 자동 재생 시도 · 막히면 재생 버튼 한 번으로 재생(로딩 중 탭도 기억),
   후원 블록은 assets/donate.js 공용(예금주 표시 안 함), 맨 아래 유튜브 업로드 동의(좋아요/싫어요 2단계, 주문별 localStorage). */
(function () {
  var B = window.BLOOME, C = B.C, q = new URLSearchParams(location.search);
  var YT = 'https://www.youtube.com/@bloomesong';
  var DON = window.BLOOME_DONATE;

  /* ---------- demo (no network) ---------- */
  var DEMO = q.get('demo') === 'free';
  if (DEMO) {
    B.set('t', 'DEMOFREE'); B.set('s', '');
    B.post = function (p) {
      var a = p.action;
      if (a === 'orders') return Promise.resolve({ ok: true, viaToken: true, idLabel: '010-****-1234', orders: [
        { orderId: 'DEMO-0001', purpose: '결혼기념일', recipient: '여보', date: '2026-11-17', status: '미리듣기발송', hasPreview: true, videoType: 'image', youtubeUrl: YT, title: '옥탑방 로미오와 줄리엣' }] });
      if (a === 'listen') return new Promise(function (res) { setTimeout(function () { res({ ok: true, url: 'assets/hero_60s.mp3' }); }, Number(q.get('delay') || 1800)); });
      return Promise.resolve({ ok: true, demo: true });
    };
  }

  function $(i) { return document.getElementById(i); }
  function add(p, tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; p.appendChild(e); return e; }
  function won(n) { return B.won(n); }
  function track(o, type, data) {
    var body = Object.assign({ action: 'free_event', order: o ? o.orderId : '', type: type }, data || {}, B.auth() || {});
    try { (window.dataLayer = window.dataLayer || []).push(body); } catch (e) {}
    return B.post(body).then(function (r) {
      // Apps Script v18 의 free_event 는 정해진 type 만 받음(bad_type). 유튜브 업로드 동의(yt_ok/yt_no1/yt_no)는
      // 서버가 아직 모르면 기존 type 'listened' 에 후원항목(label)='yt_ok' 등으로 남겨 '반응' 시트에서 구분 (Apps Script 수정 없이)
      if (r && !r.ok && r.error === 'bad_type' && /^yt_/.test(type) && !DEMO)
        return B.post(Object.assign({}, body, { type: 'listened', label: type }));
      return r;
    }).catch(function () {});
  }
  function toast(msg) { var t = $('free-toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); }, 2200); }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } document.body.removeChild(ta); });
  }
  function stopBoot() { document.documentElement.classList.remove('token-boot'); var bl = $('boot-loading'); if (bl) { bl.setAttribute('aria-busy', 'false'); bl.style.display = 'none'; } }

  /* ---------- login / load (기존 흐름 그대로) ---------- */
  var lf = $('login-form'), le = $('login-error'), lb = $('login-btn'), loginIntent = false;
  if (q.get('t') && !DEMO) { B.set('t', q.get('t').replace(/[^A-Za-z0-9]/g, '')); B.set('s', ''); }
  lf.addEventListener('keydown', function (e) { if (e.key === 'Enter') loginIntent = true; });
  lb.addEventListener('click', function () { loginIntent = true; });
  function showLogin(code) { stopBoot(); $('login-box').hidden = false; $('login-box').style.display = ''; $('my').hidden = true; $('free-deliver').hidden = true;
    if (code) { le.hidden = false; le.textContent = B.msg(code); } else { le.hidden = true; le.textContent = ''; } }
  function load() {
    var a = B.auth(); if (!a) return showLogin();
    B.post(Object.assign({ action: 'orders' }, a)).then(function (r) {
      if (!r.ok && r.error === 'token_expired') { B.set('s', ''); B.set('t', ''); showLogin(); le.hidden = false; le.textContent = '문자 링크는 30일 동안만 열려요. 신청할 때 쓴 휴대폰 번호(또는 이메일)와 비밀번호 4자리로 열어 주세요.'; return; }
      if (!r.ok) { B.set('s', ''); B.set('t', ''); return showLogin(r.error); }
      render(r);
    }).catch(function () { showLogin('network'); });
  }
  lf.addEventListener('submit', function (e) {
    e.preventDefault(); if (!loginIntent) return; loginIntent = false; le.hidden = true;
    var id = lf.id.value.trim(), pin = lf.pin.value.replace(/\D/g, '');
    if (!id || pin.length !== 4) { le.hidden = false; le.textContent = B.msg('bad_login'); return; }
    lb.disabled = true; lb.textContent = '찾는 중…';
    B.post({ action: 'login', id: id, pin: pin }).then(function (r) {
      if (!r.ok) { le.hidden = false; le.textContent = B.msg(r.error) + (r.left ? ' (남은 시도 ' + r.left + '번)' : ''); return; }
      B.set('s', r.s); B.set('t', ''); B.set('uid', r.uid || ''); lf.pin.value = ''; render(r);
    }).catch(function () { le.hidden = false; le.textContent = B.msg('network'); }).finally(function () { lb.disabled = false; lb.textContent = '내 노래 찾기'; });
  });
  $('logout-btn').onclick = function () { var a = B.auth(); if (a && a.s) B.post({ action: 'logout', s: a.s }).catch(function () {}); B.set('s', ''); B.set('t', ''); B.set('uid', ''); showLogin(); if (q.get('t')) history.replaceState(null, '', 'status.html'); };

  /* ---------- render ---------- */
  var STEPS = ['신청 접수', '만드는 중', '노래 완성'];
  function stepOf(o) { if (o.status === '제작중') return 1; if (['접수', '선결제대기'].indexOf(o.status) >= 0 && !o.hasPreview) return 0; return 2; }
  function ready(o) { return !!(o.hasPreview || o.canListen) && o.status !== '정리완료'; }
  function render(r) {
    stopBoot(); $('login-box').hidden = true; $('my').hidden = false; if (r.uid) B.set('uid', r.uid);
    $('who-label').textContent = r.viaToken ? ((r.idLabel ? r.idLabel + ' · ' : '') + '문자 링크로 연 노래') : (r.idLabel + ' 님의 노래');
    var box = $('orders'); box.innerHTML = '';
    if (!r.orders || !r.orders.length) { box.innerHTML = '<div class="box"><p>아직 신청한 노래가 없어요.</p><a class="btn green" href="create.html">무료로 만들어 보기</a></div>'; $('free-deliver').hidden = false; return; }
    r.orders.forEach(function (o) { box.appendChild(card(o)); });
    $('free-deliver').hidden = false;
    var first = r.orders.filter(ready)[0]; ytAsk(first || null);
    if (players.length) players[0].auto();   // 페이지가 열리고 주문이 확인되면 첫 곡 바로 불러와 자동 재생 시도
  }
  function card(o) {
    var a = document.createElement('article'); a.className = 'order'; a.dataset.order = o.orderId;
    var top = add(a, 'div', null, 'o-top'); add(top, 'b', (o.purpose || '내 노래') + (o.recipient ? ' · ' + o.recipient + ' 님' : '')); add(top, 'span', o.date || '');
    var i = stepOf(o), ol = add(a, 'ol', null, 'steps mini');
    STEPS.forEach(function (s, k) { add(ol, 'li', s, k < i ? 'done' : (k === i ? 'now' : '')); });
    if (o.status === '정리완료') { add(a, 'p', '개인정보 보호를 위해 이야기와 노래 파일은 정리했어요.'); }
    else if (!ready(o)) { add(a, 'p', '노래는 보통 1시간에서 하루 안에 완성돼요. 준비되면 문자(또는 이메일)로 알려 드릴게요.'); }
    else {
      add(a, 'h2', '나만의 노래가 완성됐어요', 'done-title');
      add(a, 'p', '이 노래가 당신과 주변 사람들에게 힘이 되면 좋겠어요!', 'done-sub');
      (o.hasSong2 ? [1, 2] : [1]).forEach(function (n) { player(a, o, n); });
      if (o.youtubeUrl) { var yt = add(a, 'a', null, 'btn ghost yt-btn'); yt.href = o.youtubeUrl; yt.target = '_blank'; yt.rel = 'noopener'; yt.innerHTML = '<i class="yti"></i>유튜브에서 음악영상 보기'; }
      react(a, o);
    }
    add(a, 'p', '접수번호(참고용) ' + o.orderId, 'ref');
    return a;
  }
  function fmt(t) { t = t || 0; return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }
  // 아주 짧은 무음 WAV: 첫 탭(사용자 제스처) 안에서 audio.play() 를 불러 iOS Safari 에서 이 오디오 요소를 '허용' 상태로 만들 때 사용
  var SILENT = (function () { var n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
    function w(o, str) { for (var i = 0; i < str.length; i++) b[o + i] = str.charCodeAt(i); }
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
    for (var i = 0; i < n; i++) b[44 + i] = 128;
    var s = ''; for (var j = 0; j < b.length; j++) s += String.fromCharCode(b[j]); return 'data:audio/wav;base64,' + btoa(s); })();
  var players = [];
  function player(a, o, n) {
    var w = add(a, 'div', null, 'fplayer');
    if (o.hasSong2) add(w, 'h3', n + '번 곡');
    var row = add(w, 'div', null, 'fp-row');
    var b = add(row, 'button', null, 'fp-btn'); b.type = 'button'; b.setAttribute('aria-label', '전체곡 재생');
    b.innerHTML = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg><svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg><i class="fp-spin" aria-hidden="true"></i>';
    var meta = add(row, 'div', null, 'fp-meta'); add(meta, 'b', o.title || (o.hasSong2 ? n + '번 곡' : '전체곡')); var tm = add(meta, 'span', '전체곡 · 눌러서 듣기', 'fp-time');
    var bar = add(w, 'div', null, 'fp-bar'); var fill = add(bar, 'i');
    var msg = add(w, 'p', '', 'small fp-msg');
    // 다운로드 버튼 없음. 오디오 요소는 처음부터 만들어 두고(같은 요소를 계속 씀) controlslist 로 기본 메뉴의 다운로드도 숨김
    var au = document.createElement('audio'); au.preload = 'auto'; au.setAttribute('playsinline', ''); au.setAttribute('webkit-playsinline', ''); au.setAttribute('controlslist', 'nodownload noplaybackrate'); w.appendChild(au);
    var st = { loaded: false, loading: null, want: false, userPaused: false, blocked: false }, endedOnce = false;
    function real() { return st.loaded && au.src && au.src.indexOf('data:audio/wav') !== 0; }
    function sync() { var on = real() && !au.paused; b.classList.toggle('on', on); b.setAttribute('aria-label', on ? '일시정지' : '전체곡 재생'); }
    function busy(v) { b.classList.toggle('busy', v); w.classList.toggle('loading', v); if (v) tm.textContent = '노래 불러오는 중…'; }
    ['play', 'pause', 'ended', 'playing'].forEach(function (ev) { au.addEventListener(ev, sync); });
    au.addEventListener('playing', function () { if (real()) { st.blocked = false; w.classList.remove('blocked'); msg.textContent = ''; players.forEach(function (p) { if (p.au !== au) p.au.pause(); }); } });
    au.addEventListener('timeupdate', function () { if (!real()) return; var d = au.duration || 0; fill.style.width = (d ? au.currentTime / d * 100 : 0) + '%'; tm.textContent = fmt(au.currentTime) + ' / ' + fmt(d); });
    au.addEventListener('ended', function () { if (!real() || endedOnce) return; endedOnce = true; track(o, 'listened', { song: n }); var r = a.querySelector('.react'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    bar.addEventListener('click', function (e) { if (!real() || !au.duration) return; var rc = bar.getBoundingClientRect(); au.currentTime = (e.clientX - rc.left) / rc.width * au.duration; });
    function tryPlay(fromUser) {
      var p = au.play();
      if (p && p.catch) p.catch(function (e) {
        if (e && e.name === 'AbortError') return;
        st.blocked = true; w.classList.add('blocked'); sync();
        tm.textContent = '▶ 재생 버튼을 누르면 바로 들려요';
        if (fromUser) msg.textContent = '재생이 안 되면 휴대폰의 무음 모드를 확인해 주세요.';
      });
    }
    function load() {
      if (st.loading) return st.loading;
      busy(true); msg.textContent = '';
      st.loading = B.post(Object.assign({ action: 'listen', order: o.orderId, song: n }, B.auth())).then(function (r) {
        busy(false);
        if (!r.ok) { st.loading = null; msg.textContent = B.msg(r.error); tm.textContent = '전체곡 · 눌러서 듣기'; return; }
        var wasUnlocked = !!au.src;
        au.src = r.url || URL.createObjectURL(B.b64blob(r.b64, r.mime)); st.loaded = true;
        tm.textContent = '0:00 / ' + (o.duration ? fmt(o.duration) : '…');
        if (st.want && !st.userPaused) tryPlay(wasUnlocked);   // 로딩 중에 누른 탭(또는 자동 재생 요청)을 기억했다가 바로 재생
      }).catch(function () { busy(false); st.loading = null; msg.textContent = B.msg('network'); tm.textContent = '전체곡 · 눌러서 듣기'; });
      return st.loading;
    }
    b.onclick = function () {
      if (real()) { if (au.paused) { st.userPaused = false; st.want = true; tryPlay(true); } else { st.userPaused = true; au.pause(); } return; }
      // 아직 로딩 중(또는 시작 전): 이 탭 안에서 무음을 재생해 요소를 허용 상태로 만들고, 로드가 끝나면 곧바로 재생
      st.want = true; st.userPaused = false;
      if (!au.src) { au.src = SILENT; var p = au.play(); if (p && p.catch) p.catch(function () {}); }
      tm.textContent = '노래 불러오는 중… 곧 재생돼요';
      load();
    };
    var api = { au: au, auto: function () { st.want = true; load(); }, unlock: function () { if (!real() || !au.paused || st.userPaused || !st.blocked) return false; tryPlay(true); return true; } };
    players.push(api);
    return api;
  }
  // 자동 재생이 막힌 경우: 화면의 첫 터치(재생 버튼·링크·입력 제외)에서도 첫 곡을 재생
  function firstGesture(e) {
    if (e.target.closest && e.target.closest('.fp-btn, a, input, textarea, select, .fmodal, #bc-btn, #bc-panel, #logout-btn')) return;
    if (players[0] && players[0].unlock()) { document.removeEventListener('pointerup', firstGesture, true); }
  }
  document.addEventListener('pointerup', firstGesture, true);
  function react(a, o) {
    var r = add(a, 'div', null, 'react');
    add(r, 'p', '노래, 어떠셨나요?', 'react-q');
    var row = add(r, 'div', null, 'react-btns');
    var like = add(row, 'button', null, 'rb like'); like.type = 'button'; like.innerHTML = '<span aria-hidden="true">♥</span> 좋아요'; like.setAttribute('aria-pressed', 'false');
    var dis = add(row, 'button', null, 'rb dis'); dis.type = 'button'; dis.innerHTML = '<span aria-hidden="true">✕</span> 아쉬워요'; dis.setAttribute('aria-pressed', 'false');
    var give = donate(a, o); give.hidden = true;
    like.onclick = function () { like.setAttribute('aria-pressed', 'true'); dis.setAttribute('aria-pressed', 'false'); give.hidden = false; track(o, 'like');
      setTimeout(function () { give.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); };
    dis.onclick = function () { dis.setAttribute('aria-pressed', 'true'); like.setAttribute('aria-pressed', 'false'); give.hidden = true; track(o, 'dislike'); openSorry(o); };
  }
  function donate(a, o) {
    var g = add(a, 'div', null, 'give');
    DON.build(g, { kicker: 'THANK YOU', lead: '노래가 마음에 드셨다면 작은 후원 부탁해요<br>많은 사람들에게 노래를 선물할 힘이 생길 것 같아요!',
      onPick: function (cur) { track(o, 'donate_pick', cur); },
      onCopy: function (cur) { track(o, 'donate_copy', cur); },
      onCopied: function (t) { toast(t); } });
    return g;
  }
  /* ---------- 맨 아래: 유튜브 업로드 동의 (좋아요 → 감사 / 싫어요 → 안내 후 한 번 더) ---------- */
  var YT_TEXT = {
    ok: '감사합니다. 완료 문자를 기다려 주세요',
    no1: '업로드를 하지 않으면 용량 문제로 노래는 곧 삭제돼요.\n개인정보는 노출되지 않으니 걱정 마세요.',
    no: '네, 알겠습니다. 노래는 한 달 안에 삭제됩니다. 감사합니다.' };
  function ytKey(o) { return 'bloome_yt_' + o.orderId; }
  function ytGet(o) { try { return localStorage.getItem(ytKey(o)) || ''; } catch (e) { return ''; } }
  function ytSet(o, v) { try { localStorage.setItem(ytKey(o), v); } catch (e) {} }
  function ytAsk(o) {
    var box = $('yt-ask'); if (!box) return;
    if (!o) { box.hidden = true; return; }
    box.hidden = false;
    function show(state) {
      var q = $('yt-q'), ans = $('yt-ans'), btns = $('yt-btns');
      box.dataset.state = state || 'ask';
      q.hidden = state === 'ok' || state === 'no';
      q.textContent = '유튜브 영상편지로 올려 드릴까요?';
      ans.hidden = !state; ans.textContent = state ? YT_TEXT[state] : '';
      btns.hidden = state === 'ok' || state === 'no';
      $('yt-redo').hidden = !(state === 'ok' || state === 'no');
    }
    function choose(yes) {
      var cur = ytGet(o), next = yes ? 'ok' : (cur === 'no1' ? 'no' : 'no1');
      ytSet(o, next); show(next);
      track(o, 'yt_' + next);
    }
    $('yt-yes').onclick = function () { choose(true); };
    $('yt-no').onclick = function () { choose(false); };
    $('yt-redo').onclick = function () { ytSet(o, ''); show(''); };
    show(ytGet(o));
  }
  /* ---------- 아쉬워요 팝업 ---------- */
  var sorryOrder = null;
  function openSorry(o) { sorryOrder = o; $('fm-sorry').hidden = false; }
  function closeAll() { ['fm-sorry', 'fm-remake', 'fm-done'].forEach(function (id) { $(id).hidden = true; }); }
  $('fm-again').onclick = function () { $('fm-sorry').hidden = true; $('fm-remake').hidden = false; $('fm-text').focus(); };
  $('fm-nope').onclick = function () { closeAll(); track(sorryOrder, 'remake_decline'); toast('들어 주셔서 고마워요'); };
  $('fm-tags').onclick = function (e) { var b = e.target.closest('.chip'); if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); };
  $('fm-cancel').onclick = closeAll;
  $('fm-send').onclick = function () {
    var tags = [].map.call(document.querySelectorAll('#fm-tags [aria-pressed=true]'), function (x) { return x.textContent; }), text = $('fm-text').value.trim();
    if (!tags.length && !text) { toast('바꾸고 싶은 점을 골라 주세요'); return; }
    var btn = this; btn.disabled = true;
    var body = Object.assign({ action: 'remake', order: sorryOrder.orderId, tags: tags.join(','), text: text.slice(0, 500) }, B.auth());
    B.post(body).then(function (r) {
      // 서버에 remake 가 아직 없으면 기존 '다른 버전 받기(alt_version)'로 접수
      if (!r.ok && r.error === 'bad_action') return B.post(Object.assign({ action: 'alt_version', order: sorryOrder.orderId }, B.auth()));
      return r;
    }).then(function (r) {
      closeAll(); $('fm-done-t').textContent = r && r.ok ? '다시 만들기 요청을 받았어요. 새 노래가 완성되면 다시 보내 드릴게요.' : B.msg(r && r.error); $('fm-done').hidden = false;
    }).catch(function () { toast(B.msg('network')); }).finally(function () { btn.disabled = false; });
  };
  $('fm-ok').onclick = closeAll;
  document.querySelectorAll('.fmodal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) closeAll(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  load();
})();
