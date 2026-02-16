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
- **技術スタック**:
    - **フロントエンド**: React + TypeScript
    - **バックエンド**: Cloudflare Workers (Hono)
    - **データベース**: Supabase Storage (ファイル一時保存), Supabase (レポート履歴 `reports` テーブル)
    - **ファイル解析**: `papaparse` (CSV), `xlsx` (Excel)
        - **`xlsx`ライブラリのCloudflare Workersにおける互換性と導入方針**:
            - `xlsx`ライブラリはNode.js/ブラウザ環境を想定しているため、Cloudflare WorkersのEdge RuntimeではNode.jsの組み込みモジュールが利用できない場合がある。
            - **対応策**:
                1. `wrangler`によるバンドルと`node_compat = true`設定で、Node.js依存の一部を解決し利用を試みる。これが現実的な第一アプローチ。
                2. `node_compat`で問題が発生した場合、CDNで提供されるブラウザ向けビルドを`importScripts`で利用するか、WASM版の導入を検討する。
    - **AIプロバイダー**: OpenAI GPT-4o (データ分析 + レポート生成)

- **APIエンドポイント設計**:
    - `/api/report/upload` (POST): ファイルアップロード
    - `/api/report/generate` (POST): レポート生成
    - `/api/report/history` (GET): レポート履歴取得
    - `/api/report/download/:reportId` (GET): レポートダウンロード

- **データベーススキーマ（Supabase PostgreSQL）**:
    ```sql
    CREATE TABLE reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255),
        file_url TEXT,
        prompt TEXT NOT NULL,
        result TEXT,
        format VARCHAR(50), -- pdf, markdown
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own reports"
        ON reports FOR SELECT
        USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own reports"
        ON reports FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    ```

- **動作検証計画（xlsxライブラリ）**:
    1. **テスト用Excelファイルの準備**: シンプルなデータを含むExcelファイル（.xlsx形式）を複数パターン（単一シート、複数シート、異なるデータ型など）で用意する。
    2. **ローカル環境での動作検証**: `wrangler dev`コマンドを使用してCloudflare Workersのローカル開発サーバーを起動し、用意したテスト用Excelファイルをアップロードし、`xlsx`ライブラリによる解析が正しく行われることを確認する。
    3. **デプロイ後の動作検証**: テストブランチにコミットし、Cloudflare Pages/Workersにデプロイ後、同様のテストを実施し、本番に近い環境での動作を確認する。

### 5-3. テンプレート書類生成

- **機能要件**:
    - 事前に登録したテンプレートから見積書・請求書などを自動生成
    - 顧客情報・商品情報を入力 → AIが埋め込み
    - PDFダウンロード・メール送信

- **技術スタック**:
    - **フロントエンド**: React + TypeScript
    - **バックエンド**: Cloudflare Workers (Hono)
    - **データベース**: Supabase (テンプレート `templates` テーブル, 顧客情報 `customers` テーブル)
    - **AIプロバイダー**: OpenAI GPT-4o (書類内容生成)
    - **PDF生成**: Puppeteer (Cloudflare Workersとの互換性を確認)

- **APIエンドポイント設計**:
    - `/api/template/list` (GET): テンプレート一覧取得
    - `/api/template/generate` (POST): 書類生成
    - `/api/template/:templateId` (GET): 特定テンプレート取得
    - `/api/customer/list` (GET): 顧客情報一覧取得
    - `/api/customer/add` (POST): 顧客情報追加

- **データベーススキーマ（Supabase PostgreSQL）**:
    ```sql
    CREATE TABLE templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- estimate, invoice, report
        content TEXT NOT NULL, -- Markdown or HTML template
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        address TEXT,
        phone VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own templates" ON templates FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own templates" ON templates FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own templates" ON templates FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own templates" ON templates FOR DELETE USING (auth.uid() = user_id);

    CREATE POLICY "Users can view own customers" ON customers FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own customers" ON customers FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own customers" ON customers FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own customers" ON customers FOR DELETE USING (auth.uid() = user_id);
    ```