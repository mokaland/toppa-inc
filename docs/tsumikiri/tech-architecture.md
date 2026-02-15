# TOPPA Inc. — ツミキリ 技術アーキテクチャ設計

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-15
> ステータス: ドラフト

## 1. システム構成図

ツミキリのシステムは、Cloudflareのエッジコンピューティングを最大限に活用し、高速かつスケーラブルな構成とする。フロントエンドとバックエンドの分離、そしてAIプロバイダとの連携を明確にする。

```mermaid
graph TD
    A[ユーザー (ブラウザ)] -- HTTPSリクエスト --> B(Cloudflare Pages);
    B -- APIリクエスト (HTTPS) --> C(Cloudflare Workers);
    C -- 認証/データ操作 (HTTPS) --> D(Supabase);
    D -- PostgreSQL/Auth/Storage --> C;
    C -- AIリクエスト (HTTPS) --> E(AI Provider API);
    E -- OpenAI/Anthropic/Google --> C;
    C -- AI応答/データ --> B;
    B -- UI表示 --> A;

    subgraph Cloudflare Platform
        B(フロントエンド: React SPA);
        C(バックエンドAPI: Hono on Workers);
    end

    subgraph Supabase (データベース & 認証)
        D;
    end

    subgraph AI Providers
        E;
    end
```

## 2. API設計

Cloudflare Workers (Hono) で以下のAPIエンドポイントを提供する。認証はSupabase AuthによるJWT認証を必須とする。

| エンドポイント | Method | 機能 | リクエストボディ (例) | レスポンスボディ (例) | 認証 |
|---|---|---|---|---|---|
| `/api/auth/login` | POST | ユーザーログイン | `{ "email": "user@example.com", "password": "password" }` | `{ "accessToken": "jwt_token", "user": { "id": "uuid" } }` | 不要 |
| `/api/auth/signup` | POST | ユーザー登録 | `{ "email": "user@example.com", "password": "password" }` | `{ "accessToken": "jwt_token", "user": { "id": "uuid" } }` | 不要 |
| `/api/chat` | POST | チャットメッセージ送信・AI応答取得 | `{ "message": "先月の売上を教えて", "sessionId": "optional_uuid" }` | `{ "response": "string", "sessionId": "uuid" }` | 必須 |
| `/api/chat/history` | GET | 会話履歴取得 | なし | `[{"role": "user/assistant", "content": "string", "created_at": "timestamp"}]` | 必須 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | なし | `[{"role": "user/assistant", "content": "string", "created_at": "timestamp"}]` | 必須 |
| `/api/report/upload` | POST | ファイルアップロード (CSV/Excel) | `multipart/form-data` | `{ "fileUrl": "string", "fileName": "string" }` | 必須 |
| `/api/report/generate` | POST | レポート生成要求 | `{ "fileUrl": "string", "prompt": "売上データを分析して" }` | `{ "reportId": "uuid", "status": "pending" }` | 必須 |
| `/api/report/:id` | GET | レポート結果取得 | なし | `{ "id": "uuid", "title": "string", "result": "string", "status": "completed/pending" }` | 必須 |
| `/api/report/list` | GET | レポート一覧取得 | なし | `[{"id": "uuid", "title": "string", "created_at": "timestamp"}]` | 必須 |
| `/api/document/generate` | POST | 書類生成要求 | `{ "templateId": "estimate", "inputData": { "company": "〇〇株式会社", "item": "AIコンサルティング", "amount": 100000 } }` | `{ "documentId": "uuid", "status": "pending" }` | 必須 |
| `/api/document/:id` | GET | 生成済み書類取得 | なし | `{ "id": "uuid", "templateName": "string", "generatedContent": "string", "status": "completed/pending" }` | 必須 |
| `/api/user/settings` | GET | ユーザー設定取得 | なし | `{ "apiKeyConfigured": true }` | 必須 |
| `/api/user/settings` | PUT | ユーザー設定更新 (APIキー登録等) | `{ "openaiApiKey": "sk-...", "anthropicApiKey": "sk-..." }` | `{ "status": "success" }` | 必須 |

## 3. BYOK (Bring Your Own Key) 実装方針

ユーザーは自身のAIプロバイダAPIキーを利用できるBYOK方式をサポートする。

- **APIキー登録**: ユーザーは設定画面からOpenAI/Anthropic/GoogleなどのAPIキーを登録する。
- **保存**: 登録されたAPIキーはCloudflare Workersで受け取り、Supabaseの`user_settings`テーブルに暗号化（AES-256）して保存する。ユーザーごとに分離し、RLSで保護する。
- **利用**: AIリクエスト時、Cloudflare WorkersはSupabaseからユーザーのAPIキーを複合して取得し、AI Provider APIに渡す。
- **セキュリティ**: APIキーはサーバーサイドで一時的に利用し、ログには記録せず、リクエスト処理完了後すぐにメモリから破棄する。

