/* Bloome Song checkout_v2 — 구매확정 · 리뷰 팝업 (thanks.html)
   흐름: 리뷰 남기기 → (구매확정 전) 확정 팝업 → confirm_purchase → 리뷰 작성(홈페이지 이용 동의 필수) → submit_review → '감사합니다~'
   이미 구매확정 → 바로 리뷰 작성. 이미 리뷰 → '이미 리뷰를 남겨 주셨어요'.
   접근성: role=dialog, aria-modal, 포커스 가두기, Esc·바깥 누르면 닫기, 닫으면 원래 버튼으로 포커스 (pay-modal.js 와 같은 방식) */
(function () {
  var B = window.BLOOME; if (!B) return;
  var MIN = 10, MAX = 2000;
  var css = '' +
    '#rv-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(53,54,47,.5)}' +
    '#rv-dialog{position:relative;width:min(460px,100%);max-height:min(90vh,780px);overflow:auto;background:#faf7f1;color:#303633;border:1px solid #e0d5c6;border-radius:4px;box-shadow:0 18px 50px rgba(53,54,47,.28);padding:32px 24px 24px;font-family:"Noto Serif KR",serif;line-height:1.75;word-break:keep-all}' +
    '#rv-dialog:before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:#8a6a4f}' +
    '#rv-close{position:absolute;top:10px;right:10px;width:40px!important;height:40px;border:0;background:transparent!important;color:#5d534c;font-size:28px;line-height:1;cursor:pointer;padding:0!important}' +
    '.rv-kicker{display:block;font-size:13px;letter-spacing:2px;font-weight:600;color:#8a6a4f;margin:0 0 6px}' +
    '.rv-title{margin:0 0 10px;font-size:23px;line-height:1.45;letter-spacing:-.5px}' +
    '.rv-p{margin:0 0 12px;font-size:17px;color:#56605a}.rv-p b{color:#b04a1c}' +
    '.rv-row{display:flex;gap:10px;margin-top:18px}.rv-row button{flex:1;margin:0}' +
    '#rv-dialog .rv-btn{display:block;width:100%;text-align:center;border:0;border-radius:3px;background:#00704a;color:#fff;padding:14px 16px;font-family:inherit;font-size:18px;font-weight:700;cursor:pointer}' +
    '#rv-dialog .rv-btn.ghost{background:#fff;color:#5d534c;border:1px solid #cfc4b6;font-weight:400}' +
    '#rv-dialog .rv-btn[disabled]{opacity:.6;cursor:default}' +
    '.rv-label{display:block;font-size:16px;margin:4px 0 0;color:#303633}' +
    '#rv-text{display:block;width:100%;margin-top:7px;padding:12px;border:1px solid #cbc0b1;background:#fff;border-radius:3px;font-family:inherit;font-size:18px;line-height:1.7;resize:vertical;min-height:150px;box-sizing:border-box}' +
    '#rv-text:focus,#rv-agree:focus-visible{outline:2px solid #8a6a4f;outline-offset:2px}' +
    '.rv-count{display:block;text-align:right;font:13px Arial,sans-serif;color:#9a8f84;margin-top:4px}' +
    '.rv-gift{margin:14px 0 4px;padding:12px 14px;background:#f4eee6;border:1px dashed #cdb9a2;border-radius:6px;font-size:15px;color:#5d534c;line-height:1.7}.rv-gift b{color:#303633}' +
    '.rv-agree{display:flex;gap:10px;align-items:flex-start;margin:14px 0 0;padding:12px 14px;background:#fff;border:1px solid #d8cfc3;border-radius:8px;font-size:16px;color:#303633;cursor:pointer}' +
    '.rv-agree input{flex:none;width:22px!important;height:22px;margin:3px 0 0!important;padding:0;accent-color:#00704a}' +
    '.rv-agree small{display:block;font-size:14px;color:#8a817b}' +
    '.rv-err{margin-top:12px;padding:12px 14px;background:#fbeaea;color:#8a2020;border:1px solid #e3b5b5;font-size:16px}' +
    '.rv-done{text-align:center;padding:6px 0 2px}.rv-done svg{width:64px;height:64px;display:block;margin:0 auto 8px}' +
    '.rv-done .rv-big{display:block;font-size:30px;font-weight:700;color:#00704a;letter-spacing:-.5px;margin:0 0 8px}' +
    'body.rv-lock{overflow:hidden}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var S = null; /* {overlay, dialog, body, last, busy, order, onChange} */

  function focusables(root) {
    return [].slice.call(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.offsetParent !== null && !el.hidden; });
  }
  function close() {
    if (!S || S.busy) return;
    var s = S; S = null;
    document.body.classList.remove('rv-lock');
    if (s.overlay.parentNode) s.overlay.parentNode.removeChild(s.overlay);
    if (s.last && s.last.focus) try { s.last.focus(); } catch (e) {}
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function view(nodes, focusSel) {
    S.body.innerHTML = '';
    nodes.forEach(function (n) { S.body.appendChild(n); });
    var f = focusSel && S.body.querySelector(focusSel);
    setTimeout(function () { (f || S.dialog.querySelector('#rv-title') || S.dialog).focus(); }, 30);
  }
  function title(text) { var h = el('h2', 'rv-title', text); h.id = 'rv-title'; h.tabIndex = -1; return h; }
  function errBox() { var e = el('div', 'rv-err'); e.setAttribute('role', 'alert'); e.hidden = true; return e; }
  function changed(patch) { Object.assign(S.order, patch); if (S.onChange) S.onChange(S.order); }
  function body(extra) { return Object.assign({ order: S.order.orderId }, B.auth(), extra); }

  /* 1) 구매확정 팝업 */
  function confirmView() {
    var h = title('구매확정을 해주셔야\n리뷰 가능합니다.'); h.style.whiteSpace = 'pre-line';
    var p = el('p', 'rv-p'); p.innerHTML = '확정 하시겠습니까? <b>(확정시 환불 불가)</b>';
    var er = errBox();
    var row = el('div', 'rv-row');
    var no = el('button', 'rv-btn ghost', '취소'); no.type = 'button'; no.onclick = close;
    var yes = el('button', 'rv-btn', '확정하기'); yes.type = 'button'; yes.id = 'rv-confirm';
    yes.onclick = function () {
      er.hidden = true; yes.disabled = true; no.disabled = true; yes.textContent = '확정하는 중…'; S.busy = true;
      B.post(Object.assign({ action: 'confirm_purchase' }, body())).then(function (r) {
        S.busy = false;
        if (r && r.ok) { changed({ purchaseConfirmed: true, confirmedAt: r.confirmedAt || '' }); formView(); return; }
        er.hidden = false; er.textContent = B.msg(r && r.error);
      }).catch(function () { S.busy = false; er.hidden = false; er.textContent = B.msg('network'); })
        .finally(function () { if (yes.isConnected) { yes.disabled = false; no.disabled = false; yes.textContent = '확정하기'; } });
    };
    row.appendChild(no); row.appendChild(yes);
    view([el('span', 'rv-kicker', 'PURCHASE'), h, p, er, row], '#rv-confirm');
  }

  /* 2) 리뷰 작성 */
  function formView() {
    var f = document.createElement('form'); f.noValidate = true; f.id = 'rv-form';
    var lead = el('p', 'rv-p', '받으신 분의 표정, 처음 들었을 때의 마음… 편하게 적어 주세요.');
    var lab = el('label', 'rv-label', '리뷰 내용'); lab.htmlFor = 'rv-text';
    var ta = document.createElement('textarea'); ta.id = 'rv-text'; ta.name = 'text'; ta.rows = 6; ta.maxLength = MAX; ta.required = true;
    ta.setAttribute('aria-describedby', 'rv-count');
    var cnt = el('span', 'rv-count', '0 / ' + MAX); cnt.id = 'rv-count';
    ta.addEventListener('input', function () { cnt.textContent = ta.value.length + ' / ' + MAX; });
    var gift = el('div', 'rv-gift');
    gift.innerHTML = '<b>리뷰를 남기시면 모든 분께</b> 스타벅스 아메리카노를 최대 두 잔까지 드려요.<br>' +
      '<b>베스트리뷰</b>로 뽑혀 홈페이지 등 블루메송 홍보시 게시될 경우 <b>스타벅스 3만원 상품권</b> 증정 됩니다.';
    var ag = el('label', 'rv-agree');
    ag.innerHTML = '<input type="checkbox" id="rv-agree" name="consent" required aria-required="true"><span>리뷰가 블루메송 홈페이지 등에 사용될 수 있어요. 이에 동의합니다. <b>(필수)</b><small>동의하셔야 리뷰를 보낼 수 있어요.</small></span>';
    var er = errBox();
    var send = el('button', 'rv-btn', '리뷰 보내기'); send.type = 'submit'; send.id = 'rv-send'; send.style.marginTop = '16px';
    f.appendChild(lab); f.appendChild(ta); f.appendChild(cnt); f.appendChild(gift); f.appendChild(ag); f.appendChild(er); f.appendChild(send);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); er.hidden = true;
      var text = ta.value.trim(), agree = f.querySelector('#rv-agree');
      if (text.replace(/\s/g, '').length < MIN) { er.hidden = false; er.textContent = B.msg('review_short'); ta.focus(); return; }
      if (!agree.checked) { er.hidden = false; er.textContent = B.msg('review_consent'); agree.focus(); return; }
      send.disabled = true; send.textContent = '보내는 중…'; S.busy = true;
      B.post(Object.assign({ action: 'submit_review', text: text, consent: true }, body())).then(function (r) {
        S.busy = false;
        if (r && r.ok) { changed({ reviewed: true }); doneView(); return; }
        if (r && r.error === 'already_reviewed') { changed({ reviewed: true }); alreadyView(); return; }
        if (r && r.error === 'not_confirmed') { changed({ purchaseConfirmed: false }); confirmView(); return; }
        er.hidden = false; er.textContent = B.msg(r && r.error);
      }).catch(function () { S.busy = false; er.hidden = false; er.textContent = B.msg('network'); })
        .finally(function () { if (send.isConnected) { send.disabled = false; send.textContent = '리뷰 보내기'; } });
    });
    view([el('span', 'rv-kicker', 'REVIEW'), title('노래는 어떠셨나요?'), lead, f], '#rv-text');
  }

  var HEART = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#f4eee6" stroke="#cdb9a2" stroke-dasharray="3 4"/><path d="M32 46s-13-8.2-13-17a7.5 7.5 0 0 1 13-5 7.5 7.5 0 0 1 13 5c0 8.8-13 17-13 17z" fill="#c44b32"/></svg>';
  /* 3) 감사합니다~ */
  function doneView() {
    var d = el('div', 'rv-done'); d.setAttribute('role', 'status');
    d.innerHTML = HEART; var big = el('span', 'rv-big', '감사합니다~'); big.id = 'rv-title'; big.tabIndex = -1; d.appendChild(big);
    d.appendChild(el('p', 'rv-p', '소중한 리뷰 잘 받았어요.\n선물은 등록하신 휴대폰 혹은 이메일로 보내 드릴게요.')).style.whiteSpace = 'pre-line';
    var ok = el('button', 'rv-btn', '확인'); ok.type = 'button'; ok.id = 'rv-ok'; ok.onclick = close;
    view([d, ok], '#rv-ok');
  }
  function alreadyView() {
    var d = el('div', 'rv-done'); d.setAttribute('role', 'status');
    d.innerHTML = HEART; var big = el('span', 'rv-big', '이미 리뷰를 남겨 주셨어요'); big.style.fontSize = '22px'; big.id = 'rv-title'; big.tabIndex = -1; d.appendChild(big);
    d.appendChild(el('p', 'rv-p', '리뷰는 주문마다 한 번 남길 수 있어요. 고마워요!'));
    var ok = el('button', 'rv-btn', '확인'); ok.type = 'button'; ok.id = 'rv-ok'; ok.onclick = close;
    view([d, ok], '#rv-ok');
  }

  /* opts: {order, onChange} */
  function start(opts) {
    if (!opts || !opts.order) return;
    if (S) { S.busy = false; close(); }
    var overlay = el('div'); overlay.id = 'rv-overlay'; overlay.setAttribute('role', 'presentation');
    var dialog = el('div'); dialog.id = 'rv-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', 'rv-title'); dialog.tabIndex = -1;
    var x = el('button', '', '×'); x.type = 'button'; x.id = 'rv-close'; x.setAttribute('aria-label', '닫기'); x.onclick = close;
    var b = el('div'); dialog.appendChild(x); dialog.appendChild(b); overlay.appendChild(dialog);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var list = focusables(dialog); if (!list.length) { e.preventDefault(); return; }
      var i = list.indexOf(document.activeElement);
      if (e.shiftKey) { if (i <= 0) { e.preventDefault(); list[list.length - 1].focus(); } }
      else if (i === -1 || i === list.length - 1) { e.preventDefault(); list[0].focus(); }
    });
    document.body.appendChild(overlay); document.body.classList.add('rv-lock');
    S = { overlay: overlay, dialog: dialog, body: b, last: document.activeElement, busy: false, order: opts.order, onChange: opts.onChange };
    if (opts.order.reviewed) alreadyView();
    else if (opts.order.purchaseConfirmed) formView();
    else confirmView();
  }
  window.BLOOME_REVIEW = { start: start, close: close };
})();
