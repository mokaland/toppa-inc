# ツミキリ MVPプロダクト仕様書

> 作成者: PdM キム・スジン
> 日付: 2026-02-16
> ステータス: 詳細化中

## 1. プロダクト概要

ツミキリは、中小企業の経営者が「事務作業の山」から解放されるためのAIアシスタント。自然言語で指示するだけで、日常の事務作業をAIが代行する。

## 2. MVP機能定義

Q1四半期計画に基づき、以下の3つのMVP機能を定義する。

### 2.1. AIレポート生成

- **機能概要**: CSVまたはExcelファイルをアップロードし、自然言語で指示することでAIがデータを分析し、レポートを生成する。
- **ユーザーストーリー**:
    - 経営者として、CSVをアップロードして「今月の売上まとめて」と言いたい。事務員に頼む手間を省くため。
    - 経営者として、月ごとの売上推移をグラフで表示してほしい。事業の状況を視覚的に把握するため。
    - 経営者として、部門別の利益率を分析してほしい。どの部門に注力すべきか判断するため。
    - 経営者として、生成されたレポートをPDFでダウンロードしたい。社内共有や報告に使うため。
    - 経営者として、過去に生成したレポートを一覧で確認したい。後から参照できるようにするため。
    - 経営者として、レポート生成時に使用するデータ範囲（例: 特定の期間、特定の顧客）を指定したい。必要な情報だけを抽出するため。
    - 経営者として、AIが生成したレポートの内容について、「この部分をもっと詳しく説明して」と追加で質問したい。レポート内容を深く理解し、疑問点を解消するため。
    - 経営者として、定期的に（例: 毎月1日）特定のCSVファイルから自動でレポートを生成し、メールで受け取りたい。定型業務を自動化し、報告漏れを防ぐため。
    - 経営者として、生成されたレポートを、グラフの種類（棒グラフ、円グラフ、折れ線グラフなど）や表示項目を自由にカスタマイズして出力したい。見せたい情報に合わせて柔軟に調整するため。
    - 経営者として、Excelファイルをアップロードして、「このシートのデータを使って、商品Aと商品Bの売上を比較して」と指示したい。異なるフォーマットのデータも扱えるようにするため。
    - 経営者として、アップロードしたExcelファイルに複数のシートがある場合、どのシートを分析対象にするか指定したい。不要なシートのデータを含めないようにするため。
- **画面遷移**:
    1.  `ダッシュボード`:
        - レポート生成機能への導線ボタン
        - 過去のレポート履歴へのリンク
    2.  `レポート生成トップ`:
        - 「ファイルをアップロードしてレポートを生成」ボタン
        - 「過去のレポートを見る」ボタン
    3.  `ファイルアップロード画面`:
        - ドラッグ＆ドロップまたはファイル選択によるCSV/Excelファイルアップロードエリア
        - アップロード可能なファイル形式とサイズ上限の表示（例: CSV, XLSX, 最大10MB）
        - アップロードされたファイルのプレビュー（ファイル名、シート名、最初の数行のデータ）
        - 「次へ」ボタン
    4.  `分析指示入力画面`:
        - 自然言語での分析指示入力テキストエリア
        - 指示の具体例の提示
        - 「レポート生成」ボタン
    5.  `レポート表示画面`:
        - AIが生成したレポートの表示（Markdown形式）
        - PDFダウンロードボタン
        - Markdownダウンロードボタン
        - 「追加で質問する」チャット入力エリア
    6.  `過去のレポート履歴画面`:
        - 生成日、レポートタイトル、ファイル名の一覧表示
        - 各レポートの詳細画面へのリンク
- **APIエンドポイント設計**:
    - `/api/report/upload` (POST):
        - 機能: CSV/Excelファイルのアップロード
        - リクエストボディ: `form-data`でファイル
        - レスポンスボディ: `{"fileId": "string", "fileName": "string"}`
    - `/api/report/generate` (POST):
        - 機能: レポート生成指示とAI分析結果の取得
        - リクエストボディ: `{"fileId": "string", "prompt": "string"}`
        - レスポンスボディ: `{"reportId": "string", "content": "string"}`
    - `/api/reports` (GET):
        - 機能: 過去のレポート履歴一覧取得
        - レスポンスボディ: `[{"reportId": "string", "title": "string", "createdAt": "datetime"}]`
    - `/api/reports/:reportId` (GET):
        - 機能: 特定レポートの詳細取得
        - レスポンスボディ: `{"reportId": "string", "title": "string", "content": "string", "fileUrl": "string"}`
