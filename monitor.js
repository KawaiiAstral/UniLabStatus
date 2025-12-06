const fs = require('fs');
const axios = require('axios');

const targets = [
    { id: 'web', name: 'Web Server', url: 'https://google.com' },
    { id: 'api', name: 'API Server', url: 'https://example.com' }, 
];

const OUTPUT_FILE = 'status.json';
// 1週間のミリ秒数 (7日 * 24時間 * 60分 * 60秒 * 1000)
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function checkStatus() {
    // 1. 既存のデータを読み込む（なければ新規作成）
    let data = { services: [] };
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        } catch (e) {
            console.log("JSON読み込みエラー、新規作成します");
        }
    }

    const now = new Date();
    const timestampISO = now.toISOString();

    console.log(`[${timestampISO}] 監視開始...`);

    // 2. 各サービスのチェックと履歴の更新
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

        // 対象サービスのデータを探す
        let serviceData = data.services.find(s => s.id === target.id);
        
        // 初めてのサービスなら枠を作成
        if (!serviceData) {
            serviceData = {
                id: target.id,
                name: target.name,
                url: target.url,
                history: [] // ここにログが溜まる
            };
            data.services.push(serviceData);
        }

        // 3. 新しい結果を履歴の先頭に追加
        const newLog = {
            time: timestampISO,
            status: status,
            latency: responseTime
        };
        // unshiftで先頭に追加（最新が先頭）
        serviceData.history.unshift(newLog);

        // 4. 1週間より古いデータを削除 (フィルタリング)
        serviceData.history = serviceData.history.filter(log => {
            const logTime = new Date(log.time).getTime();
            return (now.getTime() - logTime) < ONE_WEEK_MS;
        });

        // 5. 最新の状態をトップレベルにも更新（表示しやすくするため）
        serviceData.currentStatus = status;
        serviceData.lastLatency = responseTime;
    }

    // 全体の最終更新日時
    data.lastUpdated = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    // 保存
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log('履歴を更新しました。');
}

checkStatus();
