// shared.js
// 🔑 企業專屬 Supabase 連線金鑰 (已綁定)
const supabaseUrl = 'https://obbcgmgkbazwpfvgbupg.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYmNnbWdrYmF6d3BmdmdidXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTUxNDQsImV4cCI6MjA4NjczMTE0NH0.UlCKV_BDRWToqtG8ol69USBKgehBYpB4aUdM25oNwM0';

window._sb = supabase.createClient(supabaseUrl, supabaseAnonKey);
window.currentUser = null;

async function authGuard(moduleName = null) {
    const empId = localStorage.getItem('hypass_emp_id');
    
    // 1. 如果完全沒登入，強制踢回首頁 (確保各種路徑包含 GitHub Pages 都能正確跳轉)
    if (!empId) {
        if (!window.location.pathname.endsWith('index.html') && 
            window.location.pathname !== '/' && 
            !window.location.pathname.includes('/hypassboss.github.io/') &&
            !window.location.pathname.includes('/hypass-staff-system/')) {
            window.location.href = 'index.html';
        }
        return false;
    }

    // 2. 電腦版/網頁版測試環境保護 (只詢問一次)
    if (!sessionStorage.getItem('dev_mode_prompted')) {
        const isLine = navigator.userAgent.includes('Line');
        if (!isLine) {
            const devMode = confirm('偵測到非 LINE 環境或 LIFF ID 尚未生效！\n\n是否啟用「網頁開發測試模式」強制進入系統？\n(按「確定」可直接進入測試，按「取消」則攔截)');
            if (!devMode) {
                // 若按取消，清除登入並返回
                localStorage.removeItem('hypass_emp_id');
                localStorage.removeItem('hypass_emp_name');
                window.location.href = 'index.html';
                return false;
            }
        }
        sessionStorage.setItem('dev_mode_prompted', 'true');
    }

    // 3. 驗證資料庫身分與權限
    try {
        const { data, error } = await window._sb.from('employees').select('*').eq('id', empId).single();
        
        // 如果查無此人、離職、或未核准
        if (error || !data || data.employment_status !== '在職' || !data.is_approved) {
            localStorage.removeItem('hypass_emp_id');
            localStorage.removeItem('hypass_emp_name');
            alert('帳號狀態已失效或無權限，請重新登入！');
            window.location.href = 'index.html';
            return false;
        }

        window.currentUser = data;

        // 4. 各模組專屬權限檢查 (溫和退回機制：回傳 false 讓前端顯示警告，絕不強制跳轉造成死迴圈)
        if (moduleName) {
            let hasPerm = false;
            if (moduleName === 'inv') hasPerm = data.perm_inventory;
            if (moduleName === 'purchase') hasPerm = data.perm_purchase;
            if (moduleName === 'sales') hasPerm = data.perm_sales;
            if (moduleName === 'finance') hasPerm = data.perm_finance;
            
            if (!hasPerm) return false; 
        }

        return true;
    } catch (e) {
        console.error('Auth check failed:', e);
        alert('無法連線到伺服器，請檢查網路狀態。');
        return false;
    }
}
