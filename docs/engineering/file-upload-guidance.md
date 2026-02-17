# ファイルアップロード機能 技術ガイダンス

作成者: CTO マルコ・ロッシ
日付: 2026-02-17
ステータス: ドラフト

## 1. 概要

本ドキュメントは、Founding Engineerが「AIレポート生成」機能におけるファイルアップロードUIの実装およびバックエンドAPIの連携を行うための技術ガイダンスを提供します。

## 2. フロントエンド (React/TypeScript)

`src/upload_example.js` を参考に、以下の点を考慮してファイルアップロードUIを実装してください。

### 2.1. コンポーネント構成

- `FileInput`: ファイル選択 (`<input type="file">`) と、選択されたファイル名を表示するコンポーネント。
- `UploadButton`: ファイルアップロードを実行するボタン。
- `FileUploadForm`: 上記コンポーネントを組み合わせたフォームコンポーネント。

### 2.2. ファイル選択と状態管理

- `useState` を使用して、選択された `File` オブジェクトを管理します。
- ユーザーがファイルを選択したら、そのファイルを状態に保存し、ファイル名を表示します。

### 2.3. バックエンド連携

- `uploadFile` 関数 (`src/upload_example.js` 参照) を参考に、`fetch` APIを使用してCloudflare WorkersのAPIエンドポイント (`/api/upload`) にファイルを送信します。
- `FormData` を使用してファイルを送信してください。

```typescript
// 例: ファイルアップロード処理の抜粋
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file); // 'file' はバックエンドで受け取る際のキー名

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    const result = await response.json();
    console.log('Upload successful:', result);
    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
```

## 3. バックエンド (Cloudflare Workers / Hono)

`workers/src/index.ts` に `/api/upload` エンドポイントを実装します。

### 3.1. Honoルーターのセットアップ

Honoを使用して、`POST /api/upload` エンドポイントを定義します。

```typescript
// workers/src/index.ts (抜粋)
import { Hono } from 'hono';
// import { getRuntimeKey } from 'hono/adapter'; // FormDataパースに必要だが、Hono v3以降は不要になる可能性あり

const app = new Hono();

app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File; // 'file' はフロントエンドから送られるキー名

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    // ファイル処理ロジック（例: Supabase Storageへのアップロード）
    // 以下はSupabase Storageへのアップロードの概念的なコードです。
    // 実際のSupabaseクライアントの初期化とアップロード処理を記述してください。
    // 環境変数 (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY) を使用してSupabaseクライアントを初期化します。
    // `service_role` キーを使用してRLSをバイパスし、ファイルをアップロードします。
    // Supabaseクライアントのインポート: import { createClient } from '@supabase/supabase-js';

    // const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    // const { data, error } = await supabase.storage
    //   .from('your-bucket-name') // バケット名を指定
    //   .upload(`public/${file.name}`, file, {
    //     cacheControl: '3600',
    //     upsert: false,
    //   });

    // if (error) {
    //   throw error;
    // }

    return c.json({ message: `File ${file.name} uploaded successfully`, size: file.size, type: file.type });
  } catch (error: any) {
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default app;
```

### 3.2. Supabase Storageへのアップロード

- SupabaseクライアントはCloudflare Workersの環境変数からAPIキーを取得して初期化してください。`SUPABASE_URL` と `SUPABASE_SERVICE_KEY` を使用します。
- `supabase.storage.from('your-bucket-name').upload(...)` を使用してファイルを指定のバケットにアップロードします。
- バケット名はプロダクト仕様に合わせて決定してください（例: `report-files`）。
- `service_role` キーを使用することでRow Level Security（RLS）をバイパスし、バックエンドからファイルをアップロードできます。

## 4. テスト

- フロントエンド: Vitest（ユニットテスト）、Playwright（E2Eテスト）でファイル選択、アップロードボタンクリック、成功/失敗時のUI表示を検証します。
- バックエンド: `wrangler dev` でローカル環境でAPIを起動し、PostmanやcurlなどでファイルアップロードAPIをテストします。

## 5. 環境変数

Cloudflare Workersの `wrangler.toml` およびデプロイ環境で以下の環境変数を設定してください。

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (フロントエンド用)
- `SUPABASE_SERVICE_KEY` (バックエンド用)
