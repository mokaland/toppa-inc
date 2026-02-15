# ツミキリ 技術アーキテクチャ設計書

> 作成: CTO マルコ・ロssi
> 日付: 2026-02-15
> ステータス: 設計完了
> レビュー対象: CEO 高橋レン

## 1. システム構成

### 全体アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────────┐
│                              ブラウザ                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  チャットUI  │  │ レポートUI  │  │ テンプレートUI│               │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │                │                │                        │
│         └────────────────┼────────────────┘                        │
│                          │                                           │
│                          ▼                                          │
│              ┌───────────────────────┐                              │
│              │   Cloudflare Pages    │                              │
│              │    (React SPA 静的)   │                              │
│              └───────────┬───────────┘                              │
│                          │                                           │
│                          ▼ APIリクエスト                             │
│              ┌───────────────────────┐                              │
│              │  Cloudflare Workers   │                              │
│              │   (Hono API サーバー)  │                              │
│              └───────────┬───────────┘                              │
│                          │                                           │
│         ┌────────────────┼────────────────┐                         │
│         │                │                │                         │
│         ▼                ▼                ▼                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  Supabase   │  │   AI Provider│  │   AI Provider│               │
│  │  PostgreSQL │  │   (BYOK)     │  │  (Managed)   │                │
│  │  Auth       │  │  OpenAI/     │  │  TOPPA API   │                │
│  │  Storage    │  │  Anthropic/  │  │  キー管理     │                │
│  │             │  │  Google      │  │              │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### インフラ構成詳細

| サービス | 役割 | 設定 |
|----------|------|------|
| Cloudflare Pages | フロントエンドホ스팅 | カスタムドメイン: tsumikiri.app |
| Cloudflare Workers | APIサーバー | Workers AI不使用、外部API呼び出し |
| Supabase | データベース + 認証 + ストレージ | Free Tier（開発）、Pro以降でスケール |
| Cloudflare D1 | キャッシュ用DB | 会話履歴キャッシュ（今後検討） |

## 2. API設計

### 2-1. チャットAPI

| エンドポイント | Method | 機能 | 認証 |
|---------------|--------|------|------|
| `/api/chat` | POST | メッセージ送信・AI応答取得 | 必須 |
| `/api/chat/history` | GET | 会話履歴一覧取得 | 必須 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | 必須 |

#### POST /api/chat Request Body

```typescript
interface ChatRequest {
  message: string;
  sessionId?: string;
  model?: 'openai' | 'anthropic' | 'google'; // BYOK利用時
}
```

#### POST /api/chat Response

```typescript
interface ChatResponse {
  id: string;
  message: string;
  role: 'assistant';
  sessionId: string;
  createdAt: string;
  modelUsed: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}
```

### 2-2. レポート生成API

| エンドポイント | Method | 機能 | 認証 |
|---------------|--------|------|------|
| `/api/report/upload` | POST | CSV/Excelファイルアップロード | 必須 |
| `/api/report/generate` | POST | レポート生成開始 | 必須 |
| `/api/report/:id` | GET | レポート結果取得 | 必須 |
| `/api/report/list` | GET | レポート一覧取得 | 必須 |

#### POST /api/report/generate Request Body

```typescript
interface ReportGenerateRequest {
  fileId: string; // Supabase StorageのファイルID
  prompt: string; // 自然言語での分析指示
  format?: 'markdown' | 'pdf'; // 出力形式
  model?: 'openai' | 'anthropic' | 'google';
}
```

### 2-3. テンプレート書類生成API

| エンドポイント | Method | 機能 | 認証 |
|---------------|--------|------|------|
| `/api/document/templates` | GET | テンプレート一覧取得 | 必須 |
| `/api/document/generate` | POST | 書類生成開始 | 必須 |
| `/api/document/:id` | GET | 生成済み書類取得 | 必須 |
| `/api/document/:id/download` | GET | PDFダウンロード | 必須 |

#### POST /api/document/generate Request Body

```typescript
interface DocumentGenerateRequest {
  templateId: 'estimate' | 'invoice' | 'thankyou';
  data: {
    // 見積書/請求書/お礼状に共通の必須項目
    companyName: string;
    contactName: string;
    // 見積書のみ
    items?: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
    // 請求書のみ
    totalAmount?: number;
    paymentDeadline?: string;
  };
  model?: 'openai' | 'anthropic' | 'google';
}
```

### 2-4. 認証・ユーザーAPI

| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/auth/signup` | POST | ユーザー登録 | メール認証 |
| `/api/auth/login` | POST | ログイン | Supabase Auth連携 |
| `/api/auth/logout` | POST | ログアウト | - |
| `/api/user/settings` | GET | ユーザー設定取得 | BYOK APIキー管理等 |
| `/api/user/settings` | PATCH | ユーザー設定更新 | - |

### 2-5. API共通エラーレスポンス

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

| エラーコード | HTTPステータス | 説明 |
|-------------|---------------|------|
| UNAUTHORIZED | 401 | 認証エラー |
| FORBIDDEN | 403 | 権限エラー |
| NOT_FOUND | 404 | リソース不存在 |
| RATE_LIMITED | 429 | レート制限超過 |
| AI_ERROR | 500 | AIプロバイダーエラー |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

## 3. BYOK実装方針

### 3-1. BYOK概要

Bring Your Own Key（BYOK）方式是、ユーザーが自分のAPIキーを使用してAI機能を利用する仕組みです。TOPPA Inc.のAPIキーを使用せず、ユーザーは自分のOpenAI/Anthropic/Googleのキーを入力・管理します。

**メリット**:
- ユーザーは無料枠（OpenAI無料 trial等）を活用可能
- TOPPA Inc.のAPIコストがゼロ
- Proプラン加入動機になります（APIキー管理が面倒なユーザー向け）

### 3-2. BYOK実装フロー

```
1. ユーザーが設定画面を開く
2. 「APIキーを入力」セクションが表示される
3. ユーザーがProvider選択 + APIキーを入力
4. フロントエンド → APIへ送信（SSL暗号化）
5. APIサーバーがキーを検証（最小限のテストリクエスト）
6. 検証成功后、暗号化してSupabaseに保存
7. 以降のAIリクエストではユーザーのキーが優先使用される
```

### 3-3. データベース設計（APIキー保存）

```sql
-- ユーザーAPIキー管理テーブル
CREATE TABLE user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
    encrypted_key TEXT NOT NULL,
    key_last_four VARCHAR(4), -- キーを識別するため末尾4桁を保存（暗号化なし）
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
    ON user_api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
    ON user_api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
    ON user_api_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
    ON user_api_keys FOR DELETE
    USING (auth.uid() = user_id);
```

### 3-4. 暗号化方式

| 項目 | 詳細 |
|------|------|
| 暗号化アルゴリズム | AES-256-GCM |
| 鍵管理 | Cloudflare Workersシークレット（`USER_KEY_ENCRYPTION_KEY`） |
| IV | 各暗号化ごとにランダム生成 |
| 保存形式 | `iv:ciphertext`（Base64エンコード） |

### 3-5. APIキー使用優先順位

```
1. 用户的APIキー（user_api_keysテーブル、is_active=TRUE）
2. TOPPA Managed API（Proプラン、无用户キー）
3. エラー（无任何キー可用）
```

## 4. セキュリティ要件

### 4-1. 通信セキュリティ

| 要件 | 実装 |
|------|------|
| TLS 1.3 | Cloudflare標準（自動適用） |
| HTTPS強制 | Cloudflare Page RulesでHTTP→HTTPSリダイレクト |
| HSTS | Cloudflareで有効化（max-age: 1年） |

### 4-2. 認証・認可

| 要件 | 実装 |
|------|------|
| ユーザー認証 | Supabase Auth（メール + パスワード） |
| セッション管理 | Supabase Auth（JWT + リフレッシュトークン） |
| 認可 | Supabase RLS（Row Level Security） |
| API認証 | Bearer Token（JWT） |

### 4-3. データ保護

| データ種 | 保護方法 |
|----------|----------|
| ユーザーパスワード | Supabase Authでbcryptハッシュ化 |
| APIキー | AES-256-GCM暗号化 |
| 会話履歴 | Supabase暗号化（AES-256） |
| ファイルアップロード | Supabase Storage（暗号化済み） |

### 4-4. レート制限

| エンドポイント | 制限 | ウィンドウ |
|---------------|------|-----------|
| `/api/chat` | 10リクエスト | 1分 |
| `/api/report/generate` | 5リクエスト | 1分 |
| `/api/document/generate` | 5リクエスト | 1分 |

Cloudflare Workersの`rateLimit()`bindingsを使用。

### 4-5. CORS設定

```typescript
// Cloudflare Workers CORS設定
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://tsumikiri.app',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
```

### 4-6. セキュリティチェックリスト

| チェック項目 | 実装場所 | ステータス |
|-------------|----------|------------|
| XSS対策 | React（エスケープ出力） | 設計済 |
| CSRF対策 | Supabase Auth（トークンベース） | 設計済 |
| SQLインジェクション | Prisma/Supabaseクライアント（パラメータ化クエリ） | 設計済 |
| 認証情報ログ出力禁止 | Cloudflare Workers（ログ設定） | 設計済 |
| APIキー記憶域暗号化 | アプリケーションコード | 設計済 |

## 5. データモデル

### 5-1. ER図

```
┌──────────────┐       ┌─────────────────┐
│    users     │       │  chat_sessions  │
│ (auth.users) │◀───── │                 │
└──────────────┘       │ id              │
     │                 │ user_id (FK)    │
     │                 │ title            │
     │                 │ created_at       │
     │                 └────────┬─────────┘
     │                          │
     │                   ┌──────┴──────────┐
     │                   │ chat_messages  │
     │                   │                │
     │                   │ id             │
     │                   │ session_id (FK)│
     │                   │ user_id (FK)   │
     │                   │ role            │
     │                   │ content         │
     │                   │ created_at      │
