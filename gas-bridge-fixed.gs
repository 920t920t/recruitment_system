/**
 * Google Apps Script - 人材紹介システム連携ブリッジ（修正版）
 */

// スプレッドシートID
const SPREADSHEET_ID = '1OsOQXGbbg8uS6Bg5JCFaPpqPX9aeEtWJHIKqgnzF96w';

// シート名定義
const SHEETS = {
  JOB_SEEKERS: '求職者マスタ',
  JOB_LISTINGS: '求人マスタ',
  COMPANIES: '企業マスタ',
  APPLICATIONS: '応募管理',
  INTERVIEWS: '面接スケジュール',
  CONTRACTS: '成約・入社管理',
  ACTIVITY_LOG: 'アクティビティログ',
  MONTHLY_STATS: '月次統計',
  KPI_DASHBOARD: 'KPIダッシュボード',
  SYSTEM_SETTINGS: 'システム設定',
  USER_MANAGEMENT: 'ユーザー管理'
};

/**
 * POST リクエスト処理
 */
function jsonOk(dataObj) {
  const out = ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: dataObj,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
  try { out.setHeader('Access-Control-Allow-Origin', '*'); } catch (_) {}
  try { out.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); } catch (_) {}
  try { out.setHeader('Access-Control-Allow-Headers', 'Content-Type'); } catch (_) {}
  return out;
}

function jsonErr(message) {
  const out = ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
  try { out.setHeader('Access-Control-Allow-Origin', '*'); } catch (_) {}
  try { out.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); } catch (_) {}
  try { out.setHeader('Access-Control-Allow-Headers', 'Content-Type'); } catch (_) {}
  return out;
}

// JSONPレスポンス（CORS回避用・読み取り専用）
function jsonpOk(dataObj, callback) {
  const payload = {
    success: true,
    data: dataObj,
    timestamp: new Date().toISOString()
  };
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  try {
    // jsonData（フォーム/URLエンコード）または純JSONボディの両対応
    let requestData = {};
    if (e && e.parameter && e.parameter.jsonData) {
      requestData = JSON.parse(e.parameter.jsonData);
    } else if (e && e.postData && e.postData.contents) {
      const raw = e.postData.contents;
      const ctype = (e.postData.type || '').toLowerCase();
      if (ctype.indexOf('application/x-www-form-urlencoded') !== -1) {
        // URLエンコードをパース
        const params = {};
        raw.split('&').forEach(pair => {
          const eq = pair.indexOf('=');
          const k = eq >= 0 ? pair.substring(0, eq) : pair;
          const v = eq >= 0 ? pair.substring(eq + 1) : '';
          const key = decodeURIComponent(k.replace(/\+/g, ' '));
          const val = decodeURIComponent(v.replace(/\+/g, ' '));
          params[key] = val;
        });
        if (params.jsonData) {
          requestData = JSON.parse(params.jsonData);
        } else {
          throw new Error('jsonData パラメータが見つかりません');
        }
      } else {
        // application/json での送信
        requestData = JSON.parse(raw);
      }
    } else {
      throw new Error('POSTデータが空です');
    }

    const action = requestData.action;
    let result;
    switch (action) {
      case 'saveJobSeeker':
        result = saveJobSeekerData(requestData.data);
        break;
      case 'saveJobListing':
        result = saveJobListingData(requestData.data);
        break;
      case 'aiExtract':
        result = aiExtractFromText(requestData.data);
        break;
      case 'getJobSeekers':
        result = getJobSeekers();
        break;
      case 'getJobListings':
        result = getJobListings();
        break;
      case 'upsertApplication':
        result = upsertApplication(requestData.data);
        break;
      case 'getStats':
        result = getStatistics();
        break;
      case 'logActivity':
        result = logActivity(requestData.data);
        break;
      default:
        throw new Error('未対応のアクション: ' + action);
    }
    return jsonOk(result);
  } catch (error) {
    console.error('エラー:', error);
    return jsonErr(error.message);
  }
}

/**
 * GET リクエスト処理
 */
