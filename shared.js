// ==========================================
// HYPASS 全域系統連線檔 (shared.js)
// ==========================================

// 1. 全新 Supabase 連線金鑰 (Anon Key 公開金鑰)
const SUPABASE_URL = 'https://obbcgmgkbazwpfvgbupg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYmNnbWdrYmF6d3BmdmdidXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTUxNDQsImV4cCI6MjA4NjczMTE0NH0.UlCKV_BDRWToqtG8ol69USBKgehBYpB4aUdM25oNwM0';

// 2. 全新 LIFF ID
const LIFF_ID = '2009148826-RoogHmxk';

// 初始化 Supabase 客戶端
window._sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.currentUser = null;

// 權限驗證守門員 (Auth Guard)
async function authGuard(moduleName) {
    try {
        let liffInitSuccess = false;
        try {
            await liff.init({ liffId: LIFF_ID });
            liffInitSuccess = true;
        } catch(e) {
            console.warn("LIFF初始化失敗:", e);
        }
        
        let lineId = "";
        
        // 本機測試降級機制
        if (!liffInitSuccess || (!liff.isInClient() && window.location.protocol !== 'file:')) {
            if(confirm('偵測到非 LINE 環境或 LIFF ID 尚未生效！\n\n是否啟用「網頁開發測試模式」強制進入系統？\n(按「確定」可直接進入測試，按「取消」則攔截)')) {
                lineId = "TEST_LOCAL_ID_" + Math.floor(Math.random()*1000); // 使用測試 ID
                // 如果有特定想測試的員工 ID，可以直接在這裡寫死，例如 lineId = "Ufd172549b6df7d4b396a63b3b16ae34a";
            } else {
                if (!liffInitSuccess) {
                    document.body.innerHTML = `<div style="padding:20px; text-align:center; font-family:sans-serif; color:#333;"><h2>系統連線異常</h2><p>無法初始化 LIFF (${LIFF_ID})。</p><p>請確認 LINE Developer 後台已發布此 ID。</p></div>`;
                    return false;
                }
                if (!liff.isLoggedIn()) { liff.login(); return false; }
                const profile = await liff.getProfile();
                lineId = profile.userId;
            }
        } else {
            if (!liff.isLoggedIn()) { liff.login(); return false; }
            const profile = await liff.getProfile();
            lineId = profile.userId;
        }

        // 查詢員工資料
        const { data: user, error } = await window._sb.from('employees').select('*').eq('line_id', lineId).single();
        
        if (error || !user) {
            alert('系統中查無您的資料，即將引導至註冊畫面。');
            window.location.href = 'index.html';
            return false;
        }

        if (!user.is_approved || user.employment_status !== '在職') {
            document.body.innerHTML = `
                <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; padding: 20px; text-align: center; font-family: sans-serif;">
                    <div style="width: 80px; height: 80px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 20px;">🚫</div>
                    <h2 style="font-size: 24px; font-weight: 900; color: #1e293b; margin-bottom: 10px;">無權限訪問</h2>
                    <p style="font-size: 14px; font-weight: bold; color: #64748b; line-height: 1.6; margin-bottom: 30px;">您的帳號目前處於未開通或停權狀態。<br>如有疑問，請聯繫系統管理員。</p>
                    <button onclick="liff.closeWindow()" style="background: #0f172a; color: white; font-weight: 900; padding: 15px 30px; border-radius: 12px; border: none; width: 100%; max-width: 300px;">關閉視窗</button>
                </div>
            `;
            return false;
        }

        // 模組權限檢查
        if (moduleName === 'inv' && !user.perm_inventory) { alert('您沒有【庫存系統】的訪問權限！'); window.location.href = 'app_hr.html'; return false; }
        if (moduleName === 'purchase' && !user.perm_purchase) { alert('您沒有【採購系統】的訪問權限！'); window.location.href = 'app_hr.html'; return false; }
        if (moduleName === 'sales' && !user.perm_sales) { alert('您沒有【業務系統】的訪問權限！'); window.location.href = 'app_hr.html'; return false; }
        if (moduleName === 'finance' && !user.perm_finance) { alert('您沒有【財務系統】的訪問權限！'); window.location.href = 'app_hr.html'; return false; }

        window.currentUser = user;
        return true;
        
    } catch (err) {
        console.error('Auth Guard Error:', err);
        alert('身分驗證過程中發生錯誤：' + (err.message || err));
        return false;
    }
}
