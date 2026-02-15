# TOPPA Inc. — ツミキリ 技術アーキテクチャ設計

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-15
> ステータス: 設計中

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

Cloudflare Workers (Hono) を用いて以下のRESTful APIエンドポイントを提供する。

| エンドポイント | Method | 機能 | リクエストボディ例 | レスポンスボディ例 | 備考 |
|---|---|---|---|---|---|
| `/auth/signup` | POST | ユーザー登録 | `{ "email": "user@example.com", "password": "password" }` | `{ "user": { "id": "uuid", "email": "user@example.com" } }` | Supabase Auth利用 |
| `/auth/login` | POST | ログイン | `{ "email": "user@example.com", "password": "password" }` | `{ "access_token": "jwt", "refresh_token": "jwt" }` | Supabase Auth利用 |
| `/chat` | POST | チャット送信・AI応答取得 | `{ "message": "先月の売上を教えてください" }` | `{ "response": "先月の売上はXX円です。", "history_id": "uuid" }` | 会話履歴保存 |
| `/chat/history` | GET | 会話履歴取得 | (なし) | `[ { "id": "uuid", "role": "user", "content": "...", "created_at": "..." } ]` | ユーザーごとの履歴 |
| `/report/upload` | POST | ファイルアップロード | `FormData (file: File)` | `{ "file_url": "supabase_storage_url" }` | Supabase Storageへ保存 |
| `/report/generate` | POST | レポート生成要求 | `{ "file_url": "...", "prompt": "売上分析レポートを作成してください" }` | `{ "report_id": "uuid", "status": "pending" }` | 非同期処理 |
| `/report/:id` | GET | レポート結果取得 | (なし) | `{ "id": "uuid", "title": "...", "result": "...", "status": "completed" }` | ステータス更新 |
| `/documents/generate` | POST | 書類生成要求 | `{ "template_id": "estimate", "data": { "company_name": "...", "items": [...] } }` | `{ "document_id": "uuid", "status": "pending" }` | 非同期処理 |
| `/documents/:id` | GET | 書類結果取得 | (なし) | `{ "id": "uuid", "template_name": "...", "generated_content": "...", "status": "completed" }` | ステータス更新 |
| `/user/settings` | GET | ユーザー設定取得 | (なし) | `{ "api_keys": { "openai": "...", "anthropic": "..." } }` | BYOKキー管理 |
| `/user/settings` | PUT | ユーザー設定更新 | `{ "api_keys": { "openai": "sk-...", "anthropic": "sk-..." } }` | `{ "message": "Settings updated" }` | BYOKキー登録/更新 |

## 3. BYOK実装方針

ユーザーが自身のAIプロバイダーAPIキー（BYOK: Bring Your Own Key）を使用できる機能は、TOPPA Inc.の重要な差別化要因である。

### 3-1. キーの保存と管理

- **暗号化**: ユーザーから提供されたAPIキーは、SupabaseのSecrets管理機能、またはWorkers KVに暗号化して保存する。SupabaseのPostgreSQLに保存する場合は、PostgreSQLの暗号化機能（PGP暗号化など）を利用し、アプリケーションレベルでの二重暗号化も検討する。
- **ユーザー分離**: 各ユーザーのAPIキーは完全に分離し、他のユーザーからはアクセスできないようにする。Supabase RLSを厳密に適用する。
- **環境変数**: Cloudflare Workersの環境変数としてAPIキーを直接保存することはしない。ユーザーキーはDBまたはKVに保存し、リクエスト時に取得する。

### 3-2. 利用フロー

1.  **ユーザー登録/ログイン**: Supabase Authを通じてユーザー認証を行う。
2.  **APIキー登録**: ユーザーは設定画面で自身のAIプロバイダーAPIキーを登録する。この際、キーは暗号化されて保存される。
3.  **AIリクエスト**: ユーザーがAI機能を利用する際、Cloudflare WorkersはユーザーIDに基づき暗号化されたAPIキーをDB/KVから取得し、復号化してAIプロバイダーへのリクエストヘッダーに含めて送信する。
4.  **一時利用**: APIキーはリクエスト処理中のみメモリ上に保持され、リクエスト完了後には速やかに破棄される。ログにはAPIキーを一切記録しない。

