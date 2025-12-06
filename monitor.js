const fs = require('fs');
const axios = require('axios');

const targets = [
    { id: 'web-main', name: 'Web Server', url: 'https://main.unilabstore.com' },
    { id: 'web-account', name: 'Account Server', url: 'https://account.unilabstore.com' },
    { id: 'api-main', name: 'API Server', url: 'https://api.unilabstore.com' },
    { id: 'api-vrcgf', name: 'Storage Server for VRCGF', url: 'https://raw.githubusercontent.com/KawaiiAstral/VRCGFStorage/refs/heads/main/data.json' },
    { id: 'api-proxy', name: 'Proxy Server', url: 'https://www.cloudflare.com/' },
];

const OUTPUT_FILE = 'status.json';
// 変更前
// const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// 変更後 (60日分保存するように変更)
const ONE_WEEK_MS = 60 * 24 * 60 * 60 * 1000; 

async function checkStatus() {
    let data = { services: [] };
    
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
            if (fileContent.trim()) {
                data = JSON.parse(fileContent);
            }
        } catch (e) {
            console.log("JSON読み込みエラー、またはファイルが空です。新規作成します");
        }
    }

    if (!data.services || !Array.isArray(data.services)) {
        data.services = [];
    }

    const now = new Date();
    const timestampISO = now.toISOString();

    console.log(`[${timestampISO}] 監視開始...`);

    // 2. 各サービスのチェック
    for (const target of targets) {
        let status = 'down';
        let responseTime = 0;
        const start = Date.now();

        try {
            await axios.get(target.url, { timeout: 5000 });
            status = 'operational';
        } catch (error) {
            console.error(`Error ${target.name}: ${error.message}`);
        }
        
        const end = Date.now();
        responseTime = end - start;

        let serviceData = data.services.find(s => s.id === target.id);
        
        if (!serviceData) {
            serviceData = {
                id: target.id,
                name: target.name,
                url: target.url,
                history: []
            };
            data.services.push(serviceData);
        }

        if (!serviceData.history) {
            serviceData.history = [];
        }

        const newLog = {
            time: timestampISO,
            status: status,
            latency: responseTime
        };
        serviceData.history.unshift(newLog);

        serviceData.history = serviceData.history.filter(log => {
            const logTime = new Date(log.time).getTime();
            return (now.getTime() - logTime) < ONE_WEEK_MS;
        });

        serviceData.currentStatus = status;
        serviceData.lastLatency = responseTime;
    }

    data.lastUpdated = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log('履歴を更新しました。');
}

checkStatus();
