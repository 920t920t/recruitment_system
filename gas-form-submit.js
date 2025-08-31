/**
 * CORS完全回避版 - フォーム送信ライブラリ
 */

class GASFormSubmitter {
    constructor(gasUrl) {
        this.gasUrl = gasUrl;
    }

    /**
     * 隠しフォームを使ってデータを送信（CORS完全回避）
     */
    async submitData(action, data) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`[GAS Form] ${action}開始:`, data);
                
                // 隠しフォームを作成
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = this.gasUrl;
                form.target = '_blank'; // 新しいウィンドウで開く
                form.style.display = 'none';
                
                // データを隠し入力フィールドに設定
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'jsonData';
                input.value = JSON.stringify({
                    action: action,
                    data: data,
                    timestamp: new Date().toISOString()
                });
                
                form.appendChild(input);
                document.body.appendChild(form);
                
                // フォーム送信
                form.submit();
                
                // フォームを削除
                setTimeout(() => {
                    document.body.removeChild(form);
                }, 1000);
                
                console.log(`[GAS Form] ${action}送信完了`);
                
                // 成功として扱う
                resolve({
                    message: `${action}をフォーム送信しました`,
                    success: true,
                    mode: 'form-submit',
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`[GAS Form] ${action}エラー:`, error);
                reject(error);
            }
        });
    }

    /**
     * iframe を使った隠し送信
     */
    async submitViaIframe(action, data) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`[GAS Iframe] ${action}開始:`, data);
                
                // 隠しiframe作成
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.name = 'gas-submit-frame';
                document.body.appendChild(iframe);
                
                // フォーム作成
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = this.gasUrl;
                form.target = 'gas-submit-frame';
                form.style.display = 'none';
                
                // データ設定
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'jsonData';
                input.value = JSON.stringify({
                    action: action,
                    data: data,
                    timestamp: new Date().toISOString()
                });
                
                form.appendChild(input);
                document.body.appendChild(form);
                
                // 送信
                form.submit();
                
                // 5秒後にクリーンアップ
                setTimeout(() => {
                    if (document.body.contains(form)) {
                        document.body.removeChild(form);
                    }
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 5000);
                
                console.log(`[GAS Iframe] ${action}送信完了`);
                
                resolve({
                    message: `${action}をiframe経由で送信しました`,
                    success: true,
                    mode: 'iframe-submit',
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`[GAS Iframe] ${action}エラー:`, error);
                reject(error);
            }
        });
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.GASFormSubmitter = GASFormSubmitter;
}