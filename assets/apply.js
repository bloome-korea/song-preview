/* Bloome Song v16.1 + payapp_v6 — 신청 폼(간편 회원가입 포함) → Apps Script → 완료 페이지
 * v6: 로그인 상태(세션 s + uid)면 그 계정으로 신청 — 비밀번호 칸·간편가입 체크 숨김, 번호 고정, '다른 번호로 신청(로그아웃)' 링크.
 *     비밀번호 틀림(pin_mismatch) 시 '비밀번호를 잊으셨나요? 문의하기' 안내. */
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

  // v6: 로그인된 계정으로 신청
  var acct = form.querySelector('fieldset.account'), signupLbl = f.signup.closest ? f.signup.closest('label') : f.signup.parentNode;
  var methodFs = form.querySelector('fieldset.method'), banner = document.getElementById('repeat-banner'), loginNote = null, loggedIn = false;
  function mask(u) { return u.indexOf('@') > 0 ? u.replace(/^(.{1,2}).*(@.*)$/, '$1***$2') : u.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-****-$3'); }
  function setLoggedIn(on) {
    var uid = B.get('uid');
    loggedIn = !!(on && B.get('s') && uid);
    acct.style.display = loggedIn ? 'none' : ''; signupLbl.style.display = loggedIn ? 'none' : '';
    f.pin.required = f.pin2.required = !loggedIn;
    Array.prototype.forEach.call(form.querySelectorAll('input[name=method]'), function (r) { r.disabled = loggedIn; });
    f.phone.readOnly = f.email.readOnly = loggedIn;
    if (loginNote) { loginNote.remove(); loginNote = null; }
    if (loggedIn) {
      if (uid.indexOf('@') > 0) { f.method.value = 'email'; f.email.value = uid; }
      else { f.method.value = 'phone'; f.phone.value = uid.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3'); }
      syncMethod();
      loginNote = document.createElement('p'); loginNote.className = 'login-note';
      loginNote.style.cssText = 'margin:6px 0 10px;padding:10px 12px;background:#eef5f1;border:1px solid #b9d6c8;border-radius:6px;font-size:15px';
      loginNote.innerHTML = '<b></b> 계정으로 로그인돼 있어요. 이 계정으로 신청돼요. 비밀번호는 다시 넣지 않아도 돼요. <a href="#" class="logout-link">다른 번호로 신청하기 (로그아웃)</a>';
      loginNote.querySelector('b').textContent = mask(uid);
      loginNote.querySelector('.logout-link').onclick = function (e) {
        e.preventDefault(); var s = B.get('s'); if (s) B.post({ action: 'logout', s: s }).catch(function () {});
        B.set('s', ''); B.set('t', ''); B.set('uid', ''); f.phone.value = ''; f.email.value = ''; setLoggedIn(false);
      };
      var lg = methodFs.querySelector('legend'); methodFs.insertBefore(loginNote, lg ? lg.nextSibling : methodFs.firstChild);
    }
    if (repeat && banner) banner.innerHTML = loggedIn
      ? '<b>한 곡 더 만들기</b> 로그인된 계정으로 신청돼요. 구매하신 적이 있는 계정은 미리듣기 후 9,900원에 받을 수 있어요.'
      : '<b>한 곡 더 만들기</b> 재구매 혜택이 적용돼요. 같은 아이디와 비밀번호로 신청해 주세요.';
  }
  setLoggedIn(true);
  ['pin', 'pin2'].forEach(function (n) { f[n].addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); }); });

  function showErr(code, field, text) {
    err.hidden = false; err.textContent = text || B.msg(code);
    if (code === 'pin_mismatch' || code === 'locked') {   // v6: 비밀번호 분실 안내
      var a = document.createElement('a'); a.href = '#'; a.textContent = '비밀번호를 잊으셨나요? 문의하기'; a.style.cssText = 'display:block;margin-top:6px;text-decoration:underline';
      a.onclick = function (e) { e.preventDefault(); if (window.BLOOME_CHAT) window.BLOOME_CHAT.open(true); else location.href = 'mailto:' + (C.CONTACT_EMAIL || 'bloome.korea@gmail.com'); };
      err.appendChild(a);
    }
    var el = field && f[field]; if (el && el.focus) el.focus();
    // 실패 시 입력값은 그대로 두고, 완료 페이지로 가지 않음
    try { err.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
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
    if (loggedIn) { d.s = B.get('s'); d.pin = ''; d.pin2 = ''; d.signup = true; }
    var req = ['relationship', 'occasion', 'story', 'name', method];
    for (var i = 0; i < req.length; i++) if (!d[req[i]]) return showErr('required', req[i]);
    if (method === 'phone' && !/^01[016789]\d{7,8}$/.test(d.phone.replace(/\D/g, ''))) return showErr('phone', 'phone');
    if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return showErr('email', 'email');
    if (d.story.length < 5) return showErr('story_short', 'story');
    if (!loggedIn) {
      if (!/^\d{4}$/.test(d.pin)) return showErr('pin', 'pin');
      if (d.pin !== d.pin2) return showErr('pin2', 'pin2');
      if (!d.signup) return showErr('signup', 'signup');
    }
    if (!d.consent) return showErr('consent', 'consent');
    if (!C.APPS_SCRIPT_URL) return showErr('not_ready');
    btn.disabled = true; btn.textContent = '보내는 중…';
    B.post(d).then(function (r) {
      if (r && r.error === 'session') { B.set('s', ''); B.set('uid', ''); setLoggedIn(false); return showErr('session', 'pin', '로그인이 끝났어요. 휴대폰 번호와 비밀번호 4자리를 넣고 다시 신청해 주세요.'); }
      if (!r || !r.ok) return showErr((r && r.error) || 'server', r && r.field);
      B.set('s', r.s); B.set('t', ''); B.set('uid', method === 'email' ? d.email.toLowerCase() : d.phone.replace(/\D/g, ''));
      // 성공 시에만 완료 페이지로 이동 (실패면 폼·입력값 유지)
      var url = 'done.html?m=' + encodeURIComponent(method);
      if (r.prepay) url += '&prepay=1';
      if (r.orderId) url += '&o=' + encodeURIComponent(r.orderId);
      location.href = url;
    }).catch(function () { showErr('network'); })
      .finally(function () { btn.disabled = false; btn.textContent = '무료로 만들어 보기'; });
  });
})();
