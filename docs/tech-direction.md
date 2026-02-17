# TOPPA Inc. 技術方針書

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-17
> レビュー: CEO 高橋レン
> 承認: CTO マルコ・ロッシ (2026-02-17) - PdMのMVP仕様書と最終整合性を確認。本設計で実装を進めることを承認します。

## 1. 技術理念

**シンプルに、堅牢に。** 経営者が使うプロダクトに過剰な技術は不要。最小限の技術で最大限の価値を届ける。

## 2. 技術スタック

### フロントエンド
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** — ユーティリティファーストでスピード重視
- **Zustand** — 軽量状態管理（Redux不要）
- **React Router** — SPA構成

### バックエンド
- **Cloudflare Workers** — エッジコンピューティング、グローバル低レイテンシ
- **Hono** — 軽量Webフレームワーク（Cloudflare Workers対応）

### データベース
- **Supabase (PostgreSQL)** — 認証 + DB + ストレージを一括提供
- Row Level Security（RLS）によるデータ分離

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

## 3. アーキテクチャ

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   ブラウザ    │────▶│ Cloudflare Pages │     │   Supabase   │
│ (React SPA)  │     │   (静的ホスト)    │     │  PostgreSQL  │
└──────┬───────┘     └──────────────────┘     │   Auth       │
       │                                      │   Storage    │
       │ API リクエスト                         └──────▲───────┘
       ▼                                             │
┌──────────────────┐                                 │
│ Cloudflare Worker │─────────────────────────────────┘
│   (Hono API)      │
└──────┬───────────┘
       │ AIリクエスト（BYOKまたはマネージド）
       ▼
┌──────────────────┐
│  AI Provider API  │
│ OpenAI/Anthropic/ │
│ Google            │
└──────────────────┘
```

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

## 8. ファイル処理方針

### Excelファイルの処理
Cloudflare WorkersはNode.jsのファイルシステム
...（残り848文字省略）
