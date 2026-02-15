# ツミキリ MVP 技術アーキテクチャ設計

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-15
> ステータス: 設計中

## 1. エグゼクティブサマリー

本ドキュメントは、TOPPA Inc.が開発する「ツミキリ」MVP（Minimum Viable Product）の技術アーキテクチャを定義する。PdMのプロダクト仕様、Founding Engineerの実装計画、およびTOPPA Inc.全体の技術方針に基づき、堅牢かつスケーラブルなシステム基盤を設計する。特に、BYOK（Bring Your Own Key）方式によるAI連携と、中小企業経営者向けのセキュリティ要件を重視する。

## 2. システム構成図

ツミキリMVPのシステムは、Cloudflare Pagesによるフロントエンドホスティング、Cloudflare WorkersによるAPI、Supabaseによるデータベースと認証、そして各種AIプロバイダーAPIで構成される。Founding Engineerの実装計画と整合性を保ち、詳細化する。

```mermaid
graph LR
    User[ユーザー] -- HTTPS --> CloudflarePages[Cloudflare Pages (React SPA)]
    CloudflarePages -- API Request (HTTPS) --> CloudflareWorkers[Cloudflare Workers (Hono API)]
    CloudflareWorkers -- DB Access (PostgreSQL) --> SupabaseDB[Supabase (PostgreSQL)]
    CloudflareWorkers -- Auth --> SupabaseAuth[Supabase Auth]
    CloudflareWorkers -- Storage Access --> SupabaseStorage[Supabase Storage]
    CloudflareWorkers -- AI Request (BYOK/Managed) --> AIProviderAPI[AI Provider API (OpenAI/Anthropic/Google)]

    subgraph Frontend
        CloudflarePages
    end

    subgraph Backend
        CloudflareWorkers
    end

    subgraph Data & Auth
        SupabaseDB
        SupabaseAuth
        SupabaseStorage
    end

    subgraph External Services
        AIProviderAPI
    end
```

### 2.1. コンポーネント詳細

-   **Cloudflare Pages (React SPA)**:
    -   フロントエンドの静的ホスティング。Vite + React + TypeScript + Tailwind CSS を使用。
    -   ユーザーインターフェースを提供し、Cloudflare Workers APIと連携。
-   **Cloudflare Workers (Hono API)**:
    -   バックエンドAPIサーバー。エッジコンピューティングにより低レイテンシを実現。
    -   ユーザーリクエストの処理、Supabaseとのデータ連携、AIプロバイダーAPIへのリクエストを行う。
    -   認証ミドルウェアを実装し、APIキーの検証やユーザー認証を行う。
-   **Supabase (PostgreSQL)**:
    -   データベース（PostgreSQL）、認証（Auth）、オブジェクトストレージ（Storage）を提供。
    -   ユーザーデータ、会話履歴、レポート履歴、生成済み書類、ユーザー設定などを保存。
    -   Row Level Security (RLS) を活用し、ユーザーごとのデータアクセスを厳格に制御。
-   **AI Provider API (OpenAI/Anthropic/Google)**:
    -   AI機能を提供する外部サービス。BYOK方式またはTOPPA Inc.が管理するAPIキーで利用。
    -   自然言語処理、データ分析、テキスト生成などに活用。

## 3. API設計

Founding Engineerの計画に基づき、主要なAPIエンドポイントを定義する。

### 3.1. 認証API

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ | 備考 |
|---------------|--------|------|------------------|------------------|------|
| `/api/auth/signup` | POST | ユーザー登録 | `email`, `password` | `user`オブジェクト | Supabase Authを利用 |
| `/api/auth/signin` | POST | ログイン | `email`, `password` | `session`オブジェクト | Supabase Authを利用 |
| `/api/auth/signout` | POST | ログアウト | なし | なし | Supabase Authを利用 |
| `/api/auth/user` | GET | ユーザー情報取得 | なし | `user`オブジェクト | 認証済みユーザー情報 |

### 3.2. チャットアシスタントAPI

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ | 備考 |
|---------------|--------|------|------------------|------------------|------|
| `/api/chat` | POST | チャット送信・AI応答取得 | `message`, `sessionId`(optional) | `aiResponse`, `sessionId` | 会話履歴をSupabaseに保存 |
| `/api/chat/history` | GET | 会話履歴取得 | `userId` (クエリパラメータ) | `chatMessages[]` | 特定ユーザーの全履歴 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | なし | `chatMessages[]` | 特定セッションの履歴 |

**`/api/chat` リクエストボディ例:**
```json
{
  "message": "先月の売上データを分析して、要約レポートを作成してください。",
  "sessionId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
}
```

**`/api/chat` レスポンスボディ例:**
```json
{
  "aiResponse": "承知いたしました。先月の売上データを分析し、主要な傾向と課題をまとめたレポートを作成します。",
  "sessionId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
}
```

### 3.3. AIレポート生成API

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ | 備考 |
|---------------|--------|------|------------------|------------------|------|
| `/api/report/upload` | POST | ファイルアップロード | `file` (FormData) | `fileId`, `fileName` | Supabase Storageに一時保存 |
| `/api/report/generate` | POST | レポート生成指示 | `fileId`, `prompt` | `reportId`, `status` | AIによる分析とレポート生成 |
| `/api/report/:reportId` | GET | レポート取得 | なし | `report`オブジェクト | 生成されたレポート内容 |
| `/api/report/:reportId/download` | GET | レポートダウンロード | なし | ファイル | PDF/Markdown形式 |

