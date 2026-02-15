# ツミキリ（Tsumikiri）— MVPプロダクト仕様書

> 作成: PdM キム・スジン
> 日付: 2026-02-15
> ステータス: 詳細化進行中
> レビュー: CEO 高橋レン, CTO マルコ・ロッシ

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

### 4-1. 機能1: チャットアシスタント（実装Priority: 1）

#### 概要
何でも聞ける経営者向けAIチャット。事業に関する質問、アドバイス、文章作成に対応。過去の会話履歴を保持し、経営者の"詰み"に特化したシステムプロンプトで応答する。

#### ユーザーストーリー
1. 経営者として、「この契約書の注意点を教えて」と相談したい。弁護士に聞くほどでもないが不安だから。
2. 経営者として、事業に関する質問、アドバイス、文章作成をAIに依頼したい。
3. 経営者として、過去の会話履歴を参照したい。

#### 画面遷移
`ダッシュボード` → `チャット画面`
- 入力フォーム: 自然言語での質問・指示を入力
- 会話履歴表示: AIとユーザーの会話履歴を時系列で表示
- サイドバー: 過去のチャットセッション一覧（MVPでは未実装、履歴はセッション単位で保持）

#### データモデル（Supabase PostgreSQL）
```sql
-- 会話履歴テーブル (chat_messages)
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

#### APIエンドポイント
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/chat` | POST | チャットメッセージ送信・AI応答取得 |
| `/api/chat/history` | GET | 会話履歴取得（全セッション） |
| `/api/chat/history/:sessionId` | GET | 特定セッションの会話履歴取得 |

#### 非機能要件
- レスポンス: チャット応答3秒以内

### 4-2. 機能2: AIレポート生成（実装Priority: 2）

#### 概要
CSVまたはExcelファイルをアップロードし、自然言語で指示することで、AIがデータを分析し、日本語のレポートを生成する。生成されたレポートはPDF/Markdownでダウンロード可能。

#### ユーザーストーリー
1. 経営者として、CSVをアップロードして「今月の売上まとめて」と言いたい。事務員に頼む手間を省くため。
2. 経営者として、AIが生成したレポートをPDF/Markdownでダウンロードしたい。
3. 経営者として、過去に生成したレポートを参照したい。

#### 画面遷移
`ダッシュボード` → `レポート生成画面`
- ファイルアップロードエリア: CSVまたはExcelファイルをドラッグ&ドロップまたは選択
- 指示入力フォーム: 「先月の売上を部門別にまとめて」のような自然言語指示を入力
- レポート表示エリア: AIが生成したレポートのプレビュー
- ダウンロードボタン: PDF/Markdown形式でレポートをダウンロード

#### データモデル（Supabase PostgreSQL）
```sql
-- レポート履歴テーブル (reports)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- レポートのタイトル
    file_name VARCHAR(255),     -- アップロードされたファイル名
    file_url TEXT,              -- アップロードされたファイルのURL (Supabase Storage)
    prompt TEXT NOT NULL,       -- ユーザーが入力した指示
    result TEXT,                -- AIが生成したレポート内容 (Markdown/JSONなど)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### APIエンドポイント
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/report/upload` | POST | CSV/Excelファイルアップロード |
| `/api/report/analyze` | POST | レポート分析指示・AIレポート生成 |
| `/api/report/history` | GET | レポート生成履歴取得 |
| `/api/report/:id` | GET | 特定レポート詳細取得 |

#### 非機能要件
- レポート生成時間: ファイルサイズによるが、一般的なビジネスレポートで30秒以内

### 4-3. 機能3: テンプレート書類生成（実装Priority: 3）

#### 概要
見積書・請求書・お礼状などのテンプレートを用意し、自然言語またはフォーム入力で情報を与えることで、AIがテンプレートに情報を流し込み、書類を生成する。生成された書類はPDFで出力可能。

#### ユーザーストーリー
1. 経営者として、「○○社に見積書を送って」と言いたい。書類作成に30分かかるのを3分にするため。
2. 経営者として、AIが作った書類をプレビューしてから確定したい。間違いがあると信用問題だから。
3. 経営者として、過去に生成した書類を検索したい。「先月の○○社の見積書どこだっけ？」をなくすため。

#### 画面遷移
`ダッシュボード` → `書類生成画面`
- テンプレート選択: 見積書、請求書、お礼状などのテンプレートを選択
- 情報入力フォーム/チャット: 必要事項を自然言語またはフォームで入力
- プレビューエリア: AIが生成した書類のプレビュー
- PDF出力ボタン: 生成された書類をPDFでダウンロード

#### データモデル（Supabase PostgreSQL）
```sql
-- 生成済み書類テーブル (documents)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL, -- 使用したテンプレート名 (例: '見積書', '請求書')
    document_type VARCHAR(50) NOT NULL,  -- 書類の種類 (例: '見積書', '請求書')
    title VARCHAR(255) NOT NULL,         -- 書類のタイトル
    input_data JSONB,                    -- 書類生成に必要な入力データ (JSON形式)
    generated_content TEXT,              -- AIが生成した書類のテキスト内容
    output_url TEXT,                     -- 生成されたPDFなどのURL (Supabase Storage)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### APIエンドポイント
| エンドポイント | Method | 機能 |
|---------------|--------|------|
| `/api/document/templates` | GET | 利用可能なテンプレート一覧取得 |
| `/api/document/generate` | POST | 書類生成指示・AI書類生成 |
| `/api/document/history` | GET | 書類生成履歴取得 |
| `/api/document/:id` | GET | 特定書類詳細取得 |

#### 非機能要件
- 書類生成時間: 10秒以内

## 5. 共通データモデル

### 5-1. ユーザー設定テーブル (user_settings)
ユーザーごとのAPIキーなどの設定情報を保持する。

```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key_openai TEXT,    -- OpenAI APIキー
    api_key_anthropic TEXT, -- Anthropic APIキー
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5-2. 認証ユーザーテーブル (auth.users)
Supabase Authによって管理されるユーザー情報テーブル。

```sql
-- Supabase Authにより自動生成される
CREATE TABLE auth.users (
    id UUID PRIMARY KEY,
    -- その他のユーザー情報
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. 共通非機能要件

- **可用性**: 99.5%以上
- **セキュリティ**: データ暗号化（at-rest, in-transit）、SOC2準拠を目指す
- **対応ブラウザ**: Chrome, Safari, Edge（最新2バージョン）
- **スマホ**: iOS Safari, Android Chrome 対応

## 7. 差別化ポイント

| 競合 | ツミキリの優位性 |
|------|-----------------|
| ChatGPT / Claude | 経営者特化のUI。書類テンプレート。データ管理機能 |
| freee / マネーフォワード | AI自然言語操作。会計以外の事務も対応 |
| 事務代行サービス | 月額¥2,980で24時間対応。人件費の1/10以下 |

## 8. 収益モデル

| プラン | 価格 | 内容 |
|--------|------|------|
| Free | ¥0 | 月10タスク、基本テンプレート3種 |
| Pro | ¥2,980/月 | 無制限タスク、全テンプレート、データ保持90日 |
| BYOK | ¥0（APIキー自前） | Pro機能利用可、API費用は自己負担 |

## 9. 成功指標

- ローンチ1ヶ月: ユーザー登録100名、有料転換5名
- ローンチ3ヶ月: ユーザー登録500名、有料転換25名、MRR ¥74,500
- NPS: 40以上（経営者からの推薦意向）
