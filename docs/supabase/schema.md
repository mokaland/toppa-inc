# Supabase Schema Definition

> 作成者: CTO マルコ・ロッシ
> 日付: 2026-02-17
> ステータス: ドラフト

## 1. `reports` テーブル

### 概要
ユーザーが生成したAIレポートを保存するテーブル。Row Level Security (RLS) により、各ユーザーは自身のレポートのみにアクセス可能とする。

### スキーマ定義

```sql
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    report_type TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 有効化
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーが自身のレポートを読み書きできるポリシー
CREATE POLICY "Users can view their own reports."
ON public.reports FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports."
ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports."
ON public.reports FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports."
ON public.reports FOR DELETE USING (auth.uid() = user_id);
```

### フィールド詳細

| フィールド名 | データ型 | 説明 | 備考 |
|---|---|---|---|
| `id` | `UUID` | レポートの一意なID | 主キー、自動生成 |
| `user_id` | `UUID` | レポートを生成したユーザーのID | `auth.users` テーブルへの外部キー、RLS用 |
| `report_type` | `TEXT` | レポートの種類（例: 'daily', 'weekly', 'monthly', 'financial'） | |
| `content` | `JSONB` | レポートの本文や構造化データ | |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | レポートが作成された日時 | 自動設定 |
