/* Bloome Song v16 — 신청 폼(간편 회원가입 포함) → Apps Script */
(function () {
  var B = window.BLOOME, C = B.C;
  var form = document.getElementById('request-form');
  if (!form) return;
  var err = document.getElementById('form-error'), out = document.getElementById('form-result'), btn = document.getElementById('submit-btn');
  var f = form.elements, q = new URLSearchParams(location.search);
  var repeat = q.get('repeat') === '1';
  // 한 곡 더 만들기: 아이디는 URL 이 아니라 이 탭의 sessionStorage 에서만 가져옴
  if (repeat) {
    document.getElementById('repeat-banner').hidden = false;
    var pre = B.get('uid');
    if (pre) {
      if (pre.indexOf('@') > 0) { f.method.value = 'email'; f.email.value = pre; }
      else { f.method.value = 'phone'; f.phone.value = pre.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3'); }
    }
  }
  function syncMethod() {
    var email = f.method.value === 'email';
    document.getElementById('phone-wrap').hidden = email; document.getElementById('email-wrap').hidden = !email;
    f.phone.required = !email; f.email.required = email;
  }
  Array.prototype.forEach.call(form.querySelectorAll('input[name=method]'), function (r) { r.addEventListener('change', syncMethod); });
  syncMethod();
  ['pin', 'pin2'].forEach(function (n) { f[n].addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); }); });

  function showErr(code, field) {
    err.hidden = false; err.textContent = B.msg(code);
    var el = field && f[field]; if (el && el.focus) el.focus();
  }
  function utm() {
    var o = [];
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { if (q.get(k)) o.push(k + '=' + q.get(k)); });
    if (document.referrer) o.push('ref=' + document.referrer);
    return o.join('&').slice(0, 600);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.hidden = true;
    var method = f.method.value === 'email' ? 'email' : 'phone';
    var d = {
      action: 'apply', relationship: f.relationship.value.trim(), recipient: f.recipient.value.trim(), occasion: f.occasion.value.trim(),
      story: f.story.value.trim(), mood: f.mood.value, name: f.name.value.trim(), method: method,
      phone: method === 'phone' ? f.phone.value.trim() : '', email: method === 'email' ? f.email.value.trim() : '',
      pin: f.pin.value, pin2: f.pin2.value, signup: f.signup.checked, consent: f.consent.checked, marketing: !!(f.marketing && f.marketing.checked),
      website: f.website.value, utm: utm(), repeat: repeat ? 1 : 0
    };
    var req = ['relationship', 'occasion', 'story', 'name', method];
    for (var i = 0; i < req.length; i++) if (!d[req[i]]) return showErr('required', req[i]);
    if (method === 'phone' && !/^01[016789]\d{7,8}$/.test(d.phone.replace(/\D/g, ''))) return showErr('phone', 'phone');
    if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return showErr('email', 'email');
    if (d.story.length < 5) return showErr('story_short', 'story');
    if (!/^\d{4}$/.test(d.pin)) return showErr('pin', 'pin');
    if (d.pin !== d.pin2) return showErr('pin2', 'pin2');
    if (!d.signup) return showErr('signup', 'signup');
    if (!d.consent) return showErr('consent', 'consent');
    if (!C.APPS_SCRIPT_URL) return showErr('not_ready');
    btn.disabled = true; btn.textContent = '보내는 중…';
    B.post(d).then(function (r) {
      if (!r.ok) return showErr(r.error, r.field);
      B.set('s', r.s); B.set('t', ''); B.set('uid', method === 'email' ? d.email.toLowerCase() : d.phone.replace(/\D/g, ''));
      form.hidden = true; out.hidden = false;
      if (r.prepay) {   // 무료 미리듣기를 이미 받은 아이디: 결제 후 제작 (금액은 결제 화면에서 서버가 계산해 보여 줌)
        out.innerHTML = '<b>신청이 접수됐어요. 고마워요!</b>' +
          '<p>무료 미리듣기는 처음 한 번만 드려요. 이번 노래는 결제 후 만들어 드려요.</p>' +
          '<p class="small">결제가 확인되면 바로 만들기 시작하고, 완성되면 ' + (method === 'email' ? '이메일' : '문자') + '로 알려 드려요. 금액은 다음 화면에서 확인하실 수 있어요.</p>' +
          '<a class="btn" id="prepay-link" href="#">결제하러 가기</a><p class="small" style="margin-top:12px">아이디 <span class="uid"></span> · 접수번호(참고용) <span class="oid-small"></span></p>';
        out.querySelector('#prepay-link').href = 'checkout.html?o=' + encodeURIComponent(r.orderId);
        out.querySelector('.uid').textContent = r.idLabel || '';
        out.querySelector('.oid-small').textContent = r.orderId;
        out.focus(); return;
      }
      out.innerHTML = '<b>신청이 접수됐어요. 고마워요!</b>' +
        '<p>' + (C.PREVIEW_ETA || '미리듣기는 1시간~24시간 안에 보내드려요') + '. 준비되면 ' + (method === 'email' ? '이메일' : '문자') + '로 바로 들을 수 있는 링크를 보내 드려요.</p>' +
        '<p class="small">나중에는 <b>‘내 노래 찾기’</b>에서 아이디(<span class="uid"></span>)와 비밀번호 4자리로 언제든 확인할 수 있어요.</p>' +
        '<a class="btn" id="status-link" href="status.html">내 노래 찾기</a><p class="small" style="margin-top:12px">접수번호(참고용) <span class="oid-small"></span></p>';
      out.querySelector('.uid').textContent = r.idLabel || '';
      out.querySelector('.oid-small').textContent = r.orderId;
      out.focus();
    }).catch(function () { showErr('network'); })
      .finally(function () { btn.disabled = false; btn.textContent = '무료로 만들어 보기'; });
  });
})();
