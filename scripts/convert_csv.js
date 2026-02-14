import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

const csvPath = '/Users/kazu/Web -main/アプリ開発/八親会安全パトロールリスト/【リスト】名簿_八親会（会員様用）_20260213T162732+0900.csv';
const outputPath = '/Users/kazu/Web -main/アプリ開発/八親会安全パトロールリスト/yashima-patrol-planner/src/data/initialMembers.js';

try {
    const buffer = fs.readFileSync(csvPath);
    const decoder = new TextDecoder('shift-jis');
    const csvContent = decoder.decode(buffer);

    Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const data = results.data.map((row, index) => {
                const roleStr = row['役員・一般会員種別'] || Object.values(row)[0];
                const name = row['氏名'] || row['名称'] || Object.values(row)[1];

                const id = `member-${index}`;
                let type = 'general';
                if (roleStr && (
                    roleStr.includes('役員') ||
                    roleStr.includes('会計') ||
                    roleStr.includes('監査') ||
                    roleStr.includes('相談役') ||
                    roleStr.includes('会長') ||
                    roleStr.includes('副会長') ||
                    roleStr.includes('顧問')
                )) {
                    type = 'officer';
                }

                return {
                    id,
                    name,
                    roleStr,
                    type,
                    // original: row // Reduce file size by omitting raw row if not needed
                };
            }).filter(m => m.name); // Filter out empty names

            const fileContent = `export const initialMembers = ${JSON.stringify(data, null, 2)};`;

            // Ensure directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(outputPath, fileContent);
            console.log(`Successfully converted ${data.length} members to ${outputPath}`);
        }
    });

} catch (e) {
    console.error("Conversion failed:", e);
}
