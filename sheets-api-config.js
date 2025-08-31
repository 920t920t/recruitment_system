/**
 * Google Sheets API設定・連携モジュール
 * 人材紹介システム用
 */

// Google Sheets API設定（グローバル変数として設定）
window.SHEETS_CONFIG = {
    // APIキー（ローカルストレージから取得、またはデフォルト）
    API_KEY: localStorage.getItem('google_sheets_api_key') || 'YOUR_GOOGLE_SHEETS_API_KEY',
    
    // スプレッドシートID
    SPREADSHEET_ID: '1OsOQXGbbg8uS6Bg5JCFaPpqPX9aeEtWJHIKqgnzF96w',
    
    // シート名定義（実際のスプレッドシート構造に合わせて更新）
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

// Google Sheets API初期化
function initGoogleSheetsAPI() {
    return new Promise((resolve, reject) => {
        // APIキーが設定されているかチェック
        const currentApiKey = localStorage.getItem('google_sheets_api_key');
        if (!currentApiKey || currentApiKey === 'YOUR_GOOGLE_SHEETS_API_KEY') {
            console.warn('Google Sheets APIキーが設定されていません');
            showError('Google Sheets APIキーを設定してください。API設定画面で設定できます。');
            reject(new Error('APIキーが未設定'));
            return;
        }
        
        // APIキーを最新に更新
        window.SHEETS_CONFIG.API_KEY = currentApiKey;
        
        if (typeof gapi === 'undefined') {
            console.log('🔄 Google APIライブラリをロード中...');
            // Google API ライブラリを動的ロード
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                console.log('📦 Google APIライブラリロード完了');
                gapi.load('client', () => {
                    console.log('🔧 Google API Clientロード完了、初期化開始...');
                    gapi.client.init({
                        apiKey: window.SHEETS_CONFIG.API_KEY,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                    }).then(() => {
                        console.log('✅ Google Sheets API初期化完了');
                        console.log('🔑 APIキー設定済み:', window.SHEETS_CONFIG.API_KEY.substring(0, 10) + '...');
                        resolve();
                    }).catch((initError) => {
                        console.error('❌ Google Sheets API初期化エラー:', initError);
                        reject(initError);
                    });
                });
            };
            script.onerror = (loadError) => {
                console.error('❌ Google APIライブラリロードエラー:', loadError);
                reject(loadError);
            };
            document.head.appendChild(script);
        } else {
            console.log('🔄 Google Sheets API再初期化中...');
            // 既にロード済みの場合はAPIキーを更新
            gapi.client.init({
                apiKey: window.SHEETS_CONFIG.API_KEY,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            }).then(() => {
                console.log('✅ Google Sheets API再初期化完了');
                console.log('🔑 APIキー更新済み:', window.SHEETS_CONFIG.API_KEY.substring(0, 10) + '...');
                resolve();
            }).catch((reinitError) => {
                console.error('❌ Google Sheets API再初期化エラー:', reinitError);
                reject(reinitError);
            });
        }
    });
}

// データ取得（READ）
async function getSheetData(sheetName, range = '') {
    try {
        console.log('📊 データ取得開始:', sheetName, range);
        console.log('🔑 使用中のAPIキー:', window.SHEETS_CONFIG.API_KEY.substring(0, 10) + '...');
        console.log('📋 スプレッドシートID:', window.SHEETS_CONFIG.SPREADSHEET_ID);
        
        const fullRange = range ? `${sheetName}!${range}` : sheetName;
        console.log('📍 取得範囲:', fullRange);
        
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: window.SHEETS_CONFIG.SPREADSHEET_ID,
            range: fullRange,
        });
        
        console.log('✅ データ取得成功:', response.result);
        return response.result.values || [];
    } catch (error) {
        console.error('❌ データ取得エラー:', error);
        console.error('エラー詳細:', {
            status: error.status,
            statusText: error.statusText,
            body: error.body,
            message: error.message
        });
        throw error;
    }
}

// データ追加（CREATE）
async function appendSheetData(sheetName, values) {
    try {
        console.log('➕ データ追加開始:', sheetName);
        console.log('📝 追加データ:', values);
        
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: window.SHEETS_CONFIG.SPREADSHEET_ID,
            range: sheetName,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values]
            }
        });
        
        console.log('✅ データ追加成功:', response.result);
        return response.result;
    } catch (error) {
        console.error('❌ データ追加エラー:', error);
        console.error('エラー詳細:', {
            status: error.status,
            statusText: error.statusText,
            body: error.body,
            message: error.message
        });
        throw error;
    }
}

