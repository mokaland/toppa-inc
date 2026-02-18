import { useState } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

const DocumentGenerator = () => {
  const [template, setTemplate] = useState('quotation');
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    setDocument('');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'document', template, description }),
      });
      const data = await res.json();
      if (data.document) {
        setDocument(data.document);
      } else {
        throw new Error(data.error || '書類生成に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">AI書類生成</h2>
      <p className="text-gray-600">テンプレートを選び、内容を説明するだけで、AIが書類を自動作成します。</p>

      {/* テンプレート選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート</label>
        <div className="flex gap-3">
          {[
            { key: 'quotation', label: '見積書' },
            { key: 'invoice', label: '請求書' },
            { key: 'other', label: 'その他' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTemplate(t.key)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                template === t.key
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 自然言語入力 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">書類の内容を説明</label>
        <textarea
          rows={5}
          className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="例: 株式会社ABC様宛に、Webサイトリニューアルの費用として、デザイン30万円、開発50万円、テスト10万円の見積書を作成してください。有効期限は1ヶ月。"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {/* 生成ボタン */}
      <button
        onClick={generate}
        disabled={!description.trim() || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'AIが作成中...' : '書類を生成'}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* 生成結果 */}
      {document && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">生成された書類</h3>
            <button
              onClick={() => navigator.clipboard.writeText(document)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              コピー
            </button>
          </div>
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap border-t pt-4">{document}</div>
        </div>
      )}
    </div>
  );
};

export default DocumentGenerator;
