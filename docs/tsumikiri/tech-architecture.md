# ツミキリ（Tsumikiri）技術アーキテクチャ設計書

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-14
> ステータス: 作成中
> レビュー予定: CEO 高橋レン（2026-02-21）

## 1. システム全体構成

### 1.1 アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              クライアント層                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   React SPA     │  │   モバイル対応   │  │   PWA（SPA内に包含）        │ │
│  │ (Cloudflare     │  │   Tailwind CSS  │  │   Service Worker設定        │ │
│  │  Pages Hosted)  │  │   レスポンシブ   │  │   オフライン対応: Phase 2   │ │
│  └────────┬────────┘  └─────────────────┘  └─────────────────────────────┘ │
│           │                                                                   │
│           │ HTTPS (TLS 1.3)                                                  │
│           ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                       Cloudflare Edge Network                          │ │
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │ │
│  │  │   Cloudflare Workers        │  │   Cloudflare Pages              │  │ │
│  │  │   (Hono API Server)         │  │   (Static Assets: React App)    │  │ │
│  │  │   - Auth Middleware         │  │   - /, /dashboard, /chat        │  │ │
│  │  │   - AI Proxy                │  │   - /reports, /documents       │  │ │
│  │  │   - File Processor          │  │   - /settings                  │  │ │
│  │  │   - Rate Limiter            │  │                                 │  │ │
│  │  └──────────────┬──────────────┘  └─────────────────────────────────┘  │ │
│  └─────────────────┼───────────────────────────────────────────────────────┘ │
│                    │                                                             │
│                    │ Supabase Client (PostgREST)                                │
│                    ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      Supabase プラットフォーム                           │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐  │ │
│  │  │ PostgreSQL     │  │ Auth           │  │ Storage                  │  │ │
│  │  │ - users        │  │ - email/login  │  │ - /uploads (CSV/Excel)   │  │ │
│  │  │ - documents    │  │ - session      │  │ - /exports (PDF)        │  │ │
│  │  │ - reports      │  │ - RLS          │  │ - /avatars              │  │ │
│  │  │ - chat_history │  │                │  │                         │  │ │
│  │  │ - templates    │  │                │  │                         │  │ │
│  │  │ - api_keys     │  │                │  │                         │  │ │
│  │  └───────┬────────┘  └────────────────┘  └──────────────────────────┘  │ │
│  └──────────┼──────────────────────────────────────────────────────────────┘ │
│             │                                                                    │
│             │ AI プロバイダー (BYOK / Managed)                                  │
│             ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    AI Provider Layer                                   │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │ │
│  │  │ OpenAI          │  │ Anthropic       │  │ Google Gemini           │  │ │
│  │  │ GPT-4o / 4.5    │  │ Claude Sonnet   │  │ Gemini 2.5 Pro         │  │ │
│  │  │ (BYOK/Managed)  │  │ 4.5 (BYOK)      │  │ (BYOK/Managed)         │  │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 データフロー

```
[ユーザー入力]
    │
    ▼
┌───────────────────┐
│ React Components  │ ← Zustand Store (Client State)
└────────┬──────────┘
         │ API Call (fetch)
         ▼
┌───────────────────────────────┐
│ Cloudflare Workers (Hono)    │
│  ┌─────────────────────────┐  │
│  │ Auth Middleware        │  │ ← Supabase Auth Token 検証
│  │ Rate Limiter           │  │ ← 1分10リクエスト上限
│  │ Request Router         │  │
│  └───────────┬─────────────┘  │
│              │                 │
│  ┌───────────▼─────────────┐  │
│  │ /api/chat               │  │ ← チャット機能
│  │ /api/reports/*         │  │ ← レポート生成機能
│  │ /api/documents/*       │  │ ← 書類生成機能
│  │ /api/user/*            │  │ ← ユーザー管理
│  └───────────┬─────────────┘  │
└──────────────┼────────────────┘
               │
    ┌──────────┼────────────────┬──────────┐
    │          │                │          │
    ▼          ▼                ▼          ▼
┌────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐
│Supabase│ │ AI Proxy │ │File Process│ │ ログ     │
│DB/Auth │ │(BYOK/    │ │(csv/xlsx   │ │(エラー   │
│        │ │ Managed) │ │ 解析)      │ │ のみ)    │
└────────┘ └──────────┘ └────────────┘ └──────────┘
```

## 2. データベース設計

### 2.1 ER図

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │   profiles   │     │   api_keys   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (UUID)    │────▶│ user_id (FK) │     │ id (UUID)    │
│ email        │     │ name         │     │ user_id (FK) │
│ created_at   │     │ company      │     │ provider     │
│ email_verified│    │ plan         │     │ encrypted_key│
│              │     │ created_at   │     │ is_active    │
└──────────────┘     └──────────────┘     │ created_at   │
                                           └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  documents   │     │   reports    │     │chat_history  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (UUID)    │     │ id (UUID)    │     │ id (UUID)    │