### 3.4. テンプレート書類生成API

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ | 備考 |
|---------------|--------|------|------------------|------------------|------|
| `/api/template/list` | GET | テンプレート一覧取得 | なし | `templates[]` | 利用可能なテンプレート |
| `/api/template/generate` | POST | 書類生成 | `templateId`, `data` | `documentId`, `status` | テンプレートから書類生成 |
| `/api/document/:documentId` | GET | 生成書類取得 | なし | `document`オブジェクト | 生成された書類内容 |
| `/api/document/:documentId/download` | GET | 書類ダウンロード | なし | ファイル | PDF/Word形式 |

## 4. BYOK実装方針

ユーザーが自身のAIプロバイダーAPIキーを利用できるBYOK (Bring Your Own Key) 方式をサポートする。

### 4.1. キーの管理

-   **保存場所**: Supabaseの`user_settings`テーブルに暗号化して保存。RLSによりユーザー本人しかアクセスできないようにする。
-   **暗号化**: SupabaseのPostgreSQLの暗号化機能を利用し、データベースレベルで保護。
-   **取得・利用**: Cloudflare Workersがユーザーのリクエストに応じて一時的にキーを取得し、AIプロバイダーAPIへのリクエスト時にのみ使用。リクエスト処理後はメモリから即座に破棄。ログには記録しない。

### 4.2. AIプロバイダー連携

-   ユーザーが設定したAPIキーに基づき、OpenAI, Anthropic, GoogleなどのAIプロバイダーAPIと連携。
-   APIリクエスト時には、ユーザーのAPIキーをAuthorizationヘッダーなどにセットして送信。
-   エラーハンドリング: APIキーの無効、レートリミット超過などのエラーを適切に処理し、ユーザーにフィードバック。

## 5. セキュリティ要件

TOPPA Inc.全体のセキュリティ方針に加え、ツミキリMVPに特化した要件を定義する。

### 5.1. 認証・認可

-   **Supabase Auth**: メールアドレスとパスワードによる認証に加え、将来的にはソーシャルログインも検討。
-   **Row Level Security (RLS)**:
    -   `chat_messages`, `reports`, `documents`, `user_settings`など、ユーザー固有のデータテーブルにはRLSを有効化。
    -   ユーザーは自身のデータのみを閲覧・操作できるポリシーを厳格に適用。

### 5.2. データ保護

-   **通信の暗号化**: 全ての通信はTLS 1.3により暗号化（Cloudflareの標準機能）。
-   **保存データの暗号化**: Supabaseに保存されるデータはAES-256で暗号化。特にAPIキーや機密性の高いユーザーデータは追加の暗号化を検討。
-   **ファイルストレージ**: Supabase Storageを利用し、アップロードされたファイルもアクセス制御を徹底。

### 5.3. BYOKの安全性

-   ユーザーのAPIキーはサーバーサイドで一時的に利用し、ログには一切記録しない。
-   キーの利用範囲を最小限に制限し、指定されたAIプロバイダーAPIへのリクエスト以外には使用しない。
-   キーの有効期限管理やローテーションはユーザー自身に委ねるが、推奨事項を提示する。

## 6. データベース設計

Founding Engineerの`docs/implementation-plan.md`に基づき、主要なテーブルスキーマを詳細化する。

### 6.1. `chat_messages` テーブル

会話履歴を保存する。

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    session_id UUID DEFAULT gen_random_uuid(), -- 会話セッションIDを追加
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
**変更点**: `session_id` を追加し、特定の会話セッションの履歴を管理しやすくする。

### 6.2. `reports` テーブル

AIレポート生成履歴を保存する。

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT, -- Supabase StorageのURL
    prompt TEXT NOT NULL,
    result TEXT, -- AIが生成したレポート内容
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
**変更点**: `status` フィールドを追加し、レポート生成の進捗を管理できるようにする。

### 6.3. `documents` テーブル

生成済み書類を保存する。

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID, -- どのテンプレートから生成されたか
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- 生成された書類の内容
    file_url TEXT, -- Supabase StorageのURL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ユーザーポリシー
CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```
**変更点**: `template_id` を追加し、どのテンプレートから生成された書類かを追跡できるようにする。

### 6.4. `user_settings` テーブル

ユーザー設定やAPIキーを保存する。

```sql
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    openai_api_key TEXT, -- 暗号化して保存
    anthropic_api_key TEXT, -- 暗号化して保存
    google_api_key TEXT, -- 暗号化して保存
    default_ai_model VARCHAR(50) DEFAULT 'openai_gpt4o',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーポリシー
CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);
```
**変更点**: `default_ai_model` を追加し、ユーザーがデフォルトで使用するAIモデルを選択できるようにする。

## 7. 将来の拡張性

-   **Webhook連携**: 各機能のイベント発生時に外部サービスへ通知する仕組みを検討。
-   **監査ログ**: セキュリティ強化のため、重要な操作の監査ログを記録する仕組みを追加。
-   **マルチテナント**: 将来的な企業向けプランを考慮し、企業ごとのデータ分離をより厳格に行うアーキテクチャを検討。

## 8. 技術的リスクと対策（ツミキリMVP特化）

| リスク | 対策 |
|--------|------|
| AI応答の品質ばらつき | プロンプトエンジニアリングの最適化、ユーザーによる評価フィードバック機能の実装、複数AIモデルの利用オプション提供 |
| BYOKの不正利用 | APIキーの利用範囲を厳格に制限、キーの利用ログ（非キー情報）の監視、レートリミット設定 |
| 大容量ファイルアップロード時の性能劣化 | Cloudflare Workersの制限を考慮し、ファイルサイズ上限を設定、Supabase Storageのパフォーマンス監視 |
| Supabaseのサービス停止 | Cloudflare Workersのキャッシュ機能活用、Supabaseの冗長構成オプションの検討、代替データベースの調査（将来的に） |