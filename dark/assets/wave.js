/* Bloome Song Studio — shared waveform players (dark preview)
   - progress fill (amber, left→right) synced to currentTime
   - sine-wave undulation via requestAnimationFrame, only while playing
   - freeze at resting heights when paused; tap/drag/arrow keys seek
   - prefers-reduced-motion: fill only */
(function () {
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mq && mq.matches); }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); }
  var players = [], cur = null;

  function Player(btn) {
    var box = btn.closest('[data-track]'), self = this;
    this.btn = btn; this.wv = box.querySelector('.wv'); this.t = box.querySelector('.t-now');
    this.bars = this.wv ? [].slice.call(this.wv.querySelectorAll('i')) : [];
    this.dur = parseFloat(this.wv && this.wv.getAttribute('data-dur')) || 60;
    this.a = new Audio(btn.getAttribute('data-play')); this.a.preload = 'none';
    this.raf = 0; this.lit = -1; this.pending = null;
    var a = this.a;
    a.addEventListener('loadedmetadata', function () {
      if (isFinite(a.duration) && a.duration > 0) self.dur = a.duration;
      if (self.pending != null) { try { a.currentTime = self.pending; } catch (e) {} self.pending = null; }
    });
    a.addEventListener('play', function () { btn.classList.add('on'); self.wv && self.wv.classList.add('playing'); self.loop(); });
    a.addEventListener('pause', function () { self.stop(); });
    a.addEventListener('ended', function () { self.stop(); });
    a.addEventListener('timeupdate', function () { if (!self.raf) self.paint(a.currentTime); });
    a.addEventListener('seeked', function () { self.paint(a.currentTime); });
    btn.addEventListener('click', function () {
      if (a.paused) { if (cur && cur !== self) cur.a.pause(); cur = self; var p = a.play(); if (p && p.catch) p.catch(function () {}); }
      else a.pause();
    });
    if (this.wv) this.bindSeek();
  }
  Player.prototype.time = function () { return this.pending != null ? this.pending : this.a.currentTime; };
  Player.prototype.paint = function (t) {
    var r = Math.min(1, Math.max(0, t / this.dur)), n = this.bars.length, k = Math.round(r * n);
    if (k !== this.lit) { for (var i = 0; i < n; i++) this.bars[i].classList.toggle('on', i < k); this.lit = k; }
    if (this.t) this.t.textContent = fmt(t);
    this.wv.setAttribute('aria-valuenow', Math.round(r * 100));
    this.wv.setAttribute('aria-valuetext', fmt(t));
  };
  Player.prototype.loop = function () {
    var self = this; if (this.raf) return;
    function f(now) {
      self.paint(self.a.currentTime);
      if (!reduced()) {
        var s = now / 1000;
        for (var i = 0; i < self.bars.length; i++) {
          var w = 0.5 + 0.5 * Math.sin(s * 5.2 - i * 0.42);           /* travelling wave */
          var e = 0.75 + 0.25 * Math.sin(s * 1.7 + i * 0.17);        /* slow swell */
          self.bars[i].style.transform = 'scaleY(' + (0.55 + 0.75 * w * e).toFixed(3) + ')';
        }
      }
      self.raf = requestAnimationFrame(f);
    }
    this.raf = requestAnimationFrame(f);
  };
  Player.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0;
    this.btn.classList.remove('on'); if (this.wv) this.wv.classList.remove('playing');
    for (var i = 0; i < this.bars.length; i++) this.bars[i].style.transform = '';
    this.paint(this.a.currentTime);
  };
  Player.prototype.seekTo = function (r) {
    r = Math.min(1, Math.max(0, r)); var t = r * this.dur, a = this.a;
    if (a.readyState >= 1) { try { a.currentTime = t; } catch (e) {} }
    else { this.pending = t; if (a.preload === 'none') { a.preload = 'metadata'; a.load(); } }
    this.lit = -1; this.paint(t);
  };
  Player.prototype.bindSeek = function () {
    var self = this, wv = this.wv, drag = false;
    function ratio(e) { var b = wv.getBoundingClientRect(); return (e.clientX - b.left) / b.width; }
    wv.addEventListener('pointerdown', function (e) { drag = true; try { wv.setPointerCapture(e.pointerId); } catch (x) {} self.seekTo(ratio(e)); });
    wv.addEventListener('pointermove', function (e) { if (drag) self.seekTo(ratio(e)); });
    function end() { drag = false; }
    wv.addEventListener('pointerup', end); wv.addEventListener('pointercancel', end);
    wv.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0; if (!d) return;
      e.preventDefault(); self.seekTo((self.time() + d) / self.dur);
    });
  };
  document.querySelectorAll('[data-play]').forEach(function (b) { players.push(new Player(b)); });
  window.BSPlayers = players;
})();
