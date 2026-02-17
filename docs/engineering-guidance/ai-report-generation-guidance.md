# AIレポート生成機能 実装ガイダンス

### 1. TypeScriptの型定義

厳格なTypeScriptの型定義は、大規模なアプリケーション開発においてコードの品質と保守性を高めるために不可欠です。`any` 型の使用は避け、可能な限り具体的な型を定義してください。

**例: ファイルアップロードのデータ構造**

```typescript
// src/types/report.ts
export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: ArrayBuffer; // Cloudflare Workersで扱うバイナリデータ
}

// workers/src/report-service.ts
import { UploadedFile } from '../src/types/report';

export async function processReport(file: UploadedFile): Promise<any> {
  // レポート処理ロジック
}
```

### 2. Cloudflare Workersの環境制約

Cloudflare WorkersはEdge Runtimeで動作するため、Node.jsの組み込みモジュールや一部のnpmパッケージは利用できません。特にファイルシステム操作や大きなバイナリデータの処理には注意が必要です。

- **Node.js APIの制限**: `fs` モジュールのようなNode.jsのファイルシステムAPIは使用できません。
- **バイナリデータ処理**: ファイルアップロードされたバイナリデータは `ArrayBuffer` として扱い、必要なパース処理（例: CSVのパース）はWeb標準APIやWorkers互換ライブラリで行ってください。xlsxのような複雑なフォーマットは、Workers上での直接処理は困難な場合があります。代替案として、クライアントサイドでの前処理や、専用のマイクロサービスへのオフロードを検討してください。

### 3. エラーハンドリング

すべてのAPIエンドポイントとビジネスロジックにおいて、堅牢なエラーハンドリングを実装してください。

- `try/catch` ブロックを使用して、予期しないエラーを捕捉し、ログに出力してください。
- ユーザーには、具体的なエラーメッセージではなく、適切なフィードバックを提供してください。
- Cloudflare Workersでは、`Response` オブジェクトでエラーコードとメッセージを返すことが推奨されます。

**例:**

```typescript
// workers/src/report-handler.ts
import { Hono } from 'hono';
import { processReport } from './report-service';

const app = new Hono();

app.post('/upload', async (c) => {
  try {
    const data = await c.req.parseBody();
    const file = data['file'] as File; // HonoのparseBodyはFileオブジェクトを返す

    const uploadedFile = {
      name: file.name,
      type: file.type,
      size: file.size,
      content: await file.arrayBuffer(),
    };

    const result = await processReport(uploadedFile);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('File upload error:', error);
    return c.json({ success: false, message: 'ファイルのアップロードに失敗しました。', error: error.message }, 500);
  }
});

export default app;
```

### 4. テスト

コミット前に必ず`run_tests`で検証してください。

- **ユニットテスト**: Vitestを使用して、各関数の単体テストを作成してください。カバレッジ80%を目指します。
- **E2Eテスト**: Playwrightを使用して、主要なユーザーフロー（ファイルアップロード、レポート生成など）のE2Eテストを作成してください。
- **AI応答テスト**: AIプロバイダーAPIのモックを作成し、様々なシナリオでのAI応答をテストしてください。

### 5. コーディング規約

- 変数・関数名: `camelCase`
- 型・クラス名: `PascalCase`
- ESLint + Prettierによる自動フォーマットを適用してください。
- 全関数にJSDocコメントを記述し、関数の目的、引数、戻り値を明確にしてください。
