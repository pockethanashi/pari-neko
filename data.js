(function () {
  const demoEpisodes = [
    { id:"1", year:"1988", series:"浦安編", title:"どうでもいいことで揉める夜", summary:"話の発端は些細なこと。なのに気づけば全員、本気になっている。", tags:"ケンカ回,暴走回", comment:"会話がどんどん脱線していく回。", published:"TRUE", sortOrder:"1" },
    { id:"2", year:"1988", series:"幕張編", title:"食卓から始まる大騒ぎ", summary:"食べ物の話をしていただけなのに、なぜそこまで話が広がるのか。", tags:"食べ物回", comment:"食卓もののサンプル。", published:"TRUE", sortOrder:"2" },
    { id:"3", year:"1989", series:"新猫編", title:"来客ひとりで部屋が変わる", summary:"いつもの三人に誰か一人増えるだけで、会話のリズムまで変わる。", tags:"来客回,暴走回", comment:"来客回のサンプル。", published:"TRUE", sortOrder:"3" }
  ];

  const demoStories = [
    {
      id:"1", episodeNo:"1", title:"クイズ",
      summary:"大家族対抗クイズ大会の賞金を狙う三姉妹。しかし、いさ子にはどうしても思い出せないことがある。",
      body:"夜。三人は居間にいる。\n\nまゆか「ねえ、これ出ない？」\n\nみさを「何が？」\n\nまゆか「大家族対抗クイズ大会。優勝賞金、百万円だって」\n\nいさ子「大家族？」\n\nまゆか「三人でもいいらしいよ」\n\nみさを「大家族ではないけどね」\n\nいさ子「猫入れれば四人じゃない」\n\nみさを「モチャコは人数に入らないでしょ」\n\nいさ子「失礼ね。あんたよりよっぽど家にいるわよ」\n\nみさを「そういう問題？」\n\nまゆか「で、出るなら今日中に応募しないと」\n\nいさ子「いいじゃない。百万円でしょ？」\n\nみさを「その前に一般常識の問題とか出るんじゃない？」\n\nいさ子「一般常識なら私、強いわよ」\n\nまゆか「じゃあ問題。日本で一番高い山は？」\n\nいさ子「……それは分かる」\n\nみさを「答えてないじゃん」\n\nモチャコがテーブルの上に乗る。\n\nいさ子「ちょっと待って。今、名前がここまで来てるの」\n\nまゆか「富士山」\n\nいさ子「それ！」\n\nみさを「出るのやめようか」",
      publishedDate:"2026-08-27", status:"公開", sortOrder:"1"
    }
  ];

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { row.push(cell); cell = ""; }
      else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell); cell = "";
        if (row.some(v => v !== "")) rows.push(row);
        row = [];
      } else { cell += ch; }
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows.shift().map(h => h.trim());
    return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
  }

  function isConfigured() {
    const id = window.SITE_CONFIG?.SPREADSHEET_ID || "";
    return id && !id.includes("PASTE_YOUR");
  }

  async function fetchSheet(kind) {
    const cfg = window.SITE_CONFIG;
    if (!isConfigured()) {
      if (cfg?.USE_DEMO_DATA_IF_UNCONFIGURED) return kind === "episodes" ? demoEpisodes : demoStories;
      throw new Error("SPREADSHEET_ID が未設定です");
    }
    const sheetName = cfg.SHEETS[kind];
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cfg.SPREADSHEET_ID)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${sheetName} シートを取得できませんでした (${res.status})`);
    return parseCSV(await res.text());
  }

  function isPublic(value) {
    const v = String(value ?? "").trim().toLowerCase();
    return ["true", "1", "yes", "公開", "published", "○"].includes(v);
  }

  async function getEpisodes() {
    const rows = await fetchSheet("episodes");
    return rows.filter(r => isPublic(r.published)).sort((a,b) => Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999));
  }

  async function getStories() {
    const rows = await fetchSheet("stories");
    return rows.filter(r => isPublic(r.status)).sort((a,b) => Number(a.sortOrder || a.episodeNo || 9999) - Number(b.sortOrder || b.episodeNo || 9999));
  }

  window.NeckoData = { getEpisodes, getStories, isConfigured };
})();
