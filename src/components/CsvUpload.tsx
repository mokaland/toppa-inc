
import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// --- Icon Components ---
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

// --- Progress Bar Component ---
const ProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{
            width: '100%',
            animation: 'progressBarAnimation 2s ease-in-out infinite'
          }}
        ></div>
        <style>
        {`
          @keyframes progressBarAnimation {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
        </style>
    </div>
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

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    setError('');
    setReport('');
    setPreview([]);
    setHeaders([]);

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`ファイルサイズは5MB以下にしてください。`);
      setFile(null);
      return;
    }

    if (selectedFile.type !== 'text/csv') {
      setError('対応しているファイル形式はCSVのみです。');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    parseCsv(selectedFile);
  };

  const parseCsv = (fileToParse: File) => {
    Papa.parse<string[]>(fileToParse, {
      header: false,
      complete: (results) => {
        setHeaders(results.data[0]);
        setPreview(results.data.slice(1, 6));
      },
      error: (err) => {
        setError(`CSVの解析に失敗しました: ${err.message}`);
      }
    });
  };

  const handleGenerateReport = async () => {
    if (!file || !instructions) {
      setError('CSVファイルを選択し、指示を入力してください。');
      return;
    }

    setLoading(true);
    setError('');
    setReport('');

    try {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = async (event) => {
        try {
            const csvData = event.target?.result as string;
            
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'report',
                csv_data: csvData,
                instructions: instructions,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: 'サーバーからの応答が不正です。' }));
              throw new Error(errorData.message || `サーバーエラー: ${response.status}`);
            }

            const data = await response.json();
            setReport(data.report);
        } catch (err: any) {
            setError(err.message || 'レポートの生成中に不明なエラーが発生しました。');
        } finally {
            setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました。');
        setLoading(false);
      };

    } catch (err: any) {
      setError(err.message || 'レポート生成処理の開始に失敗しました。');
      setLoading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
        handleFileChange(droppedFile);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">AIレポート生成</h2>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
      >
        <CsvIcon />
        <p className="mt-4 text-gray-600">ここにCSVファイルをドラッグ＆ドロップ</p>
        <p className="text-sm text-gray-500">または</p>
        <label className="mt-2 inline-block bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
          ファイルを選択
          <input type="file" className="sr-only" accept=".csv" onChange={e => handleFileChange(e.target.files ? e.target.files[0] : null)} />
        </label>
        <p className="mt-2 text-xs text-gray-500">ファイルサイズ上限: 5MB</p>
      </div>

      {file && (
        <div className="p-4 border rounded-md bg-gray-50">
          <h3 className="font-semibold text-gray-700">選択されたファイル:</h3>
          <p className="text-sm text-gray-600">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
        </div>
      )}

      {preview.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">CSVプレビュー (先頭5行)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>{headers.map((header, index) => <th key={index} className="px-4 py-2 text-left font-medium text-gray-600">{header}</th>)}</tr>
              </thead>
              <tbody className="bg-white">
                {preview.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-gray-200">
                    {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-2 text-gray-800">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">指示を入力</label>
        <textarea
          id="instructions"
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="例: 部門別の売上を降順で集計し、改善点を提案してください。"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          disabled={!file}
        />
      </div>

      <button
        onClick={handleGenerateReport}
        disabled={!file || !instructions || loading}
        className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading && <SpinnerIcon />}
        {loading ? 'レポート生成中...' : 'レポートを生成'}
      </button>

      <div className="space-y-4">
        {error && <div className="p-4 text-red-700 bg-red-100 border border-red-400 rounded-md">{error}</div>}
        
        {loading && (
            <div className="space-y-2">
                <p className="text-sm font-medium text-center text-gray-600">AIが分析中です。しばらくお待ちください...</p>
                <ProgressBar />
            </div>
        )}

        {report && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">生成されたレポート</h3>
            <div className="prose max-w-none p-4 bg-gray-50 border rounded-md" dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br />') }}>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvUpload;
