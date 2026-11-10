/* Bloome Song 결제 패널 — status.html 팝업 · checkout.html 인라인 공용.
   금액은 서버 price 객체를 그대로 쓰고, PayApp pay_request 도 서버 계산 금액을 사용합니다. */
(function () {
  var B = window.BLOOME; if (!B) return;
  var C = B.C || {};
  var PAYAPP_ON = C.PAYAPP_ENABLED !== false;
  var PA_LABEL = '카드·네이버페이로 결제하기';
  var TIERS = [
    { untilH: 1, amount: 9900, next: 19800 },
    { untilH: 12, amount: 19800, next: 29800 },
    { untilH: 24, amount: 29800, next: null }
  ];
  var openState = null; /* {overlay, dialog, lastFocus, timers, onDone} */

  var css = '' +
    '#pm-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(53,54,47,.48)}' +
    '#pm-overlay[hidden]{display:none!important}' +
    '#pm-dialog{position:relative;width:min(440px,100%);max-height:min(86vh,740px);overflow:auto;background:#faf7f1;color:#303633;border:1px solid #e0d5c6;border-radius:4px;box-shadow:0 18px 50px rgba(53,54,47,.28);padding:30px 24px 24px;font-family:"Noto Serif KR",serif;line-height:1.75;word-break:keep-all}' +
    '#pm-dialog:before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:#8a6a4f}' +
    '#pm-close{position:absolute;top:10px;right:10px;width:40px;height:40px;border:0;background:transparent;color:#5d534c;font-size:28px;line-height:1;cursor:pointer;padding:0}' +
    '.pm-sheet{background:#faf7f1;border:1px solid #e0d5c6;padding:22px 18px;color:#303633;font-family:"Noto Serif KR",serif;line-height:1.75;word-break:keep-all}' +
    '.pm-kicker{display:block;font-size:13px;letter-spacing:2px;font-weight:600;color:#8a6a4f;margin:0 0 4px}' +
    '.pm-title{margin:0 0 4px;font-size:24px;line-height:1.4;letter-spacing:-.5px}' +
    '.pm-sub{margin:0 0 12px;font-size:16px;color:#56605a}' +
    '.pm-amt{display:block;font:700 34px Arial,sans-serif;letter-spacing:-.5px;color:#303633;line-height:1.25;margin:0 0 8px}' +
    '.pm-guide{margin:0 0 16px;font-size:16px;color:#5d534c;background:#f4eee6;border:1px solid #e6dccf;border-radius:6px;padding:12px 14px}' +
    '.pm-guide b{font-family:Arial,sans-serif}' +
    '.pm-opts{display:grid;gap:10px;margin:0}' +
    '.pm-opt{display:block;margin:0;border:1px solid #d8cfc3;border-radius:8px;background:#fff;overflow:hidden}' +
    '.pm-opt.on{border-color:#8a6a4f;box-shadow:0 0 0 1px #8a6a4f}' +
    '.pm-opt-h{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;font-size:18px;font-weight:700}' +
    '.pm-opt-h input{width:auto;margin:0;accent-color:#8a6a4f;flex-shrink:0}' +
    '.pm-panel{display:none;padding:0 16px 16px;border-top:1px solid #eee6db}' +
    '.pm-opt.on .pm-panel{display:block}' +
    '.pm-panel .small{font-size:15px;color:#717a74;margin:10px 0 0}' +
    '.pm-bank{margin:12px 0 0;padding:14px 16px;background:#f4eee6;border:1px solid #e6dccf;border-radius:6px}' +
    '.pm-bank .pm-bank-name{display:block;font-size:15px;color:#6c766f}' +
    '.pm-bank .pm-bank-no{display:block;font:700 22px Arial,sans-serif;letter-spacing:.4px;color:#303633;margin:2px 0}' +
    '.pm-bank .pm-bank-who{display:block;font-size:16px;font-weight:700}' +
    '.pm-panel label{display:block;font-size:16px;margin:14px 0 0}' +
    '.pm-panel input[type=text],.pm-panel input[type=search],.pm-panel input:not([type]),.pm-panel input[type=tel]{display:block;width:100%;margin-top:7px;padding:12px;border:1px solid #cbd3cd;background:#fff;border-radius:3px;font:inherit;font-size:18px;box-sizing:border-box}' +
    '.pm-panel .btn,.pm-panel button.btn{display:block;width:100%;text-align:center;border:0;border-radius:3px;background:#645a54;color:#fff;padding:14px 20px;margin-top:14px;text-decoration:none;font-family:inherit;font-size:18px;cursor:pointer}' +
    '.pm-panel .btn.green{background:#00704a}' +
    '.pm-wait{margin:0;padding:16px 14px;background:#eaf6ef;color:#1d5c3e;border:1px solid #b9d6c8;font-size:17px}' +
    '.pm-err{margin-top:12px;padding:12px 14px;background:#fbeaea;color:#8a2020;border:1px solid #e3b5b5}' +
    '.pm-picks{margin:0 0 14px}.pm-picks label{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0;padding:12px 14px;border:1px solid #cbd3cd;border-radius:8px;background:#fff;font-size:17px;cursor:pointer;font-weight:400}' +
    '.pm-picks label b{font-family:Arial,sans-serif}.pm-picks input{width:auto;margin:0 8px 0 0}.pm-picks label.on{border:2px solid #8a6a4f;background:#f4eee6}' +
    'body.pm-lock{overflow:hidden}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function won(n) { return B.won(n); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* firstOpenAt 는 서버가 KST 로 주는 "YYYY-MM-DD HH:mm:ss" */
  function parseKst(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5], +(m[6] || 0));
  }
  function kstParts(ms) {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    var p = { year: '', month: '', day: '', hour: '', minute: '' };
    f.formatToParts(new Date(ms)).forEach(function (x) { if (p.hasOwnProperty(x.type)) p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
  }
  function formatUntil(ms) {
    if (!isFinite(ms)) return '';
    var t = kstParts(ms), n = kstParts(Date.now());
    var clock = t.h + '시' + (t.mi ? ' ' + t.mi + '분' : '');
    if (t.y === n.y && t.mo === n.mo && t.d === n.d) return clock;
    var tomorrow = kstParts(Date.now() + 24 * 3600000);
    if (t.y === tomorrow.y && t.mo === tomorrow.mo && t.d === tomorrow.d) return '내일 ' + clock;
    return t.mo + '월 ' + t.d + '일 ' + clock;
  }

  /* 현재 구간 마감 시각 · 다음 금액. API 의 nextInSec/nextAmount 를 우선하고, 없으면 firstOpen 으로 계산. */
  function halfOf(n) { return Math.round(Number(n) * 0.5 / 10) * 10; }
  function withPick(amount, nextAmount, pick) {
    if (pick === 'both') {
      if (amount != null) amount = amount + halfOf(amount);
      if (nextAmount != null) nextAmount = nextAmount + halfOf(nextAmount);
    }
    return { amount: amount, nextAmount: nextAmount };
  }
  function deadlineOf(order, pick) {
    var pr = (order && order.price) || {};
    pick = pick === 'both' ? 'both' : (String(pick) === '2' ? '2' : '1');
    var out = { kind: 'open', amount: currentAmount(order, pick), nextAmount: null, untilMs: NaN, text: '' };
    if (order && order.addonMode) {
      out.kind = 'addon';
      out.amount = (order.addon && order.addon.amount) || 0;
      out.text = '나머지 곡 금액은 ' + won(out.amount) + '입니다. 시간이 지나도 이 금액 그대로예요.';
      return out;
    }
    if (pr.locked) { out.kind = 'locked'; return out; }
    if (pr.prepay || pr.fixed) {
      out.kind = 'fixed';
      out.amount = currentAmount(order, pick) || pr.amount;
      out.text = '결제 금액은 ' + won(out.amount) + '입니다. 이 금액은 시간과 관계없이 그대로예요.';
      return out;
    }
    if (pr.discount) {
      out.kind = 'discount';
      var dca = withPick(pr.amount, pr.regular || 29800, pick);
      out.amount = dca.amount; out.nextAmount = dca.nextAmount;
      if (pr.endsInSec != null) out.untilMs = Date.now() + pr.endsInSec * 1000;
      else if (pr.endsAt) out.untilMs = parseKst(pr.endsAt);
      out.text = out.untilMs
        ? ('입금은 ' + formatUntil(out.untilMs) + '까지 입금하셔야 할인가 ' + won(out.amount) + '입니다. 이후에는 ' + won(out.nextAmount) + '입니다.')
        : ('할인가 ' + won(out.amount) + '로 결제하실 수 있어요.');
      return out;
    }
    if (pr.notStarted) {
      out.kind = 'notStarted';
      var nsa = withPick(pr.amount || 9900, pr.nextAmount || 19800, pick);
      out.amount = nsa.amount; out.nextAmount = nsa.nextAmount;
      out.text = '미리듣기를 처음 들으신 때부터 1시간 안에는 ' + won(out.amount) + '입니다. 이후에는 ' + won(out.nextAmount) + '입니다.';
      return out;
    }

    var nextInSec = (pr.nextInSec != null && pr.nextInSec !== '') ? pr.nextInSec : null;
    var nextAmount = (pr.nextAmount != null && pr.nextAmount !== '') ? pr.nextAmount : null;
    var at = parseKst(pr.firstOpenAt || (order && order.firstOpenAt));
    var now = Date.now();
    var lastTier = (pr.amount === 29800 && nextAmount == null) || (isFinite(at) && (now - at) >= 12 * 3600000 && nextAmount == null);

    if (lastTier) {
      /* 마지막 구간(29,800원): 다음 금액 없음. 24시간 마감은 expireInSec 또는 firstOpen+24h */
      if (order && order.expireInSec != null) nextInSec = order.expireInSec;
      else if (isFinite(at)) nextInSec = Math.max(0, Math.ceil((at + 24 * 3600000 - now) / 1000));
      nextAmount = null;
    } else if (nextInSec == null && isFinite(at) && pr.amount) {
      /* 다음 구간 시각이 없으면 firstOpen + 1h/12h 로 계산 */
      var hrs = Math.max(0, (now - at) / 3600000);
      var i, t;
      for (i = 0; i < TIERS.length; i++) {
        t = TIERS[i];
        if (hrs < t.untilH || i === TIERS.length - 1) {
          nextInSec = Math.max(0, Math.ceil((at + t.untilH * 3600000 - now) / 1000));
          nextAmount = t.next;
          break;
        }
      }
    }
    if (nextAmount == null && nextInSec == null) {
      if (order && order.expireInSec != null) nextInSec = order.expireInSec;
      else if (isFinite(at)) nextInSec = Math.max(0, Math.ceil((at + 24 * 3600000 - now) / 1000));
    }

    if (nextInSec != null && nextInSec !== '') out.untilMs = now + Number(nextInSec) * 1000;
    var oa = withPick(pr.amount || out.amount, nextAmount, pick);
    out.nextAmount = oa.nextAmount;
    out.amount = oa.amount;
    var until = formatUntil(out.untilMs);
    if (until && out.nextAmount) {
      out.text = '입금은 타이머 시간과 동일하게 ' + until + '까지 입금하셔야 ' + won(out.amount) + '입니다. 이후에는 ' + won(out.nextAmount) + '입니다.';
    } else if (until) {
      out.text = '입금은 타이머 시간과 동일하게 ' + until + '까지 입금하셔야 ' + won(out.amount) + '입니다. 이후에는 결제가 닫힙니다.';
    } else {
      out.text = '지금 결제 금액은 ' + won(out.amount) + '입니다.';
    }
    return out;
  }

  function currentAmount(order, pick) {
    if (order && order.addonMode) return (order.addon && order.addon.amount) || 0;
    var pr = (order && order.price) || {};
    if (pick === 'both' && pr.bothAmount) return pr.bothAmount;
    return pr.amount || 0;
  }

  function bankParts() {
    var raw = String(C.BANK_INFO || '').trim();
    var m = raw.match(/^(.+?)\s+(\d[\d-]+)\s*(?:\((?:예금주\s*)?(.+?)\)|(?:예금주\s+)?(.+))?$/);
    if (m) return { name: m[1].trim(), no: m[2].trim(), who: ((m[3] || m[4] || '').trim() || '박원재') };
    return { name: '카카오뱅크', no: '3333-0111-75830', who: '박원재', raw: raw };
  }

  function titleOf(order) {
    if (order && order.addonMode) return '나머지 곡도 받기';
    if (order && order.prepay && order.status === '선결제대기') return '결제하기';
    return '전체곡 받기';
  }
  function subOf(order) {
    var s = (order && (order.purpose || '내 노래')) || '내 노래';
    if (order && order.recipient) s += ' · ' + order.recipient + ' 님';
    if (order && order.addonMode && order.addon) s += ' · ' + order.addon.song + '번 곡';
    return s;
  }

  function focusables(root) {
    return [].slice.call(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function (el) {
      return el.offsetParent !== null && !el.hidden && el.getAttribute('aria-hidden') !== 'true';
    });
  }

  function bindTrap(overlay, dialog) {
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var list = focusables(dialog);
      if (!list.length) { e.preventDefault(); return; }
      var i = list.indexOf(document.activeElement);
      if (e.shiftKey) {
        if (i <= 0) { e.preventDefault(); list[list.length - 1].focus(); }
      } else if (i === -1 || i === list.length - 1) { e.preventDefault(); list[0].focus(); }
    }
    overlay.addEventListener('keydown', onKey);
    return onKey;
  }

  function parseBankHtml() {
    var p = bankParts();
    var d = document.createElement('div');
    d.className = 'pm-bank';
    d.innerHTML = '<span class="pm-bank-name"></span><span class="pm-bank-no"></span><span class="pm-bank-who"></span>';
    d.querySelector('.pm-bank-name').textContent = p.name;
    d.querySelector('.pm-bank-no').textContent = p.no;
    d.querySelector('.pm-bank-who').textContent = '예금주 ' + p.who;
    return d;
  }

  /* opts: {order, pick, addon, inline, onDone, onExpire} */
  function buildSheet(opts) {
    var order = opts.order;
    var pick = opts.pick === 'both' ? 'both' : (String(opts.pick) === '2' ? '2' : '1');
    var addon = !!opts.addon;
    if (addon) {
      order = Object.assign({}, order, { addonMode: true });
    }
    var wrap = document.createElement('div');
    wrap.className = opts.inline ? 'pm-sheet' : 'pm-body';
    if (order && order.depositRequested && !addon) {
      wrap.appendChild(waitBox('입금 확인을 요청하셨어요. 확인되면 내 노래 찾기에서 전체곡을 받을 수 있어요.'));
      return wrap;
    }
    if (addon && order && order.addon && order.addon.state === '입금확인요청') {
      wrap.appendChild(waitBox('입금 확인을 요청하셨어요. 확인되면 내 노래 찾기에서 받을 수 있어요.'));
      return wrap;
    }
    if (order && order.expired && !order.paid && !addon) {
      wrap.appendChild(expiredBox());
      return wrap;
    }

    var kicker = document.createElement('span'); kicker.className = 'pm-kicker'; kicker.textContent = 'PAYMENT';
    var h = document.createElement('h2'); h.className = 'pm-title'; h.id = 'pm-title'; h.textContent = titleOf(order);
    var sub = document.createElement('p'); sub.className = 'pm-sub'; sub.textContent = subOf(order);
    var amt = document.createElement('span'); amt.className = 'pm-amt'; amt.setAttribute('aria-live', 'polite');
    function refreshAmt() { amt.textContent = won(currentAmount(order, pick)); }
    refreshAmt();
    wrap.appendChild(kicker); wrap.appendChild(h); wrap.appendChild(sub); wrap.appendChild(amt);

    if (order && order.hasSong2 && !addon && !order.depositRequested && !(order.price && order.price.locked)) {
      var picks = document.createElement('div'); picks.className = 'pm-picks'; picks.setAttribute('role', 'radiogroup'); picks.setAttribute('aria-label', '받을 곡');
      [['1', '1번 곡만 받기', order.price.amount], ['2', '2번 곡만 받기', order.price.amount], ['both', '두 곡 다 받기', order.price.bothAmount]].forEach(function (x) {
        var l = document.createElement('label');
        l.innerHTML = '<span><input type="radio" name="pm-pick"><span></span></span><b></b>';
        var inp = l.querySelector('input'); inp.value = x[0]; inp.checked = x[0] === pick;
        l.querySelector('span span').textContent = x[1];
        l.querySelector('b').textContent = won(x[2]);
        if (inp.checked) l.classList.add('on');
        inp.addEventListener('change', function () {
          pick = x[0];
          [].forEach.call(picks.querySelectorAll('label'), function (lb) { lb.classList.toggle('on', lb.querySelector('input').checked); });
          refreshAmt();
          dl = deadlineOf(order, pick);
          shortLine(dl);
          var bg = wrap.querySelector('#pm-bank-guide');
          if (bg && dl.text) bg.textContent = dl.text;
        });
        picks.appendChild(l);
      });
      wrap.appendChild(picks);
    }

    var dl = deadlineOf(order, pick);
    var short = document.createElement('p'); short.className = 'small'; short.id = 'pm-short'; short.style.margin = '0 0 16px';
    function shortLine(d) {
      if (d.untilMs && isFinite(d.untilMs) && (d.kind === 'open' || d.kind === 'discount')) {
        short.hidden = false;
        short.textContent = d.nextAmount
          ? (formatUntil(d.untilMs) + '까지 ' + won(d.amount) + ' · 이후 ' + won(d.nextAmount))
          : (formatUntil(d.untilMs) + '까지 ' + won(d.amount) + ' · 이후 결제 마감');
      } else { short.hidden = true; short.textContent = ''; }
    }
    shortLine(dl);
    wrap.appendChild(short);

    var showCard = PAYAPP_ON && !addon;
    var optsBox = document.createElement('div'); optsBox.className = 'pm-opts'; optsBox.setAttribute('role', 'radiogroup'); optsBox.setAttribute('aria-label', '결제 방법');

    function makeOpt(value, labelText) {
      var opt = document.createElement('div'); opt.className = 'pm-opt';
      var lab = document.createElement('label'); lab.className = 'pm-opt-h';
      var inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'pm-method'; inp.value = value;
      lab.appendChild(inp); lab.appendChild(document.createTextNode(labelText));
      opt.appendChild(lab);
      var panel = document.createElement('div'); panel.className = 'pm-panel'; panel.hidden = true;
      opt.appendChild(panel);
      inp.addEventListener('change', function () {
        [].forEach.call(optsBox.querySelectorAll('.pm-opt'), function (o) {
          var on = o.querySelector('input[name=pm-method]').checked;
          o.classList.toggle('on', on);
          var p = o.querySelector('.pm-panel');
          if (p) p.hidden = !on;
        });
      });
      return { opt: opt, panel: panel, inp: inp };
    }

    if (showCard) {
      var card = makeOpt('card', '카드결제(네이버페이)');
      var cardP = document.createElement('p'); cardP.className = 'small';
      cardP.textContent = '버튼을 누르면 결제창이 열려요. 결제가 끝나면 이 사이트로 돌아와 바로 전체곡을 받을 수 있어요.';
      var paBtn = document.createElement('button'); paBtn.type = 'button'; paBtn.className = 'btn green'; paBtn.id = 'pm-pa-btn'; paBtn.textContent = PA_LABEL;
      var paErr = document.createElement('div'); paErr.className = 'pm-err'; paErr.hidden = true; paErr.setAttribute('role', 'alert');
      paBtn.addEventListener('click', function () {
        paErr.hidden = true; paBtn.disabled = true; paBtn.textContent = '결제창 여는 중…';
        function fail(t) { paErr.hidden = false; paErr.textContent = t; paBtn.disabled = false; paBtn.textContent = PA_LABEL; }
        B.post(Object.assign({ action: 'pay_request', mode: 'order', order: order.orderId, pick: pick }, B.auth())).then(function (r) {
          if (r && r.ok && r.payurl) { location.href = r.payurl; return; }
          if (r && (r.error === 'already_paid' || r.paid)) { location.href = 'status.html?paid=' + encodeURIComponent(order.orderId); return; }
          if (r && (r.error === 'session' || r.error === 'bad_token')) { fail(B.msg(r.error)); return; }
          fail(r && r.reason === 'disabled' ? '카드 결제가 아직 열리지 않았어요. 계좌이체로 결제해 주세요.' : (r && r.error === 'payapp' ? '결제창을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.' : B.msg(r && r.error)));
        }).catch(function () { fail(B.msg('network')); });
      });
      window.addEventListener('pageshow', function () { paBtn.disabled = false; paBtn.textContent = PA_LABEL; });
      card.panel.appendChild(cardP); card.panel.appendChild(paBtn); card.panel.appendChild(paErr);
      optsBox.appendChild(card.opt);
    } else if (!PAYAPP_ON && !addon) {
      var cardOff = makeOpt('card', '카드결제(네이버페이)');
      var pend = document.createElement('p'); pend.className = 'small'; pend.textContent = '카드 결제는 준비 중이에요. 지금은 계좌이체로 받을 수 있어요.';
      cardOff.panel.appendChild(pend);
      optsBox.appendChild(cardOff.opt);
    }

    var bank = makeOpt('bank', '계좌이체');
    var bankHold = document.createElement('div');
    bankHold.appendChild(parseBankHtml());
    if (dl.text) {
      var bankGuide = document.createElement('p'); bankGuide.className = 'pm-guide'; bankGuide.id = 'pm-bank-guide';
      bankGuide.textContent = dl.text;
      bankHold.appendChild(bankGuide);
    }
    var form = document.createElement('form'); form.noValidate = true; form.id = 'pm-deposit-form';
    form.innerHTML = '<label>입금자명<input name="depositor" maxlength="30" autocomplete="name" required></label>' +
      '<button type="submit" class="btn green" id="pm-deposit-btn">확인</button>' +
      '<div class="pm-err" id="pm-deposit-error" role="alert" hidden></div>';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var er = form.querySelector('#pm-deposit-error'); er.hidden = true;
      var d = form.depositor.value.trim();
      if (!d) { er.hidden = false; er.textContent = '입금자명을 적어 주세요.'; form.depositor.focus(); return; }
      var btn = form.querySelector('#pm-deposit-btn'); btn.disabled = true; btn.textContent = '보내는 중…';
      var body = Object.assign({ action: 'deposit', order: order.orderId, depositor: d, pick: pick }, addon ? { addon: 1 } : {}, B.auth());
      B.post(body).then(function (r) {
        if (!r.ok) { er.hidden = false; er.textContent = B.msg(r.error); return; }
        var msg = (r.already === 'paid')
          ? '이미 결제가 확인됐어요. 내 노래 찾기에서 전체곡을 받아 주세요.'
          : '입금대기중입니다. 입금 완료 될 경우, 등록하신 휴대폰 혹은 이메일로 연락드리겠습니다.';
        var wait = waitBox(msg);
        form.replaceWith(wait);
        wait.focus();
        window.__bloomeDeposit = r;
        if (opts.onDone) opts.onDone(r);
      }).catch(function () { er.hidden = false; er.textContent = B.msg('network'); }).finally(function () { btn.disabled = false; btn.textContent = '확인'; });
    });
    bankHold.appendChild(form);
    bank.panel.appendChild(bankHold);
    optsBox.appendChild(bank.opt);

    /* 카드가 없으면(나머지 곡) 계좌이체를 바로 펼침 */
    if (!showCard && !( !PAYAPP_ON && !addon )) {
      bank.inp.checked = true;
      bank.opt.classList.add('on');
      bank.panel.hidden = false;
    }

    wrap.appendChild(optsBox);
    var ref = document.createElement('p'); ref.className = 'small'; ref.style.marginTop = '14px'; ref.style.color = '#9aa49d';
    if (order && order.orderId) ref.textContent = '접수번호(참고용) ' + order.orderId;
    wrap.appendChild(ref);
    return wrap;
  }

  function waitBox(text) {
    var d = document.createElement('div'); d.className = 'pm-wait'; d.setAttribute('role', 'status'); d.tabIndex = -1;
    d.textContent = text; return d;
  }
  function expiredBox() {
    var d = document.createElement('div'); d.className = 'expired';
    d.innerHTML = '<img src="assets/girl_letter_cry.jpg" alt="편지를 꼭 안고 우는 아이 그림" width="150" height="150"><h2>이 노래의 듣기·결제 시간이 지났어요</h2><p>처음 들어 보신 뒤 24시간이 지나 이 화면이 닫혔어요.<br>다시 받고 싶으시면 고객센터에 문의해 주세요.</p>';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn green'; b.textContent = '고객센터에 문의하기';
    b.onclick = function () { close(); window.BLOOME_CHAT && window.BLOOME_CHAT.open(true); };
    d.appendChild(b); return d;
  }

  function close() {
    if (!openState) return;
    var s = openState; openState = null;
    document.body.classList.remove('pm-lock');
    if (s.overlay && s.overlay.parentNode) s.overlay.parentNode.removeChild(s.overlay);
    if (s.lastFocus && s.lastFocus.focus) try { s.lastFocus.focus(); } catch (e) {}
  }

  function open(opts) {
    if (!opts || !opts.order) return;
    close();
    var last = document.activeElement;
    var overlay = document.createElement('div');
    overlay.id = 'pm-overlay';
    overlay.setAttribute('role', 'presentation');
    var dialog = document.createElement('div');
    dialog.id = 'pm-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'pm-title');
    var x = document.createElement('button'); x.type = 'button'; x.id = 'pm-close'; x.setAttribute('aria-label', '닫기'); x.textContent = '×';
    x.addEventListener('click', close);
    dialog.appendChild(x);
    dialog.appendChild(buildSheet({ order: opts.order, pick: opts.pick, addon: opts.addon, onDone: opts.onDone }));
    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    document.body.classList.add('pm-lock');
    bindTrap(overlay, dialog);
    openState = { overlay: overlay, dialog: dialog, lastFocus: last, onDone: opts.onDone };
    var first = dialog.querySelector('input[name=pm-method],input[name=pm-pick],#pm-close');
    setTimeout(function () { (first || x).focus(); }, 30);
  }

  function mount(el, opts) {
    if (!el) return;
    el.innerHTML = '';
    if (!opts || !opts.order) {
      var p = document.createElement('p');
      p.textContent = '결제할 노래가 없어요. 내 노래 찾기에서 확인해 주세요.';
      var a = document.createElement('a'); a.href = 'status.html'; a.textContent = '내 노래 찾기';
      p.appendChild(document.createTextNode(' ')); p.appendChild(a);
      el.appendChild(p); return;
    }
    el.appendChild(buildSheet({ order: opts.order, pick: opts.pick, addon: opts.addon, inline: true, onDone: opts.onDone }));
  }

  window.BLOOME_PAY = { open: open, close: close, mount: mount, deadlineOf: deadlineOf };
})();
