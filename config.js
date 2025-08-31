/**
 * システム設定ファイル
 * 人材紹介システム用
 */

const CONFIG = {
    // Google Apps Script URL（実際のデプロイURLに変更してください）
    GAS_URL: 'https://script.google.com/macros/s/AKfycbwFw50sGgSkOGeIpJqWbFqnT2HNloecNk4FwJf4yQtmO1zG6s9qjOACyH813VNcmVgp/exec', // ← ここにあなたのGAS WebアプリURLを貼り付け
    // Google スプレッドシート ID
    SPREADSHEET_ID: '1OsOQXGbbg8uS6Bg5JCFaPpqPX9aeEtWJHIKqgnzF96w',
    
    // システム設定
    TIMEOUT: 30000,
    DEBUG_MODE: false,
    
    // シート名
    SHEETS: {
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
    }
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// ES Module対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}