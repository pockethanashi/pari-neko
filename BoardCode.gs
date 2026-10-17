/**
 * みんなの猫好き掲示板 専用GAS（返信対応版）
 *
 * 旧9列形式の board シートには、初回アクセス時に replyTo 列を自動追加します。
 */

const BOARD_SHEET_NAME = 'board';
const BOARD_CATEGORIES = ['雑談', '好きな回', '好きな登場人物', '勝手に猫が好き感想'];
const BOARD_HEADERS = [
  'id','createdAt','name','category','title','body',
  'replyTo','status','clientId','adminMemo'
];

function doGet(e) {
  try {
    const mode = text_(e && e.parameter && e.parameter.mode) || 'list';
    const callback = text_(e && e.parameter && e.parameter.callback);
    if (mode !== 'list') return output_({ ok:false, error:'unknown mode' }, callback);
    return output_({ ok:true, posts:getPublishedPosts_() }, callback);
  } catch (err) {
    const callback = text_(e && e.parameter && e.parameter.callback);
    return output_({ ok:false, error:String(err && err.message ? err.message : err) }, callback);
  }
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (text_(p.website)) return htmlResponse_('OK');

    const category = text_(p.category);
    const title = text_(p.title);
    const body = text_(p.body);
    const name = text_(p.name) || '名無しの猫好き';
    const clientId = text_(p.clientId);
    const replyToRaw = text_(p.replyTo);
    const replyTo = replyToRaw ? Number(replyToRaw) : '';

    if (!BOARD_CATEGORIES.includes(category)) throw new Error('話題が不正です。');
    if (!title || title.length > 80) throw new Error('タイトルは1〜80文字で入力してください。');
    if (!body || body.length > 1500) throw new Error('本文は1〜1500文字で入力してください。');
    if (name.length > 30) throw new Error('お名前は30文字以内で入力してください。');
    if (replyToRaw && (!Number.isInteger(replyTo) || replyTo <= 0)) throw new Error('返信先が不正です。');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getBoardSheet_();
      if (replyToRaw && !postExists_(sheet, replyTo)) throw new Error('返信先の投稿が見つかりません。');

      sheet.appendRow([
        nextId_(sheet),
        new Date(),
        name,
        category,
        title,
        body,
        replyTo,
        'pending',
        clientId,
        ''
      ]);
    } finally {
      lock.releaseLock();
    }

    return htmlResponse_('投稿を受け付けました。');
  } catch (err) {
    return htmlResponse_('エラー: ' + String(err && err.message ? err.message : err));
  }
}

function getPublishedPosts_() {
  const sheet = getBoardSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, 10).getValues()
    .filter(row => text_(row[7]).toLowerCase() === 'published')
    .map(row => ({
      id: row[0],
      createdAt: formatDate_(row[1]),
      name: text_(row[2]) || '名無しの猫好き',
      category: text_(row[3]),
      title: text_(row[4]),
      body: text_(row[5]),
      replyTo: text_(row[6])
    }))
    .sort((a,b) => Number(b.id) - Number(a.id))
    .slice(0, 200);
}

function getBoardSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('掲示板専用スプレッドシートに紐づけてください。');

  let sheet = ss.getSheetByName(BOARD_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BOARD_SHEET_NAME);
    sheet.getRange(1,1,1,BOARD_HEADERS.length).setValues([BOARD_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  migrateBoardSheet_(sheet);
  return sheet;
}

function migrateBoardSheet_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1,1,1,lastColumn).getValues()[0].map(text_);

  // old: ... body, status, clientId, adminMemo
  // new: ... body, replyTo, status, clientId, adminMemo
  if (headers[6] === 'status' && !headers.includes('replyTo')) {
    sheet.insertColumnBefore(7);
    sheet.getRange(1,7).setValue('replyTo');
  }

  sheet.getRange(1,1,1,BOARD_HEADERS.length).setValues([BOARD_HEADERS]);
  sheet.setFrozenRows(1);
}

function postExists_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  return sheet.getRange(2,1,lastRow-1,1).getValues().flat().map(Number).includes(Number(id));
}

function nextId_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  const ids = sheet.getRange(2,1,lastRow-1,1).getValues().flat().map(Number).filter(Number.isFinite);
  return ids.length ? Math.max.apply(null, ids) + 1 : 1;
}

function formatDate_(value) {
  if (!(value instanceof Date)) return text_(value);
  return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
}

function text_(value) {
  return String(value == null ? '' : value).trim();
}

function output_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlResponse_(message) {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><body style="font-family:sans-serif">' +
    escapeHtml_(message) +
    '</body></html>'
  );
}

function escapeHtml_(value) {
  return text_(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
