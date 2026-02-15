# ツミキリ MVP仕様書

> 作成者: PdM キム・スジン
> 作成日: 2026-02-15
> ステータス: 仕様策定中
> レビュー対象: CEO 高橋レン
> 関連成果物: docs/product-proposal.md, docs/implementation-plan.md

## 1. MVP仕様書の目的

本文書は、ツミキリのMVP（Minimum Viable Product）における機能要件・画面設計・データモデルを定義する。CTOマルコ・ロッシの技術アーキテクチャ設計（docs/implementation-plan.md）およびCEO高橋レンの日次計画（plans/daily/2026-02-15）に基づき、2026-02-21のマイルストーン完了へ向けた詳細仕様を定める。

## 2. MVPで実装する3機能

CEO日次計画に基づき、MVPでは以下の3機能を実装する。優先度はFounder Engineerカルロス・メンデスの実装計画（docs/implementation-plan.md）と整合させる。

| 優先度 | 機能名 | 機能概要 | 担当エンジニア | 実装期限 |
|--------|--------|----------|---------------|----------|
| 1 | チャットアシスタント | 経営者の"詰み"何でも相談AIチャット | カルロス | 2/21 |
| 2 | AIレポート生成 | CSV/Excelアップロード → AI分析・レポート出力 | カル洛斯 | 2/28 |
| 3 | テンプレート書類生成 | 見積書・請求書等の自動生成 | カルロス | 3/7 |

## 3. ユーザーストーリー詳細

docs/product-proposal.md に記載した10本のユーザーストーリーを、MVP用に優先度付けして整理する。MVPでは実装可能なストーリーに絞り込む。

### MVP対象ストーリ（優先度順）

| 番号 | ユーザーストーリー | 対応機能 | 優先度 | MVP実装 |
|------|-------------------|----------|--------|---------|
| US-01 | 経営者として、CSVをアップロードして「今月の売上まとめて」と言いたい。事務員に頼む手間を省くため。 | AIレポート生成 | 1st | ○ |
| US-02 | 経営者として、「○○社に見積書を送って」と言いたい。書類作成に30分かかるのを3分にするため。 | テンプレート書類生成 | 2nd | ○ |
| US-03 | 経営者として、「この契約書の注意点を教えて」と相談したい。弁護士に聞くほどでもないが不安だから。 | チャットアシスタント | 1st | ○ |
| US-04 | 経営者として、スマホからでも操作したい。現場や移動中に使うため。 | 全機能 | 1st | ○ |
| US-05 | 経営者として、自分のAPIキーを使いたい。コストを自分でコントロールするため。 | 設定（BYOK） | 1st | ○ |
| US-06 | 経営者として、過去の書類を検索したい。「先月の○○社の見積書どこだっけ？」をなくすため。 | テンプレート書類生成 | 3rd | △（要保存機能） |
| US-07 | 経営者として、日報を音声で入力したい。キーボードが吃力だから。 | チャットアシスタント | 3rd | △（Phase 2） |
| US-08 | 経営者として、AIが作った書類をプレビューしてから確定したい。間違いがあると信用問題だから。 | テンプレート書類生成 | 2nd | ○ |
| US-09 | 経営者として、月額の利用料を事前に知りたい。予算オーバーが怖いから。 | 設定（プラン管理） | 2nd | ○ |
| US-10 | 経営者として、データが安全に管理されていると安心したい。顧客情報を扱うから。 | 全機能（セキュリティ） | 1st | ○ |

### シンボル凡例
- ○：MVP実装対象（必須）
- △：MVPでは簡易実装または省略（Phase 2以降）

## 4. 画面遷移設計

### 4-1. 画面一覧

