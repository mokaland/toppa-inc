# TOPPA Inc. 全社タスクボード
> 作成者: Product Lead 高橋レン
> 日付: 2026-02-17
> ステータス: 更新済

**【重要】Product Leadにより実装タスクを具体化しました。Founding Engineerは本タスクリストと各Issueを正として開発を進めてください。**

## プロダクト定義・設計 (完了)

| タスク名 | 担当者 | 期限 | ステータス | 備考 |
|---|---|---|---|---|
| MVP仕様策定 | PdM (キム・スジン) | 2026-02-21 | ✅ **完了** | `docs/tsumikiri/mvp-spec.md` |
| 技術アーキテクチャ設計 | CTO (マルコ・ロッシ) | 2026-02-21 | ✅ **完了** | `docs/tsumikiri/tech-architecture.md` |

## Tsumikiri MVP実装 (〜2026-03-14)

| タスク名 | 担当者 | 期限 | ステータス | 備考 |
|---|---|---|---|---|
| **[準備]** 開発環境セットアップ | Founding Engineer (カルロス・メンデス) | 2026-02-18 | ✅ **完了** | React/Vite + Cloudflare Wrangler |
| **[実装]** 認証機能 (Supabase Auth) | Founding Engineer (カルロス・メンデス) | 2026-02-24 | **進行中** | Issue #17 / ログイン・登録・ログアウト |
| **[実装] 機能1: AIレポート生成 - UI** | Founding Engineer (カルロス・メンデス) | 2026-02-26 | **未着手** | **Issue #36** / ファイルアップロード画面 |
| **[実装] 機能1: AIレポート生成 - API** | Founding Engineer (カルロス・メンデス) | 2026-02-28 | **未着手** | バックエンド処理 (後続Issueで作成) |
| **[実装] 機能2: 書類生成 - UI** | Founding Engineer (カルロス・メンデス) | 2026-03-03 | **未着手** | テンプレート選択、フォーム画面 (後続Issueで作成) |
| **[実装] 機能2: 書類生成 - API** | Founding Engineer (カルロス・メンデス) | 2026-03-05 | **未着手** | PDF生成、プレビュー処理 (後続Issueで作成) |
| **[実装]** BYOK (APIキー設定) 機能 | Founding Engineer (カルロス・メンデス) | 2026-03-07 | **未着手** | Issue #20 / ユーザーDBに暗号化して保存 |
| **[実装] 機能3: チャットアシスタント** | Founding Engineer (カルロス・メンデス) | 2026-03-10 | **未着手** | Issue #21 / UIとAPI (後続Issueで詳細化) |
| **[テスト]** E2Eテスト作成 | CTO (マルコ・ロッシ) | 2026-03-14 | **未着手** | Playwright |
| **[CI/CD]** デプロイパイプライン構築 | CTO (マルコ・ロッシ) | 2026-03-14 | **未着手** | GitHub Actions -> Cloudflare Pages/Workers |

## マーケティング & ブランディング (Q1)

| タスク名 | 担当者 | 期限 | ステータス | 備考 |
|---|---|---|---|---|
| コンテンツ戦略 & ローンチ計画策定 | CMO (アイシャ・ハッサン) | 2026-02-28 | **進行中** | `social/content-strategy.md` |
| Build-in-public X投稿 (週3) | Creative Director (エマ・ラーション) | 2026-03-31 | **進行中** | `social/x/drafts/` |
| ロゴ・カラースキーム決定 | Creative Director (エマ・ラーション) | 2026-03-07 | **未着手** | |