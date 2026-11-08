/* Bloome Song v14 — 신청 폼 → Apps Script */
(function () {
  var C = window.BLOOME_CONFIG || {};
  var form = document.getElementById('request-form');
  if (!form) return;
  var err = document.getElementById('form-error'), out = document.getElementById('form-result'), btn = document.getElementById('submit-btn');
  var MSG = {
    required: '빈칸을 채워 주세요.', phone: '휴대폰 번호를 다시 확인해 주세요. (예: 010-1234-5678)',
    email: '이메일 주소를 다시 확인해 주세요.', consent: '개인정보 수집·이용에 동의해 주세요.',
    story_short: '사연을 조금 더 적어 주세요.', too_long: '입력한 내용이 너무 길어요.',
    too_fast: '방금 신청하셨어요. 잠시 뒤에 다시 시도해 주세요.', too_many: '오늘 신청 가능 횟수를 넘었어요. 메일로 문의해 주세요.',
    closed: '지금은 신청을 잠시 받지 않고 있어요.', server: '잠시 문제가 생겼어요. 다시 시도해 주세요.',
    network: '연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.', not_ready: '신청 접수 준비 중이에요. ' + (C.CONTACT_EMAIL || '') + ' 로 문의해 주세요.'
  };
  function showErr(code, field) {
    err.hidden = false; err.textContent = MSG[code] || MSG.server;
    var el = field && form.elements[field]; if (el && el.focus) el.focus();
  }
  function utm() {
    var q = new URLSearchParams(location.search), o = [];
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { if (q.get(k)) o.push(k + '=' + q.get(k)); });
    if (document.referrer) o.push('ref=' + document.referrer);
    return o.join('&').slice(0, 600);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.hidden = true;
    var f = form.elements;
    var data = {
      relationship: f.relationship.value.trim(), recipient: f.recipient.value.trim(), occasion: f.occasion.value.trim(),
      story: f.story.value.trim(), mood: f.mood.value, name: f.name.value.trim(), phone: f.phone.value.trim(),
      email: f.email.value.trim(), website: f.website.value, consent: f.consent.checked, utm: utm()
    };
    var req = ['relationship', 'recipient', 'occasion', 'story', 'name', 'phone'];
    for (var i = 0; i < req.length; i++) if (!data[req[i]]) return showErr('required', req[i]);
    if (!/^01[016789]\d{7,8}$/.test(data.phone.replace(/\D/g, ''))) return showErr('phone', 'phone');
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return showErr('email', 'email');
    if (data.story.length < 5) return showErr('story_short', 'story');
    if (!data.consent) return showErr('consent', 'consent');
    if (!C.APPS_SCRIPT_URL) return showErr('not_ready');
    btn.disabled = true; btn.textContent = '보내는 중…';
    // text/plain 으로 보내면 CORS 사전 요청(preflight)이 생기지 않습니다.
    fetch(C.APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok) return showErr(r.error, r.field);
        form.hidden = true; out.hidden = false;
        out.innerHTML = '<b>신청이 접수됐어요. 고마워요!</b><span class="oid"></span>' +
          '<p>미리듣기는 ' + (C.PREVIEW_ETA || '') + ' 문자로 보내드려요.<br>접수번호를 꼭 남겨 두세요. 휴대폰 끝 4자리와 함께 진행 상황을 확인할 수 있어요.</p>' +
          '<a class="btn" id="status-link" href="#">내 노래 확인하기</a>';
        out.querySelector('.oid').textContent = r.orderId;
        out.querySelector('#status-link').href = 'status.html?order=' + encodeURIComponent(r.orderId);
        out.focus();
      })
      .catch(function () { showErr('network'); })
      .finally(function () { btn.disabled = false; btn.textContent = '무료로 만들어 보기'; });
  });
})();
