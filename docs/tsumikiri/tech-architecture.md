作成者: CTO マルコ・ロッシ
日付: 2026-02-15
ステータス: 策定中

## 1. 概要

本ドキュメントは、ツミキリMVPの技術アーキテクチャ設計を定義する。TOPPA Inc.全体の技術方針書 (`docs/tech-direction.md`) に基づき、Founding Engineerによる実装計画 (`docs/implementation-plan.md`) および進捗 (`docs/implementation-progress.md`) を反映させる。

## 2. システム構成図

ツミキリMVPのシステム構成は、TOPPA Inc.全体の技術方針書 (`docs/tech-direction.md`) に準拠し、以下のように設計する。

```mermaid
graph TD
    A[ユーザー (ブラウザ)] -- HTTPS --> B[Cloudflare Pages (React SPA)]
    B -- APIリクエスト --> C[Cloudflare Workers (Hono API)]
    C -- 認証/DB操作 --> D[Supabase (PostgreSQL, Auth, Storage)]
    C -- AIリクエスト (BYOK/マネージド) --> E[AI Provider API (OpenAI/Anthropic/Google)]
```

## 3. 技術スタック

TOPPA Inc.の技術方針 (`docs/tech-direction.md`) およびFounding Engineerの実装進捗 (`docs/implementation-progress.md`) に基づき、以下の技術スタックを採用する。

- **フロントエンド**: React 19 + TypeScript + Vite, Tailwind CSS, Zustand, React Router
- **バックエンド**: Cloudflare Workers, Hono
- **データベース**: Supabase (PostgreSQL)
- **AI**: OpenAI API / Anthropic API / Google API (BYOK/マネージド方式)
- **ホスティング**: Cloudflare Pages (FE), Cloudflare Workers (BE)
- **CI/CD**: GitHub Actions, Cloudflare Wrangler

## 4. API設計

Founding Engineerの実装計画 (`docs/implementation-plan.md`) に基づき、以下のAPIエンドポイントを設計する。

### 4-1. 認証関連API (Supabase Auth経由)

- `/auth/v1/signup`: ユーザー登録
- `/auth/v1/signin`: ログイン
- `/auth/v1/signout`: ログアウト
- ...その他Supabase Authが提供するエンドポイント

### 4-2. チャットアシスタントAPI

| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/chat` | POST | チャット送信・AI応答取得 | 会話履歴の保存・取得を含む |
| `/api/chat/history` | GET | 全会話履歴取得 | ユーザーIDに基づくフィルタリング |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | セッションIDに基づくフィルタリング |

### 4-3. AIレポート生成API

| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/report/generate` | POST | CSV/ExcelファイルアップロードとAIレポート生成 | ファイル一時保存、AI分析、レポート生成 |
| `/api/report/history` | GET | レポート生成履歴取得 | ユーザーIDに基づくフィルタリング |
| `/api/report/:reportId` | GET | 特定レポート詳細取得 | レポートIDに基づくフィルタリング |
| `/api/report/:reportId/download` | GET | レポートダウンロード (PDF/Markdown) | 生成済みレポートのダウンロード |

### 4-4. テンプレート書類生成API

| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/document/generate` | POST | テンプレートに基づく書類生成 | 指定テンプレートと入力データから書類生成 |
| `/api/document/templates` | GET | 利用可能なテンプレート一覧取得 | ユーザーが利用できるテンプレート |
| `/api/document/history` | GET | 書類生成履歴取得 | ユーザーIDに基づくフィルタリング |
| `/api/document/:documentId` | GET | 特定書類詳細取得 | 書類IDに基づくフィルタリング |
| `/api/document/:documentId/download` | GET | 書類ダウンロード (PDF/Docx) | 生成済み書類のダウンロード |

## 5. データベース設計 (Supabase PostgreSQL)

Founding Engineerの進捗 (`docs/implementation-progress.md`) を参照し、以下のテーブル構成を採用する。

### 5-1. chat_messages テーブル

- **用途**: ユーザーとAIの会話履歴を保存
- **スキーマ**:
  ```sql
  CREATE TABLE chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **RLS**: 有効化 (`docs/implementation-plan.md` に準拠)
  - `Users can view own messages`
  - `Users can insert own messages`

### 5-2. reports テーブル

