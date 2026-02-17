# 環境変数設定とSupabaseバケット作成ガイド

> 作成者: CTO マルコ・ロッシ
> 日付: 2026-02-17
> ステータス: 完成

このドキュメントは、`tsumikiri` プロジェクトで Supabase Storage を利用するために必要な環境変数の設定方法と、Supabase でストレージバケットを作成する手順を説明します。

## 1. Cloudflare Workers の環境変数設定

Cloudflare Workers にデプロイする際、以下の環境変数を設定する必要があります。これらは `wrangler.toml` ファイルまたは Cloudflare Workers のダッシュボードで設定できます。

| 環境変数名           | 説明                                                              | 取得元                                      |
|--------------------|-------------------------------------------------------------------|---------------------------------------------|
| `SUPABASE_URL`     | Supabase プロジェクトの URL                                       | Supabase ダッシュボード -> Settings -> API  |
| `SUPABASE_ANON_KEY`| Supabase プロジェクトの Anon Key (Public)                         | Supabase ダッシュボード -> Settings -> API  |
| `SUPABASE_SERVICE_KEY`| Supabase プロジェクトの Service Role Key (Secret) - **Workersでのみ利用** | Supabase ダッシュボード -> Settings -> API  |
| `SUPABASE_BUCKET_NAME`| ファイルアップロードに使用する Supabase Storage バケット名      | 後述の「Supabaseバケットの作成」で指定する名前 |

**`wrangler.toml` での設定例:**

```toml
[vars]
SUPABASE_URL = "YOUR_SUPABASE_URL"
SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_KEY = "YOUR_SUPABASE_SERVICE_KEY" # 環境変数として安全に管理すること
SUPABASE_BUCKET_NAME = "tsumikiri-uploads" # 例
```

**重要:** `SUPABASE_SERVICE_KEY` は非常に強力な権限を持つため、クライアントサイドに公開せず、Cloudflare Workers のようなサーバーサイドでのみ安全に利用してください。

## 2. Supabaseバケットの作成

Supabase Storage にファイルをアップロードするには、まずバケットを作成する必要があります。

1. **Supabase ダッシュボードにログイン:**
   - プロジェクトを選択します。

2. **Storage へ移動:**
   - 左サイドバーの「Storage」アイコンをクリックします。

3. **新しいバケットを作成:**
   - 「New bucket」ボタンをクリックします。

4. **バケット情報を入力:**
   - **Name:** バケット名を入力します（例: `tsumikiri-uploads`）。この名前が `SUPABASE_BUCKET_NAME` に設定する値になります。
   - **Public buckets:** 必要に応じて「Public buckets」をオン/オフします。`tsumikiri` ではアップロードされたファイルへのアクセス制御を考慮し、デフォルトではオフ（Private）を推奨します。

5. **バケットを作成:**
   - 「Create bucket」ボタンをクリックします。

これで、Cloudflare Workers から Supabase Storage にファイルをアップロードする準備が整いました。
