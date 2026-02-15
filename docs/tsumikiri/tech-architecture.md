# TOPPA Inc. — ツミキリ 技術アーキテクチャ設計

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-15
> ステータス: 設計更新済

## 1. システム構成図

ツミキリMVPのシステム構成は、既存の技術方針書 `docs/tech-direction.md` をベースとし、Cloudflare Pages/Workers、Supabase、AI Provider APIを核とする。ユーザー認証はSupabase Authを利用し、BYOK方式で複数のAIプロバイダーをサポートする。

```mermaid
graph TD
    A[ユーザー (ブラウザ)] -- HTTPS --> B(Cloudflare Pages)
    B -- Fetch API --> C(Cloudflare Workers)
    C -- gRPC/HTTPS --> D(Supabase)
    C -- HTTPS --> E(AI Provider API)

    subgraph Cloudflare Pages (Frontend)
        B
    end

    subgraph Cloudflare Workers (Backend API)
        C
        C --- F{認証ミドルウェア}
        F --- G[APIエンドポイント]
        G --- H(チャット機能)
        G --- I(レポート生成機能)
        G --- J(テンプレート書類生成機能)
    end

    subgraph Supabase (DB & Auth)
        D
        D --- K[PostgreSQL DB]
        D --- L[Auth (ユーザー管理)]
        D --- M[Storage (ファイル保存)]
    end

    subgraph AI Providers
        E[OpenAI / Anthropic / Google]
    end

    H -- 会話履歴保存/取得 --> K
    H -- BYOK/マネージドAIリクエスト --> E

    I -- ファイル一時保存 --> M
    I -- レポート履歴保存/取得 --> K
    I -- データ分析/レポート生成リクエスト --> E

    J -- 生成書類保存/取得 --> K
    J -- テンプレート入力/生成リクエスト --> E

    L -- 認証情報 --> C
    K -- データ読み書き --> C
    M -- ファイルアップロード/ダウンロード --> C
```

## 2. API設計（エンドポイント一覧）

Cloudflare Workers (Hono) を用いて以下のRESTful APIエンドポイントを提供する。Founding Engineerの実装計画と整合性を保つ。

| エンドポイント | Method | 機能 | リクエストボディ例 | レスポンスボディ例 | 備考 |
|---|---|---|---|---|---|
| `/api/auth/signup` | POST | ユーザー登録 | `{ "email": "user@example.com", "password": "password" }` | `{ "message": "User registered successfully" }` | Supabase Auth利用 |
| `/api/auth/signin` | POST | ユーザーログイン | `{ "email": "user@example.com", "password": "password" }` | `{ "access_token": "...", "refresh_token": "..." }` | Supabase Auth利用 |
| `/api/auth/signout` | POST | ユーザーログアウト | `なし` | `{ "message": "User signed out successfully" }` | Supabase Auth利用 |
| `/api/chat` | POST | チャット送信・AI応答取得 | `{ "message": "今日の売上を教えて" }` | `{ "response": "データ分析結果に基づきお答えします。" }` | 会話履歴をDBに保存 |
| `/api/chat/history` | GET | 会話履歴取得 | `なし` | `[ { "role": "user", "content": "...", "timestamp": "..." } ]` | ユーザーIDでフィルタリング |
| `/api/report/upload` | POST | CSV/Excelファイルアップロード | `FormData (file)` | `{ "file_id": "...", "filename": "..." }` | Supabase Storageに一時保存 |
| `/api/report/generate` | POST | AIレポート生成 | `{ "file_id": "...", "prompt": "売上を四半期ごとにまとめて" }` | `{ "report_id": "...", "url": "..." }` | レポートはMarkdown/PDFで生成 |
| `/api/document/template` | GET | テンプレート一覧取得 | `なし` | `[ { "id": "...", "name": "見積書", "fields": [...] } ]` | |
| `/api/document/generate` | POST | テンプレートから書類生成 | `{ "template_id": "...", "data": { "client": "...", "amount": "..." } }` | `{ "document_id": "...", "url": "..." }` | 見積書、請求書など |
| `/api/user/settings` | GET | ユーザー設定取得 | `なし` | `{ "ai_provider": "openai", "api_key_set": true }` | |
| `/api/user/settings` | PUT | ユーザー設定更新 | `{ "ai_provider": "anthropic", "api_key": "sk-..." }` | `{ "message": "Settings updated" }` | APIキーは暗号化して保存 |

## 3. BYOK実装方針

ユーザーが自身のAI APIキー（BYOK: Bring Your Own Key）を利用できる仕組みを導入する。

-   **APIキーの保存**: ユーザーから提供されたAPIキーは、Supabaseの`user_settings`テーブルに暗号化して保存する。SupabaseのRow Level Security (RLS) により、各ユーザーは自身のキーにのみアクセス可能とする。
-   **APIキーの利用**: Cloudflare WorkersのAPIエンドポイントで、ユーザーのリクエストに応じてDBから暗号化されたAPIキーを取得し、復号してAIプロバイダーへのリクエストに利用する。
-   **セキュリティ**:
    -   APIキーはサーバーサイドで一時的に利用し、ログには記録しない。
    -   リクエスト完了後、メモリから速やかに破棄する。
    -   キーの暗号化には、Supabaseの提供する暗号化機能（AES-256）またはCloudflare Workersのシークレット管理機能を活用する。

## 4. セキュリティ要件

