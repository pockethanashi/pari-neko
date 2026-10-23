document.addEventListener("DOMContentLoaded", initDailyHero);

function initDailyHero() {
  const image = document.getElementById("dailyHeroImage");
  const caption = document.getElementById("dailyHeroCaption");

  if (!image) return;

  /*
   * 画像ファイル名のルール:
   *
   * hero01_三姉妹と猫のいる、いつもの部屋.jpg
   * hero02_今日も何かが始まりそう.jpg
   *
   * 「最初の _ より後ろ」をキャプションとして表示します。
   */
  const images = [
    "images/hero/hero01_今年は真面目に.png",
    "images/hero/hero02_赤い股引履いたサンタクロースが・・・.png",

  ];

  if (!images.length) return;

  const dayNumber = getJapanDayNumber();
  const src = images[dayNumber % images.length];

  image.src = src;

  if (caption) {
    const text = getCaptionFromFilename(src);
    caption.textContent = text;
    caption.hidden = !text;
  }
}

function getCaptionFromFilename(src) {
  const filename = src.split("/").pop() || "";

  // 拡張子を削除
  const withoutExt = filename.replace(/\.[^.]+$/, "");

  // 最初の "_" の位置を取得
  const underscoreIndex = withoutExt.indexOf("_");

  if (underscoreIndex === -1) {
    return "";
  }

  // "_" より後ろをキャプションとして返す
  return withoutExt.substring(underscoreIndex + 1);
}

function getJapanDayNumber() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const get = type => parts.find(part => part.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  return Math.floor(
    Date.UTC(year, month - 1, day) / 86400000
  );
}
