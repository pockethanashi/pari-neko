document.addEventListener("DOMContentLoaded", initDailyQuiz);

const DAILY_QUIZ_SHEET_NAME = "quiz";

async function initDailyQuiz() {
  const section = document.getElementById("dailyQuizSection");
  if (!section) return;

  const loading = document.getElementById("dailyQuizLoading");
  const body = document.getElementById("dailyQuizBody");
  const error = document.getElementById("dailyQuizError");

  try {
    const questions = await fetchDailyQuizQuestions();
    if (!questions.length) throw new Error("公開中のクイズがありません。");

    const quiz = chooseTodaysQuiz(questions);
    renderDailyQuiz(quiz);

    loading.hidden = true;
    body.hidden = false;
  } catch (err) {
    console.warn("Daily quiz error:", err);
    loading.hidden = true;
    error.hidden = false;
    error.textContent = "今日のクイズを読み込めませんでした。";
  }
}

async function fetchDailyQuizQuestions() {
  const cfg = window.SITE_CONFIG || {};
  const spreadsheetId = String(cfg.SPREADSHEET_ID || "").trim();
  if (!spreadsheetId || spreadsheetId.includes("PASTE_YOUR")) {
    throw new Error("config.js の SPREADSHEET_ID が設定されていません。");
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}` +
    `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(DAILY_QUIZ_SHEET_NAME)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`quizシートを取得できませんでした (${res.status})`);

  const rows = parseDailyQuizCSV(await res.text());

  return rows
    .filter(row => isDailyQuizPublic(row.published))
    .filter(isValidDailyQuizRow)
    .map(row => ({
      id: String(row.id || ""),
      question: String(row.question || "").trim(),
      choiceA: String(row.choiceA || "").trim(),
      choiceB: String(row.choiceB || "").trim(),
      choiceC: String(row.choiceC || "").trim(),
      answer: String(row.answer || "").trim().toUpperCase(),
      explanation: String(row.explanation || "").trim(),
      category: String(row.category || "クイズ").trim()
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));
}

function chooseTodaysQuiz(questions) {
  const dayKey = getJapanDayNumber();
  return questions[dayKey % questions.length];
}

function getJapanDayNumber() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const get = type => parts.find(p => p.type === type)?.value;
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));

  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function renderDailyQuiz(quiz) {
  document.getElementById("dailyQuizCategory").textContent = quiz.category || "今日の1問";
  document.getElementById("dailyQuizQuestion").textContent = quiz.question;

  const choices = [["A", quiz.choiceA], ["B", quiz.choiceB], ["C", quiz.choiceC]];
  const choicesEl = document.getElementById("dailyQuizChoices");

  choicesEl.innerHTML = choices.map(([letter, text]) => `
    <button type="button" class="daily-quiz-choice" data-choice="${letter}">
      <span class="daily-quiz-letter">${letter}</span>
      <span>${escapeDailyQuizHtml(text)}</span>
    </button>
  `).join("");

  let answered = false;

  choicesEl.querySelectorAll(".daily-quiz-choice").forEach(button => {
    button.addEventListener("click", () => {
      if (answered) return;
      answered = true;

      const selected = button.dataset.choice;
      const correct = selected === quiz.answer;

      choicesEl.querySelectorAll(".daily-quiz-choice").forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.choice === quiz.answer) btn.classList.add("is-correct");
        else if (btn.dataset.choice === selected) btn.classList.add("is-wrong");
      });

      const feedback = document.getElementById("dailyQuizFeedback");
      feedback.hidden = false;
      feedback.classList.remove("is-correct", "is-wrong");
      feedback.classList.add(correct ? "is-correct" : "is-wrong");

      document.getElementById("dailyQuizResult").textContent = correct ? "正解！" : "残念！";
      document.getElementById("dailyQuizAnswer").textContent =
        `正解：${quiz.answer}　${dailyChoiceText(quiz, quiz.answer)}`;
      document.getElementById("dailyQuizExplanation").textContent =
        quiz.explanation || "解説は準備中です。";
    });
  });
}

function dailyChoiceText(quiz, letter) {
  if (letter === "A") return quiz.choiceA;
  if (letter === "B") return quiz.choiceB;
  return quiz.choiceC;
}

function isValidDailyQuizRow(row) {
  return String(row.question || "").trim() &&
    String(row.choiceA || "").trim() &&
    String(row.choiceB || "").trim() &&
    String(row.choiceC || "").trim() &&
    ["A", "B", "C"].includes(String(row.answer || "").trim().toUpperCase());
}

function isDailyQuizPublic(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "公開", "published", "○"].includes(v);
}

function parseDailyQuizCSV(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++; }
    else if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }

  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];

  const headers = rows.shift().map(v => v.trim());
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

function escapeDailyQuizHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
