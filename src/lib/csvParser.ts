
import Papa from 'papaparse';

/**
 * CSV文字列をパースし、JSONオブジェクトの配列に変換する。
 * PapaParseを使用することで、クォート文字やエスケープシーケンスなど、より複雑なCSV形式に対応します。
 * @param csvString - CSV形式の文字列
 * @returns パース結果を含むPromise
 */
interface CsvParseError {
  code: string;
  message: string;
  row: number;
  type?: string; // PapaParseのエラータイプを保持するために追加
}

export const parseCsv = (csvString: string): Promise<{ data: Record<string, string>[]; errors: CsvParseError[] }> => {
  return new Promise((resolve) => {
    // @ts-expect-error - TS2769: No overload matches this call, workaround for PapaParse type issue
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const errors: CsvParseError[] = results.errors.map((error: Papa.ParseError) => ({
          code: error.code,
          message: error.message,
          row: error.row !== undefined ? error.row + 1 : -1, // Adjust row to be 1-based, -1 if not available
          type: error.type,
        }));

        // Handle empty input string case explicitly, as PapaParse might return [{}] data or an 'UndetectableEncoding' error.
        if (csvString.trim() === '' || (results.data.length === 1 && Object.keys(results.data[0] || {}).length === 0)) {
          resolve({ data: [], errors: [] });
          return;
        }

        // Replicate original 'MismatchedColumnCount' check
        if (results.data.length > 0 && results.meta.fields) {
            const expectedColumns = results.meta.fields.length;
            results.data.forEach((row: Record<string, string>, index: number) => {
                if (Object.keys(row).length !== expectedColumns) {
                    // Check if PapaParse has already reported ANY error for this row (0-indexed from PapaParse data array)
                    const hasPapaErrorForThisRow = results.errors.some((e: Papa.ParseError) => e.row === index);
                    
                    const existingMismatchedError = errors.find(e => 
                        e.row === index + 2 && e.code === 'MismatchedColumnCount'
                    );

                    if (!hasPapaErrorForThisRow && !existingMismatchedError) { 
                        errors.push({
                            code: 'MismatchedColumnCount',
                            message: `Expected ${expectedColumns} columns, but found ${Object.keys(row).length}`,
                            row: index + 2, // 1 for header, 1 for 0-based index
                        });
                    }
                }
            });
        }
        
        resolve({ data: results.data as Record<string, string>[], errors });
      },
      error: (error: Papa.ParseError) => {
        // This `error` callback usually indicates a catastrophic parsing error (e.g., malformed CSV not caught by `complete`)
        // For an empty string, if PapaParse triggers this, we still want to resolve with empty data and no errors.
        if (csvString.trim() === '') {
          resolve({ data: [], errors: [] });
          return;
        }

        resolve({
          data: [],
          errors: [{
            code: error.code,
            message: error.message,
            row: error.row !== undefined ? error.row + 1 : -1,
            type: error.type,
          }],
        });
      },
    });
  });
};
