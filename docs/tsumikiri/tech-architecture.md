# ツミキリ 技術アーキテクチャ設計

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-16
> ステータス: 更新済み

## 1. システム構成図

ツミキリのシステム構成は、既存の技術方針書 `docs/tech-direction.md` に基づき、以下の通りとする。
特に、チャットアシスタント機能とAIレポート生成機能の追加を反映する。

```mermaid
graph TD
    A[ユーザー (ブラウザ)] -- HTTPS --> B(Cloudflare Pages / React Frontend)
    B -- API リクエスト --> C(Cloudflare Workers / Hono API)
    C -- 認証 / データ保存 --> D(Supabase PostgreSQL)
    C -- ファイル一時保存 --> E(Supabase Storage)
    C -- AIリクエスト (BYOKまたはマネージド) --> F(AI Provider API <br> OpenAI/Anthropic/Google)

    subgraph 主要機能フロー
        B -- POST /api/chat --> C
        B -- GET /api/chat/history --> C
        B -- POST /api/report/generate (ファイル含む) --> C
        C -- 会話履歴保存/取得 --> D
        C -- レポート履歴保存/取得 --> D
        C -- アップロードファイル保存 --> E
        C -- AI処理 (チャット応答/レポート生成) --> F
    end
```

## 2. API設計（エンドポイント一覧）

Founding EngineerのMVP実装計画 `docs/implementation-plan.md` に基づき、以下のAPIエンドポイントを定義する。

| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/auth/signup` | POST | ユーザー登録 | Supabase Authを利用 |
| `/api/auth/signin` | POST | ユーザーログイン | Supabase Authを利用 |
| `/api/chat` | POST | チャット送信・AI応答取得 | 会話履歴をSupabaseに保存 |
| `/api/chat/history` | GET | 全会話履歴取得 | ユーザーIDでフィルタリング |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | - |
| `/api/report/upload` | POST | レポート用ファイルアップロード | Supabase Storageに一時保存 |
| `/api/report/generate` | POST | ファイル解析・AIレポート生成 | AI Provider APIと連携 |
| `/api/report/list` | GET | 生成済みレポート一覧取得 | - |
| `/api/report/:reportId` | GET | 特定レポート詳細取得 | - |
| `/api/template/list` | GET | テンプレート一覧取得 | - |
| `/api/template/generate` | POST | テンプレートから書類生成 | - |

## 3. BYOK (Bring Your Own Key) 実装方針

ユーザーが自身のAIプロバイダーAPIキーを利用できるBYOK方式をサポートする。

-   **キーの保存**: ユーザーから提供されたAPIキーは、Supabaseの暗号化されたストレージに安全に保存する。キーはユーザーごとに分離し、厳格なアクセス制御を行う。
-   **キーの利用**: Cloudflare WorkersのAPIエンドポイントで、ユーザーのリクエストに関連付けられたAPIキーを取得し、AIプロバイダーへのリクエスト時に使用する。
-   **セキュリティ**: APIキーはサーバーサイドで一時的に利用し、ログには記録せず、リクエスト完了後メモリから破棄する。SupabaseのRow Level Security (RLS) を適用し、ユーザーは自身のAPIキー情報のみアクセス可能とする。

## 4. セキュリティ要件

TOPPA Inc. の技術方針書 `docs/tech-direction.md` に加えて、ツミキリ固有のセキュリティ要件を定義する。

-   **認証**: Supabase Authを用いたメールアドレス/パスワード認証およびソーシャルログインをサポートする。
-   **認可**: SupabaseのRow Level Security (RLS) を全面的に活用し、ユーザーが自身のデータ（会話履歴、レポート、APIキーなど）のみにアクセスできることを保証する。Founding Engineerにより `chat_messages` テーブルにRLSが適用済み。
-   **データ保護**:
    -   通信: TLS 1.3により暗号化される（Cloudflare標準）。
    -   保存データ: SupabaseのPostgreSQLおよびStorageに保存されるデータは、AES-256で暗号化される。
-   **APIキー管理**: BYOK方針に基づき、ユーザーのAPIキーは暗号化して保存し、厳密なアクセス制御を適用する。Cloudflare Workersのシークレット管理機能も活用し、TOPPA Inc.自身のAPIキーを安全に管理する。

## 5. データベース設計

Founding EngineerのMVP実装計画 `docs/implementation-plan.md` に基づき、Supabase (PostgreSQL) の主要なテーブルスキーマを定義する。

### `chat_messages` テーブル

会話履歴を保存する。

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ユーザーポリシー
CREATE POLICY "Users can view own messages"
    ON chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### `reports` テーブル

AIレポート生成機能で作成されたレポートのメタデータと結果を保存する。

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT, -- Supabase StorageのURL
    prompt TEXT NOT NULL,
    result TEXT, -- AI生成レポートの内容
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ユーザーポリシー
CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### `user_api_keys` テーブル (BYOK用)

ユーザーのBYOK用APIキーを安全に保存する。

```sql
CREATE TABLE user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 例: 'openai', 'anthropic', 'google'
    api_key TEXT NOT NULL, -- 暗号化して保存
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- ユーザーポリシー
CREATE POLICY "Users can manage their own API keys"
    ON user_api_keys FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

## 6. フロントエンドとバックエンドの連携

Founding EngineerによるCloudflare Pagesプロジェクトの作成とReact/TypeScript/Vite/Tailwind CSSによる初期セットアップが完了したことを受け、以下の連携方針を定める。

-   **APIクライアント**: `fetch` APIまたは軽量なHTTPクライアントライブラリ (例: `ky`) を使用し、Cloudflare Workersで公開されるAPIエンドポイントと通信する。
-   **認証情報**: Supabase Authから取得したセッショントークンをHTTPヘッダー (例: `Authorization: Bearer <token>`) に含めてAPIリクエストを行う。
-   **エラーハンドリング**: APIからのエラー応答 (HTTPステータスコード、エラーメッセージ) を適切に処理し、ユーザーにフィードバックを提供する。
-   **状態管理**: Zustandを用いて、チャット履歴やレポート一覧などのアプリケーションの状態を管理する。

## 7. 将来の拡張性

-   **テンプレート機能**: テンプレート書類生成機能の具体的な設計と実装を今後進める。
-   **ファイルアップロードの強化**: 大容量ファイルのアップロード対応、複数ファイル同時アップロードなどを検討する。
-   **リアルタイム機能**: WebSocketなどを利用したリアルタイムチャット応答や進捗表示。

---
