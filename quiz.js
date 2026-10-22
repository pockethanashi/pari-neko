document.addEventListener("DOMContentLoaded", initQuiz);

const QUIZ_SHEET_NAME = "quiz";
const QUIZ_MAX_QUESTIONS = 10;

let allQuizQuestions = [];
let quizQuestions = [];
let currentQuizIndex = 0;
let quizCorrectCount = 0;
let answeredCurrent = false;

async function initQuiz() {
  try {
    allQuizQuestions = await fetchQuizQuestions();

    if (!allQuizQuestions.length) {
      throw new Error("公開中のクイズがありません。quizシートに問題を追加してください。");
    }

    const count = Math.min(QUIZ_MAX_QUESTIONS, allQuizQuestions.length);
    document.getElementById("quizQuestionCount").textContent = count;

    hide("quizLoading");
    show("quizStart");

    document.getElementById("quizStartButton").addEventListener("click", startQuiz);
    document.getElementById("quizNextButton").addEventListener("click", nextQuestion);
    document.getElementById("quizRetryButton").addEventListener("click", startQuiz);

  } catch (err) {
    console.warn("Quiz load error:", err);
    hide("quizLoading");
    show("quizError");
    document.getElementById("quizErrorMessage").textContent =
      err?.message || "クイズデータを取得できませんでした。";
  }
}

async function fetchQuizQuestions() {
  const cfg = window.SITE_CONFIG || {};
  const spreadsheetId = String(cfg.SPREADSHEET_ID || "").trim();

  if (!spreadsheetId || spreadsheetId.includes("PASTE_YOUR")) {
    throw new Error("config.js の SPREADSHEET_ID が設定されていません。");
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}` +
    `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(QUIZ_SHEET_NAME)}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`quizシートを取得できませんでした (${res.status})`);
  }

  const rows = parseQuizCSV(await res.text());

  return rows
    .filter(row => isQuizPublic(row.published))
    .filter(isValidQuizRow)
    .map(row => ({
      id: String(row.id || ""),
      question: String(row.question || "").trim(),
      choiceA: String(row.choiceA || "").trim(),
      choiceB: String(row.choiceB || "").trim(),
      choiceC: String(row.choiceC || "").trim(),
      answer: String(row.answer || "").trim().toUpperCase(),
      explanation: String(row.explanation || "").trim(),
      category: String(row.category || "クイズ").trim(),
      difficulty: String(row.difficulty || "").trim()
    }));
}

function startQuiz() {
  quizQuestions = shuffleArray([...allQuizQuestions])
    .slice(0, QUIZ_MAX_QUESTIONS);

  currentQuizIndex = 0;
  quizCorrectCount = 0;
  answeredCurrent = false;

  hide("quizStart");
  hide("quizResult");
  show("quizGame");

  renderQuestion();
}

