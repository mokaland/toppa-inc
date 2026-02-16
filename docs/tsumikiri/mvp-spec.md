# ツミキリ MVPプロダクト仕様書

> 作成: PdM キム・スジン
> 日付: 2026-02-16
> ステータス: 進行中

## 1. プロダクト概要

**ツミキリ**は、中小企業の経営者が「事務作業の山」から解放されるためのAIアシスタント。自然言語で指示するだけで、日常の事務作業をAIが代行する。

### 名前の由来

「詰み」を「切り開く」→ ツミキリ。経営者の"詰み"状態を突破するという意味。

## 2. ターゲットユーザー

### ペルソナ: 田中 誠一（52歳）
- **職業**: 建設業の社長（従業員12名）
- **課題**: 現場監督しながら見積書・請求書・日報管理。事務員は1人だが追いつかない
- **ITリテラシー**: LINEとExcelは使える。専門ツールは苦手
- **予算**: 月3,000円以内なら即決。1万円超えると妻（経理担当）に相談
- **口癖**: 「事務仕事さえなければ、もっと現場に出られるのに」

### ペルソナ: 佐藤 美咲（38歳）
- **職業**: 美容サロンオーナー（スタッフ5名）
- **課題**: 予約管理・顧客フォロー・SNS投稿・経理を一人でこなしている
- **ITリテラシー**: InstagramとCanvaは使いこなす。Excelは苦手
- **予算**: 効果が見えれば月5,000円OK
- **口癖**: 「やりたいことはあるのに、手が足りない」

## 3. 解決する"詰み"

| 詰みの種類 | 具体例 | ツミキリの解決方法 |
|-----------|--------|------------------|
| 書類作成の山 | 見積書・請求書・契約書 | テンプレート + AI自動生成 |
| データ集計 | 売上集計・日報まとめ | CSV/Excelアップロード → AI分析 |
| メール対応 | 問い合わせ・フォローアップ | AIが下書き生成 → 確認して送信 |
| 情報整理 | 会議メモ・タスク管理 | 自然言語で入力 → 自動整理 |

## 4. MVP機能詳細

### 機能1: AIレポート生成

#### ユーザーストーリー
- 経営者として、CSVやExcelファイルをアップロードして「今月の売上を部門別にまとめて。特に利益率の高い部門を教えて」のように自然言語で指示したい。事務員に頼む手間を省き、より深い洞察を得るため。
- 経営者として、AIが作ったレポートをPDF/Markdownでダウンロードしたい。社内会議資料や取引先への説明資料として活用するため。
- 経営者として、データアップロードからレポート生成までの一連の処理状況を画面で確認したい。エラー発生時にも原因を把握し、再試行できるようにするため。

#### 画面遷移
ダッシュボード → レポート生成
              ├── ファイルアップロード画面（ドラッグ＆ドロップ、ファイル選択ボタン）
              │     ├── ファイル選択後、ファイル名とサイズが表示される
              │     └── アップロードボタン押下で処理開始
              ├── 処理中画面（プログレスバー、処理状況メッセージ）
              │     └── 処理キャンセルボタン（任意）
              └── レポート表示画面
                    ├── 生成されたレポートの表示エリア
                    ├── ダウンロードボタン（PDF/Markdown形式）
                    └── 履歴一覧へのリンク

#### データモデル（Supabase PostgreSQL）

```sql
-- レポート履歴テーブル
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT, -- アップロードされたファイルのURL (Supabase Storage)
    prompt TEXT NOT NULL, -- ユーザーの指示プロンプト
    result TEXT, -- AIが生成したレポート内容 (Markdown形式)
    status VARCHAR(50) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE POLICY "Users can update own reports"
    ON reports FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
    ON reports FOR DELETE
    USING (auth.uid() = user_id);
```

#### APIエンドポイント設計

| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/reports/upload` | POST | CSV/Excelファイルアップロード |
| `/api/reports/generate` | POST | AIレポート生成指示（ファイルIDとプロンプトを送信） |
| `/api/reports/:id` | GET | 特定レポートの詳細取得 |
| `/api/reports` | GET | 全レポート履歴取得 |
| `/api/reports/:id/download/pdf` | GET | レポートのPDFダウンロード |
| `/api/reports/:id/download/md` | GET | レポートのMarkdownダウンロード |

#### 非機能要件
- **ファイルサイズ**: 最大10MBまでのCSV/Excelファイルをサポート。
- **処理速度**: ファイルアップロードからレポート表示まで、平均10秒以内。大規模データでも30秒以内。
- **対応フォーマット**: CSV, XLSX, XLSに対応。
- **エラーハンドリング**: ファイル形式エラー、AI生成エラーなどをユーザーに分かりやすく通知。

### 機能2: テンプレート書類生成

#### ユーザーストーリー
- 経営者として、「○○建設さんへ、屋根修理の見積書を作って。金額は35万円」のように自然言語で指示したい。書類作成に30分かかるのを3分にするため。
- 経営者として、AIが生成した書類をプレビューで確認してから確定したい。間違いがあると信用問題になるため。
- 経営者として、生成した書類をPDFでダウンロードしたい。紙での提出やメール添付で送付するため。
- 経営者として、よく使う書類のテンプレートを登録・編集したい。自社のフォーマットに合わせて効率的に書類を作成するため。
- 経営者として、過去に生成した書類を検索・参照したい。「先月の○○社の見積書どこだっけ？」をなくすため。

#### 画面遷移
ダッシュボード → 書類生成
              ├── テンプレート選択画面（見積書、請求書、お礼状など一覧表示）
              │     └── テンプレート選択 → 情報入力画面へ
              ├── 情報入力画面（自然言語入力フィールド、またはフォーム）
              │     ├── 自然言語で指示入力後、AIがフォームを自動補完
              │     └── フォームで直接入力も可能
              │     └── プレビューボタン押下でプレビュー画面へ
              └── プレビュー画面
                    ├── 生成された書類の表示
                    ├── 修正ボタン（情報入力画面に戻る）
                    └── PDF出力ボタン

#### データモデル（Supabase PostgreSQL）

```sql
-- 書類テンプレートテーブル
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_content TEXT NOT NULL, -- Markdown形式またはHTML形式でテンプレート内容を保存
    template_type VARCHAR(50) NOT NULL, -- '見積書', '請求書', 'お礼状' など
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成された書類テーブル
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    document_name VARCHAR(255) NOT NULL,
    generated_content TEXT NOT NULL, -- 生成された書類の最終内容
    pdf_url TEXT, -- 生成されたPDFのURL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- ユーザーポリシー (document_templates)
CREATE POLICY "Users can view own templates"
    ON document_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
    ON document_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
    ON document_templates FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
    ON document_templates FOR DELETE
    USING (auth.uid() = user_id);

-- ユーザーポリシー (generated_documents)
CREATE POLICY "Users can view own generated documents"
    ON generated_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated documents"
    ON generated_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated documents"
    ON generated_documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated documents"
    ON generated_documents FOR DELETE
    USING (auth.uid() = user_id);
```

#### APIエンドポイント設計

| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/documents/templates` | GET | 登録済みテンプレート一覧取得 |
| `/api/documents/templates` | POST | 新規テンプレート登録 |
| `/api/documents/templates/:id` | GET | 特定テンプレート詳細取得 |
| `/api/documents/templates/:id` | PUT | テンプレート更新 |
| `/api/documents/templates/:id` | DELETE | テンプレート削除 |
| `/api/documents/generate` | POST | 自然言語指示またはフォーム入力で書類生成 |
| `/api/documents/generated` | GET | 生成済み書類一覧取得 |
| `/api/documents/generated/:id` | GET | 特定の生成済み書類詳細取得 |
| `/api/documents/generated/:id/pdf` | GET | 生成済み書類のPDFダウンロード |

#### 非機能要件
- **応答速度**: 書類生成APIは5秒以内。テンプレート一覧取得は1秒以内。
- **セキュリティ**: テンプレート内容や生成済み書類はユーザーごとに厳密にアクセス制御。Supabase RLSを適切に設定。
- **拡張性**: 将来的にWord/Google Docs形式での出力にも対応できるよう、中間表現を考慮した設計。
- **プレビュー精度**: 生成された書類のプレビューは、最終PDF出力とほぼ同一のレイアウト・内容であること。

### 機能3: チャットアシスタント

#### ユーザーストーリー
- 経営者として、何でも聞けるAIチャットで事業に関する質問やアドバイスを受けたい。経営の"詰み"を相談し、解決策のヒントを得るため。
- 経営者として、過去の会話履歴を保持してほしい。同じ質問を繰り返す手間を省き、文脈を理解した応答を得るため。
- 経営者として、チャットの応答が自然で、まるで人間と話しているような体験をしたい。ストレスなくスムーズにコミュニケーションを取るため。
- 経営者として、チャットで文章作成やアイデア出しを手伝ってほしい。マーケティング文言や企画書の骨子など、多岐にわたる業務に活用するため。

#### 画面遷移
ダッシュボード → チャット
              ├── 会話履歴一覧（過去のチャットセッションを一覧表示）
              │     └── セッション選択 → 特定セッションの会話表示へ
              ├── 特定セッションの会話表示
              │     ├── ユーザー入力フォーム
              │     ├── AI応答表示エリア
              │     └── 送信ボタン
              └── 新規チャット開始ボタン

#### データモデル（Supabase PostgreSQL）

```sql
-- 会話履歴テーブル
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')), -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    session_id UUID NOT NULL, -- 会話セッションを識別するID
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
| `/api/chat` | POST | チャット送信・AI応答取得（新規セッションまたは既存セッションへの追加） |
| `/api/chat/history` | GET | 全会話セッション履歴の概要取得 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの会話履歴取得 |

#### 非機能要件
- **応答速度**: 平均3秒以内。
- **コンテキスト維持**: 過去10ターン程度の会話履歴をAIが記憶し、文脈を維持した応答が可能。
- **堅牢性**: AIプロバイダーとの連携エラー発生時でも、ユーザーに適切なフィードバックを提供し、再試行を促す。
- **トーン＆マナー**: 経営者向けに、丁寧かつ的確なアドバイスを提供できるプロンプト設計。
