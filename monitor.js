const fs = require('fs');
const axios = require('axios');

const targets = [
    { id: 'web', name: 'Web Server', url: 'https://google.com' },
    { id: 'api', name: 'API Server', url: 'https://example.com' },
    // ※注意: localhost はGitHubのサーバー内を指すことになるので使えません。
    // 必ず https:// から始まる公開URLを指定してください。
];

const OUTPUT_FILE = 'status.json';

async function checkStatus() {
    const results = [];
    // 日本時間に変換
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    console.log(`[${timestamp}] 監視開始...`);

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
        results.push({
            name: target.name,
            status: status,
            time: end - start,
            url: target.url
        });
    }

    const data = {
        lastUpdated: timestamp,
        services: results
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log('書き出し完了');
}

// 1回だけ実行して終了する
checkStatus();
