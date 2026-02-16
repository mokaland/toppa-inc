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
        - 過去の指示履歴からの選択肢表示
        - 「レポート生成」ボタン
    5.  `レポート表示画面`:
        - 生成されたレポートの表示（テキスト、グラフ）
        - PDF/Markdownダウンロードボタン
        - 「このレポートについて質問する」チャットボタン
    6.  `過去のレポート一覧画面`:
        - 生成日時、タイトル、ファイル名でソート可能なレポート一覧
        - 各レポートの詳細画面へのリンク

### 2.2. テンプレート書類生成

- **機能概要**: 見積書、請求書、お礼状などのテンプレートを選択し、自然言語またはフォーム入力で情報を与えることで、AIが自動的に書類を生成する。
- **ユーザーストーリー**:
    - 経営者として、「○○建設さんへ、屋根修理の見積書を作って。金額は35万円」と言いたい。書類作成に30分かかるのを3分にするため。
    - 経営者として、請求書テンプレートを選び、顧客名、商品名、金額を入力して自動生成したい。手作業でのミスをなくすため。
    - 経営者として、生成された書類をPDF形式で出力したい。メール添付や印刷に使うため。
    - 経営者として、よく使う顧客情報や商品情報を登録しておき、書類生成時に自動入力させたい。入力の手間を省くため。
    - 経営者として、オリジナルのテンプレートをアップロードして使いたい。会社のフォーマットを維持するため。
    - 経営者として、生成された書類の内容をプレビューで確認し、修正してから確定したい。間違いがあると信用問題だから。
    - 経営者として、過去に生成した書類を検索・参照したい。「先月の○○社の見積書どこだっけ？」をなくすため。
    - 経営者として、生成した書類を直接メールで送信したい。別のメールソフトを開く手間を省くため。
    - 経営者として、複数枚にわたる書類（例: 契約書）も一貫したフォーマットで生成したい。統一感を保つため。
    - 経営者として、書類生成時に「社判を追加して」や「会社のロゴを入れて」といった指示をしたい。公式書類としての体裁を整えるため。
- **画面遷移**:
    1.  `ダッシュボード`:
        - 書類生成機能への導線ボタン
        - 過去の書類履歴へのリンク
    2.  `書類生成トップ`:
        - テンプレート選択（見積書、請求書、お礼状など）
        - 「過去の書類を見る」ボタン
    3.  `テンプレート選択画面`:
        - 利用可能なテンプレートの一覧表示（カテゴリ別、人気順など）
        - テンプレートのプレビュー表示
        - 「このテンプレートを使う」ボタン
    4.  `情報入力画面`:
        - 自然言語での情報入力テキストエリア（例: 「○○社に見積書、商品Aを10個で合計10万円」）
        - または、項目ごとのフォーム入力（顧客名、商品名、金額など）
        - 登録済みの顧客情報や商品情報の選択機能
        - 「書類生成」ボタン
    5.  `書類プレビュー画面`:
        - 生成された書類のプレビュー表示
        - プレビュー内容の直接編集機能（必要に応じて）
        - PDF出力ボタン
        - 「メールで送信」ボタン（Phase 2）
    6.  `過去の書類一覧画面`:
        - 生成日時、テンプレート名、顧客名でソート可能な書類一覧
        - 各書類の詳細画面（プレビュー、ダウンロード）へのリンク

### 2.3. チャットアシスタント

