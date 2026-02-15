# ツミキリ MVP 技術アーキテクチャ設計書

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-15
> ステータス: 設計完了
> レビュー: CEO 高橋レン

## 1. 概要

本ドキュメントは、TOPPA Inc.の最初のプロダクト「ツミキリ」のMVP（Minimum Viable Product）における技術アーキテクチャ設計を定義する。CEOのQ1計画におけるタスク2「技術アーキテクチャ設計」に対応し、Founding Engineerの`docs/implementation-plan.md`と`docs/implementation-progress.md`に記載された実装計画および進捗を統合・詳細化する。

## 2. システム構成図

ツミキリのシステムは、Cloudflareのエッジコンピューティングを最大限に活用し、高速かつスケーラブルな構成とする。

```mermaid
graph LR
    subgraph Frontend (Cloudflare Pages)
        A[ブラウザ / モバイルアプリ (React + TypeScript)]
    end

    subgraph Backend (Cloudflare Workers)
        B[API Gateway (Hono)]
        B -- Supabase Auth JWT認証 --> C[認証ミドルウェア]
        C -- APIキー管理 --> D[ユーザー設定DB (Supabase)]
        C -- 会話履歴 --> E[チャット履歴DB (Supabase)]
        C -- レポート履歴 --> F[レポート履歴DB (Supabase)]
        C -- 書類履歴 --> G[書類履歴DB (Supabase)]
    end

    subgraph AI Service
        H[AI Provider API (OpenAI/Anthropic/Google)]
    end

    subgraph Database (Supabase)
        I[PostgreSQL (Auth / DB / Storage)]
    end

    A -- HTTPS --> B
    B -- AIリクエスト (BYOK/マネージド) --> H
    B -- データ永続化 --> I
    H -- 応答 --> B
    I -- データ --> B
```

## 3. 技術スタック

TOPPA Inc.全体の技術方針（`docs/tech-direction.md`）に基づき、ツミキリMVPでは以下の技術スタックを採用する。

### フロントエンド
- **React 19** + **TypeScript** + **Vite**: 高速な開発と型安全性を確保。
- **Tailwind CSS**: ユーティリティファーストでのUI開発。
- **Zustand**: 軽量な状態管理。
- **React Router**: SPAのルーティング。

### バックエンド
- **Cloudflare Workers**: エッジコンピューティングによる低レイテンシ。
- **Hono**: 軽量Webフレームワーク。
- **Supabase**: 認証、データベース、ストレージ機能を提供。

### AI
- **BYOK方式**: ユーザーのAPIキーを使用。OpenAI (GPT-4o), Anthropic (Claude Sonnet 4.5), Google (Gemini 2.5 Pro)をサポート。
- **マネージド方式**: TOPPA Inc.のAPIキーを使用（Proプラン向け）。

### ホスティング
- **Cloudflare Pages**: フロントエンド。
- **Cloudflare Workers**: APIサーバー。

### CI/CD
- **GitHub Actions**: Lint, Type Check, テスト。
- **Cloudflare Wrangler**: 自動デプロイ。

## 4. API設計

Founding Engineerの提案を基に、以下のAPIエンドポイントを定義し、認証・認可、エラーハンドリングを強化する。

### 認証・認可

- 全てのAPIエンドポイントはSupabase AuthによるJWT認証を必須とする。
- 認証ミドルウェアで`Authorization: Bearer <JWT>`ヘッダーを検証し、`auth.uid()`でユーザーIDを取得する。
- ユーザーIDに基づき、RLS（Row Level Security）によってデータへのアクセスを制限する。

### エンドポイント一覧

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ | 備考 |
|---------------|--------|------|------------------|------------------|------|
| `/api/auth/signup` | POST | ユーザー登録 | `{ email, password }` | `{ user: { id, email } }` | Supabase Authラッパー |
| `/api/auth/signin` | POST | ログイン | `{ email, password }` | `{ user: { id, email }, session: { access_token } }` | Supabase Authラッパー |
| `/api/auth/signout` | POST | ログアウト | N/A | `{ message: "Logged out" }` | Supabase Authラッパー |
| `/api/chat` | POST | チャット送信・AI応答取得 | `{ message: string, history?: ChatMessage[] }` | `{ reply: string, messageId: string }` | 会話履歴はDBに保存 |
| `/api/chat/history` | GET | 会話履歴取得 | N/A | `{ history: ChatMessage[] }` | 認証済みユーザーの履歴のみ |
| `/api/report/generate` | POST | レポート生成 | `{ file: File, prompt: string }` | `{ reportId: string, status: 'processing' | 'completed' }` | ファイルはSupabase Storageに一時保存 |
| `/api/report/:reportId` | GET | 特定レポート取得 | N/A | `{ report: Report }` | ユーザー自身のレポートのみ |
| `/api/document/generate` | POST | 書類生成 | `{ templateId: string, data: Record<string, any> }` | `{ documentId: string, status: 'processing' | 'completed' }` | |
| `/api/document/:documentId` | GET | 特定書類取得 | N/A | `{ document: Document }` | ユーザー自身の書類のみ |
| `/api/user/settings` | GET | ユーザー設定取得 | N/A | `{ settings: UserSettings }` | BYOKキー情報など |
| `/api/user/settings` | PUT | ユーザー設定更新 | `{ openaiApiKey?: string, anthropicApiKey?: string, googleApiKey?: string }` | `{ message: "Settings updated" }` | BYOKキーの更新 |

