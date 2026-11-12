/* Bloome Song — 친구에게 공유하기 (홈·완료 페이지 공통) */
(function () {
  var HOME = 'https://bloomesong.com/';
  var TITLE = '블루메 송 스튜디오 | 사연으로 만드는 맞춤 노래';
  function ensureToast() {
    var t = document.getElementById('share-toast');
    if (t) return t;
    t = document.createElement('div');
    t.id = 'share-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.textContent = '링크가 복사됐어요';
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:#3e463e;color:#fff;padding:12px 18px;border-radius:999px;font-size:15px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;z-index:80;white-space:nowrap;font-family:"IBM Plex Sans KR",system-ui,sans-serif';
    document.body.appendChild(t);
    return t;
  }

  function showToast(msg) {
    var t = ensureToast();
    t.textContent = msg || '링크가 복사됐어요';
    t.classList.add('show');
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      t.classList.remove('show');
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2200);
  }

  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(HOME).then(function () {
        showToast('링크가 복사됐어요');
      }).catch(function () { fallbackCopy(); });
    }
    return Promise.resolve(fallbackCopy());
  }

  function fallbackCopy() {
    var ta = document.createElement('textarea');
    ta.value = HOME;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('링크가 복사됐어요');
    } catch (e) {
      showToast('링크: ' + HOME);
    }
    document.body.removeChild(ta);
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: TITLE, url: HOME }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        copyLink();
      });
      return;
    }
    copyLink();
  }

  function bind(root) {
    (root || document).querySelectorAll('[data-share]').forEach(function (el) {
      if (el._shareBound) return;
      el._shareBound = true;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        share();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bind(); });
  } else {
    bind();
  }

  window.BLOOME_SHARE = { share: share, copyLink: copyLink, HOME: HOME, bind: bind };
})();
