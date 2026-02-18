# ツミキリ 技術アーキテクチャ（実稼働版）

> 最終更新: 2026-02-18
> ステータス: 本番稼働中

## 1. 現在のアーキテクチャ（これが現実。ここに合わせてコードを書け）

```
┌─────────────────────┐         ┌─────────────────────────────────────────────┐
│   ブラウザ (React)    │─ POST ─▶│  GCP Cloud Function: toppa_app_api          │
│   GitHub Pages       │         │  Gemini 2.5 Flash で AI応答                 │
│   mokaland.github.io │◀─ JSON ─│  https://us-central1-gen-lang-client-       │
│   /toppa-inc/        │         │  0841897546.cloudfunctions.net/toppa_app_api │
└─────────────────────┘         └─────────────────────────────────────────────┘
```

**Cloudflare Workersは使っていない。wrangler.tomlはプレースホルダー。workers/配下のコードは未デプロイ。**

## 2. API仕様（toppa_app_api）

全リクエスト共通:
- URL: `https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api`
- メソッド: POST
- Content-Type: application/json
- 認証: 不要（MVP段階）

### 2.1 チャット
```json
{
  "action": "chat",
  "messages": [
    {"role": "user", "content": "経理を効率化したい"},
    {"role": "assistant", "content": "..."},
    {"role": "user", "content": "具体的にどのソフトがいい？"}
  ]
}
```
レスポンス: `{"response": "AIの回答テキスト"}`

### 2.2 CSVレポート生成
```json
{
  "action": "report",
  "csv_data": "部門,売上\n営業,520万\n開発,380万",
  "instructions": "部門別売上を分析して改善提案をまとめてください"
}
```
レスポンス: `{"report": "Markdown形式のレポート"}`

### 2.3 書類生成
```json
{
  "action": "document",
  "template": "quotation",
  "description": "ABC社宛にWebリニューアル90万円の見積書を作成"
}
```
template: `quotation`（見積書）, `invoice`（請求書）, それ以外（自由形式）
レスポンス: `{"document": "Markdown形式の書類"}`

## 3. フロントエンド構成

### ホスティング
- **GitHub Pages**: `mokaland.github.io/toppa-inc/`
- `main`ブランチにpushすると GitHub Actions で自動ビルド・デプロイ

### ビルド
- Vite 6 + React 19 + TypeScript
- **Tailwind CSS**: `postcss.config.js` が必須。これがないとスタイルが一切効かない
- `vite.config.ts` の `base: '/toppa-inc/'` は絶対に変更するな（GitHub Pagesのパス）

### ファイル構成（変更してよいファイル）
```
src/
  App.tsx           — メインレイアウト（タブUI）。ルーティングはタブ切替で実装
  main.tsx          — エントリーポイント。変更不要
  index.css         — Tailwindの@import。変更不要
  components/
    ChatWindow.tsx  — AIチャット画面。API_URLでtoppa_app_apiを呼ぶ
    CsvUpload.tsx   — CSVアップロード→レポート生成画面
    DocumentGenerator.tsx — 書類生成画面
```

### API呼び出しパターン（全コンポーネント共通）
```typescript
const API_URL = 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api';

const res = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'chat', messages: [...] }),
});
const data = await res.json();
```

## 4. 絶対ルール（違反するとプロダクトが壊れる）

1. **モック・プレースホルダー禁止**: `// TODO`, `Promise.resolve("モック")`, `alert('未実装')` は禁止。実際のAPIを叩くコードを書け
2. **postcss.config.js を削除するな**: これがないとTailwind CSSが効かず、スタイルなしの素のHTMLになる
3. **vite.config.ts の `base: '/toppa-inc/'` を変更するな**: GitHub Pagesのパスが壊れる
4. **BrowserRouter を使うな**: GitHub Pagesはクライアントサイドルーティング非対応。タブUIまたはHashRouterを使え
5. **node_modules/ と dist/ をコミットするな**: .gitignoreに含まれている
6. **API_URL はハードコード**: 現時点では環境変数不要。上記のURLをそのまま使え
7. **新しいコンポーネントを作ったら App.tsx に配線しろ**: 作って放置するな

## 5. 今後の拡張予定（現時点では実装するな）

- ユーザー認証（Supabase Auth） → ログインUI + JWT
- チャット履歴の永続化（Supabase DB）
- PDF出力（jspdf）
- ファイルアップロード（Supabase Storage）
- Cloudflare Workersへの移行（現在のGCP Cloud Functionから）
