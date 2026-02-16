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

## 2. 技術スタック

### フロントエンド
- **React 19** + **TypeScript** + **Vite**
    - Cloudflare Pagesプロジェクト作成と初期セットアップ完了
    - チャットUIの基本コンポーネント骨子実装完了
    - チャットメッセージ表示ロジック実装完了
- **Tailwind CSS** — ユーティリティファーストでスピード重視
- **Zustand** — 軽量状態管理（Redux不要）
- **React Router** — SPA構成

### バックエンド
- **Cloudflare Workers** — エッジコンピューティング、グローバル低レイテンシ
    - `xlsx`ライブラリの利用方針: `wrangler`によるバンドルと`node_compat = true`を設定し、Cloudflare Workersでの利用を試みる。問題が発生した場合は、CDN版/WASM版の利用を検討する。
- **Hono** — 軽量Webフレームワーク（Cloudflare Workers対応）

### データベース
- **Supabase (PostgreSQL)** — 認証 + DB + ストレージを一括提供
    - Supabaseプロジェクト初期化完了
    - 認証機能（Supabase Auth）実装完了
    - Row Level Security（RLS）によるデータ分離を適用済み（例: `chat_messages`テーブル）

### AI（プロダクト向け）
- **BYOK方式**: ユーザーのAPIキーでAI機能を利用
  - OpenAI (GPT-4o / GPT-4.5)
  - Anthropic (Claude Sonnet 4.5)
  - Google (Gemini 2.5 Pro)
- **マネージド方式**: TOPPA Inc.のAPIキーを使用（Pro プラン）

### AI（社内エージェント基盤）
- **MiniMax M2.5 Standard** — AI社員の全ロールが使用するモデル
- **GCP Cloud Functions + Cloud Scheduler** — 1-2時間おきにセッション自動実行
- **GitHub API** — AI社員がリポジトリにコミット・push

### ホスティング
- **Cloudflare Pages** — フロントエンドホスティング
- **Cloudflare Workers** — APIサーバー

### CI/CD
- **GitHub Actions** — PR時にLint + Type Check + テスト
- **Cloudflare Wrangler** — `main` ブランチマージ時に自動デプロイ

## 3. API設計

Founding Engineerの実装計画と進捗に基づき、以下のAPIエンドポイントを設計する。

### 3-1. 共通エラーレスポンス

全てのエラーレスポンスは以下の形式に従う。

```json
{
    "errorCode": "string",  // エラーを一意に識別するコード (例: INVALID_REQUEST, UNAUTHORIZED, INTERNAL_SERVER_ERROR)
    "message": "string"     // ユーザー向けの具体的なエラーメッセージ
}
```

### 3-2. チャットアシスタントAPI

#### `POST /api/chat`

チャットメッセージを送信し、AIの応答を取得する。

*   **機能**: ユーザーからのメッセージを受け取り、AIプロバイダーに転送して応答を生成し、会話履歴を保存する。
*   **認証**: Supabase Authによるユーザー認証（JWT）
*   **リクエストボディ**:
    ```json
    {
        "sessionId": "string (UUID)", // 会話セッションID。新規セッションの場合は自動生成、既存セッションの場合はそのIDを使用
        "message": "string",          // ユーザーの入力メッセージ
        "model": "string",            // 使用するAIモデル ("OpenAI", "Anthropic", "Google" のいずれか)
        "apiKey": "string"            // BYOKの場合のみ、ユーザーのAPIキー
    }
    ```
*   **レスポンスボディ (成功 `200 OK`)**:
    ```json
    {
        "sessionId": "string (UUID)", // 会話セッションID
        "response": "string",         // AIからの応答メッセージ
        "timestamp": "string (ISO 8601)" // 応答生成時刻
    }
    ```
*   **エラーケース**:
    *   `400 Bad Request`: `INVALID_REQUEST_FORMAT`, `INVALID_SESSION_ID`, `INVALID_MESSAGE`, `INVALID_MODEL`, `INVALID_API_KEY`
    *   `401 Unauthorized`: `AUTHENTICATION_REQUIRED`, `INVALID_AUTH_TOKEN`
    *   `403 Forbidden`: `API_KEY_EXPIRED`, `API_KEY_RATE_LIMITED`, `INSUFFICIENT_PERMISSION`
    *   `500 Internal Server Error`: `AI_PROVIDER_ERROR`, `DATABASE_ERROR`, `UNKNOWN_ERROR`

#### `GET /api/chat/history`

ユーザーの会話履歴を取得する。

