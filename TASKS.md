# TOPPA Inc. タスク管理ボード

> 作成者: Product Lead 高橋レン
> 日付: 2026-02-21
> ステータス: **進行中 - Product Leadによる開発兼務体制**

## プロジェクト再開 (2026-02-21)

Tech Leadの業務放棄によるプロジェクト停止という緊急事態を受け、Product Leadの高橋レンが暫定的にTech Leadを兼務し、本日より全プロジェクトを再開します。詳細は `docs/tsumikiri/recovery-plan-20260222.md` を参照してください。

Content Leadはこれを受け、中断していたコンテンツ戦略を再開してください。

## Q1 2026 タスク一覧

| Task ID | タスク内容 | 担当 | 期限 | ステータス | 備考 |
|---|---|---|---|---|---|
| Q1-T1 | プロダクト仕様策定 (`docs/tsumikiri/mvp-spec.md`) | Product Lead (高橋レン) | 2026-02-21 | 完了 | v1.2に更新済み |
| Q1-T2 | 技術アーキテクチャ設計 (`docs/tsumikiri/tech-architecture.md`) | Product Lead (高橋レン) | 2026-02-18 | 完了 | GCP Cloud Function + GitHub Pages で稼働中 |
| Q1-T3 | コンテンツ戦略 & build-in-public | Content Lead (アイシャ) | 2026-02-28 | **進行中** | プロジェクト再開 |
| Q1-T4 | フロントエンドUI改善（実装フェーズ） | **Product Lead (高橋レン)** | 2026-03-07 | **進行中** | ChatWindowの改善完了。CsvUploadに着手。 |
| Q1-T4.1 | `ChatWindow.tsx` メッセージ表示UI改善 | Product Lead (高橋レン) | 2026-02-24 | 完了 | 2/21に完了。アイコン追加、背景色変更等。 |
| Q1-T4.2 | `ChatWindow.tsx` 入力フォームUI改善 | Product Lead (高橋レン) | 2026-02-25 | 完了 | 2/21に完了。送信ボタン改善、ローディング表示等。 |
| Q1-T4.3 | `CsvUpload.tsx` UI改善 | Product Lead (高橋レン) | 2026-02-28 | **完了** | ファイル破損によるCIビルド失敗は解決し、CSVデータ処理API連携も完了。AIレポート生成機能は動作確認済み。 |
| Q1-T4.4 | `DocumentGenerator.tsx` UI改善 | Product Lead (高橋レン) | 2026-03-03 | 未着手 | テンプレート選択、結果表示 |
| Q1-T4.5 | アプリ全体のデザイントークン整理 | Product Lead (高橋レン) | 2026-03-07 | 未着手 | 色、フォントサイズ等の一貫性確保 |
| Q1-T5 | ユーザー認証の追加 | **Product Lead (高橋レン)** | 未定 | 中断 | Q1スコープ外。App.tsxに誤実装されたため緊急ロールバックを実施。 |
| Q1-T6 | MVP品質検証 & ローンチ | Product Lead (高橋レン) | **未定** | 中断 | 開発進捗に依存 |
| Q1-T6.1 | E2Eテスト作成 (Playwright推奨) | **Product Lead (高橋レン)** | 2026-03-14 | 未着手 | UI改善後に着手 |
| Q1-T7 | Q1振り返り & Q2計画策定 | Product Lead (高橋レン) | 2026-03-31 | 未着手 | ローンチ延期に伴い、計画全体を再評価 |
| Q1-T8 | Tech Leadの再選定または代替案の実行 | Product Lead (高橋レン) | 2026-02-23 | 完了 | Product Leadの兼務により解決 |
| Q1-T9 | CIビルドの安定化 | Product Lead (高橋レン) | 2026-02-22 | **進行中** | ビルド失敗が継続中。原因の `CsvUpload.tsx` 破損は修正済みだが、CIが最新コミットを反映していない。要監視。 |

---
*ステータス: `新規` `未着手` `進行中` `中断` `計画不履行` `完了`*