function doGet(e) {
  try {
    // クエリで action=getStats 等を許容
    const action = e && e.parameter && e.parameter.action;
    const cb = e && e.parameter && e.parameter.callback; // JSONPコールバック
    if (action === 'getStats') {
      const data = getStatistics();
      return cb ? jsonpOk(data, cb) : jsonOk(data);
    }
    if (action === 'getJobSeekers') {
      const data = getJobSeekers();
      return cb ? jsonpOk(data, cb) : jsonOk(data);
    }
    if (action === 'getJobListings') {
      const data = getJobListings();
      return cb ? jsonpOk(data, cb) : jsonOk(data);
    }
    const out = ContentService.createTextOutput('Google Apps Script Bridge for 人材紹介システム - 動作中')
      .setMimeType(ContentService.MimeType.TEXT);
    try { out.setHeader('Access-Control-Allow-Origin', '*'); } catch (_) {}
    try { out.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); } catch (_) {}
    try { out.setHeader('Access-Control-Allow-Headers', 'Content-Type'); } catch (_) {}
    return out;
  } catch (err) {
    return jsonErr(err.message);
  }
}

/**
 * 求職者データ保存
 */
function saveJobSeekerData(jobSeekerData) {
  console.log('求職者データ保存開始:', jobSeekerData);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.JOB_SEEKERS);
  if (!sheet) throw new Error('求職者マスタシートが見つかりません');

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row = new Array(headers.length).fill('');

  const get = (k, alt) => (jobSeekerData[k] != null ? jobSeekerData[k] : (alt != null ? jobSeekerData[alt] : ''));
  headers.forEach((h, i) => {
    switch (String(h).trim()) {
      case 'ID': row[i] = Utilities.getUuid(); break;
      case '氏名': row[i] = get('name'); break;
      case 'メールアドレス': row[i] = get('email'); break;
      case '年齢': row[i] = get('age'); break;
      case '現在の職種': row[i] = get('currentPosition'); break;
      case '経験年数': row[i] = get('experience'); break;
      case '希望年収': row[i] = get('desiredSalary'); break;
      case '希望勤務地': row[i] = get('desiredLocation'); break;
      case '詳細希望地域': row[i] = get('specificCity'); break;
      case '土日休み希望': row[i] = get('weekendOff'); break;
      case '年間休日希望': row[i] = ''; break;
      case '応募条件': row[i] = get('requirements'); break;
      case '優先度1位': row[i] = get('priority1'); break;
      case '優先度2位': row[i] = get('priority2'); break;
      case '優先度3位': row[i] = get('priority3'); break;
      case '絶対外せない条件': row[i] = get('requirements'); break;
      case '担当者': row[i] = get('assignedTo'); break;
      case '登録日': row[i] = new Date(); break;
      case '最終連絡日': row[i] = ''; break;
      case 'ステータス': row[i] = 'アクティブ'; break;
      case '履歴書ファイル': row[i] = get('resumeFile'); break;
      case '職務経歴書ファイル': row[i] = get('jobHistoryFile'); break;
      case '備考': row[i] = get('notes'); break;
      default:
        // 既存の汎用フィールドにも配慮
        if (h === '登録日時') row[i] = new Date();
        else if (h === 'かな' || h === 'カナ') row[i] = get('kana');
        else if (h === '電話番号') row[i] = get('phone');
        else if (h === '住所') row[i] = get('address');
        else row[i] = '';
    }
  });

  sheet.appendRow(row);

  const result = { message: '求職者データが正常に保存されました', rowCount: sheet.getLastRow(), name: jobSeekerData.name };
  console.log('求職者データ保存完了:', result);
  try { logActivity({ action: '求職者登録', details: `新規求職者登録: ${jobSeekerData.name}`, userId: 'system' }); } catch (e) {}
  return result;
}

/**
 * 求人データ保存
 */
