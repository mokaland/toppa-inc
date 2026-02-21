
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

const CsvUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [instructions, setInstructions] = useState('');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError('');
    setReport('');
    setPreview([]);
    const targetFile = acceptedFiles[0];

    if (!targetFile) {
      setError('ファイルが選択されませんでした。');
      return;
    }

    if (targetFile.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください。');
      return;
    }

    // MIMEタイプだけでなく拡張子でもチェック
    if (targetFile.type !== 'text/csv' && !targetFile.name.toLowerCase().endsWith('.csv')) {
      setError('対応しているファイル形式はCSVのみです。');
      return;
    }

    setFile(targetFile);

    Papa.parse(targetFile, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
            const header = Object.keys(results.data[0] as object);
            const rows = results.data.map(d => Object.values(d as object).map(String));
            setPreview([header, ...rows]);
        }
      },
      error: (err) => {
          setError(`CSVの解析に失敗しました: ${err.message}`);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleGenerateReport = async () => {
    if (!file || !instructions) {
      setError('ファイルを選択し、指示を入力してください。');
      return;
    }

    setLoading(true);
    setError('');
    setReport('');

    try {
        const csvData = await file.text();
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
          throw new Error(errorData.message || `APIからエラーステータス ${response.status} を受け取りました。`);
        }

        const data = await response.json();
        setReport(data.report || 'レポートの生成に成功しましたが、内容が空です。');

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`レポートの生成に失敗しました: ${errorMessage}`);
        console.error(e);
    } finally {
        setLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'report.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow-md max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">AIレポート生成 (CSV)</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}>
        <input {...getInputProps()} />
        {
          isDragActive ?
            <p className="text-indigo-600">ここにファイルをドロップ...</p> :
            <p className="text-gray-500">ここにCSVファイルをドラッグ＆ドロップするか、クリックしてファイルを選択</p>
        }
      </div>

      {file && (
        <div className="mt-6">
          <h3 className="font-bold text-lg">選択されたファイル: {file.name}</h3>
          {preview.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <h4 className="font-semibold mb-2">ファイルプレビュー (先頭5行)</h4>
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>{preview[0].map((h, i) => <th key={i} className="px-4 py-2 font-medium text-left text-gray-600 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.slice(1).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => <td key={j} className="px-4 py-2 whitespace-nowrap text-gray-700">{cell}</td>)}
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
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">指示:</label>
        <textarea
          id="instructions"
          rows={4}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          placeholder="例: 部門別売上を分析して改善提案をまとめてください"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div className="mt-6">
        <button
          onClick={handleGenerateReport}
          disabled={loading || !file || !instructions}
          className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : 'レポートを生成'}
        </button>
      </div>

      {report && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold text-gray-800">生成されたレポート</h3>
             <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                ダウンロード (.md)
              </button>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border prose max-w-none prose-pre:bg-transparent prose-pre:p-0">
            <pre className="whitespace-pre-wrap font-sans">{report}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
