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
                    ├── 生成され...

## 5. データモデル案 (CTOマルコ・ロッシからのフィードバック)

以下は、AIレポート生成機能を実現するための初期データモデル案です。PdMはこれを参考に、具体的なテーブル定義、カラム、リレーションシップを`mvp-spec.md`に追記してください。

### Userテーブル
-   `user_id`: UUID (Primary Key)
-   `email`: VARCHAR(255) (Unique)
-   `created_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP)
-   `updated_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

### Fileテーブル
-   `file_id`: UUID (Primary Key)
-   `user_id`: UUID (Foreign Key to User.user_id)
-   `file_name`: VARCHAR(255)
-   `file_type`: VARCHAR(50) (e.g., 'csv', 'xlsx')
-   `file_size_bytes`: INT
-   `storage_path`: VARCHAR(255) (Supabase Storage上のパス)
-   `uploaded_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP)
-   `status`: VARCHAR(50) (e.g., 'uploaded', 'processing', 'failed')

### Reportテーブル
-   `report_id`: UUID (Primary Key)
-   `user_id`: UUID (Foreign Key to User.user_id)
-   `file_id`: UUID (Foreign Key to File.file_id)
-   `report_type`: VARCHAR(100) (e.g., 'sales_summary', 'profit_analysis')
-   `report_format`: VARCHAR(50) (e.g., 'pdf', 'markdown')
-   `content_url`: VARCHAR(255) (生成されたレポートへのURL, Supabase Storage)
-   `generated_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP)
-   `status`: VARCHAR(50) (e.g., 'pending', 'generating', 'completed', 'failed')
-   `prompt`: TEXT (ユーザーの自然言語指示)

## 6. API仕様案 (CTOマルコ・ロッシからのフィードバック)

以下は、AIレポート生成機能に関する主要なAPIエンドポイントのドラフトです。PdMはこれを参考に、各エンドポイントの詳細なリクエスト/レスポンス、エラーハンドリングなどを`mvp-spec.md`に追記してください。

### 1. ファイルアップロードAPI

-   **エンドポイント**: `POST /files/upload`
-   **説明**: CSV/Excelファイルをアップロードし、AI処理のために保存します。
-   **リクエスト**:
    -   `Content-Type`: `multipart/form-data`
    -   `body`:
        -   `file`: バイナリファイルデータ (CSV/Excel)
        -   `user_id`: string (UUID)
-   **レスポンス (200 OK)**:
    -   `file_id`: string (UUID)
    -   `file_name`: string
    -   `status`: string (例: 'uploaded')
-   **エラーレスポンス (400 Bad Request)**:
    -   `message`: string

### 2. レポート生成API

-   **エンドポイント**: `POST /reports/generate`
-   **説明**: アップロードされたファイルとユーザーのプロンプトに基づいてAIレポートを生成します。
-   **リクエスト**:
    -   `Content-Type`: `application/json`
    -   `body`:
        -   `file_id`: string (UUID)
        -   `prompt`: string (ユーザーの自然言語指示)
        -   `report_format`: string (例: 'pdf', 'markdown')
-   **レスポンス (202 Accepted)**:
    -   `report_id`: string (UUID)
    -   `status`: string (例: 'pending')
-   **エラーレスポンス (400 Bad Request)**:
    -   `message`: string

### 3. レポート取得API

-   **エンドポイント**: `GET /reports/{report_id}`
-   **説明**: 生成されたレポートのステータスやコンテンツURLを取得します。
-   **リクエスト**:
    -   `path_params`:
        -   `report_id`: string (UUID)
-   **レスポンス (200 OK)**:
    -   `report_id`: string (UUID)
    -   `status`: string (例: 'completed', 'generating', 'failed')
    -   `content_url`: string (レポートのURL, `status` が 'completed' の場合のみ)
    -   `generated_at`: datetime (生成日時, `status` が 'completed' の場合のみ)
-   **エラーレスポンス (404 Not Found)**:
    -   `message`: string

---
> 作成者: CTO マルコ・ロッシ
> 日付: 2026-02-17
> ステータス: フィードバック完了
