/**
 * Google Apps Script連携ライブラリ
 * 人材紹介システム用
 */

class GASConnector {
    constructor(gasUrl) {
        this.gasUrl = gasUrl;
        this.timeout = 30000; // 30秒タイムアウト
    }

    /**
     * GASにPOSTリクエストを送信（CORS回避版）
     */
    async sendRequest(action, data) {
        // 読み取り系はGETでCORSプリフライト回避
        const isRead = action === 'getStats' || action === 'getJobSeekers' || action === 'getJobListings';
        const url = isRead ? `${this.gasUrl}?action=${encodeURIComponent(action)}` : this.gasUrl;
        const requestData = {
            action: action,
            data: data,
            timestamp: new Date().toISOString()
        };
        console.log(`[GAS] ${action}開始:`);

        try {
            if (isRead) {
                try {
                    const res = await fetch(url, { method: 'GET', mode: 'cors' });
                    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
                    const text = await res.text();
                    const json = JSON.parse(text);
                    if (!json.success) throw new Error(json.error || '不明なエラーが発生しました');
                    return json.data;
                } catch (readErr) {
                    // JSONPフォールバック（CORS不要）
                    return await this.sendJsonp(action);
                }
            }

            // 書き込み系はPOST（プリフライト回避のためにフォームエンコード推奨）
            let response;
            try {
                const formBody = new URLSearchParams();
                formBody.append('jsonData', JSON.stringify(requestData));
                response = await fetch(this.gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                    body: formBody.toString(),
                    mode: 'cors'
                });
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const text = await response.text();
                const json = JSON.parse(text);
                if (!json.success) throw new Error(json.error || '不明なエラーが発生しました');
                return json.data;
            } catch (corsError) {
                console.warn(`[GAS] POST CORS失敗、フォーム送信で再試行:`, corsError.message);
                // 書き込みはフォーム送信フォールバック
                return await new GASFormSubmitter(this.gasUrl).submitData(action, data);
            }
        } catch (error) {
            console.error(`[GAS] ${action}完全失敗:`, error);
            throw new Error(`GAS連携エラー (${action}): ${error.message}`);
        }
    }

    // JSONPフォールバック（読み取り専用）
    sendJsonp(action) {
        return new Promise((resolve, reject) => {
            try {
                const cb = `__gas_cb_${action}_${Date.now()}_${Math.floor(Math.random()*10000)}`;
                const cleanup = () => {
                    try { delete window[cb]; } catch(_){}
                    if (script && script.parentNode) script.parentNode.removeChild(script);
                };
                window[cb] = (resp) => {
                    try {
                        if (!resp || resp.success !== true) {
                            reject(new Error((resp && resp.error) || 'JSONP応答エラー'));
                        } else {
                            resolve(resp.data);
                        }
                    } finally {
                        cleanup();
                    }
                };
                const script = document.createElement('script');
                script.src = `${this.gasUrl}?action=${encodeURIComponent(action)}&callback=${encodeURIComponent(cb)}`;
                script.onerror = () => { cleanup(); reject(new Error('JSONP読み込みエラー')); };
                setTimeout(() => { cleanup(); reject(new Error('JSONPタイムアウト')); }, 10000);
                document.head.appendChild(script);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 求職者データをスプレッドシートに保存
     */
    async saveJobSeeker(jobSeekerData) {
        return await this.sendRequest('saveJobSeeker', jobSeekerData);
    }

    /**
     * 求人データをスプレッドシートに保存
     */
    async saveJobListing(jobListingData) {
        return await this.sendRequest('saveJobListing', jobListingData);
    }

    /**
     * 統計データを取得
     */
    async getStatistics() {
        return await this.sendRequest('getStats', {});
    }

    /**
     * 求職者一覧を取得（GAS）
     */
    async getJobSeekers() {
        return await this.sendRequest('getJobSeekers', {});
    }

    /**
     * 求人一覧を取得（GAS）
     */
    async getJobListings() {
        return await this.sendRequest('getJobListings', {});
    }

    /**
     * 応募管理に登録/更新（Upsert）
     */
    async upsertApplication(appData) {
        return await this.sendRequest('upsertApplication', appData);
    }

    /**
     * アクティビティログを記録
     */
    async logActivity(activityData) {
        return await this.sendRequest('logActivity', activityData);
    }

    /**
     * 接続テスト
     */
    async testConnection() {
        try {
            const stats = await this.getStatistics();
            return {
                success: true,
                message: 'GAS接続成功',
                data: stats
            };
        } catch (error) {
            return {
                success: false,
                message: 'GAS接続失敗',
                error: error.message
            };
        }
    }
}

/**
 * GASConnectorのユーティリティ関数群
 */
const GASUtils = {
    /**
     * GAS URLの取得（本番はCONFIG固定を使用）
     */
    getGASUrl() {
        // localStorage の上書き設定を最優先
        try {
            if (typeof localStorage !== 'undefined') {
                const override = localStorage.getItem('gas_url_override');
                if (override && /^https?:\/\//.test(override)) {
                    return override;
                }
            }
        } catch (_) {}
        // 次にCONFIGを参照
        if (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) {
            return CONFIG.GAS_URL;
        }
        return '';
    },
    /**
     * フォームデータをGAS用に変換
     */
    convertFormDataForGAS(formData, type = 'jobSeeker') {
        const convertedData = {};

        if (type === 'jobSeeker') {
            // 求職者データの変換
            convertedData.name = formData.name || formData.fullName || '';
            convertedData.kana = formData.kana || formData.nameKana || '';
            convertedData.email = formData.email || '';
            convertedData.phone = formData.phone || formData.phoneNumber || '';
            convertedData.birthdate = formData.birthdate || formData.birthday || '';
            convertedData.gender = formData.gender || '';
            convertedData.prefecture = formData.prefecture || '';
            convertedData.city = formData.city || '';
            convertedData.address = formData.address || '';
            convertedData.nearestStation = formData.nearestStation || formData.station || '';
            convertedData.currentCompany = formData.currentCompany || formData.company || '';
            convertedData.currentPosition = formData.currentPosition || formData.position || '';
            convertedData.experience = formData.experience || formData.experienceYears || '';
            convertedData.skills = formData.skills || '';
            convertedData.desiredSalary = formData.desiredSalary || formData.salary || '';
            convertedData.desiredLocation = formData.desiredLocation || formData.location || '';
            convertedData.desiredIndustry = formData.desiredIndustry || formData.industry || '';
            convertedData.workStyle = formData.workStyle || '';
            convertedData.availableStartDate = formData.availableStartDate || formData.startDate || '';
            convertedData.notes = formData.notes || formData.memo || '';
            convertedData.priority = formData.priority || '中';

        } else if (type === 'jobListing') {
            // 求人データの変換
            convertedData.title = formData.title || formData.jobTitle || '';
            convertedData.company = formData.company || formData.companyName || '';
            convertedData.department = formData.department || '';
            convertedData.location = formData.location || formData.workLocation || '';
            convertedData.salaryMin = formData.salaryMin || formData.minSalary || '';
            convertedData.salaryMax = formData.salaryMax || formData.maxSalary || '';
            convertedData.employmentType = formData.employmentType || formData.jobType || '';
            convertedData.workStyle = formData.workStyle || '';
            convertedData.requirements = formData.requirements || formData.requiredSkills || '';
            convertedData.skills = formData.skills || formData.requiredTech || '';
            convertedData.benefits = formData.benefits || formData.welfare || '';
            convertedData.description = formData.description || formData.jobDescription || '';
            convertedData.applicationDeadline = formData.applicationDeadline || formData.deadline || '';
            convertedData.startDate = formData.startDate || '';
            convertedData.clientContact = formData.clientContact || formData.contact || '';
            convertedData.fee = formData.fee || '';
            convertedData.priority = formData.priority || '中';
            convertedData.aiConfidence = formData.aiConfidence || '';
            convertedData.aiExtracted = formData.aiExtracted || 'false';
            convertedData.source = formData.source || 'manual';
            convertedData.notes = formData.notes || formData.memo || '';
        }

        return convertedData;
    },

    /**
     * 進捗表示UI
     */
    showProgress(message) {
        console.log(`[Progress] ${message}`);
        
        // 既存の進捗表示があれば更新、なければ作成
        let progressDiv = document.getElementById('gas-progress');
        if (!progressDiv) {
            progressDiv = document.createElement('div');
            progressDiv.id = 'gas-progress';
            progressDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #007bff;
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                z-index: 10000;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(progressDiv);
        }
        
        progressDiv.textContent = message;
        
        // 成功・エラーメッセージの場合は自動消去
        if (message.includes('成功') || message.includes('完了')) {
            progressDiv.style.background = '#28a745';
            setTimeout(() => progressDiv.remove(), 3000);
        } else if (message.includes('エラー') || message.includes('失敗')) {
            progressDiv.style.background = '#dc3545';
            setTimeout(() => progressDiv.remove(), 5000);
        }
    },

    /**
     * エラー表示UI
     */
    showError(error) {
        console.error('[GAS Error]', error);
        this.showProgress(`エラー: ${error.message || error}`);
        
        // より詳細なエラー表示（開発時用）
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            alert(`GAS連携エラー:\n${error.message || error}`);
        }
    }
    ,
    /**
     * 進捗表示を明示的に消す
     */
    hideProgress() {
        try {
            const el = document.getElementById('gas-progress');
            if (el && el.parentNode) el.parentNode.removeChild(el);
        } catch (_) {}
    }
};

// グローバルに公開（古いブラウザ対応）
if (typeof window !== 'undefined') {
    window.GASConnector = GASConnector;
    window.GASUtils = GASUtils;
}

// ES Module対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GASConnector, GASUtils };
}
