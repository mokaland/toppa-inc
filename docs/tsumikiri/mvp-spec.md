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
        - 自然言語での分析指示入力テキストエリア（例: 「先月の売上を部門別にまとめてください」）
        - 分析のヒントや利用例の表示
        - 「レポート生成」ボタン
    5.  `レポート表示画面`:
        - AIが生成したレポートの表示（テキスト、表、グラフなど）
        - PDF/Markdownダウンロードボタン
        - レポート内容に関する追加質問入力エリア
        - 「保存」ボタン
    6.  `レポート履歴画面`:
        - 生成されたレポートの一覧表示（タイトル、生成日時、使用ファイル名など）
        - 各レポートの詳細表示へのリンク
        - レポートの検索・フィルタリング機能
- **データモデル**:
    ```sql
    -- レポート履歴テーブル
    CREATE TABLE reports (
        id UUID PRIMARY PRIMARY KEY DEFAULT gen_random_uuid(),
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
- **APIエンドポイント**:
    | エンドポイント | Method | 機能 |
    |---------------|--------|------|
    | `/api/report/upload` | POST | ファイルアップロード |
    | `/api/report/generate` | POST | レポート生成 |
    | `/api/report/history` | GET | レポート履歴取得 |
    | `/api/report/:reportId` | GET | 特定レポート取得 |
    | `/api/report/:reportId/download` | GET | レポートダウンロード |
- **非機能要件**:
    - レスポンス速度: ファイルアップロード後、AIレポート生成まで60秒以内
    - ファイルサイズ上限: 10MB
    - 対応ファイル形式: CSV, XLSX
    - 履歴保持期間: Proプランは90日間、Freeプランは7日間
    - セキュリティ: アップロードされたファイルは暗号化され、一定期間後に自動削除される。レポートデータはユーザーごとにアクセス制御される。

### 2.2. テンプレート書類生成

- **機能概要**: 見積書、請求書、お礼状などのテンプレートを基に、自然言語またはフォーム入力で情報を与えることでAIが自動で書類を生成する。
- **ユーザーストーリー**:
    - 経営者として、「○○社へ、屋根修理の見積書を作って。金額は35万円」と指示したい。書類作成にかかる時間を短縮するため。
    - 経営者として、作成された書類をプレビューしてから確定したい。誤字脱字や内容の誤りを防ぐため。
    - 経営者として、PDF形式で書類をダウンロードしたい。印刷やメール添付で送るため。
    - 経営者として、よく使うテンプレートを「お気に入り」として登録したい。素早く書類を作成できるようにするため。
    - 経営者として、自社のロゴや社名、住所をテンプレートに自動で反映させたい。書類作成の手間を省き、ブランディングを統一するため。
    - 経営者として、一度作成した書類を後から編集したい。内容の修正や追記が必要になった場合に対応するため。
    - 経営者として、作成した請求書をメールで顧客に直接送りたい。郵送の手間を省き、迅速に送付するため。
    - 経営者として、作成する書類の種類（見積書、請求書、契約書など）を簡単に選択したい。迷わずに目的の書類を作成するため。
    - 経営者として、各書類に必要な項目（宛名、金額、日付、商品名など）が分かりやすく表示されると嬉しい。入力漏れを防ぐため。
    - 経営者として、AIに「この見積書に基づいて、請求書を作成して」と指示したい。関連する書類を効率的に作成するため。
- **画面遷移**:
    1.  `ダッシュボード`:
        - 書類生成機能への導線ボタン
        - 過去の書類履歴へのリンク
    2.  `テンプレート選択画面`:
        - 利用可能なテンプレートの一覧表示（見積書、請求書、お礼状など）
        - テンプレートのカテゴリ分け、検索機能
        - 「お気に入り」テンプレートの一覧
        - テンプレート選択後、「次へ」ボタン
    3.  `情報入力画面`:
        - 自然言語入力エリア（例: 「○○社に見積書、品名Aを10個、単価1000円で」）
        - または、フォーム形式での入力項目（宛名、日付、品名、単価、数量、合計金額など）
        - プレビュー表示エリア
        - 「生成」ボタン
    4.  `書類プレビュー・編集画面`:
        - AIが生成した書類のプレビュー表示
        - テキスト編集機能（必要に応じて手動で修正）
        - 「PDFダウンロード」ボタン
        - 「保存」ボタン
        - 「メール送信」ボタン（Phase 2）
    5.  `書類履歴画面`:
        - 生成された書類の一覧表示（種類、宛名、作成日時など）
        - 各書類の詳細表示へのリンク
        - 書類の検索・フィルタリング機能
- **データモデル**:
    ```sql
    -- 書類テンプレートテーブル
    CREATE TABLE document_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- '見積書', '請求書', 'お礼状' など
        template_content TEXT NOT NULL, -- Markdown or HTML 形式のテンプレート
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 生成された書類テーブル
    CREATE TABLE generated_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL, -- 生成された書類の最終内容
        pdf_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RLS有効化（document_templates）
    ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view own templates" ON document_templates FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own templates" ON document_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own templates" ON document_templates FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own templates" ON document_templates FOR DELETE USING (auth.uid() = user_id);

    -- RLS有効化（generated_documents）
    ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view own documents" ON generated_documents FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own documents" ON generated_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own documents" ON generated_documents FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own documents" ON generated_documents FOR DELETE USING (auth.uid() = user_id);
    ```
- **APIエンドポイント**:
    | エンドポイント | Method | 機能 |
    |---------------|--------|------|
    | `/api/template` | GET | テンプレート一覧取得 |
    | `/api/template/:templateId` | GET | 特定テンプレート取得 |
    | `/api/document/generate` | POST | 書類生成 |
    | `/api/document/history` | GET | 生成済み書類履歴取得 |
    | `/api/document/:documentId` | GET | 特定書類取得 |
    | `/api/document/:documentId/download` | GET | 書類ダウンロード |
- **非機能要件**:
    - レスポンス速度: 情報入力後、書類生成まで10秒以内
    - テンプレート数: 初期提供10種類以上
    - カスタマイズ性: ユーザーが独自のテンプレートを登録・編集できる（Phase 2）
    - セキュリティ: 生成された書類データは暗号化され、ユーザーごとにアクセス制御される。

### 2.3. チャットアシスタント

- **機能概要**: 経営者が自然言語で質問や指示をすることで、AIがリアルタイムで応答するチャットインターフェース。事業に関するアドバイス、情報整理、文章作成などをサポートし、経営者の"詰み"を解消する。
- **ユーザーストーリー**:
    - 経営者として、「この契約書の注意点を教えて」と相談したい。弁護士に聞くほどでもないが不安だから。
    - 経営者として、過去の会話履歴を検索したい。「以前AIに相談した内容をもう一度確認したい」という時にすぐに見つけられるようにするため。
    - 経営者として、スマホからでもチャットアシスタントを利用したい。現場や移動中に手軽に質問するため。
    - 経営者として、AIアシスタントに「今日のタスクを整理して」と指示し、箇条書きでまとめてほしい。頭の中を整理し、効率的に作業を進めるため。
    - 経営者として、AIアシスタントに「この顧客へのメールの返信文案を作成して」と依頼したい。メール作成にかかる時間を短縮し、迅速な顧客対応を実現するため。
    - 経営者として、AIアシスタントとの会話を通じて、事業に関する新しいアイデアや視点を得たい。経営のヒントを見つけるため。
    - 経営者として、チャットの応答速度が速いと嬉しい。思考の流れを止めずにスムーズに会話を続けるため。
    - 経営者として、AIアシスタントが過去の会話内容を記憶し、文脈を理解した上で応答してくれると嬉しい。何度も同じ説明をする手間を省くため。
    - 経営者として、重要な会話は後から見返せるように保存しておきたい。ナレッジとして活用するため。
    - 経営者として、チャットインターフェースは直感的で使いやすいものが良い。ITツールに不慣れでも問題なく利用できるようにするため。
- **画面遷移**:
    1.  `ダッシュボード`:
        - チャットアシスタント機能への導線ボタン（例: 「AIチャット」）
    2.  `チャット画面`:
        - AIアシスタントとの会話履歴表示エリア
        - テキスト入力フォーム（自然言語での質問・指示を入力）
        - 送信ボタン
        - 過去の会話履歴を閲覧・検索する機能への導線
        - 音声入力機能（Phase 2以降）
    3.  `過去の会話履歴画面`:
        - 会話履歴の一覧表示（日付、会話開始時の質問など）
        - 特定の会話履歴の詳細表示
        - 会話履歴の検索・フィルタリング機能
- **データモデル**:
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
- **APIエンドポイント**:
    | エンドポイント | Method | 機能 |
    |---------------|--------|------|
    | `/api/chat` | POST | チャット送信・AI応答取得 |
    | `/api/chat/history` | GET | 会話履歴取得（全セッション） |
    | `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 |
- **非機能要件**:
    - レスポンス速度: 3秒以内
    - 会話履歴保持期間: Proプランは90日間、Freeプランは7日間
    - セキュリティ: 会話内容は暗号化され、ユーザーごとにアクセス制御される。
    - 対応入力方式: テキスト入力（Phase 1）、音声入力（Phase 2以降）
    - 対応言語: 日本語のみ
