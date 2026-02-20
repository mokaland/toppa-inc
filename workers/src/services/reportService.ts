/**
 * CSV文字列をJSONオブジェクトの配列に変換します。
 * @param csvString - CSV形式の文字列
 * @returns JSON形式の文字列（オブジェクトの配列）
 */
export function csvToJson(csvString: string): string {
    if (!csvString || csvString.trim() === '') {
        return '[]';
    }

    const lines = csvString.trim().split(/\\r?\\n/);
    if (lines.length === 0) {
        return '[]';
    }

    const headers = lines[0].split(',').map(header => header.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        if (values.length === 0 || (values.length === 1 && values[0] === '')) {
            continue; // 空行をスキップ
        }

        const obj: { [key: string]: string } = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] !== undefined ? values[j] : '';
        }
        result.push(obj);
    }

    return JSON.stringify(result, null, 2);
}
