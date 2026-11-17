/* 블루메 송 (dark) — 무료 제작 + 후원 '내 노래 찾기' (status.html).
   1분 미리듣기·결제 없음: 완성된 노래는 전체곡 재생(다운로드 버튼 없음) → 좋아요(커피 후원) / 아쉬워요(다시 만들기).
   서버 액션(Apps Script, gas_free/FreeFlow.gs): orders(기존), listen(신규: 전체곡 재생용), free_event(신규: 반응 기록), remake(신규).
   ?demo=free 이면 서버에 아무 요청도 보내지 않고 샘플 데이터로만 보여 줌. */
(function () {
  var B = window.BLOOME, C = B.C, q = new URLSearchParams(location.search);
  var YT = 'https://www.youtube.com/@bloomesong';
  var DONATIONS = [
    { key: 'coffee', icon: '☕', label: '커피 한 잔', amount: 5000 },
    { key: 'cake', icon: '🍰', label: '커피 + 조각케이크', amount: 10000 },
    { key: 'voucher', icon: '🎁', label: '커피 상품권', amount: 30000 },
    { key: 'custom', icon: '✏️', label: '기타 (직접 입력)', amount: null }];
  // 후원 계좌: 기존 config.js 의 BANK_INFO 한 곳만 사용 (예: "은행 000-0000-0000 (예금주 홍길동)")
  var BANK = String(C.BANK_INFO || '').trim();
  var BANK_COPY = (function () { var m = BANK.match(/^(\S+)\s+([\d-]{6,})/); return m ? m[1] + ' ' + m[2] : BANK; })();

  /* ---------- demo (no network) ---------- */
  var DEMO = q.get('demo') === 'free';
  if (DEMO) {
    B.set('t', 'DEMOFREE'); B.set('s', '');
    B.post = function (p) {
      var a = p.action;
      if (a === 'orders') return Promise.resolve({ ok: true, viaToken: true, idLabel: '010-****-1234', orders: [
        { orderId: 'DEMO-0001', purpose: '결혼기념일', recipient: '여보', date: '2026-11-17', status: '미리듣기발송', hasPreview: true, videoType: 'image', youtubeUrl: YT, title: '옥탑방 로미오와 줄리엣' }] });
      if (a === 'listen') return Promise.resolve({ ok: true, url: 'assets/hero_60s.mp3' });
      return Promise.resolve({ ok: true, demo: true });
    };
  }

  function $(i) { return document.getElementById(i); }
  function add(p, tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; p.appendChild(e); return e; }
  function won(n) { return B.won(n); }
  function track(o, type, data) {
    var body = Object.assign({ action: 'free_event', order: o ? o.orderId : '', type: type }, data || {}, B.auth() || {});
    try { (window.dataLayer = window.dataLayer || []).push(body); } catch (e) {}
    B.post(body).catch(function () {});
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
      (o.hasSong2 ? [1, 2] : [1]).forEach(function (n) { player(a, o, n); });
      if (o.youtubeUrl) { var yt = add(a, 'a', null, 'btn ghost yt-btn'); yt.href = o.youtubeUrl; yt.target = '_blank'; yt.rel = 'noopener'; yt.innerHTML = '<i class="yti"></i>유튜브에서 음악영상 보기'; }
      react(a, o);
    }
    add(a, 'p', '접수번호(참고용) ' + o.orderId, 'ref');
    return a;
  }
  function fmt(t) { t = t || 0; return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }
  function player(a, o, n) {
    var w = add(a, 'div', null, 'fplayer');
    if (o.hasSong2) add(w, 'h3', n + '번 곡');
    var row = add(w, 'div', null, 'fp-row');
    var b = add(row, 'button', null, 'fp-btn'); b.type = 'button'; b.setAttribute('aria-label', '전체곡 재생');
    b.innerHTML = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg><svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
    var meta = add(row, 'div', null, 'fp-meta'); add(meta, 'b', o.title || (o.hasSong2 ? n + '번 곡' : '전체곡')); var tm = add(meta, 'span', '전체곡 · 눌러서 듣기', 'fp-time');
    var bar = add(w, 'div', null, 'fp-bar'); var fill = add(bar, 'i');
    var msg = add(w, 'p', '', 'small fp-msg');
    // 다운로드 버튼 없음. controlslist 로 기본 메뉴의 다운로드도 숨김
    var au = document.createElement('audio'); au.preload = 'none'; au.setAttribute('playsinline', ''); au.setAttribute('controlslist', 'nodownload noplaybackrate'); w.appendChild(au);
    var loading = false, endedOnce = false;
    function sync() { b.classList.toggle('on', !au.paused); b.setAttribute('aria-label', au.paused ? '전체곡 재생' : '일시정지'); }
    ['play', 'pause', 'ended'].forEach(function (ev) { au.addEventListener(ev, sync); });
    au.addEventListener('timeupdate', function () { var d = au.duration || 0; fill.style.width = (d ? au.currentTime / d * 100 : 0) + '%'; tm.textContent = fmt(au.currentTime) + ' / ' + fmt(d); });
    au.addEventListener('ended', function () { if (endedOnce) return; endedOnce = true; track(o, 'listened', { song: n }); var r = a.querySelector('.react'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    bar.addEventListener('click', function (e) { if (!au.duration) return; var rc = bar.getBoundingClientRect(); au.currentTime = (e.clientX - rc.left) / rc.width * au.duration; });
    b.onclick = function () {
      if (au.src) { if (au.paused) au.play().catch(function () {}); else au.pause(); return; }
      if (loading) return; loading = true; b.disabled = true; tm.textContent = '불러오는 중…';
      B.post(Object.assign({ action: 'listen', order: o.orderId, song: n }, B.auth())).then(function (r) {
        if (!r.ok) { msg.textContent = B.msg(r.error); tm.textContent = '전체곡 · 눌러서 듣기'; return; }
        au.src = r.url || URL.createObjectURL(B.b64blob(r.b64, r.mime)); au.play().catch(function () { msg.textContent = '재생 버튼을 한 번 더 눌러 주세요.'; });
      }).catch(function () { msg.textContent = B.msg('network'); }).finally(function () { loading = false; b.disabled = false; });
    };
  }
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
    add(g, 'p', 'THANK YOU', 'mono-k');
    var lead = add(g, 'p', null, 'give-lead'); lead.innerHTML = '노래를 만드는 데 시간과 돈이 들어가요.<br>제작자에게 커피 한 잔 선물해 주세요~';
    var grid = add(g, 'div', null, 'dons'), custom = add(g, 'div', null, 'custom'); custom.hidden = true;
    custom.innerHTML = '<input type="text" inputmode="numeric" placeholder="금액 입력" aria-label="후원 금액"><span>원</span><button type="button" class="btn">확인</button>';
    var acct = add(g, 'div', null, 'acct'); acct.hidden = true;
    acct.innerHTML = '<p class="acct-amt"><span class="l"></span> · <b class="v"></b></p><p class="acct-num"></p><button type="button" class="btn green acct-copy">계좌 복사하기</button>' +
      '<p class="small">후원은 자유예요. 후원하지 않으셔도 노래는 그대로 간직하실 수 있어요.</p>';
    acct.querySelector('.acct-num').textContent = BANK || '계좌 정보를 준비하고 있어요.';
    var cur = null;
    function pick(label, amt) { cur = { label: label, amount: amt }; acct.querySelector('.l').textContent = label; acct.querySelector('.v').textContent = won(amt); acct.hidden = false;
      track(o, 'donate_pick', cur); setTimeout(function () { acct.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); }
    DONATIONS.forEach(function (d) {
      var b = add(grid, 'button', null, 'don'); b.type = 'button'; b.innerHTML = '<span class="e">' + d.icon + '</span><span class="t"></span><b>' + (d.amount ? won(d.amount) : '&nbsp;') + '</b>'; b.querySelector('.t').textContent = d.label;
      b.onclick = function () { [].forEach.call(grid.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (d.amount) { custom.hidden = true; pick(d.label, d.amount); } else { custom.hidden = false; acct.hidden = true; custom.querySelector('input').focus(); } };
    });
    var ci = custom.querySelector('input');
    ci.addEventListener('input', function () { var v = this.value.replace(/\D/g, '').slice(0, 8); this.value = v ? Number(v).toLocaleString('ko-KR') : ''; });
    custom.querySelector('button').onclick = function () { var v = Number(ci.value.replace(/\D/g, '')); if (!v || v < 1000) { toast('1,000원 이상으로 적어 주세요'); return; } pick('직접 입력', v); };
    acct.querySelector('.acct-copy').onclick = function () {
      copyText(BANK_COPY).then(function () { toast('계좌번호가 복사됐어요 ☕'); }, function () { toast('복사가 안 됐어요. 길게 눌러 복사해 주세요'); });
      track(o, 'donate_copy', cur || {});
    };
    return g;
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
