document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initEpisodes();
  initStoryList();
  initStoryPage();
  initReadingToggle();
  initAccessCounter();
});

function initMenu() {
  const button = document.querySelector(".menu-button");
  const nav = document.querySelector(".global-nav");
  if (button && nav) button.addEventListener("click", () => nav.classList.toggle("open"));
}

function escapeHtml(value="") {
  return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

async function initEpisodes() {
  const grid = document.getElementById("episodeGrid");
  if (!grid) return;
  const status = document.getElementById("episodeStatus");
  const filters = document.getElementById("episodeFilters");
  try {
    const episodes = await NeckoData.getEpisodes();
    const allTags = [...new Set(episodes.flatMap(e => String(e.tags||"").split(/[,、]/).map(t=>t.trim()).filter(Boolean)))];
    allTags.forEach(tag => filters.insertAdjacentHTML("beforeend", `<button class="filter" data-filter="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`));
    grid.innerHTML = episodes.map(e => {
      const tags = String(e.tags||"").split(/[,、]/).map(t=>t.trim()).filter(Boolean);
      return `<article class="episode-card" data-tags="${escapeHtml(tags.join("|"))}">
        <p class="episode-meta">${escapeHtml(e.year || "")}${e.id ? ` / #${escapeHtml(e.id)}` : ""}</p>
        <h2>${escapeHtml(e.title)}</h2><p>${escapeHtml(e.summary)}</p>
        ${e.comment ? `<p class="episode-comment">${escapeHtml(e.comment)}</p>` : ""}
        <div class="tags">${tags.map(t=>`<span>#${escapeHtml(t)}</span>`).join("")}</div></article>`;
    }).join("");
    status.textContent = episodes.length ? (NeckoData.isConfigured() ? `${episodes.length}件を表示しています` : "サンプルデータを表示中（config.js にスプレッドシートIDを設定してください）") : "公開中のエピソードはありません。";
    filters.addEventListener("click", e => {
      const btn = e.target.closest(".filter"); if (!btn) return;
      filters.querySelectorAll(".filter").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
      const target = btn.dataset.filter;
      grid.querySelectorAll(".episode-card").forEach(card => card.style.display = target === "all" || card.dataset.tags.split("|").includes(target) ? "" : "none");
    });
  } catch (err) { status.textContent = `読み込みエラー：${err.message}`; }
}

async function initStoryList() {
  const list = document.getElementById("storyList");
  if (!list) return;
  const status = document.getElementById("storyListStatus");
  try {
    const stories = await NeckoData.getStories();
    list.innerHTML = stories.map(s => `<a class="story-row" href="story.html?id=${encodeURIComponent(s.id)}"><div class="story-no">${String(s.episodeNo||s.id).padStart(2,"0")}</div><div class="story-info"><p class="story-label">第${escapeHtml(s.episodeNo||s.id)}話${s.publishedDate ? ` / ${escapeHtml(s.publishedDate)}` : ""}</p><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.summary)}</p></div><div class="story-arrow">→</div></a>`).join("");
    status.textContent = stories.length ? (NeckoData.isConfigured() ? `${stories.length}作品を公開中` : "サンプルデータを表示中（config.js にスプレッドシートIDを設定してください）") : "公開中の作品はありません。";
  } catch (err) { status.textContent = `読み込みエラー：${err.message}`; }
}

async function initStoryPage() {
  const text = document.getElementById("storyText");
  if (!text) return;
  const status = document.getElementById("storyStatus");
  const id = new URLSearchParams(location.search).get("id");
  try {
    const stories = await NeckoData.getStories();
    const index = stories.findIndex(s => String(s.id) === String(id || stories[0]?.id));
    if (index < 0) throw new Error("指定された作品が見つかりません");
    const story = stories[index];
    document.title = `第${story.episodeNo || story.id}話 ${story.title}｜勝手に猫が好き`;
    document.getElementById("storyEpisodeNo").textContent = `勝手に猫が好き　第${story.episodeNo || story.id}話`;
    document.getElementById("storyTitle").textContent = story.title;
    document.getElementById("storySummary").textContent = story.summary || "";
    const paragraphs = String(story.body || "").replace(/\r\n/g,"\n").split(/\n\s*\n|\n/).map(v=>v.trim()).filter(Boolean);
    text.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("");
    text.hidden = false; status.textContent = NeckoData.isConfigured() ? "" : "サンプル本文を表示中";
    const prev = stories[index-1], next = stories[index+1];
    const prevEl = document.getElementById("prevStory"), nextEl = document.getElementById("nextStory");
    if (prev) { prevEl.href=`story.html?id=${encodeURIComponent(prev.id)}`; prevEl.textContent=`← 第${prev.episodeNo||prev.id}話`; }
    else { prevEl.href="fanfiction.html"; prevEl.textContent="← 作品一覧"; }
    if (next) { nextEl.href=`story.html?id=${encodeURIComponent(next.id)}`; nextEl.textContent=`第${next.episodeNo||next.id}話 →`; }
    else { nextEl.href="fanfiction.html"; nextEl.textContent="作品一覧 →"; }
    resetVerticalScroll(text);
  } catch (err) { status.textContent = `読み込みエラー：${err.message}`; document.getElementById("storyTitle").textContent="作品が見つかりません"; }
}

function initReadingToggle() {
  const buttons = document.querySelectorAll(".toggle[data-mode]");
  const text = document.getElementById("storyText");
  if (!buttons.length || !text) return;
  buttons.forEach(button => button.addEventListener("click", () => {
    buttons.forEach(b=>b.classList.remove("active")); button.classList.add("active");
    text.classList.remove("vertical","horizontal"); text.classList.add(button.dataset.mode);
    if (button.dataset.mode === "vertical") resetVerticalScroll(text);
  }));
}

function resetVerticalScroll(el) {
  requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
}

// ==============================
// Access counter
// 1 browser = 1 count per Japan calendar day.
// The daily guard is stored in localStorage.
// ==============================
async function initAccessCounter() {
  const countEl = document.getElementById("accessCount");
  if (!countEl) return; // Count only on pages that contain the counter (currently index.html).

  const statusEl = document.getElementById("accessCounterStatus");
  const endpoint = String(window.SITE_CONFIG?.ACCESS_COUNTER_URL || "").trim();
  if (!endpoint || endpoint.includes("PASTE_YOUR_GAS")) {
    if (statusEl) statusEl.textContent = "カウンター設定前";
    return;
  }

  const today = getJapanDateKey();
  const storageKey = "yappari-neko-access-counted-date";
  let alreadyCounted = false;
  try {
    alreadyCounted = localStorage.getItem(storageKey) === today;
  } catch (_) {
    // If localStorage is unavailable, the page still works; GAS will simply receive a count request.
  }

  try {
    const url = new URL(endpoint);
    url.searchParams.set("mode", alreadyCounted ? "read" : "count");
    url.searchParams.set("date", today);
    url.searchParams.set("_", Date.now().toString()); // Avoid cached responses.

    const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.ok !== true) throw new Error(data?.error || "invalid response");

    countEl.classList.remove("loading");
    countEl.textContent = Number(data.total || 0).toLocaleString("ja-JP");

    if (!alreadyCounted && data.counted === true) {
      try { localStorage.setItem(storageKey, today); } catch (_) {}
    }
    if (statusEl) statusEl.textContent = alreadyCounted ? "本日はカウント済み" : "ご訪問ありがとうございます";
  } catch (err) {
    console.warn("Access counter error:", err);
    if (statusEl) statusEl.textContent = "カウンターを取得できませんでした";
  }
}

function getJapanDateKey() {
  // en-CA yields YYYY-MM-DD, while timeZone fixes the boundary to Japan time.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

