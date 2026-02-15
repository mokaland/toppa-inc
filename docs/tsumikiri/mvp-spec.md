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

#### APIエンドポイント設計
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/chat` | POST | チャット送信・AI応答取得 |
| `/api/chat/history` | GET | 会話履歴取得 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 |

### 機能2: AIレポート生成（MVP実装中）

CSVまたはExcelファイルをアップロードし、自然言語で指示することで、AIがデータを分析し、日本語のレポートを生成する。PDF/Markdownでダウンロード可能。Founding EngineerによりファイルアップロードAPIの骨子が実装済み。

#### ユーザーストーリー
1. 経営者として、CSVをアップロードして「今月の売上を部門別にまとめて」と言いたい。事務員に頼む手間を省くため。
2. 経営者として、AIが生成したレポートをPDF/Markdown形式でダウンロードしたい。社内会議で共有するため。
3. 経営者として、複数のCSVファイルをアップロードし、「先月と今月の売上を比較して、差異を分析するレポートを作成して」と指示したい。月ごとの業績変化を素早く把握するため。
4. 経営者として、アップロードしたデータの中から「最も利益率の高い顧客層を特定して」と指示し、今後の営業戦略に活かしたい。
5. 経営者として、AIが生成したレポートの内容について、「この部分をもっと詳しく説明して」と追加で質問したい。レポートの理解を深めるため。

#### 画面遷移
`ダッシュボード → レポート生成`
- ファイルアップロード画面: CSV/Excelファイルをドラッグ＆ドロップまたは選択するエリアと、分析指示を入力するテキストエリアがある。
- レポート表示画面: AIが生成したレポートが表示され、PDF/Markdownダウンロードボタンがある。
- レポート内容に関する追加質問用のチャットインターフェース。

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

#### APIエンドポイント設計
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/report/upload` | POST | ファイルアップロード |
| `/api/report/generate` | POST | レポート生成 |
| `/api/report/:reportId` | GET | 特定レポート取得 |
| `/api/report/download/:reportId` | GET | レポートダウンロード |
| `/api/report/chat` | POST | レポート内容に関する質問・追加分析指示 |

### 機能3: テンプレート書類生成（MVP設計中）

見積書・請求書・お礼状などのテンプレートを用意し、自然言語またはフォーム入力で情報を流し込み、AIが書類を生成する。PDF出力に対応。

#### ユーザーストーリー
1. 経営者として、「○○建設さんへ、屋根修理の見積書を作って。金額は35万円」のように自然言語で指示したい。書類作成の手間を省くため。
2. 経営者として、AIが生成した書類をプレビューで確認し、必要に応じて修正してから確定したい。間違いがあると信用問題だから。
3. 経営者として、生成された書類をPDFで出力したい。顧客にメールで送付するため。
4. 経営者として、既存の契約書テンプレートを編集し、自社独自の項目を追加したい。毎回手動で修正する手間を省くため。
5. 経営者として、生成された請求書を直接メールで顧客に送信したい。郵送や手動添付の手間をなくすため。

#### 画面遷移
`ダッシュボード → 書類生成`
- テンプレート選択画面: 見積書、請求書、契約書などのテンプレート一覧が表示される。
- 情報入力画面: 選択したテンプレートに基づき、自然言語入力フィールドまたはフォームが表示される。
- プレビュー画面: AIが生成した書類のプレビューが表示され、修正機能、PDF出力ボタン、メール送信ボタンがある。

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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'quotation', 'invoice', 'contract' etc.
    template_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own templates"
    ON templates FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

#### APIエンドポイント設計
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/template/list` | GET | テンプレート一覧取得 |
| `/api/template/create` | POST | 新規テンプレート作成 |
| `/api/template/edit/:templateId` | PUT | テンプレート編集 |
| `/api/document/generate` | POST | 書類生成 |
| `/api/document/preview` | POST | 書類プレビュー |
| `/api/document/download/:documentId` | GET | 書類PDFダウンロード |
| `/api/document/send_email/:documentId` | POST | 生成書類をメール送信 |

## 5. 非機能要件

- レスポンス: チャット応答3秒以内
- 可用性: 99.5%以上
- セキュリティ: データ暗号化（at-rest, in-transit）、SOC2準拠を目指す
- 対応ブラウザ: Chrome, Safari, Edge（最新2バージョン）
- スマホ: iOS Safari, Android Chrome 対応
- BYOK（Bring Your Own Key）対応: ユーザーが自身のAI APIキーを設定し、利用量を自己管理できる。

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

## 8. 成功指標（Q1 KPI）

- プロダクト: MVP 3機能の実装完了 & デプロイ
- ユーザー: ベータユーザー10名獲得
- コンテンツ: X投稿12本 + YouTube 1本
- GitHub: AI自律コミット50件以上
- フォロワー: Xアカウントフォロワー100名
