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
  const replyToEl = document.getElementById("boardReplyTo");
  const replyNotice = document.getElementById("boardReplyNotice");
  const replyNoticeText = document.getElementById("boardReplyNoticeText");
  const replyCancel = document.getElementById("boardReplyCancel");

  if (!endpoint || endpoint.includes("PASTE_YOUR_BOARD")) {
    button.disabled = true;
    status.textContent = "掲示板のGAS URLを設定してください。";
    return;
  }

  form.action = endpoint;
  clientIdEl.value = getBoardClientId();

  function clearReplyMode() {
    replyToEl.value = "";
    replyNotice.hidden = true;
    replyNoticeText.textContent = "";
  }

  replyCancel?.addEventListener("click", clearReplyMode);

  document.addEventListener("click", e => {
    const replyButton = e.target.closest(".board-reply-button");
    if (!replyButton) return;

    const id = String(replyButton.dataset.replyId || "");
    const title = String(replyButton.dataset.replyTitle || "");
    const category = String(replyButton.dataset.replyCategory || "");

    replyToEl.value = id;
    replyNotice.hidden = false;
    replyNoticeText.textContent = `No.${id} に返信中`;

    if (category && form.elements.category) form.elements.category.value = category;
    if (form.elements.title && !form.elements.title.value.trim()) {
      form.elements.title.value = title ? `Re: ${title}` : `Re: No.${id}`;
    }

    form.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => form.elements.body?.focus(), 350);
  });

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

    setTimeout(() => {
      try { localStorage.setItem("neko-board-last-post-at", String(Date.now())); } catch (_) {}
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
      clearReplyMode();
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
    if (!data || data.ok !== true) throw new Error(data?.error || "invalid response");

    boardPosts = Array.isArray(data.posts) ? data.posts : [];
    renderBoardPosts();
    status.textContent = boardPosts.length ? `${boardPosts.length}件の書き込み` : "";
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

  const visible = activeBoardFilter === "all"
    ? boardPosts
    : boardPosts.filter(p => p.category === activeBoardFilter);

  if (!visible.length) {
    list.innerHTML = '<div class="board-empty">この話題の書き込みはまだありません。</div>';
    return;
  }

  const ids = new Set(visible.map(p => String(p.id)));
  const children = new Map();

  visible.forEach(post => {
    const parent = String(post.replyTo || "");
    const key = parent && ids.has(parent) ? parent : "";
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(post);
  });

  const roots = (children.get("") || []).sort((a, b) => Number(b.id) - Number(a.id));
  const out = [];

  function walk(post, depth) {
    out.push(renderBoardPost(post, depth));
    const replies = (children.get(String(post.id)) || []).sort((a, b) => Number(a.id) - Number(b.id));
    replies.forEach(reply => walk(reply, Math.min(depth + 1, 5)));
  }

  roots.forEach(post => walk(post, 0));
  list.innerHTML = out.join("");
}

function renderBoardPost(post, depth) {
  const isReply = Boolean(post.replyTo);
  const depthClass = isReply ? ` is-reply board-reply-depth-${Math.min(depth, 5)}` : "";
  const replyReference = isReply
    ? `<p class="board-reply-reference">↳ No.${escapeBoardHtml(post.replyTo)} への返信</p>`
    : "";

  return `
    <article class="board-post${depthClass}">
      <div class="board-post-head">
        <span class="board-post-no">No.${escapeBoardHtml(post.id)}</span>
        <span class="board-post-category">${escapeBoardHtml(post.category)}</span>
        <time class="board-post-date">${escapeBoardHtml(post.createdAt)}</time>
      </div>
      ${replyReference}
      <h3>${escapeBoardHtml(post.title)}</h3>
      <p class="board-post-meta">${escapeBoardHtml(post.name || "名無しの猫好き")}</p>
      <p class="board-post-body">${escapeBoardHtml(post.body)}</p>
      <div class="board-post-actions">
        <button type="button" class="board-reply-button"
          data-reply-id="${escapeBoardHtml(post.id)}"
          data-reply-title="${escapeBoardHtml(post.title)}"
          data-reply-category="${escapeBoardHtml(post.category)}">返信する</button>
      </div>
    </article>
  `;
}

function boardJsonp(endpoint, params) {
  return new Promise((resolve, reject) => {
    const callbackName = "__nekoBoardCallback_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    let timer;

    const cleanup = () => {
      clearTimeout(timer);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      script.remove();
    };

    window[callbackName] = data => { cleanup(); resolve(data); };

    try {
      const url = new URL(endpoint);
      Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("_", String(Date.now()));

      script.src = url.toString();
      script.async = true;
      script.onerror = () => { cleanup(); reject(new Error("board request failed")); };
      timer = setTimeout(() => { cleanup(); reject(new Error("board timeout")); }, 10000);
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
