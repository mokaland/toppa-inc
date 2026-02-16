# ツミキリ 技術アーキテクチャ設計

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-16
> ステータス: 更新済み

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

Founding EngineerのMVP実装計画 `docs/implementation-plan.md` および最新の進捗 `docs/implementation-progress.md` に基づき、以下のAPIエンドポイントを定義する。

| エンドポイント | Method | 機能 | 備考 |
|---------------|--------|------|------|
| `/api/auth/signup` | POST | ユーザー登録 | Supabase Authを利用、実装完了 |
| `/api/auth/signin` | POST | ユーザーログイン | Supabase Authを利用、実装完了 |
| `/api/chat` | POST | チャット送信・AI応答取得 | 会話履歴をSupabaseに保存、実装中 |
| `/api/chat/history` | GET | 全会話履歴取得 | ユーザーIDでフィルタリング、実装中 |
| `/api/chat/history/:sessionId` | GET | 特定セッションの履歴取得 | - |
| `/api/report/upload` | POST | レポート用ファイルアップロード | Supabase Storageに一時保存、実装完了 |
| `/api/report/generate` | POST | ファイル解析・AIレポート生成 | AI Provider APIと連携、実装中 |
| `/api/report/list` | GET | 生成済みレポート一覧取得 | - |
| `/api/report/:reportId` | GET | 特定レポート取得 | - |
| `/api/templates` | GET | テンプレート一覧取得 | - |
| `/api/templates/:templateId` | GET | 特定テンプレート取得 | - |
| `/api/templates/generate` | POST | テンプレートから書類生成 | - |

## 3. BYOK実装方針

BYOK（Bring Your Own Key）方式は、ユーザーが自身のAIプロバイダーAPIキーを利用できるようにするもので、以下の原則で実装する。

- **ユーザー管理**: Supabase Auth を利用し、安全なユーザー認証・認可を実現する。
- **APIキーの保存**: ユーザーから提供されたAPIキーは、Cloudflare Workers のシークレット管理機能を利用し、セキュアに保存する。Supabaseの暗号化機能も活用し、データベースに保存する際は暗号化を徹底する。
- **APIキーの利用**: ユーザーのAPIキーは、リクエストごとに一時的にメモリ上で利用し、AIプロバイダーへのリクエスト完了後、速やかにメモリから破棄する。ログには一切記録しない。
- **レートリミット**: ユーザーごとのAPIキー利用状況を監視し、過度な利用を防ぐためのレートリミット機構を導入する。

## 4. セキュリティ要件

### データ保護

- **通信**: TLS 1.3（Cloudflare標準）を適用し、すべての通信を暗号化する。
- **保存データ**: Supabase PostgreSQL に保存されるデータは、AES-256で暗号化される。特に機密性の高いユーザーデータやAPIキーは、追加の暗号化レイヤーを検討する。
- **ファイル保存**: アップロードされたファイルは Supabase Storage に保存され、アクセス制御は Supabase の Row Level Security (RLS) および Storage Policies で厳密に管理する。

### 認証・認可

- **ユーザー認証**: Supabase Auth を利用し、メールアドレスとパスワードによる認証、およびソーシャルログイン（Google, GitHubなど）に対応する。Founding Engineerにより、Supabaseプロジェクトの初期化と認証機能の実装が完了しているため、これを基盤とする。
- **認可**: Supabase の Row Level Security (RLS) を全面的に適用し、ユーザーは自身のデータのみにアクセスできるよう厳密に制御する。APIキーなどの機密情報もユーザーごとに分離し、アクセス権限を最小限にする。
- **APIキー管理**: Cloudflare Workers のシークレット管理機能に加え、Supabase の Security & Access Policies を活用し、APIキーへの不正アクセスを防止する。

### BYOK セキュリティ

- ユーザーのAPIキーはサーバーサイドで一時利用のみとし、リクエスト完了後メモリから破棄する。
- ログにAPIキーを記録しない。
- ユーザーごとのAPIキーは、Supabaseの暗号化機能とRLSを用いて厳重に管理する。

## 5. 技術スタック詳細と追加検討事項

### バックエンド (Cloudflare Workers)

- **AIレポート生成機能におけるxlsxライブラリの導入**:
    - Founding Engineerの検討結果に基づき、Cloudflare Workers環境での`xlsx`ライブラリ導入は、`wrangler`によるバンドルと`node_compat = true`の設定を第一アプローチとする。
    - Node.jsの組み込みモジュール依存の問題を解決するため、段階的な実装とシンプルなExcelファイルの読み込みから動作検証を進める。
    - 問題が発生した場合は、CDN版/WASM版の利用を検討する。

### フロントエンド (React + TypeScript + Tailwind CSS)

- Founding Engineerにより、Cloudflare Pagesプロジェクトの作成と、React/TypeScript/Vite、Tailwind CSSを用いたフロントエンド開発環境の初期セットアップが完了しており、チャットUIの実装に着手している。この基盤を活用し、APIとの連携をスムーズに行う。