function renderQuestion() {
  answeredCurrent = false;

  const question = quizQuestions[currentQuizIndex];
  const currentNo = currentQuizIndex + 1;
  const total = quizQuestions.length;

  document.getElementById("quizProgressText").textContent =
    `QUESTION ${String(currentNo).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  document.getElementById("quizScoreMini").textContent =
    `${quizCorrectCount} correct`;

  document.getElementById("quizProgressBar").style.width =
    `${((currentNo - 1) / total) * 100}%`;

  setTextOrHide("quizCategory", question.category);
  setTextOrHide("quizDifficulty", difficultyLabel(question.difficulty));

  document.getElementById("quizQuestion").textContent = question.question;

  const choices = [
    ["A", question.choiceA],
    ["B", question.choiceB],
    ["C", question.choiceC]
  ];

  const choicesEl = document.getElementById("quizChoices");
  choicesEl.innerHTML = choices.map(([letter, text]) => `
    <button type="button" class="quiz-choice" data-choice="${letter}">
      <span class="quiz-choice-letter">${letter}</span>
      <span class="quiz-choice-text">${escapeQuizHtml(text)}</span>
    </button>
  `).join("");

  choicesEl.querySelectorAll(".quiz-choice").forEach(button => {
    button.addEventListener("click", () => answerQuestion(button.dataset.choice));
  });

  const feedback = document.getElementById("quizFeedback");
  feedback.hidden = true;
  feedback.classList.remove("is-correct", "is-wrong");
}

function answerQuestion(selected) {
  if (answeredCurrent) return;
  answeredCurrent = true;

  const question = quizQuestions[currentQuizIndex];
  const isCorrect = selected === question.answer;

  if (isCorrect) quizCorrectCount++;

  document.querySelectorAll(".quiz-choice").forEach(button => {
    button.disabled = true;

    if (button.dataset.choice === question.answer) {
      button.classList.add("is-correct");
    } else if (button.dataset.choice === selected) {
      button.classList.add("is-wrong");
    }
  });

  const feedback = document.getElementById("quizFeedback");
  feedback.hidden = false;
  feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");

  document.getElementById("quizFeedbackMark").textContent =
    isCorrect ? "正解！" : "残念！";

  document.getElementById("quizCorrectAnswer").textContent =
    `正解：${question.answer}　${choiceText(question, question.answer)}`;

  document.getElementById("quizExplanation").textContent =
    question.explanation || "解説は準備中です。";

  const nextButton = document.getElementById("quizNextButton");
  nextButton.textContent =
    currentQuizIndex + 1 >= quizQuestions.length
      ? "結果を見る →"
      : "次の問題へ →";

  document.getElementById("quizScoreMini").textContent =
    `${quizCorrectCount} correct`;
}

function nextQuestion() {
  if (!answeredCurrent) return;

  if (currentQuizIndex + 1 >= quizQuestions.length) {
    showQuizResult();
    return;
  }

  currentQuizIndex++;
  renderQuestion();

  document.getElementById("quizGame")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

function showQuizResult() {
  hide("quizGame");
  show("quizResult");

  const total = quizQuestions.length;
  const percent = Math.round((quizCorrectCount / total) * 100);
  const result = getQuizRank(quizCorrectCount, total);

  document.getElementById("quizResultTitle").textContent = result.title;
  document.getElementById("quizResultCorrect").textContent = quizCorrectCount;
  document.getElementById("quizResultTotal").textContent = total;
  document.getElementById("quizResultPercent").textContent = `正解率 ${percent}%`;
  document.getElementById("quizResultMessage").textContent = result.message;

  document.getElementById("quizResult")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

function getQuizRank(correct, total) {
  const ratio = total ? correct / total : 0;

  if (ratio === 1) {
    return {
      title: "もう四姉妹です",
      message: "全問正解！ 丸井家の居間にいても、たぶん普通になじめます。"
    };
  }
  if (ratio >= .9) {
    return {
      title: "丸井家常連",
      message: "かなりの猫好き。あと一歩で完全制覇です。"
    };
  }
  if (ratio >= .7) {
    return {
      title: "三姉妹通",
      message: "かなり見ていますね。三姉妹の空気感までしっかり覚えていそうです。"
    };
  }
  if (ratio >= .4) {
    return {
      title: "なかなかの猫好き",
      message: "いい感じです。見返すたびに、まだまだ発見がありそう。"
    };
  }

  return {
    title: "猫好き見習い",
    message: "ここからです。三姉妹と一緒に、のんびり腕を上げていきましょう。"
  };
}

function choiceText(question, letter) {
  if (letter === "A") return question.choiceA;
  if (letter === "B") return question.choiceB;
  return question.choiceC;
}

function difficultyLabel(value) {
  const v = String(value || "").trim().toLowerCase();
  if (["easy", "初級", "1"].includes(v)) return "初級 ★";
  if (["normal", "medium", "中級", "2"].includes(v)) return "中級 ★★★";
  if (["hard", "上級", "3"].includes(v)) return "上級 ★★★★★";
  return value;
}

function isValidQuizRow(row) {
  return (
    String(row.question || "").trim() &&
    String(row.choiceA || "").trim() &&
    String(row.choiceB || "").trim() &&
    String(row.choiceC || "").trim() &&
    ["A", "B", "C"].includes(String(row.answer || "").trim().toUpperCase())
  );
}

function isQuizPublic(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "公開", "published", "○"].includes(v);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function parseQuizCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      cell = "";

      if (row.some(value => value !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows.shift().map(value => value.trim());

  return rows.map(values =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""])
    )
  );
}

function setTextOrHide(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.hidden = !text;
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function escapeQuizHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
