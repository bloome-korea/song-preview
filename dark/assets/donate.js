/* 블루메 송 (dark) — 커피 후원 블록 (홈 #donate · 내 노래 찾기 좋아요 뒤 공용).
   계좌는 config.js 의 BANK_INFO 한 곳에서만 읽고, 화면·복사에는 '은행 + 계좌번호'만 씀(예금주 괄호 부분은 잘라 냄). */
(function () {
  var C = (window.BLOOME_CONFIG || {}), RAW = String(C.BANK_INFO || '').trim();
  var m = RAW.match(/^(\S+)\s+([\d-]{6,})/);
  var BANK = m ? m[1] + ' ' + m[2] : RAW.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  var DONATIONS = [
    { key: 'coffee', icon: '☕', label: '커피 한 잔', amount: 5000 },
    { key: 'cake', icon: '🍰', label: '커피 + 조각케이크', amount: 10000 },
    { key: 'voucher', icon: '🎁', label: '커피 상품권', amount: 30000 },
    { key: 'custom', icon: '✏️', label: '기타 (직접 입력)', amount: null }];
  var COPIED = '계좌번호 복사 완료! 후원해 주셔서 감사해요!';
  function won(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'; }
  function el(p, tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; p.appendChild(e); return e; }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } document.body.removeChild(ta); });
  }
  if (!document.getElementById('donate-css')) {
    var st = document.createElement('style'); st.id = 'donate-css';
    st.textContent = 'html.dk .give{margin:16px 0 4px;padding:20px 16px;border:1px solid var(--acc);border-radius:6px;background:rgba(242,184,75,.05);scroll-margin-top:72px}' +
      'html.dk .give .mono-k{font-family:var(--mono);font-size:12px;letter-spacing:.16em;color:var(--acc);margin:0 0 6px;text-align:center}' +
      'html.dk .give-lead{text-align:center;color:var(--tx);font-size:17px;line-height:1.6;margin:0 0 16px}' +
      'html.dk .dons{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      'html.dk .don{background:var(--s1);color:var(--tx);border:1px solid var(--line2);border-radius:var(--r);padding:14px 6px;font:inherit;font-size:15px;font-weight:500;line-height:1.35;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;width:auto;margin:0}' +
      'html.dk .don .e{font-size:24px}html.dk .don b{color:var(--acc);font-family:var(--mono);font-size:15px}' +
      'html.dk .don[aria-pressed=true]{border-color:var(--acc);background:rgba(242,184,75,.12)}' +
      'html.dk .give .custom{display:flex;gap:8px;align-items:center;margin-top:10px}html.dk .give .custom[hidden]{display:none}html.dk .give .custom input{flex:1;min-width:0;margin:0;text-align:right;font-size:18px}html.dk .give .custom .btn{width:auto;padding:12px 16px;margin:0}' +
      'html.dk .acct{margin-top:16px;padding-top:16px;border-top:1px dashed var(--line2);text-align:center}html.dk .acct[hidden]{display:none}' +
      'html.dk .acct-amt{margin:0;color:var(--tx2)}html.dk .acct-amt b{font-size:20px;font-family:var(--mono)}' +
      'html.dk .acct-num{margin:10px 0;padding:14px 10px;background:var(--s3,#1F2126);border-radius:var(--r);font-size:18px;font-weight:700;color:var(--tx);font-family:var(--mono)}' +
      'html.dk .acct .acct-copy{width:100%;display:block;text-align:center}html.dk .acct-done{margin:10px 0 0;color:var(--acc);font-weight:700;font-size:16px}html.dk .acct-done[hidden]{display:none}' +
      'html.dk .acct .small{margin:10px 0 0;font-size:13px;color:var(--mute)}';
    document.head.appendChild(st);
  }
  // g: 빈 컨테이너(class 'give' 를 붙임). opts: {kicker, lead(html), onPick(cur), onCopy(cur)}
  function build(g, opts) {
    opts = opts || {}; g.classList.add('give'); g.innerHTML = '';
    if (opts.kicker) el(g, 'p', opts.kicker, 'mono-k');
    if (opts.lead) { var lead = el(g, 'p', null, 'give-lead'); lead.innerHTML = opts.lead; }
    var grid = el(g, 'div', null, 'dons'), custom = el(g, 'div', null, 'custom'); custom.hidden = true;
    custom.innerHTML = '<input type="text" inputmode="numeric" placeholder="금액 입력" aria-label="후원 금액"><span>원</span><button type="button" class="' + (opts.btn2 || 'btn') + '">확인</button>';
    var acct = el(g, 'div', null, 'acct'); acct.hidden = true;
    acct.innerHTML = '<p class="acct-amt"><span class="l"></span> · <b class="v"></b></p><p class="acct-num"></p><button type="button" class="' + (opts.btn || 'btn green') + ' acct-copy">계좌 복사하기</button>' +
      '<p class="acct-done" role="status" hidden></p><p class="small">후원은 자유예요. 후원하지 않으셔도 괜찮아요.</p>';
    acct.querySelector('.acct-num').textContent = BANK || '계좌 정보를 준비하고 있어요.';
    var done = acct.querySelector('.acct-done'), cur = null;
    function pick(label, amt) { cur = { label: label, amount: amt }; acct.querySelector('.l').textContent = label; acct.querySelector('.v').textContent = won(amt); acct.hidden = false; done.hidden = true;
      if (opts.onPick) opts.onPick(cur); setTimeout(function () { acct.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); }
    DONATIONS.forEach(function (d) {
      var b = el(grid, 'button', null, 'don'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="e" aria-hidden="true">' + d.icon + '</span><span class="t"></span><b>' + (d.amount ? won(d.amount) : '&nbsp;') + '</b>'; b.querySelector('.t').textContent = d.label;
      b.onclick = function () { [].forEach.call(grid.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (d.amount) { custom.hidden = true; pick(d.label, d.amount); } else { custom.hidden = false; acct.hidden = true; custom.querySelector('input').focus(); } };
    });
    var ci = custom.querySelector('input');
    ci.addEventListener('input', function () { var v = this.value.replace(/\D/g, '').slice(0, 8); this.value = v ? Number(v).toLocaleString('ko-KR') : ''; });
    custom.querySelector('button').onclick = function () { var v = Number(ci.value.replace(/\D/g, '')); if (!v || v < 1000) { ci.focus(); ci.placeholder = '1,000원 이상'; ci.value = ''; return; } pick('직접 입력', v); };
    acct.querySelector('.acct-copy').onclick = function () {
      copyText(BANK).then(function () { done.textContent = COPIED; done.hidden = false; if (opts.onCopied) opts.onCopied(COPIED); },
        function () { done.textContent = '복사가 안 됐어요. 계좌번호를 길게 눌러 복사해 주세요.'; done.hidden = false; });
      if (opts.onCopy) opts.onCopy(cur || {});
    };
    return g;
  }
  window.BLOOME_DONATE = { build: build, bank: BANK, copiedText: COPIED };
  // 홈: <div id="donate-box"> 가 있으면 자동으로 채움
  function auto() { var box = document.getElementById('donate-box'); if (box && !box.dataset.built) { box.dataset.built = '1'; build(box, { btn: 'btn primary', btn2: 'btn line' }); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
