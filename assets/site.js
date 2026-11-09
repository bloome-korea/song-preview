/* 공통: 푸터 사업자 정보 채우기 (config.js 의 BIZ) */
(function () {
  var B = (window.BLOOME_CONFIG || {}).BIZ || {};
  document.querySelectorAll('[data-biz]').forEach(function (el) {
    var v = B[el.getAttribute('data-biz')];
    el.textContent = v ? v : '확인 중';
    if (!v) el.classList.add('biz-pending');
  });
})();
