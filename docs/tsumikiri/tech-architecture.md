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

### 3-1. チャットアシスタントAPI

#### エンドポイント一覧

| エンドポイント | Method | 機能 | リクエスト例 | レスポンス例 |
|---------------|--------|------|--------------|--------------|
| `/api/chat` | POST | チャット送信・AI応答取得 | `{"message": "こんにちは", "history": []}` | `{"role": "assistant", "content": "こんにちは！何かお手伝いできることはありますか？"}` |
| `/api/chat/history` | GET | 会話履歴取得 | なし | `[{"id": "uuid", "user_id": "uuid", "role": "user", "content": "メッセージ", "created_at": "timestamp"}]` |

#### リアルタイム性に関する考慮事項
- MVPでは、ユーザーがメッセージを送信後、APIからの応答を待って表示する同期的な処理を基本とする。
- 将来的な機能拡張として、WebSocketやServer-Sent Events (SSE) を用いたリアルタイムなメッセージ更新、AIの思考プロセスの可視化などを検討する。

### 3-2. AIレポート生成API

#### エンドポイント一覧

| エンドポイント | Method | 機能 | リクエスト例 | レスポンス例 |
|---------------|--------|------|--------------|--------------|
| `/api/report/generate` | POST | ファイルアップロードとレポート生成指示 | `{"file": <MultipartFile>, "prompt": "売上データを分析して"}` | `{"reportId": "uuid", "status": "processing"}` |
| `/api/report/:reportId` | GET | レポート進捗・結果取得 | なし | `{"status": "completed", "result": "レポート内容 (Markdown)"}` |

### 3-3. 共通エラーハンドリング

- APIからのエラーレスポンスは、以下の共通フォーマットに従う。
- `{ "error": "エラーメッセージ", "code": "エラーコード" }`
    - `error`: 人間が理解できるエラーの説明
    - `code`: プログラムで処理可能なエラーコード（例: `INVALID_INPUT`, `UNAUTHORIZED`, `INTERNAL_SERVER_ERROR`）
- フロントエンドでは、このフォーマットに基づいてユーザーに適切なエラーメッセージを表示する。

## 4. セキュリティ方針

### データ保護
- 通信: TLS 1.3（Cloudflare標準）
- 保存データ: Supabase暗号化（AES-256）
- APIキー: Cloudflare Workers のシークレット管理

### 認証・認可
- Supabase Auth（メール + ソーシャルログイン）
- Row Level Security（RLS）: ユーザーは自分のデータのみアクセス可能
- APIキーは暗号化して保存（ユーザーごとに分離）

### BYOK セキュリティ
- ユーザーのAPIキーはサーバーサイドで一時利用のみ
- ログに記録しない
- リクエスト完了後メモリから破棄

## 5. 開発規約

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

## 6. パフォーマンス要件

| 指標 | 目標値 |
|------|--------|
| 初期ロード | 2秒以内（LCP） |
| チャット応答 | 3秒以内（AI応答含む） |
| レポート生成 | 10秒以内（CSV 1000行まで） |
| 書類生成 | 5秒以内 |

## 7. 将来の技術拡張（Q2以降の検討事項）

- **音声入力**: Web Speech API → 自然言語指示
- **モバイルアプリ**: PWA対応（インストール不要）
- **Webhook連携**: 外部サービスとの自動連携
- **マルチテナント**: 企業ごとのデータ完全分離

## 8. 技術的リスクと対策

| リスク | 対策 |
|--------|------|
| AI応答の品質ばらつき | プロンプトエンジニアリングの継続的改善、AIモデルの組み合わせによる頑健性向上、ユーザーフィードバックによるモデル調整 |
| Cloudflare Workersのコールドスタート | 定期的なウォームアップ処理の導入、エッジキャッシュの積極的活用 |
| SupabaseのRPS制限 | プランのアップグレード、API呼び出しのバッチ処理化、キャッシュの導入 |
| BYOKの不正利用 | APIキーの利用状況モニタリング、レートリミットの導入、異常検知システムの構築 |