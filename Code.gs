/**
 * やっぱり猫が好き ファンサイト用アクセスカウンター
 *
 * 推奨: エピソード/ストーリー管理に使っているGoogleスプレッドシートから
 * 「拡張機能 > Apps Script」を開き、このコードを貼り付けてください。
 *
 * シート名: access_counter（存在しなければ自動作成）
 * A1: total / B1: 総アクセス数
 *
 * ブラウザごとの「1日1回」判定はGitHub Pages側のlocalStorageで行います。
 * GAS側は mode=count のときだけ安全に+1し、mode=read のときは現在値だけ返します。
 */

const COUNTER_SHEET_NAME = 'access_counter';

function doGet(e) {
  try {
    const mode = String((e && e.parameter && e.parameter.mode) || 'read').toLowerCase();
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getCounterSheet_();
      let total = Number(sheet.getRange('B1').getValue()) || 0;
      let counted = false;

      if (mode === 'count') {
        total += 1;
        sheet.getRange('B1').setValue(total);
        sheet.getRange('B2').setValue(new Date());
        counted = true;
      }

      return json_({ ok: true, total: total, counted: counted });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function getCounterSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('スプレッドシートに紐づいたApps Scriptとして実行してください。');

  let sheet = ss.getSheetByName(COUNTER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(COUNTER_SHEET_NAME);
    sheet.getRange('A1').setValue('total');
    sheet.getRange('B1').setValue(0);
    sheet.getRange('A2').setValue('lastUpdated');
    sheet.getRange('B2').setValue('');
  }
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
