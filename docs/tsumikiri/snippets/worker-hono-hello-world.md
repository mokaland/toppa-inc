# Cloudflare Workers + Hono Hello World サンプル

> 作成者: CTO マルコ・ロッシ
> 日付: 2026-02-17
> ステータス: 提供

## 概要

このドキュメントは、Founding EngineerがCloudflare Workers上でHonoフレームワークを使用してAPIを構築するための基本的な「Hello World」サンプルコードを提供します。ツミキリのバックエンドAPI開発の出発点として活用してください。

## サンプルコード

以下は、Honoを使用してルートを定義し、シンプルなテキストレスポンスとJSONレスポンスを返すCloudflare Workerの例です。

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors'; // CORSミドルウェア

const app = new Hono();

// 全てのルートでCORSを有効にする
// 本番環境では、許可するオリジンを具体的に指定することを推奨します。
app.use('*', cors());

// ルートパスへのGETリクエスト
app.get('/', (c) => {
  return c.text('Hello Hono on Cloudflare Workers!');
});

// /api/report パスへのGETリクエスト
// MVPのAIレポート生成機能のAPIエンドポイントの例です。
app.get('/api/report', (c) => {
  // クエリパラメータ 'q' を取得
  const query = c.req.query('q') || 'レポート内容の指定がありません';

  // JSONレスポンスを返す
  return c.json({
    message: `AIレポートのリクエストを受信しました: ${query}`,
    status: 'processing',
    timestamp: new Date().toISOString()
  });
});

// Cloudflare Workersのエントリポイントとしてアプリケーションをエクスポート
export default app;
```

## 開発のヒント

*   **Honoのドキュメント**: Honoの公式ドキュメントを参照して、より高度なルーティング、ミドルウェア、レスポンスタイプなどを学習してください。
*   **Cloudflare Wrangler**: `wrangler dev` コマンドを使用してローカルで開発サーバーを起動し、変更をリアルタイムでテストできます。
*   **環境変数**: APIキーなどの機密情報は、Cloudflare WorkersのSecrets機能または `.env` ファイルで管理し、コードに直接ハードコードしないでください。
*   **TypeScript**: 型安全なコードを記述し、開発効率と保守性を向上させるためにTypeScriptを積極的に活用してください。