┌────┴──────────┐        └─────────────────┘
│user_api_keys   │
│                │
│ id             │
│ user_id (FK)   │
│ provider       │
│ encrypted_key  │
│ is_active      │
└────────┬───────┘
         │
┌────────┴──────────┐     ┌─────────────────┐
│     reports       │     │    documents    │
│                   │     │                 │
│ id                │     │ id              │
│ user_id (FK)      │     │ user_id (FK)    │
│ title             │     │ template_id     │
│ file_url          │     │ generated_text  │
│ prompt            │     │ status          │
│ result            │     │ created_at      │
│ status            │     └─────────────────┘
│ created_at        │
└───────────────────┘
```

### 5-2. Supabaseスキーマ（SQL）

```sql
-- チャットセッション
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT '新しい会話',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- チャットメッセージ
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_used VARCHAR(20),
    tokens_used JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
    ON chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- レポート
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    prompt TEXT NOT NULL,
    result TEXT,
    format VARCHAR(20) DEFAULT 'markdown',
    status VARCHAR(20) DEFAULT 'pending',
    model_used VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 生成済み書類
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    generated_content TEXT,
    pdf_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    model_used VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

## 6. フロントエンド構成

### 6-1. ページ構成

| パス | ページ名 | 機能 |
|------|----------|------|
| `/` | ランディング | サービス説明、CTA |
| `/login` | ログイン | メール/パスワードログイン |
| `/signup` | 新規登録 | ユーザー登録 |
| `/dashboard` | ダッシュボード | 機能選択画面 |
| `/chat` | チャット | AIアシスタントとの対話 |
| `/chat/:sessionId` | チャットセッション | 特定会話の続き |
| `/reports` | レポート一覧 | 生成済みレポート一覧 |
| `/reports/new` | レポート生成 | CSVアップロード + 分析指示 |
| `/documents` | 書類一覧 | 生成済み書類一覧 |
| `/documents/new` | 書類生成 | テンプレート選択 + 入力 |
| `/settings` | 設定 | BYOK APIキー管理 |

### 6-2. コンポーネント構成

```
src/
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Spinner.tsx
│   │   └── ErrorMessage.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── chat/
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatHistory.tsx
│   │   └── ModelSelector.tsx
│   ├── report/
│   │   ├── FileUploader.tsx
│   │   ├── ReportViewer.tsx
│   │   └── ReportList.tsx
│   └── document/
│       ├── TemplateSelector.tsx
│       ├── DocumentForm.tsx
│       └── DocumentPreview.tsx
├── pages/
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Dashboard.tsx
│   ├── ChatPage.tsx
│   ├── ReportsPage.tsx
│   ├── DocumentsPage.tsx
│   └── SettingsPage.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useChat.ts
│   ├── useReport.ts
│   └── useDocument.ts
├── lib/
│   ├── api.ts
│   ├── supabase.ts
│   └── encryption.ts
├── store/
│   └── authStore.ts
├── types/
│   └── index.ts
└── App.tsx
```

## 7. 開発・運用タスク

### 7-1. 実装タスク一覧

| タスクID | タスク内容 | 担当 | 期限 | ステータス |
|----------|-----------|------|------|------------|
| ARCH-001 | 技術アーキテクチャ設計書（本書） | マルコ | 2/15 | 完了 |
| ARCH-002 | Supabase DBスキーマ作成 | カルロス | 2/15 | 進行中 |
| ARCH-003 | Cloudflare Workers API基盤構築 | カルロス | 2/17 | 未着手 |
| ARCH-004 | 認証機能実装 | カルロス | 2/16 | 未着手 |
| ARCH-005 | チャットAPI実装 | カルロス | 2/18-2/20 | 未着手 |
| ARCH-006 | レポート生成API実装 | カル洛斯 | 2/22-2/24 | 未着手 |
| ARCH-007 | テンプレート書類生成API実装 | カルロス | 3/1-3/3 | 未着手 |
| ARCH-008 | BYOK機能実装 | カルロス | 2/18 | 未着手 |
| ARCH-009 | セキュリティレビュー | マルコ | 3/14 | 未着手 |

### 7-2. レビューGate

| Gate | 基準 | 担当 |
|------|------|------|
| コードレビュー（API） | CTO確認・コメント対応 | マルコ |
| セキュリティレビュー | 脆弱性スキャンクリア | マルコ |
| パフォーマンスレビュー | LCP < 2秒 | マルコ |

## 8. 承認

| 役割 | 名前 | 承認日 |
|------|------|--------|
| 作成者 | CTO マルコ・ロッシ | 2026-02-15 |
| レビュー | CEO 高橋レン | - |