- **機能概要**: 経営者の事業に関する質問、アドバイス、文章作成など、何でも相談できるAIチャット。過去の会話履歴を保持し、コンテキストを理解した応答が可能。
- **ユーザーストーリー**:
    - 経営者として、「この契約書の注意点を教えて」と相談したい。弁護士に聞くほどでもないが不安だから。
    - 経営者として、会議の議事録を要約してほしい。内容を素早く把握するため。
    - 経営者として、「来週の営業メールの文面を考えて」と依頼したい。文章作成の手間を省くため。
    - 経営者として、過去の会話履歴を一覧で確認し、特定の会話を再開したい。以前のコンテキストを活かして相談を続けたいから。
    - 経営者として、スマホからでもチャットアシスタントを利用したい。現場や移動中に急な相談が必要になるため。
    - 経営者として、AIが回答に困った際に、「もっと情報をください」などと追加の質問をしてほしい。より的確なアドバイスを得るため。
    - 経営者として、チャットの応答速度が速いと嬉しい。思考の流れを止めずに相談を進めたいから。
    - 経営者として、重要な会話は後から見返せるように保存しておきたい。ナレッジとして活用するため。
    - 経営者として、チャットの内容を他の社員に共有するために、テキストでコピーしたい。情報共有を効率化するため。
    - 経営者として、自分の業界（例: 建設業、美容サロン）に特化したアドバイスがほしい。より実用的な知見を得るため。
- **画面遷移**:
    1.  `ダッシュボード`:
        - チャットアシスタントへの導線ボタン
        - 新規チャット開始ボタン
        - 過去のチャット履歴へのリンク
    2.  `チャット画面`:
        - 会話履歴表示エリア
        - メッセージ入力テキストエリア
        - 送信ボタン
        - 音声入力ボタン（Phase 2）
        - 新規チャット開始ボタン（画面上部）
        - 過去のチャット一覧へのリンク（画面上部）
    3.  `過去のチャット一覧画面`:
        - チャット開始日時、会話の要約でソート可能な一覧
        - 各チャットの詳細画面（チャット画面）へのリンク
        - 特定のチャットを削除するオプション

## 3. データモデル設計

### 3.1. ユーザー関連

| テーブル名 | フィールド名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| `users` | `id` | `UUID` | `PRIMARY KEY` | ユーザーID (Supabase Authと連携) |
| | `email` | `TEXT` | `UNIQUE` | ユーザーのメールアドレス |
| | `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | ユーザー作成日時 |
| | `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | ユーザー情報更新日時 |
| `user_settings` | `id` | `UUID` | `PRIMARY KEY` | 設定ID |
| | `user_id` | `UUID` | `FOREIGN KEY (users.id)` | ユーザーID |
| | `openai_api_key` | `TEXT` | `NULLABLE` | OpenAI APIキー (BYOK用、暗号化して保存) |
| | `anthropic_api_key` | `TEXT` | `NULLABLE` | Anthropic APIキー (BYOK用、暗号化して保存) |
| | `default_report_format` | `VARCHAR(10)` | `DEFAULT 'PDF'` | デフォルトのレポート出力形式 |
| | `preferred_language` | `VARCHAR(10)` | `DEFAULT 'ja'` | ユーザーの優先言語 |

### 3.2. チャットアシスタント関連

