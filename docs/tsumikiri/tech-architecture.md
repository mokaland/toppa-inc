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
    - `xlsx`ライブラリの利用方針: `wrangler`によるバンドルと`node_compat = true`を設定し、Cloudflare Workersでの利用を試みる。この設定はNode.jsの組み込みモジュールの一部をエミュレートするが、完全な互換性を保証するものではないため、注意深く検証する必要がある。問題が発生した場合は、CDN版やWASM版の利用、または代替の解析ライブラリの検討を行う。
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
  - $0.15/1M input, $1.20/1M output
  - コーディング能力: SWE-Bench 80.2%（Claude Opus 4.6級）
  - 24時間フル自律運営: 月¥1,700
- **GCP Cloud Functions + Cloud Scheduler** — 1-2時間おきにセッション自動実行
- **GitHub API** — AI社員がリポジトリにコミット・push

### ホスティング
- **Cloudflare Pages** — フロントエンドホスティング
- **Cloudflare Workers** — APIサーバー

### CI/CD
- **GitHub Actions** — PR時にLint + Type Check + テスト
- **Cloudflare Wrangler** — `main` ブランチマージ時に自動デプロイ

## 3. アーキテクチャ詳細

### 3-1. API設計

#### チャットアシスタントAPI

**エンドポイント**: `/api/chat`
**メソッド**: `POST`
**機能**: ユーザーからのチャットメッセージを受け取り、AIによる応答を生成し、会話履歴を保存する。
**リクエスト**: `{
    "message": "string",
    "sessionId": "string" (optional)
}`
**レスポンス**: `{
    "reply": "string",
    "sessionId": "string"
}`
**リアルタイム性**: WebSocketまたはServer-Sent Events (SSE) を利用して、AI応答のストリーミング配信を検討する。これにより、ユーザー体験を向上させる。

**エンドポイント**: `/api/chat/history`
**メソッド**: `GET`
**機能**: 認証済みユーザーの会話履歴を取得する。
**リクエスト**: なし
**レスポンス**: `{
    "history": [
        { "role": "user", "content": "string", "timestamp": "ISO8601" },
        { "role": "assistant", "content": "string", "timestamp": "ISO8601" }
    ]
}`

**エンドポイント**: `/api/chat/history/:sessionId`
**メソッド**: `GET`
**機能**: 特定のセッションIDに紐づく会話履歴を取得する。
**リクエスト**: なし
**レスポンス**: `/api/chat/history` と同様の形式

#### AIレポート生成API

**エンドポイント**: `/api/report/generate`
**メソッド**: `POST`
**機能**: アップロードされたCSV/ExcelファイルをAIで分析し、レポートを生成する。
**リクエスト**: `multipart/form-data`（ファイルとプロンプトを含む）
`{
    "file": "ファイルデータ",
    "prompt": "分析指示プロンプト"
}`
**レスポンス**: `{
    "reportId": "string",
    "status": "processing" | "completed" | "failed",
    "reportUrl": "string" (completedの場合)
}`
**ファイル処理**: Cloudflare Workersの制限を考慮し、大きなファイルはSupabase Storageに一時保存し、AI処理はバックグラウンドで行うことを検討する。または、ストリーミング処理可能なライブラリを選定する。

**エンドポイント**: `/api/report/:reportId`
**メソッド**: `GET`
**機能**: 特定のレポートIDの生成状況と結果を取得する。
**リクエスト**: なし
**レスポンス**: `{
    "reportId": "string",
    "status": "processing" | "completed" | "failed",
    "result": "string" (Markdown形式のレポート本文), 
    "downloadUrl": "string" (PDF/MarkdownダウンロードURL)
}`

#### テンプレート書類生成API

**エンドポイント**: `/api/document/generate`
**メソッド**: `POST`
**機能**: テンプレートと入力データに基づき、AIが見積書や請求書などの書類を生成する。
**リクエスト**: `{
    "templateId": "string",
    "data": { "key": "value" },
    "format": "pdf" | "markdown"
}`
**レスポンス**: `{
    "documentId": "string",
    "status": "processing" | "completed" | "failed",
    "documentUrl": "string" (completedの場合)
}`

**エンドポイント**: `/api/document/:documentId`
**メソッド**: `GET`
**機能**: 特定の書類IDの生成状況と結果を取得する。
**リクエスト**: なし
**レスポンス**: `{
    "documentId": "string",
    "status": "processing" | "completed" | "failed",
    "downloadUrl": "string"
}`

### 3-2. データベーススキーマ

`docs/implementation-plan.md` に記載のスキーマを基本とし、各機能で必要なテーブル・カラムを追加する。

#### `chat_messages` テーブル
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### `reports` テーブル
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    prompt TEXT NOT NULL,
    result TEXT,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### `documents` テーブル
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    format VARCHAR(50) NOT NULL,
    file_url TEXT,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3-3. BYOK実装方針

`docs/tech-direction.md` に記載のBYOK方針に従い、ユーザーのAPIキーはサーバーサイドで一時利用し、ログには記録せず、リクエスト完了後にメモリから破棄する。

### 3-4. セキュリティ要件

`docs/tech-direction.md` に記載のセキュリティ方針を遵守する。
- TLS 1.3による通信暗号化
- Supabaseによるデータ暗号化 (AES-256)
- Supabase Authによる認証・認可
- Row Level Security (RLS)によるデータ分離
- APIキーの安全な保存と利用

## 4. 開発規約

`docs/tech-direction.md` および `AI_PLAYBOOK.md` に記載の規約を遵守する。

## 5. パフォーマンス要件

`docs/tech-direction.md` に記載のパフォーマンス要件を遵守する。

## 6. 将来の技術拡張 (Q2以降の検討事項)

`docs/tech-direction.md` に記載の将来計画を継続して検討する。

## 7. 技術的リスクと対策

`docs/tech-direction.md` に記載のリスクと対策を継続して管理する。
特に、Cloudflare WorkersのEdge Runtimeの制約（Node.js互換性など）については、Founding Engineerと密に連携し、適切なライブラリ選定と実装アプローチを確立する。