│ user_id (FK) │     │ user_id (FK) │     │ user_id (FK) │
│ type         │     │ title        │     │ role         │
│ title        │     │ file_path    │     │ content      │
│ content      │     │ status       │     │ token_count  │
│ template_id  │     │ created_at   │     │ created_at   │
│ status       │     └──────────────┘     └──────────────┘
│ created_at   │
│ updated_at   │
└──────────────┘
       │
       ▼
┌──────────────┐
│  templates   │
├──────────────┤
│ id (UUID)    │
│ name         │
│ type         │ ← estimate, invoice, thankyou, etc.
│ content      │ ← JSON structure
│ is_default   │
│ created_at   │
└──────────────┘
```

### 2.2 テーブル詳細

#### users テーブル
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  email_verified BOOLEAN DEFAULT false,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'byok'))
);

-- RLS: ユーザーは自分のレコードのみ参照可能
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);
```

#### profiles テーブル
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE POLICY "profiles_select_own" ON profiles
  FOR ALL USING (auth.uid() = user_id);
```

#### api_keys テーブル（BYOK用）
```sql
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  encrypted_key TEXT NOT NULL,  -- 暗号化保存
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE POLICY "api_keys_manage_own" ON api_keys
  FOR ALL USING (auth.uid() = user_id);
```

#### documents テーブル
```sql
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('estimate', 'invoice', 'thankyou', 'custom')),
  title TEXT NOT NULL,
  content JSONB,
  template_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE POLICY "documents_manage_own" ON documents
  FOR ALL USING (auth.uid() = user_id);
```

#### reports テーブル
```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE POLICY "reports_manage_own" ON reports
  FOR ALL USING (auth.uid() = user_id);
```

#### chat_history テーブル
```sql
CREATE TABLE public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE POLICY "chat_history_manage_own" ON chat_history
  FOR ALL USING (auth.uid() = user_id);

-- インデックス: 最近のチャット取得高速化
CREATE INDEX idx_chat_history_user_created 
  ON chat_history(user_id, created_at DESC);
```

#### templates テーブル
```sql
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('estimate', 'invoice', 'thankyou', 'other')),
  content JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- デフォルトテンプレートは全ユーザーが参照可能
CREATE POLICY "templates_read_all" ON templates
  FOR SELECT USING (is_default = true);
```

### 2.3 ストレージバケット

| バケット名 | 用途 | アクセス制御 |
|-----------|------|-------------|
| `uploads` | ユーザーがアップロードしたCSV/Excel | 所有者本人のみ |
| `exports` | AIが生成したPDF/Markdown | 所有者本人のみ |
| `avatars` | ユーザーアバター | 公開 |

## 3. API 設計

### 3.1 エンドポイント一覧

#### 認証関連
| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/auth/signup` | メール登録 |
| POST | `/api/auth/login` | メールログイン |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/auth/me` | 現在のユーザー情報取得 |

#### チャット機能（機能3）
| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/chat` | チャット送信・応答取得 |
| GET | `/api/chat/history` | チャット履歴取得 |
| DELETE | `/api/chat/history/:id` | チャット削除 |

#### レポート機能（機能1）
| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/reports/upload` | CSV/Excelアップロード |
| POST | `/api/reports/generate` | レポート生成指示 |
| GET | `/api/reports` | レポート一覧取得 |
| GET | `/api/reports/:id` | レポート詳細取得 |
| DELETE | `/api/reports/:id` | レポート削除 |

#### 書類生成機能（機能2）
| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/templates` | テンプレート一覧取得 |
| POST | `/api/documents` | 書類生成指示 |
| GET | `/api/documents` | 書類一覧取得 |
| GET | `/api/documents/:id` | 書類詳細取得 |
| PUT | `/api/documents/:id` | 書類編集 |
| DELETE | `/api/documents/:id` | 書類削除 |

#### ユーザー設定
| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/user/profile` | プロフィール取得 |
| PUT | `/api/user/profile` | プロフィール更新 |
| POST | `/api/user/api-keys` | APIキー登録（BYOK） |
| GET | `/api/user/api-keys` | APIキー一覧取得 |
| DELETE | `/api/user/api-keys/:id` | APIキー削除 |

### 3.2 API リクエスト/レスポンス詳細

#### POST /api/chat
```typescript
// Request
{
  message: string;           // 必須: ユーザーのメッセージ
  context?: {
    document_id?: string;   // オプション: 参照する書類ID
    report_id?: string;     // オプション: 参照するレポートID
  }
}

// Response (Stream)
{
  role: "assistant";
  content: string;          // AIの応答（ストリーミング）
  token_count: number;
}
```

#### POST /api/reports/upload
```typescript
// Request (multipart/form-data)
{
  file: File;               // CSV または Excel (.xlsx, .xls)
  instruction: string;      // 「先月の売上を部門別にまとめて」
}

