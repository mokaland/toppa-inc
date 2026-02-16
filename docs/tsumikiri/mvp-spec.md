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
                    ├── 生成されたレポート内容の表示
                    ├── ダウンロードボタン（PDF, Markdown）
                    └── 再分析指示入力欄（任意）

#### データモデル（Supabase PostgreSQL）
```sql
-- レポート履歴テーブル
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT, -- Supabase Storageに保存されたファイルのURL
    prompt TEXT NOT NULL,
    result TEXT, -- AIが生成したレポート内容
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化 (Founding Engineerが実装)
-- ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### APIエンドポイント設計
| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/report/upload` | POST | ファイルアップロード | CSV/ExcelファイルをSupabase Storageに一時保存 |
| `/api/report/generate` | POST | レポート生成 | アップロードされたファイルとプロンプトに基づきAIがレポート生成 |
| `/api/report/history` | GET | レポート履歴取得 | ユーザーの過去のレポート一覧を取得 |
| `/api/report/:id` | GET | 特定レポート取得 | 特定のレポート詳細を取得 |

#### 非機能要件
- **処理速度**: ファイルアップロードからレポート生成完了まで、ファイルサイズに応じて最大30秒以内。
- **ファイルサイズ**: 最大10MBまでのCSV/Excelファイルに対応。
- **セキュリティ**: アップロードされたファイルはユーザー固有のストレージパスに保存され、RLSによりアクセス制御される。
- **データ形式**: CSV (UTF-8), Excel (.xlsx, .xls) に対応。

#### プロンプト設計（例）
```
あなたはビジネスアナリストです。以下のCSVデータとユーザーの指示に基づいて、売上レポートを作成してください。
- データ: [アップロードされたCSVの内容]
- 指示: [ユーザーの自然言語指示]
レポートはMarkdown形式で記述し、主要な分析結果、グラフの提案（データは含まず）、改善提案を含めてください。
```

#### AIプロバイダー選定
- OpenAI GPT-4o (データ分析・レポート生成に特化)
- BYOK対応により、ユーザーが自身のAPIキーを利用可能

#### 実装補足
- ファイルアップロードはSupabase Storageを一時保存先として利用する。
- CSV/Excelファイルの解析には`papaparse`および`xlsx`ライブラリを使用する。

### 機能2: テンプレート書類生成

#### ユーザーストーリー
- 経営者として、見積書や請求書などのテンプレートを選び、「○○社への見積書を作って。金額は35万円、品目は屋根修理」のように自然言語で指示したい。手書きやWordでの作成時間を短縮するため。
- 経営者として、AIが生成した書類をプレビューで確認し、必要であれば修正してからPDFで出力したい。間違いがあると信用問題になるため。
- 経営者として、よく使うテンプレートを登録・管理したい。毎回同じ内容を入力する手間を省くため。

#### 画面遷移
ダッシュボード → 書類生成
              ├── テンプレート選択画面（見積書、請求書、お礼状など一覧表示）
              │     └── テンプレート選択後、次の画面へ
              ├── 情報入力画面
              │     ├── 自然言語入力欄（例: 「○○社へ△△の見積書を」）
              │     ├── フォーム入力欄（任意、項目はテンプレートにより異なる）
              │     └── 生成ボタン押下で処理開始
              ├── プレビュー画面
              │     ├── 生成された書類内容の表示
              │     ├── 修正入力欄（任意）
              │     └── PDF出力ボタン
              └── 書類履歴画面
                    ├── 生成された書類の一覧表示
                    └── 各書類の詳細表示・再出力

