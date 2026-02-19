import { useState, useCallback } from 'react';

const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

/**
 * AI書類生成コンポーネント
 * テンプレートと自然言語の指示に基づき、APIを呼び出して書類を生成します。
 */
const DocumentGenerator = () => {
  const [template, setTemplate] = useState('quotation');
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    // フロントエンドでのバリデーション
    if (!description.trim()) {
      setError('指示内容を入力してください。');
      return;
    }

    // 状態の初期化
    setLoading(true);
    setError(null);
    setDocument('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'document',
          template,
          description,
        }),
      });

      // HTTPステータスコードが200番台でない場合のエラーハンドリング
      if (!response.ok) {
        let errorMessage;
        try {
          // まずJSONとしてエラーレスポンスの解析を試みる
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || 'サーバーからエラーが返されましたが、詳細メッセージがありません。';
        } catch (jsonError) {
          // JSONの解析に失敗した場合（例: 502 Bad GatewayでHTMLが返るなど）
          errorMessage = 'サーバーとの通信に失敗しました。レスポンスが不正です。';
        }
        // 最終的なエラーメッセージを組み立ててスローする
        throw new Error(`${errorMessage} (ステータス: ${response.status})`);
      }

      const data = await response.json();

      // 成功レスポンスだが、期待したデータが含まれていない場合
      if (data.document) {
        setDocument(data.document);
      } else {
        throw new Error('サーバーから予期しない形式の応答がありました。');
      }

    } catch (err) {
      // ネットワークエラーやスローされたエラーをキャッチ
      if (err instanceof Error) {
        setError(`エラー: ${err.message}`);
      } else {
        setError('予期せぬエラーが発生しました。時間をおいて再度お試しください。');
      }
    } finally {
      // 処理が成功・失敗いずれの場合でもローディングを解除
      setLoading(false);
    }
  }, [template, description]);

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">AI書類生成</h2>
        <p className="text-gray-600">テンプレートを選択し、作りたい書類の内容を具体的に指示してください。</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">テンプレート選択</label>
          <select
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loading}
          >
            <option value="quotation">見積書</option>
            <option value="invoice">請求書</option>
            <option value="freeform">自由形式</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">指示内容</label>
          <textarea
            id="description"
            rows={5}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="例: 株式会社ABC宛に、Webサイトリニューアルの件で90万円の見積書を作成。納期は3月31日。"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : '書類を生成する'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {document && !loading && (
        <div className="space-y-4">
           <h3 className="text-lg font-semibold text-gray-800">生成された書類</h3>
           <pre className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap text-sm text-gray-800 border">{document}</pre>
        </div>
      )}
    </div>
  );
};

export default DocumentGenerator;