- **データモデル（Supabase PostgreSQL）**:
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

### 2.2. テンプレート書類生成

- **機能概要**: 見積書・請求書・お礼状などのテンプレートを用意し、自然言語で指示することでAIが情報を流し込み、書類を生成する。
- **ユーザーストーリー**:
    - 経営者として、「○○建設さんへ、屋根修理の見積書を作って。金額は35万円」と指示したい。書類作成に30分かかるのを3分にするため。
    - 経営者として、AIが作った書類をプレビューしてから確定したい。間違いがあると信用問題だから。
    - 経営者として、生成された書類をPDFで出力したい。印刷やメール添付に使うため。
    - 経営者として、よく使う書類のテンプレートを自分で登録・編集したい。事業に合わせた書類を作成するため。
    - 経営者として、過去に生成した書類を検索したい。「先月の○○社の見積書どこだっけ？」をなくすため。
    - 経営者として、生成した書類をメールで直接送信したい。送信の手間を省くため。
    - 経営者として、書類生成時に必要な情報（顧客名、金額、日付など）をフォームで入力することも選択したい。自然言語入力が難しい場合があるため。
    - 経営者として、複数のテンプレートから最適なものをAIが提案してほしい。テンプレート選びの手間を省くため。
    - 経営者として、生成された書類の特定の箇所を、手動で修正したい。微調整が必要な場合があるため。
    - 経営者として、書類に自社のロゴや社判を自動で挿入したい。プロフェッショナルな印象を与えるため。
- **画面遷移**:
    1.  `ダッシュボード`:
        - 書類生成機能への導線ボタン
        - 過去の書類履歴へのリンク
    2.  `書類生成トップ`:
        - テンプレート選択（一覧表示）
        - 「書類を新規作成」ボタン
        - 「過去の書類を見る」ボタン
    3.  `テンプレート選択画面`:
        - カテゴリ別テンプレート一覧
        - テンプレートプレビュー
        - 「このテンプレートを使う」ボタン
    4.  `情報入力画面`:
        - 自然言語での指示入力テキストエリア
        - または、フォーム形式での情報入力（テンプレートにより項目が変化）
        - 「プレビュー生成」ボタン
    5.  `プレビュー画面`:
        - AIが生成した書類のプレビュー
        - 修正エリア（必要に応じて）
        - PDF出力ボタン
        - メール送信ボタン（Phase 2）
        - 「保存して完了」ボタン
    6.  `過去の書類履歴画面`:
        - 生成日、書類タイトル、顧客名の一覧表示
        - 各書類の詳細画面へのリンク
- **APIエンドポイント設計**:
    - `/api/templates` (GET):
        - 機能: 利用可能なテンプレート一覧の取得
        - レスポンスボディ: `[{"templateId": "string", "name": "string", "description": "string"}]`
    - `/api/document/generate` (POST):
        - 機能: テンプレートと情報に基づいて書類を生成
        - リクエストボディ: `{"templateId": "string", "data": {"field1": "value1", ...}}` または `{"templateId": "string", "prompt": "string"}`
        - レスポンスボディ: `{"documentId": "string", "previewUrl": "string"}`
    - `/api/documents` (GET):
        - 機能: 過去の生成済み書類一覧の取得
        - レスポンスボディ: `[{"documentId": "string", "title": "string", "createdAt": "datetime"}]`
    - `/api/documents/:documentId` (GET):
        - 機能: 特定書類の詳細取得
        - レスポンスボディ: `{"documentId": "string", "title": "string", "content": "string", "pdfUrl": "string"}`
- **データモデル（Supabase PostgreSQL）**:
    ```sql
    -- 書類テンプレートテーブル
    CREATE TABLE templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL, -- Markdown or HTML for template
        type VARCHAR(50) NOT NULL, -- e.g., 'invoice', 'quotation', 'letter'
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 生成済み書類テーブル
    CREATE TABLE documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        generated_content TEXT NOT NULL, -- Final generated content
        pdf_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RLS有効化
    ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

    -- ユーザーポリシー
    CREATE POLICY "Users can view own templates"
        ON templates FOR SELECT
        USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own templates"
        ON templates FOR INSERT
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can view own documents"
        ON documents FOR SELECT
        USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own documents"
        ON documents FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    ```

