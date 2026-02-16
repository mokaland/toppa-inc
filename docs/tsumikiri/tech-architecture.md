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

## 3. API設計（エンドポイント一覧）

### 3-1. チャットアシスタントAPI

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ |
|---------------|--------|------|-----------------|-----------------|
| `/api/chat` | `POST` | チャット送信・AI応答取得 | `{"message": "string", "sessionId": "string (optional)"}` | `{"sessionId": "string", "response": "string", "timestamp": "string"}` |
| `/api/chat/history` | `GET` | 会話履歴取得（全セッション） | なし | `[{"sessionId": "string", "messages": [{"role": "user/assistant", "content": "string", "timestamp": "string"}]}]` |
| `/api/chat/history/:sessionId` | `GET` | 特定セッションの履歴取得 | なし | `{"sessionId": "string", "messages": [{"role": "user/assistant", "content": "string", "timestamp": "string"}]}` |

### 3-2. AIレポート生成API

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ |
|---------------|--------|------|-----------------|-----------------|
| `/api/report/generate` | `POST` | ファイルアップロード・レポート生成 | `{"file": "FormData (CSV/Excel)", "prompt": "string"}` | `{"reportId": "string", "title": "string", "summary": "string", "downloadUrl": "string", "timestamp": "string"}` |
| `/api/reports/history` | `GET` | レポート生成履歴取得（全レポート） | なし | `[{"reportId": "string", "title": "string", "summary": "string", "timestamp": "string"}]` |
| `/api/reports/:reportId` | `GET` | 特定レポートの詳細取得 | なし | `{"reportId": "string", "title": "string", "summary": "string", "content": "string (Markdown)", "downloadUrl": "string", "timestamp": "string"}` |

### 3-3. テンプレート書類生成API (Q2以降)

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ |
|---------------|--------|------|-----------------|-----------------|
| `/api/template/generate` | `POST` | テンプレートから書類生成 | `{"templateId": "string", "data": "object"}` | `{"documentId": "string", "downloadUrl": "string", "timestamp": "string"}` |

## 4. データベーススキーマ（Supabase PostgreSQL）

### 4-1. `chat_messages` テーブル

会話履歴を保存するテーブル。ユーザーごとにRLSでアクセス制御を行う。

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

### 4-2. `reports` テーブル

AIレポート生成の履歴と結果を保存するテーブル。ユーザーごとにRLSでアクセス制御を行う。

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT, -- Supabase Storageに保存されたファイルのURL
    prompt TEXT NOT NULL,
    result TEXT, -- 生成されたレポートの内容 (Markdown形式)
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

## 5. BYOK (Bring Your Own Key) 実装方針

ユーザーが自身のAIプロバイダーAPIキーを利用できるようにする仕組み。

1.  **キーの登録**: ユーザーは設定画面で自身のAIプロバイダー（OpenAI, Anthropic, Googleなど）のAPIキーを登録する。
2.  **暗号化保存**: 登録されたAPIキーは、Cloudflare Workersのシークレット管理機能を利用し、セキュアに暗号化して保存する。SupabaseのデータベースにはユーザーIDとキーが関連付けられた状態で保存されるが、キー自体は暗号化される。
3.  **リクエスト時の利用**:
    *   ユーザーからのAI機能利用リクエスト（例: チャット送信、レポート生成）があった際、Cloudflare Workersがリクエストを受け取る。
    *   ユーザーIDに基づき、保存されている暗号化されたAPIキーを一時的に復号化。
    *   復号化されたAPIキーを使用して、該当するAIプロバイダーAPIへリクエストを送信。
    *   AIプロバイダーからの応答を受け取った後、APIキーはメモリから即座に破棄され、ログにも記録しない。
4.  **無料枠拡大**: BYOKを利用するユーザーは、TOPPA Inc.が提供する無料枠よりも多くのタスクを実行できるようにする。

## 6. セキュリティ方針

### データ保護
- 通信: TLS 1.3（Cloudflare標準）
- 保存データ: Supabase暗号化（AES-256）
- APIキー: Cloudflare Workers のシークレット管理に加えて、Supabaseに保存する際は暗号化を徹底。

### 認証・認可
- **Supabase Auth**: メールアドレス/パスワード認証、およびソーシャルログイン（Google, GitHubなど）をサポート。
- **Row Level Security (RLS)**: Supabaseの強力なRLS機能を利用し、ユーザーは自身のデータ（`chat_messages`, `reports`など）のみにアクセス可能とする。これにより、マルチテナント環境におけるデータ分離を堅牢に実現する。
- APIキーは暗号化して保存し、ユーザーごとに分離。

### BYOK セキュリティ
- ユーザーのAPIキーはサーバーサイドで一時利用のみ。
- ログに記録しない。
- リクエスト完了後メモリから破棄。

## 7. 開発規約

### コード品質
- TypeScript strict mode 必須
- ESLint + Prettier による自動フォーマット
- 全関数にJSDocコメント（経営者向けプロダクトなので保守性重視）

### テスト
- ユニットテスト: Vitest（カバレッジ80%目標）
- E2Eテスト: Playwright（主要フロー3つ）
- AI応答テスト: モックAPIでの動作検証

### ブランチ戦略
- `main`: 本番環境（自動デプロイ）
- `develop`: 開発統合ブランチ
- `feature/*`: 機能開発ブランチ
- PR必須、CTOレビュー後にマージ

### コミットメッセージ
- AGENTS.md準拠: `[ロール名] 内容`
- 例: `[Engineer] CSVアップロード機能を実装`

## 8. パフォーマンス要件

| 指標 | 目標値 |
|------|--------|
| 初期ロード | 2秒以内（LCP） |
| チャット応答 | 3秒以内（AI応答含む） |
| レポート生成 | 10秒以内（CSV 1000行まで） |
| 書類生成 | 5秒以内 |

## 9. 将来の技術拡張（Q2以降の検討事項）

- **音声入力**: Web Speech API → 自然言語指示
- **モバイルアプリ**: PWA対応（インストール不要）
- **Webhook連携**: 外部サービスとの自動連携
- **マルチテナント**: 企業ごとのデータ完全分離

## 10. 技術的リスクと対策

| リスク | 対策 |
|--------|------|
| AI応答の品質ばらつき | プロンプトエンジニアリングの継続的改善、ユーザーフィードバックループの構築、複数のAIプロバイダーの利用による冗長性確保。 |
| Cloudflare Workersのコールドスタート | 定期的なウォームアップ処理の導入、エッジキャッシュの最適化。 |
| Supabaseの利用制限・コスト増加 | 使用状況のモニタリング、プランの見直し、不要なデータの定期削除ポリシー。 |
| BYOKにおけるAPIキー漏洩リスク | 厳格なシークレット管理、キーのライフサイクル管理、ユーザーへのセキュリティ啓蒙。 |
| 外部ライブラリの互換性問題 (Cloudflare Workers) | 事前検証の徹底、代替ライブラリの検討、`node_compat`オプションの活用。 |
