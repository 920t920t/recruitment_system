/**
 * 人材紹介システム用スプレッドシートセットアップ
 * Google Apps Script (GAS) で実行してください
 */

function setupRecruitmentSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // 最初に新しいシートを1つ作成してから、既存のシートを削除
  const tempSheet = spreadsheet.insertSheet('temp');
  
  // 既存のシートを削除（「シート1」など）
  const existingSheets = spreadsheet.getSheets();
  existingSheets.forEach(sheet => {
    const sheetName = sheet.getName();
    if (sheetName === 'シート1' || sheetName === 'Sheet1' || sheetName === 'シート 1') {
      spreadsheet.deleteSheet(sheet);
    }
  });
  
  // 各シートの定義
  const sheetsConfig = [
    {
      name: '求職者マスタ',
      headers: [
        'ID', '氏名', 'メールアドレス', '年齢', '現在の職種', '経験年数',
        '希望年収', '希望勤務地', '詳細希望地域', '土日休み希望', '年間休日希望',
        '応募条件', '優先度1位', '優先度2位', '優先度3位', '絶対外せない条件',
        '担当者', '登録日', '最終連絡日', 'ステータス', '履歴書ファイル',
        '職務経歴書ファイル', '備考'
      ]
    },
    {
      name: '求人マスタ',
      headers: [
        'ID', '求人名', '会社名', '年収', '勤務地', '土日休み', '年間休日',
        '応募条件', '職種', '業界', '雇用形態', '勤務時間', '福利厚生',
        '担当者', 'ステータス', '掲載開始日', '掲載終了日', '応募者数',
        '面接数', '採用予定数', '実際採用数', '元ファイル名', 'AI確信度',
        '最終更新日', '備考'
      ]
    },
    {
      name: '企業マスタ',
      headers: [
        'ID', '会社名', '業界', '事業内容', '従業員数', '資本金',
        '本社所在地', '設立年', 'URL', '担当窓口名', '担当部署',
        '電話番号', 'メールアドレス', '取引開始日', '契約種別',
        '手数料率', 'ステータス', '信用度', '取引実績', '備考'
      ]
    },
    {
      name: '応募管理',
      headers: [
        'ID', '求職者ID', '求職者名', '求人ID', '求人名', '会社名',
        '応募日', 'ステータス', '書類選考結果', '書類選考日', 
        '一次面接日', '一次面接結果', '二次面接日', '二次面接結果',
        '最終面接日', '最終面接結果', '内定日', '入社予定日',
        '年収提示額', '条件交渉メモ', '求職者フィードバック', '企業フィードバック',
        '次回アクション', '次回アクション日', '担当者', '最終更新日', '備考'
      ]
    },
    {
      name: '面接スケジュール',
      headers: [
        'ID', '応募ID', '求職者名', '会社名', '求人名', '面接種別',
        '面接日時', '面接場所', '面接形式', '面接官', '面接時間',
        '事前準備メモ', '面接結果', '評価点', '通過可否', 
        '企業コメント', '求職者感想', 'フォローアップ要否', 
        '次回面接日程', '担当者', '作成日', '更新日'
      ]
    },
    {
      name: '成約・入社管理',
      headers: [
        'ID', '求職者ID', '求職者名', '求人ID', '求人名', '会社名',
        '内定日', '入社日', '入社後年収', '入社時条件', '試用期間',
        '成約手数料', '支払予定日', '支払完了日', '支払ステータス',
        '3ヶ月後フォロー日', '6ヶ月後フォロー日', '1年後フォロー日',
        '定着状況', '満足度', '追加サポート', '担当者', '成約日', '備考'
      ]
    },
    {
      name: 'アクティビティログ',
      headers: [
        'ID', '日時', 'アクション種別', '対象タイプ', '対象ID', '対象名',
        '実行者', '詳細内容', 'Before値', 'After値', 'IPアドレス', 'ユーザーエージェント'
      ]
    },
    {
      name: '月次統計',
      headers: [
        '年月', '新規求職者登録数', '新規求人登録数', '新規企業登録数',
        '総応募数', '書類通過数', '面接実施数', '内定数', '入社数',
        '成約率', '売上金額', '目標達成率', '担当者別成約数',
        'KPI達成状況', '課題・改善点'
      ]
    },
    {
      name: 'KPIダッシュボード',
      headers: [
        '項目名', '目標値', '実績値', '達成率', '前月比', '前年同月比',
        '更新日', 'ステータス', '担当者', 'アクションプラン'
      ]
    },
    {
      name: 'システム設定',
      headers: [
        '設定項目', '設定値', '説明', 'カテゴリ', '更新日', '更新者', '備考'
      ]
    },
    {
      name: 'ユーザー管理',
      headers: [
        'ID', 'ユーザー名', 'メールアドレス', '役割', '権限レベル',
        'アクセス可能機能', '最終ログイン日', 'アカウント状態',
        '作成日', '作成者', '更新日', '備考'
      ]
    }
  ];
  
  // 各シートを作成
  sheetsConfig.forEach((config, index) => {
    console.log(`Creating sheet: ${config.name}`);
    
    // シートを作成
    const sheet = spreadsheet.insertSheet(config.name);
    
    // ヘッダー行を設定
    const headerRange = sheet.getRange(1, 1, 1, config.headers.length);
    headerRange.setValues([config.headers]);
    
    // ヘッダーのスタイル設定
    headerRange.setBackground('#2563eb');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 列幅を自動調整
    config.headers.forEach((header, colIndex) => {
      sheet.autoResizeColumn(colIndex + 1);
    });
    
    // フィルター機能を追加
    sheet.getRange(1, 1, 1, config.headers.length).createFilter();
    
    // 行を固定
    sheet.setFrozenRows(1);
    
    console.log(`✅ Sheet "${config.name}" created with ${config.headers.length} columns`);
  });
  
  // 一時シートを削除
  spreadsheet.deleteSheet(tempSheet);
  
  // サンプルデータを追加
  addSampleData(spreadsheet);
  
  console.log('🎉 All sheets have been created successfully!');
  
  // 完了メッセージ
  SpreadsheetApp.getUi().alert(
    '完了', 
    '人材紹介システム用のシートが正常に作成されました！\n\n作成されたシート:\n' + 
    sheetsConfig.map((config, index) => `${index + 1}. ${config.name}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * サンプルデータを追加
 */
function addSampleData(spreadsheet) {
  // 求職者マスタのサンプルデータ
  const jobSeekersSheet = spreadsheet.getSheetByName('求職者マスタ');
  const jobSeekersSampleData = [
    [
      '1', '田中太郎', 'tanaka@example.com', '28', 'Webデザイナー', '5年',
      '450-550万円', '東京都', '渋谷区希望', 'あり', '125日以上',
      'デザイン経験5年以上', '年収', '勤務地', '休日',
      '土日祝日休み必須', '山田花子', '2024-01-15', '2024-01-20',
      '活動中', 'resume_tanaka.pdf', 'career_tanaka.pdf', 'リモートワーク希望'
    ],
    [
      '2', '佐藤花子', 'sato@example.com', '32', 'マーケティング', '8年',
      '600-700万円', '大阪府', '梅田周辺', 'あり', '120日以上',
      'マーケティング経験3年以上', '会社の成長性', '年収', '職種',
      '残業月20時間以下', '鈴木一郎', '2024-01-10', '2024-01-25',
      '面接中', 'resume_sato.pdf', 'career_sato.pdf', '外資系企業希望'
    ]
  ];
  
  if (jobSeekersSampleData.length > 0) {
    jobSeekersSheet.getRange(2, 1, jobSeekersSampleData.length, jobSeekersSampleData[0].length)
                   .setValues(jobSeekersSampleData);
  }
  
  // 求人マスタのサンプルデータ
  const jobsSheet = spreadsheet.getSheetByName('求人マスタ');
  const jobsSampleData = [
    [
      '1', 'Webデザイナー', '株式会社テクノロジー', '400-500万円', '東京都渋谷区',
      'あり', '125日', 'Webデザイン経験3年以上', 'デザイナー', 'IT・Web',
      '正社員', '9:00-18:00', '各種社会保険完備', '田中太郎', '募集中',
      '2024-01-01', '2024-03-31', '5', '2', '1', '0',
      'webdesigner_job.pdf', '0.85', '2024-01-15', '急募案件'
    ],
    [
      '2', 'マーケティングマネージャー', '株式会社グロース', '600-800万円', '大阪府大阪市',
      'あり', '120日', 'マーケティング経験5年以上', 'マーケティング', 'コンサル',
      '正社員', '9:30-18:30', '各種社会保険、退職金制度', '山田花子', '募集中',
      '2024-01-05', '2024-04-30', '3', '1', '1', '0',
      'marketing_manager.pdf', '0.92', '2024-01-20', '管理職候補'
    ]
  ];
  
  if (jobsSampleData.length > 0) {
    jobsSheet.getRange(2, 1, jobsSampleData.length, jobsSampleData[0].length)
             .setValues(jobsSampleData);
  }
  
  // システム設定のサンプルデータ
  const settingsSheet = spreadsheet.getSheetByName('システム設定');
  const settingsSampleData = [
    ['API_KEY', '', 'OpenAI APIキー', 'AI設定', new Date(), 'システム', 'AI機能で使用'],
    ['COMPANY_NAME', '人材紹介株式会社', '会社名', 'システム', new Date(), 'システム', 'システム表示用'],
    ['EMAIL_NOTIFICATION', 'true', 'メール通知', '通知設定', new Date(), 'システム', '各種通知の有効/無効'],
    ['AUTO_BACKUP', 'true', '自動バックアップ', 'システム', new Date(), 'システム', '日次自動バックアップ']
  ];
  
  if (settingsSampleData.length > 0) {
    settingsSheet.getRange(2, 1, settingsSampleData.length, settingsSampleData[0].length)
                 .setValues(settingsSampleData);
  }
  
  console.log('✅ Sample data added successfully');
}

/**
 * スプレッドシートIDを取得する関数
 */
function getSpreadsheetId() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const id = spreadsheet.getId();
  console.log(`Spreadsheet ID: ${id}`);
  SpreadsheetApp.getUi().alert('スプレッドシートID', `ID: ${id}`, SpreadsheetApp.getUi().ButtonSet.OK);
  return id;
}

/**
 * すべてのシート名を表示する関数
 */
function listAllSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  const sheetNames = sheets.map(sheet => sheet.getName());
  
  console.log('All sheets:', sheetNames);
  SpreadsheetApp.getUi().alert(
    'シート一覧', 
    sheetNames.map((name, index) => `${index + 1}. ${name}`).join('\n'), 
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}