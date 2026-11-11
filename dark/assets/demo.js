/* Bloome Song Studio (dark) — demo mode for status.html / thanks.html / checkout.html.
   Active only with ?demo=<state>. It replaces BLOOME.post with local mock answers, so NO request reaches
   the Apps Script API (no 첫오픈 stamp, no payment, no sheet writes). Without ?demo this file does nothing.
   States: 1|fresh, two, discount, paid, addon, delivered, reviewed, expired, prepay, login */
(function () {
  var q = new URLSearchParams(location.search), st = q.get('demo');
  var B = window.BLOOME; if (!st || !B) return;
  if (st === '1') st = 'fresh';
  var DEMO_ID = 'DEMO-0001', MEM = {}, SS = window.sessionStorage;
  var TIERS = [{ h: 1, amount: 9900, label: '1시간 이내' }, { h: 12, amount: 19800, label: '1~12시간' }, { h: Infinity, amount: 29800, label: '12~24시간' }];
  function half(n) { return Math.round(n * 0.5 / 10) * 10; }
  function both(p) { p.secondAmount = half(p.amount); p.bothAmount = p.amount + p.secondAmount; return p; }
  function kst(ms) { var d = new Date(ms + 9 * 3600000), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()); }
  function ss(k, v) { try { if (v === undefined) return SS.getItem('bloome_demo_' + st + '_' + k); SS.setItem('bloome_demo_' + st + '_' + k, v); } catch (e) { return null; } }
  // 첫오픈 시각: 이 탭에서 처음 미리듣기를 불러온 때 (새로고침해도 유지, 탭을 닫으면 처음부터)
  function firstOpen() { var v = ss('first'); return v ? +v : null; }
  function stampFirst() { if (!firstOpen()) ss('first', String(Date.now())); }
  if (st === 'expired' && !firstOpen()) ss('first', String(Date.now() - 25 * 3600000));
  var paid = /^(paid|addon|delivered|reviewed)$/.test(st), reviewed = st === 'reviewed' || ss('reviewed') === '1';
  function price() {
    if (paid) return { amount: 9900, tier: '1시간 이내', locked: true, pick: st === 'addon' ? '1' : '1' };
    if (st === 'prepay') return { amount: 9900, tier: '선결제', fixed: true, prepay: true };
    if (st === 'discount') return both({ amount: 14900, tier: '특별 할인가', discount: true, regular: 29800, endsAt: kst(Date.now() + 71 * 3600000 + 1800000).slice(0, 16), endsInSec: 71 * 3600 + 1800 });
    var at = firstOpen();
    if (!at) return both({ amount: TIERS[0].amount, tier: TIERS[0].label, notStarted: true, nextAmount: TIERS[1].amount, fullSec: 3600 });
    var hrs = (Date.now() - at) / 3600000;
    for (var i = 0; i < TIERS.length; i++) if (hrs < TIERS[i].h) { var nx = TIERS[i + 1];
      return both({ amount: TIERS[i].amount, tier: TIERS[i].label, firstOpenAt: kst(at), nextAmount: nx ? nx.amount : null, nextInSec: nx ? Math.ceil((at + TIERS[i].h * 3600000 - Date.now()) / 1000) : null }); }
  }
  function order() {
    var at = firstOpen(), exp = !paid && st !== 'discount' && at && Date.now() - at >= 24 * 3600000;
    var two = st === 'two' || st === 'addon';
    return { orderId: DEMO_ID, date: kst(Date.now()).slice(0, 10), purpose: '생일', recipient: '지은', status: st === 'prepay' ? '선결제대기' : (st === 'delivered' || st === 'reviewed' ? '완료' : '미리듣기발송'),
      hasPreview: st !== 'prepay', hasSong2: two, pick: '1', canDownload1: paid, canDownload2: paid && st !== 'addon' && two,
      addon: st === 'addon' ? { song: '2', amount: 4950, state: '' } : null,
      prepay: st === 'prepay', clockStarted: !!at, reopened: st === 'discount', firstOpenAt: at ? kst(at) : '',
      paid: paid, depositRequested: false, canDownload: paid, delivered: st === 'delivered' || st === 'reviewed', purchaseConfirmed: st === 'reviewed',
      confirmedAt: '', reviewed: reviewed, price: price(), altRequested: false, repeat: false, expired: !!exp,
      expireInSec: !paid && st !== 'discount' && at && !exp ? Math.max(0, Math.ceil((at + 24 * 3600000 - Date.now()) / 1000)) : null };
  }
  function list() { return { ok: true, idLabel: '010-****-1234', uid: '', viaToken: true, orders: [order()], serverNow: kst(Date.now()) }; }
  var b64cache = {};
  function b64(url) {
    if (b64cache[url]) return b64cache[url];
    return (b64cache[url] = fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      var u = new Uint8Array(buf), s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }));
  }
  var base = location.pathname.replace(/[^/]*$/, '');
  var SONG = { 1: base + 'assets/hero_60s.mp3', 2: base + 'assets/sample3_60s.mp3' };
  function later(v, ms) { return new Promise(function (res) { setTimeout(function () { res(v); }, ms || 250); }); }
  B.MSG.demo = '데모 화면이라 실제 결제·전송은 하지 않아요. 실제 주문에서는 이 버튼으로 결제가 진행돼요.';
  B.post = function (body) {
    var a = body.action;
    if (a === 'orders') return later(MEM.s || MEM.t ? list() : { ok: false, error: 'session' });
    if (a === 'login') { MEM.s = 'demo-session'; var r = list(); r.viaToken = false; r.s = MEM.s; r.idLabel = body.id || '데모'; return later(r, 400); }
    if (a === 'logout') return later({ ok: true });
    if (a === 'preview') { if (order().expired) return later({ ok: false, error: 'expired' });
      return b64(SONG[body.song == 2 ? 2 : 1]).then(function (x) { if (!paid) stampFirst(); return { ok: true, mime: 'audio/mpeg', seconds: 60, b64: x, order: order() }; }); }
    if (a === 'full') return b64(SONG[body.song == 2 ? 2 : 1]).then(function (x) { return { ok: true, mime: 'audio/mpeg', b64: x, name: 'BloomeSong_DEMO_' + (body.song || 1) + '.mp3' }; });
    if (a === 'confirm_purchase') return later({ ok: true, order: order() });
    if (a === 'review_upload_start') return later({ ok: true, uploadId: 'demo-up-' + Date.now() });
    if (a === 'review_upload_chunk' || a === 'review_upload_finish') return later({ ok: true, fileId: 'demo' }, 120);
    if (a === 'submit_review') { ss('reviewed', '1'); reviewed = true; return later({ ok: true }); }
    if (a === 'inquiries') return later({ ok: true, items: [] });
    if (a === 'pay_request' && body.mode === 'check') return later({ ok: true });
    return later({ ok: false, error: 'demo' }, 300);   // pay_request · deposit · alt_version · inquiry …
  };
  // 데모 세션은 이 탭 메모리에만 (실제 로그인 정보와 섞이지 않게)
  if (st !== 'login') MEM.t = 'demo';
  B.get = function (k) { return MEM[k] || ''; };
  B.set = function (k, v) { if (v) MEM[k] = v; else delete MEM[k]; };
  B.auth = function () { return MEM.s ? { s: MEM.s } : (MEM.t ? { t: MEM.t } : null); };
  function patchThanks() { if (B.thanksUrl) B.thanksUrl = function (id) { return 'thanks.html?order=' + encodeURIComponent(id) + '&demo=' + encodeURIComponent(st === 'fresh' ? '1' : st); }; }
  patchThanks(); document.addEventListener('DOMContentLoaded', patchThanks);
  // 데모 안에서 이동해도 데모가 이어지게 (status · thanks · checkout)
  function keep(u) { try { var x = new URL(u, location.href); if (x.origin === location.origin && /\/(status|thanks|checkout)\.html$/.test(x.pathname) && !x.searchParams.get('demo')) { x.searchParams.set('demo', st === 'fresh' ? '1' : st); return x.pathname + x.search + x.hash; } } catch (e) {} return u; }
  document.addEventListener('click', function (e) { var l = e.target.closest && e.target.closest('a[href]'); if (l) l.setAttribute('href', keep(l.getAttribute('href'))); }, true);
  var bar = document.createElement('div'); bar.className = 'dk-demo'; bar.setAttribute('role', 'note'); bar.textContent = '데모 화면이에요 · 실제 결제·전송은 되지 않아요';
  document.body.insertBefore(bar, document.body.firstChild);
  if (st !== 'login') document.documentElement.classList.add('token-boot');
})();
