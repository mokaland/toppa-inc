# TOPPA Inc. 技術アーキテクチャ設計書

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-17
> ステータス: 確定
> レビュー: CEO 高橋レン

## 1. 技術理念

**シンプルに、堅牢に。** 経営者が使うプロダクトに過剰な技術は不要。最小限の技術で最大限の価値を届ける。

## 2. 技術スタック

### フロントエンド
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** — ユーティリティファーストでスピード重視
- **Zustand** — 軽量状態管理（Redux不要）
- **React Router** — SPA構成

### バックエンド
- **Cloudflare Workers** — エッジコンピューティング、グローバル低レイテンシ
- **Hono** — 軽量Webフレームワーク（Cloudflare Workers対応）

### データベース
- **Supabase (PostgreSQL)** — 認証 + DB + ストレージを一括提供
- Row Level Security（RLS）によるデータ分離

### AI（プロダクト向け）
- **BYOK方式**: ユーザーのAPIキーでAI機能を利用
  - OpenAI (GPT-4o / GPT-4.5)
  - Anthropic (Claude Sonnet 4.5)
  - Google (Gemini 2.5 Pro)
- **マネージド方式**: TOPPA Inc.のAPIキーを使用（Pro プラン）

### AI（社内エージェント基盤）
- **MiniMax M2.5 Standard** — AI社員の全ロールが使用するモデル
  - $0.15/1M input, $1.20/1M output
  - コーディング能力: SWE-Bench 80.2%（Claude Opus 4.6級）
  - 24時間フル自律運営: 月¥1,700
- **GCP Cloud Functions + Cloud Scheduler** — 1-2時間おきにセッション自動実行
- **GitHub API** — AI社員がリポジトリにコミット・push

### ホスティング
- **Cloudflare Pages** — フロントエンドホスティング
- **Cloudflare Workers** — APIサーバー

### CI/CD
- **GitHub Actions** — PR時にLint + Type Check + テスト
- **Cloudflare Wrangler** — `main` ブランチマージ時に自動デプロイ

## 3. アーキテクチャ

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   ブラウザ    │────▶│ Cloudflare Pages │     │   Supabase   │
│ (React SPA)  │     │   (静的ホスト)    │     │  PostgreSQL  │
└──────┬───────┘     └──────────────────┘     │   Auth       │
       │                                      │   Storage    │
       │ API リクエスト                         └──────▲───────┘
       ▼                                             │
┌──────────────────┐                                 │
│ Cloudflare Worker │─────────────────────────────────┘
│   (Hono API)      │
└──────┬───────────┘
       │ AIリクエスト（BYOKまたはマネージド）
       ▼
┌──────────────────┐
│  AI Provider API  │
│ OpenAI/Anthropic/ │
│ Google            │
└──────────────────┘
```

---

## 4. API設計 - AIレポート生成機能

PdMのMVP仕様に基づき、AIレポート生成機能のAPIエンドポイントを設計する。

### 4.1. データモデル

以下のテーブルをSupabase (PostgreSQL) に定義する。

#### `files` テーブル
ユーザーがアップロードしたファイルを管理する。
| カラム名     | 型       | 制約                                    | 説明                                      |
|:-------------|:---------|:----------------------------------------|:------------------------------------------|
| `id`         | `UUID`   | `PRIMARY KEY`                           | ファイルID                                |
| `user_id`    | `UUID`   | `NOT NULL`, `REFERENCES users(id)`      | アップロードユーザーID                    |
| `file_name`  | `TEXT`   | `NOT NULL`                              | 元のファイル名                            |
| `file_type`  | `TEXT`   | `NOT NULL`                              | MIMEタイプ (e.g., `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) |
| `file_size`  | `INTEGER`| `NOT NULL`                              | ファイルサイズ (バイト)                   |
| `upload_date`| `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT NOW()` | アップロード日時                          |
| `storage_path`| `TEXT`   | `NOT NULL`                              | Supabase Storageのパス                    |

