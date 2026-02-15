# TOPPA Inc. — ツミキリ 技術アーキテクチャ設計

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-15
> ステータス: 設計完了

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
| `/api/auth/signup` | POST | ユーザー登録 | `{ "email": "user@example.com", "password": "password" }` | `{ "user": { "id": "uuid", "email": "user@example.com" } }` | Supabase Auth利用 |
| `/api/auth/login` | POST | ログイン | `{ "email": "user@example.com", "password": "password" }` | `{ "access_token": "jwt", "refresh_token": "jwt" }` | Supabase Auth利用 |
| `/api/chat` | POST | チャット送信・AI応答取得 | `{ "message": "先月の売上を教えてください" }` | `{ "response": "先月の売上はXX円です。", "history_id": "uuid" }` | 会話履歴保存 |
| `/api/chat/history` | GET | 会話履歴取得 | (なし) | `[ { "id": "uuid", "role": "user", "content": "...", "created_at": "..." } ]` | ユーザーごとの履歴 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | (なし) | `[ { "id": "uuid", "role": "user", "content": "...", "created_at": "..." } ]` | |
| `/api/report/upload` | POST | ファイルアップロード | `FormData (file: File)` | `{ "file_url": "supabase_storage_url" }` | Supabase Storageへ保存 |
| `/api/report/generate` | POST | レポート生成要求 | `{ "file_url": "...", "prompt": "売上分析レポートを作成してください" }` | `{ "report_id": "uuid", "status": "pending" }` | 非同期処理 |
| `/api/report/:id` | GET | レポート結果取得 | (なし) | `{ "id": "uuid", "title": "...", "result": "...", "status": "completed" }` | ステータス更新 |
| `/api/report/list` | GET | レポート一覧取得 | (なし) | `[ { "id": "uuid", "title": "...", "status": "completed" } ]` | |
| `/api/documents/generate` | POST | 書類生成要求 | `{ "template_id": "estimate", "data": { "company_name": "...", "items": [...] } }` | `{ "document_id": "uuid", "status": "pending" }` | 非同期処理 |
| `/api/documents/:id` | GET | 書類結果取得 | (なし) | `{ "id": "uuid", "template_name": "...", "generated_content": "...", "status": "completed" }` | ステータス更新 |
| `/api/documents/list` | GET | 生成済み書類一覧取得 | (なし) | `[ { "id": "uuid", "template_name": "...", "status": "completed" } ]` | |
| `/api/user/settings` | GET | ユーザー設定取得 | (なし) | `{ "api_keys": { "openai": "...", "anthropic": "..." } }` | BYOKキー管理 |
| `/api/user/settings` | PUT | ユーザー設定更新 | `{ "api_keys": { "openai": "sk-...", "anthropic": "sk-..." } }` | `{ "message": "Settings updated" }` | |

## 3. データベーススキーマ設計

Supabase (PostgreSQL) を利用し、Founding Engineerが提案する以下のスキーマを採用する。全てのテーブルにRow Level Security (RLS) を適用し、ユーザーは自身のデータのみアクセス可能とする。

```sql
-- 会話履歴テーブル
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

-- レポート履歴テーブル
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    prompt TEXT NOT NULL,
    result TEXT,
    status VARCHAR(20) DEFAULT 'pending',
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

-- 生成済み書類テーブル
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    generated_content TEXT,
    status VARCHAR(20) DEFAULT 'pending',
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

-- ユーザー設定テーブル (APIキー等)
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    google_api_key TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

## 4. BYOK (Bring Your Own Key) 実装方針

ユーザーが自身のAIプロバイダーAPIキーを利用できるBYOK方式をサポートする。

- **APIキーの保存**:
    - `user_settings` テーブルにユーザーごとに暗号化して保存する。
    - Cloudflare Workersのシークレット管理機能も活用し、環境変数として設定するキーと、ユーザーから提供されるキーを区別する。
- **APIキーの利用**:
    - ユーザーのリクエスト時に、`user_settings`から該当するAPIキーを取得し、AI Provider APIへのリクエストヘッダーに含める。
    - サーバーサイドで一時的に利用し、ログには記録せず、リクエスト完了後メモリから破棄する。
- **レート制限**:
    - ユーザーごとのAPIキー利用に対して、Cloudflare Workersの機能やカスタムミドルウェアでレート制限を設ける（例: 1分間あたり10リクエスト）。
    - 異常検知システムを導入し、不正利用の兆候を早期に発見する。

## 5. セキュリティ要件

- **データ保護**:
    - 通信はTLS 1.3（Cloudflare標準）で暗号化。
    - 保存データはSupabaseの暗号化機能（AES-256）を利用。
    - APIキーはCloudflare Workersのシークレット管理と`user_settings`テーブルでの暗号化保存を併用し、厳重に保護する。
- **認証・認可**:
    - Supabase Auth（メール + ソーシャルログイン）による堅牢な認証。
    - 全てのデータアクセスにRow Level Security（RLS）を適用し、ユーザーは自身のデータのみにアクセス可能とする。
- **BYOKセキュリティ**:
    - ユーザーAPIキーはサーバーサイドで一時利用のみとし、ログに記録せず、リクエスト完了後メモリから破棄する。
    - キーの不正利用防止のため、レート制限と異常検知を導入する。
- **入力値検証**:
    - 全てのAPIエンドポイントで入力値のバリデーションを徹底し、SQLインジェクションやXSSなどの脆弱性を防止する。
- **依存ライブラリ**:
    - 定期的な脆弱性スキャンを実施し、既知の脆弱性を持つライブラリの使用を避ける。

## 6. 開発規約（技術スタック）

Founding Engineerの実装計画に基づき、以下の主要ライブラリを使用する。

- **フロントエンド**:
    - React 19.x
    - Zustand 5.x (状態管理)
    - Tailwind CSS 3.x (スタイリング)
- **バックエンド**:
    - Hono 4.x (Cloudflare Workers用Webフレームワーク)
- **データベース**:
    - @supabase/supabase-js 2.x (Supabase接続)
- **テスト**:
    - Vitest 2.x (ユニットテスト)
    - Playwright 1.x (E2Eテスト)

## 7. 将来の技術拡張（Q2以降の検討事項）

- **音声入力**: Web Speech API → 自然言語指示
- **モバイルアプリ**: PWA対応（インストール不要）
- **Webhook連携**: 外部サービスとの自動連携
- **マルチテナント**: 企業ごとのデータ完全分離

## 8. 技術的リスクと対策

| リスク | 対策 |
|--------|------|
| AI応答の品質ばらつき | システムプロンプトの最適化 + 出力バリデーション |
| Cloudflare Workers の制限 | CPU時間50ms制限を意識した設計。重い処理はQueue利用 |
| Supabase無料枠の上限 | Pro移行のタイミングを事前に計画（ユーザー500名を閾値） |
| BYOK APIキーの不正利用 | レート制限 + 異常検知（1分10リクエスト上限） |
| RLS設定ミスによるデータ漏洩 | 定期的なRLSポリシーのレビューとテスト |
| ユーザーデータの誤削除 | 論理削除の導入または定期的なバックアップ戦略の確立 |
