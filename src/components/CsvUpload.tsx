import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';

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
  const [error, setError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null);
    setFile(null);
    setCsvPreview([]);

    if (fileRejections.length > 0) {
      const firstError = fileRejections[0].errors[0];
      if (firstError.code === 'file-too-large') {
        setError(`ファイルサイズは${MAX_FILE_SIZE / 1024 / 1024}MB以下にしてください。`);
      } else if (firstError.code === 'file-invalid-type') {
        setError('対応しているファイル形式はCSVのみです。');
      } else {
        setError('無効なファイルです。');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const acceptedFile = acceptedFiles[0];
      setFile(acceptedFile);

      // CSVプレビュー生成
      Papa.parse(acceptedFile, {
        header: true,
        preview: 5,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const data = results.data as any[];
          setCsvPreview([headers, ...data.map(row => headers.map(h => row[h]))]);
        },
        error: () => {
          setError('CSVファイルの読み込みに失敗しました。');
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

  const handleSubmit = async () => {
    if (!file || !instructions) {
      setError('CSVファイルを選択し、指示を入力してください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReport('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvData = event.target?.result as string;
        if (!csvData) {
          setError('CSVファイルの内容を読み取れませんでした。');
          setIsLoading(false);
          return;
        }

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
          const errorData = await response.json().catch(() => ({ message: 'サーバーから不明なエラーが返されました。' }));
          throw new Error(errorData.message || `サーバーエラー: ${response.status}`);
        }

        const result = await response.json();
        setReport(result.report || 'レポートが生成されませんでした。');
      };
      reader.onerror = () => {
          setError('ファイルの読み込み中にエラーが発生しました。');
          setIsLoading(false);
      };
      reader.readAsText(file);

    } catch (err: any) {
      setError(err.message || 'レポートの生成中に予期せぬエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">AIレポート生成</h2>
      <p className="text-gray-600 mb-6">CSVファイルをアップロードし、分析や要約の指示を出すと、AIがレポートを自動生成します。</p>

      {/* Step 1: File Upload */}
      <div {...getRootProps()} className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <CsvIcon />
          {isDragActive ?
            <p className="mt-2 text-blue-600 font-semibold">ここにファイルをドロップ</p> :
            <p className="mt-2 text-gray-600">CSVファイルをドラッグ＆ドロップするか、<span className="font-semibold text-blue-600">クリックして選択</span></p>
          }
          <p className="text-xs text-gray-500 mt-1">最大ファイルサイズ: {MAX_FILE_SIZE / 1024 / 1024}MB</p>
        </div>
      </div>

      {file && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md border">
            <p className="text-sm font-medium text-gray-700">選択されたファイル: <span className="font-normal">{file.name}</span></p>
             {csvPreview.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 overflow-x-auto">
                    <table className="table-auto w-full">
                        <thead>
                            <tr className="bg-gray-200">
                                {csvPreview[0].map((header, i) => <th key={i} className="px-2 py-1 text-left">{header}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {csvPreview.slice(1).map((row, i) => (
                                <tr key={i} className="border-t">
                                    {row.map((cell, j) => <td key={j} className="px-2 py-1">{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

      {/* Step 2: Instructions */}
      <div className="mt-6">
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">指示内容</label>
        <textarea
          id="instructions"
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="例: 部門別の売上を降順で集計し、最も貢献度の高い部門について考察してください。"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}

      {/* Step 3: Generate Button */}
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !file || !instructions}
          className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? <><SpinnerIcon /> 生成中...</> : 'レポートを生成する'}
        </button>
      </div>

      {/* Step 4: Display Report */}
      {report && !isLoading && (
         <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">生成されたレポート</h3>
            <div className="p-4 bg-gray-50 rounded-lg border overflow-x-auto">
              <pre className="text-sm whitespace-pre-wrap"><code>{report}</code></pre>
            </div>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