// Response
{
  report_id: string;       // 生成されたレポートID
  status: "processing";
  message: "レポートを生成中...";
}
```

#### POST /api/documents
```typescript
// Request
{
  template_id: string;     // テンプレートID
  instruction: string;     // 「○○建設さんへ、屋根修理の見積書。金額は35万円」
  // または
  fields: {
    client_name: string;
    client_company: string;
    amount: number;
    items: Array<{name: string; price: number}>;
  }
}

// Response
{
  document_id: string;
  status: "generating";
  preview_url: string;    // 生成後のプレビューURL
}
```

### 3.3 エラーレスポンス

```typescript
// 標準エラーレスポンス
{
  error: {
    code: string;         // "UNAUTHORIZED", "RATE_LIMITED", "INVALID_REQUEST", etc.
    message: string;      // ユーザー向けエラーメッセージ
    details?: any;       // 開発者向け詳細情報
  }
}
```

| エラーコード | HTTPステータス | 説明 |
|------------|--------------|------|
| `UNAUTHORIZED` | 401 | 認証エラー |
| `FORBIDDEN` | 403 | 認可エラー（他ユーザーのデータへのアクセス） |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `RATE_LIMITED` | 429 | レート制限超過（1分10リクエスト） |
| `INVALID_REQUEST` | 400 | リクエストパラメータエラー |
| `AI_ERROR` | 502 | AIプロバイダーエラー |
| `INTERNAL_ERROR` | 500 | サーバーエラー |

## 4. MVP機能別の技術設計

### 4.1 機能1: AIレポート生成

#### 処理フロー
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ファイル   │────▶│  ファイル   │────▶│   AI分析    │────▶│  レポート   │
│  アップロード│     │  解析       │     │   実行      │     │  生成       │
└─────────────┘     │ (xlsx→JSON) │     │ (GPT-4o)   │     │ (Markdown/  │
                    └─────────────┘     └─────────────┘     │  PDF)       │
                                                               └─────────────┘
```

#### 技術詳細
- **ファイル解析**: `xlsx` ライブラリ（Cloudflare Workers対応）
- **AI分析**: GPT-4o（デフォルト）、Claude Sonnet 4.5（BYOK可）
- **プロンプト例**:
  ```
  以下のCSVデータを分析し、経営者がすぐに読める日本語のサマリーレポートを作成してください。
  
  データ: {CSV内容}
  指示: {ユーザーの指示}
  
  出力形式: Markdown
  ```
- **出力**: Markdown → PDF変換（`@react-pdf/renderer` または Server-Side PDF生成）
- **制限**: ファイルサイズ最大10MB、1000行まで

#### ファイル処理Worker実装
```typescript
// workers/ai-report-worker.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { parse } from 'xlsx'; // Cloudflare Workers対応版
import { stream } from 'hono/streaming';

const app = new Hono();

app.post('/reports/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const instruction = formData.get('instruction') as string;
  
  // 1. ファイル検証
  if (!file || !['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type)) {
    return c.json({ error: { code: 'INVALID_FILE', message: 'CSVまたはExcelファイルをアップロードしてください' } }, 400);
  }
  
  // 2. Supabase Storageにアップロード
  const storage = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);
  const fileBuffer = await file.arrayBuffer();
  const filePath = `uploads/${c.get('userId')}/${Date.now()}_${file.name}`;
  await storage.from('uploads').upload(filePath, fileBuffer);
  
  // 3. レポート生成ジョブをキューに追加（将来実装）
  // 現在は直接処理（10秒以内を目標）
  
  // 4. AI分析実行
  const aiResponse = await analyzeWithAI(fileBuffer, instruction);
  
  // 5. レポート保存
  const report = await c.env.DB.prepare(`
    INSERT INTO reports (user_id, title, file_path, status)
    VALUES (?, ?, ?, 'completed')
  `).bind(c.get('userId'), instruction, filePath).first();
  
  return c.json({ report_id: report.id, status: 'completed' });
});
```

### 4.2 機能2: テンプレート書類生成

#### 処理フロー
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ユーザー   │────▶│  テーブル   │────▶│   AI填充    │────▶│  PDF生成    │
│  入力       │     │  取得       │     │   (GPT-4o)  │     │  (preview)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

#### テンプレート構造（JSON）
```typescript
// 見積書テンプレート例
{
  "id": "estimate-default",
  "name": "一般的な見積書",
  "type": "estimate",
  "fields": [
    { "key": "client_name", "label": "顧客名", "required": true },
    { "key": "client_company", "label": "会社名", "required": true },
    { "key": "project_name", "label": "案件名", "required": true },
    { "key": "amount", "label": "金額", "required": true, "type": "number" },
    { "key": "valid_until", "label": "有効期限", "required": true, "type": "date" },
    { "key": "items", "label": "明細", "required": false, "type": "array" }
  ],
  "template": `
{{company_name}} 御中

見積書

案件名: {{project_name}}
有効期限: {{valid_until}}

明細:
{{#each items}}
  - {{name}}: ¥{{price}}
{{/each}}

合計: ¥{{amount}}