### エラーハンドリング

- 全てのAPIは標準的なHTTPステータスコード（200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error）を返す。
- エラーレスポンスはJSON形式で `{ error: { code: string, message: string } }` の構造とする。
- サーバーサイドでの予期せぬエラーは詳細なログをCloudflare LogpushでS3に集約し、監視体制を構築する。

## 5. データベース設計

Founding Engineerの提案を基に、以下のテーブルスキーマとRLS（Row Level Security）を適用し、データ堅牢性とセキュリティを確保する。

### Supabase PostgreSQL

| テーブル名 | 用途 | RLS | 主なカラム | 備考 |
|------------|------|-----|------------|------|
| `chat_messages` | チャット履歴 | 有効 | `id (UUID)`, `user_id (UUID)`, `role (VARCHAR)`, `content (TEXT)`, `created_at (TIMESTAMPTZ)` | ユーザーの会話履歴を保存。`user_id`でRLSを適用し、他ユーザーからのアクセスを禁止。 |
| `reports` | レポート履歴 | 有効 | `id (UUID)`, `user_id (UUID)`, `title (VARCHAR)`, `file_name (VARCHAR)`, `file_url (TEXT)`, `prompt (TEXT)`, `result (TEXT)`, `created_at (TIMESTAMPTZ)` | 生成されたレポートのメタデータと結果を保存。`user_id`でRLSを適用。 |
| `documents` | 生成済み書類 | 有効 | `id (UUID)`, `user_id (UUID)`, `title (VARCHAR)`, `template_id (UUID)`, `data (JSONB)`, `file_url (TEXT)`, `created_at (TIMESTAMPTZ)` | AIが生成した書類のメタデータと保存場所。`user_id`でRLSを適用。 |
| `user_settings` | ユーザー設定 | 有効 | `user_id (UUID)`, `openai_api_key (TEXT)`, `anthropic_api_key (TEXT)`, `google_api_key (TEXT)`, `updated_at (TIMESTAMPTZ)` | ユーザーごとのBYOK用APIキーなどを保存。APIキーは暗号化して保存し、RLSを適用。 |

### Row Level Security (RLS)

- 全てのユーザーデータ関連テーブルにはRLSを有効化する。
- ポリシーは`auth.uid() = user_id`を基本とし、ユーザーは自身のデータのみ閲覧・更新・削除可能とする。
- 例: `chat_messages`テーブルの場合
    ```sql
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own messages" ON chat_messages FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own messages" ON chat_messages FOR DELETE USING (auth.uid() = user_id);
    ```

### インデックスと外部キー

- `user_id`カラムには必ずインデックスを付与し、クエリパフォーマンスを向上させる。
- 関連テーブル間には外部キー制約を設定し、データの整合性を保つ。

## 6. BYOK (Bring Your Own Key) 実装方針

BYOK方式は、ユーザーが自身のAIプロバイダーAPIキーを利用することで、TOPPA Inc.のAPI利用料を抑え、柔軟な利用を可能にする。セキュリティを最優先し、以下の原則で実装する。

### 6-1. APIキーの保存

- ユーザーから提供されたAPIキーは、`user_settings`テーブルに保存する。
- **保存時の暗号化**: データベースに保存する際は、AES-256などの強力な暗号化方式を用いて暗号化する。キーはCloudflare Workersのシークレットとして安全に管理する。
- **RLSによるアクセス制御**: `user_settings`テーブルにはRLSを適用し、ユーザー自身しか自身のAPIキーを参照・更新できないようにする。

### 6-2. APIキーの利用フロー

