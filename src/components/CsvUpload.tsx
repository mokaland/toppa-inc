import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';

// APIエンドポイント
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

// --- Main CsvUpload Component ---
const CsvUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); // 不完全だった行を修正

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError('ファイルサイズは5MB以下にしてください。');
        return;
      }
      if (selectedFile.type !== 'text/csv') {
        setError('CSVファイルを選択してください。');
        return;
      }
      setFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleSubmit = async () => {
    if (!file) {
      setError('ファイルが選択されていません。');
      return;
    }
    if (!instructions.trim()) {
      setError('分析・集計の指示を入力してください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReport('');

    Papa.parse(file, {
      complete: async (results) => {
        const csvData = Papa.unparse(results.data);
        try {
          const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'report',
              csv_data: csvData,
              instructions: instructions,
            }),
          });

          if (!res.ok) {
            throw new Error(`APIエラー: ${res.status} ${res.statusText}`);
          }

          const data = await res.json();
          if (data.report) {
            setReport(data.report);
          } else {
            throw new Error('APIからのレポートが空です。');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
        } finally {
          setIsLoading(false);
        }
      },
      error: (err) => {
        setError(`CSVの解析に失敗しました: ${err.message}`);
        setIsLoading(false);
      },
    });
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-md">
      <div className="space-y-6">
        {/* File Dropzone */}
        <div
          {...getRootProps()}
          className={`p-10 border-2 border-dashed rounded-md cursor-pointer text-center transition-colors ${
            isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            <CsvIcon />
            {file ? (
              <>
                <p className="mt-2 text-lg font-medium text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
              </>
            ) : (
              <p className="mt-2 text-gray-600">CSVファイルをドラッグ＆ドロップ、またはクリックして選択</p>
            )}
            <p className="text-xs text-gray-500 mt-1">ファイルサイズ上限: 5MB</p>
          </div>
        </div>

        {/* Instructions Textarea */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
            分析・集計の指示
          </label>
          <textarea
            id="instructions"
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="例: 部門別の売上を降順で集計し、最も貢献度の高い部門について考察してください。"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Error Message */}
        {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}

        {/* Submit Button */}
        <div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !file}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? <><SpinnerIcon /> レポート生成中...</> : 'レポートを生成'}
          </button>
        </div>

        {/* Report Output */}
        {report && (
          <div className="mt-8">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">生成されたレポート</h3>
            <div className="p-4 bg-gray-50 border rounded-md prose max-w-none">
              <pre className="whitespace-pre-wrap">{report}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvUpload;