function saveJobListingData(jobListingData) {
  console.log('求人データ保存開始:', jobListingData);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.JOB_LISTINGS);
  if (!sheet) throw new Error('求人マスタシートが見つかりません');

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row = new Array(headers.length).fill('');

  // 年収テキストを作成
  const salaryText = (() => {
    const s = (jobListingData.salary || '').toString();
    const min = jobListingData.salaryMin != null ? String(jobListingData.salaryMin) : '';
    const max = jobListingData.salaryMax != null ? String(jobListingData.salaryMax) : '';
    if (s) return s;
    if (min || max) return `${min}${(min||max)?'-':''}${max}`;
    return '';
  })();

  headers.forEach((h, i) => {
    switch (String(h).trim()) {
      case 'ID': row[i] = Utilities.getUuid(); break;
      case '求人名': row[i] = jobListingData.title || ''; break;
      case '会社名': row[i] = jobListingData.company || ''; break;
      case '年収': row[i] = salaryText; break;
      case '勤務地': row[i] = jobListingData.location || ''; break;
      case '土日休み': row[i] = jobListingData.weekendOff || ''; break;
      case '年間休日': row[i] = jobListingData.annualHolidays || ''; break;
      case '応募条件': row[i] = jobListingData.requirements || ''; break;
      case '職種': row[i] = jobListingData.department || jobListingData.jobType || ''; break;
      case '業界': row[i] = jobListingData.industry || ''; break;
      case '雇用形態': row[i] = jobListingData.employmentType || ''; break;
      case '勤務時間': row[i] = jobListingData.workingHours || ''; break;
      case '福利厚生': row[i] = jobListingData.benefits || ''; break;
      case '担当者': row[i] = jobListingData.assignedTo || ''; break;
      case 'ステータス': row[i] = jobListingData.status || '募集中'; break;
      case '掲載開始日': row[i] = jobListingData.startDate || ''; break;
      case '掲載終了日': row[i] = jobListingData.applicationDeadline || ''; break;
      case '応募者数': row[i] = jobListingData.applicants || ''; break;
      case '面接数': row[i] = jobListingData.interviews || ''; break;
      case '採用予定数': row[i] = jobListingData.plannedHires || ''; break;
      case '実際採用数': row[i] = jobListingData.actualHires || ''; break;
      case '元ファイル名': row[i] = jobListingData.sourceFileName || jobListingData.source || ''; break;
      case 'AI確信度': row[i] = jobListingData.aiConfidence || ''; break;
      case '最終更新日': row[i] = new Date(); break;
      case '備考': row[i] = jobListingData.notes || ''; break;
      default:
        // よくある追加カラム
        if (h === '作成日' || h === '登録日時' || h === '登録日') row[i] = new Date();
        else if (h === 'メモ') row[i] = jobListingData.notes || '';
        else row[i] = row[i] || '';
    }
  });

  sheet.appendRow(row);

  const result = {
    message: '求人データが正常に保存されました',
    rowCount: sheet.getLastRow(),
    title: jobListingData.title
  };
  console.log('求人データ保存完了:', result);
  try { logActivity({ action: '求人登録', details: `新規求人登録: ${jobListingData.title}`, userId: 'system' }); } catch (e) {}
  return result;
}

/**
 * 求職者一覧取得（ヘッダーをキーにしたオブジェクト配列）
 */
function getJobSeekers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEETS.JOB_SEEKERS);
  if (!sh) throw new Error('求職者マスタシートが見つかりません');
  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return [];
  const header = values[0];
  const rows = values.slice(1);
  return rows.map(r => header.reduce((o, h, i) => { o[h] = r[i]; return o; }, {}));
}

/**
 * 求人一覧取得（ヘッダーをキーにしたオブジェクト配列）
 */
function getJobListings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEETS.JOB_LISTINGS);
  if (!sh) throw new Error('求人マスタシートが見つかりません');
  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return [];
  const header = values[0];
  const rows = values.slice(1);
  return rows.map(r => header.reduce((o, h, i) => { o[h] = r[i]; return o; }, {}));
}

/**
 * 応募管理へ登録/更新（求職者名＋会社名＋求人名でUpsert）
 */