### 2.3. チャットアシスタント

- **機能概要**: 経営者が自然言語で質問や指示をすることで、AIが事務作業のアドバイスや情報提供を行うチャットインターフェース。
- **ユーザーストーリー**:
    - 経営者として、チャットで質問した内容とAIの回答が履歴として保存され、後から参照したい。
    - 経営者として、過去の会話履歴を踏まえた回答をAIから受け取りたい。
    - 経営者として、スマホでチャットアシスタントを利用し、移動中でも相談できるようにしたい。
    - 経営者として、AIが生成した文章（メール下書きなど）を簡単にコピーして使いたい。
    - 経営者として、チャットの応答が素早く、ストレスなく会話できるようにしたい。
    - 経営者として、事業に関する質問やアドバイスをAIに相談したい。経営判断の参考にしたいから。
    - 経営者として、会議のメモをチャットで入力し、AIに要約・整理してほしい。議事録作成の手間を省くため。
    - 経営者として、複数のチャットセッションを使い分けたい。異なる話題やプロジェクトごとに会話を分けたいから。
    - 経営者として、AIが生成した回答が、経営者の視点に立っていると感じたい。実用的なアドバイスを得るため。
    - 経営者として、チャットインターフェースが直感的で使いやすいと感じたい。ITツールが苦手でもスムーズに使えるようにするため。
- **画面遷移**:
    1.  `ダッシュボード`:
        - チャットアシスタント機能への導線ボタン
        - 過去のチャット履歴へのリンク
    2.  `チャット画面`:
        - 会話履歴表示エリア
        - メッセージ入力フォーム
        - 送信ボタン
        - （未実装だが将来的に）音声入力ボタン
        - （未実装だが将来的に）ファイル添付ボタン
        - 新規チャット開始ボタン
        - 過去のチャットセッション一覧表示/選択
- **APIエンドポイント設計**:
    - `/api/chat` (POST):
        - 機能: チャットメッセージの送信とAI応答の取得
        - リクエストボディ: `{"message": "string", "sessionId": "string(optional)"}`
        - レスポンスボディ: `{"reply": "string", "sessionId": "string"}`
    - `/api/chat/history` (GET):
        - 機能: ユーザーの全会話セッション履歴の取得
        - レスポンスボディ: `[{"sessionId": "string", "lastMessage": "string", "updatedAt": "datetime"}]`
    - `/api/chat/history/:sessionId` (GET):
        - 機能: 特定のセッションIDに紐づく会話履歴の取得
        - レスポンスボディ: `[{"role": "user" | "assistant", "content": "string", "createdAt": "datetime"}]`
- **データモデル（Supabase PostgreSQL）**:
    ```sql
    -- 会話履歴テーブル (chat_messages)
    CREATE TABLE chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        session_id UUID DEFAULT gen_random_uuid(), -- 会話セッションIDを追加
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
- **非機能要件**:
    - レスポンス: チャット応答3秒以内
    - 可用性: 99.5%以上
    - セキュリティ: データ暗号化（at-rest, in-transit）、RLSによるデータアクセス制御

## 3. 共通非機能要件

- **認証**: Supabase Authによるメール/パスワード認証、OAuth（Google, GitHubなど）
- **多言語対応**: 日本語のみ（MVP時点）
- **レスポンシブデザイン**: スマートフォン、タブレット、PCの各デバイスに対応
- **監査ログ**: ユーザー操作ログ、AI応答ログの記録（トラブルシューティング、改善のため）
- **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージ表示、システムログ記録
- **データバックアップ**: 定期的なデータベースバックアップ
- **APIキー管理**: BYOK (Bring Your Own Key) 方式に対応。ユーザーが自身のOpenAI/Anthropic APIキーを登録可能
- **課金**: Stripe連携（Proプラン、BYOKプラン）
- **監視**: システム稼働状況、エラーレート、API応答速度の監視

## 4. 今後の拡張性（MVP以降）

- 音声入力/出力対応
- ファイル添付によるAI分析強化
- 他SaaS連携（会計ソフト、CRMなど）
- チーム利用機能（ユーザー管理、権限設定）
- AIタスクの自動実行・スケジュール設定
- カスタムテンプレートの強化（より複雑なロジック対応）
- ダッシュボードのパーソナライズ
- 外部通知連携（Slack, メールなど）
- モバイルアプリ（iOS/Androidネイティブ）
- 監査ログの可視化とレポート
