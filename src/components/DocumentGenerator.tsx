import { useState, useCallback } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

// ローディングスピナーコンポーネント
const Spinner = () => (
  <div className="flex justify-center items-center p-4 my-4">
    <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span className="text-lg text-gray-600">書類を生成しています...</span>
  </div>
);

// エラーメッセージコンポーネント
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative my-4" role="alert">
    <strong className="font-bold">エラー: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

/**
 * AI書類生成コンポーネント
 * UIを洗練させ、ローディング表示をスピナーに変更した改善版。
 */
const DocumentGenerator = () => {
  const [template, setTemplate] = useState('quotation');
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!description.trim()) {
      setError('指示内容を入力してください。');
      return;
    }

    setLoading(true);
    setError(null);
    setDocument('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'document', template, description }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'サーバーから不明なエラーが返されました。' }));
        throw new Error(errorData.message || `HTTPエラー: ${response.status}`);
      }

      const data = await response.json();
      if (data.document) {
        setDocument(data.document);
      } else {
        throw new Error('APIからのレスポンスに書類データが含まれていません。');
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(`生成に失敗しました: ${e.message}`);
      } else {
        setError('予期せぬエラーが発生しました。');
      }
    } finally {
      setLoading(false);
    }
  }, [template, description]);

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">書類生成AI</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">テンプレートを選択</label>
          <select 
            id="template-select" 
            value={template} 
            onChange={(e) => setTemplate(e.target.value)}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="quotation">見積書</option>
            <option value="invoice">請求書</option>
            <option value="freeform">自由形式</option>
          </select>
        </div>
        <div>
          <label htmlFor="description-textarea" className="block text-sm font-medium text-gray-700 mb-1">指示内容</label>
          <textarea 
            id="description-textarea"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例: 株式会社ABC宛に、Webサイトリニューアルの件で90万円の見積書を作成。納期は3月31日。"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button 
          onClick={generate} 
          disabled={loading}
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : '書類を生成する'}
        </button>
      </div>

      {error && <ErrorMessage message={error} />}
      
      {loading && <Spinner />}

      {document && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-2 text-gray-800">生成された書類</h3>
          <pre className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap font-mono text-sm">
            {document}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DocumentGenerator;
