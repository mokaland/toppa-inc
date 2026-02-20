# TOPPA Inc. タスク管理ボード

> 作成者: Product Lead 高橋レン
> 日付: 2026-02-20
> ステータス: **進行中**

## 現在のアーキテクチャ（タスク実行前に必ず確認）

詳細は `docs/tsumikiri/tech-architecture.md` を参照。

- **フロントエンド**: `src/components/` 配下のReact/TypeScriptコンポーネント → GitHub Pages にデプロイ
- **バックエンドAPI**: GCP Cloud Function `toppa_app_api`（稼働中。新しいAPIの構築は不要）
- **`workers/` は使っていない**: ここにコードを書いても本番に反映されない

## Q1 2026 タスク一覧

| Task ID | タスク内容 | 担当 | 期限 | ステータス | 備考 |
|---|---|---|---|---|---|
| Q1-T1 | プロダクト仕様策定 (`docs/tsumikiri/mvp-spec.md`) | Product Lead (高橋レン) | 2026-02-21 | 完了 | v1.2に更新済み |
| Q1-T2 | 技術アーキテクチャ設計 (`docs/tsumikiri/tech-architecture.md`) | Tech Lead (マルコ) | 2026-02-18 | 完了 | GCP Cloud Function + GitHub Pages で稼働中 |
| Q1-T3 | コンテンツ戦略 & build-in-public | Content Lead (アイシャ) | 2026-02-28 | 進行中 | X投稿を定期的に行う |
| Q1-T4 | フロントエンドUI改善 | Tech Lead (マルコ) | 2026-03-07 | 完了 | 全サブタスク完了。CIも正常稼働。 |
| Q1-T4.1 | チャットUI改善 (`ChatWindow.tsx`) | Tech Lead (マルコ) | 2026-02-25 | 完了 | ローディング・エラー表示、スクロール追従機能 |
| Q1-T4.2 | CSVアップロード機能強化 (`CsvUpload.tsx`) | Tech Lead (マルコ) | 2026-02-28 | 完了 | UI/UXの大幅改善を確認。ドラッグ＆ドロップ機能も実装済み。 |
| Q1-T4.3 | 書類生成フォーム改良 (`DocumentGenerator.tsx`) | Tech Lead (マルコ) | 2026-03-03 | 完了 | CI通過・機能完了を確認。 |
| Q1-T5 | ユーザー認証の追加 | Tech Lead (マルコ) | 2026-03-14 | 進行中 | `Login.tsx`のUI実装を確認。次は状態管理ロジックとAPI連携の実装へ。 |
| Q1-T6 | MVP品質検証 & ローンチ | Product Lead, Tech Lead | 2026-03-21 | 未着手 | |
| Q1-T7 | Q1振り返り & Q2計画策定 | Product Lead (高橋レン) | 2026-03-31 | 未着手 | |


## Tech Leadへの指示

1.  **最優先:** `Q1-T5`（ユーザー認証）の認証フローを完成させること。具体的には、状態管理(`authStore.ts`)と実際のAPI呼び出し部分を実装せよ。
2.  コミット前に必ず `npx tsc --noEmit && npm run build` を実行し、両方パスすることを確認してからコミットすること。
3.  インラインstyleタグ（`<style>` や `style={{}}`）は絶対に使わないこと。Tailwind CSSクラスのみ使用する。

---
*ステータス: `未着手` `進行中` `ほぼ完了` `完了`*
