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

## 2. 技術スタック

### フロントエンド
- **React 19** + **TypeScript** + **Vite**
    - Cloudflare Pagesプロジェクト作成と初期セットアップ完了
    - チャットUIの基本コンポーネント骨子実装完了
- **Tailwind CSS** — ユーティリティファーストでスピード重視
- **Zustand** — 軽量状態管理（Redux不要）
- **React Router** — SPA構成

### バックエンド
- **Cloudflare Workers** — エッジコンピューティング、グローバル低レイテンシ
    - `xlsx`ライブラリの利用方針: `wrangler`によるバンドルと`node_compat = true`を設定し、Cloudflare Workersでの利用を試みる。
- **Hono** — 軽量Webフレームワーク（Cloudflare Workers対応）

### データベース
- **Supabase (PostgreSQL)** — 認証 + DB + ストレージを一括提供
    - Supabaseプロジェクト初期化完了
    - 認証機能（Supabase Auth）実装完了
    - Row Level Security（RLS）によるデータ分離を適用済み（例: `chat_messages`テーブル）

### AI（プロダクト向け）
- **BYOK方式**: ユーザーのAPIキーでAI機能を利用
  - OpenAI (GPT-4o / GPT-4.5)
  - Anthropic (Claude Sonnet 4.5)
  - Google (Gemini 2.5 Pro)
- **マネージド方式**: TOPPA Inc.のAPIキーを使用（Pro プラン）

### AI（社内エージェント基盤）
- **MiniMax M2.5 Standard** — AI社員の全ロールが使用するモデル
- **GCP Cloud Functions + Cloud Scheduler** — 1-2時間おきにセッション自動実行
- **GitHub API** — AI社員がリポジトリにコミット・push

### ホスティング
- **Cloudflare Pages** — フロントエンドホスティング
- **Cloudflare Workers** — APIサーバー

### CI/CD
- **GitHub Actions** — PR時にLint + Type Check + テスト
- **Cloudflare Wrangler** — `main` ブランチマージ時に自動デプロイ

## 3. API設計（ツミキリ）

Founding EngineerによるMVP実装計画に基づき、以下のAPIエンドポイントを設計する。

#### チャットアシスタントAPI

| エンドポイント | Method | 機能 | リクエスト例 (JSON) | レスポンス例 (JSON) |
|---------------|--------|------|---------------------|---------------------|
| `/api/chat` | `POST` | ユーザーメッセージの送信とAI応答の取得 | `{'message': '今日の売上を教えて', 'conversationId': 'optional_uuid'}` | `{'response': '先月の売上は〇〇円です。', 'conversationId': 'uuid_of_current_conversation'}` |
| `/api/chat/history` | `GET` | ユーザーの会話履歴を全て取得 | なし | `[{'id': 'uuid', 'role': 'user', 'content': '...', 'created_at': '...'}, {'id': 'uuid', 'role': 'assistant', 'content': '...', 'created_at': '...'}]` |
| `/api/chat/history/:conversationId` | `GET` | 特定セッションの会話履歴を取得 | なし | `[{'id': 'uuid', 'role': 'user', 'content': '...', 'created_at': '...'}, {'id': 'uuid', 'role': 'assistant', 'content': '...', 'created_at': '...'}]` |

**リクエスト/レスポンススキーマ詳細**

**1. `POST /api/chat`**
- **リクエストボディ**:
  ```json
  {
    "message": "string",  // ユーザーからのメッセージ (必須)
    "conversationId": "string | null" // 会話ID (オプション、既存の会話を継続する場合)
  }
  ```
- **レスポンスボディ**:
  ```json
  {
    "response": "string", // AIからの応答メッセージ
    "conversationId": "string", // 現在の会話ID (新規の場合は生成、既存の場合はそのID)
    "timestamp": "string" // ISO 8601形式のタイムスタンプ
  }
  ```
  - **エラーレスポンス**:
    ```json
    {
      "error": "string", // エラーメッセージ
      "code": "string" // エラーコード (例: "INVALID_INPUT", "INTERNAL_SERVER_ERROR")
    }
    ```

**2. `GET /api/chat/history`**
- **レスポンスボディ**:
  ```json
  [
    {
      "id": "string", // メッセージID
      "conversationId": "string", // 会話ID
      "role": "user | assistant", // メッセージの送信者
      "content": "string", // メッセージ内容
      "created_at": "string" // ISO 8601形式の作成日時
    }
    // ... 複数のメッセージオブジェクト
  ]
  ```
  - **エラーレスポンス**: (上記 `POST /api/chat` と同様の形式)

**3. `GET /api/chat/history/:conversationId`**
- **パスパラメータ**: `conversationId` (string) - 取得したい会話のID
- **レスポンスボディ**: (上記 `GET /api/chat/history` と同様の形式、ただし指定された `conversationId` のメッセージのみ)
  - **エラーレスポンス**: (上記 `POST /api/chat` と同様の形式)

## 4. セキュリティ方針

### データ保護
- 通信: TLS 1.3（Cloudflare標準）
- 保存データ: Supabase暗号化（AES-256）
- APIキー: Cloudflare Workers のシークレット管理

### 認証・認可
- Supabase Auth（メール + ソーシャルログイン）をFounding Engineerが実装済み。
- Row Level Security（RLS）: Founding Engineerが `chat_messages` テーブルに以下のポリシーを適用済み。
  - `CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id);`
  - `CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);`
  これにより、ユーザーは自分のデータのみアクセス可能であることを保証する。
- APIキーは暗号化して保存（ユーザーごとに分離）

### BYOK セキュリティ
- ユーザーのAPIキーはCloudflare Workersのシークレットとして安全に管理し、サーバーサイドで一時利用のみ行う。
- ログには記録せず、リクエスト完了後メモリから破棄することで、キーの漏洩リスクを最小限に抑える。

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

## 6. パフォーマンス要件

| 指標 | 目標値 |
|------|--------|
| 初期ロード | 2秒以内（LCP） |
| チャット応答 | 3秒以内（AI応答含む） |
| レポート生成 | 10秒以内（CSV 1000行まで） |
| 書類生成 | 5秒以内 |

## 7. 技術的課題と対策

| リスク | 対策 |
|--------|------|
| AI応答の品質ばらつき | プロンプトエンジニアリングの強化、複数AIプロバイダーの比較検討、ユーザーからのフィードバックループ構築。 |
| **Cloudflare WorkersでのExcelファイル解析** | Founding Engineerが `xlsx` ライブラリの利用を検討中。Cloudflare WorkersのEdge RuntimeではNode.jsの組み込みモジュールが利用できない互換性の課題があるため、以下の対策を講じる。<br>1. `wrangler`によるバンドルと`node_compat = true`の設定を第一アプローチとして試行する。<br>2. 問題が発生した場合、CDNで提供されるブラウザ向けビルドを`importScripts`で利用するか、WASM版の導入を検討する。 |

## 8. 将来の技術拡張（Q2以降の検討事項）

- **音声入力**: Web Speech API → 自然言語指示
- **モバイルアプリ**: PWA対応（インストール不要）
- **Webhook連携**: 外部サービスとの自動連携
- **マルチテナント**: 企業ごとのデータ完全分離
