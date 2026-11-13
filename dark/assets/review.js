/* Bloome Song checkout_v2 — 구매확정 · 리뷰 팝업 (thanks.html)
   dark v12: 사진·영상 첨부를 리뷰 내용 칸 위로 올리고, 사진 칸에 스벅 1잔·영상 칸에 1만원 상품권 이미지를 넣음. 업로드·제출 로직은 checkout_v3과 동일.
   checkout_v3: 리뷰에 사진·영상 첨부 ('사진 올리기'·'영상 올리기'). 사진 6장(브라우저에서 JPEG 1600px·품질 0.82 로 줄임, 6MB까지) · 영상 2개(30MB까지).
     보내기 → 파일을 하나씩 나눠 올림(review_upload_start/chunk/finish) → 모두 끝나면 submit_review(media:[{fileId, kind}]).
     하나라도 실패하면 리뷰는 보내지 않고, 다시 누르면 실패한 것만 다시 올림. 올리는 중에는 닫기·두 번 보내기 막음(S.busy).
   흐름: 리뷰 남기기 → (구매확정 전) 확정 팝업 → confirm_purchase → 리뷰 작성(홈페이지 이용 동의 필수) → submit_review → '감사합니다~'
   이미 구매확정 → 바로 리뷰 작성. 이미 리뷰 → '이미 리뷰를 남겨 주셨어요'.
   접근성: role=dialog, aria-modal, 포커스 가두기, Esc·바깥 누르면 닫기, 닫으면 원래 버튼으로 포커스 (pay-modal.js 와 같은 방식) */
