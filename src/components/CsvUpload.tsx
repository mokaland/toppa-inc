import { useState } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

const CsvUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState('');
  const [preview, setPreview] = useState('');
  const [instructions, setInstructions] = useState('');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (f: File) => {
    if (f.type !== 'text/csv' && !f.name.endsWith('.csv')) {
      setError('CSVファイルのみ対応しています');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('5MB以下のファイルを選択してください');
      return;
    }
    setError('');
    setFile(f);
    setReport('');

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setCsvData(text);
      setPreview(text.split('\n').slice(0, 5).join('\n'));
    };
    reader.readAsText(f);
  };

  const generate = async () => {
    if (!csvData || !instructions.trim()) return;
    setLoading(true);
    setError('');
    setReport('');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report', csv_data: csvData, instructions }),
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      } else {
        throw new Error(data.error || 'レポート生成に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">AIレポート生成</h2>
      <p className="text-gray-600">CSVファイルをアップロードし、分析指示を入力すると、AIが自動でレポートを作成します。</p>

      {/* ファイルアップロード */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'}`}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById('csv-input')?.click()}
      >
        <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {file ? (
          <p className="text-indigo-600 font-medium">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
        ) : (
          <p className="text-gray-500">CSVファイルをドラッグ&ドロップ、またはクリックして選択</p>
        )}
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </div>

      {/* プレビュー */}
      {preview && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
          <p className="text-gray-400 mb-2">プレビュー（先頭5行）:</p>
          <pre>{preview}</pre>
        </div>
      )}

      {/* 分析指示 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">分析指示</label>
        <textarea
          rows={3}
          className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="例: 先月の売上を部門別に集計して、傾向と改善提案をまとめてください"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
        />
      </div>

      {/* 生成ボタン */}
      <button
        onClick={generate}
        disabled={!csvData || !instructions.trim() || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'AIが分析中...' : 'レポートを生成'}
      </button>

      {/* レポート結果 */}
      {report && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-3">分析レポート</h3>
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">{report}</div>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
