// GoogleスプレッドシートのURL
// https://docs.google.com/spreadsheets/d/【ここがID】/edit
// の【ここがID】部分を貼り付けてください。
window.SITE_CONFIG = {
  SPREADSHEET_ID: "18gsVAr54gbZe1PxgiXsw7YtlnEc5Av6PLbbumYacw4E",
  SHEETS: {
    episodes: "episodes",
    stories: "stories"
  },
  // ID未設定時はサンプルデータを表示します。
  USE_DEMO_DATA_IF_UNCONFIGURED: true,

  // アクセスカウンター用Google Apps Script WebアプリURL
  // GASをデプロイ後、末尾が /exec のURLを貼り付けてください。
  ACCESS_COUNTER_URL: "https://script.google.com/macros/s/AKfycby1gNvrqgfr8wrGFBctPzPWOXbTXN6jf6xH07lMNbp0Xdh1JhiPX1cW2p30dhs6FE6N/exec"
};
