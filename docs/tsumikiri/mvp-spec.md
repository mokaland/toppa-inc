# ツミキリ（Tsumikiri）— MVPプロダクト仕様書

> 作成: PdM キム・スジン
> 日付: 2026-02-16
> ステータス: ユーザーストーリー追加、詳細化進行中
> レビュー: CEO 高橋レン

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

### 機能1: チャットアシスタント（MVP実装完了）

経営者向けの何でも聞けるAIチャット。事業に関する質問、アドバイス、文章作成などに対応し、過去の会話履歴を保持する。Founding EngineerによりMVP実装が完了している。

#### ユーザーストーリー
1. 経営者として、「この契約書の注意点を教えて」と相談したい。弁護士に聞くほどでもないが不安だから。
2. 経営者として、スマホからでも操作したい。現場や移動中に使うため。
3. 経営者として、過去の会話履歴を参照したい。以前の相談内容を忘れてしまった場合でも、文脈を維持した会話を続けるため。
4. 経営者として、AIアシスタントに特定の業務フローを学習させたい。RPAのように定型業務を自動化するため。

#### 画面遷移
`ログイン → ダッシュボード → チャット`
- チャット画面: 過去の会話履歴が表示され、新しいメッセージを入力できるテキストエリアと送信ボタンがある。
- メッセージ入力後、AIからの応答がリアルタイムで表示される。

#### データモデル（Supabase PostgreSQL: `chat_messages`テーブル）

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
    ON chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### 機能2: AIレポート生成（MVP実装中）

CSVまたはExcelファイルをアップロードし、自然言語で指示することでAIがデータを分析し、日本語のレポートを生成する。Founding Engineerにより実装が進行中。

#### ユーザーストーリー
1. 経営者として、CSVをアップロードして「今月の売上まとめて」と言いたい。事務員に頼む手間を省くため。
2. 経営者として、AIが生成したレポートをPDFでダウンロードしたい。会議資料として利用するため。
3. 経営者として、レポート生成時にデータのフィルタリング条件を指定したい。特定の期間や部門のデータだけを分析するため。
4. 経営者として、生成されたレポートを他のメンバーと共有したい。経営判断に役立てるため。
5. 経営者として、レポートのグラフの種類を選択したい。視覚的に分かりやすくするため。

#### 画面遷移
`ログイン → ダッシュボード → レポート生成`
- ファイルアップロード画面: CSV/Excelファイルをドラッグ＆ドロップまたは選択してアップロード。
- 指示入力画面: 自然言語でレポートの分析指示を入力。フィルタリング条件などもここで指定。
- レポート表示画面: AIが生成したレポートが表示され、PDF/Markdown形式でダウンロードできるボタンがある。

#### データモデル（Supabase PostgreSQL: `reports`テーブル）

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    prompt TEXT NOT NULL,
    result TEXT,
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

### 機能3: テンプレート書類生成（MVP設計中）

見積書・請求書・お礼状などのテンプレートを用意し、自然言語で指示することでAIがテンプレートに情報を流し込み、書類を生成する。

#### ユーザーストーリー
1. 経営者として、「○○社に見積書を送って」と言いたい。書類作成に30分かかるのを3分にするため。
2. 経営者として、AIが作った書類をプレビューしてから確定したい。間違いがあると信用問題だから。
3. 経営者として、テンプレートにない項目も自由に追加して書類を作成したい。柔軟な対応が必要だから。
4. 経営者として、作成した書類をメールで直接送信したい。送信の手間を省くため。
5. 経営者として、作成した書類の履歴を管理したい。過去の取引内容を確認するため。
6. 経営者として、請求書の支払い期日を自動で設定したい。未払いを防ぐため。

#### 画面遷移
`ログイン → ダッシュボード → 書類生成`
- テンプレート選択画面: 見積書、請求書、お礼状などのテンプレート一覧から選択。
- 情報入力画面: 自然言語またはフォームで、書類に記載する情報を入力。
- プレビュー画面: AIが生成した書類の内容を確認。修正が必要な場合は編集可能。
- 出力・送信画面: PDF出力ボタン、またはメール送信ボタン（Phase 2）。

#### データモデル（Supabase PostgreSQL: `documents`テーブル, `templates`テーブル）

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'invoice', 'quotation', 'letter' etc.
    content_template TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view templates"
    ON templates FOR SELECT
    USING (true); -- テンプレートは全ユーザーが閲覧可能
```

## 5. 非機能要件

- レスポンス: チャット応答3秒以内
- 可用性: 99.5%以上
- セキュリティ: データ暗号化（at-rest, in-transit）、SOC2準拠を目指す
- 対応ブラウザ: Chrome, Safari, Edge（最新2バージョン）
- スマホ: iOS Safari, Android Chrome 対応

## 6. 差別化ポイント

| 競合 | ツミキリの優位性 |
|------|-----------------|
| ChatGPT / Claude | 経営者特化のUI。書類テンプレート。データ管理機能 |
| freee / マネーフォワード | AI自然言語操作。会計以外の事務も対応 |
| 事務代行サービス | 月額¥2,980で24時間対応。人件費の1/10以下 |

## 7. 収益モデル

| プラン | 価格 | 内容 |
|--------|------|------|
| Free | ¥0 | 月10タスク、基本テンプレート3種 |
| Pro | ¥2,980/月 | 無制限タスク、全テンプレート、データ保持90日 |
| BYOK | ¥0（APIキー自前） | Pro機能利用可、API費用は自己負担 |

## 8. 成功指標

- ローンチ1ヶ月: ユーザー登録100名、有料転換5名
- ローンチ3ヶ月: ユーザー登録500名、有料転換25名、MRR ¥74,500
- NPS: 40以上（経営者からの推薦意向）
