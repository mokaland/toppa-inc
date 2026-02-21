import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { marked } from 'marked';

const API_URL = '/api/reports/generate';
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
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div className="bg-blue-600 h-2.5 rounded-full animate-pulse"></div>
    </div>
);


// --- CsvUpload Component ---
const CsvUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [csvPreview, setCsvPreview] = useState<string[][] | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        setError('対応しているファイル形式はCSVのみです');
        setFile(null);
        setFileName('');
        setCsvPreview(null);
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`ファイルサイズが5MBを超えています: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
        setFile(null);
        setFileName('');
        setCsvPreview(null);
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');

      // Read and parse CSV for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          Papa.parse(result, {
            preview: 5, // Get first 5 rows
            complete: (results) => {
              setCsvPreview(results.data as string[][]);
            },
            error: (err: any) => {
              setError(`CSVプレビューの読み込み中にエラーが発生しました: ${err.message}`);
              setCsvPreview(null);
            },
          });
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleGenerateReport = useCallback(async () => {
    if (!file) {
      setError('CSVファイルをアップロードしてください。');
      return;
    }
    if (!instructions.trim()) {
      setError('レポート生成の指示を入力してください。');
      return;
    }

    setIsLoading(true);
    setError('');
    setReport('');

    try {
      const fileContent = await file.text();
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: fileContent,
          userInstruction: instructions,
        }),
      });

      if (!response.ok) {
        // Specific error message for AI processing failure
        setError('レポートの生成に失敗しました。もう一度お試しください');
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      // General error message for other fetch issues
      if (!(err instanceof Error && err.message.startsWith('APIエラー'))) {
        setError('不明なエラーが発生しました。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [file, instructions]);
  
  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
        if (droppedFile.type !== 'text/csv') {
            setError('対応しているファイル形式はCSVのみです');
            setFile(null);
            setFileName('');
            setCsvPreview(null);
            return;
        }
        if (droppedFile.size > MAX_FILE_SIZE) {
            setError(`ファイルサイズが5MBを超えています: ${(droppedFile.size / 1024 / 1024).toFixed(2)}MB`);
            setFile(null);
            setFileName('');
            setCsvPreview(null);
            return;
        }
        setFile(droppedFile);
        setFileName(droppedFile.name);
        setError('');

        // Read and parse CSV for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            Papa.parse(result, {
              preview: 5,
              complete: (results) => {
                setCsvPreview(results.data as string[][]);
              },
              error: (err: any) => {
                setError(`CSVプレビューの読み込み中にエラーが発生しました: ${err.message}`);
                setCsvPreview(null);
              },
            });
          }
        };
        reader.readAsText(droppedFile);
    }
  };

  const handleDownloadReport = () => {
    if (report) {
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'report.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };


  return (
    <div className="p-4 md:p-6 bg-gray-50 rounded-lg shadow-inner">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">CSVレポート生成</h2>
      
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white cursor-pointer hover:border-blue-500 transition-colors"
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <CsvIcon />
        <input id="file-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <p className="mt-2 text-sm text-gray-600">
          {fileName ? `選択中のファイル: ${fileName}` : 'ここにCSVファイルをドラッグ＆ドロップ'}
        </p>
        <p className="text-xs text-gray-500 mt-1">またはクリックしてファイルを選択 (最大5MB)</p>
      </div>

      {csvPreview && csvPreview.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md">
          <h3 className="text-md font-semibold mb-2">CSVプレビュー (最初の5行):</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-200">
              <tbody className="bg-white divide-y divide-blue-200">
                {csvPreview.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-1 whitespace-nowrap text-sm text-gray-800">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4">
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
          指示内容
        </label>
        <textarea
          id="instructions"
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          placeholder="例: 「部門別の売上を降順で並べ、円グラフで可視化してください。また、最も売上が低い部門の改善策を3つ提案してください。」"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <button
        onClick={handleGenerateReport}
        disabled={isLoading || !file}
        className="mt-4 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            <span className="ml-2">AIレポート生成中...</span>
          </>
        ) : (
          'レポートを生成'
        )}
      </button>

      {isLoading && (
        <div className="mt-4 text-center text-sm text-gray-600">
            <ProgressBar />
            <p className="mt-2">AIがレポートを生成しています。しばらくお待ちください...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="font-bold">エラー</p>
          <p>{error}</p>
        </div>
      )}

      {report && (
        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">生成されたレポート</h3>
          <div className="prose prose-sm max-w-none p-2 bg-gray-100 rounded-md overflow-auto" dangerouslySetInnerHTML={{ __html: marked.parse(report) as string }} />
          <button
            onClick={handleDownloadReport}
            className="mt-4 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
          >
            レポートをダウンロード (.md)
          </button>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