| テーブル名 | フィールド名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| `chat_sessions` | `id` | `UUID` | `PRIMARY KEY` | チャットセッションID |
| | `user_id` | `UUID` | `FOREIGN KEY (users.id)` | ユーザーID |
| | `title` | `TEXT` | `NOT NULL` | チャットセッションのタイトル（AIが自動生成またはユーザーが編集） |
| | `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | セッション作成日時 |
| | `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | セッション更新日時 |
| `chat_messages` | `id` | `UUID` | `PRIMARY KEY` | メッセージID |
| | `session_id` | `UUID` | `FOREIGN KEY (chat_sessions.id)` | 所属するチャットセッションID |
| | `user_id` | `UUID` | `FOREIGN KEY (users.id)` | ユーザーID |
| | `role` | `VARCHAR(10)` | `NOT NULL CHECK (role IN ('user', 'assistant', 'system'))` | メッセージの送信者（user, assistant, system） |
| | `content` | `TEXT` | `NOT NULL` | メッセージ本文 |
| | `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | メッセージ作成日時 |

### 3.3. レポート生成関連

| テーブル名 | フィールド名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| `reports` | `id` | `UUID` | `PRIMARY KEY` | レポートID |
| | `user_id` | `UUID` | `FOREIGN KEY (users.id)` | ユーザーID |
| | `title` | `VARCHAR(255)` | `NOT NULL` | レポートタイトル |
| | `original_file_name` | `VARCHAR(255)` | `NULLABLE` | アップロードされた元ファイル名 |
| | `file_url` | `TEXT` | `NULLABLE` | 生成されたレポートファイルのURL (Supabase Storage) |
| | `prompt` | `TEXT` | `NOT NULL` | ユーザーが入力した分析指示プロンプト |
| | `ai_response_summary` | `TEXT` | `NULLABLE` | AIが生成したレポートの要約/テキスト部分 |
| | `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | レポート作成日時 |
| | `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | レポート更新日時 |

### 3.4. 書類生成関連

| テーブル名 | フィールド名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| `documents` | `id` | `UUID` | `PRIMARY KEY` | 書類ID |
| | `user_id` | `UUID` | `FOREIGN KEY (users.id)` | ユーザーID |
| | `template_id` | `UUID` | `FOREIGN KEY (document_templates.id)` | 使用したテンプレートID |
| | `title` | `VARCHAR(255)` | `NOT NULL` | 書類タイトル（例: 見積書_○○社） |
| | `file_url` | `TEXT` | `NULLABLE` | 生成された書類ファイルのURL (Supabase Storage) |
| | `input_data` | `JSONB` | `NULLABLE` | 書類生成時にユーザーが入力したデータ（JSON形式） |
| | `ai_generated_content` | `TEXT` | `NULLABLE` | AIが生成した書類のテキスト内容 |
| | `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | 書類作成日時 |
| | `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | 書類更新日時 |
| `document_templates` | `id` | `UUID` | `PRIMARY KEY` | テンプレートID |
| | `name` | `VARCHAR(255)` | `UNIQUE` | テンプレート名（例: 見積書A） |
| | `type` | `VARCHAR(50)` | `NOT NULL` | テンプレート種別（例: quotation, invoice, letter） |
| | `content_template` | `TEXT` | `NOT NULL` | テンプレート本体（Markdown/HTMLなど） |
| | `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | テンプレート作成日時 |

## 4. APIエンドポイント設計

### 4.1. 認証・ユーザー管理

| エンドポイント | Method | 機能 | リクエストボディ例 | レスポンスボディ例 |
|---|---|---|---|---|
| `/api/auth/signup` | `POST` | ユーザー登録 | `{"email": "test@example.com", "password": "password123"}` | `{"user_id": "uuid", "email": "test@example.com"}` |
| `/api/auth/signin` | `POST` | ユーザーログイン | `{"email": "test@example.com", "password": "password123"}` | `{"access_token": "jwt_token", "refresh_token": "jwt_token"}` |
| `/api/user/settings` | `GET` | ユーザー設定取得 | (なし) | `{"openai_api_key_set": true, "default_report_format": "PDF"}` |
| `/api/user/settings` | `PUT` | ユーザー設定更新 | `{"openai_api_key": "sk-...", "default_report_format": "Markdown"}` | `{"message": "Settings updated successfully"}` |

### 4.2. チャットアシスタント

| エンドポイント | Method | 機能 | リクエストボディ例 | レスポンスボディ例 |
|---|---|---|---|---|
| `/api/chat/sessions` | `GET` | 全チャットセッション取得 | (なし) | `[{"id": "uuid", "title": "会議議事録要約", "updated_at": "timestamp"}]` |
| `/api/chat/sessions` | `POST` | 新規チャットセッション開始 | `{"initial_message": "今日の売上について相談したい。"}` | `{"session_id": "uuid", "title": "今日の売上相談", "initial_message_id": "uuid"}` |
| `/api/chat/sessions/:sessionId` | `GET` | 特定セッションの会話履歴取得 | (なし) | `[{"id": "uuid", "role": "user", "content": "売上について", "created_at": "timestamp"}, ...]` |
| `/api/chat/sessions/:sessionId/messages` | `POST` | メッセージ送信・AI応答取得 | `{"content": "先月の売上はどうでしたか？"}` | `{"message_id": "uuid", "role": "assistant", "content": "先月の売上は順調でした。", "created_at": "timestamp"}` |
| `/api/chat/sessions/:sessionId` | `DELETE` | チャットセッション削除 | (なし) | `{"message": "Session deleted successfully"}` |