// データ更新（UPDATE）
async function updateSheetData(sheetName, range, values) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: window.SHEETS_CONFIG.SPREADSHEET_ID,
            range: `${sheetName}!${range}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: values
            }
        });
        return response.result;
    } catch (error) {
        console.error('データ更新エラー:', error);
        throw error;
    }
}

// 求職者データ保存
async function saveJobSeekerData(jobSeekerData) {
    try {
        // データを配列形式に変換（スプレッドシートの列順に合わせる）
        const rowData = [
            new Date().toISOString(), // 登録日時
            jobSeekerData.name || '',
            jobSeekerData.kana || '',
            jobSeekerData.email || '',
            jobSeekerData.phone || '',
            jobSeekerData.birthdate || '',
            jobSeekerData.gender || '',
            jobSeekerData.prefecture || '',
            jobSeekerData.city || '',
            jobSeekerData.address || '',
            jobSeekerData.nearestStation || '',
            jobSeekerData.currentCompany || '',
            jobSeekerData.currentPosition || '',
            jobSeekerData.experience || '',
            jobSeekerData.skills || '',
            jobSeekerData.desiredSalary || '',
            jobSeekerData.desiredLocation || '',
            jobSeekerData.desiredIndustry || '',
            jobSeekerData.workStyle || '',
            jobSeekerData.availableStartDate || '',
            jobSeekerData.notes || '',
            jobSeekerData.priority || '中',
            'アクティブ' // ステータス
        ];

        const result = await appendSheetData(window.SHEETS_CONFIG.SHEETS.JOB_SEEKERS, rowData);
        
        // アクティビティログに記録
        await logActivity('求職者登録', `新規求職者登録: ${jobSeekerData.name}`);
        
        return result;
    } catch (error) {
        console.error('求職者データ保存エラー:', error);
        throw error;
    }
}

// 求人データ保存
async function saveJobListingData(jobListingData) {
    try {
        const rowData = [
            new Date().toISOString(), // 登録日時
            jobListingData.title || '',
            jobListingData.company || '',
            jobListingData.department || '',
            jobListingData.location || '',
            jobListingData.salaryMin || '',
            jobListingData.salaryMax || '',
            jobListingData.employmentType || '',
            jobListingData.workStyle || '',
            jobListingData.requirements || '',
            jobListingData.skills || '',
            jobListingData.benefits || '',
            jobListingData.description || '',
            jobListingData.applicationDeadline || '',
            jobListingData.startDate || '',
            jobListingData.clientContact || '',
            jobListingData.fee || '',
            jobListingData.priority || '中',
            'アクティブ', // ステータス
            jobListingData.aiConfidence || '',
            jobListingData.aiExtracted || 'false',
            jobListingData.source || 'manual',
            jobListingData.notes || '',
            new Date().toISOString() // 更新日時
        ];

        const result = await appendSheetData(window.SHEETS_CONFIG.SHEETS.JOB_LISTINGS, rowData);
        
        // アクティビティログに記録
        await logActivity('求人登録', `新規求人登録: ${jobListingData.title}`);
        
        return result;
    } catch (error) {
        console.error('求人データ保存エラー:', error);
        throw error;
    }
}

// アクティビティログ記録
async function logActivity(action, details, userId = 'system') {
    try {
        const logData = [
            new Date().toISOString(),
            userId,
            action,
            details,
            navigator.userAgent,
            window.location.href,
            '', // エラーメッセージ
            'success', // ステータス
            new Date().getTime(), // タイムスタンプ
            '', // 関連ID
            '', // 備考
            new Date().toISOString() // 作成日時
        ];

        return await appendSheetData(window.SHEETS_CONFIG.SHEETS.ACTIVITY_LOG, logData);
    } catch (error) {
        console.error('アクティビティログ記録エラー:', error);
    }
}

// 統計データ取得
async function getStatistics() {
    try {
        const [jobSeekers, jobListings, applications] = await Promise.all([
            getSheetData(window.SHEETS_CONFIG.SHEETS.JOB_SEEKERS),
            getSheetData(window.SHEETS_CONFIG.SHEETS.JOB_LISTINGS),
            getSheetData(window.SHEETS_CONFIG.SHEETS.APPLICATIONS)
        ]);

        // ヘッダー行を除外してカウント
        return {
            totalJobSeekers: Math.max(0, jobSeekers.length - 1),
            totalJobListings: Math.max(0, jobListings.length - 1),
            totalApplications: Math.max(0, applications.length - 1),
            activeJobSeekers: jobSeekers.slice(1).filter(row => row[22] === 'アクティブ').length,
            activeJobListings: jobListings.slice(1).filter(row => row[18] === 'アクティブ').length
        };
    } catch (error) {
        console.error('統計データ取得エラー:', error);
        return {
            totalJobSeekers: 0,
            totalJobListings: 0,
            totalApplications: 0,
            activeJobSeekers: 0,
            activeJobListings: 0
        };
    }
}

// エラーハンドリング用ユーティリティ
function showError(message, error = null) {
    console.error('エラー:', message, error);
    
    // ユーザーにエラーを表示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #f8d7da;
        color: #721c24;
        padding: 12px;
        border-radius: 6px;
        margin: 10px 0;
        border: 1px solid #f5c6cb;
        font-size: 14px;
    `;
    errorDiv.innerHTML = `
        <strong>エラーが発生しました:</strong><br>
        ${message}
        ${error ? `<br><small>${error.message}</small>` : ''}
    `;
    
    // フォームの上部にエラーメッセージを挿入
    const form = document.querySelector('form') || document.body;
    form.insertBefore(errorDiv, form.firstChild);
    
    // 5秒後にエラーメッセージを自動削除
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// 成功メッセージ表示
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        background: #d4edda;
        color: #155724;
        padding: 12px;
        border-radius: 6px;
        margin: 10px 0;
        border: 1px solid #c3e6cb;
        font-size: 14px;
    `;
    successDiv.innerHTML = `
        <strong>成功:</strong><br>
        ${message}
    `;
    
    const form = document.querySelector('form') || document.body;
    form.insertBefore(successDiv, form.firstChild);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// API初期化をページロード時に実行
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initGoogleSheetsAPI();
    } catch (error) {
        console.warn('Google Sheets API初期化に失敗しました。手動でAPIキーを設定してください。', error);
        showError('Google Sheets APIに接続できませんでした。設定を確認してください。');
    }
});