### 3-3. セキュリティ対策

-   **レート制限**: 各ユーザーからのAIリクエストに対してレート制限を設ける（例: 1分あたり10リクエスト）。これにより、APIキーの悪用や過剰な利用を防ぐ。
-   **不正利用検知**: 短時間に異常な数のリクエストや、通常とは異なるパターンでの利用があった場合、自動的にアラートを発し、キーの一時停止などの対応を検討する。
-   **キーの検証**: 登録時にAPIキーが有効なものであるか、AIプロバイダーへの簡単な疎通確認を行う。

## 4. セキュリティ要件

`docs/tech-direction.md` のセキュリティ方針をツミキリプロダクトに特化して具体化する。

### 4-1. データ保護

-   **通信の暗号化**: フロントエンドとCloudflare Workers間、Cloudflare WorkersとSupabase/AI Provider間は全てTLS 1.3による暗号化通信を強制する。これはCloudflareの標準機能により提供される。
-   **保存データの暗号化**:
    -   Supabase PostgreSQLに保存される顧客データ（チャット履歴、レポート内容、生成書類、ユーザー設定など）は、Supabaseの標準機能であるAES-256暗号化が適用される。
    -   ユーザーのBYOK APIキーは、前述の通りアプリケーションレベルでの追加暗号化を検討する。
-   **ファイルストレージ**: Supabase Storageにアップロードされるファイル（CSV/Excelなど）も暗号化して保存され、RLSにより適切なアクセス制御を行う。

### 4-2. 認証・認可

-   **ユーザー認証**: Supabase Authを全面的に採用し、メールアドレス/パスワード認証および将来的にはソーシャルログイン（Google/GitHubなど）に対応する。
-   **セッション管理**: JWT (JSON Web Token) を利用したステートレスなセッション管理を行う。JWTはHTTPS経由で安全に伝送され、有効期限を設定する。
-   **認可 (RLS)**: SupabaseのRow Level Security (RLS) を厳格に適用する。全てのテーブルにおいて、ユーザーは自身のデータのみにアクセスできるようポリシーを定義する。
    -   `chat_messages`: `auth.uid() = user_id`
    -   `reports`: `auth.uid() = user_id`
    -   `documents`: `auth.uid() = user_id`
    -   `user_settings`: `auth.uid() = user_id`
-   **APIキーの認可**: ユーザーが登録したBYOKキーは、そのユーザーのリクエスト処理のみに利用され、他のユーザーのリクエストには使用されないことを保証する。

### 4-3. Cloudflare Workersのセキュリティ

-   **シークレット管理**: APIキーやデータベース接続情報などの機密情報は、Cloudflare WorkersのSecrets機能、またはWorkers KVに安全に保存し、コードに直接ハードコーディングしない。
-   **入力検証**: 全てのAPIエンドポイントにおいて、ユーザーからの入力データに対して厳格なバリデーションを行う。SQLインジェクション、XSS、CSRFなどの脆弱性から保護する。
-   **依存ライブラリ**: 使用する全てのサードパーティライブラリは、定期的に脆弱性スキャンを行い、最新のセキュリティパッチが適用されたバージョンを使用する。

### 4-4. AI利用のセキュリティ

-   **プロンプトインジェクション対策**: AIへのプロンプトは、ユーザー入力を直接渡すのではなく、システムプロンプトと組み合わせて安全な形式で渡す。悪意のあるプロンプトによる情報漏洩や誤動作を防ぐ。
-   **AI応答の検証**: AIからの応答はそのままユーザーに表示するのではなく、内容を検証し、不適切な情報や個人情報が含まれていないかチェックする機構を設ける。
-   **データ保持ポリシー**: AIプロバイダーに送信されるデータについて、各プロバイダーのデータ保持ポリシーを確認し、機密性の高いデータが不必要に保存されないように配慮する。特にBYOK利用時は、ユーザー自身がプロバイダーのポリシーを理解していることを前提とする。
