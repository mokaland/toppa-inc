
/**
 * CSV文字列をパースし、JSONオブジェクトの配列に変換する（依存ライブラリなし）
 * 注意: この実装はサンドボックス環境の制約（npm install不可）を回避するためのものです。
 * クォート文字やエスケープシーケンスなど、複雑なCSV形式には対応していません。
 * @param csvString - CSV形式の文字列
 * @returns パース結果を含むPromise
 */
interface CsvParseError {
  code: string;
  message: string;
  row: number;
}

export const parseCsv = (csvString: string): Promise<{ data: Record<string, string>[]; errors: CsvParseError[] }> => {
  return new Promise((resolve) => {
    const lines = csvString.trim().split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      resolve({ data: [], errors: [] });
      return;
    }

    const header = lines[0].split(',').map(h => h.trim());
    const data: Record<string, string>[] = [];
    const errors: CsvParseError[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      const rowObject: Record<string, string> = {};
      for (let j = 0; j < header.length; j++) {
        rowObject[header[j]] = values[j] || '';
      }
      data.push(rowObject);

      if (values.length !== header.length) {
        errors.push({
          code: 'MismatchedColumnCount',
          message: `Expected ${header.length} columns, but found ${values.length}`,
          row: i,
        });
      }
    }

    resolve({ data, errors });
  });
};
