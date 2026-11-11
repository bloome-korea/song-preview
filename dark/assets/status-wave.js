/* Bloome Song Studio (dark) — waveform for the v1 preview players on status.html (1번/2번 곡 1분 미리듣기).
   It does not replace anything: it finds the <audio> that status.html's own previewUI() creates and attaches a
   waveform to that same element. v1 play/pause/fade/loop stay in status.html. As a backup, when playback reaches
   the 60s cap it also calls audio._onPreviewLoop (opens the payment panel) in case timeupdate is sparse.
   - amber progress fill synced to currentTime · sine undulation only while playing · freeze on pause
   - tap/drag/arrow keys seek (sets audio.currentTime) · prefers-reduced-motion: fill only
   Bars come from the real audio when it can be decoded locally (blob URL), else from a soft placeholder shape. */
(function () {
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mq && mq.matches); }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); }
  var N = function () { return window.innerWidth >= 900 ? 64 : 44; };

  function placeholder(n, seed) {
    var a = [], x = seed || 7;
    for (var i = 0; i < n; i++) { x = (x * 9301 + 49297) % 233280; var r = x / 233280;
      a.push(0.35 + 0.4 * Math.abs(Math.sin(i * 0.37 + seed)) + 0.25 * r); }
    return a;
  }
  function peaksFrom(url, n) {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC || !url) return Promise.reject();
    return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      var ctx = new AC();
      return new Promise(function (res, rej) { ctx.decodeAudioData(buf, res, rej); }).then(function (ab) {
        try { ctx.close(); } catch (e) {}
        var d = ab.getChannelData(0), step = Math.floor(d.length / n), out = [];
        for (var i = 0; i < n; i++) { var m = 0, s = i * step; for (var j = 0; j < step; j += 16) { var v = Math.abs(d[s + j]); if (v > m) m = v; } out.push(m); }
        var mx = Math.max.apply(null, out) || 1; return out.map(function (v) { return Math.max(0.12, v / mx); });
      });
    });
  }

  function attach(au) {
    if (au._wv) return; au._wv = true;
    var host = au.parentNode, card = au.closest('article.order');
    var wv = document.createElement('div'); wv.className = 'wv dkwv';
    wv.setAttribute('role', 'slider'); wv.tabIndex = 0; wv.setAttribute('aria-label', '미리듣기 재생 위치');
    wv.setAttribute('aria-valuemin', '0'); wv.setAttribute('aria-valuemax', '100'); wv.setAttribute('aria-valuenow', '0');
    var tm = document.createElement('div'); tm.className = 'dkwv-time'; tm.innerHTML = '<span class="now">00:00</span> / <span class="len">01:00</span>';
    au.classList.add('has-wv');
    host.insertBefore(wv, au); host.insertBefore(tm, au);
    var bars = [], lit = -1, raf = 0;
    function build(pk) {
      wv.innerHTML = ''; bars = [];
      pk.forEach(function (v) { var i = document.createElement('i'); i.style.height = Math.max(10, Math.round(v * 80)) + '%'; wv.appendChild(i); bars.push(i); });
      lit = -1; paint();
    }
    var seed = 0; (card && card.dataset.order || 'x').split('').forEach(function (c) { seed += c.charCodeAt(0); });
    build(placeholder(N(), (seed % 13) + (/pv2/.test(host.innerHTML) ? 5 : 1)));
    var lastSrc = '';
    function loadPeaks() { var s = au.currentSrc || au.src; if (!s || s === lastSrc) return; lastSrc = s; peaksFrom(s, N()).then(build).catch(function () {}); }
    var cap = 60; // v1 fade() loops at min(duration, preview seconds); learn that from window.__bloomeFade
    function len() { var d = au.duration; d = d && isFinite(d) ? d : cap; return Math.min(d, cap); }
    au.addEventListener('timeupdate', function () { var f = window.__bloomeFade; if (f && f.len > 0 && Math.abs(f.t - au.currentTime) < 0.01) cap = f.len; });
    var looped = false;
    function maybeLoop(t, L) {
      if (t >= L - 0.12 && !au.paused) {
        if (!looped) { looped = true; if (typeof au._onPreviewLoop === 'function') au._onPreviewLoop(); }
      } else if (t < 1) looped = false;
    }
    function paint() {
      var L = len(), t = au.currentTime || 0, r = Math.min(1, Math.max(0, t / L)), k = Math.round(r * bars.length);
      if (k !== lit) { for (var i = 0; i < bars.length; i++) bars[i].classList.toggle('on', i < k); lit = k; }
      tm.firstChild.textContent = fmt(t); tm.lastChild.textContent = fmt(L);
      wv.setAttribute('aria-valuenow', Math.round(r * 100)); wv.setAttribute('aria-valuetext', fmt(t) + ' / ' + fmt(L));
      maybeLoop(t, L);
    }
    function loop(now) {
      paint();
      if (!reduced()) { var s = now / 1000;
        for (var i = 0; i < bars.length; i++) { var w = 0.5 + 0.5 * Math.sin(s * 5.2 - i * 0.42), e = 0.75 + 0.25 * Math.sin(s * 1.7 + i * 0.17);
          bars[i].style.transform = 'scaleY(' + (0.55 + 0.75 * w * e).toFixed(3) + ')'; } }
      raf = requestAnimationFrame(loop);
    }
    function start() { wv.classList.add('playing'); tm.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; wv.classList.remove('playing'); for (var i = 0; i < bars.length; i++) bars[i].style.transform = ''; paint(); }
    au.addEventListener('play', start); au.addEventListener('playing', start);
    au.addEventListener('pause', stop); au.addEventListener('emptied', stop);
    ['timeupdate', 'seeked', 'loadedmetadata', 'durationchange'].forEach(function (ev) { au.addEventListener(ev, function () { if (!raf) paint(); }); });
    au.addEventListener('loadedmetadata', loadPeaks); au.addEventListener('loadstart', loadPeaks);
    if (au.readyState >= 1) loadPeaks();
    var pend = null;
    au.addEventListener('loadedmetadata', function () { if (pend != null) { var q = pend; pend = null; try { au.currentTime = q * len(); } catch (e) {} paint(); } });
    function seek(r) { r = Math.min(1, Math.max(0, r)); if (!(au.readyState >= 1)) { pend = r; if (!au.getAttribute('src')) { var b = au.parentNode && au.parentNode.querySelector('.btn.play'); if (b && !b.disabled) b.click(); } return; } try { au.currentTime = r * len(); } catch (e) {} lit = -1; paint(); }
    var drag = false;
    function ratio(e) { var b = wv.getBoundingClientRect(); return (e.clientX - b.left) / b.width; }
    wv.addEventListener('pointerdown', function (e) { drag = true; try { wv.setPointerCapture(e.pointerId); } catch (x) {} seek(ratio(e)); });
    wv.addEventListener('pointermove', function (e) { if (drag) seek(ratio(e)); });
    wv.addEventListener('pointerup', function () { drag = false; }); wv.addEventListener('pointercancel', function () { drag = false; });
    wv.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0; if (!d) return; e.preventDefault(); seek((au.currentTime + d) / len()); });
    if (!au.paused) start();
  }
  function scan(root) { if (!root || root.nodeType !== 1) return; if (root.tagName === 'AUDIO') attach(root); else if (root.querySelectorAll) [].forEach.call(root.querySelectorAll('audio'), attach); }
  function go() { scan(document.body); new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, scan); }); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
})();
