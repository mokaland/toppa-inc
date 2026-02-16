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
                    ├── 生成されたレポートのプレビュー
                    ├── PDFダウンロードボタン
                    ├── Markdownダウンロードボタン
                    └── 編集・再生成ボタン（Phase 2）

#### データモデル（Supabase PostgreSQL）
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255),
    original_file_url TEXT, -- Supabase StorageのURL
    prompt TEXT NOT NULL,
    generated_report_content TEXT,
    generated_report_url TEXT, -- Supabase StorageのURL (PDF/Markdown)
    status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
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
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports"
    ON reports FOR DELETE
    USING (auth.uid() = user_id);
```

#### APIエンドポイント（Cloudflare Workers）
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/report/upload` | POST | ファイルアップロード（Supabase Storageへ） |
| `/api/report/generate` | POST | レポート生成指示（ファイルURLとプロンプトを送信） |
| `/api/report/:reportId` | GET | 特定レポートの取得 |
| `/api/reports` | GET | ユーザーの全レポート一覧取得 |

#### 非機能要件
- ファイルアップロード上限: 10MB
- レポート生成応答時間: データ量によるが、最大30秒以内
- 対応ファイル形式: CSV, XLSX
- データ保持期間: Freeプランは30日、Proプランは90日

### 機能2: テンプレート書類生成

#### ユーザーストーリー
- 経営者として、「○○社へ、屋根修理の見積書を作って。金額は35万円」のように自然言語で指示したい。書類作成の手間と時間を大幅に削減するため。
- 経営者として、AIが生成した書類をプレビューで確認してからPDFで出力したい。誤字脱字や内容の誤りを防ぎ、顧客への信頼を損ねないため。
- 経営者として、よく使う書類のテンプレートを登録・管理したい。定型業務の効率をさらに高めるため。
- 経営者として、スマホからでも見積書や請求書を作成したい。外出先や移動中に急な依頼に対応するため。

#### 画面遷移
ダッシュボード → 書類生成
              ├── テンプレート選択画面（見積書、請求書、お礼状などのリスト）
              │     └── テンプレート選択後、次のステップへ
              ├── 情報入力画面（自然言語入力フィールド、またはフォーム形式）
              │     ├── 自然言語で指示（例: 「○○建設さんへ、屋根修理の見積書を作って。金額は35万円、納期は3月末」）
              │     └── 必要に応じてフォームで詳細情報を補完
              ├── プレビュー画面
              │     ├── AIが生成した書類のプレビュー表示
              │     └── 修正指示入力フィールド（任意）
              └── 出力完了画面
                    ├── PDFダウンロードボタン
                    ├── メール添付送信ボタン（Phase 2）
                    └── 新しい書類作成に戻るボタン

#### データモデル（Supabase PostgreSQL）
```sql
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- nullの場合はシステム提供テンプレート
    name VARCHAR(255) NOT NULL,
    template_content TEXT NOT NULL, -- Markdown形式または特定の記法で記述
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    generated_content TEXT, -- 生成された書類の内容
    generated_pdf_url TEXT, -- Supabase StorageのURL
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'sent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS有効化
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
-- ユーザーポリシー (document_templates)
CREATE POLICY "Users can view all templates"
    ON document_templates FOR SELECT
    USING (true); -- システムテンプレートも含むため全ユーザー参照可
CREATE POLICY "Users can insert own templates"
    ON document_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates"
    ON document_templates FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates"
    ON document_templates FOR DELETE
    USING (auth.uid() = user_id);
-- ユーザーポリシー (generated_documents)
CREATE POLICY "Users can view own documents"
    ON generated_documents FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents"
    ON generated_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents"
    ON generated_documents FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents"
    ON generated_documents FOR DELETE
    USING (auth.uid() = user_id);
```