#### `report_tasks` テーブル
AIレポート生成タスクの進行状況を管理する。
| カラム名          | 型       | 制約                                    | 説明                                      |
|:------------------|:---------|:----------------------------------------|:------------------------------------------|
| `id`              | `UUID`   | `PRIMARY KEY`                           | レポート生成タスクID                      |
| `user_id`         | `UUID`   | `NOT NULL`, `REFERENCES users(id)`      | タスク実行ユーザーID                      |
| `file_id`         | `UUID`   | `NOT NULL`, `REFERENCES files(id)`      | 対象ファイルID                            |
| `instruction`     | `TEXT`   | `NOT NULL`                              | ユーザーの指示プロンプト                  |
| `status`          | `TEXT`   | `NOT NULL`, `CHECK (status IN ('pending', 'processing', 'completed', 'failed'))` | タスクステータス |
| `progress`        | `INTEGER`| `NOT NULL`, `DEFAULT 0`                 | 進捗率 (0-100)                            |
| `created_at`      | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT NOW()` | タスク作成日時                            |
| `completed_at`    | `TIMESTAMP WITH TIME ZONE` | `NULLABLE`                              | タスク完了日時                            |
| `error_message`   | `TEXT`   | `NULLABLE`                              | エラーメッセージ                          |
| `report_id`       | `UUID`   | `NULLABLE`, `REFERENCES reports(id)`    | 生成されたレポートID (完了時のみ)         |

#### `reports` テーブル
生成されたAIレポートの内容を管理する。
| カラム名          | 型       | 制約                                    | 説明                                      |
|:------------------|:---------|:----------------------------------------|:------------------------------------------|
| `id`              | `UUID`   | `PRIMARY KEY`                           | レポートID                                |
| `task_id`         | `UUID`   | `NOT NULL`, `REFERENCES report_tasks(id)` | 関連するレポート生成タスクID              |
| `user_id`         | `UUID`   | `NOT NULL`, `REFERENCES users(id)`      | レポート所有ユーザーID                    |
| `title`           | `TEXT`   | `NOT NULL`                              | レポートタイトル                          |
| `content_markdown`| `TEXT`   | `NOT NULL`                              | レポート本文 (Markdown形式)               |
| `content_pdf_url` | `TEXT`   | `NULLABLE`                              | PDFレポートのURL                          |
| `created_at`      | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT NOW()` | レポート作成日時                          |

### 4.2. APIエンドポイント

Cloudflare Workers (Hono) で以下のAPIエンドポイントを提供する。

#### 1. ファイルアップロード
- **パス**: `/api/reports/upload`
- **メソッド**: `POST`
- **説明**: CSV/Excelファイルをアップロードし、レポート生成の準備をする。
- **リクエスト**: `multipart/form-data`
  - `file`: アップロードするバイナリファイルデータ
- **レスポンス (200 OK)**:
  ```json
  {
    "id": "string (UUID)",
    "user_id": "string (UUID)",
    "file_name": "string",
    "file_type": "string (MIMEタイプ)",
    "file_size": "integer (バイト)",
    "upload_date": "string (ISO 8601)",
    "storage_path": "string"
  }
  ```
- **エラーレスポンス (400 Bad Request)**:
  ```json
  {
    "error": "string (エラーメッセージ)"
  }
  ```

#### 2. レポート生成指示
- **パス**: `/api/reports/generate`
- **メソッド**: `POST`
- **説明**: アップロードされたファイルとユーザーの指示に基づいてAIレポート生成を開始する。
- **リクエスト (application/json)**:
  ```json
  {
    "file_id": "string (UUID)",
    "instruction": "string (例: 今月の売上を部門別にまとめて。特に利益率の高い部門を教えて)"
  }
  ```
- **レスポンス (202 Accepted)**:
  ```json
  {
    "id": "string (UUID)",
    "user_id": "string (UUID)",
    "file_id": "string (UUID)",
    "instruction": "string",
    "status": "pending",
    "progress": 0,
    "created_at": "string (ISO 8601)",
    "completed_at": null,
    "error_message": null,
    "report_id": null
  }
  ```