`docs/tech-direction.md`で定義されたセキュリティ方針に加え、Founding Engineerの実装進捗を考慮し、以下を具体化する。

-   **データ保護**:
    -   通信: TLS 1.3（Cloudflare標準）
    -   保存データ: SupabaseのPostgreSQLに保存されるデータはAES-256で暗号化される。Supabase Storageに保存されるファイルも同様。
    -   APIキー: Cloudflare Workersのシークレット管理とSupabaseの暗号化カラムを併用し、厳重に保護する。
-   **認証・認可**:
    -   Supabase Authによるメール認証およびソーシャルログインをサポート。
    -   SupabaseのRow Level Security (RLS) を全てのデータテーブル（`chat_messages`, `reports`, `documents`, `user_settings`）で有効化し、ユーザーは自身のデータのみアクセス可能とする。
    -   APIエンドポイントへのアクセスは認証ミドルウェアで保護し、有効なセッショントークンを持つユーザーのみを許可する。
-   **BYOKセキュリティ**:
    -   ユーザーのAPIキーは、サーバーサイドでAIプロバイダーへのリクエスト時のみ利用され、永続的なログには記録しない。
    -   キーの復号・利用は、隔離された環境（Cloudflare Workers）で行う。

## 5. データベース設計

Founding Engineerが作成したSupabaseのテーブル構成を基に、詳細な設計を定義する。

-   **Supabaseプロジェクト情報**:
    -   Project ID: `tsumikiri-dev` (開発環境用)
    -   Region: `ap-northeast-1` (東京リージョン)
    -   Database Port: `5432` (PostgreSQL標準)
-   **主要テーブル**:
    -   `chat_messages`: ユーザーとAIの会話履歴を保存。
        -   `id`: UUID (PK)
        -   `user_id`: UUID (FK to `auth.users`)
        -   `role`: VARCHAR (user, assistant, system)
        -   `content`: TEXT
        -   `created_at`: TIMESTAMPTZ
        -   RLS有効化
    -   `reports`: AIによるレポート生成履歴を保存。
        -   `id`: UUID (PK)
        -   `user_id`: UUID (FK to `auth.users`)
        -   `title`: VARCHAR
        -   `file_name`: VARCHAR (アップロード元ファイル名)
        -   `file_url`: TEXT (Supabase StorageのURL)
        -   `prompt`: TEXT (ユーザーの指示)
        -   `result`: TEXT (生成されたレポート内容)
        -   `created_at`: TIMESTAMPTZ
        -   RLS有効化
    -   `documents`: AIが生成した書類（見積書、請求書など）を保存。
        -   `id`: UUID (PK)
        -   `user_id`: UUID (FK to `auth.users`)
        -   `template_id`: UUID (使用したテンプレートID)
        -   `title`: VARCHAR
        -   `content`: TEXT (生成された書類内容)
        -   `created_at`: TIMESTAMPTZ
        -   RLS有効化
    -   `user_settings`: ユーザーごとの設定、特にAI APIキーを保存。
        -   `user_id`: UUID (PK, FK to `auth.users`)
        -   `ai_provider`: VARCHAR (openai, anthropic, googleなど)
        -   `api_key_encrypted`: TEXT (暗号化されたAPIキー)
        -   `created_at`: TIMESTAMPTZ
        -   `updated_at`: TIMESTAMPTZ
        -   RLS有効化

## 6. 開発規約

`docs/tech-direction.md`で定義された開発規約に加え、Founding Engineerの環境構築進捗を考慮し、以下を具体化する。

-   **GitHubリポジトリ構成**:
    -   リポジトリ名: `tsumikiri`
    -   公開設定: Private
    -   ブランチ保護: `main`ブランチへの直接pushは禁止。PR必須。
    -   初期ブランチ構成:
        -   `main`: 本番環境（自動デプロイ）
        -   `develop`: 開発統合ブランチ
        -   `feature/*`: 機能開発ブランチ
-   **環境構築ファイル**:
    -   `supabase/schema.sql`: データベーススキーマ定義。Founding Engineerが作成済み。
    -   `.env.example`: 環境変数テンプレート。シークレット情報は`.env`で管理し、`.gitignore`に含める。
    -   `wrangler.toml`: Cloudflare Workersの設定ファイル。
    -   `package.json`: プロジェクトの依存関係とスクリプトを定義。
    -   `tsconfig.json`: TypeScriptコンパイラ設定。strict mode必須。
    -   `tailwind.config.js`: Tailwind CSSの設定ファイル。
    -   `vite.config.ts`: Viteビルドツール設定。
-   **CI/CD**:
    -   GitHub Actions: PR時にLint, Type Check, テストを実行。
    -   Cloudflare Wrangler: `main`ブランチへのマージ時にCloudflare Pages/Workersへ自動デプロイ。

## 7. パフォーマンス要件

`docs/tech-direction.md`で定義された目標値を維持する。

| 指標 | 目標値 |
|------|--------|
| 初期ロード | 2秒以内（LCP） |
| チャット応答 | 3秒以内（AI応答含む） |
| レポート生成 | 10秒以内（CSV 1000行まで） |
| 書類生成 | 5秒以内 |

## 8. 将来の技術拡張（Q2以降の検討事項）

`docs/tech-direction.md`で定義された検討事項を継続する。

## 9. 技術的リスクと対策

`docs/tech-direction.md`で定義されたリスクと対策を継続する。