#### APIエンドポイント（Cloudflare Workers）
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/templates` | GET | 全テンプレート一覧取得 |
| `/api/templates` | POST | 新規テンプレート登録 |
| `/api/templates/:templateId` | GET | 特定テンプレート取得 |
| `/api/templates/:templateId` | PUT | テンプレート更新 |
| `/api/documents/generate` | POST | 書類生成指示（テンプレートIDとプロンプトを送信） |
| `/api/documents/:documentId` | GET | 特定書類の取得 |
| `/api/documents/:documentId/pdf` | GET | PDFダウンロード |

#### 非機能要件
- 書類生成応答時間: 最大10秒以内
- テンプレート登録数: Freeプランは3個、Proプランは無制限
- 生成書類のデータ保持期間: Freeプランは30日、Proプランは90日

### 機能3: チャットアシスタント

#### ユーザーストーリー
- 経営者として、何でも気軽に相談できるAIチャットが欲しい。事業に関する漠然とした悩みや、ちょっとした文章作成を手伝ってほしいから。
- 経営者として、過去の会話履歴が保持されていて、文脈を理解した上で応答してほしい。同じ話を何度も繰り返す手間を省きたいから。
- 経営者として、スマホアプリのような直感的で使いやすいチャットUIで利用したい。忙しい合間にもサッと使えるようにするため。
- 経営者として、AIアシスタントが経営者の"詰み"に特化したアドバイスをくれると嬉しい。一般的なAIでは得られない専門的な視点が欲しいから。

#### 画面遷移
ダッシュボード → チャット
              ├── チャット履歴リスト（セッションごとに表示）
              │     └── 履歴選択で過去の会話を表示
              ├── チャット画面
              │     ├── メッセージ入力フィールド
              │     ├── 送信ボタン（Enterキーでも送信）
              │     ├── AI応答表示エリア
              │     └── ローディング表示（AI応答生成中）
              └── 設定（チャット関連）
                    └── プロンプトのカスタマイズ（Phase 2）

#### データモデル（Supabase PostgreSQL）
```sql
-- 会話履歴テーブル
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL, -- 会話セッションID
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

