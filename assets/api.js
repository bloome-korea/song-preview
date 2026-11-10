/* Bloome Song v16 공통: Apps Script 호출 · 로그인 세션 · 파일 변환 (checkout_v2: 구매확정·리뷰 안내 문구 추가) */
(function () {
  var C = window.BLOOME_CONFIG || {};
  var SS = window.sessionStorage, LS = window.localStorage;
  function post(body) {
    if (!C.APPS_SCRIPT_URL) return Promise.reject(new Error('not_ready'));
    // text/plain 으로 보내면 CORS 사전 요청(preflight)이 생기지 않습니다. 비밀번호는 URL 이 아니라 본문으로만.
    return fetch(C.APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body), redirect: 'follow' }).then(function (r) { return r.json(); });
  }
  function get(k) { try { return SS.getItem('bloome_' + k) || ''; } catch (e) { return ''; } }
  function set(k, v) { try { v ? SS.setItem('bloome_' + k, v) : SS.removeItem('bloome_' + k); } catch (e) {} }
  function auth() { var s = get('s'), t = get('t'); return s ? { s: s } : (t ? { t: t } : null); }
  function b64blob(b64, mime) { var s = atob(b64), n = s.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: mime || 'audio/mpeg' }); }
  function won(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'; }
  function inqKeys() { try { return JSON.parse(LS.getItem('bloome_inq') || '[]'); } catch (e) { return []; } }
  function addInqKey(k) { var a = inqKeys(); a.unshift(k); try { LS.setItem('bloome_inq', JSON.stringify(a.slice(0, 10))); } catch (e) {} }
  var MSG = {
    required: '빈칸을 채워 주세요.', phone: '휴대폰 번호를 다시 확인해 주세요. (예: 010-1234-5678)', email: '이메일 주소를 다시 확인해 주세요.',
    pin: '비밀번호는 숫자 4자리로 정해 주세요.', pin2: '비밀번호 확인이 달라요. 같은 숫자 4자리를 두 번 넣어 주세요.',
    pin_mismatch: '이미 가입된 아이디예요. 처음 정한 비밀번호 4자리를 넣어 주세요.',
    signup: '간편 회원가입에 동의해 주세요.', consent: '개인정보 수집·이용에 동의해 주세요.', story_short: '이야기를 조금 더 적어 주세요.',
    too_long: '입력한 내용이 너무 길어요.', too_fast: '방금 보내셨어요. 잠시 뒤에 다시 시도해 주세요.', too_many: '오늘 가능한 횟수를 넘었어요. 고객센터로 문의해 주세요.',
    closed: '지금은 신청을 잠시 받지 않고 있어요.', server: '잠시 문제가 생겼어요. 다시 시도해 주세요.', network: '연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.',
    not_ready: '아직 준비 중이에요.', bad_login: '아이디(휴대폰 번호 또는 이메일)나 비밀번호 4자리가 맞지 않아요.',
    locked: '비밀번호를 5번 틀려서 30분 동안 잠겼어요. 30분 뒤 다시 시도하시거나 고객센터로 문의해 주세요.',
    session: '로그인이 끝났어요. 다시 로그인해 주세요.', bad_token: '링크가 맞지 않거나 만료됐어요. 휴대폰 번호(또는 이메일)와 비밀번호로 찾아 주세요.',
    not_found: '주문을 찾지 못했어요.', not_paid: '결제 확인 후 받을 수 있어요.', too_big: '파일이 커서 바로 받을 수 없어요. 고객센터로 알려 주세요.',
    bad_audio: '미리듣기 파일을 여는 중 문제가 생겼어요. 고객센터로 알려 주세요.', no_order: '입금할 주문을 찾지 못했어요. 내 노래 찾기에서 확인해 주세요.',
    expired: '미리듣기를 보내 드린 뒤 24시간이 지나 이 노래의 듣기·결제가 닫혔어요. 고객센터에 문의해 주세요.', alt_used: '다른 버전은 주문당 한 번만 요청할 수 있어요.', contact: '연락받을 휴대폰 번호나 이메일을 다시 확인해 주세요.', bad_action: '잠시 문제가 생겼어요.',
    // checkout_v2: 구매확정 · 리뷰
    not_delivered: '전체곡을 받으신 뒤에 구매확정과 리뷰를 남길 수 있어요.', not_confirmed: '구매확정을 해주셔야 리뷰를 남길 수 있어요.',
    already_reviewed: '이미 리뷰를 남겨 주셨어요. 고마워요!', review_consent: '홈페이지 등 리뷰 사용에 동의해 주셔야 보낼 수 있어요.',
    review_short: '리뷰를 조금만 더 적어 주세요. (10자 이상)', refunded: '환불된 주문이라 리뷰를 남길 수 없어요.'
  };
  window.BLOOME = { C: C, post: post, get: get, set: set, auth: auth, b64blob: b64blob, won: won, MSG: MSG, inqKeys: inqKeys, addInqKey: addInqKey,
    msg: function (c) { return MSG[c] || MSG.server; } };
})();