| 画面ID | 画面名 | パス | 対応機能 |
|--------|--------|------|----------|
| S-01 | ログイン画面 | /login | 認証 |
| S-02 | 新規登録画面 | /signup | 認証 |
| S-03 | ダッシュボード | /dashboard | ホーム |
| S-04 | チャット画面 | /chat | チャットアシスタント |
| S-05 | レポート生成画面 | /report | AIレポート生成 |
| S-06 | レポート結果画面 | /report/:id | AIレポート生成 |
| S-07 | 書類生成画面 | /document | テンプレート書類生成 |
| S-08 | 書類プレビュー画面 | /document/:id/preview | テンプレート書類生成 |
| S-09 | 設定画面 | /settings | BYOK・プラン管理 |
| S-10 | APIキー設定画面 | /settings/api-key | BYOK |
| S-11 | プラン管理画面 | /settings/plan | 料金プラン |

### 4-2. 画面遷移図

```
[S-01 ログイン] ──── ログイン成功 ────> [S-03 ダッシュボード]
      │                                            │
      │ 失敗（エラー表示）                          ├──> [S-04 チャット]
      │                                            ├──> [S-05 レポート生成]
[S-02 新規登録] ─┘                                 ├──> [S-07 書類生成]
                                                   └──> [S-09 設定]
                                                          ├──> [S-10 APIキー設定]
                                                          └──> [S-11 プラン管理]

[S-05 レポート生成]
      │
      ├── ファイル選択 ── アップロード ── AI分析実行
      │                                        │
      ▼                                        ▼
[S-06 レポート結果] <────── レポート生成完了 <─┘
      │
      └── PDF/Markdownダウンロード

[S-07 書類生成]
      │
      ├── テンプレート選択（見積書/請求書/お礼状）
      │
      ├── 情報入力（自然言語 or フォーム）
      │
      ▼
[S-08 書類プレビュー]
      │
      ├── 確認 ── PDF出力
      │
      └── 修正 ← 戻る
```

### 4-3. ダッシュボード設計

ダッシュボード（S-03）はMVPのホーム画面として、以下の要素を配置する。

```
┌─────────────────────────────────────────┐
│ ヘッダー: ロゴ + ナビゲーション + ログアウト │
├─────────────────────────────────────────┤
│                                         │
│ ようこそ、田中さん（田中 誠一）            │
│ ツミキルで事務作業を効率化しましょう        │
│                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ チャット │ │レポート │ │ 書類作成 │    │
│ │   💬    │ │   📊    │ │   📄    │    │
│ │ 経営相談 │ │ CSV分析 │ │ 見積書等 │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ ── 最近の利用 ──                         │
│ 1. 2/15 売上レポート生成                  │
│ 2. 2/14 ○○社に見積書                      │
│ 3. 2/13 経費について質問                  │
│                                         │
├─────────────────────────────────────────┤
│ フッター: プラン: Free / API: 未設定      │
└─────────────────────────────────────────┘
```

### 4-4. レスポンシブ対応

CEO日次計画およびUS-04に基づき、全画面はスマホ対応必須とする。

| デバイス | ブレークポイント | レイアウト |
|----------|------------------|------------|
| デスクトップ | >= 1024px | 3カラム（ダッシュボード） |
| タブレット | 768px - 1023px | 2カラム |
| スマホ | < 768px | 1カラム（縦並び） |

## 5. データモデル設計

CTOの技術設計（docs/implementation-plan.md）のSQLスキーマと整合させる。

### 5-1. エンティティ関係図（ERD）

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────┐
│    users     │     │   chat_messages │     │   reports   │
├──────────────┤     ├─────────────────┤     ├─────────────┤
│ id (PK)      │◄────│ user_id (FK)    │     │ id (PK)     │
│ email        │     │ id              │     │ user_id(FK) │
│ name         │     │ role            │     │ title       │
│ plan         │     │ content         │     │ file_name   │
│ api_key      │     │ created_at     │     │ file_url    │
│ created_at   │     └─────────────────┘     │ prompt      │
│ updated_at   │                               │ result      │
└──────────────┘                               │ status      │
                                                │ created_at  │
                              ┌─────────────────┤ completed_at│
                              │  documents      └──────────────┘
                              ├─────────────────┐
                              │ id (PK)         │
                              │ user_id (FK)    │
                              │ template_id     │
                              │ template_name   │
                              │ input_data      │
                              │ generated_cnt   │
                              │ status          │
                              │ created_at      │
                              └─────────────────┘