*   **機能**: 認証されたユーザーの全ての会話セッションのリストを返す。
*   **認証**: Supabase Authによるユーザー認証（JWT）
*   **クエリパラメータ**:
    *   `limit`: `number` (オプション, デフォルト: 10, 最大: 100) - 取得するセッションの最大数
    *   `offset`: `number` (オプション, デフォルト: 0) - 取得を開始するオフセット
*   **レスポンスボディ (成功 `200 OK`)**:
    ```json
    [
        {
            "sessionId": "string (UUID)",
            "title": "string (セッションの最初のメッセージまたはAIが生成した要約)",
            "lastMessageAt": "string (ISO 8601)"
        },
        // ...
    ]
    ```
*   **エラーケース**:
    *   `401 Unauthorized`: `AUTHENTICATION_REQUIRED`, `INVALID_AUTH_TOKEN`
    *   `500 Internal Server Error`: `DATABASE_ERROR`, `UNKNOWN_ERROR`

#### `GET /api/chat/history/:sessionId`

特定の会話セッションのメッセージ履歴を取得する。

*   **機能**: 指定されたセッションIDの会話メッセージのリストを返す。
*   **認証**: Supabase Authによるユーザー認証（JWT）
*   **パスパラメータ**:
    *   `sessionId`: `string (UUID)` - 取得する会話セッションのID
*   **レスポンスボディ (成功 `200 OK`)**:
    ```json
    [
        {
            "id": "string (UUID)",
            "role": "string ('user' or 'assistant')",
            "content": "string",
            "timestamp": "string (ISO 8601)"
        },
        // ...
    ]
    ```
*   **エラーケース**:
    *   `401 Unauthorized`: `AUTHENTICATION_REQUIRED`, `INVALID_AUTH_TOKEN`
    *   `403 Forbidden`: `ACCESS_DENIED` (他のユーザーのセッションにアクセスしようとした場合)
    *   `404 Not Found`: `SESSION_NOT_FOUND`
    *   `500 Internal Server Error`: `DATABASE_ERROR`, `UNKNOWN_ERROR`

### 3-3. AIレポート生成API

#### `POST /api/report/generate`

CSV/Excelファイルをアップロードし、自然言語の指示に基づいてAIにレポートを生成させる。

*   **機能**: ユーザーがアップロードしたファイルを解析し、プロンプトと共にAIプロバイダーに送信してレポートを生成する。生成されたレポートは保存され、ユーザーに返却される。
*   **認証**: Supabase Authによるユーザー認証（JWT）
*   **リクエストボディ**: `multipart/form-data`
    *   `file`: `File` (CSVまたはExcelファイル)
    *   `prompt`: `string` (レポート生成のための自然言語指示)
    *   `model`: `string` (使用するAIモデル。例: "OpenAI")
    *   `apiKey`: `string` (BYOKの場合のみ)
*   **ファイルアップロードの考慮事項**:
    *   Cloudflare Workers経由でSupabase Storageに一時的にファイルを保存する。
    *   ファイルサイズ制限: 10MB (Cloudflare Workersの制限に準拠)
    *   対応ファイル形式: `.csv`, `.xlsx`, `.xls`
    *   `xlsx`ライブラリは`wrangler`の`node_compat = true`設定で対応を試みる。
*   **AI連携のプロンプト設計に関する考慮事項**:
    *   アップロードされたデータのスキーマ情報（ヘッダーなど）をAIに渡すことで、正確な分析を促す。
    *   ユーザーのプロンプトとデータスキーマを組み合わせたシステムプロンプトを動的に生成する。
    *   データ分析とレポート生成のステップを明確にAIに指示する。
*   **レスポンスボディ (成功 `200 OK`)**:
    ```json
    {
        "reportId": "string (UUID)",
        "title": "string (AIが生成したレポートタイトル)",
        "content": "string (Markdown形式のレポート本文)",
        "downloadUrl": "string (生成されたレポートのダウンロードURL、オプション)",
        "timestamp": "string (ISO 8601)"
    }
    ```
*   **エラーケース**:
    *   `400 Bad Request`: `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`, `INVALID_PROMPT`, `FILE_UPLOAD_FAILED`
    *   `401 Unauthorized`: `AUTHENTICATION_REQUIRED`
    *   `403 Forbidden`: `API_KEY_EXPIRED`
    *   `500 Internal Server Error`: `AI_PROCESSING_ERROR`, `DATABASE_ERROR`, `STORAGE_ERROR`

### 3-4. テンプレート書類生成API

#### `POST /api/template/generate`

