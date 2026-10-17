document.addEventListener("DOMContentLoaded", () => {
  initBoardForm();
  initBoardList();
  initBoardFilters();
});

let boardPosts = [];
let activeBoardFilter = "all";

function boardEndpoint() {
  return String(window.BOARD_CONFIG?.API_URL || "").trim();
}

function initBoardForm() {
  const form = document.getElementById("boardForm");
  if (!form) return;

  const endpoint = boardEndpoint();
  const status = document.getElementById("boardSubmitStatus");
  const button = document.getElementById("boardSubmitButton");
  const clientIdEl = document.getElementById("boardClientId");

  if (!endpoint || endpoint.includes("PASTE_YOUR_BOARD")) {
    button.disabled = true;
    status.textContent = "掲示板のGAS URLを設定してください。";
    return;
  }

  form.action = endpoint;
  clientIdEl.value = getBoardClientId();

  form.addEventListener("submit", e => {
    const lastPostAt = Number(localStorage.getItem("neko-board-last-post-at") || 0);
    const now = Date.now();

    if (lastPostAt && now - lastPostAt < 30000) {
      e.preventDefault();
      const wait = Math.ceil((30000 - (now - lastPostAt)) / 1000);
      status.textContent = `連続投稿を避けるため、あと${wait}秒ほどお待ちください。`;
      return;
    }

    button.disabled = true;
    button.textContent = "送信中…";
    status.textContent = "送信しています…";

    // hidden iframeへの通常POSTなので、CORSに左右されにくい。
    setTimeout(() => {
      try {
        localStorage.setItem("neko-board-last-post-at", String(Date.now()));
      } catch (_) {}

      status.textContent = "投稿を受け付けました。管理人確認後に掲載されます。";
      button.disabled = false;
      button.textContent = "投稿する";

      const name = form.elements.name.value;
      const category = form.elements.category.value;
      form.reset();
      form.elements.name.value = name;
      form.elements.category.value = category;
      form.elements.mode.value = "post";
      clientIdEl.value = getBoardClientId();
    }, 1200);
  });
}

async function initBoardList() {
  const status = document.getElementById("boardStatus");
  const endpoint = boardEndpoint();

  if (!endpoint || endpoint.includes("PASTE_YOUR_BOARD")) {
    status.textContent = "掲示板のGAS URLを設定してください。";
    return;
  }

  try {
    const data = await boardJsonp(endpoint, { mode: "list" });

    if (!data || data.ok !== true) {
      throw new Error(data?.error || "invalid response");
    }

    boardPosts = Array.isArray(data.posts) ? data.posts : [];
    renderBoardPosts();
    status.textContent = boardPosts.length
      ? `${boardPosts.length}件の書き込み`
      : "";
  } catch (err) {
    console.warn("Board loading error:", err);
    status.textContent = "掲示板を読み込めませんでした。少し時間をおいて再読み込みしてください。";
  }
}

function initBoardFilters() {
  const filters = document.getElementById("boardFilters");
  if (!filters) return;

  filters.addEventListener("click", e => {
    const btn = e.target.closest(".filter");
    if (!btn) return;

    filters.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeBoardFilter = btn.dataset.filter || "all";
    renderBoardPosts();
  });
}

function renderBoardPosts() {
  const list = document.getElementById("boardList");
  if (!list) return;

  const filtered = activeBoardFilter === "all"
    ? boardPosts
    : boardPosts.filter(p => p.category === activeBoardFilter);

  if (!filtered.length) {
    list.innerHTML = '<div class="board-empty">この話題の書き込みはまだありません。</div>';
    return;
  }

  list.innerHTML = filtered.map(post => `
    <article class="board-post">
      <div class="board-post-head">
        <span class="board-post-no">No.${escapeBoardHtml(post.id)}</span>
        <span class="board-post-category">${escapeBoardHtml(post.category)}</span>
        <time class="board-post-date">${escapeBoardHtml(post.createdAt)}</time>
      </div>
      <h3>${escapeBoardHtml(post.title)}</h3>
      <p class="board-post-meta">${escapeBoardHtml(post.name || "名無しの猫好き")}</p>
      <p class="board-post-body">${escapeBoardHtml(post.body)}</p>
    </article>
  `).join("");
}

function boardJsonp(endpoint, params) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "__nekoBoardCallback_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2);

    const script = document.createElement("script");
    let timer;

    const cleanup = () => {
      clearTimeout(timer);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      script.remove();
    };

    window[callbackName] = data => {
      cleanup();
      resolve(data);
    };

    try {
      const url = new URL(endpoint);
      Object.entries(params || {}).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("_", String(Date.now()));

      script.src = url.toString();
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error("board request failed"));
      };
      timer = setTimeout(() => {
        cleanup();
        reject(new Error("board timeout"));
      }, 10000);

      document.head.appendChild(script);
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

function getBoardClientId() {
  const key = "neko-board-client-id";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(key, id);
    }
    return id;
  } catch (_) {
    return "";
  }
}

function escapeBoardHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
