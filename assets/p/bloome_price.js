/* Bloome Song — client-side timer pricing (interim until Apps Script v17)
 * Anchor order:
 *  1) ?s=  — unix seconds (10), unix ms (13), or yyyymmddHHMM as Asia/Seoul (KST)
 *  2) localStorage[storageKey] from a prior visit with ?s= or first open
 *  3) first-open Date.now() saved to localStorage
 * Client-side only — customer can tamper; OK for test until server anchor.
 * Debug: ?debug=1&stage=9900|19800|29800|closed|reopen
 */
window.BLOOME_PRICE = (function () {
  const TIERS = [
    [1, 9900, "1시간 이내"],
    [12, 19800, "1~12시간"],
    [24, 29800, "12~24시간"],
  ];

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /** Parse ?s= into epoch ms, or null */
  function parseSParam(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^\d{10}$/.test(s)) return parseInt(s, 10) * 1000;
    if (/^\d{13}$/.test(s)) return parseInt(s, 10);
    if (/^\d{12}$/.test(s)) {
      const y = s.slice(0, 4),
        mo = s.slice(4, 6),
        d = s.slice(6, 8),
        h = s.slice(8, 10),
        mi = s.slice(10, 12);
      const ms = Date.parse(y + "-" + mo + "-" + d + "T" + h + ":" + mi + ":00+09:00");
      return Number.isFinite(ms) ? ms : null;
    }
    return null;
  }

  /**
   * @param {string} storageKey e.g. bloome_pv_sent_34e7b0559904
   */
  function resolveAnchorMs(storageKey) {
    const q = new URLSearchParams(location.search);
    const fromS = parseSParam(q.get("s"));
    if (fromS != null) {
      try {
        localStorage.setItem(storageKey, String(fromS));
      } catch (e) {}
      return fromS;
    }
    let a = null;
    try {
      a = localStorage.getItem(storageKey);
    } catch (e) {}
    if (!a) {
      a = String(Date.now());
      try {
        localStorage.setItem(storageKey, a);
      } catch (e) {}
    }
    return +a;
  }

  function parseAnchor(storageKey) {
    const q = new URLSearchParams(location.search);
    const stage = q.get("stage");
    if (stage === "9900")
      return { mode: "fixed", amount: 9900, label: "1시간 이내", leftSec: 59 * 60 + 12, expired: false, reopened: false };
    if (stage === "19800")
      return { mode: "fixed", amount: 19800, label: "1~12시간", leftSec: 11 * 3600 + 3 * 60, expired: false, reopened: false };
    if (stage === "29800")
      return { mode: "fixed", amount: 29800, label: "12~24시간", leftSec: 11 * 3600 + 45 * 60, expired: false, reopened: false };
    if (stage === "closed")
      return { mode: "fixed", amount: null, label: "만료", leftSec: 0, expired: true, reopened: false };
    if (stage === "reopen")
      return { mode: "fixed", amount: 29800, label: "재오픈 · 정가", leftSec: null, expired: false, reopened: true };

    let sent = resolveAnchorMs(storageKey);
    const now = Date.now();
    // 발송시각이 미래면(시계/링크 오차) 지금으로 맞춤
    if (sent > now) sent = now;
    const hrs = (now - sent) / 3600000;
    if (hrs >= 24)
      return { mode: "live", amount: null, label: "만료", leftSec: 0, expired: true, reopened: false, sent };
    for (const [until, amt, label] of TIERS) {
      if (hrs < until) {
        const leftSec = Math.ceil((sent + until * 3600000 - now) / 1000);
        const next = TIERS.find((t) => t[0] > until);
        return {
          mode: "live",
          amount: amt,
          label,
          leftSec,
          expired: false,
          reopened: false,
          nextAmount: next ? next[1] : null,
          sent,
        };
      }
    }
    return { mode: "live", amount: null, label: "만료", leftSec: 0, expired: true, reopened: false, sent };
  }

  function fmt(s) {
    s = Math.max(0, s | 0);
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      x = s % 60;
    if (h) return h + "시간 " + pad(m) + "분";
    return m + "분 " + pad(x) + "초";
  }
  function won(n) {
    return n.toLocaleString("ko-KR") + "원";
  }

  /** Preserve s/debug/stage across preview↔pay */
  function carryParams(extra) {
    const q = new URLSearchParams(location.search);
    const p = new URLSearchParams();
    if (q.get("debug") === "1") p.set("debug", "1");
    if (q.get("stage")) p.set("stage", q.get("stage"));
    if (q.get("s")) p.set("s", q.get("s"));
    if (extra) for (const k in extra) if (extra[k] != null) p.set(k, extra[k]);
    const qs = p.toString();
    return qs ? "?" + qs : "";
  }

  return { parseAnchor, fmt, won, carryParams, parseSParam, resolveAnchorMs, TIERS };
})();
