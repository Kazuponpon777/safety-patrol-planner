import Papa from 'papaparse';

/**
 * Parse the uploaded CSV file.
 * Expected columns (Shift-JIS decoded when uploaded locally):
 * 支持するカラム: レコード番号, 役員・一般会員種別, 社名
 */
export const parseCSV = (fileOrUrl, isUrl = false) => {
    return new Promise((resolve, reject) => {
        const config = {
            header: true,
            skipEmptyLines: true,
            encoding: isUrl ? 'UTF-8' : 'Shift-JIS',
            download: isUrl,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error("CSV Parse Errors:", results.errors);
                }

                const rawData = results.data;
                const processedMembers = rawData.map((row, index) => {
                    // Kintoneの標準出力に合わせたカラム名の取得
                    const roleStr = row['役員・一般会員種別'] || Object.values(row)[1];
                    const name = row['社名'] || row['氏名'] || row['名称'] || Object.values(row)[2];
                    const id = row['レコード番号'] || `member-${index}`;

                    let type = 'general';
                    if (roleStr && (
                        roleStr.includes('役員') ||
                        roleStr.includes('会計') ||
                        roleStr.includes('監査') ||
                        roleStr.includes('会長') ||
                        roleStr.includes('副会長') ||
                        roleStr.includes('相談役') ||
                        roleStr.includes('顧問')
                    )) {
                        type = 'officer';
                    }

                    return {
                        id,
                        name,
                        roleStr,
                        type,
                        original: row
                    };
                }).filter(m => m.name); // 名前がない行は除外

                resolve(processedMembers);
            },
            error: (error) => {
                reject(error);
            }
        };

        if (isUrl) {
            Papa.parse(fileOrUrl, config);
        } else {
            Papa.parse(fileOrUrl, config);
        }
    });
};

export const fetchMembersFromUrl = (url) => {
    // ユーザーがブラウザのURLをそのまま貼った場合でも、CSV出力用URLに変換してあげる親切設計
    let csvUrl = url;
    if (url.includes('/edit?') || url.includes('/edit#')) {
        // 例: https://docs.google.com/spreadsheets/d/XXXXXXXXX/edit?gid=0#gid=0
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)\//);
        const gidMatch = url.match(/gid=([0-9]+)/);

        if (match && match[1]) {
            const documentId = match[1];
            const gid = (gidMatch && gidMatch[1]) ? gidMatch[1] : '0';
            csvUrl = `https://docs.google.com/spreadsheets/d/${documentId}/export?format=csv&gid=${gid}`;
        }
    } else if (url.includes('/pubhtml')) {
        csvUrl = url.replace('/pubhtml', '/pub?output=csv');
    }

    return parseCSV(csvUrl, true);
};