function upsertApplication(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEETS.APPLICATIONS);
  if (!sh) throw new Error('応募管理シートが見つかりません');

  const seekerName = data.jobSeekerName || '';
  const jobTitle = data.jobTitle || '';
  const company = data.company || '';
  const status = data.status || '候補';
  const notes = data.notes || '';

  // ヘッダーを特定
  const range = sh.getDataRange();
  const values = range.getValues();
  if (values.length < 1) throw new Error('応募管理シートにヘッダーがありません');
  const header = values[0];
  const idx = (name) => header.indexOf(name);

  // 主キー相当で検索（求職者名 + 会社名 + 求人名）
  let foundRow = -1;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const seekerCol = idx('求職者名');
    const companyCol = idx('会社名');
    const jobCol = idx('求人名');
    if (seekerCol === -1 || companyCol === -1 || jobCol === -1) break;
    if (String(row[seekerCol]) === seekerName && String(row[companyCol]) === company && String(row[jobCol]) === jobTitle) {
      foundRow = i + 1; // シート行番号
      break;
    }
  }

  const now = new Date();
  if (foundRow > 0) {
    // 更新
    const statusCol = idx('ステータス');
    const updatedCol = idx('最終更新日');
    const notesCol = idx('備考');
    if (statusCol >= 0) sh.getRange(foundRow, statusCol + 1).setValue(status);
    if (updatedCol >= 0) sh.getRange(foundRow, updatedCol + 1).setValue(now);
    if (notesCol >= 0 && notes) sh.getRange(foundRow, notesCol + 1).setValue(notes);
  } else {
    // 追加（主要列が存在する範囲で）
    const record = [];
    const map = {};
    header.forEach((h, i) => map[h] = i);
    const row = new Array(header.length).fill('');
    if (map['ID'] !== undefined) row[map['ID']] = Utilities.getUuid();
    if (map['求職者名'] !== undefined) row[map['求職者名']] = seekerName;
    if (map['求人名'] !== undefined) row[map['求人名']] = jobTitle;
    if (map['会社名'] !== undefined) row[map['会社名']] = company;
    if (map['応募日'] !== undefined) row[map['応募日']] = now;
    if (map['ステータス'] !== undefined) row[map['ステータス']] = status;
    if (map['備考'] !== undefined) row[map['備考']] = notes;
    if (map['最終更新日'] !== undefined) row[map['最終更新日']] = now;
    sh.appendRow(row);
  }

  // ログ
  try { logActivity({ action: '応募管理Upsert', details: `${seekerName} => ${company}/${jobTitle}` }); } catch (e) {}
  return { message: '応募管理に登録しました' };
}

/**
 * 統計データ取得
 */
function getStatistics() {
  console.log('統計データ取得開始');
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const jobSeekersSheet = ss.getSheetByName(SHEETS.JOB_SEEKERS);
  const jobListingsSheet = ss.getSheetByName(SHEETS.JOB_LISTINGS);
  
  if (!jobSeekersSheet || !jobListingsSheet) {
    throw new Error('必要なシートが見つかりません');
  }
  const stats = {
    totalJobSeekers: Math.max(0, jobSeekersSheet.getLastRow() - 1),
    totalJobListings: Math.max(0, jobListingsSheet.getLastRow() - 1),
    totalApplications: 0,
    lastUpdated: new Date().toISOString(),
    activeJobSeekers: 0,
    activeJobListings: 0
  };

  try {
    const seekerValues = jobSeekersSheet.getDataRange().getValues();
    const seekerHeaders = seekerValues[0] || [];
    const seekerStatusIdx = seekerHeaders.indexOf('ステータス');
    if (seekerValues.length > 1 && seekerStatusIdx >= 0) {
      stats.activeJobSeekers = seekerValues.slice(1).filter(r => r[seekerStatusIdx] === 'アクティブ').length;
    }

    const jobValues = jobListingsSheet.getDataRange().getValues();
    const jobHeaders = jobValues[0] || [];
    const jobStatusIdx = jobHeaders.indexOf('ステータス');
    if (jobValues.length > 1 && jobStatusIdx >= 0) {
      stats.activeJobListings = jobValues.slice(1).filter(r => r[jobStatusIdx] === 'アクティブ').length;
    }
  } catch (error) {
    console.warn('アクティブ数カウントエラー:', error);
    stats.activeJobSeekers = stats.totalJobSeekers;
    stats.activeJobListings = stats.totalJobListings;
  }
  
  console.log('統計データ取得完了:', stats);
  return stats;
}