テンプレートと入力データに基づいて書類を自動生成する。

*   **機能**: ユーザーが選択したテンプレートと入力データを受け取り、AIまたは内部ロジックで書類（見積書、請求書など）を生成する。
*   **認証**: Supabase Authによるユーザー認証（JWT）
*   **リクエストボディ**:
    ```json
    {
        "templateId": "string (UUID)", // 使用するテンプレートのID
        "data": {                      // テンプレートに埋め込むデータ (JSONオブジェクト)
            "companyName": "株式会社TOPPA",
            "itemName": "AI導入コンサルティング",
            "price": 100000,
            "quantity": 1
        },
        "outputFormat": "string",      // 出力形式 ("pdf", "markdown" など)
        "model": "string",             // AIを使用する場合のモデル
        "apiKey": "string"             // BYOKの場合のみ
    }
    ```
*   **テンプレート管理の考慮事項**:
    *   ユーザーはカスタムテンプレートをアップロード・管理できる。
    *   テンプレートはSupabase Storageに保存し、メタデータはSupabase PostgreSQLで管理する。
    *   テンプレートにはプレースホルダー構文（例: `{{companyName}}`）を使用する。
*   **レスポンスボディ (成功 `200 OK`)**:
    ```json
    {
        "documentId": "string (UUID)",
        "title": "string (生成された書類のタイトル)",
        "downloadUrl": "string (生成された書類のダウンロードURL)",
        "timestamp": "string (ISO 8601)"
    }
    ```
*   **エラーケース**:
    *   `400 Bad Request`: `INVALID_TEMPLATE_ID`, `INVALID_DATA_FORMAT`, `TEMPLATE_RENDER_ERROR`, `INVALID_OUTPUT_FORMAT`
    *   `401 Unauthorized`: `AUTHENTICATION_REQUIRED`
    *   `403 Forbidden`: `ACCESS_DENIED`
    *   `404 Not Found`: `TEMPLATE_NOT_FOUND`
    *   `500 Internal Server Error`: `AI_PROCESSING_ERROR`, `DATABASE_ERROR`

## 4. セキュリティ要件 (API設計への適用)

`docs/tech-direction.md` に記載されたセキュリティ方針を各APIエンドポイントに適用する。

### 4-1. 認証・認可

*   **Supabase Auth**: 全てのAPIエンドポイントはJWTによる認証を必須とする。
*   **RLS (Row Level Security)**: データベースレベルでユーザーが自分のデータのみにアクセスできるよう強制する。
    *   例: `chat_messages` テーブルでは `auth.uid() = user_id` ポリシーを適用。
*   **APIキーの認可**:
    *   BYOKの場合、提供されたAPIキーが有効であるか、利用制限に達していないかをAIプロバイダーに問い合わせて確認する。
    *   TOPPA Inc.のマネージドAPIキーを使用する場合は、Proプランの購読状況を確認する。

### 4-2. BYOK セキュリティ

*   ユーザーから提供されたAPIキーは、Cloudflare Workersの実行コンテキストでのみ一時的に使用し、永続的に保存しない。
*   APIキーはログに記録せず、リクエスト処理完了後、速やかにメモリから破棄されるように実装する。
*   APIキーの有効期限やレートリミット超過などのエラーは、ユーザーに分かりやすくフィードバックする。

## 5. 開発規約 (API開発に特化)

### 5-1. コード品質

*   Honoのミドルウェアを活用し、リクエストバリデーション、エラーハンドリング、認証処理を一元化する。
*   APIエンドポイントごとにJSDocコメントを記述し、機能、パラメータ、レスポンス、エラーを明確にする。

### 5-2. テスト

*   **ユニットテスト**: 各APIハンドラのビジネスロジックに対してVitestでテストを記述する（カバレッジ80%目標）。
*   **結合テスト**: Cloudflare WorkersのLocal開発環境（`wrangler dev`）を利用し、SupabaseやAIプロバイダーとの連携を含む結合テストを実施する。
*   **E2Eテスト**: Playwrightを用いて、フロントエンドからのAPI呼び出しを含む主要なユーザーフローをテストする。

## 6. 将来の技術拡張 (API関連)

*   **Webhook**: レポート生成完了時や特定イベント発生時に外部システムへ通知するWebhook APIの提供。
*   **バッチ処理API**: 大量のデータ処理や定型レポート生成のための非同期バッチ処理API。
*   **リアルタイムチャット**: WebSocketsを用いたリアルタイムなチャット応答（現在の設計はポーリングベースを想定）。