(function () {
  var B = window.BLOOME; if (!B) return;
  var MIN = 10, MAX = 2000;
  // checkout_v3: 첨부 한도 (서버 Code.gs CFG.REVIEW_* 와 같게)
  var MAXP = 6, MAXV = 2, PHOTO_MAX = 6 * 1024 * 1024, VIDEO_MAX = 30 * 1024 * 1024, EDGE = 1600, QUALITY = 0.82;
  var TYPES = { photo: { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/heic': '.heic', 'image/heif': '.heif' },
    video: { 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm', 'video/x-m4v': '.m4v', 'video/3gpp': '.3gp' } };
  var EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
    mp4: 'video/mp4', mov: 'video/quicktime', qt: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v', '3gp': 'video/3gpp', '3gpp': 'video/3gpp' };
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
    /* checkout_v3: 사진·영상 첨부 */
    '.rv-media{margin:16px 0 4px;padding:16px 14px;background:#fff;border:1px solid #d8cfc3;border-radius:8px}' +
    '.rv-media .rv-mh{display:block;margin:0 0 4px;font-size:18px;font-weight:700;color:#303633}.rv-media .rv-mh small{font-size:15px;font-weight:400;color:#8a817b}' +
    '.rv-media .rv-hint{margin:0 0 12px;font-size:15px;color:#6f655d;line-height:1.65}' +
    '.rv-pick{display:flex;gap:10px}' +
    '#rv-dialog .rv-pick button{flex:1;width:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:148px;margin:0;padding:12px 8px 10px;border:2px dashed #5C6068;border-radius:10px;background:#0F1012;color:#F1F1EE;font-family:inherit;font-size:16px;font-weight:700;line-height:1.35;cursor:pointer}' +
    '#rv-dialog .rv-pick button .rv-perk{display:block;width:72px;height:72px;margin:0 0 2px}' +
    '#rv-dialog .rv-pick button .rv-perk img{width:100%;height:100%;object-fit:contain;display:block;border-radius:10px}' +
    '#rv-dialog .rv-pick button .rv-perk-name{font-size:13px;font-weight:600;color:#F2B84B;letter-spacing:-.01em}' +
    '.rv-incentive{margin:16px 0 10px;padding:12px 14px;background:#1A1C20;border:1px dashed #F2B84B;border-radius:6px;font-size:15px;color:#F1F1EE;line-height:1.7;font-weight:500}' +
    '#rv-dialog .rv-pick button svg{width:30px;height:30px;display:block}#rv-dialog .rv-pick button small{font-size:14px;font-weight:400;color:#8a817b}' +
    '#rv-dialog .rv-pick button:focus-visible{outline:2px solid #8a6a4f;outline-offset:2px}#rv-dialog .rv-pick button[disabled]{opacity:.5;cursor:default}' +
    '#rv-dialog input.rv-file{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;border:0!important;opacity:0;overflow:hidden;clip:rect(0 0 0 0)}' +
    '.rv-thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 0;padding:0;list-style:none}.rv-thumbs:empty{display:none}' +
    '.rv-thumbs li{position:relative;padding-top:100%;background:#f1ebe2;border:1px solid #e0d5c6;border-radius:8px;overflow:hidden}' +
    '.rv-thumbs img,.rv-thumbs video,.rv-thumbs .rv-ph{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}' +
    '.rv-thumbs .rv-ph{display:flex;align-items:center;justify-content:center;text-align:center;padding:6px;font-size:13px;color:#8a817b;word-break:break-all;box-sizing:border-box}' +
    '#rv-dialog .rv-x{position:absolute;top:4px;right:4px;width:38px;height:38px;margin:0;padding:0;border:0;border-radius:50%;background:rgba(48,54,51,.78);color:#fff;font:24px/38px Arial,sans-serif;cursor:pointer}' +
    '#rv-dialog .rv-x[disabled]{opacity:.35;cursor:default}' +
    '.rv-tag{position:absolute;left:4px;bottom:4px;padding:2px 8px;border-radius:10px;background:rgba(48,54,51,.78);color:#fff;font:13px/1.4 Arial,sans-serif}' +
    '.rv-thumbs li.ok .rv-tag{background:#00704a}.rv-thumbs li.fail .rv-tag{background:#b04a1c}.rv-thumbs li.fail{border:2px solid #b04a1c}' +
    '.rv-mnote{margin:10px 0 0;font-size:15px;color:#8a2020}.rv-mnote:empty{display:none}' +
    '.rv-prog{margin-top:14px;font-size:17px;color:#303633;font-weight:700}.rv-prog small{display:block;font-size:14px;font-weight:400;color:#8a817b}' +
    '.rv-bar{height:12px;margin-top:6px;background:#eee4d7;border-radius:6px;overflow:hidden}.rv-bar i{display:block;height:100%;width:0;background:#00704a;transition:width .25s}' +
    '#rv-close[disabled]{opacity:.3;cursor:default}' +
    'body.rv-lock{overflow:hidden}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var S = null; /* {overlay, dialog, body, last, busy, order, onChange} */

  function focusables(root) {
    return [].slice.call(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.offsetParent !== null && !el.hidden && el.tabIndex >= 0; });
  }
  function close() {
    if (!S || S.busy) return;
    var s = S; freeMedia(); S = null;
    window.removeEventListener('beforeunload', onLeave);
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

  /* ---- checkout_v3: 사진·영상 ---- */
  function onLeave(e) { if (S && S.busy) { e.preventDefault(); e.returnValue = ''; return ''; } }
  function freeMedia() {   // 미리보기 object URL 모두 해제
    if (!S || !S.media) return;
    S.media.forEach(function (it) { it.removed = true; (it.urls || []).forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); it.urls = []; });
    S.media = [];
  }
  function mimeOf(file) {
    var t = String(file.type || '').toLowerCase().split(';')[0];
    if (t === 'image/jpg' || t === 'image/pjpeg') t = 'image/jpeg';
    if (t === 'image/heic-sequence') t = 'image/heic';
    if (t === 'image/heif-sequence') t = 'image/heif';
    if (t === 'video/m4v') t = 'video/x-m4v';
    if (!t || t === 'application/octet-stream') { var m = String(file.name || '').toLowerCase().match(/\.([a-z0-9]{2,4})$/); t = m && EXT[m[1]] ? EXT[m[1]] : t; }
    return t;
  }
  function errOf(r, kind) {   // 서버/브라우저 오류 → 문구 코드
    var c = (r && r.error) || 'review_upload';
    if (c === 'review_file_big') c = (r.kind || kind) === 'video' ? 'review_video_big' : 'review_photo_big';
    var e = new Error(c); e.code = c; return e;
  }
  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function postRetry(b, tries) {   // 연결이 끊긴 경우만 다시 (서버가 {ok:false} 로 답하면 그대로)
    return B.post(b).catch(function () {
      if (tries <= 1) throw errOf({ error: 'review_upload' });
      return wait(1500).then(function () { return postRetry(b, tries - 1); });
    });
  }
  function decodeImg(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { res({ img: im, done: function () { URL.revokeObjectURL(u); } }); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('decode')); };
      im.src = u;
    });
  }
  function canvasBlob(cv) {
    return new Promise(function (res) {
      if (cv.toBlob) { cv.toBlob(function (b) { res(b); }, 'image/jpeg', QUALITY); return; }
      try { var d = cv.toDataURL('image/jpeg', QUALITY); res(B.b64blob(d.slice(d.indexOf(',') + 1), 'image/jpeg')); } catch (e) { res(null); }
    });
  }
  // 사진: JPEG 로 줄이기(긴 쪽 1600px, 0.82 — 위치정보 등 EXIF 도 빠짐). 움직이는 GIF 는 6MB 이하면 그대로.
  // iPhone HEIC 를 브라우저가 못 열면 6MB 이하일 때만 원본 그대로.
  function preparePhoto(it) {
    var f = it.file;
    if (it.mime === 'image/gif' && f.size <= PHOTO_MAX) return Promise.resolve({ blob: f, mime: it.mime });
    return decodeImg(f).then(function (d) {
      var im = d.img, w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      if (!w || !h) { d.done(); throw new Error('decode'); }
      var sc = Math.min(1, EDGE / Math.max(w, h)), cw = Math.max(1, Math.round(w * sc)), ch = Math.max(1, Math.round(h * sc));
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); g.drawImage(im, 0, 0, cw, ch); d.done();
      return canvasBlob(cv).then(function (b) {
        cv.width = cv.height = 0;
        if (!b || !b.size) throw new Error('encode');
        return { blob: b, mime: 'image/jpeg' };
      });
    }).catch(function () {
      if (f.size <= PHOTO_MAX) return { blob: f, mime: it.mime };
      throw errOf({ error: 'review_photo_big' });
    }).then(function (r) {
      if (r.blob.size > PHOTO_MAX) throw errOf({ error: 'review_photo_big' });
      return r;
    });
  }
  function readB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result || ''); res(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { rej(errOf({ error: 'review_upload' })); };
      r.readAsDataURL(blob);
    });
  }
  function upName(it) {
    var base = String(it.file.name || (it.kind === 'photo' ? 'photo' : 'video')).replace(/\.[A-Za-z0-9]{2,4}$/, '').replace(/[\/\\]/g, '_').replace(/\.{2,}/g, '.').slice(0, 60);
    return base + TYPES[it.kind][it.upMime];
  }
  // 파일 하나: start → chunk × N(서버가 정한 크기로 차례대로) → finish
  function uploadOne(it, onPart) {
    var blob = it.blob;
    return postRetry(Object.assign({ action: 'review_upload_start', name: upName(it), mime: it.upMime, size: blob.size, kind: it.kind }, body()), 2).then(function (st) {
      if (!st || !st.ok) throw errOf(st, it.kind);
      var cs = st.chunkSize, total = st.total, i = 0;
      function next() {
        if (i >= total) return postRetry(Object.assign({ action: 'review_upload_finish', uploadId: st.uploadId }, body()), 3);
        return readB64(blob.slice(i * cs, Math.min(blob.size, (i + 1) * cs))).then(function (b64) {
          return postRetry(Object.assign({ action: 'review_upload_chunk', uploadId: st.uploadId, index: i, total: total, b64: b64 }, body()), 3);
        }).then(function (r) {
          if (!r || !r.ok) throw errOf(r, it.kind);
          i = Math.max(i + 1, r.received || 0); onPart(i / total); return next();
        });
      }
      return next();
    }).then(function (r) {
      if (!r || !r.ok || !r.fileId) throw errOf(r, it.kind);
      it.fileId = r.fileId; return r;
    });
  }
  function icon(kind) {
    return kind === 'photo'
      ? '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="7" width="26" height="19" rx="3" fill="none" stroke="#8a6a4f" stroke-width="2"/><circle cx="16" cy="16.5" r="5" fill="none" stroke="#8a6a4f" stroke-width="2"/><path d="M11 7l2-3h6l2 3" fill="none" stroke="#8a6a4f" stroke-width="2"/></svg>'
      : '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="8" width="19" height="16" rx="3" fill="none" stroke="#8a6a4f" stroke-width="2"/><path d="M22 14l7-4v12l-7-4z" fill="none" stroke="#8a6a4f" stroke-width="2" stroke-linejoin="round"/></svg>';
  }
  function mmss(sec) { sec = Math.round(sec || 0); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }

  /* 1) 구매확정 팝업 */
  function confirmView() {
    freeMedia();
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

  /* 2) 리뷰 작성 (checkout_v3: 사진·영상 첨부) */
  function formView() {
    freeMedia();
    var f = document.createElement('form'); f.noValidate = true; f.id = 'rv-form';
    var lead = el('p', 'rv-p', '받으신 분의 표정, 처음 들었을 때의 모습… 편하게 적어 주시고, 사진이나 영상도 함께 올려 주세요.');
    var lab = el('label', 'rv-label', '리뷰 내용'); lab.htmlFor = 'rv-text';
    var ta = document.createElement('textarea'); ta.id = 'rv-text'; ta.name = 'text'; ta.rows = 6; ta.maxLength = MAX; ta.required = true;
    ta.setAttribute('aria-describedby', 'rv-count');
    var cnt = el('span', 'rv-count', '0 / ' + MAX); cnt.id = 'rv-count';
    ta.addEventListener('input', function () { cnt.textContent = ta.value.length + ' / ' + MAX; });

    /* 사진·영상 첨부 */
    var md = el('div', 'rv-media'); md.setAttribute('role', 'group'); md.setAttribute('aria-labelledby', 'rv-mh');
    var mh = el('span', 'rv-mh'); mh.id = 'rv-mh'; mh.innerHTML = '사진·영상 첨부 <small>(선택)</small>';
    var hint = el('p', 'rv-hint', '노래를 듣는 모습, 받으신 분의 표정이 담긴 사진·영상이면 더 좋아요. 사진 6장 · 영상 2개까지 올릴 수 있어요. (영상은 1분 안팎)');
    var pick = el('div', 'rv-pick');
    function picker(kind) {
      var inp = document.createElement('input'); inp.type = 'file'; inp.className = 'rv-file'; inp.id = kind === 'photo' ? 'rv-photo' : 'rv-video';
      inp.accept = kind === 'photo' ? 'image/*' : 'video/*'; inp.multiple = true; inp.tabIndex = -1; inp.setAttribute('aria-hidden', 'true');
      // capture 속성은 넣지 않음 → iPhone 에서 '사진 보관함'·'카메라' 둘 다 고를 수 있음
      var btn = el('button'); btn.type = 'button'; btn.id = kind === 'photo' ? 'rv-pick-photo' : 'rv-pick-video';
      btn.innerHTML = '<span class="rv-perk" aria-hidden="true"><img src="assets/review-gift-' + (kind === 'photo' ? 'starbucks' : 'voucher') + '.svg" alt=""></span>' +
        '<span class="rv-perk-name">' + (kind === 'photo' ? '스타벅스 1잔' : '1만원 상품권') + '</span>' +
        '<span>' + (kind === 'photo' ? '사진 올리기' : '영상 올리기') + '</span><small></small>';
      btn.onclick = function () { if (!S.busy) { mnote.textContent = ''; inp.click(); } };
      inp.addEventListener('change', function () { var list = [].slice.call(inp.files || []); inp.value = ''; addFiles(kind, list); });
      pick.appendChild(btn); pick.appendChild(inp);
      return btn;
    }
    var bP = picker('photo'), bV = picker('video');
    var thumbs = el('ul', 'rv-thumbs'); thumbs.setAttribute('aria-label', '올릴 사진·영상');
    var mnote = el('p', 'rv-mnote'); mnote.setAttribute('role', 'status'); mnote.setAttribute('aria-live', 'polite');
    md.appendChild(mh); md.appendChild(hint); md.appendChild(pick); md.appendChild(thumbs); md.appendChild(mnote);

    function count(kind) { return S.media.filter(function (it) { return it.kind === kind; }).length; }
    function refresh() {
      var np = count('photo'), nv = count('video');
      bP.querySelector('small').textContent = np + ' / ' + MAXP + '장'; bV.querySelector('small').textContent = nv + ' / ' + MAXV + '개';
      bP.disabled = S.busy || np >= MAXP; bV.disabled = S.busy || nv >= MAXV;
      var n = { photo: 0, video: 0 };
      S.media.forEach(function (it) {
        n[it.kind]++;
        it.x.disabled = S.busy;
        it.x.setAttribute('aria-label', (it.kind === 'photo' ? '사진 ' : '영상 ') + n[it.kind] + ' 빼기');
        it.li.className = it.state === 'ok' ? 'ok' : (it.state === 'fail' ? 'fail' : '');
        it.tag.textContent = it.state === 'prep' ? '준비 중…' : it.state === 'up' ? '올리는 중…' : it.state === 'ok' ? '올림 ✓' : it.state === 'fail' ? '다시 올릴게요' :
          (it.kind === 'video' ? '영상' + (it.dur ? ' ' + mmss(it.dur) : '') : '사진');
      });
    }
    function remove(it) { if (!S.busy) drop(it); }
    function drop(it) {
      var i = S.media.indexOf(it); if (i >= 0) S.media.splice(i, 1);
      it.removed = true;
      (it.urls || []).forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); it.urls = [];
      if (it.li.parentNode) it.li.parentNode.removeChild(it.li);
      refresh();
    }
    var prepChain = Promise.resolve();
    function addFiles(kind, list) {
      var max = kind === 'photo' ? MAXP : MAXV, left = max - count(kind), notes = [];
      list.forEach(function (file) {
        var mime = mimeOf(file);
        if (!TYPES[kind][mime]) { notes.push(B.msg('review_file_type')); return; }
        if (kind === 'video' && file.size > VIDEO_MAX) { notes.push(B.msg('review_video_big')); return; }
        if (left <= 0) { notes.push(B.msg('review_file_many')); return; }
        left--;
        var it = { kind: kind, file: file, mime: mime, urls: [], state: 'prep', fileId: '' };
        var li = el('li'), url = URL.createObjectURL(file); it.urls.push(url);
        var media;
        if (kind === 'photo') {
          media = document.createElement('img'); media.alt = ''; media.src = url;
          media.onerror = function () { var ph = el('span', 'rv-ph', '사진\n' + (file.name || '')); ph.style.whiteSpace = 'pre-line'; if (media.parentNode) media.parentNode.replaceChild(ph, media); };
        } else {
          media = document.createElement('video'); media.muted = true; media.setAttribute('muted', ''); media.playsInline = true; media.setAttribute('playsinline', '');
          media.preload = 'metadata'; media.src = url + '#t=0.1';
          media.addEventListener('loadedmetadata', function () { if (isFinite(media.duration)) { it.dur = media.duration; refresh(); } });
          media.onerror = function () { var ph = el('span', 'rv-ph', '영상\n' + (file.name || '')); ph.style.whiteSpace = 'pre-line'; if (media.parentNode) media.parentNode.replaceChild(ph, media); };
        }
        var tag = el('span', 'rv-tag'), x = el('button', 'rv-x', '×'); x.type = 'button';
        x.onclick = function () { remove(it); (bP.disabled ? bV : bP).focus(); };
        li.appendChild(media); li.appendChild(tag); li.appendChild(x);
        it.li = li; it.tag = tag; it.x = x; it.media = media;
        S.media.push(it); thumbs.appendChild(li);
        // 사진은 하나씩 차례로 줄이기 (오래된 휴대폰 메모리 보호)
        it.prep = prepChain = prepChain.then(function () {
          if (it.removed) return;
          return (kind === 'photo' ? preparePhoto(it) : Promise.resolve({ blob: file, mime: mime })).then(function (r) {
            it.blob = r.blob; it.upMime = r.mime; it.state = 'ready';
            if (kind === 'photo' && r.blob !== file && !it.removed && S) {   // 줄인 사진으로 미리보기 교체 (HEIC → JPEG 이면 보이게 됨)
              var u2 = URL.createObjectURL(r.blob); it.urls.push(u2);
              var img = document.createElement('img'); img.alt = ''; img.src = u2;
              var cur = it.li.firstChild; if (cur) it.li.replaceChild(img, cur);
              try { URL.revokeObjectURL(url); } catch (e) {}
            }
          }).catch(function (e) {
            if (it.removed || !S) return;
            mnote.textContent = B.msg(e && e.code) + ' (그 사진은 빼 두었어요)';
            drop(it);
          }).then(function () { if (S && !it.removed) refresh(); });
        });
      });
      if (notes.length) mnote.textContent = notes.filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' ');
      refresh();
    }
    refresh();

    var incentive = el('p', 'rv-incentive');
    incentive.textContent = '사진을 포함해서 정성스레 리뷰를 남겨주시면 무조건 스타벅스 1잔, 단 사진에는 인물이 있어야 해요';
    var ag = el('label', 'rv-agree');
    ag.innerHTML = '<input type="checkbox" id="rv-agree" name="consent" required aria-required="true"><span>리뷰와 첨부하신 사진·영상이 블루메송 홈페이지 등에 사용될 수 있어요. 이에 동의합니다. <b>(필수)</b><small>동의하셔야 리뷰를 보낼 수 있어요.</small></span>';
    var er = errBox();
    var prog = el('div', 'rv-prog'); prog.hidden = true; prog.setAttribute('role', 'status'); prog.setAttribute('aria-live', 'polite');
    var progT = el('span'), progS = el('small', '', '창을 닫지 말고 잠시만 기다려 주세요.'), bar = el('div', 'rv-bar'), barI = el('i');
    bar.appendChild(barI); prog.appendChild(progT); prog.appendChild(progS); prog.appendChild(bar);
    var send = el('button', 'rv-btn', '리뷰 보내기'); send.type = 'submit'; send.id = 'rv-send'; send.style.marginTop = '16px';
    // 첨부 영역을 리뷰 내용 칸보다 위에 두어 사진·영상 첨부를 먼저 유도. 업로드는 기존처럼 S.media 에 합쳐 전송.
    f.appendChild(md); f.appendChild(incentive); f.appendChild(lab); f.appendChild(ta); f.appendChild(cnt); f.appendChild(ag); f.appendChild(er); f.appendChild(prog); f.appendChild(send);

    function setBusy(on) {
      S.busy = on; send.disabled = on; ta.readOnly = on;
      var agr = f.querySelector('#rv-agree'); if (agr) agr.disabled = on;
      if (S.close) S.close.disabled = on;
      if (!on) { prog.hidden = true; send.textContent = '리뷰 보내기'; }
      refresh();
    }
    function showProg(text, frac) { prog.hidden = false; progT.textContent = text; barI.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%'; }
    function uploadAll() {
      var todo = S.media.filter(function (it) { return !it.fileId; });
      if (!todo.length) return Promise.resolve();
      var tot = 0, done = 0; todo.forEach(function (it) { tot += it.blob.size; });
      var np = todo.filter(function (it) { return it.kind === 'photo'; }).length, nv = todo.length - np, ip = 0, iv = 0;
      todo.sort(function (a, b) { return a.kind === b.kind ? 0 : (a.kind === 'photo' ? -1 : 1); });   // 사진 먼저
      return todo.reduce(function (p, it) {
        return p.then(function () {
          var label = it.kind === 'photo' ? '사진 올리는 중… ' + (++ip) + '/' + np : '영상 올리는 중…' + (nv > 1 ? ' ' + (++iv) + '/' + nv : '');
          it.state = 'up'; refresh();
          var size = it.blob.size;
          showProg(label, done / tot); send.textContent = label;
          return uploadOne(it, function (part) {
            showProg(label + (it.kind === 'video' ? ' ' + Math.round(part * 100) + '%' : ''), (done + size * part) / tot);
          }).then(function () { done += size; it.state = 'ok'; refresh(); }, function (e) { it.state = 'fail'; refresh(); throw e; });
        });
      }, Promise.resolve());
    }
    function fail(code) {
      if (code === 'already_reviewed') { changed({ reviewed: true }); setBusy(false); alreadyView(); return; }
      if (code === 'not_confirmed') { changed({ purchaseConfirmed: false }); setBusy(false); confirmView(); return; }
      // 형식·크기 때문에 서버가 거절한 파일은 빼고 알려 드림 (다시 눌러도 안 되므로)
      if (code === 'review_file_type' || code === 'review_photo_big' || code === 'review_video_big') {
        S.media.filter(function (it) { return it.state === 'fail'; }).forEach(drop);
      }
      setBusy(false); er.hidden = false; er.textContent = B.msg(code) + (code === 'review_file_type' || /_big$/.test(code) ? ' (그 파일은 빼 두었어요)' : '');
      try { er.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (S.busy) return; er.hidden = true;
      var text = ta.value.trim(), agree = f.querySelector('#rv-agree');
      if (text.replace(/\s/g, '').length < MIN) { er.hidden = false; er.textContent = B.msg('review_short'); ta.focus(); return; }
      if (!agree.checked) { er.hidden = false; er.textContent = B.msg('review_consent'); agree.focus(); return; }
      setBusy(true); send.textContent = S.media.length ? '사진·영상 준비 중…' : '보내는 중…';
      Promise.all(S.media.map(function (it) { return it.prep; })).then(uploadAll).then(function () {
        var media = S.media.map(function (it) { return { fileId: it.fileId, kind: it.kind }; });
        send.textContent = '보내는 중…'; if (media.length) showProg('리뷰 보내는 중…', 1);
        return B.post(Object.assign({ action: 'submit_review', text: text, consent: true, media: media }, body())).then(function (r) {
          if (r && r.ok) { changed({ reviewed: true }); setBusy(false); doneView(media.length > 0); return; }
          if (r && r.error === 'review_upload') S.media.forEach(function (it) { it.fileId = ''; it.state = 'ready'; });   // 파일을 못 찾음 → 다음에 다시 올림
          fail(r && r.error);
        }, function () { fail('network'); });
      }).catch(function (e) { if (S) fail((e && e.code) || 'review_upload'); });
    });
    view([el('span', 'rv-kicker', 'REVIEW'), title('노래는 어떠셨나요?'), lead, f], '#rv-text');
  }

  var HEART = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#f4eee6" stroke="#cdb9a2" stroke-dasharray="3 4"/><path d="M32 46s-13-8.2-13-17a7.5 7.5 0 0 1 13-5 7.5 7.5 0 0 1 13 5c0 8.8-13 17-13 17z" fill="#c44b32"/></svg>';
  /* 3) 감사합니다~ */
  function doneView(withMedia) {
    freeMedia();
    var d = el('div', 'rv-done'); d.setAttribute('role', 'status');
    d.innerHTML = HEART; var big = el('span', 'rv-big', '감사합니다~'); big.id = 'rv-title'; big.tabIndex = -1; d.appendChild(big);
    d.appendChild(el('p', 'rv-p', (withMedia ? '소중한 리뷰와 사진·영상 잘 받았어요.' : '소중한 리뷰 잘 받았어요.') + '\n선물은 등록하신 휴대폰 혹은 이메일로 보내 드릴게요.')).style.whiteSpace = 'pre-line';
    var ok = el('button', 'rv-btn', '확인'); ok.type = 'button'; ok.id = 'rv-ok'; ok.onclick = close;
    view([d, ok], '#rv-ok');
  }
  function alreadyView() {
    freeMedia();
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
    S = { overlay: overlay, dialog: dialog, body: b, close: x, last: document.activeElement, busy: false, order: opts.order, onChange: opts.onChange, media: [] };
    window.addEventListener('beforeunload', onLeave);
    if (opts.order.reviewed) alreadyView();
    else if (opts.order.purchaseConfirmed) formView();
    else confirmView();
  }
  window.BLOOME_REVIEW = { start: start, close: close };
})();
