/* Bloome Song Studio (dark) — 고객 응대 채팅 위젯.
   고객센터 연결은 메일/inquiry API 대신 문자(sms:)로 보냅니다. 루트 chat.js 는 수정하지 않습니다.
   문의하기 = 오른쪽 중간의 동그란 말풍선 버튼 하나. */
(function () {
  var B = window.BLOOME; if (!B) return;
  var css = '' +
    '#bc-btn,button#bc-btn{position:fixed;right:16px;left:auto;bottom:auto;top:58%;z-index:40;display:flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;' +
      'width:60px!important;height:60px!important;min-width:0!important;max-width:60px!important;min-height:0!important;max-height:60px!important;padding:0!important;margin:0!important;' +
      'border:2px solid #fbf6ee;border-radius:50%!important;background:#c44b32;color:#fff;font-size:0;line-height:0;text-indent:0;letter-spacing:0;' +
      'box-shadow:0 6px 16px rgba(140,52,34,.38),0 1px 0 rgba(255,255,255,.25) inset;cursor:pointer;-webkit-tap-highlight-color:transparent;transform:translateY(-50%);animation:bc-bob 3.2s ease-in-out infinite;transition:background-color .2s,box-shadow .2s}' +
    '#bc-btn[hidden]{display:none!important}' +
    '#bc-btn:hover{background:#ad3f29;box-shadow:0 8px 20px rgba(140,52,34,.45)}' +
    '#bc-btn:focus-visible{outline:3px solid #8a6a4f;outline-offset:3px}' +
    '@keyframes bc-bob{0%,100%{transform:translateY(-50%)}50%{transform:translateY(calc(-50% - 7px))}}' +
    '@media (prefers-reduced-motion:reduce){#bc-btn{animation:none!important;transition:none}}' +
    '@media (max-width:600px){#bc-btn,button#bc-btn{right:12px;width:56px!important;height:56px!important;max-width:56px!important;max-height:56px!important}}' +
    '#bc-btn svg{display:block;width:28px;height:28px;flex:none;pointer-events:none}' +
    '#bc-panel{position:fixed;right:12px;bottom:12px;z-index:41;width:min(400px,calc(100vw - 24px));height:min(640px,calc(100vh - 24px));display:flex;flex-direction:column;background:#fff;border:1px solid #c9d0cb;border-radius:14px;box-shadow:0 12px 40px #0005;overflow:hidden;font-family:"Noto Serif KR",serif}' +
    '#bc-panel[hidden]{display:none}#bc-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#00704a;color:#fff}#bc-head b{font-size:18px}#bc-head button{background:none;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:0 4px;width:auto}' +
    '#bc-log{flex:1;overflow-y:auto;padding:14px;background:#f3f4f3}.bc-m{max-width:88%;margin:0 0 10px;padding:11px 14px;border-radius:12px;font-size:17px;line-height:1.65;white-space:pre-line;word-break:keep-all}.bc-bot{background:#fff;border:1px solid #d3d9d4;color:#303633}.bc-me{margin-left:auto;background:#645a54;color:#fff}.bc-m a{color:#00704a;font-weight:700}' +
    '.bc-chips{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px}.bc-chips button{width:auto;padding:8px 12px;border:1px solid #00704a;border-radius:20px;background:#fff;color:#00704a;font:16px "Noto Serif KR",serif;cursor:pointer}' +
    '#bc-foot{padding:10px;border-top:1px solid #d3d9d4;background:#fff}#bc-form{display:flex;gap:8px}#bc-form input{flex:1;margin:0;padding:11px;font-size:17px;border:1px solid #cbd3cd;border-radius:6px;min-width:0}#bc-form button{width:auto;padding:10px 14px;font-size:16px;border:0;border-radius:6px;background:#645a54;color:#fff;cursor:pointer}' +
    '#bc-kakao{display:block;margin-top:8px;padding:11px;border-radius:6px;background:#fee500;color:#191919;text-align:center;font:700 17px "Noto Serif KR",serif;text-decoration:none}' +
    '#bc-human{display:block;width:100%;margin-top:8px;padding:12px;border:0;border-radius:6px;background:#00704a;color:#fff;font:700 17px "Noto Serif KR",serif;cursor:pointer}' +
    '#bc-inq{padding:4px 2px}#bc-inq label{display:block;font-size:16px;margin:8px 0 0;color:#303633}#bc-inq input,#bc-inq textarea{display:block;width:100%;margin-top:5px;padding:11px;font:17px "Noto Serif KR",serif;border:1px solid #cbd3cd;border-radius:6px;box-sizing:border-box}' +
    '#bc-inq .bc-row{display:flex;gap:8px;margin-top:10px}#bc-inq .bc-row button{flex:1;padding:12px;border:0;border-radius:6px;font:16px "Noto Serif KR",serif;cursor:pointer}#bc-inq .send{background:#00704a;color:#fff;font-weight:700}#bc-inq .cancel{background:#e3e7e4;color:#303633}' +
    '.bc-err{color:#8a2020;font-size:16px;margin-top:6px}.bc-ans{margin-top:6px;padding:8px 10px;background:#eaf6ef;border-radius:8px}.bc-small{font-size:14px;color:#717a74}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  if (document.querySelector('.sticky')) document.body.classList.add('has-sticky');

  var ETA = (B.C.PREVIEW_ETA || '미리듣기는 1시간~24시간 안에 보내드려요');
  var FAQ = [
    { k: 'price', q: '가격·결제', kw: ['가격', '얼마', '결제', '비용', '금액', '입금', '계좌', '카드', '무료'],
      a: '노래 만들기와 1분 미리듣기는 무료예요.\n전체곡 금액은 미리듣기를 받은 뒤 ‘내 노래 찾기’와 결제 화면에서 정확히 보여 드려요. 처음 들어 보신 때부터 빨리 결제하실수록 저렴한 시간대별 가격이에요. 페이지를 닫았다 다시 열어도 처음 들어 보신 때부터 이어서 계산되고, 24시간이 지나면 그 노래의 듣기·결제 화면이 닫혀요. 두 곡이 준비된 경우에는 두 곡 다 받기(두 번째 곡 반값)도 고르실 수 있어요.\n결제는 카드·네이버페이 또는 계좌이체로 하실 수 있어요. ‘전체곡 받기’를 누르면 바로 고르실 수 있어요.' },
    { k: 'eta', q: '미리듣기는 언제 와요?', kw: ['언제', '시간', '얼마나', '기다', '미리듣기', '도착', '늦'],
      a: ETA + '.\n준비되면 신청하실 때 고른 방법(문자 또는 이메일)으로 바로 들을 수 있는 링크를 보내 드려요.' },
    { k: 'edit', q: '수정 요청', kw: ['수정', '바꾸', '변경', '다시', '다른 버전', '가사', '마음에 안'],
      a: '미리듣기를 들어 보시고 ‘이 노래 말고 다른 버전 받기’를 주문마다 한 번 무료로 요청할 수 있어요.\n가사나 분위기를 바꾸고 싶으시면 아래 ‘고객센터 연결’로 남겨 주세요. 확인 후 답변 드릴게요.' },
    { k: 'refund', q: '환불', kw: ['환불', '취소', '철회', '반품'],
      a: '환불·청약철회 기준은 안내 페이지로 정리하고 있어요.\n지금은 ‘고객센터 연결’로 주문과 사정을 남겨 주시면 담당자가 직접 확인해 답변 드려요.\n구매확정을 하신 주문은 환불이 어려워요.' },
    { k: 'review', q: '리뷰 이벤트', kw: ['리뷰', '후기', '아메리카노', '스벅', '스타벅스', '상품권', '구매확정', '확정'],
      a: '전체곡을 받으신 뒤 완료 화면이나 <a href="status.html">내 노래 찾기</a>에서 ‘리뷰 남기기’를 눌러 주세요.\n리뷰는 구매확정 후 남길 수 있어요. (구매확정 후에는 환불이 어려워요)\n리뷰를 남기신 모든 분께 스타벅스 아메리카노를 최대 두 잔까지 드리고, 베스트 리뷰로 뽑혀 홈페이지 등에 게시되면 스타벅스 3만원 상품권을 드려요.' },
    { k: 'privacy', q: '개인정보 삭제', kw: ['개인정보', '삭제', '탈퇴', '지워', '사연 삭제'],
      a: '사연·받는 분 정보·원곡 파일은 구매확정 이후에도 다시 받으실 수 있도록 잠시 보관한 뒤, 운영 확인 후 삭제해요. 구매하지 않은 신청은 30일 뒤 삭제해요.\n회원 정보 삭제(탈퇴)를 원하시면 ‘고객센터 연결’이나 bloome.korea@gmail.com 으로 요청해 주세요.\n자세한 내용: <a href="privacy.html">개인정보처리방침</a>' },
    { k: 'find', q: '내 노래 찾기', kw: ['찾기', '로그인', '비밀번호', '비번', '링크', '조회', '어디서', '확인'],
      a: '<a href="status.html">내 노래 찾기</a>에서 신청할 때 쓴 휴대폰 번호(또는 이메일)와 비밀번호 4자리를 넣으면 내 노래가 모두 보여요.\n문자로 받은 링크를 누르면 로그인 없이 바로 열려요.\n비밀번호를 잊으셨으면 ‘고객센터 연결’로 알려 주세요.' },
    { k: 'ai', q: 'AI로 만드나요?', kw: ['ai', '인공지능', '누가 만들', '사람이', '작곡'],
      a: '네, 블루메 송은 보내 주신 이야기를 바탕으로 AI 음악 도구를 활용해 노래를 만들어요.\n페이지의 일부 영상·이미지도 AI로 만든 것일 수 있어요.' }
  ];

  var btn = document.createElement('button');
  btn.id = 'bc-btn'; btn.type = 'button'; btn.setAttribute('aria-label', '문의하기'); btn.title = '문의하기';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.6 3.4 6.1L4.5 21l4.2-2.3c1 .2 2.1.3 3.3.3 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/><circle cx="8" cy="11" r="1.3" fill="#c44b32"/><circle cx="12" cy="11" r="1.3" fill="#c44b32"/><circle cx="16" cy="11" r="1.3" fill="#c44b32"/></svg>';
  var panel = document.createElement('div');
  panel.id = 'bc-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '블루메 송 고객 문의');
  panel.innerHTML = '<div id="bc-head"><b>블루메 송 도우미</b><button type="button" id="bc-close" aria-label="채팅 닫기">×</button></div>' +
    '<div id="bc-log" aria-live="polite"></div><div id="bc-foot"><form id="bc-form" autocomplete="off"><input id="bc-text" placeholder="궁금한 점을 적어 주세요" maxlength="200" aria-label="질문 입력"><button type="submit">보내기</button></form>' +
    '<button type="button" id="bc-human">고객센터 연결 (담당자에게 남기기)</button>' +
    (/^https:\/\/pf\.kakao\.com\//.test(B.C.KAKAO_CHAT_URL || '') ? '<a id="bc-kakao" href="' + B.C.KAKAO_CHAT_URL + '" target="_blank" rel="noopener">카카오톡으로 상담하기</a>' : '') + '</div>';
  document.body.appendChild(btn); document.body.appendChild(panel);
  var log = panel.querySelector('#bc-log'), started = false;

  function say(html, who) { var d = document.createElement('div'); d.className = 'bc-m ' + (who === 'me' ? 'bc-me' : 'bc-bot'); if (who === 'me') d.textContent = html; else d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function chips() {
    var w = document.createElement('div'); w.className = 'bc-chips';
    FAQ.forEach(function (f) { var b = document.createElement('button'); b.type = 'button'; b.textContent = f.q; b.onclick = function () { say(f.q, 'me'); say(f.a); }; w.appendChild(b); });
    log.appendChild(w); log.scrollTop = log.scrollHeight;
  }
  function answer(t) {
    var s = t.toLowerCase(), best = null, score = 0;
    FAQ.forEach(function (f) { var n = 0; f.kw.forEach(function (k) { if (s.indexOf(k) >= 0) n++; }); if (n > score) { score = n; best = f; } });
    if (best) say(best.a + '\n\n더 궁금하시면 ‘고객센터 연결’을 눌러 주세요.');
    else say('제가 바로 답하기 어려운 질문이에요. 아래 ‘고객센터 연결’을 누르시면 담당자에게 바로 전달돼요.');
  }
  function open(human) {
    panel.hidden = false; btn.hidden = true;
    if (!started) { started = true; say('안녕하세요, 블루메 송이에요. 궁금한 내용을 골라 주시거나 직접 적어 주세요.'); chips(); loadReplies(); }
    if (human === true) panel.querySelector('#bc-human').click();
    else setTimeout(function () { panel.querySelector('#bc-text').focus(); }, 50);
  }
  function close() { panel.hidden = true; btn.hidden = false; btn.focus(); }
  btn.onclick = function () { open(); }; panel.querySelector('#bc-close').onclick = close;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  panel.querySelector('#bc-form').onsubmit = function (e) { e.preventDefault(); var i = panel.querySelector('#bc-text'), t = i.value.trim(); if (!t) return; i.value = ''; say(t, 'me'); answer(t); };

  // 고객센터 연결: 문의 내용 + 회신 번호 → 문자 앱(sms:)만 연다. 메일·inquiry API 는 호출하지 않음.
  var SMS_TO = '01024527054', SMS_DISP = '010-2452-7054';
  function isIOS(ua) {
    ua = ua || navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    if (!arguments.length && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
    return false;
  }
  function isMobile(ua) {
    ua = ua || navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Mobile/i.test(ua)) return true;
    if (!arguments.length && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
    return false;
  }
  function fmtPhone(v) {
    var d = String(v || '').replace(/\D/g, '').slice(0, 11);
    return d.length > 7 ? d.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3') : d;
  }
  function savedPhone() {
    try {
      var uid = (B.get('uid') || ''), d = uid.replace(/\D/g, '');
      if (/^01[016789]\d{7,8}$/.test(d)) return fmtPhone(d);
      var c = JSON.parse(localStorage.getItem('bloome_create_v1') || '{}');
      if (c.phone) return c.phone;
    } catch (e) {}
    return '';
  }
  function savedName() {
    try { var c = JSON.parse(localStorage.getItem('bloome_create_v1') || '{}'); return c.name || ''; } catch (e) { return ''; }
  }
  function knownOrder() {
    var u = new URLSearchParams(location.search);
    var o = (u.get('o') || u.get('order') || u.get('paid') || '').trim();
    if (o) return o;
    var el = document.querySelector('[data-order]');
    return el ? (el.getAttribute('data-order') || '') : '';
  }
  function smsBody(msg, phone, name, path, order) {
    var parts = ['[블루메 송 스튜디오 문의] ' + msg, '회신번호: ' + phone];
    if (name) parts.push('이름: ' + name);
    var pg = path || '';
    if (order) pg += '(' + order + ')';
    parts.push('페이지: ' + pg);
    return parts.join(' / ');
  }
  function smsUrl(body, ua) {
    var enc = encodeURIComponent(body);
    var ios = (ua == null) ? isIOS() : isIOS(ua);
    return ios ? ('sms:' + SMS_TO + '&body=' + enc) : ('sms:' + SMS_TO + '?body=' + enc);
  }

  panel.querySelector('#bc-human').onclick = function () {
    if (panel.querySelector('#bc-inq')) return;
    var box = say('문의 내용과 회신 받을 번호를 적어 주세요.');
    var f = document.createElement('form'); f.id = 'bc-inq'; f.noValidate = true;
    f.innerHTML = '<label>문의 내용<textarea name="message" rows="3" maxlength="2000" required></textarea></label>' +
      '<label>회신 받을 전화번호<input name="phone" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="010-1234-5678" required></label>' +
      '<label>이름 <span class="bc-small">(선택)</span><input name="name" maxlength="40" autocomplete="name"></label>' +
      '<p class="bc-sms-note" hidden>휴대폰에서 이용해 주세요. 또는 ' + SMS_DISP + '로 문자 주세요.</p>' +
      '<div class="bc-err" hidden></div><div class="bc-row"><button type="button" class="cancel">취소</button><button type="submit" class="send">보내기</button></div>';
    var sp = savedPhone(); if (sp) f.phone.value = sp;
    var sn = savedName(); if (sn) f.name.value = sn;
    var note = f.querySelector('.bc-sms-note');
    if (!isMobile()) note.hidden = false;
    box.appendChild(f);
    var foot = panel.querySelector('#bc-foot');
    if (foot) foot.hidden = true;
    var hiddenEls = [].filter.call(log.children, function (el) { return el !== box; });
    hiddenEls.forEach(function (el) { el.hidden = true; });
    function restoreFoot() {
      if (foot) foot.hidden = false;
      hiddenEls.forEach(function (el) { el.hidden = false; });
    }
    try { box.scrollIntoView({block:'start', inline:'nearest'}); } catch (e) { log.scrollTop = 0; }
    f.message.focus();
    f.querySelector('.cancel').onclick = function () { box.remove(); restoreFoot(); };
    f.phone.addEventListener('input', function () {
      var d = f.phone.value.replace(/\D/g, '').slice(0, 11);
      f.phone.value = d.length > 7 ? d.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3') : d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d;
    });
    f.onsubmit = function (e) {
      e.preventDefault();
      var er = f.querySelector('.bc-err'); er.hidden = true;
      var msg = f.message.value.trim(), phone = fmtPhone(f.phone.value), name = f.name.value.trim();
      if (msg.length < 2) { er.hidden = false; er.textContent = '문의 내용을 적어 주세요.'; return; }
      if (!/^01[016789]\d{7,8}$/.test(phone.replace(/\D/g, ''))) { er.hidden = false; er.textContent = '회신 받을 전화번호를 다시 확인해 주세요.'; return; }
      if (!isMobile()) { note.hidden = false; er.hidden = false; er.textContent = '휴대폰에서 이용해 주세요. 또는 ' + SMS_DISP + '로 문자 주세요.'; return; }
      var body = smsBody(msg, phone, name, location.pathname || '', knownOrder());
      var url = smsUrl(body);
      window.__bloomeSmsUrl = url;
      window.__bloomeSmsBody = body;
      say(msg, 'me');
      box.remove(); restoreFoot();
      say('문자 앱이 열려요. 내용을 확인한 뒤 보내 주세요.');
      location.href = url;
    };
  };

  function loadReplies() { /* 다크 버전은 문자로 문의하므로 예전 메일 문의 목록은 불러오지 않아요. */ }
  window.BLOOME_CHAT = { open: open, smsUrl: smsUrl, smsBody: smsBody, SMS_TO: SMS_TO };
})();
