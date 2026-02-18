import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

// アイコンコンポーネント
const CsvIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const CsvUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setInstructions('');
    setReport('');
    setError('');
  };

  const processFile = (selectedFile: File) => {
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        setError('対応しているファイル形式はCSVのみです');
        resetState();
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('ファイルサイズは5MB以下にしてください');
        resetState();
        return;
      }
      setFile(selectedFile);
      setError('');

      Papa.parse(selectedFile, {
        header: true,
        preview: 5,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
          }
          // PapaParseのdataはany[]なのでstring[][]に変換する
          const dataAsStringArray = results.data.map(row => {
            const rowAsObject = row as {[key: string]: any};
            return results.meta.fields ? results.meta.fields.map(field => String(rowAsObject[field])) : [];
          });
          setPreview(dataAsStringArray);
        }
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);


  const handleSubmit = async () => {
    if (!file || !instructions) {
      setError('ファイルを選択し、指示を入力してください');
      return;
    }
    setLoading(true);
    setReport('');
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvData = event.target?.result as string;
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'report',
            csv_data: csvData,
            instructions: instructions
          }),
        });

        if (!response.ok) {
          throw new Error('サーバーエラーが発生しました');
        }

        const data = await response.json();
        setReport(data.report);
      };
      reader.onerror = () => {
        throw new Error('ファイルの読み込みに失敗しました');
      }
      reader.readAsText(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レポートの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">AIレポート生成 (CSV)</h2>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <div 
        onDrop={handleDrop} 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragOver ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}
      >
        <input type="file" id="csv-upload" className="hidden" onChange={handleFileChange} accept=".csv" />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <CsvIcon />
          <p className="mt-2 text-gray-600">ここにCSVファイルをドラッグ＆ドロップ</p>
          <p className="text-sm text-gray-500">またはクリックしてファイルを選択</p>
          <p className="text-xs text-gray-400 mt-1">最大ファイルサイズ: 5MB</p>
        </label>
      </div>

      {file && (
        <div className="mt-4 p-4 bg-white rounded shadow">
          <h3 className="font-bold text-lg mb-2">選択されたファイル: {file.name}</h3>
          {preview.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">ファイルプレビュー (先頭5行)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((header, index) => (
                        <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">指示:</label>
        <textarea
          id="instructions"
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="例: 部門別の売上を降順で集計し、改善提案をしてください。"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !file || !instructions}
        className="mt-4 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading && <SpinnerIcon />}
        {loading ? 'レポート生成中...' : 'レポートを生成'}
      </button>

      {report && (
        <div className="mt-6 p-4 bg-white rounded shadow">
          <h3 className="font-bold text-lg mb-2">生成されたレポート</h3>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br />') }}></div>
          <button 
            onClick={() => navigator.clipboard.writeText(report)}
            className="mt-4 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            レポートをコピー
          </button>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
