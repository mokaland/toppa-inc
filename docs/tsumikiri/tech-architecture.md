# ツミキリ 技術アーキテクチャ設計書

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-16
> ステータス: 更新済み（Founding Engineerの進捗とPdMの仕様を反映）

## 1. システム構成

ツミキリのシステム構成は、高速性、スケーラビリティ、開発効率を重視し、CloudflareとSupabaseを基盤とするサーバーレスアーキテクチャを採用する。Founding Engineerの進捗に基づき、AIレポート生成機能におけるSupabase Storageとの連携を強化し、より詳細な構成図を提示する。

```mermaid
graph TD
    A[ユーザー (ブラウザ)] -- HTTPS --> B(Cloudflare Pages - React SPA)
    B -- APIリクエスト (POST /api/chat, /api/report/upload, etc.) --> C(Cloudflare Workers - Hono API)
    C -- 認証 --> D1(Supabase Auth)
    C -- データ操作 (チャット履歴, レポート履歴) --> D2(Supabase PostgreSQL)
    C -- ファイル操作 (レポートファイル) --> D3(Supabase Storage)
    C -- AIリクエスト (BYOKまたはマネージド) --> E(AI Provider API - OpenAI/Anthropic/Google)

    subgraph Supabase
        D1 -- JWT --> D2
        D1 -- JWT --> D3
    end
```

## 2. API設計

Cloudflare Workers (Hono) を用いて、以下のAPIエンドポイントを提供する。Founding Engineerの実装計画と進捗、PdMの仕様に基づき、チャット、レポート生成、テンプレート書類生成の各機能に対応する。

### 2-1. チャットアシスタントAPI

| エンドポイント | Method | 機能 | 連携データストア | 備考 |
|---------------|--------|------|------------------|------|
| `/api/chat` | POST | チャット送信・AI応答取得 | Supabase PostgreSQL (chat_messages) | ユーザーからのメッセージをAIに渡し、応答を返す。会話履歴はSupabaseに保存。 |
| `/api/chat/history` | GET | 会話履歴取得 | Supabase PostgreSQL (chat_messages) | ログインユーザーの全会話履歴を取得。 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | Supabase PostgreSQL (chat_messages) | 特定のチャットセッションの会話履歴を取得。 |

### 2-2. AIレポート生成API

Founding EngineerによりAIレポート生成機能の実装が開始され、Supabase Storageのバケット作成とRLS設定が完了した。これに伴い、ファイルアップロードのエンドポイントと、それに関連するストレージ連携を明確にする。

| エンドポイント | Method | 機能 | 連携データストア | 備考 |
|---------------|--------|------|------------------|------|
| `/api/report/upload` | POST | ファイルアップロード | Supabase Storage | CSV/ExcelファイルをSupabase Storageに一時保存。Founding Engineerにより実装完了。 |
| `/api/report/generate` | POST | レポート生成 | Supabase Storage, Supabase PostgreSQL (reports) | アップロードされたファイルを指定し、自然言語の指示に基づきAIが分析・レポート生成。 |
| `/api/report/history` | GET | レポート履歴取得 | Supabase PostgreSQL (reports) | ログインユーザーの全レポート生成履歴を取得。 |
| `/api/report/:reportId` | GET | 特定レポート詳細取得 | Supabase PostgreSQL (reports) | 特定のレポートの詳細と生成結果を取得。 |
| `/api/report/:reportId/download` | GET | レポートダウンロード | Supabase Storage | 生成されたレポートファイルをダウンロード。 |

### 2-3. テンプレート書類生成API (設計中)

PdMの仕様とFounding Engineerの実装計画に基づき、今後以下のAPIを設計する。

| エンドポイント | Method | 機能 | 連携データストア | 備考 |
|---------------|--------|------|------------------|------|
| `/api/template/list` | GET | テンプレート一覧取得 | Supabase PostgreSQL (templates) | ユーザーが利用可能なテンプレートの一覧を取得。 |
| `/api/template/generate` | POST | 書類生成 | Supabase PostgreSQL (documents) | 指定されたテンプレートと入力データに基づき、AIが書類を自動生成。 |
| `/api/template/:documentId/download` | GET | 書類ダウンロード | Supabase Storage | 生成された書類ファイルをダウンロード。 |

## 3. BYOK (Bring Your Own Key) 実装方針

ユーザーが自身のAIプロバイダーAPIキーを利用できるBYOK方式は、柔軟性とコスト効率の観点から重要な機能である。

- **キーの保存**: ユーザーから提供されたAPIキーは、Cloudflare Workersのシークレット管理機能を利用し、暗号化された状態で安全に保存する。ユーザーごとに分離して管理する。
- **キーの利用**: APIリクエスト時にサーバーサイドで一時的に利用し、AIプロバイダーへのリクエストヘッダーに含める。
- **ログへの記録禁止**: ユーザーのAPIキーがログに記録されることは絶対にない。
- **メモリからの破棄**: リクエスト完了後、APIキーはメモリから即座に破棄される。

## 4. セキュリティ要件

ツミキリのセキュリティは、データ保護、認証・認可、BYOKセキュリティの三つの柱で構成される。

### 4-1. データ保護

- **通信の暗号化**: Cloudflareが提供するTLS 1.3により、すべての通信はエンドツーエンドで暗号化される。
- **保存データの暗号化**: SupabaseのPostgreSQLおよびStorageに保存されるデータは、AES-256などの業界標準の暗号化方式で保護される。
- **ファイルの一時保存**: AIレポート生成時にアップロードされるファイルは、Supabase Storageに一時的に保存され、レポート生成完了後に削除されるか、ユーザーが明示的に保存を選択した場合のみ永続化される。

### 4-2. 認証・認可

- **ユーザー認証**: Supabase Authを利用し、メールアドレス/パスワード認証およびソーシャルログイン（Google, GitHubなど）を提供する。
- **Row Level Security (RLS)**: Supabaseの強力なRLS機能を全面的に活用し、ユーザーは自身のデータ（チャット履歴、レポート履歴、アップロードファイルなど）のみにアクセス可能とする。Founding Engineerが実装した`chat_messages`テーブルのRLSポリシー（`Users can view own messages`, `Users can insert own messages`）は、他のデータテーブルにも適用を徹底する。
- **APIキーの分離**: BYOK方式で提供されるユーザーのAIプロバイダーAPIキーは、各ユーザー専用として厳格に分離・管理する。

### 4-3. BYOKセキュリティ

- **サーバーサイドでの処理**: ユーザーのAPIキーは、クライアントサイドではなく、Cloudflare Workers上で安全に処理される。
- **レートリミットと監視**: 悪意のある利用や誤用を防ぐため、APIキーごとのレートリミットを設定し、異常な利用パターンを監視する。

## 5. 開発規約

`docs/tech-direction.md`に準拠する。

## 6. パフォーマンス要件

`docs/tech-direction.md`に準拠する。

## 7. 将来の技術拡張（Q2以降の検討事項）

`docs/tech-direction.md`に準拠する。

## 8. 技術的リスクと対策

`docs/tech-direction.md`に準拠する。