## 4. セキュリティ要件

TOPPA Inc.の全社技術方針に加え、ツミキリ固有の要件を定義する。

- **データ保護**:
    - 通信はTLS 1.3 (Cloudflare標準) で常に暗号化する。
    - Supabaseに保存されるデータはAES-256で暗号化する。
    - APIキーなどの機密情報はCloudflare Workersのシークレット管理機能を利用し、環境変数として安全に管理する。
- **認証・認可**:
    - ユーザー認証はSupabase Authを利用し、メールアドレスとパスワード、またはソーシャルログインをサポートする。
    - データベースのアクセス制御にはRow Level Security (RLS) を適用し、各ユーザーが自身のデータのみにアクセスできるよう徹底する。
    - APIエンドポイントはすべて認証済みユーザーからのリクエストのみを許可する。
- **BYOKセキュリティ**:
    - ユーザーのAPIキーは暗号化して保存し、サーバーサイドでの一時利用に限定する。
    - AIプロバイダへのリクエスト時にのみメモリ上で複合し、利用後は即座にメモリから破棄する。
    - APIキーがログに記録されることを厳しく禁止する。
- **不正利用対策**:
    - 各APIエンドポイントにはレート制限を設ける (例: 1分あたり10リクエスト)。
    - 不審なAPI利用パターンを検知するための監視メカニズムを将来的に導入する。
- **依存ライブラリ**: 使用する全てのサードパーティライブラリは定期的に脆弱性スキャンを実施する。

## 5. データモデル設計

Supabase (PostgreSQL) に以下のテーブルを定義する。全てのテーブルに`user_id`を設け、RLSを適用する。

### `chat_messages` (会話履歴テーブル)

| カラム名 | データ型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | メッセージID |
| `user_id` | `UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE` | ユーザーID |
| `role` | `VARCHAR(10)` | `NOT NULL`, `CHECK (role IN ('user', 'assistant', 'system'))` | 発言者 (ユーザー/AI/システム) |
| `content` | `TEXT` | `NOT NULL` | メッセージ内容 |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | 作成日時 |
| `session_id` | `UUID` | `DEFAULT gen_random_uuid()` | 会話セッションID (新規追加) |

### `reports` (レポート生成履歴テーブル)

| カラム名 | データ型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | レポートID |
| `user_id` | `UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE` | ユーザーID |
| `title` | `VARCHAR(255)` | `NOT NULL` | レポートタイトル |
| `file_name` | `VARCHAR(255)` | | アップロードファイル名 |
| `file_url` | `TEXT` | | Supabase Storage上のファイルURL |
| `prompt` | `TEXT` | `NOT NULL` | ユーザーの分析指示プロンプト |
| `result` | `TEXT` | | AI生成レポート結果 (Markdown) |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | 処理ステータス ('pending', 'completed', 'failed') |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | 作成日時 |
| `completed_at` | `TIMESTAMPTZ` | | 処理完了日時 |

### `documents` (生成済み書類テーブル)

| カラム名 | データ型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | 書類ID |
| `user_id` | `UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE` | ユーザーID |
| `template_id` | `VARCHAR(50)` | `NOT NULL` | 使用テンプレートID (例: 'estimate') |
| `template_name` | `VARCHAR(100)` | `NOT NULL` | テンプレート名 (例: '見積書') |
| `input_data` | `JSONB` | `NOT NULL` | ユーザー入力データ (JSON形式) |
| `generated_content` | `TEXT` | | AI生成書類内容 (Markdown/PDF URL) |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | 処理ステータス ('pending', 'completed', 'failed') |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | 作成日時 |
| `completed_at` | `TIMESTAMPTZ` | | 処理完了日時 |

### `user_settings` (ユーザー設定テーブル)

| カラム名 | データ型 | 制約 | 説明 |
|---|---|---|---|
| `user_id` | `UUID` | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` | ユーザーID |
| `openai_api_key_encrypted` | `TEXT` | | OpenAI APIキー (暗号化) |
| `anthropic_api_key_encrypted` | `TEXT` | | Anthropic APIキー (暗号化) |
| `google_api_key_encrypted` | `TEXT` | | Google APIキー (暗号化) |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | 最終更新日時 |

## 6. 今後のアクション

- Founding Engineerのカルロス・メンデスは本設計書に基づき実装を進める。
- CTOは本設計書をレビューし、必要に応じて更新する。
- 2026-02-21までに本設計書を確定させる。
