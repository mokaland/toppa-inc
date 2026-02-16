# AI Playbook — TOPPA Inc. 開発ガイド

## プロジェクト概要
- プロダクト: ツミキリ（Tsumikiri）— 忙しい経営者のAI事務アシスタント
- 技術スタック: React/TypeScript + Cloudflare Workers + Supabase + AI API
- リポジトリ構造: workers/(バックエンド), src/(フロント), docs/(設計文書), social/(コンテンツ)

## 開発ルール（全ロール共通）
1. **既存コードを読んでから変更する** — read_github_file + list_directoryで現状把握が最初
2. **同じ内容の繰り返し禁止** — 前セッションと同一ファイルに同一内容をコミットするな
3. **成果物の冒頭に作成者・日付・ステータスを記載する**
4. **日本語のみ**（技術用語の英語は許可）

## コーディング規約（CTO・Founding Engineer向け）
- TypeScript: strict mode、型定義必須、any禁止
- テスト: コミット前に必ずrun_testsで検証
- エラーハンドリング: try/catchでエラーをログに残す
- 命名: camelCase（変数・関数）、PascalCase（型・クラス）

## コンテンツ規約（CMO・Creative Director向け）
- X投稿: 冒頭1行で注目を引くフック必須。280文字以内
- evaluate_content_qualityで70点以上のみ投稿可
- build-in-publicテーマ: AI自律運営の裏側を見せる

## よくある罠
- Cloudflare Workers: xlsx等のNode.jsライブラリは動かない（Edge Runtime制約）
- Supabase: RLSが有効。service_roleキーでのみ全アクセス可能
- run_code: print()の出力はlogs.stdoutに入る（resultsではない）
- trigger_ci: 現在403（トークン権限制約）。pushトリガーで代替

## 現在のフェーズ
→ CURRENT_PHASE.md を参照