1.  ユーザーがフロントエンドからBYOK用APIキーを登録・更新する。
2.  APIキーは暗号化されてSupabaseの`user_settings`テーブルに保存される。
3.  ユーザーがAI機能を利用する際、Cloudflare WorkersのAPIエンドポイントを呼び出す。
4.  Workers側でユーザーのJWTを検証し、`user_id`を取得する。
5.  `user_id`に基づき、`user_settings`テーブルから暗号化されたAPIキーを読み出す。
6.  読み出したAPIキーを複合化し、AIプロバイダーAPIへのリクエストヘッダーに含める。
7.  AIプロバイダーAPIからの応答を受け取る。
8.  **メモリからの破棄**: APIキーはリクエスト処理完了後、Workersのメモリから直ちに破棄される。ログには一切記録しない。

### 6-3. セキュリティ対策

- **通信の暗号化**: 全ての通信はTLS 1.3で暗号化される（Cloudflare標準）。
- **最小権限の原則**: Workersは必要なデータベース操作とAIプロバイダーへのアクセスのみを許可する。
- **ログの除外**: APIキーや機密データは、Workersのログ、Supabaseのログ、AIプロバイダーのログなど、いかなるログにも記録しない。

## 7. セキュリティ要件

TOPPA Inc.全体のセキュリティ方針に加え、ツミキリ固有の要件を定義する。

### 7-1. データ保護

- **通信の暗号化**: 全てのクライアント-サーバー間通信はTLS 1.3で暗号化する。
- **保存データの暗号化**: Supabaseに保存されるユーザーデータ（特にAPIキー、個人情報、機密性の高いレポート内容など）は、データベースレベルまたはアプリケーションレベルで暗号化を施す。Supabaseのディスク暗号化（AES-256）を活用する。
- **バックアップとリカバリ**: Supabaseの自動バックアップ機能を活用し、定期的なデータバックアップと障害発生時のリカバリ手順を確立する。

### 7-2. 認証・認可

- **多要素認証（MFA）**: 将来的にSupabaseのMFA機能を導入し、アカウントセキュリティを強化する。
- **パスワードポリシー**: 強固なパスワードポリシー（最小文字数、複雑性要件）をSupabase Authで設定する。
- **セッション管理**: JWTの有効期限を適切に設定し、定期的なトークン更新メカニズムを実装する。

### 7-3. APIキー管理

- **Cloudflare Workers Secrets**: TOPPA Inc.自身のAIプロバイダーAPIキーはCloudflare Workersのシークレットとして安全に管理し、ソースコードには含めない。
- **ユーザーBYOKキーの管理**: 「6. BYOK実装方針」に記載の通り、暗号化保存と利用時のみ複合化、メモリからの即時破棄を徹底する。

### 7-4. 脆弱性対策

- **入力値検証**: 全てのAPIエンドポイントで、入力値に対する厳格な検証を行い、SQLインジェクション、XSS、CSRFなどの脆弱性を防止する。
- **依存ライブラリの管理**: 定期的に依存ライブラリの脆弱性スキャンを実施し、既知の脆弱性を持つライブラリは速やかにアップデートまたは代替を検討する。
- **セキュリティヘッダー**: Cloudflare Pages/Workersで適切なセキュリティヘッダー（CSP, HSTSなど）を設定する。

## 8. CI/CD (継続的インテグレーション / 継続的デリバリー)

`docs/tech-direction.md`に準拠し、以下のCI/CDパイプラインを構築する。

- **GitHub Actions**:
    - `develop`ブランチへのPR作成時に、Lint (ESLint + Prettier)、Type Check (TypeScript)、ユニットテスト (Vitest) を自動実行する。
    - 全てのチェックをパスし、CTOのレビュー後にマージを許可する。
- **Cloudflare Wrangler**:
    - `main`ブランチへのマージをトリガーとして、Cloudflare Pages（フロントエンド）とCloudflare Workers（バックエンド）への自動デプロイを実行する。
    - デプロイの成功・失敗はSlack通知で関係者に共有する。

## 9. テスト戦略

`docs/tech-direction.md`に準拠し、以下のテスト戦略を適用する。

- **ユニットテスト**: Vitestを用いて、各機能単位でのテスト（カバレッジ80%目標）を実施する。特にビジネスロジック、データ変換、APIクライアント部分を重点的にテストする。
- **E2Eテスト**: Playwrightを用いて、主要なユーザーフロー（例: ユーザー登録→ログイン→チャット利用→レポート生成）のE2Eテストを実装する。最低3つの主要フローをカバーする。
- **AI応答テスト**: モックAPIを用いてAIプロバイダーからの応答をシミュレートし、AI連携部分の動作検証を行う。AIの応答内容自体の品質評価は、別途UXレビューや手動テストで実施する。
- **セキュリティテスト**: 脆弱性スキャンツール（例: Dependabot, Snyk）をCI/CDに組み込み、依存ライブラリの既知の脆弱性を自動検出する。
