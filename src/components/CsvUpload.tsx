import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { marked } from 'marked';

const API_URL = '/api/reports/generate'; // Local API endpoint
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
  const [fileName, setFileName] = useState<string>('');
  const [csvPreview, setCsvPreview] = useState<string[][] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Optional: Add some visual feedback for drag over
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Optional: Remove visual feedback
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setError('');
    setFile(null);
    setCsvPreview(null);
    setFileName('');
    setReport('');

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) {
        return;
    }

    // Simulate change event for handleFileChange
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(droppedFile);
    if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        const changeEvent = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(changeEvent);
    }
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFile(null);
    setCsvPreview(null);
    setFileName('');
    setReport('');

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== 'text/csv') {
      setError('対応しているファイル形式はCSVのみです');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);

    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        const headerRow = results.meta.fields ? [results.meta.fields] : [];
        const dataRows = results.data as any[];
        const previewData = headerRow.concat(dataRows.map(row => Object.values(row)));
        setCsvPreview(previewData as string[][]);
      },
      error: (err: any) => {
        setError(`CSVプレビューの読み込み中にエラーが発生しました: ${err.message}`);
        setCsvPreview(null);
      }
    });
  }, []);

  const handleGenerateReport = async () => {
    if (!file) {
      setError('CSVファイルを選択してください。');
      return;
    }
    if (!instructions) {
      setError('分析指示を入力してください。');
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
            csvData: csvData,
            userInstruction: instructions,
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

      } catch (err: any) {
        setError('レポートの生成に失敗しました。もう一度お試しください');
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
  
  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseFileName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
    a.download = `${baseFileName}-report.md`;
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
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-gray-300 hover:border-gray-400"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input id="file-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} ref={fileInputRef} />
            <div className="flex flex-col items-center">
              <CsvIcon />
              {fileName ? (
                <p className="mt-2 text-gray-600">選択中のファイル: {fileName}</p>
              ) : (
                <p className="mt-2 text-gray-600">クリックしてCSVファイルを選択</p>
              )}
              <p className="text-sm text-gray-500 mt-1">ファイルサイズは5MBまで</p>
            </div>
          </div>
          {file && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <p className="font-semibold text-gray-800">選択されたファイル: {file.name}</p>
              {csvPreview && csvPreview.length > 0 && (
                 <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-200">
                            <tr>{csvPreview[0].map((header, i) => <th key={i} className="px-4 py-2">{header}</th>)}</tr>
                        </thead>
                        <tbody>
                            {csvPreview.slice(1).map((row, i) => (
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
                            onClick={handleDownloadReport}
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
