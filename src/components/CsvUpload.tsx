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
    setReport('');
    setError('');
  };

  const handleFile = useCallback((selectedFile: File) => {
    resetState();

    // MIMEタイプに'csv'が含まれず、かつファイル名が'.csv'で終わらない場合にエラー
    if (!selectedFile.type.includes('csv') && !selectedFile.name.endsWith('.csv')) {
      setError('CSVファイルのみ対応しています。');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください。');
      return;
    }
    
    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setPreview(results.data.map(row => Object.values(row as Record<string, string>)));
      },
      error: () => {
        setError('CSVファイルのパースに失敗しました。');
        setFile(null);
      }
    });
  }, []);

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFile(droppedFiles[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const generateReport = async () => {
    if (!file || !instructions.trim()) {
        setError('ファイルと指示の両方を入力してください。');
        return;
    }
    setLoading(true);
    setError('');
    setReport('');

    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        try {
            const res = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'report', csv_data: csvData, instructions }),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: `APIエラー: ${res.status}` }));
                throw new Error(errorData.error || `APIエラー: ${res.status}`);
            }
            const data = await res.json();
            if (data.report) {
              setReport(data.report);
            } else {
              setError(data.error || 'レポートの生成に失敗しました。');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">AIレポート生成 (CSV)</h2>
                
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p>{error}</p></div>}

                <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input id="file-upload" type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
                    <CsvIcon />
                    <p className="mt-2 text-gray-600">ここにCSVファイルをドラッグ＆ドロップ</p>
                    <p className="text-sm text-gray-500">またはクリックしてファイルを選択 (最大5MB)</p>
                </div>

                {file && (
                    <div className="mt-6">
                        <h3 className="font-semibold text-gray-700">選択されたファイル: <span className="font-normal">{file.name}</span></h3>
                        {preview.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-gray-700 mb-2">ファイルプレビュー (先頭5行)</h4>
                                <div className="overflow-x-auto bg-gray-50 p-2 rounded-md">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                            <tr>
                                                {headers.map((h, i) => <th key={i} scope="col" className="px-4 py-2">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.map((row, i) => (
                                                <tr key={i} className="bg-white border-b">
                                                    {Object.values(row).map((cell, j) => <td key={j} className="px-4 py-2">{cell}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="mt-6">
                    <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">指示</label>
                    <textarea
                        id="instructions"
                        rows={4}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="例: 部門別の売上を降順で集計し、改善提案を3つ挙げてください。"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        disabled={loading}
                    ></textarea>
                </div>

                <div className="mt-6 text-right">
                    <button
                        onClick={generateReport}
                        disabled={!file || !instructions.trim() || loading}
                        className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading && <SpinnerIcon />}
                        {loading ? '生成中...' : 'レポートを生成'}
                    </button>
                </div>
            </div>

            {report && (
                <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">生成されたレポート</h3>
                    <div className="prose max-w-none">
                        <pre className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap">{report}</pre>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default CsvUpload;
