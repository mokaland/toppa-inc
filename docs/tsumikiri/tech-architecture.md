# ツミキリ 技術アーキテクチャ設計書

> 作成: CTO マルコ・ロッシ
> 日付: 2026-02-16
> ステータス: ドラフト

## 1. プロダクト概要

ツミキリは、忙しい経営者のためのAI事務アシスタントであり、事務効率化を目的としたプロダクトです。本設計書は、ツミキリのMVP（Minimum Viable Product）における技術アーキテクチャについて記述します。

## 2. 技術スタック

TOPPA Inc. の技術方針書 (docs/tech-direction.md) に準拠し、以下の技術スタックを採用します。

### フロントエンド
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS**
- **Zustand**
- **React Router**

### バックエンド
- **Cloudflare Workers**
- **Hono**

### データベース
- **Supabase (PostgreSQL)**

### AI（プロダクト向け）
- **BYOK方式**: ユーザーのAPIキーでAI機能を利用 (OpenAI, Anthropic, Google)
- **マネージド方式**: TOPPA Inc.のAPIキーを使用（Pro プラン）

### ホスティング
- **Cloudflare Pages** (フロントエンド)
- **Cloudflare Workers** (APIサーバー)

## 3. アーキテクチャ概要

基本的なアーキテクチャはTOPPA Inc.技術方針書に記載の通りですが、ツミキリに特化した詳細を以下に示します。

```mermaid
graph TD
    A[ユーザーブラウザ (React SPA)] --> B(Cloudflare Pages);
    B --> C(Cloudflare Workers / Hono API);
    C --> D{Supabase};
    C --> E[AI Provider API];
    D -- 認証・データ保存 --> C;
    E -- AI応答 --> C;
```

## 4. 主要機能の技術設計

### 4.1. チャット機能

ツミキリのコア機能であるAIチャット機能の設計について記述します。

#### 4.1.1. APIエンドポイント
- **エンドポイント**: `/api/chat`
- **メソッド**: `POST`
- **リクエストボディ**:
    ```json
    {
      "messages": [
        {"role": "user", "content": "はじめまして。"},
        {"role": "assistant", "content": "こんにちは！何かお手伝いできることはありますか？"}
      ],
      "model": "gpt-4o", // または "claude-sonnet-4.5", "gemini-2.5-pro"
      "stream": true // ストリーミング応答を希望する場合
    }
    ```
- **レスポンスボディ (非ストリーミング)**:
    ```json
    {
      "id": "chatcmpl-xxxx",
      "object": "chat.completion",
      "created": 1678886400,
      "model": "gpt-4o",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": "はい、承知いたしました。どのような事務作業でお困りですか？",
          },
          "logprobs": null,
          "finish_reason": "stop",
        }
      ],
      "usage": {
        "prompt_tokens": 100,
        "completion_tokens": 200,
        "total_tokens": 300,
      }
    }
    ```
- **レスポンスボディ (ストリーミング)**: Server-Sent Events (SSE) または WebSockets を利用し、`delta` フィールドを含むチャンクを順次送信。

#### 4.1.2. AIモデルの選択と利用
- ユーザーは設定画面で利用するAIモデルを選択可能。
- BYOK方式の場合、ユーザーのAPIキーをCloudflare Workersのシークレットとして一時的に利用し、リクエスト完了後メモリから破棄。
- マネージド方式の場合、TOPPA Inc.が管理するAPIキーを利用。

#### 4.1.3. 会話履歴の保存
- ユーザーとAIの会話履歴はSupabaseの `chat_history` テーブルに保存。
- `user_id`, `message_id`, `role`, `content`, `timestamp`, `model` などのカラムを持つ。
- Row Level Security (RLS) を適用し、各ユーザーは自身の会話履歴のみアクセス可能とする。

#### 4.1.4. エラーハンドリング
- AIプロバイダーAPIからのエラー（レート制限、無効なAPIキーなど）は適切にキャッチし、ユーザーフレンドリーなエラーメッセージをフロントエンドに返す。
- ネットワークエラーやサーバー内部エラーも同様に処理。

### 4.2. 認証・認可

Supabase Auth を利用し、メールアドレス/パスワード認証およびソーシャルログイン（Google, GitHubなど）に対応します。
ユーザー認証後、JWTトークンをCloudflare Workersに渡し、APIリクエストの認可を行います。

## 5. セキュリティ方針

TOPPA Inc.技術方針書に準拠し、以下のセキュリティ対策を講じます。

- **データ保護**: TLS 1.3、Supabase暗号化（AES-256）
- **APIキー管理**: Cloudflare Workersのシークレット管理、BYOKキーの一時利用と破棄
- **RLS**: SupabaseのRow Level Securityにより、ユーザーごとのデータ分離を徹底

## 6. テスト計画

- **ユニットテスト**: Vitest を使用し、Cloudflare Workersのエンドポイント、ユーティリティ関数などの単体テストを実施。カバレッジ80%目標。
- **E2Eテスト**: Playwright を使用し、主要なユーザーフロー（ログイン、チャットの開始と応答、設定変更など）を検証。
- **AI応答テスト**: モックAPIを使用し、異なるAIモデルからの応答が期待通りに処理されるかを確認。

## 7. 今後の拡張性（MVP以降）

- ファイルアップロード機能（PDF, Excelなどの要約・分析）
- 外部サービス連携（Slack, Google Workspaceなど）
- 音声入力・出力

## 8. 技術的リスクと対策

- **AI応答の品質ばらつき**: プロンプトエンジニアリングの最適化、ユーザーフィードバックループの導入。
- **Cloudflare Workersの制約**: Node.js互換性の問題は、HonoなどのEdge Runtime対応フレームワークの利用、Web標準APIの活用で回避。
- **Supabase RLSの複雑性**: 厳密なポリシー設計とテストにより、データ漏洩リスクを低減。
