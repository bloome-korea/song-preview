/* Bloome Song v16.1 — 신청 폼(간편 회원가입 포함) → Apps Script → 완료 페이지 */
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
