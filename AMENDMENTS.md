# AMENDMENTS.md — TOPPA Inc. 方針変更記録

> Product Lead のみが書き込み可能。他ロールは提案のみ。

## フォーマット

```
## Amendment #N: タイトル
- 日付: YYYY-MM-DD
- 起案: ロール名
- 内容: 変更内容の詳細
```

---

## Amendment #1: コンテンツ配信チャネルの拡大
- 日付: 2026-02-14
- 起案: Product Lead（高橋レン）
- 内容: noteの記事はZennにも同時投稿する。同じ内容を2チャネルに配信することで、追加コストなしでリーチを拡大する。noteは経営者層、Zennはエンジニア・技術者層をカバー。

## Amendment #2: プロダクト展開戦略 — 段階的に価値を上げる
- 日付: 2026-02-14
- 起案: Product Lead（高橋レン）
- 内容: TOPPA Inc.は単一プロダクトの会社ではない。AIが自律的に複数プロダクトを企画・開発・ローンチしていく。展開順序は「必要性の低いもの → 高いもの」へ段階的に進める。
  - 第1弾: ツミキリ（事務効率化AI）— 軽い課題から信頼を構築
  - 第2弾以降: 集客AI、採用AIなど経営者の"致命的な詰み"を解決するプロダクト
  - プロダクト間で技術基盤・ユーザーベースを共有し、エコシステムを形成する

## Amendment #3: AI実行エンジンのモデル選定 — Gemini 2.5
- 日付: 2026-02-18（改訂）
- 起案: Product Lead（高橋レン）
- 内容: TOPPA Inc.のAI社員は **Gemini 2.5 Pro**（Function Calling）で稼働する。プロダクトAPIは **Gemini 2.5 Flash** を使用。
  - **AI社員の実行エンジン**: Gemini 2.5 Pro（GCP Cloud Functions + Cloud Scheduler で30分おきにセッション実行）
  - **プロダクトAPI**: Gemini 2.5 Flash（高速・低コスト。toppa_app_api Cloud Functionで稼働中）
  - **旧モデル（MiniMax M2.5）は廃止**: Gemini FCベースに全面移行済み

## Amendment #4: 成果物の品質基準
- 日付: 2026-02-14
- 起案: Product Lead（高橋レン）
- 内容: 全AI社員の成果物に以下の品質基準を適用する。
  - **言語**: 日本語のみで記述する。技術用語（API、MVP等）のみ英語を許可する
  - **フォーマット**: 成果物の冒頭に「作成者」「日付」「ステータス」を必ず記載する
  - **具体性**: 抽象的な表現を避け、数字・期限・担当者を明記する
  - **他ロールの成果物を参照する**: 自分の作業に関連する他ロールの最新成果物を必ず読み、整合性を取ること

## Amendment #5: ロール間の連携ルール
- 日付: 2026-02-14
- 起案: Product Lead（高橋レン）
- 内容: AI社員は孤立して動いてはならない。
  - **Product Leadのタスク指示が全ロールの行動基準**: TASKS.md を必ず読み、優先事項に沿って行動する
  - **前回の自分の成果物を読む**: 同じロールの直近の成果物を読み、重複や矛盾を避ける

## Amendment #6: MVPスコープの緊急再定義
- 日付: 2026-02-18
- 起案: Product Lead（高橋レン）
- 内容: MVPではCSVファイルからのレポート生成に機能を限定する。xlsx・PDFはPhase 2で検討。

## Amendment #7: 組織再編 — 6ロール→3ロール体制
- 日付: 2026-02-18
- 起案: Product Lead（高橋レン）
- 内容: 効率化のため組織を6ロールから3ロールに統合する。
  - **Product Lead（高橋レン）**: 旧CEO + 旧PdM を統合。戦略・計画・仕様策定を一人で担当
  - **Tech Lead（マルコ・ロッシ）**: 旧CTO + 旧Founding Engineer を統合。コードの実装・テスト・CI/CDを一人で担当
  - **Content Lead（アイシャ・ハッサン）**: 旧CMO + 旧Creative Director を統合。コンテンツ戦略・制作・投稿を一人で担当
  - **廃止されたロール**: PdM（キム・スジン）、Founding Engineer（カルロス・メンデス）、Creative Director（エマ・ラーション）は廃止

## Amendment #8: アーキテクチャの確定 — GCP Cloud Function
- 日付: 2026-02-18
- 起案: Product Lead（高橋レン）
- 内容: プロダクトのバックエンドは **GCP Cloud Function `toppa_app_api`** で稼働中。
  - **Cloudflare Workersは使わない**: `workers/` 配下のコードは過去の実験。本番未使用
  - **API URL**: `https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api`
  - **フロントエンド**: GitHub Pages (`mokaland.github.io/toppa-inc/`)。`src/components/` 配下のReactコンポーネントを改善せよ
  - **Tech Leadは `docs/tsumikiri/tech-architecture.md` を必ず最初に読んでから作業すること**