- **用途**: AIレポート生成履歴を保存
- **スキーマ**: (`docs/implementation-plan.md` を参照し、Founding Engineerがまだ作成していない部分を補完)
  ```sql
  CREATE TABLE reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      file_name VARCHAR(255),
      file_url TEXT,
      prompt TEXT NOT NULL,
      result TEXT,
      format VARCHAR(50), -- PDF, Markdownなど
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **RLS**: 有効化 (ユーザーは自身のレポートのみ閲覧・操作可能)

### 5-3. documents テーブル

- **用途**: 生成済み書類の履歴を保存
- **スキーマ**: (`docs/implementation-plan.md` を参照し、Founding Engineerがまだ作成していない部分を補完)
  ```sql
  CREATE TABLE documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      template_name VARCHAR(255) NOT NULL,
      input_data JSONB NOT NULL,
      output_url TEXT,
      format VARCHAR(50), -- PDF, Docxなど
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **RLS**: 有効化 (ユーザーは自身の書類のみ閲覧・操作可能)

### 5-4. user_settings テーブル

- **用途**: ユーザーごとの設定、特にBYOK用のAPIキーを保存
- **スキーマ**: (`docs/implementation-progress.md` に記載あり、詳細化)
  ```sql
  CREATE TABLE user_settings (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      openai_api_key TEXT,
      anthropic_api_key TEXT,
      google_api_key TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **RLS**: 有効化 (ユーザーは自身の設定のみ閲覧・更新可能)
- **注意**: APIキーは暗号化して保存し、厳重に管理すること。

## 6. BYOK実装方針

TOPPA Inc.の技術方針 (`docs/tech-direction.md`) に準拠し、ユーザーのAPIキー (BYOK: Bring Your Own Key) を利用する方式を実装する。

- **保存**: `user_settings` テーブルに暗号化して保存。
- **利用**: Cloudflare Workers上で、ユーザーからのリクエスト時に復号し、AIプロバイダーへのリクエストに利用。リクエスト完了後、メモリから即座に破棄。
- **ログ**: ユーザーのAPIキーは一切ログに記録しない。
- **バリデーション**: 保存時、および利用時にAPIキーの有効性を確認する。

## 7. セキュリティ要件

TOPPA Inc.の技術方針 (`docs/tech-direction.md`) およびFounding Engineerの進捗 (`docs/implementation-progress.md`) を踏まえ、以下のセキュリティ要件を定義する。

- **データ保護**:
    - 通信: 全ての通信はTLS 1.3で暗号化（Cloudflare標準）。
    - 保存データ: SupabaseのAES-256暗号化を適用。
    - APIキー: Cloudflare Workersのシークレット管理機能と`user_settings`テーブルでの暗号化保存を組み合わせる。
- **認証・認可**:
    - Supabase Authによるユーザー認証（メール/ソーシャルログイン）。
    - 全てのテーブルにRow Level Security (RLS) を有効化し、ユーザーは自身のデータのみアクセス可能とする。
    - APIエンドポイントへのアクセスは認証済みユーザーに限定し、`user_id`に基づく認可を行うミドルウェアをCloudflare Workersに実装する。
- **BYOKセキュリティ**:
    - ユーザーのAPIキーはサーバーサイドで一時的に利用し、ログには記録しない。
    - APIキーは暗号化して保存し、復号は必要最小限の期間のみ行う。
- **脆弱性対策**:
    - OWASP Top 10を考慮したWebアプリケーション脆弱性対策を実施。
    - 定期的なセキュリティスキャンとコードレビューを実施。
- **監査ログ**: 重要な操作（APIキーの更新、データ削除など）については監査ログを記録する。

## 8. パフォーマンス要件

TOPPA Inc.の技術方針 (`docs/tech-direction.md`) に準拠。

- 初期ロード: 2秒以内（LCP）
- チャット応答: 3秒以内（AI応答含む）
- レポート生成: 10秒以内（CSV 1000行まで）
- 書類生成: 5秒以内

## 9. 今後の検討事項

- **エラーハンドリング**: APIエラーの共通処理とユーザーへの適切なフィードバックメカニズムの設計。
- **レートリミット**: AIプロバイダーAPIへのリクエスト、および自社APIへのリクエストに対するレートリミット導入。
- **モニタリング**: Cloudflare Workers, Supabase, AIプロバイダーの利用状況とパフォーマンスを監視する仕組みの構築。