```

### 5-2. テーブル定義

#### users テーブル

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | UUID | PK | ユーザーID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| name | VARCHAR(100) | | 表示名 |
| plan | VARCHAR(20) | DEFAULT 'free' | プラン（free/pro/byok） |
| api_key | TEXT | | BYOK用APIキー（暗号化保存） |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時 |

#### chat_messages テーブル

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | UUID | PK | メッセージID |
| user_id | UUID | FK -> users(id) | ユーザーID |
| role | VARCHAR(10) | CHECK (user/assistant/system) | 役割 |
| content | TEXT | NOT NULL | メッセージ本文 |
| session_id | UUID | | セッションID（会話グループ） |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |

#### reports テーブル

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | UUID | PK | レポートID |
| user_id | UUID | FK -> users(id) | ユーザーID |
| title | VARCHAR(255) | NOT NULL | レポートタイトル |
| file_name | VARCHAR(255) | | 元ファイル名 |
| file_url | TEXT | | Supabase StorageのURL |
| prompt | TEXT | NOT NULL | ユーザー指示 |
| result | TEXT | | AI生成レポート本文 |
| status | VARCHAR(20) | DEFAULT 'pending' | ステータス |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| completed_at | TIMESTAMPTZ | | 完了日時 |

#### documents テーブル

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | UUID | PK | 書類ID |
| user_id | UUID | FK -> users(id) | ユーザーID |
| template_id | VARCHAR(50) | NOT NULL | テンプレートID |
| template_name | VARCHAR(100) | NOT NULL | テンプレート名 |
| input_data | JSONB | NOT NULL | 入力データ |
| generated_content | TEXT | | 生成された書類内容 |
| status | VARCHAR(20) | DEFAULT 'pending' | ステータス |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| completed_at | TIMESTAMPTZ | | 完了日時 |

### 5-3. インデックス設計

| テーブル | インデックス名 | カラム | 目的 |
|----------|----------------|--------|------|
| chat_messages | idx_chat_user_id | user_id | ユーザー別履歴取得高速化 |
| chat_messages | idx_chat_session | session_id | セッション別取得 |
| reports | idx_reports_user_id | user_id | ユーザー別レポート一覧 |
| reports | idx_reports_created | created_at | 日付順取得 |
| documents | idx_documents_user_id | user_id | ユーザー別書類一覧 |
| documents | idx_documents_template | template_id | テンプレート別取得 |

## 6. APIエンドポイント設計

CTOの実装計画（docs/implementation-plan.md）と整合させたAPI設計。

### 6-1. 認証関連

| エンドポイント | Method | 機能 | ステータス |
|---------------|--------|------|------------|
| /api/auth/signup | POST | 新規登録 | 実装予定 |
| /api/auth/login | POST | ログイン | 実装予定 |
| /api/auth/logout | POST | ログアウト | 実装予定 |
| /api/auth/me | GET | ログインユーザー情報取得 | 実装予定 |

### 6-2. チャット関連

| エンドポイント | Method | 機能 | ステータス |
|---------------|--------|------|------------|
| /api/chat | POST | チャット送信・AI応答取得 | 実装予定（Priority 1） |
| /api/chat/history | GET | 会話履歴一覧取得 | 実装予定 |
| /api/chat/history/:sessionId | GET | 特定セッション履歴取得 | 実装予定 |

### 6-3. レポート関連

| エンドポイント | Method | 機能 | ステータス |
|---------------|--------|------|------------|
| /api/report/upload | POST | ファイルアップロード | 実装予定（Priority 2） |
| /api/report/generate | POST | レポート生成要求 | 実装予定（Priority 2） |
| /api/report/:id | GET | レポート結果取得 | 実装予定（Priority 2） |
| /api/report/list | GET | レポート一覧取得 | 実装予定 |

### 6-4. 書類生成関連

| エンドポイント | Method | 機能 | ステータス |
|---------------|--------|------|------------|
| /api/document/templates | GET | テンプレート一覧取得 | 実装予定（Priority 3） |
| /api/document/generate | POST | 書類生成要求 | 実装予定（Priority 3） |
| /api/document/:id | GET | 書類内容取得 | 実装予定（Priority 3） |
| /api/document/:id/preview | GET | プレビューデータ取得 | 実装予定（Priority 3） |
| /api/document/:id/pdf | GET | PDFダウンロード | 実装予定（Priority 3） |
| /api/document/list | GET | 書類一覧取得 | 実装予定 |

### 6-5. 設定関連

| エンドポイント | Method | 機能 | ステータス |
|---------------|--------|------|------------|
| /api/settings/profile | GET/POST | プロフィール取得・更新 | 実装予定 |
| /api/settings/api-key | GET/POST/PUT | APIキー設定（BYOK） | 実装予定 |
| /api/settings/plan | GET/POST | プラン変更 | 実装予定 |

## 7. BYOK（Bring Your Own Key）実装方針

US-05（自分のAPIキーを使いたい）およびCTOの技術設計に基づき、BYOK機能を実装する。

### 7-1. BYOK対応AIプロバイダー

| プロバイダー | 対応状況 | 実装優先度 |
|-------------|----------|------------|
| OpenAI | 要対応 | 高 |
| Anthropic (Claude) | 要対応 | 高 |
| Google Gemini | 検討中 | 中 |

### 7-2. BYOK利用フロー

```
1. ユーザーが /settings/api-key でAPIキーを入力
2. キーがSupabaseに暗号化して保存される
3. チャット・レポート生成時、APIキーが設定されていればそれを使用
4. 未設定の場合はデフォルトAPI（TOPPA提供）を使用
5. FreeプランはデフォルトAPI使用不可（BYOK必須）または制限付き
6. ProプランはデフォルトAPI利用可能
```

### 7-3. セキュリティ要件

| 要件 | 実装方法 |
|------|----------|
| APIキー暗号化 | Supabase Vault または AES-256暗号化 |
| キーの-blind化 | UIでは末尾4文字のみ表示（例: sk-...abcd） |
| ログからの除外 | APIキー文字列をログ出力時にマスキング |

## 8. 非機能要件

### 8-1. パフォーマンス要件

CTOの実装計画（docs/implementation-plan.md）と整合。

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| 初期ロード（LCP） | 2秒以内 | Lighthouse |
| チャット応答時間 | 3秒以内 | 手動測定 |
| レポート生成時間 | 10秒以内 | テスト環境 |
| 書類生成時間 | 5秒以内 | テスト環境 |

### 8-2. セキュリティ要件

| 要件 | 詳細 |
|------|------|
| 認証 | Supabase Auth（メール/パスワード） |
| 認可 | Row Level Security (RLS) 有効化 |
| データ暗号化 | at-rest (Supabase) + in-transit (TLS 1.3) |
| セッション管理 | JWT + リフレッシュトークン |
| パスワード要件 | 8文字以上 |

### 8-3. 対応環境

| 環境 | 対応バージョン |
|------|----------------|
| iOS Safari | 最新2バージョン |
| Android Chrome | 最新2バージョン |
| Chrome | 最新2バージョン |
| Safari | 最新2バージョン |
| Edge | 最新2バージョン |

## 9. テンプレート定義（MVP）

CTOの実装計画に基づき、MVPで提供するテンプレート3種を定義する。

### 9-1. 見積書（estimate）

| 項目名 | 項目ID | 型 | 必須 | 説明 |
|--------|--------|-----|------|------|
| 会社名 | company_name | string | ○ | 顧客会社名 |
| 担当者名 | contact_name | string | ○ | 担当者名 |
| 品目 | items | array | ○ | 商品・サービスの配列 |
| 数量 | quantity | number | ○ | 各品目の数量 |
| 単価 | unit_price | number | ○ | 各品目の単価 |
| 金額 | amount | number | 自動計算 | 数量×単価 |
| 税率 | tax_rate | number | ○ | 消費税率（10%等） |
| 合計金額 | total | number | 自動計算 | 税抜合計 + 税額 |
| 有効期限 | valid_until | date | ○ | 見積有効期限 |
| 備考 | notes | string | | 備考欄 |

### 9-2. 請求書（invoice）

| 項目名 | 項目ID | 型 | 必須 | 説明 |
|--------|--------|-----|------|------|
| 会社名 | company_name | string | ○ | 顧客会社名 |
| 請求書番号 | invoice_number | string | ○ | 請求書No. |
| 請求日 | invoice_date | date | ○ | 発行日 |
| 支払期限 | due_date | date | ○ | 支払い期限 |
| 品目 | items | array | ○ | 請求内容の配列 |
| 金額 | amount | number | ○ | 請求金額 |
| 税率 | tax_rate | number | ○ | 消費税率 |
| 支払先 | payment_to | string | ○ | 振込先口座 |
| 備考 | notes | string | | 備考欄 |

### 9-3. お礼状（thankyou）

| 項目名 | 項目ID | 型 | 必須 | 説明 |
|--------|--------|-----|------|------|
| 会社名 | company_name | string | ○ | 顧客会社名 |
| 担当者名 | contact_name | string | ○ | 担当者名 |
| 契約商品名 | product_name | string | ○ | お礼対象の商材 |
| 署名者名 | signer_name | string | ○ | 署名者名 |
| 署名者役職 | signer_title | string | | 役職 |
| 本文オプション | body_option | string | | カスタム本文 |

## 10. プラン別機能マトリクス

| 機能 | Free | Pro | BYOK |
|------|------|-----|------|
| チャット利用 | 月10回 | 無制限 | 無制限（API鍵所有） |
| レポート生成 | 月3回 | 無制限 | 無制限 |
| 書類生成 | 月5回 | 無制限 | 無制限 |
| テンプレート | 3種 | 全種 | 全種 |
| データ保存期間 | 30日 | 90日 | 90日 |
| 履歴検索 | 不可 | 可能 | 可能 |
| デフォルトAPI | 制限あり | 可能 | 自分の鍵使用 |
| 価格 | ¥0 | ¥2,980/月 | ¥0 |

## 11. 仕様策定スケジュール

| タスク | 担当 | 期限 | ステータス |
|--------|------|------|------------|
| ユーザーストーリー整理 | スジン | 2/15 | 完了 |
| 画面遷移設計 | スジン | 2/16 | 進行中 |
| データモデル設計 | スジン | 2/17 | 未着手 |
| APIエンドポイント整理 | スジン | 2/18 | 未着手 |
| テンプレート詳細定義 | スジン | 2/19 | 未着手 |
| CTOとの仕様擦り合わせ | スジン+マルコ | 2/20 | 未着手 |
| 仕様書最終版完成 | スジン | 2/21 | 未着手 |

## 12. レビュー＆次のステップ

本文書はCEO高橋レンのレビューを経て、CTOマルコ・ロッジの技術アーキテクチャ設計（docs/tsumikiri/tech-architecture.md）と統合する。Founder Engineerカルロス・メンデスは本仕様を基に実装を行う。

### 次のアクション

| アクション | 担当 | 期限 | ステータス |
|------------|------|------|------------|
| CEOへのレビュー依頼 | スジン | 2/15 | 未着手 |
| 技術設計との整合確認 | スジン | 2/20 | 未着手 |
| 必要に応じて仕様修正 | スジン | 2/21 | 未着手 |