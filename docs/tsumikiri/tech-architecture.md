# ツミキリ 技術アーキテクチャ設計書

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-16
> ステータス: 設計中

## 1. システム構成図

```mermaid
graph LR
    A[React Frontend (Cloudflare Pages)] -- API Request --> B(Cloudflare Workers - Hono API)
    B -- Store/Retrieve Data --> C(Supabase - PostgreSQL/Auth/Storage)
    B -- AI Request (BYOK/Managed) --> D(AI Provider API - OpenAI/Anthropic/Google)
    B -- File Upload --> C
    B -- CSV/Excel Parse --> B
```

## 2. API設計

### 2-1. チャットアシスタントAPI

| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/chat` | POST | チャット送信・AI応答取得 |
| `/api/chat/history` | GET | 会話履歴取得 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 |

### 2-2. AIレポート生成API

| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/report/upload` | POST | ファイルアップロード |
| `/api/report/generate` | POST | レポート生成 |
| `/api/report/history` | GET | レポート履歴取得 |

## 3. BYOK実装方針

- ユーザーのAPIキーはCloudflare Workersのシークレット管理を活用し、サーバーサイドで一時利用のみとする。
- ログには記録せず、リクエスト完了後メモリから破棄する。
- SupabaseのRow Level Security (RLS) を利用し、ユーザーごとにAPIキーを安全に管理する。

## 4. セキュリティ要件

- 通信はTLS 1.3（Cloudflare標準）を適用。
- 保存データはSupabaseの暗号化（AES-256）を利用。
- APIキーはCloudflare Workersのシークレット管理で保護。
- RLSによりユーザーは自身のデータのみアクセス可能。

## 5. 技術実装詳細

### 5-1. チャットアシスタント

- **フロントエンド**: React + TypeScript + Zustand
- **バックエンド**: Cloudflare Workers (Hono)
- **データベース**: Supabase (会話履歴 `chat_messages` テーブル)
- **AIプロバイダー**: OpenAI GPT-4o / Anthropic Claude / Google Gemini (BYOK/Managed)

### 5-2. AIレポート生成

- **機能要件**:
    - CSV/Excelファイルをアップロード
    - 自然言語で分析指示
    - AIがデータを分析し、日本語レポート生成
    - PDF/Markdownダウンロード

- **システム構成**:
    - **フロントエンド**: React + TypeScript
    - **バックエンド**: Cloudflare Workers (Hono)
        - **ファイル解析**: `papaparse` (CSV), `xlsx` (Excel) を利用。`xlsx`ライブラリはCloudflare Workers環境での互換性を考慮し、`wrangler`によるバンドルと`node_compat = true`の設定で導入を試みる。問題が発生した場合はCDN版/WASM版の利用を検討する。
        - **ファイル一時保存**: Supabase Storage
    - **AIプロバイダー**: OpenAI GPT-4o (データ分析 + レポート生成)

- **データベーススキーマ**:
    - `reports` テーブル: レポート履歴を管理。

- **APIエンドポイント**:
    - `/api/report/upload`: ファイルアップロード。
    - `/api/report/generate`: レポート生成。
    - `/api/report/history`: レポート履歴取得。

## 6. パフォーマンス要件

| 指標 | 目標値 |
|------|--------|
| 初期ロード | 2秒以内（LCP） |
| チャット応答 | 3秒以内（AI応答含む） |
| レポート生成 | 10秒以内（CSV 1000行まで） |
| 書類生成 | 5秒以内 |

## 7. 将来の技術拡張（Q2以降の検討事項）

- 音声入力: Web Speech API → 自然言語指示
- モバイルアプリ: PWA対応（インストール不要）
- Webhook連携: 外部サービスとの自動連携
- マルチテナント: 企業ごとのデータ完全分離

## 8. 技術的リスクと対策

| リスク | 対策 |
|--------|------|
| AI応答の品質ばらつき | プロンプトエンジニアリングの継続的な改善、ユーザーからのフィードバックループ構築 |
| Cloudflare Workersのコールドスタート | アイドル状態のWorkerを維持する設定（有料プラン）を検討。または、初回リクエスト時に高速に応答できるようAPIの最適化 |
| SupabaseのRLS設定ミス | 厳格なコードレビューとテストによる検証 |
| BYOKのAPIキー漏洩 | Cloudflare Workersのシークレット管理を徹底し、最小権限の原則を適用 |
| 大規模データ処理時のパフォーマンス | Cloudflare Workersの制限を考慮し、大規模データはバッチ処理やストリーミング処理を検討 |