/**
 * アクティビティログ記録
 */
function logActivity(activityData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.ACTIVITY_LOG);
    
    if (!sheet) {
      console.warn('アクティビティログシートが見つかりません');
      return { message: 'ログシートが見つかりません' };
    }
    
    const logData = [
      new Date(), // 日時
      activityData.userId || 'system', // ユーザーID
      activityData.action || '', // アクション
      activityData.details || '', // 詳細
      activityData.userAgent || '', // ユーザーエージェント
      activityData.url || '', // URL
      '', // エラーメッセージ
      'success', // ステータス
      new Date().getTime(), // タイムスタンプ
      activityData.relatedId || '', // 関連ID
      activityData.notes || '', // 備考
      new Date() // 作成日時
    ];
    
    sheet.appendRow(logData);
    
    return { message: 'アクティビティログを記録しました' };
  } catch (error) {
    console.error('ログ記録エラー:', error);
    return { message: 'ログ記録に失敗しました: ' + error.message };
  }
}

/**
 * テスト関数群
 */

function testSaveJobSeeker() {
  const testData = {
    name: 'テスト太郎',
    email: 'test@example.com',
    phone: '090-1234-5678',
    prefecture: '東京都',
    skills: 'JavaScript, Python'
  };
  
  try {
    console.log('📝 テストデータ:', testData);
    const result = saveJobSeekerData(testData);
    console.log('✅ 求職者データ保存成功:', result);
    return result;
  } catch (error) {
    console.error('❌ 求職者データ保存失敗:', error);
    return error.message;
  }
}

function testGetStatistics() {
  try {
    const stats = getStatistics();
    console.log('✅ 統計データ取得成功:', stats);
    return stats;
  } catch (error) {
    console.error('❌ 統計データ取得失敗:', error);
    return error.message;
  }
}

function testSpreadsheetAccess() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('スプレッドシート名:', ss.getName());
    return 'SUCCESS: ' + ss.getName();
  } catch (error) {
    console.error('エラー:', error);
    return error.message;
  }
}

function checkSheetNames() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  
  console.log('=== 実際のシート名一覧 ===');
  sheets.forEach((sheet, index) => {
    console.log(`${index + 1}: ${sheet.getName()}`);
  });
  
  // 求職者マスタシートの存在確認
  const jobSeekersSheet = ss.getSheetByName('求職者マスタ');
  if (jobSeekersSheet) {
    console.log('✅ 求職者マスタシートが見つかりました');
  } else {
    console.log('❌ 求職者マスタシートが見つかりません');
  }
  
  return '完了';
}

/**
 * 求職者マスタの推奨ヘッダー仕様を返す
 */
function getJobSeekerHeaderSpec() {
  return [
    'ID', '氏名', 'メールアドレス', '年齢', '現在の職種', '経験年数',
    '希望年収', '希望勤務地', '詳細希望地域', '土日休み希望',
    '年間休日希望', '応募条件', '優先度1位', '優先度2位', '優先度3位',
    '絶対外せない条件', '担当者', '登録日', '最終連絡日', 'ステータス',
    '履歴書ファイル', '職務経歴書ファイル', '備考'
  ];
}

/**
 * 現在のヘッダーと推奨ヘッダーの差分確認
 */
function getJobSeekerHeaderStatus() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEETS.JOB_SEEKERS);
  if (!sh) throw new Error('求職者マスタシートが見つかりません');
  const current = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const target = getJobSeekerHeaderSpec();
  return {
    currentHeaders: current,
    targetHeaders: target,
    matches: current.length === target.length && current.every((h, i) => String(h) === String(target[i]))
  };
}