### 4.3. レポート生成

| エンドポイント | Method | 機能 | リクエストボディ例 | レスポンスボディ例 |
|---|---|---|---|---|
| `/api/report/upload` | `POST` | ファイルアップロード | `(multipart/form-data)` | `{"file_id": "uuid", "file_name": "sales.csv"}` |
| `/api/report/generate` | `POST` | レポート生成 | `{"file_id": "uuid", "prompt": "先月の売上を部門別にまとめて"}` | `{"report_id": "uuid", "title": "部門別売上レポート", "status": "processing"}` |
| `/api/report/status/:reportId` | `GET` | レポート生成ステータス取得 | (なし) | `{"status": "completed", "file_url": "url", "ai_response_summary": "..."}` |
| `/api/reports` | `GET` | 過去のレポート一覧取得 | (なし) | `[{"id": "uuid", "title": "...", "created_at": "timestamp"}, ...]` |
| `/api/reports/:reportId` | `GET` | 特定レポート詳細取得 | (なし) | `{"id": "uuid", "title": "...", "file_url": "...", "ai_response_summary": "..."}` |

### 4.4. 書類生成

| エンドポイント | Method | 機能 | リクエストボディ例 | レスポンスボディ例 |
|---|---|---|---|---|
| `/api/document/templates` | `GET` | テンプレート一覧取得 | (なし) | `[{"id": "uuid", "name": "見積書A", "type": "quotation"}, ...]` |
| `/api/document/generate` | `POST` | 書類生成 | `{"template_id": "uuid", "input_data": {"customer_name": "○○建設", "item": "屋根修理", "amount": 350000}}` | `{"document_id": "uuid", "title": "見積書_○○建設", "status": "processing"}` |
| `/api/document/status/:documentId` | `GET` | 書類生成ステータス取得 | (なし) | `{"status": "completed", "file_url": "url"}` |
| `/api/documents` | `GET` | 過去の書類一覧取得 | (なし) | `[{"id": "uuid", "title": "...", "created_at": "timestamp"}, ...]` |
| `/api/documents/:documentId` | `GET` | 特定書類詳細取得 | (なし) | `{"id": "uuid", "title": "...", "file_url": "...", "input_data": "..."}` |

## 5. 共通非機能要件

- **認証**: Supabase Authを用いたJWT認証。全てのAPIエンドポイントは認証済みユーザーのみアクセス可能。
- **データ永続化**: Supabase PostgreSQLに全てのユーザーデータ、チャット履歴、レポート、書類データを保存。
- **データセキュリティ**:
    - BYOKのAPIキーは暗号化してデータベースに保存。
    - SupabaseのRow Level Security (RLS) を有効化し、各ユーザーが自身のデータのみにアクセスできるよう制御。
    - 全ての通信はHTTPSで暗号化。
- **可用性**: Cloudflare Workersのグローバル分散アーキテクチャにより、99.9%以上の可用性を目指す。
- **応答速度**:
    - チャットアシスタントのAI応答は3秒以内。
    - ファイルアップロード・レポート/書類生成はファイルサイズや処理内容によるが、最大60秒以内（非同期処理）。
    - その他のAPIレスポンスは500ms以内。
- **スケーラビリティ**: Cloudflare WorkersおよびSupabaseのマネージドサービスを活用し、ユーザー増加に柔軟に対応できるアーキテクチャとする。
- **監視・ロギング**: Cloudflare Workersのログ、Supabaseのログを監視し、エラーやパフォーマンス問題を早期に検知・対応。
- **対応ブラウザ**: Chrome, Safari, Edge（最新2バージョン）。
- **モバイル対応**: iOS Safari, Android Chromeに対応したレスポンシブUI。

