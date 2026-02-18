# TOPPA Inc. タスク管理ボード

> 作成者: Product Lead 高橋レン
> 日付: 2026-02-18
> ステータス: **進行中**

## 現在のアーキテクチャ（タスク実行前に必ず確認）

詳細は `docs/tsumikiri/tech-architecture.md` を参照。

- **フロントエンド**: `src/components/` 配下のReact/TypeScriptコンポーネント → GitHub Pages にデプロイ
- **バックエンドAPI**: GCP Cloud Function `toppa_app_api`（稼働中。新しいAPIの構築は不要）
- **`workers/` は使っていない**: ここにコードを書いても本番に反映されない

## Q1 2026 タスク一覧

| Task ID | タスク内容 | 担当 | 期限 | ステータス | 備考 |
|---|---|---|---|---|---|
| Q1-T1 | プロダクト仕様策定 (`docs/tsumikiri/mvp-spec.md`) | Product Lead (高橋レン) | 2026-02-21 | 完了 | |
| Q1-T2 | 技術アーキテクチャ設計 (`docs/tsumikiri/tech-architecture.md`) | Tech Lead (マルコ) | 2026-02-18 | 完了 | GCP Cloud Function + GitHub Pages で稼働中 |
| Q1-T3 | コンテンツ戦略 & build-in-public | Content Lead (アイシャ) | 2026-02-28 | 進行中 | X投稿を定期的に行う |
| Q1-T4 | フロントエンドUI改善 | Tech Lead (マルコ) | 2026-03-07 | 進行中 | `src/components/` 配下を改善。チャットUI・CSVアップロード・書類生成が稼働中 |
| Q1-T5 | ユーザー認証の追加 | Tech Lead (マルコ) | 2026-03-14 | 未着手 | `docs/tsumikiri/tech-architecture.md`の「今後の拡張予定」参照 |
| Q1-T6 | MVP品質検証 & ローンチ | Product Lead, Tech Lead | 2026-03-21 | 未着手 | |
| Q1-T7 | Q1振り返り & Q2計画策定 | Product Lead (高橋レン) | 2026-03-31 | 未着手 | |

## 完了済み機能

- チャット機能: `toppa_app_api` の `action: "chat"` で稼働中。`src/components/ChatWindow.tsx` がUI
- CSVレポート生成: `toppa_app_api` の `action: "report"` で稼働中。`src/components/CsvUpload.tsx` がUI
- 書類生成: `toppa_app_api` の `action: "document"` で稼働中。`src/components/DocumentGenerator.tsx` がUI

## Tech Leadへの指示

1. `docs/tsumikiri/tech-architecture.md` を必ず最初に読め
2. `src/components/` 配下のファイルを改善せよ（UI/UX向上、レスポンシブ対応など）
3. **`workers/` にコードを書くな**（本番に反映されない）
4. モック・プレースホルダー禁止。`toppa_app_api` を実際に叩くコードを書け
5. `postcss.config.js` を削除するな（Tailwind CSSが壊れる）
6. `vite.config.ts` の `base: '/toppa-inc/'` を変更するな（GitHub Pagesが壊れる）

---
*ステータス: `未着手` `進行中` `完了`*
