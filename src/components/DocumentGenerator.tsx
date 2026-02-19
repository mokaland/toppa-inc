import { useState, useCallback } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

const DocumentGenerator = () => {
  const [template, setTemplate] = useState('quotation');
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    if (!description.trim()) {
      setError('指示を入力してください');
      return;
    }
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

      if (!res.ok) {
        throw new Error(data.error || 'サーバーエラーが発生しました。');
      }
      
      if (data.document) {
        setDocument(data.document);
      } else {
        throw new Error('予期しないレスポンス形式です。');
      }
    } catch (err: any) {
      setError(err.message || '書類の生成に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  }, [template, description]);

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">AI書類生成</h2>
        <p className="text-gray-600">テンプレートを選び、内容を説明するだけで、AIがビジネス書類を自動作成します。</p>
      </div>

      <div className="space-y-4">
        {/* テンプレート選択 (仕様に合わせて<select>に変更) */}
        <div>
          <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
            書類テンプレート
          </label>
          <select
            id="template-select"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
          >
            <option value="quotation">見積書</option>
            <option value="invoice">請求書</option>
            <option value="freeform">自由形式</option>
          </select>
        </div>

        {/* 指示入力 */}
        <div>
          <label htmlFor="description-textarea" className="block text-sm font-medium text-gray-700 mb-2">
            作成したい書類の内容
          </label>
          <textarea
            id="description-textarea"
            rows={5}
            className="mt-1 block w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例：株式会社ABC宛に、Webサイトリニューアルの件で90万円の見積書を作成。納期は3月31日。"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* エラー表示 */}
        {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

        {/* 生成ボタン */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              生成中...
            </>
          ) : (
            '書類を生成する'
          )}
        </button>
      </div>

      {/* 結果表示 */}
      {(document || loading) && (
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">生成結果</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{document}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentGenerator;
