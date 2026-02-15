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
3. 経営者として、過去の会話履歴を参照したい。「先週のAIとの会話で、〇〇について話した内容をもう一度見たい」
4. 経営者として、AIが生成した回答が適切か判断するために、出典や根拠を参考にしたい。
5. 経営者として、複数の質問をまとめてしたい。

#### 画面遷移
```mermaid
graph TD
    A[ダッシュボード] --> B{チャット画面};
    B --> C[チャット入力エリア];
    B --> D[会話履歴表示エリア];
    D --> E[過去のチャットセッション一覧 (MVPでは未実装、履歴はセッション単位で保持)];
    C -- 質問/指示入力 --> F[AI応答表示];
    F -- 関連情報表示 --> G[参照情報/根拠];
```
- **チャット入力エリア**: ユーザーが自然言語で質問や指示を入力するテキストボックス。
- **会話履歴表示エリア**: AIとユーザーの過去の会話が時系列で表示される。ユーザーの発言とAIの応答が明確に区別される。
- **過去のチャットセッション一覧**: サイドバーなどに表示される、これまでのチャットセッションのタイトルと日付。クリックすると該当セッションの履歴が表示される。
- **参照情報/根拠表示**: AIの回答に付随して、その回答の根拠となった情報や関連ドキュメントへのリンクが表示される（MVPではテキストでの補足情報を想定）。

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

-- ユーザー設定テーブル (user_settings)
-- BYOKのAPIキーなどを保存
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    google_gemini_api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーポリシー
CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);
```

#### APIエンドポイント設計（Cloudflare Workers）

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ | 備考 |
|---------------|--------|------|------------------|------------------|------|
| `/api/chat` | POST | チャット送信・AI応答取得 | `{"message": "string", "sessionId": "string(optional)"}` | `{"response": "string", "sessionId": "string"}` | 新規セッション開始、または既存セッションへのメッセージ追加 |
| `/api/chat/history` | GET | 全ての会話セッション履歴取得 | なし | `[{"sessionId": "string", "title": "string", "lastMessageAt": "timestamp"}]` | MVPではセッション単位での履歴一覧表示は未実装だが、APIは定義しておく |
| `/api/chat/history/:sessionId` | GET | 特定セッションの会話履歴取得 | なし | `[{"role": "string", "content": "string", "createdAt": "timestamp"}]` | セッションIDに基づいて会話の全履歴を返す |

#### 非機能要件
- **レスポンス速度**: チャット応答は3秒以内（通常の質問の場合）。
- **可用性**: 99.5%以上。
- **セキュリティ**:
    - 会話履歴はユーザーごとに分離され、他ユーザーからは参照できないこと（ROW LEVEL SECURITY）。
    - APIキーなどの機密情報は暗号化して保存すること。
    - 通信はHTTPSで暗号化されること。
- **コンテキスト管理**: 過去の会話履歴を適切にAIに渡し、文脈を理解した応答を生成すること。
- **エラーハンドリング**: AIプロバイダーAPIのエラーやネットワークエラーが発生した場合、ユーザーに分かりやすいメッセージを表示すること。

### 4-2. 機能2: AIレポート生成（実装Priority: 2）

#### 概要
CSVまたはExcelファイルをアップロードし、自然言語で指示することで、AIがデータを分析し日本語のレポートを生成する。PDF/Markdownでダウンロード可能。

#### ユーザーストーリー
1. 経営者として、CSVをアップロードして「先月の売上を部門別にまとめて」と言いたい。事務員に頼む手間を省くため。
2. 経営者として、AIが生成したレポートの内容を、ダウンロードする前に画面で確認したい。
3. 経営者として、生成されたレポートをPDF形式でダウンロードし、社内会議で使いたい。

#### 画面遷移
`ダッシュボード` → `レポート生成`
              ├── `ファイルアップロード` (CSV/Excel)
              ├── `指示入力フォーム` (自然言語)
              └── `レポート表示エリア` → `ダウンロードボタン` (PDF/Markdown)

#### データモデル（Supabase PostgreSQL）
```sql
-- レポート履歴テーブル (reports)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT, -- Supabase Storageに保存されたファイルURL
    prompt TEXT NOT NULL,
    result TEXT, -- AIが生成したレポート本文
    format VARCHAR(10) CHECK (format IN ('pdf', 'markdown')),
    created_at TIMESTAMPTZ DEFAULT NOW()
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
```

#### APIエンドポイント設計（Cloudflare Workers）

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ | 備考 |
|---------------|--------|------|------------------|------------------|------|
| `/api/report/upload` | POST | ファイルアップロード | `file` (multipart/form-data) | `{"fileUrl": "string"}` | Supabase Storageにファイルを一時保存しURLを返す |
| `/api/report/generate` | POST | レポート生成 | `{"fileUrl": "string", "prompt": "string", "format": "string"}` | `{"reportId": "string", "reportContent": "string"}` | アップロードされたファイルと指示に基づいてレポートを生成 |
| `/api/report/:reportId` | GET | 特定レポート取得 | なし | `{"reportId": "string", "title": "string", "content": "string", "format": "string"}` | 生成済みレポートの内容を取得 |
| `/api/report/:reportId/download` | GET | レポートダウンロード | なし | `file` (PDF/Markdown) | 生成済みレポートをダウンロード |

#### 非機能要件
- **処理時間**: ファイルサイズによるが、数MB程度のCSV/Excelファイルであれば30秒以内にレポート生成が完了すること。
- **ファイルサイズ**: アップロード可能なファイルサイズの上限を設ける（例: 10MB）。
- **データ保持**: アップロードされたファイルはレポート生成後、一定期間（例: 7日間）保持し、その後自動削除されること。
- **セキュリティ**: アップロードされたファイルはユーザーごとに分離され、不適切なアクセスから保護されること。

### 4-3. 機能3: テンプレート書類生成（実装Priority: 3）

#### 概要
見積書・請求書・お礼状などのテンプレートを用意し、自然言語またはフォーム入力で情報を流し込み、AIが書類を生成する。PDF出力に対応。

#### ユーザーストーリー
1. 経営者として、「○○建設さんへ、屋根修理の見積書を作って。金額は35万円」と言いたい。書類作成に30分かかるのを3分にするため。
2. 経営者として、AIが作った書類をプレビューしてから確定したい。間違いがあると信用問題だから。
3. 経営者として、生成された書類をPDF形式でダウンロードし、顧客にメールで送りたい。

#### 画面遷移
`ダッシュボード` → `書類生成`
              ├── `テンプレート選択` (見積書、請求書、お礼状など)
              ├── `情報入力` (自然言語またはフォーム)
              └── `プレビュー` → `PDF出力ボタン`

#### データモデル（Supabase PostgreSQL）
```sql
-- 生成済み書類テーブル (documents)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    input_data JSONB NOT NULL, -- ユーザーが入力したデータ（自然言語解析結果を含む）
    generated_content TEXT NOT NULL, -- AIが生成した最終書類内容
    pdf_url TEXT, -- 生成されたPDFのURL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ユーザーポリシー
CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 書類テンプレートテーブル (document_templates)
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    content_template TEXT NOT NULL, -- Markdown形式のテンプレート本文
    fields JSONB, -- テンプレートで使用する変数定義 (例: {"customerName": "string", "amount": "number"})
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLSは不要（全ユーザー共通）
```

#### APIエンドポイント設計（Cloudflare Workers）

| エンドポイント | Method | 機能 | リクエストボディ | レスポンスボディ | 備考 |
|---------------|--------|------|------------------|------------------|------|
| `/api/document/templates` | GET | テンプレート一覧取得 | なし | `[{"id": "string", "name": "string", "fields": "json"}]` | 利用可能な書類テンプレートの一覧を返す |
| `/api/document/generate` | POST | 書類生成 | `{"templateId": "string", "input": "string(natural language) or json"}` | `{"documentId": "string", "previewContent": "string"}` | テンプレートと入力データに基づいて書類を生成しプレビューを返す |
| `/api/document/:documentId/finalize` | POST | 書類確定・PDF生成 | なし | `{"pdfUrl": "string"}` | プレビュー内容を確定し、PDFを生成してURLを返す |
| `/api/document/:documentId` | GET | 特定書類取得 | なし | `{"documentId": "string", "title": "string", "content": "string", "pdfUrl": "string"}` | 生成済み書類の内容を取得 |

#### 非機能要件
- **プレビュー速度**: 情報入力後、5秒以内にプレビューが表示されること。
- **テンプレート拡張性**: 新しい書類テンプレートを容易に追加できること。
- **データ保持**: 生成された書類はユーザーが削除するまで保持されること。
- **セキュリティ**: 生成された書類はユーザーごとに分離され、不適切なアクセスから保護されること。

## 5. 共通非機能要件

- **レスポンス**: 主要なUI操作は3秒以内にフィードバックを返すこと。
- **可用性**: 99.5%以上。
- **セキュリティ**:
    - 全ての通信はHTTPSで暗号化されること。
    - ユーザーデータは暗号化（at-rest, in-transit）され、厳格なアクセス制御が適用されること。
    - SOC2準拠を目指し、定期的なセキュリティ監査を実施すること。
- **対応ブラウザ**: Chrome, Safari, Edge（最新2バージョン）。
- **スマホ対応**: iOS Safari, Android Chrome に対応したレスポンシブUIを提供すること。
- **認証**: Supabase Authを利用したメールアドレス/パスワード認証、OAuth認証（Googleなど）に対応。
- **BYOK (Bring Your Own Key)**: ユーザーが自身のAIプロバイダーAPIキーを設定し、利用できる機能を提供。API利用料はユーザー負担となるが、無料枠を超えた利用が可能になる。
- **データ保持ポリシー**: 各機能で生成されたデータ（チャット履歴、レポート、書類）の保持期間を明確に定義し、ユーザーに提示すること。
