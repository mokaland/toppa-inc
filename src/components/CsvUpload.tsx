import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// --- アイコンコンポーネント ---
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

  const resetState = useCallback(() => {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setInstructions('');
    setReport('');
    setLoading(false);
    setError('');
  }, []);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    resetState();

    // ファイルサイズチェック
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`ファイルサイズは5MB以下にしてください。 (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    // ファイルタイプチェック
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('対応しているファイル形式はCSVのみです。');
      return;
    }

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length > 0) {
          setHeaders(data[0]);
          setPreview(data.slice(1, 6)); // プレビューはヘッダーを除いて5行表示
        }
      },
      header: false,
      skipEmptyLines: true,
    });
  };

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileChange(event.dataTransfer.files[0]);
    }
  }, []);

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileChange(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file || !instructions) {
      setError('CSVファイルを選択し、指示を入力してください。');
      return;
    }

    setLoading(true);
    setError('');
    setReport('');

    const reader = new FileReader();
    reader.onload = async (event) => {
        const csv_data = event.target?.result as string;
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'report', csv_data, instructions }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'サーバーから不明なエラーが返されました。' }));
                throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            setReport(data.report);
        } catch (e: any) {
            setError(`レポートの生成に失敗しました: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };
    reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました。');
        setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">AIレポート生成 (CSV)</h1>

        {/* --- Step 1: CSVファイルアップロード --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Step 1: CSVファイルをアップロード</h2>
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              ${isDragOver ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`
            }
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <input type="file" id="csv-input" accept=".csv" className="hidden" onChange={onFileSelect} />
            <div className="flex flex-col items-center justify-center">
                <CsvIcon />
                <p className="mt-2 text-sm text-gray-600">
                    ここにファイルをドラッグ＆ドロップするか、クリックしてファイルを選択
                </p>
                <p className="text-xs text-gray-500 mt-1">ファイルサイズ上限: 5MB</p>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* --- ファイルプレビュー --- */}
        {file && preview.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-md font-semibold text-gray-700 mb-3">ファイルプレビュー: <span className="font-normal">{file.name}</span></h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            {headers.map((h, i) => <th key={i} scope="col" className="px-4 py-2">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {preview.map((row, i) => (
                            <tr key={i} className="bg-white border-b">
                                {row.map((cell, j) => <td key={j} className="px-4 py-2">{cell}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* --- Step 2: レポート生成の指示 --- */}
        {file && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Step 2: レポート生成の指示を入力</h2>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    rows={4}
                    placeholder="例: 部門別の売上を降順で集計し、改善提案をしてください。"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                />
                <button
                    onClick={handleSubmit}
                    disabled={loading || !instructions}
                    className="mt-4 w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? <><SpinnerIcon /> 生成中...</> : 'レポートを生成'}
                </button>
            </div>
        )}
        
        {/* --- Step 3: 生成されたレポート --- */}
        {report && (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Step 3: 生成されたレポート</h2>
                <div className="prose max-w-none p-4 bg-gray-50 rounded border">
                    <pre className="whitespace-pre-wrap">{report}</pre>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CsvUpload;
