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
- **Tailwind CSS** — ユーティリティファーストでスピード重視
- **Zustand** — 軽量状態管理（Redux不要）
- **React Router** — SPA構成

### バックエンド
- **Cloudflare Workers** — エッジコンピューティング、グローバル低レイテンシ
    - `xlsx`ライブラリの利用方針: `wrangler`によるバンドルと`node_compat = true`を設定し、Cloudflare Workersでの利用を試みる。
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

Founding EngineerのMVP実装計画 `docs/implementation-plan.md` および最新の進捗 `docs/implementation-progress.md` に基づき、以下のAPIエンドポイントを定義する。

| エンドポイント | Method | 機能 | 備考 |\
|---------------|--------|------|------|\
| `/api/auth/signup` | POST | ユーザー登録 | Supabase Authを利用、実装完了 |\
| `/api/auth/signin` | POST | ユーザーログイン | Supabase Authを利用、実装完了 |\
| `/api/chat` | POST | チャット送信・AI応答取得 | 会話履歴をSupabaseに保存、骨子実装完了 |\
| `/api/chat/history` | GET | 全会話履歴取得 | ユーザーIDでフィルタリング、実装中 |\
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | - |\
| `/api/report/upload` | POST | レポート用ファイルアップロード | Supabase Storageに一時保存、実装完了 |\
| `/api/report/generate` | POST | ファイル解析・AIレポート生成 | AI Provider APIと連携、実装中 |\
| `/api/report/status/:reportId` | GET | レポート生成ステータス取得 | - |\
| `/api/report/download/:reportId` | GET | 生成済みレポートダウンロード | - |\
| `/api/template/list` | GET | テンプレート一覧取得 | - |\
| `/api/template/generate` | POST | テンプレートから書類生成 | - |\

## 4. BYOK実装方針

- ユーザーのAPIキーは、Supabaseの暗号化されたデータベースに保存し、各ユーザーに紐付ける。
- Cloudflare WorkersでAI Provider APIを呼び出す際に、ユーザーのAPIキーを一時的に取得し、リクエストヘッダーに含めて送信する。
- APIキーはサーバーサイドで一時利用のみとし、ログには記録せず、リクエスト完了後メモリから破棄する。
- ユーザーごとのAPIキー利用状況を監視し、不正利用を防止する仕組みを検討する。

## 5. セキュリティ要件

### データ保護
- 通信: TLS 1.3（Cloudflare標準）
- 保存データ: Supabase暗号化（AES-256）
- APIキー: Cloudflare Workers のシークレット管理、Supabaseでの暗号化保存

### 認証・認可
- **Supabase Auth**（メール + ソーシャルログイン）を全面的に利用。ユーザー認証機能は実装完了。
- **Row Level Security（RLS）**: SupabaseのRLSを積極的に活用し、ユーザーは自分のデータ（例: `chat_messages`, `reports`）のみアクセス可能とする。具体的には、`auth.uid() = user_id` のポリシーを適用済み。
- APIキーは暗号化して保存（ユーザーごとに分離）

### BYOK セキュリティ
- ユーザーのAPIキーはサーバーサイドで一時利用のみ
- ログに記録しない
- リクエスト完了後メモリから破棄
- APIキーの利用上限設定や異常検知メカニズムを導入し、セキュリティを強化する。

### その他のセキュリティ対策
- 入力値検証: 全てのAPIエンドポイントで入力値のサニタイズと検証を実施。
- レートリミット: APIへの過剰なリクエストを防ぐため、Cloudflare Workersでレートリミットを導入。
- 脆弱性診断: 定期的な脆弱性診断（SAST/DAST）の実施を検討。

## 6. 開発規約

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

## 7. パフォーマンス要件

| 指標 | 目標値 |
|------|--------|
| 初期ロード | 2秒以内（LCP） |
| チャット応答 | 3秒以内（AI応答含む） |
| レポート生成 | 10秒以内（CSV 1000行まで） |
| 書類生成 | 5秒以内 |

## 8. 将来の技術拡張（Q2以降の検討事項）

- **音声入力**: Web Speech API → 自然言語指示
- **モバイルアプリ**: PWA対応（インストール不要）
- **Webhook連携**: 外部サービスとの自動連携
- **マルチテナント**: 企業ごとのデータ完全分離

## 9. 技術的リスクと対策

| リスク | 対策 |
|--------|------|
| AI応答の品質ばらつき | プロンプトエンジニアリングの強化、複数AIモデルの比較検討、ユーザーフィードバックによる継続的改善 |
| Cloudflare Workersの制限 | Edge Runtimeの特性を理解し、Node.js互換性の問題は`node_compat`やWASMの利用で対応。バンドルサイズ最適化。 |
| Supabaseの利用制限 | プランに応じたリソース監視、必要に応じたスケールアップ。RLSの適切な設計によるパフォーマンス維持。 |
| セキュリティ脆弱性 | 定期的なコードレビュー、脆弱性スキャン、最新のセキュリティベストプラクティスへの追従。 |
| BYOKの不正利用 | APIキーの利用状況監視、レートリミット、異常検知。ユーザーへの注意喚起。 |
