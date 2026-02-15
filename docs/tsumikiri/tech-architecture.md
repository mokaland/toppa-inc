# ツミキリ — 技術アーキテクチャ設計書

- **作成者**: CTO マルコ・ロッシ
- **日付**: 2026-02-15
- **ステータス**: ドラフト

## 1. 概要

本ドキュメントは、プロダクト「ツミキリ」の技術アーキテクチャを定義するものです。
TOPPA Inc. の全体技術方針 (`docs/tech-direction.md`) に準拠しつつ、「ツミキリ」固有の要件を明確にします。本設計は、Founding Engineer（カルロス・メンデス）による実装の基礎となります。

## 2. システム構成図

全体のアーキテクチャは、Cloudflareを中心としたサーバーレス構成を採用し、スケーラビリティと高速なレスポンスを実現します。

```mermaid
graph TD
    subgraph "ユーザー"
        A[ブラウザ<br>(React SPA)]
    end

    subgraph "Cloudflare"
        B[Cloudflare Pages<br>(Frontend Hosting)]
        C[Cloudflare Workers<br>(Hono API)]
    end

    subgraph "Supabase"
        D[Auth<br>(認証)]
        E[PostgreSQL<br>(データベース)]
        F[Storage<br>(ファイルストレージ)]
    end

    subgraph "AI Providers"
        G[OpenAI / Anthropic / Google]
    end

    A -- HTTPS --> B
    A -- APIリクエスト --> C
    C -- 認証 --> D
    C -- データアクセス --> E
    C -- ファイル操作 --> F
    C -- AIリクエスト<br>(BYOK/マネージド) --> G
```

## 3. API設計

APIはHonoフレームワークを用いてCloudflare Workers上に構築します。認証が必要なエンドポイントは、Supabase Authから発行されるJWTを利用して保護します。

### 認証
| エンドポイント | Method | 機能 |
|---|---|---|
| `/api/auth/signup` | POST | 新規ユーザー登録 |
| `/api/auth/login` | POST | ログイン |
| `/api/auth/logout` | POST | ログアウト |

### チャット機能
| エンドポイント | Method | 機能 |
|---|---|---|
| `/api/chat` | POST | チャットメッセージを送信し、AIの応答を取得 |
| `/api/chat/history` | GET | 会話履歴の一覧を取得 |

### レポート生成機能
| エンドポイント | Method | 機能 |
|---|---|---|
| `/api/reports` | GET | 生成済みレポートの一覧を取得 |
| `/api/reports` | POST | ファイルをアップロードし、レポート生成を要求 |
| `/api/reports/:id` | GET | 特定のレポートの状態と結果を取得 |

### 書類生成機能
| エンドポイント | Method | 機能 |
|---|---|---|
| `/api/documents` | GET | 生成済み書類の一覧を取得 |
| `/api/documents` | POST | テンプレートとデータに基づき書類生成を要求 |
| `/api/documents/:id` | GET | 特定の書類の状態と結果を取得 |


## 4. データベース設計

データベースはSupabase PostgreSQLを利用します。Founding Engineerが提案したスキーマを基に、以下の通り確定します。Row Level Security (RLS) を全てのテーブルで有効化し、テナント間のデータ分離を徹底します。

```sql
-- ユーザーごとの設定（APIキーなど）
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    openai_api_key TEXT, -- 暗号化して保存
    anthropic_api_key TEXT, -- 暗号化して保存
    google_api_key TEXT, -- 暗号化して保存
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- 会話履歴
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- レポート履歴
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    storage_object_path TEXT NOT NULL,
    prompt TEXT,
    generated_report TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own reports" ON reports FOR ALL USING (auth.uid() = user_id);

-- 生成済み書類
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    input_data JSONB NOT NULL,
    generated_pdf_path TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own documents" ON documents FOR ALL USING (auth.uid() = user_id);
```

## 5. セキュリティ要件

TOPPA Inc. の全体技術方針に加え、以下の要件を適用します。

| 項目 | 要件 |
|---|---|
| **データ保護** | 全ての通信はTLS 1.3で暗号化。データベース内の機密データ（APIキー等）は`pgsodium`を使用して暗号化する。 |
| **認証・認可** | Supabase Auth (JWT) を使用。全てのAPIエンドポイントでJWTの検証を必須とする。RLSにより、ユーザーは自身のデータにしかアクセスできないことを保証する。 |
| **BYOK APIキー管理** | ユーザーが入力したAPIキーは、`user_settings`テーブルに暗号化して保存する。Cloudflare Workersはリクエストの都度、復号して一時的に利用し、処理完了後はメモリから破棄する。 |
| **ファイルアップロード** | Supabase Storageの機能を利用し、アップロードされるファイルのMIMEタイプとサイズを制限する。将来的にはウイルススキャンを導入する。 |
| **レート制限** | Cloudflareのレート制限機能を活用し、特定IPからの短時間での大量リクエストをブロックする（例: 1分あたり60リクエスト）。 |

## 6. 次のステップ

| タスク | 担当 | 期限 |
|---|---|---|
| 本設計書に対するレビュー | CEO (高橋レン) | 2026-02-16 |
| 上記DBスキーマのマイグレーションファイル作成 | Founding Engineer (カルロス・メンデス) | 2026-02-16 |
| 認証APIの実装開始 | Founding Engineer (カルロス・メンデス) | 2026-02-17 |
