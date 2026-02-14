import Papa from 'papaparse';

/**
 * Parse the uploaded CSV file.
 * Expected columns (Shift-JIS decoded):
 * - 役員・一般会員種別
 * - 氏名 (or similar, detected by position if parsing fails)
 */
export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'Shift-JIS',
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error("CSV Parse Errors:", results.errors);
                }

                const rawData = results.data;
                const processedMembers = rawData.map((row, index) => {
                    // カラム名の揺らぎに対応するため、Object.keysで探す処理を入れることも可能だが、
                    // まずは標準的なカラム名を想定して実装
                    const roleStr = row['役員・一般会員種別'] || Object.values(row)[0]; // 1列目
                    const name = row['氏名'] || row['名称'] || Object.values(row)[1]; // 2列目

                    // ID生成 (CSVにIDがないため、UUID的なものか、連番を付与)
                    const id = `member-${index}`;

                    // 役職判定
                    // 6.役員, 4.会計, 5.監査 -> 役員
                    // 1.一般会員 -> 一般会員
                    let type = 'general';
                    if (roleStr && (
                        roleStr.includes('役員') ||
                        roleStr.includes('会計') ||
                        roleStr.includes('監査') ||
                        roleStr.includes('相談役') ||
                        roleStr.includes('会長') ||
                        roleStr.includes('顧問') // 念のため
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
        });
    });
};
