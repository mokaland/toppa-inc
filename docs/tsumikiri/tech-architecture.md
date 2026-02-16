# ツミキリ 技術アーキテクチャ設計

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-16
> ステータス: ドラフト

## 1. システム構成図

ツミキリのシステム構成は、既存の技術方針書 `docs/tech-direction.md` に基づき、以下の通りとする。
特に、チャットアシスタント機能とAIレポート生成機能の追加を反映する。

```mermaid
graph TD
    A[ユーザー (ブラウザ)] -- HTTPS --> B(Cloudflare Pages / React Frontend)
    B -- API リクエスト --> C(Cloudflare Workers / Hono API)
    C -- 認証 / データ保存 --> D(Supabase PostgreSQL)
    C -- ファイル一時保存 --> E(Supabase Storage)
    C -- AIリクエスト (BYOKまたはマネージド) --> F(AI Provider API <br> OpenAI/Anthropic/Google)

    subgraph 主要機能フロー
        B -- POST /api/chat --> C
        B -- GET /api/chat/history --> C
        B -- POST /api/report/generate (ファイル含む) --> C
        C -- 会話履歴保存/取得 --> D
        C -- レポート履歴保存/取得 --> D
        C -- アップロードファイル保存 --> E
        C -- AI処理 (チャット応答/レポート生成) --> F
    end
```

## 2. API設計（エンドポイント一覧）

Founding EngineerのMVP実装計画 `docs/implementation-plan.md` に基づき、以下のAPIエンドポイントを定義する。

| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/auth/signup` | POST | ユーザー登録 | Supabase Authを利用 |
| `/api/auth/signin` | POST | ユーザーログイン | Supabase Authを利用 |
| `/api/chat` | POST | チャット送信・AI応答取得 | 会話履歴をSupabaseに保存 |
| `/api/chat/history` | GET | 全会話履歴取得 | ユーザーIDでフィルタリング |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | - |
| `/api/report/upload` | POST | レポート用ファイルアップロード | Supabase Storageに一時保存 |
| `/api/report/generate` | POST | ファイル解析・AIレポート生成 | AI Provider APIと連携 |
| `/api/report/list` | GET | 生成済みレポート一覧取得 | - |
| `/api/report/:reportId` | GET | 特定レポート詳細取得 | - |
| `/api/report/:reportId/download` | GET | レポートダウンロード | PDF/Markdown形式 |
| `/api/template/list` | GET | テンプレート一覧取得 | - |
| `/api/template/:templateId/generate` | POST | テンプレートから書類生成 | - |

## 3. BYOK実装方針

「ツミキリ」では、ユーザーが自身のAIプロバイダーAPIキーを利用できるBYOK (Bring Your Own Key) 方式をサポートする。

- **キーの保存**: ユーザーから提供されたAPIキーは、Supabaseのデータベースに暗号化して保存する。各ユーザーのキーは、そのユーザーのみがアクセスできるようRow Level Security (RLS) で保護する。
- **キーの利用**: Cloudflare Workers上でAIプロバイダーへのリクエスト時にのみ、一時的にキーを復号して利用する。リクエスト完了後、メモリから即座に破棄し、ログには記録しない。
- **セキュリティ**: Cloudflare Workersのシークレット管理機能とSupabaseのセキュリティ機能を組み合わせ、キーの漏洩リスクを最小限に抑える。

## 4. セキュリティ要件

`docs/tech-direction.md` に記載の全体セキュリティ方針に加え、ツミキリ固有の要件を以下に定める。

- **ユーザーデータ分離**: SupabaseのRow Level Security (RLS) を徹底し、各ユーザーが自身のデータ（会話履歴、レポート、アップロードファイル、APIキー）のみにアクセスできることを保証する。
- **APIキーの厳重管理**: BYOK方式で提供されるユーザーのAIプロバイダーAPIキーは、データベースで暗号化して保存し、利用時のみ一時的に復号する。ログへの記録は厳禁とする。
- **入力・出力検証**: AIへのプロンプト入力およびAIからの応答出力に対し、不適切なコンテンツ（個人情報、機密情報など）や悪意のあるインジェクションを防ぐためのサニタイズ・検証処理を実装する。
- **レートリミット**: APIエンドポイントごとに適切なレートリミットを設定し、DoS攻撃や不正利用を防止する。
- **ファイルアップロード**: Supabase Storageへのファイルアップロード時に、ファイルタイプ検証、サイズ制限、ウイルススキャン（将来的に検討）を実施する。
- **認証**: Supabase Authを利用し、セキュアなユーザー認証フローを確立する。セッション管理もSupabaseの機能に委ねる。
