import { useState, useCallback } from 'react';
import { marked } from 'marked';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * ローディング状態を示すスピナーコンポーネント
 */
const Spinner = () => (
  <div className="flex justify-center items-center p-4 my-4">
    <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span className="text-lg text-gray-600">書類を生成しています...</span>
  </div>
);

/**
 * エラーメッセージを表示するコンポーネント
 * @param {object} props - プロパティ
 * @param {string} props.message - 表示するエラーメッセージ
 */
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative my-4" role="alert">
    <strong className="font-bold">エラー: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

/**
 * AIによる書類生成機能を提供するコンポーネント。
 * ユーザーはテンプレートを選択し、自然言語で指示を入力することで、
 * 見積書や請求書などの書類をMarkdown形式で生成できる。
 */
const DocumentGenerator = () => {
  const [template, setTemplate] = useState('quotation');
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * APIにリクエストを送信し、書類を生成する。
   * useCallbackを使用して、不要な再レンダリングを防ぐ。
   */
  const generate = useCallback(async () => {
    // バリデーション: 指示が入力されているか確認
    if (!description) {
      setError('指示を入力してください');
      return;
    }

    // 状態の初期化
    setLoading(true);
    setError(null);
    setDocument('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'document',
          template,
          description,
        }),
      });

      if (!response.ok) {
        // HTTPステータスコードが2xxでない場合はエラーを投げる
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setDocument(data.document || '');

    } catch (err) {
      console.error('Document generation failed:', err);
      setError('書類の生成に失敗しました。時間をおいて再度お試しください');
    } finally {
      setLoading(false);
    }
  }, [description, template]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">AI書類ジェネレーター</h2>
      
      {/* テンプレート選択 */}
      <div className="mb-4">
        <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">
          書類テンプレート
        </label>
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

      {/* 指示入力 */}
      <div className="mb-4">
        <label htmlFor="description-input" className="block text-sm font-medium text-gray-700 mb-1">
          指示内容 (例: ABC社宛にWebリニューアル90万円の見積書を作成)
        </label>
        <textarea
          id="description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="作成したい書類の内容を具体的に入力してください..."
          rows={4}
          className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 生成ボタン */}
      <button
        onClick={generate}
        disabled={loading}
        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? '生成中...' : '書類を生成する'}
      </button>

      {/* 結果表示エリア */}
      <div className="mt-6">
        {loading && <Spinner />}
        {error && <ErrorMessage message={error} />}
        {document && (
          <div>
            <h3 className="text-xl font-semibold mb-2 text-gray-700">生成された書類</h3>
            <div className="prose prose-sm max-w-none p-2 bg-gray-100 rounded-md overflow-auto" dangerouslySetInnerHTML={{ __html: marked.parse(document) as string }} />
            <button
              onClick={() => navigator.clipboard.writeText(document)}
              className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              クリップボードにコピー
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGenerator;
