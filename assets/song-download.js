/* Bloome Song checkout_v2 — 전체곡 파일 받기 공용 (status.html · thanks.html)
   서버 full 액션 → Blob → <a download> 클릭. Blob URL 은 바로 지우지 않고 2분 뒤 해제(다운로드가 끊기지 않게).
   성공하면 완료 페이지(thanks.html) 주소를 돌려줌. */
(function () {
  var B = window.BLOOME; if (!B) return;
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function thanksUrl(orderId) {
    var s = B.get('s'), t = B.get('t');
    return 'thanks.html?order=' + encodeURIComponent(orderId) + (!s && t ? '&t=' + encodeURIComponent(t) : '');
  }
  function download(orderId, song) {
    return B.post(Object.assign({ action: 'full', order: orderId, song: song || 1 }, B.auth())).then(function (r) {
      if (!r || !r.ok) return r || { ok: false, error: 'server' };
      var u = URL.createObjectURL(B.b64blob(r.b64, r.mime)), x = document.createElement('a');
      x.href = u; x.download = r.name || ('BloomeSong_' + orderId + '.mp3'); x.style.display = 'none';
      document.body.appendChild(x); x.click();
      setTimeout(function () { x.remove(); }, 0);
      setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} }, 120000);
      B.set('dl_' + orderId + '_' + (song || 1), '1');   // 이 탭에서 받은 곡 표시 (완료 페이지의 '받기/다시 받기' 문구용)
      return { ok: true, name: r.name };
    });
  }
  // 다운로드가 시작될 시간을 준 뒤 이동 (iOS 는 '다운로드할까요?' 확인창 때문에 조금 더 기다림)
  B.download = download; B.thanksUrl = thanksUrl; B.afterDownloadDelay = IOS ? 3000 : 1600;
})();
