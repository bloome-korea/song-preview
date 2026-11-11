/* Bloome Song Studio (dark) — copy overrides for shared v1 widgets, without forking them.
   The review reward line is one sentence in the dark version: "정성스러운 후기를 남겨주시면 선물을 드려요." */
(function () {
  var LINE = '정성스러운 후기를 남겨주시면 선물을 드려요.';
  var RE = /리뷰를 남기신 모든 분께[^\n<]*?(상품권을 드려요\.|드려요\.)/;
  function fix(root) {
    if (!root || root.nodeType !== 1) return;
    var gifts = root.matches && root.matches('.rv-gift') ? [root] : root.querySelectorAll ? root.querySelectorAll('.rv-gift') : [];
    for (var i = 0; i < gifts.length; i++) if (gifts[i].textContent !== LINE) gifts[i].textContent = LINE;
    var msgs = root.matches && root.matches('.bc-m') ? [root] : root.querySelectorAll ? root.querySelectorAll('.bc-m') : [];
    for (var j = 0; j < msgs.length; j++) if (/스타벅스|스벅|상품권/.test(msgs[j].textContent)) msgs[j].innerHTML = msgs[j].innerHTML.replace(RE, LINE);
  }
  function start() {
    fix(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { for (var k = 0; k < m.addedNodes.length; k++) fix(m.addedNodes[k]); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
