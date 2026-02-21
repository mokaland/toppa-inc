import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import { marked } from 'marked';

// Correct API endpoint as verified.
const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// --- Icon Components (unchanged) ---
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

// --- Main CsvUpload Component ---
const CsvUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string[][]>([]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    setError('');
    setFile(null);
    setPreview([]);
    setReport('');

    if (rejectedFiles.length > 0) {
      setError('ファイル形式が不正か、ファイルサイズが大きすぎます。CSVファイル (5MB以下) を選択してください。');
      return;
    }

    if (acceptedFiles.length > 0) {
      const acceptedFile = acceptedFiles[0];
      setFile(acceptedFile);

      // --- CSV Preview Logic ---
      Papa.parse(acceptedFile, {
        header: true,
        preview: 5,
        complete: (results) => {
          const headerRow = results.meta.fields ? [results.meta.fields] : [];
          const dataRows = results.data as unknown[];
          const previewData = headerRow.concat(dataRows.map(row => Object.values(row as Record<string, string>)));
          setPreview(previewData as string[][]);
        },
        error: () => {
          setError('CSVファイルのプレビューに失敗しました。ファイルが破損している可能性があります。');
        }
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleGenerateReport = async () => {
    if (!file || !instructions) {
      setError('CSVファイルを選択し、分析指示を入力してください。');
      return;
    }
    setIsLoading(true);
    setError('');
    setReport('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target?.result as string;

      if (!csvData) {
        setError('ファイルの読み込みに失敗しました。');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'report',
            csv_data: csvData,
            instructions: instructions,
          }),
        });

        if (!response.ok) {
          throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.report) {
          const reportHtml = marked.parse(data.report);
          setReport(reportHtml as string);
        } else {
            throw new Error('APIからのレスポンスにレポートが含まれていません。');
        }

      } catch (err: unknown) {
        setError((err as Error).message || 'レポートの生成中に不明なエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
        setError('ファイルの読み込み中にエラーが発生しました。');
        setIsLoading(false);
    };
    reader.readAsText(file);
  };
  
  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">AIレポート生成</h1>
        <p className="text-gray-600 mb-6">CSVファイルをアップロードし、自然言語で指示するだけで、AIが分析レポートを自動生成します。</p>

        {/* --- Step 1: Upload --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Step 1: CSVファイルをアップロード</h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center">
              <CsvIcon />
              {isDragActive ? (
                <p className="mt-2 text-gray-600">ここにファイルをドロップ</p>
              ) : (
                <p className="mt-2 text-gray-600">ここにCSVファイルをドラッグ＆ドロップするか、クリックして選択</p>
              )}
              <p className="text-sm text-gray-500 mt-1">ファイルサイズは5MBまで</p>
            </div>
          </div>
          {file && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <p className="font-semibold text-gray-800">選択されたファイル: {file.name}</p>
              {preview.length > 0 && (
                 <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-200">
                            <tr>{preview[0].map((header, i) => <th key={i} className="px-4 py-2">{header}</th>)}</tr>
                        </thead>
                        <tbody>
                            {preview.slice(1).map((row, i) => (
                                <tr key={i} className="bg-white border-b">
                                    {row.map((cell, j) => <td key={j} className="px-4 py-2">{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
              )}
            </div>
          )}
        </div>

        {/* --- Step 2: Instructions --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Step 2: AIへの指示を入力</h2>
            <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="例: 部門別の売上を分析して、改善提案をまとめてください。"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                rows={4}
            />
        </div>

        {/* --- Step 3: Generate --- */}
        <div className="text-center mb-6">
            <button
                onClick={handleGenerateReport}
                disabled={!file || !instructions || isLoading}
                className="w-full max-w-xs px-6 py-3 text-white font-semibold bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105 flex items-center justify-center mx-auto"
            >
                {isLoading ? <SpinnerIcon /> : null}
                {isLoading ? 'レポートを生成中...' : 'レポートを生成する'}
            </button>
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">{error}</div>}

        {/* --- Step 4: Result --- */}
        {(isLoading || report) && (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">生成されたレポート</h2>
                    {report && !isLoading && (
                        <button 
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition"
                        >
                            Markdownをダウンロード
                        </button>
                    )}
                </div>
                {isLoading && !report && <p className="text-gray-600">AIがレポートを生成しています。しばらくお待ちください...</p>}
                <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: report }}
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default CsvUpload;