/**
 * 推奨ヘッダーに置き換え（データは列位置のまま。順序が変わる場合は後続で手動調整推奨）
 */
function applyJobSeekerHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEETS.JOB_SEEKERS);
  if (!sh) throw new Error('求職者マスタシートが見つかりません');

  const target = getJobSeekerHeaderSpec();
  const needed = target.length;
  const have = sh.getLastColumn();
  if (have < needed) {
    sh.insertColumnsAfter(have, needed - have);
  }
  sh.getRange(1, 1, 1, needed).setValues([target]);
  sh.setFrozenRows(1);
  return { message: 'ヘッダーを適用しました', columns: needed };
}

/**
 * OpenAIを用いた求人情報抽出（サーバ側プロキシ）
 * 引数: { text: string, prompt?: string, model?: string }
 */
function aiExtractFromText(payload) {
  if (!payload || !payload.text) {
    throw new Error('aiExtract: text が未指定です');
  }
  const scriptProps = PropertiesService.getScriptProperties();
  const apiKey = scriptProps.getProperty('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY が設定されていません（スクリプトプロパティに設定してください）');
  }

  const model = payload.model || 'gpt-4o';
  const defaultPrompt = 'あなたは日本の求人票解析の専門家です。以下の求人票テキストから情報を正確に抽出し、JSON形式で回答してください。\n\n' +
    '## 抽出ルール：\n' +
    '1. 求人タイトル：「募集職種」「職種名」「ポジション」などから抽出\n' +
    '2. 会社名：株式会社、有限会社、合同会社などの法人格も含める\n' +
    '3. 年収：「年収」「給与」「月給×12+賞与」で計算。範囲で記載（例：400-500万円）\n' +
    '4. 勤務地：都道府県名は必須、市区町村も可能な限り抽出\n' +
    '5. 土日休み：「土日祝休み」「完全週休2日制」→yes、「シフト制」「年間休日○○日のみ記載」→no\n' +
    '6. 年間休日：明記されている場合のみ数値抽出（例：125日）\n' +
    '7. 応募条件：学歴・経験・資格・スキルなど簡潔に（50文字以内）\n' +
    '8. 確信度：情報の明確さに基づき0.3-1.0で評価\n\n' +
    '## 出力JSON形式：\n' +
    '{\n' +
    '  "jobTitle": "具体的な職種名",\n' +
    '  "company": "正式な会社名",\n' +
    '  "salary": "年収レンジ（万円表記）",\n' +
    '  "location": "都道府県市区町村",\n' +
    '  "weekendOff": "yes/no/unknown",\n' +
    '  "annualHolidays": "数値+日（例：125日）",\n' +
    '  "requirements": "応募条件を簡潔に",\n' +
    '  "confidence": 0.0-1.0\n' +
    '}\n\n' +
    '## 分析対象テキスト：\n' +
    '{TEXT_PLACEHOLDER}\n\n' +
    '必ずJSON形式のみで回答してください。説明文は不要です。';

  const userPrompt = (payload.prompt || defaultPrompt).replace('{TEXT_PLACEHOLDER}', String(payload.text).substring(0, 4000));

  const url = 'https://api.openai.com/v1/chat/completions';
  const reqBody = {
    model: model,
    messages: [
      { role: 'system', content: 'あなたは求人票から情報を抽出する専門家です。正確にJSON形式で回答してください。' },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 800,
    temperature: 0.0
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    payload: JSON.stringify(reqBody),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('OpenAI API エラー: ' + code + ' ' + text);
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { throw new Error('OpenAI応答のJSON解析に失敗: ' + e.message); }
  const content = (((parsed || {}).choices || [])[0] || {}).message && (((parsed || {}).choices || [])[0]).message.content;
  if (!content) {
    throw new Error('OpenAI応答にcontentがありません');
  }
  // 応答からJSON部分を抽出
  let resultObj = null;
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      resultObj = JSON.parse(match[0]);
    }
  } catch (e) {
    // noop
  }
  if (!resultObj) {
    // JSONが抽出できなければrawを返す
    return { raw: content };
  }
  return resultObj;
}
