# ツミキリ 技術アーキテクチャ設計書

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-16
> ステータス: 設計中（Founding Engineerの進捗を反映）

## 1. システム構成図

```mermaid
graph LR
    A[ユーザー] -->|Webブラウザ| B(Cloudflare Pages)
    B -->|APIリクエスト| C(Cloudflare Workers)
    C -->|データ操作| D(Supabase)
    C -->|AIリクエスト| E(AI Provider API)
    D -->|PostgreSQL| F(Supabase DB)
    D -->|Auth| G(Supabase Auth)
    D -->|Storage| H(Supabase Storage)
    C -->|ファイル解析 (xlsx)| I(xlsx library in Worker)
```

## 2. API設計（エンドポイント一覧）

| エンドポイント | Method | 機能 | 備考 |
|---|---|---|---|
| `/api/chat` | POST | チャット送信・AI応答取得 | 会話履歴をSupabaseに保存 |
| `/api/chat/history` | GET | 会話履歴取得 | |
| `/api/report/generate` | POST | レポート生成 | CSV/Excelファイルアップロード、AI分析、レポート生成 |
| `/api/report/history` | GET | レポート履歴取得 | |
| `/api/document/generate` | POST | テンプレート書類生成 | テンプレート選択、データ入力、AI生成 |

## 3. BYOK実装方針

- ユーザーのAPIキーは暗号化してSupabaseに保存。
- Cloudflare Workersでリクエスト時に一時的に復号し、AI Provider APIに送信。
- ログには記録せず、リクエスト完了後メモリから破棄。

## 4. セキュリティ要件

- **データ保護**: TLS 1.3、Supabase暗号化（AES-256）、Cloudflare Workersシークレット管理。
- **認証・認可**: Supabase Auth、Row Level Security（RLS）によるユーザーデータ分離。
- **BYOKセキュリティ**: ユーザーAPIキーのサーバーサイド一時利用、ログ不記録、メモリ破棄。

## 5. 技術スタック

### フロントエンド
- React + TypeScript + Tailwind CSS
- Zustand (状態管理)
- React Router (SPA)

### バックエンド
- Cloudflare Workers (Hono)
- AI Provider API (OpenAI, Anthropic, Google)
- **ファイル解析**:
    - CSV: papaparse
    - Excel: `xlsx`ライブラリ
        - **Cloudflare Workersでの導入方針**: `wrangler`によるバンドルと`node_compat = true`の設定で導入を試みる。互換性問題が発生した場合は、CDN版/WASM版の利用を検討する。

### データベース
- Supabase (PostgreSQL, Auth, Storage)

## 6. 開発規約
（docs/tech-direction.mdの内容をベースに、ツミキリ固有の規約を記載）
