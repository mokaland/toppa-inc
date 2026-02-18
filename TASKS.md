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
| Q1-T4 | フロントエンドUI改善 | Tech Lead (マルコ) | 2026-03-07 | 進行中 | 具体的サブタスクは以下を参照 |
| Q1-T4.1 | チャットUI改善 (`ChatWindow.tsx`) | Tech Lead (マルコ) | 2026-02-25 | **完了** | ローディング・エラー表示、スクロール追従機能 |
| Q1-T4.2 | CSVアップロード機能強化 (`CsvUpload.tsx`) | Tech Lead (マルコ) | 2026-02-28 | 未着手 | ファイルサイズ上限表示、プログレスバー追加 |
| Q1-T4.3 | 書類生成フォーム改良 (`DocumentGenerator.tsx`) | Tech Lead (マルコ) | 2026-03-03 | 未着手 | テンプレート選択をドロップダウンに変更 |
| Q1-T5 | ユーザー認証の追加 | Tech Lead (マルコ) | 2026-03-14 | 未着手 | `docs/tsumikiri/tech-architecture.md`の「今後の拡張予定」参照 |
| Q1-T6 | MVP品質検証 & ローンチ | Product Lead, Tech Lead | 2026-03-21 | 未着手 | |
| Q1-T7 | Q1振り返り & Q2計画策定 | Product Lead (高橋レン) | 2026-03-31 | 未着手 | |

## Tech Leadへの指示

1. `docs/tsumikiri/tech-architecture.md` を必ず最初に読め
2. **`TASKS.md`の`Q1-T4.2`から順に着手せよ**
3. `src/components/` 配下のファイルを改善せよ（UI/UX向上、レスポンシブ対応など）
4. **`workers/` にコードを書くな**（本番に反映されない）
5. モック・プレースホルダー禁止。`toppa_app_api` を実際に叩くコードを書け
6. `postcss.config.js` を削除するな（Tailwind CSSが壊れる）
7. `vite.config.ts` の `base: '/toppa-inc/'` を変更するな（GitHub Pagesが壊れる）

---
*ステータス: `未着手` `進行中` `完了` `分割`*