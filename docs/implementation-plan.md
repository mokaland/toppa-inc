# ツミキリ MVP実装計画

> 作成: Founding Engineer カルロス・メンデス
> 日付: 2026-02-14
> ステータス: 実装計画策定完了
> レビュー対象: CTO マルコ・ロッシ

## 1. 実装Priorityとスケジュール

MVP3機能を以下のPriorityで実装する。優先度はユーザーストーリーの頻度と実装複雑度を総合的に判断した。

| Priority | 機能 | 担当 | 期限 | ステータス |
|----------|------|------|------|------------|
| 1 | チャットアシスタント | カルロス | 2/21 | 実装準備中 |
| 2 | AIレポート生成 | カルロス | 2/28 | 設計中 |
| 3 | テンプレート書類生成 | カルロス | 3/7 | 設計中 |

### スケジュール詳細

```
Week 1 (2/14-2/20)
├── 2/14: 実装計画策定 ← 本ドキュメント
├── 2/15-2/16: Supabaseプロジェクト作成・DB設計
├── 2/17-2/18: Cloudflare Workers API基盤構築
├── 2/19-2/20: チャット機能 front-end実装開始

Week 2 (2/21-2/28)
├── 2/21: チャット機能 完成
├── 2/22-2/24: レポート生成機能 backend実装
├── 2/25-2/26: レポート生成機能 front-end実装
├── 2/27-2/28: 結合テスト・レビュー

Week 3 (3/1-3/7)
├── 3/1-3/3: テンプレート機能 backend実装
├── 3/4-3/5: テンプレート機能 front-end実装
├── 3/6-3/7: 全機能結合テスト・QA
```

## 2. 技術実装詳細

### 2-1. チャットアシスタント（Priority 1）

#### システム構成

```
React Frontend (Cloudflare Pages)
    │
    ▼ POST /api/chat
Cloudflare Workers (Hono)
    │
    ├── Supabase: 会話履歴 保存/取得
    │
    ▼ AI Provider API
OpenAI GPT-4o / Anthropic Claude / Google Gemini
```

#### データベーススキーマ（Supabase PostgreSQL）

```sql
-- 会話履歴テーブル
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

#### APIエンドポイント設計

| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/chat` | POST | チャット送信・AI応答取得 |
| `/api/chat/history` | GET | 会話履歴取得 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 |

#### 実装タスク（チャット）

| タスクID | タスク内容 | 担当 | 期限 | ステータス |
|----------|-----------|------|------|------------|
| CHAT-001 | Supabaseプロジェクト初期化 | カルロス | 2/15 | 未着手 |
| CHAT-002 | 認証機能実装（Supabase Auth） | カルロス | 2/16 | 未着手 |
| CHAT-003 | チャットUI実装 | カルロス | 2/17-2/18 | 未着手 |
| CHAT-004 | Cloudflare Workers chat API実装 | カルロス | 2/19-2/20 | 未着手 |
| CHAT-005 | チャット結合テスト | カルロス | 2/21 | 未着手 |

### 2-2. AIレポート生成（Priority 2）

#### 機能要件

- CSV/Excelファイルをアップロード
- 自然言語で分析指示
- AIがデータを分析し、日本語レポート生成
- PDF/Markdownダウンロード

#### システム構成

```
React Frontend
    │
    ▼ POST /api/report/generate
Cloudflare Workers
    │
    ├── Supabase Storage: ファイル一時保存
    │
    ├── CSV/Excel解析: papaparse + xlsx
    │
    ▼ AI Provider API
OpenAI GPT-4o (データ分析 + レポート生成)
```

#### データベーススキーマ

```sql
-- レポート履歴テーブル
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    prompt TEXT NOT NULL,
    result TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

#### APIエンドポイント設計

| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/report/upload` | POST | ファイルアップロード |
| `/api/report/generate` | POST | レポート生成要求 |
| `/api/report/:id` | GET | レポート結果取得 |
| `/api/report/list` | GET | レポート一覧取得 |

### 2-3. テンプレート書類生成（Priority 3）

#### 機能要件

- 見積書・請求書等のテンプレート選択
- 自然言語で情報入力
- AIがテンプレートに情報流し込み
- PDF出力

#### データベーススキーマ