#### APIエンドポイント（Cloudflare Workers）
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/chat` | POST | チャットメッセージ送信・AI応答取得 |
| `/api/chat/history` | GET | ユーザーの全会話セッション履歴取得 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの会話履歴取得 |
| `/api/chat/new-session` | POST | 新しいチャットセッションを開始 |

#### 非機能要件
- AI応答速度: 3秒以内（初回応答）
- 会話履歴保持期間: Freeプランは30日、Proプランは90日
- 同時接続数: 1セッションにつき1ユーザー
- AI応答のトーン＆マナー: 丁寧語、敬語を基本とし、経営者の課題解決に寄り添う姿勢

## 5. ユーザーストーリー

1. 経営者として、CSVをアップロードして「今月の売上まとめて」と言いたい。事務員に頼む手間を省くため。
2. 経営者として、「○○社に見積書を送って」と言いたい。書類作成に30分かかるのを3分にするため。
3. 経営者として、「この契約書の注意点を教えて」と相談したい。弁護士に聞くほどでもないが不安だから。
4. 経営者として、スマホからでも操作したい。現場や移動中に使うため。
5. 経営者として、自分のAPIキーを使いたい。コストを自分でコントロールするため。
6. 経営者として、過去の書類を検索したい。「先月の○○社の見積書どこだっけ？」をなくすため。
7. 経営者として、日報を音声で入力したい。キーボードが苦手だから。
8. 経営者として、AIが作った書類をプレビューしてから確定したい。間違いがあると信用問題だから。
9. 経営者として、月額の利用料を事前に知りたい。予算オーバーが怖いから。
10. 経営者として、データが安全に管理されていると安心したい。顧客情報を扱うから。

## 6. AIプロバイダーとプロンプト設計

### 6-1. AIプロバイダーの選定方針
- **主要プロバイダー**: OpenAI GPT-4o, Anthropic Claude, Google Geminiを主要なAIプロバイダーとして採用する。
- **BYOK対応**: ユーザーが自身のAPIキー（BYOK: Bring Your Own Key）を利用できるオプションを提供する。これにより、ユーザーは利用コストを自己負担することで、無料枠を超えた利用や、特定のAIモデルを選択できる柔軟性を持つ。
- **モデル選択の優先順位**:
    1. ユーザーがBYOKで指定したモデル
    2. ツミキリが提供するデフォルトのAIプロバイダー（コストパフォーマンスと性能を考慮し、随時見直し）

### 6-2. プロンプト設計の基本方針
ツミキリのAIアシスタントは、経営者特化のAIとして、以下の原則に基づきプロンプトを設計する。

1.  **明確な役割定義**: AIに「あなたは中小企業の経営者をサポートする優秀なAI事務アシスタントです」といった具体的な役割を与える。
2.  **タスク指示の明確化**: 各機能において、AIが実行すべきタスクを具体的に指示する。「〜を作成してください」「〜を分析してください」など。
3.  **制約条件の明示**: 出力形式（例: Markdown形式、PDF形式）、文字数制限、含めるべき情報・含めてはならない情報などを明確に指示する。
4.  **出力フォーマットの指定**: 構造化された出力（例: JSON、表形式）が必要な場合は、そのフォーマットを詳細に指定する。
5.  **コンテキストの活用**: チャットアシスタント機能では、過去の会話履歴をコンテキストとしてAIに渡し、一貫性のある応答を促す。レポート生成や書類生成では、アップロードされたファイル内容やユーザー入力情報を最大限に活用する。
6.  **トーン＆マナー**: 経営者が信頼できる、丁寧かつ分かりやすい言葉遣いを指示する。専門用語の使用は控えめにし、必要に応じて解説を加える。
7.  **エラーハンドリング**: 不明な指示や不適切な入力に対しては、明確にその旨を伝え、適切な再入力を促すよう指示する。

#### 6-2-1. チャットアシスタントにおけるプロンプト設計
- ユーザーの質問に対して、経営者の視点に立ち、具体的なアドバイスや情報提供を行う。
- 曖昧な質問に対しては、追加情報を求める質問を返す。
- 過去の会話履歴を考慮し、文脈に沿った応答を生成する。

#### 6-2-2. AIレポート生成におけるプロンプト設計
- アップロードされたデータ（CSV/Excel）の内容を正確に理解し、ユーザーの指示に基づいた分析を行う。
- 分析結果は、経営者が意思決定に活用しやすいように、要点や示唆をまとめた形式で出力する。
- グラフや表形式での表現が効果的な場合は、その旨を指示する。

#### 6-2-3. テンプレート書類生成におけるプロンプト設計
- ユーザーが選択したテンプレートと入力情報に基づき、正確かつ自然な日本語で書類を生成する。
- 金額や日付などの数値データは、指定されたフォーマットに従って記述する。
- 法務・税務に関するアドバイスは行わず、あくまで書類作成の補助に徹するよう指示する。

## 7. 画面遷移

```
ログイン → ダッシュボード
              ├── チャット（機能3）
              ├── レポート生成（機能1）
              │     ├── ファイルアップロード
              │     └── レポート表示 → ダウンロード
              ├── 書類生成（機能2）
              │     ├── テンプレート選択
              │     ├── 情報入力（自然言語 or フォーム）
              │     └── プレビュー → PDF出力
              └── 設定
                    ├── APIキー設定（BYOK）
                    ├── プロフィール
                    └── プラン管理
```

## 8. 非機能要件

- レスポンス: チャット応答3秒以内
- 可用性: 99.5%以上
- セキュリティ: データ暗号化（at-rest, in-transit）、SOC2準拠を目指す
- 対応ブラウザ: Chrome, Safari, Edge（最新2バージョン）
- スマホ: iOS Safari, Android Chrome 対応

## 9. 差別化ポイント

| 競合 | ツミキリの優位性 |
|------|-----------------|
| ChatGPT / Claude | 経営者特化のUI。書類テンプレート。データ管理機能 |
| freee / マネーフォワード | AI自然言語操作。会計以外の事務も対応 |
| 事務代行サービス | 月額¥2,980で24時間対応。人件費の1/10以下 |

## 10. 収益モデル

| プラン | 価格 | 内容 |
|--------|------|------|
| Free | ¥0 | 月10タスク、基本テンプレート3種 |
| Pro | ¥2,980/月 | 無制限タスク、全テンプレート、データ保持90日 |
| BYOK | ¥0（APIキー自前） | Pro機能利用可、API費用は自己負担 |

## 11. 成功指標

- ローンチ1ヶ月: ユーザー登録100名、有料転換5名
- ローンチ3ヶ月: ユーザー登録500名、有料転換25名、MRR ¥74,500
- NPS: 40以上（経営者からの推薦意向）
