/* 블루메 송 (dark) — 신청 맨 앞 '어떤 영상으로 만들까요?' 선택 (free 흐름).
   고른 값은 localStorage 'bloome_video_type' (photo|image) → create.js payload 의 video_type 으로 전송.
   ① photo: 유튜브에 올리지 않고 다운로드 형태로만 저장 · 별도 비용(금액은 표기하지 않음)  ② image: 유튜브 업로드 · 무료 */
(function () {
  var KEY = 'bloome_video_type', gate = document.getElementById('vt-gate'), form = document.getElementById('create');
  if (!gate || !form) return;
  var LABEL = { photo: '① 내 사진·영상으로 만들기', image: '② 예쁜 이미지로 만들기' };
  function get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  var pill = document.getElementById('vt-pill');
  function open() { gate.hidden = false; form.hidden = true; document.body.classList.add('vt-open'); window.scrollTo(0, 0);
    var v = get(); [].forEach.call(gate.querySelectorAll('.vt-card'), function (c) { c.setAttribute('aria-pressed', String(c.dataset.vt === v)); }); }
  function close() { gate.hidden = true; form.hidden = false; document.body.classList.remove('vt-open'); var v = get();
    if (pill) { pill.hidden = !v; pill.querySelector('b').textContent = LABEL[v] || ''; } }
  [].forEach.call(gate.querySelectorAll('.vt-card'), function (c) {
    c.addEventListener('click', function () { set(c.dataset.vt); [].forEach.call(gate.querySelectorAll('.vt-card'), function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      try { (window.dataLayer = window.dataLayer || []).push({ event: 'video_type', video_type: c.dataset.vt }); } catch (e) {}
      setTimeout(close, 160); });
  });
  if (pill) pill.querySelector('button').addEventListener('click', open);
  // 링크로 새로 들어오면(홈 CTA 등) 항상 선택 화면부터. 새로고침/뒤로가기로 중간 단계에 돌아온 경우만 바로 이어서.
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  var resume = (nav.type === 'reload' || nav.type === 'back_forward') && get() && /#step-[2-8]/.test(location.hash);
  if (resume) close(); else open();
  window.BLOOME_VIDEO = { get: get, open: open };
})();