```sql
-- 生成済み書類テーブル
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    generated_content TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

#### テンプレート定義（初期3種）

| Template ID | テンプレート名 | 必須項目 |
|-------------|----------------|----------|
| estimate | 見積書 | 会社名、品目、数量、単価、金額 |
| invoice | 請求書 | 会社名、請求金額、支払期限 |
| thankyou | お礼状 | 会社名、顧客名 |

## 3. テスト戦略

### 3-1. テスト Pyramid

```
        /\
       /  \      E2E Test (Playwright)
      /____\     3 scenarios, 重要flow
     /      \
    /________\   Unit Test (Vitest)
   /          \  カバレッジ目標 80%
  /____________\ Integration Test
```

### 3-2. テストシナリオ

#### E2Eテスト（Playwright）

| テストID | シナリオ | 検証ポイント |
|----------|----------|--------------|
| E2E-001 | ユーザー登録→ログイン→ダッシュボード | 認証フロー正常動作 |
| E2E-002 | チャット送信→AI応答取得 | リアルタイム応答 |
| E2E-003 | CSVアップロード→レポート生成→ダウンロード | エンドツーエンド流程 |

#### ユニットテスト（Vitest）

| テスト対象 | テスト内容 |
|------------|-------------|
| chatApi.ts | メッセージ送信・履歴取得のロジック |
| reportGenerator.ts | CSV解析・プロンプト生成 |
| documentGenerator.ts | テンプレート置換ロジック |
| authUtils.ts | ユーザー認証状態管理 |

#### 結合テスト

| テストID | 範囲 |
|----------|------|
| INT-001 | Frontend → Cloudflare Workers API通信 |
| INT-002 | Cloudflare Workers → Supabase DB |
| INT-003 | Cloudflare Workers → AI Provider API |

### 3-3. テストスケジュール

| フェーズ | 期間 | 内容 |
|----------|------|------|
| ユニットテスト | 開発中 | 実装と同時進行 |
| 結合テスト | 2/27-2/28 | レポート機能完成后 |
| E2Eテスト | 3/6-3/7 | 全機能完成后 |

## 4. 品質保証基準

### 4-1. リリース Gate

| Gate | 基準 | 担当 |
|------|------|------|
| ユニットテストカバレッジ | 80%以上 | カルロス |
| 全結合テスト通過 | 0 failure | カルロス |
| E2Eテスト通過 | 0 failure | カルロス |
| CTOコードレビュー | Approve | マルコ |
| セキュリティチェック | 脆弱性なし | カルロス |

### 4-2. パフォーマンス要件

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| 初期ロード（LCP） | 2秒以内 | Lighthouse |
| チャット応答 | 3秒以内 | 手動測定 |
| レポート生成 | 10秒以内 | テスト環境 |
| 書類生成 | 5秒以内 | テスト環境 |

## 5. リポジトリ構成

MVP実装用のリポジトリ構成は以下の通り。

```
tsumikiri/                      # メインリポジトリ（新規作成）
├── src/
│   ├── components/             # React コンポーネント
│   ├── pages/                  # ページコンポーネント
│   ├── hooks/                  # カスタムフック
│   ├── lib/                    # ユーティリティ
│   │   ├── api.ts              # APIクライアント
│   │   ├── supabase.ts         # Supabase初期化
│   │   └── ai.ts               # AI Providerラッパー
│   └── types/                  # TypeScript型定義
├── api/                        # Cloudflare Workers (Hono)
│   ├── chat.ts                 # チャットAPI
│   ├── report.ts               # レポートAPI
│   └── document.ts             # 書類生成API
├── tests/
│   ├── unit/                   # Vitest
│   ├── integration/            # 結合テスト
│   └── e2e/                    # Playwright
├── docs/                       # 設計書
├── supabase/                   # DBマイグレーション
└── .env.example                # 環境変数テンプレート
```

## 6. 次のアクション

| アクション | 担当 | 期限 | ステータス |
|------------|------|------|------------|
| Supabaseプロジェクト作成 | カルロス | 2/15 | 未着手 |
| GitHubリポジトリ作成 | カルロス | 2/15 | 未着手 |
| 開発環境構築（Cloudflare Wrangler設定） | カルロス | 2/15 | 未着手 |
| 認証機能実装 | カルロス | 2/16 | 未着手 |
| チャットUI実装 | カルロス | 2/17-2/18 | 未着手 |