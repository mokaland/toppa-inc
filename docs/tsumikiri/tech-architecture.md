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
    ```
    React Frontend
        │
        ▼ POST /api/report/upload (File Upload)
    Cloudflare Workers (Hono)
        │
        ├── Supabase Storage: ファイル一時保存
        │
        ├── File Parse (xlsx/papaparse)
        │
        ▼ AI Provider API
    OpenAI GPT-4o (データ分析 + レポート生成)
    ```
- **ファイル解析機能強化（xlsxライブラリの導入方針）**:
    - **互換性**: `xlsx`ライブラリはNode.js/ブラウザ環境を想定しているため、Cloudflare WorkersのEdge Runtimeでは直接的な利用に課題がある。
    - **導入アプローチ**:
        1.  **`wrangler`によるバンドルと`node_compat = true`**:
            - `package.json`に`xlsx`ライブラリを依存関係として追加。
            - `wrangler.toml`ファイルに`node_compat = true`設定を追加し、Node.js互換モードを有効化。
            - Cloudflare Workers内で`import * as XLSX from 'xlsx';`としてライブラリをインポートし、`XLSX.read()`関数を使用してExcelファイルデータをワークブックオブジェクトに変換する。
            - 変換されたワークブックからシートデータを抽出し、JSON形式などの扱いやすいデータ構造に変換する。
        2.  **代替案**: `node_compat`で問題が発生した場合は、CDN版/WASM版の利用を検討する。
    - **動作検証**:
        - シンプルなデータを含むExcelファイルを複数パターンで用意。
        - `wrangler dev`でのローカル開発サーバーで、`xlsx`ライブラリによる解析が正しく行われることを確認。
        - デプロイ後の環境でも同様のテストを実施し、本番に近い環境での動作を確認する。

### 5-3. テンプレート書類生成

- **機能要件**:
    - テンプレート管理（見積書、請求書など）
    - 自然言語で指示 → テンプレートから自動生成
    - PDF/Wordダウンロード
- **システム構成**:
    ```
    React Frontend
        │
        ▼ POST /api/document/generate
    Cloudflare Workers
        │
        ├── Supabase: テンプレート保存/取得
        │
        ▼ AI Provider API
    OpenAI GPT-4o (書類内容生成)
    ```
