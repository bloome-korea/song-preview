/* Load song metadata for universal preview pages (?id=<slug>) */
window.BLOOME_SONG = (function () {
  const BASE = new URL(".", document.currentScript.src); // assets/p/

  function slugFromQuery() {
    const q = new URLSearchParams(location.search);
    return (q.get("id") || "").trim();
  }

  async function load(id) {
    const sid = id || slugFromQuery();
    if (!sid) throw new Error("노래 id가 없어요. ?id= 를 확인해 주세요.");
    const url = new URL("songs.json", BASE).href + "?_=" + Date.now();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("songs.json 을 불러오지 못했어요.");
    const db = await res.json();
    const song = db[sid];
    if (!song) throw new Error("이 링크의 노래를 찾지 못했어요. (" + sid + ")");
    const previewUrl = song.preview
      ? new URL(song.preview, BASE).href
      : null;
    const coverUrl = song.cover ? new URL(song.cover, BASE).href : null;
    return {
      id: sid,
      title: song.title || "블루메 송",
      hand: song.hand || "",
      badge: song.badge || "PRIVATE · LINK ONLY",
      lyrics: song.lyrics || "",
      previewUrl,
      coverUrl,
      storageKey: "bloome_pv_sent_" + sid,
    };
  }

  return { load, slugFromQuery, BASE };
})();
