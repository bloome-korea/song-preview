/* 블루메 송 스튜디오 — 단계별 노래 신청 (시안). 실제 전송 없음: 제출 시 payload를 alert로 보여줌. */
(function () {
  var CFG = window.CREATE_CFG, KEY = 'bloome_create_v1', TOTAL = 8;
  var $ = function (id) { return document.getElementById(id); };
  var DEF = { step: 1, rel: '', relCustom: '', recipient: '', noName: false, call: '', nickname: '', calltitle: '', occ: '', occCustom: '',
    genre: '', detail: '', vocal: '상관없음', traits: '', memories: '', keywords: '', message: '', method: 'phone', phone: '', email: '', name: '',
    consent: false, signup: false, marketing: false, from8: false };
  var S = Object.assign({}, DEF);
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  function save() { try { var c = Object.assign({}, S); localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} } // 비밀번호(pin)는 저장하지 않음
  var TITLE = { '엄마': '엄마', '아빠': '아빠', '아내': '여보', '남편': '여보', '할머니': '할머니', '할아버지': '할아버지', '선생님': '선생님', '여자친구': '자기', '남자친구': '자기', '약혼자': '자기' };

  /* ---------- chips ---------- */
  function chipGroup(box, items, key, onPick) {
    if (items) box.innerHTML = items.map(function (v) { return '<button type="button" class="chip' + (v === '직접 입력' ? ' ghost' : '') + '" role="radio" data-v="' + v + '">' + v + '</button>'; }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      S[key] = b.dataset.v; if (onPick) onPick(b.dataset.v); render(); save();
    });
  }
  function mark(box, val) { box.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.v === val)); }); }
  chipGroup($('relChips'), CFG.REL.concat(['직접 입력']), 'rel', function (v) { if (v === '직접 입력') focusSoon('relCustom'); });
  chipGroup($('occChips'), CFG.OCC.concat(['직접 입력']), 'occ', function (v) { if (v === '직접 입력') focusSoon('occCustom'); });
  chipGroup($('genChips'), Object.keys(CFG.GEN), 'genre', function () { S.detail = ''; });
  chipGroup($('detChips'), null, 'detail');
  chipGroup($('vocChips'), null, 'vocal');
  chipGroup($('methChips'), null, 'method');
  chipGroup($('callChips'), null, 'call', function (v) {
    if (v === 'title' && !S.calltitle && TITLE[S.rel]) S.calltitle = TITLE[S.rel];
    if (v === 'nick') focusSoon('nickname'); if (v === 'title') focusSoon('calltitle');
  });
  $('callChips').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b && b.getAttribute('aria-checked') === 'true' && S.call === b.dataset.v && e.detail > 1) {} });

  /* ---------- text fields ---------- */
  ['relCustom', 'recipient', 'nickname', 'calltitle', 'occCustom', 'traits', 'memories', 'keywords', 'message', 'phone', 'email', 'name'].forEach(function (id) {
    var el = $(id); el.value = S[id] || '';
    el.addEventListener('input', function () {
      if (id === 'phone') { var d = el.value.replace(/\D/g, '').slice(0, 11); el.value = d.length > 7 ? d.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3') : d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d; }
      S[id] = el.value; save(); render(true);
    });
  });
  ['pin', 'pin2'].forEach(function (id) { $(id).addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); render(true); }); });
  ['consent', 'signup', 'marketing'].forEach(function (id) { $(id).checked = !!S[id]; $(id).addEventListener('change', function () { S[id] = this.checked; save(); render(true); }); });
  $('noName').addEventListener('click', function () { S.noName = !S.noName; save(); render(); if (!S.noName) focusSoon('recipient'); });

  /* ---------- helpers ---------- */
  function josa(w) { var c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return ''; return (c - 0xAC00) % 28 ? '아' : '야'; }
  function esc(t) { return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function relV() { return S.rel === '직접 입력' ? S.relCustom.trim() : S.rel; }
  function occV() { return S.occ === '직접 입력' ? S.occCustom.trim() : S.occ; }
  function polite() { return S.call === 'title' || ['엄마', '아빠', '할머니', '할아버지', '선생님'].indexOf(S.rel) >= 0; }
  function self() { return S.rel === '나 자신'; }
  function moodV() { if (S.genre === '맡길게요') return '맡길게요'; return (S.genre + (S.detail && S.detail !== '맡길게요' ? ' · ' + S.detail : '')).slice(0, 40); }
  function callWord() {
    var n = S.noName ? '' : S.recipient.trim();
    if (S.call === 'nick' && S.nickname.trim()) return S.nickname.trim();
    if (S.call === 'title' && S.calltitle.trim()) return S.calltitle.trim();
    return n ? n + josa(n) : '';
  }
  function callDesc() {
    if (S.call === 'nick' && S.nickname.trim()) return '애칭: ' + S.nickname.trim();
    if (S.call === 'title' && S.calltitle.trim()) return '호칭: ' + S.calltitle.trim();
    if (S.noName) return '이름 넣지 않음';
    return '이름 그대로: ' + S.recipient.trim();
  }
  function phoneOk() { return /^01[016789]\d{7,8}$/.test(S.phone.replace(/\D/g, '')); }
  function emailOk() { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.email.trim()); }
  function why8() {
    if (S.method === 'phone' ? !phoneOk() : !emailOk()) return S.method === 'phone' ? '휴대폰 번호를 확인해 주세요.' : '이메일 주소를 확인해 주세요.';
    if (!S.name.trim()) return '신청자 이름을 적어 주세요.';
    if (!loggedIn && !/^\d{4}$/.test($('pin').value)) return '비밀번호 숫자 4자리를 정해 주세요.';
    if (!loggedIn && $('pin').value !== $('pin2').value) return '비밀번호 확인이 달라요.';
    if (!S.consent) return '개인정보 수집·이용에 동의해 주세요.';
    if (!loggedIn && !S.signup) return '간편 회원가입에 동의해 주세요.';
    return '';
  }
  function valid(n) {
    switch (n) {
      case 1: return !!relV();
      case 2: return (S.noName || !!S.recipient.trim()) && (S.call !== 'nick' || !!S.nickname.trim()) && (S.call !== 'title' || !!S.calltitle.trim());
      case 3: return !!occV();
      case 4: return !!S.genre;
      case 5: return S.traits.trim().length >= 5;
      case 6: return S.memories.trim().length >= 15;
      case 7: return true;
      case 8: return !why8();
    }
  }
  function firstInvalid() { for (var i = 1; i < TOTAL; i++) if (!valid(i)) return i; return TOTAL; }

  /* ---------- story / payload ---------- */
  function composeStory() {
    var out = [];
    function add(h, v) { v = (v || '').trim(); if (v) out.push('[' + h + ']\n' + v); }
    add('받는 분의 특별한 점', S.traits); add('함께한 기억', S.memories); add('꼭 넣고 싶은 단어·장소', S.keywords);
    add('전하고 싶은 말', S.message); add('노래에서 부르는 이름', callDesc());
    add('장르·세부 느낌', moodV() + ' / 보컬 ' + S.vocal);
    return out.join('\n\n').slice(0, 4000);
  }
  function utm() {
    var q = new URLSearchParams(location.search), o = [];
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { if (q.get(k)) o.push(k + '=' + q.get(k)); });
    if (document.referrer) o.push('ref=' + document.referrer); return o.join('&').slice(0, 600);
  }
  function payload() {
    var m = S.method === 'email' ? 'email' : 'phone';
    return {
      action: 'apply', relationship: relV().slice(0, 40), recipient: S.noName ? '' : S.recipient.trim().slice(0, 40), occasion: occV().slice(0, 150),
      story: composeStory(), mood: moodV(), vocalGender: S.vocal || '상관없음', name: S.name.trim().slice(0, 40), method: m,
      phone: m === 'phone' ? S.phone.trim() : '', email: m === 'email' ? S.email.trim() : '',
      pin: $('pin').value, pin2: $('pin2').value, signup: S.signup, consent: S.consent, marketing: S.marketing,
      website: $('website').value, utm: utm(), repeat: 0,
      /* 다음 백엔드 변경용 세부 항목 (지금 서버는 무시하고 story만 저장) */
      detail: { callStyle: S.call || 'name', nickname: S.call === 'nick' ? S.nickname.trim() : '', callTitle: S.call === 'title' ? S.calltitle.trim() : '',
        genre: S.genre, genreDetail: S.detail, traits: S.traits.trim(), memories: S.memories.trim(), keywords: S.keywords.trim(), message: S.message.trim(), form: 'create_v1' }
    };
  }

  /* ---------- summary ---------- */
  function summary() {
    var who = self() ? '나 자신' : relV();
    var nm = S.noName ? '이름 넣지 않음' : S.recipient.trim();
    var rows = [
      ['받는 분', who + ' · ' + nm + (S.call === 'nick' || S.call === 'title' ? '\n' + callDesc() : ''), 1],
      ['계기', occV(), 3],
      ['음악', moodV() + ' · 보컬 ' + S.vocal, 4],
      ['특별한 점', S.traits.trim(), 5],
      ['함께한 기억', S.memories.trim() + (S.keywords.trim() ? '\n넣을 단어: ' + S.keywords.trim() : ''), 6],
      ['전하고 싶은 말', S.message.trim(), 7]];
    $('sum').innerHTML = '<div class="hd"><b>신청 내용</b><span class="mono">ORDER SHEET</span></div>' + rows.map(function (r) {
      return '<div class="row"><dt>' + r[0] + '</dt><dd' + (r[1] ? '' : ' class="empty"') + '>' + esc(r[1] || '없음') + '</dd><button type="button" class="edit" data-go="' + r[2] + '">수정하기</button></div>';
    }).join('');
  }
  $('sum').addEventListener('click', function (e) { var b = e.target.closest('.edit'); if (b) { S.from8 = true; go(+b.dataset.go); } });

  /* ---------- render ---------- */
  var pw = $('pw'); pw.innerHTML = [.3,.5,.8,.6,.9,.7,.4,.6,1,.7,.5,.8,.6,.3,.5,.7,.9,.6,.4,.3].map(function (h) { return '<i style="height:' + (h * 22) + 'px"></i>'; }).join('');
  function render(soft) {
    mark($('relChips'), S.rel); $('relMore').hidden = S.rel !== '직접 입력';
    mark($('occChips'), S.occ); $('occMore').hidden = S.occ !== '직접 입력';
    mark($('callChips'), S.call); $('nickMore').hidden = S.call !== 'nick'; $('titleMore').hidden = S.call !== 'title';
    if ($('calltitle').value !== S.calltitle) $('calltitle').value = S.calltitle;
    mark($('genChips'), S.genre); mark($('vocChips'), S.vocal); mark($('methChips'), S.method);
    var det = CFG.GEN[S.genre] || [];
    $('detailBlock').hidden = !det.length; $('leaveNote').hidden = S.genre !== '맡길게요';
    if (!soft || $('detChips').dataset.g !== S.genre) { $('detChips').innerHTML = det.concat(det.length ? ['맡길게요'] : []).map(function (v) { return '<button type="button" class="chip" role="radio" data-v="' + v + '">' + v + '</button>'; }).join(''); $('detChips').dataset.g = S.genre; }
    mark($('detChips'), S.detail);
    $('phoneWrap').hidden = S.method !== 'phone'; $('emailWrap').hidden = S.method !== 'email';
    // 나 자신
    $('q2').textContent = self() ? '노래의 주인공, 내 이름을 알려 주세요.' : '받는 분의 이름을 알려 주세요.';
    $('qs2').textContent = self() ? '나에게 주는 노래예요. 가사에 이름이 들어가요.' : '노래 가사에 이름이 들어가요.';
    $('lblName').textContent = self() ? '내 이름' : '받는 분 이름';
    $('q5').textContent = self() ? '나의 특별한 점을 알려 주세요.' : '그분의 특별한 점을 알려 주세요.';
    $('recipient').disabled = S.noName; $('noName').textContent = S.noName ? '이름 넣기' : '이름은 넣지 않을래요';
    var w = callWord();
    $('sung').innerHTML = w ? '“<em>' + esc(w) + '</em>, ' + (self() ? '오늘도 수고했어' : (polite() ? '이 노래 들어 보실래요?' : '이 노래 들어 볼래?')) + '”' : '“<em>' + (self() ? '나' : '당신') + '</em>에게 부르는 노래”';
    $('sungNote').textContent = w ? '가사 흐름에 따라 표현은 조금 달라질 수 있어요.' : '이름 없이 ‘' + (self() ? '나' : '당신') + '’ 같은 말로 불러요.';
    var t5 = S.traits.trim().length, t6 = S.memories.trim().length;
    $('c5').textContent = t5 + ' / 최소 5자'; $('c5').className = t5 >= 5 ? 'ok' : '';
    $('c6').textContent = t6 + ' / 15자'; $('c6').className = t6 >= 15 ? 'ok' : '';
    $('c7').textContent = S.message.trim().length + '자';
    // nav
    var n = S.step, ok = valid(n);
    $('next').disabled = !ok;
    $('next').textContent = S.from8 && n < 8 ? '확인 화면으로' : (n === 7 && !S.message.trim() ? '건너뛰기' : '다음');
    $('stepNo').textContent = n; $('progBar').style.width = (n / TOTAL * 100) + '%';
    document.body.classList.toggle('s8', n === 8);
    if (n === 8) { summary(); var y = why8(); if (!sending) $('submit').disabled = !!y; if (y) { $('why').classList.remove('err'); $('why').textContent = y; } else if (!$('why').classList.contains('err')) $('why').textContent = ''; }
  }
  function show(n, back) {
    document.querySelectorAll('.step').forEach(function (s) { var on = +s.dataset.step === n; s.classList.toggle('on', on); s.classList.toggle('back-in', on && !!back); });
    window.scrollTo(0, 0);
  }
  function go(n, back, noPush) {
    n = Math.max(1, Math.min(TOTAL, n));
    if (n > firstInvalid()) n = firstInvalid();
    S.step = n; save(); show(n, back); render();
    if (!noPush) history.pushState({ step: n }, '', location.search + '#step-' + n);
  }
  $('next').addEventListener('click', function () { if (!valid(S.step)) return; if (S.from8) { S.from8 = false; go(8); } else go(S.step + 1); });
  $('prev').addEventListener('click', function () { if (S.step === 1) { location.href = 'index.html'; return; } S.from8 = false; go(S.step - 1, true); });
  $('back8').addEventListener('click', function () { go(7, true); });
  window.addEventListener('popstate', function (e) { var n = (e.state && e.state.step) || 1; go(n, n < S.step, true); });
  /* ---------- 제출: BLOOME(api.js)가 있으면 실제 신청, 없으면(시안) alert ---------- */
  var B = window.BLOOME, live = !!(B && B.C && B.C.APPS_SCRIPT_URL), sending = false;
  var qs = new URLSearchParams(location.search), repeat = qs.get('repeat') === '1', loggedIn = false;
  var DONE = window.CREATE_DONE_URL || '../done.html';
  function mask(u) { return u.indexOf('@') > 0 ? u.replace(/^(.{1,2}).*(@.*)$/, '$1***$2') : u.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-****-$3'); }
  function setLoggedIn(on) {
    var uid = live ? B.get('uid') : '';
    loggedIn = !!(on && live && B.get('s') && uid);
    $('pinField').hidden = loggedIn; $('signupRow').hidden = loggedIn;
    $('methChips').querySelectorAll('.chip').forEach(function (c) { c.disabled = loggedIn; });
    $('phone').readOnly = $('email').readOnly = loggedIn;
    var n = $('loginNote');
    if (loggedIn) {
      if (uid.indexOf('@') > 0) { S.method = 'email'; S.email = uid; $('email').value = uid; }
      else { S.method = 'phone'; S.phone = uid.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3'); $('phone').value = S.phone; }
      n.hidden = false; n.querySelector('b').textContent = mask(uid);
    } else n.hidden = true;
    render(true);
  }
  $('logout').addEventListener('click', function (e) {
    e.preventDefault(); var s = B.get('s'); if (s) B.post({ action: 'logout', s: s }).catch(function () {});
    B.set('s', ''); B.set('t', ''); B.set('uid', ''); S.phone = ''; S.email = ''; $('phone').value = ''; $('email').value = ''; save(); setLoggedIn(false);
  });
  if (repeat) $('repeatNote').hidden = false;
  function fail(code, field, text) {
    var map = { relationship: 1, recipient: 2, occasion: 3, story: 5 };
    var msg = text || (live ? B.msg(code) : code);
    if (map[field]) { go(map[field]); }
    $('why').textContent = msg; $('why').classList.add('err');
    var el = { phone: 'phone', email: 'email', pin: 'pin', pin2: 'pin2', name: 'name', consent: 'consent', signup: 'signup' }[field];
    if (el && $(el)) { try { $(el).focus(); } catch (x) {} }
    if (code === 'pin_mismatch' || code === 'locked') $('why').insertAdjacentHTML('beforeend', ' <a href="mailto:' + ((B && B.C.CONTACT_EMAIL) || 'bloome.korea@gmail.com') + '">비밀번호를 잊으셨나요? 문의하기</a>');
  }
  $('create').addEventListener('submit', function (e) {
    e.preventDefault(); if (sending || !valid(8)) return;
    var p = payload(); p.repeat = repeat ? 1 : 0;
    if (loggedIn) { p.s = B.get('s'); p.pin = ''; p.pin2 = ''; p.signup = true; }
    if (!live) { var shown = JSON.parse(JSON.stringify(p)); shown.pin = shown.pin2 = '****'; console.log('payload', p); alert('시안 화면이에요. 실제 신청은 되지 않아요.\n\n보낼 데이터:\n' + JSON.stringify(shown, null, 2)); return; }
    sending = true; var btn = $('submit'); btn.disabled = true; btn.textContent = '보내는 중…'; $('why').textContent = ''; $('why').classList.remove('err');
    B.post(p).then(function (r) {
      if (r && r.error === 'session') { B.set('s', ''); B.set('uid', ''); setLoggedIn(false); return fail('session', 'pin', '로그인이 끝났어요. 휴대폰 번호와 비밀번호 4자리를 넣고 다시 신청해 주세요.'); }
      if (!r || !r.ok) return fail((r && r.error) || 'server', r && r.field);
      B.set('s', r.s); B.set('t', ''); B.set('uid', p.method === 'email' ? p.email.toLowerCase() : p.phone.replace(/\D/g, ''));
      try { localStorage.removeItem(KEY); } catch (x) {}
      var url = DONE + '?m=' + encodeURIComponent(p.method);
      if (r.prepay) url += '&prepay=1';
      if (r.orderId) url += '&o=' + encodeURIComponent(r.orderId);
      location.href = url;
    }).catch(function () { fail('network'); })
      .finally(function () { sending = false; btn.textContent = '무료로 노래 만들기'; render(true); });
  });
  window.BLOOME_CREATE = { payload: payload, state: S };

  /* ---------- keyboard: 입력할 때 아래 버튼을 문서 흐름으로 내려 가리지 않게 ---------- */
  var vv = window.visualViewport;
  function kb() { if (!vv) return; document.body.classList.toggle('kb', window.innerHeight - vv.height > 150); }
  if (vv) vv.addEventListener('resize', kb);
  document.addEventListener('focusin', function (e) { if (/INPUT|TEXTAREA/.test(e.target.tagName)) setTimeout(function () { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {} }, 280); });
  function focusSoon(id) { setTimeout(function () { var el = $(id); if (el && !el.closest('[hidden]')) el.focus({ preventScroll: true }); }, 60); }

  /* sample players: see assets/wave.js */

  /* ---------- start ---------- */
  /* Arriving from a link (landing CTA etc.) always opens step 1; saved answers stay prefilled.
     Only a reload or back/forward navigation restores the step the user was on. */
  function navType() {
    try { var e = performance.getEntriesByType('navigation')[0]; if (e && e.type) return e.type; } catch (x) {}
    try { var t = performance.navigation.type; return t === 1 ? 'reload' : t === 2 ? 'back_forward' : 'navigate'; } catch (x) {}
    return 'navigate';
  }
  var restore = /^(reload|back_forward)$/.test(navType());
  var h = /#step-(\d)/.exec(location.hash), start = restore ? (h ? +h[1] : (S.step || 1)) : 1;
  start = Math.min(start, firstInvalid());
  S.step = start; history.replaceState({ step: start }, '', location.search + '#step-' + start); show(start); render(); setLoggedIn(true);
})();