- **エラーレスポンス (400 Bad Request)**:
  ```json
  {
    "error": "string (エラーメッセージ)"
  }
  ```

#### 3. レポート生成ステータス取得
- **パス**: `/api/reports/{task_id}/status`
- **メソッド**: `GET`
- **説明**: 指定されたレポート生成タスクの現在のステータスと進捗を取得する。
- **リクエスト**: なし
- **レスポンス (200 OK)**:
  ```json
  {
    "status": "string (pending|processing|completed|failed)",
    "progress": "integer (0-100)",
    "report_id": "string (UUID, if completed)",
    "error_message": "string (if failed)"
  }
  ```
- **エラーレスポンス (404 Not Found)**:
  ```json
  {
    "error": "string (タスクが見つかりません)"
  }
  ```

#### 4. レポート取得
- **パス**: `/api/reports/{report_id}`
- **メソッド**: `GET`
- **説明**: 生成されたAIレポートの内容を取得する。
- **リクエスト**: なし
- **レスポンス (200 OK)**:
  ```json
  {
    "id": "string (UUID)",
    "task_id": "string (UUID)",
    "user_id": "string (UUID)",
    "title": "string",
    "content_markdown": "string (Markdown形式のレポート本文)",
    "content_pdf_url": "string (PDFレポートのURL, nullable)",
    "created_at": "string (ISO 8601)"
  }
  ```
- **エラーレスポンス (404 Not Found)**:
  ```json
  {
    "error": "string (レポートが見つかりません)"
  }
  ```

#### 5. レポート履歴取得
- **パス**: `/api/reports`
- **メソッド**: `GET`
- **説明**: ユーザーが生成したすべてのレポートの履歴を取得する。
- **リクエスト**: なし
- **レスポンス (200 OK)**:
  ```json
  {
    "reports": [
      {
        "id": "string (UUID)",
        "task_id": "string (UUID)",
        "user_id": "string (UUID)",
        "title": "string",
        "content_markdown": "string (Markdown形式のレポート本文)",
        "content_pdf_url": "string (PDFレポートのURL, nullable)",
        "created_at": "string (ISO 8601)"
      }
      // ... 他のレポート
    ]
  }
  ```
- **エラーレスポンス (500 Internal Server Error)**:
  ```json
  {
    "error": "string (エラーメッセージ)"
  }
  ```

## 5. 開発規約

### コード品質
- TypeScript strict mode 必須
- ESLint + Prettier による自動フォーマット
- 全関数にJSDocコメント（経営者向けプロダクトなので保守性重視）

### テスト
- ユニットテスト: Vitest（カバレッジ80%目標）
- E2Eテスト: Playwright（主要フロー3つ）
- AI応答テスト: モックAPIでの動作検証

### ブランチ戦略
- `main`: 本番環境（自動デプロイ）
- `develop`: 開発統合ブランチ
- `feature/*`: 機能開発ブランチ
- PR必須、CTOレビュー後にマージ

### コミットメッセージ
- AGENTS.md準拠: `[ロール名] 内容`
- 例: `[Engineer] CSVアップロード機能を実装`

## 6. パフォーマンス要件

| 指標 | 目標値 |
|------|--------|
| 初期ロード | 2秒以内（LCP） |
| チャット応答 | 3秒以内（AI応答含む） |
| レポート生成 | 10秒以内（CSV 1000行まで） |
| 書類生成 | 5秒以内 |

## 7. 将来の技術拡張（Q2以降の検討事項）

- **音声入力**: Web Speech API → 自然言語指示
- **モバイルアプリ**: PWA対応（インストール不要）
- **Webhook連携**: 外部サービスとの自動連携
- **マルチテナント**: 企業ごとのデータ完全分離

## 8. ファイル処理方針

### Excelファイルの処理
Cloudflare WorkersはNode.jsのファイルシステム