#### データモデル（Supabase PostgreSQL）
```sql
-- テンプレート管理テーブル
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- テンプレート名（例: 見積書、請求書）
    type VARCHAR(50) NOT NULL, -- テンプレート種別（見積書, 請求書, その他）
    content TEXT NOT NULL, -- テンプレートのMarkdown/HTML形式内容（プレースホルダー含む）
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成書類履歴テーブル
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- 生成された書類のタイトル
    content TEXT NOT NULL, -- 生成された書類の最終内容
    file_url TEXT, -- 生成されたPDFのURL（Supabase Storage）
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化 (Founding Engineerが実装)
-- ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own templates" ON templates FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own templates" ON templates FOR INSERT WITH CHECK (auth.uid() = user_id);
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### APIエンドポイント設計
| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/template/list` | GET | テンプレート一覧取得 | ユーザーが利用可能なテンプレート一覧を取得 |
| `/api/template/generate` | POST | 書類生成 | テンプレートと入力情報に基づきAIが書類を生成 |
| `/api/document/history` | GET | 生成書類履歴取得 | ユーザーの過去の生成書類一覧を取得 |
| `/api/document/:id` | GET | 特定書類取得 | 特定の生成書類詳細を取得 |
| `/api/document/:id/pdf` | GET | PDFダウンロード | 生成された書類のPDFをダウンロード |

#### 非機能要件
- **処理速度**: 指示入力から書類プレビュー表示まで、最大5秒以内。
- **テンプレート**: 初期状態で5種類の基本テンプレート（見積書、請求書、お礼状、会議議事録、日報）を提供する。
- **セキュリティ**: 生成された書類はユーザー固有のストレージパスに保存され、RLSによりアクセス制御される。

#### プロンプト設計（例）
```
あなたはビジネスアシスタントです。以下のテンプレートとユーザーの指示に基づいて、書類を作成してください。
- テンプレート: [選択されたテンプレートの内容（プレースホルダー含む）]
- 指示: [ユーザーの自然言語指示]
生成される書類はMarkdown形式で記述し、テンプレートのプレースホルダーを適切に埋めてください。
```

#### AIプロバイダー選定
- OpenAI GPT-4o / Anthropic Claude (自然言語処理・文章生成に特化)
- BYOK対応により、ユーザーが自身のAPIキーを利用可能

#### 実装補足
- テンプレートの管理および生成された書類の保存にはSupabaseを利用する。
- メール添付送信機能はPhase 2での実装となるため、MVPではPDF出力までをスコープとする。

### 機能3: チャットアシスタント

#### ユーザーストーリー
- 経営者として、何でも聞ける経営者向けのAIチャットと会話したい。事業に関する質問、アドバイス、文章作成など、気軽に相談できる相手が欲しいから。
- 経営者として、過去の会話履歴を保持してほしい。以前の文脈を踏まえて会話を続けたいから。
- 経営者として、スマホからでもチャットを利用したい。移動中や外出先でも相談できるようにするため。

#### 画面遷移
ダッシュボード → チャット
              ├── 会話履歴リスト（過去のチャットセッション一覧）
              │     └── セッション選択で詳細表示
              ├── チャット画面
              │     ├── メッセージ入力欄
              │     ├── 送信ボタン
              │     ├── 会話履歴表示エリア（AIとユーザーのメッセージが時系列で表示）
              │     └── 新規チャット開始ボタン
              └── 設定
                    └── チャット関連設定（例: AIのパーソナリティ設定など、Phase 2以降）

#### データモデル（Supabase PostgreSQL）
```sql
-- 会話履歴テーブル
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化 (Founding Engineerが実装)
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### APIエンドポイント設計
| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/chat` | POST | チャット送信・AI応答取得 | ユーザーメッセージを送信し、AIの応答を取得 |
| `/api/chat/history` | GET | 会話履歴取得 | ユーザーの過去のチャットセッション一覧を取得 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | 特定のチャットセッションの全メッセージを取得 |

#### 非機能要件
- **レスポンス**: AIの応答は3秒以内。
- **コンテキスト保持**: 過去の会話履歴を最大20ターンまで保持し、AIの応答に反映させる。
- **可用性**: 99.5%以上。
- **セキュリティ**: 会話内容は暗号化され、ユーザー固有のデータとして管理される。

#### プロンプト設計（例）
```
あなたは中小企業の経営者向けAI事務アシスタント「ツミキリ」です。
経営者の悩みや質問に対し、的確なアドバイスや情報を提供してください。
- ユーザーの質問: [ユーザーの入力メッセージ]
- 過去の会話履歴: [直近の会話履歴]
```

#### AIプロバイダー選定
- OpenAI GPT-4o / Anthropic Claude / Google Gemini (汎用的なチャットに特化)
- BYOK対応により、ユーザーが自身のAPIキーを利用可能
